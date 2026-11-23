# Phase 1 Security Implementation Report

## Executive summary

**Date:** 2026-11-09, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Reviewed baseline commit:** `3270d8dce2e948b80244c365f309463dc546edde` (`fix: restore student new request button`). Changes remain uncommitted.

All five requested findings have targeted local corrections. Backend authorization tests pass. Database corrections are supplied as a new migration and a rollback-only isolated-database test script; neither has been executed against a database. Therefore **5 findings are addressed in local code, 0 code fixes are deliberately deferred, and all 5 still require database/end-to-end acceptance before confirmed operational closure**. This report does not certify production security or readiness.

The user explicitly authorized development-code changes, migrations, tests, and these reports. Existing uncommitted `AGENTS.md`, project documentation, research/reviewer materials, and Base44 assets were preserved. No production connections, account statuses, database data, old migrations, dependencies, hosting configuration, commits, pushes, merges, or deployments were changed.

## Evidence and research scope

Reviewed `AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, `MEMORY.md`, the existing source and migrations, and the security discussion in `docs/reviewer/CAS-ASSIST_COMPLETE_SYSTEM_REVIEWER.md`. The user-supplied Phase 1 request defines the five findings. The older reviewer is historical evidence; its broad claims of lifecycle protection are not proof of current enforcement.

Research traceability uses the provided Chapter 1–3 mapping in `PRD.md`: FR-01 institutional/CAS verification; FR-02 trusted four-role authorization; FR-03 archived read-only history; FR-07 staff processing; FR-08 exact four ticket states; FR-09 immutable audit; FR-13 faculty assignment isolation; FR-17 queue estimates; FR-18 authorized analytics. No disputed research requirement was silently reinterpreted. Existing nonstudent AI audiences and the existing document module were preserved; their broader research alignment remains a separate review item.

## Finding 1 — Pending account access

**Root cause:** authentication success plus a registry profile mounted the workspace. The previous profile query omitted verification, and `active` alone did not establish CAS membership. New accounts intentionally remain `student` / `active` / `pending`; those existing lifecycle values are unchanged.

**Implemented:** `Frontend/src/context/auth.tsx:87` loads verification status and obtains the trusted `has_active_cas_access()` result for active verified accounts. `Frontend/src/app/_layout.tsx:134` checks the four known roles and operational/history eligibility before mounting operational routes. Missing RPCs or failed access checks fail closed. `Frontend/src/components/auth/verification-pending-screen.tsx:8` provides pending/rejected/access-restricted information, refresh, and sign-out. Pending users retain Supabase authentication and their own verification-profile read, not operational access.

**Database dependency:** `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:8` defines the access helper; `:81` preserves self-profile onboarding reads. The helper uses matching registry/Auth institutional identities, verified status, active lifecycle, and managed dated membership in an active CAS program for students. An editable `program_code` and university email alone cannot grant student access. Verified personnel registry roles are the existing administrator attestation; no authoritative personnel roster was invented.

**Status:** local correction implemented; actual signup/session/approval refresh and RLS acceptance **BLOCKED** pending isolated Supabase testing.

## Finding 2 — Backend authorization

**Root cause:** `requireAuth` previously loaded only identity, role, and lifecycle. Protected routers inconsistently checked active state and did not check verified status or managed CAS membership.

**Implemented:** `Backend/src/middleware/auth.ts:11` validates the bearer token through Supabase Auth, institutional email, matching registry identity/email, and known role/state/verification values. `:61` introduces reusable `requireVerifiedCas`, requiring active and verified status, plus managed current student membership joined to an active CAS program. Membership dates must include the current date. Profile or membership lookup failures deny access. The existing role guards remain authoritative for privileged routes.

The guard protects queue (`Backend/src/routes/queue.ts:9`), AI (`Backend/src/routes/ai.ts:10`), and notification operations (`Backend/src/routes/notifications.ts:8`). The migration adds restrictive lifecycle/verification gates alongside existing row policies and tightens schedule/spatial mutation role checks (`Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:90`). Pending onboarding reads remain available. Backend authentication remains separate from operational authorization.

**Status:** mocked local HTTP authorization/regression tests **PASS**; real Supabase identity/profile/membership behavior **BLOCKED**.

## Finding 3 — SECURITY DEFINER queue functions

**Root cause:** the checked-in queue function definitions relied on the Express caller without explicit client EXECUTE revocation, leaving a potential direct-RPC path around backend role and ownership checks.

**Implemented:** `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:175` revokes queue EXECUTE from `PUBLIC`, `anon`, and `authenticated`, grants only `service_role`, and fixes `search_path` to `pg_catalog, pg_temp`. Queue bodies and JSON responses are unchanged. The backend first validates the end user; `/api/queue/estimate` always supplies the authenticated student's ID, and analytics remains staff/super-admin only. A client query parameter cannot select another student's queue identity. Service-role calls intentionally do not assume `auth.uid()` is the original user.

**Status:** backend self-binding and role tests **PASS**; effective PostgreSQL grants, inherited permissions, and direct RPC denial **BLOCKED** until SQL tests execute.

## Finding 4 — Broad ticket updates

**Root cause:** row-level staff UPDATE authorization did not restrict ticket columns. A valid staff session could attempt to change student-submitted content or ownership rather than just workflow status.

**Implemented:** migration `202611090001_phase1_security_hardening.sql:133` revokes table-level and every existing column-level client UPDATE grant. `:146` adds authenticated `transition_advising_ticket_status(uuid,text)`, requiring verified active staff/super-admin access, validating the four status values, and locking the ticket before a narrow status/timestamp update. The existing `validate_ticket_transition()` and `audit_ticket_changes()` triggers remain in place (`Backend/supabase/migrations/202607280001_research_compliance.sql:483`, `:511`). Original content, ownership, IDs, relationships, and old records are not rewritten.

Existing transitions are preserved: submitted → evaluation/resolved; evaluation → action-required/resolved; action-required → evaluation/resolved; resolved remains terminal. These are **existing implementation rules**, not a newly invented institutional transition policy. Existing same-status behavior is unchanged.

Only two frontend writers change: `Frontend/src/app/admin.tsx:258` and `Frontend/src/components/tickets/ticket-detail-screen.tsx:229`. Both call the new RPC. The database owns update/resolution timestamps and the authenticated audit actor; clients no longer submit resolution timestamps.

**Status:** source/caller review complete; transition, audit atomicity, effective column grants, and record-integrity SQL tests prepared but **BLOCKED**.

## Finding 5 — Archived account restrictions

**Root cause:** several permissive mutation policies and privileged functions checked roles or ownership without active lifecycle/verification; SECURITY DEFINER paths bypass ordinary RLS. Archived personnel could retain mutation rights.

**Implemented:** the migration adds restrictive INSERT/UPDATE/DELETE gates to all 24 current application tables and restrictive read gates while preserving original ownership/role policy scopes (`202611090001_phase1_security_hardening.sql:53`). Gates apply to `PUBLIC`, covering anonymous as well as authenticated access paths. CAS storage buckets receive equivalent restrictive gates (`:117`), without introducing new object-read grants. Verified archived identities can read history already allowed by existing row policies, without a current membership requirement (`:32`). Pending/rejected identities do not gain this history exception.

Room acknowledgement, AI feedback/answer, ticket transitions, service-role escalation target validation, and system analytics receive explicit verified lifecycle checks. System analytics also uses a NULL-safe administrator check. Service escalation checks its explicit target student rather than assuming service `auth.uid()` represents that student.

The frontend hides/disables archived operational controls across ticket/document creation and processing, announcements, profile editing, faculty room changes, acknowledgements, and AI. Server/database enforcement remains authoritative when client profile state is stale.

**Status:** all four roles' archived backend denial tests **PASS**; archived historical reads and direct table/function mutation denial **BLOCKED** pending isolated database execution.

## Exact task file inventory

Line references identify implementation entry points; SQL function-specific anchors are listed by name above and in the migration.

| File | Change |
|---|---|
| `Backend/src/middleware/auth.ts:11` | Trusted identity/profile validation and reusable verified CAS authorization. |
| `Backend/src/types.ts:5` | Verification-status type and authenticated-user field. |
| `Backend/src/routes/queue.ts:9` | Verified active access before service-role queue RPCs. |
| `Backend/src/routes/ai.ts:10` | Verified active access before AI reads/writes/escalation. |
| `Backend/src/routes/notifications.ts:8` | Verified active personnel before privileged notification requests. |
| `Backend/test/authorization.test.ts:1` | New mocked HTTP/middleware authorization regression suite. |
| `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:1` | New additive, transactional security migration. |
| `Backend/supabase/tests/phase1_security.sql:1` | New opt-in, rollback-only isolated SQL security tests. |
| `Backend/supabase/audits/phase1_read_only_audit.sql:1` | New aggregate/catalog-only read-only audit for separately authorized execution. |
| `Frontend/src/context/auth.tsx:8` | Verification/access result, fail-closed RPC lookup, refresh action. |
| `Frontend/src/app/_layout.tsx:134` | Operational root gate, known roles, archive history, active-only push/chat setup. |
| `Frontend/src/components/auth/verification-pending-screen.tsx:8` | New limited verification-status UI. |
| `Frontend/src/components/role-guard.tsx:10` | Optional active-access restriction for operational screens. |
| `Frontend/src/app/admin.tsx:219` | Narrow ticket RPC and archived management mutation controls. |
| `Frontend/src/components/tickets/ticket-detail-screen.tsx:124` | Narrow status RPC and active staff action control. |
| `Frontend/src/app/tickets.tsx:272` | Active-only advising creation; historical list retained. |
| `Frontend/src/app/documents.tsx:166` | Active-only existing document submission. |
| `Frontend/src/app/chatbot.tsx:141` | Active-only query/feedback and route gate. |
| `Frontend/src/app/explore.tsx:257` | Active-only room acknowledgement and publishing controls. |
| `Frontend/src/app/profile.tsx:69` | Active verified access required for profile updates. |
| `Frontend/src/components/dashboard/faculty-dashboard.tsx:202` | Active-only room publishing/actions. |
| `Frontend/src/components/dashboard/student-dashboard.tsx:305` | Active-only acknowledgement/AI actions. |
| `ARCHITECTURE.md` | Appended verified local security boundary observations. |
| `DESIGN.md` | Appended pending-screen adaptation and validation limits. |
| `MEMORY.md` | Recorded authorization, verified baseline, local changes, and release dependency. |
| `docs/reviewer/PHASE1_SECURITY_IMPLEMENTATION_REPORT.md` | This report. |
| `docs/reviewer/PHASE1_SECURITY_TEST_RESULTS.md` | Commands, statuses, evidence, and unexecuted checks. |
| `docs/reviewer/PHASE1_REMAINING_RISKS.md` | Release blockers, compatibility risks, and rollback guidance. |

**Inventory:** 28 task-created/updated files, including 1 new migration and 3 required reports. `AGENTS.md`, `PRD.md`, `RULES.md`, pre-existing reviewer/research files, and design images were not changed by this task. Three existing documentation files were appended to, preserving their prior content. Build output is ignored and is not a deployment artifact for release.

## Compatibility and preserved behavior

Supabase Auth, registration defaults, institutional login/categories, four roles, two lifecycle states, four ticket states, existing ticket routes, realtime refresh, existing records/relationships, queue mathematics/JSON contracts, role-scoped approved-source AI behavior, and notification endpoint response shapes remain intact in source. No new dependency or production environment setting is introduced.

Intentional compatibility changes: pending/rejected/missing-affiliation accounts receive limited access; archived users lose mutations/live analytics; direct client queue RPC execution and broad ticket UPDATE are denied; frontend status writes require the new RPC. Existing verified students without managed valid memberships will be restricted until administrators verify their affiliation using an authorized process. No account was automatically approved or backfilled.

The pending screen follows the inspected Base44 `Login.png` centered-card language using existing theme/components; it is an adaptation, not an exact supplied pending/mobile mockup. No unrelated screen redesign was performed.

## Migration and implementation status

Apply `202611090001_phase1_security_hardening.sql` **after all existing migrations through `202609130004_tier1_answer_rpc.sql`**, first on a verified isolated Supabase database. It changes definitions/policies/grants inside one transaction; it contains no operational record deletion, account verification backfill, or ticket-data rewrite. It is a one-time ordered migration, not a repeatedly executable ad hoc script.

The new frontend depends on both access and transition RPCs. A coordinated maintenance/release window is required: migration-first can temporarily break old staff status writers; frontend-first fails closed on missing RPCs. Review schema/grant drift and account readiness before deciding release order. Backend queue routes remain compatible with service-role-only RPC grants.

Overall status: **local corrections implemented; validation incomplete because database and browser acceptance are blocked/not run; not cleared for production deployment**. See the companion test and risks reports. No production operation was attempted.

Implementation practices were checked against [PostgreSQL function security guidance](https://www.postgresql.org/docs/current/sql-createfunction.html), [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), and [Supabase database function guidance](https://supabase.com/docs/guides/database/functions). These references support the security approach; they are not evidence that this migration has executed successfully.
