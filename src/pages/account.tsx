import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AccountPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} flex`}>
      <nav className={`${theme === 'dark' ? 'dark-sidebar' : 'sidebar'}`}>
        <div className="mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg mb-2"></div>
          <h1 className="text-2xl font-bold">LexiA</h1>
        </div>
        <ul className="space-y-4">
          <li><Link to="/dashboard" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tableau de bord</Link></li>
          <li><Link to="/cases" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Dossiers</Link></li>
          <li><Link to="/chat" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Consultation IA</Link></li>
          <li><Link to="/account" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Compte</Link></li>
          <li><Link to="/billing" className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Facturation</Link></li>
        </ul>
      </nav>

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Compte</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.displayName || 'Jean Dupont'}</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Premium</span>
          </div>
        </header>

        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} mb-8 p-6`}>
          <h2 className="text-2xl font-bold mb-4">Informations personnelles</h2>
          <p className="mb-2">{user?.displayName || 'Jean Dupont'}</p>
          <p className="mb-2">Email: {user?.email || 'jean.dupont@example.com'}</p>
          <p className="mb-2">Téléphone: +32 2 123 45 67</p>
          <p className="mb-4">Adresse: Rue de la Loi 16, 1000 Bruxelles</p>
          <Button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`}>Modifier</Button>
        </div>

        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-6`}>
          <h2 className="text-2xl font-bold mb-4">Abonnement</h2>
          <p className="mb-2">Plan: Premium</p>
          <p className="mb-2">Crédits restants: Illimité</p>
          <p className="mb-4">Date de renouvellement: 15 août 2024</p>
          <Button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'}`}>Changer de plan</Button>
        </div>
      </main>
    </div>
  );
}
