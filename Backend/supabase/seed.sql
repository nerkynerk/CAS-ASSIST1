-- Explicitly non-production demo configuration.
-- This contains no real person, credential, official CAS program, or policy.

insert into public.cas_programs (code, name, department, is_active)
values ('DEMO-PROGRAM', 'DEMO — Replace with an approved CAS program', 'DEMO', false)
on conflict (code) do update
set name = excluded.name, department = excluded.department, is_active = false;

insert into public.system_settings (key, value, description)
values (
  'demo_seed_notice',
  '{"demo": true, "official": false}'::jsonb,
  'DEMO marker only. Do not present seed content as official CAS information.'
)
on conflict (key) do update
set value = excluded.value, description = excluded.description, updated_at = now();
