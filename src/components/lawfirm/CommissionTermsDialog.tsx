import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';

interface CommissionTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  isFirstTime: boolean;
  loading?: boolean;
}

export function CommissionTermsDialog({ open, onOpenChange, onAccept, isFirstTime, loading }: CommissionTermsDialogProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    onAccept();
    setAccepted(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setAccepted(false); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            {isFirstTime ? 'Condiciones generales — Modelo comisión' : 'Confirmar adquisición a comisión'}
          </DialogTitle>
          <DialogDescription>
            {isFirstTime
              ? 'Para adquirir casos a comisión debes aceptar las siguientes condiciones.'
              : 'Confirma que este caso se rige por las condiciones generales aceptadas.'}
          </DialogDescription>
        </DialogHeader>

        {isFirstTime && (
          <ScrollArea className="max-h-[300px] pr-3">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>Al adquirir casos bajo el modelo de comisión, acepta las siguientes condiciones:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Asesor.Legal</strong> se reserva el derecho de contactar con el cliente para realizar seguimiento del caso.
                </li>
                <li>
                  El despacho está obligado a mantener actualizada en esta aplicación toda la información relativa a los casos a comisión, incluyendo:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>Minutas emitidas</li>
                    <li>Importes cobrados</li>
                    <li>Porcentaje de éxito aplicado</li>
                    <li>Estado del procedimiento</li>
                  </ul>
                </li>
                <li>
                  Si un despacho no mantiene esta información actualizada o no facilita un sistema alternativo verificable, podrá ser <strong>bloqueado</strong> para futuras adquisiciones de casos a comisión.
                </li>
                <li>
                  Los casos comisionables se ofrecen bajo un modelo de <strong>colaboración sincera y transparente</strong>.
                </li>
                <li>
                  El despacho se compromete a abonar a Asesor.Legal las cantidades resultantes de las comisiones pactadas.
                </li>
              </ol>
            </div>
          </ScrollArea>
        )}

        <div className="flex items-start gap-2 pt-2 border-t">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <label htmlFor="accept-terms" className="text-sm cursor-pointer leading-snug">
            {isFirstTime
              ? 'Acepto las condiciones generales para casos a comisión.'
              : 'Confirmo que este caso se rige por las condiciones generales aceptadas.'}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAccept} disabled={!accepted || loading} className="gap-2">
            {loading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
