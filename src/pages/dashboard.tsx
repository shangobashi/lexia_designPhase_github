import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, FileText, MessageSquare, CreditCard, Calendar, BarChart3, Clock, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import CaseCard from '@/components/cases/case-card';
import { AISetupBanner } from '@/components/ai-setup-banner';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Case } from '@/types/case';
import { getUserCases } from '@/lib/supabase';

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const cases = await getUserCases();
        // Convert to Case format and get 3 most recent
        const convertedCases = cases.map(dbCase => ({
          id: dbCase.id,
          caseId: dbCase.case_id,
          title: dbCase.title,
          description: dbCase.description,
          status: dbCase.status as 'active' | 'pending' | 'closed',
          createdAt: dbCase.created_at,
          updatedAt: dbCase.updated_at,
          messages: Array.isArray(dbCase.messages) ? dbCase.messages : [],
          documents: Array.isArray(dbCase.documents) ? dbCase.documents : [],
          userId: dbCase.user_id
        })).slice(0, 3);
        
        setRecentCases(convertedCases);
      } catch (error) {
        console.error('Error fetching cases', error);
        // If no cases exist yet, that's fine - show empty state
        setRecentCases([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, [user]);
  
  return (
    <div className="p-6 sophisticated-bg dark:dark-sophisticated-bg min-h-screen">
      {/* AI Setup Banner */}
      <AISetupBanner />
      
      {/* Welcome Header */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-2">
              Bonjour, {user?.displayName || 'Jean Dupont'}
            </h1>
            <p className="text-gray-600 dark:text-slate-300 text-lg font-light">
              Voici un aperçu de votre activité juridique aujourd'hui
            </p>
          </div>
          <button className="primary-button dark:dark-primary-button text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Nouveau dossier</span>
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="stat-card dark:dark-stat-card executive-card dark:dark-executive-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">
            {recentCases.filter(c => c.status === 'active').length}
          </div>
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium">
            {user?.isGuest ? 'Mode invité' : 'Dossiers actifs'}
          </div>
        </div>
        
        <div className="stat-card dark:dark-stat-card executive-card dark:dark-executive-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">
            {recentCases.reduce((total, c) => total + c.messages.length, 0)}
          </div>
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium">
            {user?.isGuest ? 'Questions posées' : 'Consultations'}
          </div>
        </div>
        
        <div className="stat-card dark:dark-stat-card executive-card dark:dark-executive-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">
            {user?.profile?.credits_remaining || 10}
          </div>
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium">
            {user?.isGuest ? 'Questions restantes' : 'Crédits restants'}
          </div>
        </div>
        
        <div className="stat-card dark:dark-stat-card executive-card dark:dark-executive-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-1">
            &lt;30s
          </div>
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium">
            Temps de réponse
          </div>
        </div>
      </div>
      
      {/* Recent Cases Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="executive-card dark:dark-executive-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Dossiers récents</h3>
            <Link 
              to="/cases" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Voir tout
            </Link>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="case-card dark:dark-case-card rounded-xl p-4 h-24 animate-pulse bg-gray-100 dark:bg-slate-700/30" />
              ))}
            </div>
          ) : recentCases.length > 0 ? (
            <div className="space-y-4">
              {recentCases.map((caseItem, index) => (
                <div key={caseItem.id} className="case-card dark:dark-case-card rounded-xl p-4 border border-gray-200/50 dark:border-slate-600/30 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-1">{caseItem.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mb-2 line-clamp-2">{caseItem.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-400">
                        <span>#{caseItem.caseId}</span>
                        <span>•</span>
                        <span>{formatDate(caseItem.updatedAt)}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      caseItem.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {caseItem.status === 'active' ? 'Actif' : 
                       caseItem.status === 'pending' ? 'En attente' : 'Fermé'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400 dark:text-slate-500" />
              </div>
              <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-2">Aucun dossier</h4>
              <p className="text-gray-600 dark:text-slate-300 text-sm mb-4">Créez votre premier dossier pour commencer</p>
              <button className="primary-button dark:dark-primary-button text-white px-4 py-2 rounded-xl font-medium text-sm">
                Créer un dossier
              </button>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="executive-card dark:dark-executive-card rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Activité récente</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">Nouveau dossier créé</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">Il y a 2 heures</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">Consultation IA terminée</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">Il y a 4 heures</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">Document généré</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">Hier à 16:30</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">Dossier mis à jour</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">Hier à 14:15</p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link 
              to="/cases" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Voir toute l'activité
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}