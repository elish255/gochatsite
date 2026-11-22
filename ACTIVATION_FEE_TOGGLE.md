# Activation Fee toggle rollout

1. Apply `supabase/migrations/202611210001_activation_fee_toggle.sql` to the Supabase database before merging this PR. It installs the singleton setting and updates chat/withdrawal RPC guards together in one transaction. It starts **enabled** and does not rewrite account status or payment records.
2. Deploy the PR, sign in as an existing admin, and find **Activation Fee** on the admin dashboard or payments section.
3. Click **Ondoa Activation Fee**, confirm, and verify an unpaid test account can start/complete a chat session without an activation charge. Premium/VIP/Tax and withdrawal limits still apply.
4. Click **Rudisha Activation Fee**, confirm, and verify the unpaid test account again requires activation. Verify paid accounts retain access and banned/deactivated accounts remain blocked in both states.

The server allows only authenticated admins to change the setting. Reads are not cached. Existing clients refresh their account policy on focus and at their existing polling interval; payment creation and chat APIs read the setting per request. In-flight activation transactions are still reconciled normally.

Without the migration, existing behavior remains enabled and the admin control reports a load error instead of claiming to save. Deploying application code alone does not install database changes.

Preview verification requires an application admin account and the migration in the preview database. The repository does not document a preview admin test account or auth bypass. No live payment or account change is required by the local tests.


## Automatic active status on new signup

Apply `supabase/migrations/202611210002_activation_aware_signup.sql` after the
original toggle migration in the **GoChati** database. This is a SQL migration;
Git/Vercel deployment alone cannot apply it. No Edge Function redeploy is needed:
the database normalizes both the Auth signup trigger and the existing signup
Edge Function's subsequent inactive-profile upsert.

When the fee is disabled, new registrations are stored as `active` with
`activation_paid=false`. When enabled, new registrations start `pending` and
unpaid; successful activation payment remains the way to activate them. Paid
flags are not forged, and existing paid records are not rewritten. Re-enabling
the fee retains the current access policy (unpaid accounts again require payment).
This migration does not bulk-activate existing inactive accounts or implement
permanent grandfathering; it fixes the requested new-registration behavior.
Banned/deactivated profile writes are not automatically changed to active by
the waiver. Admin suspension and payment flows otherwise remain unchanged.

Test signup with the fee off, then with it on, checking raw profile status and
paid flag after the signup upsert. Also verify blocked/paid accounts remain
unchanged and payment activation still works. No real account was registered
or modified during local migration tests.
