import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scale, Mail, Lock, Github, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, googleLogin, microsoftLogin, continueAsGuest } = useAuth();
  const { toast } = useToast();
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
        title: "Connexion réussie",
        description: "Heureux de vous revoir sur LexiA",
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Échec de la connexion",
        description: error.message || "Veuillez vérifier vos identifiants et réessayer",
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
        title: "Connexion réussie",
        description: "Heureux de vous revoir sur LexiA",
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Échec de la connexion Google",
        description: error.message || "Veuillez réessayer plus tard",
        variant: "destructive",
      });
    }
  };
  
  const handleMicrosoftLogin = async () => {
    try {
      await microsoftLogin();
      toast({
        title: "Connexion réussie",
        description: "Heureux de vous revoir sur LexiA",
        variant: "success",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Échec de la connexion Microsoft",
        description: error.message || "Veuillez réessayer plus tard",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile Logo (visible on smaller screens) */}
      <div className="flex flex-col items-center mb-8 lg:hidden">
        <div className="w-16 h-16 bg-gray-700 dark:bg-slate-200 rounded-2xl flex items-center justify-center mb-4 logo-animation">
          <img src={`${import.meta.env.BASE_URL}owl-logo.png`} alt="LexiA Logo" className="h-10 w-10 object-contain" />
        </div>
        <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100">LexiA</h1>
        <p className="text-gray-600 dark:text-slate-300 text-sm">Votre assistant juridique IA</p>
      </div>
      
      <div className="executive-card dark:dark-executive-card rounded-2xl p-8">
        <div className="space-y-6 text-center mb-8">
          <h2 className="text-3xl font-light text-slate-800 dark:text-slate-100">Bienvenue</h2>
          <p className="text-gray-600 dark:text-slate-300">Saisissez vos identifiants pour accéder à votre compte</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-400" />
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-400" />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none"
              />
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>
          </div>
          
          <button type="submit" className="w-full primary-button dark:dark-primary-button text-white py-3 rounded-xl font-medium transition-all" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion en cours...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="h-5 w-5 mr-2" />
                Se connecter
              </span>
            )}
          </button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-slate-600/30"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-700 px-3 text-gray-500 dark:text-slate-400">Ou continuer avec</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button onClick={handleGoogleLogin} className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-gray-700 dark:text-slate-300">Google</span>
          </button>
          
          <button onClick={handleMicrosoftLogin} className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2">
              <path d="M0 0h11.5v11.5H0z" fill="#F25022" />
              <path d="M12.5 0H24v11.5H12.5z" fill="#7FBA00" />
              <path d="M0 12.5h11.5V24H0z" fill="#00A4EF" />
              <path d="M12.5 12.5H24V24H12.5z" fill="#FFB900" />
            </svg>
            <span className="text-gray-700 dark:text-slate-300">Microsoft</span>
          </button>
        </div>
        
        {/* Guest Access */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-slate-600/30"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-700 px-3 text-gray-500 dark:text-slate-400">Ou essayer gratuitement</span>
          </div>
        </div>
        
        <button 
          onClick={() => {
            continueAsGuest();
            navigate(from, { replace: true });
          }}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <LogIn className="h-5 w-5 mr-2 text-gray-600 dark:text-slate-300" />
          <span className="text-gray-700 dark:text-slate-300">Continuer en tant qu'invité (10 questions gratuites)</span>
        </button>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}