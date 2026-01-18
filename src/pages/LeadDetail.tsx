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
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Clock, User, Sparkles, MessageSquare, RefreshCw, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { LexcoreScoring } from '@/components/scoring/LexcoreScoring';
import { ScoringHeader } from '@/components/lead/ScoringHeader';
import { CaseSummaryView } from '@/components/lead/CaseSummaryView';
import { ConversationView } from '@/components/lead/ConversationView';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
const statusColors: Record<LeadStatus, string> = {
  'Pendiente': 'bg-warning/10 text-warning border-warning/20',
  'Derivado': 'bg-primary/10 text-primary border-primary/20',
  'Facturado': 'bg-success/10 text-success border-success/20',
  'Cerrado': 'bg-muted text-muted-foreground border-border',
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
      // Step 1: Extract data with AI
      setRecalcStep(0);
      const extractedData = await extractMutation.mutateAsync(lead.lead_text);
      
      // Update lead with new extracted data
      const newStructuredFields = { 
        ...lead.structured_fields as Record<string, unknown>, 
        ...extractedData.extracted_data 
      };
      await updateMutation.mutateAsync({ 
        id, 
        structured_fields: newStructuredFields 
      });
      
      // Step 2: Calculate Lexcore scoring
      setRecalcStep(1);
      const scoringResult = await calculateMutation.mutateAsync({
        leadId: id,
        leadText: lead.lead_text,
        structuredFields: newStructuredFields,
        sourceChannel: lead.source_channel || 'Web chat',
      });
      
      // Step 3: Generate case summary
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
      
      // Step 4: Complete
      setRecalcStep(3);
      
      // Refresh data
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
          <Select value={lead.status_internal} onValueChange={v => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          {lead.score_final !== null && (
            <div className="flex items-center gap-3">
              <LeadTemperature 
                score={lead.score_final} 
                variant="mini" 
              />
              <Badge variant="outline" className="font-mono bg-green-500/10 text-green-600 border-green-500/20">
                {lead.price_final}€
              </Badge>
            </div>
          )}
          <Button asChild variant="outline"><Link to={`/leads/${id}/edit`}><Pencil className="mr-2 h-4 w-4" />Editar</Link></Button>
          <Button 
            variant="outline" 
            onClick={handleRecalculateFull}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Recalcular Lexcore
          </Button>
          {isInternal && (
            <Button 
              variant="secondary"
              onClick={handleViewAsLawyer}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver como abogado
            </Button>
          )}
        </div>
      </div>

      {/* Recalculating Progress */}
      {isRecalculating && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{recalcSteps[recalcStep]}</span>
                <span className="text-muted-foreground">{recalcStep + 1}/{recalcSteps.length}</span>
              </div>
              <Progress value={((recalcStep + 1) / recalcSteps.length) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {recalcSteps.map((step, i) => (
                  <span 
                    key={i} 
                    className={i <= recalcStep ? 'text-primary font-medium' : ''}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
          <TabsTrigger value="conversacion" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Conversación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          {/* Lead Temperature */}
          <LeadTemperature 
            score={lead.score_final}
            structuredFields={f}
            variant="full"
          />

          {/* Scoring Header Card - Always visible at top */}
          <ScoringHeader 
            scoreFinal={lead.score_final}
            priceFinal={lead.price_final}
            latestRun={latestRun}
            sourceChannel={lead.source_channel || undefined}
          />

          {/* Case Summary */}
          <CaseSummaryView 
            summary={caseSummary || null}
            isGenerating={summaryMutation.isPending}
            onGenerate={handleGenerateSummary}
          />

          {/* Original Data Cards - Collapsible or secondary */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Contacto</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Nombre:</strong> {(f?.nombre as string) || '-'} {(f?.apellidos as string) || ''}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{(f?.telefono as string) || '-'}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{(f?.email as string) || '-'}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{(f?.ciudad as string) || '-'}, {(f?.provincia as string) || '-'}</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Caso</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Área:</strong> {(f?.area_legal as string) || '-'}</p>
                <p><strong>Subárea:</strong> {(f?.subarea as string) || '-'}</p>
                <p><strong>Cuantía:</strong> {(f?.cuantia as number) ? `${(f.cuantia as number).toLocaleString()}€` : '-'}</p>
                <p><strong>Urgencia:</strong> {(f?.urgencia_aplica as boolean) ? <Badge variant="outline" className="bg-destructive/10 text-destructive">{(f?.urgencia_nivel as string) || 'Sí'}</Badge> : 'No'}</p>
                <p><strong>Canal:</strong> <Badge variant="outline">{lead.source_channel || 'No especificado'}</Badge></p>
              </CardContent>
            </Card>
          </div>

          {(f?.notas_operador as string) && (
            <Card className="shadow-soft">
              <CardHeader><CardTitle>Notas del Operador</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm">{(f.notas_operador as string)}</p></CardContent>
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
                  {history?.map((h: { id: string; action: string; created_at: string }) => (
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

        <TabsContent value="conversacion">
          <ConversationView leadText={lead.lead_text} />
        </TabsContent>
      </Tabs>
    </div>
  );
}