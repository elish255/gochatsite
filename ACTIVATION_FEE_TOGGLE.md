# Activation Fee toggle rollout

1. Apply `supabase/migrations/202611210001_activation_fee_toggle.sql` to the Supabase database before merging this PR. It installs the singleton setting and updates chat/withdrawal RPC guards together in one transaction. It starts **enabled** and does not rewrite account status or payment records.
2. Deploy the PR, sign in as an existing admin, and find **Activation Fee** on the admin dashboard or payments section.
3. Click **Ondoa Activation Fee**, confirm, and verify an unpaid test account can start/complete a chat session without an activation charge. Premium/VIP/Tax and withdrawal limits still apply.
4. Click **Rudisha Activation Fee**, confirm, and verify the unpaid test account again requires activation. Verify paid accounts retain access and banned/deactivated accounts remain blocked in both states.

The server allows only authenticated admins to change the setting. Reads are not cached. Existing clients refresh their account policy on focus and at their existing polling interval; payment creation and chat APIs read the setting per request. In-flight activation transactions are still reconciled normally.

Without the migration, existing behavior remains enabled and the admin control reports a load error instead of claiming to save. Deploying application code alone does not install database changes.

Preview verification requires an application admin account and the migration in the preview database. The repository does not document a preview admin test account or auth bypass. No live payment or account change is required by the local tests.
