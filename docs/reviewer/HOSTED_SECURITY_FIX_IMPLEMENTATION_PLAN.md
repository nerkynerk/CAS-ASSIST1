# Hosted security fix — implementation and readiness

**Date:** 2026-11-14 (Asia/Manila). **Target:** `rueukwztuflgpuvopmlu`, reconfirmed by the user. **Branch:** `octup/safe-enhancements`.

**Status as of November 20, 2026 (Asia/Manila).** Reviewed the user-supplied compatibility and permission results. The three exact SQL files for the hosted rollout are ready for approval. The target is a capstone development environment with disposable test records.

## Compatibility findings

Evidence: [Step 2.7 inspection](STEP2_7_HOSTED_DATABASE_INSPECTION.md), based on user-supplied hosted results, not an assistant connection.

| Observed state | Prepared response / remaining check |
|---|---|
| PostgreSQL 17.11. All 24 operational tables have RLS. The compatibility result showed no `phase1_*` policy collisions or new Phase 1 access functions. | Apply the public-only Phase 1 draft after approval. |
| All 25 public tables grant API roles structural privileges including TRUNCATE. | Remove TRUNCATE, REFERENCES, TRIGGER and MAINTAIN from PUBLIC and all three API roles; preserve ordinary row privileges apart from the existing Phase 1 ticket restriction and legacy push logs. |
| `push_notification_logs` has RLS disabled, recipient/message columns and broad client grants. No active local consumer was found. | If present, enable RLS and remove ordinary-client access; retain the table, data and existing backend service CRUD. No new inbox feature or broad policy is introduced. |
| Owner-privileged routines have broad EXECUTE/path settings; an extra `acknowledge_room_change(uuid,uuid)` exists. | Keep Phase 1's guarded canonical RPCs; deny all API roles EXECUTE on the legacy overload while retaining its definition. |
| Legacy role/state enums have matching labels; existing helper returns and replacement RPC signatures match at the metadata level. | Keep existing types. Recheck helper fingerprints, keys, defaults and enabled triggers; signature agreement alone is insufficient. |
| `cas_admin`/authority objects were absent. | Apply the existing foundation only if the current check still shows no collision. It creates no designation. |
| The Storage inventory shows RLS enabled and no policies. Signup is enabled and email confirmation is disabled. | Defer Storage policies and verify attachment behavior separately. Auth settings are outside the selected SQL. |

These are metadata concerns, not demonstrated exploits. Free-plan managed backups are unavailable in the supplied panel; no complete backup was demonstrated. A further backup audit is not a prerequisite merely to preserve dummy rows. A schema/definition export is a practical recovery option before later approved DDL; no export or tool installation occurred here.

## One read-only compatibility package

The user ran the [compatibility SQL](../../Backend/supabase/audits/hosted_security_compatibility.sql) in the confirmed project and shared one JSON result showing PostgreSQL `17.11`, role `postgres`, and `read_only=on`.

It checks version-only migration history, required relations/columns/types, usable keys, omitted INSERT-column defaults, attached triggers, relevant RPC signatures/body fingerprints, policy collisions and schema privileges. It reads no personal records, raw function bodies, migration `statements`, or secret configuration, and invokes no application RPC.

**Recorded versions:** `202607280001`, `202609110001`, `202609120001`, `202609120002`, and `202609130001` through `202609130004`. All eight match the local baseline migration versions and are excluded from the rollout. `202611090001`, `202611130001`, and `202611140001` are unrecorded. The expected Phase 1 policies and new RPCs are absent, the authority schema and lookup are absent, and the push-log table still has RLS disabled while the legacy acknowledgement remains executable by the API roles.

Compatibility findings from the JSON and local source:

- Both missing-object lists are empty. The 24 operational tables are owned by `postgres` and have RLS enabled. Both required unique keys are usable, on registry `id` and on acknowledgement `(spatial_log_id, student_id)`.
- All eight inspected omitted non-null columns have defaults matching known expressions. The legacy ticket attachment array matches `'{}'::text[]`. Other defaults match UUID generators, `now()`, and `false`. The validated ticket status and priority constraint fingerprints match the checked-in values, including `submitted` and `normal`.
- Six helper fingerprints matched the audit immediately. The seventh, `create_registry_profile()`, exactly matches its later definition in recorded migration `202609130001`. That body uses built-in functions and qualifies `public.users_account_registry`, so Phase 1's path change can preserve the registration trigger body. The audit now compares against that later definition. The supplied JSON is sufficient for this comparison.
- The replacement routine arguments and return types match the hosted signatures. The legacy two-argument acknowledgement has no reported catalog dependents. Current local callers use the one-argument form. External callers remain unverified.
- `storage.objects` is owned by `supabase_storage_admin`. The subsequent permission check returned `false` for managing Storage policies, `true` for creating the authority schema, and `true` for reading the required Auth identity columns, all as `postgres`.

```sql
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog, pg_temp;

select current_user as migration_role,
       pg_has_role(c.relowner, 'USAGE')
         and has_schema_privilege(c.relnamespace, 'USAGE') as can_manage_storage_policies,
       has_database_privilege(current_database(), 'CREATE') as can_create_authority_schema,
       has_schema_privilege('auth', 'USAGE')
         and has_column_privilege('auth.users', 'id', 'SELECT')
         and has_column_privilege('auth.users', 'email', 'SELECT') as can_read_auth_identity_columns
from pg_class c
where c.oid = to_regclass('storage.objects');
commit;
```

The hosted Phase 1 draft omits the four restrictive Storage policies. It retains the public-schema hardening and leaves the existing Storage behavior in place. Keep any separate Storage policy work scoped to the buckets and clients that need it.

