# 🔑 API Keys Setup Guide for LexiA Production

## Required Free API Keys

### 1. Google Gemini AI (Free Tier - Recommended)

**Free Tier Benefits:**
- 1,500 requests per day with Gemini 1.5 Flash
- Completely free in Google AI Studio
- Up to 1 million tokens per prompt (700,000+ words)
- Multimodal support (text, images, video, audio)

**Steps to Get Free API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" 
4. Choose "Create API key in new project" (or select existing project)
5. Copy the generated API key
6. Store securely as `VITE_GEMINI_API_KEY` environment variable

**Important Notes:**
- Free tier data may be used to train Google's models
- Don't use sensitive data on free tier
- No context caching on free plan

### 2. Groq AI (Free Tier - Alternative)

**Free Tier Benefits:**
- Fast inference speed
- OpenAI-compatible endpoint (easy migration)
- Free tier available for developers
- Good for testing and prototyping

**Steps to Get Free API Key:**
1. Visit [GroqCloud Console](https://console.groq.com/keys)
2. Sign up for free account if needed
3. Navigate to "API Keys" in left sidebar
4. Click "Create API Key"
5. Give it a descriptive name
6. Click "Submit"
7. Copy the generated key
8. Store securely as `VITE_GROQ_API_KEY` environment variable

### 3. Supabase (Database & Auth - Free)

**Free Tier Benefits:**
- 50,000 monthly active users
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth
- Real-time subscriptions

**Steps to Setup:**
1. Visit [Supabase](https://supabase.com)
2. Sign up with GitHub/Google
3. Create new project
4. Note down:
   - Project URL
   - Anon public key
   - Service role key (keep secret)

### 4. Stripe (Payment Processing - Test Mode)

**Test Mode Benefits:**
- Full functionality in test mode
- No real money processed
- Complete payment flow testing
- Free forever for testing

**Steps to Setup:**
1. Visit [Stripe Dashboard](https://dashboard.stripe.com)
2. Create free account
3. Stay in "Test mode"
4. Get test API keys from Developers > API keys
5. Note down:
   - Publishable key (starts with pk_test_)
   - Secret key (starts with sk_test_)

### 5. PayPal Developer (Alternative Payment - Sandbox)

**Sandbox Benefits:**
- Full PayPal integration testing
- No real money processed
- Complete checkout experience
- Free for development

**Steps to Setup:**
1. Visit [PayPal Developer](https://developer.paypal.com)
2. Log in with PayPal account
3. Create new app in sandbox
4. Note down:
   - Client ID
   - Client Secret

## Environment Variables Setup

Create `.env` file in project root:

```env
# AI Providers
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here

# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Stripe (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# PayPal (Sandbox)
VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret

# App Configuration
NODE_ENV=production
VITE_APP_URL=https://your-app-domain.com
```

## Security Best Practices

1. **Never commit API keys to git**
2. **Use environment variables for all secrets**
3. **Keep service role keys on backend only**
4. **Regularly rotate API keys**
5. **Monitor usage and set up alerts**

## Next Steps

After obtaining these API keys:
1. Set up Supabase database schema
2. Configure backend with secure API endpoints
3. Implement authentication
4. Set up payment processing
5. Deploy to production hosting

## Support Links

- [Google AI Studio](https://makersuite.google.com)
- [Groq Console](https://console.groq.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [PayPal Developer](https://developer.paypal.com)