# Gate A — Regression Test Results

**Date:** 2026-11-09, Asia/Manila. **Branch:** `octup/safe-enhancements`. **HEAD:** `3270d8dce2e948b80244c365f309463dc546edde`. **Source baseline:** uncommitted Phase 1 working tree, recorded as 92 file hashes in `GATE_A_BASELINE.json`. Existing application/configuration/migration files remain unchanged.

**Overall status: B. VALIDATION FAILED.** The existing suite passes, but new local probes reproduce two existing defects. Database security tests are independently **BLOCKED**; browser/native acceptance is **NOT RUN**. No new Phase 1 regression was proven. No application correction or production operation was performed.

## Tooling and execution boundaries

| Tool | Installed version / scope |
|---|---|
| Node / npm | v24.21.0 / 11.19.0 (`npm.cmd`, avoiding the PowerShell npm.ps1 restriction) |
| Backend TypeScript / Vitest | 6.0.3 / 4.1.11 |
| Backend Express / Zod / Supabase JS | 5.2.1 / 4.4.3 / 2.110.9 |
| Frontend TypeScript / ESLint | 6.0.3 / 9.39.5 |
| Expo / Expo Router | 57.0.22 / 57.0.21 |
| React / React Native / frontend Supabase JS | 19.2.3 / 0.86.3 / 2.106.2 |
| Backend lint | No configured script/config; NOT RUN |
| Frontend test runner | No configured automated UI test suite; NOT RUN |
| Expo Doctor | Not installed; NOT RUN; no download/installation attempted |

Versions came from installed package metadata, not package ranges. TypeScript's backend configuration checks `src` only (`Backend/tsconfig.json:15`); Vitest executes tests through its transform, not a separate test-source typecheck. The frontend uses strict TypeScript and Expo's flat ESLint config, with `dist`/`.expo` ignored and `react-hooks/set-state-in-effect` disabled (`Frontend/eslint.config.js:12`). No quality score was invented.

## Fresh command ledger

All entries below refer to execution during Gate A, not copied Phase 1 successes. Exploratory `Get-Content`/`rg` reads supplied source evidence without executing application/database code.

| Working directory | Command/check | Status | Actual result |
|---|---|---|---|
| Repository | `git status --short`; `git branch --show-current`; `git log -1 --format='%H %s'` | PASS | Original branch/HEAD and pre-existing dirty work recorded. |
| Repository | Node source/config hash capture via stdin | PASS | Created `docs/reviewer/GATE_A_BASELINE.json`, 92 SHA-256 entries, excluding `.env`, dependencies and generated outputs. |
| Backend | `npm.cmd test` | PASS | 3 test files, 50 cases passed; 43 authorization + 7 math/retrieval; 0 existing-suite failures. |
| Backend | `npm.cmd run typecheck` | PASS | Existing `tsc --noEmit` command exit 0. |
| Backend | `npm.cmd run build` | PASS | Existing TypeScript build exit 0; ignored `Backend/dist` output only. |
| Frontend | `npm.cmd run typecheck` | PASS | Exit 0. Process-local `CI=1`, `EXPO_OFFLINE=1`, `EXPO_NO_DOTENV=1`. |
| Frontend | `npm.cmd run lint` | PASS | Exit 0 with existing config; same process-local flags. |
| Frontend | `.\node_modules\.bin\expo.cmd install --check` | PASS | Exit 0, dependencies up to date; explicitly warned dependency validation is unreliable offline. No packages were installed/updated. |
| Frontend | `npm.cmd run build:web -- --clear --output-dir .expo/gate-a-web` | PASS | Clean compile/export: 1,413 modules, 21 assets, 48,954 ms bundle time. Synthetic public settings only; previous `Frontend/dist` preserved. |
| Backend | Local `node --input-type=module -e` fractional-duration diagnostic | FAIL | Diagnostic process exited 0 but reported `modeWithinBounds=false`; later scripted probe gives a failing exit status. Not counted as an independent additional defect. |
| Backend | `node scripts/validate-gate-a-queue-invariants.mjs` | FAIL | Exit 1: 0 passed / 2 failed synthetic fractional samples. |
| Backend | `node scripts/validate-gate-a-http-contracts.mjs` | FAIL | Exit 1: canonical `/api/health` PASS 200, frontend `/health` FAIL 404 against actual built Express app over localhost. |
| Repository | `node Backend/scripts/verify-gate-a-baseline.mjs` | PASS | 92 existing captured files checked, 0 changes. |
| Repository | `node --check` on each of the three new `.mjs` validation scripts | PASS | All parsed with exit 0; does not imply the diagnostic assertions passed. |
| Repository | Node `fs` inspection of generated JavaScript, boolean output only | PASS | Confirmed Gate A synthetic URL and public key are present in the isolated export; no actual configuration values exposed. |
| Repository | In-memory PowerShell AST parsing of Windows guide snippets | PASS | 9 fenced blocks, 0 parse errors, 0 blocks executed. |
| Repository | `git diff --check`; backend scoped diff check | PASS | No whitespace errors; Windows CRLF normalization notices are not failures. |
| Environment discovery | `Get-Command`/known-path/service checks and boolean-only config classification | PASS | No ready database tooling/approved isolated target identified; no credentials/URLs printed. |
| Repository | `.NET IPGlobalProperties.GetActiveTcpListeners()` filtered to known/proposed Supabase ports | PASS | 0 listeners on the 12 checked ports; no network connection or DB query. |
| Database | Migration replay, SQL suite, effective grants, direct anonymous/authenticated RPC requests | BLOCKED | No identified approved isolated Supabase target/tooling. |
| Database | Phase 1 and supplemental read-only audit SQL | NOT RUN | Prepared only; no remote metadata queried. |
| Browser/native | Real signup/login, role workflows, responsiveness/accessibility | NOT RUN | No authorized isolated test identities/HTTPS application environment or UI harness. |
| Backend | Existing remote `verify-*` and `seed-test` scripts | NOT RUN | They can use inherited hosted configuration and mutate records/Auth; never used as fallback. |

