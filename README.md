# Evalot V1 — correction-first teacher workspace

Implemented: Phase 2 teacher dashboard, Exam/Assessment/CAT creation, learning-material upload/review, manual preparation and optional AI drafts, teacher registration/login/logout and sessions, assessment creation, question setup, answer keys/rubrics, setup validation, locked guides, ownership checks, append-only audit history, assessment-reference uploads and scanned student-script uploads. The React + TypeScript interface connects to a Node.js + TypeScript API and PostgreSQL. Hosted deployment configuration is included; follow [the deployment guide](docs/DEPLOYMENT.md) to configure real cloud services.

## Open in VS Code

Open this `evalot` folder. Requirements: Node.js 22.13+ and PostgreSQL 17 (or Docker Desktop).

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173; it chooses the next port if busy). API listens only on 127.0.0.1:4000. The bundled database uses local port 55432. When using an existing PostgreSQL installation, skip Docker and set `DATABASE_URL` in `.env` to a database you created. Set `AUTH_MODE=password`; create your teacher account in the app after migrations. There is no default password. See `docs/TEACHER_LOGIN.md` for account and session behavior.

```powershell
npm test
npm run typecheck
npm run build
```

Build emits `apps/api/dist/server.js` and `apps/web/dist`. Run the built API locally with `npm run start -w @evalot/api`; development uses `tsx`. Do not deploy this local-auth server. A later production build must add verified identity, dedicated restricted database credentials and operational controls.

## First workflow

1. Create your teacher account or sign in, then create an assessment with subject, class, title and total marks.
2. Add questions of type MCQ, True/False, short answer or essay.
3. Add correct answers or marking notes; essays require rubric criteria.
4. Save the guide. Question marks may not exceed total marks; rubric sums must equal question marks.
5. Complete setup only once marks equal the assessment total and every question has a guide. This locks the guide.
6. Upload student scripts using a unique student reference per file. PDF/JPEG/PNG, maximum 10 MB; PDF maximum 50 pages. Use Preview for images or Download original for any format.
7. Inspect the audit history. Extraction, correction, review and exports are future phases and are not simulated in this interface. An assessment reference can be attached before completing draft setup.

## Repository

- `apps/web`: React teacher workspace, responsive layout, API client.
- `apps/api/src`: HTTP app, transactional assessment service, database adapter, migration runner.
- `apps/api/src/correction`: provider-independent extraction and correction interfaces.
- `apps/api/src/uploads`: byte validation, private file storage, ownership and transactional upload service.
- `apps/api/migrations`: PostgreSQL schema for assessment setup and future script/review stages.
- `apps/api/test`: HTTP integration tests using a real embedded PostgreSQL engine (PGlite).
- `packages/contracts`: shared validation and TypeScript request/response types.
- `docs`: API contract, security decisions and phased implementation plan.

No synced reference files were changed. No CAMIS, student/parent portals, administration, exam generation or mobile app is included.

See `docs/VERIFICATION.md` for the checked delivery state. The lockfile and `.npmrc` keep installs reproducible; legacy peer resolution avoids an npm 10 bug resolving the test runner's optional browser peers.

## Local paper storage

Originals are saved under `.data/uploads`, which is ignored by Git and is never exposed as a static web folder. Back up this folder together with PostgreSQL. Student references and repeated files are unique within each assessment. File signatures, PDF structure/page count and image decoding/pixel count are checked; these are not antivirus scanning. Malware scanning and verified multi-user authentication must be implemented before hosted use. No scripts are sent to external OCR/AI providers.

For invented sample papers, run `node scripts/create-demo-scans.mjs`, then upload them through your signed-in teacher workspace. The earlier anonymous `smoke-uploads.mjs` script is historical; login is now required. Tests cover uploads under injected test identities and authentication under real sessions in an isolated test database.

Phase 2 preparation workflow and AI configuration: see [docs/PHASE_2.md](docs/PHASE_2.md). Google and email settings can be configured later; manual assessment preparation works independently.

Paper headers, logos, reusable templates and saved papers: see [docs/PAPER_LIBRARY.md](docs/PAPER_LIBRARY.md).

## Hosting and OCR

- [Complete Vercel + persistent API deployment guide](docs/DEPLOYMENT.md)
- [Camera, open-source OCR and ML Kit integration plan](docs/OCR_INTEGRATION.md)

The committed API rewrite is a placeholder. Run `npm run configure:vercel -- https://YOUR-API.onrender.com` before expecting hosted login to work. Local `.env`, `.data` and credentials are intentionally excluded from Git.
