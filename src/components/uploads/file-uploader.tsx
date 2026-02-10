import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  files: File[];
  maxFiles?: number;
  acceptedFileTypes?: Record<string, string[]>;
  maxSizeInBytes?: number;
  disabled?: boolean;
}

function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((acc, [key, value]) => {
    return acc.replace(`{${key}}`, value);
  }, template);
}

export function FileUploader({
  onFilesAdded,
  onFileRemove,
  files,
  maxFiles = 5,
  acceptedFileTypes,
  maxSizeInBytes = 5 * 1024 * 1024, // 5MB default
  disabled = false,
}: FileUploaderProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return language === 'fr' ? '0 Octets' : '0 Bytes';
    const k = 1024;
    const sizes = language === 'fr' ? ['Octets', 'Ko', 'Mo', 'Go'] : ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (disabled) return;

      if (files.length + acceptedFiles.length > maxFiles) {
        toast({
          title: t.fileUploader.tooManyFiles,
          description: interpolate(t.fileUploader.tooManyFilesDesc, { max: String(maxFiles) }),
          variant: 'destructive',
        });
        return;
      }

      // Filter out files that are too large
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > maxSizeInBytes) {
          toast({
            title: t.fileUploader.fileTooLarge,
            description: interpolate(t.fileUploader.fileTooLargeDesc, {
              name: file.name,
              max: formatFileSize(maxSizeInBytes),
            }),
            variant: 'destructive',
          });
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    },
    accept: acceptedFileTypes,
    maxFiles: maxFiles - files.length,
    maxSize: maxSizeInBytes,
    disabled,
  });

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'pdf':
        return <div className="w-8 h-8 rounded bg-red-500/20 text-red-500 flex items-center justify-center">PDF</div>;
      case 'doc':
      case 'docx':
        return <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center">DOC</div>;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <div className="w-8 h-8 rounded bg-green-500/20 text-green-500 flex items-center justify-center">IMG</div>;
      case 'txt':
        return <div className="w-8 h-8 rounded bg-muted text-muted-foreground flex items-center justify-center">TXT</div>;
      default:
        return <File className="w-8 h-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-50 bg-muted'
            : isDragActive
              ? 'bg-primary/5 border-primary cursor-pointer'
              : 'hover:bg-background cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-base font-medium">{t.fileUploader.dragDrop}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-2">{t.fileUploader.orBrowse}</p>
          <p className="text-xs text-muted-foreground">
            {t.fileUploader.acceptedTypes} {formatFileSize(maxSizeInBytes)})
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">{t.fileUploader.uploadedFiles} ({files.length}/{maxFiles})</p>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-3 bg-background rounded-md border border-border"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onFileRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {files.length === maxFiles && (
        <div className="flex items-center p-2 text-xs text-muted-foreground bg-background rounded-md">
          <AlertCircle className="h-4 w-4 mr-2 text-warning" />
          {t.fileUploader.fileLimitReached}
        </div>
      )}
    </div>
  );
}
