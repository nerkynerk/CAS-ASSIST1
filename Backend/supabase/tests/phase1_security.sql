-- ISOLATED DATABASE ONLY. Requires all migrations through 202611090001.
-- Run with ON_ERROR_STOP=1 in one psql session after explicitly setting
-- cas_assist.isolated_test = 'true'. The transaction always rolls back.
begin;
do $$ begin
  if current_setting('cas_assist.isolated_test', true) is distinct from 'true' then
    raise exception 'Refusing fixtures: explicitly select an isolated test database';
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

-- Catalog checks inspect effective privileges, including PUBLIC/inheritance.
select pg_temp.assert_true(not has_function_privilege('anon','public.get_student_queue_estimate(uuid)','EXECUTE'), 'anon queue estimate RPC denied');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.get_student_queue_estimate(uuid)','EXECUTE'), 'authenticated direct queue estimate RPC denied');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.get_queue_analytics(integer,text)','EXECUTE'), 'authenticated direct queue analytics RPC denied');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.escalate_ai_query_to_ticket(uuid,uuid,text,text)','EXECUTE') and not has_function_privilege('anon','public.escalate_ai_query_to_ticket(uuid,uuid,text,text)','EXECUTE'), 'service-only escalation RPC denied to direct clients');
select pg_temp.assert_true(has_function_privilege('service_role','public.get_student_queue_estimate(uuid)','EXECUTE') and has_function_privilege('service_role','public.get_queue_analytics(integer,text)','EXECUTE'), 'backend service-role queue RPC privileges preserved');
select pg_temp.assert_true(not has_any_column_privilege('authenticated','public.advising_ticket_pipeline','UPDATE'), 'all direct authenticated ticket UPDATE grants removed');
select pg_temp.assert_true(not has_any_column_privilege('anon','public.advising_ticket_pipeline','UPDATE'), 'all direct anonymous ticket UPDATE grants removed');
select pg_temp.assert_true((select count(*) = 72 from pg_policies where schemaname = 'public' and policyname in ('phase1_insert_access','phase1_update_access','phase1_delete_access') and permissive = 'RESTRICTIVE' and roles = '{public}'), '24 operational tables have restrictive mutation gates for all roles');
select pg_temp.assert_true((select bool_and(proconfig @> array['search_path=pg_catalog, pg_temp']) from pg_proc where oid in ('public.get_student_queue_estimate(uuid)'::regprocedure,'public.get_queue_analytics(integer,text)'::regprocedure,'public.transition_advising_ticket_status(uuid,text)'::regprocedure)), 'privileged queue and ticket RPC search paths exclude writable schemas');

-- Synthetic fixtures contain no institutional program or real student records.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into auth.users(id, email, raw_user_meta_data)
select ('f1000000-0000-4000-8000-' || lpad(to_hex(n),12,'0'))::uuid,
       'phase1-test-' || n || '@neu.edu.ph', '{"display_name":"Synthetic Phase 1 Test"}'::jsonb
from generate_series(1,10) n;
update public.users_account_registry set verification_status = 'verified'
where id::text like 'f1000000-0000-4000-8000-%' and id <> 'f1000000-0000-4000-8000-000000000001';
update public.users_account_registry
set role = (jsonb_populate_record(null::public.users_account_registry, jsonb_build_object('role', case
  when id in ('f1000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000008') then 'staff'
  when id in ('f1000000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000006') then 'faculty'
  when id = 'f1000000-0000-4000-8000-000000000007' then 'super_admin'
  else 'student' end))).role
where id::text like 'f1000000-0000-4000-8000-%';
update public.users_account_registry set state = 'archived_read_only'
where id in ('f1000000-0000-4000-8000-000000000008','f1000000-0000-4000-8000-000000000009');
insert into public.cas_programs(code,name,is_active) values ('PHASE1-SYNTHETIC','Synthetic test program only',true);
insert into public.student_program_memberships(student_id,program_code,year_level)
values ('f1000000-0000-4000-8000-000000000001','PHASE1-SYNTHETIC',1),
       ('f1000000-0000-4000-8000-000000000002','PHASE1-SYNTHETIC',1),
       ('f1000000-0000-4000-8000-000000000003','PHASE1-SYNTHETIC',1);
