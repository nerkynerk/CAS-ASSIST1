# CAS ASSIST — Product Requirements Document (PRD)

> **Status:** Proposed requirements grounded in Chapters 1–3 of `CAPSTONE 1 PAPER.pdf`; visual design references added from `CAS-ASSIST2.0 BASE44 IMGS.zip`.
> **Authority order:** Paper determines required features and permissions; Base44 screenshots determine visual direction only; repository determines what has actually been built. See `DESIGN.md`.
> **Audience:** Capstone proponents, CAS stakeholders, developers, testers, and Codex.
> **Platform context:** React Native + Expo frontend, with a desktop-optimized web portal and mobile-friendly student experience; Node.js/Express backend; PostgreSQL/Supabase.
> **Source convention:** **[PAPER]** = explicitly supported by the paper; **[BASE44]** = interface appearance visible in provided screenshots, not product authority; **[RECOMMENDED]** = implementation suggestion; **[DECISION NEEDED]** = unresolved. Neither reference visuals nor recommendations authorize extra institutional transactions.
> **Important:** The research paper is the source of intended behavior. The code repository must be inspected separately before claiming something is implemented.

## 1. Problem to solve

The College of Arts and Sciences (CAS) at New Era University relies on physical visits, paper logs, bulletin boards, and dispersed messages to answer academic questions and handle student requests. The paper emphasizes the following operational failures:

| Problem ID | Observed problem | Harm to users and staff | Paper reference |
|---|---|---|---|
| PROB-01 | Irregular/backlog students must visit CAS to request advising, prerequisite waivers, or schedule guidance. | Physical congestion, repeat trips, difficult tracking. | Ch. 1, pp. 14–16 |
| PROB-02 | Advising is manually logged with no visible real-time status or reliable wait estimate. | Students do not know whether or when help will arrive. | Ch. 1, pp. 15–18 |
| PROB-03 | Staff repeatedly answer basic Tier-1 questions about hours, documents, and procedures. | Less time for complex academic cases. | Ch. 1, pp. 15–16 |
| PROB-04 | Classroom changes are communicated through scattered channels, not precise student cohorts. | Students miss urgent room changes or wait in the wrong room. | Ch. 1, pp. 15–16 |
| PROB-05 | Official announcements and calendars are fragmented; desktop staff and mobile students have different needs. | Missed deadlines, misinformation, inefficient administration. | Ch. 1, pp. 13–15 |

### Proposed solution [PAPER]

CAS ASSIST is a **unified, role-based departmental information and helpdesk system** combining an asynchronous academic advising ticket pipeline, a closed-domain AI information assistant, verified announcements, faculty-originated classroom updates targeted to the correct class blocks, and a data-driven queue estimate. CAS staff and faculty work from desktop-friendly dashboards; students use a mobile-friendly experience. The AI gives information, **never academic approval**. (Ch. 1, pp. 13–20; Ch. 3, pp. 60–72)

## 2. Product outcomes

1. Give CAS students one authoritative place to view current department information and request advising. **[PAPER]**
2. Replace opaque, paper-based advising follow-ups with a trackable four-state ticket lifecycle. **[PAPER]**
3. Answer repetitive policy/procedure questions from approved CAS sources and transfer unresolved questions to staff. **[PAPER]**
4. Publish classroom changes to *only* affected cohorts, with a current schedule view. **[PAPER]**
5. Equip CAS staff with a queue workspace and departmental leaders with meaningful demand/wait indicators. **[PAPER]**
6. Prevent loss, misrouting, unauthorized exposure, or unsupported automation of academic decisions. **[RECOMMENDED implementation quality objective]**

Do not promise a numeric reduction in queue duration, response time, or student visits until validated with baseline and pilot data.

## 3. Users and operating boundaries

| User | Core jobs | Constraints |
|---|---|---|
| **Student (active CAS)** | Sign in, view verified updates and schedules, ask AI, submit/track own advising tickets, see estimated wait. | Cannot see another student's tickets or approve requests. |
| **Faculty/professor** | View assigned class blocks, change their own room/schedule spatial logs, notify affected cohorts. | Cannot edit unrelated faculty blocks or manage advising tickets. |
| **CAS office staff/secretary/clerk** | Triage, route, annotate, request action on, and resolve tickets; publish official announcements. | Operates on authorized CAS records; must leave audit trail. |
| **Super administrator / IT support** | Verify accounts, manage roles/configuration/knowledge base, review audit trails. | Does not turn the AI into an academic decision-maker. |

