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
import { ScoringHeader } from '@/components/lead/ScoringHeader';
import { processAndSanitize } from '@/lib/sanitize';
import { formatLocation } from '@/lib/cityProvinceMapping';
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
  ShieldAlert,
  User,
  Phone,
  Mail,
  MapPin,
  Scale,
  Euro,
  Zap,
  Inbox
} from 'lucide-react';

export default function LeadPreviewAsLawyer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading: isLoadingLead } = useLead(id);
  const { data: lexcoreRuns } = useLexcoreRuns(id);
  
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

  const fields = lead.structured_fields as Record<string, unknown> | null;
  const f = fields || {};
  const score = lead.score_final || 0;
  const caseSummary = (lead as { case_summary?: string }).case_summary;
  
  // Location with auto-province detection
  const ciudad = f.ciudad as string | undefined;
  const provincia = f.provincia as string | undefined;
  const location = formatLocation(ciudad, provincia);

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Preview Banner - Fixed at top */}
      <div className="sticky top-0 z-50 bg-warning text-warning-foreground py-3 px-4 flex items-center justify-between shadow-lg -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
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

      {/* Content - Max width container */}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Vista del Despacho</Badge>
            </div>
            <h1 className="text-xl font-display font-bold">
              {f.nombre as string || 'Cliente'} — {f.area_legal as string || 'Caso'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {location || 'España'} • Recibido {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
          <Badge variant="secondary" className="self-start">
            Recibido
          </Badge>
        </div>

        {/* ROW 1: TEMPERATURA DEL LEAD */}
        <LeadTemperature 
          score={score} 
          structuredFields={f}
          variant="full" 
        />

        {/* ROW 2: VALORACIÓN DEL LEAD - LEXCORE™ */}
        <ScoringHeader 
          scoreFinal={lead.score_final}
          priceFinal={lead.price_final}
          latestRun={latestRun}
          sourceChannel={lead.source_channel || undefined}
        />

        {/* ROW 3: CONTACTO + CASO (side by side) */}
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm py-2 px-3">
              <p><strong>Nombre:</strong> {(f.nombre as string) || ''} {(f.apellidos as string) || ''}</p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Teléfono:</strong> {(f.telefono as string) || ''}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Email:</strong> {(f.email as string) || ''}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Ubicación:</strong> {location}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-3.5 w-3.5" />
                Caso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm py-2 px-3">
              <p className="flex items-center gap-2">
                <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Área:</strong> {(f.area_legal as string) || ''}
              </p>
              <p><strong>Subárea:</strong> {(f.subarea as string) || ''}</p>
              <p className="flex items-center gap-2">
                <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Cuantía:</strong> {(f.cuantia as number) ? `${(f.cuantia as number).toLocaleString()}€` : ''}
              </p>
              <p className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Urgencia:</strong> {(f.urgencia_aplica as boolean) ? <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs py-0">{(f.urgencia_nivel as string) || 'Sí'}</Badge> : ''}
              </p>
              <p className="flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>Canal:</strong> {lead.source_channel ? <Badge variant="outline" className="text-xs py-0">{lead.source_channel}</Badge> : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ROW 4: Tabs */}
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
          <TabsContent value="summary" className="mt-3">
            <Card className="shadow-soft">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">Resumen del Caso</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert py-2 px-3">
                {caseSummary ? (
                  <div 
                    className="whitespace-pre-wrap text-sm" 
                    dangerouslySetInnerHTML={{ __html: processAndSanitize(caseSummary) }} 
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">No hay resumen disponible</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Help Tab */}
          <TabsContent value="legal-help" className="mt-3">
            <Card className="shadow-soft border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
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
              <CardContent className="py-2 px-3">
                {isLoadingHelp ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : legalHelp ? (
                  <div className="space-y-6">
                    {/* Complexity - moved to top */}
                    <section className="mb-6">
                      <h3 className="font-semibold text-sm mb-2">📊 Complejidad Estimada</h3>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {legalHelp.estimated_complexity}
                      </Badge>
                    </section>

                    {/* Legal Orientation */}
                    <section className="mb-6">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        1) Orientación Legal
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert space-y-2">
                        <div dangerouslySetInnerHTML={{ __html: processAndSanitize(legalHelp.legal_orientation) }} />
                      </div>
                    </section>

                    {/* Documentation */}
                    <section className="mb-6">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        2) Documentación a Solicitar
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert space-y-2">
                        <div dangerouslySetInnerHTML={{ __html: processAndSanitize(legalHelp.documentation_needed) }} />
                      </div>
                    </section>

                    {/* Commercial Steps */}
                    <section className="mb-6">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        3) Próximos Pasos Comerciales
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert space-y-2">
                        <div dangerouslySetInnerHTML={{ __html: processAndSanitize(legalHelp.commercial_next_steps) }} />
                      </div>
                    </section>

                    {/* Legal Steps */}
                    <section className="mb-6">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        4) Próximos Pasos Jurídicos
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert space-y-2">
                        <div dangerouslySetInnerHTML={{ __html: processAndSanitize(legalHelp.legal_next_steps) }} />
                      </div>
                    </section>

                    {/* Risks */}
                    <section className="mb-6">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        5) Riesgos y Alertas
                      </h3>
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert space-y-2">
                        <div dangerouslySetInnerHTML={{ __html: processAndSanitize(legalHelp.risks_alerts) }} />
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm mb-3">
                      La orientación legal aún no ha sido generada para este caso
                    </p>
                    <Button size="sm" onClick={handleGenerateLegalHelp} disabled={generateLegalHelp.isPending}>
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
          <TabsContent value="notes" className="mt-3">
            <Card className="shadow-soft">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">Notas Internas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-2 px-3">
                <Textarea
                  placeholder="Las notas del despacho aparecerían aquí..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  disabled
                  className="opacity-70"
                />
                <p className="text-xs text-muted-foreground italic">
                  (En modo preview, las notas no se guardan)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-3">
            <Card className="shadow-soft">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">Historial del Caso</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="font-medium text-sm">Caso recibido</p>
                      <p className="text-xs text-muted-foreground">
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
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-warning" />
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
