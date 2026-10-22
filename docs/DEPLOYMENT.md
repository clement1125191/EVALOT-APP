# Deploy Evalot: Vercel frontend + persistent API

## Architecture and what is included

Phone browser (HTTPS camera) -> Vercel React app -> same-origin /api proxy -> persistent Node API + correction worker -> PostgreSQL + private files.

This repository includes Vercel configuration, a proxy configuration command, secure production cookie settings, production configuration checks, and hosted startup/migration commands. Deployment accounts, domains, database credentials and provider keys must be configured in your dashboards. No cloud resources have been created by these files.

The current API runs a polling correction worker and retains some uploads on disk. Deploying only the frontend to Vercel does not deploy the whole system. This guide uses a persistent Render Node web service and managed PostgreSQL. Keep one API instance for this initial deployment; evaluate distributed worker locking and external object storage before scaling instances. Render persistent disks require an eligible paid service. Choose a non-sleeping service for continuous correction jobs. Check current pricing before purchasing.

## 1. Connect GitHub and reserve the frontend URL

1. Sign in to Vercel with GitHub. Add New > Project, import clement1125191/EVALOT-APP.
2. Use branch main and repository root (leave Root Directory empty; do NOT select apps/web).
3. Select Other for framework; vercel.json supplies installation, build and output settings:
   - Install: npm ci
   - Build: npm run build -w @evalot/web
   - Output: apps/web/dist
   - Node: 22.x
4. Deploy to reserve the project domain. The initial frontend can load, but sign-in/API calls will fail until the backend rewrite is configured in step 4. Note the stable Production domain, e.g. https://your-project.vercel.app. Use that exact domain throughout this guide, not a changing preview deployment URL.
5. Keep all database, email, OAuth and AI secrets out of Vercel frontend variables. No VITE_ secret is needed; the browser calls /api.

## 2. Create PostgreSQL and a persistent API service

1. In Render create a managed PostgreSQL database in your chosen region. Configure backups and record its INTERNAL connection URL securely. Do not use the laptop's localhost URL. A separate database is needed for production; existing local teachers and files are not uploaded by Git.
2. New > Web Service > connect the same repository, main branch, Node runtime, repository root.
3. Set Node version NODE_VERSION=22.16.0 (or another supported Node 22 version >=22.13).
4. Build command: npm ci --include=dev && npm run build -w @evalot/api
5. Start command: npm run db:migrate:hosted && npm run start:hosted
   Migrations run from source using tsx, so the build explicitly includes development tools. They use a transaction and an advisory lock. Back up production data before schema upgrades. Never reset the production database.
6. Health check path: /api/health
7. Attach a persistent disk mounted at /var/data. All legacy private file uploads must live under this mount; the remainder of the service filesystem is ephemeral.
8. Add backend environment variables below, then deploy. Use one service instance initially.

| Variable | Value |
| --- | --- |
| NODE_ENV | production |
| AUTH_MODE | password |
| NODE_VERSION | 22.16.0 |
| HOST | 0.0.0.0 |
| DATABASE_URL | Render internal PostgreSQL URL |
| APP_PUBLIC_URL | https://your-project.vercel.app |
| APP_ORIGINS | https://your-project.vercel.app |
| UPLOAD_STORAGE_ROOT | /var/data/evalot/uploads |
| GEMINI_API_KEY | Optional provider secret for existing Gemini adapter |
| GEMINI_MODEL | Your provider-supported enabled model ID |
| OPENAI_API_KEY / OPENAI_MODEL / OPENAI_VISION_MODEL | Alternative existing adapter; choose enabled model IDs |
| RESEND_API_KEY / EMAIL_FROM | Recovery email key and verified sender |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Optional Google OAuth credentials |
| GOOGLE_REDIRECT_URI | https://your-project.vercel.app/api/auth/google/callback |

