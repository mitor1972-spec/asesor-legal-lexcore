import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useArchiveLead } from '@/hooks/useLeads';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  redirectAfterDelete?: boolean;
}

export function DeleteLeadDialog({ open, onOpenChange, leadId, redirectAfterDelete = true }: DeleteLeadDialogProps) {
  const navigate = useNavigate();
  const archiveMutation = useArchiveLead();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Using soft-delete (archive) instead of permanent delete
      await archiveMutation.mutateAsync(leadId);
      toast.success('Lead eliminado');
      onOpenChange(false);
      if (redirectAfterDelete) {
        navigate('/leads');
      }
    } catch (error) {
      toast.error('Error al eliminar el lead');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este lead?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción archivará el lead y no aparecerá en el listado principal. 
            Podrás recuperarlo más tarde desde la sección de archivados si es necesario.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
