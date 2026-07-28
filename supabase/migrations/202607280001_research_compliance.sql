-- CAS Assist research-compliance migration.
-- Additive/idempotent where possible. Review docs/database-migration-plan.md
-- and create a verified backup before applying to any remote project.

create extension if not exists vector with schema extensions;

do $$ begin
  create type public.app_role as enum ('student', 'faculty', 'staff', 'super_admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_lifecycle as enum ('active', 'archived_read_only');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.advising_status as enum ('submitted', 'under_evaluation', 'action_required', 'resolved');
exception when duplicate_object then null;
end $$;

create table if not exists public.users_account_registry (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role public.app_role not null default 'student',
  state public.account_lifecycle not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users_account_registry
  add column if not exists verification_status public.verification_status not null default 'pending',
  add column if not exists program_code text,
  add column if not exists year_level smallint,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cas_programs (
  code text primary key,
  name text not null,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_program_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id) on delete cascade,
  program_code text not null references public.cas_programs(code),
  year_level smallint not null check (year_level between 1 and 8),
  block_code text,
  is_current boolean not null default true,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (student_id, program_code, started_at)
);

create table if not exists public.faculty_assignments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.users_account_registry(id) on delete cascade,
  subject_code text not null,
  subject_title text not null,
  section_code text not null,
  block_code text,
  room text,
  day_pattern text,
  starts_at time,
  ends_at time,
  term_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty_id, subject_code, section_code, term_code)
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id) on delete cascade,
  assignment_id uuid not null references public.faculty_assignments(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  state text not null default 'active' check (state in ('active', 'dropped', 'completed')),
  unique (student_id, assignment_id)
);

create table if not exists public.advising_ticket_pipeline (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id),
  category text not null,
  description text not null,
  status text not null default 'submitted',
  priority text not null default 'normal',
  state text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.advising_ticket_pipeline
  add column if not exists public_note text,
  add column if not exists assigned_office text,
  add column if not exists assigned_to uuid references public.users_account_registry(id),
  add column if not exists flagged boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz;

update public.advising_ticket_pipeline
set status = case status
  when 'open' then 'submitted'
  when 'in_progress' then 'under_evaluation'
  when 'pending_review' then 'action_required'
  when 'closed' then 'resolved'
  else status
end
where status in ('open', 'in_progress', 'pending_review', 'closed');

do $$ begin
  if exists (
    select 1 from public.advising_ticket_pipeline
    where status not in ('submitted', 'under_evaluation', 'action_required', 'resolved')
  ) then
    raise exception 'Unknown advising status exists; migration stopped before constraint replacement';
  end if;
end $$;

alter table public.advising_ticket_pipeline
  drop constraint if exists advising_ticket_pipeline_status_check;