Render supplies PORT. Leave OPENCV_PYTHON unset on this Node-only host unless you explicitly install the Python scan dependencies; camera capture does not need it. If a Gemini key is present, the current server prefers Gemini over the alternative provider. Missing AI keys allow saved captures/manual review but disable AI correction. Do not copy local .env to GitHub.

9. Visit https://YOUR-API.onrender.com/api/health. Expect a JSON status of ok after migrations. Database errors usually mean an incorrect URL, region/network issue or pending migrations. Hosted external databases may require the provider's TLS connection parameters; do not disable certificate verification globally.
10. Check service logs for successful startup. Files for the correction hub and library are currently stored in database tables; legacy assessment/script originals use the persistent disk. Back up both PostgreSQL and the disk. This GitHub push contains code, not those records.

## 3. Optional Google login and password recovery

1. In Google Cloud create a Web application OAuth client; configure the consent screen and any required test users/publishing.
2. Authorized JavaScript origin: https://your-project.vercel.app
3. Authorized redirect URI: https://your-project.vercel.app/api/auth/google/callback
4. Put the client ID, secret and exact callback in backend environment variables. The callback runs through the Vercel API proxy so its host-only login cookie belongs to the app domain. Do not point this at the separate backend domain.
5. In Resend verify your sender domain, configure DNS, then set RESEND_API_KEY and EMAIL_FROM on the backend. Redeploy and test a reset email and expiry. Neither integration is configured just by adding blank values.

## 4. Connect Vercel to the real API

The committed rewrite uses an obvious placeholder host. Replace it once the backend domain exists. In your local repository root:

```powershell
npm run configure:vercel -- https://YOUR-API.onrender.com
git add vercel.json
git commit -m "Configure production API proxy"
git push origin main
```

The script validates the HTTPS origin and writes the API rewrite before the SPA fallback. Vercel automatically redeploys the linked branch. Check https://your-project.vercel.app/api/health; it must return JSON, not index.html. Avoid adding a frontend API URL or cross-site cookie workaround. Keep the existing relative /api calls, request header and origin checks. No API caching is configured.

The existing API accepts up to 10 MB per upload; verify your chosen hosting/proxy payload and timeout limits with representative scans. Corrections queue quickly and run in the backend worker, while the browser polls for results. Moving the entire API to Vercel Functions would need a separate redesign for jobs, file persistence, payload constraints and migrations.

## 5. Verify on a real phone

1. Open the Production HTTPS URL, register a new teacher, sign in, refresh, then sign out. Confirm production cookies are HttpOnly, Secure and SameSite=Lax.
2. Test Google login and password reset if configured.
3. Set up a class and save a paper + marking guide. Reload and verify persistence.
4. Open Marking, choose class/documents, tap One student or Whole class. Grant camera access. A phone cannot reach your laptop through its own 127.0.0.1; use the hosted HTTPS URL.
5. Save front/back pages, change students, check each bundle, then queue with provider consent. For external papers confirm the structured guide before marking.
6. Review unclear writing, correct identity/marks, finalize and export Excel/CSV. AI marks remain drafts until teacher approval.
7. Redeploy/restart the API, then confirm records AND original files are still readable. Test another teacher cannot access these records.
8. Open a nested frontend URL and refresh; the SPA rewrite should serve the app. If API responses are HTML, repair rewrite ordering/domain; if camera permission fails, check HTTPS, browser permissions and another app using the camera.

## 6. Updates and rollback

Push application changes to main to trigger connected deployments. Run npm run build and npm test first. Review migration effects before backend updates. Frontend deployment rollback does not reverse database migrations. Keep backward-compatible migrations or restore a tested backup when necessary. Isolate preview environments from live student records; do not add arbitrary preview origins to the production allowlist.

## Official references

- Vercel external rewrites and timeout: https://vercel.com/docs/routing/rewrites
- Vercel monorepos: https://vercel.com/docs/monorepos
- Vercel limits: https://vercel.com/docs/limits
- Render Node deployment: https://render.com/docs/deploy-node-express-app
- Render persistent disks: https://render.com/docs/disks
