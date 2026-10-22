"""Bounded local OpenCV processor: one JSON request on stdin, one JSON result.
No network access or input-controlled paths. Outputs are drafts for visual review.
"""
import base64
import json
import sys
import cv2
import numpy as np
cv2.setNumThreads(1)

def process(image):
    height, width = image.shape[:2]
    scale = min(1.0, 1100 / max(height, width))
    small = cv2.resize(image, None, fx=scale, fy=scale) if scale < 1 else image
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    smooth = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(smooth, 45, 140)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    _, mask = cv2.threshold(smooth, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours = []
    for candidate in (edges, mask):
        found, _ = cv2.findContours(candidate, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours.extend(found)
    area = gray.shape[0] * gray.shape[1]
    corners = None
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:20]:
        if cv2.contourArea(contour) < area * .22:
            continue
        approx = cv2.approxPolyDP(contour, .025 * cv2.arcLength(contour, True), True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        pts = approx.reshape(4, 2).astype(np.float32)
        if np.any(pts[:, 0] < 3) or np.any(pts[:, 1] < 3) or np.any(pts[:, 0] > gray.shape[1]-4) or np.any(pts[:, 1] > gray.shape[0]-4):
            continue
        sums, diffs = pts.sum(axis=1), np.diff(pts, axis=1).ravel()
        ordered = np.array([pts[np.argmin(sums)], pts[np.argmin(diffs)], pts[np.argmax(sums)], pts[np.argmax(diffs)]])
        if len(np.unique(ordered, axis=0)) != 4:
            continue
        sides = [np.linalg.norm(ordered[i]-ordered[(i+1)%4]) for i in range(4)]
        if min(sides) < 120 or not .4 < max(sides[0], sides[2])/max(sides[1], sides[3]) < 2.5:
            continue
        # Slightly expand the crop so the detected border does not trim edge writing.
        center = ordered.mean(axis=0)
        expanded = center + (ordered-center)*1.015
        expanded[:, 0] = np.clip(expanded[:, 0], 0, gray.shape[1]-1)
        expanded[:, 1] = np.clip(expanded[:, 1], 0, gray.shape[0]-1)
        corners = expanded / scale
        break
    cleaned = image
    if corners is not None:
        tl, tr, br, bl = corners
        w = int(max(np.linalg.norm(tr-tl), np.linalg.norm(br-bl)))
        h = int(max(np.linalg.norm(bl-tl), np.linalg.norm(br-tr)))
        transform = cv2.getPerspectiveTransform(corners.astype(np.float32), np.float32([[0, 0], [w-1, 0], [w-1, h-1], [0, h-1]]))
        cleaned = cv2.warpPerspective(image, transform, (w, h), borderMode=cv2.BORDER_REPLICATE)
    gray_page = cv2.cvtColor(cleaned, cv2.COLOR_BGR2GRAY)
    preview_scale = min(1.0, 900/max(gray_page.shape))
    check = cv2.resize(gray_page, None, fx=preview_scale, fy=preview_scale) if preview_scale < 1 else gray_page
    sharpness = float(cv2.Laplacian(check, cv2.CV_64F).var())
    brightness = float(np.mean(check))
    warnings = []
    if sharpness < 65:
        warnings.append('The page may be blurry or have little visible writing. Check the text before saving.')
    if brightness < 95:
        warnings.append('The page looks dark. Move to better light and consider retaking it.')
    if min(width, height) < 600:
        warnings.append('This photo is small. Move closer or use a higher-resolution camera.')
    if corners is None:
        warnings.append('Paper border was not clear. No automatic crop was applied; check all corners are visible.')
    # Conservative contrast enhancement; avoid binary thresholding that can erase faint ink.
    cleaned = cv2.createCLAHE(clipLimit=1.4, tileGridSize=(16, 16)).apply(gray_page)
    ok, encoded = cv2.imencode('.jpg', cleaned, [cv2.IMWRITE_JPEG_QUALITY, 94])
    if not ok:
        raise ValueError('Could not encode page')
    return {'image': base64.b64encode(encoded).decode('ascii'), 'quality': {'paperDetected': corners is not None, 'corners': [] if corners is None else [[round(float(p[0]/width), 5), round(float(p[1]/height), 5)] for p in corners], 'sharpness': round(sharpness, 2), 'brightness': round(brightness, 2), 'warnings': warnings, 'width': int(cleaned.shape[1]), 'height': int(cleaned.shape[0]), 'engine': 'opencv-'+cv2.__version__}}

if __name__ == '__main__':
    try:
        request = json.loads(sys.stdin.read(16_000_000))
        data = base64.b64decode(request['image'], validate=True)
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if image is None or image.shape[0]*image.shape[1] > 4_000_000:
            raise ValueError('Invalid image')
        sys.stdout.write(json.dumps(process(image)))
    except Exception:
        sys.stderr.write('Scan processing failed.\n')
        sys.exit(1)
