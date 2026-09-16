# Database Backup and Migration Plan

## Current remote evidence

Read-only inspection of the linked active project found these public tables:

- `users_account_registry` (estimated one row)
- `advising_ticket_pipeline` (estimated zero rows)
- `announcements`, `spatial_logs`, `spatial_log_acknowledgments`
- `schedules`, `document_requests`
- `handbook_knowledge_embeddings`, `push_notification_logs`

Docker/`pg_dump` is not available locally, and the linked pooler does not expose a database password. Therefore, no live migration is applied by this phase.

## Required backup before remote apply

1. In Supabase Dashboard, confirm Point-in-Time Recovery or create an on-demand database backup.
2. Export the public schema and data from the Dashboard or run `supabase db dump` from a machine with Docker.
3. Export Storage bucket configuration and record object counts.
4. Record Auth user count without exporting credentials.
5. Save the pre-migration schema hash and migration-history output.
6. Test the migration on a disposable Supabase project restored from the export.

## Migration strategy

- Add missing columns and entities with `IF NOT EXISTS`.
- Preserve UUID ownership and existing records.
- Map legacy advising states:
  - `open` → `submitted`
  - `in_progress` → `under_evaluation`
  - `pending_review` → `action_required`
  - `closed` → `resolved`
- Reject unknown states before adding the exact four-state constraint.
- Add private Storage buckets without making existing buckets public.
- Enable RLS table by table, then install explicit role/lifecycle policies.
- Use server-only functions for privileged changes, notifications, AI, and analytics.
- Validate row counts, lifecycle values, policy coverage, and critical queries before promoting.

## Rollback

The preferred rollback is restoring the verified pre-migration backup/PITR point. Do not attempt a lossy down migration after production writes begin. If validation fails before writes resume, restore immediately and keep the application on the pre-migration release.

## Apply gate

Do not run `supabase db push` until:

- a backup is confirmed,
- the pulled live schema can be compared,
- a disposable-project test passes,
- role test accounts exist,
- the owner approves the maintenance window.

