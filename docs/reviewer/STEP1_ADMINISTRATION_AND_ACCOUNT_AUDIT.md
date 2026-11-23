# Step 1 — Administration and Account Management Audit

**Date:** 2026-11-13, Asia/Manila. **Scope:** analysis only; the only task-created file is this report. **Branch:** `octup/safe-enhancements`. **HEAD:** `3270d8dce2e948b80244c365f309463dc546edde`. Findings describe the existing uncommitted working tree, including prepared Phase 1 changes, rather than HEAD alone.

**Recommendation:** retain `super_admin` for both administrators and introduce a protected, UUID-based administrative permission level. Admin1 alone provisions accounts; Admin2 shares ordinary administrative operations but cannot modify Admin1's identity, recovery controls, or primary authority. No such distinction currently exists.

**Readiness:** the repository has student self-registration, a read-only user directory, administrative dashboards, analytics, and advising audit history. Runtime administrative provisioning, password recovery, account governance actions, and appointment booking are missing. Phase 1 database execution and real Auth/RLS acceptance remain unverified. Existing Gate A reports record failed validation; this audit does not clear those findings.

## Evidence, classification, and boundaries

- Read `AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, and `MEMORY.md`; inspected relevant source, all nine migration files, Phase 1/Gate A reports, and Base44 reference assets.
- The original `docs/research/CAPSTONE 1 PAPER.pdf` is present. Text extracted locally from its 98 pages verifies institutional/CAS access and four roles on pp. 16–19 and 65, identity/lifecycle modules on pp. 66–67, protected staff history on p. 69, and administrative analytics on pp. 71–72. No Admin1/Admin2 subdivision or standalone appointment module is specified in that decomposition. These findings do not rely on a missing paper or screenshot sample data.
- **RESEARCH-REQUIRED:** FR-01 authentication/CAS verification, FR-02 four-role authorization, FR-03 archived history, FR-09 protected staff-action history, and FR-18 administrative analytics (`PRD.md:54–71`).
- **APPROVED USER REQUIREMENTS:** Admin1-only account creation/invitation, Admin2 operational assistance with protection against takeover, administrative recovery/reporting, and scheduling in a later phase. This approves the requirements and this audit; the user explicitly withholds implementation approval.
- **EXISTING-IMPLEMENTATION** means a code/schema definition was located. **DESIGN-REFERENCE** means an inspected image, without a claim of implementation. **RECOMMENDED** identifies the proposed design. **UNVERIFIED** identifies missing runtime evidence.
- Capability labels: **IMPLEMENTED** = source supports the capability; **PARTIAL** = a supporting portion exists; **MISSING** = not found after repository searches and caller/schema inspection; **UNVERIFIED** = insufficient evidence. None certifies deployment behavior.
- No database, hosted Auth settings, actual administrator identities, delivery service, or production account was inspected. No application/SQL code, old documentation, data, dependencies, deployment settings, or Git history was changed. Existing uncommitted changes were preserved.
- All three Phase 1 reports, Gate A reports, the original research PDF, and 24 Base44 PNGs are present. `CAS_ASSIST_ENHANCEMENT_AUDIT_AND_DEFENSE_ROADMAP.md`, referenced by prior Gate A documentation, was not found. The source ZIP is absent, but its unpacked Base44 images are available. `Audit Logs.png` duplicates the AI image, and `RequestTicketID.png` is a placeholder; these are unusable detailed-screen references, not invented evidence.

For readability, these migration aliases are used below; line numbers refer to the current files:

| Alias | Exact file |
|---|---|
| **BASE** | `Backend/supabase/migrations/202607280001_research_compliance.sql` |
| **SCHEDULE** | `Backend/supabase/migrations/202609110001_document_requests_and_schedules.sql` |
| **STUDENT-ID** | `Backend/supabase/migrations/202609130001_student_number_registration.sql` |
| **ANALYTICS** | `Backend/supabase/migrations/202609130002_system_analytics.sql` |
| **KNOWLEDGE** | `Backend/supabase/migrations/202609130003_tier1_knowledge_base.sql` |
| **PHASE1** | `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql` |

## 1. Existing architecture and authentication flow

### Actual architecture

The Expo application root is `Frontend`, and the Express root is `Backend`. Each uses npm and has a package lock. Declared versions are Expo `^57.0.17`, React Native `0.86.3`, React `19.2.3`, Expo Router `~57.0.21`, Supabase JS `^2.106.2`, Express `^5.2.1`, and TypeScript `~6.0.3` (`Frontend/package.json:3–41`, `Backend/package.json:26–44`). These are package declarations, not a new installed-version compatibility certification.

Most application screens query Supabase tables/RPCs directly with the user's session. Express provides supplementary health, AI, queue, and notification endpoints (`Backend/src/app.ts:46–49`). This differs from the entirely API-mediated target diagram in `ARCHITECTURE.md:16`; its appended Phase 1 observations describe the actual arrangement. Preserve both trust boundaries rather than moving all existing modules behind new REST APIs.

| Boundary | Current implementation |
|---|---|
| Frontend Supabase | Public client, persisted AsyncStorage session, token refresh; URL session detection disabled (`Frontend/src/lib/supabase.ts:6–12`). |
| Frontend API calls | Existing `apiPost`/`apiGet` attach the bearer token, enforce a timeout, and report an unconfigured optional API (`Frontend/src/lib/api.ts:3–19`, `:21–45`, `:48–72`). |
| Express identity | `requireAuth` validates the token with Supabase Auth, loads the registry, checks matching institutional email and known role/state/verification values (`Backend/src/middleware/auth.ts:11–46`). |
| Express eligibility | `requireVerifiedCas` requires active/verified access; students additionally require a current dated membership joined to an active CAS program (`Backend/src/middleware/auth.ts:61–88`). |
| Privileged persistence | Backend-only client uses the configured server secret and does not persist/refresh sessions (`Backend/src/supabase.ts:5–11`). Service-role access is not constrained by ordinary end-user RLS. |
| Database | Application RLS, governance triggers, and privileged functions; prepared Phase 1 adds restrictive operational/history gates. Actual effective hosted policies/grants are UNVERIFIED. |

### Registration, profile creation, and login

1. `_layout.tsx` chooses the public landing/login/register views (`Frontend/src/app/_layout.tsx:143–163`). Student login exposes registration; institutional login says authorized accounts only (`Frontend/src/components/auth/login-screen.tsx:140–159`). Login category is a UI check, not authority to assign a role.
2. `RegisterScreen` normalizes email and validates NEU domain, name, student number, matching passwords, and an eight-character minimum (`Frontend/src/components/auth/register-screen.tsx:37–69`).
3. `AuthProvider.signUp` directly calls **`supabase.auth.signUp`** with display-name/student-number metadata (`Frontend/src/context/auth.tsx:223–245`, specifically `:230`). This is the production registration call. No application backend authorizes it.
4. `auth.users` has an AFTER INSERT profile trigger (**BASE:461–481**). Its latest body (**STUDENT-ID:24–47**) inserts `student`, `active`, `pending`, checks the institutional suffix, and normalizes the student number. Supplied role metadata does not select a privileged role. The student-number column is nullable, with format/uniqueness constraints when supplied (**STUDENT-ID:4–22**); presence is currently required by the registration UI only.
5. Password login calls `signInWithPassword` and loads the trusted registry profile (`Frontend/src/context/auth.tsx:202–219`). Session restoration/auth events are handled at `:151–198`.
6. The profile query includes verification status; active verified identities call `has_active_cas_access()` (`Frontend/src/context/auth.tsx:81–106`). Root navigation admits recognized roles with operational access, or verified archived history (`Frontend/src/app/_layout.tsx:134–140`). Restricted identities see refresh/sign-out and verification messaging (`Frontend/src/components/auth/verification-pending-screen.tsx:8–33`).

**New requirement gap:** student self-registration currently conflicts with Admin1-exclusive provisioning. Removing the registration button alone would leave direct Supabase signup possible. The paper's registration/domain module does not establish Admin1-only provisioning; the current instruction is an approved governance refinement. Preserve student login and existing accounts while deliberately changing new-account onboarding in a later approved implementation.

### Email ownership versus CAS verification

The registration flow treats an absent session as confirmation required and displays a check-email state (`Frontend/src/context/auth.tsx:237`, `Frontend/src/components/auth/register-screen.tsx:72–88`). This does not prove delivery or callback acceptance.

The **local** Supabase config enables signup globally and for email (`Backend/supabase/config.toml:176`, `:221`), disables email confirmations (`:226`), sets a six-character minimum (`:182`), enables double confirmation for email changes (`:224`), and disables secure password-change reauthentication (`:228`). Site/redirect URLs are localhost examples (`:159`, `:163`). Hosted configuration and SMTP are UNVERIFIED. Do not infer production settings from this file. Supabase documents that disabling Confirm Email assumes email verification rather than proving mailbox ownership. [Supabase general configuration](https://supabase.com/docs/guides/auth/general-configuration).

CAS verification is separate: **PHASE1:8–29** checks registry/Auth email equality, institutional domain, active/verified status, and managed student affiliation. Neither this helper nor backend middleware independently checks `email_confirmed_at`. A trusted role/verification attestation is used for personnel; an independent staff roster is absent. There is no implemented administrator approval interface/API to complete this process.

### Recovery, suspension, and archival

- **Password recovery: MISSING.** No runtime `resetPasswordForEmail`, `PASSWORD_RECOVERY` handling, password `updateUser`, `verifyOtp`, `exchangeCodeForSession`, or recovery route was found. The auth listener ignores its event type (`Frontend/src/context/auth.tsx:176`). `detectSessionInUrl: false` means future invitation/recovery flows need explicit handling; it does not prove every existing email-confirmation link is broken.
- **Lifecycle:** only `active` and `archived_read_only` exist, separately from `pending`/`verified`/`rejected` (**BASE:12–19**, `Backend/src/types.ts:4–5`). No suspended/banned lifecycle, Auth-ban action, or administrator archive/unarchive UI/API was found.
- **Archival enforcement exists in local source:** verified archives retain their pre-existing row-scoped history, while operational mutation/AI access is denied (**PHASE1:32–86**, frontend root gate). Archival is not full suspension: history access remains intentional.
- A self profile form edits display name only (`Frontend/src/app/profile.tsx:69–89`). The governance trigger protects role/state/verification fields from non-service-role updates (**BASE:438–459**); it does not protect every profile field, including email. Registry/Auth email inconsistencies cause Phase 1 operational access to fail closed. Do not derive primary identity from editable email/name.

## 2. Current role and permission matrix

The database application enum contains exactly `student`, `faculty`, `staff`, and `super_admin` (**BASE:8**); backend and frontend unions match (`Backend/src/types.ts:3`, `Frontend/src/context/auth.tsx:13`). These are application roles, distinct from PostgreSQL/Supabase execution roles `anon`, `authenticated`, and `service_role`. An authenticated `super_admin` is not a service-role caller.

The following describes source permissions with the prepared Phase 1 gates, not verified hosted behavior. Operational actions require active verified CAS eligibility; archived read access retains only the underlying row scope.

| Operation | Student | Faculty | Staff | `super_admin` | Evidence |
|---|---|---|---|---|---|
| Self profile / directory | Own profile | Own profile | Read directory | Read directory | **BASE:665–673**, **PHASE1:79–86**; `admin.tsx:958–1103`. |
| Create Auth account | Public student signup path currently exposed | No dedicated personnel creation | No runtime admin creation | No runtime admin creation | `auth.tsx:230`; `Backend/src/app.ts:46–49`. Signup availability is also Auth-provider configuration. |
| Change roles/state/verification | Denied as end-user JWT | Denied | Denied | Denied as end-user JWT | Self-only profile UPDATE RLS and service-role governance trigger, **BASE:438–459**, **BASE:669–673**. |
| Advising | Submit/read own | No general ticket workspace | Read/process | Read/process in existing code | **BASE:695–710**, **PHASE1:133–171**. Super-admin processing exceeds the paper's audit-only matrix; preserve pending separate alignment decision. |
| Internal ticket notes/routing | No | No | Manage | Manage | **BASE:733–739**. Not all note/routing actions have an immutable event trigger. |
| Ticket audit history | No dedicated access | No | No admin audit tab | Read | **BASE:741–743**, `Frontend/src/app/admin.tsx:862–955`, `:1142`. |
| Faculty assignments / room changes | Applicable cohort reads | Own assignments and room changes | No faculty room mutation; can manage legacy schedules | Administrative reads; can manage legacy schedules | **BASE:683–693**, **BASE:745–784**, **SCHEDULE:123–146**, **PHASE1:88–113**. |
| Announcements / calendar | Published targeted read | Published targeted read | Manage | Manage | **BASE:785–832**. Calendar table/policy presence does not prove a finished calendar screen. |
| AI inquiry | Active eligible query | Existing API supports role-scoped query | Existing API supports role-scoped query | Existing API supports role-scoped query and knowledge privileges | `Backend/src/routes/ai.ts:10–27`; **KNOWLEDGE:26–35**. Nonstudent querying differs from paper Table 3.1 / `RULES.md:35–46`; no change authorized here. |
| Student queue estimate | Own trusted UUID | Denied | Denied | Denied | `Backend/src/routes/queue.ts:11–22`. |
| Queue analytics | Denied | Denied | Allowed | Allowed | `Backend/src/routes/queue.ts:25–35`; RPC service-only **PHASE1:175–180**. |
| System analytics | Denied | Denied | Denied | Allowed | **PHASE1:358–470**; `system-analytics-screen.tsx:602–606`. |
| System settings / knowledge administration | Denied | Denied | Denied | DB policy allows management; settings UI missing | **BASE:842–871**, **KNOWLEDGE:32–35**. |
| Notification send API | Denied | Denied | Accepted scaffold | Accepted scaffold | `Backend/src/routes/notifications.ts:8–23`; a 202 response does not prove delivery. |

### Frontend, backend, and privileged-function enforcement

- Web/native navigation recognizes the same roles and exposes management to staff/admin, analytics to super-admin, and requests to students (`Frontend/src/components/app-tabs.web.tsx:126–149`, `Frontend/src/components/app-tabs.tsx:79–107`). Dashboard selection is role-based (`Frontend/src/app/index.tsx:10–14`).
- `RoleGuard` enforces allowed roles and an optional active-access check, defaulting to false (`Frontend/src/components/role-guard.tsx:10–25`). Root gating and server/DB enforcement remain essential; hidden navigation never grants or revokes rights.
- Backend `allowRoles` checks the loaded registry role (`Backend/src/middleware/auth.ts:49–58`). Queue, AI, and notification routers use the eligibility middleware. No administrator authority-level/target guard exists.
- **PHASE1:8–49** supplies active/history definer helpers; **:133–171** supplies the narrow ticket status RPC; **:175–180** makes queue RPCs service-role-only; **:182–217** guards room acknowledgements/AI feedback; **:226–263** guards service-only escalation; **:268–356** guards authenticated Tier-1 answering; **:358–470** guards super-admin analytics. Existing role/state helpers, profile creation, and audit triggers also run privileged code (**BASE:415–481**, **:483–509**). These paths require explicit review when adding privileges; RLS alone does not constrain definer/service actions.
- The service client remains in `Backend/src/supabase.ts:5`. No runtime frontend service-role usage was found in the reviewed source. Actual bundle/secret configuration was not inspected.
- Developer scripts call privileged Auth APIs: `Backend/scripts/seed-test-environment.mjs:26–79` lists/updates/creates users and changes role/verification/password; `Backend/scripts/verify-student-registration.mjs:18–44` creates and deletes a temporary Auth user. These are test utilities, not authenticated administration features. They were not run.

## 3. Existing administrative functionality

| Capability | Classification | Verified extent and limitation |
|---|---|---|
| User directory | **IMPLEMENTED** | `Frontend/src/app/admin.tsx:958–1103`: live registry query, name/email/student number, role/state, counts, search, filters, sort, loading/error/empty/refresh. It is read-only and does not load verification status. Staff also see Users (`:1111`, `:1137–1142`). |
| Account creation / invitation | **MISSING** as administrative application feature | Public student signup exists; no Admin1 provisioning UI/API. Fixture scripts are not production workflows. |
| Password recovery | **MISSING** | No self-service or administrator-initiated recovery flow/callback. Reference images are present. |
| Account status changes | **PARTIAL** | Archive/verification fields and access restrictions exist; authorized administrator controls/API do not. Suspension is not implemented. |
| Role assignment | **PARTIAL** | Four-role schema and service-only protection exist; no runtime authenticated assignment flow. |
| System-wide dashboard/status | **PARTIAL** | Real registry/ticket/announcement queries and recent users; errors can appear as zero, and health coverage is limited (section 8). |
| Request analytics | **IMPLEMENTED** in local source; live results **UNVERIFIED** | Aggregate system RPC plus queue API, charts/counters, and 7/30/90-day selection. Calculation/health limitations remain. |
| Audit logging | **PARTIAL** | Immutable advising-row mutation records and a last-100 event reader exist. No complete account provisioning, recovery, permission, or status-change audit trail. |
| Reporting | **PARTIAL** | On-screen analytics/report views exist. No generated/downloadable CSV/PDF report workflow found. |
| Administrative settings | **PARTIAL** | `system_settings` table/policy exists (**BASE:407–413**, **:868–871**); no settings management UI/API or runtime consumer found. |
| Admin1 / Admin2 separation | **MISSING** | No protected level, primary UUID designation, capability checks, or takeover tests. Actual accounts cannot be identified from the repository. |

## 4. Missing functionality and smallest recommended improvements

Priorities below identify implementation risk/importance; they do not authorize changes. Security gaps against the new requirements are not claims that an unavailable account-management endpoint is currently exploitable.

| ID / priority | Requirement and existing gap | Smallest improvement | Risk and verification |
|---|---|---|---|
| ADM-01 / P0 | Approved Admin1 exclusivity and anti-takeover; only shared `super_admin` exists. Evidence: **BASE:8**, backend `auth.ts:49`. | Protected authority designation plus shared actor/target guards, before adding account mutation routes. | Incorrect bootstrap can lock out admins or grant takeover. Test UUID binding, missing authority, self-promotion, every primary-target action, and concurrent changes. |
| ADM-02 / P0 | Approved account provisioning; public signup remains at `auth.tsx:230`, no admin route. | Backend-only Admin1 provisioning and provider-level closure of public signup during approved rollout. | Closing signup too early stops onboarding. Verify both direct Auth API denial and successful invited-user activation, including all enabled providers. |
| ADM-03 / P1 | FR-01/FR-02; no safe administrative verification/role UI/API despite protected fields. | Explicit validated governance actions for permitted targets; separate verification from email ownership; managed student membership. | Wrong role/affiliation grants institutional access. Test pending/rejected users, staff/ordinary-user denial, and no metadata-based privilege gain. |
| ADM-04 / P1 | Approved password recovery; runtime absent. | Send recovery to the existing verified address, add restricted callback/reset flow, protect primary identity. | Redirect/token leakage or email-change chains can enable takeover. Test alternate-address rejection, token non-disclosure, expiry/reuse, pending/archive behavior. |
| ADM-05 / P1 | FR-03; archive enforcement exists but no administrative action. | Add authorized archive action with account audit; preserve historical reads. | Do not substitute archive for full suspension or invent a suspended enum. Test open sessions, history, and operational denial after change. |
| ADM-06 / P1 | FR-09/supporting governance; ticket audit does not cover account operations or all notes/routing. | Append-only account-action history with trusted actor UUID; review note/routing coverage separately. | Service writes may otherwise record null/wrong actor. Test immutable events, denied attempts, failures, and transaction boundaries without secrets. |
| ADM-07 / P1–P2 | FR-18/approved status/reporting; incomplete error handling and health/metric semantics. | Correct isolated confirmed defects and show unavailable states; define report fields/time ranges before export. | False zero/health values mislead administrators. Verify against known synthetic rows and unavailable services. |
| ADM-08 / P2 | Approved report generation; screen summaries only. | Agree one minimal aggregate report and reuse existing aggregate sources after correctness validation. | Large exports/privacy/time-window mismatch. Test authorized access, boundaries, content and failure handling; no student detail by default. |
| ADM-09 / later phase | Approved future appointments; no booking baseline. | Agree scheduling rules and data model separately after account boundaries. | Concurrent capacity, ownership, timezone and cancellation rules are undefined. Use the later-phase criteria in section 9. |

## 5. Admin1 / Admin2 architecture recommendation

### Comparison based on repository dependencies

| Consideration | Separate Admin1/Admin2 application database roles | Existing `super_admin` plus protected level |
|---|---|---|
| Research compatibility | Expands/replaces the paper's four-role model. | Keeps both administrators in the existing IT role. |
| Database impact | Enum, role comparisons, `app_role[]` audiences, helpers, RLS, RPCs and historical compatibility need review. | Add a narrow authority relation/helper and account-operation checks; existing operational roles/audiences continue. |
| Backend impact | Change `AppRole`, recognized-role set, every admin allowlist and analytics path. | Keep existing union/guards; add administrative capability/target validation. |
| Frontend impact | Update category validation, dashboard selection, navigation, badges, guards and role filters. | Keep routes/components; expose trusted capability for relevant account controls only. |
| Takeover prevention | Separate strings alone do not stop Admin2 changing Admin1 credentials/email via a service endpoint. | Protected identity and target guards are still mandatory, with fewer existing contracts affected. |
| Risk | Higher compatibility risk across already-working modules. | Lower disruption, provided authority cannot be written through existing admin settings/profile paths. |

**Recommend the second option.** This is a proposal, not a new implemented permission system. Representative dependencies are **BASE:8**, **BASE:415–431**, **BASE:785–871**, **PHASE1:20**, **PHASE1:153**, **PHASE1:366–368**, `Backend/src/types.ts:3`, `Backend/src/middleware/auth.ts:6`, and `Frontend/src/context/auth.tsx:13`, `:58–61`.

### Protected designation and authorization

Use one small server/database-controlled authority relation keyed to the immutable Supabase Auth UUID, with a constrained level such as `primary` or `delegated`. Suggested names are design proposals, not existing schema. Keep it outside ordinary client writes, preferably in an unexposed governance schema with tightly granted helper access. Require at most one primary at the database level and exactly one valid primary before enabling new account administration; missing/ambiguous configuration fails closed. Do not automatically make the first/existing admin primary.

The primary designation must not be stored in `user_metadata`, local state, display name, an email naming convention, or unrestricted `system_settings`. Every super-admin currently has a table-wide settings policy (**BASE:868–871**). A newly added profile column would also require explicit governance protection: **BASE:438–459** protects only its listed fields. A dedicated relation avoids widening normal profile updates.

Approved bootstrap must identify Admin1's UUID through a trusted operator process. Primary transfer, removal, and exceptional recovery need a separately controlled procedure; do not expose them as generic account edits. Protect the designation from cascade deletion/demotion of the primary account, and preserve a usable primary. Application Admin2 must not hold the service key, database-owner credentials, or Supabase project-owner access; those infrastructure powers would defeat application-level limits.

For each new administrative operation, verify the bearer identity, fresh active/verified registry status, protected authority, explicit action, target UUID, and permitted fields before any privileged Auth/database call. Ordinary role checks remain necessary but insufficient. Database-side administrative mutations must also check actor/target authorization and protect authority records; an endpoint that uses service privileges cannot rely on end-user RLS. Use narrowly scoped operations, not a generic pass-through Auth-admin API or arbitrary metadata patch.

| Proposed action | Admin1 | Admin2 |
|---|---|---|
| Existing dashboards, ticket operations, announcements, audit reads, analytics and permitted operational settings | Existing `super_admin` operations | Same existing operational capabilities |
| Create or invite a new account, including repeat invitation actions that can create an identity | Allowed through the protected backend | Denied; no provisioning side effect |
| Manage permitted non-primary accounts, ordinary roles, verification and archive state | Allowed with validation/audit | Same operational actions, with primary/self-escalation restrictions |
| Initiate ordinary-account password recovery | Send to stored verified address; no token disclosure | Same safe send-only operation for permitted targets |
| Change Admin1 identity/privileges/status or issue a session/recovery credential for Admin1 | Controlled owner workflow, with reauthentication and last-primary protection | Denied |
| Set primary level, promote self to primary, designate a replacement primary, bypass protection using bulk/settings/role edits | Separate controlled governance procedure | Denied |

Admin2 must not set Admin1's email, password, MFA/recovery factors, identity links, role/level, verification, lifecycle, deletion state, or recovery destination; impersonation/session/token issuance is also forbidden. Apply the same checks through bulk operations, imports, generic updates, invite resend, email change, and settings. Primary-authority assignment is outside ordinary role reassignment. Before Step 2 implementation, document the precise allowed transitions involving delegated administrators; no transition may let Admin2 acquire or delegate primary power. This restriction protects the approved primary identity without reducing Admin2's ordinary operational functions.

Database governance changes should lock/recheck relevant authority rows transactionally. Auth API calls cannot be made atomic with a separate Postgres transaction; define operation-state/reconciliation and revalidate authority around privileged steps rather than claiming cross-service atomicity. Keep incomplete accounts pending and never elevate on a partial failure.

## 6. Account provisioning security requirements

Backend-only provisioning is feasible using the existing Express server and privileged client; it does not require a rebuild. Supabase documents server-only `auth.admin.createUser` and an email invitation API. These APIs do not implement CAS-specific Admin1 authorization themselves. [Supabase createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Supabase inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).

For an approved implementation:

1. Authorize an active verified Admin1 using protected UUID-bound authority on every request. Reject Admin2, staff, students, faculty, expired tokens, pending/rejected accounts, and missing designation. Never accept actor ID or authority from the request.
2. Validate institutional email on the server, normalize identifiers, allowlist target role/fields, enforce student-number requirements where appropriate, and establish CAS affiliation from an approved source. Do not create invented memberships or auto-verify based on email alone.
3. Prefer invitation to let the account owner establish credentials. Do not expose an administrator-selected password, generated password, invitation bearer token, or session in responses/logs. A create-user fallback needs an explicitly reviewed activation flow, not copied fixture behavior.
4. Account creation triggers **STUDENT-ID:24–47**, including for Auth-admin creation/invitation: the initial registry is a pending student. Trusted provisioning must separately reconcile the intended role and verification/membership. Putting a staff/admin role in metadata will not achieve this. Verify trigger compatibility for invite payloads with nullable student numbers.
5. Keep email ownership, CAS verification, role assignment, and activation distinct. An invitation must not automatically activate unverified CAS access. Handle duplicates, partial Auth/profile/membership failures, retry/idempotency, and failed email delivery visibly; never delete an existing user as retry cleanup.
6. Close public signup at the **Auth provider boundary**, not just UI/RLS, after the approved invitation path works. Supabase's signup configuration governs whether new users can sign up. Inventory enabled OAuth/OTP/SSO/anonymous/provider paths and test all identity-creating alternatives; retain normal existing-user sign-in. Verify privileged invitation behavior under the exact closed-signup configuration on an isolated target. [Supabase signup configuration](https://supabase.com/docs/guides/auth/general-configuration).
7. Replace public registration entry/copy only within the approved onboarding scope; retain the existing auth layout, login categories, sessions and protected pending/history screens. Explain how a new user requests an account without creating one through an unauthorized path.
8. Record sanitized provisioning intent/outcome, actor, target UUID, approved role/verification decisions, timestamp and correlation ID in protected account audit history. Do not log password/link/session material. Validate logging redaction for new payload names; existing HTTP redaction only covers selected fields (`Backend/src/app.ts:35–37`).
9. Keep provider/configuration changes separate from local code preparation. No hosted signup/email/deployment setting change is authorized by this audit. Rollout must coordinate public-signup closure with functioning provisioning so onboarding remains available.
10. Update current onboarding guidance through a new approved content change: **KNOWLEDGE:85** seeds a FAQ advertising self-registration. Do not edit a historical applied migration to change live knowledge. Also inspect the registration copy in screenshots and app auth surfaces for consistency.

## 7. Password recovery recommendations

Add a send-only recovery action that resolves the permitted target UUID server-side to Supabase Auth's current confirmed email and checks registry consistency. The mutable registry email and caller input must never determine the recovery destination; the approved onboarding process must establish actual mailbox ownership, since disabled email confirmation can implicitly confirm an address. Reject arbitrary alternate addresses, redirects, identity changes, caller-selected new passwords, and recovery/session-token disclosure. Admin1 and Admin2 can initiate recovery for ordinary permitted targets; Admin2 cannot control Admin1's recovery. A recipient completing recovery chooses their own password.

Supabase's password flow requests an email with `resetPasswordForEmail`, uses configured redirect URLs, then updates the authenticated recipient's password with `updateUser`. It also describes explicit PKCE token exchange where that flow is selected. Reuse the existing auth infrastructure while choosing and testing a compatible Expo web/native callback; do not change URL detection globally without checking existing session behavior. [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords).

- Provide dedicated invitation/recovery completion routes before the normal operational CAS gate, so a pending invited user can establish credentials without gaining protected application access. Validate the recovery session and token type. Handle expired, reused, malformed and cancelled links.
- A public recovery request, if added, should use a generic response and abuse limits; it must only send to the account's own destination and never return a usable credential. Public recovery requests are not an administrative bypass or a way to create accounts.
- For Admin1, keep identity changes, factor removal, primary succession and exceptional recovery outside Admin2's operational endpoints. A send-only public request to Admin1's existing mailbox does not itself transfer authority, but do not let Admin2 retrieve the link, redirect delivery, replace factors, or complete recovery as Admin1.
- Configure exact approved redirects/deep links and verify SMTP delivery on the authorized test target. Local localhost URLs are not production evidence. Preserve `ForgotPassowrd.png` and `ResetPassword.png` styling; the latter only depicts an invalid-link state.
- Require appropriate recent authentication/MFA for sensitive administrative operations, as an implementation safeguard subject to approved configuration. Record actor/target/outcome without token/password material. Recovery does not change role, CAS verification, membership, archival state or primary level.
- Test revoked/archived/pending targets and active sessions. Resetting a password must not be presented as restoring operational eligibility; full suspension/session-revocation policy requires a separate explicit design.

## 8. Existing reports, dashboards, and audit capabilities

### Dashboard and status

`Frontend/src/components/dashboard/admin-dashboard-home.tsx:57–74` queries real users, active-state tickets, action-required tickets, published announcements, and five recent users. It does not fabricate fixture metrics, but ignores returned query errors and substitutes zero/empty values. Its “Open tickets” value counts only `submitted` (`:66`, label `:115`), excluding other unresolved states. Agree the label/metric definition before changing it; failed queries should be unavailable rather than successful zeros.

`Backend/src/routes/health.ts:5–10` reports process liveness and a timestamp; it does not test Supabase, email, storage, delivery workers, or the knowledge provider. The analytics screen requests `${API_BASE}/health` (`Frontend/src/components/analytics/system-analytics-screen.tsx:94`) while the Express mount is `/api/health` (`Backend/src/app.ts:46`). With the configured base used as an origin elsewhere, this path mismatch misreports availability. Gate A already reproduced it; it was not rerun or corrected here.

### Analytics and reporting

The analytics screen calls `get_system_analytics`, health, and queue analytics, with 7/30/90-day controls (`system-analytics-screen.tsx:62`, `:229–249`). The latest RPC requires active verified `super_admin` and aggregates users/roles/verification, advising status/resolutions, document requests, announcements, room changes/acknowledgements, AI outcomes, notification/device data, academic coverage, and knowledge coverage (**PHASE1:358–470**, replacing **ANALYTICS:1**).

Most totals/status counts are lifetime/current aggregates. Selected windows primarily affect `newInWindow` counts (**PHASE1:372–465**); do not label every metric as filtered-period data. The displayed analytics query latency spans the awaited parallel health/queue calls too (`system-analytics-screen.tsx:229–240`), not a database-only measurement. Notification aggregates reflect stored records and do not prove actual message delivery.

Queue analytics uses `/api/queue/analytics`, staff/super-admin authorization, and the service-only RPC (`Backend/src/routes/queue.ts:25–35`, **PHASE1:175–180**). Gate A records a triangular fractional-bound defect (`docs/reviewer/GATE_A_REMAINING_BLOCKERS.md:13`) in `Backend/src/services/queue-math.ts:20`, `:29`, with analogous SQL mode rounding at **BASE:624**. Preserve estimate labeling and do not certify report accuracy until corrected and validated.

No downloadable CSV/PDF generation, export endpoint, scheduled report generation, or appointment analytics was found. Existing screens satisfy part of reporting; downloadable report format, date semantics and authorized content need an implementation decision. The original research's reporting suite establishes graphs/trends, not a mandatory PDF format.

### Audit trail

**BASE:483–500** records advising-row insert/update/delete with `auth.uid()`, old/new values and action; **BASE:502–509** blocks audit UPDATE/DELETE. `Frontend/src/app/admin.tsx:862–955` displays up to 100 recent events. These are substantive protections but do not prove every staff action is covered: separate internal-note/routing tables have staff policies without equivalent audit triggers in the inspected migrations (**BASE:733–739**).

No complete account-creation/invitation, recovery, administrative authority, role, verification or lifecycle audit was found. Future service-role account writes must explicitly preserve the validated original actor; a service call's `auth.uid()` must not be assumed to represent the end user. Add only the account audit needed for approved governance, rather than relabeling the existing ticket history as a system-wide audit solution.

## 9. Scheduling and appointment baseline

Searches covered runtime frontend/backend code, all migrations, route inventories and settings definitions. Missing means missing from this checked repository; unknown production-only tables remain **UNVERIFIED**.

| Item | Status | Evidence / distinction |
|---|---|---|
| Appointment/booking/slot tables | **MISSING** | No persistence definition for appointments, bookings, service windows or capacity found. |
| Staff availability | **MISSING** | `schedules` is a faculty teaching timetable, not office availability. |
| Appointment components/screens/routes | **MISSING** | No route in `Frontend/src/app` or web route inventory (`Frontend/src/components/app-tabs.web.tsx:73–93`). |
| Booking APIs/RPCs | **MISSING** | Express only mounts health/AI/queue/notifications (`Backend/src/app.ts:46–49`); no booking RPC found. |
| Capacity configuration/overbooking protection | **MISSING** | No slot-capacity field/service implementation found. Screenshot examples are not config. |
| Faculty academic schedule | **IMPLEMENTED** in source | **SCHEDULE:62–77**; `Frontend/src/components/dashboard/faculty-dashboard.tsx:110–138`, `:414–458` query/display own teaching schedule, including loading/empty states. |
| Academic calendar storage | **IMPLEMENTED** schema support | **BASE:320–333** models institutional dates/events, not appointments. |
| Appointment promotional copy | **PARTIAL** / unsupported promise | `Frontend/src/components/auth/auth-landing-screen.tsx:57`, `:193` advertises appointments without an implemented workflow. Flag for future approved correction; not changed here. |
| Base44 appointment design | **IMPLEMENTED** reference asset | `design-reference/base44/Appointments.png`, visually inspected. |

The appointment reference shows a shared desktop shell, four KPI cards, a date/start/end/capacity/service/counter service-window form, and selected-date availability with booked/capacity information and block-window actions. Those controls and sample numbers are **DESIGN-REFERENCE**, not approved scheduling business rules or live data.

`PRD.md:196`, `DESIGN.md:339`, and `RULES.md:159` describe appointments as outside the original core research decomposition. The user's current instruction explicitly approves a **future extension**. Preserve that distinction; do not call booking research-required or implement it during this audit. Teaching schedules, calendar events, queue estimates and appointment availability must retain separate meanings.

Before the later scheduling phase, agree service owners/roles, timezone and service dates, availability source, overlap/capacity enforcement under concurrent booking, cancellation/rescheduling/no-show rules, status lifecycle, privacy, and notification behavior. Do not reuse the legacy schedule ownership-only mutation pattern; **PHASE1:88–103** specifically hardens it with role/eligibility checks.

## 10. Exact affected files and relevant source lines

**Only this report was created now.** The following is a review/possible future implementation map; it is not authorization to edit every listed file.

| Exact path / anchor | Relevance and smallest possible future impact |
|---|---|
| `Frontend/src/context/auth.tsx:8`, `:81`, `:151`, `:202`, `:223` | Profile/access types, restored session, login, direct public signup; trusted capability projection and invite/recovery completion integration. Keep existing role union. |
| `Frontend/src/lib/supabase.ts:6` | Persisted public client; evaluate callback handling without broad session changes. |
| `Frontend/src/lib/api.ts:16`, `:48` | Reuse authenticated API requests for new admin actions. No privileged key in frontend. |
| `Frontend/src/app/_layout.tsx:134`, `:143` | Preserve active/history gates; place restricted invite/recovery views appropriately. |
| `Frontend/src/components/auth/register-screen.tsx:37`, `:72` | Replace public account-creation behavior only after provisioning handoff is approved. |
| `Frontend/src/components/auth/login-screen.tsx:140` | Registration/recovery entry affordances; preserve centered auth design. |
| `Frontend/src/components/auth/auth-landing-screen.tsx:57`, `:193` | Existing appointment claims; later copy/scope reconciliation. |
| `Frontend/src/components/auth/verification-pending-screen.tsx:8` | Reuse pending/error/refresh/sign-out experience; preserve fail-closed access. |
| `Frontend/src/app/admin.tsx:258`, `:862`, `:958`, `:1106` | Existing ticket RPC, audit reader, read-only directory and management tabs. Extend Users incrementally; do not expose admin mutations to staff sharing this shell. |
| `Frontend/src/app/profile.tsx:69` | Existing self-display-name update; primary protection must not depend on hiding this form. |
| `Frontend/src/components/dashboard/admin-dashboard-home.tsx:57`, `:66` | Existing metrics, ignored query errors, submitted-only open count. |
| `Frontend/src/components/analytics/system-analytics-screen.tsx:62`, `:94`, `:229`, `:602` | Existing reports, health mismatch, fetch/timing semantics, super-admin guard. |
| `Frontend/src/components/role-guard.tsx:10` | Role/access guard; keep resource authorization outside presentation. |
| `Frontend/src/components/app-tabs.web.tsx:126`, `Frontend/src/components/app-tabs.tsx:79` | Preserve role navigation; future capability-aware action visibility. |
| `Frontend/src/components/ui/academic-ui.tsx:265`, `Frontend/src/components/dashboard/dashboard-primitives.tsx:100` | Reusable UI; section 12 lists exact primitives. No redesign required. |
| `Frontend/src/constants/theme.ts:10`, `:93`, `:120`, `:156`, `:164` | Existing tokens to retain. |
| `Frontend/src/components/dashboard/faculty-dashboard.tsx:110`, `:414` | Preserve teaching schedule and faculty workflows; not appointment storage. |
| `Backend/src/app.ts:35`, `:46` | Logging/redaction and router mounting; a future admin router would be additive. |
| `Backend/src/middleware/auth.ts:11`, `:49`, `:61` | Reuse trusted bearer/role/CAS validation; add specific admin authority/target checks without weakening existing guards. |
| `Backend/src/types.ts:3`, `Backend/src/supabase.ts:5` | Existing four-role types and server-only privileged client. |
| `Backend/src/routes/queue.ts:18`, `:25`, `Backend/src/routes/health.ts:5` | Existing queue/status contracts; preserve callers and correct health semantics separately. |
| `Backend/src/routes/ai.ts:10`, `Backend/src/routes/notifications.ts:8` | Preserve role-scoped AI and existing notification behavior; no broad account-management reuse. |
| `Backend/supabase/migrations/202607280001_research_compliance.sql:8`, `:27`, `:438`, `:461`, `:483`, `:665`, `:868` | Baseline role/profile/governance/audit/RLS/settings dependencies. Inspect, but do not rewrite applied history. |
| `Backend/supabase/migrations/202609130001_student_number_registration.sql:4`, `:24` | Latest profile trigger and student-ID constraints; invitation compatibility dependency. |
| `Backend/supabase/migrations/202609110001_document_requests_and_schedules.sql:62`, `:123` | Existing timetable schema/policies; leave separate from later booking. |
| `Backend/supabase/migrations/202609130002_system_analytics.sql:1` | Original reporting function; latest definition is in Phase 1. |
| `Backend/supabase/migrations/202609130003_tier1_knowledge_base.sql:26`, `:85` | Knowledge audiences and stale signup FAQ; future approved content change must be additive. |
| `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:8`, `:54`, `:146`, `:175`, `:358` | Prepared access gates, fixed table inventory, ticket RPC, queue grants, latest system analytics. Preserve; add later migration rather than editing this audit's dependency. |
| `Backend/test/authorization.test.ts:1`, `Backend/supabase/tests/phase1_security.sql:1` | Existing mocked authorization and isolated rollback-only database test seams; future admin tests must add new adversarial cases. |
| `Backend/supabase/audits/phase1_read_only_audit.sql:1`, `Backend/supabase/audits/gate_a_security_inventory.sql:1` | Prepared eligibility/effective privilege inventories; require an identified authorized target before execution. |
| `Backend/scripts/seed-test-environment.mjs:26`, `Backend/scripts/verify-student-registration.mjs:18` | Privileged fixture utilities; not production provisioning and not executed. |
| `docs/reviewer/PHASE1_SECURITY_IMPLEMENTATION_REPORT.md:7`, `docs/reviewer/GATE_A_SECURITY_VALIDATION.md:5`, `docs/reviewer/GATE_A_REMAINING_BLOCKERS.md:13` | Existing validation limits and blockers; retain reports as historical evidence. |
| `PRD.md:54`, `RULES.md:25`, `ARCHITECTURE.md:16`, `DESIGN.md:275`, `MEMORY.md:90` | After implementation approval, targeted updates should distinguish verified behavior, approved admin subdivision and future appointment scope. No edits now. |

Possible **new** Step 2 artifacts are an additive authority/audit migration, a small admin authorization module/router, focused tests, and invite/recovery views as the approved scope requires. Their filenames are not predetermined by this audit. New governance tables/functions need their own explicit grants/RLS and must not inherit broad admin write policies.

## 11. Compatibility risks with Phase 1 security changes

The nine migrations are ordered from **BASE** through **PHASE1**, with the legacy bridge, ticket-priority compatibility, student registration, system analytics, knowledge and Tier-1 answer migrations in between (`docs/reviewer/GATE_A_SECURITY_VALIDATION.md:36–52`). Phase 1 was prepared locally; existing reports record no database execution. This audit made no remote query and cannot establish a later deployment state.

| Risk / exact evidence | Compatibility requirement / verification |
|---|---|
| New frontend requires `has_active_cas_access` and narrow status RPC (`auth.tsx:97`, `admin.tsx:258`, `ticket-detail-screen.tsx:229`; **PHASE1:146**). | Missing RPCs fail closed; old staff clients using direct UPDATE fail after grants are revoked. Test coordinated old/new client rollout and approved rollback; do not remove security gates. |
| Invited/created users default to pending student (**STUDENT-ID:40–44**). | Complete trusted provisioning and memberships explicitly. Invite completion/recovery must work while pending without mounting protected operations. |
| Student eligibility requires dated memberships and active programs (**PHASE1:21–26**); personnel uses role/status attestations. | Do not auto-approve or backfill users to make tests pass. Verify test affiliations and responsible CAS attestation first. |
| Profile governance accepts service-role updates only (**BASE:443**). | A normal super-admin browser session cannot directly assign roles/archive accounts. Keep the restriction; add checked backend operations instead of broad profile RLS writes. |
| Service operations bypass end-user policy scopes (`Backend/src/supabase.ts:5`). | Fresh actor/target guards, explicit action allowlists, protected authority and trusted audit actor are mandatory for each new endpoint. |
| Phase 1 restrictive gates enumerate 24 current tables (**PHASE1:57–65**). | New authority/audit/appointment tables are not automatically protected. Supply explicit policies/grants with deny-by-default behavior. |
| Identity checks require Auth/registry email equality (**PHASE1:17**, backend `auth.ts:32`). | Future email changes need controlled consistency; Admin2 must not use them to control the primary. Do not identify Admin1 by an email string. |
| Existing privileges/default ACLs/live schema drift are unverified (Gate A GA-S1). | Inventory effective table/column/sequence/function permissions and owners on an approved isolated representative baseline; source RLS does not establish effective grants. |
| Broad ticket INSERT-field risk remains conditional (GA-S2, **BASE:95–114**, **:700**). | Test forged note/routing/timestamp inputs with actual grants; Phase 1 UPDATE hardening is not INSERT-column validation. No new runtime exploit is claimed here. |
| Unrelated anonymous storage paths may encounter helper EXECUTE restrictions (GA-S3, **PHASE1:46**, **:117–129**). | Test actual CAS and unrelated bucket paths without disabling RLS or granting anonymous operational access. This remains a source-supported conditional risk. |
| Gate A health-path and fractional queue defects remain recorded failures (`GATE_A_REMAINING_BLOCKERS.md:13–14`). | Fix under a separately approved narrow scope and rerun probes; do not present dashboards/reports as fully validated. |
| Existing sessions/UI profiles can be stale after governance changes. | Recheck eligibility/authority on privileged requests and database mutations; test revocation during open sessions. Already delivered data cannot be withdrawn by changing a role. |

Prior mocked tests/build results are recorded in Phase 1/Gate A reports, not fresh results from this audit. Real SQL/Auth/PostgREST/storage/browser acceptance remains unverified; passing old mocked tests would not prove the new administrator boundary. No production change or deployment is proposed as an automatic next action.

## 12. Base44 components and styles to preserve

Visually inspected references include `User Management.png`, `Super_Admin Dashboard.png`, `Service Configuration.png`, `Analytics.png`, `Appointments.png`, `ForgotPassowrd.png`, and `ResetPassword.png` under `design-reference/base44/`. Preserve their layout language through existing components. Screenshot sample users/emails, counters, totals and statuses are not institutional data or permission rules.

| Reference | Pattern to reuse | Boundary |
|---|---|---|
| `User Management.png` | Role/count cards, search/access/state filters, member rows, compact actions and permission guidance. | Its self-registration copy and sample account email do not override Admin1-only provisioning or NEU identity. Current app directory remains the starting surface. |
| `Super_Admin Dashboard.png` | Summary hero, KPI row, operational panels, protected-history/announcement summaries. | Keep real queried metrics and explicit unavailable states; no screenshot totals. |
| `Service Configuration.png` | Restrained card columns, small add/edit actions, status badges. | Do not add document/counter catalogs or put protected authority in broadly editable settings. |
| `Analytics.png` | Period/filter band, refresh, KPI and chart cards, muted legends. | Retain accessible data labels and correct time-window semantics. |
| `Appointments.png` | Future two-column service-window/availability workspace, compact inputs and KPI cards. | A later extension; no appointment function implemented here. No supplied mobile appointment mockup. |
| `ForgotPassowrd.png`, `ResetPassword.png` | Centered narrow auth card, labelled input/action/back link, concise invalid-link state. | Preserve original filename spelling. Successful reset form must be a consistent adaptation; it is not shown by the invalid-link image. |

The image set's `Audit Logs.png` is identical to `AI-Assistant.png`; a future audit interface must reuse existing table/card patterns rather than claim a dedicated supplied audit layout. Do not reproduce debug header strips, blue viewport annotations/borders, or preview chrome.

**Keep actual existing tokens**, rather than replacing them with approximate sample values in `DESIGN.md`:

| Source | Existing values / behavior to preserve |
|---|---|
| `Frontend/src/constants/theme.ts:10–67` | Aqua `#0B7D77`, slate/navy `#173F3D`, light canvas `#F5F7F6`, white/translucent cards, established status colors, light and dark modes. |
| `theme.ts:93–118`, `Frontend/src/global.css:1–9` | Existing platform/system sans typography. Reference serif-like headings do not authorize a font redesign. |
| `theme.ts:120–137` | Spacing tokens and caption/body/control/section/title/display type scale. |
| `theme.ts:139–169`, `:172` | Existing subtle shadows, 720/980 layout breakpoints, 44 minimum touch target, radii 10/14/18/999, max content width 1440. |
| `Frontend/src/components/app-tabs.web.tsx:12–14`, `:168–260` | Existing 248/72 expanded/collapsed sidebar, header/mobile navigation and role-aware route behavior. Preserve native navigation too. |
| `Frontend/src/components/dashboard/dashboard-primitives.tsx:100–124` | `BentoGrid`/`BentoPanel` wrap into current mobile/tablet/desktop widths. |

