-- Authenticated database fallback for the Tier-1 assistant. This keeps FAQ
-- answers available when the optional Express gateway cannot be reached.

update public.tier1_knowledge_articles set title = case slug
  when 'advising-request' then 'How do I submit an advising request?'
  when 'request-status' then 'How do I check the status of my request?'
  when 'document-request' then 'How do I submit a document request?'
  when 'announcements' then 'Where can I read or publish announcements?'
  when 'room-changes' then 'How do room-change updates work?'
  when 'schedule-view' then 'Where can faculty view their schedules?'
  when 'account-registration' then 'What is required to create an account?'
  when 'appearance-theme' then 'How do I change the light or dark theme?'
  when 'official-policy-boundary' then 'Can CAS Assist decide official requirements or approvals?'
  when 'ai-helpdesk-scope' then 'What questions can the AI Helpdesk answer?'
  when 'system-analytics' then 'What does System Analytics show?'
  else title
end
where slug in (
  'advising-request','request-status','document-request','announcements','room-changes',
  'schedule-view','account-registration','appearance-theme','official-policy-boundary',
  'ai-helpdesk-scope','system-analytics'
);

create or replace function public.answer_tier1_question(p_query text)
returns jsonb language plpgsql security definer
set search_path = public
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
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if public.current_profile_state() <> 'active' then
    raise exception 'An active account is required' using errcode = '42501';
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

create or replace function public.record_tier1_feedback(p_query_id uuid, p_resolved boolean)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update public.ai_query_logs
  set resolved_inquiry = p_resolved,
      outcome = case when p_resolved then 'deflected' else 'unresolved' end
  where id = p_query_id and student_id = auth.uid();
  if not found then raise exception 'AI query not found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.answer_tier1_question(text) from public;
revoke all on function public.record_tier1_feedback(uuid, boolean) from public;
grant execute on function public.answer_tier1_question(text) to authenticated;
grant execute on function public.record_tier1_feedback(uuid, boolean) to authenticated;