**Access:** `@neu.edu.ph` institutional identity plus verified active CAS affiliation/program code, not domain alone. Student accounts officially shifted away from CAS become `archived_read_only`. (Ch. 1, pp. 16–19; Ch. 3, pp. 65–67)

## 4. Feature requirements — scoped implementation backlog

The 22 modules in Ch. 3, pp. 66–72 are grouped below into practical user-facing features. **P0 = necessary for a coherent working solution; P1 = important full-paper capability; P2 = dependent/optional refinement.** Priorities are **recommendations**, not a ranking found in the research.

| ID | Requirement | Source | Priority | Core acceptance condition |
|---|---|---|---|---|
| FR-01 | Institutional authentication and active CAS verification | PAPER | P0 | Reject disallowed domains and deny application access until CAS affiliation/role is verified. |
| FR-02 | Four-role RBAC enforced server-side and in database access | PAPER | P0 | A student cannot read/modify anyone else's tickets; faculty can only change their own class assignments. |
| FR-03 | Active-to-archived-read-only student lifecycle | PAPER | P1 | A shifted-out student can read authorized historical records but cannot submit tickets or ask the CAS AI. |
| FR-04 | Student profile, program, year level, backlog index | PAPER | P1 | Student sees verified profile/academic-context fields without changing official SIS data. |
| FR-05 | Structured advising ticket creation | PAPER | P0 | Student submits a category, justification, and optionally relevant supporting documents; sees ticket identifier. |
| FR-06 | Secure attachment upload and retrieval | PAPER | P0 | Files are validated, linked to a ticket, and readable only by authorized users. |
| FR-07 | Staff triage grid: search/filter/flag/route/notes | PAPER | P0 | Staff can see assigned/authorized tickets, update workflows, and keep internal notes private. |
| FR-08 | Four exact ticket statuses: Submitted → Under Evaluation → Action Required → Resolved | PAPER | P0 | Student sees current status, chronological progress, and relevant status update. |
| FR-09 | Immutable staff-action audit history | PAPER | P0 | Every protected ticket mutation records actor, timestamp, action, and prior/new state. |
| FR-10 | Closed-domain AI FAQ interface using handbook/procedures/memos | PAPER | P0 | Responses rely on approved institutional sources and do not issue academic decisions. |
| FR-11 | AI answer feedback and resolution/deflection tracking | PAPER | P1 | After an AI response, student can indicate whether it answered the question. |
| FR-12 | AI-to-human ticket escalation, reusing query context | PAPER | P0 | Low-confidence/unhelpful answer offers ticket submission without retyping context. |
| FR-13 | Faculty personal class-block schedule management | PAPER | P0 | Faculty can view assigned blocks and change only authorized room allocations. |
| FR-14 | Cohort isolation and targeted room-update alerts | PAPER | P0 | A room change reaches only enrolled students in the affected subject/section/block. |
| FR-15 | Official announcements publishing and chronological student feed | PAPER | P0 | Staff can publish authorized, time-bound notices; students can distinguish official notices. |
| FR-16 | Academic calendar and events/deadlines | PAPER | P1 | Users can view authorized academic dates, add/drop periods and CAS events. |
| FR-17 | Little's Law and triangular-distribution queue indicators | PAPER | P1 | Student sees an **estimate** derived from recorded operations, with freshness and limitation labels. |
| FR-18 | Administrative queue and trend analytics | PAPER | P1 | Authorized leaders can inspect aggregate request volume, wait trends and peak periods. |
| FR-19 | Explicit action-required response and resubmission loop | RECOMMENDED | P0 | Student can see what staff requested, upload/add clarification, and notify staff without creating an unrelated ticket. |
| FR-20 | Knowledge-base provenance, publish/version control, and safe abstention | RECOMMENDED | P0 | AI cites approved current source/version or indicates it cannot answer and offers escalation. |
| FR-21 | Persistent in-app notification inbox with read/unread state | RECOMMENDED | P1 | Students can recover missed alerts even when push permission is denied or browser was closed. |
| FR-22 | Idempotent submission and error recovery | RECOMMENDED | P0 | Retrying after network failure cannot silently create duplicate tickets or lose an upload. |
| FR-23 | Enrollment roster / subject-block membership synchronization or approved import | RECOMMENDED, dependency | P0 | The system has a verified membership source before sending targeted room updates. |
| FR-24 | Staff queue assignment and escalation ownership | RECOMMENDED | P1 | Every open ticket has an accountable queue/handler, with reassignment recorded. |
| FR-25 | Accessible empty/loading/error/permission-denied states | RECOMMENDED | P0 | Users can recover from failed requests or understand why access is unavailable. |

