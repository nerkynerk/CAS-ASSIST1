# Gate A — Security Validation

**Date:** 2026-11-09, Asia/Manila. **Branch:** `octup/safe-enhancements`. **HEAD:** `3270d8dce2e948b80244c365f309463dc546edde` (`fix: restore student new request button`). **Reviewed source:** the uncommitted working tree, not HEAD alone; 92 pre-validation source/configuration hashes are recorded in `docs/reviewer/GATE_A_BASELINE.json`.

**Overall Gate A status: B. VALIDATION FAILED — confirmed problems require correction.** Two existing defects were reproduced locally: fractional triangular-duration calculations violate their bounds, and the analytics health request path returns 404 against the actual Express app. These are not newly introduced Phase 1 regressions. Database security acceptance is separately **BLOCKED** because no identified, approved isolated Supabase target or local database tooling was available. Neither local database validation nor staging readiness is established.

## Scope and evidence rules

This task inspected the actual current frontend/backend, nine ordered migrations, Phase 1 SQL suite and audit, dependencies, and environment classifications. Required project instructions/documents and all three Phase 1 reports were reviewed. `CAS_ASSIST_ENHANCEMENT_AUDIT_AND_DEFENSE_ROADMAP.md` was not found in the repository file search. Phase 1 reports remain historical evidence and were not rewritten.

Only validation scripts, metadata inventory, source manifest, setup instructions, and Gate A reports were added. No application module, existing test, migration, dependency, environment file, or hosting setting was changed. No user was verified; no live database, remote Auth endpoint, or production service was queried. No installation, service startup, database mutation, commit, push, merge, or deployment occurred. The localhost HTTP smoke test used synthetic configuration, with dotenv directed to a nonexistent test path.

**PASS** below means the stated source/local boundary was checked. It does not mean PostgreSQL executed the policies. **BLOCKED** means required infrastructure/authorization is absent; **NOT RUN** means no execution evidence exists.

Research references are `PRD.md:54` FR-01, `:55` FR-02, `:56` FR-03, `:61` FR-08, `:62` FR-09, `:66` FR-13, `:70` FR-17, and `:71` FR-18. `RULES.md:92` explicitly requires the triangular minimum/mode/maximum ordering. No additional research functionality or UI scope was implemented.

## Phase 1 source review

All migration anchors in this table refer to `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql`.

