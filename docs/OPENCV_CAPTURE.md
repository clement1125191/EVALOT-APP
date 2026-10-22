# OpenCV capture preview

In Correction hub, open a student and choose Scan lens or Preview & clean up a photo. Capture the front first. Compare the original with the cleaned page, check any warnings, and select Save. Repeat for each side before confirming the complete bundle.

OpenCV detects visible paper borders, straightens the page and improves contrast locally. Uncertain borders leave the image uncropped. Blur, poor lighting and small images produce warnings. These checks cannot guarantee that faint handwriting is readable; the teacher must check the preview. Both the original and cleaned image are retained, with the chosen version and quality checks recorded in the audit trail. Cleanup does not transcribe handwriting or award marks.

## Local setup

From the Evalot repository, install into the private runtime folder using your Python interpreter:

```powershell
python -m pip install --target .data/opencv-runtime -r services/scan/requirements.txt
```

Set OPENCV_PYTHON in the private .env to the full path of that Python executable. Restart the API after changing this setting. Start the local database with docker compose up -d, run npm run db:migrate, and start the app with npm run dev.

No separate web service or paid API is required for cleanup. JPEG and PNG photos are supported; PDF uploads keep the existing upload flow. Handwriting transcription and suggested marks use the separately configured correction provider or manual marking.

## Limits and checks

Processing allows one local OpenCV job at a time, with a 20-second timeout. Previews expire after 15 minutes and cannot be saved if the student bundle has changed. Unsaved previews are removed during subsequent preview creation after expiry. Saved pages remain private to the owning teacher. A recapture resets the correction draft and preserves the previous answers in the audit trail.

Run npm test and npm run typecheck for API and application checks. For image processing tests, set PYTHONPATH to the repository's .data/opencv-runtime folder and run services/scan/test_scan.py using the configured Python. The image tests use synthetic papers; test real student photos and a physical webcam before classroom use.
