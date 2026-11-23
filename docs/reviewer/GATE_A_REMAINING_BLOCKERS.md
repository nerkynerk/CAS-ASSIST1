# Gate A — Remaining Blockers

**Date:** 2026-11-09, Asia/Manila. **Branch:** `octup/safe-enhancements`. **HEAD:** `3270d8dce2e948b80244c365f309463dc546edde`. **Scope/baseline:** validation of uncommitted Phase 1 security work; the 92-file manifest and baseline verifier identify/preserve current source and configuration.

**Final status: B. VALIDATION FAILED — confirmed problems require correction.** Two pre-existing defects were reproduced. Database/security acceptance is independently **BLOCKED** by unavailable infrastructure and missing exact-target authorization. The system is neither VALIDATED LOCALLY nor READY FOR STAGING ACCEPTANCE. No production readiness is asserted.

## Blockers, responsible decisions, and acceptance criteria

Roles below identify responsibility, not an assignment or a message sent to anyone.

| ID / priority | Blocker and evidence | Responsible decision | Acceptance criterion |
|---|---|---|---|
| GA-D1 / P2 | **FAIL:** triangular helper returns a mode outside fractional bounds; `[5.2,5.2,5.3]` also yields a mean below the minimum. `Backend/src/services/queue-math.ts:20`, `:29`; new probe has 2 failing cases. SQL has analogous mode-rounding source at `202607280001_research_compliance.sql:624`, unexecuted. | Project owner approves focused correction; engineer/QA preserve the research method and decide consistent bound/mode treatment. | Both existing cases plus justified fractional/invalid/insufficient-data cases pass; minimum ≤ mode ≤ maximum and mean bounds hold; corresponding SQL verified on approved isolated target. No guaranteed-countdown claims. |
| GA-D2 / P2 | **FAIL:** frontend analytics health path `/health` returns 404; actual backend `/api/health` returns 200. `Frontend/src/components/analytics/system-analytics-screen.tsx:94`; `Backend/src/app.ts:46`. | Project owner approves a narrow path-contract correction; engineer/QA verify intended configured origin. | Local health diagnostic returns 200 for the actual frontend request and canonical endpoint; analytics health display verified with healthy/unavailable/disabled API. |
| GA-I1 / P0 gate dependency | **BLOCKED:** no discoverable ready Docker/Supabase/PostgreSQL tooling or approved disposable project. Both configured Supabase origins are hosted with unverified purpose. | Environment owner chooses local scratch stack or identifies a separate disposable hosted target; approves any required installations/configuration. | Supported tools available, exact nonproduction target owner/purpose recorded, platform version/config validated; production never used as fallback. |
| GA-I2 / mandatory authorization | **BLOCKED:** no positive database/container identity or target-specific migration/fixture authorization. | User/target owner confirms exact identified database and explicitly authorizes ordered migrations and synthetic fixture operations. | Record target fingerprint, nonproduction purpose, baseline schema/history/grants, fixture/cleanup scope and approval reference before any write. A generic test flag or hosted hostname is insufficient. |
| GA-I3 / P1 | **BLOCKED:** both applications require HTTPS; default local Supabase API is HTTP. `Backend/src/config.ts:7`; `Frontend/src/lib/config.ts:4`. | Environment owner approves trusted scratch TLS/certificates or disposable hosted HTTPS target. | Browser and Node trust validated without weakening HTTPS/TLS checks or altering production configuration; SQL-only success is not app acceptance. |
| GA-S1 / P1 | **BLOCKED:** migrations omit explicit baseline client table/sequence grants; deployed owners/default ACLs/inheritance are unknown. | Database owner/security reviewer approves a representative baseline and any genuinely required least-privilege correction. | Supplemental inventory identifies owners, BYPASSRLS/FORCE RLS/default ACLs/effective grants; fresh and representative migrated baselines pass intended positive/negative workflows without blanket grants/RLS bypass. |
| GA-S2 / P1 | **UNVERIFIED:** broad ticket INSERT privileges could let eligible students supply staff notes/routing/timestamps. Source policy only constrains own submitted ticket; Phase 1 fixes UPDATE, not INSERT columns. | Security reviewer confirms effective privileges on isolated target; owner approves a narrow correction if exploitable. | Synthetic verified student cannot forge protected workflow/content metadata; legitimate own-ticket creation still succeeds and audit/input timestamps remain trusted. |
| GA-S3 / P1 compatibility | **UNVERIFIED:** PUBLIC storage policies call helpers whose EXECUTE is denied to anon, potentially breaking anonymous access to unrelated buckets despite OR exemption. Phase 1 migration `:46`, `:117`. | Database/storage owner inventories real bucket policies and decides a scoped policy/helper correction if needed. | Anonymous/authenticated tests cover applicable CAS and unrelated buckets through relevant API paths; authorized unrelated access preserved and CAS privacy/lifecycle restrictions maintained. |
| GA-T1 / P0 security gate | **BLOCKED:** actual SQL migration, effective grants, direct RPC denial, ownership, faculty isolation, archived history and audit behavior have not executed. | QA/security engineer runs target-approved tests and records evidence. | All ordered migrations accepted on isolated Supabase; SQL suite passes; real anonymous/JWT/service RPC cases pass; ticket counts/content and immutable audit actors/atomicity verified. |
| GA-T2 / P1 coverage | **NOT RUN / missing cases:** SQL suite lacks positive verified-student ticket INSERT, faculty UPDATE isolation, queue JSON/privacy assertions and unrelated anonymous storage cases. Existing mocked builder only records filters. | QA approves focused additional synthetic integration cases under identified-target scope. | Add meaningful positive/negative assertions, execute them with the existing suite, and distinguish SQL role simulation from actual Auth/PostgREST behavior. |
| GA-T3 / P1 acceptance | **NOT RUN:** real pending/verified/rejected/archived login, approval refresh, deep links, stale-session revocation and responsive role flows. | CAS/QA prepares authorized synthetic identities and accepts behavior; environment owner supplies HTTPS target. | Real tokens/session restoration, profile/RPC permission failures, permitted history, staff/faculty/admin workflows, mobile/desktop accessibility and loading/error states accepted with sanitized evidence. |
| GA-A1 / P1 operational dependency | **UNVERIFIED:** student managed memberships and personnel verification attestations may be incomplete. No independent authoritative staff roster exists in current schema. | Responsible CAS administrator owns affiliation verification; project owner approves maintenance process. | Legitimate test users have approved dated affiliations; pending accounts remain restricted; archive history survives membership expiry; no automatic approvals or invented SIS integration. |
| GA-R1 / P1 release | **BLOCKED for staging handoff:** frontend/migration version coupling and unknown live schema drift. Old status writers use revoked UPDATE; new UI requires new RPCs. | Release/database owner approves coordinated window, version compatibility and rollback ownership. | Representative migration replay and old/new client handoff tested; approved coordinated release/rollback plan retained; no deployment until separately authorized. |

