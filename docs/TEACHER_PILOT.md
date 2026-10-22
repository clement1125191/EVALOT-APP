# Teacher pilot: hosted OCR and phone installation

## What this release prepares

`Dockerfile.api` packages Node 22, Python 3.12, the existing API, CPU PaddleOCR, required Linux libraries and the two small English OCR models. It uses the existing database queue, runs one correction job at a time per API process, applies migrations on startup and then starts the API. Model weights are downloaded at build time, not during a teacher's first capture. `.dockerignore` excludes local environment files, original uploads, model caches and credentials.

This is deployment packaging, not a completed Render deployment. The existing Node-only service continues to work until you explicitly deploy this image and connect Vercel to the new API. Do not delete the existing service while testing the replacement.

No AI provider key is available for the current pilot. Leave provider keys unset: teachers can prepare manually, capture/upload, extract text, review and enter marks, then export. Automatic question generation and AI draft marking are unavailable until a provider is configured.

## Verification status

The API and frontend production builds pass. Manifest links and 180/192/512px icon dimensions pass validation. The Linux image installed its Python requirements with `pip check` passing, but local Docker connections to registry.npmjs.org failed with TLS resets, preventing npm installation. The complete image, model download, Linux OCR smoke test and runtime memory use remain unverified. A successful Render Docker build and sample-paper test are required before inviting teachers. No hosted OCR deployment or real-phone test is claimed.

## Render deployment steps

1. New > Web Service > select `clement1125191/EVALOT-APP`, branch `main`.
2. Name `evalot-ocr-api`; Project `evalot`; Environment `Production`; Region Oregon (same as the database).
3. Choose **Docker** as Language. Root Directory stays empty; Dockerfile Path is `./Dockerfile.api`; build context is the repository root.
4. Leave Docker Command empty so the image's CMD runs migrations and starts the API. The native Node build/start commands are not used for this service.
5. Select a compute plan only after reviewing its price and available memory. 512 MB has not been established as enough for Node plus OCR. Start with sufficient memory for a pilot (for example 2 GB), measure real peak use, and adjust from evidence. No resources or paid upgrades are created by this document.
6. For persistent original files, attach a disk at `/var/data`. Paid Render services support persistent disks. Without it, filesystem uploads are temporary. Correction/library file bytes are currently in PostgreSQL; back up the database as well.
7. Set runtime variables:

```dotenv
APP_PUBLIC_URL=https://evalotapps.vercel.app
APP_ORIGINS=https://evalotapps.vercel.app
UPLOAD_STORAGE_ROOT=/var/data/evalot/uploads
```

Add `DATABASE_URL` separately using the database's Internal Database URL in Render. Never put credentials in the Dockerfile or GitHub. The image already sets `NODE_ENV=production`, `AUTH_MODE=password`, `HOST=0.0.0.0` and `OCR_PYTHON=/usr/local/bin/python`. Render provides PORT. Do not use the Windows Python path on Linux.

8. For AI drafting/marking, configure one existing provider adapter in the backend environment. For Gemini use `GEMINI_API_KEY` and an enabled `GEMINI_MODEL`. Alternatively configure the existing OpenAI adapter variables. Choose an available model and budget in the provider dashboard. If both provider keys are present, the server currently prefers Gemini. OCR-only mode extracts page text and leaves marking to the teacher; it is not automatic essay grading.
9. Configure Google OAuth and recovery email if those are included in the pilot promise. The relevant backend secrets, Google callback and verified email sender are not supplied by the image. See `DEPLOYMENT.md`.
10. Health Check Path: `/api/health`. Deploy and check the build logs, then the public health endpoint.
11. After the replacement is healthy, connect Vercel from the repository root:

```powershell
npm run configure:vercel -- https://YOUR-NEW-OCR-API.onrender.com
git add vercel.json
git commit -m "Connect hosted OCR backend"
git push origin main
```

12. Sign in through Vercel. Use an invented student and sample paper first. Capture/upload front and back, choose local extraction, confirm text and source ordering, enter/review marks, and export. Then test AI draft marking with explicit provider sharing approval if configured. Final marks must remain teacher approved.
13. After cutover succeeds, suspend the old API service so only one service processes the shared correction queue. Re-test after a redeploy, and with the laptop turned off. Only then invite teachers to the hosted OCR flow. Keep sample-data validation separate from an accuracy evaluation on representative real handwriting.

## Phone installation for the pilot

The frontend now includes a web manifest with standalone display and 192/512px icons. After deployment, Android Chrome users can open `https://evalotapps.vercel.app` and choose Install app / Add to Home screen from the browser menu. On iPhone use Share > Add to Home Screen. Browser wording/support varies. This is an installable web app, not an approved Play Store listing. It still needs an internet connection; offline marking and private-document caching are not implemented.

## Play Store and paid launch after pilot validation

- Package the web app using a Trusted Web Activity (Bubblewrap) or a native client, sign an Android App Bundle and verify the app/site relationship with Digital Asset Links.
- Prepare the store listing, privacy/data declarations, support route and applicable account deletion controls, then test the actual phone build. No Android bundle, signing key or Play listing has been created by this change.
- New personal Play Console accounts may require a closed test with at least 12 testers opted in for 14 continuous days before applying for production access; follow the requirements shown for your account.
- Paid app features need a separate server-verified billing/entitlement design, including purchase verification, renewals, cancellation/refunds and usage limits. Google Play generally requires its billing system for in-app digital functionality unless a permitted exception/program applies. Payments are not implemented yet.
- Keep the first teacher pilot small. Validate readable originals, per-student isolation, handwriting uncertainty, manual overrides, final exports and saved data across restarts before promising a paid service.

## Official references

- Docker on Render: https://render.com/docs/docker
- Free service limits: https://render.com/docs/free
- Persistent disks: https://render.com/docs/disks
- Installable web apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Trusted Web Activities: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- Play testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Play billing policy: https://support.google.com/googleplay/android-developer/answer/10281818
