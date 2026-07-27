# Current Gap Audit

## Baseline

- Branch: `research-compliance`
- Baseline commit: `d9726ee`
- Expo SDK: 56; React Native: 0.85.3
- App version: 1.0.1; Android versionCode: 2
- Android package: `com.daviddino.casassist`
- Root app contains `package.json`, `app.json`, `eas.json`, `src/`, and `assets/`

## Existing implementation worth preserving

- One Expo Router frontend with platform-specific native and web tab shells.
- Stable JavaScript tabs on native and a session-plus-profile authentication gate.
- Four role identifiers and the `active` / `archived_read_only` profile-state type.
- Student, faculty, staff, and super-admin dashboard components.
- Partial advising tickets, announcements, room changes, acknowledgments, document requests, and chatbot UI.
- Supabase Auth persistence, data reads, RPC calls, and several Realtime subscriptions.
- Android login/registration keyboard resize, a release render error boundary, and an EAS preview APK profile.

## Confirmed critical gaps

### Architecture and reproducibility

- No `server/` Node/Express implementation.
- No `supabase/` migrations, RLS policies, storage policies, generated types, or demo seed.
- No automated tests or test runner.
- Remote tables are implied by client queries but schema and policy behavior are not reproducible.

### Identity and authorization

- Registration validates institutional email only in the client and does not collect a verified CAS program code.
- Client signup assigns `student` and `active`; no reproducible pending-verification workflow exists.
- Faculty currently receives the tickets tab.
- Chatbot is hidden rather than a role-protected student-only route.
- Super-admin tooling lacks verified role/lifecycle mutations and immutable audit evidence.

### Advising and operations research

- Advising uses `open`, `in_progress`, `pending_review`, `resolved`, and `closed`.
- No private attachments, internal notes, assignment/routing history, or immutable audit log.
- Client owner filters cannot substitute for RLS.
- Little’s Law and queue position run in `src/app/tickets.tsx`; historical triangular parameters and trusted analytics are absent.

### AI

- `/api/ai/query` has no repository implementation or deployed HTTPS endpoint.
- Feedback, deflection logging, explicit escalation, citations, confidence rejection, and source administration are absent.
- `scripts/seed-knowledge-base.mjs` contains sample policy/program/office/fee/grade/timeline claims with no supplied official source. It must not be run or represented as official.

### Spatial logs, communications, and calendar

- Faculty room updates use free-text inputs rather than an assigned-schedule control.
- Student spatial queries are not visibly constrained to enrolled cohorts.
- Announcement creation exists, but full lifecycle and image support do not.
- No academic calendar module exists.

### Notifications

- `src/hooks/use-push-notifications.ts` imports `expo-notifications` at module top level.
- Token registration uses an incorrect hard-coded project identifier and writes into the user registry.
- No notifications config plugin, device-token table, sender, delivery log, logout cleanup, or payload router exists.
- Firebase/FCM V1 status is external and must not be fabricated.

### Repository hygiene

- `client/` and `client-broken/` are nested starter apps with no root-app references.
- `dist/` is generated output.
- This audit performs no destructive cleanup.

## Environment names (values omitted)

Frontend: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`.

Existing seeder: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

## External blockers

- Official CAS handbook, approved procedures, and official memos.
- Supabase CLI authentication/linking if remote schema inspection requires it.
- Public API/web hosting authorization.
- Firebase/FCM V1 configuration and custom development-build testing.
- Physical devices and role-specific accounts for final verification.

