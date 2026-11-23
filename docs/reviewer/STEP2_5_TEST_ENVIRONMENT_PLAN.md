# Step 2.5 — Isolated Supabase Test Environment Plan

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Status: preparation completed; database execution BLOCKED.** This report and the two companion Step 2.5 reports are the only changes authorized/performed in this step. All commands in setup/execution examples below are **PROPOSED / NOT RUN**. No tools were installed, services started, migrations applied, test fixtures created, accounts changed, or bootstrap executed.

Read together with `STEP2_5_DATABASE_VALIDATION_CHECKLIST.md` and `STEP2_5_BOOTSTRAP_READINESS.md`. Required project documents, Step 2 reports and relevant Phase 1/Gate A reports were reviewed. The historical `GATE_A_WINDOWS_ISOLATED_SETUP.md` remains useful background but lists only nine migrations; this plan accounts for the current ten. Do not edit historical migrations/reports or use its wildcard-copy example without the new manifest.

## Verified environment

Read-only checks examined command discovery, standard tool/metadata paths, accessible Windows uninstall registrations, matching services, selected TCP listeners, selected environment-variable presence, repository configuration and sanitized classification of application environment files. No configured endpoint was contacted, and no credential, project reference, token or database connection string was printed.

| Item | Observed result | Limit / consequence |
|---|---|---|
| Windows shell | PowerShell `5.1.26100.9818`, AMD64. | Examples use Windows PowerShell-compatible syntax and `npm.cmd`. |
| Node / npm | Node `v24.21.0`, npm `11.19.0`. | Existing tools; no upgrade needed for preparation. |
| Docker-compatible runtime | `docker`, `podman`, `nerdctl`, `rdctl`, `rancher-desktop` not on PATH; Docker Desktop/Podman/Rancher not found at checked standard locations; no matching service/uninstall entry returned. | No usable runtime identified. This is not an exhaustive search of every drive, WSL image or custom installation. |
| Supabase CLI | Not on PATH, npm shim, checked Scoop/WinGet path or either application's local dependency bin. | Installation requires approval. |
| PostgreSQL tools | `psql`, `postgres`, `initdb`, `pg_ctl`, `pg_isready` absent from PATH; no standard Program Files PostgreSQL installation/matching service found. | No host client/server identified. Prefer the future Supabase database container's bundled psql rather than a separate host server. |
| WSL | `wsl.exe` exists; no current-user Lxss distribution registry key found. | No WSL distribution, kernel, virtualization or engine readiness established. Windows feature/BIOS changes were not attempted. |
| Existing isolated target | Neither `CAS_ASSIST_TEST_DATABASE_URL` nor `CAS_ASSIST_TEST_SUPABASE_URL` is present in the process or either application environment file; `Backend/supabase/.temp` absent. Filename discovery found no separate test environment file. | No identified/approved isolated test target. |
| Docker/workdir override | `DOCKER_HOST` and `SUPABASE_WORKDIR` absent; checked Docker user/data directories absent. | No explicit alternate engine/workdir identified. |
| Selected ports | No listeners returned on 54320/21/22/23/24/27 or proposed 55320/21/22/23/24/27. | Recheck immediately before startup; current absence is not a reservation. |
| Application Supabase resources | Both existing environment files classify as hosted Supabase origins; backend privileged key and frontend public key are present. Values withheld. | Purpose is **UNVERIFIED**; do not treat either as disposable or connect as a fallback. |
| Source migration/test inventory | Ten migrations; `phase1_security.sql` and `admin_authority.sql` present. | Prepared source, not applied schema/test evidence. |

Readiness gaps include Docker/WSL host prerequisites, chosen installer/version, available RAM/disk, approved scratch path/ports, local engine identity, CLI compatibility and target approval. Host hardware/virtualization was not certified. No existing isolated database was connected to or approved.

## Recommended approach and permissions

Use a **new disposable local Supabase stack**, in a fresh scratch directory separate from `Backend`, `Frontend` and their environment files. Prefer Docker Desktop with Linux containers on Windows; do not add a standalone PostgreSQL server as a substitute for Supabase Auth/storage/platform roles. Supabase also documents Docker-compatible alternatives, but no such runtime was found. Its experimental native runtime is documented for Linux/macOS, so it is not the proposed Windows path. [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started).

