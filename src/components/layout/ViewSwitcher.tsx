import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, User, Building2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useLawfirms } from '@/hooks/useLawfirms';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ViewSwitcherProps {
  onClose?: () => void;
}

export function ViewSwitcher({ onClose }: ViewSwitcherProps) {
  const navigate = useNavigate();
  const { impersonatedLawfirm, isImpersonating, startImpersonation } = useImpersonation();
  const { data: lawfirms, isLoading } = useLawfirms();
  const [open, setOpen] = useState(true);

  const activeLawfirms = lawfirms?.filter(l => l.is_active !== false) || [];

  const handleSelectLawfirm = (lawfirm: typeof activeLawfirms[0]) => {
    startImpersonation(lawfirm);
    navigate('/despacho/dashboard');
    onClose?.();
  };

  return (
    <div className="border-t border-sidebar-border pt-3 mt-3">
      <div className="px-3 mb-2 flex items-center gap-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        <Eye className="h-3 w-3" />
        Cambiar Vista
      </div>

      {/* Current Admin View */}
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mx-1 transition-colors',
          !isImpersonating
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer'
        )}
        onClick={() => {
          if (isImpersonating) {
            // This shouldn't happen here, but just in case
          }
        }}
      >
        <User className="h-4 w-4" />
        Admin
        {!isImpersonating && <Check className="h-4 w-4 ml-auto" />}
      </div>

      {/* Lawfirm Selector */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex items-center justify-between w-full px-3 py-2.5 mx-1 rounded-lg text-sm font-medium transition-colors',
              isImpersonating
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
            style={{ width: 'calc(100% - 0.5rem)' }}
          >
            <span className="flex items-center gap-3">
              <Building2 className="h-4 w-4" />
              {isImpersonating ? impersonatedLawfirm?.name : 'Ver como Despacho'}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="max-h-40 mt-1 ml-4">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-sidebar-foreground/60">Cargando...</div>
            ) : activeLawfirms.length === 0 ? (
              <div className="px-3 py-2 text-sm text-sidebar-foreground/60">Sin despachos</div>
            ) : (
              <div className="space-y-0.5 pr-2">
                {activeLawfirms.map((lawfirm) => (
                  <button
                    key={lawfirm.id}
                    onClick={() => handleSelectLawfirm(lawfirm)}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      impersonatedLawfirm?.id === lawfirm.id
                        ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <span className="truncate">{lawfirm.name}</span>
                    {impersonatedLawfirm?.id === lawfirm.id && (
                      <Check className="h-3 w-3 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
