import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLawfirmCase, useUpdateCaseStatus, useUpdateCaseNotes } from '@/hooks/useLawfirmCases';
import { useLegalHelp, useGenerateLegalHelp } from '@/hooks/useLegalHelp';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { ScoringHeader } from '@/components/lead/ScoringHeader';
import { CaseTrackingTab } from '@/components/lawfirm/CaseTrackingTab';
import { CaseDocumentsTab } from '@/components/lawfirm/CaseDocumentsTab';
import { CaseEconomicsSection } from '@/components/lawfirm/CaseEconomicsSection';
import { CaseResultDialog } from '@/components/lawfirm/CaseResultDialog';
import { processAndSanitize } from '@/lib/sanitize';
import { formatLocation } from '@/lib/cityProvinceMapping';
import { getDisplayName, getContactPhone, getContactEmail, getChatwootAlias } from '@/lib/contactUtils';
import { format, differenceInDays } from 'date-fns';
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
  AlertTriangle,
  User,
  Mail,
  MapPin,
  Scale,
  Euro,
  Zap,
  Inbox,
  ClipboardList,
  Calendar,
  Hash,
  FolderOpen,
  Calculator,
  ShieldAlert
} from 'lucide-react';
import { ReportClaimDialog } from '@/components/lawfirm/ReportClaimDialog';

// More detailed status labels for lawyers
const statusLabels: Record<string, string> = {
  received: 'Nuevo',
  reviewing: 'Revisando',
  contacted: 'Contactado',
  negotiation: 'En negociación',
  pending_docs: 'Documentación pendiente',
  in_progress: 'En curso',
  quality_review: 'En revisión calidad',
  invalidated: 'Invalidado por calidad',
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

  const [notes, setNotes] = useState('');
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultType, setResultType] = useState<'won' | 'lost'>('won');
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

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

  const handleOpenResult = (type: 'won' | 'lost') => {
    setResultType(type);
    setResultDialogOpen(true);
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

  const fields = caseData.lead?.structured_fields as Record<string, unknown> | null;
  const f = fields || {};
  const score = caseData.lead?.score_final || 0;
  
  // Location with auto-province detection
  const ciudad = f.ciudad as string | undefined;
  const provincia = f.provincia as string | undefined;
  const location = formatLocation(ciudad, provincia);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link 
          to="/despacho/casos" 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground w-fit text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a casos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-bold">
              {f.nombre as string || 'Cliente'} — {f.area_legal as string || 'Caso'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {location || 'España'} • Recibido {format(new Date(caseData.assigned_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Report claim button - only within 7 days of purchase and not commission */}
            {(() => {
              const daysSincePurchase = differenceInDays(new Date(), new Date(caseData.assigned_at));
              const canClaim = daysSincePurchase <= 7 && !(caseData as any).is_commission && caseData.firm_status !== 'quality_review' && caseData.firm_status !== 'invalidated';
              if (canClaim) {
                return (
                  <Button variant="outline" size="sm" onClick={() => setClaimDialogOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                    Reportar incidencia
                  </Button>
                );
              }
              if (caseData.firm_status === 'quality_review') {
                return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">En revisión calidad</Badge>;
              }
              return null;
            })()}
            <Select value={caseData.firm_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
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

      {/* ROW 1: TEMPERATURA DEL LEAD */}
      <LeadTemperature 
        score={score} 
        structuredFields={f}
        variant="full" 
      />

      {/* ROW 2: VALORACIÓN DEL LEAD - LEXCORE™ */}
      <ScoringHeader 
        scoreFinal={caseData.lead?.score_final || null}
        priceFinal={caseData.lead?.price_final || null}
        sourceChannel={caseData.lead?.source_channel || undefined}
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
            <p><strong>Nombre:</strong> {getDisplayName(f) || <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <strong>Teléfono:</strong> {getContactPhone(f) || <span className="text-muted-foreground">—</span>}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <strong>Email:</strong> {getContactEmail(f) || <span className="text-muted-foreground">—</span>}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <strong>Ubicación:</strong> {location || <span className="text-muted-foreground">—</span>}
            </p>
            {getChatwootAlias(f) && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>ID Chatwoot:</span> <code className="bg-muted px-1.5 py-0.5 rounded">{getChatwootAlias(f)}</code>
              </p>
            )}
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
              <strong>Canal:</strong> {caseData.lead?.source_channel ? <Badge variant="outline" className="text-xs py-0">{caseData.lead.source_channel}</Badge> : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Economics Section */}
      <CaseEconomicsSection
        assignmentId={id!}
        leadPrice={caseData.lead?.price_final || null}
        firmStatus={caseData.firm_status}
        initialData={{
          lead_cost: (caseData as any).lead_cost,
          client_fee: (caseData as any).client_fee,
          success_percentage: (caseData as any).success_percentage,
          claimed_amount: (caseData as any).claimed_amount,
          fee_accepted_at: (caseData as any).fee_accepted_at,
          won_amount: (caseData as any).won_amount,
          won_percentage: (caseData as any).won_percentage,
        }}
      />

      {/* ROW 5: Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="summary">
            <FileText className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FolderOpen className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="legal-help">
            <Sparkles className="h-4 w-4 mr-2" />
            Ayuda Legal
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <ClipboardList className="h-4 w-4 mr-2" />
            Seguimiento
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
              {caseData.lead?.case_summary ? (
                <div 
                  className="whitespace-pre-wrap text-sm" 
                  dangerouslySetInnerHTML={{ __html: processAndSanitize(caseData.lead.case_summary) }} 
                />
              ) : (
                <p className="text-muted-foreground text-sm">No hay resumen disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-3">
          {caseData.lead_id && <CaseDocumentsTab leadId={caseData.lead_id} />}
        </TabsContent>

        {/* Legal Help Tab - KEY FEATURE */}
        <TabsContent value="legal-help" className="mt-3">
          <Card className="shadow-soft border-lawfirm-primary/20">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-lawfirm-primary" />
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

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="mt-3">
          {caseData.lead_id && <CaseTrackingTab leadId={caseData.lead_id} />}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-3">
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-2 px-3">
              <Textarea
                placeholder="Añade notas privadas sobre este caso..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              <Button 
                size="sm"
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
        <TabsContent value="history" className="mt-3">
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">Historial del Caso</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="w-1.5 h-1.5 rounded-full bg-lawfirm-primary mt-1.5" />
                  <div>
                    <p className="font-medium text-sm">Caso recibido</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(caseData.assigned_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                {caseData.contacted_at && (
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5" />
                    <div>
                      <p className="font-medium text-sm">Cliente contactado</p>
                      <p className="text-xs text-muted-foreground">
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

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardContent className="py-3 px-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Acciones rápidas:</span>
            
            {!caseData.contacted_at && (
              <Button 
                size="sm" 
                onClick={handleMarkContacted}
                disabled={updateStatus.isPending}
              >
                <Phone className="h-4 w-4 mr-2" />
                Marcar contactado
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => handleOpenResult('won')}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Cerrar ganado
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => handleOpenResult('lost')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Perdido
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Dialog */}
      {id && (
        <CaseResultDialog
          open={resultDialogOpen}
          onOpenChange={setResultDialogOpen}
          assignmentId={id}
          type={resultType}
        />
      )}

      {/* Claim Dialog */}
      <ReportClaimDialog
        open={claimDialogOpen}
        onClose={() => setClaimDialogOpen(false)}
        leadId={caseData.lead_id}
        assignmentId={id!}
      />
    </div>
  );
}
