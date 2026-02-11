import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Zap, CreditCard, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';

// Removed API dependencies - using direct Supabase and hardcoded pricing

// Types
interface PricingPlan {
  name: string;
  credits: number;
  price: number;
  features: string[];
  stripePriceId?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_plan: 'free' | 'basic' | 'premium';
  subscription_status: string;
  credits_remaining: number;
  trial_ends_at: string;
}

// Payment Dialog Component
function PaymentDialog({ isOpen, onClose, plan }: { isOpen: boolean; onClose: () => void; plan: PricingPlan | null }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: t.billing.payment.success,
        description: t.billing.payment.successDesc.replace('{plan}', plan?.name || ''),
        variant: 'default',
      });
      onClose();
    }, 3000);
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`w-full max-w-md mx-4 ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.billing.payment.title}</h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className={`mb-6 p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
          <div className="text-center">
            <h3 className={`text-lg font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>{plan.name}</h3>
            <div className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-1`}>
              {plan.name === 'Basic' ? '49,99€' : '∞'}
            </div>
            <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
              {plan.name === 'Basic' ? t.common.perMonth : t.common.unlimited}
            </div>
          </div>
        </div>
        
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.payment.nameOnCard}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              required
              className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'dark-input text-slate-200' : 'border-gray-300 text-gray-700 bg-white/90'} focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent`}
            />
          </div>
          <div>
            <label className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.payment.cardNumber}</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
              className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'dark-input text-slate-200' : 'border-gray-300 text-gray-700 bg-white/90'} focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.payment.expiry}</label>
              <input
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="MM/AA"
                maxLength={5}
                required
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'dark-input text-slate-200' : 'border-gray-300 text-gray-700 bg-white/90'} focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent`}
              />
            </div>
            <div>
              <label className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.payment.cvv}</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                maxLength={4}
                required
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'dark-input text-slate-200' : 'border-gray-300 text-gray-700 bg-white/90'} focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent`}
              />
            </div>
          </div>
          <button 
            type="submit" 
            className={`w-full ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white py-3 rounded-xl font-clash font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                {t.billing.payment.processing}
              </>
            ) : (
              `${t.billing.payment.pay} ${plan.name === 'Basic' ? '49,99€' : '∞'}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const [pricingPlans, setPricingPlans] = useState<Record<string, PricingPlan>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ isOpen: boolean; plan: PricingPlan | null }>({ isOpen: false, plan: null });

  // Handle payment success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success) {
      toast({
        title: t.billing.payment.success,
        description: t.billing.payment.successDesc.replace('{plan}', ''),
      });
    } else if (canceled) {
      toast({
        title: t.billing.payment.canceled,
        description: t.billing.payment.canceledDesc,
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Original pricing plans from the project (in cents for Stripe)
        const pricing = {
          free: {
            name: t.common.free,
            description: t.billing.pricingFeatures.free.description,
            price: 0,
            credits: 10,
            priceId: 'price_free_trial',
            features: [...t.billing.pricingFeatures.free.features],
            isCurrent: user?.profile?.subscription_plan === 'free'
          },
          basic: {
            name: t.billing.pricingFeatures.basic.name,
            description: t.billing.pricingFeatures.basic.description,
            price: 4999, // €49.99 in cents
            credits: 25,
            priceId: 'price_basic_monthly',
            stripePriceId: 'price_basic_monthly',
            features: [...t.billing.pricingFeatures.basic.features],
            isCurrent: user?.profile?.subscription_plan === 'basic'
          },
          premium: {
            name: t.billing.plans.premium.name,
            description: t.billing.pricingFeatures.premium.description,
            price: 19999, // €199.99 in cents
            credits: 999,
            priceId: 'price_premium_monthly',
            stripePriceId: 'price_premium_monthly',
            features: [...t.billing.pricingFeatures.premium.features],
            isCurrent: user?.profile?.subscription_plan === 'premium'
          }
        };
        
        setPricingPlans(pricing);
        
        // Convert user to profile format
        if (user.profile) {
          const profile: UserProfile = {
            id: user.id,
            email: user.email,
            full_name: user.displayName || '',
            subscription_plan: user.profile.subscription_plan,
            subscription_status: user.profile.subscription_status,
            credits_remaining: user.profile.credits_remaining,
            trial_ends_at: user.profile.trial_ends_at
          };
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching billing data:', error);
        setError('Failed to load billing information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchBillingData();
    }
  }, [user, authLoading]);

  const handleUpgrade = async (planType: string) => {
    if (!user) return;
    
    const plan = pricingPlans[planType];
    if (!plan) return;
    
    // Open payment dialog
    setPaymentDialog({ isOpen: true, plan });
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    try {
      // For now, show a placeholder message since Stripe isn't fully set up
      toast({
        title: t.billing.payment.manageTitle,
        description: t.billing.payment.manageDesc,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      toast({
        title: t.billing.payment.errorTitle,
        description: t.billing.payment.errorDesc,
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price / 100);
  };

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'basic': return <Zap className="h-5 w-5" />;
      case 'premium': return <Crown className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-clash font-bold tracking-tight">{t.billing.title}</h1>
          <p className="text-muted-foreground">{t.billing.subtitle}</p>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show public pricing page if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-clash font-bold tracking-tight mb-4">{t.billing.publicTitle}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.billing.publicSubtitle}
          </p>
        </div>
        
        {/* Public Pricing Display */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {Object.entries(pricingPlans).map(([key, plan]) => (
            <Card key={key} className={key === 'basic' ? 'border-primary shadow-lg md:scale-105' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getPlanIcon(key)}
                    {plan.name}
                  </span>
                  {key === 'basic' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      {t.billing.popular}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-clash font-bold">
                    {plan.price === 0 ? t.common.free : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/{t.common.perMonth.split(' ')[1] || t.common.perMonth}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={key === 'basic' ? 'default' : 'outline'}
                  asChild
                >
                  <a href={key === 'free' ? '/register' : '/register'}>
                    {key === 'free' ? t.billing.startFree : t.billing.choosePlan}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center bg-muted rounded-lg p-8">
          <h2 className="text-2xl font-clash font-bold mb-4">{t.billing.readyToStart}</h2>
          <p className="text-muted-foreground mb-6">
            {t.billing.readyToStartDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/register">{t.billing.createFreeAccount}</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/login">{t.billing.signIn}</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-clash font-bold tracking-tight">{t.billing.title}</h1>
          <p className="text-muted-foreground">{t.billing.subtitle}</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-6">
            {/* Current Plan */}
            {userProfile && (
              <div className={`rounded-2xl p-4 sm:p-6 mb-8 ${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.billing.currentPlan.title}</h2>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.billing.currentPlan.freePlan}</h3>
                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.freePlanDesc}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                    0€
                  </div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.common.perMonth}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.creditsUsed}</span>
                  <span className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>3 / 10</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.nextBilling}</span>
                  <span className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>—</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.status}</span>
                  <span className={`px-2 py-1 ${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} text-xs rounded-full font-clash font-medium`}>
                    {user?.isGuest ? t.billing.currentPlan.guestStatus : (userProfile.subscription_status || t.common.active)}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:w-80">
              <h4 className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-3`}>{t.billing.currentPlan.monthlyUsage}</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.creditsUsedLabel}</span>
                    <span className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>3 / 10</span>
                  </div>
                  <div className={`w-full ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'} rounded-full h-2`}>
                    <div className={`progress-bar ${theme === 'dark' ? 'dark-progress-bar' : ''} h-2 rounded-full`} style={{width: '30%'}}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.docsGenerated}</span>
                    <span className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>0</span>
                  </div>
                  <div className={`w-full ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'} rounded-full h-2`}>
                    <div className={`progress-bar ${theme === 'dark' ? 'dark-progress-bar' : ''} h-2 rounded-full`} style={{width: '0%'}}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.currentPlan.storageUsed}</span>
                    <span className={`font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>5 MB / 100 MB</span>
                  </div>
                  <div className={`w-full ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'} rounded-full h-2`}>
                    <div className={`progress-bar ${theme === 'dark' ? 'dark-progress-bar' : ''} h-2 rounded-full`} style={{width: '5%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button 
              onClick={handleManageSubscription}
              className={`px-4 py-2 rounded-xl transition-all ${
                theme === 'dark' 
                  ? 'dark-secondary-button text-slate-200' 
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.billing.currentPlan.manageSubscription}
            </button>
            <button className={`px-4 py-2 rounded-xl transition-all ${
              theme === 'dark' 
                ? 'dark-secondary-button text-slate-200' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              {t.billing.currentPlan.downloadInvoice}
            </button>
          </div>
              </div>
            )}

            {/* Pricing Plans */}
            <div className="mb-8">
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>{t.billing.plans.title}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className={`${theme === 'dark' ? 'dark-pricing-card' : 'pricing-card'} rounded-2xl p-4 sm:p-6 flex flex-col`}>
                  <div className="text-center mb-6">
                    <h3 className={`text-lg font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>{t.billing.plans.free.name}</h3>
                    <div className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-1`}>0€</div>
                    <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.common.perMonth}</div>
                  </div>

                  <ul className="space-y-3 mb-6 flex-grow min-h-[120px]">
                    <li className="flex items-start space-x-3 text-sm">
                      <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                      </svg>
                      <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.free.credits}</span>
                    </li>
                    <li className="flex items-start space-x-3 text-sm">
                      <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                      </svg>
                      <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.free.basicConsultation}</span>
                    </li>
                    <li className="flex items-start space-x-3 text-sm">
                      <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                      </svg>
                      <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.free.emailSupport}</span>
                    </li>
                  </ul>
                  
                  <button className={`w-full ${theme === 'dark' ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-100 text-gray-500'} py-3 rounded-xl cursor-not-allowed`}>
                    {t.billing.plans.free.currentPlan}
                  </button>
                </div>

                {/* Basic Plan */}
                <div className={`${theme === 'dark' ? 'dark-pricing-card featured' : 'pricing-card featured'} rounded-2xl p-4 sm:p-6 relative flex flex-col`}>
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className={`${theme === 'dark' ? 'bg-slate-600 text-slate-100' : 'bg-gray-700 text-white'} px-4 py-1 rounded-full text-xs font-clash font-medium`}>{t.billing.plans.basic.recommended}</span>
                  </div>
            <div className="text-center mb-6">
              <h3 className={`text-lg font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>{t.billing.plans.basic.name}</h3>
              <div className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-1`}>49,99€</div>
              <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.common.perMonth}</div>
            </div>

            <ul className="space-y-3 mb-6 flex-grow min-h-[120px]">
              <li className="flex items-start space-x-3 text-sm">
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.basic.credits}</span>
              </li>
              <li className="flex items-start space-x-3 text-sm">
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.basic.advancedConsultation}</span>
              </li>
              <li className="flex items-start space-x-3 text-sm">
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.basic.priorityEmail}</span>
              </li>
            </ul>
            
                  <button 
                    className={`w-full ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white py-3 rounded-xl`}
                    onClick={() => handleUpgrade('basic')}
                  >
                    {t.billing.plans.basic.upgrade}
                  </button>
                </div>

                {/* Premium Plan */}
                <div className={`${theme === 'dark' ? 'dark-pricing-card' : 'pricing-card'} rounded-2xl p-4 sm:p-6 flex flex-col`}>
            
            <div className="text-center mb-6">
              <h3 className={`text-lg font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>{t.billing.plans.premium.name}</h3>
              <div className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-1`}>∞</div>
              <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.billing.plans.premium.unlimited}</div>
            </div>

            <ul className="space-y-3 mb-6 flex-grow min-h-[120px]">
              <li className="flex items-start space-x-3 text-sm">
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.premium.custom}</span>
              </li>
              <li className="flex items-start space-x-3 text-sm">
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.premium.expertAdvice}</span>
              </li>
              <li className="flex items-start space-x-3 text-sm">
                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.plans.premium.phoneSupport}</span>
              </li>
            </ul>
            
                  <button 
                    className={`w-full ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white py-3 rounded-xl relative overflow-hidden group`}
                    onClick={() => handleUpgrade('premium')}
                  >
                    <span className="relative z-10">{t.billing.plans.premium.upgrade}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Billing History */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
              <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>{t.billing.history.title}</h2>
              <div className="text-center py-12">
                <h3 className={`text-lg font-clash font-medium mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{t.billing.history.noHistory}</h3>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.billing.history.noHistoryDesc}</p>
              </div>
            </div>
      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={paymentDialog.isOpen}
        onClose={() => setPaymentDialog({ isOpen: false, plan: null })}
        plan={paymentDialog.plan}
      />
    </main>
  );
}
