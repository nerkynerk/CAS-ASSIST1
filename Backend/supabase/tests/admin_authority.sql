-- ISOLATED DATABASE ONLY. Requires all migrations through 202611130001.
-- Run with ON_ERROR_STOP=1 in one owner psql session after explicitly setting
-- cas_assist.isolated_test = 'true'. Synthetic fixtures and grants roll back.
-- This is prepared coverage, not evidence of execution or real JWT acceptance.
begin;

do $$ begin
  if current_setting('cas_assist.isolated_test', true) is distinct from 'true' then
    raise exception 'Refusing fixtures: explicitly select an isolated test database';
  end if;
  if exists (select 1 from cas_admin.authorities) then
    raise exception 'Refusing fixtures: authority table must be empty on the isolated test target';
  end if;
end $$;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$ begin
  if condition is distinct from true then raise exception 'FAIL: %', message; end if;
  raise notice 'PASS: %', message;
end $$;

create function pg_temp.expect_denied(statement text, message text)
returns void language plpgsql as $$ begin
  begin
    execute statement;
  exception when insufficient_privilege then
    raise notice 'PASS: %', message;
    return;
  end;
  raise exception 'FAIL: expected authorization denial: %', message;
end $$;

do $$ declare temporary_schema text; begin
  select nspname into temporary_schema from pg_namespace where oid = pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated, anon, service_role', temporary_schema);
end $$;

grant execute on function pg_temp.assert_true(boolean, text), pg_temp.expect_denied(text, text)
to authenticated, anon, service_role;

-- Explicit ACL and RLS checks, including inherited/PUBLIC privileges.
select pg_temp.assert_true(
  not has_schema_privilege('anon', 'cas_admin', 'USAGE')
  and not has_schema_privilege('authenticated', 'cas_admin', 'USAGE')
  and not has_schema_privilege('service_role', 'cas_admin', 'USAGE'),
  'application roles cannot access the authority schema directly');
