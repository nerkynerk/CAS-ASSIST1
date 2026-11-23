# Step 2 — Administrative Authority Foundation Implementation

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **HEAD:** `3270d8dce2e948b80244c365f309463dc546edde`. Scope is the user's approved local authorization foundation, focused tests, and documentation. The pre-existing dirty working tree was retained.

**Result: implemented locally; backend checks PASS; database validation BLOCKED.** Both administrators retain `super_admin`. A new protected UUID authority relation and backend action/target checks distinguish `primary` (Admin1) from `delegated` (Admin2). No account-management endpoint, UI, account creation, approval write, password recovery, bootstrap execution, signup closure, or deployment was introduced.

The final Step 2 requirement supersedes Step 1's provisional operational matrix: **only Admin1 may issue final CAS access approval**, as well as create/invite accounts. Institutional email alone remains insufficient CAS evidence. This refinement maps to PRD FR-01/FR-02, with preservation of FR-03 archival behavior and existing operational permissions. The four research roles are unchanged.

## Exact file inventory

| File | Change |
|---|---|
| `Backend/src/middleware/admin-authority.ts` | NEW: fresh identity/context validation, explicit action policy, primary/delegated/ordinary entry middleware, sanitized authorization errors. |
| `Backend/test/admin-authority.test.ts` | NEW: 108 focused local HTTP/mocked-Supabase authorization cases. |
| `Backend/supabase/migrations/202611130001_admin_authority_foundation.sql` | NEW, NOT APPLIED: protected authority storage, unique primary constraint, RLS/ACLs, service-only context RPC. |
| `Backend/supabase/tests/admin_authority.sql` | NEW, NOT EXECUTED: isolated rollback-only database enforcement suite. |
| `PRD.md` | APPEND: approved subdivision, primary-only final approval, implementation/release boundaries. |
| `RULES.md` | APPEND: protected authority, takeover restrictions, future handler obligations and temporary registration preservation. |
| `ARCHITECTURE.md` | APPEND: verified local storage/RPC/backend design and snapshot limitations. |
| `MEMORY.md` | APPEND: approved scope, observed local work, bootstrap/validation limits and next-step boundary. |
| `docs/reviewer/STEP2_ADMIN_AUTHORITY_IMPLEMENTATION.md` | NEW: this implementation and bootstrap report. |
| `docs/reviewer/STEP2_ADMIN_AUTHORITY_TEST_RESULTS.md` | NEW: actual local results versus blocked/unexecuted checks. |
| `docs/reviewer/STEP2_ADMIN_AUTHORITY_REMAINING_RISKS.md` | NEW: release blockers, limitations, rollback and Step 3 guidance. |

Existing backend middleware/types/routes, all frontend files, all earlier migrations/tests, Step 1/Phase 1/Gate A reports, dependency manifests/locks and hosting configuration were preserved. No dependency was installed/upgraded. No Git commit/push/merge occurred. The reports' final preservation checks compare against hashes captured before Step 2 edits, rather than treating earlier dirty files as this task's changes.

## Database definitions

Migration order: `202611130001_admin_authority_foundation.sql` follows the nine existing migrations through `202611090001_phase1_security_hardening.sql`. It is transactional, requires the existing Supabase schemas/platform roles and registry fields, and intentionally stops on an existing `cas_admin` schema/function naming collision instead of adopting unknown objects.

