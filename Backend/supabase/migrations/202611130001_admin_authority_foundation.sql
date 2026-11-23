-- Step 2 foundation only. Requires migrations through 202611090001.
-- Apply first to an approved isolated Supabase target. No account or authority
-- is assigned here; initial designation is a separately controlled owner action.
begin;

-- Do not add this schema to PostgREST's exposed schemas. A naming collision
-- intentionally stops the migration rather than adopting an unknown object.
create schema cas_admin;
revoke all on schema cas_admin from public, anon, authenticated, service_role;

create table cas_admin.authorities (
  user_id uuid primary key references public.users_account_registry(id) on delete restrict,
  level text not null check (level in ('primary', 'delegated')),
  created_at timestamptz not null default now()
);

-- PostgreSQL enforces uniqueness across concurrent transactions too. Zero
-- primaries is permitted for controlled bootstrap, but authorization then denies.
create unique index admin_authorities_single_primary
  on cas_admin.authorities (level) where level = 'primary';

alter table cas_admin.authorities enable row level security;
revoke all on table cas_admin.authorities from public, anon, authenticated, service_role;

-- No client policies or direct service-role grants: only the trusted database
-- owner maintains designations. Service BYPASSRLS does not bypass table ACLs.
-- This function is a read-only context lookup, never a grant/mutation endpoint.
create function public.get_admin_authority_context(p_actor_id uuid, p_target_id uuid default null)
returns jsonb language sql stable security definer
set search_path = pg_catalog, pg_temp
as $$
  with eligible_admins as (
    select u.id, a.level
    from cas_admin.authorities a
    join public.users_account_registry u on u.id = a.user_id
    join auth.users identity_user on identity_user.id = u.id
    where u.role = 'super_admin' and u.state = 'active'
      and u.verification_status = 'verified'
      and lower(u.email) = lower(identity_user.email)
      and lower(identity_user.email) ~ '^[^@[:space:]]+@neu[.]edu[.]ph$'
  ), designated_primary as (
    select id from eligible_admins
    where level = 'primary'
      and (select count(*) from cas_admin.authorities where level = 'primary') = 1
  ), actor as (
    select id, level from eligible_admins where id = p_actor_id
  ), target as (
    select u.id, u.role::text as role, a.level
    from public.users_account_registry u
    left join cas_admin.authorities a on a.user_id = u.id
    where u.id = p_target_id
  )
  select jsonb_build_object(
    'actor_id', actor.id,
    'actor_level', actor.level,
    'primary_id', designated_primary.id,
    'target_id', target.id,
    'target_role', target.role,
    'target_level', target.level
  )
  from actor cross join designated_primary
  left join target on true
  where (p_target_id is null or target.id is not null)
    and (
      (actor.level = 'primary' and actor.id = designated_primary.id)
      or (actor.level = 'delegated' and actor.id <> designated_primary.id)
    )
$$;

revoke all on function public.get_admin_authority_context(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_admin_authority_context(uuid, uuid) to service_role;

comment on function public.get_admin_authority_context(uuid, uuid) is
  'Backend-only authority snapshot. Actor UUID must come from a freshly validated Auth token; callers must enforce action/target rules and revalidate before future privileged writes.';

commit;
