# Step 2.5 — Initial Admin1 Bootstrap Readiness

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Decision: NOT READY / NOT RUN.** No account was selected, created, verified, demoted, archived or assigned authority. No database was connected to, and no bootstrap SQL was executed. The implementation report's existing bootstrap template was inspected and preserved.

**Verified environment:** Windows PowerShell 5.1/AMD64, Node 24/npm 11 are available. Docker-compatible tools, Supabase CLI and PostgreSQL clients were not found on PATH/checked standard locations; no approved isolated target is configured. Both application environment files classify as hosted Supabase resources of unverified purpose. Values/connection strings were not exposed. See `STEP2_5_TEST_ENVIRONMENT_PLAN.md` for full discovery, safe proposed installation/startup commands and approval gates.

This is a readiness document, not bootstrap permission. The ten migrations and both rollback-only suites remain unapplied/unexecuted in this step. Existing Step 2 local TypeScript/158-test PASS evidence does not prove database, institutional identity or bootstrap readiness. Prior Gate A defects and blocked database acceptance remain unresolved.

## Existing design and inspected procedure

Evidence:

- `Backend/supabase/migrations/202611130001_admin_authority_foundation.sql:8–23` creates the private UUID authority relation, restricted FK, unique primary index, explicit ACLs and RLS with no client policy.
- Its `:28–72` context lookup requires an active verified super-admin actor and eligible designated primary with matching institutional Auth/registry identities. It inserts no designation and exposes no authority-write RPC.
- `Backend/src/middleware/admin-authority.ts:49`, `:111–139` checks fresh bearer identity, action and actual target. Only primary may authorize provisioning/final CAS approval; ordinary operations cannot change primary/self authority or delete/demote assigned authority holders.
- `docs/reviewer/STEP2_ADMIN_AUTHORITY_IMPLEMENTATION.md:85–129` documents institutional approval, UUID binding, owner-only transactional bootstrap and its intentionally invalid UUID placeholder. Its SQL locks the authority table and selected existing profile/Auth rows, requires the authority table to be empty, verifies existing eligibility, inserts one primary and checks the context before committing.

That structure is consistent with the prepared migration. It must be parsed/executed only in a separately approved environment before being operationally accepted. It is not a method for creating an account, choosing one by email, auto-promoting the first administrator, approving unverified CAS membership, or granting application users database-owner access.

No claims are made about a hosted system's current primary count/accounts: live state is **UNVERIFIED**. The local migration contains no assignment, and none was performed by this or the prior Step 2 work.

## Readiness decision matrix

| Requirement | Current evidence / status | Needed before execution |
|---|---|---|
| Trusted operator and CAS/IT authorization | **MISSING / NOT RUN** | Named responsible operator and institutionally approved process/authority owner; documented eligibility/IT administrative appointment evidence. |
| Exact existing Auth UUID | **NOT PROVIDED / NOT SELECTED** | Explicitly approved immutable UUID, independently reconciled between Auth and registry. Do not infer it from name/email or screenshot sample users. |
| Existing candidate eligibility | **UNVERIFIED** | Already active, verified `super_admin`, institutional Auth/registry email consistency and institutional CAS/IT attestation. Do not modify role/state/verification to force bootstrap. |
| Isolated target | **BLOCKED** | Positive owner identification of disposable/nonproduction purpose, local engine/project/workdir/container/image/system ID and actual loopback bindings. Hosted app environment settings are not test authority. |
| Tools / safe setup | **BLOCKED** | Approved Docker/WSL prerequisites, reviewed installer and pinned CLI/config; see environment plan. No automatic tool/system changes. |
| Schema/migration history | **NOT RUN** | All ten approved migrations accepted in order, matching source hashes and actual migration history; no collisions or unknown pre-existing authority objects. |
| Effective security catalog | **NOT RUN** | Owner/default/inherited/column privileges, unexposed private schema, RLS/no client writes, service-only context EXECUTE, unique-primary/FK enforcement accepted. |
| Acceptance suites | **BLOCKED** | Phase 1/admin SQL suites plus required live/primary-target/revocation/concurrency acceptance, with recorded limits and zero leftover fixtures. |
| Initial authority state | **UNVERIFIED** | Owner confirms authority table empty, not merely primary count zero. Never delete a record or adopt a conflicting mapping to satisfy the guard. |
| Rollback/audit ownership | **MISSING** | Backup/snapshot appropriate to the target, transaction failure handling, explicit authority recovery/succession owner and restricted approval/outcome record. |
| Execution authorization | **WITHHELD** | Separate instruction approving the exact target, UUID, reviewed bootstrap template/hash, operator and narrow initial designation. Step 2.5 is preparation only. |

An `@neu.edu.ph` address and a registry verification flag alone do not establish that an operator followed the approved CAS institutional process. The bootstrap owner must verify that evidence outside the application before authorizing a designation. Personnel affiliation is currently an attestation; no independent staff roster integration was invented.

## Required approval record

Before bootstrap, the owner must supply/accept a concrete review record containing:

