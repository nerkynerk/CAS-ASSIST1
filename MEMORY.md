# CAS ASSIST — Project Memory for Codex

> **Purpose:** Small, durable project handoff. This is a repository document, **not** an assurance that ChatGPT memory or Codex auto-updates.
> **Source of intended product:** `CAPSTONE 1 PAPER.pdf`, Chapters 1–3, 98 PDF pages.
> **Source of desired UI look:** User-supplied `CAS-ASSIST2.0 BASE44 IMGS.zip` containing 24 screenshot PNG files, copied to `design-reference/base44/`. The local `D:` reference directory was not inspected directly.
> **Priority:** Paper = features/scope/roles; Base44 = visuals only; checked repo = present implementation state.
> **Prepared:** 2026-11-06.
> **Evidence tags:** `PAPER` = research requirement, `RECOMMENDATION` = proposed design/control, `UNVERIFIED` = implementation or approval not inspected.
> **Implementation truth:** Do not treat research descriptions as proof that a feature exists. Read the real Expo/Express/Supabase repository, configs, migrations, tests and current branch before modifying anything.

## 1. The one-paragraph product brief [PAPER]

**CAS ASSIST: A Unified Multi-Platform Assisted Information and Helpdesk System for CAS in New Era University** aims to solve CAS students' difficulty obtaining accurate announcements, tracking advising/backlog requests and queue wait times, and learning about urgent classroom changes. The solution combines a role-based mobile-friendly student client, desktop-friendly faculty/staff interfaces, a digital advising ticket pipeline, a closed-domain AI student information assistant, official notices/calendar, targeted faculty classroom relocation updates, and data-driven queue analytics. The AI gives **information only**; authorized humans make academic decisions. Source: Ch. 1 pp. 12–20; Ch. 3 pp. 60–72.

## 2. Core problem → system solution

| Problem | Proposed product response | Key proof in paper |
|---|---|---|
| Manual advising / irregular-student backlogs | Remote categorized advising tickets, attachments, staff work queues | Ch. 1 pp. 15–18; Ch. 3 pp. 68–69 |
| No status/wait visibility | Four-state timeline plus mathematically estimated waiting | Ch. 1 pp. 16–20; Ch. 3 pp. 71–72, 85–87 |
| Repeated routine inquiries overwhelm clerks | Approved-CAS-source AI FAQ with human ticket escalation | Ch. 1 pp. 15–16, 18–20; Ch. 3 pp. 69–70, 84 |
| Students miss sudden room changes | Professor-owned class-block editing plus targeted cohort notifications | Ch. 1 pp. 15–16; Ch. 3 pp. 70–71, 85 |
| Scattered/uncertain official messages | Official announcements, academic calendar, chronological feed | Ch. 1 pp. 13–15; Ch. 3 p. 71 |
| Limited visibility into peak demand | Admin analytics from transactional logs | Ch. 1 pp. 16–17, 20–21; Ch. 3 pp. 71–72 |

## 3. Non-negotiable rules [PAPER]

- Institution: **College of Arts and Sciences (CAS), New Era University**.
- Access: validated `@neu.edu.ph` identity **and** verified active CAS affiliation/program code.
- Four roles: **student**, **faculty**, **office staff**, **super admin**.
- Ticket labels exactly: **Submitted**, **Under Evaluation**, **Action Required**, **Resolved**.
- Students see and create **their own** advising tickets; faculty modify **their assigned** blocks; staff process tickets and publish notices; super admin handles governance/audit.
- Shifting out of CAS → `archived_read_only`; keep authorized historical records, block new CAS advising tickets and CAS AI queries.
- AI answers only from verified CAS handbook/procedures/memos, **never** makes official academic exceptions, prerequisite approvals, course evaluations, or graduation clearance decisions.
- No writing to university central SIS/LMS; no tuition/payments/official grade updates or registrar transaction processing.
- Security includes backend role checks, database-level row security, confidential student records and official-action audit history.

## 4. Intended stack [PAPER, NOT CODE-VERIFIED]

