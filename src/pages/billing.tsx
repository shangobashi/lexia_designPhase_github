import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Zap, CreditCard, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
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

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: 'Paiement réussi!',
        description: `Votre abonnement ${plan?.name} a été activé avec succès.`,
        variant: 'default',
      });
      onClose();
    }, 3000);
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Finaliser le paiement</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Plan: {plan.name} - {new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(plan.price / 100)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom sur la carte</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Numéro de carte</label>
              <Input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date d'expiration</label>
                <Input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="MM/AA"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">CVV</label>
                <Input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                `Payer ${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(plan.price / 100)}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  
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
        title: 'Paiement réussi!',
        description: 'Votre abonnement a été activé avec succès.',
      });
    } else if (canceled) {
      toast({
        title: 'Paiement annulé',
        description: 'Votre paiement a été annulé. Aucune charge n\'a été effectuée.',
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
            name: 'Essai gratuit',
            description: 'Pour les particuliers qui souhaitent essayer LexiA',
            price: 0,
            credits: 10,
            priceId: 'price_free_trial',
            features: [
              '10 consultations juridiques gratuites',
              'Accès aux ressources de base du droit belge',
              'Stockage de documents limité (25MB)'
            ],
            isCurrent: user?.profile?.subscription_plan === 'free'
          },
          basic: {
            name: 'Basique',
            description: 'Pour les particuliers ayant des besoins juridiques occasionnels',
            price: 4999, // €49.99 in cents
            credits: 25,
            priceId: 'price_basic_monthly',
            stripePriceId: 'price_basic_monthly',
            features: [
              '25 consultations juridiques par mois',
              '10 générations de documents',
              'Accès aux ressources complètes du droit belge',
              'Stockage de documents (100MB)',
              'Support par email'
            ],
            isCurrent: user?.profile?.subscription_plan === 'basic'
          },
          premium: {
            name: 'Premium',
            description: 'Pour les particuliers ayant des besoins juridiques réguliers',
            price: 19999, // €199.99 in cents
            credits: 999,
            priceId: 'price_premium_monthly',
            stripePriceId: 'price_premium_monthly',
            features: [
              'Consultations juridiques illimitées',
              'Générations de documents illimitées',
              'Accès prioritaire aux dernières mises à jour juridiques',
              'Stockage de documents (1GB)',
              'Support prioritaire email et téléphone',
              'Configurations de prompts système personnalisées'
            ],
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
        title: 'Gestion de l\'abonnement',
        description: 'Le portail de gestion sera disponible prochainement.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder au portail client. Veuillez réessayer.',
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
          <h1 className="text-2xl font-bold tracking-tight">Facturation et abonnements</h1>
          <p className="text-muted-foreground">Gérez vos abonnements et consultez votre facturation</p>
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
          <h1 className="text-4xl font-bold tracking-tight mb-4">Tarifs LexiA</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choisissez le plan qui correspond le mieux à vos besoins juridiques
          </p>
        </div>
        
        {/* Public Pricing Display */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {Object.entries(pricingPlans).map(([key, plan]) => (
            <Card key={key} className={key === 'basic' ? 'border-primary shadow-lg scale-105' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getPlanIcon(key)}
                    {plan.name}
                  </span>
                  {key === 'basic' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Populaire
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? 'Gratuit' : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/mois</span>}
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
                    {key === 'free' ? 'Commencer gratuitement' : 'Choisir ce plan'}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center bg-muted rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Prêt à commencer ?</h2>
          <p className="text-muted-foreground mb-6">
            Rejoignez des centaines d'utilisateurs qui font confiance à LexiA pour leurs besoins juridiques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/register">Créer un compte gratuit</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/login">Se connecter</a>
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
          <h1 className="text-2xl font-bold tracking-tight">Facturation et abonnements</h1>
          <p className="text-muted-foreground">Gérez vos abonnements et consultez votre facturation</p>
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
    <div className="p-6 sophisticated-bg dark:dark-bg min-h-screen">
      {/* Header */}
      <header className="bg-white/80 dark:dark-header backdrop-blur-md border-b border-gray-200/50 dark:border-slate-600/30 px-6 py-4 mb-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100">Facturation & Abonnements</h1>
            <p className="text-gray-600 dark:text-slate-300">Gérez votre abonnement et consultez votre usage</p>
          </div>
        </div>
      </header>

      {/* Current Plan */}
      {userProfile && (
        <div className="executive-card dark:dark-executive-card rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Abonnement actuel</h2>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Plan {pricingPlans[userProfile.subscription_plan]?.name || 'Premium'}</h3>
                  <p className="text-gray-600 dark:text-slate-300">Accès illimité à toutes les fonctionnalités</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-slate-800 dark:text-slate-100">
                    {pricingPlans[userProfile.subscription_plan]?.price ? formatPrice(pricingPlans[userProfile.subscription_plan].price) : '199,99€'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">par mois</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-300">Crédits utilisés ce mois</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{userProfile.credits_remaining} / Illimité</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-300">Prochaine facturation</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">15 août 2024</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-300">Statut</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">Actif</span>
                </div>
              </div>
            </div>
            
            <div className="lg:w-80">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">Utilisation mensuelle</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-slate-300">Consultations IA</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">47</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700/50 rounded-full h-2">
                    <div className="progress-bar dark:dark-progress-bar h-2 rounded-full" style={{width: '24%'}}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-slate-300">Documents générés</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">12</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700/50 rounded-full h-2">
                    <div className="progress-bar dark:dark-progress-bar h-2 rounded-full" style={{width: '12%'}}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-slate-300">Stockage utilisé</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">2.3 GB / 10 GB</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700/50 rounded-full h-2">
                    <div className="progress-bar dark:dark-progress-bar h-2 rounded-full" style={{width: '23%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button 
              onClick={handleManageSubscription}
              className="px-4 py-2 border border-gray-300 dark:dark-secondary-button text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              Gérer l'abonnement
            </button>
            <button className="px-4 py-2 border border-gray-300 dark:dark-secondary-button text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
              Télécharger la facture
            </button>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Plans disponibles</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="pricing-card dark:dark-pricing-card rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Gratuit</h3>
              <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">0€</div>
              <div className="text-gray-600 dark:text-slate-300">par mois</div>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">10 crédits par mois</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Support par email</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Stockage 100 MB</span>
              </li>
            </ul>
            
            <button className="w-full border border-gray-300 dark:dark-secondary-button text-gray-700 dark:text-slate-200 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
              Plan actuel
            </button>
          </div>

          {/* Basic Plan */}
          <div className="pricing-card dark:dark-pricing-card rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Basic</h3>
              <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">49,99€</div>
              <div className="text-gray-600 dark:text-slate-300">par mois</div>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">25 crédits par mois</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Support prioritaire</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Stockage 1 GB</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Export PDF</span>
              </li>
            </ul>
            
            <button 
              className="w-full primary-button dark:dark-primary-button text-white py-3 rounded-xl"
              onClick={() => handleUpgrade('basic')}
            >
              Passer au Basic
            </button>
          </div>

          {/* Premium Plan */}
          <div className="pricing-card featured dark:dark-pricing-card dark:featured rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gray-700 dark:bg-slate-600 text-white dark:text-slate-100 px-4 py-1 rounded-full text-xs font-medium">Recommandé</span>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Premium</h3>
              <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">199,99€</div>
              <div className="text-gray-600 dark:text-slate-300">par mois</div>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Crédits illimités</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Support téléphonique</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Stockage 10 GB</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">API Access</span>
              </li>
              <li className="flex items-center text-sm">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="text-gray-700 dark:text-slate-200">Collaboration équipe</span>
              </li>
            </ul>
            
            <button className="w-full bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 py-3 rounded-xl cursor-not-allowed">
              Plan actuel
            </button>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Historique de facturation</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600/30">
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-slate-300">Date</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-slate-300">Description</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-slate-300">Montant</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-slate-300">Statut</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-600/20">
              <tr>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">15 juillet 2024</td>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">Abonnement Premium - Juillet</td>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">199,99€</td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">Payé</span>
                </td>
                <td className="py-4">
                  <button className="text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 text-sm underline">Télécharger</button>
                </td>
              </tr>
              <tr>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">15 juin 2024</td>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">Abonnement Premium - Juin</td>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">199,99€</td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">Payé</span>
                </td>
                <td className="py-4">
                  <button className="text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 text-sm underline">Télécharger</button>
                </td>
              </tr>
              <tr>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">15 mai 2024</td>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">Abonnement Premium - Mai</td>
                <td className="py-4 text-sm text-gray-900 dark:text-slate-100">199,99€</td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">Payé</span>
                </td>
                <td className="py-4">
                  <button className="text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 text-sm underline">Télécharger</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={paymentDialog.isOpen}
        onClose={() => setPaymentDialog({ isOpen: false, plan: null })}
        plan={paymentDialog.plan}
      />
    </div>
  );
}