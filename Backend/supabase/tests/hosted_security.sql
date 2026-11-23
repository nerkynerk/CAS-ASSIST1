-- ISOLATED DATABASE ONLY. Requires Phase 1, authority and hosted security fixes.
-- Run with ON_ERROR_STOP=1 as postgres after explicitly setting
-- cas_assist.isolated_test = 'true'. An empty synthetic table, a simple invoker
-- function and a temporary assertion helper are created; everything rolls back.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;

do $$ begin
  if current_setting('cas_assist.isolated_test', true) is distinct from 'true' then
    raise exception 'Refusing fixtures: explicitly select an isolated test database';
  end if;
  if current_user <> 'postgres' or current_setting('server_version_num')::integer / 10000 <> 17 then
    raise exception 'Run hosted security tests as postgres on isolated PostgreSQL 17';
  end if;
  if to_regclass('public.cas_security_future_table_test') is not null
    or exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'cas_security_future_function_test'
    ) then
    raise exception 'Refusing fixtures: a hosted security test object already exists';
  end if;
end $$;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$ begin
  if condition is distinct from true then raise exception 'FAIL: %', message; end if;
  raise notice 'PASS: %', message;
end $$;

select pg_temp.assert_true((
  select bool_and(
    not has_table_privilege(caller.role_name, c.oid, 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
    and not has_any_column_privilege(caller.role_name, c.oid, 'REFERENCES')
  )
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated'), ('service_role')) caller(role_name)
  where n.nspname = 'public' and c.relkind in ('r', 'p')
), 'API roles have no public table structural or column REFERENCES privileges');

select pg_temp.assert_true((
  select bool_and(not has_schema_privilege(role_name, 'public', 'CREATE'))
  from (values ('anon'), ('authenticated'), ('service_role')) caller(role_name)
), 'API roles cannot create objects in public');

select pg_temp.assert_true((
  select bool_and(has_table_privilege(role_name, table_name, privilege_name))
  from (values
    ('authenticated', 'public.announcements', 'SELECT'),
    ('authenticated', 'public.advising_ticket_pipeline', 'INSERT'),
    ('authenticated', 'public.faculty_assignments', 'SELECT'),
    ('authenticated', 'public.schedules', 'SELECT'),
    ('service_role', 'public.users_account_registry', 'SELECT'),
    ('service_role', 'public.advising_ticket_pipeline', 'INSERT'),
    ('service_role', 'public.notification_delivery_logs', 'INSERT')
  ) preserved(role_name, table_name, privilege_name)
), 'core student, faculty and backend table privileges are preserved');

select pg_temp.assert_true(
  not has_any_column_privilege('anon', 'public.advising_ticket_pipeline', 'UPDATE')
  and not has_any_column_privilege('authenticated', 'public.advising_ticket_pipeline', 'UPDATE'),
  'ticket updates remain restricted to the authorized transition path');

select pg_temp.assert_true((
  select bool_and(
    not has_function_privilege('anon', signature, 'EXECUTE')
    and not has_function_privilege('authenticated', signature, 'EXECUTE')
    and has_function_privilege('service_role', signature, 'EXECUTE')
  )
  from (values
    ('public.get_student_queue_estimate(uuid)'),
    ('public.get_queue_analytics(integer,text)'),
    ('public.escalate_ai_query_to_ticket(uuid,uuid,text,text)'),
    ('public.get_admin_authority_context(uuid,uuid)')
  ) backend_only(signature)
), 'queue, escalation and authority context retain service-only EXECUTE');

select pg_temp.assert_true((
  select bool_and(
    not has_function_privilege('anon', signature, 'EXECUTE')
    and has_function_privilege('authenticated', signature, 'EXECUTE')
  )
  from (values
    ('public.acknowledge_room_change(uuid)'),
    ('public.record_tier1_feedback(uuid,boolean)'),
    ('public.answer_tier1_question(text)'),
    ('public.get_system_analytics(integer)'),
    ('public.transition_advising_ticket_status(uuid,text)')
  ) authenticated_entry(signature)
), 'canonical guarded application RPCs remain authenticated-callable');

select pg_temp.assert_true((
  select bool_and(
    p.oid is not null and p.prosecdef
    and coalesce(p.proconfig @> array['search_path=pg_catalog, pg_temp'], false)
  )
  from unnest(array[
    'public.has_active_cas_access()', 'public.has_cas_history_access()',
    'public.transition_advising_ticket_status(uuid,text)',
    'public.get_student_queue_estimate(uuid)', 'public.get_queue_analytics(integer,text)',
    'public.acknowledge_room_change(uuid)', 'public.record_tier1_feedback(uuid,boolean)',
    'public.current_profile_role()', 'public.current_profile_state()',
    'public.is_staff_or_admin()', 'public.create_registry_profile()',
    'public.audit_ticket_changes()', 'public.escalate_ai_query_to_ticket(uuid,uuid,text,text)',
    'public.answer_tier1_question(text)', 'public.get_system_analytics(integer)',
    'public.get_admin_authority_context(uuid,uuid)'
  ]) required(signature)
  left join pg_proc p on p.oid = to_regprocedure(required.signature)
), 'guarded owner-privileged routines use the fixed trusted search path');

do $$
declare
  push_table regclass := to_regclass('public.push_notification_logs');
  legacy_ack regprocedure := to_regprocedure('public.acknowledge_room_change(uuid,uuid)');
  role_name text;
begin
  if push_table is not null then
    perform pg_temp.assert_true(
      (select relrowsecurity from pg_class where oid = push_table),
      'legacy push logs have RLS enabled');
    foreach role_name in array array['anon', 'authenticated'] loop
      perform pg_temp.assert_true(
        not has_table_privilege(role_name, push_table, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        and not has_any_column_privilege(role_name, push_table, 'SELECT,INSERT,UPDATE,REFERENCES'),
        format('%s has no direct push-log table or column access', role_name));
    end loop;
    perform pg_temp.assert_true(
      has_table_privilege('service_role', push_table, 'SELECT')
      and has_table_privilege('service_role', push_table, 'INSERT')
      and has_table_privilege('service_role', push_table, 'UPDATE')
      and has_table_privilege('service_role', push_table, 'DELETE'),
      'backend push-log CRUD privileges remain available');
  else
    raise notice 'SKIP: optional legacy push-log table is absent';
  end if;

  if legacy_ack is not null then
    foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
      perform pg_temp.assert_true(
        not has_function_privilege(role_name, legacy_ack, 'EXECUTE'),
        format('%s cannot invoke the legacy acknowledgement overload', role_name));
    end loop;
  else
    raise notice 'SKIP: optional legacy acknowledgement overload is absent';
  end if;
end $$;

-- Creating as postgres tests combined global/schema defaults, including PUBLIC.
create table public.cas_security_future_table_test (id integer);
create function public.cas_security_future_function_test()
returns integer language sql stable security invoker
set search_path = pg_catalog, pg_temp
as $$ select 1 $$;

select pg_temp.assert_true((
  select bool_and(
    not has_table_privilege(role_name, 'public.cas_security_future_table_test', 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
    and not has_any_column_privilege(role_name, 'public.cas_security_future_table_test', 'REFERENCES')
  )
  from (values ('anon'), ('authenticated'), ('service_role')) caller(role_name)
), 'future postgres public tables do not regain structural privileges');

select pg_temp.assert_true((
  select bool_and(not has_function_privilege(role_name, 'public.cas_security_future_function_test()', 'EXECUTE'))
  from (values ('anon'), ('authenticated'), ('service_role')) caller(role_name)
), 'future postgres/public routines do not regain client or service EXECUTE by default');

rollback;
