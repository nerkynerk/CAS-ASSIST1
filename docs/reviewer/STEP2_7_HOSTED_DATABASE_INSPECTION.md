# Step 2.7 — Hosted Database Read-Only Inspection Record

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Status: AUTHORIZED READ-ONLY INSPECTION COMPLETE — MIGRATIONS AND RECOVERY READINESS NOT CLEARED.** All 13 prepared Packet A SQL groups and the requested backup/Auth Dashboard states were reviewed from user-supplied results. Completion refers to this bounded inspection, not database security acceptance, a verified backup or authorization to change the project.

## Actual observations

| Item | Observation / evidence |
|---|---|
| Confirmed reference | **`rueukwztuflgpuvopmlu`**. Step 2.6 locally identified this reference in both configurations; the user has now independently confirmed the Dashboard match. |
| Target confirmation | The user answered **“Yes, the reference matches exactly”** to the Dashboard Reference ID confirmation question. This is user-reported Dashboard confirmation, not an assistant-observed hosted connection. |
| Reviewed references | `docs/reviewer/STEP2_6_HOSTED_SUPABASE_ASSESSMENT.md` and `docs/reviewer/STEP2_6_DATABASE_BACKUP_AND_MIGRATION_PLAN.md`. |
| Approved inspection boundary | Initial SQL scope is **Packet A only**, delivered one manageable group at a time after exact-target confirmation. Non-secret backup availability and Auth signup controls may be viewed without changing them. Packet B/C are withheld until Packet A results are reviewed; they must not be run automatically. |
| Available access method | No Supabase inspection connector or browser-control tool is available in this session. Browser-based manual guidance will be used; no hosted connection was attempted. |
| Actual SQL execution | No execution by the assistant. User-supplied results cover context/schema screenshots, expected relation presence, 81 relation/RLS/ACL rows, 323 column rows, 13 public enum rows, six extension rows, 38 policy rows, 414 routine/caller rows, 105 effective table-privilege rows, nine stored default ACL rows, three platform role-flag rows and a success/no-rows screenshot in response to the direct-membership query, recorded below. The repeated context screenshot shows the same values and is not treated as an additional distinct finding. |
| Hosted objects / permissions | All 13 prepared Packet A SQL groups have user-supplied results. The direct-membership query returned a reported empty result. Of 30 expected relation names checked, 29 resolve and `cas_admin.authorities` does not. Detailed object/column/enum/extension/policy metadata, routine/table privileges, default ACLs and role flags are recorded below. Policy predicates, routine bodies/defaults, reverse memberships, schema access/API exposure, contents and applied migration versions remain **UNVERIFIED**. |
| Backup / Auth settings | The Scheduled backups screenshot shows a FREE plan excluding project backups and no displayed recovery points. The Auth screenshot shows signup enabled, Email enabled, Confirm email disabled, anonymous sign-ins disabled and manual linking disabled. These are displayed states, not independently polled configuration or tested flows. Existing manual/external backups, recoverability and PITR details remain **UNVERIFIED**. |
| Existing work | The feature branch and existing dirty working tree were inspected. No application, UI, environment, migration, test, prior report, dependency or hosting file was edited. |

### Consolidated findings

- **Auth registration settings:** signup and Email are enabled; email confirmation is disabled. These displayed settings do not implement an Admin1-only registration boundary. Hooks, institutional-email enforcement and actual signup/recovery behavior were not tested.
- **Administration foundation:** `cas_admin` and its authority relation are not present in the supplied inventories; the authority lookup does not appear. Role/lifecycle enum labels and existing helper return types support the proposed minimal-change design at the metadata level, without validating constraints, account eligibility or runtime behavior.
- **Phase 1 state:** expected restrictive policy names and new access functions do not appear, while ticket UPDATE and broad routine EXECUTE permissions remain. The catalog differs from the intended local security state; actual applied migration versions are unread.
- **Additional security review:** the push-log table has RLS disabled; all 25 public tables grant client roles TRUNCATE and other broad privileges; broad creator/schema defaults are present; thirteen owner-privileged routines report client EXECUTE. The two-argument acknowledgement overload is outside the pending Phase 1 hardening. API reachability and exploitability were not tested.
- **Storage and recovery:** no Storage policies were returned, although RLS is enabled; working attachment/file access remains unverified. The Free-plan panel supplies no usable recovery point, and no complete manual backup or restore proof was demonstrated.
- **Stop boundary:** no Packet B/C, account count/version-row read, body/predicate inspection, application RPC, mutation/fixture test, backup operation, setting change or migration was performed by the assistant. The remaining risks need separate scoped work and approval.

### Packet A group 1 — user-supplied result

| Result column | Observed value |
|---|---|
| `database_name` | `postgres` |
| `executing_role` | `postgres` |
| `server_version` | `17.11` |
| `read_only` | `on` |
| `database_timezone` | `UTC` |

The screenshot supports that the reported query transaction was read-only. The version has the same major version (17) as the local planned database configuration. Neither fact proves migration compatibility or end-user authorization. The privileged executing role is not an application-role test, and the database name does not independently establish project identity; target binding remains the user's prior Dashboard reference confirmation. The assistant did not connect to or execute SQL on the project.

### Packet A group 2 — user-supplied schema inventory

The subsequent screenshot shows these ten schema rows:

| `schema_name` | `owner` as displayed |
|---|---|
| `auth` | `supabase_admin` |
| `extensions` | `postgres` |
| `graphql` | `supabase_admin` |
| `graphql_public` | `supabase_admin` |
| `pgbouncer` | `pgbouncer` |
| `public` | `pg_database_owne…` (right edge clipped; full owner name unconfirmed) |
| `realtime` | `supabase_admin` |
| `storage` | `supabase_admin` |
| `supabase_migrations` | `postgres` |
| `vault` | `supabase_admin` |

`cas_admin` is not listed in this result. This is consistent with the local Step 2 authority migration still being pending, but does not establish migration history or the status of Phase 1. This group establishes the `supabase_migrations` schema name; subsequent relation presence and column metadata are recorded in groups 3 and 5. Actual version rows remain unread. The screenshot contains metadata, not application or Auth records. The schema output does not independently display transaction settings; it was supplied in response to the fully wrapped read-only schema query.

### Packet A group 3 — user-supplied expected relation presence

The user pasted all 30 `object_name` / `exists` rows in response to the wrapped `to_regclass` query:

