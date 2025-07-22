import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Theme Toggle - Fixed positioned in top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Left Side - Branding with Flat Blue */}
      <div className="hidden lg:flex lg:w-1/2 flat-blue-bg flex-col items-center justify-center p-8 text-white">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8 inline-flex p-4 bg-white/20 rounded-full">
            <img src={`${import.meta.env.BASE_URL}owl-logo.png`} alt="LexiA Logo" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">LexiA</h1>
          <p className="text-xl text-blue-100 mb-6">
            Votre assistant juridique IA spécialisé dans le droit belge
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white mt-0.5">✓</div>
              <div>
                <h3 className="font-medium text-white">Conseils juridiques d'expert</h3>
                <p className="text-sm text-blue-100">Obtenez des conseils professionnels sur le droit belge à une fraction du coût</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white mt-0.5">✓</div>
              <div>
                <h3 className="font-medium text-white">Génération de documents</h3>
                <p className="text-sm text-blue-100">Créez des documents juridiques instantanément selon vos besoins spécifiques</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white mt-0.5">✓</div>
              <div>
                <h3 className="font-medium text-white">Gestion sécurisée des dossiers</h3>
                <p className="text-sm text-blue-100">Gardez toutes vos affaires juridiques organisées sur une plateforme sécurisée</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 bg-card">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}