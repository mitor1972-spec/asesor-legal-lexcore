import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLead, useUpdateLead, useLeadHistory } from '@/hooks/useLeads';
import { useLexcoreRuns, useExtractLeadData, useCalculateLexcore } from '@/hooks/useLexcoreRuns';
import { useGenerateCaseSummary } from '@/hooks/useCaseSummary';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Clock, User, Sparkles, MessageSquare, RefreshCw, Loader2, Eye, Euro, Scale, Zap, Inbox, Building2, BarChart3, Plus, Trash2, Hash } from 'lucide-react';
import { NewLeadButton } from '@/components/lead/NewLeadButton';
import { toast } from 'sonner';
import { LexcoreScoring } from '@/components/scoring/LexcoreScoring';
import { ScoringHeader } from '@/components/lead/ScoringHeader';
import { CaseSummaryView } from '@/components/lead/CaseSummaryView';
import { ConversationView } from '@/components/lead/ConversationView';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { LeadNotesTab } from '@/components/lead/LeadNotesTab';
import { AssignToLawfirmDialog } from '@/components/lead/AssignToLawfirmDialog';
import { EditContactDialog } from '@/components/lead/EditContactDialog';
import { EditCaseDialog } from '@/components/lead/EditCaseDialog';
import { DeleteLeadDialog } from '@/components/lead/DeleteLeadDialog';
import { formatLocation } from '@/lib/cityProvinceMapping';
import { getDisplayName, getChatwootAlias, getContactEmail, getContactPhone } from '@/lib/contactUtils';