| `object_name` | `exists` |
|---|---|
| `supabase_migrations.schema_migrations` | `true` |
| `auth.users` | `true` |
| `auth.identities` | `true` |
| `public.users_account_registry` | `true` |
| `public.cas_programs` | `true` |
| `public.student_program_memberships` | `true` |
| `public.faculty_assignments` | `true` |
| `public.student_enrollments` | `true` |
| `public.advising_ticket_pipeline` | `true` |
| `public.ticket_attachments` | `true` |
| `public.ticket_internal_notes` | `true` |
| `public.ticket_routing_history` | `true` |
| `public.ticket_audit_logs` | `true` |
| `public.spatial_logs` | `true` |
| `public.spatial_log_acknowledgments` | `true` |
| `public.announcements` | `true` |
| `public.announcement_attachments` | `true` |
| `public.academic_calendar_events` | `true` |
| `public.device_push_tokens` | `true` |
| `public.notification_delivery_logs` | `true` |
| `public.handbook_source_documents` | `true` |
| `public.handbook_knowledge_embeddings` | `true` |
| `public.ai_query_logs` | `true` |
| `public.system_settings` | `true` |
| `public.document_requests` | `true` |
| `public.schedules` | `true` |
| `public.tier1_knowledge_articles` | `true` |
| `storage.buckets` | `true` |
| `storage.objects` | `true` |
| `cas_admin.authorities` | `false` |

These are catalog name-resolution results: 29 present, one absent. The expected Step 2 authority relation is absent, consistent with the preceding schema inventory. The result does not identify relation kinds, contents, row counts, role assignments, function definitions or security enforcement. The history relation exists, but no applied version rows were read. Neither Phase 1 application nor compatibility of any pending migration can be established from object presence alone. No application/Auth/Storage records were requested or supplied in this group.

### Packet A group 4 — user-supplied relation, RLS and ACL metadata

The user attached `Pasted text.txt` containing all 81 result rows for the prepared catalog query. It contains metadata only. The inventory consists of 73 ordinary tables (`r`), one partitioned table (`p`), three views (`v`) and four sequences (`S`). No returned relation has `force_rls=true`.

| Schema | Relations | Types, owners and observed RLS state |
|---|---:|---|
| `auth` | 28 | 27 ordinary tables and one sequence, owned by `supabase_auth_admin`. Sixteen tables have RLS enabled; eleven do not. `auth.users` and `auth.identities` have RLS enabled. |
| `extensions` | 2 | `pg_stat_statements` and `pg_stat_statements_info` are views owned by `postgres`. |
| `public` | 27 | 25 ordinary tables and two sequences, all owned by `postgres`. Twenty-four tables have RLS enabled; `push_notification_logs` does not. |
| `realtime` | 11 | `messages` is a partitioned table with RLS enabled; seven dated message partitions, `schema_migrations` and `subscription` are ordinary tables with RLS disabled; `subscription_id_seq` is a sequence. Owner is `supabase_realtime_admin` except `schema_migrations`, owned by `supabase_admin`. |
| `storage` | 10 | All ordinary tables, owned by `supabase_storage_admin`, with RLS enabled, including `buckets` and `objects`. |
| `supabase_migrations` | 1 | `schema_migrations` is an ordinary table owned by `postgres`, with RLS disabled and a null explicit ACL. No version rows were read. |
| `vault` | 2 | `secrets` is an ordinary table and `decrypted_secrets` is a view, owned by `supabase_admin`. Only their catalog metadata was inspected; no secret values were requested or read. |

The public table inventory is:

| Ordinary table in `public` | `rls_enabled` |
|---|---|
| `academic_calendar_events` | `true` |
| `advising_ticket_pipeline` | `true` |
| `ai_query_logs` | `true` |
| `announcement_attachments` | `true` |
| `announcements` | `true` |
| `cas_programs` | `true` |
| `device_push_tokens` | `true` |
| `document_requests` | `true` |
| `faculty_assignments` | `true` |
| `handbook_knowledge_embeddings` | `true` |
| `handbook_source_documents` | `true` |
| `notification_delivery_logs` | `true` |
| `push_notification_logs` | **`false`** |
| `schedules` | `true` |
| `spatial_log_acknowledgments` | `true` |
| `spatial_logs` | `true` |
| `student_enrollments` | `true` |
| `student_program_memberships` | `true` |
| `system_settings` | `true` |
| `ticket_attachments` | `true` |
| `ticket_audit_logs` | `true` |
| `ticket_internal_notes` | `true` |
| `ticket_routing_history` | `true` |
| `tier1_knowledge_articles` | `true` |
| `users_account_registry` | `true` |

Both public sequences, `notification_delivery_logs_id_seq` and `ticket_audit_logs_id_seq`, grant `rwU` to `postgres`, `anon`, `authenticated` and `service_role`. RLS flags on sequences/views are not evidence of missing table policies.

#### Verified security findings and limits

