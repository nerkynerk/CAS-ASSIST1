# Step 2.6 — Database Backup and Minimal-Change Migration Plan

**Date:** 2026-11-13, Asia/Manila. **Branch:** `octup/safe-enhancements`. **Candidate source project:** **`rueukwztuflgpuvopmlu`**, API hostname **`rueukwztuflgpuvopmlu.supabase.co`**. This is verified from matching local frontend/backend configuration, not from a hosted connection. Dashboard organization/name/plan, live schema/data, migration history and backup state are **UNVERIFIED**.

**Current decision: HOLD migrations.** Reusing the existing inactive project for development is feasible in principle; it does not require a rebuild or a local Docker stack merely to inspect it. It is not yet safe to authorize direct application of the prepared security files without inspection, recoverable backup and an exact compatibility/change plan. The user's statement that the application is not actively used does not establish that background jobs, old clients, Auth activity or file changes have stopped.

This is a proposed plan only. No project connection/query, backup download/export, clone/restore, installation, DDL/DML, Auth/configuration change, account operation, designation or deployment occurred. The only new files are this report and `STEP2_6_HOSTED_SUPABASE_ASSESSMENT.md`; earlier source, reports, migrations/tests and uncommitted work are preserved.

## 1. Permissions and the shortest safe path

| Stage | Specific approval needed | Work after approval | Exclusions |
|---|---|---|---|
| 1 — hosted inspection | Exact project reference above; staged catalog/aggregate SQL and non-secret view-only Dashboard scope in the assessment report. | Identify actual objects/history/access readiness, Auth/API settings and available backup features. Browser SQL Editor needs no local Docker/CLI. | No mutations, exports, tests/fixtures, application RPCs, key/password reveal/reset or settings changes. |
| 2 — backup capture | Same source project, exact backup/export components, sensitive-data handling, storage destination/operator/access and capture window. | Capture approved database/Auth/Storage/configuration recovery package; obtain non-secret artifact manifest. | No restore-over-source, schema/account/settings changes, signup closure or account bootstrap. Installing tools/downloading full data is not implied by Stage 1. |
| 3 — recovery proof/rehearsal | Separate identified recovery target, restore/clone/tool/cost scope, identity/data privacy, disabled/quarantined external side effects and test/cleanup plan. | Prove restoration and rehearse only genuinely pending migrations on recovered state. | No live-source fixture suite or automatic source mutation. A clone/restore creates/changes destination state and needs approval. |
| 4 — minimal hosted migration | Reviewed live findings, exact necessary file/delta hashes/order, backup/restore evidence, compatibility/maintenance window, rollback owner and accepted residual risks. | Apply only approved pending compatible changes and non-destructive acceptance checks on this source project. | No blanket ten-file replay, reset, history repair, broad grants/RLS disabling, unrelated refactor or deployment without authorization. |
| 5 — account governance rollout | Separate instruction after foundation acceptance. | Controlled approved UUID bootstrap, provisioning or other explicitly approved slices. | None of these account/registration actions is authorized by Step 2.6 or migration approval alone. |

The time-saving recommendation is **Dashboard inspection first**, then the least expensive supported recovery proof. A short-lived Dashboard restore-to-new-project may avoid building local tooling if the actual plan supports it; otherwise select an approved supported logical export/restore method. Do not install Docker, upgrade a plan, enable PITR or create another project automatically.

## 2. What a complete recoverable package must cover

A schema file, table CSV export, migration directory or screenshot is not a complete backup. Define the exact recovery objective: preserve existing account UUIDs/relationships, application records, attachments/knowledge files, permissions, required authentication and matching application configuration. Record recovery-point timestamps and expected downtime before choosing a method.

