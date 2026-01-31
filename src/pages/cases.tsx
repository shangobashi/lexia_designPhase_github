import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
        // For guests, show the 18 mockup cases for demonstration
        const mockupCases: Case[] = [
          // Page 1 - Cases 1-6
          {
            id: 'mock-1',
            caseId: 'CASE-001',
            title: 'Contrat de bail commercial',
            description: 'Révision des clauses de résiliation anticipée et négociation des conditions avec le propriétaire.',
            status: 'active' as CaseStatus,
            createdAt: '2024-07-10T10:00:00.000Z',
            updatedAt: '2024-07-10T10:00:00.000Z',
            messages: new Array(12).fill(null),
            documents: new Array(5).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-2',
            caseId: 'CASE-002',
            title: 'Succession familiale',
            description: 'Répartition des biens immobiliers et mobiliers suite au décès. Gestion des droits de succession.',
            status: 'pending' as CaseStatus,
            createdAt: '2024-07-08T10:00:00.000Z',
            updatedAt: '2024-07-08T10:00:00.000Z',
            messages: new Array(24).fill(null),
            documents: new Array(8).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-3',
            caseId: 'CASE-003',
            title: 'Litige commercial',
            description: 'Rupture de contrat avec fournisseur. Réclamation de dommages et intérêts pour non-respect des délais.',
            status: 'closed' as CaseStatus,
            createdAt: '2024-07-05T10:00:00.000Z',
            updatedAt: '2024-07-05T10:00:00.000Z',
            messages: new Array(38).fill(null),
            documents: new Array(15).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-4',
            caseId: 'CASE-004',
            title: 'Création d\'entreprise',
            description: 'Rédaction des statuts de SPRL et formalités administratives. Choix de la forme juridique optimale.',
            status: 'active' as CaseStatus,
            createdAt: '2024-07-03T10:00:00.000Z',
            updatedAt: '2024-07-03T10:00:00.000Z',
            messages: new Array(7).fill(null),
            documents: new Array(6).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-5',
            caseId: 'CASE-005',
            title: 'Divorce par consentement',
            description: 'Procédure de divorce amiable avec répartition des biens et garde des enfants.',
            status: 'pending' as CaseStatus,
            createdAt: '2024-07-01T10:00:00.000Z',
            updatedAt: '2024-07-01T10:00:00.000Z',
            messages: new Array(18).fill(null),
            documents: new Array(12).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-6',
            caseId: 'CASE-006',
            title: 'Achat immobilier',
            description: 'Vérification du compromis de vente et négociation des conditions suspensives.',
            status: 'closed' as CaseStatus,
            createdAt: '2024-06-28T10:00:00.000Z',
            updatedAt: '2024-06-28T10:00:00.000Z',
            messages: new Array(14).fill(null),
            documents: new Array(9).fill(null),
            userId: 'guest-user'
          },
          // Page 2 - Cases 7-12
          {
            id: 'mock-7',
            caseId: 'CASE-007',
            title: 'Droit du travail',
            description: 'Licenciement abusif et réclamation d\'indemnités. Négociation avec l\'employeur.',
            status: 'active' as CaseStatus,
            createdAt: '2024-06-25T10:00:00.000Z',
            updatedAt: '2024-06-25T10:00:00.000Z',
            messages: new Array(22).fill(null),
            documents: new Array(11).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-8',
            caseId: 'CASE-008',
            title: 'Responsabilité civile',
            description: 'Accident de la circulation et réclamation d\'assurance. Expertise des dommages.',
            status: 'pending' as CaseStatus,
            createdAt: '2024-06-22T10:00:00.000Z',
            updatedAt: '2024-06-22T10:00:00.000Z',
            messages: new Array(16).fill(null),
            documents: new Array(7).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-9',
            caseId: 'CASE-009',
            title: 'Droit de la famille',
            description: 'Garde d\'enfants et pension alimentaire. Médiation familiale en cours.',
            status: 'active' as CaseStatus,
            createdAt: '2024-06-20T10:00:00.000Z',
            updatedAt: '2024-06-20T10:00:00.000Z',
            messages: new Array(31).fill(null),
            documents: new Array(13).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-10',
            caseId: 'CASE-010',
            title: 'Propriété intellectuelle',
            description: 'Dépôt de marque et protection des droits d\'auteur. Recherche d\'antériorité.',
            status: 'closed' as CaseStatus,
            createdAt: '2024-06-18T10:00:00.000Z',
            updatedAt: '2024-06-18T10:00:00.000Z',
            messages: new Array(9).fill(null),
            documents: new Array(4).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-11',
            caseId: 'CASE-011',
            title: 'Droit pénal',
            description: 'Défense en correctionnelle pour délit routier. Préparation de la plaidoirie.',
            status: 'active' as CaseStatus,
            createdAt: '2024-06-15T10:00:00.000Z',
            updatedAt: '2024-06-15T10:00:00.000Z',
            messages: new Array(27).fill(null),
            documents: new Array(18).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-12',
            caseId: 'CASE-012',
            title: 'Vente fonds de commerce',
            description: 'Cession d\'un restaurant avec transfert de licence. Vérification des obligations.',
            status: 'pending' as CaseStatus,
            createdAt: '2024-06-12T10:00:00.000Z',
            updatedAt: '2024-06-12T10:00:00.000Z',
            messages: new Array(19).fill(null),
            documents: new Array(14).fill(null),
            userId: 'guest-user'
          },
          // Page 3 - Cases 13-18
          {
            id: 'mock-13',
            caseId: 'CASE-013',
            title: 'Droit des assurances',
            description: 'Refus de prise en charge d\'un sinistre habitation. Contestation de l\'expertise.',
            status: 'active' as CaseStatus,
            createdAt: '2024-06-10T10:00:00.000Z',
            updatedAt: '2024-06-10T10:00:00.000Z',
            messages: new Array(13).fill(null),
            documents: new Array(8).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-14',
            caseId: 'CASE-014',
            title: 'Copropriété',
            description: 'Conflit avec le syndic et travaux non autorisés. Convocation d\'assemblée générale.',
            status: 'closed' as CaseStatus,
            createdAt: '2024-06-08T10:00:00.000Z',
            updatedAt: '2024-06-08T10:00:00.000Z',
            messages: new Array(25).fill(null),
            documents: new Array(16).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-15',
            caseId: 'CASE-015',
            title: 'Recouvrement de créances',
            description: 'Impayés clients et mise en demeure. Procédure de référé provision.',
            status: 'active' as CaseStatus,
            createdAt: '2024-06-05T10:00:00.000Z',
            updatedAt: '2024-06-05T10:00:00.000Z',
            messages: new Array(8).fill(null),
            documents: new Array(3).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-16',
            caseId: 'CASE-016',
            title: 'Tutelle et curatelle',
            description: 'Demande de mise sous protection d\'un parent âgé. Constitution du dossier médical.',
            status: 'pending' as CaseStatus,
            createdAt: '2024-06-03T10:00:00.000Z',
            updatedAt: '2024-06-03T10:00:00.000Z',
            messages: new Array(21).fill(null),
            documents: new Array(10).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-17',
            caseId: 'CASE-017',
            title: 'Médiation commerciale',
            description: 'Différend contractuel entre partenaires commerciaux. Recherche de solution amiable.',
            status: 'active' as CaseStatus,
            createdAt: '2024-06-01T10:00:00.000Z',
            updatedAt: '2024-06-01T10:00:00.000Z',
            messages: new Array(33).fill(null),
            documents: new Array(20).fill(null),
            userId: 'guest-user'
          },
          {
            id: 'mock-18',
            caseId: 'CASE-018',
            title: 'Droit de l\'urbanisme',
            description: 'Contestation d\'un permis de construire en zone protégée. Recours administratif.',
            status: 'closed' as CaseStatus,
            createdAt: '2024-05-29T10:00:00.000Z',
            updatedAt: '2024-05-29T10:00:00.000Z',
            messages: new Array(29).fill(null),
            documents: new Array(17).fill(null),
            userId: 'guest-user'
          }
        ];
        setCases(mockupCases);
        setIsLoading(false);
      } else {
        // For authenticated users, fetch real cases
        const fetchCases = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const dbCases = await getUserCases();
            const convertedCases = convertDbCasesToCases(dbCases);
            
            // If no real cases exist, create 18 mockup cases for demonstration
            if (convertedCases.length === 0) {
              const mockupCases: Case[] = [
                // Page 1 - Cases 1-6
                {
                  id: 'mock-1',
                  caseId: 'CASE-001',
                  title: 'Contrat de bail commercial',
                  description: 'Révision des clauses de résiliation anticipée et négociation des conditions avec le propriétaire.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-07-10T10:00:00.000Z',
                  updatedAt: '2024-07-10T10:00:00.000Z',
                  messages: new Array(12).fill(null),
                  documents: new Array(5).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-2',
                  caseId: 'CASE-002',
                  title: 'Succession familiale',
                  description: 'Répartition des biens immobiliers et mobiliers suite au décès. Gestion des droits de succession.',
                  status: 'pending' as CaseStatus,
                  createdAt: '2024-07-08T10:00:00.000Z',
                  updatedAt: '2024-07-08T10:00:00.000Z',
                  messages: new Array(24).fill(null),
                  documents: new Array(8).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-3',
                  caseId: 'CASE-003',
                  title: 'Litige commercial',
                  description: 'Rupture de contrat avec fournisseur. Réclamation de dommages et intérêts pour non-respect des délais.',
                  status: 'closed' as CaseStatus,
                  createdAt: '2024-07-05T10:00:00.000Z',
                  updatedAt: '2024-07-05T10:00:00.000Z',
                  messages: new Array(38).fill(null),
                  documents: new Array(15).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-4',
                  caseId: 'CASE-004',
                  title: 'Création d\'entreprise',
                  description: 'Rédaction des statuts de SPRL et formalités administratives. Choix de la forme juridique optimale.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-07-03T10:00:00.000Z',
                  updatedAt: '2024-07-03T10:00:00.000Z',
                  messages: new Array(7).fill(null),
                  documents: new Array(6).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-5',
                  caseId: 'CASE-005',
                  title: 'Divorce par consentement',
                  description: 'Procédure de divorce amiable avec répartition des biens et garde des enfants.',
                  status: 'pending' as CaseStatus,
                  createdAt: '2024-07-01T10:00:00.000Z',
                  updatedAt: '2024-07-01T10:00:00.000Z',
                  messages: new Array(18).fill(null),
                  documents: new Array(12).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-6',
                  caseId: 'CASE-006',
                  title: 'Achat immobilier',
                  description: 'Vérification du compromis de vente et négociation des conditions suspensives.',
                  status: 'closed' as CaseStatus,
                  createdAt: '2024-06-28T10:00:00.000Z',
                  updatedAt: '2024-06-28T10:00:00.000Z',
                  messages: new Array(14).fill(null),
                  documents: new Array(9).fill(null),
                  userId: 'mock-user'
                },
                // Page 2 - Cases 7-12
                {
                  id: 'mock-7',
                  caseId: 'CASE-007',
                  title: 'Droit du travail',
                  description: 'Licenciement abusif et réclamation d\'indemnités. Négociation avec l\'employeur.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-06-25T10:00:00.000Z',
                  updatedAt: '2024-06-25T10:00:00.000Z',
                  messages: new Array(22).fill(null),
                  documents: new Array(11).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-8',
                  caseId: 'CASE-008',
                  title: 'Responsabilité civile',
                  description: 'Accident de la circulation et réclamation d\'assurance. Expertise des dommages.',
                  status: 'pending' as CaseStatus,
                  createdAt: '2024-06-22T10:00:00.000Z',
                  updatedAt: '2024-06-22T10:00:00.000Z',
                  messages: new Array(16).fill(null),
                  documents: new Array(7).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-9',
                  caseId: 'CASE-009',
                  title: 'Droit de la famille',
                  description: 'Garde d\'enfants et pension alimentaire. Médiation familiale en cours.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-06-20T10:00:00.000Z',
                  updatedAt: '2024-06-20T10:00:00.000Z',
                  messages: new Array(31).fill(null),
                  documents: new Array(13).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-10',
                  caseId: 'CASE-010',
                  title: 'Propriété intellectuelle',
                  description: 'Dépôt de marque et protection des droits d\'auteur. Recherche d\'antériorité.',
                  status: 'closed' as CaseStatus,
                  createdAt: '2024-06-18T10:00:00.000Z',
                  updatedAt: '2024-06-18T10:00:00.000Z',
                  messages: new Array(9).fill(null),
                  documents: new Array(4).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-11',
                  caseId: 'CASE-011',
                  title: 'Droit pénal',
                  description: 'Défense en correctionnelle pour délit routier. Préparation de la plaidoirie.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-06-15T10:00:00.000Z',
                  updatedAt: '2024-06-15T10:00:00.000Z',
                  messages: new Array(27).fill(null),
                  documents: new Array(18).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-12',
                  caseId: 'CASE-012',
                  title: 'Vente fonds de commerce',
                  description: 'Cession d\'un restaurant avec transfert de licence. Vérification des obligations.',
                  status: 'pending' as CaseStatus,
                  createdAt: '2024-06-12T10:00:00.000Z',
                  updatedAt: '2024-06-12T10:00:00.000Z',
                  messages: new Array(19).fill(null),
                  documents: new Array(14).fill(null),
                  userId: 'mock-user'
                },
                // Page 3 - Cases 13-18
                {
                  id: 'mock-13',
                  caseId: 'CASE-013',
                  title: 'Droit des assurances',
                  description: 'Refus de prise en charge d\'un sinistre habitation. Contestation de l\'expertise.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-06-10T10:00:00.000Z',
                  updatedAt: '2024-06-10T10:00:00.000Z',
                  messages: new Array(13).fill(null),
                  documents: new Array(8).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-14',
                  caseId: 'CASE-014',
                  title: 'Copropriété',
                  description: 'Conflit avec le syndic et travaux non autorisés. Convocation d\'assemblée générale.',
                  status: 'closed' as CaseStatus,
                  createdAt: '2024-06-08T10:00:00.000Z',
                  updatedAt: '2024-06-08T10:00:00.000Z',
                  messages: new Array(25).fill(null),
                  documents: new Array(16).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-15',
                  caseId: 'CASE-015',
                  title: 'Recouvrement de créances',
                  description: 'Impayés clients et mise en demeure. Procédure de référé provision.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-06-05T10:00:00.000Z',
                  updatedAt: '2024-06-05T10:00:00.000Z',
                  messages: new Array(8).fill(null),
                  documents: new Array(3).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-16',
                  caseId: 'CASE-016',
                  title: 'Tutelle et curatelle',
                  description: 'Demande de mise sous protection d\'un parent âgé. Constitution du dossier médical.',
                  status: 'pending' as CaseStatus,
                  createdAt: '2024-06-03T10:00:00.000Z',
                  updatedAt: '2024-06-03T10:00:00.000Z',
                  messages: new Array(21).fill(null),
                  documents: new Array(10).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-17',
                  caseId: 'CASE-017',
                  title: 'Médiation commerciale',
                  description: 'Différend contractuel entre partenaires commerciaux. Recherche de solution amiable.',
                  status: 'active' as CaseStatus,
                  createdAt: '2024-06-01T10:00:00.000Z',
                  updatedAt: '2024-06-01T10:00:00.000Z',
                  messages: new Array(33).fill(null),
                  documents: new Array(20).fill(null),
                  userId: 'mock-user'
                },
                {
                  id: 'mock-18',
                  caseId: 'CASE-018',
                  title: 'Droit de l\'urbanisme',
                  description: 'Contestation d\'un permis de construire en zone protégée. Recours administratif.',
                  status: 'closed' as CaseStatus,
                  createdAt: '2024-05-29T10:00:00.000Z',
                  updatedAt: '2024-05-29T10:00:00.000Z',
                  messages: new Array(29).fill(null),
                  documents: new Array(17).fill(null),
                  userId: 'mock-user'
                }
              ];
              setCases(mockupCases);
            } else {
              setCases(convertedCases);
            }
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

  // Helper function to get status display text and styling
  const getStatusInfo = (status: CaseStatus) => {
    switch (status) {
      case 'active':
        return {
          text: 'En cours',
          className: theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
        };
      case 'pending':
        return {
          text: 'Attente',
          className: theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
        };
      case 'closed':
        return {
          text: 'Terminé',
          className: theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
        };
      default:
        return {
          text: status,
          className: theme === 'dark' ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-100 text-gray-700'
        };
    }
  };

  // Helper function to format date
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  // Show loading state during authentication
  if (authLoading) {
    return (
      <div className="min-h-screen sophisticated-bg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  // Show authentication required
  if (!user) {
    return (
      <div className="min-h-screen sophisticated-bg p-6">
        <div className="executive-card rounded-2xl p-12 text-center">
          <h3 className="font-clash font-semibold text-slate-800 text-lg mb-2">Connexion requise</h3>
          <p className="text-gray-600 mb-6">
            Veuillez vous connecter pour voir vos dossiers.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen sophisticated-bg p-6">
        <div className="executive-card rounded-2xl p-12 text-center">
          <h3 className="font-clash font-semibold text-slate-800 text-lg mb-2">Erreur</h3>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6">
      {/* Filters and Search */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-4 rounded-xl mb-6`}>
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Rechercher par titre, description ou mots-clés..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none ${theme === 'dark' ? 'dark-input' : 'border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white/90'}`}
                    />
                    <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'} absolute left-3 top-3.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${statusFilter === 'all' ? 'active' : ''} ${theme === 'dark' ? (statusFilter === 'all' ? 'text-slate-200' : 'text-slate-300') : (statusFilter === 'all' ? 'text-gray-700' : 'text-gray-600')}`}
                  >
                    Tous
                  </button>
                  <button 
                    onClick={() => setStatusFilter('active')}
                    className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${statusFilter === 'active' ? 'active' : ''} ${theme === 'dark' ? (statusFilter === 'active' ? 'text-slate-200' : 'text-slate-300') : (statusFilter === 'active' ? 'text-gray-700' : 'text-gray-600')}`}
                  >
                    En cours
                  </button>
                  <button 
                    onClick={() => setStatusFilter('closed')}
                    className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${statusFilter === 'closed' ? 'active' : ''} ${theme === 'dark' ? (statusFilter === 'closed' ? 'text-slate-200' : 'text-slate-300') : (statusFilter === 'closed' ? 'text-gray-700' : 'text-gray-600')}`}
                  >
                    Terminés
                  </button>
                  <button 
                    onClick={() => setStatusFilter('pending')}
                    className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${statusFilter === 'pending' ? 'active' : ''} ${theme === 'dark' ? (statusFilter === 'pending' ? 'text-slate-200' : 'text-slate-300') : (statusFilter === 'pending' ? 'text-gray-700' : 'text-gray-600')}`}
                  >
                    Archivés
                  </button>
                </div>
                
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`rounded-lg px-3 py-2 text-sm ${theme === 'dark' ? 'dark-input text-slate-200' : 'border border-gray-300 text-gray-700 bg-white/90'}`}
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
                  <div key={i} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl h-48 animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
                ))}
              </div>
            ) : paginatedCases.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedCases.map((caseItem) => {
                    const statusInfo = getStatusInfo(caseItem.status);
                    return (
                      <Link key={caseItem.id} to={`/cases/${caseItem.id}`}>
                        <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-6 cursor-pointer h-64 flex flex-col`}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-lg mb-2 line-clamp-2`}>
                                {caseItem.title}
                              </h3>
                              <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} text-sm mb-3 line-clamp-3 flex-1`}>
                                {caseItem.description}
                              </p>
                            </div>
                            <span className={`px-3 py-1 text-xs rounded-full font-clash font-medium ml-2 flex-shrink-0 ${statusInfo.className}`}>
                              {statusInfo.text}
                            </span>
                          </div>
                          
                          <div className="mt-auto">
                            <div className={`flex items-center justify-between text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-4`}>
                              <span>Créé le {formatDisplayDate(caseItem.createdAt)}</span>
                              <span>{caseItem.documents?.length || 0} documents</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                </svg>
                                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {caseItem.messages?.length || 0} messages
                                </span>
                              </div>
                              <button 
                                className={`${theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Handle menu actions
                                }}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 2L3 6l3 4M18 2l3 4-3 4"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === 1 
                            ? (theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
                            : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg transition-colors font-clash font-medium ${
                            currentPage === pageNum
                              ? `text-white ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-700'}`
                              : (theme === 'dark' 
                                ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30' 
                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === totalPages 
                            ? (theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
                            : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                        }`}
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
              <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-12 text-center`}>
                <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <svg className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-lg mb-2`}>Aucun dossier</h3>
                <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>
                  Créez votre premier dossier pour commencer avec Kingsley
                </p>
                <button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-3 rounded-xl font-clash font-medium`}>
                  {user?.isGuest ? "Commencer la consultation" : "Créer un dossier"}
                </button>
              </div>
            )}
    </main>
  );
}