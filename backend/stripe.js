import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Pricing plans configuration
export const PRICING_PLANS = {
  free: {
    name: 'Free',
    credits: 10,
    price: 0,
    features: [
      '10 AI consultations per month',
      'Basic case management',
      'Document upload (5 files max)',
      'Email support'
    ]
  },
  basic: {
    name: 'Basic',
    credits: 100,
    price: 1999, // $19.99 in cents
    stripePriceId: 'price_basic_test', // Test price ID
    features: [
      '100 AI consultations per month',
      'Advanced case management',
      'Unlimited document uploads',
      'Document analysis',
      'Priority email support'
    ]
  },
  premium: {
    name: 'Premium',
    credits: 500,
    price: 4999, // $49.99 in cents
    stripePriceId: 'price_premium_test', // Test price ID
    features: [
      '500 AI consultations per month',
      'All Basic features',
      'Advanced AI models',
      'Real-time chat support',
      'Custom legal templates',
      'API access'
    ]
  }
};

// Create or retrieve Stripe customer
export const getOrCreateStripeCustomer = async (userId, email, name) => {
  try {
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        supabase_user_id: userId
      }
    });

    // Update user profile with Stripe customer ID
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Create Stripe checkout session
export const createCheckoutSession = async (userId, planType, successUrl, cancelUrl) => {
  try {
    const plan = PRICING_PLANS[planType];
    if (!plan || !plan.stripePriceId) {
      throw new Error('Invalid plan type');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      userId, 
      profile.email, 
      profile.full_name
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plan_type: planType
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_type: planType
        }
      }
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Handle successful payment
export const handleSuccessfulPayment = async (session) => {
  try {
    const userId = session.metadata.user_id;
    const planType = session.metadata.plan_type;
    const plan = PRICING_PLANS[planType];

    if (!userId || !planType || !plan) {
      throw new Error('Invalid session metadata');
    }

    // Update user subscription
    await supabase
      .from('profiles')
      .update({
        subscription_plan: planType,
        subscription_status: 'active',
        credits_remaining: plan.credits
      })
      .eq('id', userId);

    // Create subscription record
    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_subscription_id: session.subscription,
        plan: planType,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });

    console.log(`Successfully upgraded user ${userId} to ${planType} plan`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
};

// Handle subscription cancellation
export const handleSubscriptionCancellation = async (subscriptionId) => {
  try {
    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscriptionId);

    // Get user ID from subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscription) {
      // Downgrade user to free plan
      await supabase
        .from('profiles')
        .update({
          subscription_plan: 'free',
          subscription_status: 'canceled',
          credits_remaining: PRICING_PLANS.free.credits
        })
        .eq('id', subscription.user_id);
    }

    console.log(`Successfully canceled subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
};

// Create Stripe customer portal session
export const createCustomerPortalSession = async (userId, returnUrl) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
};

export default stripe;