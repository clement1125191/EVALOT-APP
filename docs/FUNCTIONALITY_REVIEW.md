# Functionality review — 12 October 2026

## Implemented

Teacher email/password accounts and private sessions; assessment, Exam and CAT setup; material upload/review; manual question preparation and answer keys/rubrics; paper headers, logos, templates, saved papers and question/marking previews; correction workbooks; front-first student page bundles and batch uploads; local OpenCV preview/cleanup; correction queue and manual review; draft and final Excel/CSV exports; versioned publication; claims with evidence and renewed review; owner access checks, revision checks and immutable audit history.

## Configuration still required

The private environment currently has local OpenCV configured. OpenAI API credentials and drafting/vision model settings are absent. Google credentials and password-recovery email provider settings are also absent. These integrations are implemented but cannot be exercised against live services yet. Do not paste credentials into chat.

## Next work, in priority order

1. Resolve camera permission on the actual capture device and verify a physical camera preview, front/back capture, retake, and saving to the correct student.
2. Configure the AI provider, then test invented or explicitly approved sample papers end to end. Verify transcription, identity, question mapping, marks, confidence flags, latency and provider errors against teacher-corrected examples. Automated provider tests use controlled responses and do not establish real handwriting accuracy.
3. Conduct one full classroom-style pilot: 30 students, mixed question types, faint writing, missing pages and duplicate registrations. Check teacher overrides, final totals, Excel/CSV, a student claim and a second publication.
4. Configure Google sign-in and recovery email; verify real redirects and delivery.
5. Before hosting, add HTTPS deployment, restricted production database credentials, backups and restore drills, retention/deletion policy, upload malware scanning, monitoring and deployment-specific security checks. The current server is intended for local development.
6. Update older README/verification sections that still describe correction/export and exam preparation as future work. Use CORRECTION_HUB.md and OPENCV_CAPTURE.md for the newer workflows.

## Verification limits

Type checking and all four synthetic OpenCV image tests passed in this review. All 87 application tests passed across nine suites (20-second per-test timeout, one worker). Camera permission was denied during the earlier live attempt. No real student handwriting was sent to a live AI provider during development. Code and controlled integration tests do not replace a real device/provider pilot.
