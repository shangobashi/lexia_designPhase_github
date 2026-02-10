import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getCaseById, addMessage } from '@/lib/supabase';
import { aiApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { ChevronLeft, FileText, Clock, Download, Plus, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Type adapters for compatibility
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  caseId: string;
  files?: any[];
}

interface Case {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: 'active' | 'pending' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  documents: any[];
  userId: string;
}

// Helper function to convert DB data to component format
const convertDbCaseToCase = (dbCase: any): Case => {
  return {
    id: dbCase.id,
    caseId: dbCase.case_id,
    title: dbCase.title,
    description: dbCase.description,
    status: dbCase.status,
    createdAt: dbCase.created_at,
    updatedAt: dbCase.updated_at,
    messages: (dbCase.messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.created_at,
      caseId: msg.case_id,
    })),
    documents: dbCase.documents || [],
    userId: dbCase.user_id,
  };
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  
  useEffect(() => {
    const fetchCase = async () => {
      setIsLoading(true);
      try {
        // For demo purposes, create a virtual case
        if (id === 'demo' || user?.isGuest) {
          const demoCase: Case = {
            id: 'BC-2024-001',
            caseId: 'BC-2024-001',
            title: 'Contrat de bail commercial',
            description: 'Révision et négociation des clauses de résiliation anticipée pour un bail commercial d\'un local de 150m² situé rue de la Loi à Bruxelles. Le client souhaite modifier les conditions de sortie et renégocier certaines clauses avec le propriétaire.',
            status: 'active',
            createdAt: '2024-07-10T09:00:00.000Z',
            updatedAt: new Date().toISOString(),
            messages: [],
            documents: [
              {
                id: '1',
                name: 'Bail commercial original.pdf',
                size: 2400000,
                uploadedAt: '2024-07-10T09:30:00.000Z',
                type: 'pdf',
                tags: ['original', 'analyzed']
              },
              {
                id: '2',
                name: 'Amendement clauses résiliation.docx',
                size: 856000,
                uploadedAt: '2024-07-12T11:15:00.000Z',
                type: 'docx',
                tags: ['draft', 'ai-generated']
              },
              {
                id: '3',
                name: 'État des lieux entrée.xlsx',
                size: 1200000,
                uploadedAt: '2024-07-11T14:20:00.000Z',
                type: 'xlsx',
                tags: ['annexe']
              }
            ],
            userId: user?.id || 'guest'
          };
          setCaseData(demoCase);
        } else if (!user?.isGuest) {
          const dbCase = await getCaseById(id || '');
          const convertedCase = convertDbCaseToCase(dbCase);
          setCaseData(convertedCase);
        } else {
          throw new Error('Guests can only access demo case');
        }
      } catch (error) {
        console.error('Error fetching case', error);
        toast({
          title: 'Dossier introuvable',
          description: 'Le dossier demandé est introuvable ou vous n\'avez pas les permissions nécessaires',
          variant: 'destructive',
        });
        navigate('/cases');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchCase();
    }
  }, [id, navigate, toast, user]);

  if (isLoading) {
    return (
      <div className={`${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} min-h-screen flex items-center justify-center`}>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className={`${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} min-h-screen p-3 sm:p-6`}>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 sm:p-12 text-center`}>
          <h2 className={`font-clash text-2xl font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>Dossier introuvable</h2>
          <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>Le dossier demandé est introuvable</p>
          <button 
            onClick={() => navigate('/cases')}
            className={`font-clash ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 mx-auto`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Retour aux dossiers</span>
          </button>
        </div>
      </div>
    );
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
        );
      case 'docx':
        return (
          <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
        );
      case 'xlsx':
        return (
          <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        );
    }
  };

  const renderTag = (tag: string) => {
    const baseClasses = `${theme === 'dark' ? 'dark-tag' : 'light-tag'} px-2 py-1 text-xs rounded`;
    const tagClasses = `${baseClasses} ${tag}`;
    
    const tagLabels = {
      original: 'Original',
      draft: 'Brouillon',
      'ai-generated': 'Généré par IA',
      analyzed: 'Analysé par IA',
      annexe: 'Annexe'
    };
    
    return (
      <span className={tagClasses}>
        {tagLabels[tag as keyof typeof tagLabels] || tag}
      </span>
    );
  };

  const timelineEvents = [
    {
      title: 'Analyse IA terminée',
      time: 'Aujourd\'hui à 14:30',
      description: 'L\'IA a analysé le bail original et identifié 3 clauses problématiques concernant la résiliation anticipée.'
    },
    {
      title: 'Document généré',
      time: 'Aujourd\'hui à 11:15',
      description: 'Création automatique d\'un amendement basé sur les recommandations de l\'IA.'
    },
    {
      title: 'Consultation client',
      time: 'Hier à 16:45',
      description: 'Entretien téléphonique avec le client pour clarifier ses objectifs de négociation.'
    },
    {
      title: 'Upload de documents',
      time: '10 juillet à 09:30',
      description: 'Le client a fourni le bail original et l\'état des lieux d\'entrée.'
    },
    {
      title: 'Création du dossier',
      time: '10 juillet à 09:00',
      description: 'Ouverture du dossier "Contrat de bail commercial" pour Restaurant Le Petit Bruxellois.'
    }
  ];

  return (
    <div className={`${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} min-h-screen p-3 sm:p-6`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'dark-header' : 'light-header'} px-4 sm:px-6 py-4 rounded-2xl mb-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:space-x-4">
            <button 
              onClick={() => navigate('/cases')}
              className={`mt-0.5 sm:mt-0 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className={`text-xl sm:text-2xl font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {caseData.title}
              </h1>
              <p className={`text-sm sm:text-base ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                Dossier #{caseData.caseId} • Créé le {new Date(caseData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={`${theme === 'dark' ? 'dark-status-badge' : 'light-status-badge'} px-3 py-1 text-sm rounded-full font-medium`}>
              En cours
            </span>
            <button className={`${theme === 'dark' ? 'dark-secondary-button' : 'light-secondary-button'} px-4 py-2 rounded-lg ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
              <MoreHorizontal className="w-4 h-4 mr-2 inline" />
              Actions
            </button>
            <button className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-4 py-2 rounded-lg font-medium`}>
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Consulter l'IA
            </button>
          </div>
        </div>
      </div>

      {/* Case Overview */}
      <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6 mb-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>
              Aperçu du dossier
            </h2>
            <p className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'} mb-4`}>
              {caseData.description}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>
                  Client
                </h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>
                  Restaurant "Le Petit Bruxellois" SPRL
                </p>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>
                  Propriétaire
                </h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>
                  Immobilière du Centre SA
                </p>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>
                  Superficie
                </h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>
                  150 m²
                </p>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>
                  Loyer mensuel
                </h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>
                  2 500,00 €
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>
              Statistiques
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Progression
                </span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  65%
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div className={`${theme === 'dark' ? 'dark-progress-bar' : 'light-progress-bar'} h-2 rounded-full`} style={{width: '65%'}}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Documents
                </span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  {caseData.documents.length}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Messages IA
                </span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  12
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Temps passé
                </span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  8h 30m
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-600/30">
          <nav className="-mb-px flex gap-2 overflow-x-auto pb-2">
            <button 
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              Documents
            </button>
            <button 
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock className="w-4 h-4 mr-2 inline" />
              Historique
            </button>
            <button 
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'consultations' ? 'active' : ''}`}
              onClick={() => setActiveTab('consultations')}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Consultations IA
            </button>
            <button 
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
              </svg>
              Contacts
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents List */}
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              Documents du dossier
            </h3>
            <button className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-lg hover:bg-blue-800/50 transition-colors border border-blue-700/30">
              <Plus className="w-4 h-4 mr-1 inline" />
              Ajouter
            </button>
          </div>
          
          <div className="space-y-3">
            {caseData.documents.map((doc) => (
              <div key={doc.id} className={`${theme === 'dark' ? 'dark-document-card' : 'light-document-card'} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  {getDocumentIcon(doc.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} truncate`}>
                      {doc.name}
                    </h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
                      Uploadé le {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {doc.tags.map((tag: string) => (
                        <span key={tag}>
                          {renderTag(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className={`${theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'}`}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>
            Historique récent
          </h3>
          
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <div key={index} className={`${theme === 'dark' ? 'dark-timeline-item' : 'light-timeline-item'}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                      {event.title}
                    </h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
                      {event.time}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'} mt-2`}>
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button className={`text-sm ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'} underline`}>
              Voir l'historique complet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
