# 🚀 LexiA Production Deployment Guide

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ Supabase account and project
- ✅ Google Gemini API key (free)
- ✅ Groq API key (free)
- ✅ Stripe account (test mode)
- ✅ PayPal Developer account (sandbox)
- ✅ GitHub repository with your code

## 🛠️ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Wait for database setup to complete

### 1.2 Run Database Migration
1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL script
4. Verify tables are created successfully

### 1.3 Setup Storage
1. Go to Storage in Supabase dashboard
2. Verify the `documents` bucket was created by the migration
3. If not, create it manually:
   - Click "Create bucket"
   - Name: `documents`
   - Public: false (keep private)

### 1.4 Configure Authentication
1. Go to Authentication > Settings
2. Enable email authentication
3. Configure redirect URLs:
   - `https://your-domain.netlify.app/dashboard`
   - `https://your-domain.vercel.app/dashboard`
4. Optional: Enable OAuth providers (Google, Microsoft)

### 1.5 Get API Keys
- Project URL: `https://xxx.supabase.co`
- Anon (public) key: From Settings > API
- Service role key: From Settings > API (keep secret!)

## 🤖 Step 2: AI Provider Setup

### 2.1 Google Gemini (Free - Recommended)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key" → "Create API key in new project"
3. Copy the generated key
4. Store as `GEMINI_API_KEY`

### 2.2 Groq (Free Alternative)
1. Visit [GroqCloud Console](https://console.groq.com/keys)
2. Sign up for free account
3. Create API key
4. Store as `GROQ_API_KEY`

## 💳 Step 3: Payment Provider Setup

### 3.1 Stripe Setup (Test Mode)
1. Visit [Stripe Dashboard](https://dashboard.stripe.com)
2. Create account, stay in "Test mode"
3. Go to Developers > API keys
4. Copy:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
5. Go to Developers > Webhooks
6. Create webhook endpoint: `https://your-backend-url.com/api/stripe/webhook`
7. Select events: `checkout.session.completed`, `customer.subscription.deleted`
8. Copy webhook secret (starts with `whsec_`)

### 3.2 PayPal Setup (Sandbox)
1. Visit [PayPal Developer](https://developer.paypal.com)
2. Create sandbox app
3. Copy:
   - Client ID
   - Client Secret
4. Set up webhook: `https://your-backend-url.com/api/paypal/webhook`

## 🚀 Step 4: Backend Deployment (Railway)

### 4.1 Deploy to Railway
1. Visit [Railway](https://railway.app)
2. Connect GitHub repository
3. Select the `backend` folder for deployment
4. Railway will auto-detect Node.js and deploy

### 4.2 Set Environment Variables
In Railway dashboard, add these environment variables:
```
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
FRONTEND_URL=https://your-frontend-domain.com
```

### 4.3 Alternative: Render
1. Visit [Render](https://render.com)
2. Connect GitHub repo
3. Create new Web Service
4. Set build command: `cd backend && npm install`
5. Set start command: `cd backend && npm start`
6. Add same environment variables as Railway

## 🌐 Step 5: Frontend Deployment (Netlify)

### 5.1 Deploy to Netlify
1. Visit [Netlify](https://netlify.com)
2. Connect GitHub repository
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy site

### 5.2 Set Environment Variables
In Netlify dashboard > Site settings > Environment variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GROQ_API_KEY=your_groq_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_API_URL=https://your-backend-domain.com
```

### 5.3 Alternative: Vercel
1. Visit [Vercel](https://vercel.com)
2. Import GitHub repository
3. Set framework preset to "Vite"
4. Add same environment variables as Netlify

## 🔄 Step 6: Update Cross-Origin Settings

### 6.1 Update Backend CORS
Update `backend/index.js` CORS origin:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  credentials: true
}));
```

### 6.2 Update Supabase Redirect URLs
In Supabase Auth settings, add your production URLs:
- `https://your-domain.netlify.app/dashboard`
- `https://your-domain.vercel.app/dashboard`

### 6.3 Update Payment Webhook URLs
Update webhook URLs in Stripe/PayPal to point to your production backend:
- Stripe: `https://your-backend.railway.app/api/stripe/webhook`
- PayPal: `https://your-backend.railway.app/api/paypal/webhook`

## ✅ Step 7: Testing Production

### 7.1 Test Authentication
1. Visit your production URL
2. Sign up for new account
3. Verify email confirmation
4. Test login/logout

### 7.2 Test AI Chat
1. Create a new case
2. Send message in chat
3. Verify AI response (should not be demo mode)
4. Check credits are deducted

### 7.3 Test Payments
1. Go to billing page
2. Try upgrading plan with Stripe (use test card: 4242 4242 4242 4242)
3. Try PayPal payment flow
4. Verify subscription status updates

### 7.4 Test File Upload
1. Go to Documents/Uploads page
2. Upload test files (PDF, DOC, images)
3. Verify files appear in document list
4. Test download functionality
5. Test delete functionality
6. Check storage usage display

## 🔧 Step 8: Monitoring & Maintenance

### 8.1 Set Up Monitoring
- Monitor Railway/Render logs for backend errors
- Set up Supabase monitoring for database performance
- Monitor Stripe dashboard for payment issues

### 8.2 Regular Tasks
- Monitor API usage and costs
- Check Supabase storage limits
- Review error logs weekly
- Update API keys before expiration

## 🆘 Troubleshooting

### Common Issues:

**Backend won't start:**
- Check environment variables are set correctly
- Verify Supabase credentials
- Check Railway/Render build logs

**Frontend auth errors:**
- Verify Supabase URL and anon key
- Check CORS settings
- Ensure redirect URLs are configured

**AI not working:**
- Verify API keys are set in backend
- Check backend logs for API errors
- Test API keys manually

**Payment issues:**
- Verify webhook URLs are accessible
- Check Stripe/PayPal dashboard for events
- Ensure test mode is enabled

## 📊 Free Tier Limits

### Supabase (Free Tier):
- 50,000 monthly active users
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth

### Railway (Free Tier):
- 500 hours/month
- 1 GB RAM
- 1 GB disk
- Auto-sleep after 1 hour idle

### Netlify (Free Tier):
- 100 GB bandwidth/month
- 300 build minutes/month
- Deploy previews

### Gemini API (Free Tier):
- 1,500 requests/day
- Rate limited

### Groq (Free Tier):
- Free tier available
- Rate limited

## 🎉 Success!

Your LexiA MVP is now production-ready with:
- ✅ Secure authentication
- ✅ Real AI providers
- ✅ Database persistence
- ✅ Payment processing
- ✅ Free hosting
- ✅ Professional UI

**Total Monthly Cost: $0** (using only free tiers)

For support or questions, refer to:
- [Supabase Docs](https://supabase.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Netlify Docs](https://docs.netlify.com)
- [Stripe Docs](https://stripe.com/docs)
- [PayPal Developer Docs](https://developer.paypal.com/docs/)