select pg_temp.assert_true(
  not has_table_privilege('anon', 'cas_admin.authorities', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('authenticated', 'cas_admin.authorities', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('service_role', 'cas_admin.authorities', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
  'no direct table privileges, including for the service role');
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'cas_admin.authorities'::regclass)
  and not exists (select 1 from pg_policies where schemaname = 'cas_admin' and tablename = 'authorities'),
  'authority RLS is enabled with no ordinary-client policies');
select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.get_admin_authority_context(uuid,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.get_admin_authority_context(uuid,uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.get_admin_authority_context(uuid,uuid)', 'EXECUTE'),
  'only backend service role can invoke the context RPC');
select pg_temp.assert_true(
  (select prosecdef and provolatile = 's' and proconfig @> array['search_path=pg_catalog, pg_temp']
   from pg_proc where oid = 'public.get_admin_authority_context(uuid,uuid)'::regprocedure),
  'context is a stable definer lookup with a fixed safe search path');

-- Fixture IDs/emails are synthetic; no real administrator is designated.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into auth.users(id, email, raw_user_meta_data)
select ('a2100000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid,
       'admin-authority-fixture-' || n || '@neu.edu.ph',
       '{"display_name":"Synthetic authority fixture"}'::jsonb
from generate_series(1, 11) n;
update public.users_account_registry
set role = (jsonb_populate_record(null::public.users_account_registry, jsonb_build_object('role', case
      when id = 'a2100000-0000-4000-8000-000000000003' then 'staff'
      when id = 'a2100000-0000-4000-8000-000000000004' then 'faculty'
      when id = 'a2100000-0000-4000-8000-000000000005' then 'student'
      else 'super_admin' end))).role,
    verification_status = case
      when id = 'a2100000-0000-4000-8000-000000000006' then 'pending'::public.verification_status
      when id = 'a2100000-0000-4000-8000-000000000008' then 'rejected'::public.verification_status
      else 'verified'::public.verification_status end,
    state = (jsonb_populate_record(null::public.users_account_registry, jsonb_build_object('state', case
      when id = 'a2100000-0000-4000-8000-000000000007' then 'archived_read_only'
      else 'active' end))).state
where id::text like 'a2100000-0000-4000-8000-%';
insert into cas_admin.authorities(user_id, level)
select id, 'delegated' from public.users_account_registry
where id::text like 'a2100000-0000-4000-8000-%'
  and id not in ('a2100000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-000000000009', 'a2100000-0000-4000-8000-00000000000a');

select pg_temp.assert_true(
  public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002') is null,
  'delegated designation alone cannot operate without a primary');
insert into cas_admin.authorities(user_id, level)
values ('a2100000-0000-4000-8000-000000000001', 'primary');

set local role service_role;
select pg_temp.assert_true(
  public.get_admin_authority_context('a2100000-0000-4000-8000-000000000001') = jsonb_build_object(
    'actor_id', 'a2100000-0000-4000-8000-000000000001', 'actor_level', 'primary',
    'primary_id', 'a2100000-0000-4000-8000-000000000001',
    'target_id', null, 'target_role', null, 'target_level', null),
  'active verified primary context resolves without a target');
select pg_temp.assert_true(
  public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002', 'a2100000-0000-4000-8000-000000000005') = jsonb_build_object(
    'actor_id', 'a2100000-0000-4000-8000-000000000002', 'actor_level', 'delegated',
    'primary_id', 'a2100000-0000-4000-8000-000000000001',
    'target_id', 'a2100000-0000-4000-8000-000000000005', 'target_role', 'student', 'target_level', 'delegated'),
  'delegated actor and current target facts resolve without granting an action');
select pg_temp.assert_true(
  (public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002', 'a2100000-0000-4000-8000-000000000001')->>'target_level') = 'primary',
  'primary target designation is visible to the trusted backend for protection');
select pg_temp.assert_true(
  (public.get_admin_authority_context('a2100000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-000000000009')->'target_level') = 'null'::jsonb,
  'a super-admin target without authority is not implicitly delegated');
select pg_temp.assert_true(
  public.get_admin_authority_context(null) is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-000000000009') is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-ffffffffffff') is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-ffffffffffff') is null,
  'missing actor, missing authority and missing target fail closed');
select pg_temp.assert_true(
  public.get_admin_authority_context('a2100000-0000-4000-8000-000000000003') is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-000000000004') is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-000000000005') is null,
  'staff, faculty and student cannot use an incorrectly assigned authority record');
select pg_temp.assert_true(
  public.get_admin_authority_context('a2100000-0000-4000-8000-000000000006') is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-000000000007') is null
  and public.get_admin_authority_context('a2100000-0000-4000-8000-000000000008') is null,
  'pending, archived and rejected administrator actors are denied');
select pg_temp.expect_denied($q$select * from cas_admin.authorities$q$, 'service role has no direct authority read');
select pg_temp.expect_denied($q$insert into cas_admin.authorities(user_id,level) values ('a2100000-0000-4000-8000-000000000009','primary')$q$, 'service role cannot insert authority');
select pg_temp.expect_denied($q$update cas_admin.authorities set level = 'primary' where user_id = 'a2100000-0000-4000-8000-000000000002'$q$, 'service role cannot promote delegated authority');
select pg_temp.expect_denied($q$delete from cas_admin.authorities where level = 'primary'$q$, 'service role cannot remove primary');
select pg_temp.expect_denied($q$truncate cas_admin.authorities$q$, 'service role cannot truncate authority');
reset role;

-- An ineligible primary disables only new authority-dependent operations.
update public.users_account_registry set verification_status = 'pending'
where id = 'a2100000-0000-4000-8000-000000000001';
select pg_temp.assert_true(public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002') is null, 'pending primary fails delegated access closed');
update public.users_account_registry set verification_status = 'verified', state = 'archived_read_only'
where id = 'a2100000-0000-4000-8000-000000000001';
select pg_temp.assert_true(public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002') is null, 'archived primary fails delegated access closed');
update public.users_account_registry set state = 'active', role = 'staff'
where id = 'a2100000-0000-4000-8000-000000000001';
select pg_temp.assert_true(public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002') is null, 'demoted primary fails delegated access closed');
update public.users_account_registry set role = 'super_admin'
where id = 'a2100000-0000-4000-8000-000000000001';

update public.users_account_registry set email = 'mismatched-fixture@neu.edu.ph'
where id = 'a2100000-0000-4000-8000-00000000000b';
select pg_temp.assert_true(public.get_admin_authority_context('a2100000-0000-4000-8000-00000000000b') is null, 'registry/Auth identity mismatch denies authority');
update auth.users set email = 'authority-fixture@outside.example'
where id = 'a2100000-0000-4000-8000-00000000000b';
update public.users_account_registry set email = 'authority-fixture@outside.example'
where id = 'a2100000-0000-4000-8000-00000000000b';
select pg_temp.assert_true(public.get_admin_authority_context('a2100000-0000-4000-8000-00000000000b') is null, 'matching noninstitutional identities still deny authority');

-- A unique-index violation exercises conflict enforcement, not a real
-- multi-session concurrency test. True concurrent acceptance remains separate.
do $$ begin
  begin
    insert into cas_admin.authorities(user_id, level)
    values ('a2100000-0000-4000-8000-00000000000a', 'primary');
    raise exception 'FAIL: second primary designation accepted';
  exception when unique_violation then
    raise notice 'PASS: second primary designation rejected by unique index';
  end;
  begin
    insert into cas_admin.authorities(user_id, level)
    values ('a2100000-0000-4000-8000-00000000000a', 'administrator');
    raise exception 'FAIL: unknown authority level accepted';
  exception when check_violation then
    raise notice 'PASS: unknown authority level rejected';
  end;
  begin
    delete from public.users_account_registry where id = 'a2100000-0000-4000-8000-000000000001';
    raise exception 'FAIL: primary profile deletion accepted';
  exception when foreign_key_violation then
    raise notice 'PASS: authority foreign key prevents profile deletion';
  end;
  begin
    delete from auth.users where id = 'a2100000-0000-4000-8000-000000000001';
    raise exception 'FAIL: primary Auth deletion accepted';
  exception when foreign_key_violation then
    raise notice 'PASS: authority foreign key prevents cascaded Auth deletion';
  end;
end $$;

set local role anon;
select pg_temp.expect_denied($q$select public.get_admin_authority_context('a2100000-0000-4000-8000-000000000001')$q$, 'anonymous RPC cannot impersonate primary UUID');
select pg_temp.expect_denied($q$select * from cas_admin.authorities$q$, 'anonymous direct authority read denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"a2100000-0000-4000-8000-000000000002"}', true);
select pg_temp.expect_denied($q$select public.get_admin_authority_context('a2100000-0000-4000-8000-000000000001')$q$, 'delegated JWT cannot call service-only RPC with primary UUID');
select pg_temp.expect_denied($q$select * from cas_admin.authorities$q$, 'delegated authority read denied');
select pg_temp.expect_denied($q$insert into cas_admin.authorities(user_id,level) values ('a2100000-0000-4000-8000-000000000009','primary')$q$, 'delegated primary insertion denied');
select pg_temp.expect_denied($q$update cas_admin.authorities set level = 'primary' where user_id = auth.uid()$q$, 'delegated self-promotion denied');
select pg_temp.expect_denied($q$delete from cas_admin.authorities where level = 'primary'$q$, 'delegated primary removal denied');
select pg_temp.expect_denied($q$truncate cas_admin.authorities$q$, 'delegated bulk authority removal denied');
reset role;

-- Defense in depth: even accidental CRUD grants do not add an authenticated
-- policy. These temporary grants exist only inside the rollback transaction.
grant usage on schema cas_admin to authenticated;
grant select, insert, update, delete on cas_admin.authorities to authenticated;
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from cas_admin.authorities), 'RLS hides authority rows even after temporary select grant');
select pg_temp.expect_denied($q$insert into cas_admin.authorities(user_id,level) values ('a2100000-0000-4000-8000-000000000009','delegated')$q$, 'RLS denies insert after temporary grant');
with changed as (update cas_admin.authorities set level = 'primary' where user_id = auth.uid() returning user_id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'RLS excludes delegated update targets');
with changed as (delete from cas_admin.authorities returning user_id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'RLS excludes delegated bulk delete targets');
reset role;
revoke all on table cas_admin.authorities from authenticated;
revoke all on schema cas_admin from authenticated;

-- Existing super-admin settings and user metadata are not authority sources.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"a2100000-0000-4000-8000-000000000002"}', true);
insert into public.system_settings(key, value)
values ('step2_authority_fixture', '{"primary":"a2100000-0000-4000-8000-000000000002","level":"primary"}');
reset role;
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role":"super_admin","authority":"primary"}'::jsonb
where id = 'a2100000-0000-4000-8000-000000000002';
select pg_temp.assert_true(
  (public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002')->>'actor_level') = 'delegated'
  and (select user_id = 'a2100000-0000-4000-8000-000000000001' from cas_admin.authorities where level = 'primary'),
  'settings and user metadata cannot alter protected authority');

-- Primary designation is not required for existing ordinary operational RPCs.
delete from cas_admin.authorities where level = 'primary';
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"a2100000-0000-4000-8000-000000000002"}', true);
select pg_temp.assert_true(public.has_active_cas_access(), 'existing super-admin CAS eligibility remains unchanged without primary');
select pg_temp.assert_true(public.get_system_analytics(7) is not null, 'existing super-admin analytics remains available without primary');
reset role;
select pg_temp.assert_true(public.get_admin_authority_context('a2100000-0000-4000-8000-000000000002') is null, 'new authority-dependent operations deny after primary removal');

rollback;
