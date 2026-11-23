-- Hosted review draft for rueukwztuflgpuvopmlu. Apply only after approval.
-- Derived from 202611090001_phase1_security_hardening.sql.
-- Phase 1 security hardening. Apply only after testing in an isolated Supabase
-- database and explicit release approval. No account statuses or records change.
begin;

-- Memberships/programs are administrative data, not self-reported profile fields.
-- A verified non-student registry role is the existing personnel attestation;
-- there is no separate authoritative faculty/staff CAS roster in this schema.
create or replace function public.has_active_cas_access()
returns boolean language sql stable security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1 from public.users_account_registry u
    join auth.users auth_user on auth_user.id = u.id
    where u.id = auth.uid()
      and u.state = 'active' and u.verification_status = 'verified'
      and lower(u.email) = lower(auth_user.email)
      and lower(auth_user.email) ~ '^[^@[:space:]]+@neu[.]edu[.]ph$'
      and (
        u.role in ('faculty', 'staff', 'super_admin')
        or (u.role = 'student' and exists (
          select 1 from public.student_program_memberships m
          join public.cas_programs p on p.code = m.program_code
          where m.student_id = u.id and m.is_current and p.is_active
            and m.started_at <= current_date
            and (m.ended_at is null or m.ended_at >= current_date)
        ))
      )
  )
$$;

create or replace function public.has_cas_history_access()
returns boolean language sql stable security definer
set search_path = pg_catalog, pg_temp
as $$
  select public.has_active_cas_access() or exists (
    select 1 from public.users_account_registry u
    join auth.users auth_user on auth_user.id = u.id
    where u.id = auth.uid()
      and u.state = 'archived_read_only' and u.verification_status = 'verified'
      and lower(u.email) = lower(auth_user.email)
      and lower(auth_user.email) ~ '^[^@[:space:]]+@neu[.]edu[.]ph$'
  )
$$;

revoke all on function public.has_active_cas_access() from public, anon;
revoke all on function public.has_cas_history_access() from public, anon;
grant execute on function public.has_active_cas_access() to authenticated, service_role;
grant execute on function public.has_cas_history_access() to authenticated, service_role;

-- Restrictive policies AND with existing ownership/role policies. They do not
-- grant new access or replace row scope. Archived verified accounts keep only
-- reads already permitted by those existing policies, without current enrollment.
do $$
declare relation_name text;
begin
  foreach relation_name in array array[
    'users_account_registry', 'cas_programs', 'student_program_memberships',
    'faculty_assignments', 'student_enrollments', 'advising_ticket_pipeline',
    'ticket_attachments', 'ticket_internal_notes', 'ticket_routing_history',
    'ticket_audit_logs', 'spatial_logs', 'spatial_log_acknowledgments',
    'announcements', 'announcement_attachments', 'academic_calendar_events',
    'device_push_tokens', 'notification_delivery_logs', 'handbook_source_documents',
    'handbook_knowledge_embeddings', 'ai_query_logs', 'system_settings',
    'document_requests', 'schedules', 'tier1_knowledge_articles'
  ] loop
    execute format('create policy phase1_insert_access on public.%I as restrictive for insert to public with check (public.has_active_cas_access())', relation_name);
    execute format('create policy phase1_update_access on public.%I as restrictive for update to public using (public.has_active_cas_access()) with check (public.has_active_cas_access())', relation_name);
    execute format('create policy phase1_delete_access on public.%I as restrictive for delete to public using (public.has_active_cas_access())', relation_name);
    if relation_name not in ('users_account_registry', 'cas_programs', 'student_program_memberships') then
      execute format('create policy phase1_read_access on public.%I as restrictive for select to public using (public.has_cas_history_access())', relation_name);
    end if;
  end loop;
end $$;

create policy phase1_program_read_access on public.cas_programs
as restrictive for select to public using (auth.uid() is not null);

-- Pending accounts can read their own onboarding profile/membership and the
-- published program catalog. They cannot enumerate other accounts/memberships.
create policy phase1_profile_read_access on public.users_account_registry
as restrictive for select to public
using (id = auth.uid() or public.has_cas_history_access());
create policy phase1_membership_read_access on public.student_program_memberships
as restrictive for select to public
using (student_id = auth.uid() or public.has_cas_history_access());