No tool was installed and no repository/environment/hosting configuration was changed. Test flags and synthetic credentials were confined to their validation processes.

## Existing authorization and regression matrix

`Backend/test/authorization.test.ts:49` mounts actual routers in a test-only localhost Express app, with Supabase Auth, table builders, RPC results, and configuration mocked. Its fake builder (`:29`) does not evaluate query filters. It excludes production app middleware (CORS, Helmet, logging, timeouts, rate limits, health routing and not-found handling).

| Workflow/check | Result and evidence limit |
|---|---|
| Verified student authentication | PASS for mocked token/profile middleware; real Supabase login/JWT issuance BLOCKED. |
| Pending/rejected restrictions and limited authentication | PASS mocked: operational denial and test-only authenticated session endpoint. Actual onboarding/browser gate BLOCKED. |
| Authorized CAS membership | PASS for constructing trusted dated/current membership/active-program filters and denying mocked missing/error results. Actual joins, date boundaries and program state evaluation BLOCKED. |
| Archived history and mutations | PASS mocked mutation/operational denial for all four roles. Actual historical row access and database mutation denial BLOCKED. |
| Staff transitions/audit | Source/callers reviewed; real transition graph, immutable content and audit actor/atomicity BLOCKED. No claim that staff processed real tickets. |
| Faculty own/unrelated classes | Source reviewed; existing SQL fixture suite prepared; database INSERT/UPDATE authorization BLOCKED. |
| Student queue estimate | PASS mocked authenticated ID binding, spoofed ID ignored, role denial, response passthrough. Real queue RPC/privacy/formula contract BLOCKED. |
| Staff/admin analytics | PASS mocked 200 and student/faculty 403, arguments/defaults validated. Real analytics contents/grants BLOCKED; UI health path FAIL locally. |
| AI permissions | PASS mocked pending/archive denial, trusted query logging/feedback/escalation ID. Real foreign-query escalation denial, ownership, database fallback and approved-source deployment BLOCKED. Existing audience behavior retained. |
| Cross-user denial | PASS for backend identity construction/filters; actual cross-student ticket/attachment/query rows BLOCKED. |
| API responses/failures | PASS mocked status/payload passthrough, validation 400 and safe generic 500. Queue tests use arbitrary mocked fields (`authorization.test.ts:210`), not a real SQL JSON schema assertion. |
| Notification request | PASS mocked staff/admin authorization and existing 202 scaffold. Actual delivery NOT RUN/unfinished scaffold, not established by 202. |
| Queue math/retrieval | Existing seven unit cases PASS. New fractional triangular invariant cases FAIL below. |

This matrix addresses FR-01/FR-02 identity/RBAC, FR-03 archival, FR-08/FR-09 ticket workflow/audit, FR-13 faculty isolation, FR-17 queue calculations, and FR-18 analytics. Tests do not replace CAS verification-source approval or actual database ownership policies.

