# Teacher login — Phase 1

Open the app, choose **Create account**, enter your name and email, and choose a password of at least 15 characters. Confirm it and create your account. Your new workspace starts empty. On later visits use **Sign in**. The browser can restore an unexpired session without requiring another login. Use **Sign out** in the workspace when finished.

**Keep me signed in** is off by default. When selected, the cookie and server session last up to 30 days. Otherwise the cookie is limited to the browser session and the server session expires after 12 hours. Leave this option off on shared school devices. Passwords can contain spaces; no artificial uppercase/symbol rules are imposed. The Show/Hide control helps avoid typing errors.

## Implemented boundaries

- Real teacher accounts with normalized, unique email addresses and server-derived ownership. The runtime no longer accepts a fixed development teacher identity.
- Salted scrypt password hashes: N=32768, r=8, p=3, 64-byte output. Passwords never appear in responses or application logs. Concurrent password work is capped at two per server process.
- Cryptographically random 32-byte session tokens in HttpOnly, SameSite=Lax cookies. PostgreSQL stores only SHA-256 token hashes. Each successful sign-in replaces the current browser session; logout deletes it server-side. Expired cookies cannot authorize access.
- Mutation endpoints require a custom same-origin request header and reject unapproved Origin or cross-site fetch headers. No cross-origin browser access is enabled. Login and registration receive the same protection.
- Persistent attempt limits: eight failed login attempts per email in 15 minutes, 30 login requests per source IP, and ten registrations per source IP. A successful login resets the email failure counter. The application does not trust forwarded IP headers.
- Registration, sign-in and sign-out events are append-only. Each assessment/script/download authorization uses the signed-in teacher id, not client-supplied identity.
- Existing demonstration assessments and uploads are preserved under their original legacy owner. They are not silently assigned to the first person registering. Real accounts only see assessments they own.

This is still a local-development application bound to loopback. Google sign-in and password recovery are implemented with optional provider configuration. Email verification for password registration, passkey support and MFA are not implemented. Account creation establishes an application identity, not a verified school affiliation. Hosted use still requires HTTPS/Secure cookies, verified email/recovery, operational security review and the outstanding upload safeguards. Production startup remains disabled.

## API

All mutation requests include `X-Evalot-Request: 1`. Account/session responses are `Cache-Control: no-store`. Browser cookies are set automatically; never store tokens in localStorage.

| Method | Endpoint | Body / response |
|---|---|---|
| POST | `/api/auth/register` | `{displayName,email,password,remember?}` → 201 `{teacher}` plus cookie |
| POST | `/api/auth/login` | `{email,password,remember?}` → 200 `{teacher}` plus cookie |
| GET | `/api/auth/me` | 200 `{teacher}` or 401 |
| POST | `/api/auth/logout` | 204, session revoked and cookie cleared |

Teacher response: `{id,displayName,email}`. Invalid credentials return the same 401 message for unknown email and incorrect password. Input errors return 422, duplicate registration 409, failed origin checks 403, attempt limits 429. There is no default account or shared password.

Use `AUTH_MODE=password` in `.env`. `APP_ORIGINS` is a comma-separated list of the frontend origins you actually use, such as `http://127.0.0.1:5174`. The app fails closed for unsupported authentication modes. Test files explicitly inject identities for service tests; server startup never uses that test injection.

Historical anonymous smoke scripts now require an authenticated session and are no longer the recommended live check. Use the login integration tests (`npm test`) or create an account in the UI. Login tests create disposable accounts in isolated embedded PostgreSQL, not in your app database.

Implementation references: [Node.js scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Google and password recovery
The sign-in page now includes Continue with Google, Forgot password, and Show/Hide. Recovery uses a hashed, single-use token with a 20-minute expiry and revokes all sessions after a password change. Responses do not reveal whether an email is registered. Mail delivery failures revoke the new token and record a secret-free server diagnostic.

Google uses authorization-code exchange, PKCE, a browser-bound state cookie and ten-minute state expiry. Only verified Google profiles are accepted; provider subject identifies returning teachers. Existing email/password accounts are never silently merged with Google identities; use the password or recovery flow for those accounts.

Add these keys to the ignored local .env file and restart the API: APP_PUBLIC_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, RESEND_API_KEY, EMAIL_FROM. Never paste secrets into chat. The current email adapter uses Resend; another provider can implement the injected sendReset adapter. Set APP_PUBLIC_URL=http://127.0.0.1:5174 and register http://127.0.0.1:4000/api/auth/google/callback as the Google web application's exact authorized redirect URI. EMAIL_FROM must be an authorized sender. No live provider credentials are currently present, so live delivery and Google account sign-in remain unverified.

Contracts: GET /api/auth/options returns google/recovery readiness; GET /api/auth/google begins OAuth; GET /api/auth/google/callback completes it; POST /api/auth/forgot-password accepts {email}; POST /api/auth/reset-password accepts {token,password}. Missing configured providers return 503. Reset links open the new-password form and are removed from the browser address bar immediately.

Provider references: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).
