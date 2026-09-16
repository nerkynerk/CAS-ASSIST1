-- One consistent, super-admin-only snapshot for the system analytics page.

create or replace function public.get_system_analytics(p_window_days integer default 30)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  window_days integer := least(greatest(coalesce(p_window_days, 30), 1), 365);
  window_start timestamptz;
begin
  if public.current_profile_role() <> 'super_admin' then
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

revoke all on function public.get_system_analytics(integer) from public;
grant execute on function public.get_system_analytics(integer) to authenticated;
