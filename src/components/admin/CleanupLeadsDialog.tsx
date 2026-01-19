import { useState } from 'react';
import { useCleanupLeads } from '@/hooks/useCleanupLeads';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, AlertTriangle, CheckCircle2, Loader2, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function CleanupLeadsDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'idle' | 'preview' | 'confirm' | 'done'>('idle');
  const { runCleanup, isLoading, result, clearResult } = useCleanupLeads();

  const handlePreview = async () => {
    try {
      await runCleanup(true, true);
      setStep('preview');
    } catch {
      toast.error('Error al analizar leads');
    }
  };

  const handleExecute = async () => {
    try {
      await runCleanup(false, true);
      setStep('done');
      toast.success('Limpieza completada');
    } catch {
      toast.error('Error al ejecutar limpieza');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('idle');
    clearResult();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'deleted':
        return <Badge variant="destructive">Eliminado</Badge>;
      case 'marked_incomplete':
        return <Badge variant="secondary">Incompleto</Badge>;
      case 'updated':
        return <Badge className="bg-green-500/10 text-green-600">Actualizado</Badge>;
      case 'archived_duplicate':
        return <Badge variant="outline">Duplicado archivado</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50">
          <Sparkles className="h-4 w-4" />
          Limpiar leads vacíos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-amber-500" />
            Limpieza de Leads Vacíos
          </DialogTitle>
          <DialogDescription>
            Esta herramienta identifica y elimina/archiva leads sin datos de contacto válidos.
          </DialogDescription>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                ¿Qué hace esta limpieza?
              </h4>
              <ul className="mt-2 text-sm text-amber-700 space-y-1">
                <li>• Detecta leads sin nombre/email/teléfono válidos</li>
                <li>• Intenta recuperar datos desde Chatwoot si es posible</li>
                <li>• Elimina leads sin conversation_id (basura del bug)</li>
                <li>• Marca como "incompleto" los que no se pueden recuperar</li>
                <li>• Deduplica leads con el mismo conversation_id</li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handlePreview} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Vista previa
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && result && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{result.summary.total_leads_reviewed}</div>
                <div className="text-xs text-muted-foreground">Revisados</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{result.summary.leads_deleted}</div>
                <div className="text-xs text-red-600">A eliminar</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{result.summary.leads_marked_incomplete}</div>
                <div className="text-xs text-amber-600">Incompletos</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.leads_updated}</div>
                <div className="text-xs text-green-600">Actualizados</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{result.summary.leads_deduplicated}</div>
                <div className="text-xs text-purple-600">Deduplicados</div>
              </div>
            </div>

            {result.details.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Detalle de cambios:</h4>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {result.details.map((detail, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <div className="flex items-center gap-2">
                          {getActionBadge(detail.action)}
                          <span className="font-mono text-xs text-muted-foreground">
                            {detail.lead_id.substring(0, 8)}...
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {detail.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                onClick={() => setStep('confirm')} 
                variant="destructive"
                disabled={result.summary.empty_leads_found === 0}
              >
                Continuar con limpieza
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h4 className="font-medium text-red-800">¿Confirmar limpieza?</h4>
              <p className="text-sm text-red-700 mt-1">
                Se eliminarán {result?.summary.leads_deleted} leads permanentemente.
                Esta acción NO se puede deshacer.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('preview')}>Volver</Button>
              <Button onClick={handleExecute} variant="destructive" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Sí, ejecutar limpieza
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium text-green-800">Limpieza completada</h4>
              <div className="text-sm text-green-700 mt-2 space-y-1">
                <p>✓ {result.summary.leads_deleted} leads eliminados</p>
                <p>✓ {result.summary.leads_marked_incomplete} leads marcados como incompletos</p>
                <p>✓ {result.summary.leads_updated} leads actualizados</p>
                <p>✓ {result.summary.leads_deduplicated} duplicados archivados</p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
