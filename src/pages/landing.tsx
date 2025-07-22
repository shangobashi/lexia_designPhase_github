import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle, FileText, Briefcase, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/theme-context';

export default function LandingPage() {
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleGuestAccess = () => {
    continueAsGuest();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen sophisticated-bg dark:dark-bg">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 light-header dark:dark-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-700 dark:bg-slate-200 rounded-lg flex items-center justify-center logo-animation">
                <img src={`${import.meta.env.BASE_URL}owl-logo.png`} alt="LexiA Logo" className="h-6 w-6 object-contain" />
              </div>
              <span className="text-xl font-light text-slate-800 dark:text-slate-100">LexiA</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 font-medium transition-colors">Fonctionnalités</a>
              <a href="#" className="text-gray-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 font-medium transition-colors">Tarifs</a>
              <Link to="/login" className="text-gray-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 font-medium transition-colors">Connexion</Link>
              <ThemeToggle />
              <button className="primary-button dark:dark-primary-button text-white px-6 py-2 rounded-xl font-medium" onClick={handleGuestAccess}>
                Commencer
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 light-sophisticated-bg light-book-flow dark:dark-sophisticated-bg dark:dark-book-flow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-6xl font-extralight tracking-tight mb-8 text-slate-800 dark:text-slate-100">
              Intelligence juridique
              <span className="block font-light text-gray-600 dark:text-slate-300">avancée</span>
            </h1>
            <p className="text-xl font-light text-gray-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Assistant IA spécialisé en droit belge. Consultation juridique instantanée, 
              rédaction de documents et gestion de dossiers professionnelle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                className="light-cta-primary dark:dark-cta-primary text-white px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden"
                onClick={handleGuestAccess}
              >
                <span className="relative z-10">Essayer gratuitement</span>
              </button>
              <button className="light-cta-secondary dark:dark-cta-secondary text-gray-700 dark:text-slate-200 px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden">
                <span className="relative z-10">Voir les prix</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-6">10 questions gratuites • Sans engagement</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 light-sophisticated-bg light-book-flow dark:dark-sophisticated-bg dark:dark-book-flow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center executive-card dark:dark-executive-card p-8 rounded-2xl">
              <div className="text-4xl font-light text-slate-800 dark:text-slate-100 mb-2">500+</div>
              <div className="text-gray-600 dark:text-slate-300 font-medium">Utilisateurs actifs</div>
            </div>
            <div className="text-center executive-card dark:dark-executive-card p-8 rounded-2xl">
              <div className="text-4xl font-light text-slate-800 dark:text-slate-100 mb-2">10k+</div>
              <div className="text-gray-600 dark:text-slate-300 font-medium">Questions traitées</div>
            </div>
            <div className="text-center executive-card dark:dark-executive-card p-8 rounded-2xl">
              <div className="text-4xl font-light text-slate-800 dark:text-slate-100 mb-2">&lt;30s</div>
              <div className="text-gray-600 dark:text-slate-300 font-medium">Temps de réponse</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 light-sophisticated-bg light-book-flow dark:dark-sophisticated-bg dark:dark-book-flow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-slate-800 dark:text-slate-100 mb-6">Fonctionnalités avancées</h2>
            <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Une suite complète d'outils juridiques alimentés par l'intelligence artificielle
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="executive-card dark:dark-executive-card p-8 rounded-2xl">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-600/30 rounded-xl flex items-center justify-center mb-6">
                <HelpCircle className="w-6 h-6 text-gray-600 dark:text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Consultation juridique</h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Réponses instantanées à vos questions juridiques basées sur le droit belge. 
                Analyse contextuelle et recommandations personnalisées.
              </p>
            </div>
            
            <div className="executive-card dark:dark-executive-card p-8 rounded-2xl">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-600/30 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-gray-600 dark:text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Génération de documents</h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Création automatique de contrats, mises en demeure, et autres documents 
                juridiques conformes à la législation belge.
              </p>
            </div>
            
            <div className="executive-card dark:dark-executive-card p-8 rounded-2xl">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-600/30 rounded-xl flex items-center justify-center mb-6">
                <Briefcase className="w-6 h-6 text-gray-600 dark:text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Gestion de dossiers</h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Organisation centralisée de vos affaires juridiques. Suivi des échéances, 
                historique des consultations et collaboration d'équipe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 light-sophisticated-bg light-book-flow dark:dark-sophisticated-bg dark:dark-book-flow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="executive-card dark:dark-executive-card p-12 rounded-3xl">
            <h2 className="text-4xl font-light text-slate-800 dark:text-slate-100 mb-6">
              Prêt à moderniser votre pratique juridique ?
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Rejoignez les professionnels du droit qui font confiance à LexiA pour 
              optimiser leur travail quotidien.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                className="light-cta-primary dark:dark-cta-primary text-white px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden"
                onClick={handleGuestAccess}
              >
                <span className="relative z-10">Commencer l'essai gratuit</span>
              </button>
              <button className="light-cta-secondary dark:dark-cta-secondary text-gray-700 dark:text-slate-200 px-8 py-4 rounded-2xl font-medium text-lg relative overflow-hidden">
                <span className="relative z-10">Voir les prix</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 light-footer dark:dark-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gray-700 dark:bg-slate-200 rounded-md flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}owl-logo.png`} alt="LexiA Logo" className="h-4 w-4 object-contain" />
              </div>
              <span className="text-lg font-light text-slate-800 dark:text-slate-100">LexiA</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-600 dark:text-slate-300">
              <a href="#" className="hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Conditions</a>
              <a href="#" className="hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}