| Boundary | Current source evidence | Source/local result | Real database result |
|---|---|---|---|
| Institutional identity, verification, CAS membership | Migration `:8`; `Backend/src/middleware/auth.ts:11`, `:61`; `Frontend/src/context/auth.tsx:87` | PASS: token-derived identity and matching registry; active+verified; dated managed membership in active program for students. Editable profile program does not grant access. | BLOCKED: actual Auth/JWT, joins, dates, grants, and owner privileges untested. |
| Pending onboarding versus operations | Migration `:81`; `Frontend/src/app/_layout.tsx:135`; `Frontend/src/components/auth/verification-pending-screen.tsx:8` | PASS: own profile/status retained; operational workspace gated. Refresh/sign-out exist. | BLOCKED: signup, real profile/RPC access, browser refresh/deep links. |
| Four-role backend authorization | `Backend/src/routes/queue.ts:9`, `:25`; `Backend/src/routes/ai.ts:10`; `Backend/src/routes/notifications.ts:8` | PASS: 43 mocked authorization cases, including pending/archived denial and role/identity spoofing. | BLOCKED: production service-token integration and end-to-end permissions. |
| Queue SECURITY DEFINER RPCs | Migration `:175`; `Backend/src/routes/queue.ts:18`, `:31` | PASS: PUBLIC/anon/authenticated EXECUTE revoked, service_role granted; safe fixed paths; backend supplies authenticated student ID and restricts analytics roles. Queue function bodies unchanged. | BLOCKED: effective/inherited ACLs, direct anonymous/authenticated PostgREST RPC attempts, actual response privacy/schema. |
| Narrow staff ticket mutation | Migration `:133`, `:146`; `Frontend/src/app/admin.tsx:258`; `Frontend/src/components/tickets/ticket-detail-screen.tsx:229` | PASS: table and all historical column UPDATE grants revoked; controlled authenticated RPC checks active verified staff/admin, locks row, updates workflow fields only. Both callers use it. | BLOCKED: real valid/invalid transitions, effective grants, concurrency and immutable content. |
| Audit compatibility | Existing triggers in `Backend/supabase/migrations/202607280001_research_compliance.sql:483`, `:511`; new RPC `:161` | PASS: original transition graph and transactional audit triggers retained; caller auth.uid remains available for authenticated RPC. | BLOCKED: actor/timestamp audit entries, rollback atomicity, original record preservation. |
| Archived restrictions and history | Migration `:32`, `:67`, `:182`, `:202`, `:226`, `:268`, `:358` | PASS: restrictive mutation gates, explicit definer guards, target-student service escalation check, NULL-safe analytics guard. Verified archive history need not require current membership. | BLOCKED: row-scoped historical reads and direct mutation denial across all roles. |
| Student ticket ownership | Existing policy `202607280001_research_compliance.sql:696`; new restrictive gates `:71` | PASS source: original owner/staff row scope retained and eligibility gates added. Backend identity parameters remain trusted. | BLOCKED: real cross-student ticket/attachment retrieval. |
| Faculty isolation | Migration `:90`, `:104`; `Frontend/src/components/dashboard/faculty-dashboard.tsx:202` | PASS source: faculty role plus owned assignment for spatial updates; schedule management restricted to faculty-owner or staff/admin. | BLOCKED: faculty INSERT/UPDATE with own and unrelated assignments. |
| Storage | Migration `:117`; original private bucket declarations `202607280001_research_compliance.sql:873` | PASS source: restrictive CAS access gates grant no object access; see conditional anonymous compatibility risk below. | BLOCKED: actual object policies, bucket paths, ownership and unrelated-bucket regression. |

The verified nonstudent registry role is an existing administrator attestation, not an independent personnel roster. Its correctness must be accepted by the responsible CAS administrator. Service-role queue calls intentionally do not rely on unavailable original-user `auth.uid()`; the backend performs end-user checks first.

## Migration ordering, syntax, and prerequisites

The lexical prerequisite order is:

1. `Backend/supabase/migrations/202607280001_research_compliance.sql`
2. `Backend/supabase/migrations/202609110001_document_requests_and_schedules.sql`
3. `Backend/supabase/migrations/202609120001_legacy_contract_bridges.sql`
4. `Backend/supabase/migrations/202609120002_ticket_priority_compatibility.sql`
5. `Backend/supabase/migrations/202609130001_student_number_registration.sql`
6. `Backend/supabase/migrations/202609130002_system_analytics.sql`
7. `Backend/supabase/migrations/202609130003_tier1_knowledge_base.sql`
8. `Backend/supabase/migrations/202609130004_tier1_answer_rpc.sql`
9. `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql`

A genuine Supabase platform supplies `auth.users`, Auth helpers, platform roles, `storage` relations, `extensions`, and pgvector. A plain PostgreSQL executable alone is insufficient. The Phase 1 file is transactional and uses schema-qualified references and fixed `pg_catalog, pg_temp` function paths. Its policy statements are one-time ordered migration operations, not an idempotent reset/rollback script.

**SQL syntax/runtime: BLOCKED.** Text review and delimiter checks are not a PostgreSQL parse or execution. No application migration ran. Older prerequisites contain conversions/upserts; only unapplied migrations may be applied after an approved target's history is inspected. Do not replay old migrations as rollback.

## Additional source-level risks, not database-proven vulnerabilities