alter table public.advising_ticket_pipeline
  add constraint advising_ticket_pipeline_status_check
  check (status in ('submitted', 'under_evaluation', 'action_required', 'resolved'));

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  uploaded_by uuid not null references public.users_account_registry(id),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  visibility text not null default 'student_and_staff'
    check (visibility in ('student_and_staff', 'staff_only')),
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  author_id uuid not null references public.users_account_registry(id),
  note text not null check (char_length(note) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_routing_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  from_office text,
  to_office text,
  from_assignee uuid references public.users_account_registry(id),
  to_assignee uuid references public.users_account_registry(id),
  changed_by uuid not null references public.users_account_registry(id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_audit_logs (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.advising_ticket_pipeline(id) on delete cascade,
  actor_id uuid references public.users_account_registry(id),
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.spatial_logs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.users_account_registry(id),
  assignment_id uuid references public.faculty_assignments(id),
  subject_code text,
  section_code text,
  new_room text not null,
  reason text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spatial_logs
  add column if not exists assignment_id uuid references public.faculty_assignments(id),
  add column if not exists reason text,
  add column if not exists effective_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.spatial_log_acknowledgments (
  spatial_log_id uuid not null references public.spatial_logs(id) on delete cascade,
  student_id uuid not null references public.users_account_registry(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (spatial_log_id, student_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references public.users_account_registry(id),
  state text not null default 'draft',
  priority text not null default 'normal',
  pinned boolean not null default false,
  audience_roles public.app_role[] not null default array['student'::public.app_role],
  audience_block_codes text[],
  publish_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements
  add column if not exists pinned boolean not null default false,
  add column if not exists audience_roles public.app_role[] not null default array['student'::public.app_role],
  add column if not exists audience_block_codes text[],
  add column if not exists publish_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type like 'image/%'),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now()
);

create table if not exists public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('deadline', 'event', 'holiday', 'add_drop', 'schedule')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience_roles public.app_role[] not null,
  audience_block_codes text[],
  created_by uuid not null references public.users_account_registry(id),
  state text not null default 'published' check (state in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_account_registry(id) on delete cascade,
  expo_push_token text not null unique,
  device_key text not null,
  platform text not null check (platform in ('android', 'ios')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_key)
);

create table if not exists public.notification_delivery_logs (
  id bigint generated always as identity primary key,
  event_type text not null,
  event_id uuid not null,
  user_id uuid references public.users_account_registry(id),
  token_id uuid references public.device_push_tokens(id),
  status text not null,
  provider_ticket_id text,
  safe_error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.handbook_source_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('handbook', 'procedure', 'memo')),
  storage_path text not null unique,
  sha256 text not null unique,
  version text not null,
  verification_status public.verification_status not null default 'pending',
  state text not null default 'active' check (state in ('active', 'archived')),
  uploaded_by uuid not null references public.users_account_registry(id),
  verified_by uuid references public.users_account_registry(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.handbook_knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.handbook_source_documents(id) on delete cascade,
  source_document text,
  chunk_index integer not null,
  section_title text,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  state text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.handbook_knowledge_embeddings
  add column if not exists source_document_id uuid references public.handbook_source_documents(id) on delete cascade,
  add column if not exists section_title text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.ai_query_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id),
  query_text text not null,
  category text,
  answer_text text,
  source_ids uuid[],
  confidence double precision,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'deflected', 'unresolved', 'escalated', 'low_confidence')),
  resolved_inquiry boolean,
  escalated_ticket_id uuid references public.advising_ticket_pipeline(id),
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.users_account_registry(id),
  updated_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$ select role::text::public.app_role from public.users_account_registry where id = auth.uid() $$;

create or replace function public.current_profile_state()
returns public.account_lifecycle
language sql stable security definer
set search_path = public
as $$ select state::text::public.account_lifecycle from public.users_account_registry where id = auth.uid() $$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.current_profile_role() in ('staff', 'super_admin'), false) $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.create_registry_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if lower(new.email) not like '%@neu.edu.ph' then
    raise exception 'Institutional email required';
  end if;
  insert into public.users_account_registry
    (id, email, display_name, role, state, verification_status)
  values
    (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
     'student', 'active', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_registry_profile();

create or replace function public.audit_ticket_changes()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.ticket_audit_logs(ticket_id, actor_id, action, old_data, new_data)
  values (
    coalesce(new.id, old.id), auth.uid(), lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists advising_ticket_audit on public.advising_ticket_pipeline;
create trigger advising_ticket_audit
after insert or update or delete on public.advising_ticket_pipeline
for each row execute function public.audit_ticket_changes();

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql
as $$ begin raise exception 'Audit logs are immutable'; end $$;

drop trigger if exists ticket_audit_immutable on public.ticket_audit_logs;
create trigger ticket_audit_immutable
before update or delete on public.ticket_audit_logs
for each row execute function public.prevent_audit_mutation();

create or replace function public.validate_ticket_transition()
returns trigger language plpgsql
as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'submitted' and new.status in ('under_evaluation', 'resolved')) or
    (old.status = 'under_evaluation' and new.status in ('action_required', 'resolved')) or
    (old.status = 'action_required' and new.status in ('under_evaluation', 'resolved'))
  ) then raise exception 'Invalid advising status transition'; end if;
  if new.status = 'resolved' then new.resolved_at = coalesce(new.resolved_at, now()); end if;
  return new;
end $$;

drop trigger if exists advising_ticket_transition on public.advising_ticket_pipeline;
create trigger advising_ticket_transition
before update of status on public.advising_ticket_pipeline
for each row execute function public.validate_ticket_transition();

create or replace function public.acknowledge_room_change(p_spatial_log_id uuid)
returns void language sql security definer
set search_path = public
as $$
  insert into public.spatial_log_acknowledgments(spatial_log_id, student_id)
  select p_spatial_log_id, auth.uid()
  where exists (
    select 1
    from public.spatial_logs sl
    join public.student_enrollments se on se.assignment_id = sl.assignment_id
    where sl.id = p_spatial_log_id and se.student_id = auth.uid() and se.state = 'active'
  )
  on conflict (spatial_log_id, student_id)
  do update set acknowledged_at = now()
$$;

create or replace function public.get_student_queue_estimate(p_student_id uuid)
returns jsonb language sql stable security definer
set search_path = public
as $$
  with active as (
    select id, student_id, created_at,
      row_number() over (order by created_at, id) as queue_position
    from public.advising_ticket_pipeline
    where status in ('submitted', 'under_evaluation')
  ), arrivals as (
    select count(*)::numeric / 168.0 as per_hour
    from public.advising_ticket_pipeline
    where created_at >= now() - interval '168 hours'
  ), mine as (
    select * from active where student_id = p_student_id order by created_at limit 1
  )
  select jsonb_build_object(
    'queuePosition', mine.queue_position,
    'studentsAhead', greatest(coalesce(mine.queue_position, 1) - 1, 0),
    'activeLoad', (select count(*) from active),
    'arrivalsPerHour', arrivals.per_hour,
    'estimatedWaitMinutes',
      case when arrivals.per_hour > 0 then round(((select count(*) from active) / arrivals.per_hour) * 60, 1) end,
    'method', case when arrivals.per_hour > 0 then 'little_law' else 'insufficient_history' end,
    'calculatedAt', now()
  )
  from mine right join arrivals on true
$$;

create or replace function public.get_queue_analytics(p_window_hours integer default 168, p_category text default null)
returns jsonb language sql stable security definer
set search_path = public
as $$
  with scoped as (
    select *,
      extract(epoch from (resolved_at - created_at)) / 60.0 as duration_minutes
    from public.advising_ticket_pipeline
    where created_at >= now() - make_interval(hours => greatest(p_window_hours, 1))
      and (p_category is null or category = p_category)
  ), resolved as (
    select duration_minutes from scoped
    where status = 'resolved' and duration_minutes >= 0
  ), mode_value as (
    select round(duration_minutes)::numeric as value
    from resolved group by round(duration_minutes)
    order by count(*) desc, value limit 1
  )
  select jsonb_build_object(
    'windowHours', p_window_hours,
    'activeLoad', count(*) filter (where status <> 'resolved'),
    'arrivalsPerHour', round(count(*)::numeric / greatest(p_window_hours, 1), 3),
    'resolvedCount', (select count(*) from resolved),
    'minimumMinutes', (select min(duration_minutes) from resolved),
    'maximumMinutes', (select max(duration_minutes) from resolved),
    'mostLikelyMinutes', (select value from mode_value),
    'expectedTriangularMinutes', (
      select (min(duration_minutes) + max(duration_minutes) + (select value from mode_value)) / 3
      from resolved having count(*) >= 3
    ),
    'estimateSource', case when (select count(*) from resolved) >= 3 then 'historical' else 'insufficient_history' end,
    'calculatedAt', now()
  )
  from scoped
$$;

-- RLS is enabled on all application tables.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'users_account_registry','cas_programs','student_program_memberships',
    'faculty_assignments','student_enrollments','advising_ticket_pipeline',
    'ticket_attachments','ticket_internal_notes','ticket_routing_history',
    'ticket_audit_logs','spatial_logs','spatial_log_acknowledgments',
    'announcements','announcement_attachments','academic_calendar_events',
    'device_push_tokens','notification_delivery_logs','handbook_source_documents',
    'handbook_knowledge_embeddings','ai_query_logs','system_settings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Policies are intentionally explicit. Re-running replaces only policies
-- owned by this migration.
drop policy if exists profile_self_read on public.users_account_registry;
create policy profile_self_read on public.users_account_registry
for select using (id = auth.uid() or public.is_staff_or_admin());

drop policy if exists programs_authenticated_read on public.cas_programs;
create policy programs_authenticated_read on public.cas_programs
for select to authenticated using (is_active or public.current_profile_role() = 'super_admin');

drop policy if exists memberships_owner_or_admin on public.student_program_memberships;
create policy memberships_owner_or_admin on public.student_program_memberships
for select using (student_id = auth.uid() or public.current_profile_role() = 'super_admin');

drop policy if exists assignments_faculty_read on public.faculty_assignments;
create policy assignments_faculty_read on public.faculty_assignments
for select using (faculty_id = auth.uid() or public.current_profile_role() = 'super_admin');

drop policy if exists enrollments_owner_faculty_admin_read on public.student_enrollments;
create policy enrollments_owner_faculty_admin_read on public.student_enrollments
for select using (
  student_id = auth.uid()
  or exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
  or public.current_profile_role() = 'super_admin'
);

drop policy if exists tickets_owner_staff_read on public.advising_ticket_pipeline;
create policy tickets_owner_staff_read on public.advising_ticket_pipeline
for select using (student_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists tickets_active_student_insert on public.advising_ticket_pipeline;
create policy tickets_active_student_insert on public.advising_ticket_pipeline
for insert with check (
  student_id = auth.uid()
  and public.current_profile_role() = 'student'
  and public.current_profile_state() = 'active'
  and status = 'submitted'
);

drop policy if exists tickets_staff_update on public.advising_ticket_pipeline;
create policy tickets_staff_update on public.advising_ticket_pipeline
for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists ticket_attachments_owner_staff on public.ticket_attachments;
create policy ticket_attachments_owner_staff on public.ticket_attachments
for select using (
  public.is_staff_or_admin()
  or exists (select 1 from public.advising_ticket_pipeline t where t.id = ticket_id and t.student_id = auth.uid())
);

drop policy if exists ticket_attachments_owner_insert on public.ticket_attachments;
create policy ticket_attachments_owner_insert on public.ticket_attachments
for insert with check (
  uploaded_by = auth.uid()
  and public.current_profile_state() = 'active'
  and (
    public.is_staff_or_admin()
    or exists (
      select 1 from public.advising_ticket_pipeline t
      where t.id = ticket_id and t.student_id = auth.uid()
    )
  )
);

drop policy if exists ticket_notes_staff_only on public.ticket_internal_notes;
create policy ticket_notes_staff_only on public.ticket_internal_notes
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists ticket_routing_staff_only on public.ticket_routing_history;
create policy ticket_routing_staff_only on public.ticket_routing_history
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists ticket_audit_admin_read on public.ticket_audit_logs;
create policy ticket_audit_admin_read on public.ticket_audit_logs
for select using (public.current_profile_role() = 'super_admin');

drop policy if exists spatial_faculty_insert on public.spatial_logs;
create policy spatial_faculty_insert on public.spatial_logs
for insert with check (
  faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
);

drop policy if exists spatial_faculty_update on public.spatial_logs;
create policy spatial_faculty_update on public.spatial_logs
for update using (
  faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
) with check (
  faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
);

drop policy if exists spatial_cohort_read on public.spatial_logs;
create policy spatial_cohort_read on public.spatial_logs
for select using (
  faculty_id = auth.uid()
  or public.current_profile_role() = 'super_admin'
  or exists (
    select 1 from public.student_enrollments se
    where se.assignment_id = spatial_logs.assignment_id and se.student_id = auth.uid() and se.state = 'active'
  )
);

drop policy if exists spatial_ack_owner_faculty on public.spatial_log_acknowledgments;
create policy spatial_ack_owner_faculty on public.spatial_log_acknowledgments
for select using (
  student_id = auth.uid()
  or exists (
    select 1 from public.spatial_logs sl
    where sl.id = spatial_log_id and sl.faculty_id = auth.uid()
  )
);

drop policy if exists announcements_targeted_read on public.announcements;
create policy announcements_targeted_read on public.announcements
for select using (
  public.is_staff_or_admin()
  or (
    state = 'published'
    and (publish_at is null or publish_at <= now())
    and (expires_at is null or expires_at > now())
    and public.current_profile_role() = any(audience_roles)
  )
);

drop policy if exists announcements_staff_manage on public.announcements;
create policy announcements_staff_manage on public.announcements
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists announcement_attachments_targeted_read on public.announcement_attachments;
create policy announcement_attachments_targeted_read on public.announcement_attachments
for select using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and (
        public.is_staff_or_admin()
        or (
          a.state = 'published'
          and (a.publish_at is null or a.publish_at <= now())
          and (a.expires_at is null or a.expires_at > now())
          and public.current_profile_role() = any(a.audience_roles)
        )
      )
  )
);

