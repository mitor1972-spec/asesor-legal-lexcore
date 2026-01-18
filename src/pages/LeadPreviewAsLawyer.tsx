import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useLead } from '@/hooks/useLeads';
import { useLexcoreRuns } from '@/hooks/useLexcoreRuns';
import { useLegalHelp, useGenerateLegalHelp } from '@/hooks/useLegalHelp';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  RefreshCw,
  Copy,
  FileText,
  MessageSquare,
  History,
  Sparkles,
  AlertTriangle,
  Eye,
  ShieldAlert
} from 'lucide-react';

// Mock lawfirm ID for preview mode
const PREVIEW_LAWFIRM_ID = '00000000-0000-0000-0000-000000000000';

export default function LeadPreviewAsLawyer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading: isLoadingLead } = useLead(id);
  const { data: lexcoreRuns } = useLexcoreRuns(id);
  
  // For preview, we'll generate legal help with a special preview context
  const { data: legalHelp, isLoading: isLoadingHelp } = useLegalHelp(id);
  const generateLegalHelp = useGenerateLegalHelp();

  const [notes, setNotes] = useState('');

  const latestRun = lexcoreRuns?.[0];

  const handleGenerateLegalHelp = async () => {
    if (!id) return;
    
    try {
      await generateLegalHelp.mutateAsync({ leadId: id });
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

  const handleBackToAdmin = () => {
    navigate(`/leads/${id}`);
  };

  if (isLoadingLead) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead no encontrado</p>
        <Link to="/leads" className="text-primary hover:underline mt-2 inline-block">
          Volver a leads
        </Link>
      </div>
    );
  }

  const fields = lead.structured_fields as Record<string, string> | null;
  const score = lead.score_final || 0;
  const caseSummary = (lead as { case_summary?: string }).case_summary;

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Preview Banner - Fixed at top */}
      <div className="sticky top-0 z-50 bg-warning text-warning-foreground py-3 px-4 flex items-center justify-between shadow-lg -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5" />
          <span className="font-semibold">
            ⚠️ MODO PREVIEW — Estás viendo este caso como lo vería el abogado
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleBackToAdmin}
          className="bg-white/20 hover:bg-white/30 border-white/30 text-warning-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver como administrador
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Vista del Despacho</Badge>
            </div>
            <h1 className="text-2xl font-display font-bold">
              {fields?.nombre || 'Cliente'} — {fields?.area_legal || 'Caso'}
            </h1>
            <p className="text-muted-foreground">
              {fields?.provincia || 'España'} • Recibido {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          <Badge variant="secondary" className="self-start">
            Recibido
          </Badge>
        </div>
      </div>

      {/* Content - Max width container */}
      <div className="max-w-4xl mx-auto space-y-6 mt-6">
        {/* Temperature & Info - WITHOUT internal price */}
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
                  <p className="font-semibold">{lead.price_final || 0}€</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Canal</p>
                  <p className="font-semibold">{lead.source_channel || 'Web'}</p>
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
                {caseSummary ? (
                  <div 
                    className="whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ 
                      __html: caseSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') 
                    }} 
                  />
                ) : (
                  <p className="text-muted-foreground">No hay resumen disponible</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Help Tab */}
          <TabsContent value="legal-help" className="mt-4">
            <Card className="shadow-soft border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
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
                  placeholder="Las notas del despacho aparecerían aquí..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  disabled
                  className="opacity-70"
                />
                <p className="text-sm text-muted-foreground italic">
                  (En modo preview, las notas no se guardan)
                </p>
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
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium">Caso recibido</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Banner */}
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-warning" />
                <span className="text-sm">
                  Esta es la vista que tendría el abogado al recibir este caso
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBackToAdmin}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al panel interno
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
