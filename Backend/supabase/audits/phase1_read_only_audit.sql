-- Read-only inventory for separately authorized execution on a selected project.
-- Does not print identities, email addresses, tokens, or student records.
begin read only;

select version as applied_migration from supabase_migrations.schema_migrations order by version;
select role, state, verification_status, count(*) as account_count
from public.users_account_registry group by role, state, verification_status;
select count(*) as verified_active_students_without_current_active_program
from public.users_account_registry u
where u.role = 'student' and u.state = 'active' and u.verification_status = 'verified'
and not exists (
  select 1 from public.student_program_memberships m
  join public.cas_programs p on p.code = m.program_code
  where m.student_id = u.id and m.is_current and p.is_active
    and m.started_at <= current_date and (m.ended_at is null or m.ended_at >= current_date)
);

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'advising_ticket_pipeline';
select grantee, column_name, privilege_type from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'advising_ticket_pipeline' and privilege_type = 'UPDATE';
select role_name,
  has_any_column_privilege(role_name,'public.advising_ticket_pipeline','UPDATE') as can_update_any_ticket_column
from unnest(array['anon','authenticated','service_role']) role_name;

select n.nspname as schema_name, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proconfig, p.proacl,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.prosecdef or p.proname in ('has_active_cas_access','has_cas_history_access'))
order by p.proname, arguments;
select rolname, rolbypassrls, rolinherit from pg_roles
where rolname in ('anon','authenticated','service_role');
select member_role.rolname as member_role, inherited_role.rolname as inherited_role
from pg_auth_members m join pg_roles member_role on member_role.oid=m.member
join pg_roles inherited_role on inherited_role.oid=m.roleid
where member_role.rolname in ('anon','authenticated','service_role');
select role_name, has_schema_privilege(role_name,'public','CREATE') as can_create_in_public
from unnest(array['anon','authenticated']) role_name;
select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;
select count(*) as ticket_count, count(*) filter(where resolved_at is not null) as resolved_timestamp_count
from public.advising_ticket_pipeline;
commit;
