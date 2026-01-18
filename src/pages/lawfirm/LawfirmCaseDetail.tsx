import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLawfirmCase, useUpdateCaseStatus, useUpdateCaseNotes, useCloseCaseResult } from '@/hooks/useLawfirmCases';
import { useLegalHelp, useGenerateLegalHelp } from '@/hooks/useLegalHelp';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Copy,
  FileText,
  MessageSquare,
  History,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  received: 'Recibido',
  reviewing: 'Revisando',
  contacted: 'Contactado',
  in_progress: 'En curso',
  won: 'Ganado',
  lost: 'Perdido',
  rejected: 'Rechazado',
  archived: 'Archivado',
};

export default function LawfirmCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: caseData, isLoading } = useLawfirmCase(id);
  const { data: legalHelp, isLoading: isLoadingHelp } = useLegalHelp(caseData?.lead_id);
  const generateLegalHelp = useGenerateLegalHelp();
  const updateStatus = useUpdateCaseStatus();
  const updateNotes = useUpdateCaseNotes();
  const closeCase = useCloseCaseResult();

  const [notes, setNotes] = useState('');
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);

  // Load notes when case data arrives
  if (caseData && !isNotesLoaded) {
    setNotes(caseData.firm_notes || '');
    setIsNotesLoaded(true);
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    
    try {
      await updateStatus.mutateAsync({
        assignmentId: id,
        firmStatus: newStatus,
        contactedAt: newStatus === 'contacted' ? new Date().toISOString() : undefined
      });
      toast.success('Estado actualizado');
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    
    try {
      await updateNotes.mutateAsync({ assignmentId: id, firmNotes: notes });
      toast.success('Notas guardadas');
    } catch (error) {
      toast.error('Error al guardar notas');
    }
  };

  const handleMarkContacted = async () => {
    if (!id) return;
    
    try {
      await updateStatus.mutateAsync({
        assignmentId: id,
        firmStatus: 'contacted',
        contactedAt: new Date().toISOString()
      });
      toast.success('Marcado como contactado');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleCloseWon = async () => {
    if (!id) return;
    
    try {
      await closeCase.mutateAsync({ assignmentId: id, firmStatus: 'won' });
      toast.success('Caso cerrado como ganado');
    } catch (error) {
      toast.error('Error al cerrar caso');
    }
  };

  const handleReject = async () => {
    if (!id) return;
    
    try {
      await closeCase.mutateAsync({ assignmentId: id, firmStatus: 'rejected' });
      toast.success('Caso rechazado');
    } catch (error) {
      toast.error('Error al rechazar caso');
    }
  };

  const handleGenerateLegalHelp = async () => {
    if (!caseData?.lead_id) return;
    
    try {
      await generateLegalHelp.mutateAsync({ leadId: caseData.lead_id });
      toast.success('Ayuda legal generada correctamente');
    } catch (error) {
      toast.error('Error al generar ayuda legal');
    }
  };

  const handleCopyLegalHelp = () => {
    if (!legalHelp) return;
    
    const text = `
ORIENTACIÓN LEGAL
${legalHelp.legal_orientation}

DOCUMENTACIÓN A SOLICITAR
${legalHelp.documentation_needed}

PRÓXIMOS PASOS COMERCIALES
${legalHelp.commercial_next_steps}

PRÓXIMOS PASOS JURÍDICOS
${legalHelp.legal_next_steps}

RIESGOS Y ALERTAS
${legalHelp.risks_alerts}

COMPLEJIDAD ESTIMADA
${legalHelp.estimated_complexity}
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success('Ayuda legal copiada al portapapeles');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Caso no encontrado</p>
        <Link to="/despacho/casos" className="text-lawfirm-primary hover:underline mt-2 inline-block">
          Volver a casos
        </Link>
      </div>
    );
  }

  const fields = caseData.lead?.structured_fields as Record<string, string> | null;
  const score = caseData.lead?.score_final || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          to="/despacho/casos" 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a casos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">
              {fields?.nombre || 'Cliente'} — {fields?.area_legal || 'Caso'}
            </h1>
            <p className="text-muted-foreground">
              {fields?.provincia || 'España'} • Recibido {format(new Date(caseData.assigned_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select value={caseData.firm_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Recibido</SelectItem>
                <SelectItem value="reviewing">Revisando</SelectItem>
                <SelectItem value="contacted">Contactado</SelectItem>
                <SelectItem value="in_progress">En curso</SelectItem>
                <SelectItem value="won">Ganado</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Temperature & Info */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <LeadTemperature 
                score={score} 
                structuredFields={fields || {}}
                variant="full" 
              />
            </div>
            <div className="md:w-2/3 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Precio del lead</p>
                <p className="font-semibold">{caseData.lead?.price_final || 0}€</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canal</p>
                <p className="font-semibold">{caseData.lead?.source_channel || 'Web'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-semibold">{fields?.telefono || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{fields?.email || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horario contacto</p>
                <p className="font-semibold">{fields?.horario_contacto || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgencia</p>
                <p className="font-semibold">{fields?.urgencia_nivel || 'No especificada'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">
            <FileText className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="legal-help">
            <Sparkles className="h-4 w-4 mr-2" />
            Ayuda Legal
          </TabsTrigger>
          <TabsTrigger value="notes">
            <MessageSquare className="h-4 w-4 mr-2" />
            Notas
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Resumen del Caso</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              {caseData.lead?.case_summary ? (
                <div 
                  className="whitespace-pre-wrap" 
                  dangerouslySetInnerHTML={{ 
                    __html: caseData.lead.case_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') 
                  }} 
                />
              ) : (
                <p className="text-muted-foreground">No hay resumen disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Help Tab - KEY FEATURE */}
        <TabsContent value="legal-help" className="mt-4">
          <Card className="shadow-soft border-lawfirm-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-lawfirm-primary" />
                Orientación para el Abogado
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLegalHelp}
                  disabled={generateLegalHelp.isPending}
                >
                  {generateLegalHelp.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {legalHelp ? 'Regenerar' : 'Generar'}
                </Button>
                {legalHelp && (
                  <Button variant="outline" size="sm" onClick={handleCopyLegalHelp}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar todo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHelp ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : legalHelp ? (
                <div className="space-y-6">
                  {/* Legal Orientation */}
                  <section>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      1) Orientación Legal
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ 
                        __html: (legalHelp.legal_orientation || '').replace(/\n/g, '<br/>').replace(/•/g, '&#8226;') 
                      }} />
                    </div>
                  </section>

                  {/* Documentation */}
                  <section>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      2) Documentación a Solicitar
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ 
                        __html: (legalHelp.documentation_needed || '').replace(/\n/g, '<br/>').replace(/•/g, '&#8226;') 
                      }} />
                    </div>
                  </section>

                  {/* Commercial Steps */}
                  <section>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      3) Próximos Pasos Comerciales
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ 
                        __html: (legalHelp.commercial_next_steps || '').replace(/\n/g, '<br/>').replace(/•/g, '&#8226;') 
                      }} />
                    </div>
                  </section>

                  {/* Legal Steps */}
                  <section>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      4) Próximos Pasos Jurídicos
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ 
                        __html: (legalHelp.legal_next_steps || '').replace(/\n/g, '<br/>').replace(/•/g, '&#8226;') 
                      }} />
                    </div>
                  </section>

                  {/* Risks */}
                  <section>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      5) Riesgos y Alertas
                    </h3>
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ 
                        __html: (legalHelp.risks_alerts || '').replace(/\n/g, '<br/>').replace(/⚠️/g, '⚠️ ') 
                      }} />
                    </div>
                  </section>

                  {/* Complexity */}
                  <section>
                    <h3 className="font-semibold text-lg mb-2">Complejidad Estimada</h3>
                    <Badge variant="secondary" className="text-sm">
                      {legalHelp.estimated_complexity}
                    </Badge>
                  </section>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    La orientación legal aún no ha sido generada para este caso
                  </p>
                  <Button onClick={handleGenerateLegalHelp} disabled={generateLegalHelp.isPending}>
                    {generateLegalHelp.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generar Ayuda Legal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Añade notas privadas sobre este caso..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
              />
              <Button 
                onClick={handleSaveNotes} 
                disabled={updateNotes.isPending}
              >
                {updateNotes.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar notas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Historial del Caso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="w-2 h-2 rounded-full bg-lawfirm-primary mt-2" />
                  <div>
                    <p className="font-medium">Caso recibido</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(caseData.assigned_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                {caseData.contacted_at && (
                  <div className="flex items-start gap-3 pb-4 border-b">
                    <div className="w-2 h-2 rounded-full bg-success mt-2" />
                    <div>
                      <p className="font-medium">Cliente contactado</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(caseData.contacted_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={handleMarkContacted}
              disabled={updateStatus.isPending || caseData.firm_status === 'contacted'}
            >
              <Phone className="h-4 w-4 mr-2" />
              Marcar como contactado
            </Button>
            <Button 
              variant="default"
              className="bg-success hover:bg-success/90"
              onClick={handleCloseWon}
              disabled={closeCase.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Cerrar ganado
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={closeCase.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
