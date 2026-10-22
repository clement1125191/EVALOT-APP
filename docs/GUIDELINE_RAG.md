# Assessment guideline RAG - first version

## Teacher workflow

1. Open **My library > Assessment guidelines**.
2. Upload a text-based PDF or UTF-8 TXT file with its issuing authority and exact version/year/term. Select a teaching pair or enter matching subject/class scope. Department and trade are optional scope restrictions; `*` explicitly means any subject/class. Choose the assessment type.
3. Compare the extracted passages with the original, especially tables and numerical rules. Confirm review and activate. Uploads are inactive until this step. Labels are supplied by the teacher and do not verify an official source.
4. Activate teaching notes and request a paper normally. The consent covers selected notes, draft questions and matching active guideline passages sent to the configured provider.
5. Expand **Guideline references** in the prepared-paper preview to see retrieved text, authority, version, original document and page/passage references. Sources are also available when reopening a paper preview.
6. Review questions and scheme, edit, save and print using the existing workflow. Archive superseded guidelines before activating replacements.

## Architecture and contracts

- `POST /api/guidelines`: multipart `metadata` (JSON) + `file`; 10 MB/file, 500 PDF pages, 100 documents/100 MB per teacher. PDF.js extracts text locally. No remote URL fetching. Image-only/unreadable pages require OCR before upload.
- `GET /api/guidelines`: teacher-owned document metadata/status.
- `GET /api/guidelines/:id`: complete extracted chunks for review.
- `GET /api/guidelines/:id/original`: authenticated original file download.
- `PATCH /api/guidelines/:id/status`: `{status: 'ACTIVE'|'ARCHIVED', reviewed: boolean}`; activation requires review confirmation.
- `POST /api/assessments/:id/guideline-retrieval`: `{prompt?: string}` previews retrieval without calling AI.
- `GET /api/assessments/:id/guideline-sources`: immutable evidence from the latest generated draft.
- Existing `POST /api/assessments/:id/generate` retrieves guidelines automatically and returns `guidelineSources` and `guidelineWarning` alongside questions and generationId.

Migration 013 adds guidelines, page-aware chunks and immutable generation source snapshots. Original bytes are SHA-256 hashed; generation snapshots retain each retrieved passage, page, version and hash even after archival. All routes enforce teacher ownership. Existing teacher-owned final marks and correction services are unchanged.

## Retrieval limits

`context-keyword-v1` is lexical retrieval, not embeddings or model training. It filters active teacher-owned documents by exact subject/class (case-insensitive), assessment type, and optional assignment department/trade; generic `*`/ALL scope is explicit. It ranks page-preserving, overlapping passages (1,600 characters, 200 overlap) by keyword matches including format terms. It includes a first passage from each matching document before filling remaining slots, at most three per document, eight total and 12,000 characters. Too many applicable documents or an exceeded context budget blocks generation rather than silently dropping a guideline. Narrow scope and archive obsolete versions to resolve this.

The version/year/term is provenance, not an automatic date/term selector. Teachers must keep only the applicable versions active. Text files are represented as page 1 with numbered passages; these are not original PDF page references.

Guideline passages are separate reference data, never new system instructions or teaching content. The AI prompt excludes certification claims and universal Bloom distributions. The existing server validates question count, answers, mark bounds and totals. This version does not mechanically verify Bloom classifications, section choices, every table rule or complete regulatory compliance. Formats requiring sections/optional question groups are not yet represented by the current question schema. No official documents are preloaded, no semantic-embedding API is required, and no live AI call is made in tests. The next stage can add structured blueprints and deterministic validation based on reviewed official provisions.

## Runtime

Node.js >=22.13 is required by PDF.js. Run database migrations before restarting the API. PDF.js stays external in the server bundle so its packaged worker resolves correctly.
