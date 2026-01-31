# Database Setup Instructions

Since you have provided the real Supabase credentials, you need to set up the database schema in your Supabase instance.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://untdlxyoszwbkyfeffna.supabase.co
2. Navigate to the SQL Editor
3. Copy the entire content from `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor and run it

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