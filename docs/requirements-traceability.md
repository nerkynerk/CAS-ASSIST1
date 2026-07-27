# CAS Assist Requirements Traceability

Status values are evidence-based: **complete**, **partial**, **missing**, or **blocked**. “Complete” requires implementation plus a repeatable verification result. This baseline was recorded on branch `research-compliance` at commit `d9726ee`.

| # | Requirement | Current implementation file(s) | Database/backend dependency | Status | Verification method |
|---:|---|---|---|---|---|
| 1 | Institutional registration and `@neu.edu.ph` validation | `src/components/auth/register-screen.tsx`, `src/context/auth.tsx` | Auth hook/DB constraint required | Partial | UI validation inspection; DB rule not present |
| 2 | Active CAS program-code validation | None | `cas_programs`, membership validation | Missing | Registration and schema inspection |
| 3 | Four-tier RBAC in UI, RLS, and API | `src/components/app-tabs.tsx`, `src/app/admin.tsx` | RLS and API middleware absent | Partial | Role-route tests plus policy/API tests |
| 4 | Student `archived_read_only` lifecycle | `src/context/auth.tsx`, `src/app/profile.tsx` | DB lifecycle enforcement required | Partial | Archived-account mutation tests |
| 5 | Program, year level, backlog/advising profile | Basic profile only | Profile/program schema | Missing | Profile UI and DB tests |
| 6 | Super-admin verification, roles, lifecycle, audits | User list in `src/app/admin.tsx` | Governance RPCs/RLS/audit tables | Partial | Super-admin workflow tests |
| 7 | Advising categories required by paper | Generic categories in `src/app/tickets.tsx` | Category constraints/settings | Partial | Form and DB constraint tests |
| 8 | Detailed ticket justification | `src/app/tickets.tsx` description field | Ticket table | Complete | Submit/read-back integration test |
| 9 | Secure ticket attachments | None | Private Storage bucket and policies | Missing | Upload/access-isolation tests |
| 10 | Exact four-state advising lifecycle | Legacy states across tickets/admin/dashboards | Safe data migration and transition function | Missing | Migration and transition tests |
| 11 | Realtime ticket status | `src/app/tickets.tsx` | Realtime publication/RLS | Partial | Two-client update test |
| 12 | Full staff desktop ticket workspace | Basic management in `src/app/admin.tsx` | Notes, routing, assignment, audit entities | Partial | Desktop workflow test |
| 13 | Immutable staff ticket audit log | None | Audit table and triggers | Missing | Mutation/audit immutability tests |
| 14 | Student access only to own tickets | Client filters in `src/app/tickets.tsx` | RLS required | Partial | Cross-student authorization test |
| 15 | Student-only chatbot | `src/app/chatbot.tsx`; route not role-protected | API role middleware | Partial | Route and API role tests |
| 16 | AI grounded in verified CAS sources | Unverified `scripts/seed-knowledge-base.mjs` | Verified source ingestion/vector search | Blocked | Requires official handbook/memos |
| 17 | No web search or invented answers | UI calls one API endpoint | Closed-domain retrieval enforcement | Partial | Adversarial API tests |
| 18 | “Did this resolve?” feedback | None | Feedback endpoint/log | Missing | Chat feedback test |
| 19 | Deflection outcome logging | None | `ai_query_logs` | Missing | Database/API test |
| 20 | Unresolved chat-to-ticket context | UI claims automatic ticket creation without implementation evidence | Escalation endpoint/ticket transaction | Missing | Escalation integration test |
| 21 | AI cannot make official decisions | No server implementation | Prompt/policy guard and tests | Missing | Restricted-action test suite |
| 22 | Super-admin knowledge-source management | None | Source/chunk entities and server ingestion | Missing | Admin source lifecycle test |
| 23 | Faculty sees only assigned schedules | Query in `faculty-dashboard.tsx` | Assignment RLS | Partial | Cross-faculty authorization test |
| 24 | Controlled assigned class/block room update | Free-text form in `faculty-dashboard.tsx` | Assignment validation | Missing | UI/API validation test |
| 25 | Exact enrolled cohort isolation | None | Enrollments/cohort function | Missing | Cohort targeting test |
| 26 | Students see only enrolled room changes | Broad queries in student/update screens | Cohort-scoped RLS | Missing | Cross-cohort authorization test |
| 27 | Realtime spatial refresh | Realtime subscriptions in dashboards/explore | Publication/RLS | Partial | Faculty/student two-client test |
| 28 | Spatial acknowledgment tracking | Acknowledgment reads/RPC calls | RPC/policies not reproducible | Partial | Acknowledgment upsert test |
| 29 | Targeted room-change notifications | None | Push-token and delivery service | Missing | Exact-cohort delivery test |
| 30 | Faculty blocked from tickets and AI | Faculty currently receives tickets tab | UI, RLS, API RBAC | Missing | Permission-matrix test |
| 31 | Staff/super-admin announcement CMS | Create-only UI in `src/app/admin.tsx` | Announcement RLS | Partial | CRUD authorization tests |
| 32 | Announcement edit/delete/publish/schedule/expire/pin | None beyond create | Schema and scheduled visibility | Missing | Lifecycle tests |
| 33 | Announcement text/image attachments | Text exists; images absent | Storage policies | Partial | Upload/render test |
| 34 | Priority/emergency flags | Basic priority field references | Constraints/RLS | Partial | Ordering/display test |
| 35 | Role and cohort audience targeting | Basic audience field | Audience schema/RLS | Partial | Audience matrix tests |
| 36 | Chronological student bulletin | `src/app/explore.tsx` | Active/audience policy | Partial | Ordering/visibility tests |
| 37 | Interactive academic calendar | None | Calendar entity/RLS | Missing | CRUD and month/list UI tests |
| 38 | Faculty/student read-only communications access | Feed UI exists | RLS required | Partial | Role mutation-denial tests |
| 39 | Little’s Law backend computation with units | Client computation in `src/app/tickets.tsx` | Backend/database calculation | Missing | Formula unit tests/API test |
| 40 | Historical triangular distribution | Hard-coded client values | Resolved-duration aggregation | Missing | Historical/fallback unit tests |
| 41 | Dynamic queue position and wait | Client-side approximation | Queue endpoint/RPC | Partial | Deterministic queue tests |
| 42 | Insufficient-history fallback | Client hard-coded fallback | Backend fallback metadata | Missing | Empty/sparse-history tests |
| 43 | Administrative queue analytics | Basic counts only | Analytics endpoint/RPC | Missing | Dataset/API/dashboard tests |
| 44 | Queue calculations trusted only to backend/DB | Client code performs calculation | Server/RPC | Missing | Source inspection/API tests |

## Cross-cutting quality and delivery

| Requirement | Evidence | Status | Verification method |
|---|---|---|---|
| One Expo/React Native/TypeScript frontend | Root `package.json`, `src/` | Complete | TypeScript and platform exports |
| Student mobile and responsive web | Shared routes/components | Partial | Physical-device and viewport matrix |
| Desktop faculty/staff/admin portal | Web tab shell and role dashboards | Partial | Desktop interaction script |
| Node.js/Express API | No `server/` directory | Missing | Server tests and health check |
| Supabase Auth/Postgres/Realtime | Client references exist | Partial | Remote schema and integration tests |
| Supabase Storage, pgvector, RLS | No reproducible migrations/policies | Missing | Migration/policy tests |
| HTTPS production endpoints | No deployed API in repository | Blocked | Public health endpoint and TLS check |
| Android 11+ standalone APK | Build device verification outstanding | Partial | Install and offline-from-Metro test |
| Controlled loading/retry/offline/timeout | Auth/error boundary and API timeout exist | Partial | Network-condition tests |

## Non-core feature

`src/app/documents.tsx` and its admin counterpart implement a separate document-request domain. It is not a substitute for advising-ticket attachments and remains lower priority.

