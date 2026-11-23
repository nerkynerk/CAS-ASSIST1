# Admin1 Replacement and Test Administrator Retirement

**Project** `rueukwztuflgpuvopmlu` · **Branch** `octup/safe-enhancements`

**Status** The replacement is confirmed as the sole Admin1. The old test profile’s administrative and verified CAS access has been revoked. Its Supabase Auth ban and session revocation are pending.

## Replacement administrator

The project operator created a separate institutional Auth account. The Auth UUID and registry profile matched, and the operator reported a successful student sign-in. The profile was then elevated under separate approval. The bootstrap verification returned `authority_count = 1` and `replacement_is_primary = true`. The lookup requires an `active`, `verified` `super_admin` with a matching institutional Auth identity. [Authority implementation](STEP2_ADMIN_AUTHORITY_IMPLEMENTATION.md)

The replacement UUID ends in `ff61`. The retired test UUID ends in `bc1c`. This report uses UUID suffixes and omits the institutional email.

## Why the old identity was retained

| Hosted dependency | Observed result |
| --- | --- |
| CAS registry `verified_by` references to the old Auth UUID | 4. These references block Auth deletion. |
| AI query logs referencing the old CAS profile | 1 |
| Announcement attribution to the old CAS profile | 1 match in `created_by` and 1 in `posted_by`. Both fields can refer to the same announcement. |
| Foreign key from registry `id` to Auth `id` | 0. The hosted schema has no such foreign key to cascade Auth deletion to the CAS profile. |
| Storage ownership | 0 matches in the checked bucket and object ownership columns. |

The approved retirement preserves both the Auth identity and the CAS registry UUID. The registry update removed the `super_admin` role and set the account to `student / archived_read_only / rejected`. The `rejected` status also prevents the history access reserved for verified archived accounts.

## Latest hosted verification

These values come from the operator’s SQL Editor output.

| Check | Observed |
| --- | --- |
| Old CAS profile | `student / archived_read_only / rejected` |
| Old Auth account banned | `false` |
| Old Auth session rows | `1` |
| Retained verifier references | `4` |
| Replacement resolves as primary | `true` |

## Finish Auth retirement

1. Sign out of the old account in its existing CAS-ASSIST session, then rerun the retirement verification query. If a session row remains, use global sign-out from a trusted Supabase client authenticated as the old account. [Supabase sign-out](https://supabase.com/docs/guides/auth/signout)
2. In the confirmed project, open **Authentication → Users → old test account → Overview → Danger zone → Ban user**. Verify the old UUID before setting the ban to `876000` hours. [Dashboard ban control](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Auth/Users/UserOverview.tsx#L336-L378) · [Supabase Auth ban](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid#ban-a-user-for-100-years)
3. Confirm `auth_banned = true`, `old_sessions = 0`, `retained_verifier_refs = 4`, and `replacement_is_primary = true`. Verify that fresh Auth sign-in is denied for the old account and the replacement can still open the admin dashboard. Previously issued access tokens can remain valid until expiry. [Supabase session behavior](https://supabase.com/docs/guides/auth/signout)
