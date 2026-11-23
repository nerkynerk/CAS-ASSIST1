# Step 2 — Administrative Authority Remaining Risks

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. Local foundation/typecheck/tests **PASS**; actual isolated database acceptance **BLOCKED**. No production operation or initial administrator designation occurred.

## Blockers and required evidence

| ID / priority | Current risk / status | Required next evidence |
|---|---|---|
| AUTH-01 / P0 validation | **BLOCKED:** new migration, effective inherited/default grants, owners/RLS/definer behavior and real SQL constraints have not executed. | Owner identifies/authorizes an isolated representative Supabase target; inspect metadata/history, apply only unapplied ordered migrations, execute Phase 1 and new SQL suites, and retain sanitized results. No production fallback. |
| AUTH-02 / P0 bootstrap | **NOT RUN:** no primary/delegated authority is assigned; all new authority-dependent checks intentionally deny without an eligible primary. | CAS-approved institutional verification, explicit existing Auth UUID and exact-target approval, controlled owner bootstrap with one-primary/eligibility/ACL acceptance. Never choose Admin1 by email/name or auto-promote a user. Procedure/template is in the implementation report. |
| AUTH-03 / P0 future release dependency | **OPEN, intentionally unchanged:** direct public student signup remains available and provider settings are unchanged. Admin1-exclusive account creation is not yet a deployed end-to-end workflow. | Build/test primary-only provisioning in a later approved step, then close public signup and every other enabled identity-creation path at the actual Auth-provider boundary under separate release authorization. UI hiding alone is inadequate; existing-user login must survive. |
| AUTH-04 / P0 future integration | **NOT IMPLEMENTED:** no account creation, final CAS approval, role/status/identity edit, recovery or access-request endpoint exists. Helpers cannot protect a future handler that skips them or forwards arbitrary service mutations. | Every future operation revalidates the bearer actor, protected authority, explicit action, target and allowed fields immediately before the privileged call; negative tests verify denied attempts have no side effects. Final CAS approval stays primary-only. |
| AUTH-05 / P1 race/consistency | **NOT RUN:** true concurrent primary insertion and live revocation acceptance. Context is a single stable snapshot; a later external Auth call is not in that transaction. | Execute multi-session constraint/revocation tests. Future mutation design must handle actor/target changes, database locking where applicable, idempotency, partial failures and reconciliation; never treat returned context as a reusable capability. |
| AUTH-06 / P1 governance lifecycle | **CONTROLLED BOUNDARY:** authority holders have FK deletion protection. Foundation denies their deletion/role change, including primary attempts. | Approve a controlled deprovision/succession procedure before supporting those actions. Remove/transfer designation only under explicit owner authorization; preserve one usable primary and audit the operation. No generic authority-write RPC. |
| AUTH-07 / P1 audit | **MISSING for future writes:** existing ticket audit does not cover account provisioning/verification/recovery/authority operations; no new write endpoint exists to audit. | Add the minimum append-only account-action audit with validated original actor, target, action/outcome and timestamp alongside the first approved account-write flow. Omit credentials/tokens; service `auth.uid()` alone is not the original actor. |
| AUTH-08 / P1 CAS evidence | **OPEN operational dependency:** verified personnel roles are existing attestations, not an independent staff roster. Student access depends on managed dated CAS memberships; NEU domain is insufficient. | CAS approves evidence/verification ownership; test actual non-CAS/pending/rejected cases and trusted affiliations. No automatic real-user backfill/verification to satisfy a test. |
| AUTH-09 / P1 error/integration contract | **DOCUMENTED:** standalone `authorizeAdminAction` throws `AdminAuthorizationError`; the existing global handler is unchanged. Entry middleware translates safely. | Future handlers must translate safe 400/401/403/503 responses, validate payload/recovery destinations separately and avoid relying only on ordinary-admin middleware. Add route tests at integration time. |
| AUTH-10 / P1 privileged infrastructure | **TRUST BOUNDARY:** database owners/privileged project operators can still change protected objects or ordinary account records. The service-only context accepts a backend-supplied UUID because service calls lack the original user's identity. | Never give Admin2 service keys/database/project-owner access. Ensure every server caller derives actor UUID from fresh `getUser`; inventory unexpected RPC grants/overloads and inherited privileges on the actual target. |
| AUTH-11 / P2 deployment toolchain | **NOT RUN:** build/deployed Node acceptance. Local Node 24 differs from the existing Node 20 deployment image. | Use the intended release toolchain and approved staging configuration before release. No package upgrades or hosting changes were made. |

