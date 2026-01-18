import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useExtractLeadData, useCalculateLexcore } from '@/hooks/useLexcoreRuns';
import { useGenerateCaseSummary } from '@/hooks/useCaseSummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AREAS_LEGALES, PROVINCIAS_ESPANA, SOURCE_CHANNELS, URGENCY_LEVELS, type SourceChannel, type AreaLegal, type Provincia, type UrgencyLevel } from '@/lib/constants';
import type { StructuredFields } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Save, Sparkles, Loader2, Check, Circle, FileText } from 'lucide-react';

type ProcessStep = 'idle' | 'saving' | 'extracting' | 'scoring' | 'summarizing' | 'done';

export default function LeadNew() {
  const navigate = useNavigate();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const extractMutation = useExtractLeadData();
  const scoreMutation = useCalculateLexcore();
  const summaryMutation = useGenerateCaseSummary();
  
  const [leadText, setLeadText] = useState('');
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>('Web chat');
  const [fields, setFields] = useState<StructuredFields>({ urgencia_aplica: false, n_despachos: 1 });
  const [processStep, setProcessStep] = useState<ProcessStep>('idle');
  const [showProgress, setShowProgress] = useState(false);

  const updateField = <K extends keyof StructuredFields>(key: K, value: StructuredFields[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (leadText.length < 50) {
      toast.error('El texto del lead debe tener al menos 50 caracteres');
      return;
    }
    if (!fields.area_legal) {
      toast.error('Selecciona un área legal');
      return;
    }
    try {
      const lead = await createMutation.mutateAsync({ 
        lead_text: leadText, 
        source_channel: sourceChannel, 
        structured_fields: fields 
      });
      toast.success('Lead creado correctamente');
      navigate(`/leads/${lead.id}`);
    } catch {
      toast.error('Error al crear el lead');
    }
  };

  const handleSaveAndProcess = async () => {
    if (leadText.length < 50) {
      toast.error('El texto del lead debe tener al menos 50 caracteres');
      return;
    }

    setShowProgress(true);
    let leadId: string | null = null;
    let extractedFields = { ...fields };

    try {
      // Step 1: Save lead
      setProcessStep('saving');
      const lead = await createMutation.mutateAsync({ 
        lead_text: leadText, 
        source_channel: sourceChannel, 
        structured_fields: fields 
      });
      leadId = lead.id;

      // Step 2: Extract data with AI
      setProcessStep('extracting');
      try {
        const extractResult = await extractMutation.mutateAsync(leadText);
        
        if (extractResult.success && extractResult.extracted_data) {
          const extracted = extractResult.extracted_data;
          
          // Map extracted data to structured fields
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

          // Update lead with extracted data
          await updateMutation.mutateAsync({
            id: leadId,
            structured_fields: extractedFields,
          });
        }
      } catch (extractError) {
        console.error('Extraction error:', extractError);
        toast.warning('No se pudieron extraer los datos automáticamente');
      }

      // Step 3: Calculate scoring
      setProcessStep('scoring');
      let scoringData = null;
      try {
        const scoreResult = await scoreMutation.mutateAsync({
          leadId,
          leadText,
          structuredFields: extractedFields as unknown as Record<string, unknown>,
          sourceChannel,
        });
        scoringData = scoreResult;
      } catch (scoreError) {
        console.error('Scoring error:', scoreError);
        toast.warning('No se pudo calcular el scoring');
      }

      // Step 4: Generate case summary
      setProcessStep('summarizing');
      try {
        await summaryMutation.mutateAsync({
          leadId,
          leadText,
          structuredFields: extractedFields as unknown as Record<string, unknown>,
          scoringData,
          sourceChannel,
        });
      } catch (summaryError) {
        console.error('Summary error:', summaryError);
        toast.warning('No se pudo generar el resumen');
      }

      setProcessStep('done');
      toast.success('Lead procesado correctamente');
      
      // Navigate after a brief delay to show completion
      setTimeout(() => {
        navigate(`/leads/${leadId}`);
      }, 500);

    } catch (error) {
      console.error('Process error:', error);
      toast.error('Error al procesar el lead');
      setShowProgress(false);
      setProcessStep('idle');
      
      // If lead was created but processing failed, still navigate to it
      if (leadId) {
        navigate(`/leads/${leadId}`);
      }
    }
  };

  const isProcessing = processStep !== 'idle' && processStep !== 'done';

  const getProgressPercent = () => {
    switch (processStep) {
      case 'saving': return 20;
      case 'extracting': return 40;
      case 'scoring': return 60;
      case 'summarizing': return 80;
      case 'done': return 100;
      default: return 0;
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
        {isComplete ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : isCurrent ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={`text-sm ${isCurrent ? 'font-medium' : isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} disabled={isProcessing}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Nuevo Lead</h1>
          <p className="text-muted-foreground">Crea un nuevo registro de lead</p>
        </div>
      </div>

      {/* Processing Progress Modal */}
      {showProgress && (
        <Card className="shadow-soft border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Sparkles className="h-5 w-5 text-primary" />
                Procesando lead con IA...
              </div>
              <Progress value={getProgressPercent()} className="h-2" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StepIndicator step="saving" label="Guardando lead" currentStep={processStep} />
                <StepIndicator step="extracting" label="Extrayendo datos" currentStep={processStep} />
                <StepIndicator step="scoring" label="Calculando scoring" currentStep={processStep} />
                <StepIndicator step="summarizing" label="Generando resumen" currentStep={processStep} />
                <StepIndicator step="done" label="Completado" currentStep={processStep} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSaveOnly} className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle>Contenido del Lead</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-text">Conversación / Texto del lead *</Label>
              <Textarea 
                id="lead-text" 
                placeholder="Pega aquí la conversación o describe el caso del cliente..." 
                className="min-h-[200px]" 
                value={leadText} 
                onChange={e => setLeadText(e.target.value)} 
                required 
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">{leadText.length}/50 caracteres mínimo</p>
            </div>
            <div className="space-y-2">
              <Label>Canal de entrada</Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_CHANNELS.map(ch => (
                  <Button 
                    key={ch} 
                    type="button" 
                    variant={sourceChannel === ch ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setSourceChannel(ch)}
                    disabled={isProcessing}
                  >
                    {ch}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Datos de Contacto</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={fields.nombre || ''} onChange={e => updateField('nombre', e.target.value)} disabled={isProcessing} />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={fields.apellidos || ''} onChange={e => updateField('apellidos', e.target.value)} disabled={isProcessing} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input type="tel" value={fields.telefono || ''} onChange={e => updateField('telefono', e.target.value)} disabled={isProcessing} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={fields.email || ''} onChange={e => updateField('email', e.target.value)} disabled={isProcessing} />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={fields.ciudad || ''} onChange={e => updateField('ciudad', e.target.value)} disabled={isProcessing} />
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Select value={fields.provincia || ''} onValueChange={v => updateField('provincia', v as Provincia)} disabled={isProcessing}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PROVINCIAS_ESPANA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle>Clasificación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Área Legal *</Label>
                <Select value={fields.area_legal || ''} onValueChange={v => updateField('area_legal', v as AreaLegal)} disabled={isProcessing}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                  <SelectContent>{AREAS_LEGALES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subárea</Label>
                <Input value={fields.subarea || ''} onChange={e => updateField('subarea', e.target.value)} disabled={isProcessing} />
              </div>
              <div className="space-y-2">
                <Label>Cuantía (€)</Label>
                <Input type="number" value={fields.cuantia ?? ''} onChange={e => updateField('cuantia', e.target.value ? Number(e.target.value) : null)} disabled={isProcessing} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="urgencia" checked={fields.urgencia_aplica || false} onCheckedChange={c => updateField('urgencia_aplica', !!c)} disabled={isProcessing} />
                <Label htmlFor="urgencia">Urgencia aplica</Label>
              </div>
              {fields.urgencia_aplica && (
                <Select value={fields.urgencia_nivel || ''} onValueChange={v => updateField('urgencia_nivel', v as UrgencyLevel)} disabled={isProcessing}>
                  <SelectTrigger><SelectValue placeholder="Nivel de urgencia" /></SelectTrigger>
                  <SelectContent>{URGENCY_LEVELS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle>Notas Internas</CardTitle></CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Notas del operador..." 
                value={fields.notas_operador || ''} 
                onChange={e => updateField('notas_operador', e.target.value)} 
                disabled={isProcessing}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button type="submit" variant="outline" disabled={createMutation.isPending || isProcessing}>
            <Save className="mr-2 h-4 w-4" />
            Guardar solo
          </Button>
          <Button 
            type="button" 
            className="gradient-brand" 
            disabled={isProcessing || leadText.length < 50}
            onClick={handleSaveAndProcess}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Guardar y Calcular Lexcore
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
