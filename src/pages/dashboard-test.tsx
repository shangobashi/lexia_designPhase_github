import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { Case } from '@/types/case';
import { getUserCases } from '@/lib/supabase';

export default function DashboardTestPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [recentCases, setRecentCases] = useState<Case[]>([]);

  useEffect(() => {
    const fetchCases = async () => {
      if (!user) return;
      try {
        const cases = await getUserCases();
        const convertedCases = cases.slice(0, 3);
        setRecentCases(convertedCases);
      } catch (error) {
        console.error('Error fetching cases', error);
        setRecentCases([]);
      }
    };

    fetchCases();
  }, [user]);

  // Simple theme wrapper - exactly like mockup structure
  const containerClass = theme === 'dark' ? 'dark-bg' : 'sophisticated-bg';
  const sidebarClass = theme === 'dark' ? 'dark-sidebar' : 'sidebar';
  const statCardClass = theme === 'dark' ? 'dark-stat-card' : 'stat-card';
  const executiveCardClass = theme === 'dark' ? 'dark-executive-card' : 'executive-card';

  return (
    <div className={`min-h-screen ${containerClass}`}>
      <div className="flex h-screen">
        {/* Sidebar - EXACT mockup structure */}
        <div className={`w-64 ${sidebarClass} fixed h-full z-40`}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">L</span>
              </div>
              <span className="text-xl font-light text-slate-800">Kingsley</span>
            </div>
            
            <nav className="space-y-2">
              <Link to="/dashboard" className="sidebar-item active flex items-center space-x-3 px-4 py-3 text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                </svg>
                <span className="font-medium">Tableau de bord</span>
              </Link>
              
              <a href="#" className="sidebar-item flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span className="font-medium">Nouveau dossier</span>
              </a>
              
              <Link to="/cases" className="sidebar-item flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <span className="font-medium">Dossiers</span>
              </Link>
              
              <a href="#" className="sidebar-item flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span className="font-medium">Documents</span>
              </a>
              
              <Link to="/billing" className="sidebar-item flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
                <span className="font-medium">Facturation</span>
              </Link>
            </nav>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{user?.isGuest ? t.common.guest : (user?.displayName || t.common.guest)}</div>
                  <div className="text-xs text-gray-500">Gratuit</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - EXACT mockup structure */}
        <div className="flex-1 ml-64">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-light text-slate-800">Tableau de bord</h1>
                <p className="text-gray-600">Bonjour {user?.displayName || 'Jean'}, voici un aperçu de votre activité</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input type="text" placeholder="Rechercher..." 
                         className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white/90" />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <button className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5z"/>
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="p-6">
            {/* Stats Cards - EXACT mockup structure */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`${statCardClass} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Dossiers actifs</p>
                    <p className="text-3xl font-light text-slate-800 mt-1">12</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                  </svg>
                  +2 ce mois
                </div>
              </div>
              
              <div className={`${statCardClass} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Consultations</p>
                    <p className="text-3xl font-light text-slate-800 mt-1">89</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                  </svg>
                  +15 cette semaine
                </div>
              </div>
              
              <div className={`${statCardClass} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Crédits restants</p>
                    <p className="text-3xl font-light text-slate-800 mt-1">Illimité</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-600">
                  <span>Plan Gratuit</span>
                </div>
              </div>
              
              <div className={`${statCardClass} rounded-xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Statut</p>
                    <p className="text-3xl font-light text-slate-800 mt-1">Actif</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-600">
                  <span>Renouvellement le 15/08</span>
                </div>
              </div>
            </div>

            {/* Recent Cases */}
            <div className={`${executiveCardClass} rounded-2xl p-6`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-light text-slate-800">Dossiers récents</h2>
                <Link to="/cases" className="text-gray-600 hover:text-slate-800 font-medium">
                  Voir tout →
                </Link>
              </div>

              {recentCases.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun dossier récent</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCases.map((caseItem) => (
                    <div key={caseItem.id} className="case-card rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">{caseItem.title}</h3>
                          <p className="text-sm text-gray-600">{caseItem.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          caseItem.status === 'active' ? 'bg-green-100 text-green-800' :
                          caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {caseItem.status}
                        </span>
                        <Link to={`/cases/${caseItem.id}`} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}