- **Frontend:** React Native + Expo and JavaScript/TypeScript, desktop web portal plus mobile-responsive student client.
- **API:** Node.js with Express.
- **Persistence:** PostgreSQL via Supabase; Supabase Auth, Supabase storage and pgvector are discussed in Ch. 3.
- **Network:** HTTPS secured client/API communication; Ch. 3 references TLS 1.3.
- **Events:** Targeted live schedule/notification updates; the exact push provider is *not named as a firm selected implementation*.
- **Delivery nuance:** Paper explicitly describes mobile browser use, so do **not** equate Expo automatically with production native iOS/Android app binaries.

## 5. What must be implemented or verified first

**Priority labels here are recommendations, not paper-assigned priorities.**

**P0 — Operational foundation:** identity/CAS verification, RBAC/RLS, ticket submission and status, secure attachments, staff processing and audit history, scoped faculty block changes and cohort targeting, approved-source AI responses with escalation, official announcements, negative-path tests.

**P1 — Complete paper solution:** academic calendar, feedback/deflection metrics, queue estimates with transparent assumptions, administrative analytics, archival lifecycle, profile/history, notification resilience.

**RECOMMENDED dependencies:** CAS-verified roster/active program source, verified AI knowledge approval/versioning, student response to `Action Required`, notification inbox, idempotent ticket writes, safe queue-estimate unavailable state, source-linked AI answers.

**No speculative features:** generic social messaging, chatbot academic approval, grade editing, tuition payment, official transcript issuance, autonomous institutional decisions, or whole-university SIS replacement.

## 6. Research-to-implementation gaps [OPEN]

1. **CAS enrollment source:** Paper requires automatic program/shift checks and exact class-block memberships while forbidding direct SIS/LMS writes. Define an authorized import/verification procedure before implementing automatic access or alerts.
2. **Queue predictions:** Paper defines `W = L / λ` and `E = (a+b+c)/3`; neither guarantees a personalized real-time countdown. Data windows, queue capacity, calibration and graceful fallbacks need implementation decisions.
3. **Data dictionary completeness:** Chapter 3 documents accounts, advising tickets and spatial logs; other core supporting tables aren't fully specified. Design minimum secure relations after reviewing actual Supabase migrations.
4. **Clearance/document requests:** Mentioned in early chapters/literature; a complete registrar-grade/official document workflow is **not** defined in the 22-module Ch. 3 solution. Require stakeholder sign-off before extending scope.
5. **Push technology:** In-app web alerts, web push and Expo native notifications have different behavior. Confirm delivery targets and browser permissions.
6. **Ticket transitions:** Paper defines state names but not strict transition policies, reopen/cancel rules, routing assignments or service-level deadlines.
7. **Role extensions:** Dean and chairs appear in content publishing/analytics discussion, but formal RBAC has four tiers only; no unapproved fifth role.

## 7. How Codex should work with these documents

1. Read `MEMORY.md`, `PRD.md`, `RULES.md`, `ARCHITECTURE.md`, `DESIGN.md` before designing changes.
2. Inspect actual repository and capture project root, Expo app root, package manager, installed tool versions, Express services, Supabase migrations and current Git status.
3. Map each proposed change to a requirement ID in `PRD.md`. If it's only recommended or an open decision, **do not present it as implemented/approved**.
4. Scan and report problems with concrete file/line evidence. Code smelling “AI-generated” is not evidence of a bug.
5. Implement minimal, testable changes only when requested. No broad auto-refactor, database writes, deploy, secret disclosure, commit or push without permission.
6. Validate real user outcomes across mobile and desktop and test denial paths for RBAC/RLS and cross-user data.
7. When implementation differs from research, report discrepancy with risk and options; don't quietly rewrite either source.
8. Update this memory file only with **verified decisions and observed repository facts**, including date/source, in the section below.

## 8. Verified decisions and implementation observations

