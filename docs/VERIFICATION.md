# Phase 1 verification — 4 October 2026

- `npm test`: **10 passed** using Vitest 4.1.11 and embedded PostgreSQL (PGlite).
- `npm run build`: successful TypeScript checks plus backend bundle and frontend production assets.
- `npm ci --dry-run --offline`: successful lockfile consistency check (not a full clean reinstall).
- Dependency installation audit: **0 vulnerabilities** after the Vitest update.
- PostgreSQL 17 Docker container: started on 127.0.0.1:55432.
- `npm run db:migrate`: successful; rerun also successful without replacing schema/data.
- Live browser against real PostgreSQL: created `Demo · S3 English`, added a 10-mark short-answer guide, saved it, completed setup, verified READY status and disabled editing, viewed all three audit events.
- Narrow and desktop layouts inspected. Screenshots: `phase1-preview.jpg` and `phase1-desktop.jpg`.

Integration coverage: create/list/detail/health, invalid input/malformed JSON/unknown endpoints, owner isolation, transactional guide saving, over-allocation, stale revisions, rollback after audit failure, readiness requirements, guide locking, database audit immutability, all four question types persisted in a mixed guide, objective keys, rubric totals, consecutive positions, missing keys and incomplete mark totals.

Development services were left running at http://127.0.0.1:5174 and http://127.0.0.1:4000. Another application occupies 5173. The demo contains invented assessment data only. Git repository initialized; no remote, commits or deployment created.

Unimplemented: assessment-file/script uploads, OCR/segmentation, actual correction engines, confidence review, teacher mark decisions, finalization and CSV/XLSX exports. Production identity is not implemented; server refuses production mode. Reserved future tables and correction interfaces do not imply these features are functional.

## Subsequent upload increment

The Phase 1 snapshot above is historical. Assessment-reference and student-script uploads are now implemented.

- Integration suite: **23 tests passed** across assessment and upload tests.
- TypeScript validation and frontend/backend builds passed.
- Upload migration applied to the existing PostgreSQL database without replacing earlier assessments.
- Offline installation refreshed the lockfile; `npm ci --dry-run --offline` passed.
- Live API smoke check: created `Demo · Upload workflow`, uploaded an assessment PDF in draft, saved the guide, completed setup, uploaded `DEMO-001` PNG, verified original bytes/checksum and both audit events. All paper contents are invented.
- Browser verification: both uploaded files listed, image Preview displayed the original 800×1000 sample with successful decoding. Screenshot saved as `uploads-preview.jpg`; a separate preview tab was kept open. The live API check exercised uploads; the file chooser was not counted as a successful browser form submission.
- Coverage includes PDF/JPEG/PNG uploads, original downloads, duplicate references/content, ownership/assessment isolation, size/page limits, damaged/unsupported/encrypted files, PDF actions/attachments, unexpected fields, missing and changed originals, storage traversal rejection, database/audit rollback and file cleanup.
- New files remain local under ignored `.data/uploads`; files are never served from a public static folder.
- Final `npm audit` refresh failed with a registry connection reset. The initial upload dependency installation reported one high advisory, but its detailed report was unavailable; the final dependency set's vulnerability status remains unverified. Do not treat the earlier Phase 1 zero-advisory result as applying to this increment.

Still pending: antivirus integration, crash-orphan reconciliation, page processing/segmentation, OCR, correction engines, confidence review, teacher mark decisions, finalization, CSV/XLSX export and production identity. Uploads contain no automated marks. PDFs download as originals; images also provide in-app preview.

## Teacher login — 6 October 2026

Phase 1 now starts with real teacher registration and sign-in. Password-backed accounts and PostgreSQL sessions replace the earlier fixed development identity. Local accounts are implemented; email verification/recovery, hosted deployment and outstanding upload safeguards remain pending.

- `npm test`: **34 passed**, across authentication, assessment and upload integration tests.
- `npm run build`: backend/frontend builds and TypeScript checks passed.
- Migration `003_teacher_auth` applied successfully, preserving existing teachers/assessments/scripts.
- Live runtime: `/api/auth/me` and `/api/assessments` return 401 without a session; `/api/health` returns 200 with `authMode: password`.
- Browser: sign-in and account-creation forms displayed, backend connection verified, Show/Hide password control verified on an empty field. Screenshot: `teacher-login-preview.jpg`.
- Authentication integration tests cover registration, normalized/duplicate emails, minimum password length, private password/token hashes, session restoration/rotation/expiry/revocation, remembered sessions, successful-login failure-counter reset, brute-force throttling, immutable auth events, origin/CSRF checks, forged identity rejection and actual signed-in teacher ownership isolation.
- No real teacher account or password was created on the user's behalf. Disposable test credentials exist only in isolated test databases. Existing anonymous demos are preserved under their legacy owner.
- Passwords/session tokens are absent from browser localStorage and API response bodies. Real runtime never injects a fixed teacher id. Account/session details are documented in `TEACHER_LOGIN.md`.

## Smart sign-in extension
Existing suite: 34 tests passed. New account-access suite: 6 tests passed separately, covering generic recovery responses, one-use hashed tokens, expired links, password change/session revocation, Google browser-bound state/replay, verified profiles, same-email isolation, and unavailable providers. First combined run timed out on the hash-heavy test; its explicit 30-second timeout passed on the isolated rerun. No actual email or Google login was performed. The sign-in preview visibly contains all three controls; browser interaction checking of the recovery screen was limited by repeated browser command timeouts.

