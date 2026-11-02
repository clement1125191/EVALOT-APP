# Admin control room V1

The existing sign-in page is used for administrators. A server-side admin_accounts membership is checked on every admin API request. Normal signup, profile edits, browser flags and email alone cannot grant this role. Administrator information is excluded from the encrypted offline API cache and from the service-worker cache.

## First administrator

Deploy migration 019 first. On a trusted operator machine or the backend hosting shell with DATABASE_URL already configured, run:

    node scripts/grant-admin.mjs --email existing@example.com

This previews the existing account. To assign access:

    node scripts/grant-admin.mjs --email existing@example.com --grant

For local development, add --env-file=.env immediately after node. Do not paste database URLs or passwords into chat. The account must already exist and must not be suspended. The grant is audited as an operator CLI action. There is no public admin registration route. Sign in normally after the grant; administrators enter the control room and can switch to their educator workspace.

## Available controls

Overview shows live aggregate educator, institution, paper, queue, review, publication and claim counts. Provider readiness reflects configured services, without exposing keys or claiming successful provider calls. Educator search is paginated. Suspension requires a reason, signs out existing sessions and blocks new sessions (including recovery and Google paths that create sessions); restoration allows sign-in again. Admin accounts cannot be suspended here. Account status uses revision checks and does not delete papers or marks.

Marking activity shows workbook-level operational counts, without giving administrators student scripts or mark-editing access. Billing policy saves configurable trial allowance and proposed tier rates with revision checks and required reasons. The public plans/estimate API uses the saved policy. This does not activate payments, trial credit balances, institutional funding, refunds or entitlement enforcement. Audit records preserve before/after values in append-only history.

Bootstrap and role changes require trusted database/operator access. Multi-factor authentication, delegated admin roles, school funding administration, payment operations and support workflows are follow-up work before a larger production rollout. Keep administrator access limited and protect the account credentials.
