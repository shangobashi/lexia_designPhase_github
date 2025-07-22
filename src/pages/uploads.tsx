import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from '@/components/uploads/file-uploader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
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

export default function UploadsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ files: 0, totalSize: 0 });
  
  useEffect(() => {
    if (!user) return;
    
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
          title: 'Erreur',
          description: 'Échec du chargement des documents',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, [user, toast]);
  
  const handleFilesAdded = async (files: File[]) => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour télécharger des fichiers',
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
            title: 'Échec du téléchargement',
            description: `Impossible de télécharger ${file.name}`,
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
          title: 'Fichiers téléchargés avec succès',
          description: `${successfulUploads.length} fichier(s) téléchargé(s)`,
        });
      }
      
      // Clear uploaded files list
      setUploadedFiles([]);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur de téléchargement',
        description: 'Une erreur est survenue lors du téléchargement',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleFileRemove = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Update storage usage
      const newUsage = await getUserStorageUsage();
      setStorageUsage(newUsage);
      
      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erreur de suppression',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };
  
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
        title: 'Erreur de téléchargement',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive',
      });
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  const filteredDocuments = searchTerm
    ? documents.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.caseId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documents;
    
  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">Connexion requise</h3>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder à vos documents</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Gérez et organisez vos documents juridiques
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Télécharger des fichiers
        </Button>
      </div>
      
      {/* Document Management Tabs */}
      <Tabs defaultValue="all-documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-documents">Tous les documents</TabsTrigger>
          <TabsTrigger value="upload">Upload des fichiers</TabsTrigger>
          <TabsTrigger value="organize">Organiser</TabsTrigger>
        </TabsList>
        
        {/* All Documents Tab */}
        <TabsContent value="all-documents" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher des documents par nom ou ID de dossier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 py-2 rounded-md border border-input bg-background"
              />
            </div>
            
            <Button variant="outline" className="sm:w-auto">
              <Filter className="mr-2 h-4 w-4" /> Filtrer
            </Button>
          </div>
          
          {/* Document List */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg h-28 animate-pulse" />
              ))}
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {getFileIcon(doc.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span>Dossier : {doc.caseId}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>{formatFileSize(doc.size)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3 pt-3 border-t border-border">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Analyser">
                          <FileCog className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card p-8 text-center">
              {searchTerm ? (
                <>
                  <h3 className="font-medium text-lg mb-2">Aucun document ne correspond à votre recherche</h3>
                  <p className="text-muted-foreground mb-4">Essayez une autre recherche ou effacez vos filtres</p>
                  <Button variant="outline" onClick={() => setSearchTerm('')}>Effacer la recherche</Button>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">Aucun document encore</h3>
                  <p className="text-muted-foreground mb-4">Téléchargez votre premier document pour commencer</p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Télécharger des fichiers
                  </Button>
                </>
              )}
            </div>
          )}
        </TabsContent>
        
        {/* Upload Files Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Upload de documents</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Uploadez des documents tels que des contrats, des documents de cour, des photographies ou toute autre preuve pertinente pour vos affaires juridiques.
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
              
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    <p><span className="font-medium">Stockage :</span> {formatFileSize(storageUsage.totalSize)} utilisés sur 1 Go</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all" 
                        style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline">
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Ajouter à un dossier
                    </Button>
                    <Button 
                      disabled={uploadedFiles.length === 0 || isUploading}
                      onClick={() => handleFilesAdded(uploadedFiles)}
                    >
                      {isUploading ? 'Téléchargement...' : 'Traiter les documents'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Organize Tab */}
        <TabsContent value="organize">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Organiser des documents</h3>
              <p className="text-muted-foreground mb-4">Grouper des documents dans des dossiers et les assigner à des dossiers</p>
              
              {/* This would be a drag-and-drop interface in the full implementation */}
              <div className="border border-border rounded-md p-8 text-center">
                <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 inline-block">
                  <FileCog className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Organisation des documents en cours de développement</h3>
                <p className="text-sm text-muted-foreground mb-4">Cette fonctionnalité est actuellement en cours de développement</p>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  En savoir plus
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}