const statusColors: Record<LeadStatus, string> = {
  'Pendiente': 'bg-warning/10 text-warning border-warning/20',
  'Enviado': 'bg-primary/10 text-primary border-primary/20',
  'Aceptado': 'bg-success/10 text-success border-success/20',
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isInternal } = useAuthContext();
  const { data: lead, isLoading, refetch: refetchLead } = useLead(id);
  const { data: history } = useLeadHistory(id);
  const { data: lexcoreRuns, refetch: refetchRuns } = useLexcoreRuns(id);
  const updateMutation = useUpdateLead();
  const summaryMutation = useGenerateCaseSummary();
  const extractMutation = useExtractLeadData();
  const calculateMutation = useCalculateLexcore();

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcStep, setRecalcStep] = useState(0);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editCaseOpen, setEditCaseOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const latestRun = lexcoreRuns?.[0];

  const handleViewAsLawyer = () => {
    navigate(`/leads/${id}/preview`);
  };

  const recalcSteps = [
    'Extrayendo datos con IA...',
    'Calculando scoring Lexcore...',
    'Generando resumen estructurado...',
    '¡Completado!'
  ];

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, status_internal: newStatus });
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleGenerateSummary = async () => {
    if (!id || !lead) return;
    try {
      await summaryMutation.mutateAsync({
        leadId: id,
        leadText: lead.lead_text,
        structuredFields: lead.structured_fields as Record<string, unknown>,
        scoringData: latestRun ? {
          score_final: latestRun.score_final,
          price_lexcore: latestRun.price_lexcore,
          vj_json: latestRun.vj_json,
        } : undefined,
        sourceChannel: lead.source_channel || undefined,
      });
      toast.success('Resumen generado correctamente');
    } catch {
      toast.error('Error al generar el resumen');
    }
  };

  const handleRecalculateFull = async () => {
    if (!id || !lead) return;
    
    setIsRecalculating(true);
    setRecalcStep(0);
    
    try {
      setRecalcStep(0);
      const extractedData = await extractMutation.mutateAsync(lead.lead_text);
      
      const newStructuredFields = { 
        ...lead.structured_fields as Record<string, unknown>, 
        ...extractedData.extracted_data 
      };
      await updateMutation.mutateAsync({ id, structured_fields: newStructuredFields });
      
      setRecalcStep(1);
      const scoringResult = await calculateMutation.mutateAsync({
        leadId: id,
        leadText: lead.lead_text,
        structuredFields: newStructuredFields,
        sourceChannel: lead.source_channel || 'Web chat',
      });
      
      setRecalcStep(2);
      await summaryMutation.mutateAsync({
        leadId: id,
        leadText: lead.lead_text,
        structuredFields: newStructuredFields,
        scoringData: {
          score_final: scoringResult.score_final,
          price_lexcore: scoringResult.price_lexcore,
          vj_json: scoringResult.vj_json,
        },
        sourceChannel: lead.source_channel || undefined,
      });
      
      setRecalcStep(3);
      await refetchLead();
      await refetchRuns();
      toast.success('Recálculo completado correctamente');
    } catch (error) {
      toast.error('Error al recalcular: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setTimeout(() => {
        setIsRecalculating(false);
        setRecalcStep(0);
      }, 1000);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!lead) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Lead no encontrado</p></div>;

  const f = lead.structured_fields as Record<string, unknown> | null;
  const caseSummary = (lead as { case_summary?: string }).case_summary;
  const ciudad = f?.ciudad as string | undefined;
  const provincia = f?.provincia as string | undefined;
  const location = formatLocation(ciudad, provincia);

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-display font-bold">Lead #{lead.id.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground">{format(new Date(lead.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={lead.status_internal} onValueChange={v => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          {lead.score_final !== null && (
            <div className="flex items-center gap-3">
              <LeadTemperature score={lead.score_final} variant="mini" />
              <Badge variant="outline" className="font-mono bg-green-500/10 text-green-600 border-green-500/20">{lead.price_final}€</Badge>
            </div>
          )}
          <Button onClick={() => setAssignDialogOpen(true)} className="bg-primary">
            <Building2 className="mr-2 h-4 w-4" />Asignar a despacho
          </Button>
          <Button asChild variant="outline"><Link to={`/leads/${id}/edit`}><Pencil className="mr-2 h-4 w-4" />Editar</Link></Button>
          <Button variant="outline" onClick={handleRecalculateFull} disabled={isRecalculating}>
            {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recalcular Lexcore
          </Button>
          {isInternal && (
            <Button variant="secondary" onClick={handleViewAsLawyer}><Eye className="mr-2 h-4 w-4" />Ver como abogado</Button>
          )}
          <NewLeadButton />
        </div>
      </div>

      {isRecalculating && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{recalcSteps[recalcStep]}</span>
                <span className="text-muted-foreground">{recalcStep + 1}/{recalcSteps.length}</span>
              </div>
              <Progress value={((recalcStep + 1) / recalcSteps.length) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      <LeadTemperature score={lead.score_final} structuredFields={f} variant="full" />
      <ScoringHeader scoreFinal={lead.score_final} priceFinal={lead.price_final} latestRun={latestRun} sourceChannel={lead.source_channel || undefined} />

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="shadow-soft">
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5" />Contacto</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditContactOpen(true)} className="h-7 px-2">
              <Pencil className="h-3 w-3 mr-1" />Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm py-2 px-3">
            <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><strong>Nombre:</strong> {getDisplayName(f) || <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><strong>Teléfono:</strong> {getContactPhone(f) || <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><strong>Email:</strong> {getContactEmail(f) || <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><strong>Ubicación:</strong> {location || <span className="text-muted-foreground">—</span>}</p>
            {getChatwootAlias(f) && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><Hash className="h-3 w-3" /><span>ID Chatwoot:</span> <code className="bg-muted px-1.5 py-0.5 rounded">{getChatwootAlias(f)}</code></p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-3.5 w-3.5" />Caso</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditCaseOpen(true)} className="h-7 px-2">
              <Pencil className="h-3 w-3 mr-1" />Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm py-2 px-3">
            <p className="flex items-center gap-2"><Scale className="h-3.5 w-3.5 text-muted-foreground" /><strong>Área:</strong> {cleanField(f?.area_legal) || <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><strong>Subárea:</strong> {cleanField(f?.subarea) || <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><Euro className="h-3.5 w-3.5 text-muted-foreground" /><strong>Cuantía:</strong> {cleanField(f?.cuantia) ? `${Number(f!.cuantia).toLocaleString()}€` : <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-muted-foreground" /><strong>Urgencia:</strong> {(f?.urgencia_aplica as boolean) ? <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs py-0">{cleanField(f?.urgencia_nivel) || 'Sí'}</Badge> : <span className="text-muted-foreground">—</span>}</p>
            <p className="flex items-center gap-2"><Inbox className="h-3.5 w-3.5 text-muted-foreground" /><strong>Canal:</strong> {lead.source_channel ? <Badge variant="outline" className="text-xs py-0">{lead.source_channel}</Badge> : ''}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resumen" className="space-y-3">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Scoring</TabsTrigger>
          <TabsTrigger value="ayuda-legal" className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Ayuda Legal</TabsTrigger>
          <TabsTrigger value="notas"><MessageSquare className="h-3 w-3 mr-1" />Notas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="conversacion" className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />Conversación original</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-3">
          <CaseSummaryView summary={caseSummary || null} isGenerating={summaryMutation.isPending} onGenerate={handleGenerateSummary} />
        </TabsContent>

        <TabsContent value="scoring"><LexcoreScoring lead={lead} /></TabsContent>

        <TabsContent value="ayuda-legal">
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3"><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-3.5 w-3.5 text-primary" />Orientación Legal</CardTitle></CardHeader>
            <CardContent className="py-2 px-3">
              <p className="text-muted-foreground text-sm">La ayuda legal se genera al asignar el lead a un despacho. Puedes verla en la vista del abogado.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notas">{id && <LeadNotesTab leadId={id} />}</TabsContent>

        <TabsContent value="historial">
          <Card className="shadow-soft">
            <CardHeader className="py-2 px-3"><CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5" />Historial de cambios</CardTitle></CardHeader>
            <CardContent className="py-2 px-3">
              {history?.length === 0 ? <p className="text-muted-foreground text-sm">Sin historial</p> : (
                <div className="space-y-3">
                  {history?.map((h) => {
                    const detailsObj =
                      h.details && typeof h.details === 'object' && !Array.isArray(h.details)
                        ? (h.details as Record<string, unknown>)
                        : null;

                    const note = detailsObj && typeof detailsObj.note === 'string'
                      ? detailsObj.note
                      : undefined;

                    const createdAt = h.created_at ? new Date(h.created_at) : null;

                    const title =
                      h.action === 'note_added' && note
                        ? `📝 Nota: "${note.substring(0, 50)}..."`
                        : h.action;

                    return (
                      <div key={h.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{title}</p>
                          <p className="text-xs text-muted-foreground">
                            {createdAt
                              ? format(createdAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })
                              : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversacion"><ConversationView leadText={lead.lead_text} /></TabsContent>
      </Tabs>

      <AssignToLawfirmDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} leadId={id || ''} leadArea={f?.area_legal as string | undefined} leadProvince={f?.provincia as string | undefined} onSuccess={() => refetchLead()} />
      
      <EditContactDialog 
        open={editContactOpen} 
        onOpenChange={setEditContactOpen} 
        leadId={id || ''} 
        structuredFields={f} 
        onSuccess={() => refetchLead()} 
      />
      
      <EditCaseDialog 
        open={editCaseOpen} 
        onOpenChange={setEditCaseOpen} 
        leadId={id || ''} 
        structuredFields={f} 
        onSuccess={() => refetchLead()} 
      />
      
      <DeleteLeadDialog 
        open={deleteDialogOpen} 
        onOpenChange={setDeleteDialogOpen} 
        leadId={id || ''} 
      />

      {/* Delete button at bottom */}
      <div className="flex justify-end pt-6 border-t">
        <Button 
          variant="destructive" 
          onClick={() => setDeleteDialogOpen(true)}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar lead
        </Button>
      </div>
    </div>
  );
}
