# Gate A — Windows isolated Supabase setup and execution guide

**Prepared:** 2026-11-09, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Purpose:** prepare a disposable target for Phase 1 database acceptance. **Execution status:** setup, migrations, fixtures, SQL tests, and HTTP integration steps below are **NOT RUN**. This document does not grant approval to run them. The root Gate A reports own the overall outcome: the newly executed queue regression probe has failures, while database acceptance is independently blocked; this setup guide does not supersede that result.

## Observed environment and classification

| Item | Evidence observed in this checkout/session | Classification |
|---|---|---|
| Application roots | `Backend/package.json` is Express/TypeScript; `Frontend/package.json` is Expo/React Native. Each has its own npm lockfile and installed dependencies. | Existing local application source |
| Existing backend and frontend Supabase settings | Boolean-only parsing identified hosted Supabase origins; backend has a privileged key and frontend has a public key. No values, project references, full URLs, account data, or credentials were printed. | **Hosted, purpose UNVERIFIED**; neither staging nor production can be inferred |
| Explicit isolated connection | `CAS_ASSIST_TEST_DATABASE_URL` and `CAS_ASSIST_TEST_SUPABASE_URL` were absent. No approved target identity was supplied. | **No identified/approved isolated target** |
| Docker / Supabase CLI / PostgreSQL clients | `docker`, `supabase`, `psql`, `postgres`, `pg_ctl`, `initdb`, and `pg_isready` were not on PATH. Checked standard Program Files PostgreSQL/Docker locations, current-user DockerDesktop, Scoop, WinGet links, npm shim, and local Supabase package locations; none existed. No matching Docker/PostgreSQL service was returned. | Local database execution **BLOCKED** |
| Other local metadata | No `Backend/supabase/.temp`, Docker home/data directories, `SUPABASE_WORKDIR`, or `DOCKER_HOST` were found. `wsl.exe` exists, but no WSL distribution/engine readiness was established. | No evidence of a ready local stack; not an exhaustive machine inventory |
| Repository Supabase config | `Backend/supabase/config.toml`: local `project_id = "CAS-Assist"`, PostgreSQL major 17, API 54321, database 54322, shadow 54320, Studio 54323, local SMTP 54324, analytics 54327; migrations and `seed.sql` enabled. | Configured local defaults only; **not proof that services exist** |

The current project files and existing `.env` files must remain unchanged. Do not reuse an existing hosted endpoint because its hostname looks like a test project. The owner must identify the target, attest that it is disposable/nonproduction and contains only approved test data, and approve the exact operations.

## Approval boundaries

1. **Tool installation/configuration approval:** choose and approve the Docker installer, pinned Supabase CLI version, new scratch directories, supported Docker/WSL configuration, and isolated config edits. This permits preparing tools/files only; it does not permit starting a database, applying migrations, or inserting fixtures.
2. **Initial stack creation approval:** approve creation/start of the named new disposable local stack, including platform schemas/roles created by startup. Record the scratch path, local project ID, Docker context, intended loopback ports, and empty database purpose **before** startup. Start with no application migrations or seeds present.
3. **Target-specific database approval:** after read-only fingerprinting, record the observed database/container identity, migration/checksum manifest, baseline schema/grants, and synthetic data plan. Obtain approval covering that exact target for ordered migration application, test-role execution, fixture inserts/updates, rollback-only suite, and any needed test-only grants/configuration. Any reset, including a local reset, also needs explicit target-specific approval; this procedure does not use resets. A changed target or expanded operation requires fresh approval. Read-only audit/connection authorization is separate from mutation approval.

Rollback-only tests still perform database mutations. Setting `cas_assist.isolated_test` is an opt-in guard, not evidence of isolation or a substitute for approval.

## 1. Install tools only after approval

