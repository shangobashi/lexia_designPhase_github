import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, SortAsc, MoreHorizontal, FileText, MessageSquare, Clock, Calendar } from 'lucide-react';
import { getUserCases, deleteCase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';

// Types for compatibility with existing components
type CaseStatus = 'active' | 'pending' | 'closed';

interface Case {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  messages: any[];
  documents: any[];
  userId: string;
}

type SortOption = 'newest' | 'oldest' | 'title' | 'status';

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const CASES_PER_PAGE = 6;

  // Helper function to convert DB data to component format
  const convertDbCasesToCases = (dbCases: any[]): Case[] => {
    return dbCases.map((dbCase: any) => ({
      id: dbCase.id,
      caseId: dbCase.case_id,
      title: dbCase.title,
      description: dbCase.description,
      status: dbCase.status,
      createdAt: dbCase.created_at,
      updatedAt: dbCase.updated_at,
      messages: dbCase.messages || [],
      documents: dbCase.documents || [],
      userId: dbCase.user_id,
    }));
  };
  
  useEffect(() => {
    if (!authLoading && user) {
      if (user.isGuest) {
        // For guests, show a virtual demo case
        const demoCase: Case = {
          id: 'demo',
          caseId: 'DEMO-001',
          title: 'Consultation Juridique (Mode Invité)',
          description: 'Posez vos questions juridiques à LexiA. Vous avez 10 questions gratuites.',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
          documents: [],
          userId: 'guest-user'
        };
        setCases([demoCase]);
        setIsLoading(false);
      } else {
        // For authenticated users, fetch real cases
        const fetchCases = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const dbCases = await getUserCases();
            const convertedCases = convertDbCasesToCases(dbCases);
            setCases(convertedCases);
          } catch (error) {
            console.error('Error fetching cases', error);
            setError('Failed to load cases. Please try again.');
          } finally {
            setIsLoading(false);
          }
        };

        fetchCases();
      }
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);
  
  // Advanced filtering and sorting with memoization for performance
  const filteredAndSortedCases = useMemo(() => {
    let filtered = cases;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          c.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          c.caseId.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [cases, debouncedSearchTerm, statusFilter, sortBy]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCases.length / CASES_PER_PAGE);
  const paginatedCases = useMemo(() => {
    const startIndex = (currentPage - 1) * CASES_PER_PAGE;
    return filteredAndSortedCases.slice(startIndex, startIndex + CASES_PER_PAGE);
  }, [filteredAndSortedCases, currentPage, CASES_PER_PAGE]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, sortBy]);
  
  // Case management functions
  const handleDeleteCase = useCallback(async (caseId: string) => {
    try {
      await deleteCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
    } catch (error) {
      console.error('Error deleting case:', error);
      setError('Failed to delete case. Please try again.');
    }
  }, []);
  
  const handleBulkDelete = useCallback(async () => {
    try {
      // Delete cases one by one (could be optimized with a bulk delete API)
      await Promise.all(selectedCases.map(caseId => deleteCase(caseId)));
      setCases(prev => prev.filter(c => !selectedCases.includes(c.id)));
      setSelectedCases([]);
    } catch (error) {
      console.error('Error deleting cases:', error);
      setError('Failed to delete cases. Please try again.');
    }
  }, [selectedCases]);
  
  const toggleCaseSelection = useCallback((caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  }, []);
  
  // Show loading state during authentication
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground">Gérez et organisez tous vos dossiers juridiques</p>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show authentication required
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground">Gérez et organisez tous vos dossiers juridiques</p>
        </div>
        <Card>
          <CardContent className="flex items-center space-x-2 pt-6">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm">Veuillez vous connecter pour voir vos dossiers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground">Gérez et organisez tous vos dossiers juridiques</p>
        </div>
        <Card>
          <CardContent className="flex items-center space-x-2 pt-6">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 sophisticated-bg dark:dark-bg min-h-screen">
      {/* Header */}
      <header className="bg-white/80 dark:dark-header backdrop-blur-md border-b border-gray-200/50 dark:border-slate-600/30 px-6 py-4 mb-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100">Gestion des dossiers</h1>
            <p className="text-gray-600 dark:text-slate-300">Organisez et suivez vos affaires juridiques</p>
          </div>
          <div className="flex items-center space-x-4">
            {selectedCases.length > 0 && (
              <button 
                className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium transition-colors"
                onClick={handleBulkDelete}
              >
                Supprimer ({selectedCases.length})
              </button>
            )}
            <button className="primary-button dark:dark-primary-button text-white px-4 py-2 rounded-xl font-medium">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              {user?.isGuest ? "Commencer la consultation" : "Nouveau dossier"}
            </button>
          </div>
        </div>
      </header>
      
      {/* Filters and Search */}
      <div className="executive-card dark:dark-executive-card p-4 rounded-xl mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Rechercher par titre, description ou mots-clés..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:dark-input rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white/90 dark:bg-slate-700/50"
              />
              <svg className="w-4 h-4 text-gray-400 dark:text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`filter-button dark:dark-filter-button px-4 py-2 rounded-lg text-sm font-medium ${
                statusFilter === 'all' ? 'active text-gray-700 dark:text-slate-200' : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              Tous
            </button>
            <button 
              onClick={() => setStatusFilter('active')}
              className={`filter-button dark:dark-filter-button px-4 py-2 rounded-lg text-sm font-medium ${
                statusFilter === 'active' ? 'active text-gray-700 dark:text-slate-200' : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              En cours
            </button>
            <button 
              onClick={() => setStatusFilter('closed')}
              className={`filter-button dark:dark-filter-button px-4 py-2 rounded-lg text-sm font-medium ${
                statusFilter === 'closed' ? 'active text-gray-700 dark:text-slate-200' : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              Terminés
            </button>
            <button 
              onClick={() => setStatusFilter('pending')}
              className={`filter-button dark:dark-filter-button px-4 py-2 rounded-lg text-sm font-medium ${
                statusFilter === 'pending' ? 'active text-gray-700 dark:text-slate-200' : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              Archivés
            </button>
          </div>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border border-gray-300 dark:dark-input rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-slate-200 bg-white/90 dark:bg-slate-700/50"
          >
            <option value="newest">Trier par date</option>
            <option value="title">Trier par titre</option>
            <option value="status">Trier par statut</option>
          </select>
        </div>
      </div>
      
      {/* Cases Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(CASES_PER_PAGE)].map((_, i) => (
            <div key={i} className="case-card dark:dark-case-card rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : paginatedCases.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCases.map((caseItem, index) => (
              <Link 
                key={caseItem.id} 
                to={`/cases/${caseItem.id}`}
                className="case-card dark:dark-case-card rounded-xl p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg mb-2">{caseItem.title}</h3>
                    <p className="text-gray-600 dark:text-slate-300 text-sm mb-3">{caseItem.description}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ml-2 ${
                    caseItem.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                    caseItem.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                    caseItem.status === 'closed' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                    'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                  }`}>
                    {caseItem.status === 'active' ? 'En cours' :
                     caseItem.status === 'pending' ? 'Attente' :
                     caseItem.status === 'closed' ? 'Terminé' : 'Archivé'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 mb-4">
                  <span>Créé le {formatDate(caseItem.createdAt)}</span>
                  <span>{caseItem.documents.length} documents</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-slate-400">{caseItem.messages.length} messages</span>
                  </div>
                  <button className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 2L3 6l3 4M18 2l3 4-3 4"/>
                    </svg>
                  </button>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg ${
                        currentPage === pageNum 
                          ? 'bg-gray-700 dark:bg-slate-600 text-white' 
                          : 'text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700/30 transition-colors'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="executive-card dark:dark-executive-card rounded-2xl p-12 text-center">
          {debouncedSearchTerm || statusFilter !== 'all' ? (
            <>
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg mb-2">Aucun résultat</h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Aucun dossier ne correspond à vos critères de recherche
              </p>
              <div className="flex justify-center gap-3">
                {debouncedSearchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    Effacer la recherche
                  </button>
                )}
                {statusFilter !== 'all' && (
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    Tous les statuts
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg mb-2">Aucun dossier</h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Créez votre premier dossier pour commencer avec LexiA
              </p>
              <button className="primary-button dark:dark-primary-button text-white px-6 py-3 rounded-xl font-medium">
                {user?.isGuest ? "Commencer la consultation" : "Créer un dossier"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}