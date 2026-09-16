-- Closed-domain Tier-1 knowledge managed by CAS Assist administrators.
-- Seeded entries describe application workflows only; institutional rules must
-- continue to come from verified CAS source documents.

create table if not exists public.tier1_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  answer text not null check (char_length(trim(answer)) between 20 and 5000),
  keywords text[] not null default '{}',
  audience_roles public.app_role[] not null default array['student','faculty','staff','super_admin']::public.app_role[],
  state text not null default 'active' check (state in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tier1_knowledge_set_updated_at on public.tier1_knowledge_articles;
create trigger tier1_knowledge_set_updated_at
before update on public.tier1_knowledge_articles
for each row execute function public.set_updated_at();

alter table public.tier1_knowledge_articles enable row level security;

drop policy if exists tier1_knowledge_authenticated_read on public.tier1_knowledge_articles;
create policy tier1_knowledge_authenticated_read on public.tier1_knowledge_articles
for select to authenticated using (
  state = 'active' and public.current_profile_role() = any(audience_roles)
);

drop policy if exists tier1_knowledge_admin_manage on public.tier1_knowledge_articles;
create policy tier1_knowledge_admin_manage on public.tier1_knowledge_articles
for all to authenticated
using (public.current_profile_role() = 'super_admin')
with check (public.current_profile_role() = 'super_admin');

insert into public.tier1_knowledge_articles (slug, title, category, answer, keywords)
values
  (
    'advising-request',
    'Submitting an advising request',
    'advising',
    'Students can submit an advising request from the Requests tab. Open Advising Requests, choose the category that best matches the concern, provide the requested details, and submit it. The request will appear in the CAS staff queue where its status can move from Submitted to Under Evaluation, Action Required, and Resolved. Faculty and staff accounts do not submit student advising requests.',
    array['advising','advisor','request','consultation','concern','ticket','help','queue']
  ),
  (
    'request-status',
    'Checking request status',
    'advising',
    'Students can review the status of their advising and document requests from the Requests tab. Submitted means the request entered the queue; Under Evaluation means it is being reviewed; Action Required means the student should read the staff note and respond as instructed; Resolved means processing is complete.',
    array['status','track','tracking','pending','submitted','evaluation','resolved','queue','request']
  ),
  (
    'document-request',
    'Submitting a document request',
    'documents',
    'Students can open the Requests tab and select Document Request. Choose the document type, state the purpose, select the number of copies, and submit. Progress can be followed in the request list. Any official fee, release time, eligibility requirement, or documentary requirement must be confirmed with the responsible CAS or university office.',
    array['document','documents','certificate','transcript','records','copies','request','tor','diploma']
  ),
  (
    'announcements',
    'Reading CAS announcements',
    'announcements',
    'Open the Updates tab to see announcements addressed to your account role. Select an announcement to expand its complete details. Staff and super administrators can create and publish announcements from Management. Published announcements may be targeted to students, faculty, staff, super administrators, or all account roles.',
    array['announcement','announcements','updates','notice','news','publish','post','details']
  ),
  (
    'room-changes',
    'Room-change updates',
    'room_changes',
    'Faculty can record a room change from the faculty dashboard by selecting an active teaching assignment and entering the new room and reason. Enrolled students can see applicable room changes in Updates and acknowledge that they have read them. Staff and super administrators can monitor overall usage in System Analytics.',
    array['room','classroom','location','change','relocation','moved','venue','faculty']
  ),
  (
    'schedule-view',
    'Viewing faculty schedules',
    'schedules',
    'Faculty accounts can view their active class schedules and assignments on the faculty dashboard. Schedule information shown by CAS Assist comes from the configured academic schedule records. Contact the responsible office if an official schedule differs from what is displayed.',
    array['schedule','class','subject','section','time','faculty','assignment','room']
  ),
  (
    'account-registration',
    'Account registration and access',
    'accounts',
    'Student self-registration requires a New Era University institutional email, full name, student number, and a password of at least eight characters. New accounts begin as student accounts. Role changes and account-governance concerns must be handled by an authorized administrator.',
    array['account','register','registration','email','student number','password','login','sign in','role']
  ),
  (
    'appearance-theme',
    'Changing the application theme',
    'settings',
    'Every account can change the CAS Assist appearance from the Profile page under Appearance. Choose Light, Dark, or System. System follows the device or browser color setting.',
    array['theme','dark','light','appearance','settings','mode','profile','color']
  ),
  (
    'official-policy-boundary',
    'Official requirements and decisions',
    'official_policy',
    'CAS Assist only provides answers supported by its approved knowledge base. It does not invent official requirements, fees, deadlines, grades, eligibility decisions, or approval outcomes. If a verified source is not available for the question, confirm the information with the responsible CAS or university office.',
    array['requirements','requirement','fee','fees','deadline','eligibility','grade','grades','approval','policy','official','enrollment']
  ),
  (
    'ai-helpdesk-scope',
    'CAS Assist AI Helpdesk scope',
    'helpdesk',
    'The AI Helpdesk is a closed-domain informational assistant available to students, faculty, staff, and super administrators. It answers recurring Tier-1 questions using CAS Assist workflow articles and verified CAS knowledge sources only. When confidence is low, it will say that an approved answer was not found and direct the user to the appropriate office instead of guessing.',
    array['ai','chatbot','assistant','helpdesk','scope','source','confidence','tier 1','tier-one']
  ),
  (
    'system-analytics',
    'System analytics for super administrators',
    'analytics',
    'Super administrators can open the Analytics tab to review current system health, account distribution, advising and document performance, feature usage, notification delivery, academic coverage, and AI Helpdesk outcomes. The reporting window can be changed between 7, 30, and 90 days. Other account roles cannot access system-wide analytics.',
    array['analytics','performance','metrics','reports','reporting','usage','health','system','dashboard','super admin']
  )
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  answer = excluded.answer,
  keywords = excluded.keywords,
  audience_roles = excluded.audience_roles,
  state = 'active',
  updated_at = now();
