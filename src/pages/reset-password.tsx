import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const type = hashParams.get('type');
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;
      if (type === 'recovery' || !!session) {
        setSessionReady(true);
      }
    };

    void checkRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t.resetPassword.toasts.mismatch,
        description: t.resetPassword.toasts.mismatchDesc,
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: t.resetPassword.toasts.tooShort,
        description: t.resetPassword.toasts.tooShortDesc,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: t.resetPassword.toasts.success,
        description: t.resetPassword.toasts.successDesc,
        variant: 'success',
      });
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast({
        title: t.resetPassword.toasts.failed,
        description: error.message || t.resetPassword.toasts.failedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${isDark ? 'premium-shadow dark-form-bg' : 'premium-shadow bg-white'} rounded-3xl p-6 sm:p-10 lg:p-12 shimmer`}>
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
            {t.resetPassword.title}
          </h2>
          <p className={`font-clash font-light ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {t.resetPassword.subtitle}
          </p>
        </div>

        {!sessionReady ? (
          <div className={`text-center p-6 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-amber-50'}`}>
            <p className={`font-clash text-sm ${isDark ? 'text-slate-400' : 'text-amber-700'}`}>
              {t.resetPassword.verifying}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input
                type="password"
                placeholder={t.resetPassword.newPasswordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                  isDark
                    ? 'parchment-input'
                    : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
              />
              <input
                type="password"
                placeholder={t.resetPassword.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl focus:outline-none font-clash font-light ${
                  isDark
                    ? 'parchment-input'
                    : 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
              />
              <p className={`text-xs font-clash font-light ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {t.resetPassword.hint}
              </p>
            </div>

            <button
              type="submit"
              className="executive-button w-full text-white py-3.5 sm:py-4 rounded-2xl font-clash font-medium shimmer"
              disabled={isLoading}
            >
              {isLoading ? t.resetPassword.submitting : t.resetPassword.submitButton}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
