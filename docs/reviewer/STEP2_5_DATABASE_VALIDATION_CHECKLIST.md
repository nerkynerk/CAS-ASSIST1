# Step 2.5 — Database Validation Checklist

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Status: prepared, NOT EXECUTED; isolated database validation BLOCKED.** No application source, migration, test, existing report, account, privilege or production setting was changed. The existing two SQL suites were reviewed and preserved. Additional probes below are proposed test instructions, not executed tests or new production SQL.

**Verified environment:** PowerShell 5.1/AMD64 and Node 24/npm 11 are available. No Docker-compatible runtime, Supabase CLI or PostgreSQL client was identified on PATH/checked standard locations; no approved isolated target was configured. Existing application environment files point to hosted Supabase resources of unverified purpose, not an approved test database. Credentials/connection strings were withheld and no endpoint contacted. Installation, scratch setup and empty-stack creation must follow the separately approved gates in `STEP2_5_TEST_ENVIRONMENT_PLAN.md`.

## Prerequisites and execution boundaries

- [ ] Gate A/B: approved tools, new isolated workdir/project/network, loopback bindings and empty platform stack; pinned CLI help/config accepted. No copying application environment files or linking a hosted project.
- [ ] Gate C: approved read-only connection identifies container/image/system ID, actual PostgreSQL version, platform schemas/roles/extensions, migration history, owners/default ACLs and empty application baseline.
- [ ] Gate D: explicit exact-target approval for the ten hashes below, **all** migration data writes, fixture/Auth/profile/authority inserts/updates, temporary grants/role simulation, rollback-only tests and sanitized evidence. A self-set isolation marker is not identity evidence.
- [ ] Fresh reconstruction and a representative authorized restored-schema replay are separately planned; neither proves the other. Real records/restores require separate authorization and sanitization. Do not connect to production to obtain one in this step.
- [ ] Tests run before real bootstrap. `admin_authority.sql` requires the authority table to be empty; never delete a designation to make a test start.

All mutation snippets/commands below are **NOT RUN** and require Gate D or the additional Gate E scope noted for live/concurrent testing. Read-only queries also require target connection approval. No reset/down/repair/squash/push/link command is part of the plan. Never rewrite a previous migration or grant broad access/disable RLS to manufacture a PASS.

## Confirmed migration ordering and dependencies

Directory: `Backend/supabase/migrations/`. All ten files were inspected; the exact order is:

| # | Filename | Required predecessor/schema and compatibility risk |
|---|---|---|
| 1 | `202607280001_research_compliance.sql` | Supabase `auth.users`, `auth.uid/role`, platform roles, `storage`, `extensions`, available pgvector. Defines application enums/tables/helpers/triggers/RLS; also converts legacy data and upserts private storage buckets. |
| 2 | `202609110001_document_requests_and_schedules.sql` | Registry/lifecycle/update/role helpers from #1. Adds document requests and faculty teaching schedules. |
| 3 | `202609120001_legacy_contract_bridges.sql` | Conditional prototype compatibility. Detection of `posted_by`/`logged_by` does not establish all other referenced legacy columns exist; partial legacy shapes can fail. |
| 4 | `202609120002_ticket_priority_compatibility.sql` | Ticket table; priority type/constraint conversion and `medium`→`normal` rewrite. |
| 5 | `202609130001_student_number_registration.sql` | Registry/Auth profile trigger; adds nullable student-number validation/unique index and replaces profile creation. Invalid/duplicate existing student numbers can block replay. |
| 6 | `202609130002_system_analytics.sql` | Prior registry/ticket/document/schedule/content/AI tables and role helper. |
| 7 | `202609130003_tier1_knowledge_base.sql` | `app_role`, role/update helpers; adds articles/RLS and upserts eleven workflow articles. |
| 8 | `202609130004_tier1_answer_rpc.sql` | Tier-1 articles/AI logs; title updates and answer/feedback RPCs. |
| 9 | `202611090001_phase1_security_hardening.sql` | All 24 application tables and prior function signatures. Adds restrictive gates, status RPC and revokes broad ticket UPDATE/client queue EXECUTE. Plain CREATE POLICY statements make manual repeated execution unsafe. |
| 10 | `202611130001_admin_authority_foundation.sql` | Registry/Auth/role/verification fields after Phase 1. Creates `cas_admin`, authority table/index/RLS and service-only context. No assignment. Existing schema/function collision must stop; do not drop/adopt an unknown object. |

