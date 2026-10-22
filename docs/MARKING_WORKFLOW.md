# Marking workflow

The Marking screen follows: assessment and guide -> capture -> draft correction -> teacher review -> final review/export.

- Choose **Create new marking**, select a prepared paper or upload an external paper and guide, then select **One student** or **Whole class**. Both flows submit the selected mode to the existing correction service.
- Confirm structured marking rules before capture. Prepared papers reuse saved structured questions and generate the question/guide references through the existing service.
- Capture one student's front page and every remaining page. The lens alignment frame is a visual positioning guide; it does not claim automatic paper detection. Configured OpenCV cleanup remains a separate preview step.
- Whole-class mode adds **Save bundle & next student**. This confirms the current student's saved bundle before creating the next student. It keeps the camera stream available between bundles when already open. **Correct all saved students** queues only complete eligible bundles, with provider consent required.
- The progress tracker uses persisted student states: queued, processing, review/error and teacher-reviewed. It is a workflow indicator, not a speed or throughput guarantee.
- Original pages remain available next to teacher review on wide screens, and above review on small screens. Suggested and teacher-reviewed marks remain separate. A saved teacher mark differing from the AI suggestion gets a **Teacher adjusted** label.
- Final publication stays in **Marks publishing**. Existing identity, answer resolution, review, claim and revision checks still apply. Published versions and audit evidence remain preserved.

Automatic colour-group detection, specialised diagram grading and data-only/no-photo retention are not implemented by this update. Whole-class capture uses explicit student boundaries; colours are not used to infer student identity.

Validation: frontend production build passed; 27 tests passed across marking journey, dashboard/marking entry, correction review and backend correction suites, including saving a completed bundle and starting a separate student. The live frontend and API health endpoints responded successfully. Camera hardware and live AI-provider grading were not exercised by these tests.

## Class-first staged setup
Marking now opens with saved class cards. Step 2 presents separate Question paper and Marking scheme / guide panels. Each panel offers the class's Evalot papers or a device upload. Choosing one complete Evalot paper fills both panels together; choosing uploaded files requires both files. Workbook name, subject and total marks are confirmed before Step 3 shows One student / Whole class. Existing workbooks are in a separate collapsed section.
POST /api/teaching/marking-papers validates assignment ownership and returns only complete papers linked through assessment_contexts to the chosen active assignments. Legacy papers without an explicit class link are not guessed by matching display names. Correction creation accepts an optional teachingAssignmentId, validates prepared-paper context, and preserves context for an uploaded external assessment.
Validation for this update: both builds passed; 53 tests passed across six teaching, correction and UI suites.


Direct camera capture: selecting One student or Whole class opens the lens immediately. The shutter saves each page directly. Next student closes the current bundle without creating an empty bundle; correction completes the current student's pages before queuing. Original scans remain available for teacher review.
External papers may be captured before structured rules are confirmed. Both AI queueing and manual marking remain blocked until the guide is ready. Permission errors offer retry or upload; unavailable AI does not fabricate marks. Camera hardware and a live provider still need an end-to-end check on the teacher's device.

Workspace clarity update: question paper and marking guide use compact + attachment menus with Upload files / Use saved Evalot paper and removable file chips. The student camera shows a labelled Take photo action; when live preview is unavailable it opens a native image input with capture=environment. Phone/browser permission and camera behavior still require on-device confirmation. Less-used workbook controls are collapsed. The homepage shows working feature windows for preparation, camera marking, publishing, classes, materials, saved papers, headers, logos, guidelines, claims and settings.