| Definition | Security behavior |
|---|---|
| `cas_admin` schema (`migration:8–9`) | Not included in the repository's PostgREST exposed schemas. Explicitly revokes all schema access from PUBLIC, anon, authenticated and service_role. Do not add it to exposed schemas later. |
| `cas_admin.authorities` (`:11–15`) | `user_id uuid PRIMARY KEY REFERENCES public.users_account_registry(id) ON DELETE RESTRICT`, constrained `level` = primary/delegated, server-created timestamp. The registry itself references Auth UUIDs. No email/name/metadata is an identity key. |
| `admin_authorities_single_primary` (`:19–20`) | Unique partial index on `level WHERE level = 'primary'` enforces at most one primary, including conflicting transactions. Zero is allowed before bootstrap, but all new authority-dependent decisions then deny. Actual concurrent execution is unverified. |
| RLS and table ACLs (`:22–23`) | RLS enabled with no client policies. All table privileges explicitly revoked from PUBLIC, anon, authenticated and service_role. Ordinary clients cannot read/write authority, and a service-role key has no direct authority-table CRUD grant. |
| `public.get_admin_authority_context(p_actor_id uuid, p_target_id uuid DEFAULT NULL)` (`:28–68`) | STABLE, SECURITY DEFINER, fixed `pg_catalog, pg_temp` search path, schema-qualified relations. One statement/snapshot checks eligible primary and actor and reads the optional target. Returns JSON or NULL; it performs no mutation. |
| RPC EXECUTE ACL (`:70–72`) | PUBLIC/anon/authenticated/service_role grants explicitly cleared, then only service_role receives EXECUTE. Direct client RPC attempts cannot impersonate Admin1 by supplying a UUID. |

The context lookup requires a protected designation plus currently active, verified `super_admin` role and matching institutional Auth/registry emails for both actor and primary. A missing/ineligible primary, missing actor authority, non-admin/pending/rejected/archived actor, or nonexistent target returns NULL. It returns exactly `actor_id`, `actor_level`, `primary_id`, `target_id`, `target_role`, `target_level`; absent target facts are NULL. Target facts do not themselves grant a mutation.