### Capability with limited paper support — **not** automatically in MVP

- **Clearance status display:** Mentioned in Ch. 1 (pp. 13, 23–24) and related workflows, but a full clearance-approval workflow is **not defined** in the Ch. 3 module decomposition. Treat a *CAS-local, read-only clearance indicator* as a separate requirement pending stakeholder approval; never write to the official registrar/SIS.
- **Document request module:** Discussed in Chapter 2 literature and the executive summary, but Chapter 3 explicitly designs advising ticket attachments, **not** a general registrar transcript/document issuance platform. Do not implement official document issuance or payments by implication.
- **Native iOS/Android binaries:** The paper's technology is Expo/React Native, but Ch. 3 defines student access primarily as **mobile-responsive web via browser**, not mandatory app-store deployment. Native distribution is a separate deployment decision.

## 5. Core user stories and acceptance tests

### US-01 — Student submits an advising issue

**As an active CAS student**, I want to file a backlog/waiver/overload concern remotely so I do not need to stand in an undocumented queue.

- Given verified active CAS access, when I provide a category and justification and submit, the server validates my input, creates **one** ticket, assigns a trackable ID, stamps a creation time, and sets status `Submitted`.
- I can see the ticket in **My Advising Requests**; another student cannot.
- If a file is included, only authorized actors can retrieve it; invalid files produce an actionable error.
- If I lose connection, a safe retry does not create silent duplicates. *(Last condition: RECOMMENDED.)*

### US-02 — CAS staff processes a ticket

**As CAS staff**, I want to find, route, review, request additional details, and resolve advising tickets so the queue remains organized.

- Staff can filter by status/category/age and read authorized submitted details and attachments.
- Allowed changes create a timestamped audit event and update the student-visible timeline.
- When status becomes `Action Required`, the student sees a clear next step; internal notes remain staff-only.
- Only authorized humans can issue an official resolution; the AI cannot.

### US-03 — Student asks the AI

**As a student**, I want official CAS FAQ guidance without waiting for a clerk.

- An approved-source question yields a clear, appropriately sourced response.
- Uncertain or out-of-domain queries do **not** become fabricated policy or academic approvals.
- Student can mark whether the answer helped.
- On failure or unhelpful answer, the student can create a human-handled ticket with relevant context. *(Source display + abstention details: RECOMMENDED safeguards.)*

### US-04 — Faculty relocates a class

**As faculty**, I want to change an assigned classroom and notify my own student cohort.

- Faculty selects only their authorized subject/section/block.
- A room update saves the new location and broadcasts an event to verified enrolled students in that block.
- Other student cohorts receive no announcement from that event.
- The current schedule and log identify the update time and faculty actor.

### US-05 — Student checks updates and estimated queue

**As a student**, I want to see relevant official CAS announcements, my ticket progress, and approximate queue delay.

- Announcements show author/official indicator, publish time, and expiry where configured.
- Tickets show current status and last update.
- Queue estimate states **estimated**, identifies when last computed, and shows an unavailable state when source data is insufficient.

## 6. Non-functional requirements

| Area | Required product behavior | Provenance |
|---|---|---|
| Security | Authenticated access, CAS/domain validation, role checks and Supabase row-level policy enforcement | PAPER, Ch. 1 pp. 16–19; Ch. 3 pp. 65, 92 |
| Confidentiality | Do not leak personally identifiable information, tokens, protected attachments, or another student's ticket | PAPER, Ch. 3 pp. 96–97; implementation detail RECOMMENDED |
| Reliability | Consistent transactional ticket updates and graceful handling of high-volume intake | PAPER, Ch. 3 pp. 63, 92 |
| Responsiveness | Desktop-suitable staff interfaces, mobile-suitable student interfaces | PAPER, Ch. 1 pp. 14, 17–18; Ch. 3 pp. 60–62 |
| Performance | The paper targets under 150 ms normal API response latency and 2 Mbps connectivity; validate against actual hosting/network setup before asserting compliance | PAPER, Ch. 3 pp. 83–84 |
| Evaluation | Assess functional suitability, usability, reliability, performance efficiency, and security using ISO/IEC 25010 | PAPER, Ch. 3 p. 92 |
| Usability | Actionable errors, accessible navigation, non-color-only status labels, clear source provenance | RECOMMENDED |

