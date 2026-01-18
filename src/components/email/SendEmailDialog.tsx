import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSendEmail, useEmailTemplates } from '@/hooks/useEmailSettings';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    structured_fields: Record<string, unknown> | null;
    case_summary?: string | null;
    score_final?: number | null;
    price_final?: number | null;
    source_channel?: string | null;
  };
}

export function SendEmailDialog({ open, onOpenChange, lead }: SendEmailDialogProps) {
  const { data: templates } = useEmailTemplates();
  const sendMutation = useSendEmail();

  const [recipient, setRecipient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('lead_derivation');
  const [includeIntro, setIncludeIntro] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  const f = lead.structured_fields || {};
  const nombre = `${(f.nombre as string) || ''} ${(f.apellidos as string) || ''}`.trim();

  const getPreview = () => {
    const template = templates?.find(t => t.template_key === selectedTemplate);
    if (!template) return { subject: '', body: '' };

    let subject = template.subject;
    let body = template.body_html;

    const variables: Record<string, string> = {
      nombre_cliente: nombre || 'Sin nombre',
      telefono: (f.telefono as string) || 'No disponible',
      email: (f.email as string) || 'No disponible',
      ciudad: (f.ciudad as string) || '',
      provincia: (f.provincia as string) || '',
      area_legal: (f.area_legal as string) || 'No especificada',
      resumen_caso: includeSummary && lead.case_summary ? lead.case_summary : 'Sin resumen',
      link_caso: `${window.location.origin}/despacho/casos/${lead.id}`,
      score: lead.score_final?.toString() || 'N/A',
      precio: lead.price_final?.toString() || 'N/A',
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  };

  const preview = getPreview();

  const handleSend = async () => {
    if (!recipient) {
      toast.error('Introduce un email de destino');
      return;
    }

    const variables: Record<string, string> = {
      nombre_cliente: nombre || 'Sin nombre',
      telefono: (f.telefono as string) || 'No disponible',
      email: (f.email as string) || 'No disponible',
      ciudad: (f.ciudad as string) || '',
      provincia: (f.provincia as string) || '',
      area_legal: (f.area_legal as string) || 'No especificada',
      resumen_caso: includeSummary && lead.case_summary ? lead.case_summary : 'Sin resumen',
      link_caso: `${window.location.origin}/despacho/casos/${lead.id}`,
      score: lead.score_final?.toString() || 'N/A',
      precio: lead.price_final?.toString() || 'N/A',
    };

    try {
      await sendMutation.mutateAsync({
        to: recipient,
        template_key: selectedTemplate,
        variables,
        lead_id: lead.id,
      });
      toast.success('Email enviado correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al enviar el email');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar caso por email
          </DialogTitle>
          <DialogDescription>
            Envía la información del lead a un despacho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">Destinatario</Label>
            <Input
              id="recipient"
              type="email"
              placeholder="email@despacho.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template">Plantilla</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t.template_key} value={t.template_key}>
                    {t.template_key === 'lead_derivation' ? 'Derivación de lead a despacho' : 
                     t.template_key === 'new_case_notification' ? 'Notificación de nuevo caso' : 
                     t.template_key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeSummary" 
                checked={includeSummary}
                onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
              />
              <Label htmlFor="includeSummary" className="text-sm">Incluir resumen completo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeIntro" 
                checked={includeIntro}
                onCheckedChange={(checked) => setIncludeIntro(checked as boolean)}
              />
              <Label htmlFor="includeIntro" className="text-sm">Frase introductoria formal</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="border rounded-lg p-3 bg-muted/50 max-h-[200px] overflow-y-auto">
              <p className="font-medium text-sm mb-2">Asunto: {preview.subject}</p>
              <div 
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.body) }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Enviar email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
