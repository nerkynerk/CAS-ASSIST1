-- Store the student number supplied during student self-registration.
-- The column remains nullable for pre-existing and non-student accounts.

alter table public.users_account_registry
  add column if not exists student_number text;

do $$ begin
  alter table public.users_account_registry
    add constraint users_account_registry_student_number_format
    check (
      student_number is null
      or (
        student_number ~ '^[0-9-]{5,24}$'
        and length(regexp_replace(student_number, '[^0-9]', '', 'g')) >= 5
      )
    );
exception when duplicate_object then null;
end $$;

create unique index if not exists users_account_registry_student_number_unique
  on public.users_account_registry (student_number)
  where student_number is not null;

create or replace function public.create_registry_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  normalized_student_number text;
begin
  if lower(new.email) not like '%@neu.edu.ph' then
    raise exception 'Institutional email required';
  end if;

  normalized_student_number := nullif(
    regexp_replace(coalesce(new.raw_user_meta_data->>'student_number', ''), '\s', '', 'g'),
    ''
  );

  insert into public.users_account_registry
    (id, email, display_name, student_number, role, state, verification_status)
  values
    (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
     normalized_student_number, 'student', 'active', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;