## Confirmed defect GA-D1 — Triangular bounds

`Backend/src/services/queue-math.ts:20` rounds the mode to integer minutes while `:29`/`:30` retain fractional bounds. The unchanged helper is not used by current queue routes, which call SQL. The existing SQL estimator also rounds the mode (`Backend/supabase/migrations/202607280001_research_compliance.sql:624`) while retaining fractional bounds; this is a related source risk, not an executed SQL result.

| Sample (minutes) | Minimum | Maximum | Returned mode | Returned mean | Failed invariant |
|---|---:|---:|---:|---:|---|
| `[0.1, 0.1, 0.2]` | 0.1 | 0.2 | 0 | 0.10000000000000002 | Mode outside bounds. |
| `[5.2, 5.2, 5.3]` | 5.2 | 5.3 | 5 | 5.166666666666667 | Mode and mean below minimum. |

Both fail the model's required minimum ≤ mode ≤ maximum ordering (`RULES.md:92`, FR-17). Reproduce after building Backend:

```powershell
Set-Location 'D:\Dave Files\Capstone 2\CAS-ASSIST1\Backend'
npm.cmd run build
node scripts/validate-gate-a-queue-invariants.mjs
```

Expected current exit: **1**. No source correction was authorized or made. A focused follow-up must choose a consistent valid treatment of fractional bounds/mode, preserve intended research formulas, test edge cases, and validate the corresponding SQL after target approval.

## Confirmed defect GA-D2 — Analytics health route

`Frontend/src/components/analytics/system-analytics-screen.tsx:94` requests `${API_BASE}/health`. The same origin is used with explicit `/api/...` paths for queue requests; `Backend/src/app.ts:46` mounts health at `/api/health`. The new diagnostic reads the actual frontend health suffix, loads the actual built Express app with synthetic configuration, binds only localhost, and performs two public HTTP requests. It calls no authenticated route or database. Production middleware/logger runs for these requests, but broader middleware behavior is not exhaustively tested.

| Request | Expected | Observed | Status |
|---|---|---|---|
| `/api/health` | Healthy JSON / 200 | Healthy JSON / 200 | PASS |
| Frontend-requested `/health` | Healthy JSON / 200 | Not found / 404 | FAIL |

Reproduce after building Backend:

```powershell
node scripts/validate-gate-a-http-contracts.mjs
```

Expected current exit: **1**. The configured-origin contract can make the analytics service indicator report unavailable despite a healthy API. An external reverse proxy might add another path, but no such contract was established. This existing mismatch was mentioned in prior reviewer materials and is now locally reproduced; it was not caused or corrected by Gate A.

## Reproducible frontend compile and final scope checks

The executed export used these process-local values and a separate ignored output directory:

```powershell
Set-Location 'D:\Dave Files\Capstone 2\CAS-ASSIST1\Frontend'
$env:CI='1'
$env:EXPO_OFFLINE='1'
$env:EXPO_NO_DOTENV='1'
$env:EXPO_PUBLIC_SUPABASE_URL='https://gate-a-validation.invalid'
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY='gate-a-synthetic-public-key'
$env:EXPO_PUBLIC_API_URL='disabled'
npm.cmd run build:web -- --clear --output-dir .expo/gate-a-web
```

The generated output is for compilation evidence only; it cannot log in and must not be deployed. Nonfatal cache-rebuild and NO_COLOR/FORCE_COLOR warnings occurred. The previous release/build output was preserved.

New files affecting validation: `Backend/scripts/verify-gate-a-baseline.mjs`, `Backend/scripts/validate-gate-a-queue-invariants.mjs`, `Backend/scripts/validate-gate-a-http-contracts.mjs`, `Backend/supabase/audits/gate_a_security_inventory.sql`, the baseline manifest, setup guide, and four reports. No dependency, application, migration, or existing test file was edited. Security/compatibility risks and the exact blockers/owners/acceptance criteria are in `GATE_A_SECURITY_VALIDATION.md` and `GATE_A_REMAINING_BLOCKERS.md`.

Final accounting: **50/50 existing tests PASS; 0/2 queue diagnostic cases PASS; 1/2 HTTP diagnostic cases PASS.** The diagnostic totals are separate from the existing unit-suite count: **2 confirmed defects, 3 failing diagnostic cases**. Full SQL/Auth/PostgREST/browser integration remains incomplete. Resolve the documented defects under approved scope, prepare the isolated environment, extend missing integration cases, and rerun Gate A before a staging-readiness decision.
