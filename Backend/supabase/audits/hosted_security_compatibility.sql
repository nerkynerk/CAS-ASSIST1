-- Read-only compatibility inspection for confirmed project rueukwztuflgpuvopmlu.
-- Returns one JSON result with catalog metadata and migration versions only.
-- Missing/unknown prerequisites require review. History alone never authorizes replay.
-- Helper MD5 values use the latest baseline definitions with CR removed.
-- Constraint/default fingerprints and dependency lists are evidence, not an automatic PASS.
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog, pg_temp;

-- PL/pgSQL plans the history SELECT only if its catalog checks pass.
do $audit$
declare
  history_status text;
  versions jsonb;
begin
  select case
    when c.oid is null then 'missing_table'
    when c.relkind <> 'r' then 'unexpected_relation_kind'
    when a.attnum is null then 'missing_version_column'
    when a.atttypid <> 'pg_catalog.text'::regtype then 'unexpected_version_type'
    when not has_schema_privilege(c.relnamespace, 'USAGE')
      or not has_column_privilege(c.oid, a.attnum, 'SELECT') then 'insufficient_privilege'
    when row_security_active(c.oid) then 'row_security_active'
    else 'available'
  end into history_status
  from (select to_regnamespace('supabase_migrations') as oid) history
  left join pg_class c on c.relnamespace = history.oid and c.relname = 'schema_migrations'
  left join pg_attribute a on a.attrelid = c.oid and a.attname = 'version'
    and a.attnum > 0 and not a.attisdropped;

  if history_status = 'available' then
    select coalesce(jsonb_agg(version order by version), '[]'::jsonb) into versions
    from only supabase_migrations.schema_migrations;
  end if;

  -- Pass the result to the final SELECT within this transaction.
  perform set_config('cas_assist_audit.migration_history',
    jsonb_build_object('status', history_status, 'versions', versions)::text, true);
end;
$audit$;