Research mapping: GA-D1 → FR-17 and `RULES.md:92`; GA-D2 → FR-18/supporting reliability; identity/affiliation/archival blockers → FR-01/FR-02/FR-03; ticket/privilege/audit blockers → FR-02/FR-08/FR-09; faculty isolation → FR-13. These are validation/correction dependencies, not authorization for new research features.

## Other quality limitations

- Backend ESLint and frontend automated UI tests are not configured; full Expo Doctor is not installed. These are **NOT RUN**, not silently passed. Tool/dependency additions require approval.
- Offline Expo dependency checking exited 0 but warned that offline results are unreliable. Staging/CI must use the intended deployment toolchain; local Node 24 is not the Node 20 deployment image.
- Notification `/send` returns the existing accepted scaffold; no delivery worker behavior is proved. Existing document/AI audience research-scope questions remain separate from the five security fixes.
- No gate score, production certification, database row-count preservation result, or live CAS membership claim can be inferred from passing mocked tests/builds.

## Commands executed and actual results

The complete ledger and synthetic outputs are in `GATE_A_REGRESSION_TEST_RESULTS.md`. Checks executed during this task include:

| Check | Outcome |
|---|---|
| Backend `npm.cmd test` | PASS: all 50 existing cases; no existing-suite failure. |
| Backend/frontend type checks, frontend lint, backend build, clean isolated-output web export | PASS. |
| `node scripts/validate-gate-a-queue-invariants.mjs` (Backend) | FAIL: 2 samples. |
| `node scripts/validate-gate-a-http-contracts.mjs` (Backend) | FAIL overall: 1 canonical-route pass, 1 frontend-route failure. |
| Baseline verifier, three Node syntax checks, Git whitespace review, setup-guide AST parsing | PASS; 92 captured source/config files unchanged; 9 guide snippets parsed, none executed. |
| Tool/path/service/config classification | PASS discovery; no approved isolated database found. |
| SQL migrations/tests/audits, direct anonymous/authenticated RPC tests | BLOCKED / NOT RUN. |
| Real Auth/browser/native acceptance | BLOCKED / NOT RUN. |

**Confirmed defects: 2. Failing local diagnostic cases: 3.** Conditional source risks GA-S1–S3 are not additional observed database failures. Zero source/migration fixes were attempted in Gate A; no issue was declared closed without evidence.

## Recommended next task and stop boundary

Approve a small correction task for GA-D1 and GA-D2 with their failing probes as acceptance criteria; inspect the analogous SQL calculation through an approved isolated target rather than editing old applied migrations. In parallel, choose the isolated environment using `GATE_A_WINDOWS_ISOLATED_SETUP.md`, identify it positively, and approve its exact migration/fixture scope. Prioritize baseline privileges and ticket/storage boundary tests before broadening product functionality.

After those corrections and prerequisites, rerun Gate A. A move to VALIDATED LOCALLY requires real isolated database evidence; READY FOR STAGING ACCEPTANCE additionally requires relevant local/integration checks and a prepared acceptance target. Production changes, account approvals, commits, pushes, merges and deployments remain outside this task.

Only the four reports, Windows guide, manifest, three Node validation scripts and supplemental read-only SQL inventory were created. The existing 92-file source/configuration baseline and all previous uncommitted work were preserved.
