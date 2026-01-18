import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCloseCaseResult } from '@/hooks/useLawfirmCases';
import { Loader2, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CaseResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  type: 'won' | 'lost';
}

const serviceTypes = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'juicio', label: 'Juicio' },
  { value: 'acuerdo', label: 'Acuerdo extrajudicial' },
];

const lostReasons = [
  { value: 'precio', label: 'Precio demasiado alto' },
  { value: 'eligio_otro', label: 'Eligió otro despacho' },
  { value: 'desistio', label: 'Desistió del caso' },
  { value: 'no_contactable', label: 'No fue posible contactar' },
  { value: 'otro', label: 'Otro motivo' },
];

export function CaseResultDialog({ open, onOpenChange, assignmentId, type }: CaseResultDialogProps) {
  const closeCase = useCloseCaseResult();

  const [resultAmount, setResultAmount] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [resultNotes, setResultNotes] = useState('');

  const handleSubmit = async () => {
    try {
      await closeCase.mutateAsync({
        assignmentId,
        firmStatus: type,
        resultAmount: resultAmount ? parseFloat(resultAmount) : undefined,
        resultNotes: resultNotes || undefined,
        serviceType: serviceType || undefined,
        lostReason: lostReason || undefined,
      });
      toast.success(type === 'won' ? 'Caso cerrado como ganado' : 'Caso marcado como perdido');
      onOpenChange(false);
    } catch {
      toast.error('Error al cerrar el caso');
    }
  };

  const isWon = type === 'won';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWon ? (
              <>
                <Trophy className="h-5 w-5 text-green-600" />
                Cerrar como Ganado
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Marcar como Perdido
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isWon ? (
            <>
              <div className="grid gap-2">
                <Label>Importe facturado (€)</Label>
                <Input
                  type="number"
                  value={resultAmount}
                  onChange={(e) => setResultAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label>Tipo de servicio</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Label>Motivo de pérdida</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {lostReasons.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Notas del resultado</Label>
            <Textarea
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              placeholder="Añade detalles sobre el cierre del caso..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={closeCase.isPending}
            variant={isWon ? 'default' : 'destructive'}
          >
            {closeCase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isWon ? 'Cerrar como Ganado' : 'Marcar como Perdido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