| Date | Claim | Evidence | Status |
|---|---|---|---|
| 2026-11-06 | Research paper specifies Expo/React Native, Node.js/Express and Supabase/PostgreSQL target design. | Paper Ch. 3 pp. 60–63, 77–83, 98 | PAPER — target design only |
| 2026-11-06 | Local working repository was previously described as `D:\Dave Files\Capstone 2\CAS-ASSIST1` on branch `octup/safe-enhancements`. | User-provided conversation context | CONTEXT ONLY — recheck local state |
| 2026-11-06 | Existing repository implementation and migrations were **not** inspected while drafting these five files. | Document creation scope | UNVERIFIED |

### Template for new verified memories

- Date: 2026-11-09 (Asia/Manila).
- Authorized scope: the user's Phase 1 request explicitly approved targeted local fixes for five security findings, additive migration files, tests, and three reviewer reports on `octup/safe-enhancements`; no production changes, commits, pushes, merges, or deployment.
- Observed baseline: branch `octup/safe-enhancements`, HEAD `3270d8dce2e948b80244c365f309463dc546edde`; existing uncommitted instruction/documentation/reference assets were preserved. Actual roots are `Frontend` (Expo Router, npm) and `Backend` (Express/TypeScript, npm).
- Local implementation: protected operational access now requires active + verified CAS access. Student affiliation uses managed `student_program_memberships` joined to active `cas_programs`, not editable profile data. Existing verified personnel roles remain administrator attestations; no central roster integration was invented. Verified archived users retain row-scoped history without active enrollment.
- Prepared database dependency: `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql`; frontend requires its `has_active_cas_access()` and `transition_advising_ticket_status()` RPCs. The migration was not applied. Missing helper/access checks fail closed.
- Verification: backend unit/HTTP tests use mocked Supabase; database integration and actual Supabase authentication remain unverified because no isolated database runtime was available. Full command evidence and release limitations are maintained in `docs/reviewer/PHASE1_SECURITY_TEST_RESULTS.md` and `PHASE1_REMAINING_RISKS.md`.
- Requirements: FR-01, FR-02, FR-03, FR-07, FR-08, FR-09, FR-13, FR-17, FR-18. No account was automatically verified and no research-derived role/state names changed.

```markdown
- Date:
- Decision or observed implementation:
- Source/evidence (file path, commit, test, approved stakeholder decision):
- Requirement affected (PRD ID):
- Implications or follow-up:
```

## 9. Directory layout and document roles

```text
PRD.md           WHAT problem and feature behavior is required
ARCHITECTURE.md  HOW the proposed system is bounded and integrated
RULES.md         WHAT must/must not happen during development and use
DESIGN.md        HOW each role interacts with the proposed solution
MEMORY.md        WHY the project exists and what is verified / unresolved
```

**Document change discipline:** Research claims require chapter/page references; recommended features require explicit labels; current implementation claims require file/commit/test evidence. If an institutional policy conflicts with a proposed feature, mark it `BLOCKED — needs CAS approval` rather than inventing policy.


## 10. Base44 design handoff — do not lose this context

**User instruction:** Keep the feature set faithful to the capstone research while basing the application's UI/UX appearance on the supplied Base44 screenshots. Screenshots provide an example of *how* screens should look, **not** evidence that those features are approved or implemented.