## Phase 2 preparation
All 48 tests across 5 suites passed in a single run. Eight new tests cover creation types/defaults, exact source bytes and deduplication, ownership, safe PDF/text validation, selected material grounding and consent, invalid marks/stale requests, reviewed guide save/locking, and the Responses request format. Database migration 005 applied locally; API health is healthy. No live AI request was made because provider settings are absent. Dashboard browser preview could not be inspected: the browser control repeatedly timed out and reset before opening the preview.

## Paper headers and library
Full suite: 56 tests passed after limiting tests to one worker without file parallelism; initial parallel suite hit database startup timeouts. Updated library suite: 9 tests passed, bringing total test coverage to 57 cases. Logo ownership/validation, header formatting/revisions/locking/audits, private snapshots, editable copies, and class/title changes tested. Browser preview confirms alignment and bold styling respond without saving temporary changes. Browser print/PDF output remains unverified.

## Saved previews, footer and setup completion
Full suite: 63 tests passed. Four preview rendering tests also passed after moving them to the frontend test folder. Frontend/backend production builds pass. Integration tests cover footer persistence, rejecting incomplete setup, resaving loaded question IDs, and completing valid setup. Student previews exclude expected answers and rubrics; teacher previews include them. Browser verification shows footer controls, expanded saved marking-scheme preview, and the remaining-marks validation checklist. The real teacher draft was inspected without saving or finalizing it. Physical print and downloaded PDF layout remain unverified.

## Workspace navigation
Added Exam preparation and Correction hub beneath My library, including mobile navigation. Preparation lists drafts and connects to the existing exam/assessment/CAT creator. Correction lists completed setups and opens original script uploads without the preparation editor. Browser checks verified both pages, correct empty/ready lists, and the student-script upload form. Production build passed. No teacher data was changed. Computer vision extraction and correction services remain unimplemented and the hub states this explicitly.

## Correction core
Migration 007 applied locally. Full suite: 79 tests passed; updated correction suite: 18 tests passed (81 total cases), including external guide import and interrupted-job recovery. Builds and TypeScript checks passed. Isolated database/API tests cover owner privacy, upload validation/order, all-page confirmation, explicit provider consent, objective answer-key comparison, uncertain handwriting, bounded marks, stale reviews/publications, duplicate registration rejection, manual review without AI, provider failures/retries, concurrent capture while processing, immutable publications, claims/amendments, Excel/CSV and append-only audits. Generated XLSX independently read with openpyxl: numeric scores, inline text cells and frozen headers verified. Browser checks confirm Correction hub creation form and both Marks publishing/Claims navigation. Real teacher records were not changed; live camera hardware, real handwriting accuracy, provider latency and end-to-end external AI requests remain untested because no provider is configured. Whole-class PDF shortcut uses the tested per-student upload/completion routes.

Final combined run: all 81 tests passed across 8 suites. Final frontend build passed after refining existing-paper selection. Browser confirms existing papers reuse class/subject/marks, while external exams show those fields. Correction preview saved in correction-workbook-preview.png. Backend health is healthy after the update.

## Camera tutorial
Frontend build passed. Browser verified guide opening, direct Save/Correct step selection, Next to Review and Replay to front capture. Native dialog preserves focus, offers Close/Escape and prevents background interaction. Playback pauses on direct navigation; reduced-motion disables visual animations. No real camera was opened and no photo or teacher record was changed. Preview: capture-guide-preview.png.

## Educator setup and assessment context
Migration 010 applied locally, preserving existing assessments. Full combined run: 127 tests passed across 18 files, including 13 new teaching-context cases. The hashing-heavy sign-in counter test originally exceeded its five-second timeout under simultaneous build load; it passed independently and now uses the existing authentication suite's 30-second allowance. The full suite then passed. Builds/TypeScript checks passed. Existing course/class pairs, private logo ownership, resumable setup, multi-institution ambiguity, immutable snapshots, new assessment kinds and provider chat context verified with isolated database/API tests. Native UI verification was interrupted by app/browser permission timing out; no real teacher profile or live AI request was created for testing. See TEACHER_SETUP.md for behavior and remaining broader prompt-editing extensions.

## Preparation setup and persistent material library
Migration 011 applied. All 137 tests passed across 19 suites; backend/frontend production builds passed. Ten new library integration tests verify folder-specific permanent uploads, exact originals, deduplication, privacy, class/lesson and institution isolation, assessment source snapshots, reuse without reupload, selected-source generation, promoting existing notes, source limits and setup locking. Existing SSR assertions now expect the intentional Preparation setup label. Web and API both respond HTTP 200. Native browser interaction was not exercised in this increment; no live provider call or real teacher material upload was performed. See MATERIAL_LIBRARY.md.

Dashboard update: institution setup templates and saved library papers are available from the dashboard. Recent papers are ordered by creation date (latest six); past papers include completed setup statuses. Drafts open in the editor; completed papers can be saved to the library and copied into a new draft. Preview uses the existing separate question-paper/marking-scheme print flow. Teacher settings stores an account-specific accent colour locally in the current browser. Workspace theme is scoped away from exported paper HTML.

Class-first preparation: Exam preparation and fresh-paper shortcuts now show square cards from the teacher's saved class assignments before opening the workspace. Subjects are grouped by institution/class/department/trade; a single subject is selected automatically, while multiple subjects require a choice. Preparation setup is limited to that class's assignment IDs. Switching class/subject clears the previous prompt/material selection. Existing saved papers can still be opened directly. Verified frontend build and 13 focused tests across class selection, manual preparation, AI prompt and paper-preview suites.
