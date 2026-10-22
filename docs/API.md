# Phase 1 API contract

Base path `/api`. Teacher identity comes from the authenticated session cookie. Every write requires `X-Evalot-Request: 1`; see `TEACHER_LOGIN.md` for authentication contracts. JSON requests, maximum 1 MB. Errors: `{ "error": "human-readable message", "issues": [...] }` (issues only for validation). 400 malformed JSON; 401 missing/expired session; 403 failed origin check; 404 absent/foreign record; 409 stale revision/locked guide; 413 oversized request; 422 invalid fields/rules; 429 authentication rate limit; 500 generic internal failure.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | — | 200 `{status:"ok",authMode:"password"}` after DB probe |
| GET | `/assessments` | — | 200 owned Assessment[] newest first |
| POST | `/assessments` | AssessmentInput | 201 AssessmentDetail |
| GET | `/assessments/:id` | UUID | 200 AssessmentDetail |
| PUT | `/assessments/:id/questions` | `{revision,questions:QuestionInput[]}` | 200 updated AssessmentDetail |
| POST | `/assessments/:id/ready` | `{revision}` | 200 READY AssessmentDetail |
| GET | `/assessments/:id/audit` | UUID | 200 audit event array |

AssessmentInput: `title` (1–160 chars), `subject` and `className` (1–100), `totalMarks` (integer 1–1000). Extra fields are rejected. Assessment adds UUID `id`, `status`, integer `revision`, ISO timestamp `createdAt`. Detail adds `questions`.

QuestionInput: consecutive integer `position` from 1, `type` (`MCQ`, `TRUE_FALSE`, `SHORT_ANSWER`, `ESSAY`), `prompt` (1–10000 chars), `maxMarks` (integer 1–1000), `options` (up to 8 nonempty strings), `expectedAnswer` (up to 10000 chars), `rubric` (up to 20 `{label,maxMarks}` criteria). Saved questions add UUID `id`. MCQ options must be distinct and number at least two; a populated answer key must exactly match an option. True/False keys use `True` or `False`. Rubrics must sum exactly to maximum marks. Drafts may lack a key/rubric, but readiness cannot. Essays require rubric criteria. Maximum 200 questions.

Guide PUT replaces the full question set, records before/after in audit, and increments revision. It is valid only for a DRAFT. Partial allocation is allowed when saving; over-allocation is rejected. Readiness requires exact total allocation and guide coverage, changes status to READY, increments revision and locks setup. There is no reopening endpoint yet.

Audit event: `{id,action,payload,createdAt}`. Actions currently `ASSESSMENT_CREATED`, `QUESTIONS_REPLACED`, `ASSESSMENT_READY`.

Example:
```json
{"revision":0,"questions":[{"position":1,"type":"TRUE_FALSE","prompt":"A noun is a naming word.","maxMarks":10,"options":[],"expectedAnswer":"True","rubric":[]}]}
```

## Upload endpoints (implemented)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/assessments/:id/document` | — | 200 UploadedDocument or null |
| POST | `/assessments/:id/document` | multipart: `file` | 201 UploadedDocument; DRAFT only |
| GET | `/assessments/:id/document/original` | — | original bytes |
| GET | `/assessments/:id/scripts` | — | 200 StudentScript[] |
| POST | `/assessments/:id/scripts` | multipart: `file`, `studentReference` | 201 StudentScript; READY only |
| GET | `/assessments/:id/scripts/:scriptId/original` | optional `?download=1` | original bytes |

UploadedDocument: `{id,assessmentId,originalName,mimeType,byteSize,pageCount,sha256,createdAt}`. StudentScript additionally includes `{studentReference,status:"UPLOADED"}`. Storage keys are private and omitted. Student references are trimmed, 1–80 characters, begin with a letter/number and contain only letters/numbers/spaces/dots/hyphens/underscores. Comparisons are case-insensitive within an assessment. Each original's SHA-256 is verified on access.

Multipart permits one file and at most the required student-reference field. Format is validated by bytes, not browser MIME/extension. Maximum 10 MB, PDF 1–50 pages, JPEG/PNG single-frame up to 25 million pixels. Corrupted, encrypted or active PDF files are rejected with 422; oversized files 413; malformed multipart 400. Duplicate references/content or locked upload stage return 409. Cross-teacher and cross-assessment originals return 404. Missing stored files return 410 and failed integrity checks 409. PDFs always download; image originals may be displayed inline unless `download=1`. Responses use private/no-store cache controls.

New audit actions: `ASSESSMENT_DOCUMENT_UPLOADED`, `SCRIPT_UPLOADED` with entity id, reference, validated filename, checksum, page count and byte size.

Planned contracts (not routable): processing jobs; extracted-answer review; correction proposals; confidence-ordered review queue; teacher decision; finalize snapshot; finalized CSV/XLSX export. These will be defined and tested in their implementation phases.