-- Ownership alone does not confer faculty permissions (the legacy schedules
-- policy accepted any role with faculty_id = auth.uid()).
drop policy if exists schedules_manage on public.schedules;
create policy schedules_manage on public.schedules for all to authenticated
using (
  public.has_active_cas_access() and (
    public.current_profile_role() in ('staff', 'super_admin')
    or (public.current_profile_role() = 'faculty' and faculty_id = auth.uid())
  )
)
with check (
  public.has_active_cas_access() and (
    public.current_profile_role() in ('staff', 'super_admin')
    or (public.current_profile_role() = 'faculty' and faculty_id = auth.uid())
  )
);
drop policy if exists spatial_faculty_update on public.spatial_logs;
create policy spatial_faculty_update on public.spatial_logs for update to authenticated
using (
  public.current_profile_role() = 'faculty' and faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
)
with check (
  public.current_profile_role() = 'faculty' and faculty_id = auth.uid()
  and exists (select 1 from public.faculty_assignments fa where fa.id = assignment_id and fa.faculty_id = auth.uid())
);

-- The four Storage policies are deferred because postgres lacks policy ownership on storage.objects.

-- RLS does not restrict columns. Remove both table and historical column grants.
drop policy if exists tickets_staff_update on public.advising_ticket_pipeline;
revoke update on public.advising_ticket_pipeline from public, anon, authenticated;
do $$
declare attribute_name text;
begin
  for attribute_name in
    select attname from pg_attribute
    where attrelid = 'public.advising_ticket_pipeline'::regclass
      and attnum > 0 and not attisdropped
  loop
    execute format('revoke update (%I) on public.advising_ticket_pipeline from public, anon, authenticated', attribute_name);
  end loop;
end $$;

