"""Local CPU OCR for Evalot. Produces evidence, never final marks."""
import argparse
import contextlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.data' / 'paddleocr-models'
os.environ.setdefault('PADDLE_PDX_CACHE_HOME', str(CACHE))
os.environ.setdefault('PADDLE_HOME', str(CACHE / 'paddle'))
os.environ.setdefault('OMP_NUM_THREADS', '2')


def normalize_result(result, width, height):
    lengths = [len(result.get(key, [])) for key in ('rec_texts', 'rec_scores', 'rec_polys')]
    if len(set(lengths)) != 1:
        raise ValueError('OCR text and source coordinates do not match.')
    lines = []
    for text, score, polygon in zip(result.get('rec_texts', []), result.get('rec_scores', []), result.get('rec_polys', [])):
        xs, ys = [float(p[0]) for p in polygon], [float(p[1]) for p in polygon]
        x1, y1 = min(1., max(0., min(xs) / width)), min(1., max(0., min(ys) / height))
        x2, y2 = max(0., min(1., max(xs) / width)), max(0., min(1., max(ys) / height))
        lines.append({'text': str(text), 'confidence': float(score), 'box': [x1, y1, max(0., x2-x1), max(0., y2-y1)]})
    return {'page': 1, 'lines': lines, 'warnings': ['OCR scores are engine scores, not calibrated grading confidence.'] + (['No readable text detected.'] if not lines else [])}


def extract(path):
    from PIL import Image, ImageOps
    import numpy as np
    from paddleocr import PaddleOCR
    if path.stat().st_size > 10 * 1024 * 1024:
        raise ValueError('Image must be 10 MB or smaller.')
    with Image.open(path) as image:
        if image.format not in ('JPEG', 'PNG'):
            raise ValueError('Use a JPEG or PNG. Render PDF pages to images first.')
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((2400, 2400))
        width, height = image.size
        pixels = np.asarray(image)[:, :, ::-1].copy()
    engine = PaddleOCR(device='cpu', cpu_threads=2, enable_mkldnn=False,
        text_detection_model_name='PP-OCRv5_mobile_det',
        text_recognition_model_name='en_PP-OCRv5_mobile_rec',
        use_doc_orientation_classify=False, use_doc_unwarping=False,
        use_textline_orientation=False)
    results = list(engine.predict(pixels))
    if not results:
        raise RuntimeError('OCR returned no page result.')
    return {'engine': 'PaddleOCR', 'models': ['PP-OCRv5_mobile_det', 'en_PP-OCRv5_mobile_rec'],
            'pages': [normalize_result(results[0], width, height)]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    # Paddle may print initialization diagnostics; reserve stdout for JSON.
    with contextlib.redirect_stdout(sys.stderr):
        result = extract(args.image.resolve(strict=True))
    serialized = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized + '\n', encoding='utf-8')
    else:
        print(serialized)


if __name__ == '__main__':
    main()