Evidence: baseline `:5`, `:27–28`, `:119–149`, `:381`, `:873–878`; legacy bridges `:6–28`, `:34–56`; student-number migration `:7–22`; knowledge migration `:37–123`; answer migration `:4–22`; Phase 1 `:57–86`, `:133–180`; authority migration `:8–28`, `:70–72`. Line references use the corresponding filenames above.

Important retained risks: `IF NOT EXISTS`/duplicate-enum handling does not reconcile divergent existing schemas; vector installed outside `extensions` may conflict with expected vector types; old migrations rely on effective baseline client grants/default ACLs. Phase 1 frontend/migration coupling and Gate A's queue/health/grant/INSERT/storage findings remain unresolved. Seed-disabled startup does not make replay read-only, and a plain PostgreSQL instance is not the complete Supabase platform.

## Exact approved-source manifest and proposed replay commands

Observed SHA-256 values identify this uncommitted source snapshot. They do not prove any database has applied it. The historical Gate A manifest/report remains unchanged; the new authority migration was added after that earlier gate. Recheck hashes before approval/execution; any drift or extra/missing migration requires review.

```powershell
# NOT RUN. Gate D required. Variables are from the reviewed environment plan.
$step25ExpectedMigrations = [ordered]@{
  '202607280001_research_compliance.sql' = '1E44652F81E62522CC820207E423BAFC6A06431A555DD0B8E391F003918CB556'
  '202609110001_document_requests_and_schedules.sql' = '03928829CC7340DA4DB948BB84BF5CFC34BF83E7D7E28D2B1E35CDF3F7ADCF8C'
  '202609120001_legacy_contract_bridges.sql' = '5C99F1B58645C3BE1B3108705A190BFBB156D7BDFA507AC1475CBDBB0AEA0DC0'
  '202609120002_ticket_priority_compatibility.sql' = 'C06B7C3201B57FB938C54D4935EC4139D7C30550EB697E8D2BBF355438D3B3C5'
  '202609130001_student_number_registration.sql' = '7CCBD28EC0724B5AA6BE2A460EFEC11D31B1E5A8C066EDB14F649A5B0CF1AFDA'
  '202609130002_system_analytics.sql' = 'F1E49F727F25024BEF120741AB518254F5FBF3E55E5201AF13D9CCC6113961EB'
  '202609130003_tier1_knowledge_base.sql' = 'A99352D71FA0061E233C93522AC5352CCD428577095DAAD5C375ED363DBF3497'
  '202609130004_tier1_answer_rpc.sql' = '52E0C3E3881946B8994ED935C211C889A098C5B9823DAFC1DAC342B892BEFBE1'
  '202611090001_phase1_security_hardening.sql' = 'C7FF68699C4CBC27BDBC9EC6F8FDFA8EE7852448EE7F8724850F763A509E7292'
  '202611130001_admin_authority_foundation.sql' = 'EB385799C71EDC8E9EA4157C73ABE5EDC0AC8B8812D4928057209D0DB9650A73'
}
$step25MigrationSource = Join-Path $step25Repo 'Backend\supabase\migrations'
$step25MigrationDestination = Join-Path $step25Stack 'supabase\migrations'
$step25ObservedNames = @(Get-ChildItem -LiteralPath $step25MigrationSource -File -Filter '*.sql' | Select-Object -ExpandProperty Name)
if (@(Compare-Object -ReferenceObject @($step25ExpectedMigrations.Keys) -DifferenceObject $step25ObservedNames).Count -ne 0) { throw 'Migration inventory differs from the approved ten files.' }
if (@(Get-ChildItem -LiteralPath $step25MigrationDestination -File -Filter '*.sql' -ErrorAction SilentlyContinue).Count -ne 0) { throw 'Expected a new empty migration destination; review instead of overwriting.' }
if (-not (Test-Path -LiteralPath $step25MigrationDestination)) { New-Item -ItemType Directory -Path $step25MigrationDestination | Out-Null }
foreach ($step25Name in $step25ExpectedMigrations.Keys) {
  $step25SourceFile = Join-Path $step25MigrationSource $step25Name
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $step25SourceFile).Hash -ne $step25ExpectedMigrations[$step25Name]) { throw "Source hash mismatch: $step25Name" }
  Copy-Item -LiteralPath $step25SourceFile -Destination $step25MigrationDestination -ErrorAction Stop
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $step25MigrationDestination $step25Name)).Hash -ne $step25ExpectedMigrations[$step25Name]) { throw "Copied hash mismatch: $step25Name" }
}
# Operator now changes only scratch db.migrations.enabled to true, keeps seed=false,
# reviews/records the resulting config hash, and rechecks the exact approved target.
if (Test-Path -LiteralPath (Join-Path $step25Stack 'supabase\.temp\project-ref')) { throw 'Unexpected linked-project metadata; stop.' }
& $step25Cli migration list --workdir $step25Stack
if ($LASTEXITCODE -ne 0) { throw 'Local migration-history check failed.' }
& $step25Cli migration up --workdir $step25Stack
if ($LASTEXITCODE -ne 0) { throw 'Migration replay failed; retain the first error and stop.' }
& $step25Cli migration list --workdir $step25Stack
if ($LASTEXITCODE -ne 0) { throw 'Post-replay history check failed.' }
```