## Unresolved Phase 1 / Gate A risks

These are retained findings from existing reports, not newly reproduced or corrected by Step 2:

- `docs/reviewer/GATE_A_SECURITY_VALIDATION.md:5` records **VALIDATION FAILED** for the prior gate, with actual SQL/Auth acceptance separately blocked.
- GA-D1: fractional triangular mode/mean bounds in `Backend/src/services/queue-math.ts:20`, `:29`, with analogous SQL mode rounding in the original migration. Prior diagnostic **FAIL**; no fix or rerun here.
- GA-D2: analytics calls `/health` while Express mounts `/api/health` (`Frontend/src/components/analytics/system-analytics-screen.tsx:94`, `Backend/src/app.ts:46`). Prior diagnostic **FAIL**; no fix or rerun here.
- GA-S1: baseline effective table/column/sequence grants/default ACLs and live schema drift remain unverified. The new migration explicitly grants/revokes its own objects, but does not solve reconstruction of older schema privileges.
- GA-S2: conditional broad advising INSERT-field permissions need real isolated tests; Phase 1's narrow UPDATE RPC does not restrict every INSERT field.
- GA-S3: conditional anonymous/unrelated-storage helper EXECUTE compatibility remains unverified. No storage/RLS relaxation was introduced.
- Real pending/verified/archived Auth flows, profile refresh/open-session revocation, attachment access, faculty isolation and frontend/migration version coupling remain subject to the existing acceptance matrix.

Step 2 passing 158 local backend tests does not clear those blockers or certify system-wide production readiness. See `docs/reviewer/PHASE1_REMAINING_RISKS.md`, `GATE_A_REMAINING_BLOCKERS.md` and `STEP2_ADMIN_AUTHORITY_TEST_RESULTS.md`.

## Temporary registration and account-request boundary

Registration remains intentionally intact until the user approves the next provisioning phase. Do not disable Auth signup, remove registration UI, auto-create privileged accounts, assign primary authority, modify current verification states, or change production settings as a side effect of deploying this foundation.

The later handoff must prove: Admin1-only create/invite, independently approved CAS verification before operational access, no delegated final approval/indirect promotion, all public user-creation methods closed at the provider, and existing-user sign-in preserved. An optional access request is only a request record; it must create neither a Supabase Auth user nor an operational session/access grant. Recovery and appointments remain outside this step.

## Controlled bootstrap and rollback

Bootstrap is documented, not executed. It requires the exact approved UUID/target, an already eligible existing super-admin, trusted owner connection, transaction/table lock, empty-table precondition and independent institutional approval record. The supplied template has an invalid UUID placeholder and does not automatically select a user. Owner-level authority maintenance is intentionally separate from application account management.

Before applying the migration, capture migration history, object owners/ACLs and backup state and resolve naming collisions. A failed transactional migration must be rolled back/investigated; do not drop an existing `cas_admin` schema to make it pass. After application/bootstrap, favor an approved forward correction that keeps the unique-primary/FK/ACL protections. Do not expose the schema or open public EXECUTE/table writes as a workaround.

No rollback command was executed, and no down migration is supplied. Review only the Step 2 additions/appended sections if reverting local work; preserve earlier dirty source, Step 1/Phase 1/Gate A reports and prior migrations. Existing operational routes do not call the new helper, so this foundation adds no new runtime authority prerequisite to current users.

## Smallest recommended Step 3

First identify/approve a disposable Supabase target and execute the existing/new database security acceptance. After that evidence, separately authorize the controlled initial UUID bootstrap. The next smallest product implementation is a single Admin1-only invitation flow plus necessary account-action audit, approved CAS verification and safe pending completion/retry behavior. Keep signup open until that path is tested and a separate provider-level handoff is approved.

**Stop boundary:** Step 2 does not authorize Step 3, account creation/deletion/recovery, final approval writes, bootstrap execution, appointments, commits, pushes, merges or deployment. Await the next explicit user instruction.
