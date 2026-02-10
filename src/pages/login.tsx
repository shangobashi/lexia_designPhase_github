import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';

export default function LoginPage() {
  const { login, googleLogin, microsoftLogin, continueAsGuest } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the return path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: t.login.toasts.success,
        description: t.login.toasts.successDesc,
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: t.login.toasts.failed,
        description: error.message || t.login.toasts.failedDesc,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      toast({
        title: t.login.toasts.success,
        description: t.login.toasts.successDesc,
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: t.login.toasts.googleFailed,
        description: error.message || t.login.toasts.retryLater,
        variant: "destructive",
      });
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      await microsoftLogin();
      toast({
        title: t.login.toasts.success,
        description: t.login.toasts.successDesc,
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: t.login.toasts.microsoftFailed,
        description: error.message || t.login.toasts.retryLater,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className={`w-full ${theme === 'dark' ? 'premium-shadow dark-form-bg' : 'premium-shadow bg-white'} rounded-3xl p-6 sm:p-10 lg:p-12 shimmer`}>
      {/* Mobile Logo */}
      <div className="flex items-center justify-center mb-8 lg:hidden">
        <div className={`w-16 h-16 flex items-center justify-center`}>
          <img
            src={`${import.meta.env.BASE_URL}kingsley-logo.png`}
            alt="Kingsley Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      
      <div className="space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className={`text-2xl sm:text-3xl font-clash font-light mb-3 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.login.title}</h2>
          <p className={`font-clash font-light ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t.login.subtitle}</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              placeholder={t.login.emailPlaceholder}
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
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                theme === 'dark' 
                  ? 'parchment-input' 
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
            
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className={`text-sm transition-colors font-clash font-light ${
                  theme === 'dark' 
                    ? 'text-slate-400 hover:text-slate-300' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.login.forgotPassword}
              </Link>
            </div>
          </div>
        
          <button 
            type="submit" 
            className="executive-button w-full text-white py-3.5 sm:py-4 rounded-2xl font-clash font-medium shimmer" 
            disabled={isLoading}
          >
            {isLoading ? t.login.submitting : t.login.submitButton}
          </button>
        </form>
        
        <div className="text-center">
          <p className={`text-sm font-clash font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.login.newUser}
            <Link
              to="/register"
              className={`font-clash font-medium ml-1 transition-colors ${
                theme === 'dark'
                  ? 'text-slate-200 hover:text-slate-100'
                  : 'text-slate-800 hover:text-slate-600'
              }`}
            >
              {t.login.createAccount}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
