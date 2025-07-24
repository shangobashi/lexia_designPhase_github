import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle, FileText, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context'; // Ensure this import exists
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/theme-context';

export default function LandingPage() {
  const { continueAsGuest } = useAuth(); // Corrected syntax
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleGuestAccess = () => {
    continueAsGuest();
    navigate('/dashboard');
  };

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'}`}>
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <h1 className="text-2xl font-bold">LexiA</h1>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link to="/login">
            <Button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`}>Se connecter</Button>
          </Link>
        </div>
      </header>

      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Intelligence juridique avancée</h1>
        <p className="text-xl mb-6">Assistant IA spécialisé en droit belge. Consultation juridique instantanée, rédaction de documents et gestion de dossiers professionnelle.</p>
        <p className="text-lg mb-8">10 questions gratuites • Sans engagement</p>
        <Button onClick={handleGuestAccess} className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-lg px-8 py-4`}>Commencer gratuitement</Button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} text-center`}>
          <h3 className="text-4xl font-bold">500+</h3>
          <p>Utilisateurs actifs</p>
        </div>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} text-center`}>
          <h3 className="text-4xl font-bold">10k+</h3>
          <p>Questions traitées</p>
        </div>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} text-center`}>
          <h3 className="text-4xl font-bold">&lt;30s</h3>
          <p>Temps de réponse</p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Fonctionnalités avancées</h2>
        <p className="text-center mb-12">Une suite complète d'outils juridiques alimentés par l'intelligence artificielle</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <HelpCircle className="w-12 h-12 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Consultation juridique</h3>
            <p>Réponses instantanées à vos questions juridiques basées sur le droit belge. Analyse contextuelle et recommandations personnalisées.</p>
          </div>
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <FileText className="w-12 h-12 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Génération de documents</h3>
            <p>Création automatique de contrats, mises en demeure, et autres documents juridiques conformes à la législation belge.</p>
          </div>
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <Briefcase className="w-12 h-12 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Gestion de dossiers</h3>
            <p>Organisation centralisée de vos affaires juridiques. Suivi des échéances, historique des consultations et collaboration d'équipe.</p>
          </div>
        </div>
      </section>

      <section className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4">Prêt à moderniser votre pratique juridique ?</h2>
        <p className="text-xl mb-8">Rejoignez les professionnels du droit qui font confiance à LexiA pour optimiser leur travail quotidien.</p>
        <Button onClick={handleGuestAccess} className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-lg px-8 py-4`}>Commencer gratuitement</Button>
      </section>

      <footer className="text-center text-sm">
        <p>© 2024 LexiA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
