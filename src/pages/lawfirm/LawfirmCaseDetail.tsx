import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLawfirmCase, useUpdateCaseStatus, useUpdateCaseNotes } from '@/hooks/useLawfirmCases';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { ScoringHeader } from '@/components/lead/ScoringHeader';
import { CaseTrackingTab } from '@/components/lawfirm/CaseTrackingTab';
import { CaseDocumentsTab } from '@/components/lawfirm/CaseDocumentsTab';
import { CaseEconomicsSection } from '@/components/lawfirm/CaseEconomicsSection';
import { CaseEconomicSummary } from '@/components/lawfirm/CaseEconomicSummary';
import { CaseAITab } from '@/components/lawfirm/CaseAITab';
import { CaseResultDialog } from '@/components/lawfirm/CaseResultDialog';
import { ReportClaimDialog } from '@/components/lawfirm/ReportClaimDialog';
import { AssignCaseDialog } from '@/components/lawfirm/AssignCaseDialog';
import { processAndSanitize } from '@/lib/sanitize';
import { formatLocation } from '@/lib/cityProvinceMapping';
import { getDisplayName, getContactPhone, getContactEmail, getChatwootAlias } from '@/lib/contactUtils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ArrowLeft, Phone, CheckCircle2, XCircle, Loader2,
  User, Mail, MapPin, Scale, Euro, Zap, Inbox, Hash,
  FileText, FolderOpen, Sparkles, ClipboardList, MessageSquare, History,
  ShieldAlert, Calculator, UserCog, Clock, CheckSquare, Upload, Download
} from 'lucide-react';
import { OperationalStatusSelect, OperationalStatusBadge } from '@/components/lawfirm/OperationalStatusBadge';
import { useUpdateOperationalStatus } from '@/hooks/useCaseOperationalStatus';
import { CaseTimelineTab } from '@/components/lawfirm/CaseTimelineTab';
import { CaseTasksTab } from '@/components/lawfirm/CaseTasksTab';
import { CaseClientTab } from '@/components/lawfirm/CaseClientTab';

const statusLabels: Record<string, string> = {
  received: 'Nuevo', reviewing: 'Revisando', contacted: 'Contactado',
  negotiation: 'En negociación', pending_docs: 'Documentación pendiente',
  in_progress: 'En curso', quality_review: 'En revisión calidad',
  invalidated: 'Invalidado por calidad', won: 'Ganado', lost: 'Perdido',
  rejected: 'Rechazado', archived: 'Archivado',
};

