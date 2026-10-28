# Continuous camera and offline capture

Mark & next student saves the student boundary, clears the page counter, increments the student number and keeps the camera stream mounted. Only explicit Close, Pause & review or Review leaves the camera. Missing guide information does not redirect the capture action to instruction setup.

## Prepare a device online once

1. Sign in and open Settings > Passcode & offline capture on a private device.
2. Choose and confirm a 6-12 digit passcode. The current server session is rotated into a remembered, HttpOnly 30-day cookie. This does not replace account authentication.
3. Refresh the offline workspace. Recent classes, assessment metadata and up to 30 recent marking sessions are encrypted in IndexedDB. The public app shell and hashed frontend assets are cached separately by the service worker; API responses are never put in the service-worker cache.
4. Open the marking workbook with its question paper and matching guide while online. New workbook creation, new institution setup and reference uploading need a connection. Offline capture resumes saved workbooks; it cannot create a server account or fetch an unseen class offline.

## Capture and reconnect

With the encrypted workspace unlocked, each photo is saved locally before the UI reports success. Student boundaries are saved separately, so a complete class can be captured without connectivity. An incomplete student's bundle resumes when its workbook is reopened. The camera shows student number, per-student page count and saved/uploading/waiting status.

When connected and Evalot is open and unlocked, complete bundles sync sequentially in the background. Stable student UUIDs and upload UUIDs make uncertain retries idempotent; reuse with different page bytes is rejected. Server ownership checks apply on every request. The client records individual uploaded pages, confirms the student boundary and requests marking. Local image payloads are removed only after the server acknowledges the bundle and marking action; errors or unreadable guides retain the photos and show a retry/waiting entry. Closing or locking the app pauses syncing; reopen and unlock online to continue. No claim is made about background uploads while the browser is closed.

If an uploaded guide has no structured rules yet, the configured vision provider can transcribe it automatically in the background with explicit sharing consent. It must pass question/answer/rubric/total validation, uses the session's saved fair-marking defaults, and creates an audit event. Unreadable or mismatched guides wait for review in Settings. No artificial guide, marks or student identity is invented. All final marks and publication still require educator review.

## Device data and passcode limits

Records use AES-256-GCM with a fresh nonce per record and a non-extractable key derived using PBKDF2-SHA256 (310,000 iterations and random salt). The encryption key and plaintext passcode are not stored. This is a device convenience lock, not independent server authentication or protection against a fully compromised browser. Online session expiry requires account sign-in again; it does not delete encrypted captures. Offline passcode attempts have a local delay after five failures, which is not a substitute for server authentication.

Student photos are limited to 10 MB each, 50 pages and 20 MB per student. Browser quota failures are reported before a page is acknowledged as saved. Private browsing, clearing site data or losing the passcode can make pending captures unrecoverable. Device removal explicitly warns before deleting unsynced work. Storage persistence is requested where supported, but browsers may still clear local data. Test on the actual phones used in the pilot, including airplane mode, refresh/reopen, low storage, failed uploads and expired sessions.
