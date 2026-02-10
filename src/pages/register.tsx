import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scale, Mail, Lock, User, Github, UserPlus } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';

export default function RegisterPage() {
  const { register, googleLogin, microsoftLogin, continueAsGuest } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the return path from location state or default to dashboard  
  const from = location.state?.from?.pathname || '/dashboard';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register(email, password, name);
      toast({
        title: t.register.toasts.success,
        description: t.register.toasts.successDesc,
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: t.register.toasts.failed,
        description: error.message || t.register.toasts.failedDesc,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`w-full max-w-md premium-shadow rounded-3xl p-6 sm:p-10 lg:p-12 shimmer ${theme === 'dark' ? 'dark-form-bg' : 'bg-white'}`}>
      {/* Mobile Logo (visible on smaller screens) */}
      <div className="flex flex-col items-center mb-8 lg:hidden">
        <div className="mb-4 w-16 h-16 flex items-center justify-center">
          <img src={`${import.meta.env.BASE_URL}kingsley-logo.png`} alt="Kingsley Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-clash font-light text-slate-800">Kingsley</h1>
      </div>
      
      <div className="space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className={`text-2xl sm:text-3xl font-clash font-light mb-3 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.register.title}</h2>
          <p className={`font-clash font-light ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.register.subtitle}</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder={t.register.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                theme === 'dark'
                  ? 'parchment-input'
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
            
            <input
              type="email"
              placeholder={t.register.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                theme === 'dark'
                  ? 'parchment-input'
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
            
            <input
              type="password"
              placeholder={t.register.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                theme === 'dark'
                  ? 'parchment-input'
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
            
            <p className={`text-xs font-clash font-light ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              {t.register.passwordHint}
            </p>
          </div>
          
          <button type="submit" className="executive-button w-full text-white py-3.5 sm:py-4 rounded-2xl font-clash font-medium shimmer" disabled={isLoading}>
            {isLoading ? t.register.submitting : t.register.submitButton}
          </button>
          
          <div className={`text-xs text-center font-clash font-light ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            {t.register.termsPrefix}{' '}
            <Link to="/terms" className={`${theme === 'dark' ? 'text-slate-200 hover:text-slate-100' : 'text-slate-800 hover:text-slate-600'} transition-colors`}>
              {t.register.termsLink}
            </Link>{' '}
            {t.register.termsMiddle}{' '}
            <Link to="/privacy" className={`${theme === 'dark' ? 'text-slate-200 hover:text-slate-100' : 'text-slate-800 hover:text-slate-600'} transition-colors`}>
              {t.register.privacyLink}
            </Link>
          </div>
        </form>
        
        <div className="text-center">
          <p className={`text-sm font-clash font-light ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {t.register.hasAccount}{' '}
            <Link to="/login" className={`${theme === 'dark' ? 'text-slate-100 hover:text-slate-200' : 'text-slate-800 hover:text-slate-600'} font-clash font-medium ml-1 transition-colors`}>
              {t.register.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
