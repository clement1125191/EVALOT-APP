# Admin resources, support and wording

Open Admin control room with an active administrator account. This update adds migration 020. The hosted start command already runs migrations before serving requests.

## Resources & marketplace

Create Logo, Header, Model or Mock. Enter its institution, subject and level. Upload a source PNG/JPEG or a scanned PDF (10 MB maximum); logo uploads require an image. Original files are retained immutably in PostgreSQL. Images receive EXIF rotation, bounded resizing and sharpening. Refinement does not reconstruct unreadable text.

For headers, edit each visible field, alignment, bold and footer. Preview the rebuilt paper. For model/mock papers, enter paper metadata, sections, questions, answer keys and essay rubric criteria. Publishing requires distribution rights confirmation and validates marks and rubric totals. Save draft does not replace the live published snapshot.

Optional AI extraction uses the existing Gemini or OpenAI server configuration. No key is exposed to the browser. The administrator explicitly consents before sending source documents. Header extraction transcribes only visible fields. Paper import requires both question paper and guide; extracted content stays draft and needs review. Manual entry works without an AI provider.

Published logos appear in school logo search. Headers and model/mock papers appear in My library > Shared templates & model papers. Free resources can be copied into a private educator library. Existing copies survive archiving and retain educator ownership.

Educators can submit model/mock papers with a proposed RWF price. Admins review submissions, publish or return for changes. Paid listing metadata can be shown, but source files, answers and copies are locked. **Checkout, purchase entitlements, contributor payouts and sales accounting are not implemented or active.** No payments are collected. Connect a payment provider and implement verified webhook entitlements before enabling paid downloads.

## Educator support

Educators use Support to create private requests. Administrators read and reply in Educator support, choosing Open, In progress or Resolved. Educator replies reopen resolved requests. Replies are append-only and version checked. No email/SMS notifications are sent. Do not paste passwords, secrets or student scripts into support requests.

## App wording

Admins can draft and publish mission, vision, fairness and empathy text, plus workspace section headings and sidebar labels. These are plain text, safely rendered by React. Other app labels remain in source code; this is a bounded content editor, not a full localization or page builder. A saved draft does not change public wording until published.

## Deployment

Commit and push to main. Render runs migration 020 using the existing hosted start command. Vercel builds the updated frontend. Check both deployment logs; a successful local build does not confirm hosted deployment. Keep APP_PUBLIC_URL and APP_ORIGINS consistent with https://evalotapps.vercel.app.

Resource files are stored in PostgreSQL, unlike temporary server upload storage. Monitor database capacity and arrange durable backups before expanding the pilot.
