import { Link } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Case } from '@/types/case';
import { FileText, MessageSquare, Calendar, ArrowRight, MoreHorizontal, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

interface CaseCardProps {
  caseData: Case;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}

export default function CaseCard({ caseData, index, isSelected, onSelect, onDelete }: CaseCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking on action elements
    if (e.target instanceof HTMLElement && 
        (e.target.closest('[data-action]') || e.target.closest('button') || e.target.closest('[role="menuitem"]'))) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className={cn(
        "bg-card border rounded-lg overflow-hidden transition-colors duration-200 relative",
        isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary"
      )}>
        <div className="p-5" onClick={handleClick}>
          {/* Selection and Actions Header */}
          <div className="flex items-center justify-between mb-3">
            {onSelect && (
              <div data-action="select" className="flex items-center">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  className="mr-2"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                caseData.status === 'active' && "bg-success/20 text-success",
                caseData.status === 'closed' && "bg-muted text-muted-foreground", 
                caseData.status === 'pending' && "bg-warning/20 text-warning"
              )}>
                {caseData.status === 'active' ? 'Actif' : 
                 caseData.status === 'pending' ? 'En attente' : 
                 caseData.status === 'closed' ? 'Fermé' : 
                 caseData.status}
              </div>
              
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-action="menu">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer le dossier
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Case Content */}
          <Link to={`/cases/${caseData.id}`} className="block">
            <div>
              <h3 className="text-lg font-medium truncate mb-2">{caseData.title}</h3>
              <p className="text-muted-foreground text-sm">
                {caseData.description && caseData.description.length > 100 
                  ? `${caseData.description.slice(0, 100)}...` 
                  : caseData.description}
              </p>
            </div>
            
            <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                <span>{caseData.documents.length} document{caseData.documents.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>{caseData.messages.length} message{caseData.messages.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(new Date(caseData.createdAt))}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">ID dossier : </span>
                <span className="font-medium">{caseData.caseId}</span>
              </div>
              
              <div className="text-primary flex items-center text-sm font-medium hover:underline">
                Voir le dossier <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}