1. **Target:** disposable/local purpose, approved scratch path/project ID, Docker context, full observed database container ID/image digest, database/system identifier, server version, actual loopback mapping and config hash. A `postgres` database name, localhost string or self-set test marker alone is insufficient.
2. **Source/database evidence:** the ten filename/hash entries from `STEP2_5_DATABASE_VALIDATION_CHECKLIST.md`, actual applied history, effective ACL/owner/RLS/function/index/FK/exposure inspection and accepted test results. Unknown schema drift/collisions must be resolved first, without rewriting applied history.
3. **Identity:** one exact existing Auth UUID approved for initial primary, independent Auth/registry reconciliation, already eligible role/state/verification, and the approved institutional CAS/IT evidence/decision reference. No default email-based selection or bulk approval.
4. **Operation:** only the reviewed initial authority insertion in a transaction, empty-table precondition and locking/context checks. No account creation, role/state/verification change, recovery, public signup change, delegated assignment or production linkage is included.
5. **Accountability:** named authorized operator/approver, approved execution window, template hash, backup/failure/rollback owner, expected one-primary outcome and restricted operator audit evidence without credentials or recovery links.

Database-owner privileges are needed for the private-table insertion; a normal `super_admin` JWT and the backend service role deliberately cannot write authority directly. Do not broaden their grants or add a public bootstrap endpoint. Admin2 must not receive owner/project/service secrets. Operator infrastructure powers are a separate trust boundary from application roles.

## Proposed read-only readiness commands — NOT RUN

After Gate A/B tool/empty-stack setup and Gate C exact-target read-only approval, reuse the **observed approved** container from the environment plan. These commands do not install anything, run migrations or insert a designation; they still require permission to connect to that target. No connection string/password appears in command arguments.

```powershell
# NOT RUN. Recheck the previously approved exact container before connecting.
docker inspect --format '{{.Id}} {{.Name}} {{.Config.Image}} {{.Image}}' $step25DbContainer
if ($LASTEXITCODE -ne 0) { throw 'Approved database container missing.' }
docker inspect --format '{{json .NetworkSettings.Ports}}' $step25DbContainer
docker exec $step25DbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "begin read only; select current_database(),current_user,current_setting('server_version'); select system_identifier::text from pg_control_system(); commit;"
if ($LASTEXITCODE -ne 0) { throw 'Read-only identity check failed.' }
```

After approved migration/test acceptance, open an owner readiness session:

```powershell
# NOT RUN. Exact-target read-only inspection approval required.
docker exec -it $step25DbContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres
```

Use an **explicitly approved UUID** in this read-only psql template; the placeholder intentionally cannot cast to UUID. No account is discovered or chosen automatically and only a boolean eligibility result is returned, rather than personal fields:

```sql
-- NOT RUN. Replace placeholder only after independent candidate/target approval.
\set approved_primary_uuid 'REPLACE_WITH_EXPLICITLY_APPROVED_AUTH_UUID'
begin read only;
select count(*) as authority_rows, count(*) filter (where level='primary') as primary_rows
from cas_admin.authorities;
select exists (
  select 1 from public.users_account_registry u
  join auth.users a on a.id=u.id
  where u.id=:'approved_primary_uuid'::uuid
    and u.role='super_admin' and u.state='active' and u.verification_status='verified'
    and lower(u.email)=lower(a.email)
    and lower(a.email) ~ '^[^@[:space:]]+@neu[.]edu[.]ph$'
) as approved_candidate_already_eligible;
commit;
```

Acceptance before initial bootstrap: authority counts are zero, candidate boolean is true, effective catalog checks from the validation checklist pass, no synthetic fixtures remain, and the independent institutional approval is recorded. A true boolean does not replace that approval. The existing bootstrap template in the Step 2 implementation report is the sole proposed write procedure; no write command is duplicated or executed here. If a placeholder/error aborts an interactive read-only transaction, issue `ROLLBACK` or close the session before any further review.

Following a **separately authorized future bootstrap**, owner read-only evidence must confirm exactly one primary bound to the approved UUID, matching eligible context and unchanged account role/state/verification/identity. Recheck no public/private-schema exposure and no client authority writes. Do not expose a full context, account email, credential or token in a public report; record only sanitized assertions and keep exact identity approval in the restricted operator record.

## Test/fixture ordering and remaining risks

Run database acceptance **before real designation**. The preserved admin suite refuses any nonempty authority table and uses rollback-only synthetic assignments. A true two-session uniqueness/revocation test additionally requires explicitly approved committed synthetic identities/designations/state changes visible to both sessions; it must not borrow the real bootstrap candidate. Those fixture provisions and cleanup remain unapproved/unexecuted. See the validation checklist for exact proposed commands/outcomes.

The local HTTPS-only app config means default HTTP Supabase is sufficient for container SQL checks, not automatically for backend/frontend/real Auth acceptance. Agree local TLS/trust or a separately authorized disposable HTTPS target without weakening working validators. No hosted source was contacted for schema/identity evidence.

Existing Gate A failures (queue fractional bounds and analytics health route), unresolved baseline grant/INSERT/storage risks, real Auth/RLS acceptance, supplemental cross-user/storage cases, operator identity/evidence, true concurrency and bootstrap recovery/audit ownership remain missing or unresolved. A completed environment plan or installation is not a security acceptance PASS. No account-action audit exists yet; the initial owner operation requires a restricted operator approval/outcome record and later account writes need their own approved audit implementation.

If the initial transaction fails, preserve the error and rollback; do not change eligibility or remove a conflicting designation to retry. After any future successful designation, succession/deprovisioning needs its own controlled process. Do not disable RLS, expose `cas_admin`, remove its FK/unique index, reset an unidentified database, or use production as a shortcut.

**Stop:** reports and source verification only. The safest next approval is tools/scratch preparation, followed by approval of the named empty stack and exact-target migration/test execution. Bootstrap remains a later separate approval and no provisioning/recovery/scheduling/deployment work proceeds under Step 2.5.
