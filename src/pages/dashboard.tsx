import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Case } from '@/types/case';
import { getUserCases } from '@/lib/supabase';

// Simple date formatter
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

// Simple AI Setup Banner component
const AISetupBanner = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-clash font-medium text-blue-900">Configuration IA recommandée</h3>
          <p className="text-xs text-blue-700">Optimisez votre expérience en configurant vos préférences d'assistance juridique.</p>
        </div>
        <button className="text-xs text-blue-600 hover:text-blue-800 font-clash font-medium">Configurer</button>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const cases = await getUserCases();
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
        setRecentCases([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, [user]);

  return (
          <main className="p-4 sm:p-6">
            {/* AI Setup Banner */}
            <AISetupBanner />
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`${theme === 'dark' ? 'dark-stat-card' : 'stat-card'} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Dossiers actifs</p>
                    <p className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mt-1`}>{recentCases.filter(c => c.status === 'active').length || 12}</p>
                  </div>
                  <div className={`w-12 h-12 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                  </div>
                </div>
                <div className={`mt-4 flex items-center text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                  </svg>
                  +2 ce mois
                </div>
              </div>
              
              <div className={`${theme === 'dark' ? 'dark-stat-card' : 'stat-card'} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Consultations</p>
                    <p className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mt-1`}>{recentCases.reduce((total, c) => total + c.messages.length, 0) || 89}</p>
                  </div>
                  <div className={`w-12 h-12 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div className={`mt-4 flex items-center text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                  </svg>
                  +15 cette semaine
                </div>
              </div>
              
              <div className={`${theme === 'dark' ? 'dark-stat-card' : 'stat-card'} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Crédits restants</p>
                    <p className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mt-1`}>{user?.isGuest ? (user?.profile?.credits_remaining || 10) : 'Illimité'}</p>
                  </div>
                  <div className={`w-12 h-12 ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  </div>
                </div>
                <div className={`mt-4 flex items-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  <span>{user?.isGuest ? 'Plan Gratuit' : 'Plan Gratuit'}</span>
                </div>
              </div>
              
              <div className={`${theme === 'dark' ? 'dark-stat-card' : 'stat-card'} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Statut</p>
                    <p className={`text-3xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mt-1`}>Actif</p>
                  </div>
                  <div className={`w-12 h-12 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div className={`mt-4 flex items-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  <span>Renouvellement le 15/08</span>
                </div>
              </div>
            </div>

            {/* Recent Cases */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Dossiers récents</h2>
                <button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-4 py-2 rounded-xl font-clash font-medium text-sm`}>
                  Nouveau dossier
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4 h-24 animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
                  ))
                ) : recentCases.length > 0 ? (
                  recentCases.slice(0, 3).map((caseItem) => (
                    <div key={caseItem.id} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>{caseItem.title}</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>{caseItem.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${
                          caseItem.status === 'active' ? 
                            (theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                          caseItem.status === 'pending' ? 
                            (theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                            (theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700')
                        }`}>
                          {caseItem.status === 'active' ? 'En cours' : 
                           caseItem.status === 'pending' ? 'Révision' : 'Terminé'}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>Créé le {formatDate(caseItem.createdAt)}</span>
                        <span>{caseItem.messages.length} messages</span>
                      </div>
                    </div>
                  ))
                ) : (
                  // Static mockup cases when no real cases exist
                  <>
                    <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>Contrat de bail commercial</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>Révision des clauses de résiliation</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>En cours</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>Créé le 10 juillet</span>
                        <span>5 messages</span>
                      </div>
                    </div>
                    
                    <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>Succession familiale</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>Répartition des biens immobiliers</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>Révision</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>Créé le 8 juillet</span>
                        <span>12 messages</span>
                      </div>
                    </div>
                    
                    <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>Litige commercial</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>Rupture de contrat fournisseur</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>Terminé</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>Créé le 5 juillet</span>
                        <span>8 messages</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </main>
  );
}