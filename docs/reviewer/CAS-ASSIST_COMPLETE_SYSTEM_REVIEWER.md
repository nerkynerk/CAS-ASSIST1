# CAS-ASSIST — COMPLETE SYSTEM TECHNICAL REVIEWER

## Source Code Walkthrough, Architecture, Database, APIs, and Capstone Defense Preparation

### Student study edition

**Repository:** CAS-ASSIST1
**Branch:** `octup/safe-enhancements`
**Revision:** `3270d8dce2e948b80244c365f309463dc546edde`
**Evidence captured:** 2026-10-23T03:09:00.988Z
**Textual authored files covered:** 104
**Defense questions:** 105

> This reviewer is generated from the repository snapshot above. It distinguishes confirmed implementation from documentation claims, planned behavior, unavailable services, and unverified live state. It does not reproduce credentials, private user records, or live database data.

---

# Contents

1. System introduction and evidence rules
2. Technology stack
3. System architecture and data flow
4. Frontend deep dive
5. Backend and API deep dive
6. Supabase, PostgreSQL, and security
7. End-to-end workflows
8. Testing, deployment, limitations, and improvement plan
9. Programming concepts glossary
10. Capstone defense question-and-answer reviewer
11. Complete source-file walkthrough index
Appendix A. Coverage and evidence rules
Appendix B. Complete sanitized source appendix

# 1. System introduction and evidence rules

CAS-Assist is a cross-platform academic information and helpdesk system for the New Era University College of Arts and Sciences. The implemented product combines an Expo/React Native client, React Native Web, Supabase Auth/PostgreSQL/RLS/Realtime/RPC, and an optional Express gateway for trusted operations.

The central problem is fragmentation: students need one place to submit and follow requests, read official updates, see room changes, request documents, and ask bounded help questions; faculty need schedules and room-change publishing; staff need operational queue and document tools; super administrators need account, audit, and aggregate analytics visibility.

## Evidence vocabulary

- **Implemented:** directly represented by a route, component, query/RPC call, migration, or backend handler in this revision.
- **Scaffolded/partial:** present in code or schema but not end-to-end complete, such as notification delivery.
- **Optional/external:** depends on EXPO_PUBLIC_API_URL and a separately deployed Express service.
- **Unverified:** cannot be proven from local files, such as the live remote schema or deployed production state.

## User roles and responsibilities

| Role | Implemented capabilities |
| Student | Register/sign in, view dashboard, create/track advising requests, request documents, view announcements and cohort room changes, acknowledge room changes, use FAQ/AI, edit display name/theme. |
| Faculty | View own schedules/assignments, publish room changes for assigned classes, monitor acknowledgements, view announcements, use FAQ/AI. |
| Staff | Manage queue and document requests, publish announcements, view operational dashboard, use protected ticket detail actions, use FAQ/AI. |
| Super Admin | All authorized management views plus users, protected audit history, system analytics, and administration-scoped operations. |

## Main modules

- Authentication and account registry
- Role dashboards and responsive navigation
- Advising ticket/request workspace and dynamic ticket details
- Document request workflow
- Announcements and faculty room changes
- Closed-domain FAQ and AI Helpdesk
- Profile/theme settings
- Management queue, users, announcements, documents, and audit history
- Super-admin system analytics and optional queue analytics API

# 2. Technology stack

| Technology | Verified use | Trade-off/defense point |
| React 19.2.3 | Component/state model for the interface. | Fast iteration and composition; requires disciplined state/effect boundaries. |
| React Native 0.86.3 | Cross-platform View, Text, Pressable, ScrollView, forms, and layout. | Shared code, but platform differences require compatible styles and wrappers. |
| Expo SDK 57.0.17 | Runtime, export, platform modules, splash, notifications, SQLite local storage install. | Expo conventions simplify delivery but tie versions to its SDK. |
| Expo Router 57.0.21 | File-based routes, Tabs, dynamic ticket route, deep links. | Route registration must distinguish permanent tabs from detail screens. |
| TypeScript 6.0.3 | Interfaces, unions, generic API wrappers, typed route/component props. | Runtime validation is still needed for network/database values. |
| React Native Web 0.21.0 | Browser rendering and custom web sidebar navigation. | Web focus/CSS behavior must be tested separately from native. |
| Supabase JS 2.106.2 | Auth, table queries, RPC, Realtime channels, client persistence. | RLS and RPC grants become critical security boundaries. |
| PostgreSQL/Supabase SQL | Schema, enums, constraints, triggers, RLS, functions, storage buckets. | Migration order and remote drift must be managed. |
| Express 5.2.1 | Optional trusted API gateway for queue, AI, health, and notification routes. | Requires separate Render service, CORS, environment, and availability management. |
| Zod 4.4.3 | Runtime request validation in Express. | Schemas must stay aligned with clients and database contracts. |
| Helmet/CORS/rate limit/pino | HTTP hardening, origin allowlist, request limits, redacted logging. | Correct configuration is deployment-specific. |
| Vercel | Static Expo web export hosting via vercel.json. | Preview environment must point to the correct API origin. |
| Render/Docker | Container build/start configuration for Express. | Backend deployment is separate from Vercel frontend delivery. |
| Vitest 4.1.10 | Backend unit tests for retrieval and queue math. | Frontend automated coverage is absent in this repository. |

## Package and deployment facts

- Frontend scripts: `npm run typecheck`, `npm run lint`, `npm run build:web`, and composite `npm run check`.
- Backend scripts: `npm run build`, `npm run typecheck`, `npm test`, `npm run dev`, and live verification scripts.
- Backend requires Node `>=20.19`; Docker uses Node 20 Alpine.
- Backend configuration validates `NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`/fallback service key, `ALLOWED_ORIGINS`, optional OpenAI/Expo values, and timeout.

# 3. System architecture and data flow

## High-level architecture

```architecture
Browser / iOS / Android
        |
        v
Expo Router + React Native UI
        |------------------------------|
        | authenticated Supabase client | optional bearer API client
        v                              v
Supabase Auth/Postgres/RLS/RPC/Realtime     Express 5 gateway
        |                              |
        |                              +--> server Supabase client
        |                              +--> queue / AI / notifications
        v
Role registry, tickets, documents,
announcements, schedules, room changes,
knowledge, audit, analytics
```

The client is not a thin REST-only frontend: most screens query Supabase directly with the publishable key and depend on RLS. The Express service is optional for operations that need a trusted server boundary or are not yet implemented as frontend-safe RPCs. This split explains why the app can still show the super-admin system snapshot while queue analytics or the optional AI gateway is unavailable.

## Authentication flow

```flow
sign up/sign in
  -> Supabase Auth session
  -> AuthProvider fetches users_account_registry
  -> category/role/lifecycle check
  -> AppGate mounts authenticated workspace
  -> Tabs/RoleGuard/UI visibility
  -> RLS/RPC/backend checks enforce data access
```

A role check in the UI is only an experience control. The authoritative protections are the Supabase policies, SECURITY DEFINER function checks/grants, database constraints/triggers, and Express middleware on API routes.

## Navigation architecture

| Route | Purpose | Permanent navigation? |
|---|---|---|
| / | Role-routed dashboard: student, faculty, staff, or super admin. |
| /admin | Staff/super-admin management workspace: queue, announcements, documents, users, audit. |
| /analytics | Super-admin system analytics backed by get_system_analytics plus optional queue API. |
| /tickets | Student request list, queue metrics, request creation, filtering, and history. |
| /ticket/[id] | Dynamic ticket detail; hidden from permanent tab/sidebar navigation with href null. |
| /documents | Student document-request list and creation form. |
| /explore | Announcements and student room-change updates. |
| /chatbot | Closed-domain AI Helpdesk with Express-first and Supabase fallback. |
| /faq | Approved Tier-1 knowledge article search and expansion. |
| /profile | Account information, theme selection, display-name edit, and sign out. |

Native and web tabs both register `ticket/[id]` with `href: null`, so the dynamic detail destination remains routable but is not rendered as a sidebar or bottom-tab item. The web implementation replaces the default tab bar with a WorkspaceNavigation component at desktop widths and a compact bottom navigation at smaller widths.

# 4. Frontend deep dive

## Startup and protected workspace

RootLayout composes AppThemeProvider, AuthProvider, and ThemedApplication. AppGate handles configuration errors, loading indicators, login/registration views, and authenticated workspace mounting. AuthenticatedWorkspace deliberately keeps AppTabs mounted so the router is not torn down during sign-out/sign-in transitions, then resets the route only after a subsequent authentication while preserving initial deep links.

## State and data patterns

- `useState` owns form values, filters, loading flags, local views, and transient messages.
- `useEffect` loads initial data, subscribes to Supabase Realtime, and removes channels on unmount.
- `useCallback` stabilizes fetch functions used by effects and refresh handlers.
- `useMemo` derives filtered lists, status options, metrics, and feature usage without changing source records.
- `useRef` preserves an async fetch reference or input/list handle without triggering renders.
- `RoleGuard` protects student, faculty, staff, and super-admin screens in addition to tab visibility.

## Screen summary

- **Home:** selects a role dashboard from `profile.role`.
- **Student dashboard:** active requests, recent announcements, room changes, acknowledgement, and shortcuts.
- **Faculty dashboard:** schedules, assignments, room-change form, acknowledgement counts, and announcements.
- **Staff dashboard:** ticket/document counts, optional queue analytics, urgent tickets, and status overview.
- **Admin management:** direct Supabase queue/document/announcement/user/audit operations with filters and role-aware tabs.
- **Tickets:** student-owned request queries, local queue metrics, NewTicketForm, filtering, and `/ticket/[id]` links.
- **Ticket detail:** ownership-aware loading, staff/admin transitions, public notes/timeline, super-admin audit visibility, and Realtime updates.
- **Documents:** student-owned list and form with document type, purpose, copies, and status.
- **Explore:** targeted announcements, room-change filters, search/sort, student acknowledgements, and staff announcement link.
- **Chatbot/FAQ:** approved knowledge UI; chatbot uses API-first with Supabase fallback, FAQ reads active articles directly.
- **Profile:** role/state summary, theme persistence, display-name update, and sign out.

## Design system

The token layer defines teal/sage/mist colors, light/dark palettes, system/Inter-like fonts, 4/8/16/24/32/64 spacing, 44px touch targets, 720/980px breakpoints, 10/14/18px radii, and restrained shadows. `Academic`, `SurfaceCard`, `MetricCard`, `StatusBadge`, `ActionButton`, `RoleHeroHeader`, `BentoGrid`, and `BentoPanel` provide a consistent visual language. `global.css` adds browser typography, safe-area, reduced-motion, and theme variables; its min-width media block should be reviewed because the checked-in CSS has a missing closing brace at line 98.

# 5. Backend and API deep dive

## Server startup and middleware

config.ts loads dotenv and validates environment variables with Zod. supabase.ts creates a non-persisted trusted client using the server secret. app.ts disables x-powered-by, installs Helmet, exact-origin CORS, JSON parsing, timeout handling, pino redacted logging, and a 120-per-minute rate limiter, then mounts route modules. index.ts listens on `config.PORT` at `0.0.0.0` and handles SIGTERM/SIGINT graceful shutdown.

## Endpoints

| Method | Route | Authentication and purpose |
|---|---|---|
| GET | /api/health | Public health response; no auth middleware. |
| POST | /api/ai/query | Authenticated active accounts; role-filtered Tier-1 retrieval and query log. |
| POST | /api/ai/feedback | Authenticated active accounts; updates only the caller’s query log. |
| POST | /api/ai/escalate | Authenticated active students; delegates to the service-role-only escalation RPC. |
| GET | /api/queue/estimate | Authenticated students; calls get_student_queue_estimate. |
| GET | /api/queue/analytics | Authenticated staff or super admins; calls get_queue_analytics. |
| POST | /api/notifications/send | Authenticated active staff or super admins; currently accepts but does not deliver. |

The route modules use `requireAuth` to validate the bearer token through Supabase Auth and then load the application registry profile. `allowRoles` checks role; `requireActive` blocks archived read-only accounts. Zod errors become 400 responses, missing routes become 404, and unexpected errors become generic 500 responses after redacted logging.

## Queue analytics response and dependency

The backend `/api/queue/analytics` endpoint accepts `windowHours` from 1 to 2160 and an optional category, then calls `get_queue_analytics`. The database function calculates active load, arrivals per hour, resolved count, minimum, maximum, mode, triangular expected time, source, and timestamp. The Express route correctly restricts callers to staff and super_admin; however, the database function itself is SECURITY DEFINER without an internal profile-role check in the checked-in migration and without a visible restricted grant. Treat this as a separate approved security correction, not as proof that the route is safe to expose directly.

## AI endpoint behavior

The AI route filters active Tier-1 articles by audience role, ranks them with knowledge-retrieval.ts, logs every query, and returns either a confident answer or a closed-domain deflection. Feedback is matched to both query id and authenticated student id. Escalation is student-only at the route and is delegated to a service-role-only RPC that verifies query ownership before creating a ticket.

## Known backend partial implementations

- Notifications `/send` returns 202 after checking EXPO_ACCESS_TOKEN but does not deliver messages; comments describe a future worker.
- The frontend does not currently call the notification endpoint.
- The backend queue estimate route exists, but the student screen computes a local estimate instead of calling it.
- Optional API availability is deployment-dependent; missing `EXPO_PUBLIC_API_URL` deliberately raises a controlled optional-service error.

# 6. Supabase, PostgreSQL, and security

## Core data model

```er
auth.users 1--1 users_account_registry
users_account_registry 1--* advising_ticket_pipeline
users_account_registry 1--* document_requests
users_account_registry 1--* faculty_assignments
faculty_assignments *--* users_account_registry via student_enrollments
faculty_assignments 1--* schedules
advising_ticket_pipeline 1--* ticket_audit_logs
advising_ticket_pipeline 1--* ticket_attachments
spatial_logs *--1 faculty_assignments
spatial_logs *--* users_account_registry via acknowledgments
handbook_source_documents 1--* handbook_knowledge_embeddings
tier1_knowledge_articles -> AI query selection
ai_query_logs -> optional ticket escalation
```

The migration set creates identity, academic, ticket, document, announcement, room-change, notification, handbook, AI, and settings tables. It adds enums, checks, foreign keys, indexes, triggers, private Storage buckets, and explicit policies. The database migration plan correctly warns that local SQL is not evidence of current remote state.

## Key policies

- Profiles: self or staff/admin read; self display update while active; governance fields protected by trigger.
- Tickets: owner/staff read; active students insert their own submitted tickets; staff/admin update.
- Documents: student owner read/insert; staff/admin read/update when active.
- Schedules: faculty owner or staff/admin read; active owner/staff/admin manage.
- Spatial logs: assigned faculty insert/update; faculty, super admins, or enrolled students read.
- Announcements: published, time-valid, audience-matching users read; staff/admin manage.
- AI logs: owner or super-admin read; active students insert their own logs.
- Settings/knowledge sources: super-admin management; verified knowledge reads are tied to verified active source documents.

## Security findings

1. **High-priority review item:** `get_queue_analytics` is SECURITY DEFINER and relies on its caller path for role enforcement. Add an internal `current_profile_role()` check and explicit grants/revokes through an approved migration before direct authenticated RPC exposure.
2. **Health path mismatch:** frontend `checkApi()` requests `/health`, while Render and Express expose `/api/health`; this can misreport the API as unavailable.
3. **Frontend CSS syntax:** `global.css` appears to omit the closing brace for the `@media (min-width: 980px)` block.
4. **Operational gap:** notification sending is accepted but not delivered.
5. **Coverage gap:** no frontend unit-test suite is present.
6. **Schema drift risk:** migration files include compatibility bridges for prototype columns; remote schema must be inspected before applying migrations.

# 7. End-to-end workflows

### Student registration

1. The landing role card invokes AppGate's category callback.
2. RegisterScreen validates NEU email, name, student number, password length, and confirmation.
3. AuthProvider calls supabase.auth.signUp with display_name and student_number metadata.
4. The database create_registry_profile trigger creates a student registry row.
5. If Supabase returns no session, the UI shows the email-confirmation state; if a session exists, the profile is loaded and role/category is checked.

**Source evidence:** Frontend/src/components/auth/register-screen.tsx:38-64; Frontend/src/context/auth.tsx:215-238; Backend/supabase/migrations/202609130001_student_number_registration.sql:24-42

### Student login and role routing

1. LoginScreen trims/lowercases the email and requires @neu.edu.ph.
2. AuthProvider calls signInWithPassword, then loads users_account_registry.
3. categoryAllowsRole rejects a student account selected as institutional, or vice versa.
4. AppGate mounts the authenticated workspace only when both session and profile exist.
5. The home route switches on profile.role.

**Source evidence:** Frontend/src/components/auth/login-screen.tsx:36-59; Frontend/src/context/auth.tsx:54-60,198-213; Frontend/src/app/_layout.tsx:85-165; Frontend/src/app/index.tsx:7-13

### Student creates an advising request

1. The /tickets page is protected by RoleGuard(['student']).
2. The New Request header action changes local ScreenView from list to new.
3. NewTicketForm requires a category and non-empty description.
4. It inserts into advising_ticket_pipeline with the current user id, normalized category, normal priority, submitted status, and default active state.
5. Supabase RLS requires student_id = auth.uid(), student role, active state, and submitted status.
6. On success, the list refreshes and the existing dynamic /ticket/:id route opens with created=1.

**Source evidence:** Frontend/src/app/tickets.tsx:255-369,375-505; Backend/supabase/migrations/202607280001_research_compliance.sql:695-706

### Staff processes a ticket

1. AllTickets loads active tickets with the related student registry display fields.
2. Staff can filter, search, sort, open a detail route, and choose the next transition.
3. The UI updates status directly through the authenticated Supabase client.
4. validate_ticket_transition enforces the allowed state graph and sets resolved_at for resolved tickets.
5. audit_ticket_changes writes an immutable ticket_audit_logs row.

**Source evidence:** Frontend/src/app/admin.tsx:219-454; Frontend/src/components/tickets/ticket-detail-screen.tsx:223-242; Backend/supabase/migrations/202607280001_research_compliance.sql:483-528

### Faculty room change

1. FacultyDashboard loads only the current faculty's schedules and assignments.
2. The room-change form requires an assigned active class, original room, and new room.
3. It inserts spatial_logs with the assignment relationship.
4. RLS requires the faculty account, active state, faculty role, and a matching assignment.
5. Enrolled students read cohort-scoped changes and acknowledge through acknowledge_room_change.

**Source evidence:** Frontend/src/components/dashboard/faculty-dashboard.tsx:110-226; Frontend/src/components/dashboard/student-dashboard.tsx:277-312; Backend/supabase/migrations/202607280001_research_compliance.sql:745-779

### AI Helpdesk

1. ChatbotScreen adds the user message locally.
2. It tries POST /api/ai/query with the bearer session token.
3. If the optional API is unavailable, it calls answer_tier1_question through the authenticated Supabase client.
4. Both paths return a confidence-scored, role-scoped Tier-1 answer or a non-guessing deflection.
5. Feedback follows the same Express-first/Supabase-fallback strategy.

**Source evidence:** Frontend/src/app/chatbot.tsx:137-201; Backend/src/routes/ai.ts:13-108; Backend/supabase/migrations/202609130004_tier1_answer_rpc.sql:23-122

### Super-admin analytics

1. AnalyticsScreen is protected by RoleGuard(['super_admin']).
2. The selected 7/30/90-day window is passed to get_system_analytics.
3. The SECURITY DEFINER RPC checks current_profile_role() = super_admin before returning grouped JSON.
4. In parallel, the screen checks the optional Operations API and requests queue analytics.
5. Supabase reporting can remain available when the queue API is unavailable, while the health indicator describes the API separately.

**Source evidence:** Frontend/src/components/analytics/system-analytics-screen.tsx:207-256; Backend/supabase/migrations/202609130002_system_analytics.sql:3-91; Backend/src/routes/queue.ts:27-40

### Profile update and logout

1. ProfileScreen prevents empty names and archived read-only edits.
2. It updates only display_name on the current registry row.
3. The governance trigger rejects role/state/verification changes outside administrative authority.
4. Sign out clears the Supabase local session, context state, and browser URL.

**Source evidence:** Frontend/src/app/profile.tsx:64-92; Frontend/src/context/auth.tsx:238-260; Backend/supabase/migrations/202607280001_research_compliance.sql:438-459

# 8. Testing, deployment, limitations, and improvement plan

## Local validation commands

```powershell
cd Frontend
npm ci
npm run typecheck
npm run lint
npm run build:web

cd Backend
npm ci
npm run typecheck
npm test
npm run build
```

The repository’s backend unit tests do not require live credentials. Verification scripts do require environment files and may create/update/delete disposable records; do not run them against production without explicit approval and a backup/test plan. The reviewer was generated without running SQL or changing live records.

## Deployment topology

- Vercel builds the Expo web app from Frontend with `npm run build:web` and serves `dist` using the single-output rewrite.
- Render runs Backend as a Docker web service with Node 20, `npm run build` in the build stage, `npm start` in production, and `/api/health` as the health check.
- Vercel Preview must set `EXPO_PUBLIC_API_URL` to the Render HTTPS origin if optional API features are required; never put backend secrets in `EXPO_PUBLIC_` values.

## Limitations and future improvements

- Complete and authorize queue analytics at the database layer.
- Align Analytics health check to `/api/health` and add an integration test for the indicator.
- Implement notification registration/delivery worker and verify token lifecycle.
- Add attachment UI/storage upload flow if required by the approved scope.
- Add frontend unit tests, route/role end-to-end tests, and accessibility checks at 390/768/1024/1440 widths.
- Add CI for typecheck, lint, Expo export, backend build/test, and migration verification.
- Review migration compatibility bridges and run schema introspection against a disposable Supabase project.
- Close the CSS brace issue and run a browser stylesheet parser/lint check.

# 9. Programming concepts glossary

### Authentication

Proving who a user is. CAS-Assist uses Supabase Auth sessions and bearer access tokens.

### Authorization

Deciding what an authenticated user may do. CAS-Assist combines role/lifecycle checks, RLS policies, RPC checks, and UI guards.

### RLS

PostgreSQL Row Level Security. It evaluates policies for each row using auth.uid() and profile helper functions.

### RPC

Supabase remote procedure call. Frontend code invokes database functions such as get_system_analytics and acknowledge_room_change.

### Security definer

A PostgreSQL function execution mode that runs with the function owner’s privileges. It must validate the caller internally.

### React component

A reusable function or class that returns UI. CAS-Assist uses functional TSX components.

### Props

Inputs passed into a React component, such as ticketId or onPress.

### State

Data owned by a component that can trigger a re-render; useState is used for forms, loading, filters, and views.

### Effect

A useEffect callback for work after render, such as loading data or subscribing to Realtime.

### Memoization

Caching derived values with useMemo or stable callbacks with useCallback to avoid unnecessary work.

### Promise/async-await

JavaScript’s model for asynchronous operations. Database, API, and auth calls use await and explicit error handling.

### REST endpoint

An HTTP method and path with request/response semantics, such as GET /api/queue/analytics.

### Middleware

Express functions that run before route handlers, including CORS, auth, rate limiting, and error handling.

### Zod validation

Runtime validation of untrusted request data, used by backend AI, notification, and queue routes.

### Environment variable

Configuration supplied outside source code. Public Expo variables are safe client configuration; backend secrets are never public.

### Responsive Flexbox

Cross-platform layout using flexDirection, flexBasis, flexWrap, gap, and breakpoints rather than browser-only CSS grid.

### Realtime

Supabase event subscriptions used for ticket updates, announcements, room changes, and acknowledgements.

### CRUD

Create, read, update, and delete operations; frontend screens use Supabase insert/select/update and limited delete paths.

### Idempotent migration

A migration written so rerunning it is safe where possible, using IF NOT EXISTS and guarded changes.

### Least privilege

Granting only the access needed. The review identifies one exception requiring correction: get_queue_analytics is SECURITY DEFINER without an internal role check in the migration.

### Defense in depth

Multiple independent controls: UI visibility, route guards, bearer verification, role checks, RLS, triggers, and constraints.

# 10. Capstone defense question-and-answer reviewer

Study the answers as explanations of the current repository, not as generic framework definitions. When a panelist asks about an unverified or partial feature, answer with the limitation explicitly.

### 1. What problem does CAS-Assist solve?

**Answer:** It provides one academic-service workspace for requests, queues, documents, announcements, room changes, FAQ/AI help, and role-specific operations for the College of Arts and Sciences.

### 2. Who are the users?

**Answer:** The registry defines student, faculty, staff, and super_admin roles. Login categories map students to student access and all institutional roles to institutional access.

### 3. Why use React Native?

**Answer:** It lets one TypeScript component model target iOS, Android, and web while preserving native controls and platform-specific navigation behavior.

### 4. Why use Expo?

**Answer:** Expo supplies the runtime, build tooling, Router integration, platform modules, notifications, and web export used by this repository.

### 5. Why use Expo Router?

**Answer:** Routes are file-based under Frontend/src/app, which gives named screens, deep links, dynamic ticket IDs, and tab navigation.

### 6. Why TypeScript?

**Answer:** Interfaces and union types document data shapes such as UserProfile, TicketRow, AdminTab, and analytics groups while catching mistakes before runtime.

### 7. Why Supabase?

**Answer:** It combines Auth, PostgreSQL, RLS, RPC, storage, and Realtime behind one authenticated client, reducing custom CRUD plumbing.

### 8. Why is Express still used?

**Answer:** The optional backend supplies trusted server-side bearer validation, role/lifecycle middleware, queue endpoints, AI retrieval, feedback, escalation, health, and notification gateway behavior.

### 9. How is the frontend authenticated?

**Answer:** Supabase Auth persists sessions in AsyncStorage, exposes getSession and onAuthStateChange, and AuthProvider loads the registry profile after authentication.

### 10. What is the frontend role guard?

**Answer:** RoleGuard checks the loaded profile role before rendering a protected screen. It improves UX but is not the database security boundary.

### 11. What is the backend role guard?

**Answer:** requireAuth verifies the bearer token with Supabase Auth and loads the registry; allowRoles and requireActive then enforce endpoint permissions.

### 12. How does RLS protect data?

**Answer:** Policies compare auth.uid() and current_profile_role/state to the row owner or allowed operational role. Direct clients still cannot bypass those policies merely by changing UI code.

### 13. How are role changes protected?

**Answer:** protect_profile_governance rejects role, lifecycle, verification, and verification-audit changes unless the caller is service_role.

### 14. How does a student submit a request?

**Answer:** The student form validates category/description, inserts a submitted active ticket owned by the student, then navigates to /ticket/:id?created=1 after refresh.

### 15. How are ticket statuses constrained?

**Answer:** The database trigger permits submitted to under_evaluation/resolved, under_evaluation to action_required/resolved, and action_required to under_evaluation/resolved.

### 16. Why is ticket detail dynamic?

**Answer:** A ticket ID identifies one record, so /ticket/[id] is a detail route rather than a permanent navigation item. Both tab implementations register it with href null.

### 17. How does a student see only their ticket?

**Answer:** The query filters by the current student id and RLS permits ticket reads when student_id = auth.uid(); detail also performs a client ownership check.

### 18. How do staff update tickets?

**Answer:** Staff use the Management queue or detail action; the authenticated Supabase update is filtered by ticket id and RLS allows staff/admin updates. The trigger still validates transitions.

### 19. What is audit history?

**Answer:** An after insert/update/delete trigger writes ticket_audit_logs. A second trigger rejects audit-row update/delete, and only super admins have the select policy.

### 20. How does queue estimation work?

**Answer:** The student screen currently computes a simple active-load/last-24-hour arrival model locally; the backend exposes get_student_queue_estimate and the Express route separately.

### 21. What does queue analytics return?

**Answer:** The RPC calculates window hours, active load, arrivals/hour, resolved count, min/max/mode duration, triangular expected duration, source label, and calculation time.

### 22. What is the queue analytics security concern?

**Answer:** get_queue_analytics is SECURITY DEFINER and the migration does not show an internal staff/super-admin check or explicit restricted grant. The Express route checks roles, but direct RPC exposure must be corrected separately.

### 23. How does system analytics work?

**Answer:** Super Admin calls get_system_analytics with 7/30/90 days. The RPC explicitly requires current_profile_role() = super_admin and returns grouped JSON.

### 24. What happens if the Operations API is offline?

**Answer:** AI falls back to Supabase Tier-1 RPCs; Analytics keeps the Supabase system snapshot but marks queue analytics unavailable; Staff dashboard shows an unavailable state.

### 25. How does AI avoid guessing?

**Answer:** The retrieval service uses normalized tokens, stop words, synonyms, keyword/title/content weights, role filtering, and a 0.42 confidence threshold. Low-confidence queries receive a deflection message.

### 26. What is Tier-1 knowledge?

**Answer:** Administrator-managed workflow information in tier1_knowledge_articles. Articles carry audience_roles and active/archived state.

### 27. How is AI feedback isolated?

**Answer:** The feedback update matches both query id and student_id, so one user cannot update another user’s log through the route.

### 28. How does AI escalation work?

**Answer:** The backend accepts only active student requests and calls escalate_ai_query_to_ticket; the RPC verifies the AI query belongs to the supplied student before inserting a ticket.

### 29. How are announcements targeted?

**Answer:** The database uses audience_roles, state, publish_at, and expires_at in the targeted read policy. Staff/admin manage them.

### 30. How do room changes work?

**Answer:** Faculty insert a spatial log tied to an assigned class; enrolled students read relevant logs and call acknowledge_room_change.

### 31. How are document requests secured?

**Answer:** Students insert their own active document requests; staff and super admins read/update operational records under explicit policies.

### 32. What is implemented in notifications?

**Answer:** Push token setup obtains an Expo token on physical native devices, but the backend send route currently returns 202 after configuration checking and documents delivery as a future worker.

### 33. How are errors handled in Express?

**Answer:** Zod errors become 400 responses with field paths; unmatched routes become 404; unexpected errors are logged and returned as a generic 500.

### 34. Why use Helmet, CORS, rate limiting, and pino?

**Answer:** They provide security headers, origin control, request-volume limits, and structured redacted request logs.

### 35. Why does CORS use an allowlist?

**Answer:** The backend accepts requests with no browser origin or an exact configured origin, avoiding a wildcard policy for protected operations.

### 36. What is the health route?

**Answer:** GET /api/health returns service name, ok status, and an ISO timestamp. Render is configured to check that path.

### 37. How does Render start the backend?

**Answer:** The Dockerfile builds TypeScript in a Node 20 Alpine build stage and runs node dist/index.js in a production stage. render.yaml uses the Dockerfile and /api/health.

### 38. How does Vercel host the frontend?

**Answer:** vercel.json runs npm run build:web, serves dist, and rewrites paths to the single Expo web entry.

### 39. Which environment values are public?

**Answer:** EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_API_URL are client configuration. Supabase secret/service-role, OpenAI, and Expo access tokens are backend-only.

### 40. What is an RLS policy versus a UI guard?

**Answer:** A UI guard controls what is rendered; RLS controls the database operation even if a user crafts a direct request. Both are useful, but only RLS/backend checks enforce data access.

### 41. Why is a service-role client dangerous in frontend code?

**Answer:** It bypasses normal tenant policies and would expose broad database power. This repository keeps the service key in Backend config only.

### 42. What does account state do?

**Answer:** active accounts can mutate where policies permit; archived_read_only accounts can sign in and inspect allowed history but are blocked from protected mutations by requireActive or database policies.

### 43. How is session restoration handled?

**Answer:** AuthProvider calls getSession on mount and subscribes to auth changes; AppGate waits for session and profile before exposing the workspace.

### 44. What happens when a profile is missing?

**Answer:** The profile helper returns a controlled message and clears the local Supabase session rather than mounting a partially authorized workspace.

### 45. Why preserve a deep link on initial session restore?

**Answer:** AuthenticatedWorkspace only replaces the route after a subsequent sign-in; initial restoration keeps valid browser links such as /ticket/:id.

### 46. How does mobile navigation differ?

**Answer:** Native uses Expo Router Tabs with a bottom tab bar; web uses a custom sidebar/topbar tab renderer at the wide breakpoint and a compact bottom navigation otherwise.

### 47. How are hidden routes registered?

**Answer:** chatbot, faq, ticket/[id], and student documents remain route screens but use href null where they should not become permanent tabs.

### 48. How does the web sidebar avoid duplicate focus borders?

**Answer:** The selected item uses the inner view border; keyboard-focused but non-selected items use a separate focus-visible outline. The normal selected state does not apply that outline.

### 49. What is a BentoGrid?

**Answer:** A shared flex-wrap layout that uses flexBasis and breakpoint-aware BentoPanel sizes so the same panels reflow across desktop and mobile.

### 50. Why use design tokens?

**Answer:** Colors, spacing, type scale, radii, shadows, breakpoints, and content width live in constants/theme.ts so screens share the CAS-Assist visual language.

### 51. How is dark mode implemented?

**Answer:** AppThemeProvider stores light/dark/system preference, resolves against useColorScheme, exposes theme colors, and updates the web document color scheme.

### 52. How is the AI screen accessible?

**Answer:** It uses labeled controls, role guards, source/confidence messaging, feedback buttons, a bounded input, and visible fallback errors; a browser accessibility audit is still recommended.

### 53. What automated tests exist?

**Answer:** Backend Vitest tests cover retrieval synonyms/audience filtering and queue math. There is no frontend unit-test suite in the repository inventory.

### 54. What do verification scripts do?

**Answer:** They test live Supabase or a locally started API with disposable/test accounts, including registration, AI, announcements, room changes, system analytics, and integration checks.

### 55. Why must live verification scripts be handled carefully?

**Answer:** Some create users, insert rows, update registry fields, and delete temporary rows. They require secrets and should only target a disposable approved environment.

### 56. How are database migrations applied?

**Answer:** The repository includes ordered SQL migrations and a local Supabase config, but the migration plan explicitly requires backup, disposable-project testing, and owner approval before db push.

### 57. What is the vector extension used for?

**Answer:** The research-compliance migration creates the extensions.vector type for handbook embeddings; current frontend AI uses Tier-1 retrieval rather than an embedding search path.

### 58. What is a trigger?

**Answer:** A database function automatically invoked by an insert/update/delete event, used for registry creation, timestamps, ticket audit, transition validation, and immutable audit rows.

### 59. What are constraints?

**Answer:** Database-enforced validity rules such as ticket status values, priority values, document copy limits, schedule time order, and student-number format.

### 60. How does the frontend handle loading?

**Answer:** Screens initialize loading state, fetch through useEffect/useCallback, show ActivityIndicator or EmptyState, and expose pull-to-refresh where appropriate.

### 61. How does the frontend handle realtime?

**Answer:** Supabase channels subscribe to relevant table changes, update small pieces of state or refetch, and remove channels in cleanup functions.

### 62. What is the limitation of direct client queries?

**Answer:** They depend on correct RLS and expose schema/query details to clients; privileged multi-table workflows belong behind guarded RPCs or the backend.

### 63. Why does the backend use adminSupabase?

**Answer:** The backend needs a trusted server client to validate bearer tokens and call server-authorized operations while still applying its own role/lifecycle middleware.

### 64. How are request bodies validated?

**Answer:** Zod schemas validate query, feedback, escalation, and notification payloads before business logic runs. Ticket mutations from the frontend rely primarily on database constraints/policies.

### 65. What does request timeout middleware do?

**Answer:** It sets a response timeout from REQUEST_TIMEOUT_MS and emits a 504 if headers have not been sent. The frontend API client also aborts after 12 seconds.

### 66. How is rate limiting configured?

**Answer:** Express limits requests to 120 per minute using express-rate-limit with standard headers and no legacy headers.

### 67. What does the optional API base do on Android?

**Answer:** The frontend rewrites localhost/127.0.0.1 to 10.0.2.2 for the Android emulator, while leaving other platforms unchanged.

### 68. Why can the Analytics health badge be misleading?

**Answer:** checkApi currently requests ${API_BASE}/health while the backend exposes /api/health, so a healthy deployed API may be reported unavailable until that path is aligned.

### 69. What is the difference between queue analytics and system analytics?

**Answer:** Queue analytics comes from the optional Express route/RPC and focuses on queue calculations; system analytics is a super-admin Supabase RPC returning broad grouped reporting.

### 70. How does the app protect official policy claims?

**Answer:** AI and FAQ copy explicitly limits answers to approved workflow material and tells users to verify fees, requirements, deadlines, and decisions with the responsible office.

### 71. How would you improve production readiness?

**Answer:** Add the missing RPC role check/grants, align health paths, add frontend tests and end-to-end tests, complete notification delivery, review migrations on a disposable project, and perform a browser/mobile accessibility/security audit.

### 72. How would you explain the data flow in one sentence?

**Answer:** A role-authenticated Expo client reads/writes RLS-protected Supabase data directly for most workflows and calls a bearer-protected Express gateway for optional trusted operations, with guarded RPCs providing server-side business rules.

### 73. What is the strongest security boundary?

**Answer:** Supabase Auth plus PostgreSQL RLS/triggers/RPC authorization, reinforced by Express token/profile/role checks for API operations.

### 74. What is the most important known security risk?

**Answer:** The SECURITY DEFINER get_queue_analytics function lacks an explicit caller-role check in the migration and should be corrected through an approved database security change.

### 75. What is the most important functional gap?

**Answer:** Notification delivery is scaffolded but not implemented, and file attachment workflows described in presentation documentation are not represented by current frontend request forms.

### 76. How should a panelist distinguish actual from intended features?

**Answer:** Use code and migration evidence as authoritative: mark implemented paths, scaffolds, optional services, and documentation-only claims separately rather than treating the presentation script as proof.

### 77. What should be shown in a capstone defense?

**Answer:** Role-specific login, request creation/tracking, staff transition/audit, faculty room change, targeted announcements, AI deflection/fallback, analytics authorization, theme/profile, and controlled failure states.

### 78. Why are direct route URLs important?

**Answer:** Expo Router deep links allow browser refresh and ticket links; AuthenticatedWorkspace preserves initial links and guards screens after profile loading.

### 79. What does the ticket detail route do with an invalid ID?

**Answer:** It shows a controlled Request unavailable state and a back-to-workspace action rather than throwing an uncaught render error.

### 80. Why is the audit log read-only?

**Answer:** Audit records are evidence of lifecycle events; the immutable trigger blocks updates/deletes and the UI exposes only search/filter/read behavior.

### 81. How do announcements expire?

**Answer:** The read query filters expires_at and the policy requires expires_at to be null or in the future.

### 82. How are student room changes scoped?

**Answer:** The spatial read policy permits the faculty owner, super admins, or students enrolled in the matching assignment with active enrollment.

### 83. How does a faculty user avoid seeing unrelated schedules?

**Answer:** Queries filter faculty_id to the current profile and database policies permit faculty ownership or staff/super-admin oversight.

### 84. What can an archived user do?

**Answer:** The UI shows a read-only banner; database/route checks prevent protected mutations while allowing explicitly permitted read operations.

### 85. What is the role of the registry table?

**Answer:** users_account_registry is the application identity source for display data, role, lifecycle, student number, and governance metadata linked to auth.users.

### 86. Why is the auth user ID reused as profile ID?

**Answer:** The registry primary key references auth.users(id), giving one stable identity across Supabase Auth and application authorization.

### 87. How is data normalized in AI retrieval?

**Answer:** normalize removes case/diacritics and non-alphanumeric characters; tokens remove stop words; synonyms expand related terms.

### 88. What is a confidence threshold?

**Answer:** A minimum score required to use an answer. CAS-Assist uses 0.42 for confident Tier-1 matches and defers below that boundary.

### 89. How does the UI report optional service failure?

**Answer:** Analytics stores a separate ServiceHealth state; Staff dashboard shows an EmptyState for queue failure; chatbot attempts a database fallback.

### 90. How would you test cross-user ticket access?

**Answer:** Sign in as two students, attempt a detail URL for the other student, query the table directly, and confirm RLS plus the detail ownership check deny or hide the record.

### 91. How would you test role escalation?

**Answer:** Attempt staff/admin-only screens and RPCs using student/faculty credentials, then confirm UI guards and database/backend checks reject them.

### 92. Why use exact origin CORS rather than permissive CORS?

**Answer:** Protected APIs should accept only known frontend origins so another website cannot freely issue browser requests with user credentials.

### 93. Why avoid printing environment values in a reviewer?

**Answer:** Keys and tokens are credentials; the reviewer records names and purpose without reproducing secret values or live data.

### 94. What is the rollback strategy?

**Answer:** For database changes, restore the verified backup/PITR point rather than applying a lossy down migration after production writes. For code, revert the branch commit after review.

### 95. What is the current branch and revision for this reviewer?

**Answer:** Branch octup/safe-enhancements; revision 3270d8dce2e948b80244c365f309463dc546edde. The review is tied to this exact checked-out snapshot.

### 96. What is not verified by repository inspection?

**Answer:** Live Supabase row counts, deployed Render/Vercel state, actual browser screenshots, and production permissions cannot be asserted from local files alone.

### 97. How does browser refresh behave on a ticket link?

**Answer:** The Expo web single-output rewrite returns the app shell, AuthProvider restores the session, and the dynamic /ticket/[id] screen reloads the ID and rechecks ownership or role access.

### 98. Why should database functions be reviewed separately from Express routes?

**Answer:** A trusted route can enforce roles, but a SECURITY DEFINER RPC may be callable through another path; authorization must be correct at every exposed boundary.

### 99. What is the purpose of Realtime cleanup?

**Answer:** Removing channels on unmount prevents duplicate subscriptions, stale updates, memory growth, and repeated refetches after navigating between screens.

### 100. How does the app preserve mobile usability?

**Answer:** It uses responsive flex layouts, native controls, bottom navigation on compact web widths, safe-area padding, and content-driven stacking for forms and cards.

### 101. What is the difference between a migration and seed data?

**Answer:** A migration defines durable schema, policies, functions, and constraints; seed data is optional test or reference data and must not be treated as production truth.

### 102. How are empty states different from errors?

**Answer:** An empty state communicates that a valid query returned no records; an error state communicates unavailable, unauthorized, or failed loading and should preserve retry or recovery actions.

### 103. What should be checked before enabling the optional API in production?

**Answer:** Set the Render URL and exact allowed Vercel origins, verify /api/health, configure backend-only secrets, validate bearer authentication, and test staff/admin role restrictions in a disposable environment.

### 104. Why is preserving uncommitted work part of the review process?

**Answer:** The reviewer must describe the checked-out state without overwriting user changes; documentation generation is isolated under docs/reviewer and does not modify application source.

### 105. How should a student answer when a panelist asks about an unimplemented feature?

**Answer:** State the actual boundary, show the scaffold or missing path, explain the security/design needed, and identify it as future work instead of claiming it exists.

# 11. Complete source-file walkthrough index

The following 104 files were read from the checked-out revision. Each has a dedicated section below with language, line count, dependency observations, declaration index, representative excerpt, edge-case notes, and a complete sanitized source listing in Appendix B.

### AGENTS.md
- **Language:** markdown
- **Lines:** 76
- **Module/feature:** Repository operating rules and safety constraints for development work.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# CAS-ASSIST1 — Codex Development Instructions`
- L3: `## Role`
- L8: `## Project`
- L15: `## Primary Objective`
- L20: `## Strict Rules`
- L41: `## Mandatory Workflow`
- L43: `### Phase 1 — Analysis`
- L49: `### Phase 2 — Implementation`
- L54: `### Phase 3 — Validation`
- L60: `### Phase 4 — Review`
- L68: `## Security`
- L74: `## Golden Rule`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```markdown
   1 | # CAS-ASSIST1 — Codex Development Instructions
   2 |
   3 | ## Role
   4 | Act as a senior full-stack software engineer,
   5 | software architect, QA engineer, and
   6 | security-conscious code reviewer.
   7 |
   8 | ## Project
   9 | CAS-ASSIST1 is an existing application with:
  10 | - Frontend and Backend directories
  11 | - Supabase integration
  12 | - GitHub version control
  13 | - Existing Vercel deployment
  14 |
  15 | ## Primary Objective
  16 | Enhance the application while preserving
  17 | existing functionality, architecture,
  18 | database integrations, and production stability.
  19 |
  20 | ## Strict Rules
  21 | 1. Inspect existing code before making changes.
  22 | 2. Never rewrite the entire application for
  23 |    a small enhancement.
  24 | 3. Preserve existing features, routes, APIs,
  25 |    authentication, and database relationships.
  26 | 4. Work only on an approved feature branch.
  27 |    Never push directly to main.
  28 | 5. Never delete files or refactor unrelated
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/.env.example
- **Language:** text
- **Lines:** 9
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```text
   1 | NODE_ENV=[redacted from reviewer]
   2 | PORT=[redacted from reviewer]
   3 | SUPABASE_URL=[redacted from reviewer]
   4 | SUPABASE_SECRET_KEY=[redacted] from reviewer]
   5 | ALLOWED_ORIGINS=[redacted from reviewer]
   6 | OPENAI_API_KEY=[redacted] from reviewer]
   7 | EXPO_ACCESS_TOKEN=[redacted] from reviewer]
   8 | REQUEST_TIMEOUT_MS=[redacted from reviewer]
   9 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/Dockerfile
- **Language:** dockerfile
- **Lines:** 18
- **Module/feature:** Backend deployment/build configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```dockerfile
   1 | FROM node:20-alpine AS build
   2 | WORKDIR /app
   3 | COPY package*.json ./
   4 | RUN npm ci
   5 | COPY tsconfig.json ./
   6 | COPY src ./src
   7 | RUN npm run build
   8 |
   9 | FROM node:20-alpine AS production
  10 | ENV NODE_ENV=production
  11 | WORKDIR /app
  12 | COPY package*.json ./
  13 | RUN npm ci --omit=dev
  14 | COPY --from=build /app/dist ./dist
  15 | USER node
  16 | EXPOSE 3000
  17 | CMD ["npm", "start"]
  18 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/docs/database-migration-plan.md
- **Language:** markdown
- **Lines:** 53
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# Database Backup and Migration Plan`
- L3: `## Current remote evidence`
- L15: `## Required backup before remote apply`
- L24: `## Migration strategy`
- L39: `## Rollback`
- L43: `## Apply gate`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```markdown
   1 | # Database Backup and Migration Plan
   2 |
   3 | ## Current remote evidence
   4 |
   5 | Read-only inspection of the linked active project found these public tables:
   6 |
   7 | - `users_account_registry` (estimated one row)
   8 | - `advising_ticket_pipeline` (estimated zero rows)
   9 | - `announcements`, `spatial_logs`, `spatial_log_acknowledgments`
  10 | - `schedules`, `document_requests`
  11 | - `handbook_knowledge_embeddings`, `push_notification_logs`
  12 |
  13 | Docker/`pg_dump` is not available locally, and the linked pooler does not expose a database password. Therefore, no live migration is applied by this phase.
  14 |
  15 | ## Required backup before remote apply
  16 |
  17 | 1. In Supabase Dashboard, confirm Point-in-Time Recovery or create an on-demand database backup.
  18 | 2. Export the public schema and data from the Dashboard or run `supabase db dump` from a machine with Docker.
  19 | 3. Export Storage bucket configuration and record object counts.
  20 | 4. Record Auth user count without exporting credentials.
  21 | 5. Save the pre-migration schema hash and migration-history output.
  22 | 6. Test the migration on a disposable Supabase project restored from the export.
  23 |
  24 | ## Migration strategy
  25 |
  26 | - Add missing columns and entities with `IF NOT EXISTS`.
  27 | - Preserve UUID ownership and existing records.
  28 | - Map legacy advising states:
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/docs/presentation-test-script.md
- **Language:** markdown
- **Lines:** 60
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# CAS Assist Presentation Test Script`
- L5: `## Preparation`
- L13: `## Student mobile`
- L26: `## Archived student`
- L31: `## Faculty desktop`
- L38: `## Staff desktop`
- L46: `## Super admin`
- L52: `## Reliability, security, and standalone proof`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```markdown
   1 | # CAS Assist Presentation Test Script
   2 |
   3 | This is a living script. Demonstrate a step only after its traceability entry is verified.
   4 |
   5 | ## Preparation
   6 |
   7 | 1. Use `research-compliance` with a clean tree.
   8 | 2. Confirm frontend, API, and Supabase health without showing secrets.
   9 | 3. Confirm public web/API URLs use HTTPS and no loopback hostname.
  10 | 4. Prepare active student, archived student, faculty, staff, and super-admin accounts outside Git.
  11 | 5. Install the current APK on Android 11+ and disconnect Metro/USB for standalone proof.
  12 |
  13 | ## Student mobile
  14 |
  15 | 1. Cold-start the APK and confirm controlled loading.
  16 | 2. Confirm login/registration keyboards leave all controls reachable.
  17 | 3. Sign in as an active student and verify session restoration.
  18 | 4. Show profile, announcements, calendar, and cohort-scoped room changes.
  19 | 5. Submit a supported advising request with detailed justification and a private attachment.
  20 | 6. Show submitted → under evaluation → action required → resolved.
  21 | 7. Show queue position, wait estimate, methodology, timestamp, and fallback/data-driven label.
  22 | 8. Ask a Tier-1 question; show the approved article, confidence, and resolution feedback.
  23 | 9. Ask an unrelated open-domain question and confirm the assistant defers instead of guessing.
  24 | 10. Demonstrate controlled offline and retry states.
  25 |
  26 | ## Archived student
  27 |
  28 | 1. Sign in and show the read-only banner/history.
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/package.json
- **Language:** json
- **Lines:** 47
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "name": "cas-assist-api",
   3 |   "version": "1.0.0",
   4 |   "private": true,
   5 |   "type": "module",
   6 |   "engines": {
   7 |     "node": ">=20.19"
   8 |   },
   9 |   "scripts": {
  10 |     "dev": "tsx watch src/index.ts",
  11 |     "build": "tsc -p tsconfig.json",
  12 |     "start": "node dist/index.js",
  13 |     "typecheck": "tsc -p tsconfig.json --noEmit",
  14 |     "test": "vitest run",
  15 |     "inspect-schema": "node scripts/inspect-schema-metadata.cjs",
  16 |     "verify-remote": "node scripts/verify-remote.mjs",
  17 |     "seed-test": "node scripts/seed-test-environment.mjs",
  18 |     "verify-integration": "node scripts/verify-integration.mjs",
  19 |     "verify-announcements": "node scripts/verify-announcement-permissions.mjs",
  20 |     "verify-room-change": "node scripts/verify-faculty-room-change.mjs",
  21 |     "verify-student-registration": "node scripts/verify-student-registration.mjs",
  22 |     "verify-system-analytics": "node scripts/verify-system-analytics.mjs",
  23 |     "verify-ai-deflection": "node scripts/verify-ai-deflection.mjs",
  24 |     "verify-faq-fallback": "node scripts/verify-faq-fallback.mjs"
  25 |   },
  26 |   "dependencies": {
  27 |     "@supabase/supabase-js": "^2.106.2",
  28 |     "cors": "^2.8.6",
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/README.md
- **Language:** markdown
- **Lines:** 27
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# CAS Assist API`
- L5: `## Local setup`
- L14: `## Production`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```markdown
   1 | # CAS Assist API
   2 |
   3 | Express 5 + TypeScript gateway for trusted CAS Assist operations. Server credentials must never use an `EXPO_PUBLIC_` prefix.
   4 |
   5 | ## Local setup
   6 |
   7 | 1. Copy `.env.example` to `.env`.
   8 | 2. Supply server-only values through the shell or an untracked `.env`.
   9 | 3. Run `npm ci`, `npm run typecheck`, `npm test`, then `npm run dev`.
  10 | 4. Check `GET http://localhost:3000/api/health`.
  11 |
  12 | The API validates Supabase bearer tokens, loads the registry profile server-side, and applies role/lifecycle middleware. Request logs redact authorization and credential-like fields.
  13 |
  14 | ## Production
  15 |
  16 | Deploy `Backend/` as a Docker service using `render.yaml` or an equivalent HTTPS platform. Configure:
  17 |
  18 | - `SUPABASE_URL`
  19 | - `SUPABASE_SECRET_KEY` (or map the service-role key to this name)
  20 | - `ALLOWED_ORIGINS` as a comma-separated HTTPS allowlist
  21 | - optional `OPENAI_API_KEY`
  22 | - optional `EXPO_ACCESS_TOKEN`
  23 |
  24 | After deployment, verify `/api/health` over HTTPS and set the frontend’s `EXPO_PUBLIC_API_URL` to that origin. Never expose server keys to the Expo app.
  25 |
  26 | The AI endpoint is a closed-domain Tier-1 retrieval service. It searches only active, role-scoped articles managed in `tier1_knowledge_articles`, records confidence and feedback, and defers low-confidence or open-domain questions instead of guessing. Verified institutional document chunks remain excluded until equivalent audience metadata is available. Queue endpoints require the matching database RPC migrations. Notification delivery remains unavailable until device-token and delivery-log migrations exist.
  27 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/render.yaml
- **Language:** yaml
- **Lines:** 20
- **Module/feature:** Backend deployment/build configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```yaml
   1 | services:
   2 |   - type: web
   3 |     name: cas-assist-api
   4 |     runtime: docker
   5 |     dockerfilePath: ./Dockerfile
   6 |     healthCheckPath: /api/health
   7 |     envVars:
   8 |       - key: NODE_ENV
   9 |         value: production
  10 |       - key: SUPABASE_URL
  11 |         sync: false
  12 |       - key: SUPABASE_SECRET_KEY
  13 |         sync: false
  14 |       - key: ALLOWED_ORIGINS
  15 |         sync: false
  16 |       - key: OPENAI_API_KEY
  17 |         sync: false
  18 |       - key: EXPO_ACCESS_TOKEN
  19 |         sync: false
  20 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/inspect-schema-metadata.cjs
- **Language:** javascript
- **Lines:** 67
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** const fs = require('fs');; const { Client } = require('pg');

**Block index and walkthrough focus**
- L1: `const fs = require('fs');`
- L4: `const queries = {`
- L43: `async function main() {`
- L44: `const connectionString = fs.readFileSync('supabase/.temp/pooler-url', 'utf8').trim();`
- L45: `const client = new Client({`
- L53: `const result = await client.query(query);`
- L61: `const safeMessage = String(error.message ?? 'Unknown error')`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.

**Representative excerpt**
```javascript
   1 | const fs = require('fs');
   2 | const { Client } = require('pg');
   3 |
   4 | const queries = {
   5 |   COLUMNS: `
   6 |     select table_name, column_name, data_type, is_nullable, column_default
   7 |     from information_schema.columns
   8 |     where table_schema = 'public'
   9 |     order by table_name, ordinal_position
  10 |   `,
  11 |   CONSTRAINTS: `
  12 |     select conrelid::regclass::text as table_name, conname,
  13 |       pg_get_constraintdef(oid) as definition
  14 |     from pg_constraint
  15 |     where connamespace = 'public'::regnamespace
  16 |     order by 1, 2
  17 |   `,
  18 |   POLICIES: `
  19 |     select tablename, policyname, cmd, roles, qual, with_check
  20 |     from pg_policies
  21 |     where schemaname = 'public'
  22 |     order by tablename, policyname
  23 |   `,
  24 |   FUNCTIONS: `
  25 |     select routine_name, data_type
  26 |     from information_schema.routines
  27 |     where routine_schema = 'public'
  28 |     order by routine_name
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/seed-test-environment.mjs
- **Language:** javascript
- **Lines:** 232
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import 'dotenv/config';; import { randomBytes } from 'node:crypto';; import { readFile, writeFile } from 'node:fs/promises';; import { createClient } from '@supabase/supabase-js';; import dotenv from 'dotenv';

**Block index and walkthrough focus**
- L7: `const url = process.env.SUPABASE_URL;`
- L8: `const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;`
- L11: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L12: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L15: `const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });`
- L16: `const suffix = new URL(url).hostname.split('.')[0].slice(0, 8);`
- L17: `const roles = ['student', 'faculty', 'staff', 'super_admin'];`
- L18: `const displayNames = {`
- L24: `const testStudentNumber = '99-00000-001';`
- L29: `const accounts = {};`
- L31: `const email = `casassist.${role}.${suffix}@neu.edu.ph`;`
- L32: `const password = `CaS!${randomBytes(18).toString('base64url')}`;`
- L33: `let user = existingUsers.users.find(candidate => candidate.email?.toLowerCase() === email);`
- L65: `const account = accounts[role];`
- L121: `const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }).format(new Date()).toLowerCase();`
- L142: `async function insertOnce(table, matchColumn, matchValue, values) {`
- L180: `const roomChangeId = await insertOnce('spatial_logs', 'reason', 'CAS Assist generated test room change.', {`
- L190: `const credentials = roles.flatMap(role => [`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 19 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import 'dotenv/config';
   2 | import { randomBytes } from 'node:crypto';
   3 | import { readFile, writeFile } from 'node:fs/promises';
   4 | import { createClient } from '@supabase/supabase-js';
   5 | import dotenv from 'dotenv';
   6 |
   7 | const url = process.env.SUPABASE_URL;
   8 | const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
   9 | if (!url || !secret) throw new Error('Backend Supabase configuration is missing.');
  10 |
  11 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
  12 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  13 | if (!publicKey) throw new Error('Frontend publishable/anon key is missing.');
  14 |
  15 | const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  16 | const suffix = new URL(url).hostname.split('.')[0].slice(0, 8);
  17 | const roles = ['student', 'faculty', 'staff', 'super_admin'];
  18 | const displayNames = {
  19 |   student: 'CAS Test Student',
  20 |   faculty: 'CAS Test Faculty',
  21 |   staff: 'CAS Test Staff',
  22 |   super_admin: 'CAS Test Administrator',
  23 | };
  24 | const testStudentNumber = '99-00000-001';
  25 |
  26 | const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  27 | if (listError) throw listError;
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-ai-deflection.mjs
- **Language:** javascript
- **Lines:** 83
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { readFile } from 'node:fs/promises';; import { createClient } from '@supabase/supabase-js';; import dotenv from 'dotenv';

**Block index and walkthrough focus**
- L5: `const backendEnv = dotenv.parse(await readFile('.env'));`
- L6: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L7: `const testUsers = dotenv.parse(await readFile('.env.test-users'));`
- L8: `const url = backendEnv.SUPABASE_URL;`
- L9: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L10: `const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;`
- L13: `async function tokenFor(role) {`
- L14: `const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });`
- L15: `const prefix = `CAS_TEST_${role.toUpperCase()}`;`
- L24: `const roles = {`
- L30: `const tokens = Object.fromEntries(await Promise.all(`
- L33: `const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });`
- L34: `const queryIds = [];`
- L36: `const server = app.listen(0, '127.0.0.1');`
- L43: `const address = server.address();`
- L45: `const endpoint = `http://127.0.0.1:${address.port}/api/ai/query`;`
- L48: `const response = await fetch(endpoint, {`
- L53: `const body = await response.json();`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import { readFile } from 'node:fs/promises';
   2 | import { createClient } from '@supabase/supabase-js';
   3 | import dotenv from 'dotenv';
   4 |
   5 | const backendEnv = dotenv.parse(await readFile('.env'));
   6 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
   7 | const testUsers = dotenv.parse(await readFile('.env.test-users'));
   8 | const url = backendEnv.SUPABASE_URL;
   9 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  10 | const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;
  11 | if (!url || !publicKey || !secret) throw new Error('Supabase verification configuration is incomplete.');
  12 |
  13 | async function tokenFor(role) {
  14 |   const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  15 |   const prefix = `CAS_TEST_${role.toUpperCase()}`;
  16 |   const { data, error } = await client.auth.signInWithPassword({
  17 |     email: testUsers[`${prefix}_EMAIL`],
  18 |     password: testUsers[`${prefix}_PASSWORD`],
  19 |   });
  20 |   if (error || !data.session) throw error ?? new Error(`No ${role} session returned.`);
  21 |   return data.session.access_token;
  22 | }
  23 |
  24 | const roles = {
  25 |   student: 'How do I submit an advising request?',
  26 |   faculty: 'How can I record a classroom relocation?',
  27 |   staff: 'Where do I publish an announcement?',
  28 |   super_admin: 'What information is shown in system analytics?',
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-announcement-permissions.mjs
- **Language:** javascript
- **Lines:** 61
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { readFile } from 'node:fs/promises';; import dotenv from 'dotenv';; import { createClient } from '@supabase/supabase-js';

**Block index and walkthrough focus**
- L5: `const backendEnv = dotenv.parse(await readFile('.env'));`
- L6: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L7: `const testUsers = dotenv.parse(await readFile('.env.test-users'));`
- L8: `const url = backendEnv.SUPABASE_URL;`
- L9: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L15: `async function verifyRole(role) {`
- L16: `const client = createClient(url, publicKey, {`
- L19: `const prefix = `CAS_TEST_${role.toUpperCase()}`;`
- L29: `let announcementId;`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 5 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import { readFile } from 'node:fs/promises';
   2 | import dotenv from 'dotenv';
   3 | import { createClient } from '@supabase/supabase-js';
   4 |
   5 | const backendEnv = dotenv.parse(await readFile('.env'));
   6 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
   7 | const testUsers = dotenv.parse(await readFile('.env.test-users'));
   8 | const url = backendEnv.SUPABASE_URL;
   9 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  10 |
  11 | if (!url || !publicKey) {
  12 |   throw new Error('Supabase URL or frontend public key is missing.');
  13 | }
  14 |
  15 | async function verifyRole(role) {
  16 |   const client = createClient(url, publicKey, {
  17 |     auth: { persistSession: false, autoRefreshToken: false },
  18 |   });
  19 |   const prefix = `CAS_TEST_${role.toUpperCase()}`;
  20 |   const { data: authData, error: authError } = await client.auth.signInWithPassword({
  21 |     email: testUsers[`${prefix}_EMAIL`],
  22 |     password: testUsers[`${prefix}_PASSWORD`],
  23 |   });
  24 |
  25 |   if (authError || !authData.user) {
  26 |     throw authError ?? new Error(`No ${role} user returned.`);
  27 |   }
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-faculty-room-change.mjs
- **Language:** javascript
- **Lines:** 64
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { readFile } from 'node:fs/promises';; import dotenv from 'dotenv';; import { createClient } from '@supabase/supabase-js';

**Block index and walkthrough focus**
- L5: `const backendEnv = dotenv.parse(await readFile('.env'));`
- L6: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L7: `const testUsers = dotenv.parse(await readFile('.env.test-users'));`
- L8: `const url = backendEnv.SUPABASE_URL;`
- L9: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L10: `const secretKey = backendEnv.SUPABASE_SECRET_KEY;`
- L16: `const faculty = createClient(url, publicKey, {`
- L19: `const admin = createClient(url, secretKey, {`
- L38: `let insertedId;`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 7 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import { readFile } from 'node:fs/promises';
   2 | import dotenv from 'dotenv';
   3 | import { createClient } from '@supabase/supabase-js';
   4 |
   5 | const backendEnv = dotenv.parse(await readFile('.env'));
   6 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
   7 | const testUsers = dotenv.parse(await readFile('.env.test-users'));
   8 | const url = backendEnv.SUPABASE_URL;
   9 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  10 | const secretKey = backendEnv.SUPABASE_SECRET_KEY;
  11 |
  12 | if (!url || !publicKey || !secretKey) {
  13 |   throw new Error('Supabase URL, public key, or backend secret key is missing.');
  14 | }
  15 |
  16 | const faculty = createClient(url, publicKey, {
  17 |   auth: { persistSession: false, autoRefreshToken: false },
  18 | });
  19 | const admin = createClient(url, secretKey, {
  20 |   auth: { persistSession: false, autoRefreshToken: false },
  21 | });
  22 |
  23 | const { data: authData, error: authError } = await faculty.auth.signInWithPassword({
  24 |   email: testUsers.CAS_TEST_FACULTY_EMAIL,
  25 |   password: testUsers.CAS_TEST_FACULTY_PASSWORD,
  26 | });
  27 | if (authError || !authData.user) throw authError ?? new Error('No faculty user returned.');
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-faq-fallback.mjs
- **Language:** javascript
- **Lines:** 56
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { readFile } from 'node:fs/promises';; import { createClient } from '@supabase/supabase-js';; import dotenv from 'dotenv';

**Block index and walkthrough focus**
- L5: `const backendEnv = dotenv.parse(await readFile('.env'));`
- L6: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L7: `const testUsers = dotenv.parse(await readFile('.env.test-users'));`
- L8: `const url = backendEnv.SUPABASE_URL;`
- L9: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L10: `const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;`
- L13: `const roleQuestions = {`
- L19: `const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });`
- L20: `const queryIds = [];`
- L24: `const prefix = `CAS_TEST_${role.toUpperCase()}`;`
- L25: `const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 6 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import { readFile } from 'node:fs/promises';
   2 | import { createClient } from '@supabase/supabase-js';
   3 | import dotenv from 'dotenv';
   4 |
   5 | const backendEnv = dotenv.parse(await readFile('.env'));
   6 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
   7 | const testUsers = dotenv.parse(await readFile('.env.test-users'));
   8 | const url = backendEnv.SUPABASE_URL;
   9 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  10 | const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;
  11 | if (!url || !publicKey || !secret) throw new Error('Supabase verification configuration is incomplete.');
  12 |
  13 | const roleQuestions = {
  14 |   student: 'How do I request a school document?',
  15 |   faculty: 'How do room changes work?',
  16 |   staff: 'Where can I publish announcements?',
  17 |   super_admin: 'What does system analytics show?',
  18 | };
  19 | const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  20 | const queryIds = [];
  21 |
  22 | try {
  23 |   for (const [role, question] of Object.entries(roleQuestions)) {
  24 |     const prefix = `CAS_TEST_${role.toUpperCase()}`;
  25 |     const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  26 |     const { error: signInError } = await client.auth.signInWithPassword({
  27 |       email: testUsers[`${prefix}_EMAIL`],
  28 |       password: testUsers[`${prefix}_PASSWORD`],
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-integration.mjs
- **Language:** javascript
- **Lines:** 62
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import 'dotenv/config';; import { readFile } from 'node:fs/promises';; import dotenv from 'dotenv';; import { createClient } from '@supabase/supabase-js';; import('../dist/app.js'),

**Block index and walkthrough focus**
- L6: `const backendEnv = dotenv.parse(await readFile('.env'));`
- L7: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L8: `const testUsers = dotenv.parse(await readFile('.env.test-users'));`
- L9: `const url = backendEnv.SUPABASE_URL;`
- L10: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L13: `async function tokenFor(role) {`
- L14: `const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });`
- L15: `const prefix = `CAS_TEST_${role.toUpperCase()}`;`
- L30: `const server = app.listen(0, '127.0.0.1');`
- L37: `const address = server.address();`
- L39: `const base = `http://127.0.0.1:${address.port}`;`
- L41: `const checks = [`
- L50: `const response = await fetch(`${base}${path}`, {`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.

**Representative excerpt**
```javascript
   1 | import 'dotenv/config';
   2 | import { readFile } from 'node:fs/promises';
   3 | import dotenv from 'dotenv';
   4 | import { createClient } from '@supabase/supabase-js';
   5 |
   6 | const backendEnv = dotenv.parse(await readFile('.env'));
   7 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
   8 | const testUsers = dotenv.parse(await readFile('.env.test-users'));
   9 | const url = backendEnv.SUPABASE_URL;
  10 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  11 | if (!url || !publicKey) throw new Error('Supabase URL or frontend public key is missing.');
  12 |
  13 | async function tokenFor(role) {
  14 |   const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  15 |   const prefix = `CAS_TEST_${role.toUpperCase()}`;
  16 |   const { data, error } = await client.auth.signInWithPassword({
  17 |     email: testUsers[`${prefix}_EMAIL`],
  18 |     password: testUsers[`${prefix}_PASSWORD`],
  19 |   });
  20 |   if (error || !data.session) throw error ?? new Error(`No ${role} session returned.`);
  21 |   return data.session.access_token;
  22 | }
  23 |
  24 | const [{ app }, studentToken, staffToken] = await Promise.all([
  25 |   import('../dist/app.js'),
  26 |   tokenFor('student'),
  27 |   tokenFor('staff'),
  28 | ]);
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-remote.mjs
- **Language:** javascript
- **Lines:** 49
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import 'dotenv/config';; import { createClient } from '@supabase/supabase-js';

**Block index and walkthrough focus**
- L4: `const url = process.env.SUPABASE_URL;`
- L5: `const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;`
- L11: `const supabase = createClient(url, secret, {`
- L15: `const tables = [`
- L28: `const failures = [];`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 3 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import 'dotenv/config';
   2 | import { createClient } from '@supabase/supabase-js';
   3 |
   4 | const url = process.env.SUPABASE_URL;
   5 | const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
   6 |
   7 | if (!url || !secret) {
   8 |   throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required in Backend/.env');
   9 | }
  10 |
  11 | const supabase = createClient(url, secret, {
  12 |   auth: { autoRefreshToken: false, persistSession: false },
  13 | });
  14 |
  15 | const tables = [
  16 |   'users_account_registry',
  17 |   'faculty_assignments',
  18 |   'student_enrollments',
  19 |   'advising_ticket_pipeline',
  20 |   'spatial_logs',
  21 |   'spatial_log_acknowledgments',
  22 |   'announcements',
  23 |   'document_requests',
  24 |   'schedules',
  25 |   'ai_query_logs',
  26 | ];
  27 |
  28 | const failures = [];
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-student-registration.mjs
- **Language:** javascript
- **Lines:** 48
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import 'dotenv/config';; import { createClient } from '@supabase/supabase-js';

**Block index and walkthrough focus**
- L4: `const url = process.env.SUPABASE_URL;`
- L5: `const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;`
- L8: `const admin = createClient(url, secret, {`
- L12: `const stamp = Date.now();`
- L13: `const email = `casassist.registration.check.${stamp}@neu.edu.ph`;`
- L14: `const studentNumber = String(stamp);`
- L15: `let userId;`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import 'dotenv/config';
   2 | import { createClient } from '@supabase/supabase-js';
   3 |
   4 | const url = process.env.SUPABASE_URL;
   5 | const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
   6 | if (!url || !secret) throw new Error('Backend Supabase configuration is missing.');
   7 |
   8 | const admin = createClient(url, secret, {
   9 |   auth: { persistSession: false, autoRefreshToken: false },
  10 | });
  11 |
  12 | const stamp = Date.now();
  13 | const email = `casassist.registration.check.${stamp}@neu.edu.ph`;
  14 | const studentNumber = String(stamp);
  15 | let userId;
  16 |
  17 | try {
  18 |   const { data, error: createError } = await admin.auth.admin.createUser({
  19 |     email,
  20 |     password: `Verify!${stamp}`,
  21 |     email_confirm: true,
  22 |     user_metadata: {
  23 |       display_name: 'Registration Verification',
  24 |       student_number: studentNumber,
  25 |       cas_test_account: true,
  26 |     },
  27 |   });
  28 |   if (createError) throw createError;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/scripts/verify-system-analytics.mjs
- **Language:** javascript
- **Lines:** 41
- **Module/feature:** Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { readFile } from 'node:fs/promises';; import { createClient } from '@supabase/supabase-js';; import dotenv from 'dotenv';

**Block index and walkthrough focus**
- L5: `const backendEnv = dotenv.parse(await readFile('.env'));`
- L6: `const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));`
- L7: `const testUsers = dotenv.parse(await readFile('.env.test-users'));`
- L8: `const url = backendEnv.SUPABASE_URL;`
- L9: `const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;`
- L12: `async function clientFor(role) {`
- L13: `const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });`
- L14: `const prefix = `CAS_TEST_${role.toUpperCase()}`;`
- L23: `const admin = await clientFor('super_admin');`
- L24: `const staff = await clientFor('staff');`
- L29: `const requiredGroups = ['users', 'advising', 'documents', 'announcements', 'roomChanges', 'aiHelpdesk', 'notifications', 'academics', 'knowledge'];`

- This script may access live/test credentials or mutate disposable test records; it is documentation evidence, not a command to run automatically.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```javascript
   1 | import { readFile } from 'node:fs/promises';
   2 | import { createClient } from '@supabase/supabase-js';
   3 | import dotenv from 'dotenv';
   4 |
   5 | const backendEnv = dotenv.parse(await readFile('.env'));
   6 | const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
   7 | const testUsers = dotenv.parse(await readFile('.env.test-users'));
   8 | const url = backendEnv.SUPABASE_URL;
   9 | const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  10 | if (!url || !publicKey) throw new Error('Supabase URL or frontend public key is missing.');
  11 |
  12 | async function clientFor(role) {
  13 |   const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  14 |   const prefix = `CAS_TEST_${role.toUpperCase()}`;
  15 |   const { error } = await client.auth.signInWithPassword({
  16 |     email: testUsers[`${prefix}_EMAIL`],
  17 |     password: testUsers[`${prefix}_PASSWORD`],
  18 |   });
  19 |   if (error) throw error;
  20 |   return client;
  21 | }
  22 |
  23 | const admin = await clientFor('super_admin');
  24 | const staff = await clientFor('staff');
  25 |
  26 | try {
  27 |   const { data, error } = await admin.rpc('get_system_analytics', { p_window_days: 30 });
  28 |   if (error) throw error;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/app.ts
- **Language:** typescript
- **Lines:** 52
- **Module/feature:** Express backend module: app.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import cors from 'cors';; import express from 'express';; import { rateLimit } from 'express-rate-limit';; import helmet from 'helmet';; import { pinoHttp } from 'pino-http';; import { config } from './config.js';; import { errorHandler, notFound } from './middleware/errors.js';; import { aiRouter } from './routes/ai.js';; import { healthRouter } from './routes/health.js';; import { notificationsRouter } from './routes/notifications.js';; import { queueRouter } from './routes/queue.js';

**Block index and walkthrough focus**
- L14: `export const app = express();`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import cors from 'cors';
   2 | import express from 'express';
   3 | import { rateLimit } from 'express-rate-limit';
   4 | import helmet from 'helmet';
   5 | import { pinoHttp } from 'pino-http';
   6 |
   7 | import { config } from './config.js';
   8 | import { errorHandler, notFound } from './middleware/errors.js';
   9 | import { aiRouter } from './routes/ai.js';
  10 | import { healthRouter } from './routes/health.js';
  11 | import { notificationsRouter } from './routes/notifications.js';
  12 | import { queueRouter } from './routes/queue.js';
  13 |
  14 | export const app = express();
  15 |
  16 | app.disable('x-powered-by');
  17 | app.use(helmet());
  18 | app.use(cors({
  19 |   origin(origin, callback) {
  20 |     if (!origin || config.allowedOrigins.includes(origin)) callback(null, true);
  21 |     else callback(new Error('Origin not allowed'));
  22 |   },
  23 |   methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  24 |   allowedHeaders: ['authorization', 'content-type'],
  25 | }));
  26 | app.use(express.json({ limit: '1mb' }));
  27 | app.use((_req, res, next) => {
  28 |   res.setTimeout(config.REQUEST_TIMEOUT_MS, () => {
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/config.ts
- **Language:** typescript
- **Lines:** 30
- **Module/feature:** Express backend module: config.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import 'dotenv/config';; import { z } from 'zod';

**Block index and walkthrough focus**
- L4: `const schema = z.object({`
- L15: `const parsed = schema.safeParse({`
- L22: `const names = parsed.error.issues.map(issue => issue.path.join('.')).filter(Boolean);`
- L26: `export const config = {`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import 'dotenv/config';
   2 | import { z } from 'zod';
   3 |
   4 | const schema = z.object({
   5 |   NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
   6 |   PORT: z.coerce.number().int().min(1).max(65535).default(3000),
   7 |   SUPABASE_URL: z.url().startsWith('https://'),
   8 |   SUPABASE_SECRET_KEY: [redacted]
   9 |   ALLOWED_ORIGINS: z.string().min(1),
  10 |   OPENAI_API_KEY: [redacted]
  11 |   EXPO_ACCESS_TOKEN: [redacted]
  12 |   REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  13 | });
  14 |
  15 | const parsed = schema.safeParse({
  16 |   ...process.env,
  17 |   SUPABASE_SECRET_KEY:
  18 |     [redacted]
  19 |     ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  20 | });
  21 | if (!parsed.success) {
  22 |   const names = parsed.error.issues.map(issue => issue.path.join('.')).filter(Boolean);
  23 |   throw new Error(`Invalid server configuration: ${[...new Set(names)].join(', ')}`);
  24 | }
  25 |
  26 | export const config = {
  27 |   ...parsed.data,
  28 |   allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean),
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/index.ts
- **Language:** typescript
- **Lines:** 18
- **Module/feature:** Express backend module: index.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { app } from './app.js';; import { config } from './config.js';

**Block index and walkthrough focus**
- L4: `const server = app.listen(config.PORT, '0.0.0.0', error => {`
- L9: `function shutdown(signal: string) {`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import { app } from './app.js';
   2 | import { config } from './config.js';
   3 |
   4 | const server = app.listen(config.PORT, '0.0.0.0', error => {
   5 |   if (error) throw error;
   6 |   console.log(`CAS Assist API listening on port ${config.PORT}`);
   7 | });
   8 |
   9 | function shutdown(signal: string) {
  10 |   console.log(`Received ${signal}; stopping CAS Assist API.`);
  11 |   server.close(closeError => {
  12 |     process.exit(closeError ? 1 : 0);
  13 |   });
  14 | }
  15 |
  16 | process.on('SIGTERM', () => shutdown('SIGTERM'));
  17 | process.on('SIGINT', () => shutdown('SIGINT'));
  18 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/middleware/auth.ts
- **Language:** typescript
- **Lines:** 63
- **Module/feature:** Express middleware for auth.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import type { NextFunction, Request, Response } from 'express';; import { adminSupabase } from '../supabase.js';; import type { AccountState, AppRole, AuthenticatedRequest } from '../types.js';

**Block index and walkthrough focus**
- L6: `const roles = new Set<AppRole>(['student', 'faculty', 'staff', 'super_admin']);`
- L7: `const states = new Set<AccountState>(['active', 'archived_read_only']);`
- L9: `export async function requireAuth(req: Request, res: Response, next: NextFunction) {`
- L10: `const header = req.header('authorization');`
- L11: `const token = header?.startsWith('Bearer ') ? header.slice(7) : null;`
- L43: `export function allowRoles(...allowed: AppRole[]) {`
- L44: `const allowedSet = new Set(allowed);`
- L46: `const user = (req as AuthenticatedRequest).authUser;`
- L55: `export function requireActive(req: Request, res: Response, next: NextFunction) {`
- L56: `const user = (req as AuthenticatedRequest).authUser;`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```typescript
   1 | import type { NextFunction, Request, Response } from 'express';
   2 |
   3 | import { adminSupabase } from '../supabase.js';
   4 | import type { AccountState, AppRole, AuthenticatedRequest } from '../types.js';
   5 |
   6 | const roles = new Set<AppRole>(['student', 'faculty', 'staff', 'super_admin']);
   7 | const states = new Set<AccountState>(['active', 'archived_read_only']);
   8 |
   9 | export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  10 |   const header = req.header('authorization');
  11 |   const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  12 |   if (!token) {
  13 |     res.status(401).json({ error: 'Authentication is required.' });
  14 |     return;
  15 |   }
  16 |
  17 |   const { data: authData, error: authError } = await adminSupabase.auth.getUser(token);
  18 |   if (authError || !authData.user?.email) {
  19 |     res.status(401).json({ error: 'The session is invalid or expired.' });
  20 |     return;
  21 |   }
  22 |
  23 |   const { data: profile, error: profileError } = await adminSupabase
  24 |     .from('users_account_registry')
  25 |     .select('id, email, role, state')
  26 |     .eq('id', authData.user.id)
  27 |     .maybeSingle();
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/middleware/errors.ts
- **Language:** typescript
- **Lines:** 20
- **Module/feature:** Express middleware for errors.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import type { ErrorRequestHandler, RequestHandler } from 'express';; import { ZodError } from 'zod';

**Block index and walkthrough focus**
- L4: `export const notFound: RequestHandler = (_req, res) => {`
- L8: `export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import type { ErrorRequestHandler, RequestHandler } from 'express';
   2 | import { ZodError } from 'zod';
   3 |
   4 | export const notFound: RequestHandler = (_req, res) => {
   5 |   res.status(404).json({ error: 'Endpoint not found.' });
   6 | };
   7 |
   8 | export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
   9 |   if (error instanceof ZodError) {
  10 |     res.status(400).json({
  11 |       error: 'The request is invalid.',
  12 |       fields: error.issues.map(issue => issue.path.join('.')).filter(Boolean),
  13 |     });
  14 |     return;
  15 |   }
  16 |
  17 |   req.log?.error({ err: error instanceof Error ? error : undefined }, 'request failed');
  18 |   res.status(500).json({ error: 'The service could not complete the request.' });
  19 | };
  20 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/routes/ai.ts
- **Language:** typescript
- **Lines:** 109
- **Module/feature:** Express route module for ai operations.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Router } from 'express';; import { z } from 'zod';; import { requireActive, requireAuth } from '../middleware/auth.js';; import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../services/knowledge-retrieval.js';; import { adminSupabase } from '../supabase.js';; import type { AuthenticatedRequest } from '../types.js';

**Block index and walkthrough focus**
- L9: `export const aiRouter = Router();`
- L12: `const querySchema = z.object({`
- L18: `const input = querySchema.parse(req.body);`
- L19: `const user = (req as AuthenticatedRequest).authUser;`
- L30: `const candidates: KnowledgeCandidate[] = (articles ?? []).map(article => ({`
- L39: `const best = rankKnowledge(input.query, candidates, user.role);`
- L40: `const fallbackCategory = best?.category ?? 'general_inquiry';`
- L41: `const matched = isConfidentMatch(best) ? best : null;`
- L42: `const answer = matched`
- L75: `const user = (req as AuthenticatedRequest).authUser;`
- L76: `const input = z.object({`
- L90: `const user = (req as AuthenticatedRequest).authUser;`
- L95: `const input = z.object({`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.
- The file contains approximately 8 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```typescript
   1 | import { Router } from 'express';
   2 | import { z } from 'zod';
   3 |
   4 | import { requireActive, requireAuth } from '../middleware/auth.js';
   5 | import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../services/knowledge-retrieval.js';
   6 | import { adminSupabase } from '../supabase.js';
   7 | import type { AuthenticatedRequest } from '../types.js';
   8 |
   9 | export const aiRouter = Router();
  10 | aiRouter.use(requireAuth, requireActive);
  11 |
  12 | const querySchema = z.object({
  13 |   query: z.string().trim().min(3).max(2000),
  14 |   category: z.string().trim().min(1).max(80).optional(),
  15 | });
  16 |
  17 | aiRouter.post('/query', async (req, res) => {
  18 |   const input = querySchema.parse(req.body);
  19 |   const user = (req as AuthenticatedRequest).authUser;
  20 |
  21 |   // Only role-scoped, administrator-managed Tier-1 articles are eligible.
  22 |   // Verified document chunks stay excluded until they carry equivalent audience metadata.
  23 |   const { data: articles, error } = await adminSupabase
  24 |     .from('tier1_knowledge_articles')
  25 |     .select('id, title, category, answer, keywords, audience_roles')
  26 |     .eq('state', 'active')
  27 |     .contains('audience_roles', [user.role]);
  28 |   if (error) throw error;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/src/app.ts, Backend/src/middleware/auth.ts, Backend/src/supabase.ts

### Backend/src/routes/health.ts
- **Language:** typescript
- **Lines:** 12
- **Module/feature:** Express route module for health operations.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Router } from 'express';

**Block index and walkthrough focus**
- L3: `export const healthRouter = Router();`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import { Router } from 'express';
   2 |
   3 | export const healthRouter = Router();
   4 |
   5 | healthRouter.get('/', (_req, res) => {
   6 |   res.json({
   7 |     status: 'ok',
   8 |     service: 'cas-assist-api',
   9 |     timestamp: new Date().toISOString(),
  10 |   });
  11 | });
  12 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/src/app.ts, Backend/src/middleware/auth.ts, Backend/src/supabase.ts

### Backend/src/routes/notifications.ts
- **Language:** typescript
- **Lines:** 25
- **Module/feature:** Express route module for notifications operations.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Router } from 'express';; import { z } from 'zod';; import { config } from '../config.js';; import { allowRoles, requireActive, requireAuth } from '../middleware/auth.js';

**Block index and walkthrough focus**
- L7: `export const notificationsRouter = Router();`
- L11: `const input = z.object({`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import { Router } from 'express';
   2 | import { z } from 'zod';
   3 |
   4 | import { config } from '../config.js';
   5 | import { allowRoles, requireActive, requireAuth } from '../middleware/auth.js';
   6 |
   7 | export const notificationsRouter = Router();
   8 | notificationsRouter.use(requireAuth, allowRoles('staff', 'super_admin'), requireActive);
   9 |
  10 | notificationsRouter.post('/send', async (req, res) => {
  11 |   const input = z.object({
  12 |     eventId: z.uuid(),
  13 |     eventType: z.enum(['ticket', 'announcement', 'spatial_log']),
  14 |   }).parse(req.body);
  15 |
  16 |   if (!config.EXPO_ACCESS_TOKEN) {
  17 |     res.status(503).json({ error: 'The trusted notification sender is not configured.' });
  18 |     return;
  19 |   }
  20 |
  21 |   // Recipient isolation and delivery are performed by the database-backed
  22 |   // notification worker introduced with the notification schema phase.
  23 |   res.status(202).json({ accepted: true, ...input });
  24 | });
  25 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/src/app.ts, Backend/src/middleware/auth.ts, Backend/src/supabase.ts

### Backend/src/routes/queue.ts
- **Language:** typescript
- **Lines:** 38
- **Module/feature:** Express route module for queue operations.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Router } from 'express';; import { z } from 'zod';; import { allowRoles, requireAuth } from '../middleware/auth.js';; import { adminSupabase } from '../supabase.js';; import type { AuthenticatedRequest } from '../types.js';

**Block index and walkthrough focus**
- L8: `export const queueRouter = Router();`
- L12: `const user = (req as AuthenticatedRequest).authUser;`
- L26: `const query = z.object({`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.

**Representative excerpt**
```typescript
   1 | import { Router } from 'express';
   2 | import { z } from 'zod';
   3 |
   4 | import { allowRoles, requireAuth } from '../middleware/auth.js';
   5 | import { adminSupabase } from '../supabase.js';
   6 | import type { AuthenticatedRequest } from '../types.js';
   7 |
   8 | export const queueRouter = Router();
   9 | queueRouter.use(requireAuth);
  10 |
  11 | queueRouter.get('/estimate', async (req, res) => {
  12 |   const user = (req as AuthenticatedRequest).authUser;
  13 |   if (user.role !== 'student') {
  14 |     res.status(403).json({ error: 'Queue estimates are available to students.' });
  15 |     return;
  16 |   }
  17 |
  18 |   const { data, error } = await adminSupabase.rpc('get_student_queue_estimate', {
  19 |     p_student_id: user.id,
  20 |   });
  21 |   if (error) throw error;
  22 |   res.json(data);
  23 | });
  24 |
  25 | queueRouter.get('/analytics', allowRoles('staff', 'super_admin'), async (req, res) => {
  26 |   const query = z.object({
  27 |     windowHours: z.coerce.number().int().min(1).max(24 * 90).default(168),
  28 |     category: z.string().min(1).max(80).optional(),
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/src/app.ts, Backend/src/middleware/auth.ts, Backend/src/supabase.ts

### Backend/src/services/knowledge-retrieval.ts
- **Language:** typescript
- **Lines:** 103
- **Module/feature:** Backend service logic for knowledge-retrieval.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import type { AppRole } from '../types.js';

**Block index and walkthrough focus**
- L3: `export interface KnowledgeCandidate {`
- L14: `export interface RankedKnowledge extends KnowledgeCandidate {`
- L18: `const STOP_WORDS = new Set([`
- L23: `const SYNONYMS: Record<string, string[]> = {`
- L45: `function normalize(value: string): string {`
- L54: `function tokens(value: string): string[] {`
- L58: `function expandedTokens(value: string): string[] {`
- L59: `const base = tokens(value);`
- L63: `export function rankKnowledge(query: string, candidates: KnowledgeCandidate[], role: AppRole): RankedKnowledge | null {`
- L64: `const original = tokens(query);`
- L65: `const expanded = expandedTokens(query);`
- L68: `let best: RankedKnowledge | null = null;`
- L72: `const title = new Set(expandedTokens(candidate.title));`
- L73: `const keyword = new Set(candidate.keywords.flatMap(expandedTokens));`
- L74: `const content = new Set(expandedTokens(candidate.content));`
- L75: `let weightedMatches = 0;`
- L76: `let originalMatches = 0;`
- L87: `const coverage = originalMatches / original.length;`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import type { AppRole } from '../types.js';
   2 |
   3 | export interface KnowledgeCandidate {
   4 |   id: string;
   5 |   title: string;
   6 |   section?: string | null;
   7 |   category: string;
   8 |   content: string;
   9 |   keywords: string[];
  10 |   sourceType: 'tier1' | 'verified_document';
  11 |   audienceRoles?: AppRole[];
  12 | }
  13 |
  14 | export interface RankedKnowledge extends KnowledgeCandidate {
  15 |   confidence: number;
  16 | }
  17 |
  18 | const STOP_WORDS = new Set([
  19 |   'a', 'an', 'and', 'are', 'can', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
  20 |   'me', 'my', 'of', 'on', 'please', 'the', 'to', 'what', 'when', 'where', 'which', 'with',
  21 | ]);
  22 |
  23 | const SYNONYMS: Record<string, string[]> = {
  24 |   advisor: ['advising', 'consultation'],
  25 |   adviser: ['advising', 'consultation'],
  26 |   advising: ['advisor', 'adviser', 'consult', 'consultation'],
  27 |   consult: ['advising', 'consultation'],
  28 |   consultation: ['consult', 'advising'],
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/services/queue-math.ts
- **Language:** typescript
- **Lines:** 38
- **Module/feature:** Backend service logic for queue-math.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `export interface TriangularSummary {`
- L8: `export function littleLawWaitMinutes(activeLoad: number, arrivalsPerHour: number): number | null {`
- L14: `export function triangularSummary(durationsMinutes: number[]): TriangularSummary | null {`
- L15: `const values = durationsMinutes.filter(value => Number.isFinite(value) && value >= 0);`
- L18: `const roundedCounts = new Map<number, number>();`
- L20: `const rounded = Math.round(value);`
- L24: `const mostLikelyMinutes = [...roundedCounts.entries()]`
- L29: `const minimumMinutes = Math.min(...values);`
- L30: `const maximumMinutes = Math.max(...values);`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | export interface TriangularSummary {
   2 |   minimumMinutes: number;
   3 |   maximumMinutes: number;
   4 |   mostLikelyMinutes: number;
   5 |   expectedMinutes: number;
   6 | }
   7 |
   8 | export function littleLawWaitMinutes(activeLoad: number, arrivalsPerHour: number): number | null {
   9 |   if (!Number.isFinite(activeLoad) || !Number.isFinite(arrivalsPerHour)) return null;
  10 |   if (activeLoad < 0 || arrivalsPerHour <= 0) return null;
  11 |   return (activeLoad / arrivalsPerHour) * 60;
  12 | }
  13 |
  14 | export function triangularSummary(durationsMinutes: number[]): TriangularSummary | null {
  15 |   const values = durationsMinutes.filter(value => Number.isFinite(value) && value >= 0);
  16 |   if (values.length < 3) return null;
  17 |
  18 |   const roundedCounts = new Map<number, number>();
  19 |   for (const value of values) {
  20 |     const rounded = Math.round(value);
  21 |     roundedCounts.set(rounded, (roundedCounts.get(rounded) ?? 0) + 1);
  22 |   }
  23 |
  24 |   const mostLikelyMinutes = [...roundedCounts.entries()]
  25 |     .sort(([firstValue, firstCount], [secondValue, secondCount]) =>
  26 |       secondCount - firstCount || firstValue - secondValue)[0]?.[0];
  27 |   if (mostLikelyMinutes === undefined) return null;
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/supabase.ts
- **Language:** typescript
- **Lines:** 12
- **Module/feature:** Express backend module: supabase.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { createClient } from '@supabase/supabase-js';; import { config } from './config.js';

**Block index and walkthrough focus**
- L5: `export const adminSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import { createClient } from '@supabase/supabase-js';
   2 |
   3 | import { config } from './config.js';
   4 |
   5 | export const adminSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
   6 |   auth: {
   7 |     autoRefreshToken: false,
   8 |     persistSession: false,
   9 |     detectSessionInUrl: false,
  10 |   },
  11 | });
  12 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/src/types.ts
- **Language:** typescript
- **Lines:** 16
- **Module/feature:** Express backend module: types.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import type { Request } from 'express';

**Block index and walkthrough focus**
- L3: `export type AppRole = 'student' | 'faculty' | 'staff' | 'super_admin';`
- L4: `export type AccountState = 'active' | 'archived_read_only';`
- L6: `export interface AuthenticatedUser {`
- L13: `export interface AuthenticatedRequest extends Request {`

- The backend module runs in a trusted server process, but request data remains untrusted until middleware and Zod/database rules validate it.

**Representative excerpt**
```typescript
   1 | import type { Request } from 'express';
   2 |
   3 | export type AppRole = 'student' | 'faculty' | 'staff' | 'super_admin';
   4 | export type AccountState = 'active' | 'archived_read_only';
   5 |
   6 | export interface AuthenticatedUser {
   7 |   id: string;
   8 |   email: string;
   9 |   role: AppRole;
  10 |   state: AccountState;
  11 | }
  12 |
  13 | export interface AuthenticatedRequest extends Request {
  14 |   authUser: AuthenticatedUser;
  15 | }
  16 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/supabase/config.toml
- **Language:** toml
- **Lines:** 415
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# For detailed configuration reference documentation, visit:`
- L2: `# https://supabase.com/docs/guides/local-development/cli/config`
- L3: `# A string used to distinguish different Supabase projects on the same host. Defaults to the`
- L4: `# working directory name when running `supabase init`.`
- L9: `# Port to use for the API URL.`
- L11: `# Schemas to expose in your API. Tables, views and stored procedures in this schema will get API`
- L12: `# endpoints. `public` and `graphql_public` schemas are included by default.`
- L14: `# Extra schemas to add to the search_path of every request.`
- L16: `# The maximum number of rows returns from a view, table, or stored procedure. Limits payload size`
- L17: `# for accidental or malicious requests.`
- L19: `# Controls whether new tables, views, sequences and functions created in the `public` schema by`
- L20: `# `postgres` are reachable through the Data API roles (`anon`, `authenticated`, `service_role`)`
- L21: `# without explicit GRANTs. When unset, new entities are NOT auto-exposed, matching the new cloud`
- L22: `# default. Set to `true` to keep the legacy behaviour of auto-exposing new entities; this is`
- L23: `# deprecated and the field is removed on 2026-10-30 once the always-revoked behaviour is permanent.`
- L24: `# auto_expose_new_tables = true`
- L27: `# Enable HTTPS endpoints locally using a self-signed certificate.`
- L29: `# Paths to self-signed certificate pair.`

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```toml
   1 | # For detailed configuration reference documentation, visit:
   2 | # https://supabase.com/docs/guides/local-development/cli/config
   3 | # A string used to distinguish different Supabase projects on the same host. Defaults to the
   4 | # working directory name when running `supabase init`.
   5 | project_id = "CAS-Assist"
   6 |
   7 | [api]
   8 | enabled = true
   9 | # Port to use for the API URL.
  10 | port = 54321
  11 | # Schemas to expose in your API. Tables, views and stored procedures in this schema will get API
  12 | # endpoints. `public` and `graphql_public` schemas are included by default.
  13 | schemas = ["public", "graphql_public"]
  14 | # Extra schemas to add to the search_path of every request.
  15 | extra_search_path = ["public", "extensions"]
  16 | # The maximum number of rows returns from a view, table, or stored procedure. Limits payload size
  17 | # for accidental or malicious requests.
  18 | max_rows = 1000
  19 | # Controls whether new tables, views, sequences and functions created in the `public` schema by
  20 | # `postgres` are reachable through the Data API roles (`anon`, `authenticated`, `service_role`)
  21 | # without explicit GRANTs. When unset, new entities are NOT auto-exposed, matching the new cloud
  22 | # default. Set to `true` to keep the legacy behaviour of auto-exposing new entities; this is
  23 | # deprecated and the field is removed on 2026-10-30 once the always-revoked behaviour is permanent.
  24 | # auto_expose_new_tables = true
  25 |
  26 | [api.tls]
  27 | # Enable HTTPS endpoints locally using a self-signed certificate.
  28 | enabled = false
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/supabase/migrations/202607280001_research_compliance.sql
- **Language:** sql
- **Lines:** 881
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L5: `create extension if not exists vector with schema extensions;`
- L8: `create type public.app_role as enum ('student', 'faculty', 'staff', 'super_admin');`
- L13: `create type public.account_lifecycle as enum ('active', 'archived_read_only');`
- L18: `create type public.verification_status as enum ('pending', 'verified', 'rejected');`
- L23: `create type public.advising_status as enum ('submitted', 'under_evaluation', 'action_required', 'resolved');`
- L27: `create table if not exists public.users_account_registry (`
- L37: `alter table public.users_account_registry`
- L46: `create table if not exists public.cas_programs (`
- L55: `create table if not exists public.student_program_memberships (`
- L68: `create table if not exists public.faculty_assignments (`
- L86: `create table if not exists public.student_enrollments (`
- L95: `create table if not exists public.advising_ticket_pipeline (`
- L108: `alter table public.advising_ticket_pipeline`
- L119: `alter table public.advising_ticket_pipeline`
- L121: `alter table public.advising_ticket_pipeline`
- L123: `alter table public.advising_ticket_pipeline`
- L145: `alter table public.advising_ticket_pipeline`
- L147: `alter table public.advising_ticket_pipeline`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- CAS Assist research-compliance migration.
   2 | -- Additive/idempotent where possible. Review docs/database-migration-plan.md
   3 | -- and create a verified backup before applying to any remote project.
   4 |
   5 | create extension if not exists vector with schema extensions;
   6 |
   7 | do $$ begin
   8 |   create type public.app_role as enum ('student', 'faculty', 'staff', 'super_admin');
   9 | exception when duplicate_object then null;
  10 | end $$;
  11 |
  12 | do $$ begin
  13 |   create type public.account_lifecycle as enum ('active', 'archived_read_only');
  14 | exception when duplicate_object then null;
  15 | end $$;
  16 |
  17 | do $$ begin
  18 |   create type public.verification_status as enum ('pending', 'verified', 'rejected');
  19 | exception when duplicate_object then null;
  20 | end $$;
  21 |
  22 | do $$ begin
  23 |   create type public.advising_status as enum ('submitted', 'under_evaluation', 'action_required', 'resolved');
  24 | exception when duplicate_object then null;
  25 | end $$;
  26 |
  27 | create table if not exists public.users_account_registry (
  28 |   id uuid primary key references auth.users(id) on delete cascade,
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609110001_document_requests_and_schedules.sql
- **Language:** sql
- **Lines:** 147
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L6: `create type public.document_request_status as enum (`
- L19: `create type public.document_type as enum (`
- L31: `create type public.schedule_day as enum (`
- L38: `create table if not exists public.document_requests (`
- L52: `create index if not exists document_requests_student_idx`
- L54: `create index if not exists document_requests_status_idx`
- L57: `drop trigger if exists document_requests_set_updated_at on public.document_requests;`
- L58: `create trigger document_requests_set_updated_at`
- L62: `create table if not exists public.schedules (`
- L80: `create index if not exists schedules_faculty_day_idx`
- L82: `create index if not exists schedules_section_idx`
- L85: `drop trigger if exists schedules_set_updated_at on public.schedules;`
- L86: `create trigger schedules_set_updated_at`
- L90: `alter table public.document_requests enable row level security;`
- L91: `alter table public.schedules enable row level security;`
- L93: `drop policy if exists document_requests_read on public.document_requests;`
- L94: `create policy document_requests_read on public.document_requests`
- L101: `drop policy if exists document_requests_student_insert on public.document_requests;`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- Tables required by the document-request and faculty-schedule screens.
   2 | -- This migration is additive so it can run against projects that already
   3 | -- contain earlier versions of either table.
   4 |
   5 | do $$ begin
   6 |   create type public.document_request_status as enum (
   7 |     'submitted',
   8 |     'under_evaluation',
   9 |     'action_required',
  10 |     'processing',
  11 |     'ready_for_pickup',
  12 |     'completed',
  13 |     'rejected'
  14 |   );
  15 | exception when duplicate_object then null;
  16 | end $$;
  17 |
  18 | do $$ begin
  19 |   create type public.document_type as enum (
  20 |     'transcript_of_records',
  21 |     'certificate_of_enrollment',
  22 |     'certificate_of_good_moral',
  23 |     'honorable_dismissal',
  24 |     'diploma',
  25 |     'other'
  26 |   );
  27 | exception when duplicate_object then null;
  28 | end $$;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609120001_legacy_contract_bridges.sql
- **Language:** sql
- **Lines:** 59
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L11: `create or replace function public.bridge_legacy_announcement_columns()`
- L39: `create or replace function public.bridge_legacy_spatial_columns()`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- Keep canonical CAS Assist writes compatible with prototype columns that
   2 | -- may still carry NOT NULL constraints in an upgraded database.
   3 |
   4 | do $$
   5 | begin
   6 |   if exists (
   7 |     select 1 from information_schema.columns
   8 |     where table_schema = 'public' and table_name = 'announcements' and column_name = 'posted_by'
   9 |   ) then
  10 |     execute $function$
  11 |       create or replace function public.bridge_legacy_announcement_columns()
  12 |       returns trigger language plpgsql
  13 |       set search_path = public
  14 |       as $body$
  15 |       begin
  16 |         if new.created_by is null then new.created_by := new.posted_by; end if;
  17 |         if new.posted_by is null then new.posted_by := new.created_by; end if;
  18 |         if new.publish_at is null then new.publish_at := new.published_at; end if;
  19 |         if new.published_at is null then new.published_at := new.publish_at; end if;
  20 |         new.pinned := coalesce(new.pinned, new.is_pinned, false);
  21 |         new.is_pinned := new.pinned;
  22 |         return new;
  23 |       end
  24 |       $body$
  25 |     $function$;
  26 |
  27 |     execute 'drop trigger if exists bridge_legacy_announcement_columns on public.announcements';
  28 |     execute 'create trigger bridge_legacy_announcement_columns before insert or update on public.announcements for each row execute function public.bridge_legacy_announcement_columns()';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609120002_ticket_priority_compatibility.sql
- **Language:** sql
- **Lines:** 17
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L2: `alter table public.advising_ticket_pipeline`
- L4: `alter table public.advising_ticket_pipeline`
- L9: `alter table public.advising_ticket_pipeline`
- L12: `alter table public.advising_ticket_pipeline`
- L14: `alter table public.advising_ticket_pipeline`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- Convert the prototype ticket_priority enum to the canonical text workflow.
   2 | alter table public.advising_ticket_pipeline
   3 |   alter column priority drop default;
   4 | alter table public.advising_ticket_pipeline
   5 |   alter column priority type text using priority::text;
   6 | update public.advising_ticket_pipeline
   7 | set priority = 'normal'
   8 | where priority = 'medium';
   9 | alter table public.advising_ticket_pipeline
  10 |   alter column priority set default 'normal';
  11 |
  12 | alter table public.advising_ticket_pipeline
  13 |   drop constraint if exists advising_ticket_pipeline_priority_check;
  14 | alter table public.advising_ticket_pipeline
  15 |   add constraint advising_ticket_pipeline_priority_check
  16 |   check (priority in ('low', 'normal', 'high', 'urgent'));
  17 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609130001_student_number_registration.sql
- **Language:** sql
- **Lines:** 48
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L4: `alter table public.users_account_registry`
- L8: `alter table public.users_account_registry`
- L24: `create or replace function public.create_registry_profile()`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- Store the student number supplied during student self-registration.
   2 | -- The column remains nullable for pre-existing and non-student accounts.
   3 |
   4 | alter table public.users_account_registry
   5 |   add column if not exists student_number text;
   6 |
   7 | do $$ begin
   8 |   alter table public.users_account_registry
   9 |     add constraint users_account_registry_student_number_format
  10 |     check (
  11 |       student_number is null
  12 |       or (
  13 |         student_number ~ '^[0-9-]{5,24}$'
  14 |         and length(regexp_replace(student_number, '[^0-9]', '', 'g')) >= 5
  15 |       )
  16 |     );
  17 | exception when duplicate_object then null;
  18 | end $$;
  19 |
  20 | create unique index if not exists users_account_registry_student_number_unique
  21 |   on public.users_account_registry (student_number)
  22 |   where student_number is not null;
  23 |
  24 | create or replace function public.create_registry_profile()
  25 | returns trigger language plpgsql security definer
  26 | set search_path = public
  27 | as $$
  28 | declare
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609130002_system_analytics.sql
- **Language:** sql
- **Lines:** 116
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L3: `create or replace function public.get_system_analytics(p_window_days integer default 30)`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- One consistent, super-admin-only snapshot for the system analytics page.
   2 |
   3 | create or replace function public.get_system_analytics(p_window_days integer default 30)
   4 | returns jsonb language plpgsql stable security definer
   5 | set search_path = public
   6 | as $$
   7 | declare
   8 |   window_days integer := least(greatest(coalesce(p_window_days, 30), 1), 365);
   9 |   window_start timestamptz;
  10 | begin
  11 |   if public.current_profile_role() <> 'super_admin' then
  12 |     raise exception 'Super administrator access required' using errcode = '42501';
  13 |   end if;
  14 |
  15 |   window_start := now() - make_interval(days => window_days);
  16 |
  17 |   return jsonb_build_object(
  18 |     'generatedAt', now(),
  19 |     'windowDays', window_days,
  20 |     'users', (
  21 |       select jsonb_build_object(
  22 |         'total', count(*),
  23 |         'active', count(*) filter (where state = 'active'),
  24 |         'archived', count(*) filter (where state = 'archived_read_only'),
  25 |         'newInWindow', count(*) filter (where created_at >= window_start),
  26 |         'pendingVerification', count(*) filter (where verification_status = 'pending'),
  27 |         'student', count(*) filter (where role = 'student'),
  28 |         'faculty', count(*) filter (where role = 'faculty'),
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609130003_tier1_knowledge_base.sql
- **Language:** sql
- **Lines:** 124
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L5: `create table if not exists public.tier1_knowledge_articles (`
- L18: `drop trigger if exists tier1_knowledge_set_updated_at on public.tier1_knowledge_articles;`
- L19: `create trigger tier1_knowledge_set_updated_at`
- L23: `alter table public.tier1_knowledge_articles enable row level security;`
- L25: `drop policy if exists tier1_knowledge_authenticated_read on public.tier1_knowledge_articles;`
- L26: `create policy tier1_knowledge_authenticated_read on public.tier1_knowledge_articles`
- L31: `drop policy if exists tier1_knowledge_admin_manage on public.tier1_knowledge_articles;`
- L32: `create policy tier1_knowledge_admin_manage on public.tier1_knowledge_articles`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- Closed-domain Tier-1 knowledge managed by CAS Assist administrators.
   2 | -- Seeded entries describe application workflows only; institutional rules must
   3 | -- continue to come from verified CAS source documents.
   4 |
   5 | create table if not exists public.tier1_knowledge_articles (
   6 |   id uuid primary key default gen_random_uuid(),
   7 |   slug text not null unique,
   8 |   title text not null,
   9 |   category text not null,
  10 |   answer text not null check (char_length(trim(answer)) between 20 and 5000),
  11 |   keywords text[] not null default '{}',
  12 |   audience_roles public.app_role[] not null default array['student','faculty','staff','super_admin']::public.app_role[],
  13 |   state text not null default 'active' check (state in ('active', 'archived')),
  14 |   created_at timestamptz not null default now(),
  15 |   updated_at timestamptz not null default now()
  16 | );
  17 |
  18 | drop trigger if exists tier1_knowledge_set_updated_at on public.tier1_knowledge_articles;
  19 | create trigger tier1_knowledge_set_updated_at
  20 | before update on public.tier1_knowledge_articles
  21 | for each row execute function public.set_updated_at();
  22 |
  23 | alter table public.tier1_knowledge_articles enable row level security;
  24 |
  25 | drop policy if exists tier1_knowledge_authenticated_read on public.tier1_knowledge_articles;
  26 | create policy tier1_knowledge_authenticated_read on public.tier1_knowledge_articles
  27 | for select to authenticated using (
  28 |   state = 'active' and public.current_profile_role() = any(audience_roles)
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/migrations/202609130004_tier1_answer_rpc.sql
- **Language:** sql
- **Lines:** 130
- **Module/feature:** Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L24: `create or replace function public.answer_tier1_question(p_query text)`
- L114: `create or replace function public.record_tier1_feedback(p_query_id uuid, p_resolved boolean)`

- The SQL is migration evidence, not proof that a remote database currently matches it. Apply only through the project’s approved backup and disposable-environment process.

**Representative excerpt**
```sql
   1 | -- Authenticated database fallback for the Tier-1 assistant. This keeps FAQ
   2 | -- answers available when the optional Express gateway cannot be reached.
   3 |
   4 | update public.tier1_knowledge_articles set title = case slug
   5 |   when 'advising-request' then 'How do I submit an advising request?'
   6 |   when 'request-status' then 'How do I check the status of my request?'
   7 |   when 'document-request' then 'How do I submit a document request?'
   8 |   when 'announcements' then 'Where can I read or publish announcements?'
   9 |   when 'room-changes' then 'How do room-change updates work?'
  10 |   when 'schedule-view' then 'Where can faculty view their schedules?'
  11 |   when 'account-registration' then 'What is required to create an account?'
  12 |   when 'appearance-theme' then 'How do I change the light or dark theme?'
  13 |   when 'official-policy-boundary' then 'Can CAS Assist decide official requirements or approvals?'
  14 |   when 'ai-helpdesk-scope' then 'What questions can the AI Helpdesk answer?'
  15 |   when 'system-analytics' then 'What does System Analytics show?'
  16 |   else title
  17 | end
  18 | where slug in (
  19 |   'advising-request','request-status','document-request','announcements','room-changes',
  20 |   'schedule-view','account-registration','appearance-theme','official-policy-boundary',
  21 |   'ai-helpdesk-scope','system-analytics'
  22 | );
  23 |
  24 | create or replace function public.answer_tier1_question(p_query text)
  25 | returns jsonb language plpgsql security definer
  26 | set search_path = public
  27 | as $$
  28 | declare
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Backend/supabase/config.toml, Backend/src/supabase.ts, Frontend/src/lib/supabase.ts

### Backend/supabase/seed.sql
- **Language:** sql
- **Lines:** 17
- **Module/feature:** Local seed entry point; the migration phase intentionally avoids official institutional data.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```sql
   1 | -- Explicitly non-production demo configuration.
   2 | -- This contains no real person, credential, official CAS program, or policy.
   3 |
   4 | insert into public.cas_programs (code, name, department, is_active)
   5 | values ('DEMO-PROGRAM', 'DEMO — Replace with an approved CAS program', 'DEMO', false)
   6 | on conflict (code) do update
   7 | set name = excluded.name, department = excluded.department, is_active = false;
   8 |
   9 | insert into public.system_settings (key, value, description)
  10 | values (
  11 |   'demo_seed_notice',
  12 |   '{"demo": true, "official": false}'::jsonb,
  13 |   'DEMO marker only. Do not present seed content as official CAS information.'
  14 | )
  15 | on conflict (key) do update
  16 | set value = excluded.value, description = excluded.description, updated_at = now();
  17 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/test/knowledge-retrieval.test.ts
- **Language:** typescript
- **Lines:** 35
- **Module/feature:** Backend automated unit test module.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { describe, expect, it } from 'vitest';; import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../src/services/knowledge-retrieval.js';

**Block index and walkthrough focus**
- L5: `const candidates: KnowledgeCandidate[] = [`
- L20: `const result = rankKnowledge('Where can I consult my adviser?', candidates, 'student');`
- L26: `const result = rankKnowledge('Who won the international football championship?', candidates, 'staff');`
- L31: `const restricted = [{ ...candidates[0], audienceRoles: ['student' as const] }];`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | import { describe, expect, it } from 'vitest';
   2 |
   3 | import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../src/services/knowledge-retrieval.js';
   4 |
   5 | const candidates: KnowledgeCandidate[] = [
   6 |   {
   7 |     id: 'advising', title: 'Submitting an advising request', category: 'advising',
   8 |     content: 'Students submit advising requests from the Requests tab.',
   9 |     keywords: ['advising', 'advisor', 'request', 'consultation'], sourceType: 'tier1',
  10 |   },
  11 |   {
  12 |     id: 'room', title: 'Room-change updates', category: 'room_changes',
  13 |     content: 'Faculty record a room change and enrolled students acknowledge it.',
  14 |     keywords: ['room', 'classroom', 'location', 'relocation'], sourceType: 'tier1',
  15 |   },
  16 | ];
  17 |
  18 | describe('closed-domain knowledge retrieval', () => {
  19 |   it('matches natural-language synonyms to the correct article', () => {
  20 |     const result = rankKnowledge('Where can I consult my adviser?', candidates, 'student');
  21 |     expect(result?.id).toBe('advising');
  22 |     expect(isConfidentMatch(result)).toBe(true);
  23 |   });
  24 |
  25 |   it('rejects unrelated open-domain questions', () => {
  26 |     const result = rankKnowledge('Who won the international football championship?', candidates, 'staff');
  27 |     expect(isConfidentMatch(result)).toBe(false);
  28 |   });
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/test/queue-math.test.ts
- **Language:** typescript
- **Lines:** 30
- **Module/feature:** Backend automated unit test module.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { describe, expect, it } from 'vitest';; import { littleLawWaitMinutes, triangularSummary } from '../src/services/queue-math.js';

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | import { describe, expect, it } from 'vitest';
   2 |
   3 | import { littleLawWaitMinutes, triangularSummary } from '../src/services/queue-math.js';
   4 |
   5 | describe('littleLawWaitMinutes', () => {
   6 |   it('converts hours to minutes', () => {
   7 |     expect(littleLawWaitMinutes(10, 5)).toBe(120);
   8 |   });
   9 |
  10 |   it('rejects zero arrivals and invalid load', () => {
  11 |     expect(littleLawWaitMinutes(10, 0)).toBeNull();
  12 |     expect(littleLawWaitMinutes(-1, 2)).toBeNull();
  13 |   });
  14 | });
  15 |
  16 | describe('triangularSummary', () => {
  17 |   it('derives min, max, mode, and expected duration', () => {
  18 |     expect(triangularSummary([10, 20, 20, 40])).toEqual({
  19 |       minimumMinutes: 10,
  20 |       maximumMinutes: 40,
  21 |       mostLikelyMinutes: 20,
  22 |       expectedMinutes: 70 / 3,
  23 |     });
  24 |   });
  25 |
  26 |   it('requires sufficient history', () => {
  27 |     expect(triangularSummary([10, 20])).toBeNull();
  28 |   });
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/tsconfig.json
- **Language:** json
- **Lines:** 17
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "compilerOptions": {
   3 |     "target": "ES2023",
   4 |     "module": "NodeNext",
   5 |     "moduleResolution": "NodeNext",
   6 |     "outDir": "dist",
   7 |     "rootDir": "src",
   8 |     "strict": true,
   9 |     "esModuleInterop": true,
  10 |     "forceConsistentCasingInFileNames": true,
  11 |     "skipLibCheck": true,
  12 |     "noUncheckedIndexedAccess": true,
  13 |     "types": ["node", "vitest/globals"]
  14 |   },
  15 |   "include": ["src/**/*.ts"]
  16 | }
  17 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Backend/vitest.config.ts
- **Language:** typescript
- **Lines:** 8
- **Module/feature:** Backend dependency, deployment, documentation, or local configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { defineConfig } from 'vitest/config';

**Block index and walkthrough focus**
- L3: `export default defineConfig({`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | import { defineConfig } from 'vitest/config';
   2 |
   3 | export default defineConfig({
   4 |   test: {
   5 |     include: ['test/**/*.test.ts'],
   6 |   },
   7 | });
   8 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/.env.example
- **Language:** text
- **Lines:** 4
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```text
   1 | EXPO_PUBLIC_SUPABASE_URL=[redacted from reviewer]
   2 | EXPO_PUBLIC_SUPABASE_ANON_KEY=[redacted from reviewer]
   3 | EXPO_PUBLIC_API_URL=[redacted from reviewer]
   4 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/app.json
- **Language:** json
- **Lines:** 73
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "expo": {
   3 |     "name": "CAS-Assist",
   4 |     "slug": "CAS-Assist",
   5 |     "description": "AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences.",
   6 |     "version": "1.0.1",
   7 |     "orientation": "portrait",
   8 |     "icon": "./assets/images/icon.png",
   9 |     "scheme": "casassist",
  10 |     "userInterfaceStyle": "automatic",
  11 |     "ios": {
  12 |       "icon": "./assets/expo.icon",
  13 |       "bundleIdentifier": "com.daviddino.casassist",
  14 |       "supportsTablet": true
  15 |     },
  16 |     "android": {
  17 |       "package": "com.daviddino.casassist",
  18 |       "versionCode": 2,
  19 |       "softwareKeyboardLayoutMode": "resize",
  20 |       "adaptiveIcon": {
  21 |         "backgroundColor": "#F3F6F4",
  22 |         "foregroundImage": "./assets/images/android-icon-foreground.png",
  23 |         "backgroundImage": "./assets/images/android-icon-background.png",
  24 |         "monochromeImage": "./assets/images/android-icon-monochrome.png"
  25 |       },
  26 |       "predictiveBackGestureEnabled": false
  27 |     },
  28 |     "web": {
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/assets/expo.icon/Assets/expo-symbol 2.svg
- **Language:** text
- **Lines:** 4
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```text
   1 | <svg width="652" height="606" viewBox="0 0 652 606" fill="none" xmlns="http://www.w3.org/2000/svg">
   2 | <path d="M353.554 0H298.446C273.006 0 249.684 14.6347 237.962 37.9539L4.37994 502.646C-1.04325 513.435 -1.45067 526.178 3.2716 537.313L22.6123 582.918C34.6475 611.297 72.5404 614.156 88.4414 587.885L309.863 222.063C313.34 216.317 319.439 212.826 326 212.826C332.561 212.826 338.659 216.317 342.137 222.063L563.559 587.885C579.46 614.156 617.352 611.297 629.388 582.918L648.728 537.313C653.451 526.178 653.043 513.435 647.62 502.646L414.038 37.9539C402.316 14.6347 378.994 0 353.554 0Z" fill="white"/>
   3 | </svg>
   4 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/assets/expo.icon/icon.json
- **Language:** json
- **Lines:** 40
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "fill" : {
   3 |     "automatic-gradient" : "extended-srgb:0.00000,0.47843,1.00000,1.00000"
   4 |   },
   5 |   "groups" : [
   6 |     {
   7 |       "layers" : [
   8 |         {
   9 |           "image-name" : "expo-symbol 2.svg",
  10 |           "name" : "expo-symbol 2",
  11 |           "position" : {
  12 |             "scale" : 1,
  13 |             "translation-in-points" : [
  14 |               1.1008400065293245e-05,
  15 |               -16.046875
  16 |             ]
  17 |           }
  18 |         },
  19 |         {
  20 |           "image-name" : "grid.png",
  21 |           "name" : "grid"
  22 |         }
  23 |       ],
  24 |       "shadow" : {
  25 |         "kind" : "neutral",
  26 |         "opacity" : 0.5
  27 |       },
  28 |       "translucency" : {
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/eas.json
- **Language:** json
- **Lines:** 28
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "cli": {
   3 |     "version": ">= 16.0.0"
   4 |   },
   5 |   "build": {
   6 |     "development": {
   7 |       "developmentClient": true,
   8 |       "distribution": "internal"
   9 |     },
  10 |     "preview": {
  11 |       "distribution": "internal",
  12 |       "environment": "preview",
  13 |       "android": {
  14 |         "buildType": "apk"
  15 |       }
  16 |     },
  17 |     "production": {
  18 |       "autoIncrement": true,
  19 |       "android": {
  20 |         "buildType": "app-bundle"
  21 |       }
  22 |     }
  23 |   },
  24 |   "submit": {
  25 |     "production": {}
  26 |   }
  27 | }
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/eslint.config.js
- **Language:** javascript
- **Lines:** 16
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** const { defineConfig } = require('eslint/config');; const expoConfig = require('eslint-config-expo/flat');

**Block index and walkthrough focus**
- L3: `const expoConfig = require('eslint-config-expo/flat');`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```javascript
   1 | // https://docs.expo.dev/guides/using-eslint/
   2 | const { defineConfig } = require('eslint/config');
   3 | const expoConfig = require('eslint-config-expo/flat');
   4 |
   5 | module.exports = defineConfig([
   6 |   {
   7 |     ignores: ['dist/**', '.expo/**'],
   8 |   },
   9 |   expoConfig,
  10 |   {
  11 |     rules: {
  12 |       'react-hooks/set-state-in-effect': 'off',
  13 |     },
  14 |   },
  15 | ]);
  16 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/expo-env.d.ts
- **Language:** typescript
- **Lines:** 3
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | /// <reference types="expo/types" />
   2 |
   3 | // NOTE: This file should not be edited and should be in your git ignore
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/LICENSE
- **Language:** text
- **Lines:** 22
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```text
   1 | The MIT License (MIT)
   2 |
   3 | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)
   4 |
   5 | Permission is hereby granted, free of charge, to any person obtaining a copy
   6 | of this software and associated documentation files (the "Software"), to deal
   7 | in the Software without restriction, including without limitation the rights
   8 | to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   9 | copies of the Software, and to permit persons to whom the Software is
  10 | furnished to do so, subject to the following conditions:
  11 |
  12 | The above copyright notice and this permission notice shall be included in all
  13 | copies or substantial portions of the Software.
  14 |
  15 | THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  16 | IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  17 | FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  18 | AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  19 | LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  20 | OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  21 | SOFTWARE.
  22 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/package.json
- **Language:** json
- **Lines:** 61
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "name": "cas-assist",
   3 |   "main": "expo-router/entry",
   4 |   "version": "1.0.1",
   5 |   "dependencies": {
   6 |     "@expo/ui": "~57.0.18",
   7 |     "@react-native-async-storage/async-storage": "2.2.0",
   8 |     "@supabase/supabase-js": "^2.106.2",
   9 |     "expo": "^57.0.17",
  10 |     "expo-blur": "~57.0.3",
  11 |     "expo-constants": "~57.0.18",
  12 |     "expo-device": "~57.0.2",
  13 |     "expo-font": "~57.0.4",
  14 |     "expo-glass-effect": "~57.0.3",
  15 |     "expo-image": "~57.0.5",
  16 |     "expo-linking": "~57.0.10",
  17 |     "expo-notifications": "~57.0.18",
  18 |     "expo-router": "~57.0.21",
  19 |     "expo-splash-screen": "~57.0.9",
  20 |     "expo-sqlite": "~57.0.3",
  21 |     "expo-status-bar": "~57.0.1",
  22 |     "expo-symbols": "~57.0.3",
  23 |     "expo-system-ui": "~57.0.4",
  24 |     "expo-web-browser": "~57.0.3",
  25 |     "lucide-react-native": "^1.45.0",
  26 |     "react": "19.2.3",
  27 |     "react-dom": "19.2.3",
  28 |     "react-native": "0.86.3",
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/public/index.html
- **Language:** html
- **Lines:** 29
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```html
   1 | <!DOCTYPE html>
   2 | <html lang="en">
   3 |   <head>
   4 |     <meta charset="utf-8" />
   5 |     <meta http-equiv="X-UA-Compatible" content="IE=edge" />
   6 |     <meta
   7 |       name="viewport"
   8 |       content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
   9 |     />
  10 |     <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F3F6F4" />
  11 |     <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0C1716" />
  12 |     <meta name="color-scheme" content="light dark" />
  13 |     <meta name="apple-mobile-web-app-capable" content="yes" />
  14 |     <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  15 |     <meta name="description" content="AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences." />
  16 |     <link rel="manifest" href="/manifest.json" />
  17 |     <title>CAS Assist</title>
  18 |     <style id="expo-reset">
  19 |       html, body { height: 100%; }
  20 |       body { overflow: hidden; }
  21 |       #root { display: flex; min-height: 100%; flex: 1; }
  22 |     </style>
  23 |   </head>
  24 |   <body>
  25 |     <noscript>You need to enable JavaScript to run CAS Assist.</noscript>
  26 |     <div id="root"></div>
  27 |   </body>
  28 | </html>
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/public/manifest.json
- **Language:** json
- **Lines:** 20
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "name": "CAS Assist",
   3 |   "short_name": "CAS Assist",
   4 |   "description": "AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences.",
   5 |   "lang": "en",
   6 |   "start_url": "/",
   7 |   "scope": "/",
   8 |   "display": "standalone",
   9 |   "orientation": "any",
  10 |   "theme_color": "#123936",
  11 |   "background_color": "#F3F6F4",
  12 |   "icons": [
  13 |     {
  14 |       "src": "/favicon.ico",
  15 |       "sizes": "48x48",
  16 |       "type": "image/x-icon"
  17 |     }
  18 |   ]
  19 | }
  20 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/README.md
- **Language:** markdown
- **Lines:** 14
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# CAS Assist Frontend`
- L5: `## Local setup`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```markdown
   1 | # CAS Assist Frontend
   2 |
   3 | Expo SDK 57 application for CAS Assist. Routes live in `src/app`, while reusable components, hooks, context, constants, and API clients live under `src` beside the route tree.
   4 |
   5 | ## Local setup
   6 |
   7 | 1. Install dependencies with `npm ci`.
   8 | 2. Copy `.env.example` to `.env`, then set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`.
   9 | 3. Start with Expo Go by running `npm start`.
  10 |
  11 | Other available commands are `npm run android`, `npm run ios`, `npm run web`, and `npm run check`. The complete check runs TypeScript, ESLint, and a production web export.
  12 |
  13 | Public Expo environment values must never contain Supabase service-role credentials or other server secrets.
  14 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/app/_layout.tsx
- **Language:** tsx
- **Lines:** 202
- **Module/feature:** Expo Router screen/route for _layout.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';; import { useEffect, useMemo, useRef, useState } from 'react';; import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';; import { StatusBar } from 'expo-status-bar';; import { AnimatedSplashOverlay } from '@/components/animated-icon';; import AppTabs from '@/components/app-tabs';; import AuthenticatedErrorBoundary from '@/components/authenticated-error-boundary';; import AuthLandingScreen from '@/components/auth/auth-landing-screen';; import LoginScreen from '@/components/auth/login-screen';; import RegisterScreen from '@/components/auth/register-screen';; import { Academic, FloatingChatButton } from '@/components/ui/academic-ui';; import { AuthProvider, useAuth, type LoginCategory } from '@/context/auth';

**Block index and walkthrough focus**
- L18: `type AuthView = 'landing' | 'login' | 'register';`
- L20: `const styles = StyleSheet.create({`
- L50: `function PushSetup() {`
- L56: `function AuthenticatedWorkspace({`
- L65: `const router = useRouter();`
- L66: `const resetUserRef = useRef<string | null>(null);`
- L85: `function AppGate() {`
- L89: `const hadSessionRef = useRef(false);`
- L90: `const hasAuthenticatedSessionRef = useRef(false);`
- L91: `const previousSessionUserIdRef = useRef<string | null>(null);`
- L99: `const nextUserId = session?.user.id ?? null;`
- L167: `function ThemedApplication() {`
- L169: `const navigationTheme = useMemo(() => {`
- L170: `const base = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;`
- L193: `export default function RootLayout() {`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 21 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 9 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
   2 | import { useEffect, useMemo, useRef, useState } from 'react';
   3 | import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
   4 | import { StatusBar } from 'expo-status-bar';
   5 |
   6 | import { AnimatedSplashOverlay } from '@/components/animated-icon';
   7 | import AppTabs from '@/components/app-tabs';
   8 | import AuthenticatedErrorBoundary from '@/components/authenticated-error-boundary';
   9 | import AuthLandingScreen from '@/components/auth/auth-landing-screen';
  10 | import LoginScreen from '@/components/auth/login-screen';
  11 | import RegisterScreen from '@/components/auth/register-screen';
  12 | import { Academic, FloatingChatButton } from '@/components/ui/academic-ui';
  13 | import { AuthProvider, useAuth, type LoginCategory } from '@/context/auth';
  14 | import { AppThemeProvider, useAppTheme } from '@/context/theme';
  15 | import { usePushNotifications } from '@/hooks/use-push-notifications';
  16 | import { publicConfigError } from '@/lib/config';
  17 |
  18 | type AuthView = 'landing' | 'login' | 'register';
  19 |
  20 | const styles = StyleSheet.create({
  21 |   // Must be above AnimatedSplashOverlay (zIndex 1000) on native,
  22 |   // and above everything on web.
  23 |   authContainer: { flex: 1, backgroundColor: Academic.background },
  24 |   configTitle: { color: Academic.navy, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  25 |   configMessage: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  26 |   configButton: {
  27 |     minWidth: 180,
  28 |     height: 50,
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/admin.tsx
- **Language:** tsx
- **Lines:** 1391
- **Module/feature:** Expo Router screen/route for admin.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useLocalSearchParams, useRouter } from 'expo-router';; import { useCallback, useEffect, useMemo, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L33: `interface Ticket {`
- L44: `interface UserRow {`
- L54: `interface AnnouncementRow {`
- L65: `interface DocRow {`
- L76: `interface AuditRow {`
- L86: `type AdminTab = 'tickets' | 'announce' | 'documents' | 'users' | 'audit';`
- L88: `const STATUS_LABEL: Record<string, string> = {`
- L95: `const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted' | 'error'> = {`
- L102: `const NEXT_STATUS: Record<string, string | null> = {`
- L109: `const NEXT_LABEL: Record<string, string> = {`
- L115: `const TICKET_STATUS_FILTERS = ['all', 'submitted', 'under_evaluation', 'action_required', 'resolved'] as const;`
- L117: `const AUDIENCE_OPTIONS = ['all', 'student', 'faculty', 'staff'] as const;`
- L118: `const USER_ROLE_OPTIONS = ['all', 'student', 'faculty', 'staff', 'super_admin'] as const;`
- L120: `const DOC_LABEL: Record<string, string> = {`
- L129: `const DOC_STATUS_LABEL: Record<string, string> = {`
- L139: `const DOC_STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {`
- L149: `const DOC_NEXT: Record<string, string | null> = {`
- L158: `function formatDate(iso: string) {`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 20 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 91 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 176 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useLocalSearchParams, useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useMemo, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   TextInput,
  11 |   View,
  12 | } from 'react-native';
  13 | import { SafeAreaView } from 'react-native-safe-area-context';
  14 |
  15 | import {
  16 |   Academic,
  17 |   AcademicIcon,
  18 |   AppBackdrop,
  19 |   EmptyState,
  20 |   MetricCard,
  21 |   SectionHeader,
  22 |   StatusBadge,
  23 |   SurfaceCard,
  24 |   formatCategory,
  25 |   shortRef,
  26 | } from '@/components/ui/academic-ui';
  27 | import { MaxContentWidth, Spacing } from '@/constants/theme';
  28 | import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/analytics.tsx
- **Language:** tsx
- **Lines:** 4
- **Module/feature:** Expo Router screen/route for analytics.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import SystemAnalyticsScreen from '@/components/analytics/system-analytics-screen';

**Block index and walkthrough focus**
- L3: `export default SystemAnalyticsScreen;`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.

**Representative excerpt**
```tsx
   1 | import SystemAnalyticsScreen from '@/components/analytics/system-analytics-screen';
   2 |
   3 | export default SystemAnalyticsScreen;
   4 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/chatbot.tsx
- **Language:** tsx
- **Lines:** 463
- **Module/feature:** Expo Router screen/route for chatbot.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useRef, useState } from 'react';; import {; import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';; import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';; import { Academic, AcademicIcon, AppBackdrop, IconButton, StatusBadge } from '@/components/ui/academic-ui';; import { Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import RoleGuard from '@/components/role-guard';; import { apiPost } from '@/lib/api';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L25: `type MessageRole = 'user' | 'assistant' | 'system';`
- L27: `interface Message {`
- L39: `interface AIQueryResponse {`
- L48: `const WELCOME: Message = {`
- L55: `const SUGGESTIONS: Record<string, string[]> = {`
- L62: `function MessageBubble({ message, onFeedback }: { message: Message; onFeedback: (message: Message, helpful: boolean) => void }) {`
- L63: `const isUser = message.role === 'user';`
- L64: `const colors = useTheme();`
- L115: `function ChatbotScreenContent() {`
- L116: `const router = useRouter();`
- L117: `const insets = useSafeAreaInsets();`
- L119: `const colors = useTheme();`
- L124: `const listRef = useRef<FlatList<Message>>(null);`
- L125: `const nextMessageId = useRef(0);`
- L126: `const suggestions = SUGGESTIONS[profile?.role ?? 'student'] ?? SUGGESTIONS.student;`
- L128: `function addMessage(msg: Omit<Message, 'id'>) {`
- L130: `const newMsg: Message = { ...msg, id: `message-${nextMessageId.current}` };`
- L132: `const next = [...prev, newMsg];`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 15 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 45 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useRef, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   FlatList,
   6 |   KeyboardAvoidingView,
   7 |   Platform,
   8 |   Pressable,
   9 |   StyleSheet,
  10 |   Text,
  11 |   TextInput,
  12 |   View,
  13 | } from 'react-native';
  14 | import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
  15 | import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
  16 |
  17 | import { Academic, AcademicIcon, AppBackdrop, IconButton, StatusBadge } from '@/components/ui/academic-ui';
  18 | import { Spacing } from '@/constants/theme';
  19 | import { useAuth } from '@/context/auth';
  20 | import { useTheme } from '@/hooks/use-theme';
  21 | import RoleGuard from '@/components/role-guard';
  22 | import { apiPost } from '@/lib/api';
  23 | import { supabase } from '@/lib/supabase';
  24 |
  25 | type MessageRole = 'user' | 'assistant' | 'system';
  26 |
  27 | interface Message {
  28 |   id: string;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/documents.tsx
- **Language:** tsx
- **Lines:** 487
- **Module/feature:** Expo Router screen/route for documents.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useCallback, useEffect, useMemo, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import RoleGuard from '@/components/role-guard';; import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L33: `interface DocumentRequest {`
- L43: `type ScreenView = 'list' | 'new';`
- L45: `const DOC_TYPES: { value: string; label: string; description: string }[] = [`
- L54: `const DOC_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map(item => [item.value, item.label]));`
- L56: `const STATUS_LABEL: Record<string, string> = {`
- L66: `const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {`
- L76: `function formatDate(iso: string) {`
- L84: `function RequestCard({ item }: { item: DocumentRequest }) {`
- L85: `const tone = STATUS_TONE[item.status] ?? 'muted';`
- L86: `const colors = useTheme();`
- L116: `function DocumentsScreenContent() {`
- L118: `const colors = useTheme();`
- L133: `const userId = profile?.id ?? session?.user.id;`
- L135: `const fetchRequests = useCallback(async () => {`
- L151: `const load = useCallback(async () => { setLoading(true); await fetchRequests(); setLoading(false); }, [fetchRequests]);`
- L152: `async function onRefresh() { setRefreshing(true); await fetchRequests(); setRefreshing(false); }`
- L156: `const visibleRequests = useMemo(() => {`
- L157: `const query = search.trim().toLowerCase();`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 4 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 26 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 48 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useCallback, useEffect, useMemo, useState } from 'react';
   2 | import {
   3 |   ActivityIndicator,
   4 |   Pressable,
   5 |   RefreshControl,
   6 |   ScrollView,
   7 |   StyleSheet,
   8 |   Text,
   9 |   TextInput,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import {
  15 |   Academic,
  16 |   AcademicIcon,
  17 |   AppBackdrop,
  18 |   EmptyState,
  19 |   IconButton,
  20 |   MetricCard,
  21 |   RoleHeroHeader,
  22 |   SectionHeader,
  23 |   StatusBadge,
  24 |   SurfaceCard,
  25 | } from '@/components/ui/academic-ui';
  26 | import { MaxContentWidth, Spacing } from '@/constants/theme';
  27 | import { useAuth } from '@/context/auth';
  28 | import { useTheme } from '@/hooks/use-theme';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/explore.tsx
- **Language:** tsx
- **Lines:** 637
- **Module/feature:** Expo Router screen/route for explore.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useCallback, useEffect, useMemo, useRef, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';; import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';

**Block index and walkthrough focus**
- L33: `interface Announcement {`
- L44: `interface RoomChange {`
- L54: `type UpdateFilter = 'all' | 'room' | 'announcements';`
- L55: `type RoomStatusFilter = 'all' | 'pending' | 'acknowledged';`
- L57: `function formatDate(iso: string) {`
- L65: `function RoomUpdateCard({`
- L76: `const colors = useTheme();`
- L131: `function AnnouncementCard({`
- L140: `const colors = useTheme();`
- L173: `export default function UpdatesScreen() {`
- L174: `const router = useRouter();`
- L176: `const colors = useTheme();`
- L192: `const fetchRef = useRef<() => Promise<void>>(async () => {});`
- L193: `const profileId = profile?.id;`
- L194: `const isStudent = !profile || profile.role === 'student';`
- L195: `const canCreateAnnouncements = profile?.role === 'staff' || profile?.role === 'super_admin';`
- L197: `const fetchAnnouncements = useCallback(async () => {`
- L199: `const now = new Date().toISOString();`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 9 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 36 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 62 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   TextInput,
  11 |   View,
  12 | } from 'react-native';
  13 | import { SafeAreaView } from 'react-native-safe-area-context';
  14 |
  15 | import {
  16 |   Academic,
  17 |   AcademicIcon,
  18 |   AppBackdrop,
  19 |   EmptyState,
  20 |   MetricCard,
  21 |   RoleHeroHeader,
  22 |   SectionHeader,
  23 |   StatusBadge,
  24 |   SurfaceCard,
  25 |   formatRelative,
  26 | } from '@/components/ui/academic-ui';
  27 | import { MaxContentWidth, Spacing } from '@/constants/theme';
  28 | import { useAuth } from '@/context/auth';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/faq.tsx
- **Language:** tsx
- **Lines:** 4
- **Module/feature:** Expo Router screen/route for faq.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import FaqScreen from '@/components/faq/faq-screen';

**Block index and walkthrough focus**
- L3: `export default FaqScreen;`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.

**Representative excerpt**
```tsx
   1 | import FaqScreen from '@/components/faq/faq-screen';
   2 |
   3 | export default FaqScreen;
   4 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/index.tsx
- **Language:** tsx
- **Lines:** 17
- **Module/feature:** Expo Router screen/route for index.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useAuth } from '@/context/auth';; import AdminDashboardHome from '@/components/dashboard/admin-dashboard-home';; import FacultyDashboard from '@/components/dashboard/faculty-dashboard';; import StaffDashboard from '@/components/dashboard/staff-dashboard';; import StudentDashboard from '@/components/dashboard/student-dashboard';

**Block index and walkthrough focus**
- L7: `export default function HomeScreen() {`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```tsx
   1 | import { useAuth } from '@/context/auth';
   2 | import AdminDashboardHome from '@/components/dashboard/admin-dashboard-home';
   3 | import FacultyDashboard   from '@/components/dashboard/faculty-dashboard';
   4 | import StaffDashboard     from '@/components/dashboard/staff-dashboard';
   5 | import StudentDashboard   from '@/components/dashboard/student-dashboard';
   6 |
   7 | export default function HomeScreen() {
   8 |   const { profile } = useAuth();
   9 |
  10 |   switch (profile?.role) {
  11 |     case 'super_admin': return <AdminDashboardHome />;
  12 |     case 'staff':       return <StaffDashboard />;
  13 |     case 'faculty':     return <FacultyDashboard />;
  14 |     default:            return <StudentDashboard />;
  15 |   }
  16 | }
  17 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/profile.tsx
- **Language:** tsx
- **Lines:** 381
- **Module/feature:** Expo Router screen/route for profile.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { type ThemePreference, useAppTheme } from '@/context/theme';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L29: `const ROLE_LABEL: Record<string, string> = {`
- L36: `const ROLE_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error'> = {`
- L43: `const THEME_OPTIONS: {`
- L54: `export default function ProfileScreen() {`
- L57: `const theme = useTheme();`
- L59: `const wideLayout = width >= 900;`
- L66: `const role = profile?.role ?? 'student';`
- L67: `const currentDisplayName = displayName.trim() || profile?.display_name || '';`
- L68: `const firstName = currentDisplayName.split(' ')[0] || 'there';`
- L69: `const canEdit = profile?.state !== 'archived_read_only';`
- L71: `async function handleSave() {`
- L168: `const selected = preference === option.value;`
- L243: `function InfoRow({`
- L252: `const colors = useTheme();`
- L264: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 13 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 59 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useState } from 'react';
   2 | import {
   3 |   ActivityIndicator,
   4 |   Pressable,
   5 |   ScrollView,
   6 |   StyleSheet,
   7 |   Text,
   8 |   TextInput,
   9 |   useWindowDimensions,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import {
  15 |   Academic,
  16 |   AcademicIcon,
  17 |   AppBackdrop,
  18 |   RoleHeroHeader,
  19 |   SectionHeader,
  20 |   StatusBadge,
  21 |   SurfaceCard,
  22 | } from '@/components/ui/academic-ui';
  23 | import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
  24 | import { useAuth } from '@/context/auth';
  25 | import { type ThemePreference, useAppTheme } from '@/context/theme';
  26 | import { useTheme } from '@/hooks/use-theme';
  27 | import { supabase } from '@/lib/supabase';
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/ticket/[id].tsx
- **Language:** tsx
- **Lines:** 11
- **Module/feature:** Expo Router screen/route for ticket/[id].tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useLocalSearchParams } from 'expo-router';; import TicketDetailScreen from '@/components/tickets/ticket-detail-screen';

**Block index and walkthrough focus**
- L5: `export default function TicketDetailRoute() {`
- L7: `const ticketId = Array.isArray(id) ? id[0] : id;`
- L8: `const showCreated = Array.isArray(created) ? created[0] === '1' : created === '1';`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.

**Representative excerpt**
```tsx
   1 | import { useLocalSearchParams } from 'expo-router';
   2 |
   3 | import TicketDetailScreen from '@/components/tickets/ticket-detail-screen';
   4 |
   5 | export default function TicketDetailRoute() {
   6 |   const { id, created } = useLocalSearchParams<{ id?: string | string[]; created?: string | string[] }>();
   7 |   const ticketId = Array.isArray(id) ? id[0] : id;
   8 |   const showCreated = Array.isArray(created) ? created[0] === '1' : created === '1';
   9 |   return <TicketDetailScreen ticketId={ticketId} showCreated={showCreated} />;
  10 | }
  11 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/app/tickets.tsx
- **Language:** tsx
- **Lines:** 857
- **Module/feature:** Expo Router screen/route for tickets.tsx.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useCallback, useEffect, useMemo, useRef, useState } from 'react';; import { useRouter } from 'expo-router';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import RoleGuard from '@/components/role-guard';; import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L37: `const EXEC_E = (5 + 45 + 15) / 3;`
- L38: `const ACTIVE_STATUSES = ['submitted', 'under_evaluation', 'action_required'];`
- L40: `interface QueueMetrics {`
- L48: `interface Ticket {`
- L58: `type RequestFilter = 'active' | 'completed' | 'all';`
- L59: `type ScreenView = 'list' | 'new';`
- L61: `const STATUS_LABEL: Record<string, string> = {`
- L68: `const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted'> = {`
- L75: `const CATEGORIES = [`
- L82: `async function computeQueueMetrics(userId: string): Promise<QueueMetrics> {`
- L83: `const since24h = new Date(Date.now() - 86_400_000).toISOString();`
- L98: `const L = unresolved?.length ?? 0;`
- L99: `const lam = lambda ?? 0;`
- L100: `const W = lam > 0 ? L / lam : null;`
- L101: `const studentTickets = (unresolved ?? []).filter(t => t.student_id === userId);`
- L102: `let position: number | null = null;`
- L105: `const idx = (unresolved ?? []).findIndex(t => t.id === studentTickets[0].id);`
- L109: `const estimatedMinutes = position !== null ? Math.round(EXEC_E * position) : null;`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 11 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 39 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 75 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
   2 | import { useRouter } from 'expo-router';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   TextInput,
  11 |   View,
  12 | } from 'react-native';
  13 | import { SafeAreaView } from 'react-native-safe-area-context';
  14 |
  15 | import {
  16 |   Academic,
  17 |   AcademicIcon,
  18 |   ActionButton,
  19 |   AppBackdrop,
  20 |   EmptyState,
  21 |   IconButton,
  22 |   MetricCard,
  23 |   RoleHeroHeader,
  24 |   SectionHeader,
  25 |   StatusBadge,
  26 |   SurfaceCard,
  27 |   formatCategory,
  28 |   shortRef,
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: Frontend/src/app/_layout.tsx, Frontend/src/context/auth.tsx, Frontend/src/lib/supabase.ts

### Frontend/src/components/analytics/system-analytics-screen.tsx
- **Language:** tsx
- **Lines:** 722
- **Module/feature:** System analytics presentation and data-loading component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useCallback, useEffect, useMemo, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import RoleGuard from '@/components/role-guard';; import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';; import {; import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';; import { useAppTheme } from '@/context/theme';; import { apiGet } from '@/lib/api';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L24: `type StatusTone,`
- L31: `type CountGroup = Record<string, number>;`
- L33: `interface AnalyticsSnapshot {`
- L47: `interface ServiceHealth {`
- L52: `interface UsageItem {`
- L62: `const WINDOWS = [7, 30, 90] as const;`
- L63: `const API_BASE = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');`
- L65: `function number(value: unknown): number {`
- L66: `const parsed = typeof value === 'number' ? value : Number(value);`
- L70: `function compact(value: number): string {`
- L77: `function percentage(value: number): string {`
- L81: `function duration(minutes: number): string {`
- L88: `async function checkApi(): Promise<ServiceHealth> {`
- L90: `const started = Date.now();`
- L91: `const controller = new AbortController();`
- L92: `const timeout = setTimeout(() => controller.abort(), 8000);`
- L94: `const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });`
- L106: `function OverviewMetric({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 1 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 22 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 169 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useCallback, useEffect, useMemo, useState } from 'react';
   2 | import {
   3 |   ActivityIndicator,
   4 |   Pressable,
   5 |   RefreshControl,
   6 |   ScrollView,
   7 |   StyleSheet,
   8 |   Text,
   9 |   useWindowDimensions,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import RoleGuard from '@/components/role-guard';
  15 | import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
  16 | import {
  17 |   Academic,
  18 |   AcademicIcon,
  19 |   AppBackdrop,
  20 |   EmptyState,
  21 |   SectionHeader,
  22 |   StatusBadge,
  23 |   SurfaceCard,
  24 |   type StatusTone,
  25 | } from '@/components/ui/academic-ui';
  26 | import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
  27 | import { useAppTheme } from '@/context/theme';
  28 | import { apiGet } from '@/lib/api';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/animated-icon.module.css
- **Language:** css
- **Lines:** 7
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```css
   1 | .expoLogoBackground {
   2 |   background-image: linear-gradient(180deg, #3c9ffe, #0274df);
   3 |   border-radius: 40px;
   4 |   width: 128px;
   5 |   height: 128px;
   6 | }
   7 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/animated-icon.tsx
- **Language:** tsx
- **Lines:** 133
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Image } from 'expo-image';; import { useState } from 'react';; import { Dimensions, StyleSheet, View } from 'react-native';; import Animated, { Easing, Keyframe } from 'react-native-reanimated';; import { scheduleOnRN } from 'react-native-worklets';

**Block index and walkthrough focus**
- L7: `const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;`
- L8: `const DURATION = 600;`
- L10: `export function AnimatedSplashOverlay() {`
- L15: `const splashKeyframe = new Keyframe({`
- L47: `const keyframe = new Keyframe({`
- L57: `const logoKeyframe = new Keyframe({`
- L74: `const glowKeyframe = new Keyframe({`
- L83: `export function AnimatedIcon() {`
- L98: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 8 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { Image } from 'expo-image';
   2 | import { useState } from 'react';
   3 | import { Dimensions, StyleSheet, View } from 'react-native';
   4 | import Animated, { Easing, Keyframe } from 'react-native-reanimated';
   5 | import { scheduleOnRN } from 'react-native-worklets';
   6 |
   7 | const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
   8 | const DURATION = 600;
   9 |
  10 | export function AnimatedSplashOverlay() {
  11 |   const [visible, setVisible] = useState(true);
  12 |
  13 |   if (!visible) return null;
  14 |
  15 |   const splashKeyframe = new Keyframe({
  16 |     0: {
  17 |       transform: [{ scale: INITIAL_SCALE_FACTOR }],
  18 |       opacity: 1,
  19 |     },
  20 |     20: {
  21 |       opacity: 1,
  22 |     },
  23 |     70: {
  24 |       opacity: 0,
  25 |       easing: Easing.elastic(0.7),
  26 |     },
  27 |     100: {
  28 |       opacity: 0,
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/animated-icon.web.tsx
- **Language:** tsx
- **Lines:** 109
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Image } from 'expo-image';; import { StyleSheet, View } from 'react-native';; import Animated, { Keyframe, Easing } from 'react-native-reanimated';; import classes from './animated-icon.module.css';

**Block index and walkthrough focus**
- L6: `const DURATION = 300;`
- L8: `export function AnimatedSplashOverlay() {`
- L12: `const keyframe = new Keyframe({`
- L26: `const logoKeyframe = new Keyframe({`
- L42: `const glowKeyframe = new Keyframe({`
- L57: `export function AnimatedIcon() {`
- L75: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file defines or consumes 7 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { Image } from 'expo-image';
   2 | import { StyleSheet, View } from 'react-native';
   3 | import Animated, { Keyframe, Easing } from 'react-native-reanimated';
   4 |
   5 | import classes from './animated-icon.module.css';
   6 | const DURATION = 300;
   7 |
   8 | export function AnimatedSplashOverlay() {
   9 |   return null;
  10 | }
  11 |
  12 | const keyframe = new Keyframe({
  13 |   0: {
  14 |     transform: [{ scale: 0 }],
  15 |   },
  16 |   60: {
  17 |     transform: [{ scale: 1.2 }],
  18 |     easing: Easing.elastic(1.2),
  19 |   },
  20 |   100: {
  21 |     transform: [{ scale: 1 }],
  22 |     easing: Easing.elastic(1.2),
  23 |   },
  24 | });
  25 |
  26 | const logoKeyframe = new Keyframe({
  27 |   0: {
  28 |     opacity: 0,
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/app-tabs.tsx
- **Language:** tsx
- **Lines:** 132
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { BlurView } from 'expo-blur';; import { Tabs, usePathname } from 'expo-router';; import { useWindowDimensions, type ColorValue } from 'react-native';; import { AcademicIcon, type AcademicIconName } from '@/components/ui/academic-ui';; import { useAuth } from '@/context/auth';; import { useAppTheme } from '@/context/theme';; import { Fonts, Layout } from '@/constants/theme';

**Block index and walkthrough focus**
- L10: `function tabIcon(name: AcademicIconName) {`
- L18: `export default function AppTabs() {`
- L22: `const pathname = usePathname();`
- L23: `const role = profile?.role;`
- L24: `const isStudent = role === 'student';`
- L25: `const isFaculty = role === 'faculty';`
- L26: `const isStaff = role === 'staff';`
- L27: `const isSuperAdmin = role === 'super_admin';`
- L28: `const showLabels = width >= 390;`
- L29: `const detailRoute = pathname.startsWith('/ticket/');`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 6 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```tsx
   1 | import { BlurView } from 'expo-blur';
   2 | import { Tabs, usePathname } from 'expo-router';
   3 | import { useWindowDimensions, type ColorValue } from 'react-native';
   4 |
   5 | import { AcademicIcon, type AcademicIconName } from '@/components/ui/academic-ui';
   6 | import { useAuth } from '@/context/auth';
   7 | import { useAppTheme } from '@/context/theme';
   8 | import { Fonts, Layout } from '@/constants/theme';
   9 |
  10 | function tabIcon(name: AcademicIconName) {
  11 |   return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
  12 |     return (
  13 |       <AcademicIcon name={name} color={String(color)} size={size} animated={false} />
  14 |     );
  15 |   };
  16 | }
  17 |
  18 | export default function AppTabs() {
  19 |   const { colors, resolvedTheme } = useAppTheme();
  20 |   const { profile } = useAuth();
  21 |   const { width } = useWindowDimensions();
  22 |   const pathname = usePathname();
  23 |   const role = profile?.role;
  24 |   const isStudent = role === 'student';
  25 |   const isFaculty = role === 'faculty';
  26 |   const isStaff = role === 'staff';
  27 |   const isSuperAdmin = role === 'super_admin';
  28 |   const showLabels = width >= 390;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/app-tabs.web.tsx
- **Language:** tsx
- **Lines:** 406
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { BlurView } from 'expo-blur';; import { Tabs, usePathname, useRouter, type Href } from 'expo-router';; import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';; import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';; import { AcademicIcon, type AcademicIconName } from './ui/academic-ui';; import { ThemedText } from './themed-text';; import { useAuth } from '@/context/auth';; import { useAppTheme } from '@/context/theme';; import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

**Block index and walkthrough focus**
- L12: `const DESKTOP_SIDEBAR_WIDTH = 248;`
- L13: `const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 72;`
- L14: `const DESKTOP_CONTENT_GUTTER = 24;`
- L16: `type SidebarState = {`
- L21: `type NavigationItem = {`
- L28: `type TabState = {`
- L33: `const SidebarStateContext = createContext<SidebarState>({`
- L38: `function getDesktopContentInset(collapsed: boolean) {`
- L42: `function getDesktopSidebarInset(collapsed: boolean) {`
- L46: `export default function AppTabs() {`
- L48: `const pathname = usePathname();`
- L49: `const desktop = width >= Layout.wideBreakpoint;`
- L50: `const fullScreen = pathname === '/chatbot' || pathname === '/faq' || pathname.startsWith('/ticket/');`
- L53: `const role = profile?.role ?? 'student';`
- L54: `const isStudent = role === 'student';`
- L55: `const isFaculty = role === 'faculty';`
- L56: `const isStaff = role === 'staff';`
- L57: `const isSuperAdmin = role === 'super_admin';`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 14 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 35 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { BlurView } from 'expo-blur';
   2 | import { Tabs, usePathname, useRouter, type Href } from 'expo-router';
   3 | import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';
   4 | import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
   5 |
   6 | import { AcademicIcon, type AcademicIconName } from './ui/academic-ui';
   7 | import { ThemedText } from './themed-text';
   8 | import { useAuth } from '@/context/auth';
   9 | import { useAppTheme } from '@/context/theme';
  10 | import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
  11 |
  12 | const DESKTOP_SIDEBAR_WIDTH = 248;
  13 | const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 72;
  14 | const DESKTOP_CONTENT_GUTTER = 24;
  15 |
  16 | type SidebarState = {
  17 |   collapsed: boolean;
  18 |   setCollapsed: Dispatch<SetStateAction<boolean>>;
  19 | };
  20 |
  21 | type NavigationItem = {
  22 |   routeName: string;
  23 |   href: Href;
  24 |   label: string;
  25 |   icon: AcademicIconName;
  26 | };
  27 |
  28 | type TabState = {
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/auth/auth-landing-screen.tsx
- **Language:** tsx
- **Lines:** 294
- **Module/feature:** Authentication UI component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useState } from 'react';; import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';; import { SafeAreaView } from 'react-native-safe-area-context';; import Animated, {; import {; import { Fonts, Layout, Radius, Shadows, Spacing, TypeScale } from '@/constants/theme';; import { useAppTheme } from '@/context/theme';; import type { LoginCategory } from '@/context/auth';

**Block index and walkthrough focus**
- L20: `type AcademicIconName,`
- L26: `interface Props {`
- L30: `const HERO_ENTERING = FadeInDown.duration(480)`
- L34: `const ROLE_OPTIONS = [`
- L53: `const SERVICE_CAPABILITIES = [`
- L62: `function RoleOptionCard({`
- L75: `const hoverProgress = useSharedValue(0);`
- L76: `const pressProgress = useSharedValue(0);`
- L77: `const isStudent = category === 'student';`
- L79: `const animatedStyle = useAnimatedStyle(() => ({`
- L88: `function setHoverState(next: boolean) {`
- L158: `export default function AuthLandingScreen({ onSelectCategory }: Props) {`
- L161: `const wide = width >= Layout.compactBreakpoint;`
- L239: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 6 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 39 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useState } from 'react';
   2 | import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
   3 | import { SafeAreaView } from 'react-native-safe-area-context';
   4 | import Animated, {
   5 |   Easing,
   6 |   FadeInDown,
   7 |   FadeInUp,
   8 |   interpolate,
   9 |   ReduceMotion,
  10 |   useAnimatedStyle,
  11 |   useSharedValue,
  12 |   withTiming,
  13 | } from 'react-native-reanimated';
  14 |
  15 | import {
  16 |   AcademicIcon,
  17 |   AppBackdrop,
  18 |   StatusBadge,
  19 |   SurfaceCard,
  20 |   type AcademicIconName,
  21 | } from '@/components/ui/academic-ui';
  22 | import { Fonts, Layout, Radius, Shadows, Spacing, TypeScale } from '@/constants/theme';
  23 | import { useAppTheme } from '@/context/theme';
  24 | import type { LoginCategory } from '@/context/auth';
  25 |
  26 | interface Props {
  27 |   onSelectCategory: (category: LoginCategory) => void;
  28 | }
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/auth/login-screen.tsx
- **Language:** tsx
- **Lines:** 204
- **Module/feature:** Authentication UI component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRef, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';; import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';; import { useAuth, type LoginCategory } from '@/context/auth';; import { useAppTheme } from '@/context/theme';; importantForAutofill="yes"; importantForAutofill="yes"

**Block index and walkthrough focus**
- L19: `interface Props {`
- L25: `export default function LoginScreen({ category, onNavigateToRegister, onChangeCategory }: Props) {`
- L28: `const isStudent = category === 'student';`
- L34: `const passwordInputRef = useRef<TextInput>(null);`
- L36: `async function handleSignIn() {`
- L38: `const trimmedEmail = email.trim().toLowerCase();`
- L168: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 12 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 21 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRef, useState } from 'react';
   2 | import {
   3 |   KeyboardAvoidingView,
   4 |   Platform,
   5 |   Pressable,
   6 |   ScrollView,
   7 |   StyleSheet,
   8 |   Text,
   9 |   TextInput,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';
  15 | import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
  16 | import { useAuth, type LoginCategory } from '@/context/auth';
  17 | import { useAppTheme } from '@/context/theme';
  18 |
  19 | interface Props {
  20 |   category: LoginCategory;
  21 |   onNavigateToRegister: () => void;
  22 |   onChangeCategory: () => void;
  23 | }
  24 |
  25 | export default function LoginScreen({ category, onNavigateToRegister, onChangeCategory }: Props) {
  26 |   const { signIn, profileError } = useAuth();
  27 |   const { colors } = useAppTheme();
  28 |   const isStudent = category === 'student';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/auth/register-screen.tsx
- **Language:** tsx
- **Lines:** 273
- **Module/feature:** Authentication UI component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';; import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useAppTheme } from '@/context/theme';

**Block index and walkthrough focus**
- L18: `interface Props {`
- L23: `export default function RegisterScreen({ onNavigateToLogin, onChangeAccountType }: Props) {`
- L37: `async function handleRegister() {`
- L39: `const trimmedName = displayName.trim();`
- L40: `const trimmedEmail = email.trim().toLowerCase();`
- L41: `const normalizedStudentNumber = studentNumber.replace(/\s+/g, '');`
- L220: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 15 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 26 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useState } from 'react';
   2 | import {
   3 |   KeyboardAvoidingView,
   4 |   Platform,
   5 |   Pressable,
   6 |   ScrollView,
   7 |   StyleSheet,
   8 |   Text,
   9 |   View,
  10 | } from 'react-native';
  11 | import { SafeAreaView } from 'react-native-safe-area-context';
  12 |
  13 | import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';
  14 | import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
  15 | import { useAuth } from '@/context/auth';
  16 | import { useAppTheme } from '@/context/theme';
  17 |
  18 | interface Props {
  19 |   onNavigateToLogin: () => void;
  20 |   onChangeAccountType: () => void;
  21 | }
  22 |
  23 | export default function RegisterScreen({ onNavigateToLogin, onChangeAccountType }: Props) {
  24 |   const { signUp } = useAuth();
  25 |   const { colors } = useAppTheme();
  26 |   const [displayName, setDisplayName] = useState('');
  27 |   const [email, setEmail] = useState('');
  28 |   const [studentNumber, setStudentNumber] = useState('');
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/authenticated-error-boundary.tsx
- **Language:** tsx
- **Lines:** 80
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import React, { Component, type ErrorInfo, type ReactNode } from 'react';; import { Pressable, StyleSheet, Text, View } from 'react-native';; import { Academic } from '@/components/ui/academic-ui';

**Block index and walkthrough focus**
- L6: `interface Props {`
- L11: `export default class AuthenticatedErrorBoundary extends Component<Props, { hasError: boolean }> {`
- L47: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file defines or consumes 8 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import React, { Component, type ErrorInfo, type ReactNode } from 'react';
   2 | import { Pressable, StyleSheet, Text, View } from 'react-native';
   3 |
   4 | import { Academic } from '@/components/ui/academic-ui';
   5 |
   6 | interface Props {
   7 |   children: ReactNode;
   8 |   onSignOut: () => Promise<void>;
   9 | }
  10 |
  11 | export default class AuthenticatedErrorBoundary extends Component<Props, { hasError: boolean }> {
  12 |   state = { hasError: false };
  13 |
  14 |   static getDerivedStateFromError() {
  15 |     return { hasError: true };
  16 |   }
  17 |
  18 |   componentDidCatch(error: Error, info: ErrorInfo) {
  19 |     if (__DEV__) {
  20 |       console.error('Authenticated application render failed', {
  21 |         name: error.name,
  22 |         message: error.message,
  23 |         stack: error.stack,
  24 |         componentStack: info.componentStack,
  25 |       });
  26 |     }
  27 |   }
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/dashboard/admin-dashboard-home.tsx
- **Language:** tsx
- **Lines:** 276
- **Module/feature:** Role dashboard or responsive dashboard primitive.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useCallback, useEffect, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L29: `interface RecentUser {`
- L37: `const ROLE_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error'> = {`
- L44: `function formatDate(iso: string) {`
- L48: `export default function AdminDashboardHome() {`
- L49: `const router = useRouter();`
- L51: `const theme = useTheme();`
- L57: `const fetchData = useCallback(async () => {`
- L66: `const openCount = (ticketData.data ?? []).filter(t => t.status === 'submitted').length;`
- L76: `const load = useCallback(async () => {`
- L82: `async function onRefresh() {`
- L234: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 10 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 16 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 29 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   RefreshControl,
   6 |   ScrollView,
   7 |   StyleSheet,
   8 |   Text,
   9 |   View,
  10 | } from 'react-native';
  11 | import { SafeAreaView } from 'react-native-safe-area-context';
  12 |
  13 | import {
  14 |   Academic,
  15 |   AppBackdrop,
  16 |   EmptyState,
  17 |   MetricCard,
  18 |   RoleHeroHeader,
  19 |   SectionHeader,
  20 |   StatusBadge,
  21 |   SurfaceCard,
  22 | } from '@/components/ui/academic-ui';
  23 | import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
  24 | import { MaxContentWidth, Spacing } from '@/constants/theme';
  25 | import { useAuth } from '@/context/auth';
  26 | import { useTheme } from '@/hooks/use-theme';
  27 | import { supabase } from '@/lib/supabase';
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/dashboard/dashboard-primitives.tsx
- **Language:** tsx
- **Lines:** 193
- **Module/feature:** Role dashboard or responsive dashboard primitive.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useState, type ReactNode } from 'react';; import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';; import {; import { Fonts, Layout, Radius, Spacing, TypeScale } from '@/constants/theme';; import { useAppTheme } from '@/context/theme';

**Block index and walkthrough focus**
- L7: `type AcademicIconName,`
- L8: `type StatusTone,`
- L13: `type DashboardActionTone = Extract<StatusTone, 'blue' | 'success' | 'warning' | 'error'>;`
- L15: `function getToneColors(tone: DashboardActionTone, colors: ReturnType<typeof useAppTheme>['colors']) {`
- L29: `export function DashboardActionCard({`
- L47: `const toneColors = getToneColors(tone, colors);`
- L86: `export const dashboardActionGridStyles = StyleSheet.create({`
- L94: `export type BentoSize = 'wide' | 'medium' | 'compact';`
- L100: `export function BentoGrid({ children, style }: { children: ReactNode; style?: object }) {`
- L104: `export function BentoPanel({`
- L114: `const isMobile = width < Layout.compactBreakpoint;`
- L115: `const isDesktop = width >= Layout.wideBreakpoint;`
- L116: `const basis = isMobile`
- L127: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 6 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 14 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useState, type ReactNode } from 'react';
   2 | import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
   3 |
   4 | import {
   5 |   AcademicIcon,
   6 |   SurfaceCard,
   7 |   type AcademicIconName,
   8 |   type StatusTone,
   9 | } from '@/components/ui/academic-ui';
  10 | import { Fonts, Layout, Radius, Spacing, TypeScale } from '@/constants/theme';
  11 | import { useAppTheme } from '@/context/theme';
  12 |
  13 | type DashboardActionTone = Extract<StatusTone, 'blue' | 'success' | 'warning' | 'error'>;
  14 |
  15 | function getToneColors(tone: DashboardActionTone, colors: ReturnType<typeof useAppTheme>['colors']) {
  16 |   switch (tone) {
  17 |     case 'success':
  18 |       return { background: colors.successBg, foreground: colors.success };
  19 |     case 'warning':
  20 |       return { background: colors.warningBg, foreground: colors.warning };
  21 |     case 'error':
  22 |       return { background: colors.errorBg, foreground: colors.error };
  23 |     case 'blue':
  24 |     default:
  25 |       return { background: colors.softBlue, foreground: colors.primary };
  26 |   }
  27 | }
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/dashboard/faculty-dashboard.tsx
- **Language:** tsx
- **Lines:** 654
- **Module/feature:** Role dashboard or responsive dashboard primitive.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useCallback, useEffect, useMemo, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L33: `const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;`
- L35: `interface Schedule {`
- L46: `interface FacultyAssignment {`
- L54: `interface Announcement {`
- L61: `interface AckedRoomChange {`
- L71: `type FacultyView = 'main' | 'room-change';`
- L72: `type ScheduleView = 'today' | 'week';`
- L74: `function formatTime(t: string) {`
- L76: `const ampm = h >= 12 ? 'PM' : 'AM';`
- L80: `function formatDate(iso: string) {`
- L84: `export default function FacultyDashboard() {`
- L85: `const router = useRouter();`
- L87: `const theme = useTheme();`
- L107: `const today = DAYS[new Date().getDay()];`
- L108: `const profileId = profile?.id;`
- L110: `const fetchData = useCallback(async () => {`
- L111: `const userId = profileId;`
- L141: `const fetchMyRoomChanges = useCallback(async () => {`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 14 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 31 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 59 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useMemo, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   TextInput,
  11 |   View,
  12 | } from 'react-native';
  13 | import { SafeAreaView } from 'react-native-safe-area-context';
  14 |
  15 | import {
  16 |   Academic,
  17 |   AcademicIcon,
  18 |   AppBackdrop,
  19 |   EmptyState,
  20 |   IconButton,
  21 |   MetricCard,
  22 |   RoleHeroHeader,
  23 |   SectionHeader,
  24 |   StatusBadge,
  25 |   SurfaceCard,
  26 | } from '@/components/ui/academic-ui';
  27 | import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
  28 | import { MaxContentWidth, Spacing } from '@/constants/theme';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/dashboard/staff-dashboard.tsx
- **Language:** tsx
- **Lines:** 390
- **Module/feature:** Role dashboard or responsive dashboard primitive.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useCallback, useEffect, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { BentoGrid, BentoPanel, DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';; import { apiGet } from '@/lib/api';

**Block index and walkthrough focus**
- L34: `interface TicketRow {`
- L43: `interface QueueAnalytics {`
- L53: `const STATUS_LABEL: Record<string, string> = {`
- L60: `const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted'> = {`
- L67: `function formatDate(iso: string) {`
- L71: `export default function StaffDashboard() {`
- L72: `const router = useRouter();`
- L74: `const theme = useTheme();`
- L84: `const fetchData = useCallback(async () => {`
- L103: `const c: Record<string, number> = {};`
- L112: `const documentStatusCounts: Record<string, number> = {};`
- L119: `const fetchQueueAnalytics = useCallback(async () => {`
- L121: `const data = await apiGet<QueueAnalytics>('/api/queue/analytics?windowHours=168');`
- L130: `const load = useCallback(async () => {`
- L136: `async function onRefresh() {`
- L144: `const firstName = profile?.display_name?.split(' ')[0] ?? 'there';`
- L145: `const total = ['submitted', 'under_evaluation', 'action_required'].reduce((sum, status) => sum + (counts[status] ?? 0), 0);`
- L146: `const documentsInProgress = ['submitted', 'under_evaluation', 'action_required', 'processing']`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 6 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 21 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 39 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import {
  15 |   Academic,
  16 |   AcademicIcon,
  17 |   AppBackdrop,
  18 |   EmptyState,
  19 |   MetricCard,
  20 |   RoleHeroHeader,
  21 |   SectionHeader,
  22 |   StatusBadge,
  23 |   SurfaceCard,
  24 |   formatCategory,
  25 |   shortRef,
  26 | } from '@/components/ui/academic-ui';
  27 | import { BentoGrid, BentoPanel, DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
  28 | import { MaxContentWidth, Spacing } from '@/constants/theme';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/dashboard/student-dashboard.tsx
- **Language:** tsx
- **Lines:** 765
- **Module/feature:** Role dashboard or responsive dashboard primitive.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useCallback, useEffect, useRef, useState } from 'react';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import {; import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';; import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L22: `type AcademicIconName,`
- L30: `const PRIMARY = BrandColors.primary;`
- L31: `const NAVY = BrandColors.navy;`
- L32: `const CARD_BG = BrandColors.card;`
- L33: `const MUTED = BrandColors.textSecondary;`
- L34: `const BORDER = BrandColors.border;`
- L35: `const SOFT_BLUE = BrandColors.softBlue;`
- L36: `const GREEN = '#16A34A';`
- L37: `const SOFT_GREEN = 'rgba(162,213,171,0.40)';`
- L39: `interface Announcement {`
- L47: `interface ActiveTicket {`
- L55: `interface RoomChange {`
- L66: `type SymbolName = AcademicIconName;`
- L68: `const STATUS_COLOR: Record<string, string> = {`
- L75: `const STATUS_LABEL: Record<string, string> = {`
- L82: `function formatDate(iso: string) {`
- L90: `function formatRelative(iso: string) {`
- L91: `const diff = Math.max(0, Date.now() - new Date(iso).getTime());`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 10 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 25 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 37 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useRef, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import {
  15 |   AcademicIcon,
  16 |   AppBackdrop,
  17 |   EmptyState,
  18 |   MetricCard,
  19 |   RoleHeroHeader,
  20 |   SectionHeader,
  21 |   StatusBadge,
  22 |   type AcademicIconName,
  23 | } from '@/components/ui/academic-ui';
  24 | import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
  25 | import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
  26 | import { useAuth } from '@/context/auth';
  27 | import { useTheme } from '@/hooks/use-theme';
  28 | import { supabase } from '@/lib/supabase';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/faq/faq-screen.tsx
- **Language:** tsx
- **Lines:** 213
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useRouter } from 'expo-router';; import { useCallback, useEffect, useMemo, useState } from 'react';; import {; import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';; import { SafeAreaView } from 'react-native-safe-area-context';; import RoleGuard from '@/components/role-guard';; import {; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L31: `interface FaqArticle {`
- L39: `function FaqContent() {`
- L40: `const router = useRouter();`
- L41: `const colors = useTheme();`
- L50: `const load = useCallback(async () => {`
- L66: `async function onRefresh() {`
- L72: `const visible = useMemo(() => {`
- L73: `const query = search.trim().toLowerCase();`
- L75: `const matchesCategory = category === 'all' || article.category === category;`
- L76: `const matchesSearch = !query || [article.title, article.answer, article.category, ...article.keywords]`
- L82: `const categories = useMemo(() => Array.from(new Set(articles.map(article => article.category))).sort(), [articles]);`
- L123: `const active = category === item;`
- L149: `const open = expanded === article.id;`
- L181: `export default function FaqScreen() {`
- L189: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 3 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 19 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 23 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useRouter } from 'expo-router';
   2 | import { useCallback, useEffect, useMemo, useState } from 'react';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   TextInput,
  11 |   View,
  12 | } from 'react-native';
  13 | import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
  14 | import { SafeAreaView } from 'react-native-safe-area-context';
  15 |
  16 | import RoleGuard from '@/components/role-guard';
  17 | import {
  18 |   Academic,
  19 |   AcademicIcon,
  20 |   AppBackdrop,
  21 |   EmptyState,
  22 |   IconButton,
  23 |   StatusBadge,
  24 |   SurfaceCard,
  25 |   formatCategory,
  26 | } from '@/components/ui/academic-ui';
  27 | import { MaxContentWidth, Spacing } from '@/constants/theme';
  28 | import { useTheme } from '@/hooks/use-theme';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/role-guard.tsx
- **Language:** tsx
- **Lines:** 48
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import type { ReactNode } from 'react';; import { StyleSheet, Text, View } from 'react-native';; import { Academic, AcademicIcon } from '@/components/ui/academic-ui';; import { Spacing } from '@/constants/theme';; import { type UserProfile, useAuth } from '@/context/auth';

**Block index and walkthrough focus**
- L8: `type Role = UserProfile['role'];`
- L10: `export default function RoleGuard({`
- L36: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 4 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import type { ReactNode } from 'react';
   2 | import { StyleSheet, Text, View } from 'react-native';
   3 |
   4 | import { Academic, AcademicIcon } from '@/components/ui/academic-ui';
   5 | import { Spacing } from '@/constants/theme';
   6 | import { type UserProfile, useAuth } from '@/context/auth';
   7 |
   8 | type Role = UserProfile['role'];
   9 |
  10 | export default function RoleGuard({
  11 |   allowed,
  12 |   children,
  13 | }: {
  14 |   allowed: readonly Role[];
  15 |   children: ReactNode;
  16 | }) {
  17 |   const { profile } = useAuth();
  18 |
  19 |   if (!profile || !allowed.includes(profile.role)) {
  20 |     return (
  21 |       <View style={styles.container}>
  22 |         <AcademicIcon
  23 |           name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
  24 |           color={Academic.error}
  25 |           size={42}
  26 |         />
  27 |         <Text style={styles.title}>Access restricted</Text>
  28 |         <Text style={styles.message}>Your CAS Assist role does not have access to this section.</Text>
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/themed-text.tsx
- **Language:** tsx
- **Lines:** 81
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { Platform, StyleSheet, Text, type TextProps } from 'react-native';; import { Fonts, ThemeColor, TypeScale } from '@/constants/theme';; import { useTheme } from '@/hooks/use-theme';

**Block index and walkthrough focus**
- L6: `export type ThemedTextProps = TextProps & {`
- L11: `export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {`
- L12: `const theme = useTheme();`
- L33: `const styles = StyleSheet.create({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 1 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 2 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 9 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { Platform, StyleSheet, Text, type TextProps } from 'react-native';
   2 |
   3 | import { Fonts, ThemeColor, TypeScale } from '@/constants/theme';
   4 | import { useTheme } from '@/hooks/use-theme';
   5 |
   6 | export type ThemedTextProps = TextProps & {
   7 |   type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
   8 |   themeColor?: ThemeColor;
   9 | };
  10 |
  11 | export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  12 |   const theme = useTheme();
  13 |
  14 |   return (
  15 |     <Text
  16 |       style={[
  17 |         { color: theme[themeColor ?? 'text'] },
  18 |         type === 'default' && styles.default,
  19 |         type === 'title' && styles.title,
  20 |         type === 'small' && styles.small,
  21 |         type === 'smallBold' && styles.smallBold,
  22 |         type === 'subtitle' && styles.subtitle,
  23 |         type === 'link' && styles.link,
  24 |         type === 'linkPrimary' && styles.linkPrimary,
  25 |         type === 'code' && styles.code,
  26 |         style,
  27 |       ]}
  28 |       {...rest}
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/themed-view.tsx
- **Language:** tsx
- **Lines:** 17
- **Module/feature:** Reusable frontend component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { View, type ViewProps } from 'react-native';; import { ThemeColor } from '@/constants/theme';; import { useTheme } from '@/hooks/use-theme';

**Block index and walkthrough focus**
- L6: `export type ThemedViewProps = ViewProps & {`
- L12: `export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {`
- L13: `const theme = useTheme();`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```tsx
   1 | import { View, type ViewProps } from 'react-native';
   2 |
   3 | import { ThemeColor } from '@/constants/theme';
   4 | import { useTheme } from '@/hooks/use-theme';
   5 |
   6 | export type ThemedViewProps = ViewProps & {
   7 |   lightColor?: string;
   8 |   darkColor?: string;
   9 |   type?: ThemeColor;
  10 | };
  11 |
  12 | export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  13 |   const theme = useTheme();
  14 |
  15 |   return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
  16 | }
  17 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/tickets/ticket-detail-screen.tsx
- **Language:** tsx
- **Lines:** 532
- **Module/feature:** Ticket detail and protected request workspace component.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useCallback, useEffect, useMemo, useState } from 'react';; import { useRouter } from 'expo-router';; import {; import { SafeAreaView } from 'react-native-safe-area-context';; import RoleGuard from '@/components/role-guard';; import {; import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';; import { MaxContentWidth, Spacing } from '@/constants/theme';; import { useAuth } from '@/context/auth';; import { useTheme } from '@/hooks/use-theme';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L32: `const STATUS_LABEL: Record<string, string> = {`
- L39: `const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {`
- L46: `const NEXT_STATUS: Record<string, string | null> = {`
- L53: `const NEXT_LABEL: Record<string, string> = {`
- L59: `interface TicketRow {`
- L76: `interface AuditRow {`
- L83: `interface StudentContext {`
- L89: `function formatDateTime(iso: string | null | undefined) {`
- L101: `function formatAction(action: string) {`
- L108: `function TicketDetailContent({ ticketId, showCreated }: { ticketId: string | undefined; showCreated: boolean }) {`
- L109: `const router = useRouter();`
- L111: `const colors = useTheme();`
- L122: `const userId = profile?.id ?? session?.user.id;`
- L123: `const canManage = profile?.role === 'staff' || profile?.role === 'super_admin';`
- L124: `const isSuperAdmin = profile?.role === 'super_admin';`
- L126: `const fetchTicket = useCallback(async () => {`
- L145: `const nextTicket = data as TicketRow;`
- L183: `const channel = supabase`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 9 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 23 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 64 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { useCallback, useEffect, useMemo, useState } from 'react';
   2 | import { useRouter } from 'expo-router';
   3 | import {
   4 |   ActivityIndicator,
   5 |   Pressable,
   6 |   RefreshControl,
   7 |   ScrollView,
   8 |   StyleSheet,
   9 |   Text,
  10 |   View,
  11 | } from 'react-native';
  12 | import { SafeAreaView } from 'react-native-safe-area-context';
  13 |
  14 | import RoleGuard from '@/components/role-guard';
  15 | import {
  16 |   Academic,
  17 |   AcademicIcon,
  18 |   AppBackdrop,
  19 |   EmptyState,
  20 |   IconButton,
  21 |   StatusBadge,
  22 |   SurfaceCard,
  23 |   formatCategory,
  24 |   shortRef,
  25 | } from '@/components/ui/academic-ui';
  26 | import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
  27 | import { MaxContentWidth, Spacing } from '@/constants/theme';
  28 | import { useAuth } from '@/context/auth';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/components/ui/academic-ui.tsx
- **Language:** tsx
- **Lines:** 888
- **Module/feature:** Shared CAS-Assist visual primitives, icons, controls, and formatting helpers.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { BlurView } from 'expo-blur';; import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';; import { SymbolView } from 'expo-symbols';; import type { LucideIcon } from 'lucide-react-native';; import ArrowLeft from 'lucide-react-native/icons/arrow-left';; import ArrowUp from 'lucide-react-native/icons/arrow-up';; import Activity from 'lucide-react-native/icons/activity';; import BadgeCheck from 'lucide-react-native/icons/badge-check';; import ChartBar from 'lucide-react-native/icons/chart-bar';; import Bell from 'lucide-react-native/icons/bell';; import BookOpen from 'lucide-react-native/icons/book-open';; import BriefcaseBusiness from 'lucide-react-native/icons/briefcase-business';

**Block index and walkthrough focus**
- L62: `type PressableProps,`
- L63: `type StyleProp,`
- L64: `type TextInputProps,`
- L65: `type ViewStyle,`
- L84: `export type AcademicIconName = ComponentProps<typeof SymbolView>['name'];`
- L86: `const ICONS: Record<string, LucideIcon> = {`
- L134: `const ICON_ENTERING = ZoomIn.springify().damping(24).stiffness(260).reduceMotion(ReduceMotion.System);`
- L135: `const CARD_ENTERING = FadeInUp.duration(320).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);`
- L136: `const HERO_ENTERING = FadeInDown.duration(380).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);`
- L137: `const BADGE_ENTERING = FadeIn.duration(180).reduceMotion(ReduceMotion.System);`
- L139: `export const Academic = BrandColors;`
- L141: `export function AppBackdrop() {`
- L146: `export type GlassVariant = 'standard' | 'strong' | 'soft';`
- L148: `function glassConfig(variant: GlassVariant, resolvedTheme: 'light' | 'dark') {`
- L149: `const dark = resolvedTheme === 'dark';`
- L160: `function GlassOverlay({ variant }: { variant: GlassVariant }) {`
- L162: `const config = glassConfig(variant, resolvedTheme);`
- L179: `export function GlassSurface({`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 22 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.
- The file defines or consumes 50 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```tsx
   1 | import { BlurView } from 'expo-blur';
   2 | import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
   3 | import { SymbolView } from 'expo-symbols';
   4 | import type { LucideIcon } from 'lucide-react-native';
   5 | import ArrowLeft from 'lucide-react-native/icons/arrow-left';
   6 | import ArrowUp from 'lucide-react-native/icons/arrow-up';
   7 | import Activity from 'lucide-react-native/icons/activity';
   8 | import BadgeCheck from 'lucide-react-native/icons/badge-check';
   9 | import ChartBar from 'lucide-react-native/icons/chart-bar';
  10 | import Bell from 'lucide-react-native/icons/bell';
  11 | import BookOpen from 'lucide-react-native/icons/book-open';
  12 | import BriefcaseBusiness from 'lucide-react-native/icons/briefcase-business';
  13 | import Building2 from 'lucide-react-native/icons/building';
  14 | import CalendarDays from 'lucide-react-native/icons/calendar-days';
  15 | import CheckCircle2 from 'lucide-react-native/icons/circle-check-big';
  16 | import ChevronDown from 'lucide-react-native/icons/chevron-down';
  17 | import ChevronLeft from 'lucide-react-native/icons/chevron-left';
  18 | import ChevronRight from 'lucide-react-native/icons/chevron-right';
  19 | import ChevronUp from 'lucide-react-native/icons/chevron-up';
  20 | import Circle from 'lucide-react-native/icons/circle';
  21 | import CircleAlert from 'lucide-react-native/icons/circle-alert';
  22 | import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
  23 | import ClipboardList from 'lucide-react-native/icons/clipboard-list';
  24 | import Clock3 from 'lucide-react-native/icons/clock-3';
  25 | import Contrast from 'lucide-react-native/icons/contrast';
  26 | import Database from 'lucide-react-native/icons/database';
  27 | import FileText from 'lucide-react-native/icons/file-text';
  28 | import GraduationCap from 'lucide-react-native/icons/graduation-cap';
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/constants/theme.ts
- **Language:** typescript
- **Lines:** 173
- **Module/feature:** Shared frontend design and layout constants.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import '@/global.css';; import { Platform } from 'react-native';

**Block index and walkthrough focus**
- L10: `export const Palette = {`
- L18: `export const Colors = {`
- L69: `export const BrandColors = {`
- L91: `export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;`
- L93: `export const Fonts = Platform.select({`
- L120: `export const Spacing = {`
- L130: `export const TypeScale = {`
- L139: `export const Shadows = {`
- L156: `export const Layout = {`
- L164: `export const Radius = {`
- L171: `export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;`
- L172: `export const MaxContentWidth = 1440;`

- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file defines or consumes 1 style/token references; responsive behavior is explained in the frontend design-system chapter.

**Representative excerpt**
```typescript
   1 | /**
   2 |  * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
   3 |  * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
   4 |  */
   5 |
   6 | import '@/global.css';
   7 |
   8 | import { Platform } from 'react-native';
   9 |
  10 | export const Palette = {
  11 |   mist: '#EEF4F1',
  12 |   sage: '#C8DDD6',
  13 |   aqua: '#0B7D77',
  14 |   slate: '#173F3D',
  15 |   mint: '#72DED5',
  16 | } as const;
  17 |
  18 | export const Colors = {
  19 |   light: {
  20 |     primary: Palette.aqua,
  21 |     primaryPressed: '#096A65',
  22 |     text: '#132523',
  23 |     textTertiary: '#879590',
  24 |     navy: Palette.slate,
  25 |     background: '#F5F7F6',
  26 |     backgroundElement: 'rgba(255,255,255,0.96)',
  27 |     card: 'rgba(255,255,255,0.90)',
  28 |     surface: '#FFFFFF',
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/context/auth.tsx
- **Language:** tsx
- **Lines:** 269
- **Module/feature:** React context provider and application-wide state.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import type { Session } from '@supabase/supabase-js';; import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';; import { supabase } from '@/lib/supabase';

**Block index and walkthrough focus**
- L8: `export interface UserProfile {`
- L17: `export type LoginCategory = 'student' | 'institutional';`
- L19: `interface AuthContextValue {`
- L37: `const AuthContext = createContext<AuthContextValue | null>(null);`
- L39: `type ProfileResult =`
- L43: `function safeProfileError(error: { code?: string; message?: string } | null): string {`
- L44: `const message = error?.message?.toLowerCase() ?? '';`
- L54: `function categoryAllowsRole(category: LoginCategory, role: UserProfile['role']): boolean {`
- L60: `const CATEGORY_MISMATCH_MESSAGE =`
- L65: `export function AuthProvider({ children }: { children: React.ReactNode }) {`
- L71: `const requestRef = useRef<{ userId: string; promise: Promise<ProfileResult> } | null>(null);`
- L72: `const generationRef = useRef(0);`
- L73: `const pendingLoginRef = useRef<{ userId: string | null; category: LoginCategory } | null>(null);`
- L77: `const fetchProfile = useCallback((userId: string): Promise<ProfileResult> => {`
- L79: `const promise = (async (): Promise<ProfileResult> => {`
- L101: `const clearLocalAuth = useCallback(async (message?: string) => {`
- L115: `const loadAuthenticatedProfile = useCallback(async (`
- L119: `const generation = generationRef.current;`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 2 database/API/auth integration call sites, which are listed by exact source in the appendix.
- The file contains approximately 18 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```tsx
   1 | import type { Session } from '@supabase/supabase-js';
   2 | import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
   3 |
   4 | import { supabase } from '@/lib/supabase';
   5 |
   6 | // ── Types ────────────────────────────────────────────────────
   7 |
   8 | export interface UserProfile {
   9 |   id: string;
  10 |   email: string;
  11 |   display_name: string;
  12 |   student_number: string | null;
  13 |   role: 'student' | 'faculty' | 'staff' | 'super_admin';
  14 |   state: 'active' | 'archived_read_only';
  15 | }
  16 |
  17 | export type LoginCategory = 'student' | 'institutional';
  18 |
  19 | interface AuthContextValue {
  20 |   session: Session | null;
  21 |   profile: UserProfile | null;
  22 |   isLoading: boolean;
  23 |   isProfileLoading: boolean;
  24 |   profileError: string | null;
  25 |   signIn: (email: string, password: string, category?: LoginCategory) => Promise<{ error: string | null }>;
  26 |   signUp: (
  27 |     email: string,
  28 |     password: string,
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/context/theme.tsx
- **Language:** tsx
- **Lines:** 73
- **Module/feature:** React context provider and application-wide state.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import 'expo-sqlite/localStorage/install';; import type { ReactNode } from 'react';; import { createContext, use, useEffect, useMemo, useState } from 'react';; import { useColorScheme } from 'react-native';; import { Colors } from '@/constants/theme';

**Block index and walkthrough focus**
- L9: `export type ThemePreference = 'light' | 'dark' | 'system';`
- L10: `export type ResolvedTheme = 'light' | 'dark';`
- L12: `type ThemeContextValue = {`
- L19: `const STORAGE_KEY = 'cas-assist.theme-preference';`
- L20: `const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);`
- L22: `function isThemePreference(value: string | null): value is ThemePreference {`
- L26: `export function AppThemeProvider({ children }: { children: ReactNode }) {`
- L27: `const deviceScheme = useColorScheme();`
- L32: `const stored = localStorage.getItem(STORAGE_KEY);`
- L39: `const setPreference = (nextPreference: ThemePreference) => {`
- L48: `const resolvedTheme: ResolvedTheme = preference === 'system'`
- L58: `const value = useMemo<ThemeContextValue>(() => ({`
- L68: `export function useAppTheme() {`
- L69: `const context = use(ThemePreferenceContext);`

- The TSX is a React Native component module: imports establish dependencies, state/effects coordinate runtime behavior, JSX describes the view tree, and StyleSheet entries define cross-platform layout.
- The file contains approximately 9 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```tsx
   1 | import 'expo-sqlite/localStorage/install';
   2 |
   3 | import type { ReactNode } from 'react';
   4 | import { createContext, use, useEffect, useMemo, useState } from 'react';
   5 | import { useColorScheme } from 'react-native';
   6 |
   7 | import { Colors } from '@/constants/theme';
   8 |
   9 | export type ThemePreference = 'light' | 'dark' | 'system';
  10 | export type ResolvedTheme = 'light' | 'dark';
  11 |
  12 | type ThemeContextValue = {
  13 |   preference: ThemePreference;
  14 |   resolvedTheme: ResolvedTheme;
  15 |   colors: typeof Colors.light | typeof Colors.dark;
  16 |   setPreference: (preference: ThemePreference) => void;
  17 | };
  18 |
  19 | const STORAGE_KEY = 'cas-assist.theme-preference';
  20 | const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);
  21 |
  22 | function isThemePreference(value: string | null): value is ThemePreference {
  23 |   return value === 'light' || value === 'dark' || value === 'system';
  24 | }
  25 |
  26 | export function AppThemeProvider({ children }: { children: ReactNode }) {
  27 |   const deviceScheme = useColorScheme();
  28 |   const [preference, setPreferenceState] = useState<ThemePreference>('light');
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/global.css
- **Language:** css
- **Lines:** 130
- **Module/feature:** React Native Web global typography, browser, focus, and safe-area CSS.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```css
   1 | :root {
   2 |   --font-sans:
   3 |     Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica,
   4 |     Arial, sans-serif;
   5 |   --font-display: var(--font-sans);
   6 |   --font-mono:
   7 |     ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
   8 |   --font-rounded: 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif;
   9 |   --font-serif: var(--font-sans);
  10 |
  11 |   /* Dark-mode aware body colors */
  12 |   --body-bg: #f5f7f6;
  13 |   --body-color: #132523;
  14 |   --selection-bg: rgba(11, 125, 119, 0.78);
  15 |   --selection-color: #ffffff;
  16 |   --focus-ring: rgba(11, 125, 119, 0.45);
  17 |   --glass-standard: rgba(255, 255, 255, 0.9);
  18 |   --glass-strong: rgba(255, 255, 255, 0.96);
  19 |   --glass-soft: rgba(255, 255, 255, 0.78);
  20 |   --glass-border: rgba(19, 62, 59, 0.11);
  21 |   --glass-blur: 6px;
  22 | }
  23 |
  24 | :root[data-theme='dark'] {
  25 |   --body-bg: #0C1716;
  26 |   --body-color: #F2F7F5;
  27 |   --selection-bg: rgba(94, 209, 200, 0.42);
  28 |   --selection-color: #ffffff;
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/hooks/use-color-scheme.ts
- **Language:** typescript
- **Lines:** 2
- **Module/feature:** Reusable React hook.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | export { useColorScheme } from 'react-native';
   2 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/hooks/use-color-scheme.web.ts
- **Language:** typescript
- **Lines:** 22
- **Module/feature:** Reusable React hook.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useEffect, useState } from 'react';; import { useColorScheme as useRNColorScheme } from 'react-native';

**Block index and walkthrough focus**
- L7: `export function useColorScheme() {`
- L14: `const colorScheme = useRNColorScheme();`

- The file contains approximately 4 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```typescript
   1 | import { useEffect, useState } from 'react';
   2 | import { useColorScheme as useRNColorScheme } from 'react-native';
   3 |
   4 | /**
   5 |  * To support static rendering, this value needs to be re-calculated on the client side for web
   6 |  */
   7 | export function useColorScheme() {
   8 |   const [hasHydrated, setHasHydrated] = useState(false);
   9 |
  10 |   useEffect(() => {
  11 |     setHasHydrated(true);
  12 |   }, []);
  13 |
  14 |   const colorScheme = useRNColorScheme();
  15 |
  16 |   if (hasHydrated) {
  17 |     return colorScheme;
  18 |   }
  19 |
  20 |   return 'light';
  21 | }
  22 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/hooks/use-push-notifications.ts
- **Language:** typescript
- **Lines:** 93
- **Module/feature:** Reusable React hook.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import Constants, { ExecutionEnvironment } from 'expo-constants';; import * as Device from 'expo-device';; import { useEffect, useState } from 'react';; import { Platform } from 'react-native';; importance: Notifications.AndroidImportance.HIGH,

**Block index and walkthrough focus**
- L6: `export interface PushNotificationState {`
- L12: `export function usePushNotifications(userId: string | undefined): PushNotificationState {`
- L25: `let cancelled = false;`
- L26: `let notificationSubscription: { remove: () => void } | undefined;`
- L27: `let responseSubscription: { remove: () => void } | undefined;`
- L31: `const Notifications = await import('expo-notifications');`
- L52: `const existing = await Notifications.getPermissionsAsync();`
- L53: `const finalStatus = existing.status === 'granted'`
- L59: `const projectId =`
- L63: `const token = await Notifications.getExpoPushTokenAsync({ projectId });`

- The file contains approximately 6 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```typescript
   1 | import Constants, { ExecutionEnvironment } from 'expo-constants';
   2 | import * as Device from 'expo-device';
   3 | import { useEffect, useState } from 'react';
   4 | import { Platform } from 'react-native';
   5 |
   6 | export interface PushNotificationState {
   7 |   expoPushToken: string | null;
   8 |   permissionGranted: boolean;
   9 |   lastNotification: unknown | null;
  10 | }
  11 |
  12 | export function usePushNotifications(userId: string | undefined): PushNotificationState {
  13 |   const [expoPushToken, setExpoPushToken]         = useState<string | null>(null);
  14 |   const [permissionGranted, setPermissionGranted] = useState(false);
  15 |   const [lastNotification, setLastNotification] = useState<unknown | null>(null);
  16 |
  17 |   useEffect(() => {
  18 |     if (
  19 |       !userId
  20 |       || Platform.OS === 'web'
  21 |       || !Device.isDevice
  22 |       || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  23 |     ) return;
  24 |
  25 |     let cancelled = false;
  26 |     let notificationSubscription: { remove: () => void } | undefined;
  27 |     let responseSubscription: { remove: () => void } | undefined;
  28 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/hooks/use-theme.ts
- **Language:** typescript
- **Lines:** 11
- **Module/feature:** Reusable React hook.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { useAppTheme } from '@/context/theme';

**Block index and walkthrough focus**
- L8: `export function useTheme() {`

- The file contains approximately 3 hook/context/router references; dependencies and state lifecycles are preserved in the full source appendix.

**Representative excerpt**
```typescript
   1 | /**
   2 |  * Learn more about light and dark modes:
   3 |  * https://docs.expo.dev/guides/color-schemes/
   4 |  */
   5 |
   6 | import { useAppTheme } from '@/context/theme';
   7 |
   8 | export function useTheme() {
   9 |   return useAppTheme().colors;
  10 | }
  11 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/lib/api.ts
- **Language:** typescript
- **Lines:** 74
- **Module/feature:** Frontend integration/configuration utility.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { supabase } from './supabase';

**Block index and walkthrough focus**
- L3: `const configuredBase = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');`
- L4: `const BASE = configuredBase && configuredBase !== 'disabled'`
- L9: `const REQUEST_TIMEOUT_MS = 12_000;`
- L11: `async function getToken(): Promise<string | null> {`
- L16: `export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {`
- L21: `const token = await getToken();`
- L22: `const controller = new AbortController();`
- L23: `const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);`
- L24: `let res: Response;`
- L41: `const err = await res.json().catch(() => ({}));`
- L48: `export async function apiGet<T = unknown>(path: string): Promise<T> {`
- L53: `const token = await getToken();`
- L54: `const controller = new AbortController();`
- L55: `const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);`
- L56: `let res: Response;`
- L69: `const err = await res.json().catch(() => ({}));`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | import { supabase } from './supabase';
   2 |
   3 | const configuredBase = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
   4 | const BASE = configuredBase && configuredBase !== 'disabled'
   5 |   ? process.env.EXPO_OS === 'android'
   6 |     ? configuredBase.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2')
   7 |     : configuredBase
   8 |   : undefined;
   9 | const REQUEST_TIMEOUT_MS = 12_000;
  10 |
  11 | async function getToken(): Promise<string | null> {
  12 |   const { data: { session } } = await supabase.auth.getSession();
  13 |   return session?.access_token ?? null;
  14 | }
  15 |
  16 | export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  17 |   if (!BASE) {
  18 |     throw new Error('This optional service is not configured.');
  19 |   }
  20 |
  21 |   const token = await getToken();
  22 |   const controller = new AbortController();
  23 |   const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  24 |   let res: Response;
  25 |
  26 |   try {
  27 |     res = await fetch(`${BASE}${path}`, {
  28 |       method: 'POST',
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/lib/config.ts
- **Language:** typescript
- **Lines:** 26
- **Module/feature:** Frontend integration/configuration utility.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();`
- L2: `const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();`
- L4: `function isHttpsUrl(value: string | undefined): value is string {`
- L13: `export const publicConfigError = !isHttpsUrl(supabaseUrl)`
- L19: `export const publicConfig = {`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
   2 | const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
   3 |
   4 | function isHttpsUrl(value: string | undefined): value is string {
   5 |   if (!value) return false;
   6 |   try {
   7 |     return new URL(value).protocol === 'https:';
   8 |   } catch {
   9 |     return false;
  10 |   }
  11 | }
  12 |
  13 | export const publicConfigError = !isHttpsUrl(supabaseUrl)
  14 |   ? 'CAS Assist is missing a valid Supabase URL. Install a correctly configured build or contact the administrator.'
  15 |   : !supabaseAnonKey
  16 |     ? 'CAS Assist is missing its Supabase publishable key. Install a correctly configured build or contact the administrator.'
  17 |     : null;
  18 |
  19 | export const publicConfig = {
  20 |   // Invalid placeholders prevent an import-time SDK crash. The root configuration
  21 |   // gate blocks authentication and data access whenever publicConfigError is set.
  22 |   supabaseUrl: supabaseUrl ?? 'https://invalid.local',
  23 |   supabaseAnonKey: supabaseAnonKey ?? 'invalid-public-key',
  24 | };
  25 |
  26 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/lib/supabase.ts
- **Language:** typescript
- **Lines:** 14
- **Module/feature:** Frontend integration/configuration utility.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** import { createClient } from '@supabase/supabase-js';; import AsyncStorage from '@react-native-async-storage/async-storage';; import { publicConfig } from '@/lib/config';

**Block index and walkthrough focus**
- L6: `export const supabase = createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | import { createClient } from '@supabase/supabase-js';
   2 | import AsyncStorage from '@react-native-async-storage/async-storage';
   3 |
   4 | import { publicConfig } from '@/lib/config';
   5 |
   6 | export const supabase = createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {
   7 |   auth: {
   8 |     storage: AsyncStorage,
   9 |     autoRefreshToken: true,
  10 |     persistSession: true,
  11 |     detectSessionInUrl: false,
  12 |   },
  13 | });
  14 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/src/types/styles.d.ts
- **Language:** typescript
- **Lines:** 5
- **Module/feature:** TypeScript ambient type declaration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L2: `const classes: Readonly<Record<string, string>>;`
- L3: `export default classes;`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```typescript
   1 | declare module '*.css' {
   2 |   const classes: Readonly<Record<string, string>>;
   3 |   export default classes;
   4 | }
   5 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/tsconfig.json
- **Language:** json
- **Lines:** 21
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "extends": "expo/tsconfig.base",
   3 |   "compilerOptions": {
   4 |     "strict": true,
   5 |     "paths": {
   6 |       "@/*": [
   7 |         "./src/*"
   8 |       ],
   9 |       "@/assets/*": [
  10 |         "./assets/*"
  11 |       ]
  12 |     }
  13 |   },
  14 |   "include": [
  15 |     "**/*.ts",
  16 |     "**/*.tsx",
  17 |     ".expo/types/**/*.ts",
  18 |     "expo-env.d.ts"
  19 |   ]
  20 | }
  21 |
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### Frontend/vercel.json
- **Language:** json
- **Lines:** 43
- **Module/feature:** Frontend build, deployment, dependency, or platform configuration.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- No top-level declaration pattern was extracted; inspect the complete appendix source.

- Configuration values determine build/runtime behavior; secret values are intentionally not reproduced in this reviewer.

**Representative excerpt**
```json
   1 | {
   2 |   "$schema": "https://openapi.vercel.sh/vercel.json",
   3 |   "buildCommand": "npm run build:web",
   4 |   "outputDirectory": "dist",
   5 |   "devCommand": "npm run web",
   6 |   "cleanUrls": true,
   7 |   "framework": null,
   8 |   "rewrites": [
   9 |     {
  10 |       "source": "/:path*",
  11 |       "destination": "/"
  12 |     }
  13 |   ],
  14 |   "headers": [
  15 |     {
  16 |       "source": "/_expo/static/(.*)",
  17 |       "headers": [
  18 |         {
  19 |           "key": "Cache-Control",
  20 |           "value": "public, max-age=31536000, immutable"
  21 |         }
  22 |       ]
  23 |     },
  24 |     {
  25 |       "source": "/(.*)",
  26 |       "headers": [
  27 |         {
  28 |           "key": "X-Content-Type-Options",
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

### README.md
- **Language:** markdown
- **Lines:** 29
- **Module/feature:** Top-level project orientation, local startup commands, and production URL.
- **Evidence status:** Read from the checked-out revision; full sanitized source is reproduced in Appendix B.
- **Imports/dependencies observed:** None or configuration-only.

**Block index and walkthrough focus**
- L1: `# CAS Assist`
- L5: `## Project structure`
- L10: `## Local development`
- L26: `## Production website`

- The complete source is captured in the appendix and represented in the coverage matrix with an exact line count.

**Representative excerpt**
```markdown
   1 | # CAS Assist
   2 |
   3 | CAS Assist is a cross-platform academic information and helpdesk system for the New Era University College of Arts and Sciences.
   4 |
   5 | ## Project structure
   6 |
   7 | - `Frontend/` — Expo Router application for web, Android, and iOS
   8 | - `Backend/` — TypeScript API, Supabase migrations, tests, and verification scripts
   9 |
  10 | ## Local development
  11 |
  12 | ``​`powershell
  13 | cd Frontend
  14 | npm install
  15 | npm run web
  16 | ``​`
  17 |
  18 | ``​`powershell
  19 | cd Backend
  20 | npm install
  21 | npm run dev
  22 | ``​`
  23 |
  24 | Copy each `.env.example` to `.env` and provide the required local configuration before starting the services.
  25 |
  26 | ## Production website
  27 |
  28 | https://cas-assist.vercel.app
```

**Edge cases and defense facts**
- Empty, loading, invalid-input, authorization, and service-failure behavior must be read from the exact branches in the full source; the reviewer does not infer undocumented behavior.
- Related files: See the architecture and workflow chapters.

# Appendix A. Coverage and evidence rules

- Source paths and line counts are generated at capture time; they should be re-generated after any code change.
- Package lockfiles are inventoried but excluded from handwritten source coverage because they are generated dependency metadata.
- Binary images/fonts/icons are inventoried separately; their use is explained through importing source modules and configuration.
- No environment secret values or live database records are included.
- Local SQL is treated as intended schema evidence, not as proof of remote schema state.

# Appendix B. Complete sanitized source appendix

This appendix is intentionally long. It lets a student search the exact code studied by the reviewer and compare every cited line range with the checked-out revision.

## AGENTS.md
**markdown · 76 lines · Repository operating rules and safety constraints for development work.**

```markdown
# CAS-ASSIST1 — Codex Development Instructions

## Role
Act as a senior full-stack software engineer,
software architect, QA engineer, and
security-conscious code reviewer.

## Project
CAS-ASSIST1 is an existing application with:
- Frontend and Backend directories
- Supabase integration
- GitHub version control
- Existing Vercel deployment

## Primary Objective
Enhance the application while preserving
existing functionality, architecture,
database integrations, and production stability.

## Strict Rules
1. Inspect existing code before making changes.
2. Never rewrite the entire application for
   a small enhancement.
3. Preserve existing features, routes, APIs,
   authentication, and database relationships.
4. Work only on an approved feature branch.
   Never push directly to main.
5. Never delete files or refactor unrelated
   components without approval.
6. Never expose or commit environment secrets.
7. Never modify production database data or
   schemas without explicit approval.
8. Never upgrade dependencies or change
   deployment settings without approval.
9. Never invent undocumented APIs or functions.
10. Avoid destructive Git commands, force
    pushes, and automatic production deployments.
11. Make targeted, reversible changes.
12. Distinguish verified facts from assumptions.

## Mandatory Workflow

### Phase 1 — Analysis
- Inspect relevant code and dependencies.
- Identify existing functionality and risks.
- Propose an implementation plan.
- Wait for user approval.

### Phase 2 — Implementation
- Modify only approved files.
- Preserve unrelated functionality.
- Follow existing coding conventions.

### Phase 3 — Validation
- Run existing tests and typechecks.
- Run relevant builds and lint checks.
- Report failures and untested scenarios.
- Never claim unperformed tests passed.

### Phase 4 — Review
- Summarize all modified files.
- Explain behavioral changes.
- Report verification results.
- Identify risks and rollback instructions.
- Wait for approval before committing,
  pushing, merging, or deploying.

## Security
Treat .env files, credentials, access tokens,
and production data as sensitive.
Use isolated development resources when
testing database changes.

## Golden Rule
Preserve working functionality first.
Implement approved enhancements second.
```

## Backend/.env.example
**text · 9 lines · Backend dependency, deployment, documentation, or local configuration.**

```text
NODE_ENV=[redacted from reviewer]
PORT=[redacted from reviewer]
SUPABASE_URL=[redacted from reviewer]
SUPABASE_SECRET_KEY=[redacted] from reviewer]
ALLOWED_ORIGINS=[redacted from reviewer]
OPENAI_API_KEY=[redacted] from reviewer]
EXPO_ACCESS_TOKEN=[redacted] from reviewer]
REQUEST_TIMEOUT_MS=[redacted from reviewer]

```

## Backend/Dockerfile
**dockerfile · 18 lines · Backend deployment/build configuration.**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["npm", "start"]

```

## Backend/docs/database-migration-plan.md
**markdown · 53 lines · Backend dependency, deployment, documentation, or local configuration.**

```markdown
# Database Backup and Migration Plan

## Current remote evidence

Read-only inspection of the linked active project found these public tables:

- `users_account_registry` (estimated one row)
- `advising_ticket_pipeline` (estimated zero rows)
- `announcements`, `spatial_logs`, `spatial_log_acknowledgments`
- `schedules`, `document_requests`
- `handbook_knowledge_embeddings`, `push_notification_logs`

Docker/`pg_dump` is not available locally, and the linked pooler does not expose a database password. Therefore, no live migration is applied by this phase.

## Required backup before remote apply

1. In Supabase Dashboard, confirm Point-in-Time Recovery or create an on-demand database backup.
2. Export the public schema and data from the Dashboard or run `supabase db dump` from a machine with Docker.
3. Export Storage bucket configuration and record object counts.
4. Record Auth user count without exporting credentials.
5. Save the pre-migration schema hash and migration-history output.
6. Test the migration on a disposable Supabase project restored from the export.

## Migration strategy

- Add missing columns and entities with `IF NOT EXISTS`.
- Preserve UUID ownership and existing records.
- Map legacy advising states:
  - `open` → `submitted`
  - `in_progress` → `under_evaluation`
  - `pending_review` → `action_required`
  - `closed` → `resolved`
- Reject unknown states before adding the exact four-state constraint.
- Add private Storage buckets without making existing buckets public.
- Enable RLS table by table, then install explicit role/lifecycle policies.
- Use server-only functions for privileged changes, notifications, AI, and analytics.
- Validate row counts, lifecycle values, policy coverage, and critical queries before promoting.

## Rollback

The preferred rollback is restoring the verified pre-migration backup/PITR point. Do not attempt a lossy down migration after production writes begin. If validation fails before writes resume, restore immediately and keep the application on the pre-migration release.

## Apply gate

Do not run `supabase db push` until:

- a backup is confirmed,
- the pulled live schema can be compared,
- a disposable-project test passes,
- role test accounts exist,
- the owner approves the maintenance window.


```

## Backend/docs/presentation-test-script.md
**markdown · 60 lines · Backend dependency, deployment, documentation, or local configuration.**

```markdown
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

```

## Backend/package.json
**json · 47 lines · Backend dependency, deployment, documentation, or local configuration.**

```json
{
  "name": "cas-assist-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.19"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "inspect-schema": "node scripts/inspect-schema-metadata.cjs",
    "verify-remote": "node scripts/verify-remote.mjs",
    "seed-test": "node scripts/seed-test-environment.mjs",
    "verify-integration": "node scripts/verify-integration.mjs",
    "verify-announcements": "node scripts/verify-announcement-permissions.mjs",
    "verify-room-change": "node scripts/verify-faculty-room-change.mjs",
    "verify-student-registration": "node scripts/verify-student-registration.mjs",
    "verify-system-analytics": "node scripts/verify-system-analytics.mjs",
    "verify-ai-deflection": "node scripts/verify-ai-deflection.mjs",
    "verify-faq-fallback": "node scripts/verify-faq-fallback.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.106.2",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^8.6.1",
    "helmet": "^8.3.0",
    "pino-http": "^11.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^24.10.1",
    "@types/pg": "^8.20.0",
    "pg": "^8.22.0",
    "tsx": "^4.20.6",
    "typescript": "~6.0.3",
    "vitest": "^4.1.10"
  }
}

```

## Backend/README.md
**markdown · 27 lines · Backend dependency, deployment, documentation, or local configuration.**

```markdown
# CAS Assist API

Express 5 + TypeScript gateway for trusted CAS Assist operations. Server credentials must never use an `EXPO_PUBLIC_` prefix.

## Local setup

1. Copy `.env.example` to `.env`.
2. Supply server-only values through the shell or an untracked `.env`.
3. Run `npm ci`, `npm run typecheck`, `npm test`, then `npm run dev`.
4. Check `GET http://localhost:3000/api/health`.

The API validates Supabase bearer tokens, loads the registry profile server-side, and applies role/lifecycle middleware. Request logs redact authorization and credential-like fields.

## Production

Deploy `Backend/` as a Docker service using `render.yaml` or an equivalent HTTPS platform. Configure:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or map the service-role key to this name)
- `ALLOWED_ORIGINS` as a comma-separated HTTPS allowlist
- optional `OPENAI_API_KEY`
- optional `EXPO_ACCESS_TOKEN`

After deployment, verify `/api/health` over HTTPS and set the frontend’s `EXPO_PUBLIC_API_URL` to that origin. Never expose server keys to the Expo app.

The AI endpoint is a closed-domain Tier-1 retrieval service. It searches only active, role-scoped articles managed in `tier1_knowledge_articles`, records confidence and feedback, and defers low-confidence or open-domain questions instead of guessing. Verified institutional document chunks remain excluded until equivalent audience metadata is available. Queue endpoints require the matching database RPC migrations. Notification delivery remains unavailable until device-token and delivery-log migrations exist.

```

## Backend/render.yaml
**yaml · 20 lines · Backend deployment/build configuration.**

```yaml
services:
  - type: web
    name: cas-assist-api
    runtime: docker
    dockerfilePath: ./Dockerfile
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SECRET_KEY
        sync: false
      - key: ALLOWED_ORIGINS
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: EXPO_ACCESS_TOKEN
        sync: false

```

## Backend/scripts/inspect-schema-metadata.cjs
**javascript · 67 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
const fs = require('fs');
const { Client } = require('pg');

const queries = {
  COLUMNS: `
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `,
  CONSTRAINTS: `
    select conrelid::regclass::text as table_name, conname,
      pg_get_constraintdef(oid) as definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by 1, 2
  `,
  POLICIES: `
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `,
  FUNCTIONS: `
    select routine_name, data_type
    from information_schema.routines
    where routine_schema = 'public'
    order by routine_name
  `,
  TRIGGERS: `
    select event_object_table, trigger_name, event_manipulation
    from information_schema.triggers
    where trigger_schema = 'public'
    order by event_object_table, trigger_name
  `,
  BUCKETS: `
    select id, name, public, file_size_limit
    from storage.buckets
    order by id
  `,
};

async function main() {
  const connectionString = fs.readFileSync('supabase/.temp/pooler-url', 'utf8').trim();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  for (const [label, query] of Object.entries(queries)) {
    console.log(`---${label}---`);
    const result = await client.query(query);
    for (const row of result.rows) console.log(JSON.stringify(row));
  }

  await client.end();
}

main().catch(error => {
  const safeMessage = String(error.message ?? 'Unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[database-url-redacted]')
    .replace(/password=[^\s]+/gi, 'password=[redacted]');
  console.error('Schema metadata query failed:', error.code ?? error.name, safeMessage);
  process.exitCode = 1;
});

```

## Backend/scripts/seed-test-environment.mjs
**javascript · 232 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error('Backend Supabase configuration is missing.');

const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!publicKey) throw new Error('Frontend publishable/anon key is missing.');

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = new URL(url).hostname.split('.')[0].slice(0, 8);
const roles = ['student', 'faculty', 'staff', 'super_admin'];
const displayNames = {
  student: 'CAS Test Student',
  faculty: 'CAS Test Faculty',
  staff: 'CAS Test Staff',
  super_admin: 'CAS Test Administrator',
};
const testStudentNumber = '99-00000-001';

const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

const accounts = {};
for (const role of roles) {
  const email = `casassist.${role}.${suffix}@neu.edu.ph`;
  const password = `CaS!${randomBytes(18).toString('base64url')}`;
  let user = existingUsers.users.find(candidate => candidate.email?.toLowerCase() === email);

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: {
        display_name: displayNames[role],
        student_number: role === 'student' ? testStudentNumber : null,
        cas_test_account: true,
      },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayNames[role],
        student_number: role === 'student' ? testStudentNumber : null,
        cas_test_account: true,
      },
    });
    if (error) throw error;
    user = data.user;
  }

  accounts[role] = { id: user.id, email, password };
}

for (const role of roles) {
  const account = accounts[role];
  const { error } = await admin
    .from('users_account_registry')
    .update({
      display_name: displayNames[role],
      student_number: role === 'student' ? testStudentNumber : null,
      role,
      state: 'active',
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: accounts.super_admin.id,
      rejection_reason: null,
    })
    .eq('id', account.id);
  if (error) throw error;
}

const { error: programError } = await admin.from('cas_programs').upsert({
  code: 'CAS-TEST',
  name: 'CAS Assist Test Program',
  department: 'CAS Test Department',
  is_active: true,
}, { onConflict: 'code' });
if (programError) throw programError;

const { error: membershipError } = await admin.from('student_program_memberships').upsert({
  student_id: accounts.student.id,
  program_code: 'CAS-TEST',
  year_level: 3,
  block_code: 'TEST-3A',
  is_current: true,
}, { onConflict: 'student_id,program_code,started_at' });
if (membershipError) throw membershipError;

const { data: assignment, error: assignmentError } = await admin.from('faculty_assignments').upsert({
  faculty_id: accounts.faculty.id,
  subject_code: 'CAS-TEST-101',
  subject_title: 'CAS Assist Test Subject',
  section_code: 'TEST-3A',
  block_code: 'TEST-3A',
  room: 'CAS 101',
  day_pattern: 'Daily',
  starts_at: '09:00',
  ends_at: '10:30',
  term_code: 'TEST-TERM',
  is_active: true,
}, { onConflict: 'faculty_id,subject_code,section_code,term_code' }).select('id').single();
if (assignmentError) throw assignmentError;

const { error: enrollmentError } = await admin.from('student_enrollments').upsert({
  student_id: accounts.student.id,
  assignment_id: assignment.id,
  state: 'active',
}, { onConflict: 'student_id,assignment_id' });
if (enrollmentError) throw enrollmentError;

const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }).format(new Date()).toLowerCase();
const { data: existingSchedule, error: scheduleReadError } = await admin.from('schedules').select('id')
  .eq('faculty_id', accounts.faculty.id).eq('subject_code', 'CAS-TEST-101').eq('section', 'TEST-3A').limit(1).maybeSingle();
if (scheduleReadError) throw scheduleReadError;
if (!existingSchedule) {
  const { error } = await admin.from('schedules').insert({
    faculty_id: accounts.faculty.id,
    subject_code: 'CAS-TEST-101',
    subject_name: 'CAS Assist Test Subject',
    section: 'TEST-3A',
    room: 'CAS 101',
    day: today,
    time_start: '09:00',
    time_end: '10:30',
    semester: 'Test Semester',
    academic_year: '2026-2027',
    state: 'active',
  });
  if (error) throw error;
}

async function insertOnce(table, matchColumn, matchValue, values) {
  const { data, error: readError } = await admin.from(table).select('id').eq(matchColumn, matchValue).limit(1).maybeSingle();
  if (readError) throw readError;
  if (data) return data.id;
  const { data: inserted, error } = await admin.from(table).insert(values).select('id').single();
  if (error) throw error;
  return inserted.id;
}

await insertOnce('announcements', 'title', 'CAS Assist Test Announcement', {
  created_by: accounts.super_admin.id,
  title: 'CAS Assist Test Announcement',
  body: 'The test environment is connected and ready for role-based validation.',
  state: 'published',
  priority: 'normal',
  pinned: true,
  audience_roles: roles,
  publish_at: new Date().toISOString(),
});

await insertOnce('advising_ticket_pipeline', 'description', 'CAS Assist generated test advising ticket.', {
  student_id: accounts.student.id,
  category: 'Academic Advising',
  description: 'CAS Assist generated test advising ticket.',
  status: 'submitted',
  priority: 'normal',
  state: 'active',
});

await insertOnce('document_requests', 'purpose', 'CAS Assist generated test document request.', {
  student_id: accounts.student.id,
  document_type: 'certificate_of_enrollment',
  purpose: 'CAS Assist generated test document request.',
  copies: 1,
  status: 'submitted',
  state: 'active',
});

const roomChangeId = await insertOnce('spatial_logs', 'reason', 'CAS Assist generated test room change.', {
  faculty_id: accounts.faculty.id,
  assignment_id: assignment.id,
  subject_code: 'CAS-TEST-101',
  section_code: 'TEST-3A',
  original_room: 'CAS 101',
  new_room: 'CAS 102',
  reason: 'CAS Assist generated test room change.',
});

const credentials = roles.flatMap(role => [
  `CAS_TEST_${role.toUpperCase()}_EMAIL=${accounts[role].email}`,
  `CAS_TEST_${role.toUpperCase()}_PASSWORD=${accounts[role].password}`,
]);
await writeFile('.env.test-users', `${credentials.join('\n')}\n`, { mode: 0o600 });

const rlsChecks = {};
for (const role of roles) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email: accounts[role].email,
    password: accounts[role].password,
  });
  if (signInError) throw signInError;

  const checks = role === 'student'
    ? [['announcements', 'id'], ['advising_ticket_pipeline', 'id'], ['document_requests', 'id'], ['spatial_logs', 'id']]
    : role === 'faculty'
      ? [['schedules', 'id'], ['spatial_logs', 'id']]
      : role === 'staff'
        ? [['advising_ticket_pipeline', 'id'], ['document_requests', 'id']]
        : [['users_account_registry', 'id'], ['announcements', 'id']];

  for (const [table, column] of checks) {
    const { error } = await client.from(table).select(column).limit(1);
    if (error) throw new Error(`${role} cannot read ${table}: ${error.message}`);
  }
  if (role === 'student') {
    const { error } = await client.rpc('acknowledge_room_change', { p_spatial_log_id: roomChangeId });
    if (error) throw new Error(`student acknowledgment failed: ${error.message}`);
  }
  await client.auth.signOut();
  rlsChecks[role] = checks.length;
}

console.log(JSON.stringify({
  ok: true,
  accounts: roles.length,
  seededDataSets: 7,
  rlsChecks,
  credentialsFile: 'Backend/.env.test-users',
}));

```

## Backend/scripts/verify-ai-deflection.mjs
**javascript · 83 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secret) throw new Error('Supabase verification configuration is incomplete.');

async function tokenFor(role) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { data, error } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });
  if (error || !data.session) throw error ?? new Error(`No ${role} session returned.`);
  return data.session.access_token;
}

const roles = {
  student: 'How do I submit an advising request?',
  faculty: 'How can I record a classroom relocation?',
  staff: 'Where do I publish an announcement?',
  super_admin: 'What information is shown in system analytics?',
};
const tokens = Object.fromEntries(await Promise.all(
  Object.keys(roles).map(async role => [role, await tokenFor(role)]),
));
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const queryIds = [];
const { app } = await import('../dist/app.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server address unavailable.');
  const endpoint = `http://127.0.0.1:${address.port}/api/ai/query`;

  for (const [role, query] of Object.entries(roles)) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokens[role]}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const body = await response.json();
    if (response.status !== 200 || !body.isDeflected || !body.answer || !body.source?.title) {
      throw new Error(`${role} deflection failed with status ${response.status}: ${JSON.stringify(body)}`);
    }
    queryIds.push(body.queryId);
  }

  const unrelated = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokens.student}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'Who won an international football championship on another continent?' }),
  });
  const unrelatedBody = await unrelated.json();
  if (unrelated.status !== 200 || unrelatedBody.isDeflected !== false) {
    throw new Error('The closed-domain boundary did not reject an unrelated question.');
  }
  queryIds.push(unrelatedBody.queryId);

  const feedback = await fetch(`http://127.0.0.1:${address.port}/api/ai/feedback`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokens.student}`, 'content-type': 'application/json' },
    body: JSON.stringify({ queryId: unrelatedBody.queryId, resolved: false }),
  });
  if (feedback.status !== 204) throw new Error(`Feedback returned ${feedback.status}.`);

  console.log(JSON.stringify({ ok: true, rolesVerified: 4, openDomainRejected: true, feedbackVerified: true }));
} finally {
  await new Promise(resolve => server.close(resolve));
  if (queryIds.length) await admin.from('ai_query_logs').delete().in('id', queryIds);
}

```

## Backend/scripts/verify-announcement-permissions.mjs
**javascript · 61 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !publicKey) {
  throw new Error('Supabase URL or frontend public key is missing.');
}

async function verifyRole(role) {
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });

  if (authError || !authData.user) {
    throw authError ?? new Error(`No ${role} user returned.`);
  }

  let announcementId;
  try {
    const { data, error } = await client
      .from('announcements')
      .insert({
        created_by: authData.user.id,
        title: `CAS Assist permission check (${role})`,
        body: 'Temporary verification announcement. This row is removed automatically.',
        audience_roles: ['student', 'faculty', 'staff', 'super_admin'],
        pinned: false,
        state: 'published',
        publish_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) throw error ?? new Error(`${role} insert returned no row.`);
    announcementId = data.id;
  } finally {
    if (announcementId) {
      const { error } = await client.from('announcements').delete().eq('id', announcementId);
      if (error) throw error;
    }
    await client.auth.signOut();
  }
}

for (const role of ['staff', 'super_admin']) {
  await verifyRole(role);
}

console.log(JSON.stringify({ ok: true, rolesVerified: ['staff', 'super_admin'] }));

```

## Backend/scripts/verify-faculty-room-change.mjs
**javascript · 64 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = backendEnv.SUPABASE_SECRET_KEY;

if (!url || !publicKey || !secretKey) {
  throw new Error('Supabase URL, public key, or backend secret key is missing.');
}

const faculty = createClient(url, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } = await faculty.auth.signInWithPassword({
  email: testUsers.CAS_TEST_FACULTY_EMAIL,
  password: testUsers.CAS_TEST_FACULTY_PASSWORD,
});
if (authError || !authData.user) throw authError ?? new Error('No faculty user returned.');

const { data: assignment, error: assignmentError } = await faculty
  .from('faculty_assignments')
  .select('id, subject_code, section_code, room')
  .eq('faculty_id', authData.user.id)
  .eq('is_active', true)
  .limit(1)
  .single();
if (assignmentError || !assignment) throw assignmentError ?? new Error('No active faculty assignment found.');

let insertedId;
try {
  const { data, error } = await faculty
    .from('spatial_logs')
    .insert({
      faculty_id: authData.user.id,
      assignment_id: assignment.id,
      original_room: assignment.room ?? 'CAS TEST ROOM',
      new_room: 'CAS TEST TEMPORARY ROOM',
      subject_code: assignment.subject_code,
      section_code: assignment.section_code,
      reason: 'Temporary CAS Assist permission verification.',
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Room-change insert returned no row.');
  insertedId = data.id;
} finally {
  if (insertedId) {
    const { error } = await admin.from('spatial_logs').delete().eq('id', insertedId);
    if (error) throw error;
  }
  await faculty.auth.signOut();
}

console.log(JSON.stringify({ ok: true, roleVerified: 'faculty', cleanedUp: true }));

```

## Backend/scripts/verify-faq-fallback.mjs
**javascript · 56 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secret) throw new Error('Supabase verification configuration is incomplete.');

const roleQuestions = {
  student: 'How do I request a school document?',
  faculty: 'How do room changes work?',
  staff: 'Where can I publish announcements?',
  super_admin: 'What does system analytics show?',
};
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const queryIds = [];

try {
  for (const [role, question] of Object.entries(roleQuestions)) {
    const prefix = `CAS_TEST_${role.toUpperCase()}`;
    const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: testUsers[`${prefix}_EMAIL`],
      password: testUsers[`${prefix}_PASSWORD`],
    });
    if (signInError) throw signInError;

    const { count, error: faqError } = await client
      .from('tier1_knowledge_articles')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'active');
    if (faqError || (count ?? 0) < 11) throw faqError ?? new Error(`${role} cannot read the FAQ collection.`);

    const { data, error } = await client.rpc('answer_tier1_question', { p_query: question });
    if (error || !data?.isDeflected || !data.answer || !data.source?.title) {
      throw error ?? new Error(`${role} did not receive a grounded fallback answer.`);
    }
    queryIds.push(data.queryId);

    const { error: feedbackError } = await client.rpc('record_tier1_feedback', {
      p_query_id: data.queryId,
      p_resolved: true,
    });
    if (feedbackError) throw feedbackError;
    await client.auth.signOut();
  }

  console.log(JSON.stringify({ ok: true, rolesVerified: 4, faqArticles: 11, feedbackVerified: true }));
} finally {
  if (queryIds.length) await admin.from('ai_query_logs').delete().in('id', queryIds);
}

```

## Backend/scripts/verify-integration.mjs
**javascript · 62 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !publicKey) throw new Error('Supabase URL or frontend public key is missing.');

async function tokenFor(role) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { data, error } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });
  if (error || !data.session) throw error ?? new Error(`No ${role} session returned.`);
  return data.session.access_token;
}

const [{ app }, studentToken, staffToken] = await Promise.all([
  import('../dist/app.js'),
  tokenFor('student'),
  tokenFor('staff'),
]);

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server address unavailable.');
  const base = `http://127.0.0.1:${address.port}`;

  const checks = [
    ['health', '/api/health', undefined, 200],
    ['anonymous rejection', '/api/queue/estimate', undefined, 401],
    ['student estimate', '/api/queue/estimate', studentToken, 200],
    ['student analytics rejection', '/api/queue/analytics', studentToken, 403],
    ['staff analytics', '/api/queue/analytics', staffToken, 200],
  ];

  for (const [name, path, token, expected] of checks) {
    const response = await fetch(`${base}${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (response.status !== expected) {
      throw new Error(`${name} returned ${response.status}; expected ${expected}.`);
    }
  }

  console.log(JSON.stringify({ ok: true, apiChecks: checks.length }));
} finally {
  await new Promise(resolve => server.close(resolve));
}

```

## Backend/scripts/verify-remote.mjs
**javascript · 49 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required in Backend/.env');
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  'users_account_registry',
  'faculty_assignments',
  'student_enrollments',
  'advising_ticket_pipeline',
  'spatial_logs',
  'spatial_log_acknowledgments',
  'announcements',
  'document_requests',
  'schedules',
  'ai_query_logs',
];

const failures = [];
for (const table of tables) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
  if (error) failures.push(`${table}: ${error.message}`);
}

const { error: analyticsError } = await supabase.rpc('get_queue_analytics', {
  p_window_hours: 168,
  p_category: null,
});
if (analyticsError) failures.push(`get_queue_analytics: ${analyticsError.message}`);

const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
if (authError) failures.push(`admin auth: ${authError.message}`);

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, tables: tables.length, rpc: true, adminAuth: true }));
}

```

## Backend/scripts/verify-student-registration.mjs
**javascript · 48 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error('Backend Supabase configuration is missing.');

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `casassist.registration.check.${stamp}@neu.edu.ph`;
const studentNumber = String(stamp);
let userId;

try {
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password: `Verify!${stamp}`,
    email_confirm: true,
    user_metadata: {
      display_name: 'Registration Verification',
      student_number: studentNumber,
      cas_test_account: true,
    },
  });
  if (createError) throw createError;
  userId = data.user.id;

  const { data: profile, error: profileError } = await admin
    .from('users_account_registry')
    .select('email, display_name, student_number, role')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;
  if (profile.student_number !== studentNumber || profile.role !== 'student') {
    throw new Error('The registration profile did not preserve the student number or student role.');
  }

  console.log('Student registration metadata was stored correctly.');
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`Temporary verification user cleanup failed: ${error.message}`);
  }
}

```

## Backend/scripts/verify-system-analytics.mjs
**javascript · 41 lines · Operational verification or test-environment script; several scripts require live test credentials and can mutate disposable test data.**

```javascript
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !publicKey) throw new Error('Supabase URL or frontend public key is missing.');

async function clientFor(role) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { error } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });
  if (error) throw error;
  return client;
}

const admin = await clientFor('super_admin');
const staff = await clientFor('staff');

try {
  const { data, error } = await admin.rpc('get_system_analytics', { p_window_days: 30 });
  if (error) throw error;
  const requiredGroups = ['users', 'advising', 'documents', 'announcements', 'roomChanges', 'aiHelpdesk', 'notifications', 'academics', 'knowledge'];
  for (const group of requiredGroups) {
    if (!data?.[group] || typeof data[group] !== 'object') throw new Error(`Analytics group missing: ${group}`);
  }

  const { error: staffError } = await staff.rpc('get_system_analytics', { p_window_days: 30 });
  if (!staffError) throw new Error('Staff unexpectedly received super-admin system analytics.');

  console.log(JSON.stringify({ ok: true, groups: requiredGroups.length, staffDenied: true }));
} finally {
  await Promise.all([admin.auth.signOut(), staff.auth.signOut()]);
}

```

## Backend/src/app.ts
**typescript · 52 lines · Express backend module: app.**

```typescript
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { aiRouter } from './routes/ai.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { queueRouter } from './routes/queue.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['authorization', 'content-type'],
}));
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setTimeout(config.REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'The request timed out.' });
    }
  });
  next();
});
app.use(pinoHttp({
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
  customProps: req => ({ requestId: req.id }),
}));
app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/api/health', healthRouter);
app.use('/api/ai', aiRouter);
app.use('/api/queue', queueRouter);
app.use('/api/notifications', notificationsRouter);
app.use(notFound);
app.use(errorHandler);

```

## Backend/src/config.ts
**typescript · 30 lines · Express backend module: config.**

```typescript
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SUPABASE_URL: z.url().startsWith('https://'),
  SUPABASE_SECRET_KEY: [redacted]
  ALLOWED_ORIGINS: z.string().min(1),
  OPENAI_API_KEY: [redacted]
  EXPO_ACCESS_TOKEN: [redacted]
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
});

const parsed = schema.safeParse({
  ...process.env,
  SUPABASE_SECRET_KEY:
    [redacted]
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
});
if (!parsed.success) {
  const names = parsed.error.issues.map(issue => issue.path.join('.')).filter(Boolean);
  throw new Error(`Invalid server configuration: ${[...new Set(names)].join(', ')}`);
}

export const config = {
  ...parsed.data,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean),
};

```

## Backend/src/index.ts
**typescript · 18 lines · Express backend module: index.**

```typescript
import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.PORT, '0.0.0.0', error => {
  if (error) throw error;
  console.log(`CAS Assist API listening on port ${config.PORT}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}; stopping CAS Assist API.`);
  server.close(closeError => {
    process.exit(closeError ? 1 : 0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

```

## Backend/src/middleware/auth.ts
**typescript · 63 lines · Express middleware for auth.**

```typescript
import type { NextFunction, Request, Response } from 'express';

import { adminSupabase } from '../supabase.js';
import type { AccountState, AppRole, AuthenticatedRequest } from '../types.js';

const roles = new Set<AppRole>(['student', 'faculty', 'staff', 'super_admin']);
const states = new Set<AccountState>(['active', 'archived_read_only']);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication is required.' });
    return;
  }

  const { data: authData, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !authData.user?.email) {
    res.status(401).json({ error: 'The session is invalid or expired.' });
    return;
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('users_account_registry')
    .select('id, email, role, state')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || !roles.has(profile.role) || !states.has(profile.state)) {
    res.status(403).json({ error: 'A valid CAS Assist profile is required.' });
    return;
  }

  (req as AuthenticatedRequest).authUser = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    state: profile.state,
  };
  next();
}

export function allowRoles(...allowed: AppRole[]) {
  const allowedSet = new Set(allowed);
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).authUser;
    if (!allowedSet.has(user.role)) {
      res.status(403).json({ error: 'Your role cannot perform this action.' });
      return;
    }
    next();
  };
}

export function requireActive(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).authUser;
  if (user.state !== 'active') {
    res.status(403).json({ error: 'This account is read-only.' });
    return;
  }
  next();
}

```

## Backend/src/middleware/errors.ts
**typescript · 20 lines · Express middleware for errors.**

```typescript
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'The request is invalid.',
      fields: error.issues.map(issue => issue.path.join('.')).filter(Boolean),
    });
    return;
  }

  req.log?.error({ err: error instanceof Error ? error : undefined }, 'request failed');
  res.status(500).json({ error: 'The service could not complete the request.' });
};

```

## Backend/src/routes/ai.ts
**typescript · 109 lines · Express route module for ai operations.**

```typescript
import { Router } from 'express';
import { z } from 'zod';

import { requireActive, requireAuth } from '../middleware/auth.js';
import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../services/knowledge-retrieval.js';
import { adminSupabase } from '../supabase.js';
import type { AuthenticatedRequest } from '../types.js';

export const aiRouter = Router();
aiRouter.use(requireAuth, requireActive);

const querySchema = z.object({
  query: z.string().trim().min(3).max(2000),
  category: z.string().trim().min(1).max(80).optional(),
});

aiRouter.post('/query', async (req, res) => {
  const input = querySchema.parse(req.body);
  const user = (req as AuthenticatedRequest).authUser;

  // Only role-scoped, administrator-managed Tier-1 articles are eligible.
  // Verified document chunks stay excluded until they carry equivalent audience metadata.
  const { data: articles, error } = await adminSupabase
    .from('tier1_knowledge_articles')
    .select('id, title, category, answer, keywords, audience_roles')
    .eq('state', 'active')
    .contains('audience_roles', [user.role]);
  if (error) throw error;

  const candidates: KnowledgeCandidate[] = (articles ?? []).map(article => ({
    id: article.id,
    title: article.title,
    category: article.category,
    content: article.answer,
    keywords: article.keywords ?? [],
    sourceType: 'tier1',
    audienceRoles: article.audience_roles,
  }));
  const best = rankKnowledge(input.query, candidates, user.role);
  const fallbackCategory = best?.category ?? 'general_inquiry';
  const matched = isConfidentMatch(best) ? best : null;
  const answer = matched
    ? matched.content.trim()
    : 'I could not find a sufficiently confident answer in the approved CAS knowledge base. Please rephrase the question with more detail or confirm it with the responsible CAS or university office. I will not guess about official requirements, fees, deadlines, grades, or approval decisions.';

  const { data: log, error: logError } = await adminSupabase
    .from('ai_query_logs')
    .insert({
      student_id: user.id,
      query_text: input.query,
      category: matched?.category ?? input.category ?? fallbackCategory,
      answer_text: answer,
      source_ids: [],
      confidence: best?.confidence ?? 0,
      outcome: matched ? 'deflected' : 'low_confidence',
    })
    .select('id')
    .single();
  if (logError) throw logError;

  res.json({
    queryId: log.id,
    isDeflected: Boolean(matched),
    answer,
    confidence: best?.confidence ?? 0,
    category: matched?.category ?? input.category ?? fallbackCategory,
    source: matched ? {
      title: matched.title,
      type: 'tier1',
    } : null,
  });
});

aiRouter.post('/feedback', async (req, res) => {
  const user = (req as AuthenticatedRequest).authUser;
  const input = z.object({
    queryId: z.uuid(),
    resolved: z.boolean(),
  }).parse(req.body);
  const { error } = await adminSupabase
    .from('ai_query_logs')
    .update({ resolved_inquiry: input.resolved, outcome: input.resolved ? 'deflected' : 'unresolved' })
    .eq('id', input.queryId)
    .eq('student_id', user.id);
  if (error) throw error;
  res.status(204).send();
});

aiRouter.post('/escalate', async (req, res) => {
  const user = (req as AuthenticatedRequest).authUser;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only students can escalate an inquiry to an advising request.' });
    return;
  }
  const input = z.object({
    queryId: z.uuid(),
    category: z.string().trim().min(1).max(80),
    justification: z.string().trim().min(20).max(10000),
  }).parse(req.body);
  const { data, error } = await adminSupabase.rpc('escalate_ai_query_to_ticket', {
    p_student_id: user.id,
    p_query_id: input.queryId,
    p_category: input.category,
    p_justification: input.justification,
  });
  if (error) throw error;
  res.status(201).json(data);
});

```

## Backend/src/routes/health.ts
**typescript · 12 lines · Express route module for health operations.**

```typescript
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cas-assist-api',
    timestamp: new Date().toISOString(),
  });
});

```

## Backend/src/routes/notifications.ts
**typescript · 25 lines · Express route module for notifications operations.**

```typescript
import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { allowRoles, requireActive, requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth, allowRoles('staff', 'super_admin'), requireActive);

notificationsRouter.post('/send', async (req, res) => {
  const input = z.object({
    eventId: z.uuid(),
    eventType: z.enum(['ticket', 'announcement', 'spatial_log']),
  }).parse(req.body);

  if (!config.EXPO_ACCESS_TOKEN) {
    res.status(503).json({ error: 'The trusted notification sender is not configured.' });
    return;
  }

  // Recipient isolation and delivery are performed by the database-backed
  // notification worker introduced with the notification schema phase.
  res.status(202).json({ accepted: true, ...input });
});

```

## Backend/src/routes/queue.ts
**typescript · 38 lines · Express route module for queue operations.**

```typescript
import { Router } from 'express';
import { z } from 'zod';

import { allowRoles, requireAuth } from '../middleware/auth.js';
import { adminSupabase } from '../supabase.js';
import type { AuthenticatedRequest } from '../types.js';

export const queueRouter = Router();
queueRouter.use(requireAuth);

queueRouter.get('/estimate', async (req, res) => {
  const user = (req as AuthenticatedRequest).authUser;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Queue estimates are available to students.' });
    return;
  }

  const { data, error } = await adminSupabase.rpc('get_student_queue_estimate', {
    p_student_id: user.id,
  });
  if (error) throw error;
  res.json(data);
});

queueRouter.get('/analytics', allowRoles('staff', 'super_admin'), async (req, res) => {
  const query = z.object({
    windowHours: z.coerce.number().int().min(1).max(24 * 90).default(168),
    category: z.string().min(1).max(80).optional(),
  }).parse(req.query);

  const { data, error } = await adminSupabase.rpc('get_queue_analytics', {
    p_window_hours: query.windowHours,
    p_category: query.category ?? null,
  });
  if (error) throw error;
  res.json(data);
});

```

## Backend/src/services/knowledge-retrieval.ts
**typescript · 103 lines · Backend service logic for knowledge-retrieval.**

```typescript
import type { AppRole } from '../types.js';

export interface KnowledgeCandidate {
  id: string;
  title: string;
  section?: string | null;
  category: string;
  content: string;
  keywords: string[];
  sourceType: 'tier1' | 'verified_document';
  audienceRoles?: AppRole[];
}

export interface RankedKnowledge extends KnowledgeCandidate {
  confidence: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'please', 'the', 'to', 'what', 'when', 'where', 'which', 'with',
]);

const SYNONYMS: Record<string, string[]> = {
  advisor: ['advising', 'consultation'],
  adviser: ['advising', 'consultation'],
  advising: ['advisor', 'adviser', 'consult', 'consultation'],
  consult: ['advising', 'consultation'],
  consultation: ['consult', 'advising'],
  classroom: ['room', 'location'],
  venue: ['room', 'location'],
  moved: ['change', 'relocation'],
  track: ['status', 'tracking'],
  certificate: ['document', 'request'],
  transcript: ['document', 'records'],
  tor: ['transcript', 'document'],
  login: ['account', 'sign'],
  signin: ['account', 'login'],
  enrolment: ['enrollment'],
  requirements: ['requirement', 'policy'],
  notices: ['announcement', 'updates'],
  news: ['announcement', 'updates'],
  night: ['dark', 'theme'],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return [...new Set(normalize(value).split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token)))];
}

function expandedTokens(value: string): string[] {
  const base = tokens(value);
  return [...new Set(base.flatMap(token => [token, ...(SYNONYMS[token] ?? [])]))];
}

export function rankKnowledge(query: string, candidates: KnowledgeCandidate[], role: AppRole): RankedKnowledge | null {
  const original = tokens(query);
  const expanded = expandedTokens(query);
  if (!original.length) return null;

  let best: RankedKnowledge | null = null;
  for (const candidate of candidates) {
    if (candidate.audienceRoles && !candidate.audienceRoles.includes(role)) continue;

    const title = new Set(expandedTokens(candidate.title));
    const keyword = new Set(candidate.keywords.flatMap(expandedTokens));
    const content = new Set(expandedTokens(candidate.content));
    let weightedMatches = 0;
    let originalMatches = 0;

    for (const token of expanded) {
      if (keyword.has(token)) weightedMatches += 3.2;
      else if (title.has(token)) weightedMatches += 2.5;
      else if (content.has(token)) weightedMatches += 1;
    }
    for (const token of original) {
      if (keyword.has(token) || title.has(token) || content.has(token)) originalMatches += 1;
    }

    const coverage = originalMatches / original.length;
    const relevance = weightedMatches / Math.max(expanded.length * 3.2, 1);
    const normalizedQuery = normalize(query);
    const phraseBonus = normalize(candidate.title).includes(normalizedQuery) || candidate.keywords.some(item => normalizedQuery.includes(normalize(item))) ? 0.12 : 0;
    const verifiedBonus = candidate.sourceType === 'verified_document' ? 0.06 : 0;
    const confidence = Math.min(0.98, coverage * 0.62 + relevance * 0.26 + phraseBonus + verifiedBonus);

    if (!best || confidence > best.confidence) best = { ...candidate, confidence };
  }

  return best;
}

export function isConfidentMatch(result: RankedKnowledge | null): result is RankedKnowledge {
  return Boolean(result && result.confidence >= 0.42);
}

```

## Backend/src/services/queue-math.ts
**typescript · 38 lines · Backend service logic for queue-math.**

```typescript
export interface TriangularSummary {
  minimumMinutes: number;
  maximumMinutes: number;
  mostLikelyMinutes: number;
  expectedMinutes: number;
}

export function littleLawWaitMinutes(activeLoad: number, arrivalsPerHour: number): number | null {
  if (!Number.isFinite(activeLoad) || !Number.isFinite(arrivalsPerHour)) return null;
  if (activeLoad < 0 || arrivalsPerHour <= 0) return null;
  return (activeLoad / arrivalsPerHour) * 60;
}

export function triangularSummary(durationsMinutes: number[]): TriangularSummary | null {
  const values = durationsMinutes.filter(value => Number.isFinite(value) && value >= 0);
  if (values.length < 3) return null;

  const roundedCounts = new Map<number, number>();
  for (const value of values) {
    const rounded = Math.round(value);
    roundedCounts.set(rounded, (roundedCounts.get(rounded) ?? 0) + 1);
  }

  const mostLikelyMinutes = [...roundedCounts.entries()]
    .sort(([firstValue, firstCount], [secondValue, secondCount]) =>
      secondCount - firstCount || firstValue - secondValue)[0]?.[0];
  if (mostLikelyMinutes === undefined) return null;

  const minimumMinutes = Math.min(...values);
  const maximumMinutes = Math.max(...values);
  return {
    minimumMinutes,
    maximumMinutes,
    mostLikelyMinutes,
    expectedMinutes: (minimumMinutes + maximumMinutes + mostLikelyMinutes) / 3,
  };
}

```

## Backend/src/supabase.ts
**typescript · 12 lines · Express backend module: supabase.**

```typescript
import { createClient } from '@supabase/supabase-js';

import { config } from './config.js';

export const adminSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

```

## Backend/src/types.ts
**typescript · 16 lines · Express backend module: types.**

```typescript
import type { Request } from 'express';

export type AppRole = 'student' | 'faculty' | 'staff' | 'super_admin';
export type AccountState = 'active' | 'archived_read_only';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
  state: AccountState;
}

export interface AuthenticatedRequest extends Request {
  authUser: AuthenticatedUser;
}

```

## Backend/supabase/config.toml
**toml · 415 lines · Backend dependency, deployment, documentation, or local configuration.**

```toml
# For detailed configuration reference documentation, visit:
# https://supabase.com/docs/guides/local-development/cli/config
# A string used to distinguish different Supabase projects on the same host. Defaults to the
# working directory name when running `supabase init`.
project_id = "CAS-Assist"

[api]
enabled = true
# Port to use for the API URL.
port = 54321
# Schemas to expose in your API. Tables, views and stored procedures in this schema will get API
# endpoints. `public` and `graphql_public` schemas are included by default.
schemas = ["public", "graphql_public"]
# Extra schemas to add to the search_path of every request.
extra_search_path = ["public", "extensions"]
# The maximum number of rows returns from a view, table, or stored procedure. Limits payload size
# for accidental or malicious requests.
max_rows = 1000
# Controls whether new tables, views, sequences and functions created in the `public` schema by
# `postgres` are reachable through the Data API roles (`anon`, `authenticated`, `service_role`)
# without explicit GRANTs. When unset, new entities are NOT auto-exposed, matching the new cloud
# default. Set to `true` to keep the legacy behaviour of auto-exposing new entities; this is
# deprecated and the field is removed on 2026-10-30 once the always-revoked behaviour is permanent.
# auto_expose_new_tables = true

[api.tls]
# Enable HTTPS endpoints locally using a self-signed certificate.
enabled = false
# Paths to self-signed certificate pair.
# cert_path = "../certs/my-cert.pem"
# key_path = "../certs/my-key.pem"

[db]
# Port to use for the local database URL.
port = 54322
# Port used by db diff command to initialize the shadow database.
shadow_port = 54320
# Maximum amount of time to wait for health check when starting the local database.
health_timeout = "2m"
# The database major version to use. This has to be the same as your remote database's. Run `SHOW
# server_version;` on the remote database to check.
major_version = 17

[db.pooler]
enabled = false
# Port to use for the local connection pooler.
port = 54329
# Specifies when a server connection can be reused by other clients.
# Configure one of the supported pooler modes: `transaction`, `session`.
pool_mode = "transaction"
# How many server connections to allow per user/database pair.
default_pool_size = 20
# Maximum number of client connections allowed.
max_client_conn = 100

# [db.vault]
# secret_key = "env(SECRET_VALUE)"

[db.migrations]
# If disabled, migrations will be skipped during a db push or reset.
enabled = true
# Specifies an ordered list of schema files, directories, or glob patterns that describe your database.
# Supports paths relative to supabase directory: "./schemas/*.sql", "./database".
schema_paths = []

[db.seed]
# If enabled, seeds the database after migrations during a db reset.
enabled = true
# Specifies an ordered list of seed files to load during db reset.
# Supports glob patterns relative to supabase directory: "./seeds/*.sql"
sql_paths = ["./seed.sql"]

[db.network_restrictions]
# Enable management of network restrictions.
enabled = false
# List of IPv4 CIDR blocks allowed to connect to the database.
# Defaults to allow all IPv4 connections. Set empty array to block all IPs.
allowed_cidrs = ["0.0.0.0/0"]
# List of IPv6 CIDR blocks allowed to connect to the database.
# Defaults to allow all IPv6 connections. Set empty array to block all IPs.
allowed_cidrs_v6 = ["::/0"]

# Uncomment to reject non-secure connections to the database.
# [db.ssl_enforcement]
# enabled = true

[realtime]
enabled = true
# Bind realtime via either IPv4 or IPv6. (default: IPv4)
# ip_version = "IPv6"
# The maximum length in bytes of HTTP request headers. (default: 4096)
# max_header_length = 4096

[studio]
enabled = true
# Port to use for Supabase Studio.
port = 54323
# External URL of the API server that frontend connects to.
api_url = "http://127.0.0.1"
# OpenAI API Key to use for Supabase AI in the Supabase Studio.
openai_api_key = [redacted]

# Email testing server. Emails sent with the local dev setup are not actually sent - rather, they
# are monitored, and you can view the emails that would have been sent from the web interface.
[local_smtp]
enabled = true
# Port to use for the email testing server web interface.
port = 54324
# Uncomment to expose additional ports for testing user applications that send emails.
# smtp_port = 54325
# pop3_port = 54326
# admin_email = "admin@email.com"
# sender_name = "Admin"

[storage]
enabled = true
# The maximum file size allowed (e.g. "5MB", "500KB").
file_size_limit = "50MiB"

# Uncomment to configure local storage buckets
# [storage.buckets.images]
# public = false
# file_size_limit = "50MiB"
# allowed_mime_types = ["image/png", "image/jpeg"]
# objects_path = "./images"

# Allow connections via S3 compatible clients
[storage.s3_protocol]
enabled = true

# Image transformation API is available to Supabase Pro plan.
# [storage.image_transformation]
# enabled = true

# Store analytical data in S3 for running ETL jobs over Iceberg Catalog
# This feature is only available on the hosted platform.
[storage.analytics]
enabled = false
max_namespaces = 5
max_tables = 10
max_catalogs = 2

# Analytics Buckets is available to Supabase Pro plan.
# [storage.analytics.buckets.my-warehouse]

# Store vector embeddings in S3 for large and durable datasets
[storage.vector]
enabled = true
max_buckets = 10
max_indexes = 5

# Vector Buckets is available to Supabase Pro plan.
# [storage.vector.buckets.documents-openai]

[auth]
enabled = true
# The base URL of your website. Used as an allow-list for redirects and for constructing URLs used
# in emails.
site_url = "http://127.0.0.1:3000"
# The public URL that Auth serves on. Defaults to the API external URL with `/auth/v1` appended.
# external_url = ""
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = ["https://127.0.0.1:3000"]
# How long tokens are valid for, in seconds. Defaults to 3600 (1 hour), maximum 604,800 (1 week).
jwt_expiry = 3600
# JWT issuer URL. If not set, defaults to auth.external_url.
# jwt_issuer = ""
# Path to JWT signing key. DO NOT commit your signing keys file to git.
# signing_keys_path = "./signing_keys.json"
# If disabled, the refresh token will never expire.
enable_refresh_token_rotation = true
# Allows refresh tokens to be reused after expiry, up to the specified interval in seconds.
# Requires enable_refresh_token_rotation = true.
refresh_token_reuse_interval = 10
# Allow/disallow new user signups to your project.
enable_signup = true
# Allow/disallow anonymous sign-ins to your project.
enable_anonymous_sign_ins = false
# Allow/disallow testing manual linking of accounts
enable_manual_linking = false
# Passwords shorter than this value will be rejected as weak. Minimum 6, recommended 8 or more.
minimum_password_length = 6
# Passwords that do not meet the following requirements will be rejected as weak. Supported values
# are: `letters_digits`, `lower_upper_letters_digits`, `lower_upper_letters_digits_symbols`
password_requirements = ""

# Configure passkey sign-ins.
# [auth.passkey]
# enabled = false

# Configure WebAuthn relying party settings (required when passkey is enabled).
# [auth.webauthn]
# rp_display_name = "Supabase"
# rp_id = "localhost"
# rp_origins = ["http://127.0.0.1:3000"]

[auth.rate_limit]
# Number of emails that can be sent per hour. Requires auth.email.smtp to be enabled.
email_sent = 2
# Number of SMS messages that can be sent per hour. Requires auth.sms to be enabled.
sms_sent = 30
# Number of anonymous sign-ins that can be made per hour per IP address. Requires enable_anonymous_sign_ins = true.
anonymous_users = 30
# Number of sessions that can be refreshed in a 5 minute interval per IP address.
token_refresh = 150
# Number of sign up and sign-in requests that can be made in a 5 minute interval per IP address (excludes anonymous users).
sign_in_sign_ups = 30
# Number of OTP / Magic link verifications that can be made in a 5 minute interval per IP address.
token_verifications = 30
# Number of Web3 logins that can be made in a 5 minute interval per IP address.
web3 = 30

# Configure one of the supported captcha providers: `hcaptcha`, `turnstile`.
# [auth.captcha]
# enabled = true
# provider = "hcaptcha"
# secret = ""

[auth.email]
# Allow/disallow new user signups via email to your project.
enable_signup = true
# If enabled, a user will be required to confirm any email change on both the old, and new email
# addresses. If disabled, only the new email is required to confirm.
double_confirm_changes = true
# If enabled, users need to confirm their email address before signing in.
enable_confirmations = false
# If enabled, users will need to reauthenticate or have logged in recently to change their password.
secure_password_change = false
# Controls the minimum amount of time that must pass before sending another signup confirmation or password reset email.
max_frequency = "1s"
# Number of characters used in the email OTP.
otp_length = 6
# Number of seconds before the email OTP expires (defaults to 1 hour).
otp_expiry = 3600

# Use a production-ready SMTP server
# [auth.email.smtp]
# enabled = true
# host = "smtp.sendgrid.net"
# port = 587
# user = "apikey"
# pass = "env(SENDGRID_API_KEY)"
# admin_email = "admin@email.com"
# sender_name = "Admin"

# Uncomment to customize email template
# [auth.email.template.invite]
# subject = "You have been invited"
# content_path = "./supabase/templates/invite.html"

# Uncomment to customize notification email template
# [auth.email.notification.password_changed]
# enabled = true
# subject = "Your password has been changed"
# content_path = "./templates/password_changed_notification.html"

[auth.sms]
# Allow/disallow new user signups via SMS to your project.
enable_signup = false
# If enabled, users need to confirm their phone number before signing in.
enable_confirmations = false
# Template for sending OTP to users
template = "Your code is {{ `{{ .Code }}` }}"
# Controls the minimum amount of time that must pass before sending another sms otp.
max_frequency = "5s"

# Use pre-defined map of phone number to OTP for testing.
# [auth.sms.test_otp]
# 4152127777 = "123456"

# Configure logged in session timeouts.
# [auth.sessions]
# Force log out after the specified duration.
# timebox = "24h"
# Force log out if the user has been inactive longer than the specified duration.
# inactivity_timeout = "8h"

# This hook runs before a new user is created and allows developers to reject the request based on the incoming user object.
# [auth.hook.before_user_created]
# enabled = true
# uri = "pg-functions://postgres/auth/before-user-created-hook"

# This hook runs before a token is issued and allows you to add additional claims based on the authentication method used.
# [auth.hook.custom_access_token]
# enabled = true
# uri = "pg-functions://<database>/<schema>/<hook_name>"

# Configure one of the supported SMS providers: `twilio`, `twilio_verify`, `messagebird`, `textlocal`, `vonage`.
[auth.sms.twilio]
enabled = false
account_sid = ""
message_service_sid = ""
# DO NOT commit your Twilio auth token to git. Use environment variable substitution instead:
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"

# Multi-factor-authentication is available to Supabase Pro plan.
[auth.mfa]
# Control how many MFA factors can be enrolled at once per user.
max_enrolled_factors = 10

# Control MFA via App Authenticator (TOTP)
[auth.mfa.totp]
enroll_enabled = false
verify_enabled = false

# Configure MFA via Phone Messaging
[auth.mfa.phone]
enroll_enabled = false
verify_enabled = false
otp_length = 6
template = "Your code is {{ `{{ .Code }}` }}"
max_frequency = "5s"

# Configure MFA via WebAuthn
# [auth.mfa.web_authn]
# enroll_enabled = true
# verify_enabled = true

# Use an external OAuth provider. The full list of providers are: `apple`, `azure`, `bitbucket`,
# `discord`, `facebook`, `github`, `gitlab`, `google`, `keycloak`, `linkedin_oidc`, `notion`, `twitch`,
# `twitter`, `x`, `slack`, `spotify`, `workos`, `zoom`.
[auth.external.apple]
enabled = false
client_id = ""
# DO NOT commit your OAuth provider secret to git. Use environment variable substitution instead:
secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"
# Overrides the default auth callback URL derived from auth.external_url.
redirect_uri = ""
# Overrides the default auth provider URL. Used to support self-hosted gitlab, single-tenant Azure,
# or any other third-party OIDC providers.
url = ""
# If enabled, the nonce check will be skipped. Required for local sign in with Google auth.
skip_nonce_check = false
# If enabled, it will allow the user to successfully authenticate when the provider does not return an email address.
email_optional = false

# Allow Solana wallet holders to sign in to your project via the Sign in with Solana (SIWS, EIP-4361) standard.
# You can configure "web3" rate limit in the [auth.rate_limit] section and set up [auth.captcha] if self-hosting.
[auth.web3.solana]
enabled = false

# Use Firebase Auth as a third-party provider alongside Supabase Auth.
[auth.third_party.firebase]
enabled = false
# project_id = "my-firebase-project"

# Use Auth0 as a third-party provider alongside Supabase Auth.
[auth.third_party.auth0]
enabled = false
# tenant = "my-auth0-tenant"
# tenant_region = "us"

# Use AWS Cognito (Amplify) as a third-party provider alongside Supabase Auth.
[auth.third_party.aws_cognito]
enabled = false
# user_pool_id = "my-user-pool-id"
# user_pool_region = "us-east-1"

# Use Clerk as a third-party provider alongside Supabase Auth.
[auth.third_party.clerk]
enabled = false
# Obtain from https://clerk.com/setup/supabase
# domain = "example.clerk.accounts.dev"

# OAuth server configuration
[auth.oauth_server]
# Enable OAuth server functionality
enabled = false
# Path for OAuth consent flow UI
authorization_url_path = "/oauth/consent"
# Allow dynamic client registration
allow_dynamic_registration = false

[edge_runtime]
enabled = true
# Supported request policies: `oneshot`, `per_worker`.
# `per_worker` (default) — enables hot reload during local development.
# `oneshot` — fallback mode if hot reload causes issues (e.g. in large repos or with symlinks).
policy = "per_worker"
# Port to attach the Chrome inspector for debugging edge functions.
inspector_port = 8083
# The Deno major version to use.
deno_version = 2

# [edge_runtime.secrets]
# secret_key = "env(SECRET_VALUE)"

[analytics]
enabled = true
port = 54327
# Configure one of the supported backends: `postgres`, `bigquery`.
backend = "postgres"

# Experimental features may be deprecated any time
[experimental]
# Configures Postgres storage engine to use OrioleDB (S3)
orioledb_version = ""
# Configures S3 bucket URL, eg. <bucket_name>.s3-<region>.amazonaws.com
s3_host = "env(S3_HOST)"
# Configures S3 bucket region, eg. us-east-1
s3_region = "env(S3_REGION)"
# Configures AWS_ACCESS_KEY_ID for S3 bucket
s3_access_key = "env(S3_ACCESS_KEY)"
# Configures AWS_SECRET_ACCESS_KEY for S3 bucket
s3_secret_key = "env(S3_SECRET_KEY)"

# pg-delta is the schema diff engine for db diff / db pull / db remote commit.
# Set enabled = false to fall back to the legacy migra engine.
[experimental.pgdelta]
enabled = true
# Directory under `supabase/` where declarative files are written.
# declarative_schema_path = "./database"
# JSON string passed through to pg-delta SQL formatting.
# format_options = "{\"keywordCase\":\"upper\",\"indent\":2,\"maxWidth\":80,\"commaStyle\":\"trailing\"}"

```

## Backend/supabase/migrations/202607280001_research_compliance.sql
**sql · 881 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- CAS Assist research-compliance migration.
-- Additive/idempotent where possible. Review docs/database-migration-plan.md
-- and create a verified backup before applying to any remote project.

create extension if not exists vector with schema extensions;

do $$ begin
  create type public.app_role as enum ('student', 'faculty', 'staff', 'super_admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_lifecycle as enum ('active', 'archived_read_only');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.advising_status as enum ('submitted', 'under_evaluation', 'action_required', 'resolved');
exception when duplicate_object then null;
end $$;

create table if not exists public.users_account_registry (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role public.app_role not null default 'student',
  state public.account_lifecycle not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users_account_registry
  add column if not exists verification_status public.verification_status not null default 'pending',
  add column if not exists program_code text,
  add column if not exists year_level smallint,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cas_programs (
  code text primary key,
  name text not null,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_program_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id) on delete cascade,
  program_code text not null references public.cas_programs(code),
  year_level smallint not null check (year_level between 1 and 8),
  block_code text,
  is_current boolean not null default true,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (student_id, program_code, started_at)
);

create table if not exists public.faculty_assignments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.users_account_registry(id) on delete cascade,
  subject_code text not null,
  subject_title text not null,
  section_code text not null,
  block_code text,
  room text,
  day_pattern text,
  starts_at time,
  ends_at time,
  term_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty_id, subject_code, section_code, term_code)
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id) on delete cascade,
  assignment_id uuid not null references public.faculty_assignments(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  state text not null default 'active' check (state in ('active', 'dropped', 'completed')),
  unique (student_id, assignment_id)
);

create table if not exists public.advising_ticket_pipeline (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id),
  category text not null,
  description text not null,
  status text not null default 'submitted',
  priority text not null default 'normal',
  state text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.advising_ticket_pipeline
  add column if not exists public_note text,
  add column if not exists assigned_office text,
  add column if not exists assigned_to uuid references public.users_account_registry(id),
  add column if not exists flagged boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz;

-- Prototype deployments used a ticket_status enum containing the legacy
-- values below. Convert it to text before introducing the canonical workflow
-- so PostgreSQL can accept the replacement values.
alter table public.advising_ticket_pipeline
  alter column status drop default;
alter table public.advising_ticket_pipeline
  alter column status type text using status::text;
alter table public.advising_ticket_pipeline
  alter column status set default 'submitted';

update public.advising_ticket_pipeline
set status = case status
  when 'open' then 'submitted'
  when 'in_progress' then 'under_evaluation'
  when 'pending_review' then 'action_required'
  when 'closed' then 'resolved'
  else status
end
where status in ('open', 'in_progress', 'pending_review', 'closed');

do $$ begin
  if exists (
    select 1 from public.advising_ticket_pipeline
    where status not in ('submitted', 'under_evaluation', 'action_required', 'resolved')
  ) then
    raise exception 'Unknown advising status exists; migration stopped before constraint replacement';
  end if;
end $$;

alter table public.advising_ticket_pipeline
  drop constraint if exists advising_ticket_pipeline_status_check;
alter table public.advising_ticket_pipeline
  add constraint advising_ticket_pipeline_status_check
  check (status in ('submitted', 'under_evaluation', 'action_required', 'resolved'));

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  uploaded_by uuid not null references public.users_account_registry(id),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  visibility text not null default 'student_and_staff'
    check (visibility in ('student_and_staff', 'staff_only')),
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  author_id uuid not null references public.users_account_registry(id),
  note text not null check (char_length(note) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_routing_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  from_office text,
  to_office text,
  from_assignee uuid references public.users_account_registry(id),
  to_assignee uuid references public.users_account_registry(id),
  changed_by uuid not null references public.users_account_registry(id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_audit_logs (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  actor_id uuid references public.users_account_registry(id),
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.spatial_logs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.users_account_registry(id),
  assignment_id uuid references public.faculty_assignments(id),
  subject_code text,
  section_code text,
  original_room text not null,
  new_room text not null,
  reason text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spatial_logs
  add column if not exists faculty_id uuid references public.users_account_registry(id),
  add column if not exists assignment_id uuid references public.faculty_assignments(id),
  add column if not exists subject_code text,
  add column if not exists section_code text,
  add column if not exists original_room text,
  add column if not exists new_room text,
  add column if not exists reason text,
  add column if not exists effective_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Preserve prototype values when upgrading an existing database.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'spatial_logs' and column_name = 'logged_by') then
    execute 'update public.spatial_logs set faculty_id = logged_by where faculty_id is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'spatial_logs' and column_name = 'relocated_room') then
    execute 'update public.spatial_logs set new_room = relocated_room where new_room is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'spatial_logs' and column_name = 'section') then
    execute 'update public.spatial_logs set section_code = section where section_code is null';
  end if;
end $$;

create table if not exists public.spatial_log_acknowledgments (
  spatial_log_id uuid not null references public.spatial_logs(id) on delete cascade,
  student_id uuid not null references public.users_account_registry(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (spatial_log_id, student_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references public.users_account_registry(id),
  state text not null default 'draft',
  priority text not null default 'normal',
  pinned boolean not null default false,
  audience_roles public.app_role[] not null default array['student'::public.app_role],
  audience_block_codes text[],
  publish_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements
  add column if not exists created_by uuid references public.users_account_registry(id),
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists state text not null default 'draft',
  add column if not exists priority text not null default 'normal',
  add column if not exists pinned boolean not null default false,
  add column if not exists audience_roles public.app_role[] not null default array['student'::public.app_role],
  add column if not exists audience_block_codes text[],
  add column if not exists publish_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'announcements' and column_name = 'posted_by') then
    execute 'update public.announcements set created_by = posted_by where created_by is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'announcements' and column_name = 'is_pinned') then
    execute 'update public.announcements set pinned = is_pinned where is_pinned is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'announcements' and column_name = 'published_at') then
    execute 'update public.announcements set publish_at = published_at where publish_at is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'announcements' and column_name = 'audience') then
    execute $sql$
      update public.announcements
      set audience_roles = case audience::text
        when 'all' then array['student','faculty','staff','super_admin']::public.app_role[]
        when 'faculty' then array['faculty']::public.app_role[]
        when 'staff' then array['staff']::public.app_role[]
        when 'super_admin' then array['super_admin']::public.app_role[]
        else array['student']::public.app_role[]
      end
    $sql$;
  end if;
end $$;

alter table public.announcements
  alter column state drop default;
alter table public.announcements
  alter column state type text using state::text;
update public.announcements
set state = case state
  when 'active' then 'published'
  when 'inactive' then 'archived'
  else state
end;
alter table public.announcements
  alter column state set default 'draft';

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type like 'image/%'),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now()
);

create table if not exists public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('deadline', 'event', 'holiday', 'add_drop', 'schedule')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience_roles public.app_role[] not null,
  audience_block_codes text[],
  created_by uuid not null references public.users_account_registry(id),
  state text not null default 'published' check (state in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_account_registry(id) on delete cascade,
  expo_push_token text not null unique,
  device_key text not null,
  platform text not null check (platform in ('android', 'ios')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_key)
);

create table if not exists public.notification_delivery_logs (
  id bigint generated always as identity primary key,
  event_type text not null,
  event_id uuid not null,
  user_id uuid references public.users_account_registry(id),
  token_id uuid references public.device_push_tokens(id),
  status text not null,
  provider_ticket_id text,
  safe_error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.handbook_source_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('handbook', 'procedure', 'memo')),
  storage_path text not null unique,
  sha256 text not null unique,
  version text not null,
  verification_status public.verification_status not null default 'pending',
  state text not null default 'active' check (state in ('active', 'archived')),
  uploaded_by uuid not null references public.users_account_registry(id),
  verified_by uuid references public.users_account_registry(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.handbook_knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.handbook_source_documents(id) on delete cascade,
  source_document text,
  chunk_index integer not null,
  section_title text,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  state text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.handbook_knowledge_embeddings
  add column if not exists source_document_id uuid references public.handbook_source_documents(id) on delete cascade,
  add column if not exists section_title text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.ai_query_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id),
  query_text text not null,
  category text,
  answer_text text,
  source_ids uuid[],
  confidence double precision,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'deflected', 'unresolved', 'escalated', 'low_confidence')),
  resolved_inquiry boolean,
  escalated_ticket_id uuid references public.advising_ticket_pipeline(id),
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.users_account_registry(id),
  updated_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$ select role::text::public.app_role from public.users_account_registry where id = auth.uid() $$;

create or replace function public.current_profile_state()
returns public.account_lifecycle
language sql stable security definer
set search_path = public
as $$ select state::text::public.account_lifecycle from public.users_account_registry where id = auth.uid() $$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.current_profile_role() in ('staff', 'super_admin'), false) $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.protect_profile_governance()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and (
    new.role is distinct from old.role
    or new.state is distinct from old.state
    or new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
    or new.rejection_reason is distinct from old.rejection_reason
  ) then
    raise exception 'Profile governance fields require an administrator';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_governance on public.users_account_registry;
create trigger protect_profile_governance
before update on public.users_account_registry
for each row execute function public.protect_profile_governance();

create or replace function public.create_registry_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if lower(new.email) not like '%@neu.edu.ph' then
    raise exception 'Institutional email required';
  end if;
  insert into public.users_account_registry
    (id, email, display_name, role, state, verification_status)
  values
    (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
     'student', 'active', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_registry_profile();

create or replace function public.audit_ticket_changes()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.ticket_audit_logs(ticket_id, actor_id, action, old_data, new_data)
  values (
    coalesce(new.id, old.id), auth.uid(), lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists advising_ticket_audit on public.advising_ticket_pipeline;
create trigger advising_ticket_audit
after insert or update or delete on public.advising_ticket_pipeline
for each row execute function public.audit_ticket_changes();

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql
as $$ begin raise exception 'Audit logs are immutable'; end $$;

drop trigger if exists ticket_audit_immutable on public.ticket_audit_logs;
create trigger ticket_audit_immutable
before update or delete on public.ticket_audit_logs
for each row execute function public.prevent_audit_mutation();

create or replace function public.validate_ticket_transition()
returns trigger language plpgsql
as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'submitted' and new.status in ('under_evaluation', 'resolved')) or
    (old.status = 'under_evaluation' and new.status in ('action_required', 'resolved')) or
    (old.status = 'action_required' and new.status in ('under_evaluation', 'resolved'))
  ) then raise exception 'Invalid advising status transition'; end if;
  if new.status = 'resolved' then new.resolved_at = coalesce(new.resolved_at, now()); end if;
  return new;
end $$;

drop trigger if exists advising_ticket_transition on public.advising_ticket_pipeline;
create trigger advising_ticket_transition
before update of status on public.advising_ticket_pipeline
for each row execute function public.validate_ticket_transition();

create or replace function public.acknowledge_room_change(p_spatial_log_id uuid)
returns void language sql security definer
set search_path = public
as $$
  insert into public.spatial_log_acknowledgments(spatial_log_id, student_id)
  select p_spatial_log_id, auth.uid()
  where exists (
    select 1
    from public.spatial_logs sl
    join public.student_enrollments se on se.assignment_id = sl.assignment_id
    where sl.id = p_spatial_log_id and se.student_id = auth.uid() and se.state = 'active'
  )
  on conflict (spatial_log_id, student_id)
  do update set acknowledged_at = now()
$$;

create or replace function public.escalate_ai_query_to_ticket(
  p_student_id uuid,
  p_query_id uuid,
  p_category text,
  p_justification text
)
returns jsonb language plpgsql security definer
set search_path = public
as $$
declare
  ticket_id uuid;
begin
  if not exists (
    select 1 from public.ai_query_logs
    where id = p_query_id and student_id = p_student_id
  ) then
    raise exception 'AI query does not belong to the student';
  end if;

  insert into public.advising_ticket_pipeline
    (student_id, category, description, status, priority, state)
  values
    (p_student_id, p_category, p_justification, 'submitted', 'normal', 'active')
  returning id into ticket_id;

  update public.ai_query_logs
  set outcome = 'escalated', escalated_ticket_id = ticket_id
  where id = p_query_id and student_id = p_student_id;

  return jsonb_build_object('id', ticket_id, 'status', 'submitted');
end $$;

revoke all on function public.escalate_ai_query_to_ticket(uuid, uuid, text, text) from public;
grant execute on function public.escalate_ai_query_to_ticket(uuid, uuid, text, text) to service_role;

create or replace function public.get_student_queue_estimate(p_student_id uuid)
returns jsonb language sql stable security definer
set search_path = public
as $$
  with active as (
    select id, student_id, created_at,
      row_number() over (order by created_at, id) as queue_position
    from public.advising_ticket_pipeline
    where status in ('submitted', 'under_evaluation')
  ), arrivals as (
    select count(*)::numeric / 168.0 as per_hour
    from public.advising_ticket_pipeline
    where created_at >= now() - interval '168 hours'
  ), mine as (
    select * from active where student_id = p_student_id order by created_at limit 1
  )
  select jsonb_build_object(
    'queuePosition', mine.queue_position,
    'studentsAhead', greatest(coalesce(mine.queue_position, 1) - 1, 0),
    'activeLoad', (select count(*) from active),
    'arrivalsPerHour', arrivals.per_hour,
    'estimatedWaitMinutes',
      case when arrivals.per_hour > 0 then round(((select count(*) from active) / arrivals.per_hour) * 60, 1) end,
    'method', case when arrivals.per_hour > 0 then 'little_law' else 'insufficient_history' end,
    'calculatedAt', now()
  )
  from mine right join arrivals on true
$$;

create or replace function public.get_queue_analytics(p_window_hours integer default 168, p_category text default null)
returns jsonb language sql stable security definer
set search_path = public
as $$
  with scoped as (
    select *,
      extract(epoch from (resolved_at - created_at)) / 60.0 as duration_minutes
    from public.advising_ticket_pipeline
    where created_at >= now() - make_interval(hours => greatest(p_window_hours, 1))
      and (p_category is null or category = p_category)
  ), resolved as (
    select duration_minutes from scoped
    where status = 'resolved' and duration_minutes >= 0
  ), mode_value as (
    select round(duration_minutes)::numeric as value
    from resolved group by round(duration_minutes)
    order by count(*) desc, value limit 1
  )
  select jsonb_build_object(
    'windowHours', p_window_hours,
    'activeLoad', count(*) filter (where status <> 'resolved'),
    'arrivalsPerHour', round(count(*)::numeric / greatest(p_window_hours, 1), 3),
    'resolvedCount', (select count(*) from resolved),
    'minimumMinutes', (select min(duration_minutes) from resolved),
    'maximumMinutes', (select max(duration_minutes) from resolved),
    'mostLikelyMinutes', (select value from mode_value),
    'expectedTriangularMinutes', (
      select (min(duration_minutes) + max(duration_minutes) + (select value from mode_value)) / 3
      from resolved having count(*) >= 3
    ),
    'estimateSource', case when (select count(*) from resolved) >= 3 then 'historical' else 'insufficient_history' end,
    'calculatedAt', now()
  )
  from scoped
$$;

-- RLS is enabled on all application tables.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'users_account_registry','cas_programs','student_program_memberships',
    'faculty_assignments','student_enrollments','advising_ticket_pipeline',
    'ticket_attachments','ticket_internal_notes','ticket_routing_history',
    'ticket_audit_logs','spatial_logs','spatial_log_acknowledgments',
    'announcements','announcement_attachments','academic_calendar_events',
    'device_push_tokens','notification_delivery_logs','handbook_source_documents',
    'handbook_knowledge_embeddings','ai_query_logs','system_settings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Policies are intentionally explicit. Re-running replaces only policies
-- owned by this migration.
drop policy if exists profile_self_read on public.users_account_registry;
create policy profile_self_read on public.users_account_registry
for select using (id = auth.uid() or public.is_staff_or_admin());

drop policy if exists profile_self_update on public.users_account_registry;
create policy profile_self_update on public.users_account_registry
for update to authenticated
using (id = auth.uid() and public.current_profile_state() = 'active')
with check (id = auth.uid());

drop policy if exists programs_authenticated_read on public.cas_programs;
create policy programs_authenticated_read on public.cas_programs
for select to authenticated using (is_active or public.current_profile_role() = 'super_admin');

drop policy if exists memberships_owner_or_admin on public.student_program_memberships;
create policy memberships_owner_or_admin on public.student_program_memberships
for select using (student_id = auth.uid() or public.current_profile_role() = 'super_admin');

drop policy if exists assignments_faculty_read on public.faculty_assignments;
create policy assignments_faculty_read on public.faculty_assignments
for select using (faculty_id = auth.uid() or public.current_profile_role() = 'super_admin');

drop policy if exists enrollments_owner_faculty_admin_read on public.student_enrollments;
create policy enrollments_owner_faculty_admin_read on public.student_enrollments
for select using (
  student_id = auth.uid()
  or exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
  or public.current_profile_role() = 'super_admin'
);

drop policy if exists tickets_owner_staff_read on public.advising_ticket_pipeline;
create policy tickets_owner_staff_read on public.advising_ticket_pipeline
for select using (student_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists tickets_active_student_insert on public.advising_ticket_pipeline;
create policy tickets_active_student_insert on public.advising_ticket_pipeline
for insert with check (
  student_id = auth.uid()
  and public.current_profile_role() = 'student'
  and public.current_profile_state() = 'active'
  and status = 'submitted'
);

drop policy if exists tickets_staff_update on public.advising_ticket_pipeline;
create policy tickets_staff_update on public.advising_ticket_pipeline
for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists ticket_attachments_owner_staff on public.ticket_attachments;
create policy ticket_attachments_owner_staff on public.ticket_attachments
for select using (
  public.is_staff_or_admin()
  or exists (select 1 from public.advising_ticket_pipeline t where t.id = ticket_id and t.student_id = auth.uid())
);

drop policy if exists ticket_attachments_owner_insert on public.ticket_attachments;
create policy ticket_attachments_owner_insert on public.ticket_attachments
for insert with check (
  uploaded_by = auth.uid()
  and public.current_profile_state() = 'active'
  and (
    public.is_staff_or_admin()
    or exists (
      select 1 from public.advising_ticket_pipeline t
      where t.id = ticket_id and t.student_id = auth.uid()
    )
  )
);

drop policy if exists ticket_notes_staff_only on public.ticket_internal_notes;
create policy ticket_notes_staff_only on public.ticket_internal_notes
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists ticket_routing_staff_only on public.ticket_routing_history;
create policy ticket_routing_staff_only on public.ticket_routing_history
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists ticket_audit_admin_read on public.ticket_audit_logs;
create policy ticket_audit_admin_read on public.ticket_audit_logs
for select using (public.current_profile_role() = 'super_admin');

drop policy if exists spatial_faculty_insert on public.spatial_logs;
create policy spatial_faculty_insert on public.spatial_logs
for insert with check (
  faculty_id = auth.uid()
  and public.current_profile_role() = 'faculty'
  and public.current_profile_state() = 'active'
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
);

drop policy if exists spatial_faculty_update on public.spatial_logs;
create policy spatial_faculty_update on public.spatial_logs
for update using (
  faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
) with check (
  faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
);

drop policy if exists spatial_cohort_read on public.spatial_logs;
create policy spatial_cohort_read on public.spatial_logs
for select using (
  faculty_id = auth.uid()
  or public.current_profile_role() = 'super_admin'
  or exists (
    select 1 from public.student_enrollments se
    where se.assignment_id = spatial_logs.assignment_id and se.student_id = auth.uid() and se.state = 'active'
  )
);

drop policy if exists spatial_ack_owner_faculty on public.spatial_log_acknowledgments;
create policy spatial_ack_owner_faculty on public.spatial_log_acknowledgments
for select using (
  student_id = auth.uid()
  or exists (
    select 1 from public.spatial_logs sl
    where sl.id = spatial_log_id and sl.faculty_id = auth.uid()
  )
);

drop policy if exists announcements_targeted_read on public.announcements;
create policy announcements_targeted_read on public.announcements
for select using (
  public.is_staff_or_admin()
  or (
    state = 'published'
    and (publish_at is null or publish_at <= now())
    and (expires_at is null or expires_at > now())
    and public.current_profile_role() = any(audience_roles)
  )
);

drop policy if exists announcements_staff_manage on public.announcements;
create policy announcements_staff_manage on public.announcements
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists announcement_attachments_targeted_read on public.announcement_attachments;
create policy announcement_attachments_targeted_read on public.announcement_attachments
for select using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and (
        public.is_staff_or_admin()
        or (
          a.state = 'published'
          and (a.publish_at is null or a.publish_at <= now())
          and (a.expires_at is null or a.expires_at > now())
          and public.current_profile_role() = any(a.audience_roles)
        )
      )
  )
);

drop policy if exists announcement_attachments_staff_manage on public.announcement_attachments;
create policy announcement_attachments_staff_manage on public.announcement_attachments
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists calendar_targeted_read on public.academic_calendar_events;
create policy calendar_targeted_read on public.academic_calendar_events
for select using (
  public.is_staff_or_admin()
  or (state = 'published' and public.current_profile_role() = any(audience_roles))
);

drop policy if exists calendar_staff_manage on public.academic_calendar_events;
create policy calendar_staff_manage on public.academic_calendar_events
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists push_tokens_owner_write on public.device_push_tokens;
create policy push_tokens_owner_write on public.device_push_tokens
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notification_logs_admin_read on public.notification_delivery_logs;
create policy notification_logs_admin_read on public.notification_delivery_logs
for select using (public.current_profile_role() = 'super_admin');

drop policy if exists sources_admin_manage on public.handbook_source_documents;
create policy sources_admin_manage on public.handbook_source_documents
for all using (public.current_profile_role() = 'super_admin')
with check (public.current_profile_role() = 'super_admin');

drop policy if exists knowledge_verified_read on public.handbook_knowledge_embeddings;
create policy knowledge_verified_read on public.handbook_knowledge_embeddings
for select using (
  exists (
    select 1 from public.handbook_source_documents d
    where d.id = source_document_id and d.verification_status = 'verified' and d.state = 'active'
  )
);

drop policy if exists ai_logs_owner_admin_read on public.ai_query_logs;
create policy ai_logs_owner_admin_read on public.ai_query_logs
for select using (student_id = auth.uid() or public.current_profile_role() = 'super_admin');

drop policy if exists ai_logs_active_student_insert on public.ai_query_logs;
create policy ai_logs_active_student_insert on public.ai_query_logs
for insert with check (
  student_id = auth.uid()
  and public.current_profile_role() = 'student'
  and public.current_profile_state() = 'active'
);

drop policy if exists settings_admin_only on public.system_settings;
create policy settings_admin_only on public.system_settings
for all using (public.current_profile_role() = 'super_admin')
with check (public.current_profile_role() = 'super_admin');

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('ticket-attachments', 'ticket-attachments', false, 10485760),
  ('announcement-images', 'announcement-images', false, 5242880),
  ('verified-knowledge-sources', 'verified-knowledge-sources', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- No official program codes or handbook facts are seeded here.

```

## Backend/supabase/migrations/202609110001_document_requests_and_schedules.sql
**sql · 147 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- Tables required by the document-request and faculty-schedule screens.
-- This migration is additive so it can run against projects that already
-- contain earlier versions of either table.

do $$ begin
  create type public.document_request_status as enum (
    'submitted',
    'under_evaluation',
    'action_required',
    'processing',
    'ready_for_pickup',
    'completed',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_type as enum (
    'transcript_of_records',
    'certificate_of_enrollment',
    'certificate_of_good_moral',
    'honorable_dismissal',
    'diploma',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.schedule_day as enum (
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id) on delete restrict,
  handled_by uuid references public.users_account_registry(id) on delete set null,
  document_type public.document_type not null,
  purpose text not null check (char_length(trim(purpose)) between 1 and 300),
  copies smallint not null default 1 check (copies between 1 and 10),
  status public.document_request_status not null default 'submitted',
  remarks text,
  state public.account_lifecycle not null default 'active',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_requests_student_idx
  on public.document_requests (student_id, requested_at desc);
create index if not exists document_requests_status_idx
  on public.document_requests (status, requested_at desc);

drop trigger if exists document_requests_set_updated_at on public.document_requests;
create trigger document_requests_set_updated_at
before update on public.document_requests
for each row execute function public.set_updated_at();

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.users_account_registry(id) on delete restrict,
  subject_code text not null,
  subject_name text not null,
  section text not null,
  room text not null,
  day public.schedule_day not null,
  time_start time not null,
  time_end time not null,
  semester text not null,
  academic_year text not null,
  state public.account_lifecycle not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_time_order check (time_end > time_start)
);

create index if not exists schedules_faculty_day_idx
  on public.schedules (faculty_id, day, time_start);
create index if not exists schedules_section_idx
  on public.schedules (section, day, time_start);

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

alter table public.document_requests enable row level security;
alter table public.schedules enable row level security;

drop policy if exists document_requests_read on public.document_requests;
create policy document_requests_read on public.document_requests
for select to authenticated
using (
  student_id = auth.uid()
  or public.current_profile_role() in ('staff', 'super_admin')
);

drop policy if exists document_requests_student_insert on public.document_requests;
create policy document_requests_student_insert on public.document_requests
for insert to authenticated
with check (
  student_id = auth.uid()
  and public.current_profile_role() = 'student'
  and public.current_profile_state() = 'active'
);

drop policy if exists document_requests_staff_update on public.document_requests;
create policy document_requests_staff_update on public.document_requests
for update to authenticated
using (
  public.current_profile_role() in ('staff', 'super_admin')
  and public.current_profile_state() = 'active'
)
with check (
  public.current_profile_role() in ('staff', 'super_admin')
  and public.current_profile_state() = 'active'
);

drop policy if exists schedules_read on public.schedules;
create policy schedules_read on public.schedules
for select to authenticated
using (
  faculty_id = auth.uid()
  or public.current_profile_role() in ('staff', 'super_admin')
);

drop policy if exists schedules_manage on public.schedules;
create policy schedules_manage on public.schedules
for all to authenticated
using (
  public.current_profile_state() = 'active'
  and (
    faculty_id = auth.uid()
    or public.current_profile_role() in ('staff', 'super_admin')
  )
)
with check (
  public.current_profile_state() = 'active'
  and (
    faculty_id = auth.uid()
    or public.current_profile_role() in ('staff', 'super_admin')
  )
);

```

## Backend/supabase/migrations/202609120001_legacy_contract_bridges.sql
**sql · 59 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- Keep canonical CAS Assist writes compatible with prototype columns that
-- may still carry NOT NULL constraints in an upgraded database.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'announcements' and column_name = 'posted_by'
  ) then
    execute $function$
      create or replace function public.bridge_legacy_announcement_columns()
      returns trigger language plpgsql
      set search_path = public
      as $body$
      begin
        if new.created_by is null then new.created_by := new.posted_by; end if;
        if new.posted_by is null then new.posted_by := new.created_by; end if;
        if new.publish_at is null then new.publish_at := new.published_at; end if;
        if new.published_at is null then new.published_at := new.publish_at; end if;
        new.pinned := coalesce(new.pinned, new.is_pinned, false);
        new.is_pinned := new.pinned;
        return new;
      end
      $body$
    $function$;

    execute 'drop trigger if exists bridge_legacy_announcement_columns on public.announcements';
    execute 'create trigger bridge_legacy_announcement_columns before insert or update on public.announcements for each row execute function public.bridge_legacy_announcement_columns()';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spatial_logs' and column_name = 'logged_by'
  ) then
    execute $function$
      create or replace function public.bridge_legacy_spatial_columns()
      returns trigger language plpgsql
      set search_path = public
      as $body$
      begin
        if new.faculty_id is null then new.faculty_id := new.logged_by; end if;
        if new.logged_by is null then new.logged_by := new.faculty_id; end if;
        if new.new_room is null then new.new_room := new.relocated_room; end if;
        if new.relocated_room is null then new.relocated_room := new.new_room; end if;
        if new.section_code is null then new.section_code := new.section; end if;
        if new.section is null then new.section := new.section_code; end if;
        return new;
      end
      $body$
    $function$;

    execute 'drop trigger if exists bridge_legacy_spatial_columns on public.spatial_logs';
    execute 'create trigger bridge_legacy_spatial_columns before insert or update on public.spatial_logs for each row execute function public.bridge_legacy_spatial_columns()';
  end if;
end $$;

```

## Backend/supabase/migrations/202609120002_ticket_priority_compatibility.sql
**sql · 17 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- Convert the prototype ticket_priority enum to the canonical text workflow.
alter table public.advising_ticket_pipeline
  alter column priority drop default;
alter table public.advising_ticket_pipeline
  alter column priority type text using priority::text;
update public.advising_ticket_pipeline
set priority = 'normal'
where priority = 'medium';
alter table public.advising_ticket_pipeline
  alter column priority set default 'normal';

alter table public.advising_ticket_pipeline
  drop constraint if exists advising_ticket_pipeline_priority_check;
alter table public.advising_ticket_pipeline
  add constraint advising_ticket_pipeline_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

```

## Backend/supabase/migrations/202609130001_student_number_registration.sql
**sql · 48 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- Store the student number supplied during student self-registration.
-- The column remains nullable for pre-existing and non-student accounts.

alter table public.users_account_registry
  add column if not exists student_number text;

do $$ begin
  alter table public.users_account_registry
    add constraint users_account_registry_student_number_format
    check (
      student_number is null
      or (
        student_number ~ '^[0-9-]{5,24}$'
        and length(regexp_replace(student_number, '[^0-9]', '', 'g')) >= 5
      )
    );
exception when duplicate_object then null;
end $$;

create unique index if not exists users_account_registry_student_number_unique
  on public.users_account_registry (student_number)
  where student_number is not null;

create or replace function public.create_registry_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  normalized_student_number text;
begin
  if lower(new.email) not like '%@neu.edu.ph' then
    raise exception 'Institutional email required';
  end if;

  normalized_student_number := nullif(
    regexp_replace(coalesce(new.raw_user_meta_data->>'student_number', ''), '\s', '', 'g'),
    ''
  );

  insert into public.users_account_registry
    (id, email, display_name, student_number, role, state, verification_status)
  values
    (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
     normalized_student_number, 'student', 'active', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

```

## Backend/supabase/migrations/202609130002_system_analytics.sql
**sql · 116 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- One consistent, super-admin-only snapshot for the system analytics page.

create or replace function public.get_system_analytics(p_window_days integer default 30)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  window_days integer := least(greatest(coalesce(p_window_days, 30), 1), 365);
  window_start timestamptz;
begin
  if public.current_profile_role() <> 'super_admin' then
    raise exception 'Super administrator access required' using errcode = '42501';
  end if;

  window_start := now() - make_interval(days => window_days);

  return jsonb_build_object(
    'generatedAt', now(),
    'windowDays', window_days,
    'users', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where state = 'active'),
        'archived', count(*) filter (where state = 'archived_read_only'),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'pendingVerification', count(*) filter (where verification_status = 'pending'),
        'student', count(*) filter (where role = 'student'),
        'faculty', count(*) filter (where role = 'faculty'),
        'staff', count(*) filter (where role = 'staff'),
        'superAdmin', count(*) filter (where role = 'super_admin')
      ) from public.users_account_registry
    ),
    'advising', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'submitted', count(*) filter (where status = 'submitted'),
        'underEvaluation', count(*) filter (where status = 'under_evaluation'),
        'actionRequired', count(*) filter (where status = 'action_required'),
        'resolved', count(*) filter (where status = 'resolved'),
        'resolutionRate', coalesce(round(100.0 * count(*) filter (where status = 'resolved') / nullif(count(*), 0), 1), 0),
        'averageResolutionMinutes', coalesce(round(avg(extract(epoch from (resolved_at - created_at)) / 60.0) filter (where resolved_at is not null), 1), 0)
      ) from public.advising_ticket_pipeline where state = 'active'
    ),
    'documents', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where requested_at >= window_start),
        'pending', count(*) filter (where status in ('submitted', 'under_evaluation', 'action_required', 'processing')),
        'ready', count(*) filter (where status = 'ready_for_pickup'),
        'completed', count(*) filter (where status = 'completed'),
        'rejected', count(*) filter (where status = 'rejected'),
        'completionRate', coalesce(round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*), 0), 1), 0)
      ) from public.document_requests where state = 'active'
    ),
    'announcements', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'published', count(*) filter (where state = 'published'),
        'draft', count(*) filter (where state = 'draft'),
        'archived', count(*) filter (where state = 'archived'),
        'pinned', count(*) filter (where pinned)
      ) from public.announcements
    ),
    'roomChanges', (
      select jsonb_build_object(
        'total', (select count(*) from public.spatial_logs),
        'newInWindow', (select count(*) from public.spatial_logs where created_at >= window_start),
        'activeNow', (select count(*) from public.spatial_logs where effective_at <= now() and (expires_at is null or expires_at > now())),
        'acknowledgements', (select count(*) from public.spatial_log_acknowledgments)
      )
    ),
    'aiHelpdesk', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'resolved', count(*) filter (where resolved_inquiry is true or outcome = 'deflected'),
        'escalated', count(*) filter (where outcome = 'escalated' or escalated_ticket_id is not null),
        'lowConfidence', count(*) filter (where outcome = 'low_confidence'),
        'averageConfidence', coalesce(round((avg(confidence) * 100)::numeric, 1), 0),
        'resolutionRate', coalesce(round(100.0 * count(*) filter (where resolved_inquiry is true or outcome = 'deflected') / nullif(count(*), 0), 1), 0)
      ) from public.ai_query_logs
    ),
    'notifications', (
      select jsonb_build_object(
        'deliveries', (select count(*) from public.notification_delivery_logs),
        'newInWindow', (select count(*) from public.notification_delivery_logs where created_at >= window_start),
        'successful', (select count(*) from public.notification_delivery_logs where lower(status) in ('sent', 'delivered', 'success', 'ok')),
        'failed', (select count(*) from public.notification_delivery_logs where lower(status) in ('failed', 'error', 'rejected')),
        'enabledDevices', (select count(*) from public.device_push_tokens where enabled),
        'successRate', coalesce((select round(100.0 * count(*) filter (where lower(status) in ('sent', 'delivered', 'success', 'ok')) / nullif(count(*), 0), 1) from public.notification_delivery_logs), 0)
      )
    ),
    'academics', (
      select jsonb_build_object(
        'programs', (select count(*) from public.cas_programs where is_active),
        'facultyAssignments', (select count(*) from public.faculty_assignments where is_active),
        'studentEnrollments', (select count(*) from public.student_enrollments where state = 'active'),
        'schedules', (select count(*) from public.schedules where state = 'active'),
        'calendarEvents', (select count(*) from public.academic_calendar_events where state = 'published')
      )
    ),
    'knowledge', (
      select jsonb_build_object(
        'sourceDocuments', (select count(*) from public.handbook_source_documents where state = 'active'),
        'verifiedDocuments', (select count(*) from public.handbook_source_documents where state = 'active' and verification_status = 'verified'),
        'knowledgeChunks', (select count(*) from public.handbook_knowledge_embeddings where state = 'active')
      )
    )
  );
end $$;

revoke all on function public.get_system_analytics(integer) from public;
grant execute on function public.get_system_analytics(integer) to authenticated;

```

## Backend/supabase/migrations/202609130003_tier1_knowledge_base.sql
**sql · 124 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- Closed-domain Tier-1 knowledge managed by CAS Assist administrators.
-- Seeded entries describe application workflows only; institutional rules must
-- continue to come from verified CAS source documents.

create table if not exists public.tier1_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  answer text not null check (char_length(trim(answer)) between 20 and 5000),
  keywords text[] not null default '{}',
  audience_roles public.app_role[] not null default array['student','faculty','staff','super_admin']::public.app_role[],
  state text not null default 'active' check (state in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tier1_knowledge_set_updated_at on public.tier1_knowledge_articles;
create trigger tier1_knowledge_set_updated_at
before update on public.tier1_knowledge_articles
for each row execute function public.set_updated_at();

alter table public.tier1_knowledge_articles enable row level security;

drop policy if exists tier1_knowledge_authenticated_read on public.tier1_knowledge_articles;
create policy tier1_knowledge_authenticated_read on public.tier1_knowledge_articles
for select to authenticated using (
  state = 'active' and public.current_profile_role() = any(audience_roles)
);

drop policy if exists tier1_knowledge_admin_manage on public.tier1_knowledge_articles;
create policy tier1_knowledge_admin_manage on public.tier1_knowledge_articles
for all to authenticated
using (public.current_profile_role() = 'super_admin')
with check (public.current_profile_role() = 'super_admin');

insert into public.tier1_knowledge_articles (slug, title, category, answer, keywords)
values
  (
    'advising-request',
    'Submitting an advising request',
    'advising',
    'Students can submit an advising request from the Requests tab. Open Advising Requests, choose the category that best matches the concern, provide the requested details, and submit it. The request will appear in the CAS staff queue where its status can move from Submitted to Under Evaluation, Action Required, and Resolved. Faculty and staff accounts do not submit student advising requests.',
    array['advising','advisor','request','consultation','concern','ticket','help','queue']
  ),
  (
    'request-status',
    'Checking request status',
    'advising',
    'Students can review the status of their advising and document requests from the Requests tab. Submitted means the request entered the queue; Under Evaluation means it is being reviewed; Action Required means the student should read the staff note and respond as instructed; Resolved means processing is complete.',
    array['status','track','tracking','pending','submitted','evaluation','resolved','queue','request']
  ),
  (
    'document-request',
    'Submitting a document request',
    'documents',
    'Students can open the Requests tab and select Document Request. Choose the document type, state the purpose, select the number of copies, and submit. Progress can be followed in the request list. Any official fee, release time, eligibility requirement, or documentary requirement must be confirmed with the responsible CAS or university office.',
    array['document','documents','certificate','transcript','records','copies','request','tor','diploma']
  ),
  (
    'announcements',
    'Reading CAS announcements',
    'announcements',
    'Open the Updates tab to see announcements addressed to your account role. Select an announcement to expand its complete details. Staff and super administrators can create and publish announcements from Management. Published announcements may be targeted to students, faculty, staff, super administrators, or all account roles.',
    array['announcement','announcements','updates','notice','news','publish','post','details']
  ),
  (
    'room-changes',
    'Room-change updates',
    'room_changes',
    'Faculty can record a room change from the faculty dashboard by selecting an active teaching assignment and entering the new room and reason. Enrolled students can see applicable room changes in Updates and acknowledge that they have read them. Staff and super administrators can monitor overall usage in System Analytics.',
    array['room','classroom','location','change','relocation','moved','venue','faculty']
  ),
  (
    'schedule-view',
    'Viewing faculty schedules',
    'schedules',
    'Faculty accounts can view their active class schedules and assignments on the faculty dashboard. Schedule information shown by CAS Assist comes from the configured academic schedule records. Contact the responsible office if an official schedule differs from what is displayed.',
    array['schedule','class','subject','section','time','faculty','assignment','room']
  ),
  (
    'account-registration',
    'Account registration and access',
    'accounts',
    'Student self-registration requires a New Era University institutional email, full name, student number, and a password of at least eight characters. New accounts begin as student accounts. Role changes and account-governance concerns must be handled by an authorized administrator.',
    array['account','register','registration','email','student number','password','login','sign in','role']
  ),
  (
    'appearance-theme',
    'Changing the application theme',
    'settings',
    'Every account can change the CAS Assist appearance from the Profile page under Appearance. Choose Light, Dark, or System. System follows the device or browser color setting.',
    array['theme','dark','light','appearance','settings','mode','profile','color']
  ),
  (
    'official-policy-boundary',
    'Official requirements and decisions',
    'official_policy',
    'CAS Assist only provides answers supported by its approved knowledge base. It does not invent official requirements, fees, deadlines, grades, eligibility decisions, or approval outcomes. If a verified source is not available for the question, confirm the information with the responsible CAS or university office.',
    array['requirements','requirement','fee','fees','deadline','eligibility','grade','grades','approval','policy','official','enrollment']
  ),
  (
    'ai-helpdesk-scope',
    'CAS Assist AI Helpdesk scope',
    'helpdesk',
    'The AI Helpdesk is a closed-domain informational assistant available to students, faculty, staff, and super administrators. It answers recurring Tier-1 questions using CAS Assist workflow articles and verified CAS knowledge sources only. When confidence is low, it will say that an approved answer was not found and direct the user to the appropriate office instead of guessing.',
    array['ai','chatbot','assistant','helpdesk','scope','source','confidence','tier 1','tier-one']
  ),
  (
    'system-analytics',
    'System analytics for super administrators',
    'analytics',
    'Super administrators can open the Analytics tab to review current system health, account distribution, advising and document performance, feature usage, notification delivery, academic coverage, and AI Helpdesk outcomes. The reporting window can be changed between 7, 30, and 90 days. Other account roles cannot access system-wide analytics.',
    array['analytics','performance','metrics','reports','reporting','usage','health','system','dashboard','super admin']
  )
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  answer = excluded.answer,
  keywords = excluded.keywords,
  audience_roles = excluded.audience_roles,
  state = 'active',
  updated_at = now();

```

## Backend/supabase/migrations/202609130004_tier1_answer_rpc.sql
**sql · 130 lines · Supabase/PostgreSQL schema, RPC, trigger, policy, and data-integrity migration.**

```sql
-- Authenticated database fallback for the Tier-1 assistant. This keeps FAQ
-- answers available when the optional Express gateway cannot be reached.

update public.tier1_knowledge_articles set title = case slug
  when 'advising-request' then 'How do I submit an advising request?'
  when 'request-status' then 'How do I check the status of my request?'
  when 'document-request' then 'How do I submit a document request?'
  when 'announcements' then 'Where can I read or publish announcements?'
  when 'room-changes' then 'How do room-change updates work?'
  when 'schedule-view' then 'Where can faculty view their schedules?'
  when 'account-registration' then 'What is required to create an account?'
  when 'appearance-theme' then 'How do I change the light or dark theme?'
  when 'official-policy-boundary' then 'Can CAS Assist decide official requirements or approvals?'
  when 'ai-helpdesk-scope' then 'What questions can the AI Helpdesk answer?'
  when 'system-analytics' then 'What does System Analytics show?'
  else title
end
where slug in (
  'advising-request','request-status','document-request','announcements','room-changes',
  'schedule-view','account-registration','appearance-theme','official-policy-boundary',
  'ai-helpdesk-scope','system-analytics'
);

create or replace function public.answer_tier1_question(p_query text)
returns jsonb language plpgsql security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  normalized_query text;
  query_terms text[];
  term_count integer;
  best record;
  confidence numeric := 0;
  query_id uuid;
  response_answer text;
  response_category text;
  is_deflected boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if public.current_profile_state() <> 'active' then
    raise exception 'An active account is required' using errcode = '42501';
  end if;

  caller_role := public.current_profile_role();
  normalized_query := trim(lower(regexp_replace(coalesce(p_query, ''), '[^a-zA-Z0-9]+', ' ', 'g')));
  if char_length(normalized_query) < 3 or char_length(normalized_query) > 2000 then
    raise exception 'Question must contain between 3 and 2000 characters';
  end if;

  select coalesce(array_agg(distinct term), '{}'), count(distinct term)
  into query_terms, term_count
  from unnest(regexp_split_to_array(normalized_query, '\s+')) term
  where char_length(term) > 1
    and term not in ('a','an','and','are','can','do','for','from','how','i','in','is','it','me','my','of','on','please','the','to','what','when','where','which','with');

  select article.*, scored.matches, scored.weighted_score
  into best
  from public.tier1_knowledge_articles article
  cross join lateral (
    select
      count(*) filter (
        where lower(article.title) like '%' || term || '%'
           or lower(article.answer) like '%' || term || '%'
           or exists (select 1 from unnest(article.keywords) keyword where lower(keyword) like '%' || term || '%')
      ) as matches,
      coalesce(sum(
        case
          when exists (select 1 from unnest(article.keywords) keyword where lower(keyword) like '%' || term || '%') then 3
          when lower(article.title) like '%' || term || '%' then 2
          when lower(article.answer) like '%' || term || '%' then 1
          else 0
        end
      ), 0) as weighted_score
    from unnest(query_terms) term
  ) scored
  where article.state = 'active'
    and caller_role = any(article.audience_roles)
  order by scored.matches desc, scored.weighted_score desc, article.updated_at desc
  limit 1;

  if best.id is not null and term_count > 0 then
    confidence := least(0.98, (best.matches::numeric / term_count) * 0.72 + (best.weighted_score::numeric / (term_count * 3)) * 0.26);
    is_deflected := best.matches > 0 and confidence >= 0.42;
  end if;

  if is_deflected then
    response_answer := best.answer;
    response_category := best.category;
  else
    response_answer := 'I could not find a sufficiently confident answer in the approved CAS knowledge base. Please rephrase the question with more detail or confirm it with the responsible CAS or university office. I will not guess about official requirements, fees, deadlines, grades, or approval decisions.';
    response_category := coalesce(best.category, 'general_inquiry');
  end if;

  insert into public.ai_query_logs
    (student_id, query_text, category, answer_text, source_ids, confidence, outcome)
  values
    (auth.uid(), p_query, response_category, response_answer, '{}', confidence,
     case when is_deflected then 'deflected' else 'low_confidence' end)
  returning id into query_id;

  return jsonb_build_object(
    'queryId', query_id,
    'isDeflected', is_deflected,
    'answer', response_answer,
    'confidence', confidence,
    'category', response_category,
    'source', case when is_deflected then jsonb_build_object('title', best.title, 'type', 'tier1') else null end
  );
end $$;

create or replace function public.record_tier1_feedback(p_query_id uuid, p_resolved boolean)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update public.ai_query_logs
  set resolved_inquiry = p_resolved,
      outcome = case when p_resolved then 'deflected' else 'unresolved' end
  where id = p_query_id and student_id = auth.uid();
  if not found then raise exception 'AI query not found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.answer_tier1_question(text) from public;
revoke all on function public.record_tier1_feedback(uuid, boolean) from public;
grant execute on function public.answer_tier1_question(text) to authenticated;
grant execute on function public.record_tier1_feedback(uuid, boolean) to authenticated;

```

## Backend/supabase/seed.sql
**sql · 17 lines · Local seed entry point; the migration phase intentionally avoids official institutional data.**

```sql
-- Explicitly non-production demo configuration.
-- This contains no real person, credential, official CAS program, or policy.

insert into public.cas_programs (code, name, department, is_active)
values ('DEMO-PROGRAM', 'DEMO — Replace with an approved CAS program', 'DEMO', false)
on conflict (code) do update
set name = excluded.name, department = excluded.department, is_active = false;

insert into public.system_settings (key, value, description)
values (
  'demo_seed_notice',
  '{"demo": true, "official": false}'::jsonb,
  'DEMO marker only. Do not present seed content as official CAS information.'
)
on conflict (key) do update
set value = excluded.value, description = excluded.description, updated_at = now();

```

## Backend/test/knowledge-retrieval.test.ts
**typescript · 35 lines · Backend automated unit test module.**

```typescript
import { describe, expect, it } from 'vitest';

import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../src/services/knowledge-retrieval.js';

const candidates: KnowledgeCandidate[] = [
  {
    id: 'advising', title: 'Submitting an advising request', category: 'advising',
    content: 'Students submit advising requests from the Requests tab.',
    keywords: ['advising', 'advisor', 'request', 'consultation'], sourceType: 'tier1',
  },
  {
    id: 'room', title: 'Room-change updates', category: 'room_changes',
    content: 'Faculty record a room change and enrolled students acknowledge it.',
    keywords: ['room', 'classroom', 'location', 'relocation'], sourceType: 'tier1',
  },
];

describe('closed-domain knowledge retrieval', () => {
  it('matches natural-language synonyms to the correct article', () => {
    const result = rankKnowledge('Where can I consult my adviser?', candidates, 'student');
    expect(result?.id).toBe('advising');
    expect(isConfidentMatch(result)).toBe(true);
  });

  it('rejects unrelated open-domain questions', () => {
    const result = rankKnowledge('Who won the international football championship?', candidates, 'staff');
    expect(isConfidentMatch(result)).toBe(false);
  });

  it('respects article audience restrictions', () => {
    const restricted = [{ ...candidates[0], audienceRoles: ['student' as const] }];
    expect(rankKnowledge('advising request', restricted, 'faculty')).toBeNull();
  });
});

```

## Backend/test/queue-math.test.ts
**typescript · 30 lines · Backend automated unit test module.**

```typescript
import { describe, expect, it } from 'vitest';

import { littleLawWaitMinutes, triangularSummary } from '../src/services/queue-math.js';

describe('littleLawWaitMinutes', () => {
  it('converts hours to minutes', () => {
    expect(littleLawWaitMinutes(10, 5)).toBe(120);
  });

  it('rejects zero arrivals and invalid load', () => {
    expect(littleLawWaitMinutes(10, 0)).toBeNull();
    expect(littleLawWaitMinutes(-1, 2)).toBeNull();
  });
});

describe('triangularSummary', () => {
  it('derives min, max, mode, and expected duration', () => {
    expect(triangularSummary([10, 20, 20, 40])).toEqual({
      minimumMinutes: 10,
      maximumMinutes: 40,
      mostLikelyMinutes: 20,
      expectedMinutes: 70 / 3,
    });
  });

  it('requires sufficient history', () => {
    expect(triangularSummary([10, 20])).toBeNull();
  });
});

```

## Backend/tsconfig.json
**json · 17 lines · Backend dependency, deployment, documentation, or local configuration.**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}

```

## Backend/vitest.config.ts
**typescript · 8 lines · Backend dependency, deployment, documentation, or local configuration.**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});

```

## Frontend/.env.example
**text · 4 lines · Frontend build, deployment, dependency, or platform configuration.**

```text
EXPO_PUBLIC_SUPABASE_URL=[redacted from reviewer]
EXPO_PUBLIC_SUPABASE_ANON_KEY=[redacted from reviewer]
EXPO_PUBLIC_API_URL=[redacted from reviewer]

```

## Frontend/app.json
**json · 73 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "expo": {
    "name": "CAS-Assist",
    "slug": "CAS-Assist",
    "description": "AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences.",
    "version": "1.0.1",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "casassist",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/expo.icon",
      "bundleIdentifier": "com.daviddino.casassist",
      "supportsTablet": true
    },
    "android": {
      "package": "com.daviddino.casassist",
      "versionCode": 2,
      "softwareKeyboardLayoutMode": "resize",
      "adaptiveIcon": {
        "backgroundColor": "#F3F6F4",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "single",
      "bundler": "metro",
      "favicon": "./assets/images/favicon.png",
      "name": "CAS Assist",
      "shortName": "CAS Assist",
      "description": "AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences.",
      "lang": "en",
      "display": "standalone",
      "startUrl": "/",
      "backgroundColor": "#F3F6F4",
      "barStyle": "black-translucent"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#F3F6F4",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-image",
      "expo-web-browser",
      "expo-font",
      "expo-status-bar",
      "expo-notifications",
      "expo-sqlite"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "2e1e85ce-3ff4-4ad1-81b0-5cd920ae1cd0"
      }
    },
    "owner": "nerkynerk"
  }
}

```

## Frontend/assets/expo.icon/Assets/expo-symbol 2.svg
**text · 4 lines · Frontend build, deployment, dependency, or platform configuration.**

```text
<svg width="652" height="606" viewBox="0 0 652 606" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M353.554 0H298.446C273.006 0 249.684 14.6347 237.962 37.9539L4.37994 502.646C-1.04325 513.435 -1.45067 526.178 3.2716 537.313L22.6123 582.918C34.6475 611.297 72.5404 614.156 88.4414 587.885L309.863 222.063C313.34 216.317 319.439 212.826 326 212.826C332.561 212.826 338.659 216.317 342.137 222.063L563.559 587.885C579.46 614.156 617.352 611.297 629.388 582.918L648.728 537.313C653.451 526.178 653.043 513.435 647.62 502.646L414.038 37.9539C402.316 14.6347 378.994 0 353.554 0Z" fill="white"/>
</svg>

```

## Frontend/assets/expo.icon/icon.json
**json · 40 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "fill" : {
    "automatic-gradient" : "extended-srgb:0.00000,0.47843,1.00000,1.00000"
  },
  "groups" : [
    {
      "layers" : [
        {
          "image-name" : "expo-symbol 2.svg",
          "name" : "expo-symbol 2",
          "position" : {
            "scale" : 1,
            "translation-in-points" : [
              1.1008400065293245e-05,
              -16.046875
            ]
          }
        },
        {
          "image-name" : "grid.png",
          "name" : "grid"
        }
      ],
      "shadow" : {
        "kind" : "neutral",
        "opacity" : 0.5
      },
      "translucency" : {
        "enabled" : true,
        "value" : 0.5
      }
    }
  ],
  "supported-platforms" : {
    "circles" : [
      "watchOS"
    ],
    "squares" : "shared"
  }
}
```

## Frontend/eas.json
**json · 28 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}

```

## Frontend/eslint.config.js
**javascript · 16 lines · Frontend build, deployment, dependency, or platform configuration.**

```javascript
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', '.expo/**'],
  },
  expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

```

## Frontend/expo-env.d.ts
**typescript · 3 lines · Frontend build, deployment, dependency, or platform configuration.**

```typescript
/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore
```

## Frontend/LICENSE
**text · 22 lines · Frontend build, deployment, dependency, or platform configuration.**

```text
The MIT License (MIT)

Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

## Frontend/package.json
**json · 61 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "name": "cas-assist",
  "main": "expo-router/entry",
  "version": "1.0.1",
  "dependencies": {
    "@expo/ui": "~57.0.18",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@supabase/supabase-js": "^2.106.2",
    "expo": "^57.0.17",
    "expo-blur": "~57.0.3",
    "expo-constants": "~57.0.18",
    "expo-device": "~57.0.2",
    "expo-font": "~57.0.4",
    "expo-glass-effect": "~57.0.3",
    "expo-image": "~57.0.5",
    "expo-linking": "~57.0.10",
    "expo-notifications": "~57.0.18",
    "expo-router": "~57.0.21",
    "expo-splash-screen": "~57.0.9",
    "expo-sqlite": "~57.0.3",
    "expo-status-bar": "~57.0.1",
    "expo-symbols": "~57.0.3",
    "expo-system-ui": "~57.0.4",
    "expo-web-browser": "~57.0.3",
    "lucide-react-native": "^1.45.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.3",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-svg": "15.15.4",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.10.1"
  },
  "devDependencies": {
    "@types/react": "~19.2.2",
    "eslint": "^9.0.0",
    "eslint-config-expo": "~57.0.2",
    "typescript": "~6.0.3"
  },
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:web": "expo export --platform web",
    "preview:web": "npx serve dist",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run lint && expo export --platform web"
  },
  "private": true,
  "description": "This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).",
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs"
}

```

## Frontend/public/index.html
**html · 29 lines · Frontend build, deployment, dependency, or platform configuration.**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
    />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F3F6F4" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0C1716" />
    <meta name="color-scheme" content="light dark" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="description" content="AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences." />
    <link rel="manifest" href="/manifest.json" />
    <title>CAS Assist</title>
    <style id="expo-reset">
      html, body { height: 100%; }
      body { overflow: hidden; }
      #root { display: flex; min-height: 100%; flex: 1; }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run CAS Assist.</noscript>
    <div id="root"></div>
  </body>
</html>

```

## Frontend/public/manifest.json
**json · 20 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "name": "CAS Assist",
  "short_name": "CAS Assist",
  "description": "AI-assisted academic information and helpdesk for the NEU College of Arts and Sciences.",
  "lang": "en",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#123936",
  "background_color": "#F3F6F4",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "48x48",
      "type": "image/x-icon"
    }
  ]
}

```

## Frontend/README.md
**markdown · 14 lines · Frontend build, deployment, dependency, or platform configuration.**

```markdown
# CAS Assist Frontend

Expo SDK 57 application for CAS Assist. Routes live in `src/app`, while reusable components, hooks, context, constants, and API clients live under `src` beside the route tree.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`, then set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`.
3. Start with Expo Go by running `npm start`.

Other available commands are `npm run android`, `npm run ios`, `npm run web`, and `npm run check`. The complete check runs TypeScript, ESLint, and a production web export.

Public Expo environment values must never contain Supabase service-role credentials or other server secrets.

```

## Frontend/src/app/_layout.tsx
**tsx · 202 lines · Expo Router screen/route for _layout.tsx.**

```tsx
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AuthenticatedErrorBoundary from '@/components/authenticated-error-boundary';
import AuthLandingScreen from '@/components/auth/auth-landing-screen';
import LoginScreen from '@/components/auth/login-screen';
import RegisterScreen from '@/components/auth/register-screen';
import { Academic, FloatingChatButton } from '@/components/ui/academic-ui';
import { AuthProvider, useAuth, type LoginCategory } from '@/context/auth';
import { AppThemeProvider, useAppTheme } from '@/context/theme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { publicConfigError } from '@/lib/config';

type AuthView = 'landing' | 'login' | 'register';

const styles = StyleSheet.create({
  // Must be above AnimatedSplashOverlay (zIndex 1000) on native,
  // and above everything on web.
  authContainer: { flex: 1, backgroundColor: Academic.background },
  configTitle: { color: Academic.navy, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  configMessage: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  configButton: {
    minWidth: 180,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Academic.primary,
  },
  configButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  loading: {
    zIndex: 1001,
    elevation: 1001,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.background,
  },
});

// ── Auth overlay ──────────────────────────────────────────────
// AppTabs stays mounted at all times so the Expo Router navigator
// is never torn down. When there is no session we cover it with a
// full-screen overlay. Signing out makes session null → overlay
// appears. Signing in makes session non-null → overlay disappears.

function PushSetup() {
  const { profile } = useAuth();
  usePushNotifications(profile?.id);
  return null;
}

function AuthenticatedWorkspace({
  userId,
  onSignOut,
  resetRouteOnAuth,
}: {
  userId: string;
  onSignOut: () => Promise<void>;
  resetRouteOnAuth: boolean;
}) {
  const router = useRouter();
  const resetUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset only after a subsequent sign-in. On the initial session restore,
    // preserve a valid browser deep link such as /ticket/:id.
    if (!resetRouteOnAuth || resetUserRef.current === userId) return;
    resetUserRef.current = userId;
    router.replace('/');
  }, [resetRouteOnAuth, router, userId]);

  return (
    <AuthenticatedErrorBoundary onSignOut={onSignOut}>
      <AppTabs key={userId} />
      <FloatingChatButton />
      <PushSetup />
    </AuthenticatedErrorBoundary>
  );
}

function AppGate() {
  const { session, profile, isLoading, isProfileLoading, signOut } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('landing');
  const [loginCategory, setLoginCategory] = useState<LoginCategory>('student');
  const hadSessionRef = useRef(false);
  const hasAuthenticatedSessionRef = useRef(false);
  const previousSessionUserIdRef = useRef<string | null>(null);
  const [resetRouteOnAuth, setResetRouteOnAuth] = useState(false);

  useEffect(() => {
    if (!session && hadSessionRef.current) {
      setAuthView('landing');
      setLoginCategory('student');
    }
    const nextUserId = session?.user.id ?? null;
    if (nextUserId !== previousSessionUserIdRef.current) {
      if (nextUserId) {
        setResetRouteOnAuth(hasAuthenticatedSessionRef.current);
        hasAuthenticatedSessionRef.current = true;
      } else {
        setResetRouteOnAuth(false);
      }
      previousSessionUserIdRef.current = nextUserId;
    }
    hadSessionRef.current = Boolean(session);
  }, [session]);

  if (publicConfigError) {
    return (
      <View style={[styles.authContainer, styles.loading]}>
        <Text style={styles.configTitle}>CAS Assist needs configuration</Text>
        <Text style={styles.configMessage}>{publicConfigError}</Text>
        <Pressable style={styles.configButton} onPress={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}>
          <Text style={styles.configButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // While restoring the session from storage, show nothing —
  // the AnimatedSplashOverlay above handles the loading moment.
  if (isLoading || isProfileLoading) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.loading]}>
        <ActivityIndicator size="large" color={Academic.primary} />
      </View>
    );
  }

  if (session && profile) {
    return <AuthenticatedWorkspace userId={session.user.id} onSignOut={signOut} resetRouteOnAuth={resetRouteOnAuth} />;
  }

  return (
    <View style={styles.authContainer}>
      {authView === 'landing' ? (
        <AuthLandingScreen
          onSelectCategory={category => {
            setLoginCategory(category);
            setAuthView('login');
          }}
        />
      ) : authView === 'login' ? (
        <LoginScreen
          category={loginCategory}
          onNavigateToRegister={() => setAuthView('register')}
          onChangeCategory={() => setAuthView('landing')}
        />
      ) : (
        <RegisterScreen
          onNavigateToLogin={() => setAuthView('login')}
          onChangeAccountType={() => setAuthView('landing')}
        />
      )}
    </View>
  );
}

// ── Root layout ───────────────────────────────────────────────

function ThemedApplication() {
  const { colors, resolvedTheme } = useAppTheme();
  const navigationTheme = useMemo(() => {
    const base = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.backgroundElement,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, resolvedTheme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <AppGate />
      {Platform.OS !== 'web' && <AnimatedSplashOverlay />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <ThemedApplication />
      </AuthProvider>
    </AppThemeProvider>
  );
}

```

## Frontend/src/app/admin.tsx
**tsx · 1391 lines · Expo Router screen/route for admin.tsx.**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  MetricCard,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  student_id: { id: string; display_name: string; email: string } | null;
}

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  student_number: string | null;
  role: string;
  state: string;
  created_at: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  state: string;
  pinned: boolean;
  audience_roles: string[];
  publish_at: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  document_type: string;
  purpose: string;
  copies: number;
  status: string;
  remarks: string | null;
  requested_at: string;
  student_id: { display_name: string; email: string } | null;
}

interface AuditRow {
  id: number;
  ticket_id: string;
  actor_id: string | null;
  action: string;
  old_data: { status?: string } | null;
  new_data: { status?: string } | null;
  created_at: string;
}

type AdminTab = 'tickets' | 'announce' | 'documents' | 'users' | 'audit';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Resolved',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted' | 'error'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'error',
  resolved: 'success',
};

const NEXT_STATUS: Record<string, string | null> = {
  submitted: 'under_evaluation',
  under_evaluation: 'action_required',
  action_required: 'resolved',
  resolved: null,
};

const NEXT_LABEL: Record<string, string> = {
  submitted: 'Start Evaluation',
  under_evaluation: 'Request Action',
  action_required: 'Resolve',
};

const TICKET_STATUS_FILTERS = ['all', 'submitted', 'under_evaluation', 'action_required', 'resolved'] as const;

const AUDIENCE_OPTIONS = ['all', 'student', 'faculty', 'staff'] as const;
const USER_ROLE_OPTIONS = ['all', 'student', 'faculty', 'staff', 'super_admin'] as const;

const DOC_LABEL: Record<string, string> = {
  transcript_of_records: 'Transcript of Records',
  certificate_of_enrollment: 'Certificate of Enrollment',
  certificate_of_good_moral: 'Certificate of Good Moral',
  honorable_dismissal: 'Honorable Dismissal',
  diploma: 'Diploma',
  other: 'Other',
};

const DOC_STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  processing: 'Processing',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
};

const DOC_STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {
  submitted: 'blue',
  under_evaluation: 'warning',
  action_required: 'error',
  processing: 'warning',
  ready_for_pickup: 'success',
  completed: 'success',
  rejected: 'error',
};

const DOC_NEXT: Record<string, string | null> = {
  submitted: 'under_evaluation',
  under_evaluation: 'processing',
  processing: 'ready_for_pickup',
  ready_for_pickup: 'completed',
  completed: null,
  rejected: null,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ManagementCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurfaceCard style={styles.managementCard}>{children}</SurfaceCard>;
}

type QueueFilterOption = { value: string; label: string };

function QueueFilterSelect({
  label,
  value,
  options,
  expanded,
  onPress,
}: {
  label: string;
  value: string;
  options: QueueFilterOption[];
  expanded: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  const selected = options.find(option => option.value === value)?.label ?? value;

  return (
    <View style={styles.queueFilterSelect}>
      <Text style={[styles.queueFilterLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected}`}
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.queueFilterControl,
          { backgroundColor: colors.muted, borderColor: expanded ? colors.primary : colors.border },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.queueFilterControlText, { color: colors.text }]} numberOfLines={1}>{selected}</Text>
        <AcademicIcon
          name={expanded
            ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
            : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          color={colors.textSecondary}
          size={16}
          animated={false}
        />
      </Pressable>
    </View>
  );
}

function AllTickets() {
  const router = useRouter();
  const colors = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sort, setSort] = useState<'updated' | 'newest' | 'oldest'>('updated');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | 'category' | 'sort' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('advising_ticket_pipeline')
      .select('id, category, description, status, priority, created_at, updated_at, student_id(id, display_name, email)')
      .eq('state', 'active')
      .order('created_at', { ascending: false });

    setLoadError(error ? 'We could not load the ticket queue. Please refresh and try again.' : null);
    setTickets((data as unknown as Ticket[]) ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchTickets(); setLoading(false); }, [fetchTickets]);
  async function onRefresh() { setRefreshing(true); await fetchTickets(); setRefreshing(false); }

  useEffect(() => { void load(); }, [load]);

  async function advance(ticket: Ticket) {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setActionError(null);
    setUpdating(ticket.id);
    const updates: Record<string, unknown> = { status: next };
    if (next === 'resolved') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('advising_ticket_pipeline').update(updates).eq('id', ticket.id);
    setUpdating(null);
    if (error) {
      setActionError('That status change was not accepted. Refresh and try again.');
      return;
    }
    await fetchTickets();
  }

  const categories = useMemo(() => (
    Array.from(new Set(tickets.map(ticket => ticket.category).filter(Boolean))).sort()
  ), [tickets]);
  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets
      .filter(ticket => {
        const student = ticket.student_id;
        const searchable = `${shortRef(ticket.id)} ${ticket.category} ${ticket.description} ${student?.display_name ?? ''} ${student?.email ?? ''}`.toLowerCase();
        return (filter === 'all' || ticket.status === filter)
          && (categoryFilter === 'all' || ticket.category === categoryFilter)
          && (priorityFilter === 'all' || ticket.priority === priorityFilter)
          && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sort === 'oldest') return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        if (sort === 'newest') return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      });
  }, [categoryFilter, filter, priorityFilter, query, sort, tickets]);

  function clearFilters() {
    setFilter('all');
    setQuery('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSort('updated');
    setOpenFilter(null);
  }

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All statuses' },
    ...TICKET_STATUS_FILTERS.filter(item => item !== 'all').map(item => ({ value: item, label: STATUS_LABEL[item] ?? formatCategory(item) })),
  ], []);
  const priorityOptions = useMemo(() => [
    { value: 'all', label: 'Any priority' },
    ...['urgent', 'high', 'normal', 'low'].map(value => ({ value, label: formatCategory(value) })),
  ], []);
  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'All categories' },
    ...categories.map(value => ({ value, label: formatCategory(value) })),
  ], [categories]);
  const sortOptions = useMemo(() => [
    { value: 'updated', label: 'Recently updated' },
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
  ], []);
  const activeFilterOptions = openFilter === 'status'
    ? statusOptions
    : openFilter === 'priority'
      ? priorityOptions
      : openFilter === 'category'
        ? categoryOptions
        : sortOptions;
  const activeFilterLabel = openFilter === 'status'
    ? 'Status'
    : openFilter === 'priority'
      ? 'Priority'
      : openFilter === 'category'
        ? 'Category'
        : 'Sort order';
  const hasFilters = Boolean(query || filter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || sort !== 'updated');

  function chooseFilter(value: string) {
    if (openFilter === 'status') setFilter(value);
    if (openFilter === 'priority') setPriorityFilter(value);
    if (openFilter === 'category') setCategoryFilter(value);
    if (openFilter === 'sort') setSort(value as 'updated' | 'newest' | 'oldest');
    setOpenFilter(null);
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      <BentoGrid style={styles.managementMetrics}>
        <BentoPanel size="compact" style={styles.managementMetricPanel}>
          <MetricCard label="Authorized tickets" value={tickets.length} tone="blue" icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }} />
        </BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}>
          <MetricCard label="Needs action" value={tickets.filter(ticket => ticket.status === 'action_required').length} tone="warning" icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }} />
        </BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}>
          <MetricCard label="Resolved" value={tickets.filter(ticket => ticket.status === 'resolved').length} tone="success" icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }} />
        </BentoPanel>
      </BentoGrid>

      {loadError ? <View style={styles.errorBox}><Text style={styles.errorText}>{loadError}</Text></View> : null}
      {actionError ? <View style={styles.errorBox}><Text style={styles.errorText}>{actionError}</Text></View> : null}

      <SurfaceCard style={styles.workspaceFilterCard}>
        <View style={styles.searchFieldShell}>
          <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search reference, student, category, or description"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Search ticket queue"
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <View style={styles.queueFilterToolbar}>
          <QueueFilterSelect label="Status" value={filter} options={statusOptions} expanded={openFilter === 'status'} onPress={() => setOpenFilter(value => value === 'status' ? null : 'status')} />
          <QueueFilterSelect label="Priority" value={priorityFilter} options={priorityOptions} expanded={openFilter === 'priority'} onPress={() => setOpenFilter(value => value === 'priority' ? null : 'priority')} />
          <QueueFilterSelect label="Category" value={categoryFilter} options={categoryOptions} expanded={openFilter === 'category'} onPress={() => setOpenFilter(value => value === 'category' ? null : 'category')} />
          <QueueFilterSelect label="Sort" value={sort} options={sortOptions} expanded={openFilter === 'sort'} onPress={() => setOpenFilter(value => value === 'sort' ? null : 'sort')} />
          <Pressable
            onPress={clearFilters}
            disabled={!hasFilters}
            accessibilityRole="button"
            accessibilityLabel="Reset ticket filters"
            style={({ pressed }) => [styles.queueResetButton, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, !hasFilters && styles.queueResetButtonDisabled, pressed && styles.pressed]}>
            <AcademicIcon name={{ ios: 'arrow.counterclockwise', android: 'restart_alt', web: 'restart_alt' }} color={colors.primary} size={16} animated={false} />
            <Text style={[styles.queueResetText, { color: colors.primary }]}>Reset</Text>
          </Pressable>
        </View>
        {openFilter ? (
          <View style={[styles.queueFilterMenu, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Text style={[styles.queueFilterMenuLabel, { color: colors.textSecondary }]}>Choose {activeFilterLabel.toLowerCase()}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queueFilterOptions}>
              {activeFilterOptions.map(option => {
                const selected = (openFilter === 'status' && filter === option.value)
                  || (openFilter === 'priority' && priorityFilter === option.value)
                  || (openFilter === 'category' && categoryFilter === option.value)
                  || (openFilter === 'sort' && sort === option.value);
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => chooseFilter(option.value)}
                    style={({ pressed }) => [styles.queueFilterOption, { backgroundColor: selected ? colors.primary : colors.muted }, pressed && styles.pressed]}>
                    <Text style={[styles.queueFilterOptionText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </SurfaceCard>
      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{visibleTickets.length} matching ticket{visibleTickets.length === 1 ? '' : 's'}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleTickets.length === 0 ? (
        <EmptyState
          title="No tickets match these filters"
          message="Clear a filter or try a different search to see the authorized queue."
          icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
        />
      ) : (
        visibleTickets.map(ticket => {
          const next = NEXT_STATUS[ticket.status];
          const student = ticket.student_id;
          return (
            <Pressable
              key={ticket.id}
              onPress={() => router.push(`/ticket/${ticket.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`Open ticket ${shortRef(ticket.id)}`}
              style={({ pressed }) => [styles.ticketPressable, pressed && styles.pressed]}>
              <ManagementCard>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleGroup}>
                  <Text style={[styles.refText, { color: colors.primary }]}>{shortRef(ticket.id)}</Text>
                  <Text style={[styles.itemTitle, { color: colors.navy }]}>{formatCategory(ticket.category)}</Text>
                  {student ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{student.display_name} - {student.email}</Text> : null}
                </View>
                <StatusBadge label={STATUS_LABEL[ticket.status] ?? ticket.status} tone={STATUS_TONE[ticket.status] ?? 'muted'} />
              </View>
              <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={2}>{ticket.description}</Text>
              <View style={styles.footerRow}>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Filed {formatDate(ticket.created_at)} · Updated {formatDate(ticket.updated_at)}</Text>
                {next ? (
                  <Pressable
                    style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                    onPress={event => {
                      event.stopPropagation();
                      void advance(ticket);
                    }}
                    disabled={updating === ticket.id}>
                    {updating === ticket.id ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.smallButtonText}>{NEXT_LABEL[ticket.status]}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
              </ManagementCard>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function PostAnnouncement({ adminId }: { adminId: string }) {
  const colors = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('all');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [listAudience, setListAudience] = useState('all');

  const fetchAnnouncements = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('announcements')
      .select('id, title, body, state, pinned, audience_roles, publish_at, created_at')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setAnnouncements((data as AnnouncementRow[] | null) ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoadingAnnouncements(true);
      await fetchAnnouncements();
      setLoadingAnnouncements(false);
    })();
  }, [fetchAnnouncements]);

  const visibleAnnouncements = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return announcements.filter(item => {
      const matchesSearch = !query || `${item.title} ${item.body} ${item.audience_roles.join(' ')}`.toLowerCase().includes(query);
      const matchesAudience = listAudience === 'all' || item.audience_roles.includes(listAudience);
      return matchesSearch && matchesAudience;
    });
  }, [announcements, listAudience, listSearch]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  }

  async function handlePost() {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    const { error: dbErr } = await supabase.from('announcements').insert({
      created_by: adminId,
      title: title.trim(),
      body: body.trim(),
      audience_roles: audience === 'all'
        ? ['student', 'faculty', 'staff', 'super_admin']
        : [audience],
      pinned: isPinned,
      state: 'published',
      publish_at: new Date().toISOString(),
    });
    if (dbErr) {
      setError(dbErr.message);
    } else {
      setTitle('');
      setBody('');
      setAudience('all');
      setIsPinned(false);
      setSuccess(true);
      await fetchAnnouncements();
      setTimeout(() => setSuccess(false), 3000);
    }
    setSubmitting(false);
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.subScroll}>
      {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}
      {success ? <View style={[styles.successBox, { backgroundColor: colors.successBg }]}><Text style={[styles.successText, { color: colors.success }]}>Announcement posted successfully.</Text></View> : null}

      <SectionHeader title="Announcement Details" />
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Announcement title"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <TextInput
        style={[styles.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Write your announcement..."
        placeholderTextColor={colors.textSecondary}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        maxLength={1000}
        textAlignVertical="top"
      />
      <Text style={[styles.charCount, { color: colors.textSecondary }]}>{body.length}/1000</Text>

      <SectionHeader title="Audience" />
      <View style={styles.chipRow}>
        {AUDIENCE_OPTIONS.map(item => {
          const active = audience === item;
          return (
              <Pressable key={item} onPress={() => setAudience(item)} style={[styles.choiceChip, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.choiceText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.choiceTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => setIsPinned(value => !value)} style={[styles.pinToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.pinLeft}>
          <AcademicIcon
            name={{ ios: 'pin', android: 'push_pin', web: 'push_pin' }}
            color={isPinned ? colors.warning : colors.textSecondary}
            size={18}
          />
          <Text style={[styles.pinText, { color: colors.navy }]}>Pin this announcement</Text>
        </View>
        <StatusBadge label={isPinned ? 'Pinned' : 'Standard'} tone={isPinned ? 'warning' : 'muted'} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, (pressed || submitting) && styles.pressed]}
        onPress={handlePost}
        disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Post Announcement</Text>}
      </Pressable>

      <SectionHeader title={`Published Announcements (${visibleAnnouncements.length})`} />
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Search title, content, or audience"
        placeholderTextColor={colors.textSecondary}
        value={listSearch}
        onChangeText={setListSearch}
        accessibilityLabel="Search published announcements"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {['all', 'student', 'faculty', 'staff', 'super_admin'].map(item => {
          const active = listAudience === item;
          return (
            <Pressable
              key={item}
              onPress={() => setListAudience(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>
                {item === 'all' ? 'All audiences' : item === 'super_admin' ? 'Super admins' : `${item.charAt(0).toUpperCase()}${item.slice(1)}s`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loadingAnnouncements ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleAnnouncements.length === 0 ? (
        <EmptyState
          title={announcements.length === 0 ? 'No announcements yet' : 'No matching announcements'}
          message={announcements.length === 0 ? 'Announcements created by CAS staff will appear here.' : 'Try another search term or audience filter.'}
          icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
        />
      ) : (
        visibleAnnouncements.map(item => {
          const expanded = expandedId === item.id;
          const publishedAt = item.publish_at ?? item.created_at;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpandedId(current => current === item.id ? null : item.id)}>
              <ManagementCard>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={[styles.itemTitle, { color: colors.navy }]} numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(publishedAt)}</Text>
                  </View>
                  <StatusBadge label={item.pinned ? 'Pinned' : item.state} tone={item.pinned ? 'warning' : 'success'} />
                </View>
                <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>{item.body}</Text>
                {expanded ? (
                  <View style={styles.announcementDetails}>
                    <Text style={[styles.detailLabel, { color: colors.navy }]}>Audience</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{item.audience_roles.map(role => role.replace('_', ' ')).join(', ')}</Text>
                  </View>
                ) : null}
                <Text style={[styles.expandLink, { color: colors.primary }]}>{expanded ? 'Hide details' : 'Open announcement'}</Text>
              </ManagementCard>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function DocRequests() {
  const colors = useTheme();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('document_requests')
      .select('id, document_type, purpose, copies, status, remarks, requested_at, student_id(display_name, email)')
      .eq('state', 'active')
      .order('requested_at', { ascending: false });
    if (fetchError) {
      setError('Document requests could not be loaded. Pull down to retry.');
      return;
    }
    setError(null);
    setDocs((data as unknown as DocRow[]) ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchDocs(); setLoading(false); }, [fetchDocs]);
  async function onRefresh() { setRefreshing(true); await fetchDocs(); setRefreshing(false); }
  useEffect(() => { void load(); }, [load]);

  const visibleDocs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return docs.filter(doc => {
      const student = doc.student_id;
      const matchesSearch = !query || `${DOC_LABEL[doc.document_type] ?? doc.document_type} ${doc.purpose} ${student?.display_name ?? ''} ${student?.email ?? ''}`.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === 'all' || doc.status === statusFilter);
    });
  }, [docs, search, statusFilter]);

  async function advance(doc: DocRow) {
    const next = DOC_NEXT[doc.status];
    if (!next) return;
    setError(null);
    setNotice(null);
    setUpdating(doc.id);
    const { error: updateError } = await supabase
      .from('document_requests')
      .update({ status: next, remarks: remarks[doc.id] ?? doc.remarks ?? null })
      .eq('id', doc.id);
    setUpdating(null);
    if (updateError) {
      setError('The document request could not be updated. Please try again.');
    } else {
      setNotice(`Request moved to ${DOC_STATUS_LABEL[next]}.`);
      await fetchDocs();
    }
  }

  async function reject(doc: DocRow) {
    setError(null);
    setNotice(null);
    setUpdating(`${doc.id}-reject`);
    const { error: updateError } = await supabase
      .from('document_requests')
      .update({ status: 'rejected', remarks: remarks[doc.id] ?? null })
      .eq('id', doc.id);
    setUpdating(null);
    if (updateError) {
      setError('The document request could not be rejected. Please try again.');
    } else {
      setNotice('Request rejected and the student note was saved.');
      await fetchDocs();
    }
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}
      {notice ? <View style={[styles.successBox, { backgroundColor: colors.successBg }]}><Text style={[styles.successText, { color: colors.success }]}>{notice}</Text></View> : null}
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Search student, document, or purpose"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        accessibilityLabel="Search document requests"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {['all', ...Object.keys(DOC_STATUS_LABEL)].map(status => {
          const active = statusFilter === status;
          return (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>
                {status === 'all' ? 'All requests' : DOC_STATUS_LABEL[status]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleDocs.length === 0 ? (
        <EmptyState
          title={docs.length === 0 ? 'No document requests' : 'No matching requests'}
          message={docs.length === 0 ? 'Student document requests will appear here.' : 'Try another search term or status filter.'}
          icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
        />
      ) : (
        visibleDocs.map(doc => {
          const next = DOC_NEXT[doc.status];
          const isUpdating = updating === doc.id || updating === `${doc.id}-reject`;
          const student = doc.student_id;
          return (
            <ManagementCard key={doc.id}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleGroup}>
                  <Text style={[styles.itemTitle, { color: colors.navy }]}>{DOC_LABEL[doc.document_type] ?? formatCategory(doc.document_type)}</Text>
                  {student ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{student.display_name} - {student.email}</Text> : null}
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{doc.copies} {doc.copies === 1 ? 'copy' : 'copies'} - {doc.purpose}</Text>
                </View>
                <StatusBadge label={DOC_STATUS_LABEL[doc.status] ?? doc.status} tone={DOC_STATUS_TONE[doc.status] ?? 'muted'} />
              </View>

              {next ? (
                <TextInput
                  style={[styles.remarksInput, { color: colors.text, backgroundColor: colors.muted }]}
                  placeholder="Add a note to the student (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={remarks[doc.id] ?? ''}
                  onChangeText={value => setRemarks(current => ({ ...current, [doc.id]: value }))}
                />
              ) : doc.remarks ? (
                <Text style={[styles.itemBody, { color: colors.textSecondary }]}>Staff note: {doc.remarks}</Text>
              ) : null}

              <View style={styles.footerRow}>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(doc.requested_at)}</Text>
                {next ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                      onPress={() => advance(doc)}
                      disabled={isUpdating}>
                      <Text style={styles.smallButtonText}>{DOC_STATUS_LABEL[next]}</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}
                      onPress={() => reject(doc)}
                      disabled={isUpdating}>
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </ManagementCard>
          );
        })
      )}
    </ScrollView>
  );
}

function AuditLog() {
  const colors = useTheme();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('ticket_audit_logs')
      .select('id, ticket_id, actor_id, action, old_data, new_data, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setError(fetchError ? 'The protected audit history could not be loaded. Pull down to retry.' : null);
    setRows((data as unknown as AuditRow[]) ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchAudit(); setLoading(false); }, [fetchAudit]);
  async function onRefresh() { setRefreshing(true); await fetchAudit(); setRefreshing(false); }
  useEffect(() => { void load(); }, [load]);

  const actions = useMemo(() => Array.from(new Set(rows.map(row => row.action))).sort(), [rows]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter(row => {
      const statusChange = `${row.old_data?.status ?? ''} ${row.new_data?.status ?? ''}`;
      return (actionFilter === 'all' || row.action === actionFilter)
        && (!normalizedQuery || `${shortRef(row.ticket_id)} ${row.action} ${row.actor_id ?? ''} ${statusChange}`.toLowerCase().includes(normalizedQuery));
    });
  }, [actionFilter, query, rows]);

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      <SurfaceCard style={styles.auditIntro}>
        <View style={[styles.auditIntroIcon, { backgroundColor: colors.softBlue }]}>
          <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={colors.primary} size={21} />
        </View>
        <View style={styles.auditIntroCopy}>
          <Text style={[styles.itemTitle, { color: colors.navy }]}>Protected ticket history</Text>
          <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Read-only events emitted by the existing advising-ticket audit trigger. Only super administrators can access this view.</Text>
        </View>
      </SurfaceCard>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <View style={styles.workspaceFilterCard}>
        <View style={[styles.searchFieldShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search ticket reference, action, or actor"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            accessibilityLabel="Search protected audit history"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {['all', ...actions].map(action => {
            const active = actionFilter === action;
            return (
              <Pressable key={action} onPress={() => setActionFilter(action)} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{action === 'all' ? 'All events' : formatCategory(action)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{visibleRows.length} audit event{visibleRows.length === 1 ? '' : 's'} shown</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleRows.length === 0 ? (
        <EmptyState title="No audit events match" message="Ticket status and lifecycle events will appear here when recorded." icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} />
      ) : visibleRows.map(row => {
        const oldStatus = row.old_data?.status;
        const newStatus = row.new_data?.status;
        return (
          <ManagementCard key={row.id}>
            <View style={styles.auditEvent}>
              <View style={styles.auditEventMain}>
                <Text style={[styles.refText, { color: colors.primary }]}>{shortRef(row.ticket_id)}</Text>
                <Text style={[styles.itemTitle, { color: colors.navy }]}>{formatCategory(row.action)}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(row.created_at)} · {row.actor_id ? `Actor ${shortRef(row.actor_id, 'A')}` : 'System actor'}</Text>
              </View>
              <StatusBadge label={newStatus ? `${oldStatus ?? 'new'} → ${newStatus}` : 'Recorded'} tone={newStatus === 'resolved' ? 'success' : 'blue'} />
            </View>
          </ManagementCard>
        );
      })}
    </ScrollView>
  );
}

function UserList() {
  const colors = useTheme();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<(typeof USER_ROLE_OPTIONS)[number]>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived_read_only'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('users_account_registry')
      .select('id, display_name, email, student_number, role, state, created_at')
      .order('created_at', { ascending: false });
    setError(fetchError ? 'The account directory could not be loaded. Pull down to retry.' : null);
    setUsers(data ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchUsers(); setLoading(false); }, [fetchUsers]);
  async function onRefresh() { setRefreshing(true); await fetchUsers(); setRefreshing(false); }

  useEffect(() => { void load(); }, [load]);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users
      .filter(user => {
        const searchable = `${user.display_name} ${user.email} ${user.student_number ?? ''}`.toLowerCase();
        return (roleFilter === 'all' || user.role === roleFilter)
          && (statusFilter === 'all' || (statusFilter === 'active' ? user.state === 'active' : user.state === 'archived_read_only'))
          && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sort === 'name') return left.display_name.localeCompare(right.display_name);
        const direction = sort === 'newest' ? -1 : 1;
        return direction * (new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
      });
  }, [query, roleFilter, sort, statusFilter, users]);

  function clearFilters() {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSort('newest');
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      <BentoGrid style={styles.managementMetrics}>
        <BentoPanel size="compact" style={styles.managementMetricPanel}><MetricCard label="All accounts" value={users.length} tone="blue" icon={{ ios: 'person.2', android: 'groups', web: 'groups' }} /></BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}><MetricCard label="Active" value={users.filter(user => user.state === 'active').length} tone="success" icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} /></BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}><MetricCard label="Read-only" value={users.filter(user => user.state === 'archived_read_only').length} tone="warning" icon={{ ios: 'lock', android: 'lock', web: 'lock' }} /></BentoPanel>
      </BentoGrid>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <SectionHeader title={`${visibleUsers.length} matching account${visibleUsers.length === 1 ? '' : 's'}`} />
      <View style={styles.workspaceFilterCard}>
        <View style={[styles.searchFieldShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email, or student number"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            accessibilityLabel="Search account directory"
          />
        </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {USER_ROLE_OPTIONS.map(role => {
          const active = roleFilter === role;
          const label = role === 'all' ? 'All users' : role === 'super_admin' ? 'Super admins' : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`;
          return (
            <Pressable
              key={role}
              onPress={() => setRoleFilter(role)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {(['all', 'active', 'archived_read_only'] as const).map(status => {
            const active = statusFilter === status;
            return (
              <Pressable key={status} onPress={() => setStatusFilter(status)} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{status === 'all' ? 'All states' : status === 'active' ? 'Active' : 'Read-only'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.workspaceFilterFooter}>
          <View style={styles.workspaceFilterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sort</Text>
            {(['newest', 'oldest', 'name'] as const).map(value => {
              const active = sort === value;
              return (
                <Pressable key={value} onPress={() => setSort(value)} style={[styles.sortButton, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.softBlue : 'transparent' }]}>
                  <Text style={[styles.sortText, { color: active ? colors.primary : colors.textSecondary }]}>{value === 'name' ? 'Name' : value === 'newest' ? 'Newest' : 'Oldest'}</Text>
                </Pressable>
              );
            })}
          </View>
          {(query || roleFilter !== 'all' || statusFilter !== 'all' || sort !== 'newest') ? <Pressable onPress={clearFilters} style={styles.clearButton}><Text style={[styles.clearButtonText, { color: colors.primary }]}>Clear filters</Text></Pressable> : null}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleUsers.length === 0 ? (
        <EmptyState
          title="No matching users"
          message="No authorized accounts match the current search and filters."
          icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
        />
      ) : (
        visibleUsers.map(user => (
          <ManagementCard key={user.id}>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{(user.display_name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.itemTitle, { color: colors.navy }]} numberOfLines={1}>{user.display_name}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{user.email}</Text>
                {user.role === 'student' && user.student_number ? (
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Student No. {user.student_number}</Text>
                ) : null}
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Joined {formatDate(user.created_at)}</Text>
              </View>
              <View style={styles.userBadges}>
                <StatusBadge label={user.role.replace('_', ' ')} tone={user.role === 'super_admin' ? 'error' : user.role === 'staff' ? 'success' : 'blue'} />
                {user.state === 'archived_read_only' ? <StatusBadge label="Archived" tone="warning" /> : null}
              </View>
            </View>
          </ManagementCard>
        ))
      )}
    </ScrollView>
  );
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const colors = useTheme();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const [activeTab, setActiveTab] = useState<AdminTab>('tickets');
  const isAdmin = profile?.role === 'staff' || profile?.role === 'super_admin';

  useEffect(() => {
    const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (requestedTab === 'tickets' || requestedTab === 'announce' || requestedTab === 'documents' || requestedTab === 'users' || (requestedTab === 'audit' && profile?.role === 'super_admin')) {
      setActiveTab(requestedTab);
    }
  }, [params.tab, profile?.role]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <View style={styles.accessDenied}>
          <AcademicIcon
            name={{ ios: 'lock', android: 'lock', web: 'lock' }}
            color={colors.error}
            size={42}
          />
          <Text style={[styles.accessTitle, { color: colors.navy }]}>Access Restricted</Text>
          <Text style={[styles.accessBody, { color: colors.textSecondary }]}>This section is only available to CAS staff and administrators.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'tickets', label: 'Queue' },
    { id: 'announce', label: 'Announcements' },
    { id: 'documents', label: 'Docs' },
    { id: 'users', label: 'Users' },
    ...(profile?.role === 'super_admin' ? [{ id: 'audit' as const, label: 'Audit' }] : []),
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.navy }]}>
            {profile?.role === 'super_admin' ? 'Management' : 'Operations'}
          </Text>
          <Text style={[styles.screenSub, { color: colors.textSecondary }]}>CAS service tools and request processing</Text>
        </View>
        <StatusBadge label={profile?.role === 'super_admin' ? 'Super Admin' : 'Staff'} tone={profile?.role === 'super_admin' ? 'error' : 'success'} />
      </View>

      <View style={styles.innerTabBar}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.innerTab, { backgroundColor: active ? colors.card : 'transparent' }, active && styles.innerTabActive]}>
              <Text style={[styles.innerTabText, { color: active ? colors.navy : colors.textSecondary }, active && styles.innerTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'tickets' ? <AllTickets /> : null}
      {activeTab === 'announce' ? <PostAnnouncement adminId={profile!.id} /> : null}
      {activeTab === 'documents' ? <DocRequests /> : null}
      {activeTab === 'users' ? <UserList /> : null}
      {activeTab === 'audit' && profile?.role === 'super_admin' ? <AuditLog /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  screenTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  screenSub: { color: Academic.textSecondary, fontSize: 13, marginTop: 3 },
  innerTabBar: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    alignSelf: 'center',
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    padding: 4,
    gap: 4,
    borderRadius: 14,
    backgroundColor: Academic.muted,
  },
  innerTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerTabActive: {
    backgroundColor: Academic.card,
    boxShadow: '0 8px 24px rgba(50, 82, 87, 0.10)',
  },
  innerTabText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  innerTabTextActive: { color: Academic.navy },
  subScroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  managementMetrics: { alignItems: 'stretch' },
  managementMetricPanel: { minWidth: 0 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  loader: { marginTop: Spacing.four },
  filterRail: { gap: Spacing.two, paddingRight: Spacing.three },
  workspaceFilterCard: { gap: Spacing.two, padding: Spacing.three },
  searchFieldShell: {
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: Academic.border,
    backgroundColor: Academic.muted,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 9 },
  queueFilterToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  queueFilterSelect: { minWidth: 132, flexGrow: 1, gap: 4 },
  queueFilterLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  queueFilterControl: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  queueFilterControlText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '500' },
  queueResetButton: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  queueResetButtonDisabled: { opacity: 0.42 },
  queueResetText: { fontSize: 12, fontWeight: '500' },
  queueFilterMenu: { borderWidth: 1, borderRadius: 12, padding: Spacing.two, gap: 7 },
  queueFilterMenuLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  queueFilterOptions: { gap: 7 },
  queueFilterOption: { minHeight: 32, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  queueFilterOptionText: { fontSize: 11, fontWeight: '500' },
  workspaceFilterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  workspaceFilterFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  filterLabel: { fontSize: 12, fontWeight: '500', marginRight: 2 },
  sortButton: { minHeight: 31, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, justifyContent: 'center' },
  sortText: { fontSize: 11, fontWeight: '500' },
  clearButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  clearButtonText: { fontSize: 12, fontWeight: '500' },
  resultCount: { fontSize: 12, fontWeight: '400' },
  ticketPressable: { width: '100%', borderRadius: 16 },
  auditIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  auditIntroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  auditIntroCopy: { flex: 1, gap: 4 },
  auditEvent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  auditEventMain: { flex: 1, minWidth: 220, gap: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Academic.muted,
  },
  filterChipActive: { backgroundColor: Academic.primary },
  filterText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  managementCard: { gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  cardTitleGroup: { flex: 1, gap: 3 },
  refText: { color: Academic.primary, fontSize: 13, fontWeight: '600' },
  itemTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  itemMeta: { color: Academic.textSecondary, fontSize: 12, lineHeight: 17 },
  itemBody: { color: Academic.textSecondary, fontSize: 13, lineHeight: 19 },
  announcementDetails: { gap: 3, paddingTop: 2 },
  detailLabel: { color: Academic.navy, fontSize: 12, fontWeight: '500' },
  expandLink: { color: Academic.primary, fontSize: 12, fontWeight: '500', textAlign: 'right' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  smallButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  smallButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  rejectButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.errorBg,
  },
  rejectButtonText: { color: Academic.error, fontSize: 12, fontWeight: '500' },
  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  textarea: {
    minHeight: 140,
    borderRadius: 14,
    padding: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  remarksInput: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontSize: 13,
  },
  charCount: { color: Academic.textSecondary, fontSize: 12, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  choiceChipActive: { backgroundColor: Academic.primary, borderColor: Academic.primary },
  choiceText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  choiceTextActive: { color: '#FFFFFF' },
  pinToggle: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  pinLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinText: { color: Academic.navy, fontSize: 14, fontWeight: '500' },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  userInitial: { color: Academic.primary, fontSize: 18, fontWeight: '600' },
  userInfo: { flex: 1, gap: 2 },
  userBadges: { alignItems: 'flex-end', gap: 4 },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '500' },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  accessTitle: { color: Academic.navy, fontSize: 22, fontWeight: '600' },
  accessBody: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});

```

## Frontend/src/app/analytics.tsx
**tsx · 4 lines · Expo Router screen/route for analytics.tsx.**

```tsx
import SystemAnalyticsScreen from '@/components/analytics/system-analytics-screen';

export default SystemAnalyticsScreen;

```

## Frontend/src/app/chatbot.tsx
**tsx · 463 lines · Expo Router screen/route for chatbot.tsx.**

```tsx
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Academic, AcademicIcon, AppBackdrop, IconButton, StatusBadge } from '@/components/ui/academic-ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import RoleGuard from '@/components/role-guard';
import { apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isDeflected?: boolean;
  ticketId?: string;
  queryId?: string;
  sourceTitle?: string;
  confidence?: number;
  feedback?: 'helpful' | 'not_helpful';
}

interface AIQueryResponse {
  queryId: string;
  isDeflected: boolean;
  answer: string;
  confidence: number;
  category: string;
  source: { title: string; type: 'tier1' } | null;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'system',
  content:
    'Hi! I am the CAS Assist closed-domain AI Helpdesk. I answer recurring Tier-1 questions using approved CAS Assist information only.',
};

const SUGGESTIONS: Record<string, string[]> = {
  student: ['How do I request advising?', 'How can I track my request?', 'How do I request a document?'],
  faculty: ['How do I record a room change?', 'Where can I view my schedule?', 'How do I change the theme?'],
  staff: ['How do I publish an announcement?', 'What do request statuses mean?', 'What can the AI Helpdesk answer?'],
  super_admin: ['What does System Analytics show?', 'How do I publish an announcement?', 'What can the AI Helpdesk answer?'],
};

function MessageBubble({ message, onFeedback }: { message: Message; onFeedback: (message: Message, helpful: boolean) => void }) {
  const isUser = message.role === 'user';
  const colors = useTheme();

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser ? (
        <View style={styles.botAvatar}>
          <AcademicIcon
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            color={colors.primary}
            size={18}
          />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, { backgroundColor: isUser ? colors.primary : colors.card, borderColor: colors.border }]}>
        <Text style={[styles.messageText, { color: isUser ? '#FFFFFF' : colors.navy }]}>{message.content}</Text>
        {!isUser && message.sourceTitle ? (
          <View style={styles.sourceRow}>
            <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={Academic.success} size={14} />
            <Text style={[styles.sourceText, { color: colors.success }]} numberOfLines={2}>
              {message.sourceTitle} · {Math.round((message.confidence ?? 0) * 100)}% match
            </Text>
          </View>
        ) : null}
        {!isUser && message.isDeflected ? <StatusBadge label="Needs confirmation" tone="warning" /> : null}
        {!isUser && message.queryId ? (
          <View style={styles.feedbackRow}>
            {message.feedback ? (
              <Text style={[styles.feedbackThanks, { color: colors.success }]}>Feedback recorded</Text>
            ) : (
              <>
                <Text style={[styles.feedbackPrompt, { color: colors.textSecondary }]}>Was this helpful?</Text>
                <Pressable onPress={() => onFeedback(message, true)} style={[styles.feedbackButton, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.feedbackButtonText, { color: colors.primary }]}>Yes</Text>
                </Pressable>
                <Pressable onPress={() => onFeedback(message, false)} style={[styles.feedbackButton, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.feedbackButtonText, { color: colors.primary }]}>No</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
        {message.ticketId ? (
          <View style={styles.ticketNotice}>
            <Text style={[styles.ticketNoticeText, { color: colors.warning } ]}>Ticket created. CAS staff will follow up shortly.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ChatbotScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const colors = useTheme();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const nextMessageId = useRef(0);
  const suggestions = SUGGESTIONS[profile?.role ?? 'student'] ?? SUGGESTIONS.student;

  function addMessage(msg: Omit<Message, 'id'>) {
    nextMessageId.current += 1;
    const newMsg: Message = { ...msg, id: `message-${nextMessageId.current}` };
    setMessages(prev => {
      const next = [...prev, newMsg];
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      return next;
    });
    return newMsg;
  }

  async function sendText(rawText: string) {
    const text = rawText.trim();
    if (!text || sending) return;

    setInput('');
    addMessage({ role: 'user', content: text });
    setSending(true);

    try {
      let res: AIQueryResponse;
      try {
        res = await apiPost<AIQueryResponse>('/api/ai/query', {
          query: text,
          category: 'general_inquiry',
        });
      } catch {
        const fallback = await supabase.rpc('answer_tier1_question', { p_query: text });
        if (fallback.error) throw fallback.error;
        res = fallback.data as AIQueryResponse;
      }

      addMessage({
        role: 'assistant',
        content: res.answer,
        isDeflected: res.isDeflected,
        queryId: res.queryId,
        sourceTitle: res.source?.title,
        confidence: res.confidence,
      });
    } catch {
      addMessage({
        role: 'assistant',
        content:
          'Sorry, I cannot connect right now. Please coordinate with the CAS office directly or try again later.',
      });
    } finally {
      setSending(false);
    }
  }

  async function sendFeedback(message: Message, helpful: boolean) {
    if (!message.queryId || message.feedback) return;
    setFeedbackError(null);
    try {
      try {
        await apiPost('/api/ai/feedback', { queryId: message.queryId, resolved: helpful });
      } catch {
        const fallback = await supabase.rpc('record_tier1_feedback', {
          p_query_id: message.queryId,
          p_resolved: helpful,
        });
        if (fallback.error) throw fallback.error;
      }
      setMessages(current => current.map(item => item.id === message.id
        ? { ...item, feedback: helpful ? 'helpful' : 'not_helpful' }
        : item));
    } catch {
      setFeedbackError('Feedback could not be recorded. The answer remains available.');
    }
  }

  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)} style={styles.flex}>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <View style={styles.header}>
        <IconButton
          icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          onPress={() => router.back()}
          label="Go back"
          bg={colors.muted}
          color={colors.textSecondary}
        />
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>CAS Assist Helpdesk</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Closed-domain Tier-1 assistant</Text>
        </View>
        <StatusBadge label="Verified sources" tone="success" />
        <Pressable onPress={() => router.push('/faq')} style={[styles.faqButton, { backgroundColor: colors.softBlue }]} accessibilityRole="button">
          <AcademicIcon name={{ ios: 'questionmark.circle', android: 'info', web: 'info' }} color={colors.primary} size={18} />
          <Text style={[styles.faqButtonText, { color: colors.primary }]}>FAQs</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <>
              <View style={styles.noticeBanner}>
                <AcademicIcon
                  name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                  color={colors.primary}
                  size={18}
                />
                <Text style={[styles.noticeText, { color: colors.navy }]}>
                  Answers come only from approved CAS Assist articles. The assistant will defer when confidence is low.
                </Text>
              </View>
              {messages.length === 1 ? (
                <View style={styles.suggestions}>
                  {suggestions.map(text => (
                    <Pressable
                      key={text}
                      onPress={() => sendText(text)}
                      style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}>
                      <Text style={[styles.suggestionText, { color: colors.primary }]}>{text}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => <MessageBubble message={item} onFeedback={sendFeedback} />}
          ListFooterComponent={
            sending ? (
              <View style={styles.typingRow}>
                <View style={styles.botAvatar}>
                  <AcademicIcon
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                    color={colors.primary}
                    size={18}
                  />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={Academic.primary} />
                  <StatusBadge label="Thinking" tone="blue" />
                </View>
              </View>
            ) : null
          }
        />

        {feedbackError ? <Text style={[styles.feedbackError, { color: colors.error }]}>{feedbackError}</Text> : null}

        <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom), backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.inputColumn}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.muted }]}
              placeholder="Ask about CAS services..."
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={400}
              returnKeyType="send"
              onSubmitEditing={() => sendText(input)}
              editable={!sending}
            />
            <Text style={[styles.inputCount, { color: colors.textSecondary }]}>{input.length}/400 · approved workflow answers only</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || sending || pressed) && styles.sendButtonMuted,
            ]}
            onPress={() => sendText(input)}
            disabled={sending || !input.trim()}>
            <AcademicIcon
              name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
              color="#FFFFFF"
              size={20}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Animated.View>
  );
}

export default function ChatbotScreen() {
  return (
    <RoleGuard allowed={['student', 'faculty', 'staff', 'super_admin']}>
      <ChatbotScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  header: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: 12,
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { color: Academic.navy, fontSize: 19, fontWeight: '600', letterSpacing: -0.25 },
  headerSub: { color: Academic.textSecondary, fontSize: 13, fontWeight: '400' },
  feedbackError: { width: '100%', maxWidth: 880, alignSelf: 'center', paddingHorizontal: Spacing.three, paddingBottom: 8, fontSize: 12, fontWeight: '600' },
  faqButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Academic.softBlue },
  faqButtonText: { color: Academic.primary, fontSize: 12, fontWeight: '500' },
  messageList: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: 14,
  },
  noticeBanner: {
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Academic.softBlue,
  },
  noticeText: { color: Academic.navy, fontSize: 13, lineHeight: 18, flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestionChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  suggestionText: { color: Academic.primary, fontSize: 13, fontWeight: '500' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  messageRowUser: { flexDirection: 'row-reverse' },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  assistantBubble: {
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    borderBottomLeftRadius: 5,
  },
  userBubble: {
    backgroundColor: Academic.primary,
    borderBottomRightRadius: 5,
  },
  messageText: { color: Academic.navy, fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#FFFFFF' },
  ticketNotice: { borderRadius: 10, padding: 8, backgroundColor: Academic.warningBg },
  ticketNoticeText: { color: Academic.warningText, fontSize: 12, fontWeight: '500' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  sourceText: { flex: 1, color: Academic.success, fontSize: 11, lineHeight: 15, fontWeight: '500' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 3 },
  feedbackPrompt: { color: Academic.textSecondary, fontSize: 11, fontWeight: '400' },
  feedbackButton: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: Academic.softBlue },
  feedbackButtonText: { color: Academic.primary, fontSize: 11, fontWeight: '600' },
  feedbackThanks: { color: Academic.success, fontSize: 11, fontWeight: '500' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  composer: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Academic.card,
    borderTopWidth: 1,
    borderTopColor: Academic.border,
  },
  inputColumn: { flex: 1, gap: 4 },
  input: {
    maxHeight: 104,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  inputCount: { paddingHorizontal: 14, fontSize: 10, fontWeight: '400' },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  sendButtonMuted: { opacity: 0.5 },
});

```

## Frontend/src/app/documents.tsx
**tsx · 487 lines · Expo Router screen/route for documents.tsx.**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  IconButton,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import RoleGuard from '@/components/role-guard';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { supabase } from '@/lib/supabase';

interface DocumentRequest {
  id: string;
  document_type: string;
  purpose: string;
  copies: number;
  status: string;
  remarks: string | null;
  requested_at: string;
}

type ScreenView = 'list' | 'new';

const DOC_TYPES: { value: string; label: string; description: string }[] = [
  { value: 'transcript_of_records', label: 'Transcript of Records', description: 'Official academic record of grades' },
  { value: 'certificate_of_enrollment', label: 'Certificate of Enrollment', description: 'Proof of current enrollment' },
  { value: 'certificate_of_good_moral', label: 'Certificate of Good Moral', description: 'Character reference certificate' },
  { value: 'honorable_dismissal', label: 'Honorable Dismissal', description: 'Transfer clearance document' },
  { value: 'diploma', label: 'Diploma', description: 'Graduation certificate' },
  { value: 'other', label: 'Other', description: 'Other document not listed above' },
];

const DOC_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map(item => [item.value, item.label]));

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  processing: 'Processing',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {
  submitted: 'blue',
  under_evaluation: 'warning',
  action_required: 'error',
  processing: 'warning',
  ready_for_pickup: 'success',
  completed: 'success',
  rejected: 'error',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function RequestCard({ item }: { item: DocumentRequest }) {
  const tone = STATUS_TONE[item.status] ?? 'muted';
  const colors = useTheme();
  return (
    <SurfaceCard style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.docIcon}>
          <AcademicIcon
            name={{ ios: 'doc.text', android: 'description', web: 'description' }}
            color={colors.primary}
            size={22}
          />
        </View>
        <View style={styles.requestText}>
          <Text style={[styles.docTitle, { color: colors.navy }]} numberOfLines={2}>{DOC_LABEL[item.document_type] ?? item.document_type}</Text>
          <Text style={[styles.requestMeta, { color: colors.textSecondary }]}>
            {item.copies} {item.copies === 1 ? 'copy' : 'copies'} - Requested {formatDate(item.requested_at)}
          </Text>
        </View>
        <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} tone={tone} />
      </View>
      <Text style={[styles.requestPurpose, { color: colors.textSecondary }]} numberOfLines={2}>Purpose: {item.purpose}</Text>
      {item.remarks ? (
        <View style={[styles.remarksBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.remarksLabel, { color: colors.primary }]}>Staff note</Text>
          <Text style={[styles.remarksText, { color: colors.navy }]}>{item.remarks}</Text>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

function DocumentsScreenContent() {
  const { profile, session } = useAuth();
  const colors = useTheme();
  const [view, setView] = useState<ScreenView>('list');
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docType, setDocType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [copies, setCopies] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = profile?.id ?? session?.user.id;

  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('document_requests')
      .select('id, document_type, purpose, copies, status, remarks, requested_at')
      .eq('student_id', userId)
      .eq('state', 'active')
      .order('requested_at', { ascending: false });
    if (error) {
      setLoadError('Your document requests could not be loaded. Pull down to retry.');
      return;
    }
    setLoadError(null);
    setRequests(data ?? []);
  }, [userId]);

  const load = useCallback(async () => { setLoading(true); await fetchRequests(); setLoading(false); }, [fetchRequests]);
  async function onRefresh() { setRefreshing(true); await fetchRequests(); setRefreshing(false); }

  useEffect(() => { void load(); }, [load]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter(item => {
      const label = DOC_LABEL[item.document_type] ?? item.document_type;
      const matchesSearch = !query || `${label} ${item.purpose} ${item.remarks ?? ''}`.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === 'all' || item.status === statusFilter);
    });
  }, [requests, search, statusFilter]);

  async function handleSubmit() {
    setFormError(null);
    if (!docType) { setFormError('Please select a document type.'); return; }
    if (!purpose.trim()) { setFormError('Please state the purpose of your request.'); return; }
    if (!userId) { setFormError('Session expired. Please sign in again.'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('document_requests').insert({
      student_id: userId,
      document_type: docType,
      purpose: purpose.trim(),
      copies,
      status: 'submitted',
    });
    setSubmitting(false);

    if (error) {
      setFormError('Failed to submit request. Please try again.');
    } else {
      setFormSuccess(true);
      setDocType('');
      setPurpose('');
      setCopies(1);
      await fetchRequests();
      setTimeout(() => { setFormSuccess(false); setView('list'); }, 1500);
    }
  }

  if (view === 'new') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}>
          <View style={styles.pageHeader}>
            <IconButton
              icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              onPress={() => setView('list')}
              label="Back"
              bg={colors.muted}
              color={colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.navy }]}>Request Document</Text>
              <Text style={[styles.pageSub, { color: colors.textSecondary }]}>Processing time depends on office verification.</Text>
            </View>
          </View>

          {formError ? <View style={styles.errorBox}><Text style={styles.errorText}>{formError}</Text></View> : null}
          {formSuccess ? <View style={styles.successBox}><Text style={styles.successText}>Request submitted successfully.</Text></View> : null}

          <SectionHeader title="Document Type" />
          <View style={styles.docTypeGrid}>
            {DOC_TYPES.map(item => {
              const active = docType === item.value;
              return (
                <Pressable key={item.value} onPress={() => setDocType(item.value)} style={[styles.docTypeCard, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.softBlue, borderColor: colors.primary }]}>
                  <Text style={[styles.docTypeLabel, { color: active ? colors.primary : colors.navy }]}>{item.label}</Text>
                  <Text style={[styles.docTypeDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionHeader title="Purpose" />
          <TextInput
            style={styles.textarea}
            placeholder="e.g. For scholarship application, employment requirements..."
            placeholderTextColor={colors.textSecondary}
            value={purpose}
            onChangeText={setPurpose}
            multiline
            numberOfLines={4}
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>{purpose.length}/300</Text>

          <View style={[styles.infoBox, { backgroundColor: colors.softBlue }]}>
            <AcademicIcon name={{ ios: 'info.circle', android: 'info', web: 'info' }} color={colors.primary} size={17} />
            <Text style={[styles.infoText, { color: colors.navy }]}>Use the purpose field for any instructions. File attachments are not part of this request workflow.</Text>
          </View>

          <SectionHeader title="Copies" />
          <View style={styles.copiesRow}>
            {[1, 2, 3, 4, 5].map(count => {
              const active = copies === count;
              return (
                <Pressable key={count} onPress={() => setCopies(count)} style={[styles.copyButton, active && styles.copyButtonActive]}>
                  <Text style={[styles.copyText, active && styles.copyTextActive]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.pressed]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit Request</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="Student services"
          title="Documents"
          subtitle="Track official CAS document requests."
          right={(
            <IconButton
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              onPress={() => setView('new')}
              label="New document request"
              bg="rgba(255,255,255,0.14)"
              color="#FFFFFF"
            />
          )}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRail}>
          {['submitted', 'under_evaluation', 'processing', 'ready_for_pickup', 'completed'].map(status => (
            <StatusBadge key={status} label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
          ))}
        </ScrollView>

        <View style={styles.requestFilters}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search document type, purpose, or staff note"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Search document requests"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRail}>
            {['all', ...Object.keys(STATUS_LABEL)].map(status => {
              const active = statusFilter === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.statusFilter, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.statusFilterActive]}>
                  <Text style={[styles.statusFilterText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{status === 'all' ? 'All requests' : STATUS_LABEL[status]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <BentoGrid>
          <BentoPanel size="compact">
            <MetricCard
              label="Requests shown"
              value={visibleRequests.length}
              tone="blue"
              icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            />
          </BentoPanel>
          <BentoPanel size="compact">
            <MetricCard
              label="In progress"
              value={visibleRequests.filter(item => ['submitted', 'under_evaluation', 'processing', 'action_required'].includes(item.status)).length}
              tone="warning"
              icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
            />
          </BentoPanel>
          <BentoPanel size="compact">
            <MetricCard
              label="Ready or completed"
              value={visibleRequests.filter(item => ['ready_for_pickup', 'completed'].includes(item.status)).length}
              tone="success"
              icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            />
          </BentoPanel>
        </BentoGrid>

        {loadError ? (
          <EmptyState title="Requests unavailable" message={loadError} icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }} />
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : visibleRequests.length === 0 ? (
          <EmptyState
            title={requests.length === 0 ? 'No document requests' : 'No matching requests'}
            message={requests.length === 0 ? 'Tap the plus button to request an official document.' : 'Try another search term or status filter.'}
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
          />
        ) : (
          <BentoGrid>
            <BentoPanel size="wide" style={styles.requestListPanel}>
              {visibleRequests.map(item => <RequestCard key={item.id} item={item} />)}
            </BentoPanel>
          </BentoGrid>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function DocumentsScreen() {
  return (
    <RoleGuard allowed={['student']}>
      <DocumentsScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  pageSub: { color: Academic.textSecondary, fontSize: 13, marginTop: 3 },
  legendRail: { gap: Spacing.two, paddingRight: Spacing.three },
  requestFilters: { gap: Spacing.two },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 14 },
  statusFilter: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999 },
  statusFilterActive: { backgroundColor: Academic.primary },
  statusFilterText: { fontSize: 12, fontWeight: '500' },
  requestListPanel: { gap: Spacing.three },
  loader: { marginTop: Spacing.four },
  requestCard: { gap: 12 },
  requestHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  docIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  requestText: { flex: 1, gap: 3 },
  docTitle: { color: Academic.navy, fontSize: 16, fontWeight: '600' },
  requestMeta: { color: Academic.textSecondary, fontSize: 12, lineHeight: 17 },
  requestPurpose: { color: Academic.textSecondary, fontSize: 13, lineHeight: 19 },
  remarksBox: { borderRadius: 12, padding: 10, gap: 3, backgroundColor: Academic.muted },
  remarksLabel: { color: Academic.primary, fontSize: 12, fontWeight: '500' },
  remarksText: { color: Academic.navy, fontSize: 13, lineHeight: 18 },
  docTypeGrid: { gap: Spacing.two },
  docTypeCard: {
    borderRadius: 16,
    padding: 14,
    gap: 4,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  docTypeCardActive: { borderColor: Academic.primary, backgroundColor: Academic.softBlue },
  docTypeLabel: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  docTypeLabelActive: { color: Academic.primary },
  docTypeDesc: { color: Academic.textSecondary, fontSize: 12, lineHeight: 17 },
  textarea: {
    minHeight: 112,
    borderRadius: 16,
    padding: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
    lineHeight: 21,
  },
  charCount: { color: Academic.textSecondary, fontSize: 12, textAlign: 'right' },
  copiesRow: { flexDirection: 'row', gap: Spacing.two },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  copyButtonActive: { backgroundColor: Academic.primary, borderColor: Academic.primary },
  copyText: { color: Academic.textSecondary, fontSize: 16, fontWeight: '500' },
  copyTextActive: { color: '#FFFFFF' },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '500' },
  infoBox: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Academic.softBlue },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

```

## Frontend/src/app/explore.tsx
**tsx · 637 lines · Expo Router screen/route for explore.tsx.**

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatRelative,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  priority: string;
  audience_roles: string[];
  publish_at: string;
  expires_at: string | null;
}

interface RoomChange {
  id: string;
  original_room: string;
  new_room: string;
  subject_code: string | null;
  section_code: string | null;
  reason: string | null;
  effective_at: string;
}

type UpdateFilter = 'all' | 'room' | 'announcements';
type RoomStatusFilter = 'all' | 'pending' | 'acknowledged';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function RoomUpdateCard({
  item,
  acknowledged,
  acknowledging,
  onAcknowledge,
}: {
  item: RoomChange;
  acknowledged: boolean;
  acknowledging: boolean;
  onAcknowledge: () => void;
}) {
  const colors = useTheme();
  return (
    <SurfaceCard accent={acknowledged ? 'success' : 'error'} style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleGroup}>
          <Text style={[styles.roomTitle, { color: colors.navy }]} numberOfLines={1}>
            {[item.subject_code, item.section_code].filter(Boolean).join(' - ') || 'Room Change'}
          </Text>
          <Text style={[styles.roomSub, { color: colors.textSecondary }]}>{formatRelative(item.effective_at)}</Text>
        </View>
        {!acknowledged ? <StatusBadge label="Urgent" tone="error" /> : <StatusBadge label="Acknowledged" tone="success" />}
      </View>
      <View style={[styles.roomCompare, { backgroundColor: colors.muted }]}>
        <View style={styles.roomCol}>
          <Text style={[styles.roomLabel, { color: colors.textSecondary }]}>Previous Room</Text>
          <Text style={[styles.oldRoom, { color: colors.textTertiary }]} numberOfLines={1}>{item.original_room}</Text>
        </View>
        <View style={[styles.pinBubble, { backgroundColor: colors.card }]}>
          <AcademicIcon
            name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            color={colors.primary}
            size={18}
          />
        </View>
        <View style={styles.roomCol}>
          <Text style={[styles.roomLabel, { color: colors.textSecondary }]}>New Room</Text>
          <Text style={[styles.newRoom, { color: colors.primary }]} numberOfLines={1}>{item.new_room}</Text>
        </View>
      </View>
      {item.reason ? <Text style={[styles.roomReason, { color: colors.textSecondary }]} numberOfLines={2}>{item.reason}</Text> : null}
      {acknowledged ? (
        <View style={[styles.ackState, { backgroundColor: colors.successBg }]}>
          <AcademicIcon
            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            color={colors.success}
            size={17}
          />
          <Text style={[styles.ackStateText, { color: colors.success }]}>Acknowledged</Text>
        </View>
      ) : (
        <Pressable
          onPress={onAcknowledge}
          disabled={acknowledging}
          style={({ pressed }) => [styles.ackButton, (pressed || acknowledging) && styles.pressed]}>
          {acknowledging ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.ackButtonText}>Acknowledge Change</Text>
          )}
        </Pressable>
      )}
    </SurfaceCard>
  );
}

function AnnouncementCard({
  item,
  expanded,
  onToggle,
}: {
  item: Announcement;
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle}>
      <SurfaceCard style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <View style={styles.announcementIcon}>
            <AcademicIcon
              name={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
              color={colors.primary}
              size={20}
            />
          </View>
          <View style={styles.announcementText}>
            <Text style={[styles.announcementTitle, { color: colors.navy }]} numberOfLines={expanded ? undefined : 2}>{item.title}</Text>
            <Text style={[styles.announcementDate, { color: colors.textSecondary }]}>{formatDate(item.publish_at)}</Text>
          </View>
          <View style={styles.announcementBadges}>
            {item.priority !== 'normal' ? <StatusBadge label={item.priority} tone={item.priority === 'urgent' ? 'error' : 'warning'} /> : null}
            {item.pinned ? <StatusBadge label="Pinned" tone="warning" /> : null}
          </View>
        </View>
        <Text style={[styles.announcementBody, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 3}>{item.body}</Text>
        {item.audience_roles.length > 0 ? (
          <Text style={[styles.announcementAudience, { color: colors.textSecondary }]} numberOfLines={1}>
            For {item.audience_roles.map(role => role === 'super_admin' ? 'Super admins' : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`).join(', ')}
          </Text>
        ) : null}
        <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? 'Show less' : 'Read full announcement'}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

export default function UpdatesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const colors = useTheme();
  const [filter, setFilter] = useState<UpdateFilter>('all');
  const [roomStatus, setRoomStatus] = useState<RoomStatusFilter>('all');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementSort, setAnnouncementSort] = useState<'newest' | 'oldest'>('newest');
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [roomChanges, setRoomChanges] = useState<RoomChange[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [liveTag, setLiveTag] = useState(false);

  const fetchRef = useRef<() => Promise<void>>(async () => {});
  const profileId = profile?.id;
  const isStudent = !profile || profile.role === 'student';
  const canCreateAnnouncements = profile?.role === 'staff' || profile?.role === 'super_admin';

  const fetchAnnouncements = useCallback(async () => {
    setError(null);
    const now = new Date().toISOString();
    const { data, error: dbErr } = await supabase
      .from('announcements')
      .select('id, title, body, pinned, priority, audience_roles, publish_at, expires_at')
      .eq('state', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('pinned', { ascending: false })
      .order('publish_at', { ascending: false });

    if (dbErr) {
      setError('Failed to load announcements. Pull down to retry.');
    } else {
      setAnnouncements(data ?? []);
    }
  }, []);

  const fetchRoomChanges = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('spatial_logs')
      .select('id, original_room, new_room, subject_code, section_code, reason, effective_at')
      .gte('effective_at', since)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('effective_at', { ascending: false })
      .limit(20);

    const changes = (data as unknown as RoomChange[]) ?? [];
    setRoomChanges(changes);

    if (profileId && changes.length > 0) {
      const { data: acks } = await supabase
        .from('spatial_log_acknowledgments')
        .select('spatial_log_id')
        .in('spatial_log_id', changes.map(change => change.id))
        .eq('student_id', profileId);
      setAcknowledgedIds(new Set((acks ?? []).map((ack: { spatial_log_id: string }) => ack.spatial_log_id)));
    }
  }, [profileId]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchAnnouncements(), isStudent ? fetchRoomChanges() : Promise.resolve()]);
  }, [fetchAnnouncements, fetchRoomChanges, isStudent]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  async function handleAcknowledge(id: string) {
    if (!profile?.id || acknowledgingId) return;
    setAckError(null);
    setAcknowledgingId(id);
    const { error: rpcError } = await supabase.rpc('acknowledge_room_change', {
      p_spatial_log_id: id,
    });
    if (!rpcError) {
      setAcknowledgedIds(prev => new Set([...prev, id]));
    } else {
      setAckError('We could not record that acknowledgement. Please try again.');
    }
    setAcknowledgingId(null);
  }

  useEffect(() => {
    fetchRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => {
    void load();

    const announcementsChannel = supabase
      .channel('announcements-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          setLiveTag(true);
          fetchRef.current();
          setTimeout(() => setLiveTag(false), 3000);
        },
      )
      .subscribe();

    const roomChannel = supabase
      .channel('updates-room-changes-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spatial_logs' },
        () => {
          setLiveTag(true);
          fetchRef.current();
          setTimeout(() => setLiveTag(false), 3000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [isStudent, load]);

  const showRoom = isStudent && (filter === 'all' || filter === 'room');
  const showAnnouncements = filter === 'all' || filter === 'announcements';
  const visibleRoomChanges = useMemo(() => roomChanges.filter(change => {
    const acknowledged = acknowledgedIds.has(change.id);
    return roomStatus === 'all' || (roomStatus === 'acknowledged' ? acknowledged : !acknowledged);
  }), [acknowledgedIds, roomChanges, roomStatus]);
  const visibleAnnouncements = useMemo(() => {
    const query = announcementSearch.trim().toLowerCase();
    return announcements
      .filter(item => !query || `${item.title} ${item.body} ${item.audience_roles.join(' ')}`.toLowerCase().includes(query))
      .sort((left, right) => {
        const pinnedOrder = Number(right.pinned) - Number(left.pinned);
        if (pinnedOrder !== 0) return pinnedOrder;
        const direction = announcementSort === 'newest' ? -1 : 1;
        return direction * (new Date(left.publish_at).getTime() - new Date(right.publish_at).getTime());
      });
  }, [announcementSearch, announcementSort, announcements]);
  const filters: { id: UpdateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...(isStudent ? [{ id: 'room' as const, label: 'Room Changes' }] : []),
    { id: 'announcements', label: 'Announcements' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label={isStudent ? 'Student updates' : 'Department updates'}
          title="Updates"
          subtitle="Stay current with official announcements and academic changes."
          right={liveTag ? <StatusBadge label="Live" tone="success" /> : undefined}
        />
        {canCreateAnnouncements ? (
          <View style={styles.pageHeaderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create announcement"
              onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'announce' } })}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <AcademicIcon
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                color="#FFFFFF"
                size={17}
              />
              <Text style={styles.createButtonText}>Create announcement</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {filters.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {showRoom ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
            {([
              ['all', 'All room changes'],
              ['pending', 'Awaiting acknowledgement'],
              ['acknowledged', 'Acknowledged'],
            ] as const).map(([value, label]) => {
              const active = roomStatus === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRoomStatus(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterChip, { backgroundColor: active ? colors.softBlue : colors.muted }, active && styles.filterChipSecondaryActive]}>
                  <Text style={[styles.filterText, { color: active ? colors.primary : colors.textSecondary }, active && styles.filterTextActiveSecondary]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {showAnnouncements ? (
          <View style={styles.announcementToolbar}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
              <TextInput
                value={announcementSearch}
                onChangeText={setAnnouncementSearch}
                placeholder="Search announcements"
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
                accessibilityLabel="Search announcements"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
              {(['newest', 'oldest'] as const).map(value => {
                const active = announcementSort === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setAnnouncementSort(value)}
                    style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
                    <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>{value === 'newest' ? 'Newest first' : 'Oldest first'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricCard
            label="Announcements"
            value={announcements.length}
            tone="blue"
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
          />
          <MetricCard
            label="Room changes"
            value={roomChanges.length}
            tone="warning"
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
          />
          <MetricCard
            label="Awaiting acknowledgement"
            value={roomChanges.filter(change => !acknowledgedIds.has(change.id)).length}
            tone="success"
            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}
        {ackError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{ackError}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <BentoGrid>
            {showRoom ? (
              <BentoPanel size="medium" style={styles.bentoSection}>
                <SectionHeader
                  title="Room Changes"
                  badge={roomChanges.filter(change => !acknowledgedIds.has(change.id)).length
                    ? `${roomChanges.filter(change => !acknowledgedIds.has(change.id)).length} New`
                    : undefined}
                />
                {visibleRoomChanges.length === 0 ? (
                  <EmptyState
                    title={roomChanges.length === 0 ? 'No room changes' : 'No matching room changes'}
                    message={roomChanges.length === 0 ? 'Relocation notices from the last 24 hours will appear here.' : 'Try another acknowledgement filter.'}
                    icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                  />
                ) : (
                  visibleRoomChanges.map(change => (
                    <RoomUpdateCard
                      key={change.id}
                      item={change}
                      acknowledged={acknowledgedIds.has(change.id)}
                      acknowledging={acknowledgingId === change.id}
                      onAcknowledge={() => handleAcknowledge(change.id)}
                    />
                  ))
                )}
              </BentoPanel>
            ) : null}

            {showAnnouncements ? (
              <BentoPanel size="wide" style={styles.bentoSection}>
                <SectionHeader title="Announcements" />
                {visibleAnnouncements.length === 0 ? (
                  <EmptyState
                    title={announcements.length === 0 ? 'No announcements' : 'No matching announcements'}
                    message={announcements.length === 0 ? 'Official CAS academic updates will appear here.' : 'Try a different search term or sort order.'}
                    icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
                  />
                ) : (
                  visibleAnnouncements.map(item => (
                    <AnnouncementCard
                      key={item.id}
                      item={item}
                      expanded={expandedAnnouncementId === item.id}
                      onToggle={() => setExpandedAnnouncementId(current => current === item.id ? null : item.id)}
                    />
                  ))
                )}
              </BentoPanel>
            ) : null}
          </BentoGrid>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: 152,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  pageHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  pageHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  createButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Academic.primary,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterRail: { gap: Spacing.two, paddingRight: Spacing.three },
  announcementToolbar: { gap: Spacing.two },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 14 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bentoSection: { gap: Spacing.three },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Academic.muted,
  },
  filterChipActive: { backgroundColor: Academic.primary },
  filterChipSecondaryActive: { borderWidth: 1, borderColor: Academic.primary },
  filterText: { color: Academic.textSecondary, fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  filterTextActiveSecondary: { color: Academic.primary },
  loader: { marginTop: Spacing.four },
  roomCard: { gap: 13 },
  roomHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  roomTitleGroup: { flex: 1, gap: 2 },
  roomTitle: { color: Academic.navy, fontSize: 16, fontWeight: '600' },
  roomSub: { color: Academic.textSecondary, fontSize: 13 },
  roomCompare: {
    minHeight: 68,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Academic.muted,
  },
  roomCol: { flex: 1, gap: 4 },
  roomLabel: { color: Academic.textSecondary, fontSize: 12 },
  oldRoom: {
    color: '#8EA0B8',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
  newRoom: { color: Academic.primary, fontSize: 16, fontWeight: '500' },
  pinBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.card,
    boxShadow: '0 10px 28px rgba(50, 82, 87, 0.11)',
  },
  roomReason: { color: Academic.textSecondary, fontSize: 13, lineHeight: 18 },
  ackButton: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  ackButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  ackState: {
    minHeight: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Academic.successBg,
  },
  ackStateText: { color: Academic.success, fontSize: 14, fontWeight: '500' },
  announcementCard: { gap: 12 },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  announcementBadges: { alignItems: 'flex-end', gap: 5 },
  announcementIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  announcementText: { flex: 1, gap: 2 },
  announcementTitle: { color: Academic.navy, fontSize: 16, fontWeight: '600' },
  announcementDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  announcementBody: { color: Academic.textSecondary, fontSize: 14, lineHeight: 20 },
  announcementAudience: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  expandText: { color: Academic.primary, fontSize: 12, fontWeight: '500', textAlign: 'right' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
});

```

## Frontend/src/app/faq.tsx
**tsx · 4 lines · Expo Router screen/route for faq.tsx.**

```tsx
import FaqScreen from '@/components/faq/faq-screen';

export default FaqScreen;

```

## Frontend/src/app/index.tsx
**tsx · 17 lines · Expo Router screen/route for index.tsx.**

```tsx
import { useAuth } from '@/context/auth';
import AdminDashboardHome from '@/components/dashboard/admin-dashboard-home';
import FacultyDashboard   from '@/components/dashboard/faculty-dashboard';
import StaffDashboard     from '@/components/dashboard/staff-dashboard';
import StudentDashboard   from '@/components/dashboard/student-dashboard';

export default function HomeScreen() {
  const { profile } = useAuth();

  switch (profile?.role) {
    case 'super_admin': return <AdminDashboardHome />;
    case 'staff':       return <StaffDashboard />;
    case 'faculty':     return <FacultyDashboard />;
    default:            return <StudentDashboard />;
  }
}

```

## Frontend/src/app/profile.tsx
**tsx · 381 lines · Expo Router screen/route for profile.tsx.**

```tsx
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui/academic-ui';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { type ThemePreference, useAppTheme } from '@/context/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  staff: 'CAS Staff',
  super_admin: 'Super Administrator',
};

const ROLE_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error'> = {
  student: 'blue',
  faculty: 'warning',
  staff: 'success',
  super_admin: 'error',
};

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: Parameters<typeof AcademicIcon>[0]['name'];
}[] = [
  { value: 'light', label: 'Light', description: 'Always use the light appearance', icon: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' } },
  { value: 'dark', label: 'Dark', description: 'Always use the dark appearance', icon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' } },
  { value: 'system', label: 'Follow device', description: 'Match your device or browser', icon: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' } },
];

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const { preference, setPreference } = useAppTheme();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wideLayout = width >= 900;
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const role = profile?.role ?? 'student';
  const currentDisplayName = displayName.trim() || profile?.display_name || '';
  const firstName = currentDisplayName.split(' ')[0] || 'there';
  const canEdit = profile?.state !== 'archived_read_only';

  async function handleSave() {
    if (!displayName.trim()) { setSaveError('Name cannot be empty.'); return; }
    if (!profile || !canEdit) { setSaveError('This profile cannot be edited.'); return; }
    setSaveError(null);
    setSaving(true);

    const { error } = await supabase
      .from('users_account_registry')
      .update({ display_name: displayName.trim() })
      .eq('id', profile!.id);

    setSaving(false);
    if (error) {
      setSaveError('Failed to update. Please try again.');
    } else {
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <RoleHeroHeader
          label="CAS Assist Profile"
          title={`Hello, ${firstName}`}
          subtitle="Manage your institutional account details."
          right={
            <View style={[styles.avatar, { backgroundColor: theme.softBlue, borderColor: theme.border }]}>
              <Text style={[styles.avatarLetter, { color: theme.primary }]}>{(currentDisplayName || 'U')[0].toUpperCase()}</Text>
            </View>
          }
        />

        <SurfaceCard style={styles.identityCard}>
          {!editing ? (
            <Text style={[styles.displayName, { color: theme.navy }]}>{currentDisplayName || 'No name set'}</Text>
          ) : (
            <TextInput
              style={[
                styles.nameInput,
                { color: theme.text, backgroundColor: theme.muted, borderColor: theme.border },
              ]}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              selectTextOnFocus
              maxLength={60}
              placeholder="Display name"
              placeholderTextColor={Academic.textSecondary}
            />
          )}
          <View style={styles.badgeRow}>
            <StatusBadge label={ROLE_LABEL[role] ?? role} tone={ROLE_TONE[role] ?? 'blue'} />
            <StatusBadge
              label={profile?.state === 'archived_read_only' ? 'Read-only' : 'Active'}
              tone={profile?.state === 'archived_read_only' ? 'warning' : 'success'}
            />
          </View>
        </SurfaceCard>

        {saveError ? <View style={styles.errorBox}><Text style={styles.errorText}>{saveError}</Text></View> : null}
        {saveSuccess ? <View style={styles.successBox}><Text style={styles.successText}>Profile updated successfully.</Text></View> : null}
        {!canEdit ? <View style={[styles.readOnlyBox, { backgroundColor: theme.warningBg }]}><AcademicIcon name={{ ios: 'lock', android: 'lock', web: 'lock' }} color={theme.warning} size={17} /><Text style={[styles.readOnlyText, { color: theme.navy }]}>This account is read-only. Contact a CAS administrator to change account details.</Text></View> : null}

        <View style={[styles.sectionGrid, wideLayout && styles.sectionGridWide]}>
          <View style={[styles.sectionColumn, wideLayout && styles.accountColumnWide]}>
            <SectionHeader title="Account" />
            <SurfaceCard style={styles.infoCard}>
              <InfoRow icon={{ ios: 'envelope', android: 'mail', web: 'mail' }} label="Email" value={profile?.email ?? '-'} />
              {role === 'student' ? (
                <>
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  <InfoRow
                    icon={{ ios: 'number', android: 'badge', web: 'badge' }}
                    label="Student Number"
                    value={profile?.student_number ?? 'Not recorded'}
                  />
                </>
              ) : null}
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <InfoRow icon={{ ios: 'person.badge.key', android: 'badge', web: 'badge' }} label="Role" value={ROLE_LABEL[role] ?? role} />
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <InfoRow
                icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
                label="Status"
                value={profile?.state === 'archived_read_only' ? 'Archived read-only' : 'Active'}
              />
            </SurfaceCard>
          </View>

          <View style={[styles.sectionColumn, wideLayout && styles.appearanceColumnWide]}>
            <SectionHeader title="Appearance" />
            <SurfaceCard style={styles.appearanceCard}>
              {THEME_OPTIONS.map((option, index) => {
                const selected = preference === option.value;
                return (
                  <View key={option.value}>
                    {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.border }]} /> : null}
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setPreference(option.value)}
                      style={({ pressed }) => [
                        styles.themeOption,
                        selected && { backgroundColor: theme.softBlue },
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.themeIcon, { backgroundColor: selected ? theme.softBlue : theme.muted }]}>
                        <AcademicIcon name={option.icon} color={selected ? theme.primary : theme.textSecondary} size={20} />
                      </View>
                      <View style={styles.themeCopy}>
                        <Text style={[styles.themeLabel, { color: theme.navy }]}>{option.label}</Text>
                        <Text style={[styles.themeDescription, { color: theme.textSecondary }]}>{option.description}</Text>
                      </View>
                      <AcademicIcon
                        name={selected
                          ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                          : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
                        color={selected ? theme.primary : theme.textSecondary}
                        size={21}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </SurfaceCard>
          </View>
        </View>

        <SectionHeader title="Institution" />
        <SurfaceCard style={styles.infoCard}>
          <InfoRow icon={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }} label="System" value="CAS Assist v1.0" />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <InfoRow icon={{ ios: 'graduationcap', android: 'school', web: 'school' }} label="College" value="College of Arts and Sciences" />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <InfoRow icon={{ ios: 'building.2', android: 'domain', web: 'domain' }} label="School" value="New Era University" />
        </SurfaceCard>

        <View style={[styles.profileActions, wideLayout && styles.profileActionsWide]}>
          {!editing ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, wideLayout && styles.wideActionButton, !canEdit && styles.disabledButton, pressed && styles.pressed]}
              onPress={() => { setEditing(true); setDisplayName(profile?.display_name ?? ''); }}
              disabled={!canEdit}>
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Edit Display Name</Text>
            </Pressable>
          ) : (
            <View style={[styles.editRow, wideLayout && styles.wideEditRow]}>
              <Pressable style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]} onPress={() => setEditing(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </Pressable>
            </View>
          )}

          <Pressable style={({ pressed }) => [styles.signOutButton, wideLayout && styles.wideActionButton, { backgroundColor: theme.errorBg, borderColor: theme.errorBg }, pressed && styles.pressed]} onPress={signOut}>
            <Text style={[styles.signOutText, { color: theme.error }]}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof AcademicIcon>[0]['name'];
  label: string;
  value: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <AcademicIcon name={icon} color={colors.textSecondary} size={18} />
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.navy }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.78 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarLetter: { fontSize: 22, fontWeight: '600' },
  identityCard: { gap: Spacing.two },
  displayName: { color: Academic.navy, fontSize: 22, fontWeight: '600', letterSpacing: -0.35 },
  nameInput: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '600',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sectionGrid: { gap: Spacing.three },
  sectionGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionColumn: { flex: 1, gap: Spacing.two, minWidth: 0 },
  accountColumnWide: { flex: 1.08 },
  appearanceColumnWide: { flex: 0.92 },
  infoCard: { paddingVertical: 4 },
  appearanceCard: { padding: 6 },
  themeOption: {
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCopy: { flex: 1, gap: 2 },
  themeLabel: { color: Academic.navy, fontSize: 14, fontWeight: '600' },
  themeDescription: { color: Academic.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  infoRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  infoLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoLabel: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  infoValue: { color: Academic.navy, fontSize: 14, fontWeight: '600', flex: 1, maxWidth: '60%', textAlign: 'right' },
  separator: { height: 1, backgroundColor: Academic.border },
  profileActions: { gap: Spacing.two },
  profileActionsWide: { flexDirection: 'row', alignItems: 'stretch' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  wideActionButton: { flex: 1 },
  secondaryButtonText: { color: Academic.primary, fontSize: 14, fontWeight: '500' },
  editRow: { flexDirection: 'row', gap: Spacing.two },
  wideEditRow: { flex: 1 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  cancelButtonText: { color: Academic.textSecondary, fontSize: 15, fontWeight: '500' },
  saveButton: {
    flex: 2,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  signOutButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  signOutText: { color: Academic.error, fontSize: 15, fontWeight: '500' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '500' },
  readOnlyBox: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Academic.warningBg },
  readOnlyText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '400' },
  disabledButton: { opacity: 0.5 },
});

```

## Frontend/src/app/ticket/[id].tsx
**tsx · 11 lines · Expo Router screen/route for ticket/[id].tsx.**

```tsx
import { useLocalSearchParams } from 'expo-router';

import TicketDetailScreen from '@/components/tickets/ticket-detail-screen';

export default function TicketDetailRoute() {
  const { id, created } = useLocalSearchParams<{ id?: string | string[]; created?: string | string[] }>();
  const ticketId = Array.isArray(id) ? id[0] : id;
  const showCreated = Array.isArray(created) ? created[0] === '1' : created === '1';
  return <TicketDetailScreen ticketId={ticketId} showCreated={showCreated} />;
}

```

## Frontend/src/app/tickets.tsx
**tsx · 857 lines · Expo Router screen/route for tickets.tsx.**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  ActionButton,
  AppBackdrop,
  EmptyState,
  IconButton,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import RoleGuard from '@/components/role-guard';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { supabase } from '@/lib/supabase';

const EXEC_E = (5 + 45 + 15) / 3;
const ACTIVE_STATUSES = ['submitted', 'under_evaluation', 'action_required'];

interface QueueMetrics {
  L: number;
  lambda: number;
  W: number | null;
  position: number | null;
  estimatedMinutes: number | null;
}

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at?: string;
}

type RequestFilter = 'active' | 'completed' | 'all';
type ScreenView = 'list' | 'new';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'In Queue',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Completed',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'warning',
  resolved: 'success',
};

const CATEGORIES = [
  'General Inquiry',
  'Grades',
  'Document Request',
  'Others',
];

async function computeQueueMetrics(userId: string): Promise<QueueMetrics> {
  const since24h = new Date(Date.now() - 86_400_000).toISOString();

  const [{ data: unresolved }, { count: lambda }] = await Promise.all([
    supabase
      .from('advising_ticket_pipeline')
      .select('id, student_id, created_at')
      .in('status', ACTIVE_STATUSES)
      .eq('state', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('advising_ticket_pipeline')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
  ]);

  const L = unresolved?.length ?? 0;
  const lam = lambda ?? 0;
  const W = lam > 0 ? L / lam : null;
  const studentTickets = (unresolved ?? []).filter(t => t.student_id === userId);
  let position: number | null = null;

  if (studentTickets.length > 0) {
    const idx = (unresolved ?? []).findIndex(t => t.id === studentTickets[0].id);
    position = idx + 1;
  }

  const estimatedMinutes = position !== null ? Math.round(EXEC_E * position) : null;
  return { L, lambda: lam, W, position, estimatedMinutes };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function CurrentTicketCard({
  ticket,
  metrics,
}: {
  ticket: Ticket;
  metrics: QueueMetrics | null;
}) {
  const minutes = metrics?.estimatedMinutes;
  const colors = useTheme();

  return (
    <View style={[styles.currentTicketCard, { backgroundColor: colors.primary }]}>
      <View style={styles.currentText}>
        <Text style={[styles.currentLabel, { color: colors.background }]}>Current Active Ticket</Text>
        <View style={styles.currentRefRow}>
          <Text style={[styles.currentRef, { color: colors.background }]}>{shortRef(ticket.id)}</Text>
          <View style={styles.currentCategoryPill}>
            <Text style={[styles.currentCategoryText, { color: colors.background }]}>{formatCategory(ticket.category)}</Text>
          </View>
        </View>
        <View style={styles.currentStats}>
          <View>
            <Text style={[styles.currentStatLabel, { color: colors.background }]}>Students ahead</Text>
            <Text style={[styles.currentStatValue, { color: colors.background }]}>
              {metrics?.position ? Math.max(metrics.position - 1, 0) : '--'}
            </Text>
          </View>
          <View>
            <Text style={[styles.currentStatLabel, { color: colors.background }]}>Est. wait</Text>
            <Text style={[styles.currentStatValue, { color: colors.background }]}>
              {minutes ? `${minutes} min` : '--'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.currentClock}>
        <AcademicIcon
          name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          color="rgba(255,255,255,0.24)"
          size={72}
        />
      </View>
    </View>
  );
}

function RequestListCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const isComplete = ticket.status === 'resolved';
  const tone = STATUS_TONE[ticket.status] ?? 'muted';
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open request ${shortRef(ticket.id)}`}
      style={({ pressed }) => [styles.requestPressable, pressed && styles.pressed]}>
      <SurfaceCard style={styles.requestCard}>
      <View style={[styles.requestIcon, { backgroundColor: isComplete ? colors.successBg : colors.muted }]}>
        <AcademicIcon
          name={
            isComplete
              ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
              : ticket.status === 'under_evaluation'
                ? { ios: 'clock', android: 'schedule', web: 'schedule' }
                : { ios: 'doc.text', android: 'description', web: 'description' }
          }
          color={isComplete ? colors.success : colors.primary}
          size={22}
        />
      </View>
      <View style={styles.requestCardBody}>
        <View style={styles.requestMetaRow}>
          <Text style={[styles.requestRef, { color: colors.primary }]}>{shortRef(ticket.id)}</Text>
          <StatusBadge label={STATUS_LABEL[ticket.status] ?? ticket.status} tone={tone} />
        </View>
        <Text style={[styles.requestTitle, { color: colors.navy }]} numberOfLines={1}>{formatCategory(ticket.category)}</Text>
        <Text style={[styles.requestDate, { color: colors.textSecondary }]} numberOfLines={1}>
          {isComplete ? 'Completed' : 'Submitted'}: {formatDateTime(ticket.created_at)}
        </Text>
      </View>
      <AcademicIcon
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        color={colors.textTertiary}
        size={18}
      />
      </SurfaceCard>
    </Pressable>
  );
}

type RequestFilterOption = { value: string; label: string };

function RequestFilterSelect({
  label,
  value,
  options,
  expanded,
  onPress,
}: {
  label: string;
  value: string;
  options: RequestFilterOption[];
  expanded: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  const selected = options.find(option => option.value === value)?.label ?? value;

  return (
    <View style={styles.requestFilterSelect}>
      <Text style={[styles.requestFilterLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected}`}
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.requestFilterControl, { backgroundColor: colors.muted, borderColor: expanded ? colors.primary : colors.border }, pressed && styles.pressed]}>
        <Text style={[styles.requestFilterControlText, { color: colors.text }]} numberOfLines={1}>{selected}</Text>
        <AcademicIcon
          name={expanded
            ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
            : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          color={colors.textSecondary}
          size={16}
          animated={false}
        />
      </Pressable>
    </View>
  );
}

function NewTicketForm({
  onBack,
  onSubmitted,
  userId,
}: {
  onBack: () => void;
  onSubmitted: (ticketId: string | null) => Promise<void>;
  userId: string | undefined;
}) {
  const colors = useTheme();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);
    if (!category) { setFormError('Please select a category.'); return; }
    if (!description.trim()) { setFormError('Please describe your concern.'); return; }
    if (!userId) { setFormError('User session expired. Please sign in again.'); return; }

    setSubmitting(true);
    const { data, error } = await supabase
      .from('advising_ticket_pipeline')
      .insert({
        student_id: userId,
        category: category.toLowerCase().replace(/ /g, '_'),
        description: description.trim(),
        priority: 'normal',
        status: 'submitted',
      })
      .select('id')
      .single();
    setSubmitting(false);

    if (error) {
      setFormError('Failed to submit request. Please try again.');
    } else {
      setCategory('');
      setDescription('');
      await onSubmitted(data?.id ?? null);
      onBack();
    }
  }

  return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scroll}>
        <View style={styles.pageHeader}>
          <IconButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            onPress={onBack}
            label="Back to requests"
            bg={colors.muted}
            color={colors.textSecondary}
          />
          <Text style={[styles.pageTitle, { color: colors.navy }]}>New Request</Text>
        </View>

        <Text style={[styles.formIntro, { color: colors.textSecondary }]}>Choose the service area and describe what the CAS service desk needs to help with. Fields marked required must be completed before submission.</Text>

        {formError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <SectionHeader title="Request Type · Required" />
        <View style={styles.chipGrid}>
          {CATEGORIES.map(c => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.choiceChip, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={[styles.choiceChipText, { color: active ? colors.background : colors.textSecondary }]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="Details · Required" />
        <TextInput
          style={[styles.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="Please provide as much detail as possible..."
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          maxLength={800}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.textSecondary }]}>{description.length}/800</Text>

        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
          <Text style={[styles.cancelButtonText, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.pressed]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketsScreenContent() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const colors = useTheme();
  const [view, setView] = useState<ScreenView>('list');
  const [filter, setFilter] = useState<RequestFilter>('active');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [openRequestFilter, setOpenRequestFilter] = useState<'status' | 'category' | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updateAlert, setUpdateAlert] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = profile?.id ?? session?.user.id;
  const fetchRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const fetchTickets = useCallback(async () => {
    if (!userId) return;
    const [{ data, error }, queueMetrics] = await Promise.all([
      supabase
        .from('advising_ticket_pipeline')
        .select('id, category, description, status, priority, created_at, updated_at')
        .eq('student_id', userId)
        .eq('state', 'active')
        .order('created_at', { ascending: false }),
      computeQueueMetrics(userId),
    ]);

    setLoadError(error ? 'We could not load your requests. Please refresh and try again.' : null);
    setTickets(data ?? []);
    setMetrics(queueMetrics);
  }, [userId]);

  useEffect(() => { fetchRef.current = fetchTickets; }, [fetchTickets]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchTickets();
    setLoading(false);
  }, [fetchTickets]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    void load();

    const channel = supabase
      .channel(`tickets-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'advising_ticket_pipeline',
          filter: `student_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          setUpdateAlert(`Your request is now ${STATUS_LABEL[newStatus] ?? newStatus}.`);
          setTimeout(() => setUpdateAlert(null), 4000);
          fetchRef.current?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const activeTickets = tickets.filter(t => ACTIVE_STATUSES.includes(t.status));
  const currentTicket = activeTickets[0];

  const categoryOptions = useMemo(() => (
    Array.from(new Set(tickets.map(ticket => ticket.category).filter(Boolean))).sort()
  ), [tickets]);

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter(ticket => {
      const matchesStatus = filter === 'active'
        ? ACTIVE_STATUSES.includes(ticket.status)
        : filter === 'completed'
          ? ticket.status === 'resolved'
          : true;
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      const searchable = `${shortRef(ticket.id)} ${ticket.category} ${ticket.description}`.toLowerCase();
      return matchesStatus && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [categoryFilter, filter, query, tickets]);

  const requestStatusOptions = useMemo(() => [
    { value: 'active', label: 'Active requests' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All requests' },
  ], []);
  const requestCategoryOptions = useMemo(() => [
    { value: 'all', label: 'All categories' },
    ...categoryOptions.map(value => ({ value, label: formatCategory(value) })),
  ], [categoryOptions]);
  const openRequestOptions = openRequestFilter === 'status' ? requestStatusOptions : requestCategoryOptions;
  const hasRequestFilters = Boolean(query || categoryFilter !== 'all' || filter !== 'active');

  function chooseRequestFilter(value: string) {
    if (openRequestFilter === 'status') setFilter(value as RequestFilter);
    if (openRequestFilter === 'category') setCategoryFilter(value);
    setOpenRequestFilter(null);
  }

  function resetRequestFilters() {
    setFilter('active');
    setQuery('');
    setCategoryFilter('all');
    setOpenRequestFilter(null);
  }

  async function handleSubmitted(ticketId: string | null) {
    await fetchTickets();
    setUpdateAlert('Request submitted successfully.');
    if (ticketId) {
      router.push(`/ticket/${ticketId}?created=1` as never);
    }
  }

  if (view === 'new') {
    return (
      <NewTicketForm
        onBack={() => setView('list')}
        onSubmitted={handleSubmitted}
        userId={userId}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="Student services"
          title="My Requests"
          subtitle="Track your assistance queue and request history."
          stackOnMobile
          right={(
            <ActionButton
              label="New Request"
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              onPress={() => setView('new')}
              accessibilityLabel="Create a new request"
              style={styles.newRequestButton}
            />
          )}
        />

        {updateAlert ? (
          <View style={styles.infoBanner}>
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>{updateAlert}</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        <SurfaceCard style={styles.filterCard}>
          <View style={styles.searchFieldShell}>
            <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search reference, category, or description"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Search my requests"
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
          </View>
          <View style={styles.requestFilterToolbar}>
            <RequestFilterSelect label="Status" value={filter} options={requestStatusOptions} expanded={openRequestFilter === 'status'} onPress={() => setOpenRequestFilter(value => value === 'status' ? null : 'status')} />
            <RequestFilterSelect label="Category" value={categoryFilter} options={requestCategoryOptions} expanded={openRequestFilter === 'category'} onPress={() => setOpenRequestFilter(value => value === 'category' ? null : 'category')} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset request filters"
              disabled={!hasRequestFilters}
              onPress={resetRequestFilters}
              style={({ pressed }) => [styles.requestResetButton, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, !hasRequestFilters && styles.requestResetDisabled, pressed && styles.pressed]}>
              <AcademicIcon name={{ ios: 'arrow.counterclockwise', android: 'restart_alt', web: 'restart_alt' }} color={colors.primary} size={16} animated={false} />
              <Text style={[styles.requestResetText, { color: colors.primary }]}>Reset</Text>
            </Pressable>
          </View>
          {openRequestFilter ? (
            <View style={[styles.requestFilterMenu, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Text style={[styles.requestFilterMenuLabel, { color: colors.textSecondary }]}>Choose {openRequestFilter === 'status' ? 'status' : 'category'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestFilterOptions}>
                {openRequestOptions.map(option => {
                  const selected = (openRequestFilter === 'status' && filter === option.value)
                    || (openRequestFilter === 'category' && categoryFilter === option.value);
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => chooseRequestFilter(option.value)}
                      style={({ pressed }) => [styles.requestFilterOption, { backgroundColor: selected ? colors.primary : colors.muted }, pressed && styles.pressed]}>
                      <Text style={[styles.requestFilterOptionText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </SurfaceCard>

        <BentoGrid style={styles.metricGrid}>
          <BentoPanel size="compact" style={styles.metricPanel}>
            <MetricCard
              label="Active requests"
              value={activeTickets.length}
              tone="blue"
              icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
            />
          </BentoPanel>
          <BentoPanel size="compact" style={styles.metricPanel}>
            <MetricCard
              label="Completed"
              value={tickets.filter(ticket => ticket.status === 'resolved').length}
              tone="success"
              icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            />
          </BentoPanel>
          <BentoPanel size="compact" style={styles.metricPanel}>
            <MetricCard
              label="Total requests"
              value={tickets.length}
              tone="muted"
              icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            />
          </BentoPanel>
        </BentoGrid>

        <BentoGrid style={styles.currentTicketGrid}>
          <BentoPanel size="wide" style={styles.fullWidthPanel}>
            {currentTicket ? (
              <CurrentTicketCard ticket={currentTicket} metrics={metrics} />
            ) : (
              <EmptyState
                title="No current active ticket"
                message="A queue position will appear here when you submit a request."
                icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              />
            )}
          </BentoPanel>
        </BentoGrid>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : visibleTickets.length === 0 ? (
          <EmptyState
            title={query || categoryFilter !== 'all' ? 'No requests match these filters' : filter === 'active' ? 'No active requests' : 'No requests found'}
            message={query || categoryFilter !== 'all'
              ? 'Clear a filter or try a different search.'
              : filter === 'active'
              ? 'Submitted requests that are still being processed will appear here.'
              : 'Try another filter or create a new request.'}
            icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
          />
        ) : (
          <View style={styles.requestList}>
            {visibleTickets.map(ticket => (
              <RequestListCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => router.push(`/ticket/${ticket.id}` as never)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function TicketsScreen() {
  return (
    <RoleGuard allowed={['student']}>
      <TicketsScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: 152,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  pageHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  newRequestButton: { minWidth: 146, alignSelf: 'flex-start' },
  formIntro: { fontSize: 14, lineHeight: 21, marginTop: -Spacing.two },
  infoBanner: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: Academic.softBlue,
  },
  infoBannerText: { color: Academic.primary, fontSize: 13, fontWeight: '500' },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: Academic.muted,
  },
  metricGrid: { alignItems: 'stretch' },
  metricPanel: { minWidth: 0 },
  currentTicketGrid: { alignItems: 'stretch' },
  fullWidthPanel: { flexBasis: '100%' },
  requestList: { width: '100%', gap: Spacing.two },
  requestPressable: { width: '100%', borderRadius: 16 },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Academic.card,
    boxShadow: '0 8px 24px rgba(50, 82, 87, 0.11)',
  },
  segmentText: { color: Academic.textSecondary, fontSize: 14, fontWeight: '500' },
  segmentTextActive: { color: Academic.navy },
  currentTicketCard: {
    minHeight: 164,
    borderRadius: 16,
    padding: Spacing.four,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Academic.primary,
  },
  currentText: { flex: 1, gap: 8 },
  currentLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  currentRefRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  currentRef: { color: '#FFFFFF', fontSize: 40, lineHeight: 44, fontWeight: '600' },
  currentCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  currentCategoryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  currentStats: { flexDirection: 'row', gap: Spacing.four, marginTop: 2 },
  currentStatLabel: { color: '#FFFFFF', opacity: 0.92, fontSize: 12, fontWeight: '400' },
  currentStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  currentClock: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 7,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  requestIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  requestIconDone: { backgroundColor: Academic.successBg },
  requestCardBody: { flex: 1, gap: 3 },
  requestMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  requestRef: { color: Academic.primary, fontSize: 13, fontWeight: '600' },
  requestTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  requestDate: { color: Academic.textSecondary, fontSize: 13 },
  filterCard: { gap: Spacing.two, padding: Spacing.three },
  searchFieldShell: {
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: Academic.border,
    backgroundColor: Academic.muted,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 9 },
  requestFilterToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  requestFilterSelect: { minWidth: 146, flexGrow: 1, gap: 4 },
  requestFilterLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  requestFilterControl: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  requestFilterControlText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '500' },
  requestResetButton: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  requestResetDisabled: { opacity: 0.42 },
  requestResetText: { fontSize: 12, fontWeight: '500' },
  requestFilterMenu: { borderWidth: 1, borderRadius: 12, padding: Spacing.two, gap: 7 },
  requestFilterMenuLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  requestFilterOptions: { gap: 7 },
  requestFilterOption: { minHeight: 32, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  requestFilterOptionText: { fontSize: 11, fontWeight: '500' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '500', marginRight: 2 },
  filterChip: { minHeight: 32, paddingHorizontal: 11, borderRadius: 999, justifyContent: 'center' },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  clearFilterButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 5 },
  clearFilterText: { fontSize: 12, fontWeight: '500' },
  loader: { marginTop: Spacing.four },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  choiceChipActive: { backgroundColor: Academic.primary, borderColor: Academic.primary },
  choiceChipText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: '#FFFFFF' },
  textarea: {
    minHeight: 150,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    lineHeight: 21,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  charCount: { color: Academic.textSecondary, fontSize: 12, textAlign: 'right' },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '500' },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: Academic.errorBg,
  },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
});

```

## Frontend/src/components/analytics/system-analytics-screen.tsx
**tsx · 722 lines · System analytics presentation and data-loading component.**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import RoleGuard from '@/components/role-guard';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  type StatusTone,
} from '@/components/ui/academic-ui';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { apiGet } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type CountGroup = Record<string, number>;

interface AnalyticsSnapshot {
  generatedAt: string;
  windowDays: number;
  users: CountGroup;
  advising: CountGroup;
  documents: CountGroup;
  announcements: CountGroup;
  roomChanges: CountGroup;
  aiHelpdesk: CountGroup;
  notifications: CountGroup;
  academics: CountGroup;
  knowledge: CountGroup;
}

interface ServiceHealth {
  state: 'operational' | 'unavailable' | 'not_configured';
  latencyMs: number | null;
}

interface UsageItem {
  label: string;
  description: string;
  total: number;
  recent: number;
  status: string;
  tone: StatusTone;
  icon: Parameters<typeof AcademicIcon>[0]['name'];
}

const WINDOWS = [7, 30, 90] as const;
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function percentage(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function duration(minutes: number): string {
  if (minutes <= 0) return 'No data';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hr`;
  return `${(minutes / 1440).toFixed(1)} days`;
}

async function checkApi(): Promise<ServiceHealth> {
  if (!API_BASE || API_BASE === 'disabled') return { state: 'not_configured', latencyMs: null };
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    return {
      state: response.ok ? 'operational' : 'unavailable',
      latencyMs: Date.now() - started,
    };
  } catch {
    return { state: 'unavailable', latencyMs: null };
  } finally {
    clearTimeout(timeout);
  }
}

function OverviewMetric({
  label,
  value,
  detail,
  icon,
  wide,
}: {
  label: string;
  value: string;
  detail: string;
  icon: Parameters<typeof AcademicIcon>[0]['name'];
  wide: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={[styles.overviewMetric, wide && styles.overviewMetricWide]}>
      <View style={[styles.metricIcon, { backgroundColor: colors.softBlue }]}>
        <AcademicIcon name={icon} color={colors.primary} size={21} />
      </View>
      <Text selectable style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.metricDetail, { color: colors.textSecondary }]}>{detail}</Text>
    </SurfaceCard>
  );
}

function DistributionRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { colors } = useAppTheme();
  const width = total > 0 ? Math.max(3, Math.min(100, (value / total) * 100)) : 0;
  return (
    <View style={styles.distributionRow}>
      <View style={styles.distributionHeader}>
        <Text style={[styles.distributionLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text selectable style={[styles.distributionValue, { color: colors.text }]}>{compact(value)}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${width}%` }]} />
      </View>
    </View>
  );
}

interface QueueAnalytics {
  activeLoad: number;
  arrivalsPerHour: number;
  resolvedCount: number;
  mostLikelyMinutes: number | null;
  expectedTriangularMinutes: number | null;
  estimateSource: string;
  calculatedAt: string;
}

function AggregateBar({ item, maximum }: { item: UsageItem; maximum: number }) {
  const { colors } = useAppTheme();
  const value = item.recent;
  const width = maximum > 0 ? Math.max(3, Math.min(100, (value / maximum) * 100)) : 0;

  return (
    <View style={styles.aggregateRow}>
      <View style={styles.aggregateHeader}>
        <View style={styles.aggregateLabelGroup}>
          <View style={[styles.aggregateIcon, { backgroundColor: colors.softBlue }]}>
            <AcademicIcon name={item.icon} color={colors.primary} size={17} />
          </View>
          <View style={styles.aggregateCopy}>
            <Text style={[styles.aggregateLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.aggregateDescription, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
          </View>
        </View>
        <Text selectable style={[styles.aggregateValue, { color: colors.text }]}>{compact(value)}</Text>
      </View>
      <View style={[styles.aggregateTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.aggregateFill, { backgroundColor: colors.primary, width: `${width}%` }]} />
      </View>
    </View>
  );
}

function ActivityTableRow({ item, windowDays, compactLayout }: { item: UsageItem; windowDays: number; compactLayout: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.activityRow, compactLayout && styles.activityRowCompact, { borderTopColor: colors.border }]}>
      <View style={[styles.activityService, compactLayout && styles.activityServiceCompact]}>
        <View style={[styles.activityIcon, { backgroundColor: colors.softBlue }]}>
          <AcademicIcon name={item.icon} color={colors.primary} size={17} />
        </View>
        <View style={styles.activityCopy}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>{item.label}</Text>
          <Text style={[styles.activityDescription, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
        </View>
      </View>
      <View style={[styles.activityDetails, compactLayout && styles.activityDetailsCompact]}>
        <View style={styles.activityMetric}>
          <Text selectable style={[styles.activityMetricValue, { color: colors.text }]}>{compact(item.recent)}</Text>
          <Text style={[styles.activityMetricLabel, { color: colors.textSecondary }]}>{windowDays}-day activity</Text>
        </View>
        <View style={styles.activityMetric}>
          <Text selectable style={[styles.activityMetricValue, { color: colors.text }]}>{compact(item.total)}</Text>
          <Text style={[styles.activityMetricLabel, { color: colors.textSecondary }]}>All time</Text>
        </View>
        <View style={styles.activityStatus}>
          <StatusBadge label={item.status} tone={item.tone} />
        </View>
      </View>
    </View>
  );
}

function SystemAnalyticsContent() {
  const { width: viewportWidth } = useWindowDimensions();
  const { colors } = useAppTheme();
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [service, setService] = useState<ServiceHealth>({ state: 'not_configured', latencyMs: null });
  const [queueAnalytics, setQueueAnalytics] = useState<QueueAnalytics | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queryLatency, setQueryLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wide = viewportWidth >= 760;
  const compactTable = viewportWidth < Layout.compactBreakpoint;

  const fetchAnalytics = useCallback(async () => {
    setError(null);
    const started = Date.now();
    const queueResult = apiGet<QueueAnalytics>(`/api/queue/analytics?windowHours=${windowDays * 24}`)
      .then(data => ({ data, error: null as string | null }))
      .catch(() => ({ data: null, error: 'Queue analytics are unavailable from the Operations API.' }));
    const [analyticsResult, healthResult, resolvedQueue] = await Promise.all([
      supabase.rpc('get_system_analytics', { p_window_days: windowDays }),
      checkApi(),
      queueResult,
    ]);
    setQueryLatency(Date.now() - started);
    setService(healthResult);
    setQueueAnalytics(resolvedQueue.data);
    setQueueError(resolvedQueue.error);
    if (analyticsResult.error) {
      setError(analyticsResult.error.message);
      return;
    }
    setSnapshot(analyticsResult.data as AnalyticsSnapshot);
  }, [windowDays]);

  useEffect(() => {
    setLoading(true);
    void fetchAnalytics().finally(() => setLoading(false));
  }, [fetchAnalytics]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }

  const featureUsage = useMemo<UsageItem[]>(() => {
    if (!snapshot) return [];
    return [
      {
        label: 'Advising Requests',
        description: `${compact(number(snapshot.advising.resolved))} resolved · ${compact(number(snapshot.advising.actionRequired))} need action`,
        total: number(snapshot.advising.total),
        recent: number(snapshot.advising.newInWindow),
        status: number(snapshot.advising.actionRequired) > 0 ? 'Needs attention' : 'Healthy',
        tone: number(snapshot.advising.actionRequired) > 0 ? 'warning' : 'success',
        icon: { ios: 'person.2.wave.2', android: 'groups', web: 'groups' },
      },
      {
        label: 'Document Requests',
        description: `${compact(number(snapshot.documents.pending))} processing · ${compact(number(snapshot.documents.ready))} ready`,
        total: number(snapshot.documents.total),
        recent: number(snapshot.documents.newInWindow),
        status: number(snapshot.documents.pending) > 0 ? 'Active queue' : 'Healthy',
        tone: number(snapshot.documents.pending) > 0 ? 'blue' : 'success',
        icon: { ios: 'doc.text', android: 'description', web: 'description' },
      },
      {
        label: 'Announcements',
        description: `${compact(number(snapshot.announcements.published))} published · ${compact(number(snapshot.announcements.draft))} drafts`,
        total: number(snapshot.announcements.total),
        recent: number(snapshot.announcements.newInWindow),
        status: 'Available',
        tone: 'success',
        icon: { ios: 'megaphone', android: 'campaign', web: 'campaign' },
      },
      {
        label: 'Room Changes',
        description: `${compact(number(snapshot.roomChanges.activeNow))} active · ${compact(number(snapshot.roomChanges.acknowledgements))} acknowledgements`,
        total: number(snapshot.roomChanges.total),
        recent: number(snapshot.roomChanges.newInWindow),
        status: number(snapshot.roomChanges.activeNow) > 0 ? 'Live updates' : 'Healthy',
        tone: 'blue',
        icon: { ios: 'location', android: 'location_on', web: 'location_on' },
      },
      {
        label: 'AI Helpdesk',
        description: `${percentage(number(snapshot.aiHelpdesk.resolutionRate))} resolved · ${compact(number(snapshot.aiHelpdesk.escalated))} escalated`,
        total: number(snapshot.aiHelpdesk.total),
        recent: number(snapshot.aiHelpdesk.newInWindow),
        status: number(snapshot.aiHelpdesk.lowConfidence) > 0 ? 'Review suggested' : 'Healthy',
        tone: number(snapshot.aiHelpdesk.lowConfidence) > 0 ? 'warning' : 'success',
        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
      },
      {
        label: 'Push Notifications',
        description: `${compact(number(snapshot.notifications.enabledDevices))} enabled devices · ${percentage(number(snapshot.notifications.successRate))} delivered`,
        total: number(snapshot.notifications.deliveries),
        recent: number(snapshot.notifications.newInWindow),
        status: number(snapshot.notifications.failed) > 0 ? 'Delivery issues' : 'Healthy',
        tone: number(snapshot.notifications.failed) > 0 ? 'error' : 'success',
        icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
      },
    ];
  }, [snapshot]);

  const recentActivityTotal = featureUsage.reduce((sum, item) => sum + item.recent, 0);
  const largestRecentActivity = featureUsage.reduce((largest, item) => Math.max(largest, item.recent), 0);

  const serviceLabel = service.state === 'operational'
    ? 'Operations API operational'
    : service.state === 'not_configured'
      ? 'Operations API not configured'
      : 'Operations API unavailable';
  const serviceTone: StatusTone = service.state === 'operational' ? 'success' : service.state === 'not_configured' ? 'muted' : 'error';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <SurfaceCard style={styles.reportHeader}>
            <View style={styles.reportHeading}>
              <View style={styles.reportEyebrow}>
                <View style={[styles.reportEyebrowDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.reportEyebrowText, { color: colors.primary }]}>REPORTING WORKSPACE</Text>
              </View>
              <Text style={[styles.reportTitle, { color: colors.text }]}>System analytics</Text>
              <Text style={[styles.reportSubtitle, { color: colors.textSecondary }]}>A focused view of service activity, operational health, and academic platform coverage.</Text>
            </View>
            <View style={[styles.reportContext, { backgroundColor: colors.softBlue }]}>
              <AcademicIcon name={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }} color={colors.primary} size={22} />
              <Text style={[styles.reportContextTitle, { color: colors.text }]}>Super Admin view</Text>
              <Text style={[styles.reportContextCaption, { color: colors.textSecondary }]}>Authorized aggregate data</Text>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.toolbarCard}>
            <View style={styles.toolbarCopy}>
              <Text style={[styles.toolbarLabel, { color: colors.text }]}>Reporting period</Text>
              <Text style={[styles.toolbarHint, { color: colors.textSecondary }]}>Choose a supported snapshot window</Text>
            </View>
            <View style={styles.toolbarControls}>
              <View style={styles.windowRail}>
                {WINDOWS.map(days => {
                  const selected = windowDays === days;
                  return (
                    <Pressable
                      key={days}
                      onPress={() => setWindowDays(days)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show analytics for the last ${days} days`}
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [styles.windowButton, { backgroundColor: selected ? colors.primary : colors.muted }, pressed && styles.pressed]}>
                      <Text style={[styles.windowText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{days} days</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={onRefresh}
                disabled={refreshing}
                accessibilityRole="button"
                accessibilityLabel="Refresh analytics"
                accessibilityState={{ disabled: refreshing, busy: refreshing }}
                style={({ pressed }) => [styles.refreshButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed, refreshing && styles.refreshDisabled]}>
                <AcademicIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} color={colors.primary} size={17} />
                <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
              </Pressable>
            </View>
            {snapshot ? (
              <Text selectable style={[styles.updatedText, { color: colors.textSecondary }]}>
                Updated {new Date(snapshot.generatedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            ) : null}
          </SurfaceCard>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Preparing the system snapshot…</Text>
            </View>
          ) : error || !snapshot ? (
            <EmptyState
              title="Analytics unavailable"
              message={error ?? 'The system snapshot could not be loaded. Pull down to retry.'}
              icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }}
            />
          ) : (
            <>
              <SectionHeader title="Current State" />
              <SurfaceCard style={styles.healthCard} accent={service.state === 'unavailable' ? 'error' : 'success'}>
                <View style={styles.healthHeader}>
                  <View style={[styles.healthIcon, { backgroundColor: service.state === 'unavailable' ? Academic.errorBg : Academic.successBg }]}>
                    <AcademicIcon
                      name={{ ios: 'waveform.path.ecg', android: 'verified_user', web: 'verified_user' }}
                      color={service.state === 'unavailable' ? Academic.error : Academic.success}
                      size={24}
                    />
                  </View>
                  <View style={styles.healthCopy}>
                    <Text style={[styles.healthTitle, { color: colors.text }]}>System services</Text>
                    <Text style={[styles.healthSubtitle, { color: colors.textSecondary }]}>Supabase reporting is access-controlled; Operations API status is checked separately.</Text>
                  </View>
                  <StatusBadge label={serviceLabel} tone={serviceTone} />
                </View>
                <View style={[styles.healthDetails, { borderTopColor: colors.border }]}>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Analytics query</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{queryLatency ?? 0} ms</Text>
                  </View>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Operations API response</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{service.latencyMs === null ? '—' : `${service.latencyMs} ms`}</Text>
                  </View>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Pending verification</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{compact(number(snapshot.users.pendingVerification))}</Text>
                  </View>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Queue active load</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{queueAnalytics ? compact(number(queueAnalytics.activeLoad)) : '—'}</Text>
                  </View>
                </View>
              </SurfaceCard>
              {queueError ? <Text style={[styles.optionalNote, { color: colors.textSecondary }]}>{queueError} The core Supabase system analytics report remains available.</Text> : null}

              <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
                <OverviewMetric
                  wide={wide}
                  label="Active Accounts"
                  value={compact(number(snapshot.users.active))}
                  detail={`+${compact(number(snapshot.users.newInWindow))} in ${windowDays} days`}
                  icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
                />
                <OverviewMetric
                  wide={wide}
                  label="Advising Resolution"
                  value={percentage(number(snapshot.advising.resolutionRate))}
                  detail={`Average ${duration(number(snapshot.advising.averageResolutionMinutes))}`}
                  icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                />
                <OverviewMetric
                  wide={wide}
                  label="Document Completion"
                  value={percentage(number(snapshot.documents.completionRate))}
                  detail={`${compact(number(snapshot.documents.pending))} currently processing`}
                  icon={{ ios: 'checkmark.circle', android: 'description', web: 'description' }}
                />
                <OverviewMetric
                  wide={wide}
                  label="AI Resolution"
                  value={percentage(number(snapshot.aiHelpdesk.resolutionRate))}
                  detail={`${percentage(number(snapshot.aiHelpdesk.averageConfidence))} average confidence`}
                  icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                />
              </View>

              <BentoGrid style={styles.primaryReportGrid}>
                <BentoPanel size="wide" style={wide ? [styles.column, styles.activityPanelWide] : styles.column}>
                  <SectionHeader title="Activity by service" badge={`${windowDays}-day window`} />
                  <SurfaceCard style={styles.aggregatePanel}>
                    <View style={styles.aggregatePanelIntro}>
                      <View style={styles.aggregatePanelCopy}>
                        <Text style={[styles.aggregatePanelTitle, { color: colors.text }]}>Recent activity volume</Text>
                        <Text style={[styles.aggregatePanelDescription, { color: colors.textSecondary }]}>Real counts returned by the authorized system analytics snapshot.</Text>
                      </View>
                      <View style={styles.aggregatePanelTotal}>
                        <Text selectable style={[styles.aggregatePanelTotalValue, { color: colors.text }]}>{compact(recentActivityTotal)}</Text>
                        <Text style={[styles.aggregatePanelTotalLabel, { color: colors.textSecondary }]}>events</Text>
                      </View>
                    </View>
                    <View style={styles.aggregateBars}>
                      {featureUsage.map(item => <AggregateBar key={item.label} item={item} maximum={largestRecentActivity} />)}
                    </View>
                  </SurfaceCard>
                </BentoPanel>
                <BentoPanel size="compact" style={wide ? [styles.column, styles.signalPanelWide] : [styles.column, styles.signalPanelStacked]}>
                  <SectionHeader title="Operational signals" />
                  <SurfaceCard style={[styles.signalPanel, wide && styles.signalCardWide]}>
                    <View style={[styles.signalRow, styles.signalFirstRow]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.softBlue }]}><AcademicIcon name={{ ios: 'person.2', android: 'groups', web: 'groups' }} color={colors.primary} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Active accounts</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.users.active))}</Text></View>
                    </View>
                    <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.warningBg }]}><AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={colors.warning} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Pending verification</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.users.pendingVerification))}</Text></View>
                    </View>
                    <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.errorBg }]}><AcademicIcon name={{ ios: 'exclamationmark.circle', android: 'priority_high', web: 'priority_high' }} color={colors.error} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Action required</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.advising.actionRequired))}</Text></View>
                    </View>
                    <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.successBg }]}><AcademicIcon name={{ ios: 'doc.text', android: 'description', web: 'description' }} color={colors.success} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Documents processing</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.documents.pending))}</Text></View>
                    </View>
                    {queueAnalytics ? (
                      <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                        <View style={[styles.signalIcon, { backgroundColor: colors.softBlue }]}><AcademicIcon name={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }} color={colors.primary} size={18} /></View>
                        <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Queue active load</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(queueAnalytics.activeLoad))}</Text></View>
                      </View>
                    ) : null}
                  </SurfaceCard>
                </BentoPanel>
              </BentoGrid>

              <BentoGrid style={styles.twoColumn}>
                <BentoPanel size="medium" style={styles.column}>
                  <SectionHeader title="Account Distribution" />
                  <SurfaceCard style={styles.chartCard}>
                    <DistributionRow label="Students" value={number(snapshot.users.student)} total={number(snapshot.users.total)} color={Academic.primary} />
                    <DistributionRow label="Faculty" value={number(snapshot.users.faculty)} total={number(snapshot.users.total)} color={Academic.warningText} />
                    <DistributionRow label="Staff" value={number(snapshot.users.staff)} total={number(snapshot.users.total)} color={Academic.success} />
                    <DistributionRow label="Super admins" value={number(snapshot.users.superAdmin)} total={number(snapshot.users.total)} color={Academic.error} />
                  </SurfaceCard>
                </BentoPanel>
                <BentoPanel size="medium" style={styles.column}>
                  <SectionHeader title="Advising Pipeline" />
                  <SurfaceCard style={styles.chartCard}>
                    <DistributionRow label="Submitted" value={number(snapshot.advising.submitted)} total={number(snapshot.advising.total)} color={Academic.primary} />
                    <DistributionRow label="Under evaluation" value={number(snapshot.advising.underEvaluation)} total={number(snapshot.advising.total)} color={Academic.warningText} />
                    <DistributionRow label="Action required" value={number(snapshot.advising.actionRequired)} total={number(snapshot.advising.total)} color={Academic.error} />
                    <DistributionRow label="Resolved" value={number(snapshot.advising.resolved)} total={number(snapshot.advising.total)} color={Academic.success} />
                  </SurfaceCard>
                </BentoPanel>
              </BentoGrid>

              <SectionHeader title="Service activity breakdown" badge="Aggregate report" />
              <SurfaceCard style={styles.activityTable}>
                <View style={[styles.activityTableHeader, compactTable && styles.activityTableHeaderCompact]}>
                  <View style={styles.activityService}>
                    <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>Service area</Text>
                  </View>
                  <View style={styles.activityDetails}>
                    <View style={styles.activityMetric}>
                      <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>{windowDays} days</Text>
                    </View>
                    <View style={styles.activityMetric}>
                      <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>All time</Text>
                    </View>
                    <View style={styles.activityStatus}>
                      <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>Status</Text>
                    </View>
                  </View>
                </View>
                {featureUsage.map(item => <ActivityTableRow key={item.label} item={item} windowDays={windowDays} compactLayout={compactTable} />)}
              </SurfaceCard>

              <SectionHeader title="Academic & Knowledge Coverage" />
              <SurfaceCard style={styles.coverageCard}>
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Active schedules</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.academics.schedules))}</Text>
                </View>
                <View style={[styles.coverageDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'graduationcap', android: 'school', web: 'school' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Active enrollments</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.academics.studentEnrollments))}</Text>
                </View>
                <View style={[styles.coverageDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'books.vertical', android: 'menu_book', web: 'menu_book' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Verified sources</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.knowledge.verifiedDocuments))}</Text>
                </View>
                <View style={[styles.coverageDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'cylinder', android: 'database', web: 'database' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Knowledge chunks</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.knowledge.knowledgeChunks))}</Text>
                </View>
              </SurfaceCard>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SystemAnalyticsScreen() {
  return (
    <RoleGuard allowed={['super_admin']}>
      <SystemAnalyticsContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: 132 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  reportHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.four, padding: Spacing.four },
  reportHeading: { flex: 1, minWidth: 230, gap: Spacing.one },
  reportEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  reportEyebrowDot: { width: 7, height: 7, borderRadius: 4 },
  reportEyebrowText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  reportTitle: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.7 },
  reportSubtitle: { maxWidth: 650, fontSize: 13, lineHeight: 20 },
  reportContext: { minWidth: 178, padding: Spacing.three, borderRadius: 18, alignItems: 'flex-start', gap: 5 },
  reportContextTitle: { fontSize: 13, fontWeight: '600' },
  reportContextCaption: { fontSize: 11, lineHeight: 16 },
  toolbarCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  toolbarCopy: { flex: 1, minWidth: 180, gap: 2 },
  toolbarLabel: { fontSize: 13, fontWeight: '500' },
  toolbarHint: { fontSize: 11, lineHeight: 16 },
  toolbarControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  windowRail: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  windowButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  windowText: { fontSize: 12, fontWeight: '500' },
  refreshButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshText: { fontSize: 12, fontWeight: '500' },
  refreshDisabled: { opacity: 0.6 },
  updatedText: { fontSize: 11, fontWeight: '400', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  loadingState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  loadingText: { fontSize: 14, fontWeight: '400' },
  healthCard: { gap: Spacing.three },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  healthCopy: { flex: 1, gap: 2 },
  healthTitle: { fontSize: 16, fontWeight: '600' },
  healthSubtitle: { fontSize: 12, lineHeight: 17 },
  healthDetails: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: Spacing.three, borderTopWidth: 1, gap: Spacing.three },
  healthDetail: { flex: 1, minWidth: 112, gap: 3 },
  healthDetailLabel: { fontSize: 11, fontWeight: '500' },
  healthDetailValue: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  optionalNote: { fontSize: 11, lineHeight: 16, paddingHorizontal: 3 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metricGridWide: { gap: Spacing.three },
  overviewMetric: { width: '48%', minWidth: 145, minHeight: 132, justifyContent: 'space-between', gap: 5 },
  overviewMetricWide: { width: '22.8%', flexGrow: 1 },
  metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 25, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 13, fontWeight: '500' },
  metricDetail: { fontSize: 11, lineHeight: 16 },
  primaryReportGrid: { gap: Spacing.three, alignItems: 'stretch' },
  activityPanelWide: { flexBasis: '65%' },
  signalPanelWide: { flexBasis: '32%' },
  signalPanelStacked: { flexBasis: '100%' },
  twoColumn: { gap: Spacing.three },
  column: { gap: Spacing.two },
  chartCard: { gap: Spacing.three },
  distributionRow: { gap: 7 },
  distributionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  distributionLabel: { fontSize: 12, fontWeight: '500' },
  distributionValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  barTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  aggregatePanel: { gap: Spacing.three },
  aggregatePanelIntro: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  aggregatePanelCopy: { flex: 1, gap: 3 },
  aggregatePanelTitle: { fontSize: 15, fontWeight: '600' },
  aggregatePanelDescription: { fontSize: 12, lineHeight: 17 },
  aggregatePanelTotal: { alignItems: 'flex-end' },
  aggregatePanelTotalValue: { fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  aggregatePanelTotalLabel: { fontSize: 10, fontWeight: '500' },
  aggregateBars: { gap: Spacing.two },
  aggregateRow: { gap: 7 },
  aggregateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  aggregateLabelGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aggregateIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  aggregateCopy: { flex: 1, minWidth: 0, gap: 1 },
  aggregateLabel: { fontSize: 12, fontWeight: '500' },
  aggregateDescription: { fontSize: 10, lineHeight: 15 },
  aggregateValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  aggregateTrack: { height: 5, marginLeft: 44, borderRadius: 999, overflow: 'hidden' },
  aggregateFill: { height: '100%', borderRadius: 999 },
  signalPanel: { paddingVertical: 0 },
  signalCardWide: { flex: 1, justifyContent: 'space-between' },
  signalRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1 },
  signalFirstRow: { borderTopWidth: 0 },
  signalIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signalCopy: { flex: 1, gap: 2 },
  signalLabel: { fontSize: 11, fontWeight: '500' },
  signalValue: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  activityTable: { paddingVertical: 0 },
  activityTableHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderBottomWidth: 1 },
  activityTableHeaderCompact: { display: 'none' },
  activityTableHeading: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.45, textAlign: 'right' },
  activityRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 10, borderTopWidth: 1 },
  activityRowCompact: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.two, paddingVertical: 12 },
  activityService: { flex: 1, minWidth: 170, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityServiceCompact: { flex: 0, width: '100%', minWidth: 0 },
  activityDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  activityDetailsCompact: { width: '100%', justifyContent: 'flex-end' },
  activityIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, minWidth: 0, gap: 1 },
  activityTitle: { fontSize: 12, fontWeight: '600' },
  activityDescription: { fontSize: 10, lineHeight: 15 },
  activityMetric: { width: 82, gap: 2, alignItems: 'flex-end', flexShrink: 0 },
  activityMetricValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  activityMetricLabel: { fontSize: 10, lineHeight: 14, textAlign: 'right' },
  activityStatus: { width: 112, alignItems: 'flex-end', flexShrink: 0 },
  coverageCard: { gap: 0 },
  coverageItem: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11 },
  coverageLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  coverageValue: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  coverageDivider: { height: 1, marginLeft: 32 },
});

```

## Frontend/src/components/animated-icon.module.css
**css · 7 lines · Reusable frontend component.**

```css
.expoLogoBackground {
  background-image: linear-gradient(180deg, #3c9ffe, #0274df);
  border-radius: 40px;
  width: 128px;
  height: 128px;
}

```

## Frontend/src/components/animated-icon.tsx
**tsx · 133 lines · Reusable frontend component.**

```tsx
import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: INITIAL_SCALE_FACTOR }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.backgroundSolidColor}
    />
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#39AEA9',
    zIndex: 1000,
  },
});

```

## Frontend/src/components/animated-icon.web.tsx
**tsx · 109 lines · Reusable frontend component.**

```tsx
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';

import classes from './animated-icon.module.css';
const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '-180deg' }, { scale: 0.8 }],
    opacity: 0,
  },
  [DURATION / 1000]: {
    transform: [{ rotateZ: '0deg' }, { scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View style={styles.background} entering={keyframe.duration(DURATION)}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});

```

## Frontend/src/components/app-tabs.tsx
**tsx · 132 lines · Reusable frontend component.**

```tsx
import { BlurView } from 'expo-blur';
import { Tabs, usePathname } from 'expo-router';
import { useWindowDimensions, type ColorValue } from 'react-native';

import { AcademicIcon, type AcademicIconName } from '@/components/ui/academic-ui';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { Fonts, Layout } from '@/constants/theme';

function tabIcon(name: AcademicIconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <AcademicIcon name={name} color={String(color)} size={size} animated={false} />
    );
  };
}

export default function AppTabs() {
  const { colors, resolvedTheme } = useAppTheme();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const role = profile?.role;
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';
  const showLabels = width >= 390;
  const detailRoute = pathname.startsWith('/ticket/');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: colors.backgroundSelected,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <BlurView
            intensity={resolvedTheme === 'dark' ? 30 : 42}
            tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={{ flex: 1 }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          height: showLabels ? 76 : 66,
          paddingTop: showLabels ? 8 : 6,
          paddingBottom: showLabels ? 8 : 6,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          boxShadow: '0 -4px 16px rgba(20, 52, 49, 0.06)',
          ...(detailRoute ? { display: 'none' } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.sans,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: width >= Layout.compactBreakpoint ? 3 : 1,
          marginVertical: 4,
        },
        tabBarShowLabel: showLabels,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isStudent ? 'Home' : isFaculty ? 'Dashboard' : isStaff ? 'Operations' : 'Overview',
          tabBarIcon: tabIcon({ ios: 'house.fill', android: 'home', web: 'home' }),
        }}
      />

      <Tabs.Protected guard={isStaff || isSuperAdmin}>
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Management',
            tabBarIcon: tabIcon({ ios: 'briefcase.fill', android: 'work', web: 'work' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={isSuperAdmin}>
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: tabIcon({ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={isStudent}>
        <Tabs.Screen
          name="tickets"
          options={{
            title: 'Requests',
            tabBarIcon: tabIcon({ ios: 'doc.text.fill', android: 'assignment', web: 'assignment' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Updates',
          tabBarIcon: tabIcon({ ios: 'bell.fill', android: 'notifications', web: 'notifications' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon({ ios: 'person.fill', android: 'person', web: 'person' }),
        }}
      />
      <Tabs.Screen name="chatbot" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="faq" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="ticket/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Protected guard={isStudent}>
        <Tabs.Screen name="documents" options={{ href: null }} />
      </Tabs.Protected>
    </Tabs>
  );
}

```

## Frontend/src/components/app-tabs.web.tsx
**tsx · 406 lines · Reusable frontend component.**

```tsx
import { BlurView } from 'expo-blur';
import { Tabs, usePathname, useRouter, type Href } from 'expo-router';
import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AcademicIcon, type AcademicIconName } from './ui/academic-ui';
import { ThemedText } from './themed-text';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

const DESKTOP_SIDEBAR_WIDTH = 248;
const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 72;
const DESKTOP_CONTENT_GUTTER = 24;

type SidebarState = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
};

type NavigationItem = {
  routeName: string;
  href: Href;
  label: string;
  icon: AcademicIconName;
};

type TabState = {
  index: number;
  routes: { key: string; name: string }[];
};

const SidebarStateContext = createContext<SidebarState>({
  collapsed: false,
  setCollapsed: () => undefined,
});

function getDesktopContentInset(collapsed: boolean) {
  return getDesktopSidebarInset(collapsed) + DESKTOP_CONTENT_GUTTER;
}

function getDesktopSidebarInset(collapsed: boolean) {
  return collapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH;
}

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const desktop = width >= Layout.wideBreakpoint;
  const fullScreen = pathname === '/chatbot' || pathname === '/faq' || pathname.startsWith('/ticket/');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile } = useAuth();
  const role = profile?.role ?? 'student';
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';

  return (
    <SidebarStateContext.Provider value={{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }}>
      <Tabs
        tabBar={({ state }) => <WorkspaceNavigation state={state} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: desktop && !fullScreen
            ? {
              paddingLeft: getDesktopContentInset(sidebarCollapsed),
              paddingRight: Spacing.three,
              paddingTop: 80,
            }
            : undefined,
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: isStudent ? 'Home' : isFaculty ? 'Dashboard' : isStaff ? 'Operations' : 'Overview' }}
        />
        <Tabs.Protected guard={isStaff || isSuperAdmin}>
          <Tabs.Screen name="admin" options={{ title: 'Management' }} />
        </Tabs.Protected>
        <Tabs.Protected guard={isSuperAdmin}>
          <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
        </Tabs.Protected>
        <Tabs.Protected guard={isStudent}>
          <Tabs.Screen name="tickets" options={{ title: 'Requests' }} />
        </Tabs.Protected>
        <Tabs.Screen name="explore" options={{ title: 'Updates' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="chatbot" options={{ href: null }} />
        <Tabs.Screen name="faq" options={{ href: null }} />
        <Tabs.Screen name="ticket/[id]" options={{ href: null }} />
        <Tabs.Protected guard={isStudent}>
          <Tabs.Screen name="documents" options={{ href: null }} />
        </Tabs.Protected>
      </Tabs>
    </SidebarStateContext.Provider>
  );
}

function WorkspaceNavigation({ state }: { state: TabState }) {
  const { colors, resolvedTheme } = useAppTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = width >= Layout.wideBreakpoint;
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useContext(SidebarStateContext);
  const fullScreen = pathname === '/chatbot' || pathname === '/faq' || pathname.startsWith('/ticket/');
  const role = profile?.role ?? 'student';
  const isStudent = role === 'student';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';
  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'staff' ? 'Staff workspace' : role === 'faculty' ? 'Faculty workspace' : 'Student workspace';
  const workspaceLabel = pathname === '/analytics'
    ? 'System analytics'
    : pathname === '/admin'
      ? 'Management'
      : pathname === '/tickets'
        ? 'Assistance requests'
        : pathname === '/profile'
          ? 'Profile'
          : pathname === '/explore'
            ? 'Announcements and updates'
            : pathname === '/documents'
              ? 'Documents'
              : 'Dashboard';
  const navigationItems: NavigationItem[] = [
    {
      routeName: 'index',
      href: '/',
      label: isStudent ? 'Home' : role === 'faculty' ? 'Dashboard' : isStaff ? 'Operations' : 'Overview',
      icon: { ios: 'house', android: 'home', web: 'home' },
    },
    ...(isStaff || isSuperAdmin ? [{
      routeName: 'admin',
      href: '/admin' as Href,
      label: 'Management',
      icon: { ios: 'briefcase', android: 'work', web: 'work' } as AcademicIconName,
    }] : []),
    ...(isSuperAdmin ? [{
      routeName: 'analytics',
      href: '/analytics' as Href,
      label: 'Analytics',
      icon: { ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' } as AcademicIconName,
    }] : []),
    ...(isStudent ? [{
      routeName: 'tickets',
      href: '/tickets' as Href,
      label: 'Requests',
      icon: { ios: 'doc.text', android: 'assignment', web: 'assignment' } as AcademicIconName,
    }] : []),
    {
      routeName: 'explore',
      href: '/explore',
      label: 'Updates',
      icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
    },
    {
      routeName: 'profile',
      href: '/profile',
      label: 'Profile',
      icon: { ios: 'person', android: 'person', web: 'person' },
    },
  ];
  const activeRouteName = state.routes[state.index]?.name;

  if (fullScreen) return null;

  if (!desktop) {
    return (
      <View nativeID="app-tab-bar" style={styles.mobileNavigationLayer}>
        <BlurView
          intensity={resolvedTheme === 'dark' ? 30 : 42}
          tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
          style={[styles.innerContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
        >
          {navigationItems.map(item => (
            <WorkspaceNavigationButton
              key={item.routeName}
              item={item}
              focused={activeRouteName === item.routeName}
              desktop={false}
              onPress={() => router.navigate(item.href)}
            />
          ))}
        </BlurView>
      </View>
    );
  }

  return (
    <View nativeID="app-tab-bar" pointerEvents="box-none" style={styles.desktopNavigationLayer}>
      <View
        style={[
          styles.desktopSidebar,
          sidebarCollapsed && styles.desktopSidebarCollapsed,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={[styles.sidebarBrand, sidebarCollapsed && styles.sidebarBrandCollapsed]}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <AcademicIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} color="#FFFFFF" size={15} animated={false} />
          </View>
          {!sidebarCollapsed ? (
            <View style={styles.sidebarBrandCopy}>
              <ThemedText type="smallBold" style={styles.brandText}>CAS Assist</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sidebarBrandSubtitle}>Academic services</ThemedText>
            </View>
          ) : null}
          <Pressable
            onPress={() => setSidebarCollapsed(value => !value)}
            accessibilityRole="button"
            accessibilityLabel={sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            style={({ pressed }) => [styles.sidebarToggle, sidebarCollapsed && styles.sidebarToggleCollapsed, { backgroundColor: colors.muted }, pressed && styles.pressed]}>
            <AcademicIcon
              name={sidebarCollapsed
                ? { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
                : { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              color={colors.textSecondary}
              size={16}
              animated={false}
            />
          </Pressable>
        </View>
        {!sidebarCollapsed ? (
          <View style={styles.sidebarSectionLabel}>
            <ThemedText type="small" themeColor="textSecondary">Workspace</ThemedText>
          </View>
        ) : null}
        <View style={[styles.sidebarNavigation, sidebarCollapsed && styles.sidebarNavigationCollapsed]}>
          {navigationItems.map(item => (
            <WorkspaceNavigationButton
              key={item.routeName}
              item={item}
              focused={activeRouteName === item.routeName}
              desktop
              onPress={() => router.navigate(item.href)}
            />
          ))}
        </View>
        <View style={[styles.sidebarFooter, sidebarCollapsed && styles.sidebarFooterCollapsed, { borderTopColor: colors.border }]}>
          {!sidebarCollapsed ? (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sidebarFooterLabel}>Signed in as</ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>{roleLabel}</ThemedText>
            </>
          ) : <View style={[styles.sidebarFooterDot, { backgroundColor: colors.primary }]} />}
        </View>
      </View>
      <View
        style={[styles.desktopTopbar, { backgroundColor: colors.background, borderColor: colors.border, left: getDesktopSidebarInset(sidebarCollapsed) }]}
      >
        <View style={styles.topbarCopy}>
          <ThemedText type="small" themeColor="textSecondary">CAS Assist / {roleLabel}</ThemedText>
          <ThemedText type="smallBold">{workspaceLabel}</ThemedText>
        </View>
        <View style={[styles.topbarStatus, { backgroundColor: colors.softBlue }]}>
          <View style={[styles.topbarStatusDot, { backgroundColor: colors.primary }]} />
          <ThemedText type="small" style={{ color: colors.primary }}>Authenticated workspace</ThemedText>
        </View>
      </View>
    </View>
  );
}

function WorkspaceNavigationButton({
  item,
  focused,
  desktop,
  onPress,
}: {
  item: NavigationItem;
  focused: boolean;
  desktop: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { collapsed: sidebarCollapsed } = useContext(SidebarStateContext);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const compact = width < Layout.compactBreakpoint;
  const micro = width < 380;
  const compactDesktopNavigation = desktop && sidebarCollapsed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: focused }}
      onFocus={event => {
        const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
        setKeyboardFocused(target.matches?.(':focus-visible') ?? true);
      }}
      onBlur={() => {
        setKeyboardFocused(false);
      }}
      style={({ pressed }) => [
        styles.tabPressable,
        desktop && styles.desktopTabPressable,
        keyboardFocused && !focused && styles.focusedPressable,
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.tabButtonView,
          desktop && styles.desktopTabButtonView,
          compactDesktopNavigation && styles.desktopTabButtonCollapsed,
          { backgroundColor: focused ? colors.backgroundSelected : 'transparent' },
          focused && { borderColor: colors.primary },
          compact && !desktop && styles.tabButtonCompact,
          micro && !desktop && styles.tabButtonMicro,
        ]}>
        <AcademicIcon name={item.icon} size={17} color={focused ? colors.primary : colors.textSecondary} animated={false} />
        {(!compact || desktop) && !compactDesktopNavigation ? (
          <ThemedText type="small" themeColor={focused ? 'text' : 'textSecondary'}>{item.label}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  desktopNavigationLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
    zIndex: 20,
  },
  mobileNavigationLayer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 20,
  },
  desktopSidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DESKTOP_SIDEBAR_WIDTH, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 20, borderRightWidth: 1, zIndex: 2, overflow: 'hidden' },
  desktopSidebarCollapsed: { width: DESKTOP_SIDEBAR_COLLAPSED_WIDTH, paddingHorizontal: 10 },
  sidebarBrand: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22, paddingHorizontal: 6 },
  sidebarBrandCollapsed: { minHeight: 78, flexDirection: 'column', justifyContent: 'space-between', gap: 8, marginBottom: 18, paddingHorizontal: 0 },
  sidebarBrandCopy: { flex: 1, gap: 1 },
  sidebarBrandSubtitle: { fontSize: 11, lineHeight: 16 },
  sidebarToggle: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sidebarToggleCollapsed: { width: 32, height: 28 },
  sidebarSectionLabel: { paddingHorizontal: 10, marginBottom: 8, textTransform: 'uppercase' },
  sidebarNavigation: { gap: 4, flex: 1 },
  sidebarNavigationCollapsed: { alignItems: 'center', gap: 8 },
  sidebarFooter: { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 10, gap: 3 },
  sidebarFooterCollapsed: { alignItems: 'center', paddingHorizontal: 0, paddingTop: 16 },
  sidebarFooterLabel: { fontSize: 11, lineHeight: 16 },
  sidebarFooterDot: { width: 8, height: 8, borderRadius: 4 },
  desktopTopbar: { position: 'absolute', right: 0, top: 0, minHeight: 64, borderBottomWidth: 1, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 3, overflow: 'hidden' },
  topbarCopy: { gap: 2 },
  topbarStatus: { minHeight: 30, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  topbarStatusDot: { width: 7, height: 7, borderRadius: 4 },
  innerContainer: {
    minHeight: 64,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 6,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    boxShadow: '0 4px 16px rgba(20, 52, 49, 0.10)',
    overflow: 'hidden',
  },
  brandMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandText: { letterSpacing: -0.15 },
  pressed: { opacity: 0.76 },
  tabPressable: { borderRadius: 10 },
  desktopTabPressable: { width: '100%' },
  focusedPressable: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'rgba(11,125,119,0.36)', outlineOffset: 2 },
  tabButtonView: {
    minHeight: 40,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  desktopTabButtonView: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  desktopTabButtonCollapsed: { width: 48, paddingHorizontal: 0, justifyContent: 'center' },
  tabButtonCompact: { width: 46, paddingHorizontal: 0, justifyContent: 'center' },
  tabButtonMicro: { width: 42 },
});

```

## Frontend/src/components/auth/auth-landing-screen.tsx
**tsx · 294 lines · Authentication UI component.**

```tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  AcademicIcon,
  AppBackdrop,
  StatusBadge,
  SurfaceCard,
  type AcademicIconName,
} from '@/components/ui/academic-ui';
import { Fonts, Layout, Radius, Shadows, Spacing, TypeScale } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import type { LoginCategory } from '@/context/auth';

interface Props {
  onSelectCategory: (category: LoginCategory) => void;
}

const HERO_ENTERING = FadeInDown.duration(480)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

const ROLE_OPTIONS = [
  {
    category: 'student' as const,
    eyebrow: 'Student services',
    title: 'I am a CAS Student',
    description: 'Access academic assistance, department updates, requests, and classroom announcements.',
    icon: { ios: 'graduationcap.fill', android: 'school', web: 'school' } as AcademicIconName,
    accent: 'blue' as const,
  },
  {
    category: 'institutional' as const,
    eyebrow: 'Institutional services',
    title: 'I am a CAS Staff / Faculty / Admin',
    description: 'Access authorized faculty, staff, and department management services.',
    icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' } as AcademicIconName,
    accent: 'success' as const,
  },
];

const SERVICE_CAPABILITIES = [
  { label: 'Assistance Requests', icon: { ios: 'doc.text', android: 'assignment', web: 'assignment' } as AcademicIconName },
  { label: 'Live Queue Numbers', icon: { ios: 'list.number', android: 'format_list_bulleted', web: 'format_list_bulleted' } as AcademicIconName },
  { label: 'Document Processing', icon: { ios: 'doc.text', android: 'description', web: 'description' } as AcademicIconName },
  { label: 'Appointments', icon: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' } as AcademicIconName },
  { label: 'Classroom Changes', icon: { ios: 'location', android: 'location_on', web: 'location_on' } as AcademicIconName },
  { label: 'AI Helpdesk', icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as AcademicIconName },
];

function RoleOptionCard({
  category,
  eyebrow,
  title,
  description,
  icon,
  accent,
  index,
  onPress,
}: (typeof ROLE_OPTIONS)[number] & { index: number; onPress: () => void }) {
  const { colors } = useAppTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hoverProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const isStudent = category === 'student';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(hoverProgress.value, [0, 1], [0, -4]) },
      { scale: interpolate(pressProgress.value, [0, 1], [1, 0.985]) },
    ],
    shadowOpacity: interpolate(hoverProgress.value, [0, 1], [0.08, 0.17]),
    elevation: interpolate(hoverProgress.value, [0, 1], [3, 7]),
  }));

  function setHoverState(next: boolean) {
    setHovered(next);
    // Reanimated shared values are intentionally mutable animation state.
    // eslint-disable-next-line react-hooks/immutability
    hoverProgress.value = withTiming(next ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 90 + 120).duration(420).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
      style={[styles.roleCardShell, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHoverState(true)}
        onHoverOut={() => setHoverState(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPressIn={() => {
          // Reanimated shared values are intentionally mutable animation state.
          // eslint-disable-next-line react-hooks/immutability
          pressProgress.value = withTiming(1, { duration: 90, reduceMotion: ReduceMotion.System });
        }}
        onPressOut={() => {
          // Reanimated shared values are intentionally mutable animation state.
          // eslint-disable-next-line react-hooks/immutability
          pressProgress.value = withTiming(0, { duration: 140, reduceMotion: ReduceMotion.System });
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint="Opens the sign-in form for this account category."
        style={({ pressed }) => [
          styles.rolePressable,
          focused && { outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.primary, outlineOffset: 2 },
          pressed && styles.pressed,
        ]}>
        <SurfaceCard
          accent={accent}
          style={[
            styles.roleCard,
            {
              borderColor: hovered || focused ? colors.primary : colors.border,
              backgroundColor: colors.card,
            },
          ]}>
          <View style={[styles.roleIcon, { backgroundColor: isStudent ? colors.softBlue : colors.successBg }]}>
            <AcademicIcon name={icon} size={30} color={isStudent ? colors.primary : colors.success} />
          </View>
          <View style={styles.roleCopy}>
            <Text style={[styles.roleEyebrow, { color: isStudent ? colors.primary : colors.success }]}>{eyebrow}</Text>
            <Text style={[styles.roleTitle, { color: colors.navy }]}>{title}</Text>
            <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>{description}</Text>
          </View>
          <View style={styles.roleFooter}>
            <Text style={[styles.roleCta, { color: hovered || focused ? colors.primary : colors.textSecondary }]}>
              {isStudent ? 'Continue as student' : 'Continue as staff'}
            </Text>
            <View style={[styles.roleAction, { backgroundColor: hovered || focused ? colors.primary : colors.backgroundSelected }]}>
              <AcademicIcon name={{ ios: 'arrow.up.right', android: 'chevron_right', web: 'chevron_right' }} size={20} color={hovered || focused ? '#FFFFFF' : colors.primary} animated={false} />
            </View>
          </View>
        </SurfaceCard>
      </Pressable>
    </Animated.View>
  );
}

export default function AuthLandingScreen({ onSelectCategory }: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= Layout.compactBreakpoint;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={HERO_ENTERING} style={[styles.content, wide && styles.contentWide]}>
            <View style={styles.heroHeader}>
              <View style={styles.brandRow}>
              <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
                <AcademicIcon
                  name={{ ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' }}
                  color="#FFFFFF"
                  size={22}
                />
              </View>

              </View>

              <View style={styles.heroCopy}>
              <StatusBadge label="NEU Academic Services Portal" tone="blue" />
              <Text style={[styles.welcomeTitle, { color: colors.navy }, wide && styles.welcomeTitleWide]}>
                CAS-Assist
              </Text>
              <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
                The College of Arts and Sciences assistance, operations, and academic services platform.  One desk for requests, queue numbers, documents, appointments, classroom-change notices, and an AI helpdesk grounded in approved CAS knowledge.
              </Text>
              </View>
            </View>

            <View style={[styles.roleGrid, wide && styles.roleGridWide]}>
              {ROLE_OPTIONS.map((option, index) => (
                <RoleOptionCard
                  key={option.category}
                  {...option}
                  index={index}
                  onPress={() => onSelectCategory(option.category)}
                />
              ))}
            </View>

            <SurfaceCard style={styles.capabilitiesCard}>
              <View style={styles.capabilitiesHeader}>
                <View style={styles.capabilitiesCopy}>
                  <Text style={[styles.capabilitiesEyebrow, { color: colors.textSecondary }]}>Inside the platform</Text>
                  <Text style={[styles.capabilitiesTitle, { color: colors.navy }]}>One academic service workspace</Text>
                </View>
                <StatusBadge label="Role-based access" tone="muted" />
              </View>
              <View style={styles.capabilityGrid}>
                {SERVICE_CAPABILITIES.map(capability => (
                  <View key={capability.label} style={[styles.capabilityItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <AcademicIcon name={capability.icon} size={16} color={colors.primary} animated={false} />
                    <Text style={[styles.capabilityLabel, { color: colors.textSecondary }]}>{capability.label}</Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>

            <View style={[styles.trustNote, { borderTopColor: colors.border }]}>
              <AcademicIcon name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} size={17} color={colors.primary} />
              <Text style={[styles.trustText, { color: colors.textSecondary }]}>Your account role is verified securely after sign-in.</Text>
            </View>
            <Text style={[styles.footerNote, { color: colors.textTertiary }]}>CAS Assist · College of Arts and Sciences · New Era University</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  scrollWide: { paddingVertical: Spacing.five },
  content: { width: '100%', maxWidth: 560, gap: Spacing.four },
  contentWide: { maxWidth: 1080 },
  heroHeader: { width: '100%', maxWidth: 820, alignSelf: 'center', alignItems: 'center', gap: Spacing.three },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  brandName: { fontFamily: Fonts.sans, fontSize: 19, lineHeight: 24, fontWeight: '600', letterSpacing: -0.3 },
  brandMeta: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '600' },
  heroCopy: { width: '100%', maxWidth: 680, alignItems: 'center', gap: Spacing.two },
  welcomeTitle: { fontFamily: Fonts.sans, fontSize: 36, lineHeight: 42, fontWeight: '600', letterSpacing: -0.8, textAlign: 'center' },
  welcomeTitleWide: { fontSize: 48, lineHeight: 54, maxWidth: 760 },
  welcomeBody: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, maxWidth: 620, textAlign: 'center' },
  roleGrid: { gap: Spacing.three },
  roleGridWide: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.three },
  roleCardShell: { flex: 1, minWidth: 0, ...Shadows.card },
  rolePressable: { flex: 1, borderRadius: Radius.card },
  roleCard: { minHeight: 220, flex: 1, justifyContent: 'space-between', gap: Spacing.three, padding: Spacing.four },
  roleIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  roleCopy: { flex: 1, gap: Spacing.one },
  roleEyebrow: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  roleTitle: { fontFamily: Fonts.sans, fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.35 },
  roleDescription: { fontFamily: Fonts.sans, fontSize: TypeScale.control, lineHeight: 22 },
  roleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  roleCta: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600' },
  roleAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  capabilitiesCard: { gap: Spacing.three, padding: Spacing.three },
  capabilitiesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  capabilitiesCopy: { gap: 2, flex: 1, minWidth: 180 },
  capabilitiesEyebrow: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase' },
  capabilitiesTitle: { fontFamily: Fonts.sans, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  capabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  capabilityItem: { flexGrow: 1, flexBasis: 210, minWidth: 0, minHeight: 40, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  capabilityLabel: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '500' },
  pressed: { opacity: 0.9 },
  trustNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: 1 },
  trustText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, textAlign: 'center' },
  footerNote: { fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});

```

## Frontend/src/components/auth/login-screen.tsx
**tsx · 204 lines · Authentication UI component.**

```tsx
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';
import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAuth, type LoginCategory } from '@/context/auth';
import { useAppTheme } from '@/context/theme';

interface Props {
  category: LoginCategory;
  onNavigateToRegister: () => void;
  onChangeCategory: () => void;
}

export default function LoginScreen({ category, onNavigateToRegister, onChangeCategory }: Props) {
  const { signIn, profileError } = useAuth();
  const { colors } = useAppTheme();
  const isStudent = category === 'student';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  async function handleSignIn() {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!trimmedEmail.endsWith('@neu.edu.ph')) {
      setError('Only @neu.edu.ph email addresses are allowed.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn(trimmedEmail, password, category);
    setLoading(false);

    if (authError) setError(authError);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.primary, borderColor: colors.border }]}>
              <AcademicIcon
                name={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }}
                color="#FFFFFF"
                size={34}
              />
            </View>
            <Text style={[styles.appName, { color: colors.navy }]}>CAS Assist</Text>
            <Text style={[styles.appSub, { color: colors.primary }]}>College of Arts and Sciences</Text>
            <Text style={[styles.appCopy, { color: colors.textSecondary }]}>AI-assisted department information and helpdesk for New Era University.</Text>
          </View>

          <SurfaceCard style={styles.card}>
            <StatusBadge label={isStudent ? 'Student access' : 'Institutional access'} tone={isStudent ? 'blue' : 'success'} />
            <Text style={[styles.formTitle, { color: colors.navy }]}>{isStudent ? 'Student sign in' : 'Staff, Faculty & Admin sign in'}</Text>
            <Text style={[styles.formSub, { color: colors.textSecondary }]}>
              {isStudent ? 'Access your CAS academic workspace.' : 'Use your authorized institutional account.'}
            </Text>

            {error || profileError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error ?? profileError}</Text>
              </View>
            ) : null}

            <TextField
              label="NEU Email"
              placeholder="yourname@neu.edu.ph"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              keyboardType="email-address"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              editable={!loading}
            />

            <TextField
              label="Password"
              inputRef={passwordInputRef}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              importantForAutofill="yes"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={handleSignIn}
              editable={!loading}
              trailing={
                <Pressable
                  onPress={() => setShowPass(value => !value)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
                  <Text style={[styles.showText, { color: colors.primary }]}>{showPass ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />

            <ActionButton
              label="Sign In"
              onPress={handleSignIn}
              loading={loading}
            />
          </SurfaceCard>

          <View style={styles.footer}>
            {isStudent ? (
              <>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don&apos;t have an account?</Text>
                <Pressable onPress={onNavigateToRegister}>
                  <Text style={[styles.footerLink, { color: colors.primary }]}>Register</Text>
                </Pressable>
              </>
            ) : (
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Authorized accounts only.</Text>
            )}
            <Text style={[styles.footerDivider, { color: colors.border }]}>•</Text>
            <Pressable onPress={onChangeCategory}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Change account type</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 40,
    gap: Spacing.four,
  },
  brand: { alignItems: 'center', gap: 8 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    boxShadow: '0 18px 44px rgba(11, 125, 119, 0.24)',
  },
  appName: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.display, fontWeight: '600', letterSpacing: -0.8 },
  appSub: { color: Academic.primary, fontFamily: Fonts.sans, fontSize: TypeScale.body, fontWeight: '500', letterSpacing: 0.15 },
  appCopy: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center', maxWidth: 340 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: 16, padding: Spacing.four },
  formTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '600', letterSpacing: -0.45 },
  formSub: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20 },
  errorBox: { borderRadius: 12, padding: 11, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: TypeScale.body, fontWeight: '600' },
  showText: { color: Academic.primary, fontSize: TypeScale.body, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  footerText: { color: Academic.textSecondary, fontSize: TypeScale.body },
  footerDivider: { color: Academic.border, fontSize: TypeScale.body, marginHorizontal: 3 },
  footerLink: { color: Academic.primary, fontSize: TypeScale.body, fontWeight: '500' },
});

```

## Frontend/src/components/auth/register-screen.tsx
**tsx · 273 lines · Authentication UI component.**

```tsx
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';
import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';

interface Props {
  onNavigateToLogin: () => void;
  onChangeAccountType: () => void;
}

export default function RegisterScreen({ onNavigateToLogin, onChangeAccountType }: Props) {
  const { signUp } = useAuth();
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleRegister() {
    setError(null);
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedStudentNumber = studentNumber.replace(/\s+/g, '');

    if (!trimmedName) { setError('Full name is required.'); return; }
    if (!trimmedEmail.endsWith('@neu.edu.ph')) {
      setError('Only @neu.edu.ph email addresses are allowed.');
      return;
    }
    if (!normalizedStudentNumber) { setError('Student number is required.'); return; }
    if (!/^[0-9-]{5,24}$/.test(normalizedStudentNumber) || normalizedStudentNumber.replace(/\D/g, '').length < 5) {
      setError('Enter a valid student number using 5 to 24 digits and hyphens.');
      return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error: authError, needsConfirmation } = await signUp(
      trimmedEmail,
      password,
      trimmedName,
      normalizedStudentNumber,
    );
    setLoading(false);

    if (authError) {
      setError(authError);
    } else if (needsConfirmation) {
      setConfirmed(true);
    }
  }

  if (confirmed) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <View style={styles.confirmedContainer}>
          <View style={[styles.confirmedIcon, { backgroundColor: colors.softBlue }]}>
            <AcademicIcon
              name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
              color={colors.primary}
              size={34}
            />
          </View>
          <Text style={[styles.confirmedTitle, { color: colors.navy }]}>Check Your Email</Text>
          <Text style={[styles.confirmedBody, { color: colors.textSecondary }]}>
            We sent a confirmation link to {email}. Activate your account, then sign in.
          </Text>
          <ActionButton label="Go to Sign In" onPress={onNavigateToLogin} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.primary, borderColor: colors.border }]}>
              <AcademicIcon
                name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
                color="#FFFFFF"
                size={32}
              />
            </View>
            <Text style={[styles.formTitle, { color: colors.navy }]}>Create Account</Text>
            <Text style={[styles.formSub, { color: colors.textSecondary }]}>Self-registration is open to CAS students only.</Text>
          </View>

          <SurfaceCard style={styles.card}>
            <StatusBadge label="Student self-registration" tone="blue" />
            <View style={[styles.rulesBox, { backgroundColor: colors.softBlue, borderColor: colors.border }]}>
              <Text style={[styles.rulesTitle, { color: colors.navy }]}>Before you begin</Text>
              <Text style={[styles.rulesText, { color: colors.textSecondary }]}>Use your NEU email, official student number, and a password with at least 8 characters.</Text>
            </View>
            {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}

            <TextField
              label="Full Name"
              placeholder="Juan Dela Cruz"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />

            <TextField
              label="NEU Email"
              placeholder="yourname@neu.edu.ph"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
              hint={email.length > 0 && !email.toLowerCase().endsWith('@neu.edu.ph') ? 'Must end with @neu.edu.ph' : undefined}
            />

            <TextField
              label="Student Number"
              placeholder="e.g. 23-12345-678"
              value={studentNumber}
              onChangeText={value => setStudentNumber(value.replace(/[^0-9-]/g, '').slice(0, 24))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              maxLength={24}
              editable={!loading}
              hint="Use the student number issued by NEU."
            />

            <TextField
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              editable={!loading}
              trailing={
                <Pressable
                  onPress={() => setShowPass(value => !value)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
                  <Text style={[styles.showText, { color: colors.primary }]}>{showPass ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />

            <TextField
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!loading}
              error={confirm.length > 0 && password !== confirm ? 'Passwords do not match' : undefined}
              trailing={
                <Pressable
                  onPress={() => setShowConfirm(value => !value)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}>
                  <Text style={[styles.showText, { color: colors.primary }]}>{showConfirm ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />

            <ActionButton label="Create Account" onPress={handleRegister} loading={loading} />
          </SurfaceCard>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
            <Pressable onPress={onNavigateToLogin}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.border }]}>•</Text>
            <Pressable onPress={onChangeAccountType}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Change account type</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 40,
    gap: Spacing.four,
  },
  header: { alignItems: 'center', gap: 8 },
  logo: {
    width: 70,
    height: 70,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    boxShadow: '0 18px 44px rgba(11, 125, 119, 0.24)',
  },
  formTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '600', letterSpacing: -0.45 },
  formSub: { color: Academic.textSecondary, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center' },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 15, padding: Spacing.four },
  rulesBox: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 3 },
  rulesTitle: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600' },
  rulesText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17 },
  errorBox: { borderRadius: 12, padding: 11, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: TypeScale.body, fontWeight: '600' },
  showText: { color: Academic.primary, fontSize: TypeScale.body, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  footerText: { color: Academic.textSecondary, fontSize: 14 },
  footerDivider: { color: Academic.border, fontSize: 14, marginHorizontal: 3 },
  footerLink: { color: Academic.primary, fontSize: 14, fontWeight: '500' },
  confirmedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 18,
  },
  confirmedIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  confirmedTitle: { color: Academic.navy, fontSize: TypeScale.title, fontWeight: '600', textAlign: 'center' },
  confirmedBody: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});

```

## Frontend/src/components/authenticated-error-boundary.tsx
**tsx · 80 lines · Reusable frontend component.**

```tsx
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Academic } from '@/components/ui/academic-ui';

interface Props {
  children: ReactNode;
  onSignOut: () => Promise<void>;
}

export default class AuthenticatedErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('Authenticated application render failed', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>CAS Assist could not display this screen</Text>
        <Text style={styles.message}>Please retry. If the problem continues, sign out and sign in again.</Text>
        <Pressable style={styles.primaryButton} onPress={() => this.setState({ hasError: false })}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => void this.props.onSignOut()}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
    backgroundColor: Academic.background,
  },
  title: { color: Academic.navy, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  message: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  secondaryButtonText: { color: Academic.navy, fontSize: 16, fontWeight: '600' },
});

```

## Frontend/src/components/dashboard/admin-dashboard-home.tsx
**tsx · 276 lines · Role dashboard or responsive dashboard primitive.**

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AppBackdrop,
  EmptyState,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui/academic-ui';
import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

interface RecentUser {
  id: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error'> = {
  student: 'blue',
  faculty: 'warning',
  staff: 'success',
  super_admin: 'error',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboardHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const theme = useTheme();
  const [stats, setStats] = useState({ users: 0, openTickets: 0, actionReq: 0, announcements: 0 });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [userCount, ticketData, actionCount, annCount, latestUsers] = await Promise.all([
      supabase.from('users_account_registry').select('id', { count: 'exact', head: true }),
      supabase.from('advising_ticket_pipeline').select('status').eq('state', 'active'),
      supabase.from('advising_ticket_pipeline').select('id', { count: 'exact', head: true }).eq('status', 'action_required'),
      supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('state', 'published'),
      supabase.from('users_account_registry').select('id, display_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const openCount = (ticketData.data ?? []).filter(t => t.status === 'submitted').length;
    setStats({
      users: userCount.count ?? 0,
      openTickets: openCount,
      actionReq: actionCount.count ?? 0,
      announcements: annCount.count ?? 0,
    });
    setRecentUsers(latestUsers.data ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Administration"
          title="System Overview"
          subtitle={profile?.email ?? 'Monitor users, operations, and CAS service activity.'}
        />

        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricCard
                label="Total users"
                value={stats.users}
                icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
                tone="blue"
              />
              <MetricCard
                label="Open tickets"
                value={stats.openTickets}
                icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                tone="warning"
              />
              <MetricCard
                label="Action required"
                value={stats.actionReq}
                icon={{ ios: 'exclamationmark.circle', android: 'priority_high', web: 'priority_high' }}
                tone="error"
              />
              <MetricCard
                label="Announcements"
                value={stats.announcements}
                icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
                tone="success"
              />
            </View>
          </>
        )}

        <View style={styles.snapshotGrid}>
          <SurfaceCard style={styles.snapshotCard}>
            <SectionHeader title="Service activity" />
            <View style={styles.snapshotRows}>
              <View style={[styles.snapshotRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Open requests</Text>
                <Text style={[styles.snapshotValue, { color: theme.navy }]}>{stats.openTickets}</Text>
              </View>
              <View style={[styles.snapshotRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Action required</Text>
                <Text style={[styles.snapshotValue, { color: theme.navy }]}>{stats.actionReq}</Text>
              </View>
              <View style={styles.snapshotRow}>
                <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Published updates</Text>
                <Text style={[styles.snapshotValue, { color: theme.navy }]}>{stats.announcements}</Text>
              </View>
            </View>
          </SurfaceCard>
          <SurfaceCard style={styles.snapshotCard}>
            <SectionHeader title="Account overview" />
            <Text style={[styles.snapshotDescription, { color: theme.textSecondary }]}>The account registry is the source of truth for student, faculty, staff, and administrator access.</Text>
            <View style={[styles.accountCallout, { backgroundColor: theme.softBlue }]}>
              <Text style={[styles.accountCalloutValue, { color: theme.primary }]}>{stats.users}</Text>
              <Text style={[styles.accountCalloutLabel, { color: theme.textSecondary }]}>registered accounts</Text>
            </View>
          </SurfaceCard>
        </View>

        <SectionHeader title="Admin Tools" action="Open panel" onAction={() => router.navigate('/admin')} />
        <View style={dashboardActionGridStyles.grid}>
            <DashboardActionCard
              label="Ticket Operations"
              caption="Review and update active requests."
              size="wide"
            icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'tickets' } })}
          />
          <DashboardActionCard
            label="Post Announcement"
            caption="Publish department-wide updates."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'announce' } })}
          />
          <DashboardActionCard
            label="Document Requests"
            caption="Open the authorized document queue."
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'documents' } })}
          />
          <DashboardActionCard
            label="Users"
            caption="Manage account registry entries."
            icon={{ ios: 'person.crop.circle.badge.checkmark', android: 'manage_accounts', web: 'manage_accounts' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'users' } })}
          />
          <DashboardActionCard
            label="System Analytics"
            caption="Review existing service metrics."
            icon={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }}
            onPress={() => router.navigate('/analytics')}
          />
          {profile?.role === 'super_admin' ? (
            <DashboardActionCard
              label="Audit History"
              caption="Review protected ticket events."
              icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
              onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'audit' } })}
            />
          ) : null}
        </View>

        <SectionHeader title="Recently Registered" />
        {recentUsers.length === 0 ? (
          <EmptyState
            title="No users yet"
            message="New account registry entries will appear here."
            icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
          />
        ) : (
          recentUsers.map(user => (
            <SurfaceCard key={user.id} style={styles.userCard}>
              <View style={[styles.userAvatar, { backgroundColor: theme.softBlue }]}>
                <Text style={[styles.userInitial, { color: theme.primary }]}>{(user.display_name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.navy }]} numberOfLines={1}>{user.display_name}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>{user.email}</Text>
                <Text style={[styles.userDate, { color: theme.textSecondary }]}>Joined {formatDate(user.created_at)}</Text>
              </View>
              <StatusBadge label={user.role.replace('_', ' ')} tone={ROLE_TONE[user.role] ?? 'muted'} />
            </SurfaceCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  loader: { marginTop: Spacing.four },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  snapshotCard: { flexGrow: 1, flexBasis: 320, minWidth: 0, gap: Spacing.three },
  snapshotRows: { gap: 0 },
  snapshotRow: { minHeight: 42, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  snapshotLabel: { fontSize: 13, fontWeight: '600' },
  snapshotValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  snapshotDescription: { fontSize: 13, lineHeight: 19 },
  accountCallout: { minHeight: 58, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  accountCalloutValue: { fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  accountCalloutLabel: { fontSize: 13, fontWeight: '500' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  userInitial: { color: Academic.primary, fontSize: 18, fontWeight: '600' },
  userInfo: { flex: 1, gap: 2 },
  userName: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  userEmail: { color: Academic.textSecondary, fontSize: 12 },
  userDate: { color: Academic.textSecondary, fontSize: 11, fontWeight: '400' },
});

```

## Frontend/src/components/dashboard/dashboard-primitives.tsx
**tsx · 193 lines · Role dashboard or responsive dashboard primitive.**

```tsx
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  AcademicIcon,
  SurfaceCard,
  type AcademicIconName,
  type StatusTone,
} from '@/components/ui/academic-ui';
import { Fonts, Layout, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';

type DashboardActionTone = Extract<StatusTone, 'blue' | 'success' | 'warning' | 'error'>;

function getToneColors(tone: DashboardActionTone, colors: ReturnType<typeof useAppTheme>['colors']) {
  switch (tone) {
    case 'success':
      return { background: colors.successBg, foreground: colors.success };
    case 'warning':
      return { background: colors.warningBg, foreground: colors.warning };
    case 'error':
      return { background: colors.errorBg, foreground: colors.error };
    case 'blue':
    default:
      return { background: colors.softBlue, foreground: colors.primary };
  }
}

export function DashboardActionCard({
  label,
  caption,
  icon,
  onPress,
  tone = 'blue',
  size = 'compact',
}: {
  label: string;
  caption?: string;
  icon: AcademicIconName;
  onPress: () => void;
  tone?: DashboardActionTone;
  size?: 'wide' | 'compact';
}) {
  const { colors } = useAppTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const toneColors = getToneColors(tone, colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={caption}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.actionPressable,
        size === 'wide' && styles.actionWide,
        hovered && styles.actionHovered,
        focused && { outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.primary, outlineOffset: 2 },
        pressed && styles.actionPressed,
      ]}>
      <SurfaceCard style={[styles.actionCard, { borderColor: hovered || focused ? toneColors.foreground : colors.border }]}>
        <View style={[styles.actionIcon, { backgroundColor: toneColors.background }]}>
          <AcademicIcon name={icon} color={toneColors.foreground} size={21} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.actionLabel, { color: colors.navy }]} numberOfLines={2}>{label}</Text>
          {caption ? <Text style={[styles.actionCaption, { color: colors.textSecondary }]} numberOfLines={2}>{caption}</Text> : null}
        </View>
        <View style={[styles.actionArrow, { backgroundColor: hovered || focused ? toneColors.foreground : colors.backgroundSelected }]}>
          <AcademicIcon
            name={{ ios: 'arrow.up.right', android: 'chevron_right', web: 'chevron_right' }}
            color={hovered || focused ? '#FFFFFF' : toneColors.foreground}
            size={18}
          />
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

export const dashboardActionGridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});

export type BentoSize = 'wide' | 'medium' | 'compact';

/**
 * A platform-safe bento layout. It uses flex-basis instead of web-only grid
 * properties so the same information hierarchy reflows on native screens.
 */
export function BentoGrid({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.bentoGrid, style]}>{children}</View>;
}

export function BentoPanel({
  children,
  size = 'medium',
  style,
}: {
  children: ReactNode;
  size?: BentoSize;
  style?: object;
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < Layout.compactBreakpoint;
  const isDesktop = width >= Layout.wideBreakpoint;
  const basis = isMobile
    ? '100%'
    : size === 'wide'
      ? isDesktop ? '64%' : '100%'
      : size === 'compact'
        ? isDesktop ? '31%' : '48%'
        : isDesktop ? '47%' : '48%';

  return <View style={[styles.bentoPanel, { flexBasis: basis }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  bentoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: Spacing.three,
    minWidth: 0,
  },
  bentoPanel: {
    minWidth: 0,
    flexGrow: 1,
  },
  actionPressable: {
    flexGrow: 1,
    flexBasis: 210,
    flexShrink: 1,
    minWidth: 0,
    borderRadius: Radius.card,
  },
  actionWide: { flexBasis: 430 },
  actionHovered: {
    transform: [{ translateY: -2 }],
  },
  actionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  actionCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  actionLabel: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.control,
    lineHeight: 19,
    fontWeight: '600',
  },
  actionCaption: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.caption,
    lineHeight: 17,
  },
  actionArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

```

## Frontend/src/components/dashboard/faculty-dashboard.tsx
**tsx · 654 lines · Role dashboard or responsive dashboard primitive.**

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  IconButton,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui/academic-ui';
import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface Schedule {
  id: string;
  day: string;
  subject_code: string;
  subject_name: string;
  section: string;
  room: string;
  time_start: string;
  time_end: string;
}

interface FacultyAssignment {
  id: string;
  subject_code: string;
  subject_title: string;
  section_code: string;
  room: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  publish_at: string;
}

interface AckedRoomChange {
  id: string;
  original_room: string;
  new_room: string;
  subject_code: string | null;
  section_code: string | null;
  effective_at: string;
  ack_count: number;
}

type FacultyView = 'main' | 'room-change';
type ScheduleView = 'today' | 'week';

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function FacultyDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const theme = useTheme();

  const [view, setView] = useState<FacultyView>('main');
  const [scheduleView, setScheduleView] = useState<ScheduleView>('today');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myRoomChanges, setMyRoomChanges] = useState<AckedRoomChange[]>([]);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [origRoom, setOrigRoom] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [posting, setPosting] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);
  const [rcSuccess, setRcSuccess] = useState(false);

  const today = DAYS[new Date().getDay()];
  const profileId = profile?.id;

  const fetchData = useCallback(async () => {
    const userId = profileId;
    const [schRes, assignmentRes, annRes] = await Promise.all([
      userId
        ? supabase
            .from('schedules')
            .select('id, day, subject_code, subject_name, section, room, time_start, time_end')
            .eq('faculty_id', userId)
            .eq('state', 'active')
            .order('time_start', { ascending: true })
        : Promise.resolve({ data: [] }),
      userId
        ? supabase
            .from('faculty_assignments')
            .select('id, subject_code, subject_title, section_code, room')
            .eq('faculty_id', userId)
            .eq('is_active', true)
            .order('subject_code', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from('announcements')
        .select('id, title, body, publish_at')
        .eq('state', 'published')
        .order('publish_at', { ascending: false })
        .limit(3),
    ]);
    setSchedules(schRes.data ?? []);
    setAssignments((assignmentRes.data as FacultyAssignment[] | null) ?? []);
    setAnnouncements(annRes.data ?? []);
  }, [profileId]);

  const fetchMyRoomChanges = useCallback(async () => {
    if (!profileId) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from('spatial_logs')
      .select('id, original_room, new_room, subject_code, section_code, effective_at')
      .eq('faculty_id', profileId)
      .gte('effective_at', since)
      .order('effective_at', { ascending: false })
      .limit(5);

    if (!logs || logs.length === 0) { setMyRoomChanges([]); return; }

    const ids = logs.map((l: { id: string }) => l.id);
    const { data: acks } = await supabase
      .from('spatial_log_acknowledgments')
      .select('spatial_log_id')
      .in('spatial_log_id', ids);

    const countMap: Record<string, number> = {};
    for (const ack of (acks ?? [])) {
      countMap[ack.spatial_log_id] = (countMap[ack.spatial_log_id] ?? 0) + 1;
    }

    setMyRoomChanges(logs.map((l: Omit<AckedRoomChange, 'ack_count'>) => ({ ...l, ack_count: countMap[l.id] ?? 0 })));
  }, [profileId]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchMyRoomChanges()]);
    setLoading(false);
  }, [fetchData, fetchMyRoomChanges]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchMyRoomChanges()]);
    setRefreshing(false);
  }

  useEffect(() => {
    void load();

    const channel = supabase
      .channel('faculty-acks-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spatial_log_acknowledgments' },
        (payload) => {
          const spatialLogId = (payload.new as { spatial_log_id: string }).spatial_log_id;
          setMyRoomChanges(prev =>
            prev.map(rc => rc.id === spatialLogId ? { ...rc, ack_count: rc.ack_count + 1 } : rc)
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function handleRoomChange() {
    setRcError(null);
    const assignment = assignments.find(item => item.id === selectedAssignmentId);
    if (!assignment) {
      setRcError('Select one of your active class assignments.');
      return;
    }
    if (!origRoom.trim() || !newRoom.trim()) {
      setRcError('Original room and new room are required.');
      return;
    }
    setPosting(true);

    const { data: insertedLog, error } = await supabase
      .from('spatial_logs')
      .insert({
        faculty_id: profile!.id,
        assignment_id: assignment.id,
        original_room: origRoom.trim(),
        new_room: newRoom.trim(),
        subject_code: assignment.subject_code,
        section_code: assignment.section_code,
        reason: reason.trim() || null,
      })
      .select('id, original_room, new_room, subject_code, section_code, effective_at')
      .single();
    setPosting(false);
    if (error) {
      setRcError(error.message);
    } else {
      if (insertedLog) setMyRoomChanges(prev => [{ ...insertedLog, ack_count: 0 }, ...prev]);
      setSelectedAssignmentId(null); setOrigRoom(''); setNewRoom(''); setReason('');
      setRcSuccess(true);
      setTimeout(() => { setRcSuccess(false); setView('main'); }, 1600);
    }
  }

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);
  const todaySchedules = useMemo(() => schedules.filter(schedule => schedule.day === today), [schedules, today]);
  const visibleSchedules = scheduleView === 'today' ? todaySchedules : schedules;

  function selectAssignment(assignment: FacultyAssignment) {
    setSelectedAssignmentId(assignment.id);
    setOrigRoom(assignment.room ?? '');
    setRcError(null);
  }

  if (view === 'room-change') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <AppBackdrop />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}>
          <View style={styles.formHeader}>
            <IconButton
              icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              onPress={() => setView('main')}
              label="Back"
              bg={theme.muted}
              color={theme.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: theme.navy }]}>Log Room Change</Text>
              <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Notify students of a classroom relocation.</Text>
            </View>
          </View>

          {rcError ? <View style={[styles.errorBox, { backgroundColor: theme.errorBg }]}><Text style={[styles.errorText, { color: theme.error }]}>{rcError}</Text></View> : null}
          {rcSuccess ? <View style={[styles.successBox, { backgroundColor: theme.successBg }]}><Text style={[styles.successText, { color: theme.success }]}>Room change logged and students notified.</Text></View> : null}

          <SectionHeader title="Class Assignment" />
          {assignments.length === 0 ? (
            <EmptyState
              title="No active class assignments"
              message="A staff administrator must assign a subject and section before you can log a room change."
              icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
            />
          ) : (
            <View style={styles.assignmentList}>
              {assignments.map(assignment => {
                const selected = assignment.id === selectedAssignmentId;
                return (
                  <Pressable
                    key={assignment.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => selectAssignment(assignment)}
                    style={[
                      styles.assignmentOption,
                      {
                        backgroundColor: selected ? theme.softBlue : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <View style={styles.assignmentCopy}>
                      <Text style={[styles.assignmentTitle, { color: theme.navy }]}>{assignment.subject_code} - {assignment.subject_title}</Text>
                      <Text style={[styles.assignmentMeta, { color: theme.textSecondary }]}>Section {assignment.section_code} · {assignment.room || 'Room not set'}</Text>
                    </View>
                    <StatusBadge label={selected ? 'Selected' : 'Select'} tone={selected ? 'success' : 'muted'} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {[
            { label: 'Original Room *', value: origRoom, set: setOrigRoom, placeholder: 'e.g. CAS 402' },
            { label: 'New Room *', value: newRoom, set: setNewRoom, placeholder: 'e.g. Main Lib 2' },
          ].map(field => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{field.label}</Text>
              <TextInput
                placeholder={field.placeholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.navy, backgroundColor: theme.card, borderColor: theme.border }]}
                value={field.value}
                onChangeText={field.set}
              />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason (optional)</Text>
            <TextInput
              style={[styles.textarea, { color: theme.navy, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="e.g. Room maintenance"
              placeholderTextColor={theme.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formActions}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, { backgroundColor: theme.muted }, pressed && styles.pressed]}
              onPress={() => { setRcError(null); setView('main'); }}
              disabled={posting}>
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary }, (pressed || posting) && styles.pressed]}
              onPress={handleRoomChange}
              disabled={posting || assignments.length === 0}>
              {posting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Publish notice</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Faculty"
          title={`Hello, ${firstName}`}
          subtitle="Manage academic concerns and class updates."
        />

        <View style={styles.metricsRow}>
          <MetricCard
            label="Classes today"
            value={todaySchedules.length}
            icon={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            tone="blue"
          />
          <MetricCard
            label="Room updates"
            value={myRoomChanges.length}
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            tone="warning"
          />
          <MetricCard
            label="Active assignments"
            value={assignments.length}
            icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
            tone="success"
          />
        </View>

        <SectionHeader title="Faculty Actions" />
        <View style={dashboardActionGridStyles.grid}>
          <DashboardActionCard
            label="Log Room Change"
            caption="Notify students using an active assignment."
            size="wide"
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            onPress={() => {
              if (assignments.length === 1) selectAssignment(assignments[0]);
              setView('room-change');
            }}
          />
          <DashboardActionCard
            label="Department Updates"
            caption="Review published CAS announcements."
            icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
            onPress={() => router.navigate('/explore')}
          />
        </View>

        <View style={styles.scheduleToolbar}>
          <SectionHeader title={scheduleView === 'today' ? "Today's Classes" : 'Weekly Schedule'} action={scheduleView === 'today' ? todayLabel : `${schedules.length} meetings`} onAction={() => {}} />
          <View style={styles.scheduleFilters}>
            {(['today', 'week'] as const).map(option => {
              const active = scheduleView === option;
              return (
                <Pressable key={option} onPress={() => setScheduleView(option)} style={[styles.scheduleFilter, { backgroundColor: active ? theme.primary : theme.muted }]}>
                  <Text style={[styles.scheduleFilterText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{option === 'today' ? 'Today' : 'Full week'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : visibleSchedules.length === 0 ? (
          <EmptyState
            title={scheduleView === 'today' ? 'No classes scheduled today' : 'No weekly schedule published'}
            message={scheduleView === 'today' ? 'There are no active class schedules assigned for today.' : 'There are no active class schedules assigned to your account.'}
            icon={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
          />
        ) : (
          visibleSchedules.map(schedule => (
            <SurfaceCard key={schedule.id} accent="blue" style={styles.scheduleCard}>
              <View style={styles.scheduleTop}>
                <View style={styles.scheduleIcon}>
                  <AcademicIcon
                    name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
                    color={theme.primary}
                    size={21}
                  />
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={[styles.scheduleTitle, { color: theme.navy }]} numberOfLines={1}>
                    {schedule.subject_code} - {schedule.subject_name}
                  </Text>
                  <Text style={[styles.scheduleMeta, { color: theme.textSecondary }]}>
                    {scheduleView === 'week' ? `${schedule.day.charAt(0).toUpperCase()}${schedule.day.slice(1)} · ` : ''}Section {schedule.section} - {schedule.room}
                  </Text>
                </View>
              </View>
              <Text style={[styles.scheduleTime, { color: theme.primary }]}>
                {formatTime(schedule.time_start)} - {formatTime(schedule.time_end)}
              </Text>
            </SurfaceCard>
          ))
        )}

        <SectionHeader title="Assigned Classes" action="Log a room change" onAction={() => setView('room-change')} />
        {assignments.length === 0 ? (
          <EmptyState
            title="No active assignments"
            message="Your teaching load is assigned by a CAS administrator."
            icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
          />
        ) : (
          assignments.map(assignment => (
            <SurfaceCard key={assignment.id} style={styles.assignmentCard} accent="success">
              <View style={styles.assignmentCardIcon}>
                <AcademicIcon
                  name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
                  color={theme.success}
                  size={19}
                  animated={false}
                />
              </View>
              <View style={styles.assignmentCardCopy}>
                <Text style={[styles.assignmentCardTitle, { color: theme.navy }]} numberOfLines={1}>
                  {assignment.subject_code} - {assignment.subject_title}
                </Text>
                <Text style={[styles.assignmentCardMeta, { color: theme.textSecondary }]}>
                  Section {assignment.section_code} - {assignment.room || 'Room not set'}
                </Text>
              </View>
            </SurfaceCard>
          ))
        )}

        <SectionHeader title="My Room Changes" />
        {myRoomChanges.length === 0 ? (
          <EmptyState
            title="No active room changes"
            message="Room changes you post in the last 24 hours will show acknowledgment counts here."
            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          />
        ) : (
          myRoomChanges.map(change => (
            <SurfaceCard key={change.id} style={styles.roomCard} accent="warning">
              <View style={styles.roomCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomTitle, { color: theme.navy }]} numberOfLines={1}>
                    {`${change.original_room} -> ${change.new_room}`}
                  </Text>
                  <Text style={[styles.roomSub, { color: theme.textSecondary }]}>
                    {[change.subject_code, change.section_code].filter(Boolean).join(' - ') || 'Room relocation'}
                  </Text>
                </View>
                <StatusBadge label={`${change.ack_count} acknowledged`} tone={change.ack_count > 0 ? 'success' : 'muted'} />
              </View>
              <Text style={[styles.roomTime, { color: theme.textSecondary }]}>{formatDate(change.effective_at)}</Text>
            </SurfaceCard>
          ))
        )}

        <SectionHeader title="Recent Announcements" action="See all" onAction={() => router.navigate('/explore')} />
        {announcements.length === 0 ? (
          <EmptyState
            title="No announcements"
            message="Active CAS announcements will appear here."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
          />
        ) : (
          announcements.map(item => {
            const expanded = expandedAnnouncementId === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedAnnouncementId(current => current === item.id ? null : item.id)}>
                <SurfaceCard style={styles.announcementCard}>
                  <Text style={[styles.announcementTitle, { color: theme.navy }]} numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
                  <Text style={[styles.announcementBody, { color: theme.textSecondary }]} numberOfLines={expanded ? undefined : 2}>{item.body}</Text>
                  <View style={styles.announcementFooter}>
                    <Text style={[styles.announcementDate, { color: theme.textSecondary }]}>{formatDate(item.publish_at)}</Text>
                    <Text style={[styles.expandText, { color: theme.primary }]}>{expanded ? 'Show less' : 'Read full announcement'}</Text>
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  assignmentList: { gap: Spacing.two },
  assignmentOption: {
    minHeight: 68,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  assignmentOptionSelected: { borderColor: Academic.primary, backgroundColor: Academic.softBlue },
  assignmentCopy: { flex: 1, gap: 3 },
  assignmentTitle: { color: Academic.navy, fontSize: 14, fontWeight: '600' },
  assignmentMeta: { color: Academic.textSecondary, fontSize: 12 },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  assignmentCardIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Academic.successBg },
  assignmentCardCopy: { flex: 1, gap: 3 },
  assignmentCardTitle: { color: Academic.navy, fontSize: 14, fontWeight: '600' },
  assignmentCardMeta: { color: Academic.textSecondary, fontSize: 12 },
  loader: { marginTop: Spacing.four },
  scheduleToolbar: { gap: Spacing.two },
  scheduleFilters: { flexDirection: 'row', gap: Spacing.two },
  scheduleFilter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  scheduleFilterText: { fontSize: 12, fontWeight: '500' },
  scheduleCard: { gap: 10 },
  scheduleTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  scheduleMeta: { color: Academic.textSecondary, fontSize: 13 },
  scheduleTime: { color: Academic.primary, fontSize: 13, fontWeight: '500' },
  roomCard: { gap: 8 },
  roomCardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  roomTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  roomSub: { color: Academic.textSecondary, fontSize: 13 },
  roomTime: { color: Academic.textSecondary, fontSize: 12 },
  announcementCard: { gap: 5 },
  announcementTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  announcementBody: { color: Academic.textSecondary, fontSize: 13, lineHeight: 18 },
  announcementFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  announcementDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  expandText: { color: Academic.primary, fontSize: 12, fontWeight: '500' },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: Spacing.four },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  pageSubtitle: { color: Academic.textSecondary, fontSize: 13, marginTop: 3 },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    borderRadius: 14,
    padding: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  primaryButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: Spacing.two },
  cancelButton: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '500' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '500' },
});

```

## Frontend/src/components/dashboard/staff-dashboard.tsx
**tsx · 390 lines · Role dashboard or responsive dashboard primitive.**

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { BentoGrid, BentoPanel, DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { apiGet } from '@/lib/api';

interface TicketRow {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  student_id: { display_name: string; email: string } | null;
}

interface QueueAnalytics {
  activeLoad: number;
  arrivalsPerHour: number;
  resolvedCount: number;
  mostLikelyMinutes: number | null;
  expectedTriangularMinutes: number | null;
  estimateSource: string;
  calculatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Resolved',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'warning',
  resolved: 'success',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function StaffDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const theme = useTheme();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [urgent, setUrgent] = useState<TicketRow[]>([]);
  const [queueAnalytics, setQueueAnalytics] = useState<QueueAnalytics | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [allTickets, urgentTickets, documents] = await Promise.all([
      supabase
        .from('advising_ticket_pipeline')
        .select('status')
        .eq('state', 'active'),
      supabase
        .from('advising_ticket_pipeline')
        .select('id, category, description, status, created_at, student_id(display_name, email)')
        .in('status', ['submitted', 'action_required'])
        .eq('state', 'active')
        .order('created_at', { ascending: true })
        .limit(5),
      supabase
        .from('document_requests')
        .select('status')
        .eq('state', 'active'),
    ]);

    const c: Record<string, number> = {};
    for (const ticket of (allTickets.data ?? [])) {
      c[ticket.status] = (c[ticket.status] ?? 0) + 1;
    }
    setCounts(c);
    setUrgent((urgentTickets.data as unknown as TicketRow[]) ?? []);
    setLoadError(allTickets.error || urgentTickets.error || documents.error
      ? 'Some operational records could not be loaded. Pull down to retry.'
      : null);
    const documentStatusCounts: Record<string, number> = {};
    for (const document of (documents.data ?? [])) {
      documentStatusCounts[document.status] = (documentStatusCounts[document.status] ?? 0) + 1;
    }
    setDocumentCounts(documentStatusCounts);
  }, []);

  const fetchQueueAnalytics = useCallback(async () => {
    try {
      const data = await apiGet<QueueAnalytics>('/api/queue/analytics?windowHours=168');
      setQueueAnalytics(data);
      setQueueError(null);
    } catch {
      setQueueAnalytics(null);
      setQueueError('Queue analytics are unavailable. The optional operations API may not be configured.');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchQueueAnalytics()]);
    setLoading(false);
  }, [fetchData, fetchQueueAnalytics]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchQueueAnalytics()]);
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, [load]);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const total = ['submitted', 'under_evaluation', 'action_required'].reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const documentsInProgress = ['submitted', 'under_evaluation', 'action_required', 'processing']
    .reduce((sum, status) => sum + (documentCounts[status] ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Staff"
          title={`Hello, ${firstName}`}
          subtitle="Monitor daily CAS support operations."
        />

        {loadError ? <View style={[styles.errorBox, { backgroundColor: theme.errorBg }]}><Text style={[styles.errorText, { color: theme.error }]}>{loadError}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricCard
                label="Waiting requests"
                value={counts.submitted ?? 0}
                icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                tone="warning"
              />
              <MetricCard
                label="Currently serving"
                value={counts.under_evaluation ?? 0}
                icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
                tone="blue"
              />
              <MetricCard
                label="Action required"
                value={counts.action_required ?? 0}
                icon={{ ios: 'exclamationmark.circle', android: 'priority_high', web: 'priority_high' }}
                tone="error"
              />
              <MetricCard
                label="Completed"
                value={counts.resolved ?? 0}
                icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                tone="success"
              />
              <MetricCard
                label="Documents processing"
                value={documentsInProgress}
                icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
                tone="blue"
              />
            </View>
          </>
        )}

        <SectionHeader title="Operations" action={`${total} active`} onAction={() => router.navigate('/admin')} />
        <View style={dashboardActionGridStyles.grid}>
          <DashboardActionCard
            label="Manage Queue"
            caption="Process existing assistance requests."
            size="wide"
            icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'tickets' } })}
          />
          <DashboardActionCard
            label="Post Announcement"
            caption="Share an authorized department update."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'announce' } })}
          />
          <DashboardActionCard
            label="Document Requests"
            caption="Open the existing processing queue."
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'documents' } })}
          />
          <DashboardActionCard
            label="View Updates"
            caption="Read current department announcements."
            icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
            onPress={() => router.navigate('/explore')}
          />
        </View>

        <BentoGrid style={styles.operationsGrid}>
          <BentoPanel size="medium" style={styles.operationsPanel}>
            <SectionHeader
              title="Queue monitor"
              action="Open ticket queue"
              onAction={() => router.navigate({ pathname: '/admin', params: { tab: 'tickets' } })}
            />
            {queueError ? (
              <EmptyState
                title="Queue analytics unavailable"
                message={queueError}
                icon={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }}
              />
            ) : queueAnalytics ? (
              <>
                <View style={styles.queueStatGrid}>
                  <View style={[styles.queueStat, { backgroundColor: theme.softBlue }]}>
                    <Text style={[styles.queueStatValue, { color: theme.navy }]}>{queueAnalytics.activeLoad}</Text>
                    <Text style={[styles.queueStatLabel, { color: theme.textSecondary }]}>Active load</Text>
                  </View>
                  <View style={[styles.queueStat, { backgroundColor: theme.warningBg }]}>
                    <Text style={[styles.queueStatValue, { color: theme.navy }]}>{queueAnalytics.arrivalsPerHour.toFixed(2)}</Text>
                    <Text style={[styles.queueStatLabel, { color: theme.textSecondary }]}>Arrivals / hour</Text>
                  </View>
                  <View style={[styles.queueStat, { backgroundColor: theme.successBg }]}>
                    <Text style={[styles.queueStatValue, { color: theme.navy }]}>{queueAnalytics.resolvedCount}</Text>
                    <Text style={[styles.queueStatLabel, { color: theme.textSecondary }]}>Resolved in window</Text>
                  </View>
                </View>
                <Text style={[styles.queueMethod, { color: theme.textSecondary }]}>Estimated service time: {queueAnalytics.expectedTriangularMinutes ?? queueAnalytics.mostLikelyMinutes ?? '—'} min · {queueAnalytics.estimateSource.replace('_', ' ')}</Text>
              </>
            ) : (
              <ActivityIndicator color={theme.primary} style={styles.loader} />
            )}
          </BentoPanel>
          <BentoPanel size="medium" style={styles.operationsPanel}>
            <SectionHeader title="Document pipeline" action="Open document queue" onAction={() => router.navigate({ pathname: '/admin', params: { tab: 'documents' } })} />
            {Object.keys(documentCounts).length === 0 ? (
              <EmptyState title="No document activity" message="Authorized document requests will appear here." icon={{ ios: 'doc.text', android: 'description', web: 'description' }} />
            ) : (
              <View style={styles.documentPipeline}>
                {['submitted', 'under_evaluation', 'processing', 'ready_for_pickup', 'completed'].map(status => (
                  <View key={status} style={[styles.documentPipelineRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.documentPipelineLabel, { color: theme.textSecondary }]}>{status.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.documentPipelineValue, { color: theme.navy }]}>{documentCounts[status] ?? 0}</Text>
                  </View>
                ))}
              </View>
            )}
          </BentoPanel>
        </BentoGrid>

        <SectionHeader title="Needs Attention" />
        {urgent.length === 0 ? (
          <EmptyState
            title="All queues are current"
            message="No submitted or action-required tickets need immediate staff action."
            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          />
        ) : (
          urgent.map(ticket => {
            const student = ticket.student_id;
            return (
              <Pressable key={ticket.id} onPress={() => router.navigate('/admin')}>
                <SurfaceCard style={styles.ticketCard} accent={ticket.status === 'action_required' ? 'warning' : 'blue'}>
                  <View style={styles.ticketTop}>
                    <View style={[styles.ticketIcon, { backgroundColor: theme.softBlue }]}>
                      <AcademicIcon
                        name={{ ios: 'doc.text', android: 'assignment', web: 'assignment' }}
                        color={theme.primary}
                        size={20}
                      />
                    </View>
                    <View style={styles.ticketBody}>
                      <View style={styles.ticketMeta}>
                        <Text style={[styles.ticketRef, { color: theme.primary }]}>{shortRef(ticket.id)}</Text>
                        <StatusBadge
                          label={STATUS_LABEL[ticket.status] ?? ticket.status}
                          tone={STATUS_TONE[ticket.status] ?? 'muted'}
                        />
                      </View>
                      <Text style={[styles.ticketTitle, { color: theme.navy }]} numberOfLines={1}>{formatCategory(ticket.category)}</Text>
                      {student ? (
                        <Text style={[styles.ticketStudent, { color: theme.textSecondary }]} numberOfLines={1}>
                          {student.display_name} - {student.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.ticketDesc, { color: theme.textSecondary }]} numberOfLines={2}>{ticket.description}</Text>
                  <Text style={[styles.ticketDate, { color: theme.textSecondary }]}>{formatDate(ticket.created_at)}</Text>
                </SurfaceCard>
              </Pressable>
            );
          })
        )}

        <SectionHeader title="Ticket status overview" action="Open operations" onAction={() => router.navigate('/admin')} />
        <SurfaceCard style={styles.statusOverview}>
          {['submitted', 'under_evaluation', 'action_required', 'resolved'].map(status => (
            <View key={status} style={[styles.statusSummary, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status] ?? 'muted'} />
              <Text style={[styles.statusSummaryValue, { color: theme.navy }]}>{counts[status] ?? 0}</Text>
            </View>
          ))}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  loader: { marginTop: Spacing.four },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  operationsGrid: { gap: Spacing.three },
  operationsPanel: { gap: Spacing.two },
  queueStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  queueStat: { flex: 1, minWidth: 92, borderRadius: 14, padding: 11, gap: 3 },
  queueStatValue: { fontSize: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  queueStatLabel: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  queueMethod: { fontSize: 11, lineHeight: 16 },
  documentPipeline: { gap: 0 },
  documentPipelineRow: { minHeight: 35, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  documentPipelineLabel: { fontSize: 12, textTransform: 'capitalize' },
  documentPipelineValue: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { fontSize: 13, fontWeight: '500' },
  ticketCard: { gap: 10 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  ticketBody: { flex: 1, gap: 3 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ticketRef: { color: Academic.primary, fontSize: 13, fontWeight: '600' },
  ticketTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  ticketStudent: { color: Academic.textSecondary, fontSize: 12 },
  ticketDesc: { color: Academic.textSecondary, fontSize: 13, lineHeight: 18 },
  ticketDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  statusOverview: { gap: Spacing.two },
  statusSummary: { minHeight: 46, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  statusSummaryValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

```

## Frontend/src/components/dashboard/student-dashboard.tsx
**tsx · 765 lines · Role dashboard or responsive dashboard primitive.**

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  type AcademicIconName,
} from '@/components/ui/academic-ui';
import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const PRIMARY = BrandColors.primary;
const NAVY = BrandColors.navy;
const CARD_BG = BrandColors.card;
const MUTED = BrandColors.textSecondary;
const BORDER = BrandColors.border;
const SOFT_BLUE = BrandColors.softBlue;
const GREEN = '#16A34A';
const SOFT_GREEN = 'rgba(162,213,171,0.40)';

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  publish_at: string;
}

interface ActiveTicket {
  id: string;
  category: string | null;
  status: string;
  created_at: string;
  priority: string | null;
}

interface RoomChange {
  id: string;
  original_room: string;
  new_room: string;
  subject_code: string | null;
  section_code: string | null;
  reason: string | null;
  effective_at: string;
  faculty_id: { display_name: string } | null;
}

type SymbolName = AcademicIconName;

const STATUS_COLOR: Record<string, string> = {
  submitted: PRIMARY,
  under_evaluation: '#F59E0B',
  action_required: '#8B5CF6',
  resolved: GREEN,
};

const STATUS_LABEL: Record<string, string> = {
  submitted: 'In Queue',
  under_evaluation: 'Under Evaluation',
  action_required: 'Needs Info',
  resolved: 'Resolved',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatCategory(value: string | null) {
  if (!value) return 'Advising Request';
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getTicketReference(id: string) {
  const digits = id.replace(/\D/g, '');
  if (digits.length >= 3) return `T-${digits.slice(-3)}`;

  const compact = id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return compact ? `T-${compact}` : 'Ticket';
}

function statusText(ticket: ActiveTicket) {
  if (ticket.status === 'under_evaluation') return 'Under evaluation';
  if (ticket.status === 'action_required') return 'Action needed';
  return formatRelative(ticket.created_at).replace('ago', 'waiting');
}

function DashboardIcon({
  name,
  size = 18,
  color = PRIMARY,
}: {
  name: SymbolName;
  size?: number;
  color?: string;
}) {
  return <AcademicIcon name={name} size={size} color={color} />;
}

function ActiveRequestCard({ ticket }: { ticket: ActiveTicket }) {
  const colors = useTheme();
  const color = STATUS_COLOR[ticket.status] ?? '#6B7280';

  return (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.requestTopRow}>
        <View style={[styles.referencePill, { backgroundColor: colors.muted }]}>
          <Text style={[styles.referenceText, { color: colors.textSecondary }]}>{getTicketReference(ticket.id)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color + '14' }]}>
          <Text style={[styles.statusBadgeText, { color }]}>
            {(STATUS_LABEL[ticket.status] ?? ticket.status).toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.requestTitle, { color: colors.navy }]} numberOfLines={2}>
        {formatCategory(ticket.category)}
      </Text>
      <View style={styles.metaRow}>
        <DashboardIcon
          name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          color={colors.textSecondary}
          size={15}
        />
        <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>{statusText(ticket)}</Text>
      </View>
      {ticket.priority && (
        <Text style={[styles.priorityText, { color: colors.textTertiary }]}>{formatCategory(ticket.priority)} priority</Text>
      )}
    </View>
  );
}

function RoomChangeCard({
  item,
  isAcknowledged,
  acknowledging,
  onAcknowledge,
}: {
  item: RoomChange;
  isAcknowledged: boolean;
  acknowledging: boolean;
  onAcknowledge: () => void;
}) {
  const colors = useTheme();
  const courseTitle = [item.subject_code, item.section_code].filter(Boolean).join(' - ') || 'Class Update';

  return (
    <View style={[
      styles.roomCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      isAcknowledged ? { borderLeftColor: colors.success } : { borderLeftColor: colors.error },
    ]}>
      <View style={styles.roomCardHeader}>
        <View style={[styles.locationIconBubble, { backgroundColor: colors.softBlue }]}>
          <DashboardIcon
            name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            color={colors.primary}
            size={20}
          />
        </View>
        <View style={styles.roomHeaderText}>
          <Text style={[styles.roomTitle, { color: colors.navy }]} numberOfLines={1}>{courseTitle}</Text>
          <Text style={[styles.roomTime, { color: colors.textTertiary }]}>{formatRelative(item.effective_at)}</Text>
        </View>
        {isAcknowledged && (
          <DashboardIcon
            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            color={colors.success}
            size={22}
          />
        )}
      </View>

      <View style={[styles.roomPath, { backgroundColor: colors.muted }]}>
        <Text style={[styles.oldRoom, { color: colors.textSecondary }]} numberOfLines={1}>{item.original_room}</Text>
        <DashboardIcon
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          color={colors.textTertiary}
          size={16}
        />
        <Text style={[styles.newRoom, { color: colors.primary }]} numberOfLines={1}>{item.new_room}</Text>
      </View>

      {(item.reason || item.faculty_id) && (
        <Text style={[styles.roomNote, { color: colors.textSecondary }]} numberOfLines={2}>
          {[item.reason, item.faculty_id && `Posted by ${item.faculty_id.display_name}`]
            .filter(Boolean)
            .join(' - ')}
        </Text>
      )}

      {isAcknowledged ? (
        <View style={[styles.ackDone, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
          <DashboardIcon
            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            color={colors.success}
            size={16}
          />
          <Text style={[styles.ackDoneText, { color: colors.success }]}>Acknowledged</Text>
        </View>
      ) : (
        <Pressable
          onPress={onAcknowledge}
          disabled={acknowledging}
          style={({ pressed }) => [
            styles.ackButton,
            { backgroundColor: colors.primary },
            (pressed || acknowledging) && styles.pressed,
          ]}>
          {acknowledging ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ackButtonText}>Acknowledge Change</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function StudentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [roomChanges, setRoomChanges] = useState<RoomChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchRoomRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const profileId = profile?.id;

  const fetchRoomChanges = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('spatial_logs')
      .select('id, original_room, new_room, subject_code, section_code, reason, effective_at, faculty_id(display_name)')
      .gte('effective_at', since)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('effective_at', { ascending: false })
      .limit(5);

    const changes = (data as unknown as RoomChange[]) ?? [];
    setRoomChanges(changes);

    if (profileId && changes.length > 0) {
      const ids = changes.map(c => c.id);
      const { data: acks } = await supabase
        .from('spatial_log_acknowledgments')
        .select('spatial_log_id')
        .in('spatial_log_id', ids)
        .eq('student_id', profileId);
      setAcknowledgedIds(new Set((acks ?? []).map((a: { spatial_log_id: string }) => a.spatial_log_id)));
    } else {
      setAcknowledgedIds(new Set());
    }
  }, [profileId]);

  async function handleAcknowledge(spatialLogId: string) {
    if (!profile?.id || acknowledgingId) return;
    setAcknowledgingId(spatialLogId);
    const { error } = await supabase.rpc('acknowledge_room_change', {
      p_spatial_log_id: spatialLogId,
    });
    if (!error) {
      setAcknowledgedIds(prev => new Set([...prev, spatialLogId]));
    }
    setAcknowledgingId(null);
  }

  const fetchData = useCallback(async () => {
    const userId = profileId;
    const [annRes, ticketRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('id, title, body, pinned, publish_at')
        .eq('state', 'published')
        .order('pinned', { ascending: false })
        .order('publish_at', { ascending: false })
        .limit(3),
      userId
        ? supabase
            .from('advising_ticket_pipeline')
            .select('id, category, status, created_at, priority')
            .eq('student_id', userId)
            .eq('state', 'active')
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] }),
    ]);

    setAnnouncements(annRes.data ?? []);
    setActiveTickets((ticketRes.data as ActiveTicket[]) ?? []);
  }, [profileId]);

  useEffect(() => {
    fetchRoomRef.current = fetchRoomChanges;
  }, [fetchRoomChanges]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchRoomChanges()]);
    setLoading(false);
  }, [fetchData, fetchRoomChanges]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchRoomChanges()]);
    setRefreshing(false);
  }

  useEffect(() => {
    void load();

    const channel = supabase
      .channel('room-changes-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spatial_logs' },
        () => {
          fetchRoomRef.current?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const unacknowledgedRoomChanges = roomChanges.filter(change => !acknowledgedIds.has(change.id)).length;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Student"
          title={`Hello, ${firstName}`}
          subtitle={profile?.state === 'archived_read_only'
            ? 'Your account is read-only while you review your academic history.'
            : 'Your academic support overview, requests, and class updates.'}
        />

        {profile?.state === 'archived_read_only' ? <StatusBadge label="Read-only account" tone="warning" /> : null}

        <View style={styles.metricsRow}>
          <MetricCard
            label="Requests shown"
            value={loading ? '—' : activeTickets.length}
            icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
            tone="blue"
          />
          <MetricCard
            label="Recent room changes"
            value={loading ? '—' : roomChanges.length}
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            tone="warning"
          />
          <MetricCard
            label="Recent updates"
            value={loading ? '—' : announcements.length}
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
            tone="success"
          />
        </View>

        <SectionHeader title="Active Requests" action="View all" onAction={() => router.navigate('/tickets')} />

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : activeTickets.length === 0 ? (
          <EmptyState
            title="No active requests"
            message="Your submitted requests will appear here."
            icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.requestRail}>
            {activeTickets.map(ticket => (
              <ActiveRequestCard key={ticket.id} ticket={ticket} />
            ))}
          </ScrollView>
        )}

        <SectionHeader
          title="Room Changes"
          badge={unacknowledgedRoomChanges > 0 ? `${unacknowledgedRoomChanges} new` : undefined}
        />

        {roomChanges.length === 0 ? (
          <EmptyState
            title="No room changes"
            message="Class relocation notices from the last 24 hours will show here."
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
          />
        ) : (
          roomChanges.map(change => (
            <RoomChangeCard
              key={change.id}
              item={change}
              isAcknowledged={acknowledgedIds.has(change.id)}
              acknowledging={acknowledgingId === change.id}
              onAcknowledge={() => handleAcknowledge(change.id)}
            />
          ))
        )}

        <View style={dashboardActionGridStyles.grid}>
          <DashboardActionCard
            label="News"
            caption="Read department announcements."
            size="wide"
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
            onPress={() => router.navigate('/explore')}
          />
          <DashboardActionCard
            label="Documents"
            caption="Open your available documents."
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            onPress={() => router.navigate('/documents')}
          />
          <DashboardActionCard
            label="FAQ"
            caption="Find common CAS answers."
            icon={{ ios: 'questionmark.circle', android: 'info', web: 'info' }}
            onPress={() => router.navigate('/faq')}
          />
          <DashboardActionCard
            label="AI Assistant"
            caption="Ask the existing CAS assistant."
            icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            onPress={() => router.navigate('/chatbot')}
          />
          <DashboardActionCard
            label="Profile"
            caption="Review your account and appearance settings."
            icon={{ ios: 'person', android: 'person', web: 'person' }}
            onPress={() => router.navigate('/profile')}
          />
        </View>

        <SectionHeader title="Recent Updates" action="See all" onAction={() => router.navigate('/explore')} />

        {announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            message="Official CAS updates will appear here."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
          />
        ) : (
          announcements.map(announcement => (
            <Pressable
              key={announcement.id}
              style={({ pressed }) => [
                styles.announcementCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={() => router.navigate('/explore')}>
              <View style={styles.announcementTop}>
                <Text style={[styles.announcementTitle, { color: theme.navy }]} numberOfLines={1}>{announcement.title}</Text>
                {announcement.pinned && (
                  <DashboardIcon
                    name={{ ios: 'pin', android: 'push_pin', web: 'push_pin' }}
                    color={theme.warning}
                    size={16}
                  />
                )}
              </View>
              <Text style={[styles.announcementBody, { color: theme.textSecondary }]} numberOfLines={2}>{announcement.body}</Text>
              <Text style={[styles.announcementDate, { color: theme.textTertiary }]}>{formatDate(announcement.publish_at)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 152,
    gap: Spacing.two,
  },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  hero: {
    minHeight: 210,
    marginHorizontal: -Spacing.three,
    marginBottom: Spacing.three,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#123936',
    boxShadow: '0 24px 64px rgba(18, 57, 54, 0.22)',
  },
  heroBackdropOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(94,209,200,0.16)',
    right: -76,
    top: -104,
  },
  heroBackdropTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(200,221,214,0.09)',
    left: -72,
    bottom: -112,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  heroCopy: { flex: 1, gap: 8 },
  heroLabel: { color: '#9FE4DD', fontSize: 12, fontWeight: '500', letterSpacing: 0.45, textTransform: 'uppercase' },
  heroTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.65 },
  heroSubtitle: { color: '#D4E5E1', fontSize: 15, lineHeight: 22 },
  readOnlyBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  readOnlyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  notificationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { color: NAVY, fontSize: 18, fontWeight: '600' },
  sectionAction: { color: PRIMARY, fontSize: 14, fontWeight: '500' },
  newBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFE4E6',
  },
  newBadgeText: { color: '#EF233C', fontSize: 12, fontWeight: '600' },
  requestRail: { gap: Spacing.three, paddingRight: Spacing.three },
  requestCard: {
    width: 238,
    minHeight: 124,
    borderRadius: 22,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.two,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    boxShadow: '0 12px 30px rgba(50, 82, 87, 0.11)',
  },
  requestTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  referencePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: BrandColors.muted,
  },
  referenceText: { color: '#60708B', fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusBadgeText: { fontSize: 10, fontWeight: '500' },
  requestTitle: { color: NAVY, fontSize: 16, fontWeight: '600', lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: MUTED, fontSize: 13, flex: 1 },
  priorityText: { color: '#A0AEC0', fontSize: 11, fontWeight: '400' },
  loadingCard: {
    height: 124,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyPanel: {
    borderRadius: 16,
    padding: Spacing.three,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  emptyTitle: { color: NAVY, fontSize: 15, fontWeight: '600' },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 18 },
  roomCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: 13,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    boxShadow: '0 6px 16px rgba(31, 42, 68, 0.06)',
  },
  roomCardUrgent: { borderLeftWidth: 4, borderLeftColor: '#D92D20' },
  roomCardDone: { borderLeftWidth: 4, borderLeftColor: GREEN },
  roomCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SOFT_BLUE,
  },
  roomHeaderText: { flex: 1, gap: 2 },
  roomTitle: { color: NAVY, fontSize: 16, fontWeight: '600' },
  roomTime: { color: '#8EA0BA', fontSize: 12, fontWeight: '600' },
  roomPath: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BrandColors.muted,
  },
  oldRoom: {
    flex: 1,
    color: '#697A94',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  newRoom: {
    flex: 1,
    color: PRIMARY,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  roomNote: { color: MUTED, fontSize: 12, lineHeight: 17 },
  ackButton: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
  },
  ackButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  ackDone: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    backgroundColor: SOFT_GREEN,
    borderWidth: 1,
    borderColor: '#BFE8CC',
  },
  ackDoneText: { color: GREEN, fontSize: 14, fontWeight: '500' },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionChipText: { color: NAVY, fontSize: 14, fontWeight: '500' },
  announcementCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: 6,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  announcementTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  announcementTitle: { color: NAVY, fontSize: 15, fontWeight: '600', flex: 1 },
  announcementBody: { color: MUTED, fontSize: 13, lineHeight: 18 },
  announcementDate: { color: '#9AA8BC', fontSize: 11, fontWeight: '600' },
});

```

## Frontend/src/components/faq/faq-screen.tsx
**tsx · 213 lines · Reusable frontend component.**

```tsx
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import RoleGuard from '@/components/role-guard';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  IconButton,
  StatusBadge,
  SurfaceCard,
  formatCategory,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

interface FaqArticle {
  id: string;
  title: string;
  category: string;
  answer: string;
  keywords: string[];
}

function FaqContent() {
  const router = useRouter();
  const colors = useTheme();
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('tier1_knowledge_articles')
      .select('id, title, category, answer, keywords')
      .eq('state', 'active')
      .order('category')
      .order('title');
    if (queryError) setError(queryError.message);
    else setArticles(data ?? []);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return articles.filter(article => {
      const matchesCategory = category === 'all' || article.category === category;
      const matchesSearch = !query || [article.title, article.answer, article.category, ...article.keywords]
        .some(value => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [articles, category, search]);

  const categories = useMemo(() => Array.from(new Set(articles.map(article => article.category))).sort(), [articles]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <View style={styles.header}>
        <IconButton
          icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          onPress={() => router.back()}
          label="Go back"
          bg={colors.muted}
          color={colors.textSecondary}
        />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.navy }]}>Frequently Asked Questions</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Approved answers used by the AI Helpdesk</Text>
        </View>
        <StatusBadge label={`${visible.length} of ${articles.length} answers`} tone="success" />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={19} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search questions and answers"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
            {['all', ...categories].map(item => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.categoryChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.categoryChipActive]}>
                  <Text style={[styles.categoryText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{item === 'all' ? 'All categories' : formatCategory(item)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.scopeNotice, { backgroundColor: colors.successBg }]}>
            <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={colors.success} size={18} />
            <Text style={[styles.scopeText, { color: colors.navy }]}>These answers cover CAS Assist workflows. Official fees, requirements, deadlines, and decisions must come from an approved institutional source.</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : error ? (
            <EmptyState title="FAQs unavailable" message={error} icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }} />
          ) : visible.length === 0 ? (
            <EmptyState title="No matching FAQ" message="Try a broader search or choose another category." icon={{ ios: 'questionmark.circle', android: 'info', web: 'info' }} />
          ) : visible.map(article => {
            const open = expanded === article.id;
            return (
              <Animated.View key={article.id} layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}>
                <Pressable onPress={() => setExpanded(open ? null : article.id)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                  <SurfaceCard style={styles.faqCard} accent={open ? 'blue' : undefined}>
                    <View style={styles.questionRow}>
                      <View style={styles.questionCopy}>
                        <StatusBadge label={formatCategory(article.category)} tone="blue" />
                        <Text selectable style={[styles.question, { color: colors.navy }]}>{article.title}</Text>
                      </View>
                      <AcademicIcon
                        name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'keyboard_arrow_up' : 'keyboard_arrow_down', web: open ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
                        color={colors.primary}
                        size={20}
                      />
                    </View>
                    {open ? (
                      <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} style={[styles.answerBox, { borderTopColor: colors.border }]}>
                        <Text selectable style={[styles.answer, { color: colors.textSecondary }]}>{article.answer}</Text>
                      </Animated.View>
                    ) : null}
                  </SurfaceCard>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function FaqScreen() {
  return (
    <RoleGuard allowed={['student', 'faculty', 'staff', 'super_admin']}>
      <FaqContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: 12 },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: Academic.navy, fontSize: 20, fontWeight: '600' },
  subtitle: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  searchBox: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Academic.card, borderWidth: 1, borderColor: Academic.border },
  searchInput: { flex: 1, minHeight: 48, color: Academic.navy, fontSize: 14 },
  categoryRail: { gap: Spacing.two, paddingRight: Spacing.three },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  categoryChipActive: { backgroundColor: Academic.primary },
  categoryText: { fontSize: 12, fontWeight: '500' },
  scopeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 15, backgroundColor: Academic.successBg },
  scopeText: { flex: 1, color: Academic.navy, fontSize: 12, lineHeight: 18 },
  loader: { paddingVertical: Spacing.five },
  faqCard: { gap: Spacing.three },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  questionCopy: { flex: 1, alignItems: 'flex-start', gap: 8 },
  question: { color: Academic.navy, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  answerBox: { paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: Academic.border },
  answer: { color: Academic.textSecondary, fontSize: 14, lineHeight: 21 },
});

```

## Frontend/src/components/role-guard.tsx
**tsx · 48 lines · Reusable frontend component.**

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Academic, AcademicIcon } from '@/components/ui/academic-ui';
import { Spacing } from '@/constants/theme';
import { type UserProfile, useAuth } from '@/context/auth';

type Role = UserProfile['role'];

export default function RoleGuard({
  allowed,
  children,
}: {
  allowed: readonly Role[];
  children: ReactNode;
}) {
  const { profile } = useAuth();

  if (!profile || !allowed.includes(profile.role)) {
    return (
      <View style={styles.container}>
        <AcademicIcon
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          color={Academic.error}
          size={42}
        />
        <Text style={styles.title}>Access restricted</Text>
        <Text style={styles.message}>Your CAS Assist role does not have access to this section.</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    backgroundColor: Academic.background,
  },
  title: { color: Academic.navy, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  message: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});

```

## Frontend/src/components/themed-text.tsx
**tsx · 81 lines · Reusable frontend component.**

```tsx
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.body,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.body,
    lineHeight: 20,
    fontWeight: 600,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.control,
    lineHeight: 22,
    fontWeight: 400,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.display,
    fontWeight: 600,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.title,
    lineHeight: 32,
    fontWeight: 600,
    letterSpacing: -0.45,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#39AEA9',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});

```

## Frontend/src/components/themed-view.tsx
**tsx · 17 lines · Reusable frontend component.**

```tsx
import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}

```

## Frontend/src/components/tickets/ticket-detail-screen.tsx
**tsx · 532 lines · Ticket detail and protected request workspace component.**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import RoleGuard from '@/components/role-guard';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  IconButton,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Resolved',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'error',
  resolved: 'success',
};

const NEXT_STATUS: Record<string, string | null> = {
  submitted: 'under_evaluation',
  under_evaluation: 'action_required',
  action_required: 'resolved',
  resolved: null,
};

const NEXT_LABEL: Record<string, string> = {
  submitted: 'Start evaluation',
  under_evaluation: 'Request action',
  action_required: 'Resolve request',
};

interface TicketRow {
  id: string;
  student_id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  state: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  public_note: string | null;
  assigned_office: string | null;
  assigned_to: string | null;
  flagged: boolean;
}

interface AuditRow {
  id: number;
  action: string;
  actor_id: string | null;
  created_at: string;
}

interface StudentContext {
  display_name: string;
  email: string;
  student_number: string | null;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'Not recorded';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatAction(action: string) {
  if (action === 'insert') return 'Request recorded';
  if (action === 'update') return 'Request updated';
  if (action === 'delete') return 'Request removed';
  return formatCategory(action);
}

function TicketDetailContent({ ticketId, showCreated }: { ticketId: string | undefined; showCreated: boolean }) {
  const router = useRouter();
  const { profile, session } = useAuth();
  const colors = useTheme();
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [student, setStudent] = useState<StudentContext | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const userId = profile?.id ?? session?.user.id;
  const canManage = profile?.role === 'staff' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchTicket = useCallback(async () => {
    if (!ticketId || !userId) {
      setLoadError('This request link is invalid.');
      setTicket(null);
      return;
    }

    const { data, error } = await supabase
      .from('advising_ticket_pipeline')
      .select('id, student_id, category, description, status, priority, state, created_at, updated_at, resolved_at, public_note, assigned_office, assigned_to, flagged')
      .eq('id', ticketId)
      .maybeSingle();

    if (error || !data) {
      setLoadError('This request could not be found or you do not have access to it.');
      setTicket(null);
      return;
    }

    const nextTicket = data as TicketRow;
    if (profile?.role === 'student' && nextTicket.student_id !== userId) {
      setLoadError('This request could not be found or you do not have access to it.');
      setTicket(null);
      return;
    }

    setLoadError(null);
    setTicket(nextTicket);

    if (canManage) {
      const { data: studentData } = await supabase
        .from('users_account_registry')
        .select('display_name, email, student_number')
        .eq('id', nextTicket.student_id)
        .maybeSingle();
      setStudent((studentData as StudentContext | null) ?? null);
    } else {
      setStudent(null);
    }

    if (isSuperAdmin) {
      const { data: auditData } = await supabase
        .from('ticket_audit_logs')
        .select('id, action, actor_id, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      setAudit((auditData as AuditRow[]) ?? []);
    } else {
      setAudit([]);
    }
  }, [canManage, isSuperAdmin, profile?.role, ticketId, userId]);

  useEffect(() => {
    setLoading(true);
    void fetchTicket().finally(() => setLoading(false));

    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-detail-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'advising_ticket_pipeline',
          filter: `id=eq.${ticketId}`,
        },
        payload => {
          const status = (payload.new as { status?: string }).status;
          if (status) setActionMessage(`Request updated: ${STATUS_LABEL[status] ?? status}.`);
          void fetchTicket();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTicket, ticketId]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchTicket();
    setRefreshing(false);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(canManage ? '/admin' : '/tickets');
    }
  }

  async function advanceStatus() {
    if (!ticket || !canManage) return;
    const next = NEXT_STATUS[ticket.status];
    if (!next || updating) return;

    setActionError(null);
    setActionMessage(null);
    setUpdating(true);
    const updates: Record<string, unknown> = { status: next };
    if (next === 'resolved') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase
      .from('advising_ticket_pipeline')
      .update(updates)
      .eq('id', ticket.id);
    setUpdating(false);

    if (error) {
      setActionError('That status change was not accepted. Refresh and try again.');
      return;
    }

    setActionMessage(`Request marked ${STATUS_LABEL[next].toLowerCase()}.`);
    await fetchTicket();
  }

  const timeline = useMemo(() => {
    if (!ticket) return [];
    const items = audit.map(item => ({
      id: String(item.id),
      title: formatAction(item.action),
      detail: isSuperAdmin && item.actor_id ? `Authorized actor ${shortRef(item.actor_id, 'A')}` : 'Verified audit record',
      createdAt: item.created_at,
    }));

    if (!audit.length) {
      items.push({
        id: 'created',
        title: 'Request submitted',
        detail: 'The request record was created successfully.',
        createdAt: ticket.created_at,
      });
    }

    if (ticket.public_note) {
      items.push({
        id: 'public-note',
        title: 'Student-visible update',
        detail: ticket.public_note,
        createdAt: ticket.updated_at,
      });
    }

    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [audit, isSuperAdmin, ticket]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (loadError || !ticket) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <View style={styles.errorState}>
          <EmptyState
            title="Request unavailable"
            message={loadError ?? 'This request is no longer available.'}
            icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          />
          <Pressable onPress={goBack} style={[styles.secondaryButton, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Back to workspace</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusTone = STATUS_TONE[ticket.status] ?? 'muted';
  const next = NEXT_STATUS[ticket.status];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <IconButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            onPress={goBack}
            label="Back to workspace"
            bg={colors.muted}
            color={colors.textSecondary}
          />
          <View style={styles.topBarBadges}>
            <StatusBadge label={`${ticket.priority} priority`} tone={ticket.priority === 'urgent' ? 'error' : 'muted'} />
            <StatusBadge label={STATUS_LABEL[ticket.status] ?? ticket.status} tone={statusTone} />
          </View>
        </View>

        {showCreated ? (
          <View style={[styles.infoBox, { backgroundColor: colors.softBlue }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>Request submitted successfully. This page is your tracking record.</Text>
          </View>
        ) : null}

        <SurfaceCard style={styles.primaryCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderCopy}>
              <Text style={[styles.reference, { color: colors.primary }]}>{shortRef(ticket.id)}</Text>
              <Text style={[styles.detailTitle, { color: colors.navy }]}>{formatCategory(ticket.category)}</Text>
              <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>Submitted {formatDateTime(ticket.created_at)}</Text>
            </View>
            <View style={[styles.detailIcon, { backgroundColor: colors.softBlue }]}>
              <AcademicIcon name={{ ios: 'doc.text', android: 'description', web: 'description' }} color={colors.primary} size={24} />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.description, { color: colors.text }]}>{ticket.description}</Text>
          {ticket.public_note ? (
            <View style={[styles.noteBox, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.noteLabel, { color: colors.success }]}>Student-visible update</Text>
              <Text style={[styles.noteText, { color: colors.text }]}>{ticket.public_note}</Text>
            </View>
          ) : null}
        </SurfaceCard>

        {actionMessage ? (
          <View style={[styles.successBox, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.successText, { color: colors.success }]}>{actionMessage}</Text>
          </View>
        ) : null}
        {actionError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{actionError}</Text>
          </View>
        ) : null}

        <BentoGrid>
          <BentoPanel size="wide">
            <SurfaceCard style={styles.panelCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.softBlue }]}>
                  <AcademicIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} color={colors.primary} size={19} />
                </View>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={[styles.sectionTitle, { color: colors.navy }]}>Verified activity</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Status metadata and authorized records available to this role.</Text>
                </View>
              </View>
              {timeline.length ? timeline.map(item => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineTitle, { color: colors.navy }]}>{item.title}</Text>
                    <Text style={[styles.timelineDetail, { color: colors.textSecondary }]}>{item.detail}</Text>
                    <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>{formatDateTime(item.createdAt)}</Text>
                  </View>
                </View>
              )) : (
                <Text style={[styles.mutedText, { color: colors.textSecondary }]}>No additional activity is available for this request.</Text>
              )}
            </SurfaceCard>
          </BentoPanel>

          <BentoPanel size="compact">
            <SurfaceCard style={styles.panelCard}>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>Request record</Text>
              <View style={styles.metadataList}>
                <MetadataRow label="Reference" value={shortRef(ticket.id)} />
                <MetadataRow label="Category" value={formatCategory(ticket.category)} />
                <MetadataRow label="Current status" value={STATUS_LABEL[ticket.status] ?? ticket.status} />
                <MetadataRow label="Priority" value={formatCategory(ticket.priority)} />
                <MetadataRow label="Last updated" value={formatDateTime(ticket.updated_at)} />
                {ticket.resolved_at ? <MetadataRow label="Resolved" value={formatDateTime(ticket.resolved_at)} /> : null}
                {ticket.assigned_office ? <MetadataRow label="Assigned office" value={ticket.assigned_office} /> : null}
              </View>
            </SurfaceCard>

            {canManage ? (
              <SurfaceCard style={styles.panelCard} accent={ticket.status === 'action_required' ? 'error' : 'blue'}>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>Authorized action</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Only the existing next transition is available.</Text>
                {next ? (
                  <Pressable
                    onPress={advanceStatus}
                    disabled={updating}
                    style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, (pressed || updating) && styles.pressed]}>
                    {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{NEXT_LABEL[ticket.status]}</Text>}
                  </Pressable>
                ) : (
                  <StatusBadge label="No further transition" tone="success" />
                )}
              </SurfaceCard>
            ) : null}

            {canManage && student ? (
              <SurfaceCard style={styles.panelCard}>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>Student context</Text>
                <View style={styles.studentRow}>
                  <View style={[styles.studentAvatar, { backgroundColor: colors.softBlue }]}>
                    <AcademicIcon name={{ ios: 'person', android: 'person', web: 'person' }} color={colors.primary} size={19} />
                  </View>
                  <View style={styles.studentCopy}>
                    <Text style={[styles.studentName, { color: colors.navy }]}>{student.display_name}</Text>
                    <Text style={[styles.studentEmail, { color: colors.textSecondary }]}>{student.email}</Text>
                    {student.student_number ? <Text style={[styles.studentEmail, { color: colors.textTertiary }]}>{student.student_number}</Text> : null}
                  </View>
                </View>
              </SurfaceCard>
            ) : null}
          </BentoPanel>
        </BentoGrid>

        <View style={[styles.securityNote, { backgroundColor: colors.muted }]}>
          <AcademicIcon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} color={colors.textSecondary} size={16} />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            {canManage ? 'Staff-only notes and routing data remain protected by existing database policies.' : 'Only requests owned by your account are shown here.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={styles.metadataRow}>
      <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metadataValue, { color: colors.navy }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function TicketDetailScreen({ ticketId, showCreated = false }: { ticketId: string | undefined; showCreated?: boolean }) {
  return (
    <RoleGuard allowed={['student', 'staff', 'super_admin']}>
      <TicketDetailContent ticketId={ticketId} showCreated={showCreated} />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: 152,
    gap: Spacing.three,
  },
  loader: { marginTop: Spacing.five },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three, gap: Spacing.three },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  topBarBadges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7, flex: 1 },
  infoBox: { borderRadius: 13, padding: 12 },
  infoText: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  primaryCard: { gap: Spacing.three, padding: Spacing.four },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  detailHeaderCopy: { flex: 1, gap: 4 },
  reference: { fontSize: 13, fontWeight: '600', letterSpacing: 0.35 },
  detailTitle: { fontSize: 25, lineHeight: 31, fontWeight: '600', letterSpacing: -0.45 },
  detailSubtitle: { fontSize: 13, lineHeight: 19 },
  detailIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, width: '100%' },
  description: { fontSize: 15, lineHeight: 23 },
  noteBox: { borderRadius: 13, padding: Spacing.three, gap: 5 },
  noteLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.35 },
  noteText: { fontSize: 14, lineHeight: 21 },
  successBox: { borderRadius: 13, padding: 12 },
  successText: { fontSize: 13, fontWeight: '500' },
  errorBox: { borderRadius: 13, padding: 12 },
  errorText: { fontSize: 13, fontWeight: '500' },
  panelCard: { gap: Spacing.three, padding: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionSubtitle: { fontSize: 12, lineHeight: 18 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingLeft: 4 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  timelineCopy: { flex: 1, gap: 2 },
  timelineTitle: { fontSize: 14, fontWeight: '600' },
  timelineDetail: { fontSize: 13, lineHeight: 19 },
  timelineDate: { fontSize: 11, marginTop: 2 },
  mutedText: { fontSize: 13, lineHeight: 19 },
  metadataList: { gap: 10 },
  metadataRow: { gap: 2 },
  metadataLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  metadataValue: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  primaryButton: { minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  secondaryButton: { minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { fontSize: 13, fontWeight: '500' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  studentCopy: { flex: 1, gap: 2 },
  studentName: { fontSize: 13, fontWeight: '600' },
  studentEmail: { fontSize: 11, lineHeight: 16 },
  securityNote: { minHeight: 42, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityText: { flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});

```

## Frontend/src/components/ui/academic-ui.tsx
**tsx · 888 lines · Shared CAS-Assist visual primitives, icons, controls, and formatting helpers.**

```tsx
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Activity from 'lucide-react-native/icons/activity';
import BadgeCheck from 'lucide-react-native/icons/badge-check';
import ChartBar from 'lucide-react-native/icons/chart-bar';
import Bell from 'lucide-react-native/icons/bell';
import BookOpen from 'lucide-react-native/icons/book-open';
import BriefcaseBusiness from 'lucide-react-native/icons/briefcase-business';
import Building2 from 'lucide-react-native/icons/building';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import CheckCircle2 from 'lucide-react-native/icons/circle-check-big';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Circle from 'lucide-react-native/icons/circle';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Clock3 from 'lucide-react-native/icons/clock-3';
import Contrast from 'lucide-react-native/icons/contrast';
import Database from 'lucide-react-native/icons/database';
import FileText from 'lucide-react-native/icons/file-text';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import House from 'lucide-react-native/icons/house';
import Inbox from 'lucide-react-native/icons/inbox';
import Info from 'lucide-react-native/icons/info';
import Landmark from 'lucide-react-native/icons/landmark';
import List from 'lucide-react-native/icons/list';
import Lock from 'lucide-react-native/icons/lock';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import Megaphone from 'lucide-react-native/icons/megaphone';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Moon from 'lucide-react-native/icons/moon';
import Pin from 'lucide-react-native/icons/pin';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Search from 'lucide-react-native/icons/search';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sun from 'lucide-react-native/icons/sun';
import User from 'lucide-react-native/icons/user';
import UserCog from 'lucide-react-native/icons/user-cog';
import UserPlus from 'lucide-react-native/icons/user-plus';
import Users from 'lucide-react-native/icons/users';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { BrandColors, Colors, Fonts, Layout, MaxContentWidth, Radius, Shadows, Spacing, TypeScale } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';

export type AcademicIconName = ComponentProps<typeof SymbolView>['name'];

const ICONS: Record<string, LucideIcon> = {
  account_balance: Landmark,
  analytics: ChartBar,
  activity: Activity,
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_upward: ArrowUp,
  assignment: ClipboardList,
  auto_awesome: Sparkles,
  badge: BadgeCheck,
  calendar_today: CalendarDays,
  campaign: Megaphone,
  chat_bubble: MessageCircle,
  check_circle: CheckCircle2,
  keyboard_arrow_down: ChevronDown,
  keyboard_arrow_up: ChevronUp,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  contrast: Contrast,
  dark_mode: Moon,
  database: Database,
  description: FileText,
  domain: Building2,
  format_list_bulleted: List,
  groups: Users,
  home: House,
  inbox: Inbox,
  info: Info,
  light_mode: Sun,
  location_on: MapPin,
  lock: Lock,
  mail: Mail,
  manage_accounts: UserCog,
  menu_book: BookOpen,
  notifications: Bell,
  person: User,
  person_add: UserPlus,
  priority_high: CircleAlert,
  push_pin: Pin,
  radio_button_unchecked: Circle,
  refresh: RefreshCw,
  schedule: Clock3,
  school: GraduationCap,
  search: Search,
  verified_user: ShieldCheck,
  work: BriefcaseBusiness,
};

const ICON_ENTERING = ZoomIn.springify().damping(24).stiffness(260).reduceMotion(ReduceMotion.System);
const CARD_ENTERING = FadeInUp.duration(320).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);
const HERO_ENTERING = FadeInDown.duration(380).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);
const BADGE_ENTERING = FadeIn.duration(180).reduceMotion(ReduceMotion.System);

export const Academic = BrandColors;

export function AppBackdrop() {
  const { colors } = useAppTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />;
}

export type GlassVariant = 'standard' | 'strong' | 'soft';

function glassConfig(variant: GlassVariant, resolvedTheme: 'light' | 'dark') {
  const dark = resolvedTheme === 'dark';
  return {
    backgroundColor: variant === 'strong'
      ? dark ? 'rgba(24,40,38,0.96)' : 'rgba(255,255,255,0.96)'
      : variant === 'soft'
        ? dark ? 'rgba(24,40,38,0.78)' : 'rgba(255,255,255,0.78)'
        : dark ? 'rgba(24,40,38,0.90)' : 'rgba(255,255,255,0.90)',
    intensity: variant === 'strong' ? 8 : variant === 'soft' ? 5 : 6,
  };
}

function GlassOverlay({ variant }: { variant: GlassVariant }) {
  const { resolvedTheme } = useAppTheme();
  const config = glassConfig(variant, resolvedTheme);

  if (Platform.OS === 'web') return null;
  if (isLiquidGlassAvailable()) {
    return <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }
  return (
    <BlurView
      pointerEvents="none"
      intensity={resolvedTheme === 'dark' ? Math.max(6, config.intensity - 1) : config.intensity}
      tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
      experimentalBlurMethod="dimezisBlurView"
      style={StyleSheet.absoluteFill}
    />
  );
}

export function GlassSurface({
  children,
  variant = 'standard',
  style,
}: {
  children: ReactNode;
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, resolvedTheme } = useAppTheme();
  const config = glassConfig(variant, resolvedTheme);

  return (
    <View
      style={[
        styles.glassSurface,
        { backgroundColor: config.backgroundColor, borderColor: colors.border },
        Platform.OS === 'web' && styles.webGlassSurface,
        style,
      ]}>
      <GlassOverlay variant={variant} />
      {children}
    </View>
  );
}

export const STATUS_TONES = {
  blue: { bg: Academic.softBlue, text: Academic.primary },
  warning: { bg: Academic.warningBg, text: Academic.warningText },
  success: { bg: Academic.successBg, text: Academic.success },
  error: { bg: Academic.errorBg, text: Academic.error },
  muted: { bg: Academic.muted, text: Academic.textSecondary },
  navy: { bg: '#EAF0F8', text: Academic.navy },
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

function statusColors(tone: StatusTone, colors: typeof Colors.light | typeof Colors.dark) {
  switch (tone) {
    case 'success':
      return { bg: colors.successBg, text: colors.success };
    case 'warning':
      return { bg: colors.warningBg, text: colors.warning };
    case 'error':
      return { bg: colors.errorBg, text: colors.error };
    case 'muted':
      return { bg: colors.muted, text: colors.textSecondary };
    case 'navy':
      return { bg: colors.backgroundSelected, text: colors.navy };
    case 'blue':
    default:
      return { bg: colors.softBlue, text: colors.primary };
  }
}

export function AcademicIcon({
  name,
  size = 20,
  color = Academic.primary,
  animated = true,
}: {
  name: AcademicIconName;
  size?: number;
  color?: string;
  animated?: boolean;
}) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <Animated.View entering={animated ? ICON_ENTERING : undefined} style={{ width: size, height: size }}>
        <SymbolView name={name} size={size} tintColor={color} weight="semibold" />
      </Animated.View>
    );
  }

  const materialName = typeof name === 'object'
    ? process.env.EXPO_OS === 'android' ? name.android : name.web
    : undefined;
  const Icon = materialName ? ICONS[materialName] ?? CircleHelp : CircleHelp;

  return (
    <Animated.View entering={animated ? ICON_ENTERING : undefined} style={{ width: size, height: size }}>
      <Icon color={color} size={size} strokeWidth={2.1} absoluteStrokeWidth />
    </Animated.View>
  );
}

export function StatusBadge({
  label,
  tone = 'blue',
}: {
  label: string;
  tone?: StatusTone;
}) {
  const { colors: themeColors } = useAppTheme();
  const colors = statusColors(tone, themeColors);
  return (
    <Animated.View entering={BADGE_ENTERING} style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  badge,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  badge?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>{title}</Text>
        {badge ? <StatusBadge label={badge} tone="error" /> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function RoleHeroHeader({
  label,
  title,
  subtitle,
  right,
  stackOnMobile = false,
}: {
  label: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
  stackOnMobile?: boolean;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const shouldStack = stackOnMobile && width < 600;

  return (
    <Animated.View entering={HERO_ENTERING} style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.heroRule, { backgroundColor: colors.border }]} />
      <View style={[styles.heroContent, shouldStack && styles.heroContentStacked]}>
        <View style={styles.heroCopy}>
          <View style={[styles.heroLabelPill, { backgroundColor: colors.softBlue }]}>
            <View style={[styles.heroLabelDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.heroLabel, { color: colors.primary }]}>{label}</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.navy }]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{subtitle}</Text>
        </View>
        {right ?? (
          <View style={[styles.heroIconButton, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
            <AcademicIcon
              name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
              color={colors.primary}
              size={21}
              animated={false}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function SurfaceCard({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: 'blue' | 'success' | 'error' | 'warning';
}) {
  const { colors: themeColors } = useAppTheme();
  const accentColor = accent === 'success'
    ? themeColors.success
    : accent === 'error'
      ? themeColors.error
      : accent === 'warning'
        ? themeColors.warning
        : accent === 'blue'
          ? themeColors.primary
          : undefined;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      ...(Platform.OS === 'web' ? styles.webGlassSurface : {}),
    },
    accentColor && { borderLeftWidth: 4, borderLeftColor: accentColor },
    style,
  ];

  return (
    <Animated.View entering={process.env.EXPO_OS === 'web' ? undefined : CARD_ENTERING} style={cardStyle}>
      <GlassOverlay variant="standard" />
      {children}
    </Animated.View>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  icon: AcademicIconName;
  tone?: StatusTone;
}) {
  const { colors: themeColors } = useAppTheme();
  const colors = statusColors(tone, themeColors);
  return (
    <SurfaceCard style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.bg }]}>
        <AcademicIcon name={icon} size={20} color={colors.text} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]} numberOfLines={2}>{label}</Text>
    </SurfaceCard>
  );
}

export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: AcademicIconName;
}) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={styles.emptyState}>
      {icon ? (
        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
          <AcademicIcon name={icon} color={colors.textSecondary} size={24} />
        </View>
      ) : null}
      <Text style={[styles.emptyTitle, { color: colors.navy }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
    </SurfaceCard>
  );
}

export function FloatingChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const expansion = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const [launching, setLaunching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expansionScale = Math.max(24, Math.hypot(width, height) / 28);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const expansionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0, 0.04, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(expansion.value, [0, 1], [1, expansionScale]) }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: interpolate(expansion.value, [0, 0.72, 1], [1, 1, 0]),
  }));

  function openChat() {
    if (launching) return;
    setLaunching(true);
    // Reanimated shared values are intentionally mutable animation state.
    // eslint-disable-next-line react-hooks/immutability
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 70 }),
      withTiming(1.12, { duration: 110 }),
      withTiming(1, { duration: 80 }),
    );
    // eslint-disable-next-line react-hooks/immutability
    expansion.value = withTiming(1, {
      duration: 280,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      reduceMotion: ReduceMotion.System,
    });
    timerRef.current = setTimeout(() => {
      router.push('/chatbot');
      expansion.value = 0;
      buttonScale.value = 1;
      setLaunching(false);
    }, 245);
  }

  if (pathname === '/chatbot' || pathname === '/faq') return null;

  return (
    <View pointerEvents="box-none" style={styles.chatLauncherLayer}>
      <Animated.View pointerEvents="none" style={[styles.chatExpansion, expansionStyle]} />
      <Animated.View style={[styles.chatFab, buttonStyle]}>
        <Pressable
          onPress={openChat}
          disabled={launching}
          style={({ pressed }) => [styles.chatFabPressable, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open CAS Assist AI Helpdesk"
          accessibilityHint="Expands the AI Helpdesk to full screen">
          <AcademicIcon
            name={{ ios: 'message.fill', android: 'chat_bubble', web: 'chat_bubble' }}
            color="#FFFFFF"
            size={25}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  color = Academic.primary,
  bg = Academic.softBlue,
  label,
}: {
  icon: AcademicIconName;
  onPress: () => void;
  color?: string;
  bg?: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: bg }, pressed && styles.pressed]}
      accessibilityLabel={label}
      accessibilityRole="button">
      <AcademicIcon name={icon} color={color} size={22} />
    </Pressable>
  );
}

export type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function ActionButton({
  label,
  variant = 'primary',
  icon,
  loading = false,
  style,
  disabled,
  ...props
}: Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ActionButtonVariant;
  icon?: AcademicIconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const palette = {
    primary: { backgroundColor: colors.primary, foreground: '#FFFFFF' },
    secondary: { backgroundColor: colors.backgroundSelected, foreground: colors.primary },
    ghost: { backgroundColor: 'transparent', foreground: colors.primary },
    danger: { backgroundColor: colors.errorBg, foreground: colors.error },
  }[variant];

  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'ghost' && styles.actionButtonGhost,
        { backgroundColor: palette.backgroundColor },
        (disabled || loading) && styles.actionButtonDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <>
          {icon ? <AcademicIcon name={icon} size={18} color={palette.foreground} /> : null}
          <Text style={[styles.actionButtonText, { color: palette.foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  error,
  trailing,
  inputRef,
  containerStyle,
  style: inputStyle,
  placeholderTextColor,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
  inputRef?: Ref<TextInput>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const hasError = Boolean(error);

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <Text style={[styles.fieldLabel, { color: colors.navy }]}>{label}</Text>
      <View
        style={[
          styles.textFieldShell,
          { backgroundColor: colors.surfaceMuted, borderColor: hasError ? colors.error : colors.border },
          props.editable === false && styles.textFieldDisabled,
        ]}>
        <TextInput
          {...props}
          ref={inputRef}
          placeholderTextColor={placeholderTextColor ?? colors.textTertiary}
          style={[styles.textFieldInput, { color: colors.text }, inputStyle]}
        />
        {trailing ? <View style={styles.textFieldTrailing}>{trailing}</View> : null}
      </View>
      {error || hint ? (
        <Text style={[styles.fieldHint, { color: hasError ? colors.error : colors.textSecondary }]}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ContentContainer({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;

  return (
    <View
      style={[
        styles.contentContainer,
        { paddingHorizontal: compact ? Layout.contentPadding : Layout.contentPaddingWide },
        style,
      ]}>
      {children}
    </View>
  );
}

export function formatCategory(value: string | null | undefined) {
  if (!value) return 'General Request';
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatRelative(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function shortRef(id: string, prefix = 'T') {
  const digits = id.replace(/\D/g, '');
  if (digits.length >= 3) return `${prefix}-${digits.slice(-3)}`;
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return compact ? `${prefix}-${compact}` : `${prefix}-REQ`;
}

const styles = StyleSheet.create({
  glassSurface: {
    borderWidth: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  webGlassSurface: {
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as unknown as ViewStyle)
      : {}),
  },
  pressed: { opacity: 0.78 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 280,
    flexShrink: 0,
  },
  badgeText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600', letterSpacing: 0.15 },
  sectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  sectionTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.section, fontWeight: '600', letterSpacing: -0.2 },
  sectionAction: { color: Academic.primary, fontFamily: Fonts.sans, fontSize: TypeScale.body, fontWeight: '500' },
  hero: {
    minHeight: 128,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    boxShadow: '0 2px 10px rgba(24, 55, 51, 0.04)',
  },
  heroRule: { position: 'absolute', left: 24, right: 24, bottom: 0, height: 1 },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  heroContentStacked: { flexDirection: 'column', alignItems: 'stretch' },
  heroCopy: { flex: 1, gap: 7 },
  heroLabelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroLabelDot: { width: 6, height: 6, borderRadius: 3 },
  heroLabel: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600', letterSpacing: 0.35, textTransform: 'uppercase' },
  heroTitle: { fontFamily: Fonts.sans, fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.55 },
  heroSubtitle: { fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20 },
  heroIconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  card: {
    ...Shadows.card,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    padding: Spacing.three,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: 'rgba(19,62,59,0.11)',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(24, 55, 51, 0.04)',
  },
  metricCard: { flex: 1, flexBasis: 160, gap: 8, minHeight: 126 },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '600', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  metricLabel: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '500' },
  emptyState: { alignItems: 'center', gap: 7, paddingVertical: Spacing.four },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  emptyTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.control, fontWeight: '600', textAlign: 'center' },
  emptyMessage: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center' },
  chatLauncherLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000,
    pointerEvents: 'box-none',
  },
  chatExpansion: {
    position: 'absolute',
    right: Spacing.four,
    bottom: 98,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Academic.primary,
  },
  chatFab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: 98,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Academic.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    boxShadow: '0 12px 32px rgba(11, 125, 119, 0.30)',
  },
  chatFabPressable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    ...Shadows.card,
  },
  actionButtonGhost: {
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonDisabled: { opacity: 0.58 },
  actionButtonText: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.control,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  fieldGroup: { gap: Spacing.one },
  fieldLabel: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.body,
    lineHeight: 20,
    fontWeight: '500',
  },
  textFieldShell: {
    minHeight: 52,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: Spacing.two,
  },
  textFieldDisabled: { opacity: 0.62 },
  textFieldInput: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 0,
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 21,
  },
  textFieldTrailing: { alignItems: 'center', justifyContent: 'center' },
  fieldHint: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.caption,
    lineHeight: 17,
  },
  contentContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});

```

## Frontend/src/constants/theme.ts
**typescript · 173 lines · Shared frontend design and layout constants.**

```typescript
/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  mist: '#EEF4F1',
  sage: '#C8DDD6',
  aqua: '#0B7D77',
  slate: '#173F3D',
  mint: '#72DED5',
} as const;

export const Colors = {
  light: {
    primary: Palette.aqua,
    primaryPressed: '#096A65',
    text: '#132523',
    textTertiary: '#879590',
    navy: Palette.slate,
    background: '#F5F7F6',
    backgroundElement: 'rgba(255,255,255,0.96)',
    card: 'rgba(255,255,255,0.90)',
    surface: '#FFFFFF',
    surfaceMuted: '#E8F0ED',
    backgroundSelected: 'rgba(11,125,119,0.11)',
    softBlue: 'rgba(11,125,119,0.10)',
    muted: 'rgba(225,234,230,0.88)',
    border: 'rgba(19,62,59,0.11)',
    borderStrong: 'rgba(19,62,59,0.19)',
    textSecondary: '#60706D',
    success: '#167A4A',
    successBg: '#E8F6EF',
    warning: '#A85F08',
    warningBg: '#FFF4DE',
    error: '#C53B31',
    errorBg: '#FCECEA',
  },
  dark: {
    primary: '#5ED1C8',
    primaryPressed: '#8AE2DA',
    text: '#F2F7F5',
    textTertiary: '#829691',
    navy: '#F2F7F5',
    background: '#0C1716',
    backgroundElement: 'rgba(24,40,38,0.96)',
    card: 'rgba(24,40,38,0.90)',
    surface: '#182826',
    surfaceMuted: 'rgba(126,157,151,0.14)',
    backgroundSelected: 'rgba(94,209,200,0.16)',
    softBlue: 'rgba(94,209,200,0.13)',
    muted: 'rgba(126,157,151,0.14)',
    border: 'rgba(211,237,231,0.11)',
    borderStrong: 'rgba(211,237,231,0.20)',
    textSecondary: '#A7B8B4',
    success: '#62D99B',
    successBg: 'rgba(98,217,155,0.14)',
    warning: '#F4BF67',
    warningBg: 'rgba(244,191,103,0.16)',
    error: '#FF8B82',
    errorBg: 'rgba(255,139,130,0.16)',
  },
} as const;

export const BrandColors = {
  primary: Palette.aqua,
  navy: Palette.slate,
  background: '#F5F7F6',
  card: 'rgba(255,255,255,0.90)',
  muted: 'rgba(225,234,230,0.88)',
  textSecondary: '#60706D',
  border: 'rgba(19,62,59,0.11)',
  softBlue: 'rgba(11,125,119,0.10)',
  mist: Palette.mist,
  sage: Palette.sage,
  aqua: Palette.aqua,
  slate: Palette.slate,
  mint: Palette.mint,
  warningBg: '#FFF4DE',
  warningText: '#A85F08',
  successBg: '#E8F6EF',
  success: '#167A4A',
  errorBg: '#FCECEA',
  error: '#C53B31',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    display: 'system-ui',
    serif: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    display: 'sans-serif',
    serif: 'sans-serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    display: 'var(--font-sans)',
    serif: 'var(--font-sans)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const TypeScale = {
  caption: 12,
  body: 14,
  control: 15,
  section: 18,
  title: 26,
  display: 32,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#123936',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#123936',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const Layout = {
  compactBreakpoint: 720,
  wideBreakpoint: 980,
  contentPadding: Spacing.three,
  contentPaddingWide: Spacing.four,
  minTouchTarget: 44,
} as const;

export const Radius = {
  control: 10,
  card: 14,
  panel: 18,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1440;

```

## Frontend/src/context/auth.tsx
**tsx · 269 lines · React context provider and application-wide state.**

```tsx
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  student_number: string | null;
  role: 'student' | 'faculty' | 'staff' | 'super_admin';
  state: 'active' | 'archived_read_only';
}

export type LoginCategory = 'student' | 'institutional';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string, category?: LoginCategory) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    studentNumber: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; message: string };

function safeProfileError(error: { code?: string; message?: string } | null): string {
  const message = error?.message?.toLowerCase() ?? '';
  if (error?.code === 'PGRST116') {
    return 'Your account is signed in, but no CAS Assist profile was found. Please contact an administrator.';
  }
  if (error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'CAS Assist could not access your account profile. Please contact an administrator.';
  }
  return 'We could not load your CAS Assist profile. Check your connection and try signing in again.';
}

function categoryAllowsRole(category: LoginCategory, role: UserProfile['role']): boolean {
  return category === 'student'
    ? role === 'student'
    : role === 'faculty' || role === 'staff' || role === 'super_admin';
}

const CATEGORY_MISMATCH_MESSAGE =
  'This account does not match the selected sign-in category. Choose the other account type or use a different account.';

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const requestRef = useRef<{ userId: string; promise: Promise<ProfileResult> } | null>(null);
  const generationRef = useRef(0);
  const pendingLoginRef = useRef<{ userId: string | null; category: LoginCategory } | null>(null);

  // ── Supabase profile helpers ──────────────────────────────

  const fetchProfile = useCallback((userId: string): Promise<ProfileResult> => {
    if (requestRef.current?.userId === userId) return requestRef.current.promise;
    const promise = (async (): Promise<ProfileResult> => {
      try {
        const { data, error } = await supabase
          .from('users_account_registry')
          .select('id, email, display_name, student_number, role, state')
          .eq('id', userId)
          .maybeSingle();
        if (error) return { ok: false, message: safeProfileError(error) };
        if (!data) {
          return { ok: false, message: 'Your account is signed in, but no CAS Assist profile was found. Please contact an administrator.' };
        }
        return { ok: true, profile: data as UserProfile };
      } catch {
        return { ok: false, message: 'We could not load your CAS Assist profile. Check your connection and try signing in again.' };
      }
    })().finally(() => {
      if (requestRef.current?.promise === promise) requestRef.current = null;
    });
    requestRef.current = { userId, promise };
    return promise;
  }, []);

  const clearLocalAuth = useCallback(async (message?: string) => {
    generationRef.current += 1;
    pendingLoginRef.current = null;
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // State is still cleared locally below.
    }
    setSession(null);
    setProfile(null);
    setIsProfileLoading(false);
    if (message) setProfileError(message);
  }, []);

  const loadAuthenticatedProfile = useCallback(async (
    nextSession: Session,
    expectedCategory?: LoginCategory,
  ): Promise<ProfileResult> => {
    const generation = generationRef.current;
    setIsProfileLoading(true);
    setProfileError(null);
    const result = await fetchProfile(nextSession.user.id);
    if (generation !== generationRef.current) return result;
    if (result.ok) {
      if (expectedCategory && !categoryAllowsRole(expectedCategory, result.profile.role)) {
        await clearLocalAuth(CATEGORY_MISMATCH_MESSAGE);
        return { ok: false, message: CATEGORY_MISMATCH_MESSAGE };
      }
      setSession(nextSession);
      setProfile(result.profile);
      setIsProfileLoading(false);
    } else {
      await clearLocalAuth(result.message);
    }
    return result;
  }, [clearLocalAuth, fetchProfile]);

  // ── Bootstrap: restore session on app launch ──────────────

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession()
      .then(async ({ data: { session: restoredSession }, error }) => {
        if (!active) return;
        if (error || !restoredSession) {
          setSession(null);
          setProfile(null);
        } else {
          await loadAuthenticatedProfile(restoredSession);
        }
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setProfile(null);
        setProfileError('CAS Assist could not restore your session. Check your connection and sign in again.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      if (!nextSession) {
        generationRef.current += 1;
        pendingLoginRef.current = null;
        setSession(null);
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }
      const pendingLogin = pendingLoginRef.current;
      const expectedCategory = pendingLogin
        && (!pendingLogin.userId || pendingLogin.userId === nextSession.user.id)
        ? pendingLogin.category
        : undefined;
      void loadAuthenticatedProfile(nextSession, expectedCategory);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAuthenticatedProfile]);

  // ── Auth actions ─────────────────────────────────────────

  async function signIn(
    email: string,
    password: string,
    category?: LoginCategory,
  ): Promise<{ error: string | null }> {
    setProfileError(null);
    pendingLoginRef.current = category ? { userId: null, category } : null;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      pendingLoginRef.current = null;
      return { error: error.message };
    }
    if (!data.session) {
      pendingLoginRef.current = null;
      return { error: 'Sign in did not create a valid session. Please try again.' };
    }
    if (category) pendingLoginRef.current = { userId: data.session.user.id, category };
    const result = await loadAuthenticatedProfile(data.session, category);
    return { error: result.ok ? null : result.message };
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
    studentNumber: string,
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    pendingLoginRef.current = null;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, student_number: studentNumber } },
    });
    if (error) return { error: error.message, needsConfirmation: false };

    const needsConfirmation = !data.session;

    if (data.session && data.user) {
      const result = await loadAuthenticatedProfile(data.session);
      if (!result.ok) {
        return { error: result.message, needsConfirmation: false };
      }
    }

    return { error: null, needsConfirmation };
  }

  async function signOut(): Promise<void> {
    try {
      await clearLocalAuth();
    } catch {
      // ignore — we still clear state below
    }
    setSession(null);
    setProfile(null);

    // Clear both the document and router URL. Reloading the current URL
    // (for example /profile) would otherwise make the next user inherit it.
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, isLoading, isProfileLoading, profileError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

```

## Frontend/src/context/theme.tsx
**tsx · 73 lines · React context provider and application-wide state.**

```tsx
import 'expo-sqlite/localStorage/install';

import type { ReactNode } from 'react';
import { createContext, use, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: typeof Colors.light | typeof Colors.dark;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = 'cas-assist.theme-preference';
const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isThemePreference(stored)) setPreferenceState(stored);
    } catch {
      // Keep the light default if device storage is unavailable.
    }
  }, []);

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    try {
      localStorage.setItem(STORAGE_KEY, nextPreference);
    } catch {
      // The in-memory selection still applies for the current session.
    }
  };

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? deviceScheme === 'dark' ? 'dark' : 'light'
    : preference;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    colors: Colors[resolvedTheme],
    setPreference,
  }), [preference, resolvedTheme]);

  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}

export function useAppTheme() {
  const context = use(ThemePreferenceContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider.');
  return context;
}

```

## Frontend/src/global.css
**css · 130 lines · React Native Web global typography, browser, focus, and safe-area CSS.**

```css
:root {
  --font-sans:
    Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;
  --font-display: var(--font-sans);
  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  --font-rounded: 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif;
  --font-serif: var(--font-sans);

  /* Dark-mode aware body colors */
  --body-bg: #f5f7f6;
  --body-color: #132523;
  --selection-bg: rgba(11, 125, 119, 0.78);
  --selection-color: #ffffff;
  --focus-ring: rgba(11, 125, 119, 0.45);
  --glass-standard: rgba(255, 255, 255, 0.9);
  --glass-strong: rgba(255, 255, 255, 0.96);
  --glass-soft: rgba(255, 255, 255, 0.78);
  --glass-border: rgba(19, 62, 59, 0.11);
  --glass-blur: 6px;
}

:root[data-theme='dark'] {
  --body-bg: #0C1716;
  --body-color: #F2F7F5;
  --selection-bg: rgba(94, 209, 200, 0.42);
  --selection-color: #ffffff;
  --focus-ring: rgba(94, 209, 200, 0.5);
  --glass-standard: rgba(24, 40, 38, 0.9);
  --glass-strong: rgba(24, 40, 38, 0.96);
  --glass-soft: rgba(24, 40, 38, 0.78);
  --glass-border: rgba(211, 237, 231, 0.11);
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  background: var(--body-bg, #f3f6f4);
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  overscroll-behavior: none;
}

body,
#root {
  height: 100vh;
  height: 100dvh;
}

body {
  margin: 0;
  color: var(--body-color, #132523);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::selection {
  color: #ffffff;
  background: rgba(11, 125, 119, 0.78);
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

input,
textarea,
select {
  font-size: 16px;
}

a,
button,
[role='button'] {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

#app-tab-bar {
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}

@media (min-width: 980px) {
  #app-tab-bar {
    padding: 0;
}

@media (pointer: coarse) {
  input,
  textarea,
  select {
    font-size: 16px !important;
  }
}

@media (max-width: 680px) {
  #app-tab-bar {
    padding-left: max(0.5rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.5rem, env(safe-area-inset-right, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  [style*='backdrop-filter'] {
    backdrop-filter: none !important;
  }
}

```

## Frontend/src/hooks/use-color-scheme.ts
**typescript · 2 lines · Reusable React hook.**

```typescript
export { useColorScheme } from 'react-native';

```

## Frontend/src/hooks/use-color-scheme.web.ts
**typescript · 22 lines · Reusable React hook.**

```typescript
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}

```

## Frontend/src/hooks/use-push-notifications.ts
**typescript · 93 lines · Reusable React hook.**

```typescript
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface PushNotificationState {
  expoPushToken: string | null;
  permissionGranted: boolean;
  lastNotification: unknown | null;
}

export function usePushNotifications(userId: string | undefined): PushNotificationState {
  const [expoPushToken, setExpoPushToken]         = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotification, setLastNotification] = useState<unknown | null>(null);

  useEffect(() => {
    if (
      !userId
      || Platform.OS === 'web'
      || !Device.isDevice
      || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ) return;

    let cancelled = false;
    let notificationSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('cas-assist', {
            name: 'CAS Assist',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#39AEA9',
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        const finalStatus = existing.status === 'granted'
          ? existing.status
          : (await Notifications.requestPermissionsAsync()).status;
        if (cancelled || finalStatus !== 'granted') return;

        setPermissionGranted(true);
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId
          ?? Constants.easConfig?.projectId;
        if (projectId) {
          const token = await Notifications.getExpoPushTokenAsync({ projectId });
          if (!cancelled) setExpoPushToken(token.data);
        }

        notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
          setLastNotification(notification);
        });
        responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
          // Typed payload routing is added with the notification infrastructure phase.
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('Push notifications are unavailable in this runtime.', {
            name: error instanceof Error ? error.name : 'UnknownError',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      notificationSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [userId]);

  return { expoPushToken, permissionGranted, lastNotification };
}

// ── Push token registration ───────────────────────────────────

```

## Frontend/src/hooks/use-theme.ts
**typescript · 11 lines · Reusable React hook.**

```typescript
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useAppTheme } from '@/context/theme';

export function useTheme() {
  return useAppTheme().colors;
}

```

## Frontend/src/lib/api.ts
**typescript · 74 lines · Frontend integration/configuration utility.**

```typescript
import { supabase } from './supabase';

const configuredBase = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const BASE = configuredBase && configuredBase !== 'disabled'
  ? process.env.EXPO_OS === 'android'
    ? configuredBase.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2')
    : configuredBase
  : undefined;
const REQUEST_TIMEOUT_MS = 12_000;

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  if (!BASE) {
    throw new Error('This optional service is not configured.');
  }

  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  if (!BASE) {
    throw new Error('This optional service is not configured.');
  }

  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as T;
}

```

## Frontend/src/lib/config.ts
**typescript · 26 lines · Frontend integration/configuration utility.**

```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function isHttpsUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const publicConfigError = !isHttpsUrl(supabaseUrl)
  ? 'CAS Assist is missing a valid Supabase URL. Install a correctly configured build or contact the administrator.'
  : !supabaseAnonKey
    ? 'CAS Assist is missing its Supabase publishable key. Install a correctly configured build or contact the administrator.'
    : null;

export const publicConfig = {
  // Invalid placeholders prevent an import-time SDK crash. The root configuration
  // gate blocks authentication and data access whenever publicConfigError is set.
  supabaseUrl: supabaseUrl ?? 'https://invalid.local',
  supabaseAnonKey: supabaseAnonKey ?? 'invalid-public-key',
};


```

## Frontend/src/lib/supabase.ts
**typescript · 14 lines · Frontend integration/configuration utility.**

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { publicConfig } from '@/lib/config';

export const supabase = createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

```

## Frontend/src/types/styles.d.ts
**typescript · 5 lines · TypeScript ambient type declaration.**

```typescript
declare module '*.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

```

## Frontend/tsconfig.json
**json · 21 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": [
        "./src/*"
      ],
      "@/assets/*": [
        "./assets/*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}

```

## Frontend/vercel.json
**json · 43 lines · Frontend build, deployment, dependency, or platform configuration.**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "devCommand": "npm run web",
  "cleanUrls": true,
  "framework": null,
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/"
    }
  ],
  "headers": [
    {
      "source": "/_expo/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}

```

## README.md
**markdown · 29 lines · Top-level project orientation, local startup commands, and production URL.**

```markdown
# CAS Assist

CAS Assist is a cross-platform academic information and helpdesk system for the New Era University College of Arts and Sciences.

## Project structure

- `Frontend/` — Expo Router application for web, Android, and iOS
- `Backend/` — TypeScript API, Supabase migrations, tests, and verification scripts

## Local development

``​`powershell
cd Frontend
npm install
npm run web
``​`

``​`powershell
cd Backend
npm install
npm run dev
``​`

Copy each `.env.example` to `.env` and provide the required local configuration before starting the services.

## Production website

https://cas-assist.vercel.app

```