Database owners remain a trusted administration boundary. RLS does not restrict the owning definer in the same way as ordinary clients, and service BYPASSRLS does not waive object ACL requirements. Effective ownership, inherited grants/default ACLs, safe definer behavior and real PostgREST execution must still be checked on the isolated target. The design follows [PostgreSQL privilege guidance](https://www.postgresql.org/docs/current/ddl-priv.html), [PostgreSQL definer-function guidance](https://www.postgresql.org/docs/current/sql-createfunction.html), and [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security); reading documentation is not database execution evidence.

No authority mutation RPC, broad grant, application policy writer, user assignment, or data backfill is included. Schema-owner bootstrap is separately controlled. Every authority-bearing profile is protected from deletion by the foreign key, not only the primary; the backend also denies ordinary deletion/role-change decisions for assigned authority holders.

## Backend authorization helpers

`Backend/src/middleware/admin-authority.ts` is additive and **not mounted on existing operational routes**. Existing `requireAuth`, `requireVerifiedCas`, `allowRoles`, role enums/unions, dashboard navigation and direct-Supabase operational behavior are unchanged.

- `authorizeAdminAction(req, action, targetId?)` (`:49`) revalidates the actual bearer token with Supabase `getUser` on every invocation. It does not accept an actor UUID/role/authority from request data or reuse a cached `authUser` grant.
- It validates the single target UUID/action shape, obtains the service-only database context using the verified Auth UUID, strictly validates JSON/role/level fields, and checks actor/primary/target consistency (`:55–109`). Missing/invalid context fails closed. It then applies an exhaustive allowlist of action decisions (`:111–139`).
- `requireAdminAuthority('primary' | 'delegated' | 'any')` (`:144`) provides reusable entry checks; omitted level means either protected level. Primary/delegated checks match their exact level. This middleware safely translates its own failures and calls `next()` only when permitted.
- `AdminAuthorizationError` (`:28`) carries a sanitized 400 (invalid action target shape), 401 (invalid/missing session), 403 (denied action/context), or 503 (lookup/malformed-context failure). Provider/database details are not returned.

**Future integration contract:** an entry middleware pass is not a durable grant. Immediately before a privileged operation, call `authorizeAdminAction` with the actual explicit action and canonical target UUID. Validate the action payload separately; never pass arbitrary Auth/profile patches through. Do not reuse a returned context across operations. Future route handlers must translate `AdminAuthorizationError` safely; the current generic error handler was deliberately left unchanged and would otherwise treat a thrown authorization error as 500. No production account routes call these helpers yet.

The context is a read snapshot, not a lock/capability for a subsequent Auth API mutation. Future handlers must revalidate actor/target near each service operation, make database changes transactionally where appropriate, record the original validated actor, and handle concurrent revocation and multi-step failure/reconciliation. Step 2 cannot claim atomicity for an account operation it does not implement.

## Permission matrix

All decisions below are foundation checks, not implemented account operations. Authority checks also require a currently eligible primary and actor. The existing operational role matrix is preserved even when no primary has been bootstrapped.

| Check/action | Primary / Admin1 | Delegated / Admin2 |
|---|---|---|
| Existing analytics, ticket oversight, announcements, knowledge/settings permissions | Existing verified super-admin permissions unchanged | Same existing permissions unchanged |
| `ordinary_admin` / `requireAdminAuthority()` | Allow with valid context | Allow with valid context |
| `requireAdminAuthority('primary')` | Allow | Deny |
| `requireAdminAuthority('delegated')` | Deny exact-level check | Allow |
| `create_account`, `invite_account` | Allow check with no target; no account created | Deny |
| `approve_cas_access` | Allow permitted-target check; no verification written | Deny final CAS approval |
| `change_role`, `change_identity`, `reactivate_account` | Allow ordinary permitted targets | Deny: these can indirectly grant operational CAS access |
| `recover_account`, `archive_account`, `delete_account` on non-admin, non-self targets | Allow check | Allow check |
| Recovery/archive of delegated administrator | Allow check | Deny administrator targeting |
| Delete/change role of any assigned authority holder | Deny; controlled deprovisioning required | Deny |
| Any targeted action against primary or actor's own administrative identity | Deny; controlled/self-identity workflow outside this contract | Deny |
| Assign primary/delegated authority, generic patches, metadata/settings authority changes, bulk/unknown actions | No application authority-write action; deny unsupported actions | Deny |
| Missing/ineligible primary, missing/invalid authority, failed lookup | Fail closed | Fail closed |

Role changes and reactivation are primary-only because switching an account into a personnel role or active verified state could bypass student membership checks/final CAS approval. This restricts new governance decisions; it does not remove an existing management capability, because the audited application has no runtime role/approval/reactivation endpoint.

Primary target protection covers the administrative decision categories for password/email/MFA/identity changes, recovery, role/verification changes, archival/deletion and self-promotion. There is no alternate recovery address, credential/session minting, arbitrary metadata patch, bulk target or authority-assignment input in this API. Future safe recovery must resolve Auth's current confirmed email by target UUID, check registry consistency and mailbox ownership, and never return a recovery credential. The recovery capability check here sends no email and must not be mistaken for recovery implementation.

## Initial Admin1 bootstrap — controlled procedure, NOT EXECUTED

Bootstrap requires a separately approved target, responsible database owner, institutionally approved operator and CAS eligibility evidence. This step does not identify a person/UUID, assign a role, verify a user or run a bootstrap command. A display name/email string must never select the primary automatically.

Required process:

1. Positively identify the isolated target and review migration history/effective privileges, backups and current authority rows. First execute and accept the isolated security suites; do not use production as a fallback.
2. Through the approved institutional process, independently verify the selected person's CAS/IT authority and bind it to the exact existing Supabase Auth UUID. Reconcile the registry/Auth identity and confirm it is already active, verified and `super_admin`. Bootstrap must not silently set those fields to make someone eligible.
3. Obtain explicit approval for that UUID and target. Use an owner-level controlled database session, not an application JWT/service endpoint. Keep operator approval, target and outcome in a restricted operational record without secrets.
4. In one transaction, lock the authority table, require it to be empty for this initial bootstrap, lock/validate the selected existing profile/Auth identity, and insert exactly one primary designation. Conflicting attempts must not overwrite the winner.
5. Verify the context resolves for the approved UUID, recheck ACLs and one-primary invariant, and accept only the intended designation. An error rolls the transaction back; never delete or replace an unknown designation to force bootstrap.
6. Delegated designation, future primary succession and authority-holder deprovisioning require their own approved owner procedure. No ordinary account endpoint may grant/transfer authority. Retain the deletion restrictions and never infer delegation from a `super_admin` role alone.

Reviewable **owner-only template**, supplied as documentation and not parsed/executed by PostgreSQL in this task. The placeholder intentionally fails UUID conversion until a separately approved operator supplies the verified UUID on the approved target:

```sql
-- NOT EXECUTED. Run only under separate exact-target/UUID authorization.
begin;
set local cas_assist.bootstrap_primary_uuid = 'REPLACE_WITH_APPROVED_AUTH_UUID';
lock table cas_admin.authorities in exclusive mode;
do $$
declare
  selected_uuid uuid := current_setting('cas_assist.bootstrap_primary_uuid')::uuid;
begin
  if exists (select 1 from cas_admin.authorities) then
    raise exception 'Initial bootstrap requires an empty authority table';
  end if;
  perform 1
  from public.users_account_registry u
  join auth.users identity_user on identity_user.id = u.id
  where u.id = selected_uuid
    and u.role = 'super_admin' and u.state = 'active'
    and u.verification_status = 'verified'
    and lower(u.email) = lower(identity_user.email)
    and lower(identity_user.email) ~ '^[^@[:space:]]+@neu[.]edu[.]ph$'
  for update of u, identity_user;
  if not found then
    raise exception 'Approved existing identity is not eligible';
  end if;
  insert into cas_admin.authorities(user_id, level)
  values (selected_uuid, 'primary');
  if public.get_admin_authority_context(selected_uuid) is null then
    raise exception 'Primary context verification failed';
  end if;
end $$;
commit;
```

The template grants no final CAS approval itself: the institutional process and eligibility preconditions must already be satisfied. No real UUID appears in the template. It is not a public RPC or a script that auto-selects an existing administrator.

## Phase 1 compatibility and release boundary

The Phase 1 migration/RPCs/tests are unchanged. New authority storage has its own ACL/RLS and does not depend on being added to Phase 1's fixed table list. Existing verified users, pending onboarding, archived history, narrow ticket status RPC, queue/AI/notification operations, faculty workflows, dashboards and navigation remain on their current checks. No new global authority requirement is attached to them.

Public signup intentionally remains in `Frontend/src/context/auth.tsx:230`; registration UI and provider configuration are untouched. The later provisioning release must close every enabled public identity-creation method at the authentication-provider boundary, after the Admin1 path has been accepted. Hiding Register alone is insufficient. An access-request submission, if later approved, must not create an Auth user or operational access.

Gate A's fractional queue/health-path defects, grant drift, ticket INSERT/storage risks and blocked real Auth/RLS acceptance remain open. This foundation neither fixes nor masks those findings. See the companion results/risks reports for exact statuses.

Rollback before application is a reviewed removal/revision of only this step's new artifacts and appended documentation; no reset/discard command was used. After an approved migration/bootstrap, prefer a reviewed forward correction and preserve authority/FK restrictions. Do not drop the schema or restore public grants as an ad hoc rollback. No down migration or production operation is included.

## Validation and next step

**PASS:** final backend TypeScript check; 158 backend tests across four files, including 108 new cases and the 50 existing cases. **BLOCKED:** actual isolated database execution. **NOT RUN:** real Auth/PostgREST/browser/multi-session concurrency acceptance and bootstrap. Frontend checks were not run because frontend source/configuration was not affected.

The smallest next step is to approve and identify a disposable Supabase target, execute the existing and new isolated security acceptance, then separately authorize controlled UUID bootstrap. After that evidence and a new Step 3 instruction, the smallest product slice is one primary-only invitation flow with institutional CAS verification, append-only account-action audit and fail-closed completion/retry handling. Do not close signup or build broader account management/recovery/appointments first.
