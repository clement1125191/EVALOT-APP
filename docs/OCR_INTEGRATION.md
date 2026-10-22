# Camera, OCR and handwriting integration

## Current implementation

DirectMarkingCamera.tsx uses browser getUserMedia, a canvas JPEG capture and authenticated multipart upload. It saves original pages per student. The correction worker passes the saved pages and marking references to the configured vision adapter, validates structured answers/marks, and produces a draft. This already supports an AI vision extraction path; a standalone PaddleOCR or ML Kit integration has NOT been installed.

The existing optional Python OpenCV processor checks/cleans document images. OpenCV handles image preparation, not handwriting transcription or marking. The new direct camera saves images directly; it does not currently invoke the separate capture-preview/cleanup endpoint. Do not describe automatic crop, continuous OCR, colour grouping or instant handwriting recognition as already delivered.

## Which tools fit Evalot?

| Part | Web V1 | Optional later |
| --- | --- | --- |
| Phone camera | Browser getUserMedia over HTTPS (already implemented) | Android CameraX for a native app |
| Page boundaries/rotation/quality | Existing optional OpenCV Python service; integrate a quality step if needed | OpenCV.js in browser, benchmark mobile performance |
| Printed document OCR | PaddleOCR in a private Python service | Tesseract for typed text |
| Handwritten exam answers | Existing vision provider with uncertainty flags and teacher review | Benchmark PaddleOCR handwriting models on real scripts before switching |
| Android scan UI | Not needed for current React web app | ML Kit Document Scanner via native Android integration |
| Native on-device text recognition | Not installed | ML Kit Text Recognition v2; validate handwriting quality rather than assuming it |
| Marking | Evalot guide/rules + AI draft + teacher final decision | Keep unchanged when replacing OCR |

PaddleOCR is Apache-2.0 open-source code. Review the exact model weights and dependencies separately before distribution. ML Kit is a Google on-device SDK governed by Google's API terms; do not call it an entirely open-source replacement. Its Android scanner includes its own UI and may change the custom continuous-camera experience. Digital Ink Recognition consumes finger/stylus strokes, NOT photos of handwritten exam sheets. OCR does not itself decide marks.

## Recommended integration sequence

1. Deploy and test the existing camera + vision path first. Keep readable originals and question/page mapping.
2. Collect a teacher-approved evaluation set of printed guides and representative handwriting, languages, lighting and phone models. Measure transcription accuracy, missing answers, identity accuracy, latency and cost. Use permissioned samples; keep test images private.
3. Add a separate extraction interface in the backend, independent of marking:

```ts
interface ExtractedPage {
  page: number;
  lines: Array<{
    text: string;
    confidence: number | null;
    box: [number, number, number, number]; // normalized x,y,width,height
  }>;
  warnings: string[];
}
interface OcrAdapter {
  extract(bytes: Buffer, mimeType: string): Promise<ExtractedPage[]>;
}
```

This is a proposed interface, not an existing endpoint. Never invent confidence if the chosen engine does not expose calibrated values. Preserve the engine/model version and original file ID with every extraction.

4. For open source, deploy a private Python container with pinned PaddleOCR/Paddle runtime and models. Implement an internal POST /extract receiving a bounded file and returning validated ExtractedPage objects. Restrict it to the backend network (or authenticate requests), cap image dimensions/pages, set timeouts, limit concurrency and avoid logging student content. Keep it separate from Vercel static hosting. A small CPU model can be benchmarked on the 8 GB laptop; larger handwriting/document models may need a stronger host. No GPU performance promise is made.
5. In CorrectionService.processNext, load the student's saved files, call the OCR adapter in order, and map lines to question positions against the paper. Keep page/box evidence. Do not merge different students based only on a recognized name or registration.
6. Give extraction and the confirmed guide to a separate grading adapter. Objective answers use deterministic rules; short answers/essays use rubric-based draft grading. If extraction is ambiguous, flag it for recapture/transcription instead of treating a guessed word as reliable.
7. Save an auditable extraction version alongside model/provider metadata. Re-grading must preserve previous drafts and teacher edits. Test engine failure, missing pages, out-of-order pages and low-quality handwriting.
8. Add meaningful integration tests and compare against the evaluation set before enabling this adapter for teachers. Do not silently replace the existing vision adapter with an untested OCR model.

## How ML Kit would integrate later

ML Kit scanner/text recognition is a native mobile SDK, not a drop-in import for this Vite page. Build a native Android client or a reviewed native bridge (for example a future Capacitor wrapper). With CameraX or the scanner, capture each student bundle, run Text Recognition v2 locally, then upload original pages to the existing authenticated API. If adding recognized text uploads, design a new authenticated, validated endpoint and migration first: the current pages endpoint accepts files, not arbitrary OCR JSON. Treat all device OCR as untrusted and preserve original evidence for teacher review.

For custom continuous scanning use CameraX + a native text recognizer; the Document Scanner launches its own scanning flow. The native login/session flow also needs deliberate implementation; do not weaken the current CSRF checks or expose backend provider keys to the app.

## Official references

- PaddleOCR source: https://github.com/PaddlePaddle/PaddleOCR
- PaddleOCR license: https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE
- ML Kit scanner (Android, on-device): https://developers.google.com/ml-kit/vision/doc-scanner
- ML Kit Text Recognition: https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- Digital ink input distinction: https://developers.google.com/ml-kit/vision/digital-ink-recognition
- ML Kit terms: https://developers.google.com/ml-kit/terms
- Tesseract: https://github.com/tesseract-ocr/tesseract
