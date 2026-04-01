import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useExtractLeadData, useCalculateLexcore } from '@/hooks/useLexcoreRuns';
import { useGenerateCaseSummary } from '@/hooks/useCaseSummary';
import { useLawfirms } from '@/hooks/useLawfirms';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AREAS_LEGALES, PROVINCIAS_ESPANA, SOURCE_CHANNELS, URGENCY_LEVELS, type SourceChannel, type AreaLegal, type Provincia, type UrgencyLevel } from '@/lib/constants';
import type { StructuredFields } from '@/types';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { ArrowLeft, Save, Sparkles, Loader2, Check, Circle, Mail, Phone, AlertTriangle } from 'lucide-react';

type ProcessStep = 'idle' | 'saving' | 'extracting' | 'scoring' | 'summarizing' | 'done';

interface AdminConfig {
  scoreManual: number | null;
  autoCalcScore: boolean;
  priceManual: number | null;
  marketplacePrice: number | null;
  commissionPercent: number | null;
  allowOverride: boolean;
  isCommissionable: boolean;
  activateMarketplace: boolean;
  activateCommission: boolean;
  allowDirectPurchase: boolean;
  allowCommissionModel: boolean;
  isUrgent: boolean;
  caseDefined: boolean;
  evidencePresent: boolean;
  preassignedLawfirmId: string | null;
  highlightDashboard: boolean;
  isStar: boolean;
  visibleRadar: boolean;
  suggestedEmail: string;
  suggestedEmailGenerated: boolean;
}