## 7. Out of scope — mandatory product boundaries

- Do not directly create/edit/delete official NEU SIS or LMS records.
- Do not perform tuition/financial transactions, payments, registrar grade updates, or formal registrar approvals.
- AI cannot approve prerequisites, exceptions, formal academic evaluations, or graduation/clearance decisions.
- Shifted-out CAS student profiles may access authorized historical records only; no new advising tickets and no CAS AI use.

**Source:** Ch. 1, pp. 18–20; Ch. 3, pp. 96–97.

## 8. Required dependencies / decisions before implementation

1. **Authoritative CAS roster:** How are active CAS program codes and subject/block memberships verified **without** direct SIS integration? Propose a CAS-authorized administrative import or manual verification, pending actual institutional approval. **[DECISION NEEDED]**
2. **Approved AI materials:** Who supplies, signs off, updates, and revokes handbook pages, CAS procedures, and official memos? **[DECISION NEEDED]**
3. **Notification channel:** Web push, in-app real-time, native Expo notifications, or combinations? Browser and platform permission limits matter. **[DECISION NEEDED]**
4. **Ticket process:** Which staff desk owns each category; when may tickets change state; how is `Action Required` completed? **[DECISION NEEDED]**
5. **Queue math:** What timestamp events define queue entry, service start, resolution, and active backlog? What confidence/fallback is suitable with small data? **[DECISION NEEDED]**
6. **Clearance:** Is there any authorized CAS-local clearance visibility, and who owns its data? **[DECISION NEEDED]**
7. **Deployment:** Confirm browser-based delivery versus native binaries. **[DECISION NEEDED]**

## 9. MVP completion definition

The MVP is ready for pilot validation when verified students can submit and track advising tickets; authorized staff can process and audit them; the AI answers only from approved CAS sources with human escalation; faculty can change rooms for their assigned blocks with correct cohort targeting; authorized staff can publish official notices; and tests demonstrate **denied access** between roles. Queue estimates, analytics, and native push integration should be added only when their underlying data and mechanisms are demonstrably trustworthy.

## 10. Source map

- **Why the product exists:** Ch. 1, pp. 12–16.
- **Objectives and scope:** Ch. 1, pp. 16–20.
- **Role definitions and permitted activities:** Ch. 1, pp. 17–19; Ch. 3, p. 65.
- **22 proposed modules:** Ch. 3, pp. 66–72.
- **Flows and data boundaries:** Ch. 3, pp. 73–78, 84–85.
- **Queue equations:** Ch. 3, pp. 85–87.
- **Quality/privacy boundaries:** Ch. 3, pp. 92, 96–97.


## 11. Research-to-Base44 feature crosswalk

**Important:** These rows map paper requirements to *appearance references*. They do not claim Base44 implements the right workflow or that the current Expo repository has these features. All screenshots are packaged under `design-reference/base44/`. Detailed screen rules appear in `DESIGN.md`.

