import pkg from '@paypal/paypal-server-sdk';
const { client, Order } = pkg;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// PayPal client configuration
const paypalClient = client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
  },
  environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
});

// PayPal pricing plans (matches Stripe plans)
export const PAYPAL_PRICING_PLANS = {
  basic: {
    name: 'Basic',
    credits: 100,
    price: 19.99,
    description: 'Perfect for occasional legal consultations'
  },
  premium: {
    name: 'Premium', 
    credits: 500,
    price: 49.99,
    description: 'For professionals with regular legal needs'
  }
};

// Create PayPal order
export const createPayPalOrder = async (userId, planType) => {
  try {
    const plan = PAYPAL_PRICING_PLANS[planType];
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const orderRequest = {
      intent: 'CAPTURE',
      purchaseUnits: [
        {
          amount: {
            currencyCode: 'EUR',
            value: plan.price.toString(),
          },
          description: `Kingsley ${plan.name} Plan - ${plan.credits} credits`,
          customId: userId, // Store user ID for webhook processing
          invoiceId: `LEXIA-${planType.toUpperCase()}-${Date.now()}`,
        },
      ],
      applicationContext: {
        userAction: 'PAY_NOW',
        paymentMethod: {
          payerSelected: 'PAYPAL',
          payeePreferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        shippingPreference: 'NO_SHIPPING',
      },
      metadata: {
        userId,
        planType,
      },
    };

    const response = await paypalClient.orders.create({ body: orderRequest });
    
    return {
      orderId: response.result.id,
      approvalUrl: response.result.links.find(link => link.rel === 'approve')?.href,
    };
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw error;
  }
};

// Capture PayPal order after user approval
export const capturePayPalOrder = async (orderId) => {
  try {
    const response = await paypalClient.orders.capture({
      id: orderId,
      requestBody: {},
    });

    return response.result;
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    throw error;
  }
};

// Handle successful PayPal payment
export const handlePayPalPaymentSuccess = async (orderDetails) => {
  try {
    const userId = orderDetails.purchaseUnits[0].customId;
    
    // Extract plan type from invoice ID or description
    const invoiceId = orderDetails.purchaseUnits[0].invoiceId;
    const planType = invoiceId.includes('BASIC') ? 'basic' : 'premium';
    const plan = PAYPAL_PRICING_PLANS[planType];

    if (!userId || !plan) {
      throw new Error('Invalid order details');
    }

    // Update user subscription
    await supabase
      .from('profiles')
      .update({
        subscription_plan: planType,
        subscription_status: 'active',
        credits_remaining: plan.credits,
        paypal_customer_id: orderDetails.payer.payerId || orderDetails.payer.payerInfo?.payerId,
      })
      .eq('id', userId);

    // Create subscription record
    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        paypal_subscription_id: orderDetails.id,
        plan: planType,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    console.log(`Successfully upgraded user ${userId} to ${planType} plan via PayPal`);
    return { success: true, plan: planType };
  } catch (error) {
    console.error('Error handling PayPal payment success:', error);
    throw error;
  }
};

// Create PayPal subscription (for recurring payments)
export const createPayPalSubscription = async (userId, planType) => {
  try {
    const plan = PAYPAL_PRICING_PLANS[planType];
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    // Note: For simplicity, we're using one-time payments
    // In production, you'd want to set up PayPal subscription plans
    // This would require creating products and plans in PayPal dashboard
    
    return await createPayPalOrder(userId, planType);
  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    throw error;
  }
};

// Verify PayPal webhook signature (simplified version)
export const verifyPayPalWebhook = (headers, body, webhookSecret) => {
  // In production, implement proper webhook signature verification
  // PayPal provides specific libraries for this
  return true; // Simplified for demo
};

// Handle PayPal webhooks
export const handlePayPalWebhook = async (eventType, eventData) => {
  try {
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePayPalPaymentSuccess(eventData.resource);
        break;
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // Handle subscription cancellation
        const subscriptionId = eventData.resource.id;
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('paypal_subscription_id', subscriptionId);
        break;
      
      default:
        console.log(`Unhandled PayPal webhook event: ${eventType}`);
    }
  } catch (error) {
    console.error('Error handling PayPal webhook:', error);
    throw error;
  }
};

export default paypalClient;