1. **Public push-log table lacks RLS and carries broad client-role grants.** `public.push_notification_logs` has `relkind=r`, owner `postgres`, `rls_enabled=false` and `force_rls=false`. Its explicit ACL grants `arwdDxtm` to `anon`, `authenticated` and `service_role` (grantor `postgres`). This is a concrete access-control concern requiring review before migration clearance. Whether any exposed API can reach the table, the schema privileges, its columns/contents and actual use remain unverified; no record read or exploit test was performed. The local baseline document mentions this legacy table at `Backend/docs/database-migration-plan.md:11`; a search of local SQL/application files found no table definition or active application reference. Do not infer that the hosted table is disposable or empty.
2. **All 25 public tables explicitly carry broad client-role privileges.** Each has the same ACL: `{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}`. On PostgreSQL 17, those letters mean SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. TRUNCATE and REFERENCES are outside RLS enforcement. Thus enabling RLS alone cannot establish least privilege for these tables. SQL-path availability, schema access, constraints and reachable RPCs still determine practical exposure; no anonymous HTTP or destructive SQL capability was tested. [PostgreSQL 17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html), [Row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
3. **Ticket privileges differ from the intended local Phase 1 result.** The supplied `advising_ticket_pipeline` ACL still includes table-level UPDATE for `anon` and `authenticated`. Local `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:133` revokes those table privileges, and lines 135–145 remove historical column UPDATE grants. The observed state is inconsistent with that intended final table ACL. It cannot establish whether the migration was never applied, differed when applied or was followed by later grants. History/function/policy checks remain necessary; no migration replay is authorized.
4. **Phase 1 alone does not cover every observed concern.** Local source inspection found no `push_notification_logs` handling or broad TRUNCATE privilege removal in the pending Phase 1 file. Its ticket UPDATE restriction addresses a specific permission boundary. A future reviewed migration plan must account for the newly observed table/grants instead of assuming the two pending migrations resolve every hosted gap. This is a source comparison and an unresolved planning requirement, not an implemented fix.

RLS-enabled flags do not prove policy correctness. `force_rls=false` alone is not a defect: owners normally bypass RLS, and owner-level Dashboard inspection cannot validate application-role enforcement. Null explicit ACLs, observed for `storage.migrations` and `supabase_migrations.schema_migrations`, mean catalog defaults apply, not that no access exists. Managed Auth/Storage/Realtime/Vault objects are not proposed for speculative changes based on these flags. Subsequent effective privileges, default ACLs and direct-membership results are recorded in groups 9–13 with their respective limits. [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [Privileges](https://www.postgresql.org/docs/17/ddl-priv.html).

### Packet A group 5 — user-supplied column/type/nullability metadata

The next attached `Pasted text.txt` contains 323 column rows across 30 tables. Only names, types, type schemas and nullability were requested and supplied; there are no record values or column defaults.

| Selected schema | Tables represented | Column rows |
|---|---:|---:|
| `auth` | 2 (`users`, `identities`) | 44 |
| `public` | 25 | 247 |
| `storage` | 2 (`buckets`, `objects`) | 29 |
| `supabase_migrations` | 1 (`schema_migrations`) | 3 |
| **Total** | **30** | **323** |

No `cas_admin` column rows were returned, consistent with the earlier schema and relation results. The selected scope does not inventory every column in other managed schemas.

#### Identity and authority prerequisites

The registry has 14 columns, including these directly relevant to administration:

| Column | Observed type | Nullable |
|---|---|---|
| `public.users_account_registry.id` | `uuid` | NO |
| `.email` | `text` | NO |
| `.display_name` | `text` | NO |
| `.role` | `public.rbac_role_tier` | NO |
| `.state` | `public.lifecycle_state` | NO |
| `.verification_status` | `public.verification_status` | NO |
| `.program_code` | `text` | YES |
| `.year_level` | `smallint` | YES |
| `.verified_at` | `timestamptz` | YES |
| `.verified_by` | `uuid` | YES |
| `.rejection_reason` | `text` | YES |
| `.student_number` | `text` | YES |
| `auth.users.id` | `uuid` | NO |
| `auth.users.email` | `varchar` | YES |
| `auth.identities.user_id` | `uuid` | NO |

The remaining registry columns are non-null `created_at` and `updated_at` timestamps. These observations establish presence of the column names used by the Step 2 authority lookup at `Backend/supabase/migrations/202611130001_admin_authority_foundation.sql:35–40`. The text/varchar email columns support its `lower()` comparison; a null Auth email cannot satisfy its eligibility predicates. No missing column prerequisite was identified in that focused lookup review. Registry UUID uniqueness, PK/FK constraints, matching Auth identities, email agreement, actual account eligibility and live function behavior remain unverified. The proposed authority FK at foundation line 12 requires a suitable registry key, which nullability alone does not establish.

**Legacy types require compatibility review, not automatic conversion.** Hosted registry `role` is `public.rbac_role_tier` and `state` is `public.lifecycle_state`; fresh-baseline local DDL instead names `public.app_role` and `public.account_lifecycle` at `Backend/supabase/migrations/202607280001_research_compliance.sql:31–32`. The local helpers deliberately cast through text to the newer types at lines 419 and 425. Phase 1 also references `public.app_role` at `202611090001_phase1_security_hardening.sql:187`, line 273 and line 366. Therefore different column type names alone do not prove a defect. Matching public enum labels are recorded in group 6 and hosted helper return types in group 9. Their definitions are outside this initial packet. Do not infer working hosted casts or permission to replace any type.

Auth column names include confirmation/recovery timestamps, token/password fields and managed flags such as `is_super_admin`. Their presence does not establish current Auth settings, working recovery/invitation flows, or application administrator status. No hashes, tokens, metadata JSON, identities or account values were read. The local Step 2 lookup uses the registry role and protected authority records; it does not designate Admin1 through the managed Auth flag.

#### Other compatibility and security observations

- **Push-log concern is reinforced by its structure.** `public.push_notification_logs` has nine columns: non-null UUID `id` and `recipient_id`; non-null `channel` of type `public.notification_channel`; non-null text `title` and `body`; nullable text `event_ref_type`; nullable UUID `event_ref_id`; non-null `sent_at` and nullable `read_at` timestamps. These are metadata names/types, not recipient IDs or message contents. Combined with the previously observed disabled RLS/broad ACLs, the table needs a documented access boundary before migration clearance. Its occupancy, actual sensitivity and API reachability remain unknown; no record query is authorized.
- **Ticket/AI columns used by Phase 1 are present.** Ticket `id`/`student_id` are non-null UUIDs, `status` and `priority` are non-null text, `state` is non-null `public.lifecycle_state`, and `resolved_at`/`created_at`/`updated_at` plus `public_note`, `assigned_office` and `flagged` exist. AI logs include `resolved_inquiry` boolean, `escalated_ticket_id` UUID and the answer/outcome/confidence fields. This supplies column-level prerequisites, not validation of allowed ticket states, transition triggers, defaults, constraints, required RPCs or migration execution. **Specific unresolved INSERT prerequisite:** ticket `file_attachment_urls` is a non-null `text[]`, but the local Phase 1 escalation INSERT at `202611090001_phase1_security_hardening.sql:255–256` omits it. An existing default or trigger may satisfy this; neither was inspected. Do not assume this flow succeeds or fails from nullability alone, and do not test it by creating a ticket during this inspection.
- **Legacy and newer columns coexist.** Announcements contain both `posted_by`/`created_by`, `is_pinned`/`pinned` and `published_at`/`publish_at`. Spatial logs contain both `logged_by`/`faculty_id`, `relocated_room`/`new_room` and `section`/`section_code`. Existing bridge triggers/functions must be verified later; column presence alone does not prove they are installed or working. Relevant local bridge definitions are in `Backend/supabase/migrations/202609120001_legacy_contract_bridges.sql:11` and line 39.
- **Scheduling remains an academic timetable baseline.** `public.schedules` has 14 columns including `faculty_id`, subject/section/room, `day` (`public.schedule_day`), start/end times, semester/academic year, lifecycle state and timestamps. `faculty_assignments` also includes class/section/room/day/time fields. These selected tables do not show appointment booking, attendee, staff-availability or capacity columns; this is not proof that no appointment object exists outside the inspected scope or that any screen/API works.
- **Storage layout is present, configuration values remain unknown.** `storage.buckets.id` is text; its `public` visibility flag, size/MIME settings and versioning/lifecycle-related columns exist. `storage.objects` includes `bucket_id`, `name`, `owner` and `owner_id`. No bucket visibility value, object path, file metadata value or file bytes were read. Column names do not establish a complete recoverable backup.
- **Migration history has the expected metadata shape.** `supabase_migrations.schema_migrations` contains non-null text `version`, nullable text-array `statements` and nullable text `name`. No values were read. Actual version rows remain Packet B; do not request the `statements` contents, which are outside the approved catalog inspection.

No absence or incompatible type was identified in the focused column prerequisites reviewed above. This column group alone cannot establish enum labels, hosted helper/RPC signatures, policy metadata, constraints/indexes, triggers/defaults or actual history. There is no migration clearance or security-test PASS.

### Packet A group 6 — user-supplied public enum labels

The user pasted these 13 rows from the prepared enum catalog query; label ordering is preserved below. All listed types are in `public`.

| Enum type | Labels, in reported order |
|---|---|
| `account_lifecycle` | `active, archived_read_only` |
| `advising_status` | `submitted, under_evaluation, action_required, resolved` |
| `announcement_audience` | `all, student, faculty, staff` |
| `app_role` | `student, faculty, staff, super_admin` |
| `document_request_status` | `submitted, under_evaluation, action_required, processing, ready_for_pickup, completed, rejected` |
| `document_type` | `transcript_of_records, certificate_of_enrollment, certificate_of_good_moral, honorable_dismissal, diploma, other` |
| `lifecycle_state` | `active, archived_read_only` |
| `notification_channel` | `push, in_app` |
| `rbac_role_tier` | `student, faculty, staff, super_admin` |
| `schedule_day` | `monday, tuesday, wednesday, thursday, friday, saturday, sunday` |
| `ticket_priority` | `low, medium, high, urgent` |
| `ticket_status` | `open, in_progress, pending_review, resolved, closed` |
| `verification_status` | `pending, verified, rejected` |

Actual conclusions and limits:

- `rbac_role_tier` and `app_role` have matching labels and ordering; so do `lifecycle_state` and `account_lifecycle`. This resolves the label-mismatch question raised by the column inventory. They remain distinct SQL enum types. The matching labels support the explicit text casts in the local helpers at research-compliance lines 419 and 425; they do not establish which casts, return types or bodies the hosted helpers use.
- The authority lookup's required registry labels (`super_admin`, `active`, `verified`) are present in the actual corresponding types. Both role enums retain the four application roles. These results are consistent with keeping `super_admin` plus separately protected authority levels; they provide no reason by themselves to add Admin1/Admin2 role-enum labels. The missing authority relation is not created or populated by this inspection.
- `advising_status` has the four research workflow labels. The legacy `ticket_status` enum has a different set. Group 5 established that the actual ticket `status` and `priority` columns are **text**; neither enum inventory proves their stored values or CHECK/default/trigger enforcement. In particular, `normal` not appearing in `ticket_priority` does not by itself invalidate Phase 1's text-priority INSERT at lines 255–256. Those checks and data observations remain in their separately gated scopes.
- Weekday and notification-channel labels match the earlier timetable and push-log metadata. Enum names/labels establish no appointment workflow, working notifications, account verification outcome or administrator designation.

No enum was modified, no cast or application function was executed, and no account or ticket records were requested. Extension inventory is recorded in group 7 below. The existing RLS/ACL findings and migration hold remain unresolved.

### Packet A group 7 — user-supplied installed extension metadata

The user pasted these six rows from the prepared extension catalog query:

| `extname` | `extversion` | `extension_schema` |
|---|---|---|
| `pg_stat_statements` | `1.11` | `extensions` |
| `pgcrypto` | `1.3` | `extensions` |
| `plpgsql` | `1.0` | `pg_catalog` |
| `supabase_vault` | `0.3.1` | `vault` |
| `uuid-ossp` | `1.1` | `extensions` |
| `vector` | `0.8.0` | `public` |

`vector` is installed in `public`, consistent with group 5's observed `public.vector` embedding column type. Local fresh-baseline source requests the extension in `extensions` at `Backend/supabase/migrations/202607280001_research_compliance.sql:5`; the hosted inventory must be respected rather than assuming that fresh-baseline placement. The pending Phase 1 and authority SQL files contain no direct `vector` reference. No extension relocation, upgrade or baseline migration replay is justified or authorized by this inventory alone.

These observations establish installed names, versions and extension schemas, not extension health, ownership/privileges, available upgrades, successful AI behavior or recovery completeness. The Vault extension's presence establishes no secret value or backup availability. No extension function was called for this check, no secret content was requested and no database object was changed.

Policy names, permissive/restrictive flags, roles and command types are subsequently recorded in group 8 below. The query omits predicate expressions (`qual` and `with_check`). Policy metadata alone cannot establish correct row filtering, effective caller permissions, applied migration history or complete Phase 1 installation.

### Packet A group 8 — user-supplied policy metadata

The user attached `Pasted text.txt` with 38 policies across 24 tables. All returned rows are in `public` and all are `PERMISSIVE`; 29 target `{public}` and nine target `{authenticated}`. Commands comprise 19 SELECT, ten ALL, five INSERT and four UPDATE policies. No `storage` or `cas_admin` policy rows were returned by the query covering all three schemas.

| Public table | Policy name | Roles | Command |
|---|---|---|---|
| `academic_calendar_events` | `calendar_staff_manage` | `{public}` | ALL |
| `academic_calendar_events` | `calendar_targeted_read` | `{public}` | SELECT |
| `advising_ticket_pipeline` | `tickets_active_student_insert` | `{public}` | INSERT |
| `advising_ticket_pipeline` | `tickets_owner_staff_read` | `{public}` | SELECT |
| `advising_ticket_pipeline` | `tickets_staff_update` | `{public}` | UPDATE |
| `ai_query_logs` | `ai_logs_active_student_insert` | `{public}` | INSERT |
| `ai_query_logs` | `ai_logs_owner_admin_read` | `{public}` | SELECT |
| `announcement_attachments` | `announcement_attachments_staff_manage` | `{public}` | ALL |
| `announcement_attachments` | `announcement_attachments_targeted_read` | `{public}` | SELECT |
| `announcements` | `announcements_staff_manage` | `{public}` | ALL |
| `announcements` | `announcements_targeted_read` | `{public}` | SELECT |
| `cas_programs` | `programs_authenticated_read` | `{authenticated}` | SELECT |
| `device_push_tokens` | `push_tokens_owner_write` | `{public}` | ALL |
| `document_requests` | `document_requests_read` | `{authenticated}` | SELECT |
| `document_requests` | `document_requests_staff_update` | `{authenticated}` | UPDATE |
| `document_requests` | `document_requests_student_insert` | `{authenticated}` | INSERT |
| `faculty_assignments` | `assignments_faculty_read` | `{public}` | SELECT |
| `handbook_knowledge_embeddings` | `knowledge_verified_read` | `{public}` | SELECT |
| `handbook_source_documents` | `sources_admin_manage` | `{public}` | ALL |
| `notification_delivery_logs` | `notification_logs_admin_read` | `{public}` | SELECT |
| `schedules` | `schedules_manage` | `{authenticated}` | ALL |
| `schedules` | `schedules_read` | `{authenticated}` | SELECT |
| `spatial_log_acknowledgments` | `spatial_ack_owner_faculty` | `{public}` | SELECT |
| `spatial_logs` | `spatial_cohort_read` | `{public}` | SELECT |
| `spatial_logs` | `spatial_faculty_insert` | `{public}` | INSERT |
| `spatial_logs` | `spatial_faculty_update` | `{public}` | UPDATE |
| `student_enrollments` | `enrollments_owner_faculty_admin_read` | `{public}` | SELECT |
| `student_program_memberships` | `memberships_owner_or_admin` | `{public}` | SELECT |
| `system_settings` | `settings_admin_only` | `{public}` | ALL |
| `ticket_attachments` | `ticket_attachments_owner_insert` | `{public}` | INSERT |
| `ticket_attachments` | `ticket_attachments_owner_staff` | `{public}` | SELECT |
| `ticket_audit_logs` | `ticket_audit_admin_read` | `{public}` | SELECT |
| `ticket_internal_notes` | `ticket_notes_staff_only` | `{public}` | ALL |
| `ticket_routing_history` | `ticket_routing_staff_only` | `{public}` | ALL |
| `tier1_knowledge_articles` | `tier1_knowledge_admin_manage` | `{authenticated}` | ALL |
| `tier1_knowledge_articles` | `tier1_knowledge_authenticated_read` | `{authenticated}` | SELECT |
| `users_account_registry` | `profile_self_read` | `{public}` | SELECT |
| `users_account_registry` | `profile_self_update` | `{authenticated}` | UPDATE |

Actual findings and compatibility implications:

1. **The expected Phase 1 restrictive policy package is not visible.** No `phase1_*` names or restrictive policies appear. Local `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:55–86` defines the restrictive public policy package; lines 117–129 define four restrictive Storage policies. The supplied catalog differs from that complete intended result. This is evidence about current policy metadata, not proof that a particular migration was never attempted/applied or that no differently named access control exists.
2. **Ticket and spatial policy metadata also differ from local Phase 1.** `tickets_staff_update` remains present, whereas Phase 1 line 132 removes it; this reinforces the earlier ticket UPDATE ACL mismatch. `spatial_faculty_update` currently targets `{public}`, whereas lines 104–114 recreate it for `authenticated`. `schedules_manage` has the same name/role target as the replacement at lines 90–102, so its metadata cannot distinguish legacy and newer predicates.
3. **No Storage policies were returned.** Group 4 established RLS-enabled `storage.objects` and `storage.buckets` plus explicit client-role grants. For ordinary non-bypassing roles, RLS without an applicable permissive policy defaults to denial. Phase 1's restrictive Storage additions alone grant no access; any intended client attachment workflow needs its base permissive policies and access path verified before migration approval. This does not establish bucket visibility, Storage API behavior, working/broken downloads, service-role access or absence of stored files. No Storage record or API call was made. [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
4. **The push-log finding remains.** No policy is listed for `public.push_notification_logs`, the sole public table previously shown with RLS disabled. Adding policy names alone would not establish enforcement while RLS is disabled. No policy or privilege change is authorized here.
5. **Policy names/targets are not authorization proofs.** `{public}` applies to database roles generally; it does not establish that anonymous callers satisfy a policy predicate. Names containing `admin`, `staff`, `owner` or `self` do not prove those checks exist. The profile self-update policy does not establish protection of role/state/verification fields; hosted triggers, predicates and column grants have not been reviewed. No `qual`/`with_check`, function body, user row or mutation test was requested.

Function metadata is subsequently recorded in group 9 below. Its query reads signatures/results, owners, security-definer flags, filtered `search_path`/`row_security` settings, ACLs and effective EXECUTE privileges for the three API roles. It does not call application routines or expose their bodies, argument defaults or raw configuration.

### Packet A group 9 — user-supplied routine and EXECUTE metadata

The user attached `Pasted text.txt` with 414 rows, representing 138 distinct signatures, all in `public`. Each signature has exactly three rows: `anon`, `authenticated` and `service_role`. All 414 reported `can_execute` values are `true`. Every parsed row has the expected ten metadata columns; there is no incomplete caller triplet. This checks internal consistency of the supplied result, not an independently queried hosted total or a guarantee that the Dashboard had no result limit.

Twenty signatures are owned by `postgres`; thirteen are SECURITY DEFINER and seven SECURITY INVOKER. The other 118 signatures are owned by `supabase_admin`, all SECURITY INVOKER, and have vector-family names/types consistent with the installed extension. Extension membership was not queried and is not asserted from naming alone. No routine rows were returned for `cas_admin`.

All twenty `postgres`-owned signatures have effective EXECUTE for all three checked callers:

| Signature in `public` | Result | SECURITY DEFINER | Filtered settings |
|---|---|---|---|
| `acknowledge_room_change(uuid)` | `void` | true | `search_path=public` |
| `acknowledge_room_change(uuid,uuid)` | `json` | true | none returned |
| `answer_tier1_question(text)` | `jsonb` | true | `search_path=public` |
| `audit_ticket_changes()` | `trigger` | true | `search_path=public` |
| `bridge_legacy_announcement_columns()` | `trigger` | false | `search_path=public` |
| `bridge_legacy_spatial_columns()` | `trigger` | false | `search_path=public` |
| `create_registry_profile()` | `trigger` | true | `search_path=public` |
| `current_profile_role()` | `public.app_role` | true | `search_path=public` |
| `current_profile_state()` | `public.account_lifecycle` | true | `search_path=public` |
| `escalate_ai_query_to_ticket(uuid,uuid,text,text)` | `jsonb` | true | `search_path=public` |
| `get_queue_analytics(integer,text)` | `jsonb` | true | `search_path=public` |
| `get_student_queue_estimate(uuid)` | `jsonb` | true | `search_path=public` |
| `get_system_analytics(integer)` | `jsonb` | true | `search_path=public` |
| `is_staff_or_admin()` | `boolean` | true | `search_path=public` |
| `match_handbook_embeddings(public.vector,double precision,integer)` | TABLE (`id uuid, source_document text, content text, metadata jsonb, similarity double precision`) | false | none returned |
| `prevent_audit_mutation()` | `trigger` | false | none returned |
| `protect_profile_governance()` | `trigger` | false | `search_path=public` |
| `record_tier1_feedback(uuid,boolean)` | `void` | true | `search_path=public` |
| `set_updated_at()` | `trigger` | false | `search_path=public` |
| `validate_ticket_transition()` | `trigger` | false | none returned |

Sixteen of those ACLs also include an empty-grantee `=X/postgres` entry, representing PUBLIC EXECUTE. The other four (`answer_tier1_question`, `escalate_ai_query_to_ticket`, `get_system_analytics`, `record_tier1_feedback`) explicitly grant EXECUTE to the three API roles without that PUBLIC entry. Both patterns leave all three reported role checks true. No filtered `row_security` setting was returned. Twelve of the thirteen definer signatures report `search_path=public`; the two-argument acknowledgement returns no filtered settings.

#### Security and migration comparison

1. **Current routine grants differ from the intended Phase 1 boundaries.** Both queue RPCs and the four-argument escalation RPC remain executable by `anon` and `authenticated`; local Phase 1 lines 175–180 and 262–263 restrict them to `service_role`. Anonymous EXECUTE also remains on answer, analytics, feedback and the one-argument acknowledgement; local lines 199–200, 216–217, 355–356 and 469–470 remove that access. These are verified privilege differences; the bodies, guards, schema privileges and exposed API routes are unverified, so this does not prove a successful anonymous call or data disclosure.
2. **The two-argument legacy acknowledgement is an additional review requirement.** `acknowledge_room_change(p_spatial_log_id uuid,p_student_id uuid)` returns `json`, is owned by `postgres`, is SECURITY DEFINER, has no returned function-level `search_path`/`row_security` override, and grants EXECUTE to PUBLIC and all three API roles. Phase 1 lines 182–200 affect only `acknowledge_room_change(uuid)`, so the supplied file would leave the other overload unaddressed. The current local frontend calls the one-argument form at `Frontend/src/app/explore.tsx:260` and `Frontend/src/components/dashboard/student-dashboard.tsx:307`; that does not prove the other overload is unused elsewhere or safe. Review its body/dependencies/exposure under a later approved scope before deciding any change. Do not call, remove or revoke it during this inspection.
3. **Definer path hardening remains unresolved.** No reported application routine has Phase 1's intended fixed `pg_catalog, pg_temp` path. A path containing `public`, or an absent function-level path override, requires review of trusted schemas, temporary-schema handling and body qualification. Actual schema CREATE privileges and function bodies were not inspected, so an exploitable object-shadowing path is not established. SECURITY DEFINER executes with owner privileges and therefore needs its own access guards; table RLS cannot be assumed to protect such calls. [PostgreSQL safe function definition](https://www.postgresql.org/docs/17/sql-createfunction.html).
4. **New foundation entry points do not appear.** `has_active_cas_access()`, `has_cas_history_access()`, `transition_advising_ticket_status(uuid,text)` and `get_admin_authority_context(uuid,uuid)` are absent from the supplied scoped inventory. Their corresponding local definitions begin at Phase 1 lines 8, 32 and 146 and authority-foundation line 28. This is consistent with earlier catalog differences, but is not applied migration history.
5. **Several signature prerequisites now match.** Hosted `current_profile_role()` returns `public.app_role` and `current_profile_state()` returns `public.account_lifecycle`; this resolves their return-type question raised by legacy registry column types. Their bodies and casts remain unverified. The existing queue signatures and five helper signatures altered by Phase 1 lines 179–180 and 220–224 are present. The five existing functions replaced by Phase 1 have matching reported argument names and returns: acknowledgement/feedback return `void`; escalation/answer/analytics return `jsonb`. No visible argument-name or return-type conflict was identified for those replacements. The extra acknowledgement has different input types and is a separate overload, not a return-type collision. Defaults, argument modes, routine kinds, dependencies and body compatibility were not inspected; signature agreement is not migration clearance. [PostgreSQL replacement and overloading rules](https://www.postgresql.org/docs/17/sql-createfunction.html).
6. **Function existence is not trigger installation or API behavior.** The audit, governance, bridge and transition functions returning `trigger` do not prove attached/enabled triggers. EXECUTE on a trigger-returning routine does not establish a directly usable RPC; trigger context and API exposure matter. Security-invoker vector-family routines should not be classified as equivalent to owner-privileged application endpoints solely because both report EXECUTE.

No application routine, cast, RPC, mutation test or hosted body read was performed. Table-level privilege booleans are subsequently recorded in group 10 below. Those results still cannot establish allowed rows, schema USAGE, column-specific grants, function guards or end-user authorization.

### Packet A group 10 — user-supplied effective table privileges

The user attached `Pasted text.txt` with 105 rows covering 35 ordinary tables: 25 in `public` and ten in `storage`, with one row each for `anon`, `authenticated` and `service_role`. All rows have the expected eight metadata columns and every represented table has all three caller rows. No `cas_admin` table rows were returned. The five checks are table-level SELECT, INSERT, UPDATE, DELETE and TRUNCATE permissions; no such operation was actually attempted.

| Table group | Checked roles | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | Result rows |
|---|---|---|---|---|---|---|---:|
| All 25 public tables listed in group 4 | `anon`, `authenticated`, `service_role` | true | true | true | true | true | 75 |
| `storage.buckets`, `buckets_analytics`, `objects` | `anon`, `authenticated` | true | true | true | true | false | 6 |
| `storage.buckets_vectors`, `vector_indexes`, `s3_multipart_uploads`, `s3_multipart_uploads_parts` | `anon`, `authenticated` | true | false | false | false | false | 8 |
| `storage.bucket_lifecycle_states`, `lifecycle_abandoned_artifacts`, `migrations` | `anon`, `authenticated` | false | false | false | false | false | 6 |
| `storage.bucket_lifecycle_states`, `buckets`, `buckets_analytics`, `lifecycle_abandoned_artifacts`, `objects`, `s3_multipart_uploads`, `s3_multipart_uploads_parts` | `service_role` | true | true | true | true | true | 7 |
| `storage.buckets_vectors`, `vector_indexes` | `service_role` | true | false | false | false | false | 2 |
| `storage.migrations` | `service_role` | false | false | false | false | false | 1 |

Actual findings and limits:

- **Broad public privileges are confirmed by effective checks, not only ACL text.** All three roles have all five permissions on every public table. In particular, `anon`/`authenticated` have table-level UPDATE and TRUNCATE on the registry, ticket, internal-note and audit tables. Ticket UPDATE remains inconsistent with the intended Phase 1 revocation at `Backend/supabase/migrations/202611090001_phase1_security_hardening.sql:133`. RLS, triggers and constraints can still restrict ordinary row writes; none was bypassed or tested.
- **The push-log concern is independently reinforced.** `public.push_notification_logs` reports all five permissions true for the client roles, alongside the prior RLS-disabled finding. Actual schema USAGE, exposed API reachability, record occupancy and sensitivity remain unverified. No record query or mutation probe is authorized.
- **TRUNCATE is a privilege result, not a mutation test.** The public client roles report this permission on all 25 tables; RLS does not restrict that operation. Reachable SQL paths, schema permissions and dependencies still matter. No truncation, deletion or destructive RPC was executed or proposed for this inspection.
- **Storage grants are not equivalent to row access.** These results align with the earlier explicit Storage ACLs; group 8 returned no Storage policies and group 4 showed RLS enabled on all ten tables. Client SELECT/INSERT/UPDATE/DELETE booleans therefore do not prove that the corresponding Storage operations pass RLS or that files are publicly accessible. Managed table differences are recorded, not treated as instructions to grant missing rights.
- **The service role does not have every table privilege.** All five checks are false for `storage.migrations`; only SELECT is true for `storage.buckets_vectors` and `storage.vector_indexes`. This is a concrete reminder to distinguish object privileges from RLS bypass. Subsequent platform role flags and direct-membership results are recorded in groups 12–13; no managed grants are changed.
- **Scope remains limited.** `has_table_privilege` checks table privileges, not policy predicates, schema USAGE, per-column grants, trigger guards or complete authorization paths. A false table-level UPDATE result would not rule out column-level UPDATE grants. REFERENCES, TRIGGER, MAINTAIN and sequence permissions were outside this particular query; prior explicit ACL observations remain separate. No table records were read.

Stored default ACL metadata is subsequently recorded in group 11 below. Its query does not change any grants or defaults. Default ACL observations alone cannot prove the history of the existing grants.

### Packet A group 11 — user-supplied default privilege metadata

The user pasted nine stored `pg_default_acl` rows. Every row explicitly lists `postgres`, `anon`, `authenticated` and `service_role` as grantees; the grantor is the creating role shown below. Object type `S` denotes sequences, `f` routines and `r` tables/table-like objects.

| Creating role | Schema | Object type | Explicit privileges for each of the four listed grantees |
|---|---|---|---|
| `postgres` | `public` | `S` | `rwU` |
| `postgres` | `public` | `f` | `X` |
| `postgres` | `public` | `r` | `arwdDxtm` |
| `postgres` | `storage` | `S` | `rwU` |
| `postgres` | `storage` | `f` | `X` |
| `postgres` | `storage` | `r` | `arwdDxtm` |
| `supabase_admin` | `public` | `S` | `rwU` |
| `supabase_admin` | `public` | `f` | `X` |
| `supabase_admin` | `public` | `r` | `arwdDxtm` |

No `(global)` or `cas_admin` rows were returned by the prepared query, which included all global entries and the three selected schemas.

Actual findings and limits:

- **Broad creator/schema defaults are present.** New applicable tables created by `postgres` in `public` or `storage`, and by `supabase_admin` in `public`, receive the listed client-role table privileges including TRUNCATE, REFERENCES, TRIGGER and MAINTAIN unless explicitly constrained afterward. New sequences receive SELECT/UPDATE/USAGE (`rwU`), and routines receive EXECUTE (`X`). This is an additional consideration for future approved security work; no default is changed here.
- **Future-object defaults are distinct from current-object grants.** These rows are consistent with the broad existing ACL patterns, but do not prove their origin. They apply according to the actual creating role and schema; another role's defaults are not automatically inherited through membership. Altering defaults would not retroactively repair existing table/routine ACLs. [PostgreSQL default privilege rules](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).
- **Absent entries do not establish denial.** Per-schema defaults supplement global/built-in defaults. No global row does not mean no defaults apply; an omitted owner or PUBLIC entry in a per-schema row does not establish removal of owner privileges or built-in PUBLIC EXECUTE. The `supabase_admin` per-schema rows omit an explicit grant to `supabase_admin` itself; that is not evidence that the owner lacks access. [PostgreSQL default privilege rules](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).
- **The local authority foundation explicitly addresses its own object ACLs.** Source revokes on the private schema/table at `Backend/supabase/migrations/202611130001_admin_authority_foundation.sql:9` and line 23, plus routine revocation/selective service EXECUTE at lines 70–72, remain necessary. They occur in its transaction; the observed broad public routine defaults are not a reason to omit them. This is source review only: no schema, routine, grant or authority designation was applied or tested.

The non-secret role flags are subsequently recorded in group 12 below. Membership metadata follows as a separate group. No password fields, account records or role changes are requested.

### Packet A group 12 — user-supplied platform role flags

The user pasted all three requested roles with these attributes:

| `rolname` | `rolsuper` | `rolbypassrls` | `rolinherit` | `rolcanlogin` |
|---|---|---|---|---|
| `authenticated` | false | false | true | false |
| `anon` | false | false | true | false |
| `service_role` | false | true | true | false |

Actual conclusions and limits:

- Neither `anon` nor `authenticated` is itself a superuser or has the RLS-bypass attribute. This resolves their role-attribute question, not the correctness of their row policies, membership paths or reachable definer routines. Their broad table/routine grants remain separate observations.
- `service_role` is not a superuser and does have RLS bypass. This reinforces the need to keep its credential backend-only and require end-user authorization at privileged backend/RPC boundaries. Bypass does not remove object ACL requirements: group 10 still reports no tested table privileges on `storage.migrations`, for example. No service credential was revealed or used during this inspection.
- All three roles report `rolcanlogin=false`. That describes direct database login eligibility; it does not establish that the roles cannot act through a gateway, role switching or API requests. No conclusion about disabled authentication or inaccessible APIs is drawn from it.
- All three report `rolinherit=true`. The later direct-membership result is recorded in group 13; this attribute alone is not proof of every effective inherited privilege or ability to switch roles. These are platform database-role attributes, not registry application-role assignments or Admin1/Admin2 designations.

The last prepared Packet A SQL query lists memberships **where one of these three roles is the member**, plus `admin_option`. It does not inventory the reverse direction, recursive membership chains or per-membership inherit/set options. Its result is recorded below. No roles, memberships, privileges, accounts or settings were modified.

### Packet A group 13 — user-reported empty direct-membership result

In response to the fully wrapped direct-membership query, the user supplied a Dashboard screenshot displaying **“Success. No rows returned”**. This is recorded as a user-reported empty result for the query filtering member roles to `anon`, `authenticated` and `service_role`. The screenshot does not itself show the executed SQL; the query context comes from the immediately preceding manual instruction. The assistant did not independently execute or verify it.

No direct parent-role membership rows were returned for those three member roles in the reported result. This does not inventory other roles that may be members of them, such as a gateway role; the query's direction is important. It also does not remove PUBLIC grants, direct object grants or definer-call paths. Do not interpret an empty membership result as proof of secure application authorization, disabled APIs, absence of all database memberships or absence of privileged accounts.

**Packet A SQL review boundary reached.** All 13 prepared SQL groups have user-supplied observations. No Packet B/C SELECT, actual migration-version row read, aggregate account count, policy-expression/body inspection, fixture or mutation test follows automatically. The public grants/defaults, push-log RLS gap, definer EXECUTE/path concerns, unaddressed acknowledgement overload and missing expected Phase 1 policy/function state remain unresolved. Subsequent backup and Auth panel observations are recorded below; no further Dashboard or SQL inspection is requested under this step.

### Dashboard observations — backup and Auth panels reviewed

| Check | Actual observation |
|---|---|
| Plan and selected panel | User screenshot displays **FREE** and **Database Backups > Scheduled backups**. |
| Scheduled backup availability | Notice: **“Free Plan does not include project backups.”** No snapshot list or recovery points are displayed on this gated panel. |
| Latest successful backup/timezone and retention | **Not shown.** The Pro upgrade offer is not evidence of a current Free-plan retention period or existing recovery point. |
| PITR state | **UNVERIFIED.** A **Point in time** tab is visible, but its panel was not supplied or inspected; a tab label is not proof of enablement or usable recovery points. |
| Restore/download capabilities | The selected panel shows an **Upgrade** button and a **Restore to new project (BETA)** tab. No restore/download action or usable backup is demonstrated. The other tab was not opened; no restore/upgrade/export occurred. |
| Existing manual/external backup | **UNVERIFIED.** No artifact or recovery proof was supplied; the plan restriction does not establish that no external backup exists. |
| Allow new users to sign up | **Enabled**, as displayed in the supplied Sign In / Providers screenshot. |
| Email provider | **ENABLED** badge in the supplied screenshot. |
| Confirm email | **Disabled**, shown directly in the screenshot's User Signups panel. |
| Allow anonymous sign-ins | **Disabled**, as displayed. |
| Allow manual linking | **Disabled**, additionally visible in the same screenshot. |

The backup screenshot shows project display label **CAS-ASSIST** and a **main / PRODUCTION** badge. These are observed UI labels, not proof of active application use or a replacement for the previously confirmed reference `rueukwztuflgpuvopmlu`; the screenshot does not display the reference itself. No permission to modify that project follows from considering it for development.

**Backup-readiness finding: no usable recovery package has been demonstrated.** The current plan's scheduled-backup feature cannot be relied on from the supplied panel. A manual backup remains a possible later route: official Supabase documentation recommends free-tier exports and off-site copies. That does not authorize an export now or prove that a default CLI dump covers all required schemas/data. The separately approved future capture/recovery plan must cover database records and definitions, Auth dependencies, actual Storage file bytes, configuration and restore validation as detailed in Step 2.6. No upgrade is needed to finish this read-only inspection. No export, backup download, restore, paid feature enablement or tool installation was attempted. [Supabase backup coverage and free-tier guidance](https://supabase.com/docs/guides/platform/backups).

The final screenshot is **Sign In / Providers > Supabase Auth**. Its User Signups panel displays signup enabled, manual linking disabled, anonymous sign-ins disabled and Confirm email disabled; its provider list displays Email as ENABLED. In this actual Dashboard, Confirm email is visible directly in User Signups, so no additional provider-panel inspection is needed. The screenshot includes a Save changes control, but no save or settings change was requested or reported. These observations are the displayed states, not an independent Management API verification or a signup/password-recovery test. The cropped image does not display the project reference; target context remains the user's earlier confirmation.

**Registration finding:** the displayed signup control is enabled, so the Auth configuration shown does not supply an Admin1-only signup restriction. Other hooks, institutional-email/profile-trigger enforcement, account creation outcomes and deployed application behavior were not inspected here. Official Supabase guidance describes disabled Confirm Email as not requiring email verification before first sign-in; that is separate from the application's registry/CAS-membership verification. Do not infer that existing users proved institutional email ownership from the registry's `verified` label or from Auth column presence. Email enabled does not prove successful confirmation/recovery delivery. [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration).

Disabling anonymous sign-ins is a distinct control from the `anon` database role's table/routine privileges already observed. Neither that disabled setting nor manual linking disabled establishes that all anonymous RPC access or account-takeover paths are prevented. No registration, email confirmation, linking, recovery, account or authority action was performed. All requested view-only states have been supplied; no setting is changed as part of this inspection.

## Recommended next actions — not executed; separate scope required

1. **Stop this inspection.** Target confirmation, all 13 Packet A SQL result groups and requested backup/Auth screenshots have been reviewed. The first query reported `read_only=on`; later results were supplied in response to complete wrapped queries, whose execution the assistant did not independently observe. No additional query or Dashboard action is requested.
2. **Prepare/approve the exact manual backup and recovery scope before any migration.** Use the Step 2.6 backup plan, account for the observed Free-plan limitation, and identify approved tools, operator, encrypted destination, component coverage and a separate restore-verification target. Do not equate a default dump or table export with a recoverable database/Auth/Storage/configuration package. No export, install, paid enablement or restore is authorized by this report.
3. **Separately authorize any further read-only compatibility review.** Packet B version/aggregate reads and Packet C constraints/indexes/triggers/definitions require their own bounded instruction and sanitized handling. Resolve actual migration history, non-null attachment defaults, hosted governance/bridge triggers, existing definer guards and the legacy acknowledgement overload. Further approved read-only checks may occur before backup capture; they do not authorize writes.
4. **Reassess the exact minimal migration delta only after sufficient evidence.** Keep the existing application/types/relationships and dirty work intact. Incorporate the observed broad grants/defaults, push-log RLS gap, Storage access prerequisites and extra overload into the reviewed change plan instead of assuming the two local files resolve all hosted concerns. Require recoverability evidence and explicit migration authorization before executing any DDL/DML.
5. **Keep account governance and Auth changes separately controlled.** Admin1 designation, provisioning/recovery endpoints, signup closure, confirmation policy and account changes remain outside this step. Do not toggle controls, create accounts, assign roles, bootstrap Admin1, run fixtures or deploy based on catalog review completion.

## Unresolved questions and interpretation limits

- The user has confirmed the exact project reference; the assistant has not independently accessed the Dashboard.
- All 13 prepared Packet A SQL groups have user-supplied observations. The direct-membership result is reported empty; reverse/gateway memberships and actual schema/API access were not inspected. The full `public` schema owner was clipped in the earlier screenshot and is not inferred from table owners.
- Actual schema/API reachability and authorization remain unverified. Policy predicates and function bodies are outside the initial Packet A query scope. Broad creator/schema defaults are observed, but the history of existing ACLs remains unknown.
- What are the two-argument acknowledgement's actual guards, dependencies and exposure? Its broad EXECUTE/definer metadata warrants a later scoped review, not a mutation or call during Packet A.
- What is the intended Storage client access path, given no returned Storage policies and the pending migration's restrictive-only additions? Actual bucket visibility, attachment behavior and base permissive access requirements remain unresolved.
- What is the purpose and intended access boundary of `public.push_notification_logs`? Its records must not be requested during this catalog inspection. No deletion, access change or consolidation is authorized.
- What explains the hosted ticket UPDATE grants differing from the local Phase 1 result? No applied migration version or hosted function definition has been read.
- `supabase_migrations.schema_migrations` resolves and its three column names/types/nullability are now recorded. **Actual applied version rows belong to Packet B**, so they cannot be reported from this scope alone.
- Policy/function/table names do not prove complete Phase 1/authority installation or correct security semantics. An owner-level SQL Editor query is not a student/delegated JWT authorization test.
- The supplied Scheduled backups panel explicitly excludes project backups on the Free plan and shows no recovery points. Existing external/manual backups, a complete recovery package and restore proof remain unverified; no paid feature or export was initiated.
- The displayed Auth states are recorded, but effective saved configuration was not independently polled. Actual registration, email ownership, CAS verification, provider delivery and recovery behavior remain untested. No account values or successful workflow outcomes are inferred from setting labels.

## Preservation and stop boundary

Only this inspection report is maintained during Step 2.7. No hosted connection/query was performed by the assistant; the user's manual inspection results are recorded separately above. No account action, migration, INSERT/UPDATE/DELETE/ALTER/DROP/GRANT, settings change, signup change, restore/reset, installation, commit/push/merge or deployment was performed by the assistant. Public Supabase documentation was consulted for navigation; the selected project's Dashboard was not accessed by the assistant.

Final local preservation verification compared SHA-256 hashes for all **181 pre-existing files** in the saved Step 2.7 baseline: **zero changed or missing files**. This new inspection report was excluded from that baseline. Report readback and whitespace checks were performed; no application workflow, database security test, migration rehearsal or restore validation was executed or claimed.

**Step 2.7 stop point reached.** No further input is needed to finish this authorized inspection record. Wait for a separate user instruction before any new inspection scope, backup preparation/extraction, implementation or hosted action. Packet B/C remain unexecuted; no further SQL is issued automatically. Nothing in this record is a database security test PASS, a verified backup, a successful migration rehearsal or authorization to modify the project.
