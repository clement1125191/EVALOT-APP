# Local PaddleOCR (CPU)

Run from the repository root on Windows with Python 3.12:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-ocr.ps1
.data/paddleocr-venv/Scripts/python.exe services/ocr/extract.py "C:/path/to/page.jpg" --output .data/ocr-result.json
```

The environment lives in `.data/paddleocr-venv`; downloaded model caches are requested under `.data/paddleocr-models`. Both are private, ignored local files. First extraction downloads official detection and English recognition models, then inference runs locally on CPU. Installations on other computers must repeat setup; GitHub and Vercel do not receive this virtual environment.

The extractor selects PP-OCRv5_mobile_det and en_PP-OCRv5_mobile_rec to limit memory use, uses two CPU threads, and disables optional orientation/unwarping networks. Supply an upright, readable JPEG or PNG of at most 10 MB. EXIF rotation is applied and images are resized to at most 2400 pixels per side. PDF rendering is not included in this CLI.

Results contain text, engine confidence scores, normalized source boxes and warnings. Scores are not calibrated handwriting reliability or grading confidence. No marks are assigned. Original images are not modified. Larger models, multilingual text and student handwriting require their own evaluation.

Test normalization without downloading models:

```powershell
python -m unittest discover -s services/ocr -p test_extract.py
```

This installs a working local extraction tool. The React camera/Node correction worker still use their existing upload and vision-provider paths. Wiring OCR evidence into saved student drafts is a separate change; simply installing this dependency does not switch the correction engine or remove its AI provider requirement.

References: https://github.com/PaddlePaddle/PaddleOCR and https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/OCR.en.md

## Verified locally

- Python 3.12.7, PaddleOCR 3.7.0, PaddlePaddle 3.3.1 (CPU).
- `pip check`: no broken requirements.
- Paddle CPU runtime verification passed.
- Three evidence-validation tests passed.
- Real-model extraction recognized the generated exam-style page, registration and answer.

Repeat the real-model check (downloads models on first run):

```powershell
.data/paddleocr-venv/Scripts/python.exe services/ocr/smoke_test.py
```

The generated sample and result are in `.data/ocr-smoke`, outside Git. No student handwriting accuracy claim is made by this printed-page test.