Reuse `StatusBadge` (`academic-ui.tsx:265`), `SectionHeader` (`:283`), `RoleHeroHeader` (`:310`), `SurfaceCard` (`:354`), `MetricCard` (`:393`), `EmptyState` (`:417`), `ActionButton` (`:537`), `TextField` (`:586`), and `ContentContainer` (`:633`) in `Frontend/src/components/ui/academic-ui.tsx`. Preserve busy/disabled semantics, accessible labels/focus, text status indicators and responsive wrapping. Existing `DashboardActionCard` and `ManagementCard` are also reusable (`dashboard-primitives.tsx:29–83`, `admin.tsx:166–171`).

Extend `UserList` at `Frontend/src/app/admin.tsx:958–1103` incrementally, retaining filters, sort, pull-refresh, empty/error/loading states and working navigation. Staff currently share the Users view; new admin mutations must have capability checks and backend enforcement independent of that shared shell. No UI was changed or rendered in a live browser during this audit.

## 13. Recommended implementation sequence

1. **Approve the Step 2 boundary and bootstrap policy.** Confirm retaining `super_admin`, the trusted Admin1 UUID designation process, protected-primary actions, allowed role transitions, and invitation-first onboarding. Confirm whether full suspension is actually required; do not conflate it with archival.
2. **Validate the existing security foundation on an identified isolated Supabase target.** Use the prepared inventories/tests only with exact target-specific authorization. Address Gate A's confirmed defects and effective-grant/storage/INSERT questions under approved scopes. Existing guides/reports remain the handoff; no production execution is implied.
3. **First account-management code task: protected administrator authority and actor/target guards.** Prepare an additive narrow migration, backend capability checks and negative tests. Keep existing four roles/navigation and avoid enabling new mutation endpoints until this boundary is verified. This is the safest first implementation task after approval.
4. **Add protected account audit and minimal governance operations.** Implement explicit ordinary-account role/verification/archive actions with trusted actor attribution and primary/self-escalation protection; reuse Users. No generic privileged patch endpoint.
5. **Add Admin1-only provisioning with restricted completion/recovery views.** Test trigger defaults, email ownership, CAS eligibility, failure/retry behavior and ordinary-user recovery. Admin2 gets safe operational recovery, never primary identity control.
6. **Coordinate the signup handoff.** After isolated acceptance, prepare the public signup UI/copy change, knowledge guidance update, exact provider settings and rollback plan. Execute hosted changes only after separate authorization; existing users continue to sign in.
7. **Complete validated status/reporting improvements.** Correct metric/error/time-window semantics, agree a minimal generated report if desired, reuse analytics and protect outputs. Do not rebuild dashboards.
8. **Plan and implement appointments in the later approved phase.** Establish booking rules and atomic capacity/ownership enforcement, then adapt the existing visual components. Preserve teaching schedules, queue estimates and other working modules.

