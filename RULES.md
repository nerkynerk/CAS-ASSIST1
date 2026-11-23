# CAS ASSIST — Product, Security, and Development Rules

> **Purpose:** Rules for developers and AI coding agents working on the *proposed* CAS ASSIST solution. Apply these together with `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, and `MEMORY.md`.
> **Labels:** **[PAPER POLICY]** is a research requirement; **[ENGINEERING GUARDRAIL]** is a recommended method for implementing it; **[NEEDS CAS APPROVAL]** is not established policy.
> **Evidence:** Ch. 1, pp. 16–20; Ch. 3, pp. 65–72, 83–85, 92, 96–97 of `CAPSTONE 1 PAPER.pdf`. User-supplied Base44 screenshots are the design reference, never a source for new business permissions.

## 1. Truth, scope, and Codex behavior

1. Treat the paper's **problem, scope, user roles, explicit limitations and functional objectives** as product requirements. **[PAPER POLICY]**
2. Treat the five Markdown files as proposed design guidance; they are **not evidence that code or a database already exists**. Inspect source, migrations, tests and deployment configuration before asserting implementation details. **[ENGINEERING GUARDRAIL]**
3. Distinguish **paper-derived requirements**, **recommended engineering features**, and **open decisions** in all changes, tickets and reports. **[ENGINEERING GUARDRAIL]**
4. Do not invent university approval, official requirements, program lists, class rosters, enrollment records, grade values, or institutional memos. **[ENGINEERING GUARDRAIL]**
5. Do not implement payments, SIS/LMS writes, official grade changes, registrar transactions, academic waivers or AI-only academic approvals. **[PAPER POLICY]**
6. Prefer minimal, testable solutions; do not add generalized frameworks, unused services, duplicate state managers, speculative feature flags, or fake fallback data. **[ENGINEERING GUARDRAIL]**
7. For a proposed refactor, preserve observable behavior, authorization, data integrity and the documented four ticket statuses. **[ENGINEERING GUARDRAIL]**
8. Before changing code: trace affected entry points and dependencies, inspect `git diff`, state the change's purpose, identify tests, then make a focused edit. Never overwrite user changes or automatically delete unused files based solely on scanner results. **[ENGINEERING GUARDRAIL]**
9. After changing code: run available TypeScript, ESLint, Expo Doctor, relevant tests and any necessary manual role-by-role workflows; report skips honestly. **[ENGINEERING GUARDRAIL]**

## 2. Institutional identity and account state

### Paper-mandated behavior

- Logins require institutional `@neu.edu.ph` identity **and** active CAS program affiliation verification. Being a university email holder by itself is insufficient. **[PAPER POLICY]**
- Four and only four described role categories are `student`, `faculty`, `staff`, and `super_admin`. **[PAPER POLICY]**
- When an enrolled CAS student officially shifts out of CAS, the account becomes `archived_read_only`. It may display authorized historical tickets/clearance records but must block new advising requests and CAS AI questions. **[PAPER POLICY]**
- No direct edits to NEU's central SIS/LMS. **[PAPER POLICY]**

### Implementation safeguards

- Resolve role and lifecycle from trusted server/database data, never request bodies, local storage, or UI toggles. **[ENGINEERING GUARDRAIL]**
- Backend endpoints and relevant Supabase RLS policies **both** enforce authorization. Deny by default. **[ENGINEERING GUARDRAIL]**
- If no authoritative CAS status/roster source exists, do not silently activate an account or target a notification; represent it as pending verification. **[ENGINEERING GUARDRAIL]**
- A policy for accounts returning to CAS and the data owner for verification are **[NEEDS CAS APPROVAL]**.

## 3. Role-based access matrix

The table below follows the paper's Table 3.1, p. 65. Additional fine-grained operations require specific authorization decisions.

| Feature/action | Student | Faculty | CAS staff | Super admin |
|---|---|---|---|---|
| Announcements / calendar | Read | Read | Create/edit/delete official content | Full control |
| Closed-domain AI | Ask (active CAS) | No access | No access | Manage knowledge base |
| Advising / backlog ticket | Create and track **own** | No access | Route/change status/resolve | Audit |
| Classroom spatial logs | Read applicable | Create/update **own assigned blocks** | Read-only | Database maintenance |
| Account verification, role and system parameters | No | No | No | Full control |

**Never use a client role string to grant access.** Test positive and negative access for each endpoint, realtime channel, object store path and database table. **[ENGINEERING GUARDRAIL]**

## 4. Advising ticket business rules

### Official lifecycle [PAPER POLICY]

The paper defines exactly these student-facing status names:

```text
Submitted → Under Evaluation → Action Required → Resolved
```

The paper does **not** define a formal transition adjacency matrix, cancellation/reopening policy, SLA or priority-discipline policy. Do not present one as established institutional policy. **[NEEDS CAS APPROVAL]**

- Students may submit structured advising/backlog requests with category, justification and attachments. **[PAPER POLICY]**
- Staff may review, route and update requests; every staff action is auditable. **[PAPER POLICY]**
- Students see their own current status and chronology. **[PAPER POLICY]**
- Status identifiers should use consistent machine values: `submitted`, `under_evaluation`, `action_required`, `resolved`. Labels can be human-readable. **[ENGINEERING GUARDRAIL]**
- For `Action Required`, show exactly what information the student should supply; do not expose confidential internal staff notes. **[ENGINEERING GUARDRAIL]**
- Validate category and user-supplied text, control file access, commit a status change with its audit record transactionally, and guard against duplicate network retries. **[ENGINEERING GUARDRAIL]**
- Keep created/updated timestamps server-owned. Use a consistent timezone convention for storage and localize presentation. **[ENGINEERING GUARDRAIL]**

## 5. Closed-domain AI rules

- AI answers **general informational Tier-1 CAS queries only**, based on approved CAS handbook, official procedures and policy memos. **[PAPER POLICY]**
- AI must never approve graduation clearance, exceptions, prerequisite waivers, class overload decisions, course equivalencies, or other binding academic decisions. **[PAPER POLICY]**
- If a relevant authoritative answer is missing, weak, contradictory or stale, say so and offer staff escalation. **[ENGINEERING GUARDRAIL]**
- Responses should identify source title, version/effective date and relevant snippet/reference when feasible; do not invent citations. **[ENGINEERING GUARDRAIL]**
- An unresolved AI conversation should allow an explicit student-reviewed transfer into a human-handled ticket. **[PAPER POLICY for escalation; ENGINEERING GUARDRAIL for review/consent]**
- Do not pull general web results into the institutional answer knowledge base automatically; knowledge updates require authorized verification. **[PAPER POLICY for closed-domain restriction; ENGINEERING GUARDRAIL for approval flow]**
- Do not promise zero hallucinations merely because pgvector or similarity thresholds are used. **[ENGINEERING GUARDRAIL]**
- Log anonymized aggregate resolution/deflection metrics when possible; minimize retaining personal chat content. **[ENGINEERING GUARDRAIL]**

## 6. Faculty class-block and announcements rules

- Faculty may view assigned blocks and change classroom/room logs for **their own** assigned blocks only. **[PAPER POLICY]**
- Targeted room-update recipients must come from trusted subject/section/block memberships, never a free-text broadcast audience chosen by the professor. **[PAPER POLICY for cohort isolation; ENGINEERING GUARDRAIL for recipient validation]**
- Record faculty actor, affected block, before/after room, and broadcast time; keep historical logs. **[PAPER POLICY for spatial history; ENGINEERING GUARDRAIL for old value]**
- Students receive updates for relevant blocks and see the current location/time in the schedule. **[PAPER POLICY]**
- Staff create/edit/delete official CAS announcements; students and faculty view them. The paper also discusses dean/chair publishing roles, but does not define them as separate RBAC tiers. Assign those privileges **within approved existing roles**, not via an invented fifth role. **[PAPER POLICY + NEEDS CAS APPROVAL]**
- Publishing should distinguish official notices from drafts, time-bound content and urgent alerts; avoid sending unrelated cohorts excessive notifications. **[PAPER POLICY for CMS flags; ENGINEERING GUARDRAIL for delivery behavior]**

## 7. Queue estimator rules

- Implement and document the paper's intended formulas: `W = L / λ` and `E = (a + b + c) / 3`. **[PAPER POLICY]**
- Use units consistently and explain what values mean. Validate `λ > 0`, `a ≤ c ≤ b`, data recency, and adequate sample size before computing a display. **[ENGINEERING GUARDRAIL]**
- Never show an estimated queue wait as a guaranteed appointment time or guaranteed countdown. **[ENGINEERING GUARDRAIL]**
- Little's Law is an aggregate steady-state relationship. A snapshot `L` and arrival-rate `λ` alone do not ensure a reliable personal ETA; calibrate with observed completions, staff capacity and historical error. **[ENGINEERING GUARDRAIL]**
- If data are missing/unstable, show `Estimate unavailable` and the current ticket status rather than invented values. **[ENGINEERING GUARDRAIL]**
- Research discusses triangular-duration × queue position as an approach; any correction or enhanced forecasting algorithm must be identified and documented as an engineering refinement. **[ENGINEERING GUARDRAIL]**

## 8. Privacy, security, and data integrity

- Treat academic attachments, student identity, ticket justifications and internal evaluations as confidential. **[PAPER POLICY for confidentiality]**
- The paper's evaluation protocol calls for informed consent, voluntary participation, anonymized aggregated assessment data, and non-identifying use of historical manual records. Do not use real student records in demos without explicit lawful authorization. **[PAPER POLICY]**
- Never embed privileged secrets in Expo client bundles, app config, public environment variables, logs, repositories, or screenshots. **[ENGINEERING GUARDRAIL]**
- Validate input and file uploads server-side; do not trust filename or MIME extension alone. **[ENGINEERING GUARDRAIL]**
- Rate-limit authentication and AI endpoints; verify that external URLs/storage keys cannot expose third-party private files. **[ENGINEERING GUARDRAIL]**
- Protected mutations use transactions or equivalent consistency guarantees, with durable audit records. **[ENGINEERING GUARDRAIL]**
- Notification previews should omit sensitive ticket content. **[ENGINEERING GUARDRAIL]**
- Ensure API and Supabase traffic uses secure transport per paper network requirements. **[PAPER POLICY]**
- Retention/deletion schedules, access review cadences, approved attachment types and grievance workflows are **[NEEDS CAS APPROVAL]**.

## 9. React Native + Expo development rules

These are **engineering recommendations**, not findings claimed by the paper.

- Support actual targets listed in repo config; test mobile viewport and desktop browser separately. Do not assume a native build exists because Expo is used.
- Prefer one source of truth for role, session, ticket state and schedule data. Avoid duplicating the same API/realtime state in many contexts and screens.
- Keep UI/view components separate from API clients, authorization logic, data validation, and queue math. Shared abstractions must solve a repeated, evidenced problem.
- Follow React Hooks rules; clean up subscriptions; avoid using `useEffect` to derive renderable values that can be calculated directly.
- Render list item keys from durable IDs, not unstable array indices when data can reorder.
- Avoid silent `catch` blocks, `any` casts without justification, fake sample records in production, client-side-only validation and optimistic success before server confirmation.
- Use predictable loading/empty/error/retry states, touch-friendly controls, accessible labels, semantic headings and adequate contrast.
- Keep navigation/auth protections consistent across web and mobile; never rely solely on hidden tabs to enforce privileges.
- Before adding an Expo package, check compatibility against the installed SDK; use `expo install --check` or Expo Doctor from the **actual Expo application directory**.

## 10. Quality gates for every Codex task

A proposed code change is acceptable only when all relevant items below are addressed:

- [ ] Maps to a **paper requirement** or explicitly **approved recommendation**.
- [ ] States the user problem it solves and identifies affected roles.
- [ ] Does not expand prohibited SIS/LMS, financial, registrar, academic-approval or AI-authority scope.
- [ ] Has server/RLS/attachment/notification authorization checks where applicable.
- [ ] Covers success, no-data, failed-network and forbidden-access cases.
- [ ] Has no unexplained duplicate implementation, dead code, over-abstraction or unsafe cast.
- [ ] Includes or updates meaningful tests; no false claim of test success.
- [ ] Documents API, schema and migration impacts; requests approval for destructive changes.
- [ ] Preserves existing work, avoids unrelated refactors and does not commit/push unless asked.
- [ ] Updates `MEMORY.md` only with verified project decisions or observed current implementation facts.

## 11. Documentation precedence

1. Approved institutional policies and the explicit scope/limits of the research paper.
2. Validated stakeholder decisions recorded with date/owner.
3. `PRD.md` paper-derived requirements and accepted change decisions.
4. `ARCHITECTURE.md` verified architecture + approved recommendations.
5. `DESIGN.md` UI proposals and approved interaction patterns.
6. Existing implementation details (describe *current state*, not a replacement for requirements).

When sources conflict, **flag the conflict and ask for a project decision; do not silently rewrite the paper or the system**.


## 12. Base44 UI/UX reference policy [USER DESIGN REQUEST / ENGINEERING GUARDRAILS]

1. **Requirements priority:** If a Base44 screenshot depicts behavior that conflicts with a Chapter 1–3 requirement, the paper's authorized scope, security and role rules win. The screenshot informs **layout/style only**.
2. **Appearance priority:** Use `DESIGN.md` and bundled `design-reference/base44/*.png` as the visual target for desktop web and the starting language for mobile adaptation. Do not invent a radically different color palette, dashboard layout, navigation hierarchy or typography without a stated reason.
3. **Visual palette:** Aim for dark navy primary controls, cool off-white/light mint canvas, white surfaces, teal selected states, desaturated secondary text, quiet borders and subtle shadows. The suggested color hex values in `DESIGN.md` are approximations from screenshots, **not** official NEU branding.
4. **Desktop shell:** Follow the reference's narrow icon rail, grouped expanded sidebar, compact top utility header and spacious content cards, but hide routes the current role cannot access.
5. **Mobile adaptation:** Screenshots do not show a real phone layout. Design student experiences in a narrow, touch-friendly one-column layout rather than shrinking a desktop admin table or duplicating the full sidebar. Record mobile design as **RECOMMENDED adaptation**, not screenshot-exact reproduction.
6. **Source traceability:** For each new screen, identify a paper feature ID/Chapter 3 module and one or more visible screenshot filenames. For screens absent from the ZIP (ticket details, academic calendar, audit log and mobile student pages), explicitly say the visual is a consistent adaptation.
7. **Do not add unrelated functionality to satisfy a screenshot:** `Appointments.png` is not a mandatory appointment-booking feature; `Documents.png` is not authorization to issue registrar documents; `Service Configuration.png` is not permission to implement financial or grading processes.
8. **Reference defects:** `Audit Logs.png` is identical to `AI-Assistant.png`; `RequestTicketID.png` is a route placeholder. Do not fabricate exact audit-log or ticket-detail UI based on those images. `RequestsNew.png` does not show a complete new-ticket form.
9. **Do not reproduce preview chrome:** The dark top strip, blue viewport-size annotation, and bright blue screenshot outline visible in the reference captures are **preview/screenshot artifacts**, not application UI.
10. **Functional design:** Every button, dropdown, indicator and chip shown in a built screen must map to a real permitted action or be visibly disabled with an explanation. Do not create fake metrics, invented roster data, demo records or placeholder success confirmations.
11. **Responsive/accessibility:** Maintain label clarity, keyboard navigation, readable contrast, touch targets and non-color-only ticket states. Distinguish visually *estimated* waits from confirmed staff decisions.
12. **UI-only edits stay UI-only:** Refactoring for Base44 appearance must not modify API authorization, ticket statuses, database constraints, AI scope, or academic rules.

### Reference-to-capability rules

| Reference | Allowed adaptation | Do **not** assume |
|---|---|---|
| `Login.png`, `Register.png` | Centered auth cards, Google-style button only if already approved and supported | Any `@gmail.com` or unverified NEU identity can join CAS; automatic faculty access |
| `Requests.png`, `Queue.png` | Staff filters, stats tiles, tables, empty state | Ticket status labels shown in screenshot supersede four research states; queue number is guaranteed time |
| `Classroom Changes.png`, `Teaching.png` | Class picker, change form, notice history | Faculty can edit other assignments; notification goes to all students |
| `AI-Assistant.png`, `FAQs.png` | Two-column chat/FAQ layout, suggestion chips | Open internet answering, authoritative AI-only waivers/clearance |
| `Announcements.png`, `Notifications.png` | Notice cards, priority chips, alert feed | Everyone can publish, private details may be broadcast |
| `Analytics.png`, `Super_Admin Dashboard.png` | KPI cards, aggregated charts | Any displayed sample number is a genuine live project metric |
| `Documents.png`, `Appointments.png` | Table/filter/calendar/form styling | Official registrar document issuance, payment, or appointment scheduling is in approved core scope |

## 13. Approved Admin1/Admin2 foundation rules — 2026-11-13

These rules record the user's Step 2 approval and supplement the four research roles; `primary` and `delegated` are protected administrative levels within `super_admin`, not new application roles.

- Resolve administrative authority by immutable Auth UUID from protected database records. Only active, verified `super_admin` actors may exercise it, with a currently eligible designated primary. Missing/invalid authority fails new account-administration checks closed. Ordinary existing analytics/ticket/announcement permissions remain unchanged.
- Only primary authority may authorize account creation/invitation or final CAS eligibility approval. Identity, role and reactivation changes that can bypass CAS access approval are also primary-only. An institutional email address alone is never CAS eligibility evidence.
- Delegated authority cannot promote itself, assign primary authority, modify primary identity/credentials/status/verification, control primary recovery, or grant privileged authority through metadata/settings/bulk operations. Primary succession and authority-holder deprovisioning require a separately controlled process; there is no application authority-write RPC.
- Future service-role handlers must revalidate the real actor and single target immediately before their specific action, validate the action payload separately, preserve the original audit actor, and handle concurrent revocation/partial failure. A read-only context or middleware pass is not an enduring authorization grant.
- Step 2 does not assign Admin1, create/delete accounts, implement recovery or approvals, disable registration, change hosted Auth settings, or add UI. Closing signup at the provider boundary remains mandatory for the later approved provisioning release, not an action authorized now.