| Research-backed capability | Chapter / source | Visual examples to adapt | Required reconciliation |
|---|---|---|---|
| Verified authentication, four roles, CAS-only access | Ch. 1 pp. 16–19; Ch. 3 pp. 65–67 | `Login.png`, `Register.png`, `User Management.png`, `Profile.png` | Reference self-registration/Google sign-in do **not** override CAS verification and role approval. |
| Student advising creation and own ticket timeline | Ch. 3 pp. 68–69, 84–85 | `Requests.png`, `RequestsNew.png`, `Queue.png` | Images are primarily an **admin table/queue**; design a genuinely mobile student form and ticket timeline from the paper. |
| Secure supporting files for advising | Ch. 3 p. 68 | `Documents.png` for card, filter and table patterns only | The image shows wider document processing; paper specifically requires *ticket attachments*, not general university document issuance. |
| Human staff ticket review, routing and audit | Ch. 3 pp. 68–69 | `Requests.png`, `Queue.png`, `Super_Admin Dashboard.png` | Enforce staff versus super-admin privileges; record protected actions. |
| Closed-domain AI, feedback and escalation | Ch. 3 pp. 69–70, 84 | `AI-Assistant.png`, `FAQs.png` | Keep the two-column chat and approved-FAQ pattern; require supported answers and human handoff. |
| Faculty class schedule and precise room change | Ch. 3 pp. 70–71, 85 | `Teaching.png`, `Academics.png`, `Classroom Changes.png` | Faculty modify only their own blocks; do not broadcast to an unverifiable cohort. |
| Department announcements and calendar | Ch. 3 p. 71 | `Announcements.png`, `Notifications.png`, `Home.png` | Student receives chronological official notices; calendar needs its own mobile/desktop screen (no dedicated calendar screenshot). |
| Queue forecasting and aggregate reporting | Ch. 1 pp. 16–17; Ch. 3 pp. 71–72, 86–87 | `Queue.png`, `Analytics.png` | Show mathematically based **estimates** with timestamps rather than guaranteeing a countdown. |
| IT access, configuration, audit | Ch. 3 pp. 65–67, 69 | `Super_Admin Dashboard.png`, `User Management.png`, `Service Configuration.png` | Screenshot controls are design inspiration; implement only permissions and configuration needed by the paper. |

### Reference-only screens, not implicit feature approvals

- `Appointments.png` depicts time-slot booking. The 22-module Chapter 3 blueprint does not require a standalone appointment-booking service; keep it **out of core scope** unless CAS approves an extension.
- `Documents.png` depicts a generalized document-request service. Do not treat this as permission to issue official transcripts/certificates, alter SIS/LMS data, or transact fees; reuse table/card styling for authorized advising attachments only.
- `Service Configuration.png` includes counters, document types, and catalogs; use only the pieces necessary for approved CAS advising operations.
- `Home.png` is a **landing/role-entry page**, not evidence of a completed student mobile dashboard.
- `RequestTicketID.png` is a dynamic-page loading placeholder and `Audit Logs.png` is pixel-identical to `AI-Assistant.png`; neither depicts the target detailed ticket/audit-log UI. These interfaces must be designed from paper requirements using the established visual system.
- `Register.png` shows a self-registration UI and a Google sign-in option. Identity provider and automatic activation are **not** requirements established by the paper; uphold institutional/CAS checks.

### Feature delivery recommendation (not a paper priority ranking)

1. **Foundation:** verified CAS accounts, roles and archived state; proper access checks on every API/data operation.
2. **Directly solves biggest bottleneck:** student advising form + secure attachments + staff queue + four-state ticket timeline + action history.
3. **Makes support usable:** approved FAQ/AI deflection + human escalation, official announcements, personal notifications.
4. **Fixes sudden classroom confusion:** faculty assignment screen + verified block mapping + room change + targeted alerts.
5. **Measures improvement:** correct wait-time estimator, dashboard reporting, queue/service metrics.

Do not let visually finished Base44 screens substitute for tested backend workflows.

## 12. Approved administrative authority foundation — 2026-11-13

**Source: explicit Step 2 user approval; this is a governance refinement, not an additional research role.** Both Admin1 (`primary`) and Admin2 (`delegated`) retain `super_admin`. Institutional email alone does not establish CAS eligibility. Only Admin1 may create/invite accounts or issue final CAS access approval after the approved institutional verification process. Admin2 retains ordinary approved administrative operations, with no primary identity/control changes or privilege escalation. Student access requests are deferred and must not create an Auth identity or grant access.

Local foundation: protected UUID authority records and a service-only context lookup are prepared in `Backend/supabase/migrations/202611130001_admin_authority_foundation.sql`; `Backend/src/middleware/admin-authority.ts` supplies fresh actor/target authorization for future account operations. Role changes, identity changes and reactivation also require primary authority because they can indirectly grant CAS access. Authority-holder deletion/demotion and primary succession require a separate controlled procedure.

**Delivery boundary:** no account provisioning, final-approval workflow, recovery or access-request screen/API is implemented by Step 2. No initial authority is assigned. Existing registration remains temporarily available; provider-level closure of all public identity-creation paths is a mandatory future release dependency after Admin1 provisioning is tested. Existing verified users and operational features retain their current authorization. Database execution and real Auth acceptance remain unverified; see the three `STEP2_ADMIN_AUTHORITY_*` reviewer reports.
