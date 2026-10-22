# Evalot V1 build specification

## Scope and delivery boundary

V1: create/upload assessment → marking guide/rubric → scanned scripts → extract answers → MCQ/True-False/short-answer/essay correction → confidence-prioritized teacher review → finalize → Excel/CSV.

Phase 1 delivers assessment/question/guide setup. The first Phase 2 increment adds assessment-reference and scanned-script uploads, student references, image previews and original downloads. Extraction, processing jobs and all marking functions remain pending. Setup completion is not mark finalization. Integer question/criterion marks are supported initially; fractional awards can be supported by later numeric review records.

## Architecture

React/Vite → same-origin `/api` → Express → assessment services → node-postgres → PostgreSQL. Both applications consume shared Zod contracts. Writes and their audit events commit in the same transaction; row locking and a revision precondition prevent stale guide replacement. Teacher identity comes from a database-backed session, never a client-supplied owner id. All reads and writes filter by owner. Missing and foreign records both return 404. Phase 1 begins with teacher registration/sign-in; see `TEACHER_LOGIN.md` for the account/session contract.

Tables: teachers → assessments → questions; assessments → scripts; scripts + questions → answers; answers → versioned evaluations → append-only teacher_reviews. Each extracted answer retains an original-file page and region. Audit events retain before/after guides; question IDs can change while a draft guide is replaced. Ready guides cannot be replaced. Composite foreign keys prevent cross-assessment answer references. Evaluation/review tables are reserved schema, not yet enabled services; upper bounds and reviewer ownership must be enforced before these tables are activated.

## Security and auditability

The runtime requires `AUTH_MODE=password`, binds to loopback and refuses `NODE_ENV=production`. Teacher accounts use salted scrypt password hashes, random opaque session cookies with hashed tokens in PostgreSQL, persistent sign-in throttling and same-origin write protections. Authentication and assessment audit history is append-only. Local database sample credentials must be replaced for hosted use. Hosting additionally requires HTTPS/Secure cookies, email verification/recovery, restricted database permissions, operational security review and outstanding upload safeguards. Database administrators remain trusted.

Upload phase: check file signatures, allow PDF/JPEG/PNG only, cap size/page count, scan files, store privately outside the public web root, retain checksums and original files, and use authorized preview endpoints. Extraction providers receive only explicitly authorized script data. No real student papers are sent to external services by this foundation.

## Correction service boundaries

ExtractionService receives an immutable storage key and returns answer text plus page/region and extraction confidence. Add student identification and question segmentation before evaluating; ambiguous identity/segmentation must be reviewed. CorrectionEngine receives a question/guide and extracted answer. Objective engine marks deterministic keys; short-answer and essay engines return proposals with rationale, engine/version, and guide revision. No provider credentials or fake AI scoring are included.

Confidence combines extraction, segmentation and marking evidence. It is an uncertainty signal, not a verified probability until benchmarked. Review order: unresolved identification/segmentation, missing answers, low confidence, remaining proposals. The review screen must show original answer image, question, guide, proposal, reason and confidence with Accept / Change / Next. Every final mark is a teacher decision. AI proposals cannot update final marks.

Finalize in a transaction only when every expected answer has a current teacher review, reviewer owns the assessment, and marks are within each question maximum. Compute totals from latest reviews, freeze a versioned finalization snapshot, record actor/time, then export only finalized totals. CSV must neutralize formula-like student fields; XLSX must use numeric mark cells. Reopening and changed guides require a new audited revision and re-evaluation; no silent alteration of finalized records.

## Phases and acceptance gates

1. **Foundation / setup — implemented:** workspace, environment, PostgreSQL migration, create/list/detail, whole-guide save, typed keys/rubrics, total validation, readiness, ownership, revision conflicts, audit history. Tests cover these functions, failed transaction rollback and immutable history.
2. **Assessment/script uploads:** secure storage, assessment reference PDF, roster/student references, script upload, previews, processing job status/retries and page segmentation. Gate: originals remain accessible; malformed/oversized files rejected; duplicates and ambiguous student mappings flagged.
3. **Extraction / correction:** provider adapters plus deterministic objective engine. Gate: missing/uncertain handwriting flagged; no mark exceeds question maximum; reproducible engine/guide version tracking. Never fabricate a proposal after provider failure.
4. **Teacher review / finalize:** uncertainty queue, edits with reasons, teacher-owned marks, transactional finalization and immutable snapshot. Gate: unreviewed answers block finalization, stale evaluations cannot be accepted, totals correct.
5. **Export / benchmark:** CSV and XLSX, download authorization, security review, verified authentication. Benchmark: one S3 subject, 30 anonymized scripts, 20 mixed questions; compare teacher grading time and agreement against teacher-marked baseline. Subject, rubric and data need teacher confirmation before external-provider work.

Essential screens: assessment dashboard, assessment setup, upload scripts, processing, correction review, final results, export. Phase 1 delivers the first two plus audit history. No out-of-scope portals, attendance, fees, messaging, CAMIS integration or exam generator.

## Upload increment delivered

Assessment references are optional and immutable after the first upload; they can be attached only while DRAFT. Student scripts can be uploaded only while READY. One student reference maps to one file; multi-page scripts use PDF, while each image represents one script. Case-insensitive reference uniqueness and per-assessment checksum uniqueness reject duplicate registrations and scans. No student identification is guessed.

Private storage uses generated UUID filenames and exclusive writes. Content-based MIME detection overrides browser labels; download extensions match validated formats. PDF limits: 10 MB and 1–50 pages, no encryption, attachments, actions or interactive forms. Images: fully decoded JPEG/PNG, single frame, at most 25 million pixels. These structural checks are not an antivirus service. Production remains disabled.

Database rows and audit events are transactional; failed uploads clean up unreferenced files. If commit/cleanup status is uncertain, retain the file for later reconciliation rather than risk deleting a committed original. A crash between disk write and database commit may leave an unreferenced file; automatic reconciliation and malware scanning remain pending. Every original request checks teacher ownership and checksum before serving. Missing originals report 410, changed originals 409; no original is silently replaced. PDF originals download as attachments; JPEG/PNG support image preview. File backups and database backups must be coordinated.

Pending Phase 2 work: antivirus integration, upload reconciliation, processing jobs/retries, page processing/segmentation, assessment-document question extraction and student identification review. The current interface explicitly labels papers UPLOADED and provides no fake OCR or marks.

## Technical references

- [Vite setup and runtime requirements](https://vite.dev/guide/)
- [node-postgres transactions](https://node-postgres.com/features/transactions)
- [Express error handling](https://expressjs.com/en/guide/error-handling/)
