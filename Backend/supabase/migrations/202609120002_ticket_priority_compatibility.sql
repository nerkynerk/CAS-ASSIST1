-- Convert the prototype ticket_priority enum to the canonical text workflow.
alter table public.advising_ticket_pipeline
  alter column priority drop default;
alter table public.advising_ticket_pipeline
  alter column priority type text using priority::text;
update public.advising_ticket_pipeline
set priority = 'normal'
where priority = 'medium';
alter table public.advising_ticket_pipeline
  alter column priority set default 'normal';

alter table public.advising_ticket_pipeline
  drop constraint if exists advising_ticket_pipeline_priority_check;
alter table public.advising_ticket_pipeline
  add constraint advising_ticket_pipeline_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));