drop policy if exists announcement_attachments_staff_manage on public.announcement_attachments;
create policy announcement_attachments_staff_manage on public.announcement_attachments
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists calendar_targeted_read on public.academic_calendar_events;
create policy calendar_targeted_read on public.academic_calendar_events
for select using (
  public.is_staff_or_admin()
  or (state = 'published' and public.current_profile_role() = any(audience_roles))
);

drop policy if exists calendar_staff_manage on public.academic_calendar_events;
create policy calendar_staff_manage on public.academic_calendar_events
for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists push_tokens_owner_write on public.device_push_tokens;
create policy push_tokens_owner_write on public.device_push_tokens
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notification_logs_admin_read on public.notification_delivery_logs;
create policy notification_logs_admin_read on public.notification_delivery_logs
for select using (public.current_profile_role() = 'super_admin');

drop policy if exists sources_admin_manage on public.handbook_source_documents;
create policy sources_admin_manage on public.handbook_source_documents
for all using (public.current_profile_role() = 'super_admin')
with check (public.current_profile_role() = 'super_admin');

drop policy if exists knowledge_verified_read on public.handbook_knowledge_embeddings;
create policy knowledge_verified_read on public.handbook_knowledge_embeddings
for select using (
  exists (
    select 1 from public.handbook_source_documents d
    where d.id = source_document_id and d.verification_status = 'verified' and d.state = 'active'
  )
);

drop policy if exists ai_logs_owner_admin_read on public.ai_query_logs;
create policy ai_logs_owner_admin_read on public.ai_query_logs
for select using (student_id = auth.uid() or public.current_profile_role() = 'super_admin');

drop policy if exists ai_logs_active_student_insert on public.ai_query_logs;
create policy ai_logs_active_student_insert on public.ai_query_logs
for insert with check (
  student_id = auth.uid()
  and public.current_profile_role() = 'student'
  and public.current_profile_state() = 'active'
);

drop policy if exists settings_admin_only on public.system_settings;
create policy settings_admin_only on public.system_settings
for all using (public.current_profile_role() = 'super_admin')
with check (public.current_profile_role() = 'super_admin');

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('ticket-attachments', 'ticket-attachments', false, 10485760),
  ('announcement-images', 'announcement-images', false, 5242880),
  ('verified-knowledge-sources', 'verified-knowledge-sources', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- No official program codes or handbook facts are seeded here.
