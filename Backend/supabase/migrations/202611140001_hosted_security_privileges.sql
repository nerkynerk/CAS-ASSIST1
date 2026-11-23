-- Review-only preparation. Apply after Phase 1 and the authority foundation,
-- only after the compatibility result and this exact SQL are approved.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
set local search_path = pg_catalog;

do $$
begin
  if current_user <> 'postgres'
    or current_setting('server_version_num')::integer < 170000 then
    raise exception 'Requires the postgres migration owner on PostgreSQL 17+';
  end if;
  if to_regprocedure('public.has_active_cas_access()') is null
    or to_regprocedure('public.get_admin_authority_context(uuid,uuid)') is null
    or (select count(*) from pg_policies
        where schemaname = 'public' and permissive = 'RESTRICTIVE'
          and policyname in ('phase1_insert_access','phase1_update_access','phase1_delete_access')) <> 72 then
    raise exception 'Apply the reviewed Phase 1 and authority foundations first';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
      and (pg_get_userbyid(c.relowner) <> current_user
        or (not c.relrowsecurity and c.relname <> 'push_notification_logs'))
  ) then
    raise exception 'Unexpected public table ownership or RLS state; review compatibility';
  end if;
  if exists (
    select 1 from pg_class c
    where c.oid = to_regclass('public.push_notification_logs') and c.relkind not in ('r','p')
  ) then
    raise exception 'The legacy push-log object must be an ordinary or partitioned table';
  end if;
end $$;

-- Keep existing row privileges and policies; application roles do not need DDL.
revoke create on schema public from public, anon, authenticated, service_role;
do $$
declare relation_name text;
begin
  for relation_name in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
  loop
    execute format(
      'revoke truncate, references, trigger, maintain on table public.%I from public, anon, authenticated, service_role',
      relation_name);
  end loop;
end $$;

-- Only the application's migration owner is changed; managed-role defaults stay intact.
alter default privileges for role postgres
  revoke truncate, references, trigger, maintain on tables
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables
  from public, anon, authenticated, service_role;
-- Per-schema revocation alone cannot remove built-in global PUBLIC EXECUTE.
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

do $$
begin
  if to_regclass('public.push_notification_logs') is not null then
    alter table public.push_notification_logs enable row level security;
    revoke all on table public.push_notification_logs from public, anon, authenticated;
  end if;
  if to_regprocedure('public.acknowledge_room_change(uuid,uuid)') is not null then
    revoke execute on function public.acknowledge_room_change(uuid,uuid)
      from public, anon, authenticated, service_role;
  end if;
end $$;

-- Abort rather than leave inherited/other-grantor privileges silently effective.
do $$
declare caller text; relation_oid oid;
begin
  foreach caller in array array['anon','authenticated','service_role'] loop
    if has_schema_privilege(caller, 'public', 'CREATE') then
      raise exception 'Unexpected effective public CREATE for %', caller;
    end if;
    for relation_oid in
      select c.oid from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p')
    loop
      if has_table_privilege(caller, relation_oid, 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        or has_any_column_privilege(caller, relation_oid, 'REFERENCES') then
        raise exception 'Unexpected effective structural privilege for % on %', caller, relation_oid::regclass;
      end if;
    end loop;
    if to_regprocedure('public.acknowledge_room_change(uuid,uuid)') is not null
      and has_function_privilege(caller, to_regprocedure('public.acknowledge_room_change(uuid,uuid)'), 'EXECUTE') then
      raise exception 'Legacy acknowledgement is still executable by %', caller;
    end if;
    if caller <> 'service_role' and to_regclass('public.push_notification_logs') is not null
      and (has_table_privilege(caller, to_regclass('public.push_notification_logs'), 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        or has_any_column_privilege(caller, to_regclass('public.push_notification_logs'), 'SELECT,INSERT,UPDATE,REFERENCES')) then
      raise exception 'Legacy push logs are still accessible to %', caller;
    end if;
  end loop;
end $$;

commit;