- **Reference asset location in this handoff:** `design-reference/base44/`. Filenames must remain unchanged, including `ForgotPassowrd.png` (original spelling).
- **Desktop visual DNA:** pale gray-mint page surface, white cards, dark navy filled buttons and headings, teal/mint active states, subtle borders and shadows, grouped left sidebar with icon rail, compact top utility actions, generous card spacing, small muted overlines and serif-like editorial page headings. See token guidance in `DESIGN.md`.
- **Screen grouping:** login/register/reset, super-admin dashboard, advising queue/ticket workspace, faculty teaching/class changes, announcement/notices, AI/FAQ, analytics, permissions/configuration.
- **Not a mobile mockup:** supplied images are desktop-style captures. Student phone screens must use consistent visual tokens with responsive purpose-built navigation and single-column content (design adaptation).
- **Never copy artifacts:** dark debug-like screenshot header, bright blue viewport text/frame are not part of the product.
- **Missing/misleading screens:** `Audit Logs.png` is an exact duplicate of `AI-Assistant.png`; `RequestTicketID.png` is only a dynamic-page loading placeholder; `Home.png` is a landing page, not student home; `RequestsNew.png` shows the ticket list rather than a complete request-creation form.
- **Out-of-scope visualization:** appointments and stand-alone document issuance are visible in Base44, but the research's 22 modules do not establish a general booking/registrar issuance system. Reuse visual patterns but do not promote them to required features.
- **What Codex should implement:** start with `PRD.md` feature map and `RULES.md` authorizations; consult `ARCHITECTURE.md` for service/data boundaries and `DESIGN.md` for per-screen Base44 mapping; compare to existing repo first; make small, tested changes.
- **Evidence tags:** `[PAPER]` for research-backed behavior; `[BASE44]` for observed UI; `[RECOMMENDED]` for suggested implementation; `[OPEN]` for uncertain/approval-needed details. A screenshot's sample data and numbers are mock-state content, never production evidence.

### Fast reference mapping

| Need | Read screenshot(s) | Read research section |
|---|---|---|
| CAS login and identity | `Login.png`, `Register.png`, `User Management.png` | Ch. 1 pp. 16–19; Ch. 3 pp. 65–67 |
| Student/staff advising | `Requests.png`, `Queue.png`, `Profile.png` | Ch. 3 pp. 68–69, 84–87 |
| Student AI and FAQ | `AI-Assistant.png`, `FAQs.png` | Ch. 3 pp. 69–70, 84 |
| Faculty teaching and room changes | `Teaching.png`, `Academics.png`, `Classroom Changes.png` | Ch. 3 pp. 70–71, 85 |
| Official communications | `Announcements.png`, `Notifications.png` | Ch. 3 p. 71 |
| Administration and KPIs | `Super_Admin Dashboard.png`, `Analytics.png`, `Service Configuration.png` | Ch. 3 pp. 65–67, 69, 71–72 |

### Codex operating instruction

Before writing code: identify actual app roots, routes and components; compare each screen and workflow to the paper and a specific image; call out where a design reference depicts a paper-out-of-scope service. Preserve data/API behavior when changing visuals, and run checks and relevant tests before claiming completeness.

## 11. Approved Step 2 administrative authority foundation — 2026-11-13

- Scope: user explicitly approved protected primary/delegated authority, reusable backend checks, focused tests and reports on `octup/safe-enhancements`. Existing uncommitted Phase 1/source/reference work was preserved. No account operation, initial assignment, production change, signup closure, UI change, commit or deployment is authorized by this step.
- New policy: only Admin1 may provision/invite or issue final CAS access approval after approved institutional verification. Admin2 cannot grant final access or control Admin1's identity/authority. Both remain `super_admin`; institutional email alone does not establish CAS membership.
- Local evidence: `Backend/src/middleware/admin-authority.ts`, additive `Backend/supabase/migrations/202611130001_admin_authority_foundation.sql`, focused backend tests and prepared isolated `Backend/supabase/tests/admin_authority.sql`. New checks validate fresh bearer identity and protected current actor/primary/target data; existing operational routes remain unchanged. No primary is automatically designated.
- Controlled authority: owner-only bootstrap is documented in `docs/reviewer/STEP2_ADMIN_AUTHORITY_IMPLEMENTATION.md` and was not executed. Authority-holder deletion/demotion and succession require controlled handling; no authority-write endpoint exists.
- Validation boundary: local test/typecheck evidence is recorded in `STEP2_ADMIN_AUTHORITY_TEST_RESULTS.md`. No approved isolated database/runtime was available; SQL execution, real Auth/RLS/PostgREST and true concurrent-session acceptance remain BLOCKED/NOT RUN. Existing Gate A defects/risks remain unresolved, not overwritten by passing foundation tests.
- Next boundary: await explicit Step 3 instruction. Provisioning/recovery/access requests/appointments remain unimplemented. Keep registration temporarily; closing all public signup methods at the provider boundary is mandatory for the later provisioning release.
