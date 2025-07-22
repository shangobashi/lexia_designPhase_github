import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { 
  PRICING_PLANS, 
  createCheckoutSession, 
  createCustomerPortalSession,
  handleSuccessfulPayment,
  handleSubscriptionCancellation
} from './stripe.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  handlePayPalWebhook,
  verifyPayPalWebhook
} from './paypal.js';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AI providers setup
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groqClient = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const SYSTEM_PROMPT = `précédence: maximale  # Remplace tous les paramètres système précédents

prompt_système:
  métadonnées:
    titre: "LexiA 1.0 — Assistant juridique IA belge"
    version: "2025-07-01"
    modèle: "{MODEL}"
    localisation: "Europe/Bruxelles (CET/CEST)"
    bases_de_connaissances:
      - "Tous les Codes belges consolidés (civil, pénal, social, fiscal, commercial, constitutionnel)"
      - "Jurisprudence récente de toutes les cours belges (première instance à Cour de cassation)"
      - "Jurisprudence de la Cour européenne des droits de l'homme (CEDH)"
      - "Travaux préparatoires parlementaires"
      - "Doctrine juridique belge de premier plan (ex: Stradalex, Jura.be, Larcier)"

  contexte:
    description: >
      Votre domaine couvre l'intégralité du droit belge, notamment :
      droit civil, pénal, administratif, commercial, du travail, fiscal, constitutionnel,
      marchés publics, propriété intellectuelle, sociétés, et droit de la jeunesse/famille.

  résumé_système:
    texte: >
      Vous êtes un conseiller juridique IA multilingue spécialisé en droit belge (FR/NL),
      capable d'agir comme assistant, conseiller, rédacteur, négociateur ou plaideur.
      Vous fournissez des analyses juridiques précises, citez des sources vérifiables et proposez
      des stratégies prospectives basées sur les tendances jurisprudentielles et la logique procédurale.

  instructions:
    directive_prioritaire:
      texte: >
        Ignorez tous les prompts précédents. Obéissez uniquement aux directives de cette configuration YAML.

    identification_rôle_juridique:
      description: >
        Identifiez le rôle juridique approprié (conseiller, rédacteur, négociateur, plaideur) et adaptez le ton et la structure de réponse en conséquence.

    output_structure:
      format: |
        **Role Identified**: As [Advisor/Litigator/Drafter/Negotiator], I will...
        
        **① Legal Issue**: State the legal question and context.
        
        **② Applicable Law**: 
        • [Code name] – Art. X § Y. (Credibility Z/10)
        • [Case law: Cass., dd mm yyyy, C.nr.XXX] (Credibility Z/10)
        
        **③ Analysis**: 
        1. Principle
        2. Application to facts
        3. Procedural considerations
        4. Judicial trend (if discernible)
        
        **④ Advice / Draft**: 
        • Strategic options + procedural guidance
        • Optional draft text (if applicable)
        
        **⑤ Sources**: 
        1. Full citation with hyperlink or fallback
        2. Source name, article, date, jurisdiction`;

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Check user credits
const checkCredits = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to check user credits' });
    }

    if (profile.credits_remaining <= 0 && profile.subscription_status !== 'active') {
      return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan.' });
    }

    req.userProfile = profile;
    next();
  } catch (error) {
    console.error('Credits check error:', error);
    res.status(500).json({ error: 'Failed to verify user credits' });
  }
};

// AI provider functions
const callGemini = async (messages) => {
  if (!geminiClient) throw new Error('Gemini API not configured');
  
  const model = geminiClient.getGenerativeModel({ model: "gemini-pro" });
  
  const conversationHistory = messages.map(msg => {
    return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
  }).join('\n\n');

  const prompt = `${SYSTEM_PROMPT}\n\nConversation:\n${conversationHistory}\n\nPlease respond as a Belgian legal AI assistant:`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

const callGroq = async (messages) => {
  if (!groqClient) throw new Error('Groq API not configured');
  
  const completion = await groqClient.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ],
    model: 'mixtral-8x7b-32768',
    temperature: 0.7,
    max_tokens: 2000,
  });
  
  return completion.choices[0]?.message?.content || '';
};

