# Migration Scripts

This directory contains scripts to migrate data from the local PostgreSQL database to Supabase Cloud.

## Prerequisites

1. **Supabase Project Setup:**
   - Create a new project in Supabase Dashboard
   - Run all migrations in `../supabase/migrations/` in order
   - Enable the pgvector extension
   - Configure Google OAuth provider

2. **Environment Variables:**
   - Set `NEXT_PUBLIC_SUPABASE_URL` in your `.env.local`
   - Set `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`

3. **Local Database:**
   - Ensure your local PostgreSQL database is running
   - Knowledge base data should be available

## Running the Migration

```bash
# Install dependencies
cd scripts
npm install

# Run the migration
npm run migrate
```

## What the Migration Does

1. **Connects to local PostgreSQL database**
   - Reads all knowledge base entries
   - Preserves embeddings, metadata, and content

2. **Migrates to Supabase Cloud**
   - Batch inserts data to avoid timeouts
   - Sets access_level to 'public' for all entries
   - Preserves original timestamps

3. **Verifies migration**
   - Counts entries in Supabase
   - Tests semantic search function
   - Confirms everything is working

## Migration Output

The script will show progress:
```
🚀 Starting Supabase migration...
Found 1234 knowledge base entries in local database
Migrating 1234 knowledge base entries...
Migrated 100/1234 entries...
Migrated 200/1234 entries...
...
✅ Successfully migrated 1234 knowledge base entries
✅ Verification complete: 1234 entries found in Supabase
✅ Semantic search test successful: 1 results
🎉 Migration completed successfully!
```

## Troubleshooting

**Error: Missing Supabase configuration**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

**Error: Connection refused to local database**
- Ensure your local PostgreSQL is running
- Check connection settings in `../src/lib/database-pg.ts`

**Error: relation "knowledge_base" does not exist**
- Run Supabase migrations first: `../supabase/migrations/`

**Error: function semantic_search does not exist**
- Ensure `003_functions.sql` migration was run successfully

## Post-Migration

After successful migration:

1. **Update Environment Variables:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Configure Google OAuth:**
   - In Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Google OAuth credentials

3. **Test the Application:**
   - Start Next.js app: `npm run dev`
   - Try signing in with Google
   - Test chat functionality with knowledge base