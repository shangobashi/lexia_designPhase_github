import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCaseById, addMessage } from '@/lib/supabase';
import { aiApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { ChevronLeft, FileText, MessageSquare, Clock, AlertCircle, Download, MoreHorizontal, Plus, Calendar, Settings, Edit } from 'lucide-react';
import ChatInterface from '@/components/chat/chat-interface';
import { formatDate } from '@/lib/utils';
import { AIProviderSwitch } from '@/components/ai-provider-switch';

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
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [aiProvider, setAIProvider] = useState<'gemini' | 'groq' | 'huggingface' | 'mistral' | 'fallback'>('fallback');
  
  useEffect(() => {
    const fetchCase = async () => {
      setIsLoading(true);
      try {
        // For guest users, create a virtual demo case
        if (user?.isGuest && id === 'demo') {
          const guestCase: Case = {
            id: 'demo',
            caseId: 'DEMO-001',
            title: 'Consultation Juridique (Mode Invité)',
            description: 'Posez vos questions juridiques à LexIA. Vous avez 10 questions gratuites.',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            documents: [],
            userId: 'guest-user'
          };
          setCaseData(guestCase);
        } else if (!user?.isGuest) {
          // Regular authenticated user flow
          const dbCase = await getCaseById(id || '');
          const convertedCase = convertDbCaseToCase(dbCase);
          setCaseData(convertedCase);
        } else {
          // Guest trying to access non-demo case
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
  
  const handleSendMessage = async (content: string) => {
    if (!caseData) return;
    
    try {
      const userMessageId = `msg_${Date.now()}_user`;
      const currentTime = new Date().toISOString();
      
      // For guests, we handle messages in memory only
      if (user?.isGuest) {
        // Add user message to state immediately
        const userMessage: Message = {
          id: userMessageId,
          content: content,
          sender: 'user',
          timestamp: currentTime,
          caseId: caseData.id,
        };
        
        const updatedCase = {
          ...caseData,
          messages: [...caseData.messages, userMessage],
        };
        setCaseData(updatedCase);

        // Get AI response for guest
        const messageHistory = updatedCase.messages.map((msg: Message) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        const aiResponse = await aiApi.chat(messageHistory, caseData.id, aiProvider, true);

        // Add assistant message to state
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_assistant`,
          content: aiResponse.message,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          caseId: caseData.id,
        };

        const finalCase = {
          ...updatedCase,
          messages: [...updatedCase.messages, assistantMessage],
        };
        setCaseData(finalCase);

        // Show guest queries remaining
        if (aiResponse.guestQueriesRemaining !== undefined) {
          toast({
            title: 'Réponse générée',
            description: `Questions restantes: ${aiResponse.guestQueriesRemaining} (mode invité)`,
          });
        }
      } else {
        // Original authenticated user flow
        const userMessage = await addMessage(caseData.id, content, 'user');
        
        const updatedCase = {
          ...caseData,
          messages: [...caseData.messages, {
            id: userMessage.id,
            content: userMessage.content,
            sender: userMessage.sender,
            timestamp: userMessage.created_at,
            caseId: userMessage.case_id,
          } as Message],
        };
        setCaseData(updatedCase);

        const messageHistory = updatedCase.messages.map((msg: Message) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        const aiResponse = await aiApi.chat(messageHistory, caseData.id, aiProvider, false);

        const assistantMessage = await addMessage(
          caseData.id, 
          aiResponse.message, 
          'assistant',
          aiResponse.provider,
          aiResponse.tokenCount
        );

        const finalCase = {
          ...updatedCase,
          messages: [...updatedCase.messages, {
            id: assistantMessage.id,
            content: assistantMessage.content,
            sender: assistantMessage.sender,
            timestamp: assistantMessage.created_at,
            caseId: assistantMessage.case_id,
          } as Message],
        };
        setCaseData(finalCase);

        if (aiResponse.creditsUsed > 0) {
          toast({
            title: 'Réponse générée',
            description: `${aiResponse.creditsUsed} crédit(s) utilisé(s) via ${aiResponse.provider}`,
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Échec de l'envoi du message. Veuillez réessayer.",
        variant: 'destructive',
      });
    }
  };
  
  const handleClearChat = async () => {
    if (!caseData) return;
    
    // Note: In a real implementation, you might want to soft-delete messages
    // rather than actually clearing them. For now, we'll just update the UI
    // and let the backend handle the actual deletion if needed
    
    setCaseData({
      ...caseData,
      messages: [],
    });
    
    toast({
      title: 'Conversation effacée localement',
      description: 'La conversation a été effacée de l\'affichage',
    });
  };
  
  const handleFileUpload = async (files: File[]) => {
    if (!caseData) return;
    
    try {
      // For now, just analyze file names. In production, you'd upload files to storage first
      const fileNames = files.map(f => f.name);
      
      const response = await aiApi.analyzeDocuments(fileNames, caseData.id, aiProvider);

      toast({
        title: 'Fichiers analysés',
        description: `${files.length} fichier(s) ont été traités via ${response.provider}`,
        variant: 'default',
      });

      // Show the analysis result as a message
      if (response.analysis) {
        const analysisMessage = await addMessage(
          caseData.id,
          `**Analyse de documents:**\n\n${response.analysis}`,
          'assistant',
          response.provider,
          response.tokenCount
        );

        setCaseData({
          ...caseData,
          messages: [...caseData.messages, {
            id: analysisMessage.id,
            content: analysisMessage.content,
            sender: analysisMessage.sender,
            timestamp: analysisMessage.created_at,
            caseId: analysisMessage.case_id,
          } as Message],
        });
      }
    } catch (error) {
      console.error('Error analyzing files:', error);
      toast({
        title: 'Erreur',
        description: "Échec de l'analyse des fichiers. Veuillez réessayer.",
        variant: 'destructive',
      });
    }
  };
  
  const handleProviderChange = (provider: 'gemini' | 'groq' | 'huggingface' | 'mistral' | 'fallback') => {
    setAIProvider(provider);
    const providerNames = {
      'gemini': 'Google Gemini',
      'groq': 'Groq',
      'huggingface': 'HuggingFace',
      'mistral': 'Mistral AI',
      'fallback': 'Mode démo'
    };
    toast({
      title: 'Fournisseur IA changé',
      description: `Basculé vers ${providerNames[provider]}`,
    });
  };
  
  if (isLoading) {
    return (
      <div className="p-6 sophisticated-bg dark:dark-sophisticated-bg min-h-screen">
        <div className="flex items-center justify-center h-full">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  if (!caseData) {
    return (
      <div className="p-6 sophisticated-bg dark:dark-sophisticated-bg min-h-screen">
        <div className="executive-card dark:dark-executive-card rounded-2xl p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-2">Dossier introuvable</h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">Le dossier demandé est introuvable</p>
          <button 
            onClick={() => navigate('/cases')}
            className="primary-button dark:dark-primary-button text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 mx-auto"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Retour aux dossiers</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 sophisticated-bg dark:dark-sophisticated-bg min-h-screen">
      {/* Case Header */}
      <div className="executive-card dark:dark-executive-card rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/cases')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Retour aux dossiers</span>
            </button>
            <div>
              <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-1">{caseData.title}</h1>
              <p className="text-gray-600 dark:text-slate-300 text-sm">ID Dossier: {caseData.caseId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <AIProviderSwitch
              currentProvider={aiProvider}
              onProviderChange={handleProviderChange}
            />
            <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 text-sm font-medium transition-colors flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Modifier le dossier</span>
            </button>
            <button className="primary-button dark:dark-primary-button text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center space-x-2">
              <MoreHorizontal className="h-4 w-4" />
              <span>Actions</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Case Content */}
      <div className="executive-card dark:dark-executive-card rounded-2xl overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200/50 dark:border-slate-600/30">
          <div className="flex space-x-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'chat'
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-slate-300 border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:bg-gray-50/50 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'documents'
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-slate-300 border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:bg-gray-50/50 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Documents ({caseData.documents.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'settings'
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-slate-300 border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:bg-gray-50/50 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </div>
            </button>
          </div>
        </div>
        {/* Tab Content */}
        {activeTab === 'chat' && (
          <div className="h-96">
            <ChatInterface
              messages={caseData.messages}
              onSend={handleSendMessage}
              onClearChat={handleClearChat}
              onFileUpload={handleFileUpload}
            />
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="p-6">
            {caseData.documents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Documents du dossier</h3>
                  <button className="primary-button dark:dark-primary-button text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Ajouter un document</span>
                  </button>
                </div>
                
                {caseData.documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="bg-gray-50/80 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/30 rounded-xl p-4 hover:border-gray-300 dark:hover:border-slate-500/50 transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="mr-3 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{doc.name}</p>
                        <div className="flex items-center text-xs text-gray-600 dark:text-slate-300 mt-1">
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3 pt-3 border-t border-gray-200/50 dark:border-slate-600/30">
                      <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 text-sm font-medium transition-colors">
                        Voir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Aucun document pour le moment</h3>
                <p className="text-gray-600 dark:text-slate-300 mb-6">Uploadez des documents pertinents pour ce dossier</p>
                <button className="primary-button dark:dark-primary-button text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Uploadez des documents</span>
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="p-6">
            <div className="max-w-3xl">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Paramètres du dossier</h3>
              
              {/* Case Details Section */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-3">Informations Dossier</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-slate-300">Titre Dossier</label>
                      <input 
                        value={caseData.title} 
                        className="w-full mt-1 px-3 py-2 bg-gray-50/80 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/30 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-slate-300">ID Dossier</label>
                      <input 
                        value={caseData.caseId} 
                        disabled 
                        className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-slate-600/30 border border-gray-200 dark:border-slate-600/30 rounded-xl text-slate-800 dark:text-slate-200 opacity-60"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-600 dark:text-slate-300">Description</label>
                      <textarea 
                        value={caseData.description}
                        className="w-full min-h-[100px] mt-1 p-3 bg-gray-50/80 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/30 rounded-xl text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Case Status Section */}
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-3">Statut du dossier</h4>
                  <div className="flex items-center space-x-4">
                    <button 
                      className={`w-32 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                        caseData.status === 'active' 
                          ? 'bg-green-500 text-white' 
                          : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      Actif
                    </button>
                    <button 
                      className={`w-32 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                        caseData.status === 'pending' 
                          ? 'bg-yellow-500 text-white' 
                          : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      En attente
                    </button>
                    <button 
                      className={`w-32 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                        caseData.status === 'closed' 
                          ? 'bg-gray-500 text-white' 
                          : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      Fermé
                    </button>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200/50 dark:border-slate-600/30">
                  <button className="primary-button dark:dark-primary-button text-white px-6 py-3 rounded-xl font-medium">
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}