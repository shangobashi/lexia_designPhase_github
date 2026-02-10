import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/uploads/file-uploader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { useDebounce } from '@/hooks/useDebounce';
import { Document } from '@/types/document';
import { 
  getUserDocuments, 
  uploadFile, 
  getFileUrl, 
  deleteDocument,
  createDocument,
  getUserStorageUsage
} from '@/lib/supabase';
import { Search, FileText, Filter, Plus, File, Trash2, Download, ExternalLink, FileCog, FolderPlus } from 'lucide-react';

type DocumentType = 'all' | 'pdf' | 'doc' | 'image' | 'text';
type SortOption = 'newest' | 'oldest' | 'name' | 'size';

export default function UploadsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ files: 0, totalSize: 0 });
  const [activeTab, setActiveTab] = useState('all-documents');
  const [typeFilter, setTypeFilter] = useState<DocumentType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const DOCS_PER_PAGE = 6;
  
  useEffect(() => {
    if (!authLoading && user) {
      const fetchDocuments = async () => {
        setIsLoading(true);
        try {
          const [docs, usage] = await Promise.all([
            getUserDocuments(),
            getUserStorageUsage()
          ]);
          
          // Transform Supabase documents to match frontend interface
          const transformedDocs = docs.map(doc => ({
            id: doc.id,
            name: doc.name,
            size: doc.file_size,
            type: doc.mime_type,
            url: doc.url || getFileUrl('documents', doc.storage_path),
            uploadedAt: doc.uploaded_at,
            caseId: doc.case_id
          }));
          
          setDocuments(transformedDocs);
          setStorageUsage(usage);
        } catch (error) {
          console.error('Error fetching documents', error);
          toast({
            title: t.uploads.toasts.error,
            description: t.uploads.toasts.loadFailed,
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchDocuments();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      setDocuments([]);
      setStorageUsage({ files: 0, totalSize: 0 });
    }
  }, [authLoading, user]); // Removed toast from dependencies to prevent unnecessary re-renders
  
  const handleFilesAdded = async (files: File[]) => {
    if (!user) {
      toast({
        title: t.uploads.toasts.error,
        description: t.uploads.toasts.loginRequired,
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    const successfulUploads: any[] = [];
    
    try {
      for (const file of files) {
        try {
          // Upload file to Supabase storage
          const uploadResult = await uploadFile(file);
          
          // Get public URL
          const publicUrl = getFileUrl('documents', uploadResult.filePath);
          
          // Create document record in database
          const document = await createDocument({
            caseId: 'general', // Default case for uploads from this page
            name: uploadResult.fileName,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            storagePath: uploadResult.filePath,
            url: publicUrl
          });
          
          successfulUploads.push({
            id: document.id,
            name: document.name,
            size: document.file_size,
            type: document.mime_type,
            url: document.url,
            uploadedAt: document.uploaded_at,
            caseId: document.case_id
          });
          
        } catch (fileError) {
          console.error(`Failed to upload ${file.name}:`, fileError);
          toast({
            title: t.uploads.toasts.uploadFailed,
            description: `${t.uploads.toasts.uploadFailedDesc} ${file.name}`,
            variant: 'destructive',
          });
        }
      }
      
      if (successfulUploads.length > 0) {
        // Update documents list
        setDocuments(prev => [...successfulUploads, ...prev]);
        
        // Update storage usage
        const newUsage = await getUserStorageUsage();
        setStorageUsage(newUsage);
        
        toast({
          title: t.uploads.toasts.uploadSuccess,
          description: `${successfulUploads.length} ${t.uploads.toasts.uploadSuccessDesc}`,
        });
      }
      
      // Clear uploaded files list
      setUploadedFiles([]);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t.uploads.toasts.uploadError,
        description: t.uploads.toasts.uploadErrorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleFileRemove = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDeleteDocument = useCallback(async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
      
      // Update storage usage
      const newUsage = await getUserStorageUsage();
      setStorageUsage(newUsage);
      
      toast({
        title: t.uploads.toasts.deleteSuccess,
        description: t.uploads.toasts.deleteSuccessDesc,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: t.uploads.toasts.deleteError,
        description: t.uploads.toasts.deleteErrorDesc,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleBulkDelete = useCallback(async () => {
    try {
      // Delete documents one by one (could be optimized with a bulk delete API)
      await Promise.all(selectedDocuments.map(docId => deleteDocument(docId)));
      setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)));
      setSelectedDocuments([]);
      
      // Update storage usage
      const newUsage = await getUserStorageUsage();
      setStorageUsage(newUsage);
      
      toast({
        title: t.uploads.toasts.bulkDeleteSuccess,
        description: `${selectedDocuments.length} ${t.uploads.toasts.bulkDeleteSuccessDesc}`,
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: t.uploads.toasts.deleteError,
        description: t.uploads.toasts.bulkDeleteError,
        variant: 'destructive',
      });
    }
  }, [selectedDocuments, toast]);
  
  const toggleDocumentSelection = useCallback((docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  }, []);
  
  const handleDownload = async (document: any) => {
    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: t.uploads.toasts.downloadError,
        description: t.uploads.toasts.downloadErrorDesc,
        variant: 'destructive',
      });
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return language === 'fr' ? '0 Octets' : '0 Bytes';
    const k = 1024;
    const sizes = language === 'fr' ? ['Octets', 'Ko', 'Mo', 'Go'] : ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Helper function to format date
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  const storagePercentage = (storageUsage.totalSize / (1024 * 1024 * 1024)) * 100; // 1GB limit
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <div className="w-10 h-10 rounded bg-red-500/20 text-red-500 flex items-center justify-center">PDF</div>;
    } else if (fileType.includes('word') || fileType.includes('docx')) {
      return <div className="w-10 h-10 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center">DOC</div>;
    } else if (fileType.includes('image')) {
      return <div className="w-10 h-10 rounded bg-green-500/20 text-green-500 flex items-center justify-center">IMG</div>;
    } else if (fileType.includes('text')) {
      return <div className="w-10 h-10 rounded bg-muted text-muted-foreground flex items-center justify-center">TXT</div>;
    } else {
      return <File className="w-10 h-10 text-muted-foreground" />;
    }
  };
  
  // Advanced filtering and sorting with memoization for performance
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          doc.caseId.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          doc.type.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => {
        switch (typeFilter) {
          case 'pdf':
            return doc.type.includes('pdf');
          case 'doc':
            return doc.type.includes('word') || doc.type.includes('docx');
          case 'image':
            return doc.type.includes('image');
          case 'text':
            return doc.type.includes('text');
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [documents, debouncedSearchTerm, typeFilter, sortBy]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDocuments.length / DOCS_PER_PAGE);
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * DOCS_PER_PAGE;
    return filteredAndSortedDocuments.slice(startIndex, startIndex + DOCS_PER_PAGE);
  }, [filteredAndSortedDocuments, currentPage, DOCS_PER_PAGE]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, typeFilter, sortBy]);
    
  // Show loading state during authentication and initial data fetch
  if (authLoading || (isLoading && documents.length === 0)) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} p-3 sm:p-6`}>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-4 sm:p-6 rounded-xl mb-6`}>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
          </div>
        </div>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-xl mb-6`}>
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-xl`}>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show authentication required
  if (!user) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} p-3 sm:p-6`}>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 sm:p-12 text-center`}>
          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-lg mb-2`}>{t.uploads.loginRequired}</h3>
          <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>
            {t.uploads.loginRequiredDesc}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} p-3 sm:p-6`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-4 sm:p-6 rounded-xl mb-6`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-clash font-bold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.uploads.title}</h1>
            <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
              {t.uploads.subtitle}
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-3 rounded-xl font-clash font-medium flex items-center space-x-2`}
          >
            <Plus className="h-4 w-4" />
            <span>{t.uploads.addFiles}</span>
          </button>
        </div>
      </div>

      {/* Document Management Tabs */}
      <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-xl mb-6`}>
        <div className="flex flex-wrap gap-1 p-2">
          <button
            onClick={() => setActiveTab('all-documents')}
            className={`px-4 py-2 rounded-lg text-sm font-clash font-medium transition-colors ${
              activeTab === 'all-documents'
                ? (theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-gray-100 text-gray-900')
                : (theme === 'dark' ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
            }`}
          >
            {t.uploads.tabs.allDocuments}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-clash font-medium transition-colors ${
              activeTab === 'upload'
                ? (theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-gray-100 text-gray-900')
                : (theme === 'dark' ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
            }`}
          >
            {t.uploads.tabs.upload}
          </button>
          <button
            onClick={() => setActiveTab('organize')}
            className={`px-4 py-2 rounded-lg text-sm font-clash font-medium transition-colors ${
              activeTab === 'organize'
                ? (theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-gray-100 text-gray-900')
                : (theme === 'dark' ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
            }`}
          >
            {t.uploads.tabs.organize}
          </button>
        </div>
      </div>
        
      {/* Tab Content */}
      <div className={`${activeTab === 'all-documents' ? 'block' : 'hidden'}`}>
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-4 rounded-xl`}>
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              <div className="flex-1">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={t.uploads.searchPlaceholder} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none ${theme === 'dark' ? 'dark-input' : 'border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white/90'}`}
                  />
                  <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'} absolute left-3 top-3.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setTypeFilter('all')}
                  className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${typeFilter === 'all' ? 'active' : ''} ${theme === 'dark' ? (typeFilter === 'all' ? 'text-slate-200' : 'text-slate-300') : (typeFilter === 'all' ? 'text-gray-700' : 'text-gray-600')}`}
                >
                  {t.uploads.filterAll}
                </button>
                <button 
                  onClick={() => setTypeFilter('pdf')}
                  className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${typeFilter === 'pdf' ? 'active' : ''} ${theme === 'dark' ? (typeFilter === 'pdf' ? 'text-slate-200' : 'text-slate-300') : (typeFilter === 'pdf' ? 'text-gray-700' : 'text-gray-600')}`}
                >
                  PDF
                </button>
                <button 
                  onClick={() => setTypeFilter('doc')}
                  className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${typeFilter === 'doc' ? 'active' : ''} ${theme === 'dark' ? (typeFilter === 'doc' ? 'text-slate-200' : 'text-slate-300') : (typeFilter === 'doc' ? 'text-gray-700' : 'text-gray-600')}`}
                >
                  DOC
                </button>
                <button 
                  onClick={() => setTypeFilter('image')}
                  className={`${theme === 'dark' ? 'dark-filter-button' : 'filter-button'} px-4 py-2 rounded-lg text-sm font-clash font-medium ${typeFilter === 'image' ? 'active' : ''} ${theme === 'dark' ? (typeFilter === 'image' ? 'text-slate-200' : 'text-slate-300') : (typeFilter === 'image' ? 'text-gray-700' : 'text-gray-600')}`}
                >
                  Images
                </button>
              </div>
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={`w-full lg:w-auto rounded-lg px-3 py-2 text-sm ${theme === 'dark' ? 'dark-input text-slate-200' : 'border border-gray-300 text-gray-700 bg-white/90'}`}
              >
                <option value="newest">{t.uploads.sortNewest}</option>
                <option value="oldest">{t.uploads.sortOldest}</option>
                <option value="name">{t.uploads.sortName}</option>
                <option value="size">{t.uploads.sortSize}</option>
              </select>
            </div>
          </div>
          
          {/* Document List */}
          {paginatedDocuments.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedDocuments.map((doc, index) => (
                <div key={`${doc.id}-${index}`} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-5 sm:p-6 cursor-pointer min-h-[14rem] h-auto flex flex-col`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {getFileIcon(doc.type)}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-lg truncate`}>
                            {doc.name}
                          </h3>
                        </div>
                      </div>
                      <div className={`flex items-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-3`}>
                        <span>{t.uploads.caseLabel} {doc.caseId}</span>
                        <span className="mx-2">•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span>{t.uploads.uploadedOn} {formatDisplayDate(doc.uploadedAt)}</span>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleDownload(doc)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title={t.uploads.download}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button 
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title={t.uploads.analyze}
                      >
                        <FileCog className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDocument(doc.id)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' : 'text-red-400 hover:text-red-600 hover:bg-red-100'}`}
                        title={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                ))}
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
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 sm:p-12 text-center`}>
              {debouncedSearchTerm || typeFilter !== 'all' ? (
                <>
                  <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Search className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-lg mb-2`}>{t.uploads.noDocumentsFilter}</h3>
                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>{t.uploads.noDocumentsFilterDesc}</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setTypeFilter('all');
                    }}
                    className={`px-6 py-3 rounded-xl font-clash font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30 border border-slate-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300'}`}
                  >
                    {t.uploads.resetFilters}
                  </button>
                </>
              ) : (
                <>
                  <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <FileText className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-lg mb-2`}>{t.uploads.noDocuments}</h3>
                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>{t.uploads.noDocumentsDesc}</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-3 rounded-xl font-clash font-medium flex items-center space-x-2 mx-auto`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t.uploads.addFiles}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
        
      {/* Upload Files Tab */}
      <div className={`${activeTab === 'upload' ? 'block' : 'hidden'}`}>
        <div className="space-y-6">
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-4 sm:p-6 rounded-xl`}>
            <h3 className={`text-lg font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>{t.uploads.uploadTitle}</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>
              {t.uploads.uploadDesc}
            </p>
            
            <FileUploader
              onFilesAdded={handleFilesAdded}
              onFileRemove={handleFileRemove}
              files={uploadedFiles}
              maxFiles={10}
              acceptedFileTypes={{
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/plain': ['.txt'],
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png']
              }}
              maxSizeInBytes={20 * 1024 * 1024} // 20MB
              disabled={isUploading}
            />
            
            <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  <p><span className="font-clash font-medium">{t.uploads.storage}</span> {formatFileSize(storageUsage.totalSize)} {t.uploads.storageOf}</p>
                  <div className={`w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-1.5 mt-1`}>
                    <div 
                      className={`${theme === 'dark' ? 'bg-slate-400' : 'bg-gray-600'} h-1.5 rounded-full transition-all`}
                      style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className={`px-4 py-2 rounded-lg text-sm font-clash font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30 border border-slate-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300'} flex items-center space-x-2`}>
                    <FolderPlus className="h-4 w-4" />
                    <span>{t.uploads.addToCase}</span>
                  </button>
                  <button 
                    disabled={uploadedFiles.length === 0 || isUploading}
                    onClick={() => handleFilesAdded(uploadedFiles)}
                    className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-3 rounded-xl font-clash font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isUploading ? t.uploads.uploading : t.uploads.processDocuments}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        
      {/* Organize Tab */}
      <div className={`${activeTab === 'organize' ? 'block' : 'hidden'}`}>
        <div className="space-y-6">
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-4 sm:p-6 rounded-xl`}>
            <h3 className={`text-lg font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>{t.uploads.organizeTitle}</h3>
            <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>{t.uploads.organizeDesc}</p>
            
            {/* This would be a drag-and-drop interface in the full implementation */}
            <div className={`border ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'} rounded-xl p-8 text-center`}>
              <div className={`mx-auto mb-4 p-4 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} inline-block`}>
                <FileCog className={`h-6 w-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
              </div>
              <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>{t.uploads.organizeDev}</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>{t.uploads.organizeDevDesc}</p>
              <button className={`px-4 py-2 rounded-lg text-sm font-clash font-medium transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/30 border border-slate-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300'} flex items-center space-x-2 mx-auto`}>
                <ExternalLink className="h-4 w-4" />
                <span>{t.common.learnMore}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