| Component | Required preservation / verification | Confidentiality and recovery limitation |
|---|---|---|
| Application database | All relevant schema/data, sequences, constraints/indexes, functions/triggers, owners, grants/default privileges, RLS, custom schemas, publications and approved scheduled/integration definitions. | File data and many platform settings are outside a database dump. Unknown custom schemas must be inventoried, not omitted because only `public` was expected. |
| Applied history and customizations | `supabase_migrations` history; actual definitions in public/private schemas; custom `auth.users` profile trigger; custom Auth/Storage RLS/triggers and any existing `cas_admin` objects. | Checked-in files describe intended/current local code, not necessarily hosted definitions/history. Preserve observed state rather than reconstructing blindly from source. |
| Auth account data | Auth users/identities and dependencies needed for UUID/password/MFA/related-record restoration; corresponding registry/affiliations and FK relationships. | Sensitive hashes, encrypted fields and identity records belong only in encrypted restricted backup artifacts, never these reports. A list of emails/users is not an Auth backup. |
| Actual Storage objects | Bytes for every relevant object, including private buckets, plus bucket configuration, object metadata and a restricted count/size/path/checksum manifest. | Database object rows do not contain the file bytes. Capture all pages/prefixes/versions required by the recovery objective; do not make buckets public to download them. |
| Auth/API/platform configuration | Signup/providers/hooks, confirmation/MFA/session/rate/redirect/email-template/SMTP policy, exposed schemas, domains, signing/API key recovery/reconfiguration and network settings. | Record non-secret settings separately. Recover secret dependencies through approved secret custody; do not assume every provider/SMTP/signing value can be revealed or exported. |
| Other runtime dependencies | Edge Function source/version/secrets, Realtime settings, extensions, external jobs/webhooks, hosting environment/build versions and notification/AI integration configuration. | Keep secret values out of source/Git/report artifacts. Recovery must not accidentally notify real users or call live external systems. |
| Application working state | Matching backend/frontend versions, source hashes, uncommitted/untracked implementation files and a restricted environment recovery inventory. | No commit is required/authorized. A separately approved source snapshot should preserve the dirty work; secret files require separate encrypted handling, not inclusion in an ordinary source archive. |

### Database backup method and known exclusions

First inspect the selected project's Dashboard backup panel **view-only**, after approval: actual plan/type, available successful recovery points, timestamps, retention, PITR state, download/restore capabilities and any restrictions. Supabase documents plan-dependent backups; Storage file bytes and custom database-role passwords are not included in database-backup coverage. Custom SQL-role passwords are different from Auth user password hashes. Do not reset any password now or assume a recent complete backup exists. [Supabase database backups](https://supabase.com/docs/guides/platform/backups).

Preferred conditional choices:

| Method | When it can help | Conditions before relying on it |
|---|---|---|
| Existing managed physical backup/PITR plus separate Storage/configuration capture | Potentially lowest local-tooling effort and suitable exact-point database recovery. | Verify availability, recovery point relative to the capture window, coverage and a supported restore route. It is not a whole-project/file backup. No enablement/restore is authorized yet. |
| Dashboard restore to a new project | Potentially quick disposable database rehearsal without Docker installation. | Actual plan/physical-backup support, destination/cost/privacy approval and external-side-effect quarantine. Complete missing Storage/configuration portions separately. |
| Reviewed logical export/restore | When available managed recovery is insufficient/unavailable or controlled restoration requires inspecting/disabling external jobs before enabling them on the destination. | Explicit schema/data/roles/Auth/Storage/history/customization coverage, version-compatible tools and restore order, secret/encryption custody and restore proof. Tool installation/export needs separate approval. |

