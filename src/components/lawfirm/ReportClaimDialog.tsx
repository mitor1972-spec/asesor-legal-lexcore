import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const CLAIM_REASONS = [
  { value: 'phone_invalid', label: 'Teléfono inexistente' },
  { value: 'email_invalid', label: 'Email incorrecto' },
  { value: 'client_denies', label: 'Cliente niega haber solicitado abogado' },
  { value: 'client_expected_free', label: 'Cliente indica que pensaba que era gratuito' },
  { value: 'fake_data', label: 'Datos claramente falsos' },
  { value: 'case_nonexistent', label: 'Caso inexistente / inventado' },
  { value: 'other', label: 'Otro motivo' },
];

interface ReportClaimDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  assignmentId: string;
}

export function ReportClaimDialog({ open, onClose, leadId, assignmentId }: ReportClaimDialogProps) {
  const { data: lawfirm } = useLawfirmProfile();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOther = reason === 'other';
  const canSubmit = reason && (!isOther || detail.trim().length > 10) && (detail.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || !lawfirm?.id) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('lead_claims' as any)
        .insert({
          lead_id: leadId,
          lawfirm_id: lawfirm.id,
          assignment_id: assignmentId,
          claim_reason: reason,
          reason_detail: detail.trim() || null,
        });

      if (error) throw error;

      // Update assignment status to quality review
      await supabase
        .from('lead_assignments')
        .update({ firm_status: 'quality_review' })
        .eq('id', assignmentId);

      toast.success('Incidencia reportada correctamente. Nuestro equipo la revisará.');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case'] });
      onClose();
      setReason('');
      setDetail('');
    } catch (err) {
      toast.error('Error al enviar la incidencia');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Reportar Incidencia
          </DialogTitle>
          <DialogDescription>
            Si has detectado un problema con este lead, indícanos el motivo. Nuestro equipo revisará la incidencia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Motivo de la reclamación *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Comentario detallado {isOther ? '*' : ''}
            </Label>
            <Textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Describe la incidencia con el mayor detalle posible..."
              rows={4}
              className="resize-none"
              maxLength={2000}
            />
            {isOther && detail.trim().length < 11 && detail.trim().length > 0 && (
              <p className="text-xs text-destructive">Mínimo 10 caracteres para motivo "Otro"</p>
            )}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Al enviar esta incidencia, el caso pasará a estado "En revisión de calidad". 
              Nuestro equipo evaluará la reclamación y te notificará la resolución.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
            Enviar incidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
