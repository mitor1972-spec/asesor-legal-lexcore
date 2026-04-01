import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, CheckCircle2 } from 'lucide-react';
import type { MissingField } from '@/hooks/useLawfirmProfileGate';

interface ProfileGateDialogProps {
  open: boolean;
  onClose: () => void;
  missingFields: MissingField[];
}

export function ProfileGateDialog({ open, onClose, missingFields }: ProfileGateDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Completa tu perfil</DialogTitle>
          </div>
          <DialogDescription>
            Para poder adquirir leads necesitas completar los datos obligatorios de tu despacho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm font-medium text-muted-foreground">Datos obligatorios pendientes:</p>
          <ul className="space-y-2">
            {missingFields.map((field) => (
              <li key={field.key} className="flex items-center gap-2 text-sm">
                <div className="h-5 w-5 rounded-full border-2 border-destructive/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-destructive text-xs">✕</span>
                </div>
                <span>{field.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Más tarde
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate('/despacho/configuracion');
            }}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Ir a Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
