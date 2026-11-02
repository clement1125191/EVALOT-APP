# Administrator access and manual payments

This update adds migration 021. Render's existing hosted start command runs migrations automatically before starting the service. No payment API key is needed for manual transfers.

## Add another administrator

1. Ask the person to register their own Evalot account.
2. Open Admin control room > Administrator access.
3. Enter a reason and their existing account email, then choose Grant admin access.
4. They sign in with their own account. The control room is available on their next sign-in or page reload.

Access is full administrator access, including educator management, resources, support, billing settings and manual payment approval. This version does not offer limited staff roles. Use Remove access to revoke control-room privileges immediately on subsequent API requests; the educator account remains usable. You cannot remove your own access, the last active administrator, or grant access to a suspended account. Changes are revision checked and audited.

The trusted operator bootstrap command can still restore its designated administrator during server startup. Remove a bootstrap grant from the service start command if that operator should no longer be restored on future deployments. Do not share administrator passwords.

## Configure Mobile Money or bank transfer

Open Admin control room > Manual payments. Add a receiving account with a display label, beneficiary/account holder, phone or merchant number (Mobile Money), or account number and bank name. Include clear package/pricing instructions. Multiple accounts are supported.

Enable Show manual payment instructions to educators and save with a reason. Until enabled, no receiving account is exposed on educator Plans & billing. Existing reports retain a snapshot of the account the educator saw, even if receiving details later change.

Require credits or active access for automatic marking is a separate policy switch, off by default. Turning it on gates automatic correction/OCR queueing for all educators. It does not activate automatic trial credits, charge a bank account, or restrict capturing pages, manual correction, review or existing marks. Set and communicate the pilot offer before requiring purchased access. Automatic paper preparation is outside this marking-credit gate.

## Verify and activate

1. The educator transfers funds outside Evalot and submits the amount and actual unique transaction reference in Plans & billing.
2. The report is Pending. A report never activates access by itself.
3. An administrator checks the received amount and reference in the bank/Mobile Money records.
4. In Manual payments, open Review, confirm verification, enter paper credits, a future access-through date, or both, and a review note.
5. Confirm & activate records the decision and grants access atomically. Reject report activates nothing and shows the educator the reason.

Dated access allows automatic marking without consuming credits until its end date. Credits remain available afterward. An approval never shortens an already active later date. Dates use the administrator's local end-of-day converted to UTC and must be within two years. The admin assigns the agreed activation; amounts are not automatically converted using proposed price estimates.

Duplicate pending or confirmed transaction references are rejected across accounts. After an administrator rejects a report, a fresh report may use that reference; the rejected report cannot later be activated. A payment cannot be confirmed twice. Credit grants and per-student charges are immutable, and every admin decision is audited. This relies on the administrator's external verification, not an automatic bank integration. The records are payment reports, not bank statements or tax invoices.

## Credit use

One paper credit covers all pages for one student bundle in a marking workbook. Credit authorization and queueing run in the same database transaction. An unaffordable whole-class queue rolls back without spending credits or changing student capture states. Queuing the same student again after a provider error does not spend another credit; the original credit remains assigned to that bundle. Provider failures do not automatically refund credits. Dated access approvals and credit spending serialize on the educator's credit account to prevent overspending.

Manual payment access does not unlock paid model/mock marketplace files, pay contributors or activate online card checkout. Those require separate purchase entitlements and payout accounting.