## SQL prepared locally

| File | Purpose |
|---|---|
| [202611090001_phase1_hosted_public_only.sql](../../Backend/supabase/hosted/202611090001_phase1_hosted_public_only.sql) | Hosted Phase 1 review draft. Derived from the [original migration](../../Backend/supabase/migrations/202611090001_phase1_security_hardening.sql) by removing exactly four Storage policies and adding explanatory comments. |
| [202611130001_admin_authority_foundation.sql](../../Backend/supabase/migrations/202611130001_admin_authority_foundation.sql) | Existing, unchanged: private primary/delegated authority metadata and backend-only lookup; no Admin1 assignment. |
| [202611140001_hosted_security_privileges.sql](../../Backend/supabase/migrations/202611140001_hosted_security_privileges.sql) | New transaction: owner/version/foundation guards, public schema CREATE denial, structural table privilege removal, safer defaults, optional push-log RLS/client ACL closure and legacy overload EXECUTE denial. Effective privilege checks abort if inherited/other-grantor access remains. |

The follow-up closes future **postgres/public** table structural and routine EXECUTE defaults; new routines need explicit grants. Managed `supabase_admin` defaults are untouched. Separate `postgres/storage` routine grants can still apply; this is not a blanket rewrite of platform defaults. Existing routine ACLs remain governed by Phase 1. No CASCADE, table/function deletion, type conversion, account write, signup change or UI change is included. PostgreSQL 17 table-level REVOKE also removes corresponding column grants; effective column checks verify the result. [REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html), [Default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

Review hashes (SHA-256):

```text
202611090001 hosted variant  04FBA64D18D97AA6AD06415BF42F06633DE52CE47B0BD5B97E87E8BCBFCBC7AC
202611130001  EB385799C71EDC8E9EA4157C73ABE5EDC0AC8B8812D4928057209D0DB9650A73
202611140001  0302E75FED3D0F7CD5CB7358AAD731345B9065BC72445D05EF1C20FCACE488A2
```

## Focused regression tests

- [hosted_security.sql](../../Backend/supabase/tests/hosted_security.sql): effective structural/column denial, public CREATE denial, preserved CRUD and canonical RPC access, service-only queue/escalation/authority lookup, fixed definer paths, optional legacy-object restrictions, and actual future defaults using an empty synthetic table/function. Requires the isolated-test flag and rolls back; no accounts or authority designations are created.
- Existing [phase1_security.sql](../../Backend/supabase/tests/phase1_security.sql) and [admin_authority.sql](../../Backend/supabase/tests/admin_authority.sql): small fixture patches support actual legacy enum column types and explicitly grant temporary assertion-helper access after default routine permissions are closed. Their account/authority fixtures remain isolated-only; never run them as a hosted compatibility check.

| Validation performed locally | Result |
|---|---|
| `npm.cmd run typecheck` in `Backend` | PASS |
| `npm.cmd test -- test/authorization.test.ts test/admin-authority.test.ts` | PASS — 151 tests in two files; mocked backend authorization, not live SQL/RLS proof. |
| File preservation / formatting | SHA-256 comparison: all 180 unrelated baseline files unchanged. Only the two existing SQL fixture suites were adapted; changed-file whitespace checks passed. |
| Hosted Phase 1 draft | Source comparison verified that the only SQL difference is the removal of the four Storage policy statements. The three original migration files retained their previous SHA-256 hashes. |
| SQL execution / database regression suites | **NOT RUN** — no local PostgreSQL/psql, Docker or Supabase CLI is available; nothing installed. |

When a suitable approved test connection exists, run the prepared SQL suite with the existing convention, without putting credentials in reports:

```powershell
psql "$env:CAS_ASSIST_ISOLATED_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "set cas_assist.isolated_test = 'true'" -f Backend/supabase/tests/hosted_security.sql
```

This command is a future instruction, not an execution result. Schema fixtures are mutations even though they roll back. A migration approval does not automatically authorize the older account-fixture suites.

## Exact hosted application steps — only after final SQL approval

1. Review the exact three-file sequence above. The permission check and schema comparison select the hosted public-only draft as the first file.
2. Obtain explicit approval for the exact selected SQL files/hashes, accepting the stated SQL-runtime testing limitation if it remains. If recovery of the existing structure is desired, capture its definitions before applying approved changes; no reset or backup restore is part of this plan.
3. In the SQL Editor for the confirmed project, use the `postgres` role. Run the full approved **hosted public-only Phase 1** file, then the full **authority foundation** file. If either is already or partially installed by the time of execution, review the difference first.
4. Execute the full approved **202611140001** follow-up file. Each file has its own transaction. On any error, roll back the failed transaction and stop; earlier committed files are not automatically reversed. Never continue with ad-hoc grants, disabled RLS, a reset or broad privilege restoration.
5. Rerun the compatibility package and, only if explicitly approved for that development/test connection, the focused rollback SQL suite. Smoke-test a valid test student's ticket/AI/queue flow, staff transitions, faculty room-change and student acknowledgement, announcements and attachments. Pending, mismatched or non-member test accounts will intentionally lose operational access under Phase 1. New administration checks must deny while no primary is designated.
6. Stop. Public signup/confirmation controls, Admin1 assignment, account provisioning, deployment, commits and pushes require separate instructions. No schema is added to the gateway's exposed schemas; `cas_admin` must remain private.

**Review stop:** the three files and hashes above are ready for user approval. Hosted execution, runtime SQL tests, and workflow validation remain pending.