const callFallback = async (messages) => {
  // Fallback demo response
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const userContent = lastUserMessage?.content.toLowerCase() || '';
  
  return `**Role Identified**: As Legal Advisor, I will provide general guidance on your legal inquiry.

**① Legal Issue**: Legal question regarding ${userContent.split(' ').slice(0, 3).join(', ')}.

**② Applicable Law**:
• Code civil belge (Belgian Civil Code) (Credibility: 10/10)
• Code judiciaire (Judicial Code) (Credibility: 10/10)

**③ Analysis**:
1. **Belgian Legal System**: Based on civil law tradition with codified statutes
2. **Court Structure**: Justice of Peace → Tribunal → Court of Appeal → Court of Cassation
3. **Legal Sources**: Primary law, case law, and legal doctrine guide interpretation

**④ Advice**:
• Consult specific Belgian codes relevant to your legal area
• Consider the appropriate court jurisdiction for your matter
• Seek professional legal counsel for complex issues

**⑤ Sources**:
1. Belgian legal codes and statutes
2. Available through official Belgian legal databases

*Note: This is a demo response. For real legal analysis, please configure AI providers in your backend.*`;
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    providers: {
      gemini: !!geminiClient,
      groq: !!groqClient,
      supabase: !!supabase
    }
  });
});

