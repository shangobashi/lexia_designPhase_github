import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUploader } from '@/components/uploads/file-uploader';
import { useToast } from '@/hooks/use-toast';
import { createCase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export default function NewCasePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect guests to demo case
  useEffect(() => {
    if (user?.isGuest) {
      navigate('/cases/demo');
    }
  }, [user, navigate]);

  // Don't render anything for guests (they get redirected)
  if (user?.isGuest) {
    return null;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const newCase = await createCase(title, description);
      
      toast({
        title: 'Dossier créé avec succès',
        description: `Nouveau dossier "${title}" a été créé avec l'ID ${newCase.case_id}`,
      });
      
      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error('Error creating case:', error);
      toast({
        title: 'Échec de la création du dossier',
        description: 'Veuillez vérifier vos données et réessayer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFilesAdded = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };
  
  const handleFileRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Créer un nouveau dossier</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Case Details Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Détails du dossier</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Titre du dossier
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex : Litige de location avec XYZ Property"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description du dossier
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre problème juridique en détail..."
                className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        </div>
        
        {/* Document Upload Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Téléversement de documents</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Téléversez des documents pertinents tels que des contrats, lettres, photos ou toute autre preuve pouvant aider votre dossier.
          </p>
          
          <FileUploader 
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleFileRemove}
            files={files}
            maxFiles={10}
            acceptedFileTypes={{
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'text/plain': ['.txt'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png']
            }}
            maxSizeInBytes={10 * 1024 * 1024} // 10MB
          />
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/cases')}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
          >
            {isSubmitting ? 'Création en cours...' : 'Créer le dossier'}
          </Button>
        </div>
      </form>
    </div>
  );
}