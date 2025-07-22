import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createCustomerPortalSession } from '@/lib/stripe';

interface CustomerPortalButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CustomerPortalButton({ 
  children, 
  variant = 'outline',
  size = 'sm',
  className 
}: CustomerPortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePortalAccess = async () => {
    setIsLoading(true);
    
    try {
      // Create customer portal session
      const session = await createCustomerPortalSession();
      
      // Redirect to customer portal
      window.location.href = session.url;
    } catch (error) {
      console.error('Customer portal error:', error);
      // For demo purposes, show alert. In production, use proper error handling/toast
      alert('Error accessing billing portal. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePortalAccess}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
