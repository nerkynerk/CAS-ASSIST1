-- Gate A supplemental metadata inventory. NO migration or test execution.
-- Execute only with separately authorized read-only access to an identified
-- project. Database name alone does not prove that a target is isolated.
-- Outputs database principals/object metadata, never student rows, object keys,
-- function bodies, credential settings, or default sequence values.
begin read only;

select current_database() as database_name,
       current_user as executing_database_role,
       current_setting('server_version') as server_version,
       current_setting('transaction_read_only') as transaction_read_only;

-- Owner privileges/BYPASSRLS/FORCE RLS affect SECURITY DEFINER and policy behavior.
select n.nspname as schema_name, c.relname as relation_name, c.relkind,
       pg_get_userbyid(c.relowner) as owner_database_role,
       owner_role.rolsuper as owner_is_superuser,
       owner_role.rolbypassrls as owner_bypasses_rls,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
       c.relacl as explicit_relation_acl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_roles owner_role on owner_role.oid = c.relowner
where (n.nspname = 'public' and c.relkind in ('r','p','v','m','S'))
   or (n.nspname = 'storage' and c.relname in ('objects','buckets'))
order by n.nspname, c.relname;

-- Fresh-database behavior depends on these defaults and the creating role.
-- Empty output means no explicit defaults, not proof of application access.
select pg_get_userbyid(d.defaclrole) as creating_database_role,
       case when d.defaclnamespace = 0 then '(global)' else n.nspname end as schema_name,
       d.defaclobjtype as object_type, d.defaclacl as default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclnamespace = 0 or n.nspname in ('public','storage')
order by creating_database_role, schema_name, object_type;

-- Effective privileges include table, PUBLIC, and inherited grants. They do not
-- prove row/column authorization; evaluate the policies and real requests too.
select n.nspname as schema_name, c.relname as relation_name, caller.role_name,
       has_table_privilege(caller.role_name, c.oid, 'SELECT') as can_select,
       has_table_privilege(caller.role_name, c.oid, 'INSERT') as can_insert,
       has_table_privilege(caller.role_name, c.oid, 'UPDATE') as can_update,
       has_table_privilege(caller.role_name, c.oid, 'DELETE') as can_delete,
       has_table_privilege(caller.role_name, c.oid, 'TRUNCATE') as can_truncate,
       has_table_privilege(caller.role_name, c.oid, 'TRIGGER') as can_create_trigger
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join unnest(array['anon','authenticated','service_role']) caller(role_name)
where (n.nspname = 'public' and c.relkind in ('r','p','v','m'))
   or (n.nspname = 'storage' and c.relname = 'objects')
order by n.nspname, c.relname, caller.role_name;

select a.attname as ticket_column, caller.role_name,
       has_column_privilege(caller.role_name, a.attrelid, a.attnum, 'INSERT') as can_insert_column,
       has_column_privilege(caller.role_name, a.attrelid, a.attnum, 'UPDATE') as can_update_column,
       a.attacl as explicit_column_acl
from pg_attribute a
cross join unnest(array['anon','authenticated','service_role']) caller(role_name)
where a.attrelid = 'public.advising_ticket_pipeline'::regclass
  and a.attnum > 0 and not a.attisdropped
order by a.attnum, caller.role_name;

select n.nspname as schema_name, c.relname as sequence_name, caller.role_name,
       has_sequence_privilege(caller.role_name, c.oid, 'USAGE') as can_use,
       has_sequence_privilege(caller.role_name, c.oid, 'SELECT') as can_select,
       has_sequence_privilege(caller.role_name, c.oid, 'UPDATE') as can_update
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join unnest(array['anon','authenticated','service_role']) caller(role_name)
where n.nspname = 'public' and c.relkind = 'S'
order by c.relname, caller.role_name;

-- No pg_get_functiondef/prosrc: bodies can contain unrelated private settings.
select p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner_database_role,
       owner_role.rolsuper as owner_is_superuser,
       owner_role.rolbypassrls as owner_bypasses_rls,
       p.prosecdef as security_definer,
       array(select setting from unnest(p.proconfig) setting
             where setting like 'search_path=%' or setting like 'row_security=%') as security_settings,
       p.proacl as explicit_function_acl,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles owner_role on owner_role.oid = p.proowner
where n.nspname = 'public'
order by p.proname, arguments;

select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

select member_role.rolname as member_database_role,
       parent_role.rolname as inherited_database_role,
       m.admin_option
from pg_auth_members m
join pg_roles member_role on member_role.oid = m.member
join pg_roles parent_role on parent_role.oid = m.roleid
where member_role.rolname in ('anon','authenticated','service_role')
order by member_role.rolname, parent_role.rolname;

select caller.role_name,
       has_schema_privilege(caller.role_name,'public','USAGE') as public_schema_usage,
       has_schema_privilege(caller.role_name,'public','CREATE') as public_schema_create
from unnest(array['anon','authenticated','service_role']) caller(role_name);

-- Bucket identifiers/flags only. Never enumerate storage objects or paths.
select id as bucket_id, name as bucket_name, public as publicly_downloadable
from storage.buckets order by id;
commit;
