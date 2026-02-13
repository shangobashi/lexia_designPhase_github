# Database Setup Instructions

Since you have provided the real Supabase credentials, you need to set up the database schema in your Supabase instance.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://untdlxyoszwbkyfeffna.supabase.co
2. Navigate to the SQL Editor
3. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_oauth_improvements.sql`
   - `supabase/migrations/003_case_tasks.sql`
   - `supabase/migrations/004_task_policies_and_events.sql`
   - `supabase/migrations/005_task_policy_events_and_retention.sql`
   - `supabase/migrations/005_task_policy_audit_and_event_retention.sql`
   - `supabase/migrations/006_task_event_filters_and_pagination.sql`
   - `supabase/migrations/007_deadline_provenance_entities.sql`
   - `supabase/migrations/008_profiles_trust_admin_role_claim.sql`
   - `supabase/migrations/009_readiness_telemetry.sql`
   - `supabase/migrations/010_readiness_export_history.sql`
4. Paste each file into the SQL Editor and run it before moving to the next one

## Option 2: Using the migration file directly

If you have the Supabase CLI installed:

```bash
# First, link your project (run this in the Kingsley_claude folder)
supabase link --project-ref untdlxyoszwbkyfeffna

# Then run the migration
supabase db push
```

## What this will create:

- User profiles table with subscription and credit management
- Cases table for legal case management
- Messages table for AI chat history
- Documents table for file uploads
- Usage tracking for credits and AI queries
- Row Level Security policies for data protection
- Storage bucket for document uploads

Once you've run this schema, the application should work properly with real data persistence!

## Verification

After running the schema, you can verify it worked by:
1. Creating a new case
2. Sending a message to AI
3. Checking that data persists when you refresh the page

