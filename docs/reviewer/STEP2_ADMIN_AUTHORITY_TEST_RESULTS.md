# Step 2 — Administrative Authority Test Results

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Reviewed source:** approved local Step 2 changes on the existing uncommitted Phase 1 working tree.

**Local status: PASS — TypeScript and 158 backend tests. Database status: BLOCKED.** No actual Supabase user, authority row, account status or production setting was created/changed. SQL fixtures and bootstrap instructions were prepared, not executed.

Statuses: **PASS** = executed and succeeded within the stated boundary; **FAIL** = executed and failed; **BLOCKED** = required approved infrastructure unavailable; **NOT RUN** = not executed. A mocked RPC result is not an RLS/PostgreSQL/real-Auth test.

## Environment and executed command ledger

Read-only discovery found Node `v24.21.0`, npm `11.19.0`, installed backend TypeScript `6.0.3`, Vitest `4.1.11`, Supabase JS `2.110.9`, and Express `5.2.1`. The existing local packages were used; no installation/upgrade occurred. The Supabase CLI, Docker and psql were not found on PATH. Neither `CAS_ASSIST_TEST_DATABASE_URL` nor `CAS_ASSIST_TEST_SUPABASE_URL` was present; `Backend/supabase/.temp` was absent. No owner-identified/approved isolated target was supplied. These observations do not prove that no database exists elsewhere; they establish that none was available/authorized for this task. Hosted application credentials were not used as a fallback or printed.

| Directory | Command / check | Status | Actual result |
|---|---|---|---|
| Repository | `git status --short`, `git branch --show-current` | PASS | Existing dirty work retained on `octup/safe-enhancements`; no branch reset/switch. |
| Backend | `npm.cmd run typecheck` | PASS | TypeScript source no-emit check passed, including the final authority-holder guard. |
| Backend | `npm.cmd test -- test/admin-authority.test.ts` | PASS | Final focused run: 108 new tests, one file. Local HTTP with mocked Supabase only. |
| Backend | `npm.cmd test` | PASS | Final full run: four files, 158 tests passed. All 50 previous tests plus 108 new cases. |
| Repository | `git diff --check` | PASS | No tracked whitespace errors; Git emitted existing LF/CRLF normalization warnings. No normalization command was run. New/untracked task files received a separate whitespace/source review. |
| Repository | Source/caller review | PASS | No production route imports/mounts the new helper; no frontend, signup/provider setting, old migration or Phase 1 test changed. |
| Repository | Captured-file SHA-256 comparison | PASS | Only the four documented core Markdown files changed among pre-existing inventoried files; changes are appended Step 2 observations. New artifacts match the implementation inventory. Other pre-existing files retain their hashes. |
| Isolated Supabase | Ordered migration replay, ACL/RLS/function suite | BLOCKED | No approved isolated target/runtime; zero SQL execution results. |
| Isolated Supabase | True two-session primary conflict/revocation acceptance | BLOCKED | Needs isolated database sessions; not simulated as a PASS. |
| Real Auth/PostgREST | Primary/delegated JWT and direct-RPC acceptance | BLOCKED | No isolated Auth target/accounts/tokens authorized. |
| Frontend | TypeScript / lint / Expo diagnostics / build | NOT RUN | No frontend source/configuration affected; this step introduces no UI. |
| Backend | Build / separate test-code TypeScript / coverage percentages | NOT RUN | Requested source typecheck and existing tests suffice for this additive helper; no build/coverage claim. Backend tsconfig typechecks `src`, while Vitest transpiles tests. |
| Gate A probes | Queue invariant and analytics-health diagnostics | NOT RUN | Out of this foundation's correction scope; their previously recorded FAIL status remains unresolved. |
| Bootstrap/account operations | Initial designation, create/invite/delete/recovery/approval | NOT RUN | Explicitly prohibited; test routes only decide authorization and perform no such action. |

Earlier intermediate runs passed before the deprovisioning refinement (107 new/157 total). They are superseded by the final 108/158 results, not counted as additional distinct tests.

## Positive authorization evidence — executed

`Backend/test/admin-authority.test.ts` uses a localhost Express listener, mocked `auth.getUser` and mocked context RPC. Test-only `/primary`, `/delegated`, `/administrative` and `/authorize/...` handlers are not mounted in application code.

- A primary identity passes the exact primary middleware; a delegate passes the exact delegated middleware; both pass ordinary administrative checks.
- Primary creation/invitation checks pass without creating an account. Primary final CAS approval, ordinary-target role/identity/reactivation decisions pass without writing any field.
- A delegate can receive recovery/archive/deletion decisions for an ordinary non-admin target. Primary recovery/archive decisions for a delegated administrator remain permitted. No password email or deletion is performed.
- Exact RPC calls use the freshly validated bearer user's UUID and the actual validated single target; body/query actor/authority/target claims cannot replace those arguments.
- Existing tests retain verified staff/super-admin queue analytics/notification permissions and student/faculty/archival behavior. Existing production routes do not acquire the new authority requirement.

