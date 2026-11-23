# CAS-ASSIST1 Development Handoff

**November 20, 2026 (Asia/Manila)** · Branch `octup/safe-enhancements` · HEAD `3270d8d` (`fix: restore student new request button`)

CAS-ASSIST1 has reviewed the **hosted compatibility and permission results** for Supabase project `rueukwztuflgpuvopmlu`. It confirms all eight baseline versions and identifies three pending security files. The Phase 1 hosted draft is ready for approval with its four Storage policies deferred.

The project keeps its existing React Native/Expo frontend, Express/TypeScript backend, Supabase schema, and Base44-inspired UI. The owner identified the hosted project as a capstone development environment with disposable test records and prioritized preserving the database structure and existing workflows.

## Local implementation

| Area | Current state |
| --- | --- |
| CAS verification | The frontend checks active CAS access before opening protected screens. The verification screen handles pending, rejected, and restricted access with refresh and sign-out actions. Verified archived users have a separate history path. [Verification screen](../../Frontend/src/components/auth/verification-pending-screen.tsx) |
| Backend authorization | Queue, AI, and notification routes use the verified CAS access guard. Student access checks include a current managed CAS membership. Queue estimates use the authenticated student's identity. [Authorization middleware](../../Backend/src/middleware/auth.ts) |
| Ticket updates | The local frontend calls a controlled status transition RPC. The Phase 1 migration restricts direct ticket updates and relies on existing transition and audit triggers. [Phase 1 implementation](PHASE1_SECURITY_IMPLEMENTATION_REPORT.md) |
| Admin1/Admin2 | The foundation retains `super_admin` as the application role and adds protected `primary` and `delegated` authority levels. The middleware revalidates the actor and evaluates specific actions. Creation, invitations, final CAS approval, and changes that can grant access are reserved for Admin1. Delegated actions have target restrictions that protect Admin1's identity and authority. [Authority implementation](STEP2_ADMIN_AUTHORITY_IMPLEMENTATION.md) |

Production routes have yet to adopt the authority helper. Account creation, recovery, approval, and other account-management operations are pending, and Admin1 has yet to be designated. Appointment booking remains deferred. The existing `schedules` table describes academic timetables. [Account and appointment audit](STEP1_ADMINISTRATION_AND_ACCOUNT_AUDIT.md)

## Hosted observations

Step 2.7 reviewed all 13 prepared catalog query groups and the Backup and Auth Dashboard screenshots supplied by the user. [Hosted inspection record](STEP2_7_HOSTED_DATABASE_INSPECTION.md)

| Area | Observed state and open questions |
| --- | --- |
| Table access | All 25 public tables had broad grants for the API roles, including `TRUNCATE`. `public.push_notification_logs` had RLS disabled and broad client grants. |
| Function access | All 13 observed security-definer routines were executable by `anon` at the database privilege level. The legacy two-argument `acknowledge_room_change` overload was present. API reachability and internal authorization guards remain unverified. |
| Migration evidence | The expected Phase 1 restrictive policies and access helpers did not appear. The `cas_admin` authority objects were absent. The later compatibility result confirmed eight recorded baseline versions through `202609130004`. The three prepared security migrations are unrecorded. |
| Storage and Auth | Storage tables had RLS enabled and the query returned no Storage policies. Attachment access needs verification. Signup and the Email provider were enabled. Email confirmation, anonymous sign-ins, and manual linking were disabled. |
| Recovery | The Free-plan Scheduled backups panel showed no available recovery point. Manual backup and restore readiness remain unverified. |

## SQL prepared for review

| Migration | Purpose |
| --- | --- |
| [202611090001_phase1_hosted_public_only.sql](../../Backend/supabase/hosted/202611090001_phase1_hosted_public_only.sql) | Adds verified CAS gates, controlled ticket transitions, and tighter RPC permissions. The four Storage policies are deferred because the migration role lacks ownership privileges. |
| [202611130001_admin_authority_foundation.sql](../../Backend/supabase/migrations/202611130001_admin_authority_foundation.sql) | Adds private authority storage, a unique primary designation constraint, and a backend-only lookup. The table starts without a designation. |
| [202611140001_hosted_security_privileges.sql](../../Backend/supabase/migrations/202611140001_hosted_security_privileges.sql) | Removes structural privileges from API roles on public tables, tightens defaults for objects created by `postgres` in `public`, protects legacy push logs, and revokes API EXECUTE on the older acknowledgement overload. |

The read-only package checks recorded versions, required columns, unique keys, INSERT defaults, triggers, function signatures and fingerprints, and policy or authority-object collisions. Check that a default or trigger supplies the legacy ticket attachment array when inserts omit it, and that room-change acknowledgements have a usable unique key on `(spatial_log_id, student_id)`. The proposed order is Phase 1, authority foundation, then the privileges follow-up, subject to the compatibility results and approval of the selected SQL. [Implementation and readiness plan](HOSTED_SECURITY_FIX_IMPLEMENTATION_PLAN.md)

## Validation and remaining work

| Check | Last recorded result |
| --- | --- |
| Backend TypeScript and focused authorization tests | **Passed.** The latest focused run passed 151 tests with mocked Supabase. [Readiness plan](HOSTED_SECURITY_FIX_IMPLEMENTATION_PLAN.md#focused-regression-tests) |
| Full backend suite at the Admin1/Admin2 milestone | **Passed.** 158 tests at that earlier checkpoint. [Foundation test results](STEP2_ADMIN_AUTHORITY_TEST_RESULTS.md) |
| SQL rehearsal and rollback suites | **Not run.** An isolated PostgreSQL runtime was unavailable when the SQL was prepared. [Focused SQL suite](../../Backend/supabase/tests/hosted_security.sql) |
| Real Auth, RLS, RPC, Storage, and browser acceptance | **Pending.** |
| Earlier Gate A diagnostics | **Two unresolved failures.** Fractional samples can produce an out-of-bounds triangular queue estimate. The analytics frontend calls `/health` while the backend serves `/api/health`. [Gate A blockers](GATE_A_REMAINING_BLOCKERS.md) |

## Where to resume

1. Review the prepared files and hashes in order: hosted public-only Phase 1, authority foundation, then the privileges follow-up. [Hosted rollout plan](HOSTED_SECURITY_FIX_IMPLEMENTATION_PLAN.md#sql-prepared-locally)
2. The permission check confirmed that `postgres` can create the authority schema and read the required Auth columns. Storage policy work remains deferred.
3. Obtain explicit approval for the selected hosted SQL before any write. Admin1 assignment, signup changes, and deployment each remain separate steps. [Hosted application sequence](HOSTED_SECURITY_FIX_IMPLEMENTATION_PLAN.md#exact-hosted-application-steps--only-after-final-sql-approval)