The documented restore-to-new-project feature copies database/Auth records and the encryption root key, but is a database-only clone with manual Storage, Auth/API, Edge/Realtime and other configuration work. Its availability depends on plan/physical backups; it must not be treated as a free or complete project copy. [Supabase restore-to-new-project guidance](https://supabase.com/docs/guides/platform/clone-project).

The CLI's default `db dump` filters managed schemas including Auth/Storage and extension schemas; default output also omits data and custom roles. It uses containerized pg_dump. A single default schema dump is therefore not sufficient for this application, and its default omissions must be checked against the chosen recovery method. Do not run a generic remote dump/link/pull command as part of the initial read-only inventory; even a source-read export handles substantially more sensitive information than approved metadata counts. [Supabase CLI dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump).

Manual logical files do not carry the Vault/pgsodium encryption root key; managed new-project restoration has different key handling. If encrypted/Vault-dependent state is used, agree an approved recovery/custody procedure before calling the package recoverable. Do not retrieve, display, overwrite or move encryption keys in this step. Preserve migration history and custom Auth/Storage triggers/policies explicitly; generic CLI output may not preserve them all. Do not copy documentation instructions that reset an unknown database password or alter replication/grants into this task. [Supabase backup/restore special considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

### Storage and consistent capture

Under separate backup approval, use the provider-supported download/Storage API/S3 route appropriate to the actual buckets, with source-read permissions that include private objects. Export metadata/configuration and bytes into restricted encrypted storage, verify pagination/completeness and per-object size/checksum, and retain a manifest identifying their capture times. Keep object paths/content out of public report outputs. A bucket's object count is useful inventory but cannot prove complete byte recovery.

Agree a quiet capture window and verify all relevant writers: application deployments, open clients, Auth activity, scheduled jobs, imports, webhooks, Edge Functions, file uploaders and other integrations. Any required source maintenance or disabling of writers needs its own approval; nothing was disabled now. If database and Storage captures cannot represent one quiet point, define reconciliation/differential capture and the expected recovery point. “Not actively used” alone does not establish consistency.

Store the encrypted package outside the repository and outside the sole source project. Record checksum/size/component/timestamp/retention/custodian/restore procedure in a non-secret manifest; restrict access and retain the necessary decryption/recovery custody separately. No backup artifact or secret was created in this assessment.

## 3. Recovery proof before a hosted migration decision

Use a separately approved target, not restore-over-source. Confirm destination identity and isolate it from source clients, real SMTP/notifications and live integrations. Physical clones can bring scheduled/extension state with them; if external side effects cannot be prevented before activation, do not start such a clone blindly. Choose a reviewed controlled restore/quarantine method with the owner. No source jobs or destination configuration were changed here.

Acceptance evidence should include:

- Correct snapshot/capture point and complete artifact manifest; schema/extension/version/history compatibility; verified checksums and successful supported restore.
- Matching aggregate application/Auth/role counts and UUID relationships, required profile trigger behavior, indexes/constraints/sequence state and protected history. Private Auth/Storage customizations and any authority schema are present.
- Restored bucket settings/metadata and actual object byte checksum/size samples plus manifest completeness, including private attachment/knowledge access. Empty/absent Storage must be demonstrated, not assumed.
- Required provider/settings/secret/encryption recovery is usable. Test approved authentication on the recovery target without displaying hashes/tokens or using the live source. Any session reauthentication/credential recreation differences must be documented and accepted.
- Effective owners/grants/RLS/function permissions and role-appropriate positive/negative access remain correct. A successful owner SELECT is not a row-isolation test.
- Matching frontend/backend workflow acceptance, including pending/archived access, advising status, faculty scope and administrative analytics, with live integrations safely isolated.
- A measured restore/rollback procedure, recovery-point/data-loss limits, responsible operator and source preservation. Keep the recovery target and evidence until the hosted rollout is accepted; cleanup needs its own scope.

Existing `Backend/supabase/tests/phase1_security.sql` and `admin_authority.sql` are suitable prepared starting points **only on an approved recovery/test target**. They insert/update synthetic Auth/profile/authority rows and temporarily grant/simulate roles before rollback. They are not part of initial hosted read-only inspection, and must not be run against the existing project merely because it is inactive. The admin suite requires empty authority storage; do not delete an existing designation to run it. True concurrency and live-JWT/Storage/cross-user supplemental coverage remain as documented in the Step 2.5 checklist.

**Backup readiness now: UNVERIFIED / NOT CAPTURED / NOT RESTORE-TESTED.** If the owner chooses to proceed later without a restoration rehearsal, that is a separate explicit residual-risk decision; this report cannot label recovery verified or direct application safe on that basis.

## 4. Compatibility review: select actual pending work

All ten local files are prepared source. The assessment SQL must establish whether their changes are already present, pending, partially applied or implemented differently. History absence is inconclusive because the Dashboard may have been used manually; a history row alone also does not prove definitions were never changed afterward.

| Order | Local migration | Review before deciding it is pending |
|---|---|---|
| 1 | `202607280001_research_compliance.sql` | Existing enums/tables/helpers/triggers/RLS and pgvector schema. Includes legacy data conversions and bucket upserts; never replay casually on an established working database. |
| 2 | `202609110001_document_requests_and_schedules.sql` | Document requests/faculty schedules and helper dependencies. Preserve existing IDs/data/relations. |
| 3 | `202609120001_legacy_contract_bridges.sql` | Conditional old columns/triggers; partial prototype shape may not satisfy all referenced fields. |
| 4 | `202609120002_ticket_priority_compatibility.sql` | Existing priority type/constraint/data; conversion rewrites values. |
| 5 | `202609130001_student_number_registration.sql` | Nullable ID format/duplicates, index and latest Auth-profile trigger. No auto-grant of personnel roles. |
| 6 | `202609130002_system_analytics.sql` | Function definition/signature and all referenced prior tables. |
| 7 | `202609130003_tier1_knowledge_base.sql` | Knowledge table/audiences/RLS and existing content; migration upserts workflow articles. |
| 8 | `202609130004_tier1_answer_rpc.sql` | Knowledge title updates and answer/feedback functions. |
| 9 | `202611090001_phase1_security_hardening.sql` | Fixed 24-table inventory, current role/state helpers and prerequisite RPCs, partial/existing restrictive policies and effective table/column/function grants. |
| 10 | `202611130001_admin_authority_foundation.sql` | `cas_admin` namespace/table/index/owner/ACL/RLS and context signature; collision is a stop, not permission to drop/adopt it. |

Source hashes/order are recorded in `docs/reviewer/STEP2_5_DATABASE_VALIDATION_CHECKLIST.md`; recheck before any approval. The two security-file hashes from that snapshot are:

- Phase 1: `C7FF68699C4CBC27BDBC9EC6F8FDFA8EE7852448EE7F8724850F763A509E7292`.
- Authority foundation: `EB385799C71EDC8E9EA4157C73ABE5EDC0AC8B8812D4928057209D0DB9650A73`.

No live conflicts have been proven or ruled out. Meaningful risk/stop conditions are:

1. **Missing/partial predecessors or manual history:** stop and compare actual definitions privately. Approve an additive reconciliation or genuinely missing prerequisite separately; do not edit old files or fabricate/repair history to force application.
2. **Phase 1 policy/grant collisions:** its plain CREATE POLICY statements are not an idempotent repair. Partial installation or changed policies require a reviewed narrow forward correction, not repeated blind execution.
3. **Membership readiness:** active verified students without valid dated memberships/active programs will fail closed. Personnel verification is an administrative attestation. Preserve accounts; no automatic approval/backfill because an email is institutional.
4. **Frontend/database version coupling:** new local frontend uses `has_active_cas_access()` and `transition_advising_ticket_status`; old clients may use revoked direct UPDATE. Queue RPCs become service-role-only, with Express retaining the user checks. Identify actual deployed clients/server before an approved coordinated window.
5. **Authority collisions/governance:** new private schema/function is intentionally not adopted on collision. The migration assigns nobody; no Admin1 bootstrap is part of migration approval. Missing primary only denies new account-authority checks, while current operational routes retain their existing checks.
6. **Effective privilege drift:** table/column/default/inherited grants, function overloads/owners/search paths, Storage policies and unknown hosted-only functions require review. The remaining Gate A INSERT/storage risks are not automatically closed by these migrations.

## 5. Safest minimal-change sequence if later approved

1. **Approve the named read-only assessment** on `rueukwztuflgpuvopmlu`; confirm Dashboard identity and current development-use classification. Execute only the reviewed packet(s), adapting absent-object snippets before they are run. View Auth/API/backup settings without changing them.
2. **Classify the actual baseline** and record object/history/definition/access-readiness evidence. Separate implemented/pending/partial/unknown findings. Identify any users/files/integrations that must survive; do not assume no data because no one is currently using the UI.
3. **Approve/capture complete recovery components**, with source consistency, secret custody and file bytes. Prove restore/rehearsal on an approved separate target using the quickest supported route available to this plan. No local Docker installation is mandatory if Dashboard-supported recovery provides the needed evidence.
4. **Freeze the exact reviewed change set.** If #1–8 are present and compatible and neither security file is applied, the proposed application order is **Phase 1 (#9), then authority foundation (#10)**. If their effects already exist or differ, do not run those files blindly; determine the smaller necessary approved correction. Apply only actually missing compatible prerequisites before #9.
5. **Coordinate the source-project maintenance/release window**, backup recovery point and matching client/backend versions. No deployment or environment-variable change is included in this task. Even an inactive app can have stale deployed clients or background writers.
6. **After separate explicit migration approval**, apply each approved transactional security unit through one identified controlled session/tool, stop at the first error and inspect history/state before retrying. Do not split/randomly paste fragments or assume the whole ten-file history is one atomic operation. No actual migration commands are issued by this report.
7. **Validate non-destructively on the existing project:** compare aggregate record preservation, expected schema/policies/ACLs and allowed real-role workflows under separately approved acceptance scope. Fixture/mutation suites and concurrent synthetic designation tests stay on the recovery/test target unless a distinct explicit scope approves them elsewhere.
8. **Keep later account changes separate:** initial Admin1 UUID designation, delegated setup, final CAS approval/provisioning, password recovery, signup closure/access requests and appointments all await their own instructions. Existing registration remains untouched in this assessment and foundation rollout.

Using Dashboard SQL Editor for later approved DDL is technically possible, but manually running SQL does not automatically establish correct migration-history recording or client compatibility. Agree the execution journal/checksum/history method in the later change approval; do not add history repair as an unreviewed convenience. Docker/CLI is not a prerequisite to the initial browser inspection, and installing it would not establish hosted compatibility by itself.

## 6. Rollback and go/no-go criteria

Prefer a reviewed forward correction that preserves eligibility/ownership/audit restrictions. A full restore is a separately approved recovery operation with downtime and potential loss of later writes; recover the matching database, Storage and configuration point, not just one component. Verify the older database/client pair before rollback: restoring only one side can break helper/status contracts or reopen broad privileges. No RLS disablement, broad PUBLIC EXECUTE, direct ticket UPDATE regrant or destructive down/reset is an authorized workaround.

**GO for a later migration approval requires:** confirmed target/owner and development-use classification; reviewed actual schema/history/function/policy drift; valid backup/file/configuration custody and proven or explicitly risk-accepted recovery; exact necessary hashes/order; membership/user readiness; coordinated client compatibility; reviewed failure/rollback procedure; relevant test evidence and explicit change approval.

**NO-GO now:** hosted facts, backup availability/completeness, Storage bytes, Auth/configuration recovery, restore evidence, active-writer state and actual pending changes are all unverified. Prior Gate A failures remain documented, not fixed by considering the hosted environment.

**Next approval to request after review:** only the exact-target read-only metadata/aggregate/view-only configuration scope in the companion assessment. Backup extraction/restore, migrations and bootstrap remain distinct later decisions. Stop after the two reports; no database or account change is authorized by this plan.
