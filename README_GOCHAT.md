# Gochati

This project is based on the uploaded Gochati project, with the Gochati branding and the floating support assistant image/interaction migrated from the uploaded Gochati homepage.

## Included
- Existing registration, login, payment/activation, withdrawal, admin user-management, and premium flows from the Gochati source.
- The Gochati floating support assistant on the homepage.
- Gochati branding and public logo path.
- Existing Supabase migrations and payment integration files.

## Before deploying
1. Configure the project's Supabase URL and anon/publishable key in your hosting environment.
2. Configure any payment provider environment variables already required by this project.
3. Apply the SQL migrations in `supabase/migrations/` to the intended database after reviewing them. Do not run these against a shared database without confirming the table names and policies.
4. Configure the admin user's authorization in the existing `gochati_admins` table (the existing schema/table identifiers are intentionally retained so the working feature logic is not broken).
5. Set the production domain/canonical URL to `https://gochati.site/`.

The source `.env` file is intentionally excluded from this ZIP to avoid distributing private credentials. No production build could be verified in this environment because package installation did not complete.