Each step is a proposed delivery sequence. Step 1 authorizes only this report. Update relevant project documentation after an approved implementation establishes new verified facts; do not rewrite historical research or prior reports to match an implementation choice.

## 14. Acceptance criteria for Step 2

The next implementation request should explicitly choose a scope from this sequence. The minimum safe first slice is the authority/authorization foundation; end-to-end provisioning/recovery criteria apply before those features are considered complete or enabled. These are proposed acceptance conditions, not tests executed by this audit.

- [ ] **Scope and baseline:** approved feature branch confirmed; existing dirty work preserved; explicit file/migration/test scope recorded. No deployment, production account changes or provider-setting change without separate authorization.
- [ ] **Four roles retained:** existing students/faculty/staff/admin continue to use the same role values, dashboards, routes and audience policies. No automatic promotion or metadata-derived authority.
- [ ] **Protected primary:** Admin1 is bound to an approved immutable Auth UUID in protected storage; one-primary invariant enforced; missing/ambiguous designation denies new account administration. Direct client writes, editable settings and self-profile metadata cannot change authority.
- [ ] **Admin2 protections:** direct API, direct RPC/table attempts and indirect/bulk/settings paths cannot change Admin1's role/level, email, credentials, MFA/recovery factors, identity links, verification/state or deletion. Admin2 cannot promote itself or designate/create a replacement primary, mint primary sessions, retrieve recovery credentials, or defeat the last-primary safeguard. Include concurrency/revocation cases.
- [ ] **Operational parity:** both administrators retain approved operational user management, status, analytics/report access and ordinary-account recovery. Staff sharing the management shell gain no new mutation privileges. Ordinary role-assignment transitions are explicit and tested.
- [ ] **Provisioning, when in scope:** only active verified Admin1 can create/invite. Admin2/other roles/pending/rejected/archived/expired sessions are denied before any side effect. With public signup closed on the approved test target, direct signup and other enabled identity-creation paths cannot bypass Admin1; existing-user login and privileged invites still work.
- [ ] **Correct onboarding:** Auth trigger defaults remain fail closed; intended personnel roles are assigned only through trusted governance; students require valid managed CAS membership. Test normalized/invalid email and student IDs, duplicates, concurrent retries, partial failures, failed email delivery and incomplete provisioning. No automatic real-user verification/backfill.
- [ ] **Recovery, when in scope:** invitations and recovery links complete through tested Expo callbacks, including pending accounts, expired/reused links and mobile/desktop entry. Only the recipient sets their password; no alternate recovery destination, token/password/session disclosure or role/eligibility change. Admin2 cannot complete/control primary recovery.
- [ ] **Lifecycle preserved:** archives retain permitted historical reads and lose operational mutation/AI access; role/status changes take effect at the backend/database during an open session. Do not claim archive is suspension.
- [ ] **Audit integrity:** provisioning/governance/recovery events identify the validated actor and target with timestamps/results, omit secrets, and resist ordinary update/delete. Partial failures do not produce false success or leave elevated partial accounts.
- [ ] **Phase 1 compatibility:** isolated ordered migration/effective-grant tests and real JWT/PostgREST positive/negative cases pass for affected paths. New tables/functions have explicit grants/policies; old/new client RPC coupling and rollback are documented. Existing unresolved Gate A issues remain visible until actually cleared.
- [ ] **UI preservation:** use existing theme/components/navigation, UserList filters and busy/error/empty states. Compare relevant Base44 layouts at desktop and narrow widths, preserve keyboard/touch behavior and light/dark modes, and make no unrelated redesign.
- [ ] **Relevant regression checks:** backend/frontend type checks, existing backend tests, frontend lint/build and focused role workflows actually run with results recorded. Add meaningful authority/target and isolated integration tests; do not infer database security from mocked tests. Document unavailable checks honestly.
- [ ] **Documentation and stop boundary:** update only affected approved documentation with implemented versus intended behavior. Scheduling remains deferred. No commit, push, merge or deployment unless separately requested.

### Audit verification record

This task performed read-only Git/status inspection, source/migration/reference searches and line-numbered reads, local research-PDF text extraction, visual image inspection, official Supabase documentation checks, and an existing-file hash comparison around report creation. All 168 pre-existing files in the captured inventory retained their hashes; this report was the sole added file. The inventory excluded Git internals, dependency/build caches, and secret-file patterns. The required report path was absent before creation. After writing, all 14 required numbered sections were present and 115 explicit source path/line references passed existence and line-bound checks. An independent source review checked the administrative security recommendation.

No application test suite, build, Expo diagnostic, SQL migration/test/audit, remote verification script, live Auth request, or browser acceptance was run for this documentation-only task. Prior reports' PASS/FAIL/BLOCKED results remain attributed to those reports. Application and production security remain unverified beyond the stated source evidence.

**Stop:** the audit is complete with this report. Implementation awaits the user's approval.
