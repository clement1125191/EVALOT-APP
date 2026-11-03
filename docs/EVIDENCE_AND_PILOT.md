# Student booklets, evidence and supervised pilot

## Educator journey

The home page has four primary actions: Prepare paper, Mark papers, Review marks and My library. It states that suggested marks need educator approval. The review overview shows pending student booklets and processing errors from the educator's open marking workbooks.

In Marking > Review marking or Review marks sheet, open a student draft. The marking booklet shows original student pages beside the question, reviewed guide/rubric, transcription, suggested mark, rationale and editable educator mark. Pages can be turned individually; question source-page buttons jump to the corresponding original page. Multi-page PDFs open in a separate PDF viewer; check each page in the booklet after inspection.

For every approval, the educator must check every original page, confirm identity, confirm each answer/mark and attest to comparing the originals with the paper and guide. Review checkboxes start unchecked, even when reopening a previously approved draft. Server validation checks that the attestation covers exactly the saved pages and question positions. The system records educator identity, time, student revision, checked pages and questions in the audited review.

These checks record an explicit human attestation; software cannot prove that a person actually read or understood an answer. Opening a screen alone is not treated as approval. All current approvals are required before publication. Later mark adjustments or reopened claims change the student revision and require approval again. Published historical versions remain preserved; migration 022 does not rewrite previous published results.

## Evidence repository

Each marking workbook has an Assessment evidence repository. Download the assessment JSON record for structured questions/guide, student drafts, approvals, publication versions, claims and audit history. It lists source IDs but does not bundle all class originals into memory.

Download a student's ZIP folder to retain unchanged original question/guide files and student pages, available cleaned versions, manifest.json, student-specific audit records, that student's historical published rows, and student-booklet.html. Unzip the folder and open the HTML booklet in a browser; Print can save a PDF or a paper copy. The HTML escapes uploaded text and contains no scripts or remote resources. Bundle exports are owner-only and limited to 60 MB; larger evidence sets can be downloaded as individual files.

The repository reuses PostgreSQL source storage. It is not a backup service, an institutional compliance certificate or a public student portal. Store exports securely, arrange database backups, define retention with each pilot institution, and ask TVET instructors which practical observation, rubric and assessor records are additionally required.

## Pilot offer and evidence of value

Start with 3-5 educators and invented/anonymized sample scripts, then obtain the institution's authorization before real student records. Keep manual payment requirements off for the initial supervised evaluation.

For each participating subject, compare at least one paper already marked by an educator with Evalot's draft and the final educator-reviewed marks. Record disagreements by question and cause: handwriting, identity, answer mapping, rubric interpretation or arithmetic. Do not describe confidence estimates as calibrated probabilities or advertise parity with an educator before representative evidence supports the claim.

Track time from capture to draft, educator review time, time spent correcting transcription, unresolved flags, failed jobs/retries, total-mark differences and whether original evidence remained available after restart. A fast but unreviewable result is not a pilot success.

Use Support for feedback and incidents. Hold a short session after each assessment to understand whether the booklet and terminology are familiar. Fix any identity mix-up, missing source, incorrect total, lost capture or publication without current approvals before expanding the pilot.

Offer a clearly described optional package only after educators see demonstrated time savings. Existing manual payments can grant dated marking access, paper credits or both; show the receiving account, package terms and review process before payment. Do not enable a paid marketplace, automatic trial offer or subscription that is not implemented.