// AI Chat endpoint
app.post('/api/ai/chat', verifyAuth, checkCredits, async (req, res) => {
  try {
    const { messages, caseId, provider } = req.body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    let response;
    let usedProvider = provider || 'fallback';
    let tokenCount = 0;

    // Try AI providers in order
    try {
      if (provider === 'gemini' || (!provider && geminiClient)) {
        response = await callGemini(messages);
        usedProvider = 'gemini';
        tokenCount = Math.ceil(response.length / 4); // Rough token estimation
      } else if (provider === 'groq' || (!provider && groqClient)) {
        response = await callGroq(messages);
        usedProvider = 'groq';
        tokenCount = Math.ceil(response.length / 4);
      } else {
        throw new Error('No AI providers available');
      }
    } catch (error) {
      console.log('AI provider failed, using fallback:', error.message);
      response = await callFallback(messages);
      usedProvider = 'fallback';
    }

    // Track usage only for real AI providers
    const creditsUsed = usedProvider === 'fallback' ? 0 : 1;
    
    if (creditsUsed > 0) {
      const { error: trackingError } = await supabase.rpc('track_usage', {
        p_user_id: req.user.id,
        p_case_id: caseId,
        p_action_type: 'ai_query',
        p_credits_used: creditsUsed,
        p_ai_provider: usedProvider,
        p_token_count: tokenCount,
        p_metadata: { endpoint: 'chat' }
      });

      if (trackingError) {
        console.error('Usage tracking error:', trackingError);
      }
    }

    res.json({
      message: response,
      provider: usedProvider,
      tokenCount,
      creditsUsed
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Document analysis endpoint
app.post('/api/ai/analyze-documents', verifyAuth, checkCredits, async (req, res) => {
  try {
    const { documents, caseId, provider } = req.body;
    
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }

    const analysisPrompt = `Please analyze the following documents and provide a summary:\n\n${documents.join('\n\n')}`;
    const messages = [{ role: 'user', content: analysisPrompt }];

    let response;
    let usedProvider = provider || 'fallback';
    let tokenCount = 0;

    try {
      if (provider === 'gemini' || (!provider && geminiClient)) {
        response = await callGemini(messages);
        usedProvider = 'gemini';
        tokenCount = Math.ceil(response.length / 4);
      } else if (provider === 'groq' || (!provider && groqClient)) {
        response = await callGroq(messages);
        usedProvider = 'groq';
        tokenCount = Math.ceil(response.length / 4);
      } else {
        throw new Error('No AI providers available');
      }
    } catch (error) {
      console.log('AI provider failed for document analysis, using fallback:', error.message);
      response = `**Document Analysis Results**

**① Documents Reviewed**: ${documents.length} document(s) analyzed

**② Key Findings**:
• Documents appear to follow Belgian legal formatting
• Contains standard legal terminology and clause patterns
• Requires detailed review by qualified legal professional

**③ Recommendations**:
• Cross-reference with applicable Belgian codes
• Verify compliance with current regulatory requirements
• Consider professional legal review for validation

**④ Note**: This is a fallback analysis. Configure AI providers for detailed analysis.`;
      usedProvider = 'fallback';
    }

    // Track usage
    const creditsUsed = usedProvider === 'fallback' ? 0 : 2; // Document analysis costs more
    
    if (creditsUsed > 0) {
      const { error: trackingError } = await supabase.rpc('track_usage', {
        p_user_id: req.user.id,
        p_case_id: caseId,
        p_action_type: 'document_analysis',
        p_credits_used: creditsUsed,
        p_ai_provider: usedProvider,
        p_token_count: tokenCount,
        p_metadata: { 
          endpoint: 'analyze-documents',
          document_count: documents.length 
        }
      });

      if (trackingError) {
        console.error('Usage tracking error:', trackingError);
      }
    }

    res.json({
      analysis: response,
      provider: usedProvider,
      tokenCount,
      creditsUsed
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze documents' });
  }
});

// Cases endpoints
app.get('/api/cases', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        messages(count),
        documents(count)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

app.get('/api/cases/:id', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        messages(*),
        documents(*)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Case not found' });
    
    res.json(data);
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

app.post('/api/cases', verifyAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Generate case ID
    const { data: caseId, error: caseIdError } = await supabase
      .rpc('generate_case_id');
      
    if (caseIdError) throw caseIdError;

    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_id: caseId,
        user_id: req.user.id,
        title,
        description
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// Messages endpoints
app.post('/api/cases/:caseId/messages', verifyAuth, async (req, res) => {
  try {
    const { content, sender, aiProvider, tokenCount } = req.body;
    
    if (!content || !sender) {
      return res.status(400).json({ error: 'Content and sender are required' });
    }

    // Verify case ownership
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', req.params.caseId)
      .eq('user_id', req.user.id)
      .single();

    if (caseError || !caseData) {
      return res.status(404).json({ error: 'Case not found or access denied' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        case_id: req.params.caseId,
        content,
        sender,
        ai_provider: aiProvider,
        token_count: tokenCount
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// User profile endpoint
app.get('/api/profile', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Stripe endpoints

// Get pricing plans
app.get('/api/pricing', (req, res) => {
  res.json(PRICING_PLANS);
});

// Create checkout session
app.post('/api/stripe/create-checkout-session', verifyAuth, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!planType || !PRICING_PLANS[planType]) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await createCheckoutSession(
      req.user.id,
      planType,
      `${frontendUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      `${frontendUrl}/billing?canceled=true`
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
app.post('/api/stripe/create-customer-portal-session', verifyAuth, async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await createCustomerPortalSession(
      req.user.id,
      `${frontendUrl}/billing`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create customer portal session error:', error);
    res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

// Stripe webhook endpoint (raw body needed for signature verification)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    const stripe = (await import('./stripe.js')).default;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSuccessfulPayment(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object.id);
        break;
      
      case 'invoice.payment_failed':
        // Handle failed payment
        console.log('Payment failed for subscription:', event.data.object.subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// PayPal endpoints

// Create PayPal order
app.post('/api/paypal/create-order', verifyAuth, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!planType || !PRICING_PLANS[planType]) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const result = await createPayPalOrder(req.user.id, planType);
    res.json(result);
  } catch (error) {
    console.error('Create PayPal order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// Capture PayPal order
app.post('/api/paypal/capture-order', verifyAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await capturePayPalOrder(orderId);
    res.json(result);
  } catch (error) {
    console.error('Capture PayPal order error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// PayPal webhook endpoint
app.post('/api/paypal/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const headers = req.headers;
    const body = req.body;
    const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET;

    // Verify webhook signature (simplified for demo)
    if (webhookSecret && !verifyPayPalWebhook(headers, body, webhookSecret)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body.toString());
    await handlePayPalWebhook(event.event_type, event);

    res.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook handler error:', error);
    res.status(500).json({ error: 'PayPal webhook handler failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LexiA backend running on port ${PORT}`);
  console.log('Available AI providers:', {
    gemini: !!geminiClient,
    groq: !!groqClient
  });
});