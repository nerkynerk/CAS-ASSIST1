# Step 2.6 — Existing Hosted Supabase Assessment

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **HEAD:** `3270d8dce2e948b80244c365f309463dc546edde`. **Scope:** local configuration/source assessment and prepared read-only inspection only. No connection to the hosted project, Dashboard session, Management API, database or Auth endpoint was made. No query, backup export, migration, account operation or setting change was executed.

**Decision:** the existing hosted project can be considered as the development target, but direct migration application is **NOT YET CLEARED**. Local files identify the candidate; live schema/history, effective permissions, access readiness and recoverable backup remain unverified. Initial approved Dashboard inspection is the fastest next step and does not require installing Docker. The separate backup/migration report defines the recovery and later change gates.

The user reports that the application is not in active use and is considering this project for active development. This reduces expected disruption but does not establish empty data, absence of background writers, schema compatibility or recovery capability. Earlier isolated-testing plans remain historical alternatives, not authorization to mutate this hosted project.

## 1. Exact candidate target and configuration evidence

| Item | Verified locally | Not verified |
|---|---|---|
| Project reference | **`rueukwztuflgpuvopmlu`** | Dashboard organization, project display name, owner, region, plan and current service state. |
| Public API hostname | **`rueukwztuflgpuvopmlu.supabase.co`**; HTTPS, no user-info or query component in the configured URL. | DNS/TLS/service reachability; no request was made. |
| Backend source | `Backend/.env` supplies this target. Server accepts `SUPABASE_SECRET_KEY`, with `SUPABASE_SERVICE_ROLE_KEY` fallback (`Backend/src/config.ts:7–19`). | Actual deployed Render environment values. |
| Frontend source | `Frontend/.env` supplies the same target through `EXPO_PUBLIC_SUPABASE_URL`; public-key configuration is separate (`Frontend/src/lib/config.ts:1–2`). | Existing deployed Vercel/Expo bundle's build-time values. |
| Key classification | Backend and frontend key payloads locally decode to unverified `service_role` and `anon` claims respectively, both claiming this project reference. Values withheld. | Signature, expiry, acceptance, revocation and current project authorization. Decoded claims are not authentication evidence. |
| Current shell overrides | No backend/frontend Supabase URL/key override was present in the inspection process. | Other terminals, CI/CD, hosting and previously built assets. |
| Repository local config | `Backend/supabase/config.toml` is a separate local-stack configuration, not proof of hosted Auth settings or applied schema. | Effective hosted configuration. |

The reference/hostname are non-secret identifiers needed for approval. No key, password, token, full database connection string, user identity or Storage object path appears in this report. The owner must confirm this exact reference in the Supabase Dashboard before approving any hosted read.

### Frontend/backend connection and security impact

- `Frontend/src/lib/supabase.ts:6–12` creates the public client with persisted AsyncStorage sessions and token refresh. Most screens query Supabase tables/RPCs directly; frontend environment values are embedded at build time.
- `Backend/src/supabase.ts:5–11` creates the server-only privileged client with session persistence disabled. It is used after backend user validation; service operations do not rely on end-user RLS.
- `Backend/src/middleware/auth.ts:11–46`, `:61–88` verifies bearer identity, registry/email consistency, role/state/verification and dated student CAS affiliation. An NEU email alone is insufficient.
- `Backend/src/app.ts:46–49` mounts health, AI, queue and notification routes. New authority checks in `Backend/src/middleware/admin-authority.ts:49`, `:144` remain additive; no account-management endpoint is mounted.
- `Backend/render.yaml` leaves Supabase settings to hosting-managed values; `Frontend/vercel.json` builds the web export. Neither file proves which target an existing deployment currently uses. No hosting setting was queried or changed.

Consequently, RLS/function changes affect direct frontend access as well as the Express gateway. There is no need to rebuild the architecture, but a later approved migration/release must preserve both callers and coordinated RPC contracts.

## 2. Approval boundary for the next hosted inspection

