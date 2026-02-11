import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
      toast({
        title: t.forgotPassword.toasts.sent,
        description: t.forgotPassword.toasts.sentDesc,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t.forgotPassword.toasts.failed,
        description: error.message || t.forgotPassword.toasts.failedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${isDark ? 'premium-shadow dark-form-bg' : 'premium-shadow bg-white'} rounded-3xl p-6 sm:p-10 lg:p-12 shimmer relative`}>
      {/* Theme Toggle (top-left) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-10">
        <ThemeToggle />
      </div>

      {/* Language Switcher (top-right) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-10">
        <LanguageToggle />
      </div>

      <div className="flex items-center justify-center mb-8 lg:hidden">
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src={`${import.meta.env.BASE_URL}kingsley-logo.png`}
            alt="Kingsley Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className={`text-2xl sm:text-3xl font-clash font-light mb-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {t.forgotPassword.title}
          </h2>
          <p className={`font-clash font-light ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {sent ? t.forgotPassword.sentMessage : t.forgotPassword.subtitle}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="email"
              placeholder={t.forgotPassword.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                isDark
                  ? 'parchment-input'
                  : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />

            <button
              type="submit"
              className="executive-button w-full text-white py-3.5 sm:py-4 rounded-2xl font-clash font-medium shimmer"
              disabled={isLoading}
            >
              {isLoading ? t.forgotPassword.submitting : t.forgotPassword.submitButton}
            </button>
          </form>
        ) : (
          <div className={`text-center p-6 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-blue-50'}`}>
            <svg className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <p className={`font-clash ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {t.forgotPassword.checkEmail}
            </p>
          </div>
        )}

        <div className="text-center">
          <Link
            to="/login"
            className={`text-sm font-clash font-medium transition-colors ${
              isDark ? 'text-slate-300 hover:text-slate-100' : 'text-slate-700 hover:text-slate-500'
            }`}
          >
            {t.forgotPassword.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