| ID | Verified source observation | Unverified effect / clearing test |
|---|---|---|
| GA-S1 | Tracked migrations lack explicit normal authenticated table/sequence grants. `Backend/supabase/config.toml:19` comments on changed auto-exposure defaults. | Fresh reconstruction depends on runtime/default ACLs. Inspect owners/default ACLs/effective grants and execute positive paths; a comment is not proof of platform behavior. Do not add blanket grants to manufacture a pass. |
| GA-S2 | Ticket INSERT policy (`202607280001_research_compliance.sql:700`) checks ownership/student/state/submitted, but does not constrain staff-note/routing/timestamps defined at `:95`, `:109`. The new gate adds eligibility, not column restrictions. | With broad INSERT privileges, eligible students could supply staff-facing note/routing/timestamp fields. Inventory actual column privileges, then test forged workflow fields on synthetic own tickets. Phase 1's UPDATE fix does not close this separate INSERT boundary. |
| GA-S3 | Phase 1 `:46` denies access-helper EXECUTE to anon, while storage policies `:117` apply to PUBLIC and use those helpers in an OR expression intended to exempt other buckets. | **Source-supported inference:** anonymous operations previously allowed on unrelated buckets may fail on helper ACL checks. PostgreSQL initializes Boolean expression arguments and validates function EXECUTE during expression initialization; an OR exemption is not a reliable permission boundary. Actual buckets/optimizer/API paths were not tested. Inventory unrelated buckets, then exercise applicable anonymous/authenticated storage paths. Public-object download behavior can differ from storage.objects RLS. |

The GA-S3 inference is supported by [PostgreSQL 17 executor source](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/executor/execExpr.c), specifically Boolean argument initialization and `ExecInitFunc` privilege checks. It is not a claim that an affected bucket exists or that a production request failed. No storage correction was made.

## SQL coverage and inventory

`Backend/supabase/tests/phase1_security.sql` is prepared but **NOT EXECUTED**. It includes an explicit isolated-test marker, synthetic fixtures, simulated authenticated/service roles, privilege checks, pending/archive denial, student ownership, staff transitions/audit, faculty INSERT isolation, administrator checks, and rollback. Rollback-only fixtures are still mutations and require exact target-specific approval.

Coverage gaps remain: no positive verified-student advising INSERT assertion; faculty isolation covers INSERT rather than own/unrelated UPDATE; service queue calls do not assert actual JSON keys/privacy semantics; no anonymous unrelated-storage-bucket regression case. Real JWT issuance and PostgREST calls are separate tests. These gaps were documented; the existing suite was preserved.

New `Backend/supabase/audits/gate_a_security_inventory.sql:1` supplements the Phase 1 audit with function/table owners, BYPASSRLS/FORCE RLS, default ACLs, effective table/ticket-column/sequence privileges, inheritance, schema permissions, and bucket flags. It contains a read-only transaction and metadata SELECTs; it was not connected to or executed against any database. It returns no student rows, tokens, object keys, or function bodies.

## Commands actually executed and outcomes

The full fresh command ledger is in `GATE_A_REGRESSION_TEST_RESULTS.md`. Security-relevant executed checks were:

- `npm.cmd test` from Backend: **PASS**, 50 existing cases, including 43 mocked authorization cases.
- Backend/Frontend `npm.cmd run typecheck`, Frontend `npm.cmd run lint`, Backend build and synthetic clean web export: **PASS** within compilation/lint boundaries.
- `node Backend/scripts/verify-gate-a-baseline.mjs`: **PASS**, all 92 captured files unchanged.
- `git diff --check` and current-source/policy/caller review: **PASS** at source hygiene/review scope.
- `node scripts/validate-gate-a-queue-invariants.mjs` from Backend: **FAIL**, 2 synthetic samples.
- `node scripts/validate-gate-a-http-contracts.mjs` from Backend: **FAIL**, canonical health passed but frontend-requested path failed.
- Read-only tool/path/service/metadata discovery: **PASS** as discovery; database test execution **BLOCKED**. No `supabase`, `docker`, `psql`, migration, fixture, or remote verification command ran.

## Required decisions and next actions

Obtain approval for focused corrections to the two reproduced defects and review their coverage. Separately choose/prepare an isolated Supabase target, establish its identity, and obtain explicit approval for that target's migration/fixture operations. Use `GATE_A_WINDOWS_ISOLATED_SETUP.md`, inventory grants/owners first, then execute the SQL and real-role acceptance matrix. Resolve GA-S1–S3 based on actual evidence, preserve security gates, and coordinate frontend/migration versions. All five original security findings still await operational acceptance; no production readiness is asserted.