**Proposed exact target:** project **`rueukwztuflgpuvopmlu`**. **Proposed first scope:** view-only Dashboard project identity, non-secret Authentication/API/backup configuration, and the staged catalog/aggregate SQL below. No approval has yet been received.

Included: schemas/table/column/type/extension metadata; applied migration versions where present; RLS/privilege/function-signature/trigger/index/FK metadata; aggregate user/role/verification/affiliation/Storage counts after prerequisites are confirmed; and non-secret Dashboard settings/backup availability. No raw account rows/emails/UUID lists, credentials, password hashes, MFA factors, sessions/tokens, arbitrary settings JSON, Storage object names/content, function bodies or encrypted/Vault values are included. Policy expressions require private review for literals before sharing.

Excluded: all DDL/DML/grants, application RPC invocation, role simulation/fixture tests, migration history repair, account creation/verification/bootstrap/recovery, password/key reset, enabling/changing backups/PITR, full data export, restore/clone, signup/provider changes, hosted linking and deployment. Backup extraction and restore tests need separate explicit approval because they handle sensitive complete data and may create/change a recovery target.

### Dashboard SQL Editor: no Docker required for inspection

Supabase provides a browser SQL Editor, so the owner can perform the approved initial inspection without Docker, Supabase CLI or host psql. [Supabase SQL Editor](https://supabase.com/features/sql-editor). Confirm the project reference in the selected Dashboard project first; SQL's `current_database()` often only says `postgres` and does not independently prove the project identity.

The Editor normally has privileged access. It can inventory RLS but cannot prove student/delegate JWT behavior just by returning rows. Keep each approved packet inside `BEGIN READ ONLY`, short local timeouts and a fixed catalog search path. Run one packet at a time; if the UI only presents one result set, run each SELECT separately with the same transaction wrapper. Do not highlight/run a middle statement without its wrapper. On error, stop and roll back/close the transaction; do not improvise a migration or change privileges.

The SQL below is **PREPARED / NOT RUN**. It uses built-in catalog functions and aggregates, not application SECURITY DEFINER RPC calls. A read-only transaction is useful protection, not permission to call unknown user functions/views/foreign tables that could have external effects. Confirm relation kinds and policies before the conditional data aggregates.

## 3. Packet A — catalog-only discovery, safe with missing application tables

This first packet deliberately avoids casts/dereferences to possibly absent application objects and returns no personal rows or function source. Its columns also establish whether later snippets can parse. Inspect all results before proceeding to Packet B or C.

```sql
-- NOT RUN. Requires exact-target/catalog read approval.
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;

select current_database() as database_name, current_user as executing_role,
       current_setting('server_version') as server_version,
       current_setting('transaction_read_only') as read_only,
       current_setting('TimeZone') as database_timezone;

select nspname as schema_name, pg_get_userbyid(nspowner) as owner
from pg_namespace where nspname !~ '^pg_' and nspname <> 'information_schema'
order by nspname;

select object_name, to_regclass(object_name) is not null as exists
from unnest(array[
  'supabase_migrations.schema_migrations','auth.users','auth.identities',
  'public.users_account_registry','public.cas_programs','public.student_program_memberships',
  'public.faculty_assignments','public.student_enrollments','public.advising_ticket_pipeline',
  'public.ticket_attachments','public.ticket_internal_notes','public.ticket_routing_history',
  'public.ticket_audit_logs','public.spatial_logs','public.spatial_log_acknowledgments',
  'public.announcements','public.announcement_attachments','public.academic_calendar_events',
  'public.device_push_tokens','public.notification_delivery_logs','public.handbook_source_documents',
  'public.handbook_knowledge_embeddings','public.ai_query_logs','public.system_settings',
  'public.document_requests','public.schedules','public.tier1_knowledge_articles',
  'storage.buckets','storage.objects','cas_admin.authorities'
]) as objects(object_name);

select n.nspname as schema_name, c.relname as relation_name, c.relkind,
       pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
       c.relacl as explicit_acl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  and c.relkind in ('r','p','v','m','S','f')
order by n.nspname,c.relname;

select table_schema,table_name,column_name,data_type,udt_schema,udt_name,is_nullable
from information_schema.columns
where table_schema in ('public','cas_admin')
   or (table_schema='supabase_migrations' and table_name='schema_migrations')
   or (table_schema='auth' and table_name in ('users','identities'))
   or (table_schema='storage' and table_name in ('buckets','objects'))
order by table_schema,table_name,ordinal_position;

select n.nspname as schema_name,t.typname,
       array_agg(e.enumlabel order by e.enumsortorder) as labels
from pg_type t join pg_namespace n on n.oid=t.typnamespace
join pg_enum e on e.enumtypid=t.oid
where n.nspname='public' group by n.nspname,t.typname order by t.typname;

select e.extname,e.extversion,n.nspname as extension_schema
from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by e.extname;

select schemaname,tablename,policyname,permissive,roles,cmd
from pg_policies where schemaname in ('public','storage','cas_admin')
order by schemaname,tablename,policyname;

select n.nspname as schema_name,p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result_type,
       pg_get_userbyid(p.proowner) as owner,p.prosecdef as security_definer,
       array(select setting from unnest(p.proconfig) setting
             where setting like 'search_path=%' or setting like 'row_security=%') as security_settings,
       p.proacl as explicit_acl,caller.rolname as caller,
       has_function_privilege(caller.oid,p.oid,'EXECUTE') as can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join pg_roles caller
where n.nspname in ('public','cas_admin')
  and caller.rolname in ('anon','authenticated','service_role')
order by n.nspname,p.proname,arguments,caller.rolname;

select n.nspname as schema_name,c.relname,caller.rolname,
       has_table_privilege(caller.oid,c.oid,'SELECT') as can_select,
       has_table_privilege(caller.oid,c.oid,'INSERT') as can_insert,
       has_table_privilege(caller.oid,c.oid,'UPDATE') as can_update,
       has_table_privilege(caller.oid,c.oid,'DELETE') as can_delete,
       has_table_privilege(caller.oid,c.oid,'TRUNCATE') as can_truncate
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join pg_roles caller
where n.nspname in ('public','storage','cas_admin') and c.relkind in ('r','p')
  and caller.rolname in ('anon','authenticated','service_role')
order by n.nspname,c.relname,caller.rolname;

select pg_get_userbyid(d.defaclrole) as creating_role,
       case when d.defaclnamespace=0 then '(global)' else n.nspname end as schema_name,
       d.defaclobjtype,d.defaclacl
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
where d.defaclnamespace=0 or n.nspname in ('public','storage','cas_admin')
order by creating_role,schema_name,d.defaclobjtype;

select rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin
from pg_roles where rolname in ('anon','authenticated','service_role');
select child.rolname as member_role,parent.rolname as inherited_role,m.admin_option
from pg_auth_members m join pg_roles child on child.oid=m.member
join pg_roles parent on parent.oid=m.roleid
where child.rolname in ('anon','authenticated','service_role')
order by child.rolname,parent.rolname;
commit;
```

This is inventory, not proof that any policy/function matches source or grants appropriate row scope. All three platform roles must be accounted for; missing output is a finding, not an invitation to create/grant them. Never query `pg_authid` passwords, all server settings, `auth.instances.raw_base_config`, Vault contents or unfiltered function configuration/source to fill an inventory gap.

## 4. Packet B — conditional history and aggregate data readiness

**Only after Packet A confirms the exact referenced base tables/columns/types and the owner approves aggregate reads.** If a required relation/column is absent, skip its SELECT and report the gap; prepare an adapted read-only query after reviewing the actual structure. A CASE containing a reference to an absent table does not protect against parse-time relation errors. Do not run all of this packet on an unknown prototype schema.

```sql
-- NOT RUN. Include only SELECTs whose table/column prerequisites were verified.
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;

-- Requires schema_migrations/version. No statements/source column is exported.
select version from supabase_migrations.schema_migrations order by version;

-- Registry role is the application role; auth.users.role is not a substitute.
select role::text,state::text,verification_status::text,count(*) as accounts
from public.users_account_registry group by role,state,verification_status
order by role::text,state::text,verification_status::text;

select count(*) as auth_accounts,
       count(*) filter (where email_confirmed_at is not null) as confirmed_email_accounts
from auth.users;
select provider,count(*) as identities from auth.identities group by provider order by provider;

select count(*) as auth_accounts_without_registry
from auth.users a left join public.users_account_registry u on u.id=a.id where u.id is null;
select count(*) as registry_without_auth_or_email_mismatch
from public.users_account_registry u left join auth.users a on a.id=u.id
where a.id is null or lower(u.email) is distinct from lower(a.email);

select count(*) as verified_active_students_without_valid_managed_cas_membership
from public.users_account_registry u
where u.role::text='student' and u.state::text='active' and u.verification_status::text='verified'
and not exists (
  select 1 from public.student_program_memberships m
  join public.cas_programs p on p.code=m.program_code
  where m.student_id=u.id and m.is_current and p.is_active
    and m.started_at<=current_date and (m.ended_at is null or m.ended_at>=current_date)
);

-- Requires student_number; reports duplicate GROUP count, never identifier values.
select count(*) as invalid_student_numbers
from public.users_account_registry
where student_number is not null and
  (student_number !~ '^[0-9-]{5,24}$' or length(regexp_replace(student_number,'[^0-9]','','g'))<5);
select count(*) as duplicate_student_number_groups from (
  select student_number from public.users_account_registry
  where student_number is not null group by student_number having count(*)>1
) as duplicate_groups;

select status::text,count(*) as ticket_count from public.advising_ticket_pipeline
group by status order by status::text;
select priority::text,count(*) as ticket_count from public.advising_ticket_pipeline
group by priority order by priority::text;

-- Only if private authority storage exists. Never list administrator UUIDs.
select level,count(*) as authority_count from cas_admin.authorities group by level order by level;

-- Bucket identifiers/flags and counts only, not object names or object metadata JSON.
select b.id as bucket,b.public,count(o.id) as object_count
from storage.buckets b left join storage.objects o on o.bucket_id=b.id
group by b.id,b.public order by b.id;
commit;
```

Stored confirmation counts do not establish the current email-confirmation policy. A zero affected-user count is a prerequisite signal, not automatic approval/backfill. Nonzero gaps must be reviewed by CAS without modifying users in this assessment. Missing migration history does **not** prove the migrations are unapplied: SQL may have been run manually through the Dashboard.

## 5. Packet C — compatibility metadata and scoped policy review

This packet reads catalogs without invoking functions. It also prepares exact presence checks for the expected hardened RPC signatures. Query plans/counts cannot establish function body semantics; any necessary definition comparison must be separately scoped and privately reviewed/redacted before sharing, since unknown bodies can contain sensitive constants.

```sql
-- NOT RUN. Requires approval for compatibility metadata/policy-expression review.
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;

select signature,to_regprocedure(signature) is not null as exists
from unnest(array[
  'public.has_active_cas_access()','public.has_cas_history_access()',
  'public.transition_advising_ticket_status(uuid,text)',
  'public.get_student_queue_estimate(uuid)','public.get_queue_analytics(integer,text)',
  'public.escalate_ai_query_to_ticket(uuid,uuid,text,text)',
  'public.answer_tier1_question(text)','public.record_tier1_feedback(uuid,boolean)',
  'public.get_system_analytics(integer)','public.get_admin_authority_context(uuid,uuid)'
]) as expected(signature);

select n.nspname as schema_name,c.relname,t.tgname,t.tgenabled,
       pns.nspname as function_schema,p.proname,
       pg_get_function_identity_arguments(p.oid) as function_arguments
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid join pg_namespace pns on pns.oid=p.pronamespace
where not t.tgisinternal and
  (n.nspname in ('public','cas_admin') or (n.nspname='auth' and c.relname='users'))
order by n.nspname,c.relname,t.tgname;

select n.nspname as schema_name,c.relname,con.conname,con.contype,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','cas_admin') order by n.nspname,c.relname,con.conname;
select schemaname,tablename,indexname,indexdef from pg_indexes
where schemaname in ('public','cas_admin') order by schemaname,tablename,indexname;

select a.attname as ticket_column,caller.rolname,
       has_column_privilege(caller.oid,a.attrelid,a.attnum,'INSERT') as can_insert_column,
       has_column_privilege(caller.oid,a.attrelid,a.attnum,'UPDATE') as can_update_column
from pg_attribute a cross join pg_roles caller
where a.attrelid=to_regclass('public.advising_ticket_pipeline') and a.attnum>0 and not a.attisdropped
  and caller.rolname in ('anon','authenticated','service_role')
order by a.attnum,caller.rolname;
select n.nspname,c.relname,caller.rolname,
       has_sequence_privilege(caller.oid,c.oid,'USAGE') as can_use,
       has_sequence_privilege(caller.oid,c.oid,'SELECT') as can_read,
       has_sequence_privilege(caller.oid,c.oid,'UPDATE') as can_change
from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join pg_roles caller
where c.relkind='S' and n.nspname in ('public','cas_admin')
  and caller.rolname in ('anon','authenticated','service_role')
order by n.nspname,c.relname,caller.rolname;
select n.nspname,caller.rolname,
       has_schema_privilege(caller.oid,n.oid,'USAGE') as can_use,
       has_schema_privilege(caller.oid,n.oid,'CREATE') as can_create
from pg_namespace n cross join pg_roles caller
where n.nspname in ('public','storage','cas_admin')
  and caller.rolname in ('anon','authenticated','service_role')
order by n.nspname,caller.rolname;

-- Private owner review first: expressions can contain embedded identifiers/literals.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where (schemaname='public' and tablename in (
  'users_account_registry','student_program_memberships','advising_ticket_pipeline',
  'faculty_assignments','schedules','spatial_logs','ticket_attachments'))
   or (schemaname='storage' and tablename in ('objects','buckets'))
   or schemaname='cas_admin'
order by schemaname,tablename,policyname;
commit;
```

Do not paste unreviewed expressions/definitions into public reports. Additional application-table policy expressions can be inspected after agreeing that scope. Function names/EXECUTE flags alone cannot prove the absence of a bypass, and owner SQL Editor reads do not simulate anonymous/student/delegated requests.

Existing audits are reusable references **after** compatibility gating, not the first command to run blindly: `Backend/supabase/audits/phase1_read_only_audit.sql:5–16` assumes history/registry/affiliation objects, and it returns raw function `proconfig`; `gate_a_security_inventory.sql` has an explicit ticket `regclass` cast and inventories public/storage rather than all private authority objects. The packets above avoid those initial assumptions and filter function settings. Neither audit nor the fixture suites was executed.

## 6. Authentication/provider and backup configuration: view-only Dashboard checklist

SQL account tables describe stored data, not the effective GoTrue/control-plane signup configuration. After exact-target/view-only approval, record these **non-secret** facts directly in the selected Dashboard, without toggling or saving anything:

| Area | Inspect/read only | Do not reveal/change |
|---|---|---|
| Auth signup | Allow-new-users setting; email signup/confirmation; anonymous, OTP, OAuth/SSO and other enabled user-creation paths. | No signup closure, provider edit, sample signup or account creation. |
| Verification/security | Email-change confirmation, password/session/MFA/captcha/rate-limit policy and configured Auth hooks. | No password hashes, tokens, factors, hook credentials or test recovery. |
| Redirect/email delivery | Approved site/redirect origins, local/custom SMTP configured state and email-template purpose. | No SMTP/provider secrets or changes. |
| API | Exposed schemas, custom domain and non-secret key types/configuration. `cas_admin` must stay unexposed. | No key reveal/reset or connection-string copying into reports. |
| Backups | Actual plan, available recovery points/type/status/retention, download/restore-to-new-project capability, PITR enabled state. | No enabling/billing change, backup export, restore, clone or project creation yet. |
| Background writers | Presence/enabled status of scheduled jobs, webhooks, external integrations and deployments still connected. | No raw commands/headers/secret settings, job execution or disabling anything now. |

Supabase documents signup and email confirmation as Auth configuration, distinct from account rows. [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration). Local `Backend/supabase/config.toml:176`, `:221–228` permits signup and disables email confirmation, but is **not** evidence of hosted values.

## 7. Compatibility questions and current assessment

| Source-supported concern | Exact evidence | Hosted outcome currently |
|---|---|---|
| Phase 1 expects all 24 tables/prior RPCs and creates one-time restrictive policies. | `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:57–86` | UNKNOWN. Existing or partial policy/function application can conflict; catalog/definition comparison required. |
| Existing valid students can be restricted if managed memberships/active programs are incomplete. | Same migration `:21–26`; backend `auth.ts:70–85`. | UNKNOWN. Aggregate readiness first; no automatic approval or invented membership. |
| Old broad ticket writers/direct queue calls lose permission; new frontend needs access/status helpers. | Phase 1 `:133–180`; `Frontend/src/context/auth.tsx:97`, `Frontend/src/app/admin.tsx:258`. | Deployed client/backend/database versions UNKNOWN. Coordinate later rollout even if currently inactive. |
| Authority migration intentionally creates a new private schema/function, with no assignment. | `202611130001_admin_authority_foundation.sql:8`, `:28`. | Existing collisions/history UNKNOWN. Do not drop/adopt/rename objects to force a pass. |
| Prototype prerequisite migrations may alter stored values or fail on partial old shapes. | Legacy bridges `202609120001:6–28`, `:34–56`; student-ID `202609130001:7–22`; baseline/priority/knowledge data writes. | UNKNOWN. Missing history is not permission to replay all ten files. |
| Effective default/inherited/column grants and conditional ticket INSERT/storage risks remain unresolved. | `docs/reviewer/GATE_A_REMAINING_BLOCKERS.md:18–20`. | UNKNOWN. No blanket grants/RLS disablement as a workaround. |
| Existing queue fractional-bound and analytics-health failures remain documented. | Same report `:13–14`. | Not fixed or rerun here; unrelated to permission to migrate. |

No actual hosted conflict was observed because nothing was connected or executed. Conversely, no absence of conflict was established. Ten prepared files and prior mocked tests are not evidence of their hosted application state.

**Safest next action:** approve only project **`rueukwztuflgpuvopmlu`** and the staged read-only metadata/aggregate/view-only configuration scope above. Inspect and classify the current state, then approve a complete backup/recovery operation separately. Select the smallest genuinely pending compatible changes only after that evidence. See `STEP2_6_DATABASE_BACKUP_AND_MIGRATION_PLAN.md` for backup components, restore proof and change sequencing.

## Verification record and stop boundary

This task checked local configuration and non-secret target/key metadata, source dependencies, existing reports/instructions and official documentation. The proposed SQL was reviewed as source only; no PostgreSQL parser/server, SQL Editor, hosted API, application test, export or restore was run. No tool installation was needed for this assessment. Existing source/UI, environment values, prior migrations/tests and uncommitted work were preserved; only the two requested reports were created.

Preparation checks: 20 explicit source path/line references passed existence/line-bound checks; both security-file hashes match the recorded snapshot; three SQL blocks passed a static read-only-wrapper/statement-class check and independent source review. These are not SQL execution/parse results. A SHA-256 comparison confirmed all 179 pre-existing inventoried files unchanged, with only the two requested reports added; Git internals, dependency/build caches and secret-file patterns were excluded from that inventory. No existing documentation was overwritten.

**Current statuses:** local target/source assessment VERIFIED; hosted inventory NOT RUN / awaiting exact-target approval; compatibility and backup readiness UNVERIFIED; migrations/bootstrap/account changes NOT AUTHORIZED. Stop after these reports.