with migration_history as (
  select current_setting('cas_assist_audit.migration_history')::jsonb as result
), phase1_tables(name) as (values
  ('users_account_registry'), ('cas_programs'), ('student_program_memberships'),
  ('faculty_assignments'), ('student_enrollments'), ('advising_ticket_pipeline'),
  ('ticket_attachments'), ('ticket_internal_notes'), ('ticket_routing_history'),
  ('ticket_audit_logs'), ('spatial_logs'), ('spatial_log_acknowledgments'),
  ('announcements'), ('announcement_attachments'), ('academic_calendar_events'),
  ('device_push_tokens'), ('notification_delivery_logs'), ('handbook_source_documents'),
  ('handbook_knowledge_embeddings'), ('ai_query_logs'), ('system_settings'),
  ('document_requests'), ('schedules'), ('tier1_knowledge_articles')
), required_columns(relation_name, names) as (values
  ('auth.users', array['id','email']),
  ('public.users_account_registry', array['id','email','role','state','verification_status','created_at']),
  ('public.student_program_memberships', array['student_id','program_code','is_current','started_at','ended_at']),
  ('public.cas_programs', array['code','is_active']),
  ('public.advising_ticket_pipeline', array['id','student_id','category','description','status','priority','state','file_attachment_urls','created_at','updated_at','resolved_at','flagged']),
  ('public.spatial_log_acknowledgments', array['id','spatial_log_id','student_id','acknowledged_at']),
  ('public.ai_query_logs', array['id','student_id','query_text','category','answer_text','source_ids','confidence','outcome','resolved_inquiry','escalated_ticket_id','created_at']),
  ('public.faculty_assignments', array['id','faculty_id','is_active']),
  ('public.student_enrollments', array['student_id','assignment_id','state']),
  ('public.document_requests', array['status','state','requested_at']),
  ('public.announcements', array['posted_by','created_by','is_pinned','pinned','published_at','publish_at','state','created_at']),
  ('public.spatial_logs', array['id','logged_by','faculty_id','assignment_id','relocated_room','new_room','section','section_code','effective_at','expires_at','created_at']),
  ('public.notification_delivery_logs', array['status','created_at']),
  ('public.device_push_tokens', array['enabled']),
  ('public.handbook_source_documents', array['state','verification_status']),
  ('public.handbook_knowledge_embeddings', array['state']),
  ('public.tier1_knowledge_articles', array['id','title','answer','category','keywords','audience_roles','state','updated_at']),
  ('public.schedules', array['faculty_id','state']),
  ('public.academic_calendar_events', array['state']),
  ('storage.buckets', array['id','public']),
  ('storage.objects', array['id','bucket_id','name','owner','owner_id'])
), critical_columns(relation_name, name) as (values
  ('auth.users','id'), ('auth.users','email'),
  ('public.users_account_registry','id'), ('public.users_account_registry','email'),
  ('public.users_account_registry','role'), ('public.users_account_registry','state'),
  ('public.users_account_registry','verification_status'),
  ('public.advising_ticket_pipeline','status'), ('public.advising_ticket_pipeline','priority'),
  ('public.advising_ticket_pipeline','state')
), relations as (
  select c.oid, n.nspname as schema_name, c.relname, c.relkind,
         pg_get_userbyid(c.relowner) as owner, c.relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where (n.nspname = 'public' and c.relkind in ('r','p'))
     or c.oid in (to_regclass('auth.users'), to_regclass('storage.objects'),
                 to_regclass('storage.buckets'), to_regclass('cas_admin.authorities'))
), key_requirements(relation_name, columns) as (values
  ('public.users_account_registry', array['id']::text[]),
  ('public.spatial_log_acknowledgments', array['spatial_log_id','student_id']::text[])
), usable_keys as (
  select k.relation_name, k.columns,
    coalesce(bool_or(i.indisunique and i.indisvalid and i.indisready and i.indimmediate
      and i.indpred is null and i.indexprs is null and k.columns = array(
        select a.attname::text from unnest(i.indkey) with ordinality keycol(attnum, ord)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = keycol.attnum
        where keycol.ord <= i.indnkeyatts order by a.attname)), false) as usable_unique
  from key_requirements k left join pg_index i on i.indrelid = to_regclass(k.relation_name)
  group by k.relation_name, k.columns
), insert_inputs(relation_name, supplied) as (values
  ('public.advising_ticket_pipeline', array['student_id','category','description','status','priority','state']),
  ('public.ai_query_logs', array['student_id','query_text','category','answer_text','source_ids','confidence','outcome']),
  ('public.spatial_log_acknowledgments', array['spatial_log_id','student_id'])
), triggers as (
  select n.nspname as schema_name, c.relname, t.tgname, t.tgenabled,
         (t.tgtype & 1) = 1 as row_trigger, (t.tgtype & 2) = 2 as before_trigger,
         (t.tgtype & 4) = 4 as on_insert, (t.tgtype & 8) = 8 as on_delete,
         (t.tgtype & 16) = 16 as on_update, p.oid::regprocedure::text as function_signature,
         md5(replace(p.prosrc, chr(13), '')) as function_body_md5
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal and t.tgrelid in (select oid from relations)
), expected_helpers(signature, body_md5) as (values
  ('public.current_profile_role()', '8bdfcd45487d1bbfb3f63c33c4b6fc0b'),
  ('public.current_profile_state()', 'c11aaac43abf72bc0ba1ed3b964d1822'),
  ('public.is_staff_or_admin()', 'fb07b686e2b9254ec52654de5dd9786d'),
  -- Replaced by 202609130001_student_number_registration.sql.
  ('public.create_registry_profile()', '4aa1d23b7b495282480b92fa98e6d8e1'),
  ('public.audit_ticket_changes()', '5c1120d3083d3d84eeb5098fcf4d3f78'),
  ('public.get_student_queue_estimate(uuid)', '2e5c5a98dbf36d99a2cda6877fd38488'),
  ('public.get_queue_analytics(integer,text)', '85fffd5850580b907cb2d89ff9749206')
), routines as (
  select p.oid, n.nspname as schema_name, p.proname,
         pg_get_function_identity_arguments(p.oid) as arguments,
         pg_get_function_result(p.oid) as result_type, l.lanname as language, p.prokind, p.proargmodes,
         p.pronargdefaults, pg_get_userbyid(p.proowner) as owner, p.prosecdef,
         array(select setting from unnest(p.proconfig) setting
               where setting like 'search_path=%' or setting like 'row_security=%') as security_settings,
         md5(replace(p.prosrc, chr(13), '')) as body_md5,
         has_function_privilege(api_anon.oid, p.oid, 'EXECUTE') as anon_execute,
         has_function_privilege(api_authenticated.oid, p.oid, 'EXECUTE') as authenticated_execute,
         has_function_privilege(api_service.oid, p.oid, 'EXECUTE') as service_execute
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  left join pg_roles api_anon on api_anon.rolname = 'anon'
  left join pg_roles api_authenticated on api_authenticated.rolname = 'authenticated'
  left join pg_roles api_service on api_service.rolname = 'service_role'
  where n.nspname in ('public','cas_admin') and (p.prosecdef or p.proname = any(array[
    'has_active_cas_access','has_cas_history_access','transition_advising_ticket_status',
    'get_admin_authority_context','acknowledge_room_change','record_tier1_feedback',
    'answer_tier1_question','get_system_analytics','escalate_ai_query_to_ticket',
    'get_student_queue_estimate','get_queue_analytics','current_profile_role',
    'current_profile_state','is_staff_or_admin','create_registry_profile','audit_ticket_changes',
    'protect_profile_governance','prevent_audit_mutation','validate_ticket_transition',
    'bridge_legacy_announcement_columns','bridge_legacy_spatial_columns','set_updated_at']))
)
select jsonb_build_object(
  'context', jsonb_build_object('database', current_database(), 'role', current_user,
    'read_only', current_setting('transaction_read_only'), 'version', current_setting('server_version')),
  'migration_history_status', result->>'status',
  'migration_versions', result->'versions',
  'missing_phase1_tables', coalesce((select jsonb_agg(name order by name) from phase1_tables
    where not exists (select 1 from pg_class c where c.oid = to_regclass('public.' || name)
      and c.relkind in ('r','p'))), '[]'::jsonb),
  'relations', coalesce((select jsonb_agg(to_jsonb(r) - 'oid'
    order by r.schema_name,r.relname) from relations r), '[]'::jsonb),
  'missing_required_columns', coalesce((select jsonb_agg(jsonb_build_object('relation', r.relation_name,
    'column', field.name) order by r.relation_name,field.name) from required_columns r
    cross join lateral unnest(r.names) field(name) where not exists (select 1 from pg_attribute a
      where a.attrelid = to_regclass(r.relation_name) and a.attname = field.name
        and a.attnum > 0 and not a.attisdropped)), '[]'::jsonb),
  'critical_types', (select jsonb_agg(jsonb_build_object('relation', r.relation_name, 'column', r.name,
    'type', format_type(a.atttypid,a.atttypmod), 'not_null', a.attnotnull) order by r.relation_name,r.name)
    from critical_columns r left join pg_attribute a on a.attrelid = to_regclass(r.relation_name)
      and a.attname = r.name and a.attnum > 0 and not a.attisdropped),
  'unique_keys', (select jsonb_agg(to_jsonb(k) order by k.relation_name) from usable_keys k),
  'insert_requirements', coalesce((select jsonb_agg(jsonb_build_object(
    'relation', i.relation_name, 'column', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
    'identity', a.attidentity, 'generated', a.attgenerated, 'has_default', d.oid is not null,
    'default_md5', md5(pg_get_expr(d.adbin,d.adrelid)), 'before_insert_triggers', (
      select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb) from triggers t
      where t.schema_name || '.' || t.relname = i.relation_name and t.before_trigger
        and t.row_trigger and t.on_insert and t.tgenabled in ('O','A')))
    order by i.relation_name,a.attnum) from insert_inputs i
    join pg_attribute a on a.attrelid = to_regclass(i.relation_name)
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attnum > 0 and not a.attisdropped and a.attnotnull and a.attname::text <> all(i.supplied)), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(t) order by schema_name,relname,tgname)
    from triggers t), '[]'::jsonb),
  'ticket_constraints', coalesce((select jsonb_agg(jsonb_build_object('name', c.conname,
    'type', c.contype, 'validated', c.convalidated, 'definition_md5', md5(pg_get_constraintdef(c.oid)))
    order by c.conname) from pg_constraint c
    where c.conrelid = to_regclass('public.advising_ticket_pipeline')), '[]'::jsonb),
  'routines', coalesce((select jsonb_agg(to_jsonb(p) - 'oid' order by schema_name,proname,arguments)
    from routines p), '[]'::jsonb),
  'alter_only_helpers', (select jsonb_agg(jsonb_build_object('signature', e.signature,
    'present', p.oid is not null, 'expected_body_md5', e.body_md5,
    'observed_body_md5', md5(replace(p.prosrc, chr(13), '')),
    'matches_local_body', coalesce(md5(replace(p.prosrc, chr(13), '')) = e.body_md5, false))
    order by e.signature) from expected_helpers e
    left join pg_proc p on p.oid = to_regprocedure(e.signature)),
  'phase1_policy_collisions', coalesce((select jsonb_agg(jsonb_build_object('schema', schemaname,
    'table', tablename, 'name', policyname, 'kind', permissive, 'roles', roles, 'command', cmd)
    order by schemaname,tablename,policyname) from pg_policies
    where schemaname in ('public','storage','cas_admin') and left(policyname,7) = 'phase1_'), '[]'::jsonb),
  'storage_policies', coalesce((select jsonb_agg(jsonb_build_object('table', tablename,
    'name', policyname, 'kind', permissive, 'roles', roles, 'command', cmd) order by tablename,policyname)
    from pg_policies where schemaname = 'storage' and tablename in ('objects','buckets')), '[]'::jsonb),
  'legacy_acknowledgement_dependencies', coalesce((select jsonb_agg(jsonb_build_object(
    'kind', d.deptype, 'object', pg_describe_object(d.classid,d.objid,d.objsubid))) from pg_depend d
    where d.refclassid = 'pg_proc'::regclass
      and d.refobjid = to_regprocedure('public.acknowledge_room_change(uuid,uuid)')), '[]'::jsonb),
  'schema_privileges', (select jsonb_agg(jsonb_build_object('role', r.rolname,
    'schema', n.nspname, 'usage', has_schema_privilege(r.oid,n.oid,'USAGE'),
    'create', has_schema_privilege(r.oid,n.oid,'CREATE')) order by r.rolname,n.nspname)
    from pg_roles r cross join pg_namespace n where r.rolname in ('anon','authenticated','service_role')
      and n.nspname in ('public','cas_admin')),
  'authority_objects', jsonb_build_object('schema_exists', exists(select 1 from pg_namespace where nspname = 'cas_admin'),
    'table_exists', to_regclass('cas_admin.authorities') is not null,
    'lookup_exists', to_regprocedure('public.get_admin_authority_context(uuid,uuid)') is not null),
  'exposed_schema_setting', current_setting('pgrst.db_schemas', true),
  'enums', (select jsonb_object_agg(t.typname, labels) from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join lateral (select jsonb_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_enum e where e.enumtypid = t.oid) e on labels is not null
    where n.nspname = 'public')
) as compatibility
from migration_history;

commit;
