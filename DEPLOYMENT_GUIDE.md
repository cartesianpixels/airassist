# 🚀 Supabase + Vercel Deployment Guide

This guide walks you through deploying your ATC Assistant app with Supabase Cloud and Vercel.

## 📋 Prerequisites

- Supabase account
- Vercel account
- Google Cloud Console account (for OAuth)
- OpenAI API key

## 🏗️ Step 1: Set Up Supabase Cloud

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for project to be ready (~2 minutes)

### 1.2 Run Database Migrations
1. Go to your project dashboard
2. Navigate to SQL Editor
3. Run migrations in order:

```sql
-- 1. Run: supabase/migrations/001_initial_schema.sql
-- 2. Run: supabase/migrations/002_rls_policies.sql
-- 3. Run: supabase/migrations/003_functions.sql
```

### 1.3 Configure Authentication
1. Go to Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials (see Step 2)

## 🔐 Step 2: Set Up Google OAuth

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API

### 2.2 Configure OAuth Consent Screen
1. Go to APIs & Services → OAuth consent screen
2. Choose "External" user type
3. Fill required fields:
   - App name: "ATC Assistant"
   - User support email: your email
   - Developer contact: your email

### 2.3 Create OAuth Credentials
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Add authorized redirect URIs:
   ```
   https://[YOUR_SUPABASE_REF].supabase.co/auth/v1/callback
   ```

### 2.4 Configure in Supabase
1. In Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Add your Google Client ID and Client Secret
4. Set redirect URL to: `https://your-app.vercel.app/auth/callback`

## 📊 Step 3: Migrate Data

### 3.1 Prepare Migration Script
```bash
cd scripts
npm install
```

### 3.2 Set Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[your-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3.3 Run Migration
```bash
cd scripts
npm run migrate
```

Expected output:
```
🚀 Starting Supabase migration...
Found 1234 knowledge base entries in local database
✅ Successfully migrated 1234 knowledge base entries
✅ Verification complete: 1234 entries found in Supabase
🎉 Migration completed successfully!
```

## ⚡ Step 4: Deploy to Vercel

### 4.1 Connect GitHub Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository

### 4.2 Configure Environment Variables
In Vercel Dashboard → Project → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[your-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

### 4.3 Deploy
1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Your app will be available at: `https://your-app.vercel.app`

## 🧪 Step 5: Test Deployment

### 5.1 Test Authentication
1. Visit your deployed app
2. Click "Continue with Google"
3. Complete OAuth flow
4. Verify you're redirected back to app

### 5.2 Test Chat Functionality
1. Send a test message
2. Verify AI response with knowledge base
3. Check that chat history persists
4. Test new chat sessions

### 5.3 Test Database
1. Send multiple messages
2. Refresh browser
3. Verify chat history loads
4. Test on different devices with same account

## 🔧 Troubleshooting

### Common Issues

**"Authentication required" error**
- Check Supabase URL and anon key in Vercel env vars
- Verify Google OAuth is configured correctly

**"No response from AI"**
- Check OpenAI API key in Vercel env vars
- Verify API key has sufficient credits

**"Knowledge base search failed"**
- Ensure data migration completed successfully
- Check Supabase function `semantic_search` exists

**Google OAuth fails**
- Verify redirect URIs in Google Cloud Console
- Check OAuth consent screen is published
- Ensure Google provider is enabled in Supabase

### Environment Variables Checklist

✅ **Vercel Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

✅ **Supabase Configuration:**
- Google OAuth provider enabled
- Redirect URL: `https://your-app.vercel.app/auth/callback`
- Site URL: `https://your-app.vercel.app`

✅ **Google Cloud Console:**
- OAuth consent screen configured
- Authorized redirect URI: `https://[supabase-ref].supabase.co/auth/v1/callback`

## 🎉 Success!

Your ATC Assistant is now deployed with:
- ✅ Supabase Cloud database with vector search
- ✅ Google OAuth authentication
- ✅ Chat persistence across devices
- ✅ Real-time AI responses
- ✅ Production-ready scaling

## 🔄 Future Updates

To deploy updates:
1. Push changes to GitHub
2. Vercel automatically deploys
3. For database changes, create new migration in `supabase/migrations/`