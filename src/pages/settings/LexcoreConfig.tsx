import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cog, Check, Copy, Download, Upload, Loader2, Radio } from 'lucide-react';
import { 
  useLexcoreConfigs, 
  useActivateConfig, 
  useUpdateConfigJson, 
  useDuplicateConfig,
  LexcoreConfig as LexcoreConfigType,
  LexcoreConfigJson,
  PriceStep,
} from '@/hooks/useLexcoreConfig';
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
  const activateConfig = useActivateConfig();
  const updateConfigJson = useUpdateConfigJson();
  const duplicateConfig = useDuplicateConfig();
  
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

  if (isLoading) {
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
          <Tabs defaultValue="versions" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
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