These commands target the fresh pinned-v3 local workdir by default, with no `--remote`/link. Verify installed version/help and observed target before use; no CLI is installed here to prove runtime compatibility. Do not use include-all/history repair to force a mismatch through. On a representative restored target, inspect applied history first and adapt approval to **only unapplied** files rather than copying/replaying an already-applied Phase 1 migration. [Supabase migration commands](https://supabase.com/docs/reference/cli/supabase-migration-up).

## Read-only preflight before fixtures

Existing audits are `Backend/supabase/audits/phase1_read_only_audit.sql` and `Backend/supabase/audits/gate_a_security_inventory.sql`. They cover public/storage metadata and include exposed functions but do not inventory the private authority relation comprehensively. After all ten migrations, add the following owner-authorized read-only inspection to the evidence; it is **NOT RUN**:

```sql
begin read only;
select nspname, pg_get_userbyid(nspowner) as owner, nspacl
from pg_namespace where nspname = 'cas_admin';
select relname, pg_get_userbyid(relowner) as owner, relrowsecurity, relforcerowsecurity, relacl
from pg_class where oid = 'cas_admin.authorities'::regclass;
select policyname, permissive, roles, cmd from pg_policies
where schemaname = 'cas_admin' and tablename = 'authorities';
select indexname, indexdef from pg_indexes where schemaname = 'cas_admin';
select conname, pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid = 'cas_admin.authorities'::regclass;
select rolname,
  has_schema_privilege(rolname,'cas_admin','USAGE') as schema_usage,
  has_table_privilege(rolname,'cas_admin.authorities','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_direct_table_privilege,
  has_function_privilege(rolname,'public.get_admin_authority_context(uuid,uuid)','EXECUTE') as context_execute
from pg_roles where rolname in ('anon','authenticated','service_role');
select count(*) as authority_rows_before_tests from cas_admin.authorities;
select count(*) as auth_fixture_collisions from auth.users
where id::text like 'f1000000-0000-4000-8000-%' or id::text like 'a2100000-0000-4000-8000-%';
select count(*) as registry_fixture_collisions from public.users_account_registry
where id::text like 'f1000000-0000-4000-8000-%' or id::text like 'a2100000-0000-4000-8000-%';
select count(*) as ticket_fixture_collisions from public.advising_ticket_pipeline where id::text like 'f2000000-0000-4000-8000-%';
select count(*) as assignment_fixture_collisions from public.faculty_assignments where id::text like 'f3000000-0000-4000-8000-%';
select count(*) as spatial_fixture_collisions from public.spatial_logs where id::text like 'f4000000-0000-4000-8000-%';
select count(*) as ai_fixture_collisions from public.ai_query_logs where id::text like 'f5000000-0000-4000-8000-%';
select count(*) as program_fixture_collisions from public.cas_programs where code = 'PHASE1-SYNTHETIC';
select count(*) as setting_fixture_collisions from public.system_settings
where key in ('phase1_test','phase1_archived_denied','step2_authority_fixture');
commit;
```

Acceptance: no client schema/table privileges, only service context EXECUTE, RLS enabled/no client policies, owner consistent with the trusted definer, one unique partial primary index and deletion-restricting FK; `cas_admin` remains absent from exposed API schemas. **Every fixture collision count and authority count must be zero.** Stop on collisions; never delete records to clear them. The suites use fixed UUIDs and prefix-scoped fixture updates, so the marker alone cannot safely protect an unidentified or reused database. Record aggregate baseline counts before each suite and compare afterward to confirm rollback. Inspect effective inherited/column grants as well as table ACL text; see the existing Gate A inventory.

## Exact proposed audit/suite commands

Use the approved observed container ID/name from the environment plan, after rechecking its fingerprint. Copy source files unchanged to the disposable container to avoid shell text-encoding changes. psql supports ordered `-c`/`-f`, `-X` ignores startup scripts, and `ON_ERROR_STOP` terminates on the first error. These suites are custom assertion scripts, not pgTAP/TAP output; use the stated psql route rather than assuming `supabase test db` accepts them. [PostgreSQL 17 psql](https://www.postgresql.org/docs/17/app-psql.html).

```powershell
# NOT RUN. Gate C for read-only audits; Gate D for rollback fixture suites.
$step25AuditNames = @('phase1_read_only_audit.sql','gate_a_security_inventory.sql')
foreach ($step25AuditName in $step25AuditNames) {
  $step25AuditSource = Join-Path $step25Repo "Backend\supabase\audits\$step25AuditName"
  docker cp $step25AuditSource "${step25DbContainer}:/tmp/$step25AuditName"
  if ($LASTEXITCODE -ne 0) { throw 'Audit copy failed.' }
  docker exec $step25DbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -f "/tmp/$step25AuditName"
  if ($LASTEXITCODE -ne 0) { throw 'Read-only audit failed; stop.' }
}
$step25SuiteNames = @('phase1_security.sql','admin_authority.sql')
foreach ($step25SuiteName in $step25SuiteNames) {
  $step25SuiteSource = Join-Path $step25Repo "Backend\supabase\tests\$step25SuiteName"
  docker cp $step25SuiteSource "${step25DbContainer}:/tmp/$step25SuiteName"
  if ($LASTEXITCODE -ne 0) { throw 'Suite copy failed.' }
  docker exec $step25DbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "set cas_assist.isolated_test = 'true'" -f "/tmp/$step25SuiteName"
  if ($LASTEXITCODE -ne 0) { throw 'Security suite failed; preserve the first error and stop.' }
}
```

Each suite owns its BEGIN/ROLLBACK; do not add a competing `--single-transaction`, combine them in a shared transaction, or reuse a failed open interactive transaction. Each nonzero exit stops the sequence. A successful rollback suite must leave before/after application/Auth/authority aggregates unchanged and no fixture leftovers. Local mail must remain captured, with no real notification/SMTP delivery.

## Acceptance coverage and gaps

All database cases below are **BLOCKED / NOT EXECUTED**. Source review only establishes that a test is prepared, not that it passes.

| Required boundary | Existing prepared coverage | Additional acceptance required |
|---|---|---|
| Admin1/Admin2 protected authority | `admin_authority.sql:89–129` eligible contexts; `:38–61` private ACL/RLS/definer checks. | Real Auth/JWT + service-only PostgREST calls; confirm context gives facts, not action permission. |
| Only one primary | `admin_authority.sql:159–174` sequential conflict/invalid-level rejection. | Actual two-session committed conflict and rollback-winner paths below. |
| Non-admin / pending / archived | `admin_authority.sql:114–157`; `phase1_security.sql:74–94`, `:129–152`. | Fresh-context/live-session denial after a committed revocation. |
| Direct RPC restrictions | Both suites' EXECUTE checks and direct denied calls; admin `:190–198`. | Anonymous/authenticated HTTP attempts denied even with a supplied primary UUID; service context succeeds only as authorized infrastructure. |
| Unauthorized database mutations | Admin `:130–134`, `:199–216`; Phase 1 direct ticket UPDATE and archived mutations. | Supplemental direct primary profile/Auth changes; positive/forged advising INSERT fields. |
| Cross-user privacy | Phase 1 own-ticket count and foreign ticket-transition denial (`:83–88`), faculty INSERT isolation (`:116–120`). | Student A/B positive/negative ticket/attachment/storage reads; own/unrelated faculty UPDATE; service queue JSON/privacy assertions; unrelated anonymous storage regression. |
| Existing roles | Phase 1 staff transitions/audit/AI feedback and admin `:232–239` ordinary analytics without primary. | Run against real effective grants; test actual role-specific routes. Do not confuse lack of all table privileges with correct row ownership. |
| Primary protection | Admin FK deletion blocks `:176–187`; authority write denial and settings/metadata invariance `:218–230`. | Direct primary-target field attempts below; existing backend action policy and eventual endpoint side-effect tests. |
| Revocation / concurrency | Sequential eligibility changes and missing-primary checks exist. | Multi-session scenarios and READ COMMITTED fresh statements below. |
| Backend action allowlist | Prior Step 2: 108 new mocked authorization cases, 158 total backend tests. | Historical PASS only. Database context is not the action guard; future handlers need actual action/payload/target integration tests. |

`get_admin_authority_context(delegate_uuid, primary_uuid)` intentionally returns target facts to the trusted service. It is **not** expected to deny a primary-target action. `Backend/src/middleware/admin-authority.ts:111–139` performs action denial, including creation/final approval. There is no provisioning/recovery/final-approval mutation endpoint to test yet. Do not invent one or infer its safety from SQL role simulation.

### Prepared supplemental primary-target probe

After separate review/approval, place the following in a **scratch copy** of `admin_authority.sql` before its `:232` primary-removal section, while synthetic fixtures and `pg_temp` assertions still exist. Preserve the original suite/hash and record the amended test-plan hash. This block is not standalone, not executed and not approved to run now. It accepts the appropriate authorization error or zero affected rows, then checks the original values through the owner.

```sql
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"a2100000-0000-4000-8000-000000000002"}', true);
do $$
declare statement text; changed_rows bigint;
begin
  foreach statement in array array[
    $q$update public.users_account_registry set email='unauthorized-fixture@neu.edu.ph' where id='a2100000-0000-4000-8000-000000000001'$q$,
    $q$update public.users_account_registry set role='student' where id='a2100000-0000-4000-8000-000000000001'$q$,
    $q$update public.users_account_registry set state='archived_read_only' where id='a2100000-0000-4000-8000-000000000001'$q$,
    $q$update public.users_account_registry set verification_status='rejected' where id='a2100000-0000-4000-8000-000000000001'$q$
  ] loop
    begin
      execute statement;
      get diagnostics changed_rows = row_count;
      perform pg_temp.assert_true(changed_rows = 0, 'delegated primary profile mutation affects no rows');
    exception when insufficient_privilege then
      raise notice 'PASS: delegated primary profile mutation denied';
    end;
  end loop;
end $$;
select pg_temp.expect_denied(
  $q$update auth.users set email='unauthorized-fixture@neu.edu.ph' where id='a2100000-0000-4000-8000-000000000001'$q$,
  'delegated primary Auth mutation denied');
reset role;
select pg_temp.assert_true(exists (
  select 1 from public.users_account_registry u join auth.users a on a.id=u.id
  where u.id='a2100000-0000-4000-8000-000000000001'
    and u.email=a.email and u.role='super_admin'
    and u.state='active' and u.verification_status='verified'
), 'primary identity and eligibility remain unchanged');
```

The remaining cross-user/storage/INSERT/faculty UPDATE gaps need reviewed synthetic fixture/object paths and positive/negative assertions before claiming complete acceptance. Private buckets alone are not proof of object ownership enforcement; do not add permissive object policies just to pass. Their precise fixture scripts are a **missing preparation deliverable for later approved test execution**, not something already present in either preserved suite.

### True two-session uniqueness and revocation plan

The rollback suites leave no shared committed identities. Gate E must explicitly approve separately supplied synthetic, already eligible UUIDs visible to both sessions, temporary committed designation/state changes, and exact cleanup. **No account or UUID is auto-selected/created here.** Bootstrap of a real administrator is not part of this test.

Open two owner psql sessions in separately controlled terminals using the approved exact container:

```powershell
# NOT RUN. Run once in each terminal only under Gate E approval.
docker exec -it $step25DbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres
```

With an empty authority table and candidate UUIDs verified under the approved synthetic fixture process:

```sql
-- Session A: NOT RUN. Placeholder must be replaced only by approved synthetic UUID A.
begin;
insert into cas_admin.authorities(user_id,level)
values ('REPLACE_WITH_APPROVED_SYNTHETIC_UUID_A'::uuid,'primary');
-- Keep A open while B attempts its insert.
```

```sql
-- Session B: NOT RUN. Placeholder must be replaced only by approved synthetic UUID B.
\set VERBOSITY verbose
begin;
set local lock_timeout='30s';
insert into cas_admin.authorities(user_id,level)
values ('REPLACE_WITH_APPROVED_SYNTHETIC_UUID_B'::uuid,'primary');
```

After B demonstrably waits, A issues **COMMIT** within that interval. B must receive SQLSTATE **23505**, then issue **ROLLBACK**. An owner checks exactly one primary and that it is A; approved exact-fixture cleanup is then required. A timeout (`55P03`) is inconclusive, not uniqueness PASS. Also test A **ROLLBACK**, allowing B's insert, followed by B **ROLLBACK**. A-only rollback does not prove the committed-conflict rejection path. Unique indexes account for conflicting uncommitted transactions; these are expected outcomes to validate, not executed evidence. [PostgreSQL uniqueness checks](https://www.postgresql.org/docs/17/index-unique-checks.html).

Revocation acceptance: use a separate approved synthetic primary/delegate pair. Session B makes a successful context lookup as the service role. Owner session A commits an approved synthetic actor archival/pending/demotion/authority removal, then B issues a **new** context statement under READ COMMITTED and must get NULL. Repeat primary revocation while delegate remains otherwise eligible. Restoration/cleanup must be explicitly approved and match original fixture values. A deliberately long REPEATABLE READ transaction retains an older snapshot, so it cannot stand in for fresh per-operation application checks. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html).

## Evidence and acceptance decision

Record target fingerprint, approved config/tool/image/migration/test hashes, command/exit code, first failure, direct SQLSTATE or HTTP status, sanitized assertions, before/after aggregate counts and exact remaining cases. Label each **PASS / FAIL / BLOCKED / NOT RUN** individually. Separate SQL `SET ROLE` tests, genuine Auth-issued JWT/PostgREST tests, backend mocked tests, multi-session tests and browser/TLS acceptance.

**Current decision: NOT READY for execution.** Tools/target approval, effective baseline privileges, supplemental fixture plans, committed concurrency scope and local TLS/Auth strategy are missing. Prior Gate A failures are retained; no new SQL PASS or production readiness claim is made. Installation/startup/migration/fixture/bootstrap examples above remain unexecuted and require explicit approvals.
