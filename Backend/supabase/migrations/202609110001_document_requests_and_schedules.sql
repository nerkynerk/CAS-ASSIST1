-- Tables required by the document-request and faculty-schedule screens.
-- This migration is additive so it can run against projects that already
-- contain earlier versions of either table.

do $$ begin
  create type public.document_request_status as enum (
    'submitted',
    'under_evaluation',
    'action_required',
    'processing',
    'ready_for_pickup',
    'completed',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_type as enum (
    'transcript_of_records',
    'certificate_of_enrollment',
    'certificate_of_good_moral',
    'honorable_dismissal',
    'diploma',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.schedule_day as enum (
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users_account_registry(id) on delete restrict,
  handled_by uuid references public.users_account_registry(id) on delete set null,
  document_type public.document_type not null,
  purpose text not null check (char_length(trim(purpose)) between 1 and 300),
  copies smallint not null default 1 check (copies between 1 and 10),
  status public.document_request_status not null default 'submitted',
  remarks text,
  state public.account_lifecycle not null default 'active',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_requests_student_idx
  on public.document_requests (student_id, requested_at desc);
create index if not exists document_requests_status_idx
  on public.document_requests (status, requested_at desc);

drop trigger if exists document_requests_set_updated_at on public.document_requests;
create trigger document_requests_set_updated_at
before update on public.document_requests
for each row execute function public.set_updated_at();

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.users_account_registry(id) on delete restrict,
  subject_code text not null,
  subject_name text not null,
  section text not null,
  room text not null,
  day public.schedule_day not null,
  time_start time not null,
  time_end time not null,
  semester text not null,
  academic_year text not null,
  state public.account_lifecycle not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_time_order check (time_end > time_start)
);

create index if not exists schedules_faculty_day_idx
  on public.schedules (faculty_id, day, time_start);
create index if not exists schedules_section_idx
  on public.schedules (section, day, time_start);

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

alter table public.document_requests enable row level security;
alter table public.schedules enable row level security;

drop policy if exists document_requests_read on public.document_requests;
create policy document_requests_read on public.document_requests
for select to authenticated
using (
  student_id = auth.uid()
  or public.current_profile_role() in ('staff', 'super_admin')
);

drop policy if exists document_requests_student_insert on public.document_requests;
create policy document_requests_student_insert on public.document_requests
for insert to authenticated
with check (
  student_id = auth.uid()
  and public.current_profile_role() = 'student'
  and public.current_profile_state() = 'active'
);

drop policy if exists document_requests_staff_update on public.document_requests;
create policy document_requests_staff_update on public.document_requests
for update to authenticated
using (
  public.current_profile_role() in ('staff', 'super_admin')
  and public.current_profile_state() = 'active'
)
with check (
  public.current_profile_role() in ('staff', 'super_admin')
  and public.current_profile_state() = 'active'
);

drop policy if exists schedules_read on public.schedules;
create policy schedules_read on public.schedules
for select to authenticated
using (
  faculty_id = auth.uid()
  or public.current_profile_role() in ('staff', 'super_admin')
);

drop policy if exists schedules_manage on public.schedules;
create policy schedules_manage on public.schedules
for all to authenticated
using (
  public.current_profile_state() = 'active'
  and (
    faculty_id = auth.uid()
    or public.current_profile_role() in ('staff', 'super_admin')
  )
)
with check (
  public.current_profile_state() = 'active'
  and (
    faculty_id = auth.uid()
    or public.current_profile_role() in ('staff', 'super_admin')
  )
);
