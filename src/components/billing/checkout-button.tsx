import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/lib/stripe';
import stripePromise from '@/lib/stripe';

interface CheckoutButtonProps {
  priceId: string;
  planName: string;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CheckoutButton({ 
  priceId, 
  planName, 
  disabled, 
  children, 
  variant = 'default',
  size = 'default',
  className 
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (disabled) return;
    
    setIsLoading(true);
    
    try {
      // Create checkout session
      const session = await createCheckoutSession(priceId);
      
      // Get Stripe instance
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }
      
      // Redirect to checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });
      
      if (error) {
        console.error('Stripe checkout error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // For demo purposes, show alert. In production, use proper error handling/toast
      alert(`Error upgrading to ${planName}. Please try again or contact support.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
