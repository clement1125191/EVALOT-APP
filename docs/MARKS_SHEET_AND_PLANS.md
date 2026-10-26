# Marks-sheet workflow and plan page

The camera action is **Mark student**. It closes that student's page bundle and calls the server's unified `/students/:id/mark` action. The server chooses configured AI marking (with sharing consent), local OCR extraction, or an unmarked manual review draft when neither is available. The request saves/queues the work and returns without waiting for OCR or AI; the camera stays ready for the next student. No automatic marks are invented when AI is unavailable.

Opening a saved workbook displays the marks sheet first. Question-paper and marking-guide details are collapsed. The table shows student identity, complete draft/reviewed totals, processing status, and Review / edit draft. Missing suggested marks display Pending rather than zero. Saved teacher changes to suggested or previously reviewed manual marks retain an Edited flag in the answer JSON and the existing audit trail.

Publish marks is enabled only when every student and answer has been reviewed, identities are confirmed and no claims remain open. The backend independently checks these conditions. Publishing preserves the existing immutable publication snapshot, labels the sheet Published, and opens that workbook in Publish marks. Published drafts are read-only; claims remain the amendment route.

Plans & billing appears above Settings on desktop and mobile navigation. It shows pilot access and proposed teacher/school options. Prices, currency, checkout, subscription entitlements and payment history are not configured. No purchase or automatic renewal can be started from this page.