export default function LeadNew() {
  const navigate = useNavigate();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const extractMutation = useExtractLeadData();
  const scoreMutation = useCalculateLexcore();
  const summaryMutation = useGenerateCaseSummary();
  const { data: lawfirms } = useLawfirms();

  const { data: specialties } = useQuery({
    queryKey: ['master-specialties-active'],
    queryFn: async () => {
      const { data } = await supabase.from('master_specialties').select('id, name').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const [leadText, setLeadText] = useState('');
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>('Web chat');
  const [fields, setFields] = useState<StructuredFields>({ urgencia_aplica: false, n_despachos: 1 });
  const [processStep, setProcessStep] = useState<ProcessStep>('idle');
  const [showProgress, setShowProgress] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({
    scoreManual: null,
    autoCalcScore: true,
    priceManual: null,
    marketplacePrice: null,
    commissionPercent: null,
    allowOverride: false,
    isCommissionable: false,
    activateMarketplace: false,
    activateCommission: false,
    allowDirectPurchase: true,
    allowCommissionModel: true,
    isUrgent: false,
    caseDefined: false,
    evidencePresent: false,
    preassignedLawfirmId: null,
    highlightDashboard: false,
    isStar: false,
    visibleRadar: true,
    suggestedEmail: '',
    suggestedEmailGenerated: false,
  });

  const updateField = <K extends keyof StructuredFields>(key: K, value: StructuredFields[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const updateAdmin = <K extends keyof AdminConfig>(key: K, value: AdminConfig[K]) => {
    setAdminConfig(prev => ({ ...prev, [key]: value }));
  };

  const hasEmail = !!fields.email;
  const hasPhone = !!fields.telefono;

  const handleGenerateSuggestedEmail = async () => {
    if (!hasEmail || !leadText) {
      toast.error('Necesitas email y texto del lead para generar el email sugerido');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('generate-legal-help', {
        body: {
          leadText,
          structuredFields: fields,
          type: 'suggested_email',
        },
      });
      if (error) throw error;
      const emailText = data?.suggested_email || data?.legal_orientation || 'No se pudo generar el email sugerido.';
      updateAdmin('suggestedEmail', emailText);
      updateAdmin('suggestedEmailGenerated', true);
      toast.success('Email sugerido generado');
    } catch {
      toast.error('Error al generar email sugerido');
    }
  };

  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (leadText.length < 50) { toast.error('El texto del lead debe tener al menos 50 caracteres'); return; }
    if (!fields.area_legal) { toast.error('Selecciona un área legal'); return; }

    const enrichedFields: Record<string, unknown> = {
      ...fields,
      _specialties: selectedSpecialties,
      _admin_config: {
        is_star: adminConfig.isStar,
        highlight_dashboard: adminConfig.highlightDashboard,
        visible_radar: adminConfig.visibleRadar,
        case_defined: adminConfig.caseDefined,
        evidence_present: adminConfig.evidencePresent,
        suggested_email: adminConfig.suggestedEmail || undefined,
      },
    };

    try {
      const { data: userData } = await supabase.auth.getUser();

      const insertPayload: any = {
        lead_text: leadText,
        source_channel: sourceChannel,
        structured_fields: enrichedFields as unknown as Json,
        created_by_user_id: userData.user?.id,
      };
      if (adminConfig.scoreManual != null && !adminConfig.autoCalcScore) {
        insertPayload.score_final = adminConfig.scoreManual;
      }
      if (adminConfig.priceManual != null) {
        insertPayload.price_final = adminConfig.priceManual;
      }
      if (adminConfig.marketplacePrice != null) {
        insertPayload.marketplace_price = adminConfig.marketplacePrice;
      }
      if (adminConfig.activateMarketplace) {
        insertPayload.is_in_marketplace = true;
        insertPayload.marketplace_added_at = new Date().toISOString();
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      // History
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        user_id: userData.user?.id,
        action: 'created',
        details: { source_channel: sourceChannel, admin_config: adminConfig } as unknown as Json,
      });

      // Pre-assign lawfirm if set
      if (adminConfig.preassignedLawfirmId) {
        const assignPayload: any = {
          lead_id: lead.id,
          lawfirm_id: adminConfig.preassignedLawfirmId,
          is_commission: adminConfig.isCommissionable || adminConfig.activateCommission,
        };
        if (adminConfig.commissionPercent != null) {
          assignPayload.commission_percent = adminConfig.commissionPercent;
          assignPayload.commission_origin = 'admin_manual';
        }
        await supabase.from('lead_assignments').insert(assignPayload);
      }

      toast.success('Lead creado correctamente');
      navigate(`/leads/${lead.id}`);
    } catch {
      toast.error('Error al crear el lead');
    }
  };

  const handleSaveAndProcess = async () => {
    if (leadText.length < 50) { toast.error('El texto del lead debe tener al menos 50 caracteres'); return; }
    setShowProgress(true);
    let leadId: string | null = null;
    let extractedFields = { ...fields };

    try {
      setProcessStep('saving');
      const lead = await createMutation.mutateAsync({ lead_text: leadText, source_channel: sourceChannel, structured_fields: fields });
      leadId = lead.id;

      // Apply admin overrides after creation
      const overrides: Record<string, unknown> = {};
      if (adminConfig.scoreManual != null && !adminConfig.autoCalcScore) overrides.score_final = adminConfig.scoreManual;
      if (adminConfig.priceManual != null) overrides.price_final = adminConfig.priceManual;
      if (adminConfig.marketplacePrice != null) overrides.marketplace_price = adminConfig.marketplacePrice;
      if (adminConfig.activateMarketplace) {
        overrides.is_in_marketplace = true;
        overrides.marketplace_added_at = new Date().toISOString();
      }

      setProcessStep('extracting');
      try {
        const extractResult = await extractMutation.mutateAsync(leadText);
        if (extractResult.success && extractResult.extracted_data) {
          const extracted = extractResult.extracted_data;
          extractedFields = {
            ...fields,
            nombre: extracted.nombre || fields.nombre,
            apellidos: extracted.apellidos || fields.apellidos,
            telefono: extracted.telefono || fields.telefono,
            email: extracted.email || fields.email,
            ciudad: extracted.ciudad || fields.ciudad,
            provincia: extracted.provincia || fields.provincia,
            area_legal: extracted.area_legal || fields.area_legal,
            subarea: extracted.subarea || fields.subarea,
            cuantia: extracted.cuantia || fields.cuantia,
            cuantia_texto: extracted.cuantia_texto || fields.cuantia_texto,
            urgencia_aplica: extracted.urgencia_aplica ?? fields.urgencia_aplica,
            urgencia_nivel: extracted.urgencia_nivel || fields.urgencia_nivel,
            urgencia_motivo: extracted.urgencia_motivo || fields.urgencia_motivo,
            preferencia_contacto: extracted.preferencia_contacto || fields.preferencia_contacto,
            franja_horaria: extracted.franja_horaria || fields.franja_horaria,
            documentacion: extracted.documentacion_mencionada || fields.documentacion,
          };
          await updateMutation.mutateAsync({ id: leadId, structured_fields: extractedFields });
        }
      } catch { toast.warning('No se pudieron extraer los datos automáticamente'); }

      if (adminConfig.autoCalcScore) {
        setProcessStep('scoring');
        try {
          await scoreMutation.mutateAsync({ leadId, leadText, structuredFields: extractedFields as unknown as Record<string, unknown>, sourceChannel });
        } catch { toast.warning('No se pudo calcular el scoring'); }
      }

      setProcessStep('summarizing');
      try {
        await summaryMutation.mutateAsync({ leadId, leadText, structuredFields: extractedFields as unknown as Record<string, unknown>, scoringData: null, sourceChannel });
      } catch { toast.warning('No se pudo generar el resumen'); }

      // Apply admin overrides
      if (Object.keys(overrides).length > 0) {
        await supabase.from('leads').update(overrides).eq('id', leadId);
      }

      // Pre-assign lawfirm
      if (adminConfig.preassignedLawfirmId) {
        const assignPayload2: any = {
          lead_id: leadId,
          lawfirm_id: adminConfig.preassignedLawfirmId,
          is_commission: adminConfig.isCommissionable || adminConfig.activateCommission,
        };
        if (adminConfig.commissionPercent != null) {
          assignPayload2.commission_percent = adminConfig.commissionPercent;
          assignPayload2.commission_origin = 'admin_manual';
        }
        await supabase.from('lead_assignments').insert(assignPayload2);
      }

      setProcessStep('done');
      toast.success('Lead procesado correctamente');
      setTimeout(() => navigate(`/leads/${leadId}`), 500);
    } catch {
      toast.error('Error al procesar el lead');
      setShowProgress(false);
      setProcessStep('idle');
      if (leadId) navigate(`/leads/${leadId}`);
    }
  };

  const isProcessing = processStep !== 'idle' && processStep !== 'done';

  const getProgressPercent = () => {
    switch (processStep) {
      case 'saving': return 20; case 'extracting': return 40;
      case 'scoring': return 60; case 'summarizing': return 80;
      case 'done': return 100; default: return 0;
    }
  };

  const StepIndicator = ({ step, label, currentStep }: { step: ProcessStep; label: string; currentStep: ProcessStep }) => {
    const steps: ProcessStep[] = ['saving', 'extracting', 'scoring', 'summarizing', 'done'];
    const stepIndex = steps.indexOf(step);
    const currentIndex = steps.indexOf(currentStep);
    const isComplete = currentIndex > stepIndex;
    const isCurrent = currentStep === step;
    return (
      <div className="flex items-center gap-2">
        {isComplete ? <Check className="h-4 w-4 text-green-500" /> : isCurrent ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
        <span className={`text-sm ${isCurrent ? 'font-medium' : isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} disabled={isProcessing}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Nuevo Lead (Avanzado)</h1>
          <p className="text-sm text-muted-foreground">Panel completo de creación — Administrador</p>
        </div>
      </div>

      {/* Processing Progress */}
      {showProgress && (
        <Card className="shadow-soft border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="h-5 w-5 text-primary" />Procesando lead con IA...
              </div>
              <Progress value={getProgressPercent()} className="h-2" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <StepIndicator step="saving" label="Guardando" currentStep={processStep} />
                <StepIndicator step="extracting" label="Extrayendo" currentStep={processStep} />
                <StepIndicator step="scoring" label="Scoring" currentStep={processStep} />
                <StepIndicator step="summarizing" label="Resumen" currentStep={processStep} />
                <StepIndicator step="done" label="Listo" currentStep={processStep} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSaveOnly}>
        {/* Lead text + main actions */}
        <Card className="shadow-soft mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Contenido del Lead</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Pega aquí la conversación o describe el caso del cliente..."
              className="min-h-[140px]"
              value={leadText}
              onChange={e => setLeadText(e.target.value)}
              required
              disabled={isProcessing}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{leadText.length}/50 caracteres mínimo</p>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_CHANNELS.map(ch => (
                  <Button key={ch} type="button" variant={sourceChannel === ch ? 'default' : 'outline'} size="sm" className="text-xs h-7 px-2" onClick={() => setSourceChannel(ch)} disabled={isProcessing}>
                    {ch}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" className="gradient-brand flex-1" disabled={isProcessing || leadText.length < 50} onClick={handleSaveAndProcess}>
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : <><Sparkles className="mr-2 h-4 w-4" />Guardar y Calcular Lexcore</>}
              </Button>
              <Button type="submit" variant="outline" disabled={createMutation.isPending || isProcessing}>
                <Save className="mr-2 h-4 w-4" />Guardar solo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed configuration */}
        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-9">
            <TabsTrigger value="contact" className="text-xs">Contacto</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs">Legal</TabsTrigger>
            <TabsTrigger value="economics" className="text-xs">Económico</TabsTrigger>
            <TabsTrigger value="scoring" className="text-xs">Scoring</TabsTrigger>
            <TabsTrigger value="admin" className="text-xs">Admin</TabsTrigger>
          </TabsList>

          {/* CONTACT TAB */}
          <TabsContent value="contact">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input className="h-8 text-sm" value={fields.nombre || ''} onChange={e => updateField('nombre', e.target.value)} disabled={isProcessing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Apellidos</Label>
                    <Input className="h-8 text-sm" value={fields.apellidos || ''} onChange={e => updateField('apellidos', e.target.value)} disabled={isProcessing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      Teléfono
                      {hasPhone && <Phone className="h-3 w-3 text-green-600" />}
                    </Label>
                    <Input className="h-8 text-sm" type="tel" value={fields.telefono || ''} onChange={e => updateField('telefono', e.target.value)} disabled={isProcessing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      Email
                      {hasEmail && <Mail className="h-3 w-3 text-green-600" />}
                    </Label>
                    <Input className="h-8 text-sm" type="email" value={fields.email || ''} onChange={e => updateField('email', e.target.value)} disabled={isProcessing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ciudad</Label>
                    <Input className="h-8 text-sm" value={fields.ciudad || ''} onChange={e => updateField('ciudad', e.target.value)} disabled={isProcessing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Provincia</Label>
                    <Select value={fields.provincia || ''} onValueChange={v => updateField('provincia', v as Provincia)} disabled={isProcessing}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{PROVINCIAS_ESPANA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact status indicator */}
                {hasEmail && !hasPhone && (
                  <div className="mt-3 p-2 rounded border border-amber-500/30 bg-amber-500/5 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-700">Solo email — sin teléfono. Se puede generar un email sugerido para el abogado.</span>
                  </div>
                )}

                {/* Suggested email section */}
                {hasEmail && !hasPhone && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Email sugerido para abogado</Label>
                      <div className="flex items-center gap-2">
                        {adminConfig.suggestedEmailGenerated && <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700">✔ Generado</Badge>}
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleGenerateSuggestedEmail} disabled={isProcessing}>
                          <Sparkles className="h-3 w-3" />Generar con IA
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      placeholder="Email sugerido para primer contacto con el cliente..."
                      value={adminConfig.suggestedEmail}
                      onChange={e => updateAdmin('suggestedEmail', e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEGAL TAB */}
          <TabsContent value="legal">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Área Legal *</Label>
                    <Select value={fields.area_legal || ''} onValueChange={v => updateField('area_legal', v as AreaLegal)} disabled={isProcessing}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{AREAS_LEGALES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subárea</Label>
                    <Input className="h-8 text-sm" value={fields.subarea || ''} onChange={e => updateField('subarea', e.target.value)} disabled={isProcessing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cuantía (€)</Label>
                    <Input className="h-8 text-sm" type="number" value={fields.cuantia ?? ''} onChange={e => updateField('cuantia', e.target.value ? Number(e.target.value) : null)} disabled={isProcessing} />
                  </div>
                </div>

                {/* Specialties */}
                <div className="space-y-1">
                  <Label className="text-xs">Especialidades</Label>
                  <ScrollArea className="max-h-[120px] border rounded p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {specialties?.map(s => {
                        const selected = selectedSpecialties.includes(s.id);
                        return (
                          <Badge
                            key={s.id}
                            variant={selected ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => setSelectedSpecialties(prev => selected ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                          >
                            {s.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Urgency */}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox id="urgencia" checked={fields.urgencia_aplica || false} onCheckedChange={c => updateField('urgencia_aplica', !!c)} disabled={isProcessing} />
                    <Label htmlFor="urgencia" className="text-xs">Urgencia aplica</Label>
                  </div>
                  {fields.urgencia_aplica && (
                    <Select value={fields.urgencia_nivel || ''} onValueChange={v => updateField('urgencia_nivel', v as UrgencyLevel)} disabled={isProcessing}>
                      <SelectTrigger className="h-8 text-sm w-32"><SelectValue placeholder="Nivel" /></SelectTrigger>
                      <SelectContent>{URGENCY_LEVELS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>

                {/* Model toggles */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Permitir compra directa</Label>
                    <Switch checked={adminConfig.allowDirectPurchase} onCheckedChange={v => updateAdmin('allowDirectPurchase', v)} disabled={isProcessing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Permitir comisión</Label>
                    <Switch checked={adminConfig.allowCommissionModel} onCheckedChange={v => updateAdmin('allowCommissionModel', v)} disabled={isProcessing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Caso comisionable</Label>
                    <Switch checked={adminConfig.isCommissionable} onCheckedChange={v => updateAdmin('isCommissionable', v)} disabled={isProcessing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Override comisión</Label>
                    <Switch checked={adminConfig.allowOverride} onCheckedChange={v => updateAdmin('allowOverride', v)} disabled={isProcessing} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ECONOMICS TAB */}
          <TabsContent value="economics">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Precio del lead (€)</Label>
                    <Input className="h-8 text-sm" type="number" step="0.01" value={adminConfig.priceManual ?? ''} onChange={e => updateAdmin('priceManual', e.target.value ? Number(e.target.value) : null)} disabled={isProcessing} placeholder="Auto" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio marketplace (€)</Label>
                    <Input className="h-8 text-sm" type="number" step="0.01" value={adminConfig.marketplacePrice ?? ''} onChange={e => updateAdmin('marketplacePrice', e.target.value ? Number(e.target.value) : null)} disabled={isProcessing} placeholder="Auto" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">% Comisión manual</Label>
                    <Input className="h-8 text-sm" type="number" min={15} max={50} step={1} value={adminConfig.commissionPercent ?? ''} onChange={e => updateAdmin('commissionPercent', e.target.value ? Number(e.target.value) : null)} disabled={isProcessing} placeholder="Defecto" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Activar en Marketplace</Label>
                    <Switch checked={adminConfig.activateMarketplace} onCheckedChange={v => updateAdmin('activateMarketplace', v)} disabled={isProcessing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Activar en Casos a Comisión</Label>
                    <Switch checked={adminConfig.activateCommission} onCheckedChange={v => updateAdmin('activateCommission', v)} disabled={isProcessing} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Si se deja vacío → se usa configuración maestra automáticamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCORING TAB */}
          <TabsContent value="scoring">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Calcular scoring automáticamente</Label>
                  <Switch checked={adminConfig.autoCalcScore} onCheckedChange={v => updateAdmin('autoCalcScore', v)} disabled={isProcessing} />
                </div>
                {!adminConfig.autoCalcScore && (
                  <div className="space-y-1">
                    <Label className="text-xs">Score manual (0-100)</Label>
                    <Input className="h-8 text-sm w-32" type="number" min={0} max={100} value={adminConfig.scoreManual ?? ''} onChange={e => updateAdmin('scoreManual', e.target.value ? Number(e.target.value) : null)} disabled={isProcessing} />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={adminConfig.isUrgent} onCheckedChange={c => { updateAdmin('isUrgent', !!c); updateField('urgencia_aplica', !!c); }} disabled={isProcessing} />
                    <Label className="text-xs">Marcar urgente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={adminConfig.caseDefined} onCheckedChange={c => updateAdmin('caseDefined', !!c)} disabled={isProcessing} />
                    <Label className="text-xs">Caso definido</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={adminConfig.evidencePresent} onCheckedChange={c => updateAdmin('evidencePresent', !!c)} disabled={isProcessing} />
                    <Label className="text-xs">Evidencia presente</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Si override manual → no se recalcula automáticamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMIN TAB */}
          <TabsContent value="admin">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Despacho preasignado</Label>
                  <Select value={adminConfig.preassignedLawfirmId || ''} onValueChange={v => updateAdmin('preassignedLawfirmId', v || null)} disabled={isProcessing}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Ninguno (irá al marketplace)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ninguno</SelectItem>
                      {lawfirms?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Destacar en Dashboard</Label>
                    <Switch checked={adminConfig.highlightDashboard} onCheckedChange={v => updateAdmin('highlightDashboard', v)} disabled={isProcessing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Caso estrella ⭐</Label>
                    <Switch checked={adminConfig.isStar} onCheckedChange={v => updateAdmin('isStar', v)} disabled={isProcessing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Visible en Radar</Label>
                    <Switch checked={adminConfig.visibleRadar} onCheckedChange={v => updateAdmin('visibleRadar', v)} disabled={isProcessing} />
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t">
                  <Label className="text-xs">Notas internas</Label>
                  <Textarea className="min-h-[60px] text-sm" placeholder="Notas del operador / admin..." value={fields.notas_operador || ''} onChange={e => updateField('notas_operador', e.target.value)} disabled={isProcessing} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isProcessing}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
