import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const { user, login, googleLogin, continueAsGuest } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isDark = theme === 'dark';
  
  // Get the return path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  if (user && !user.isGuest) {
    return <Navigate to="/dashboard" replace />;
  }

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
    } catch (error: any) {
      toast({
        title: t.login.toasts.googleFailed,
        description: error.message || t.login.toasts.retryLater,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className={`w-full login-form-shell ${isDark ? 'premium-shadow dark-form-bg' : 'premium-shadow bg-white'} rounded-3xl p-6 sm:p-10 lg:p-12 shimmer relative`}>
      {/* Theme Toggle (top-left) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-10">
        <ThemeToggle />
      </div>

      {/* Language Switcher (top-right) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-10">
        <LanguageToggle />
      </div>

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
          <h2 className={`text-2xl sm:text-3xl font-clash font-light mb-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.login.title}</h2>
          <p className={`font-clash font-light ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t.login.subtitle}</p>
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
                isDark 
                  ? 'parchment-input' 
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              } login-field`}
            />
            
            <input
              type="password"
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                isDark 
                  ? 'parchment-input' 
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              } login-field`}
            />
            
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className={`text-sm transition-colors font-clash font-light ${
                  isDark 
                    ? 'text-slate-400 hover:text-slate-300' 
                    : 'text-gray-500 hover:text-gray-700'
                } login-inline-link`}
              >
                {t.login.forgotPassword}
              </Link>
            </div>
          </div>
        
          <button 
            type="submit" 
            className="executive-button login-primary-action w-full text-white py-3.5 sm:py-4 rounded-2xl font-clash font-medium shimmer" 
            disabled={isLoading}
          >
            {isLoading ? t.login.submitting : t.login.submitButton}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            <span className={`text-xs font-clash ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {t.login.orContinueWith}
            </span>
            <div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 rounded-2xl font-clash font-medium transition-all duration-200 ${
              isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
            } login-secondary-action disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t.login.continueWithGoogle}
          </button>

          <button
            type="button"
            onClick={() => {
              continueAsGuest();
              navigate('/chat');
            }}
            className={`w-full py-3 rounded-2xl text-sm font-clash transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } login-ghost-action`}
          >
            {t.login.continueAsGuest}
          </button>
        </div>
        
        <div className="text-center">
          <p className={`text-sm font-clash font-light ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.login.newUser}
            <Link
              to="/register"
              className={`font-clash font-medium ml-1 transition-colors ${
                isDark
                  ? 'text-slate-200 hover:text-slate-100'
                  : 'text-slate-800 hover:text-slate-600'
              } login-inline-link`}
            >
              {t.login.createAccount}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