Proposed CLI pin: **3.1.0**, shown as the official stable release during this review. It is a candidate requiring approval and installed-help verification, not an installed/tested tool here. [Supabase CLI v3.1.0 release](https://github.com/supabase/cli/releases/tag/v3.1.0).

| Gate | Approval/evidence needed | Permitted work after that approval |
|---|---|---|
| A — tools and scratch files | Installer source/signature/version, pinned CLI, scratch location, required network downloads and any system/WSL changes. | Install approved tools and generate/review scratch files only. No stack start or application DB writes. |
| B — empty platform stack | Named local engine/context, scratch ID/config hash, loopback-only network/ports, empty application migration directory, seed disabled. | Create/start that empty stack; startup initializes platform database state and downloads images. |
| C — read-only target identity | Owner permits connection to the exact observed local container/database. | Fingerprint database/platform/ACL/history and inspect aggregates without application mutations. |
| D — ordered migrations and rollback fixtures | Exact target fingerprint, ten approved hashes, synthetic fixture scope, temporary role/grant changes, evidence/rollback ownership. | Apply only unapplied migrations and execute the two rollback-only suites. |
| E — additional integration/concurrency | Explicit test plan, fixture UUIDs, any committed synthetic setup/authority rows and precise cleanup, Auth/TLS test scope. | Run approved supplemental/live/multi-session tests only. |
| F — initial Admin1 designation | Separate institutional authorization, exact existing eligible Auth UUID, accepted database evidence, trusted owner/operator and target. | Controlled bootstrap only after explicit approval. Not implied by any test approval. |

Current authorization is **report preparation only**, not any gate above. No database reset, production linkage or production operation is included. Approval of tools alone is not approval of startup/migrations/fixtures/bootstrap.

## Proposed PowerShell setup — do not execute yet

### A. Tool installation and fresh scratch workspace

Check the official Docker Windows requirements and obtain the correct reviewed installer. Per-user installation is available; WSL/Windows feature changes may still require separate privileges/approval. The following command uses the reviewed local installer path, not an automatically downloaded executable. [Docker Desktop Windows installation](https://docs.docker.com/desktop/setup/install/windows-install/).

```powershell
# NOT RUN. Gate A approval required; replace only with a reviewed installer path.
$step25DockerInstaller = '<reviewed absolute Docker Desktop Installer.exe path>'
Get-AuthenticodeSignature -LiteralPath $step25DockerInstaller |
  Select-Object Status,StatusMessage
Get-FileHash -Algorithm SHA256 -LiteralPath $step25DockerInstaller
# Proceed only after the operator accepts the signature/hash and installation scope.
Start-Process -FilePath $step25DockerInstaller -Wait -WindowStyle Hidden -ArgumentList 'install','--user'
```

Use a dedicated tooling directory; do not change application package manifests/locks. No unpinned `npx` download or global npm installation is proposed. The install is pinned, but runtime/config compatibility still needs acceptance.

```powershell
# NOT RUN. Gate A only: installs files, but does not start a database.
$step25Repo = 'D:\Dave Files\Capstone 2\CAS-ASSIST1'
$step25Scratch = Join-Path $env:TEMP 'cas-assist-step25-20261113'
$step25Tools = Join-Path $step25Scratch 'tools'
$step25Stack = Join-Path $step25Scratch 'stack'
$step25ProjectId = 'casassist-step25-20261113'
$step25Network = 'casassist-step25-20261113-loopback'
$step25CliVersion = '3.1.0'

if (Test-Path -LiteralPath $step25Scratch) { throw 'Select and approve a new empty scratch path; do not overwrite or delete it.' }
New-Item -ItemType Directory -Path $step25Tools,$step25Stack | Out-Null
npm.cmd install --prefix $step25Tools --save-dev --save-exact --no-audit --no-fund "supabase@$step25CliVersion"
if ($LASTEXITCODE -ne 0) { throw 'Pinned CLI installation failed.' }
$step25Cli = Join-Path $step25Tools 'node_modules\.bin\supabase.cmd'
$step25ObservedVersion = [string](& $step25Cli --version)
if ($LASTEXITCODE -ne 0 -or $step25ObservedVersion.Trim() -ne $step25CliVersion) { throw 'CLI version differs from the approved pin.' }
& $step25Cli init --workdir $step25Stack
if ($LASTEXITCODE -ne 0) { throw 'Scratch initialization failed.' }
& $step25Cli start --help
& $step25Cli migration list --help
& $step25Cli migration up --help
```

No scratch directory was created now. Do not copy `.env`, `roles.sql`, functions, seeds, link metadata or application migrations into it during this stage. Use the generated config schema for the approved CLI; do not copy the repository TOML blindly or use `init --force`. Current v3 documentation defaults migration list/up to local and uses `--remote` for remote targets; old `--local` flags are deprecated. The proposed commands below use the pinned v3 local default, an explicit fresh `--workdir`, no remote configuration/link and no `--remote`. If installed help differs, stop for review rather than substituting a hosted target. [Supabase CLI migration reference](https://supabase.com/docs/reference/cli/supabase-migration-up).

### B. Review scratch configuration, then approve empty startup

Only edit the generated **scratch** configuration, after approval. Do not append duplicate TOML sections. Required proposed values:

| Generated setting | Scratch value / acceptance |
|---|---|
| `project_id` | `casassist-step25-20261113`; no hosted remote sections or linked project ref. |
| `api.port`, `db.port`, `db.shadow_port` | 55321, 55322, 55320. |
| `db.major_version` | 17, matching `Backend/supabase/config.toml:42`; record actual image version/digest. |
| `studio.port`, `local_smtp.port`, `analytics.port` if enabled | 55323, 55324, 55327. Review every other exposed/pooler/inspector port too; leave unused host ports disabled. |
| `db.migrations.enabled` | `false` for first empty startup; change only in scratch to `true` under Gate D before approved explicit replay. |
| `db.seed.enabled` | `false`; do not copy app seed. |
| Exposed schemas | Existing public/graphql scopes as required; **never expose `cas_admin`**. |
| Auth/email | Synthetic local testing only; local mail capture, no real SMTP/provider keys or production redirect URLs. No account request is made now. |

The repository currently enables both migrations and seeds (`Backend/supabase/config.toml:59–71`). Its `seed.sql` writes demo configuration, and older migrations also perform data conversions/upserts. Disabling seeds does not make migration replay read-only. The generated seed setting controls startup/reset seeding. [Supabase CLI configuration](https://supabase.com/docs/guides/local-development/cli/config).

After Gate B approval, verify the engine is a reviewed local Windows named-pipe context and create a dedicated loopback-binding bridge network. Supabase documents this network option for limiting local exposure. [Supabase local networking](https://supabase.com/docs/guides/local-development).

```powershell
# NOT RUN. Gate B required; all variables come from the reviewed setup above.
if (-not [string]::IsNullOrWhiteSpace($env:DOCKER_HOST)) { throw 'Classify the Docker override before proceeding.' }
if (-not [string]::IsNullOrWhiteSpace($env:SUPABASE_WORKDIR)) { throw 'Classify the workdir override before proceeding.' }
$step25DockerEndpoint = [string](docker context inspect --format '{{.Endpoints.docker.Host}}')
if ($LASTEXITCODE -ne 0 -or $step25DockerEndpoint -notmatch '^npipe:') { throw 'No approved local Windows Docker endpoint.' }
docker version --format '{{.Client.Version}} / {{.Server.Version}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker engine not ready.' }
$step25Listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 55320,55321,55322,55323,55324,55327 })
if ($step25Listeners.Count -ne 0) { throw 'Proposed ports are occupied; choose and approve alternatives.' }
$step25AppSql = @(Get-ChildItem -LiteralPath (Join-Path $step25Stack 'supabase\migrations') -Filter '*.sql' -File -ErrorAction SilentlyContinue)
if ($step25AppSql.Count -ne 0) { throw 'First startup requires no application migrations.' }
# Operator first confirms seed=false, migrations=false and records the config SHA-256.
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $step25Stack 'supabase\config.toml')
docker network create --driver bridge -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' $step25Network
if ($LASTEXITCODE -ne 0) { throw 'Network creation failed; do not reuse an unidentified network.' }
$step25StartOutput = & $step25Cli start --workdir $step25Stack --network-id $step25Network 2>&1
$step25StartExit = $LASTEXITCODE
if ($step25StartExit -ne 0) { throw 'Stack startup failed; inspect captured output privately.' }
```

Startup/status can print local credentials. Keep captured output private; do not print it into chat/reports/transcripts. Do not use `--ignore-health-check`. A new empty stack still creates platform state and needs approval. The network default is not proof of actual bindings: inspect them and stop if any service is publicly bound; do not proceed with data while diagnosing exposure. No installation, network creation or startup command above was run.

### C. Identify the actual container/database before migration approval

Expected names are conventions only. The operator must match observed project labels/workdir/ports; never select the first database container or assume a database named `postgres` is isolated. Do not print an unfiltered Docker inspect (it includes environment secrets).

```powershell
# NOT RUN. Gate C required for the read-only SQL connection.
$step25DbContainer = 'supabase_db_casassist-step25-20261113'
docker ps --filter "name=$step25DbContainer" --format '{{.ID}} {{.Names}} {{.Ports}}'
docker inspect --format '{{.Id}} {{.Name}} {{.Config.Image}} {{.Image}}' $step25DbContainer
if ($LASTEXITCODE -ne 0) { throw 'Expected new database container not found.' }
docker inspect --format '{{json .NetworkSettings.Ports}}' $step25DbContainer
docker exec $step25DbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "begin read only; select current_database(),current_user,current_setting('server_version'),inet_server_addr(),inet_server_port(),pg_is_in_recovery(); select system_identifier::text from pg_control_system(); commit;"
if ($LASTEXITCODE -ne 0) { throw 'Fingerprint query failed; stop before migrations.' }
```

Record approved Docker context, new scratch/config hash, project ID, full observed container ID/image digest, actual loopback host bindings, server/system identifier, platform baseline, migration history and intended synthetic-data purpose. The container's internal address need not be loopback; **host published bindings** must be loopback. If permission to read `pg_control_system()` is unavailable, resolve identity evidence with the owner; do not switch databases or elevate silently. The container supplies psql; no host connection string or database password is put in commands. [Docker exec](https://docs.docker.com/reference/cli/docker/container/exec/).

## Migration, test and bootstrap handoff

The exact ten-file ordering, hashes, safe copy/apply commands, preflight collisions, catalog checks and both rollback suites are in `STEP2_5_DATABASE_VALIDATION_CHECKLIST.md`. Gate D must explicitly approve the **whole** replay, including historical data writes, and synthetic fixtures/grants. Plain PostgreSQL alone cannot supply the Supabase Auth/storage/platform dependencies. Do not run resets, link/login, remote migration push, repair, squash, down, broad grants, or existing `.env`-loading seed/verification scripts as a shortcut.

The existing SQL suites use transactions/role simulation, not real login/JWT sessions. Live Auth/PostgREST and true concurrent-session tests need their own acceptance. Both application config validators require HTTPS Supabase URLs (`Backend/src/config.ts:7`, `Frontend/src/lib/config.ts:4–14`): a default HTTP local stack does not automatically support full application acceptance. Agree local TLS/trust or a separately approved disposable HTTPS target later; do not weaken working validators or use production.

Bootstrap remains **NOT READY / NOT RUN**. The prerequisite evidence and exact approval record are in `STEP2_5_BOOTSTRAP_READINESS.md`; no account or UUID was selected. Do not bootstrap before rollback-suite acceptance because the authority suite requires an empty authority table. No cleanup/deletion command is proposed here. A normal project-scoped stop, if later approved, is `& $step25Cli stop --workdir $step25Stack`; it is not permission for `--all`, `--no-backup`, volume pruning or deletion.

**Current result:** environment discovery/report preparation only. Existing 158-test results are historical Step 2 evidence, not fresh SQL acceptance. All migration/test/bootstrap/setup examples are NOT RUN; all database execution remains BLOCKED pending the relevant explicit approvals. Existing app/UI, configuration, source, tests and uncommitted work remain intact.

Preparation verification: **PASS** for source/reference review, all ten migration hash matches, and static PowerShell parsing of nine proposed command blocks across the three reports. Parsing did not execute any block and does not certify CLI/runtime or SQL behavior. Independent read-only reviews found no actionable report corrections. A SHA-256 comparison found all 176 pre-existing inventoried files unchanged and only the three requested reports added; the inventory excludes Git internals, dependency/build caches and secret-file patterns. No application test/build, database query/test, installation or stack command was run in Step 2.5.