Use the official [Docker Desktop Windows installation guide](https://docs.docker.com/desktop/setup/install/windows-install/) to check host/WSL requirements, select the correct architecture, and obtain the installer. Do not silently enable Windows features, alter BIOS settings, accept terms, or install machine-wide services.

An approved per-user installer command can be run from PowerShell as follows; set the path to the reviewed downloaded installer. The hidden window option follows this workspace's background-process rule:

```powershell
$gateADockerInstaller = '<absolute path to reviewed Docker Desktop Installer.exe>'
Start-Process -FilePath $gateADockerInstaller -Wait -WindowStyle Hidden -ArgumentList 'install', '--user'
```

Use a separate tooling directory for a pinned stable CLI so neither application's dependency files change. The [Supabase CLI installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started) documents project-scoped npm installation and version pinning. Choose an approved exact stable version; do not run an unpinned `npx` download or install the CLI globally with npm.

```powershell
$gateARepo = 'D:\Dave Files\Capstone 2\CAS-ASSIST1'
$gateAScratch = Join-Path $env:TEMP 'cas-assist-gate-a-20261109'
$gateATools = Join-Path $gateAScratch 'tools'
$gateAStack = Join-Path $gateAScratch 'stack'
$gateAStackId = 'casassist-gatea-20261109'
$gateACliVersion = '<approved exact stable version>'

if (Test-Path -LiteralPath $gateAScratch) { throw 'Choose and approve a new empty scratch path; preserve existing data.' }
New-Item -ItemType Directory -Path $gateATools, $gateAStack | Out-Null
npm.cmd install --prefix $gateATools --save-exact --no-audit --no-fund "supabase@$gateACliVersion"
if ($LASTEXITCODE -ne 0) { throw 'CLI installation failed.' }
$gateACli = Join-Path $gateATools 'node_modules\.bin\supabase.cmd'
& $gateACli --version
```

Record the installed version, installer/binary checksums, selected container image versions/digests, and Docker version in the target evidence. Do not copy the application's `.env` files into scratch space. Do not log in or link this directory to a hosted project.

## 2. Review an isolated configuration; do not overwrite the repository config

The repository config may target a different CLI generation. Examples include its `local_smtp`, storage/vector/analytics, and experimental entries; the checked-in auto-exposure comment also references a behavior change after 2026-10-30. No CLI was available to validate that config's syntax. A comment is not proof of the installed runtime's defaults.

Generate configuration **only inside the newly approved empty scratch directory**, then review the generated schema against the installed CLI's help and [official configuration reference](https://supabase.com/docs/guides/local-development/cli/config). Never run `init --force` against `Backend`.

```powershell
& $gateACli init --workdir $gateAStack
if ($LASTEXITCODE -ne 0) { throw 'Scratch configuration initialization failed.' }
& $gateACli start --help
& $gateACli migration up --help
& $gateACli migration list --help
```

Before startup, make these **approved scratch-only edits** in the sections generated by that CLI; do not paste duplicate TOML sections:

| Setting | Approved proposed scratch value |
|---|---|
| `project_id` | `casassist-gatea-20261109` |
| `api.port`, `db.port`, `db.shadow_port` | 55321, 55322, 55320 |
| `db.major_version` | 17, matching the checked-in target major; record the actual image version |
| `studio.port` | 55323 |
| Local mail/SMTP UI port | 55324, using the generated CLI section name |
| `analytics.port`, if enabled | 55327 |
| `db.seed.enabled` | `false` |
| Auth redirects/site URL | Isolated browser origin only, when browser testing is approved |

Leave application migrations/seed files out of scratch until the stack identity has been observed and migration approval recorded. Confirm the generated migrations directory contains no `.sql` files. Keep secrets in approved process/private configuration only.

Check intended ports and the Docker context before starting any stack:

```powershell
Get-NetTCPConnection -LocalPort 55320,55321,55322,55323,55324,55327 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State
docker context show
$gateADockerEndpoint = docker context inspect --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $gateADockerEndpoint -notmatch '^npipe:') {
  throw 'Expected a reviewed local Windows named-pipe Docker context; do not use an unclassified remote engine.'
}
docker version --format '{{.Client.Version}} / {{.Server.Version}}'
```

If Docker Desktop needs starting, do so only under the approved environment setup scope. Do not assume an installed CLI means a running engine. Do not print a full `docker inspect` result: container environment fields can contain credentials.

## 3. Start the approved empty stack, then identify it

Only after **initial stack creation approval**, start this scratch project. Startup downloads images and initializes database/platform state. Capture CLI output privately because startup/status can print credentials; do not send raw output into chat, reports, or shared transcripts. [Supabase's startup documentation](https://supabase.com/docs/reference/cli/supabase-start) describes stack startup and health checks.

```powershell
$gateAStartOutput = & $gateACli start --workdir $gateAStack 2>&1
$gateAStartExit = $LASTEXITCODE
if ($gateAStartExit -ne 0) { throw 'Local startup failed; inspect captured output privately and report only sanitized diagnostics.' }
docker ps --filter "name=supabase_db_$gateAStackId" --format '{{.ID}} {{.Names}} {{.Ports}}'
$gateADbContainer = "supabase_db_$gateAStackId"
docker inspect --format '{{.Id}} {{.Config.Image}} {{.Image}}' $gateADbContainer
if ($LASTEXITCODE -ne 0) { throw 'Expected database container missing; stop and identify the actual stack before proceeding.' }
```

Container names are an expected convention, not an authorization fallback. If the installed CLI uses another name, inspect the exact newly started project, record the observed name/ID and ports, and update the target approval; never select the first running PostgreSQL container.

After permission for the read-only identity check, use the container's existing `psql` client; no host PostgreSQL server/client installation is necessary for this path. [Docker exec](https://docs.docker.com/reference/cli/docker/container/exec/) runs the specified command in the selected container, while formatted [Docker inspect](https://docs.docker.com/reference/cli/docker/inspect/) limits returned metadata.

```powershell
docker exec $gateADbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "begin read only; select current_database(),current_user,current_setting('server_version'),inet_server_addr(),inet_server_port(),pg_is_in_recovery(); select system_identifier::text from pg_control_system(); commit;"
if ($LASTEXITCODE -ne 0) { throw 'Identity check failed; do not apply migrations.' }
```

Record the stack/workdir, project ID, Docker context, container ID/image digest, loopback port mapping, server version/system identifier, migration history, empty application baseline, test-only purpose/owner, and approval reference. A database name of `postgres` alone does not identify the target. Do not substitute hosted credentials for failed local startup.

## 4. Approve and apply the ordered application migrations

The checked-in migrations require the Supabase platform, including `auth.users`, Auth helpers/roles, `storage` tables, `extensions` schema and vector extension. A plain PostgreSQL server is not equivalent. The schema was originally written to accommodate prototype deployments; clean replay and representative restored-schema replay are separate acceptance cases.

The reviewed order is:

1. `202607280001_research_compliance.sql`
2. `202609110001_document_requests_and_schedules.sql`
3. `202609120001_legacy_contract_bridges.sql`
4. `202609120002_ticket_priority_compatibility.sql`
5. `202609130001_student_number_registration.sql`
6. `202609130002_system_analytics.sql`
7. `202609130003_tier1_knowledge_base.sql`
8. `202609130004_tier1_answer_rpc.sql`
9. `202611090001_phase1_security_hardening.sql`

After **target-specific migration/fixture approval**, copy those source files unchanged into the approved scratch migrations directory. Preserve names and hashes. Use the root Gate A source manifest as evidence; do not create a competing source baseline.

```powershell
$gateAMigrationSource = Join-Path $gateARepo 'Backend\supabase\migrations'
$gateAMigrationDestination = Join-Path $gateAStack 'supabase\migrations'
if (-not (Test-Path -LiteralPath $gateAMigrationDestination)) {
  New-Item -ItemType Directory -Path $gateAMigrationDestination | Out-Null
}
Get-ChildItem -LiteralPath $gateAMigrationSource -File -Filter '*.sql' |
  Sort-Object Name |
  ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $gateAMigrationDestination }
& $gateACli migration list --local --workdir $gateAStack
& $gateACli migration up --local --workdir $gateAStack
if ($LASTEXITCODE -ne 0) { throw 'Migration replay failed; preserve failure evidence and stop.' }
& $gateACli migration list --local --workdir $gateAStack
```

The command's explicit `--local` scope follows the [CLI migration reference](https://supabase.com/docs/reference/cli/supabase-migration-up). Do not use `--linked`, `db push`, `db reset`, migration repair, schema resets, or production connections in this procedure. Do not overwrite previously applied migrations, disable RLS, grant broad table rights, or automatically approve real accounts to make validation pass.

`Backend/supabase/seed.sql` inserts only an inactive demo program and a settings marker; it does not establish verified test accounts. Leave automatic seed execution disabled for this gate. Older migrations include application-help articles and compatibility data writes; approval must cover the complete ordered replay, not just the final file.

Baseline client table/sequence privileges are also a prerequisite: old migrations rely on platform defaults and do not explicitly grant all normal application DML. A fresh runtime can differ from an existing project. If a positive path fails from missing baseline grants, classify and report that exact failure. Do not add blanket grants as an unreviewed workaround.

## 5. Run the prepared audit and rollback-only SQL suite

Execute the prepared aggregate/catalog audit after read-only permission. Then, only under the exact target-specific fixture approval, run the suite in **one** `psql` session. Copying files into the approved disposable container avoids Windows shell encoding changes. [PostgreSQL psql documentation](https://www.postgresql.org/docs/current/app-psql.html) defines `-X`, ordered `-c`/`-f` execution, and `ON_ERROR_STOP`; the test file owns its transaction, so do not wrap it in another `--single-transaction`.

```powershell
$gateAAudit = Join-Path $gateARepo 'Backend\supabase\audits\phase1_read_only_audit.sql'
$gateAInventory = Join-Path $gateARepo 'Backend\supabase\audits\gate_a_security_inventory.sql'
$gateATests = Join-Path $gateARepo 'Backend\supabase\tests\phase1_security.sql'
docker cp $gateAAudit "${gateADbContainer}:/tmp/phase1_read_only_audit.sql"
if ($LASTEXITCODE -ne 0) { throw 'Audit file copy failed.' }
docker exec $gateADbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/phase1_read_only_audit.sql
if ($LASTEXITCODE -ne 0) { throw 'Read-only audit failed.' }
docker cp $gateAInventory "${gateADbContainer}:/tmp/gate_a_security_inventory.sql"
if ($LASTEXITCODE -ne 0) { throw 'Security inventory file copy failed.' }
docker exec $gateADbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/gate_a_security_inventory.sql
if ($LASTEXITCODE -ne 0) { throw 'Read-only security inventory failed.' }

docker cp $gateATests "${gateADbContainer}:/tmp/phase1_security.sql"
if ($LASTEXITCODE -ne 0) { throw 'SQL test file copy failed.' }
docker exec $gateADbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "set cas_assist.isolated_test = 'true'" -f /tmp/phase1_security.sql
if ($LASTEXITCODE -ne 0) { throw 'Security SQL suite failed; preserve the first failure and do not mark Gate A passed.' }
```

The Gate A inventory adds ownership, FORCE RLS, default ACL and storage-bucket metadata to the earlier audit. Neither inventory has been executed against a database. The suite creates synthetic Auth users/programs/tickets, switches authenticated/service roles, tests privileges and policies, then rolls back. These synthetic users are not official CAS records. Record the exit code, notices/assertions, final rollback, before/after aggregate counts, and separate positive/negative outcomes. A successful SQL role simulation does not prove Supabase Auth issuance, PostgREST execution, browser navigation, or backend service-token integration.

If an already approved PostgreSQL 17 `psql.exe` exists on Windows, the equivalent single-session local test is:

```powershell
$gateAPsql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
& $gateAPsql -h 127.0.0.1 -p 55322 -U postgres -d postgres -W -X -v ON_ERROR_STOP=1 -c "set cas_assist.isolated_test = 'true'" -f $gateATests
if ($LASTEXITCODE -ne 0) { throw 'Security SQL suite failed.' }
```

`-W` prompts privately for the approved local database password. Never place passwords or full connection URLs in commands, screenshots, reports, or PowerShell history.

## 6. Integration and browser prerequisites

**Local HTTPS blocker:** `Frontend/src/lib/config.ts:4` and `Backend/src/config.ts:7` both require an HTTPS Supabase origin. The default local Supabase API uses HTTP, so setting either application to `http://127.0.0.1:55321` does not produce a working acceptance environment. SQL tests through local PostgreSQL/container `psql` can proceed independently once approved. Actual frontend **and backend** acceptance additionally require a separately approved local TLS configuration with a development certificate trusted by the browser and Node, or an approved disposable hosted Supabase HTTPS target. The generated scratch `[api.tls]` settings and certificate paths must be reviewed for the pinned CLI before enabling them; certificate creation/trust-store changes are environment configuration requiring approval. Do not weaken HTTPS guards, set `NODE_TLS_REJECT_UNAUTHORIZED=0`, or change production environment files.

SQL fixture rows roll back and are not a browser-login fixture environment. Real API/browser tests require a separately reviewed synthetic account setup with valid Auth identities for pending, rejected, verified student, verified faculty, verified staff/admin, and archived users; a current active test program/membership; two students/tickets; and unrelated faculty assignments. Authorization must explicitly cover those temporary writes and cleanup on the same identified target.

Do not run existing `npm.cmd run seed-test` or `verify-*` scripts against inherited configuration. `Backend/scripts/seed-test-environment.mjs` loads `.env`, creates/resets Auth passwords, changes verification/roles, writes operational fixtures, and persists account credentials. Other verification scripts also assume remote configuration and can mutate data. Their presence is not a safe isolated test harness. Root's Gate A reports identify which checks remain unexecuted.

For later approved integration, supply only isolated settings through private process configuration, disable external AI/push providers, keep backend service credentials server-side, and run both app roots with existing npm commands. Preserve repository `.env`, hosting configuration, and dependency files. Sanitized evidence should identify target aliases/fingerprints and request status codes, never tokens or private response bodies.

## 7. Hosted disposable alternative and completion boundary

An owner-provided separate disposable Supabase project is an alternative when local virtualization is unavailable. Before connecting, record its owner, purpose, authorized project identity via a private channel, data classification, backup/disposal plan, schema version and migration history. A hosted URL cannot establish staging/nonproduction status. Obtain separate read-only fingerprint/audit permission, then exact target-specific mutation approval; never reuse the currently configured hosted endpoint by assumption. No hosted mutation command is prescribed while the target is unidentified.

Retain the approved isolated stack and evidence until review is complete. Stopping/removing containers, deleting volumes, and disposing of a hosted project need their own authorized scope; no destructive cleanup command is included. Database/API/browser acceptance remains **BLOCKED** until an isolated target and HTTPS prerequisites are available, approved mutations execute, and required evidence is recorded. The overall Gate A result remains as documented in the root reports, including queue regression failures; tool installation or passing existing mocked unit tests alone does not satisfy that gate.
