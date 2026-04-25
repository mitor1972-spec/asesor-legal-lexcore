import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Cog, Check, Copy, Download, Upload, Loader2, Radio, FileText, Save, RotateCcw, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

// =====================================================================
// LEGACY PANEL — NO TOCAR LA LÓGICA DE NEGOCIO
//
// Esta página queda marcada como obsoleta a partir de Fase 6.
// El scoring real se gestiona desde:
//   /settings/ai-prompts → prompt_key: lexcore_scoring_system
//
// Se mantiene visible (sin borrar) por seguridad, pero en modo readonly
// para evitar dos fuentes de verdad. Cuando se migren tramos/pesos a
// ai_prompts se podrá eliminar definitivamente.
// =====================================================================
const LEGACY_READONLY = true;
import { 
  useLexcoreConfigs, 
  useActivateConfig, 
  useUpdateConfigJson, 
  useDuplicateConfig,
  LexcoreConfig as LexcoreConfigType,
  LexcoreConfigJson,
  PriceStep,
} from '@/hooks/useLexcoreConfig';
import { useAiPrompts, useUpdateAiPrompt } from '@/hooks/useAiPrompts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function LexcoreConfig() {
  const { data: configs, isLoading } = useLexcoreConfigs();
  const { data: aiPrompts, isLoading: promptsLoading } = useAiPrompts();
  const activateConfig = useActivateConfig();
  const updateConfigJson = useUpdateConfigJson();
  const duplicateConfig = useDuplicateConfig();
  const updateAiPrompt = useUpdateAiPrompt();
  
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LexcoreConfigType | null>(null);
  const [newVersionName, setNewVersionName] = useState('');
  
  const activeConfig = configs?.find(c => c.is_active);

  const handleActivate = async (configId: string) => {
    await activateConfig.mutateAsync(configId);
  };

  const handleDuplicate = (config: LexcoreConfigType) => {
    setSelectedConfig(config);
    setNewVersionName(`${config.version_name} (copia)`);
    setDuplicateDialogOpen(true);
  };

  const confirmDuplicate = async () => {
    if (selectedConfig && newVersionName.trim()) {
      await duplicateConfig.mutateAsync({ 
        config: selectedConfig, 
        newName: newVersionName.trim() 
      });
      setDuplicateDialogOpen(false);
      setSelectedConfig(null);
      setNewVersionName('');
    }
  };

  const handleExport = (config: LexcoreConfigType) => {
    const blob = new Blob([JSON.stringify(config.config_json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexcore-${config.version_name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuración exportada');
  };

  const handleUpdatePriceSteps = async (configId: string, priceSteps: PriceStep[]) => {
    if (!activeConfig) return;
    const newConfigJson: LexcoreConfigJson = {
      ...activeConfig.config_json,
      price_steps: priceSteps,
    };
    await updateConfigJson.mutateAsync({ configId, configJson: newConfigJson });
  };

  const handleUpdateWeights = async (configId: string, mode: 'a' | 'b', weights: Record<string, number>) => {
    if (!activeConfig) return;
    const key = mode === 'a' ? 'weights_mode_a' : 'weights_mode_b';
    const newConfigJson: LexcoreConfigJson = {
      ...activeConfig.config_json,
      [key]: weights,
    };
    await updateConfigJson.mutateAsync({ configId, configJson: newConfigJson });
  };

  // Find the lexcore_scoring_rules prompt
  const scoringRulesPrompt = aiPrompts?.find(p => p.prompt_key === 'lexcore_scoring_rules');

  if (isLoading || promptsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Cog className="h-6 w-6" />
          Configuración Lexcore
        </h1>
        <p className="text-muted-foreground">Ajustes del sistema de scoring</p>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-0">
          <Tabs defaultValue="instructions" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 overflow-x-auto">
              <TabsTrigger 
                value="instructions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <FileText className="h-4 w-4 mr-1" />
                Instrucciones IA
              </TabsTrigger>
              <TabsTrigger 
                value="versions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Versiones
              </TabsTrigger>
              <TabsTrigger 
                value="prices" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Tramos de precio
              </TabsTrigger>
              <TabsTrigger 
                value="weights" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Pesos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="instructions" className="p-6">
              <ScoringRulesEditor 
                prompt={scoringRulesPrompt}
                onSave={async (id, text) => {
                  await updateAiPrompt.mutateAsync({ id, prompt_text: text });
                }}
                isPending={updateAiPrompt.isPending}
              />
            </TabsContent>

            <TabsContent value="versions" className="p-6 space-y-4">
              {configs?.map((config) => (
                <div 
                  key={config.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${config.is_active ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-center gap-3">
                    <Radio className={`h-5 w-5 ${config.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.version_name}</span>
                        {config.is_active && (
                          <Badge variant="default" className="bg-primary/10 text-primary border-0">
                            <Check className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Creada: {format(new Date(config.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!config.is_active && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleActivate(config.id)}
                        disabled={activateConfig.isPending}
                      >
                        Activar
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDuplicate(config)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport(config)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="prices" className="p-6">
              {activeConfig && (
                <PriceStepsEditor 
                  config={activeConfig}
                  onSave={(steps) => handleUpdatePriceSteps(activeConfig.id, steps)}
                  isPending={updateConfigJson.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="weights" className="p-6">
              {activeConfig && (
                <WeightsEditor 
                  config={activeConfig}
                  onSave={(mode, weights) => handleUpdateWeights(activeConfig.id, mode, weights)}
                  isPending={updateConfigJson.isPending}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar configuración</DialogTitle>
            <DialogDescription>
              Crea una nueva versión basada en "{selectedConfig?.version_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nombre de la nueva versión</Label>
            <Input 
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="Ej: AL v2.0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDuplicate} disabled={!newVersionName.trim() || duplicateConfig.isPending}>
              {duplicateConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriceStepsEditor({ 
  config, 
  onSave, 
  isPending 
}: { 
  config: LexcoreConfigType; 
  onSave: (steps: PriceStep[]) => void;
  isPending: boolean;
}) {
  const [steps, setSteps] = useState<PriceStep[]>(config.config_json.price_steps);

  const updateStep = (index: number, field: keyof PriceStep, value: number) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSave = () => {
    onSave(steps);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Configura cómo se traduce el score (0-100) a precio final (€)
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-medium">Score desde</th>
              <th className="text-left py-2 px-3 font-medium">Score hasta</th>
              <th className="text-left py-2 px-3 font-medium">Precio (€)</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => (
              <tr key={index} className="border-b">
                <td className="py-2 px-3">
                  <Input 
                    type="number" 
                    value={step.min_score}
                    onChange={(e) => updateStep(index, 'min_score', parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                </td>
                <td className="py-2 px-3">
                  <Input 
                    type="number" 
                    value={step.max_score}
                    onChange={(e) => updateStep(index, 'max_score', parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                </td>
                <td className="py-2 px-3">
                  <Input 
                    type="number" 
                    value={step.price}
                    onChange={(e) => updateStep(index, 'price', parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <Button onClick={handleSave} disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Guardar cambios
      </Button>
    </div>
  );
}

function WeightsEditor({ 
  config, 
  onSave,
  isPending 
}: { 
  config: LexcoreConfigType;
  onSave: (mode: 'a' | 'b', weights: Record<string, number>) => void;
  isPending: boolean;
}) {
  const [weightsA, setWeightsA] = useState(config.config_json.weights_mode_a);
  const [weightsB, setWeightsB] = useState(config.config_json.weights_mode_b);

  const labels: Record<string, string> = {
    contactability: 'Contactabilidad',
    intent: 'Intención',
    urgency: 'Urgencia',
    case_quality: 'Caso',
    evidence: 'Evidencia',
    clarity: 'Claridad',
  };

  const getTotalA = () => Object.values(weightsA).reduce((a, b) => a + b, 0);
  const getTotalB = () => Object.values(weightsB).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Los pesos determinan la importancia de cada grupo en el scoring final. Deben sumar 100.
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium">Modo A (con urgencia)</h3>
          <div className="space-y-3">
            {Object.entries(weightsA).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="w-28 text-sm">{labels[key] || key}</Label>
                <Input 
                  type="number" 
                  value={value}
                  onChange={(e) => setWeightsA({ ...weightsA, [key]: parseInt(e.target.value) || 0 })}
                  className="w-20 h-8"
                />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t">
              <Label className="w-28 text-sm font-medium">Total</Label>
              <span className={`font-mono ${getTotalA() === 100 ? 'text-green-600' : 'text-destructive'}`}>
                {getTotalA()}%
              </span>
            </div>
          </div>
          <Button 
            onClick={() => onSave('a', weightsA as unknown as Record<string, number>)} 
            disabled={isPending || getTotalA() !== 100}
            size="sm"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Modo A
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Modo B (sin urgencia)</h3>
          <div className="space-y-3">
            {Object.entries(weightsB).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="w-28 text-sm">{labels[key] || key}</Label>
                <Input 
                  type="number" 
                  value={value}
                  onChange={(e) => setWeightsB({ ...weightsB, [key]: parseInt(e.target.value) || 0 })}
                  className="w-20 h-8"
                />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t">
              <Label className="w-28 text-sm font-medium">Total</Label>
              <span className={`font-mono ${getTotalB() === 100 ? 'text-green-600' : 'text-destructive'}`}>
                {getTotalB()}%
              </span>
            </div>
          </div>
          <Button 
            onClick={() => onSave('b', weightsB as unknown as Record<string, number>)} 
            disabled={isPending || getTotalB() !== 100}
            size="sm"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Modo B
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SCORING_RULES = `## GRUPOS DE SCORING (evalúa cada uno de 0 a su máximo):

### 1. CONTACTABILIDAD (max 8):
- Teléfono válido: +5
- Email válido: +3
- Nombre completo: +1 (cap en 8)

### 2. INTENCIÓN (max 20):
- Solicita abogado explícitamente: 0/6/10
- Acepta que tendrá coste: 0/2/4
- Busca acción (no solo info): 0/2/4
- Disponible para llamada: 0/1/2

### 3. URGENCIA (max 10, solo Modo A):
- Plazo específico: 0/3/5
- Riesgo inmediato: 0/2/3
- Ventana de oportunidad: 0/1/2

### 4. CASO (max 25):
- Área/subárea clara: 0-5
- Hechos y cronología: 0-7
- Petición concreta: 0-5
- Identificadores trazables: 0-3
- Contraparte identificada: 0-2
- Fase procesal definida: 0-3

### 5. EVIDENCIA (max 10):
- 0: Nada
- 2: Menciona que tiene docs
- 4: Describe docs básicos
- 6: Aporta docs relevantes
- 8: Docs clave del caso
- 10: Expediente completo

### 6. CLARIDAD (max 10):
- Relato ordenado: 0-4
- Completitud: 0-3
- Coherencia: 0-2
- Tono colaborativo: 0-1

## PENALIZACIONES (aplicar si procede):
- Caso demasiado genérico: -10 a -20
- Faltan datos críticos: -5 a -15
- Falta documentación razonable: -3 a -10
- Contacto incompleto real: -3 a -8
- Segunda opinión (ya tiene abogado): -6
- Precedente negativo: -6
- Inconsistencia temporal: -3 a -8

## AJUSTES COMERCIALES:
- Exclusividad (n_despachos): 1 despacho +6 / 2: -6 / 3: -12 / 4+: -18
- Canal: Teléfono +6 / Web +4 / WhatsApp +2 / Email 0
- Cuantía: <1000€ -10 / 1000-4999€ 0 / 5000-19999€ +4 / >20000€ +6

## VJ (Valoración de Juicio):
- Solo valores: +10, +6, 0, -6, -10
- Máximo impacto: ±1 tramo de precio
- Justificar en 1 frase

## GATE NO CONTACTABLE:
Si no hay teléfono válido NI email válido → precio_final = 5€

## SCORE MÁXIMO:
El score_final NUNCA puede superar 95. Un score de 100 es IMPOSIBLE.
Reserva 90-95 solo para leads excepcionales con toda la información perfecta.`;

interface ScoringRulesEditorProps {
  prompt?: {
    id: string;
    prompt_text: string;
    updated_at: string;
  };
  onSave: (id: string, text: string) => Promise<void>;
  isPending: boolean;
}

function ScoringRulesEditor({ prompt, onSave, isPending }: ScoringRulesEditorProps) {
  const [editedText, setEditedText] = useState<string | null>(null);
  
  const currentText = editedText ?? prompt?.prompt_text ?? DEFAULT_SCORING_RULES;
  const hasChanges = editedText !== null && editedText !== prompt?.prompt_text;

  const handleSave = async () => {
    if (prompt && editedText) {
      await onSave(prompt.id, editedText);
      setEditedText(null);
    }
  };

  const handleReset = () => {
    setEditedText(DEFAULT_SCORING_RULES);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Instrucciones de Scoring</p>
            <p className="text-sm text-muted-foreground mt-1">
              Estas son las reglas que la IA usa para calcular el score de cada lead. 
              Puedes modificar los valores máximos, las penalizaciones y los ajustes comerciales.
              Los cambios aplicarán a los nuevos cálculos de Lexcore.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Reglas de Scoring</Label>
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Sin guardar
            </Badge>
          )}
        </div>
        <Textarea
          value={currentText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[500px] font-mono text-sm"
          placeholder="Escribe las instrucciones para el scoring..."
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {prompt?.updated_at && `Última actualización: ${format(new Date(prompt.updated_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}`}
        </p>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar por defecto
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isPending || !prompt}
            className="gradient-brand"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
