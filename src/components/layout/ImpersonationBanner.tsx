import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const { impersonatedLawfirm, isImpersonating, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedLawfirm) {
    return null;
  }

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate('/dashboard');
  };

  return (
    <div className="bg-warning/20 border-b border-warning/30 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span>
          Viendo como: <strong>{impersonatedLawfirm.name}</strong>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStopImpersonation}
        className="h-7 gap-1 border-warning/50 hover:bg-warning/20"
      >
        <X className="h-3 w-3" />
        Volver a Admin
      </Button>
    </div>
  );
}