insert into public.advising_ticket_pipeline(id,student_id,category,description)
values ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','test','Original student A description'),
       ('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000003','test','Original student B description'),
       ('f2000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000009','test','Archived student history'),
       ('f2000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000001','test','Pending student fixture history');
insert into public.faculty_assignments(id,faculty_id,subject_code,subject_title,section_code,term_code)
values ('f3000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000005','TEST1','Synthetic subject','A','TEST'),
       ('f3000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000006','TEST2','Synthetic subject','B','TEST');
insert into public.ai_query_logs(id,student_id,query_text)
values ('f5000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','Synthetic fixture question');

set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000001"}',true);
select pg_temp.assert_true(not public.has_active_cas_access(), 'pending student remains authenticated without operational access');
select pg_temp.assert_true((select count(*) = 1 from public.users_account_registry where id = auth.uid()), 'pending student can read own verification profile');
select pg_temp.assert_true((select count(*) = 0 from public.advising_ticket_pipeline), 'pending student cannot read operational tickets');
select pg_temp.expect_denied($q$insert into public.advising_ticket_pipeline(student_id,category,description) values (auth.uid(),'test','Denied pending request')$q$, 'pending ticket submission denied');
select pg_temp.expect_denied($q$select public.answer_tier1_question('synthetic pending question')$q$, 'pending definer AI query denied');
select pg_temp.expect_denied($q$select public.get_student_queue_estimate('f1000000-0000-4000-8000-000000000003')$q$, 'cross-student direct queue RPC denied');

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000002"}',true);
select pg_temp.assert_true(public.has_active_cas_access(), 'verified current CAS student permitted');
select pg_temp.assert_true((select count(*) = 1 from public.advising_ticket_pipeline where id::text like 'f2000000-%'), 'student sees only own ticket');
select pg_temp.expect_denied($q$select public.get_queue_analytics(168,null)$q$, 'student direct staff analytics denied');
select pg_temp.expect_denied($q$select public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000002','resolved')$q$, 'student ticket transition denied');
select pg_temp.expect_denied($q$insert into public.schedules(faculty_id,subject_code,subject_name,section,room,day,time_start,time_end,semester,academic_year) values (auth.uid(),'TEST','Test','A','A1','monday','08:00','09:00','test','test')$q$, 'student cannot acquire faculty schedule privileges using own ID');
select public.record_tier1_feedback('f5000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select resolved_inquiry from public.ai_query_logs where id = 'f5000000-0000-4000-8000-000000000001'), 'verified student own AI feedback succeeds');

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-00000000000a"}',true);
select pg_temp.assert_true(not public.has_active_cas_access(), 'verified student without trusted membership denied');
select pg_temp.expect_denied($q$select public.answer_tier1_question('synthetic affiliation question')$q$, 'verified nonmember definer AI denied');

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000004"}',true);
select pg_temp.assert_true(public.has_active_cas_access(), 'verified staff permitted');
select public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000001','under_evaluation');
select public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000001','action_required');
select public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000001','under_evaluation');
select public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000001','resolved');
select pg_temp.expect_denied($q$update public.advising_ticket_pipeline set description = 'tampered' where id = 'f2000000-0000-4000-8000-000000000001'$q$, 'staff cannot overwrite student-submitted ticket information');
do $$ begin
  begin
    perform public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000001','submitted');
  exception when raise_exception then
    if sqlerrm = 'Invalid advising status transition' then
      raise notice 'PASS: existing terminal transition restriction preserved';
      return;
    end if;
    raise;
  end;
  raise exception 'FAIL: resolved ticket reopened';
end $$;

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000005"}',true);
insert into public.spatial_logs(id,faculty_id,assignment_id,original_room,new_room)
values ('f4000000-0000-4000-8000-000000000001',auth.uid(),'f3000000-0000-4000-8000-000000000001','Test old','Test new');
select pg_temp.assert_true((select count(*) = 1 from public.spatial_logs where id = 'f4000000-0000-4000-8000-000000000001'), 'verified faculty own classroom change succeeds');
select pg_temp.expect_denied($q$insert into public.spatial_logs(faculty_id,assignment_id,original_room,new_room) values (auth.uid(),'f3000000-0000-4000-8000-000000000002','A','B')$q$, 'faculty cannot modify unrelated assignment');

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000007"}',true);
select pg_temp.assert_true(public.has_active_cas_access(), 'verified administrator permitted');
select public.get_system_analytics(7);
insert into public.system_settings(key,value) values ('phase1_test','true');
select pg_temp.assert_true((select count(*) = 4 from public.ticket_audit_logs where ticket_id = 'f2000000-0000-4000-8000-000000000001' and actor_id = 'f1000000-0000-4000-8000-000000000004' and action = 'update'), 'all four staff transitions retain original audit actor');
select pg_temp.assert_true((select description = 'Original student A description' and resolved_at is not null from public.advising_ticket_pipeline where id = 'f2000000-0000-4000-8000-000000000001'), 'original ticket content and resolution timestamp preserved');

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000008"}',true);
select pg_temp.assert_true(not public.has_active_cas_access() and public.has_cas_history_access(), 'archived verified staff restricted to authorized history');
select pg_temp.expect_denied($q$select public.transition_advising_ticket_status('f2000000-0000-4000-8000-000000000002','resolved')$q$, 'archived staff privileged transition denied');
select pg_temp.expect_denied($q$insert into public.announcements(title,body,created_by) values ('Denied','Denied',auth.uid())$q$, 'archived staff publishing denied');

select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000009"}',true);
select pg_temp.assert_true(not public.has_active_cas_access() and public.has_cas_history_access(), 'archived student history needs no current membership');
select pg_temp.assert_true((select count(*) = 1 from public.advising_ticket_pipeline where id::text like 'f2000000-%'), 'archived student sees own historical ticket only');
select pg_temp.expect_denied($q$insert into public.advising_ticket_pipeline(student_id,category,description) values (auth.uid(),'test','Denied archive request')$q$, 'archived student mutation denied');
select pg_temp.expect_denied($q$select public.record_tier1_feedback('f5000000-0000-4000-8000-000000000001',false)$q$, 'archived definer feedback denied');
select pg_temp.expect_denied($q$select public.acknowledge_room_change('f4000000-0000-4000-8000-000000000001')$q$, 'archived room acknowledgment denied');

reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.users_account_registry set state = 'archived_read_only'
where id in ('f1000000-0000-4000-8000-000000000006','f1000000-0000-4000-8000-000000000007');
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000007"}',true);
select pg_temp.expect_denied($q$insert into public.system_settings(key,value) values ('phase1_archived_denied','true')$q$, 'archived administrator configuration mutation denied');
select pg_temp.expect_denied($q$select public.get_system_analytics(7)$q$, 'archived administrator protected definer access denied');
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-000000000006"}',true);
select pg_temp.expect_denied($q$insert into public.spatial_logs(faculty_id,assignment_id,original_room,new_room) values (auth.uid(),'f3000000-0000-4000-8000-000000000002','A','B')$q$, 'archived faculty own classroom mutation denied');
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-4000-8000-00000000ffff"}',true);
select pg_temp.expect_denied($q$select public.get_system_analytics(7)$q$, 'missing-profile NULL role cannot bypass system analytics guard');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select public.get_student_queue_estimate('f1000000-0000-4000-8000-000000000002');
select public.get_queue_analytics(168,null);
select pg_temp.expect_denied($q$select public.escalate_ai_query_to_ticket('f1000000-0000-4000-8000-000000000009','f5000000-0000-4000-8000-000000000001','test','Denied archived escalation')$q$, 'service-role escalation also validates target lifecycle before any write');
select public.escalate_ai_query_to_ticket('f1000000-0000-4000-8000-000000000002','f5000000-0000-4000-8000-000000000001','test','Permitted synthetic escalation');
reset role;
rollback;
