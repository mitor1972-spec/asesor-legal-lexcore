import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLead, useUpdateLead, useLeadHistory } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Clock, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { LexcoreScoring } from '@/components/scoring/LexcoreScoring';

const statusColors: Record<LeadStatus, string> = {
  'Pendiente': 'bg-warning/10 text-warning border-warning/20',
  'Derivado': 'bg-primary/10 text-primary border-primary/20',
  'Facturado': 'bg-success/10 text-success border-success/20',
  'Cerrado': 'bg-muted text-muted-foreground border-border',
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const { data: history } = useLeadHistory(id);
  const updateMutation = useUpdateLead();

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, status_internal: newStatus });
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!lead) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Lead no encontrado</p></div>;

  const f = lead.structured_fields;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-display font-bold">Lead #{lead.id.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground">{format(new Date(lead.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Score and Price badges */}
          {lead.score_final !== null && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Score: {lead.score_final}
              </Badge>
              <Badge variant="outline" className="font-mono bg-green-500/10 text-green-600 border-green-500/20">
                {lead.price_final}€
              </Badge>
            </div>
          )}
          <Select value={lead.status_internal} onValueChange={v => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button asChild variant="outline"><Link to={`/leads/${id}/edit`}><Pencil className="mr-2 h-4 w-4" />Editar</Link></Button>
        </div>
      </div>

      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Scoring
            {lead.score_final !== null && (
              <Badge variant="secondary" className="ml-1 text-xs">{lead.score_final}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Contacto</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Nombre:</strong> {f?.nombre || '-'} {f?.apellidos || ''}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{f?.telefono || '-'}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{f?.email || '-'}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{f?.ciudad || '-'}, {f?.provincia || '-'}</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Caso</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Área:</strong> {f?.area_legal || '-'}</p>
                <p><strong>Subárea:</strong> {f?.subarea || '-'}</p>
                <p><strong>Cuantía:</strong> {f?.cuantia ? `${f.cuantia.toLocaleString()}€` : '-'}</p>
                <p><strong>Urgencia:</strong> {f?.urgencia_aplica ? <Badge variant="outline" className="bg-destructive/10 text-destructive">{f?.urgencia_nivel}</Badge> : 'No'}</p>
                <p><strong>Canal:</strong> <Badge variant="outline">{lead.source_channel}</Badge></p>
              </CardContent>
            </Card>
          </div>
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Texto del Lead</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed">{lead.lead_text}</p></CardContent>
          </Card>
          {f?.notas_operador && (
            <Card className="shadow-soft">
              <CardHeader><CardTitle>Notas del Operador</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm">{f.notas_operador}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scoring">
          <LexcoreScoring lead={lead} />
        </TabsContent>

        <TabsContent value="historial">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Historial de cambios</CardTitle></CardHeader>
            <CardContent>
              {history?.length === 0 ? <p className="text-muted-foreground text-sm">Sin historial</p> : (
                <div className="space-y-4">
                  {history?.map((h: any) => (
                    <div key={h.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{h.action}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(h.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