create or replace function public.transition_advising_ticket_status(p_ticket_id uuid, p_status text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
declare result jsonb;
begin
  if not public.has_active_cas_access()
    or coalesce(public.current_profile_role() not in ('staff', 'super_admin'), true) then
    raise exception 'Verified active CAS staff access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('submitted','under_evaluation','action_required','resolved') then
    raise exception 'Invalid advising status' using errcode = '22023';
  end if;

  -- Row locking serializes transitions. The existing transition trigger keeps
  -- its exact adjacency rules and resolution timestamp; the audit trigger keeps
  -- the original end-user auth.uid() as actor in the same transaction.
  perform 1 from public.advising_ticket_pipeline where id = p_ticket_id for update;
  if not found then raise exception 'Advising ticket not found' using errcode = 'P0002'; end if;
  update public.advising_ticket_pipeline set status = p_status, updated_at = now()
  where id = p_ticket_id
  returning jsonb_build_object('id', id, 'status', status, 'updated_at', updated_at) into result;
  return result;
end $$;
revoke all on function public.transition_advising_ticket_status(uuid, text) from public, anon, service_role;
grant execute on function public.transition_advising_ticket_status(uuid, text) to authenticated;

-- The Express gateway validates the original end user. A service-role call has
-- no original auth.uid(); these RPCs intentionally have no end-user UID check.
revoke all on function public.get_student_queue_estimate(uuid) from public, anon, authenticated;
revoke all on function public.get_queue_analytics(integer, text) from public, anon, authenticated;
grant execute on function public.get_student_queue_estimate(uuid) to service_role;
grant execute on function public.get_queue_analytics(integer, text) to service_role;
alter function public.get_student_queue_estimate(uuid) set search_path = pg_catalog, pg_temp;
alter function public.get_queue_analytics(integer, text) set search_path = pg_catalog, pg_temp;

create or replace function public.acknowledge_room_change(p_spatial_log_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if not public.has_active_cas_access() or public.current_profile_role() is distinct from 'student'::public.app_role then
    raise exception 'Verified active CAS student access required' using errcode = '42501';
  end if;
  insert into public.spatial_log_acknowledgments(spatial_log_id, student_id)
  select p_spatial_log_id, auth.uid()
  where exists (
    select 1 from public.spatial_logs sl
    join public.student_enrollments se on se.assignment_id = sl.assignment_id
    where sl.id = p_spatial_log_id and se.student_id = auth.uid() and se.state = 'active'
  )
  on conflict (spatial_log_id, student_id) do update set acknowledged_at = now();
end $$;
revoke all on function public.acknowledge_room_change(uuid) from public, anon;
grant execute on function public.acknowledge_room_change(uuid) to authenticated;

create or replace function public.record_tier1_feedback(p_query_id uuid, p_resolved boolean)
returns void language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if not public.has_active_cas_access() then
    raise exception 'Verified active CAS access required' using errcode = '42501';
  end if;
  update public.ai_query_logs
  set resolved_inquiry = p_resolved,
      outcome = case when p_resolved then 'deflected' else 'unresolved' end
  where id = p_query_id and student_id = auth.uid();
  if not found then raise exception 'AI query not found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.record_tier1_feedback(uuid, boolean) from public, anon;
grant execute on function public.record_tier1_feedback(uuid, boolean) to authenticated;

-- Harden fixed paths for existing helpers/trigger functions. No bodies change.
alter function public.current_profile_role() set search_path = pg_catalog, pg_temp;
alter function public.current_profile_state() set search_path = pg_catalog, pg_temp;
alter function public.is_staff_or_admin() set search_path = pg_catalog, pg_temp;
alter function public.create_registry_profile() set search_path = pg_catalog, pg_temp;
alter function public.audit_ticket_changes() set search_path = pg_catalog, pg_temp;

create or replace function public.escalate_ai_query_to_ticket(
  p_student_id uuid, p_query_id uuid, p_category text, p_justification text
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
declare ticket_id uuid;
begin
  -- This service-only RPC receives the backend-validated end-user ID explicitly.
  -- auth.uid() does not represent that student on a service-role connection.
  if not exists (
    select 1 from public.users_account_registry u
    join auth.users auth_user on auth_user.id = u.id
    join public.student_program_memberships m on m.student_id = u.id
    join public.cas_programs p on p.code = m.program_code
    where u.id = p_student_id and u.role = 'student'
      and u.state = 'active' and u.verification_status = 'verified'
      and lower(u.email) = lower(auth_user.email)
      and lower(auth_user.email) ~ '^[^@[:space:]]+@neu[.]edu[.]ph$'
      and m.is_current and p.is_active and m.started_at <= current_date
      and (m.ended_at is null or m.ended_at >= current_date)
  ) then
    raise exception 'Verified active CAS student access required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.ai_query_logs where id = p_query_id and student_id = p_student_id
  ) then
    raise exception 'AI query does not belong to the student';
  end if;
  insert into public.advising_ticket_pipeline(student_id,category,description,status,priority,state)
  values(p_student_id,p_category,p_justification,'submitted','normal','active')
  returning id into ticket_id;
  update public.ai_query_logs set outcome = 'escalated', escalated_ticket_id = ticket_id
  where id = p_query_id and student_id = p_student_id;
  return jsonb_build_object('id',ticket_id,'status','submitted');
end $$;
revoke all on function public.escalate_ai_query_to_ticket(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.escalate_ai_query_to_ticket(uuid, uuid, text, text) to service_role;

-- Authenticated SECURITY DEFINER entry points below require explicit guards;
-- RLS cannot protect reads/writes performed with their owner's privileges.

create or replace function public.answer_tier1_question(p_query text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  caller_role public.app_role;
  normalized_query text;
  query_terms text[];
  term_count integer;
  best record;
  confidence numeric := 0;
  query_id uuid;
  response_answer text;
  response_category text;
  is_deflected boolean := false;
begin
  if not public.has_active_cas_access() then
    raise exception 'Verified active CAS access required' using errcode = '42501';
  end if;

  caller_role := public.current_profile_role();
  normalized_query := trim(lower(regexp_replace(coalesce(p_query, ''), '[^a-zA-Z0-9]+', ' ', 'g')));
  if char_length(normalized_query) < 3 or char_length(normalized_query) > 2000 then
    raise exception 'Question must contain between 3 and 2000 characters';
  end if;

  select coalesce(array_agg(distinct term), '{}'), count(distinct term)
  into query_terms, term_count
  from unnest(regexp_split_to_array(normalized_query, '\s+')) term
  where char_length(term) > 1
    and term not in ('a','an','and','are','can','do','for','from','how','i','in','is','it','me','my','of','on','please','the','to','what','when','where','which','with');

  select article.*, scored.matches, scored.weighted_score
  into best
  from public.tier1_knowledge_articles article
  cross join lateral (
    select
      count(*) filter (
        where lower(article.title) like '%' || term || '%'
           or lower(article.answer) like '%' || term || '%'
           or exists (select 1 from unnest(article.keywords) keyword where lower(keyword) like '%' || term || '%')
      ) as matches,
      coalesce(sum(
        case
          when exists (select 1 from unnest(article.keywords) keyword where lower(keyword) like '%' || term || '%') then 3
          when lower(article.title) like '%' || term || '%' then 2
          when lower(article.answer) like '%' || term || '%' then 1
          else 0
        end
      ), 0) as weighted_score
    from unnest(query_terms) term
  ) scored
  where article.state = 'active'
    and caller_role = any(article.audience_roles)
  order by scored.matches desc, scored.weighted_score desc, article.updated_at desc
  limit 1;

  if best.id is not null and term_count > 0 then
    confidence := least(0.98, (best.matches::numeric / term_count) * 0.72 + (best.weighted_score::numeric / (term_count * 3)) * 0.26);
    is_deflected := best.matches > 0 and confidence >= 0.42;
  end if;

  if is_deflected then
    response_answer := best.answer;
    response_category := best.category;
  else
    response_answer := 'I could not find a sufficiently confident answer in the approved CAS knowledge base. Please rephrase the question with more detail or confirm it with the responsible CAS or university office. I will not guess about official requirements, fees, deadlines, grades, or approval decisions.';
    response_category := coalesce(best.category, 'general_inquiry');
  end if;

  insert into public.ai_query_logs
    (student_id, query_text, category, answer_text, source_ids, confidence, outcome)
  values
    (auth.uid(), p_query, response_category, response_answer, '{}', confidence,
     case when is_deflected then 'deflected' else 'low_confidence' end)
  returning id into query_id;

  return jsonb_build_object(
    'queryId', query_id,
    'isDeflected', is_deflected,
    'answer', response_answer,
    'confidence', confidence,
    'category', response_category,
    'source', case when is_deflected then jsonb_build_object('title', best.title, 'type', 'tier1') else null end
  );
end $$;

revoke all on function public.answer_tier1_question(text) from public, anon;
grant execute on function public.answer_tier1_question(text) to authenticated;

create or replace function public.get_system_analytics(p_window_days integer default 30)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  window_days integer := least(greatest(coalesce(p_window_days, 30), 1), 365);
  window_start timestamptz;
begin
  if not public.has_active_cas_access() or public.current_profile_role() is distinct from 'super_admin'::public.app_role then
    raise exception 'Super administrator access required' using errcode = '42501';
  end if;

  window_start := now() - make_interval(days => window_days);

  return jsonb_build_object(
    'generatedAt', now(),
    'windowDays', window_days,
    'users', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where state = 'active'),
        'archived', count(*) filter (where state = 'archived_read_only'),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'pendingVerification', count(*) filter (where verification_status = 'pending'),
        'student', count(*) filter (where role = 'student'),
        'faculty', count(*) filter (where role = 'faculty'),
        'staff', count(*) filter (where role = 'staff'),
        'superAdmin', count(*) filter (where role = 'super_admin')
      ) from public.users_account_registry
    ),
    'advising', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'submitted', count(*) filter (where status = 'submitted'),
        'underEvaluation', count(*) filter (where status = 'under_evaluation'),
        'actionRequired', count(*) filter (where status = 'action_required'),
        'resolved', count(*) filter (where status = 'resolved'),
        'resolutionRate', coalesce(round(100.0 * count(*) filter (where status = 'resolved') / nullif(count(*), 0), 1), 0),
        'averageResolutionMinutes', coalesce(round(avg(extract(epoch from (resolved_at - created_at)) / 60.0) filter (where resolved_at is not null), 1), 0)
      ) from public.advising_ticket_pipeline where state = 'active'
    ),
    'documents', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where requested_at >= window_start),
        'pending', count(*) filter (where status in ('submitted', 'under_evaluation', 'action_required', 'processing')),
        'ready', count(*) filter (where status = 'ready_for_pickup'),
        'completed', count(*) filter (where status = 'completed'),
        'rejected', count(*) filter (where status = 'rejected'),
        'completionRate', coalesce(round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*), 0), 1), 0)
      ) from public.document_requests where state = 'active'
    ),
    'announcements', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'published', count(*) filter (where state = 'published'),
        'draft', count(*) filter (where state = 'draft'),
        'archived', count(*) filter (where state = 'archived'),
        'pinned', count(*) filter (where pinned)
      ) from public.announcements
    ),
    'roomChanges', (
      select jsonb_build_object(
        'total', (select count(*) from public.spatial_logs),
        'newInWindow', (select count(*) from public.spatial_logs where created_at >= window_start),
        'activeNow', (select count(*) from public.spatial_logs where effective_at <= now() and (expires_at is null or expires_at > now())),
        'acknowledgements', (select count(*) from public.spatial_log_acknowledgments)
      )
    ),
    'aiHelpdesk', (
      select jsonb_build_object(
        'total', count(*),
        'newInWindow', count(*) filter (where created_at >= window_start),
        'resolved', count(*) filter (where resolved_inquiry is true or outcome = 'deflected'),
        'escalated', count(*) filter (where outcome = 'escalated' or escalated_ticket_id is not null),
        'lowConfidence', count(*) filter (where outcome = 'low_confidence'),
        'averageConfidence', coalesce(round((avg(confidence) * 100)::numeric, 1), 0),
        'resolutionRate', coalesce(round(100.0 * count(*) filter (where resolved_inquiry is true or outcome = 'deflected') / nullif(count(*), 0), 1), 0)
      ) from public.ai_query_logs
    ),
    'notifications', (
      select jsonb_build_object(
        'deliveries', (select count(*) from public.notification_delivery_logs),
        'newInWindow', (select count(*) from public.notification_delivery_logs where created_at >= window_start),
        'successful', (select count(*) from public.notification_delivery_logs where lower(status) in ('sent', 'delivered', 'success', 'ok')),
        'failed', (select count(*) from public.notification_delivery_logs where lower(status) in ('failed', 'error', 'rejected')),
        'enabledDevices', (select count(*) from public.device_push_tokens where enabled),
        'successRate', coalesce((select round(100.0 * count(*) filter (where lower(status) in ('sent', 'delivered', 'success', 'ok')) / nullif(count(*), 0), 1) from public.notification_delivery_logs), 0)
      )
    ),
    'academics', (
      select jsonb_build_object(
        'programs', (select count(*) from public.cas_programs where is_active),
        'facultyAssignments', (select count(*) from public.faculty_assignments where is_active),
        'studentEnrollments', (select count(*) from public.student_enrollments where state = 'active'),
        'schedules', (select count(*) from public.schedules where state = 'active'),
        'calendarEvents', (select count(*) from public.academic_calendar_events where state = 'published')
      )
    ),
    'knowledge', (
      select jsonb_build_object(
        'sourceDocuments', (select count(*) from public.handbook_source_documents where state = 'active'),
        'verifiedDocuments', (select count(*) from public.handbook_source_documents where state = 'active' and verification_status = 'verified'),
        'knowledgeChunks', (select count(*) from public.handbook_knowledge_embeddings where state = 'active')
      )
    )
  );
end $$;

revoke all on function public.get_system_analytics(integer) from public, anon;
grant execute on function public.get_system_analytics(integer) to authenticated;

commit;