export default function LawfirmCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: caseData, isLoading } = useLawfirmCase(id);
  const updateStatus = useUpdateCaseStatus();
  const updateNotes = useUpdateCaseNotes();
  const updateOperational = useUpdateOperationalStatus();

  const [notes, setNotes] = useState('');
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultType, setResultType] = useState<'won' | 'lost'>('won');
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  if (caseData && !isNotesLoaded) {
    setNotes(caseData.firm_notes || '');
    setIsNotesLoaded(true);
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({
        assignmentId: id, firmStatus: newStatus,
        contactedAt: newStatus === 'contacted' ? new Date().toISOString() : undefined,
      });
      toast.success('Estado actualizado');
    } catch { toast.error('Error al actualizar estado'); }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await updateNotes.mutateAsync({ assignmentId: id, firmNotes: notes });
      toast.success('Notas guardadas');
    } catch { toast.error('Error al guardar notas'); }
  };

  const handleMarkContacted = async () => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ assignmentId: id, firmStatus: 'contacted', contactedAt: new Date().toISOString() });
      toast.success('Marcado como contactado');
    } catch { toast.error('Error al actualizar'); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Caso no encontrado</p>
        <Link to="/despacho/casos" className="text-primary hover:underline mt-2 inline-block">Volver a casos</Link>
      </div>
    );
  }

  const fields = caseData.lead?.structured_fields as Record<string, unknown> | null;
  const f = fields || {};
  const score = caseData.lead?.score_final || 0;
  const ciudad = f.ciudad as string | undefined;
  const provincia = f.provincia as string | undefined;
  const location = formatLocation(ciudad, provincia);
  const isCommission = !!(caseData as any).is_commission;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link to="/despacho/casos" className="flex items-center gap-1 text-muted-foreground hover:text-foreground w-fit text-sm">
          <ArrowLeft className="h-4 w-4" />Volver a casos
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
            {(() => {
              const daysSincePurchase = differenceInDays(new Date(), new Date(caseData.assigned_at));
              const canClaim = daysSincePurchase <= 7 && !isCommission && caseData.firm_status !== 'quality_review' && caseData.firm_status !== 'invalidated';
              if (canClaim) {
                return (
                  <Button variant="outline" size="sm" onClick={() => setClaimDialogOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />Reportar incidencia
                  </Button>
                );
              }
              if (caseData.firm_status === 'quality_review') {
                return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">En revisión calidad</Badge>;
              }
              return null;
            })()}
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
              <UserCog className="mr-1.5 h-3.5 w-3.5" />
              {caseData.assigned_lawyer?.full_name || caseData.assigned_lawyer?.email || 'Asignar'}
            </Button>
            <Select value={caseData.firm_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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

      {/* Temperature & Scoring */}
      <LeadTemperature score={score} structuredFields={f} variant="full" />
      <ScoringHeader scoreFinal={caseData.lead?.score_final || null} priceFinal={caseData.lead?.price_final || null} sourceChannel={caseData.lead?.source_channel || undefined} />

      {/* Economic Summary Panel */}
      <CaseEconomicSummary
        leadCost={(caseData as any).lead_cost}
        clientFee={(caseData as any).client_fee}
        successPercentage={(caseData as any).success_percentage}
        claimedAmount={(caseData as any).claimed_amount}
        wonAmount={(caseData as any).won_amount}
        wonPercentage={(caseData as any).won_percentage}
        feeAcceptedAt={(caseData as any).fee_accepted_at}
        firmStatus={caseData.firm_status}
        isCommission={isCommission}
        commissionPercent={(caseData as any).commission_percent}
      />

      {/* Main Tabs: Datos, Economía, Documentos, IA, Seguimiento, Notas */}
      <Tabs defaultValue="datos">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="datos"><FileText className="h-4 w-4 mr-1.5" />Datos</TabsTrigger>
          <TabsTrigger value="economia"><Euro className="h-4 w-4 mr-1.5" />Economía</TabsTrigger>
          <TabsTrigger value="documents"><FolderOpen className="h-4 w-4 mr-1.5" />Documentos</TabsTrigger>
          <TabsTrigger value="ia"><Sparkles className="h-4 w-4 mr-1.5" />IA</TabsTrigger>
          <TabsTrigger value="tracking"><ClipboardList className="h-4 w-4 mr-1.5" />Seguimiento</TabsTrigger>
          <TabsTrigger value="notes"><MessageSquare className="h-4 w-4 mr-1.5" />Notas</TabsTrigger>
        </TabsList>

        {/* DATOS TAB */}
        <TabsContent value="datos" className="mt-3 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="shadow-soft">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5" />Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm py-2 px-3">
                <p><strong>Nombre:</strong> {getDisplayName(f) || '—'}</p>
                {f.apellidos && <p><strong>Apellidos:</strong> {f.apellidos as string}</p>}
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><strong>Teléfono:</strong> {getContactPhone(f) || '—'}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><strong>Email:</strong> {getContactEmail(f) || '—'}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><strong>Ubicación:</strong> {location || '—'}</p>
                {f.direccion && <p><strong>Dirección:</strong> {f.direccion as string}</p>}
                {getChatwootAlias(f) && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" /><span>ID:</span><code className="bg-muted px-1.5 py-0.5 rounded">{getChatwootAlias(f)}</code>
                  </p>
                )}
                {f.notas_cliente && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <p className="font-medium mb-1">Notas del cliente:</p>
                    <p>{f.notas_cliente as string}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Scale className="h-3.5 w-3.5" />Caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm py-2 px-3">
                <p><strong>Área:</strong> {(f.area_legal as string) || '—'}</p>
                <p><strong>Subárea:</strong> {(f.subarea as string) || '—'}</p>
                <p className="flex items-center gap-2"><Euro className="h-3.5 w-3.5 text-muted-foreground" /><strong>Cuantía:</strong> {(f.cuantia as number) ? `${(f.cuantia as number).toLocaleString()}€` : '—'}</p>
                <p className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-muted-foreground" /><strong>Urgencia:</strong> {(f.urgencia_aplica as boolean) ? <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs py-0">{(f.urgencia_nivel as string) || 'Sí'}</Badge> : '—'}</p>
                <p className="flex items-center gap-2"><Inbox className="h-3.5 w-3.5 text-muted-foreground" /><strong>Canal:</strong> {caseData.lead?.source_channel ? <Badge variant="outline" className="text-xs py-0">{caseData.lead.source_channel}</Badge> : '—'}</p>
                {(f.caso_estrella as boolean) && <Badge className="bg-amber-500 text-white text-xs mt-1">⭐ Caso estrella</Badge>}
                {(f.case_type as string) && <p><strong>Tipo:</strong> {f.case_type === 'comision' ? 'Comisión' : f.case_type === 'compra_directa' ? 'Compra directa' : 'CRM Manual'}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">Resumen del Caso</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert py-2 px-3">
              {caseData.lead?.case_summary ? (
                <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: processAndSanitize(caseData.lead.case_summary) }} />
              ) : (
                <p className="text-muted-foreground text-sm">No hay resumen disponible. Genera uno desde la pestaña IA.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ECONOMÍA TAB */}
        <TabsContent value="economia" className="mt-3">
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

          {/* Commission info for commission cases */}
          {isCommission && (
            <Card className="shadow-soft mt-3">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" />Control de Comisión</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comisión aplicada:</span>
                  <span className="font-medium">{(caseData as any).commission_percent || 20}%</span>
                </div>
                {(caseData as any).client_fee && (caseData as any).won_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comisión estimada:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                        ((caseData as any).client_fee + ((caseData as any).won_amount * ((caseData as any).success_percentage || 0) / 100)) * ((caseData as any).commission_percent || 20) / 100
                      )}
                    </span>
                  </div>
                )}
                {caseData.firm_status === 'won' && !((caseData as any).client_fee && (caseData as any).won_amount) && (
                  <p className="text-xs text-amber-600">⚠ Complete minuta facturada e importe cobrado para cerrar la comisión.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DOCUMENTOS TAB */}
        <TabsContent value="documents" className="mt-3">
          {caseData.lead_id && <CaseDocumentsTab leadId={caseData.lead_id} />}
        </TabsContent>

        {/* IA TAB */}
        <TabsContent value="ia" className="mt-3">
          <CaseAITab
            leadId={caseData.lead_id}
            leadText={caseData.lead?.lead_text || ''}
            structuredFields={fields}
            sourceChannel={caseData.lead?.source_channel || undefined}
            caseSummary={caseData.lead?.case_summary}
          />
        </TabsContent>

        {/* SEGUIMIENTO TAB */}
        <TabsContent value="tracking" className="mt-3">
          {caseData.lead_id && <CaseTrackingTab leadId={caseData.lead_id} />}
        </TabsContent>

        {/* NOTAS TAB */}
        <TabsContent value="notes" className="mt-3 space-y-3">
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-2 px-3">
              <Textarea placeholder="Añade notas privadas sobre este caso..." value={notes} onChange={e => setNotes(e.target.value)} rows={6} />
              <Button size="sm" onClick={handleSaveNotes} disabled={updateNotes.isPending}>
                {updateNotes.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar notas
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Historial</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="font-medium text-sm">Caso recibido</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(caseData.assigned_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
                  </div>
                </div>
                {caseData.contacted_at && (
                  <div className="flex items-start gap-3 pb-3 border-b">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="font-medium text-sm">Cliente contactado</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(caseData.contacted_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
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
            <span className="text-sm font-medium text-muted-foreground">Acciones:</span>
            {!caseData.contacted_at && (
              <Button size="sm" onClick={handleMarkContacted} disabled={updateStatus.isPending}>
                <Phone className="h-4 w-4 mr-2" />Marcar contactado
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => { setResultType('won'); setResultDialogOpen(true); }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Cerrar ganado
            </Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => { setResultType('lost'); setResultDialogOpen(true); }}>
              <XCircle className="h-4 w-4 mr-2" />Perdido
            </Button>
          </div>
        </CardContent>
      </Card>

      {id && <CaseResultDialog open={resultDialogOpen} onOpenChange={setResultDialogOpen} assignmentId={id} type={resultType} />}
      <ReportClaimDialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)} leadId={caseData.lead_id} assignmentId={id!} />
      {id && (
        <AssignCaseDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          assignmentId={id}
          currentBranchId={(caseData as any).branch_id || null}
          currentLawyerId={caseData.assigned_lawyer_id || null}
        />
      )}
    </div>
  );
}
