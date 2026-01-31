# 🚀 Kingsley Setup Guide - Real Production Setup

This guide will help you set up Kingsley as a real working application with live databases, authentication, and AI services.

## 📋 Prerequisites

You'll need accounts for:
- [Supabase](https://supabase.com) (Database & Auth)
- [Google AI Studio](https://makersuite.google.com) (Gemini API)
- [Groq](https://console.groq.com) (Alternative AI)
- [Google Cloud Console](https://console.cloud.google.com) (OAuth)

## 🛠️ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Click "Start your project"
3. Create a new organization if needed
4. Click "New project"
5. Fill in:
   - **Project name**: `kingsley-prod`
   - **Database password**: Generate a strong password
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait for setup to complete (2-3 minutes)

### 1.2 Get Supabase Credentials
1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **Anon public key**: `eyJ...` (long string starting with eyJ)
   - **Service role key**: `eyJ...` (different long string - keep this SECRET!)

### 1.3 Run Database Migration
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents from `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Verify no errors appear

### 1.4 Configure Authentication
1. Go to **Authentication** > **Settings**
2. Under **General settings**:
   - Site URL: `http://localhost:5173` (for development)
   - Redirect URLs: `http://localhost:5173/**`
3. Under **Auth Providers**:
   - Enable **Email** (should be enabled by default)
   - Enable **Google** (we'll configure this next)

## 🔑 Step 2: Google OAuth Setup

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: `kingsley-auth`
4. Click "Create"

### 2.2 Configure OAuth
1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click "Configure OAuth screen"
3. Choose **External** → Click "Create"
4. Fill in:
   - **App name**: `Kingsley Legal Assistant`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Save and continue through all steps

### 2.3 Create OAuth Credentials
1. Go to **Credentials** → "Create Credentials" → "OAuth 2.0 Client IDs"
2. **Application type**: Web application
3. **Name**: `Kingsley Web Client`
4. **Authorized redirect URIs**: 
   - `https://[your-supabase-ref].supabase.co/auth/v1/callback`
   - Replace `[your-supabase-ref]` with your project ref from Supabase URL
5. Click "Create"
6. Copy **Client ID** and **Client Secret**

### 2.4 Configure in Supabase
1. In Supabase, go to **Authentication** > **Settings** > **Auth Providers**
2. Find **Google** and toggle it ON
3. Paste:
   - **Client ID**: From Google Cloud
   - **Client Secret**: From Google Cloud
4. Click "Save"

## 🤖 Step 3: AI API Setup

### 3.1 Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key" → "Create API key in new project"
3. Copy the generated API key
4. Store as `VITE_GEMINI_API_KEY`

### 3.2 Groq API (Optional but recommended)
1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up/login
3. Click "Create API Key"
4. Name it `Kingsley`
5. Copy the generated key
6. Store as `VITE_GROQ_API_KEY`

## 📁 Step 4: Environment Configuration

Create `.env` file in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Provider Keys
VITE_GEMINI_API_KEY=your-gemini-key
VITE_GROQ_API_KEY=your-groq-key

# App Configuration
VITE_APP_URL=http://localhost:5173
```

**⚠️ Important**: 
- Replace all placeholder values with your actual keys
- Never commit this file to git
- Keep the service role key secure (don't put it in frontend env)

## 🚀 Step 5: Start the Application

```bash
npm install
npm run dev
```

The app will start at `http://localhost:5173`

## ✅ Step 6: Test the Setup

### 6.1 Test Authentication
1. Open the app
2. Click "Sign Up" 
3. Try email registration
4. Try Google OAuth login
5. Verify you can logout and login again

### 6.2 Test Database
1. Create a new case
2. Add some messages
3. Check Supabase dashboard to see data persisted

### 6.3 Test AI Integration
1. Open a case
2. Send a message to the AI
3. Verify you get a real AI response

## 🔧 Troubleshooting

**Supabase Connection Issues**:
- Verify your URL and keys are correct
- Check the browser console for errors
- Ensure RLS policies are working

**Google Auth Issues**:
- Verify redirect URLs match exactly
- Check OAuth consent screen is configured
- Ensure Google provider is enabled in Supabase

**AI API Issues**:
- Verify API keys are correct and active
- Check rate limits haven't been exceeded
- Look at browser network tab for API call errors

## 🎯 Success Criteria

You have a working MVP when:
- ✅ Users can sign up with email
- ✅ Users can login with Google
- ✅ Cases are saved to real database
- ✅ AI responses come from real API
- ✅ All data persists between sessions

## 🚀 Next Steps

Once the MVP is working:
1. Deploy to production (see DEPLOYMENT_GUIDE.md)
2. Set up payment processing
3. Add more AI features
4. Implement document analysis

---

Need help? Check the browser console for errors and verify all environment variables are set correctly.