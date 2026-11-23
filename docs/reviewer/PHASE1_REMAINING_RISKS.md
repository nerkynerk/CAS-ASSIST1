# Phase 1 Remaining Risks and Release Gates

**Date:** 2026-11-09, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Reviewed baseline:** `3270d8dce2e948b80244c365f309463dc546edde`. No changes were committed or deployed.

All five findings have local corrections. **None is certified closed in a deployed environment**: database execution and actual role/account workflows remain unverified. Passing the 50 mocked/unit tests is not production readiness.

## Remaining risks

| Priority | Risk / evidence boundary | Required action |
|---|---|---|
| P0 | Migration syntax, RLS composition/ownership, effective inherited grants, SECURITY DEFINER behavior, and actual Supabase/PostgREST contracts have not run on a database. | Restore representative data/schema to an isolated Supabase project, apply the ordered migration, execute the SQL suite, inspect catalog grants, and test real HTTP RPC calls. |
| P0 | Existing verified students may lack trusted current memberships/active program rows. Hardening correctly fails closed and could restrict legitimate users during rollout. | Run the prepared read-only aggregate audit under separate authorization; CAS administrators verify source records and approve any remediation. Do not auto-verify or bulk-create affiliations. |
| P0 | Nonstudent CAS affiliation relies on the existing administrator-controlled verified role/status. No separate authoritative personnel/department roster exists in current schema. | CAS must attest existing faculty/staff/admin accounts and establish an approved verification process. Verification status alone does not prove that the operational process was correctly performed. |
| P1 | Frontend/backend/migration version mismatch: new UI requires `has_active_cas_access()` and `transition_advising_ticket_status()`, while old staff clients use revoked table UPDATE. | Use a coordinated, approved maintenance/release window; test old/new client behavior and expire/reload stale clients as needed. No production release is authorized by this task. |
| P1 | Production may have schema drift, extra definer RPC overloads, permissive legacy policies, inherited roles, triggers, or storage grants absent from checked-in migrations. | Compare restored live metadata with the repository. Review every exposed definer/overload and effective grants; gates do not claim to secure unknown production-only code. |
| P1 | Loaded UI permissions can remain stale until auth/profile reload after administrative archival/revocation. New backend/DB checks remain authoritative per request/statement, but already loaded data cannot be withdrawn. | Test revocation during an open session. Consider approved session/profile refresh improvements after observing behavior. |
| P1 | No real browser/mobile/native acceptance was performed. Pending-to-approved refresh, root deep links, archive history, screen-reader behavior, and expiry handling remain unverified. | Test the manual matrix in the test report at mobile/desktop widths with isolated accounts. |
| P1 | Existing table/storage policies determine historical row/object ownership; new restrictive gates do not create missing permissive policies. Private storage buckets alone do not prove attachment availability or ownership correctness. | Test real attachment upload/read paths against restored policies without opening storage or disabling RLS. Existing attachment UI/storage completeness remains separate. |
| P2 | Offline Expo dependency validation is limited; full Expo Doctor was unavailable. Local Node 24 differs from the checked-in Node 20 deployment image. | Run installed/approved diagnostics and builds on the intended deployment toolchain in CI/staging before release. No package upgrades were made. |

## Potential compatibility changes

- Pending/rejected identities and active verified students without managed valid CAS affiliation now receive limited access. Authentication still works, but operational entry is denied.
- Verified archived users retain prior authorized historical rows; they cannot create/update/delete operational data, ask AI, acknowledge room changes, publish, or use protected live analytics.
- Direct authenticated queue RPC calls are deliberately denied; callers must use existing authorized backend queue endpoints. Only checked-in callers were verified.
- Ticket table UPDATE is deliberately revoked at table and column level. Only the new controlled status RPC is available to verified active staff/admin. External scripts/tools using broad authenticated UPDATE require review; no unchecked fallback was added.
- Existing role names, lifecycle/status values, valid transition graph, queue JSON results/math, and database record relationships are preserved. No stored tickets or account statuses were rewritten.

## Migration and deployment dependencies

The new migration is `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql`, ordered after `202609130004_tier1_answer_rpc.sql` and all its predecessors. It expects those tables/functions to exist. It is transactional and intended for the migration runner once; rerunning its `CREATE POLICY` statements manually is not supported. It adds no operational fixtures and contains no deletion/backfill of real accounts/tickets.

Restrictive gates apply to the 24 known application tables and CAS storage buckets. Existing row scopes remain necessary. The controlled ticket RPC preserves existing triggers and uses a safe function search path. Queue and escalation service functions depend on backend end-user checks; service credentials must remain server-only. The escalation RPC also validates the explicitly supplied target student's lifecycle/affiliation.

No production environment, Vercel/Render config, migration application, live audit, or account metadata modification was performed. `Frontend/dist` from local validation uses synthetic configuration and is **not suitable for deployment**. Rebuild with approved environment settings during a separately authorized release.

## Required readiness checks and administrator decisions

1. Explicitly authorize a staging/production operation and identify the target. Confirm backup/PITR and migration history/schema snapshot first.
2. Run `Backend/supabase/audits/phase1_read_only_audit.sql` under separately approved read-only access. It reports aggregate readiness, policies, grants, role inheritance, search paths, RLS, and ticket counts, without identities or credentials.
3. Confirm legitimate verified student memberships and verified personnel role attestations. Approve remediation individually through an authorized process; the patch intentionally performs no automatic account approval.
4. Apply the ordered migration to an isolated representative restore; run `Backend/supabase/tests/phase1_security.sql` and real Supabase Auth/PostgREST negative/positive tests. Confirm record counts and immutable audit behavior.
5. Test backend service calls using real isolated end-user tokens; confirm direct client RPC denial, own-student queue binding, staff analytics, and faculty unrelated-class denial.
6. Test responsive pending/history workflows, refreshed approvals, stale client handling, all four ticket states, and active archived personnel mutations. Establish a coordinated client/database release window.
7. Approve release and monitoring/rollback ownership only after acceptance evidence. This local task does not authorize commit, push, merge, migration execution, or deployment.

## Rollback strategy

Before release, save pre-change function definitions, policies, effective table/column/function grants, migration history, and a verified backup. Record application versions and protect the maintenance window.

Before any migration is applied, local changes can be selectively reverted after review, preserving the pre-existing documentation/reference work. Do not reset the whole repository. No rollback command was executed.

If the transaction fails during a controlled migration, roll it back and inspect the cause before retrying. After a successful migration, prefer an approved **forward correction** that keeps security restrictions and compatible RPCs. Reverting only the frontend will restore old broad status writers that no longer work; reverting only SQL can remove security protections. Coordinate both sides.

If a full rollback is unavoidable, restore the captured pre-change definitions/grants through a reviewed corrective migration and coordinate the matching application release. Restoring broad UPDATE/PUBLIC EXECUTE would reopen confirmed findings and requires explicit risk acceptance. Use backup/PITR only with explicit authorization and data-loss analysis, especially after new writes. No destructive down migration is included.

## Recommended next phase

First complete isolated database and interactive role acceptance for these five findings. Then obtain CAS sign-off on account verification/membership maintenance and release sequencing. Separate work can review the existing broader AI-role/document scope, notification delivery scaffold, attachment workflow, and historical health/CSS reviewer observations. Those were not silently added to this Phase 1 patch or represented as newly fixed vulnerabilities.
