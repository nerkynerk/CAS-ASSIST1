# CAS Assist Presentation Test Script

This is a living script. Demonstrate a step only after its traceability entry is verified.

## Preparation

1. Use `research-compliance` with a clean tree.
2. Confirm frontend, API, and Supabase health without showing secrets.
3. Confirm public web/API URLs use HTTPS and no loopback hostname.
4. Prepare active student, archived student, faculty, staff, and super-admin accounts outside Git.
5. Install the current APK on Android 11+ and disconnect Metro/USB for standalone proof.

## Student mobile

1. Cold-start the APK and confirm controlled loading.
2. Confirm login/registration keyboards leave all controls reachable.
3. Sign in as an active student and verify session restoration.
4. Show profile, announcements, calendar, and cohort-scoped room changes.
5. Submit a supported advising request with detailed justification and a private attachment.
6. Show submitted → under evaluation → action required → resolved.
7. Show queue position, wait estimate, methodology, timestamp, and fallback/data-driven label.
8. Ask a Tier-1 question; show the approved article, confidence, and resolution feedback.
9. Ask an unrelated open-domain question and confirm the assistant defers instead of guessing.
10. Demonstrate controlled offline and retry states.

## Archived student

1. Sign in and show the read-only banner/history.
2. Prove ticket creation, AI, and protected mutations are denied in UI and backend.

## Faculty desktop

1. Confirm no advising-management access and open the role-aware AI Helpdesk.
2. Show only assigned schedules.
3. Select an assigned class/block, publish a room change, and show acknowledgments.
4. Prove an enrolled student receives the update and an unrelated student does not.

## Staff desktop

1. Confirm advising/announcement access and open the role-aware AI Helpdesk.
2. Search/filter/sort tickets, set priority, route/assign, add internal/public notes, and inspect attachments.
3. Perform valid transitions and show immutable audit history.
4. Create, preview, schedule, pin, publish, and expire a targeted announcement with an image.
5. Create and edit an academic-calendar item.

## Super admin

1. Verify a pending user and assign an allowed role/program/lifecycle.
2. Show governance audits, program settings, and verified knowledge-source versions.
3. Show System Analytics and use the AI Helpdesk to explain its reporting coverage.

## Reliability, security, and standalone proof

1. Attempt forbidden direct routes and cross-user/cohort/token access.
2. Demonstrate missing-profile, RLS-denied, timeout, offline, invalid-payload, and render-error states.
3. Confirm notification denial does not break the app.
4. Confirm no SIS/LMS, grades, tuition, or payments are modified.
5. Stop Metro, disconnect USB, relaunch the APK, restore a session, and exercise required online flows.
6. Record versions, EAS build/artifact, web/API URLs, commits, and test evidence.