## Negative authorization evidence — executed

- Missing/malformed/expired credentials, invalid Auth UUID and thrown Auth errors stop before an authority grant; sanitized responses omit provider detail.
- NULL context (including simulated non-admin/pending/rejected/archived actor or missing/ineligible primary), RPC errors/throws, malformed JSON, invalid levels/roles, missing fields, actor mismatch and inconsistent primary/target facts fail closed.
- Delegates fail primary middleware, create/invite/final-approval checks, role/identity/reactivation changes and primary-target actions. Forged metadata/settings/role/actor claims do not elevate the caller.
- Admin1-target password/email/recovery-alternate-address/role/verification/archive/deletion attempts are represented by the corresponding denied action categories. There is no recovery destination or mutation payload accepted by this foundation; later endpoints must separately validate those fields.
- Self-targeted administrative identity/governance actions are denied. A delegate cannot target another super-admin, even if that account has no authority record. Assigned authority-holder deletion/role changes are denied even for primary.
- Unknown authority-assignment, generic update, settings/metadata and bulk actions are denied; invalid/multiple target UUIDs and missing/unexpected targets are rejected.
- A second check after actor revocation, target promotion to admin, or session invalidation reads fresh identity/context and denies appropriately; prior ordinary middleware success is not cached as a grant.

**Evidence limitation:** the named role/state/primary NULL-context cases deliberately simulate a database rejection. They prove the backend fails closed, not that PostgreSQL enforces those conditions. The prepared integration suite below tests the actual database side. No blanket coverage percentage or production-security certification is claimed.

## Prepared isolated database acceptance — NOT EXECUTED

File: `Backend/supabase/tests/admin_authority.sql`. Prerequisites are all ten ordered migrations through `202611130001_admin_authority_foundation.sql`, a separately approved isolated Supabase database/owner session, `ON_ERROR_STOP=1`, the explicit `cas_assist.isolated_test = 'true'` marker, and an initially empty authority table. The suite begins a transaction and ends with rollback. It refuses to proceed without the marker or when authority records already exist. Rollback fixtures are still writes and require target-specific authorization; this report is not permission to run them on a hosted application project.

Prepared coverage:

| Boundary | Prepared assertion | Status |
|---|---|---|
| Catalog ACLs | Schema/table denial to anon/authenticated/service_role; service-only context EXECUTE; safe fixed definer path; RLS enabled with no client policies. | BLOCKED |
| Primary/delegated data | Actual synthetic profile/Auth/authority joins resolve current eligible primary/delegate and optional target. Missing/misassigned authority, no primary, missing target and wrong role/state deny. | BLOCKED |
| Eligibility | Pending/rejected/archived actor; pending/archived/demoted primary; Auth/profile mismatch and noninstitutional identity fail closed. | BLOCKED |
| Direct modification | Anonymous/delegated/service direct authority reads and mutation attempts denied; authenticated RPC cannot impersonate primary UUID. Temporary transaction-local grants also exercise default-deny RLS. | BLOCKED |
| Authority constraints | A second primary and invalid level are rejected; profile/Auth deletion cannot cascade through an assigned authority. | BLOCKED |
| Indirect escalation | Editable system settings and user metadata do not affect protected authority. | BLOCKED |
| Operational compatibility | Existing verified super-admin eligibility/analytics work without a designated primary, while the new context denies. | BLOCKED |

The SQL context RPC does not itself implement action-level permissions; it supplies protected facts to the backend policy. Direct client invocation is denied, and service callers remain trusted backend infrastructure. Primary-only action decisions are covered by the executed backend tests. Future mutation endpoints need their own action/payload/integration tests.

The prepared uniqueness case is sequential, not an executed concurrent-session test. Future acceptance must use two isolated owner transactions attempting different primary designations: the second must wait/lose appropriately when the first commits, and a rollback must leave no extra primary. Repeat eligibility/target rechecks after concurrent authority/state changes. Clean synthetic data under the approved test procedure; do not use real users. No cross-service atomicity is established by this test plan.

The suite intentionally does not add blanket baseline grants to make old workflows pass. If Gate A's unresolved effective-grant/default-ACL issue causes the existing settings/analytics positive path to fail on a fresh isolated reconstruction, record and investigate that failure rather than disabling RLS or silently changing permissions.

## Validation conclusion

**PASS:** local foundation behavior and existing automated regressions. **BLOCKED:** real database/Auth enforcement and concurrent-session acceptance. **NOT RUN:** deployment, bootstrap and all account operations. All existing Gate A release blockers remain visible. The local step is complete within those limits; no deployed account-management security outcome is claimed.
