import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Mail, MessageCircle, Link as LinkIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientName?: string | null;
}

export function UploadLinkDialog({ open, onOpenChange, leadId, clientEmail, clientPhone, clientName }: Props) {
  const qc = useQueryClient();
  const { data: profile } = useLawfirmProfile();
  const [maxFiles, setMaxFiles] = useState(20);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [clientMessage, setClientMessage] = useState(
    `Hola${clientName ? ` ${clientName}` : ''}, por favor sube los documentos relacionados con tu caso a través de este enlace seguro.`
  );

  const { data: links, isLoading } = useQuery({
    queryKey: ['upload-links', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_upload_links' as any)
        .select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open && !!leadId,
  });

  const buildPublicUrl = (token: string) => `${window.location.origin}/upload/${token}`;

  const createLink = useMutation({
    mutationFn: async () => {
      const expires_at = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from('case_upload_links' as any).insert({
        lead_id: leadId,
        lawfirm_id: profile?.id,
        max_files: maxFiles,
        expires_at,
        client_message: clientMessage.trim() || null,
        is_active: true,
      }).select().single();
      if (error) throw error;
      // Timeline event
      await supabase.from('case_timeline_events' as any).insert({
        lead_id: leadId,
        lawfirm_id: profile?.id,
        event_type: 'docs_requested',
        title: 'Enlace de subida generado para el cliente',
        description: `Caduca el ${new Date(expires_at).toLocaleDateString('es-ES')} · ${maxFiles} archivos máx`,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Enlace generado');
      qc.invalidateQueries({ queryKey: ['upload-links', leadId] });
      qc.invalidateQueries({ queryKey: ['case-timeline', leadId] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al generar enlace'),
  });

  const deactivateLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('case_upload_links' as any)
        .update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Enlace desactivado');
      qc.invalidateQueries({ queryKey: ['upload-links', leadId] });
    },
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Enlace copiado');
  };

  const sendEmail = (token: string) => {
    if (!clientEmail) return toast.error('No hay email del cliente');
    const url = buildPublicUrl(token);
    const subject = encodeURIComponent('Enlace seguro para subir documentación');
    const body = encodeURIComponent(`${clientMessage}\n\n${url}`);
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const sendWhatsapp = (token: string) => {
    if (!clientPhone) return toast.error('No hay teléfono del cliente');
    const url = buildPublicUrl(token);
    const phone = clientPhone.replace(/\D/g, '');
    const text = encodeURIComponent(`${clientMessage}\n\n${url}`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Solicitar documentación al cliente</DialogTitle>
          <DialogDescription>
            Genera un enlace seguro con caducidad para que tu cliente suba documentos sin necesidad de cuenta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Caducidad (días)</Label>
              <Input type="number" min={1} max={90} value={expiresInDays}
                onChange={e => setExpiresInDays(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Máximo de archivos</Label>
              <Input type="number" min={1} max={100} value={maxFiles}
                onChange={e => setMaxFiles(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Mensaje para el cliente</Label>
            <Textarea rows={3} value={clientMessage} onChange={e => setClientMessage(e.target.value)} />
          </div>
          <Button onClick={() => createLink.mutate()} disabled={createLink.isPending} className="w-full">
            {createLink.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <LinkIcon className="h-4 w-4 mr-2" />Generar nuevo enlace
          </Button>

          {/* Active links */}
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Enlaces existentes</p>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
            {!isLoading && !links?.length && (
              <p className="text-xs text-muted-foreground text-center py-3">Aún no hay enlaces para este caso.</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {links?.map(link => {
                const url = buildPublicUrl(link.token);
                const expired = new Date(link.expires_at) < new Date();
                const exhausted = link.used_count >= link.max_files;
                const inactive = !link.is_active || expired || exhausted;
                return (
                  <div key={link.id} className={`p-2.5 border rounded-lg space-y-2 ${inactive ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        Creado {format(new Date(link.created_at), "dd MMM HH:mm", { locale: es })}
                        · Caduca {format(new Date(link.expires_at), "dd MMM yyyy", { locale: es })}
                        · {link.used_count}/{link.max_files} subidos
                      </span>
                      {!inactive && (
                        <Button size="sm" variant="ghost" onClick={() => deactivateLink.mutate(link.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <code className="block text-xs bg-muted p-1.5 rounded break-all whitespace-normal">{url}</code>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => copy(url)}>
                        <Copy className="h-3 w-3 mr-1" />Copiar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => sendEmail(link.token)} disabled={!clientEmail}>
                        <Mail className="h-3 w-3 mr-1" />Email
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => sendWhatsapp(link.token)} disabled={!clientPhone}>
                        <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                      </Button>
                      {inactive && <span className="text-xs text-destructive self-center">
                        {expired ? 'Caducado' : exhausted ? 'Agotado' : 'Desactivado'}
                      </span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
