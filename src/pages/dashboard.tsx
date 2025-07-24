import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, MessageSquare, CreditCard, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [recentCases, setRecentCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      setRecentCases([
        { id: 1, title: 'Contrat de bail commercial', description: 'Révision des clauses de résiliation', status: 'En cours', createdAt: '10 juillet', messages: 5 },
        { id: 2, title: 'Succession familiale', description: 'Répartition des biens immobiliers', status: 'Révision', createdAt: '8 juillet', messages: 12 },
        { id: 3, title: 'Litige commercial', description: 'Rupture de contrat fournisseur', status: 'Terminé', createdAt: '5 juillet', messages: 8 },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

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
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.displayName || 'Jean Dupont'}</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Premium</span>
          </div>
        </header>

        <p className="mb-8">Bonjour {user?.displayName || 'Jean'}, voici un aperçu de votre activité</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <CardContent className="p-6">
              <Briefcase className="w-8 h-8 mb-4" />
              <h3 className="text-4xl font-bold mb-2">12</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">+2 ce mois</p>
              <p>Dossiers actifs</p>
            </CardContent>
          </Card>
          <Card className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <CardContent className="p-6">
              <MessageSquare className="w-8 h-8 mb-4" />
              <h3 className="text-4xl font-bold mb-2">89</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">+15 cette semaine</p>
              <p>Consultations</p>
            </CardContent>
          </Card>
          <Card className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <CardContent className="p-6">
              <CreditCard className="w-8 h-8 mb-4" />
              <h3 className="text-4xl font-bold mb-2">Illimité</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan Premium</p>
              <p>Crédits restants</p>
            </CardContent>
          </Card>
          <Card className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'}`}>
            <CardContent className="p-6">
              <Zap className="w-8 h-8 mb-4" />
              <h3 className="text-4xl font-bold mb-2">Actif</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Renouvellement le 15/08</p>
              <p>Statut</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mb-6">Dossiers récents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
          ) : (
            recentCases.map((caseItem) => (
              <Card key={caseItem.id} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'}`}>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-2">{caseItem.title}</h3>
                  <p className="text-sm mb-1">Description: {caseItem.description}</p>
                  <p className="text-sm mb-1">Statut: {caseItem.status}</p>
                  <p className="text-sm mb-1">Créé le: {caseItem.createdAt}</p>
                  <p className="text-sm">Messages: {caseItem.messages}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
