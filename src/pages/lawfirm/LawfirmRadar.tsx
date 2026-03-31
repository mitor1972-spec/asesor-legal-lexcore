import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radar, Plus, Trash2, Bell, BellOff, Scale, MapPin, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';

interface RadarRule {
  id: string;
  name: string;
  area: string;
  province: string;
  minScore: number;
  maxPrice: number;
  enabled: boolean;
}

export default function LawfirmRadar() {
  const [rules, setRules] = useState<RadarRule[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<RadarRule, 'id' | 'enabled'>>({
    name: '',
    area: '',
    province: '',
    minScore: 50,
    maxPrice: 100,
  });

  const addRule = () => {
    if (!draft.name || !draft.area) {
      toast.error('Indica al menos un nombre y área legal');
      return;
    }
    setRules(prev => [...prev, { ...draft, id: crypto.randomUUID(), enabled: true }]);
    setDraft({ name: '', area: '', province: '', minScore: 50, maxPrice: 100 });
    setAdding(false);
    toast.success('Regla de Radar creada');
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.info('Regla eliminada');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Radar className="h-6 w-6 text-lawfirm-primary" />
            Radar de Leads
          </h1>
          <p className="text-muted-foreground">
            Configura alertas automáticas para recibir notificaciones cuando lleguen leads que encajen con tu despacho.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      {/* Info card */}
      <Card className="border-lawfirm-primary/20 bg-lawfirm-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-lawfirm-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">¿Cómo funciona?</p>
              <p className="text-muted-foreground mt-1">
                Define reglas con área legal, provincia, scoring mínimo y precio máximo. 
                Cuando entre un lead que coincida, recibirás una alerta por email en tiempo real 
                para que puedas adquirirlo antes que otros despachos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add rule form */}
      {adding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva Regla de Radar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre de la regla</Label>
                <Input 
                  placeholder="Ej: Bancario Madrid" 
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Área Legal</Label>
                <Select value={draft.area} onValueChange={v => setDraft(d => ({ ...d, area: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona área" />
                  </SelectTrigger>
                  <SelectContent>
                    {(LEGAL_AREAS || ['Derecho Bancario', 'Derecho Laboral', 'Derecho de Familia', 'Derecho Penal', 'Consumidores', 'Extranjería', 'Derecho Civil', 'Concursal']).map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provincia (opcional)</Label>
                <Select value={draft.province} onValueChange={v => setDraft(d => ({ ...d, province: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {(PROVINCES || ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Vizcaya', 'Alicante']).map(prov => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Score mínimo</Label>
                  <Input 
                    type="number" 
                    min={0} max={100}
                    value={draft.minScore}
                    onChange={e => setDraft(d => ({ ...d, minScore: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio máx. (€)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={draft.maxPrice}
                    onChange={e => setDraft(d => ({ ...d, maxPrice: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={addRule}>Guardar Regla</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {rules.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Radar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No tienes reglas de Radar configuradas. Crea tu primera regla para empezar a recibir alertas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={rule.enabled ? '' : 'opacity-60'}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {rule.enabled ? (
                      <Bell className="h-5 w-5 text-lawfirm-primary shrink-0" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{rule.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Scale className="h-3 w-3 mr-1" />
                          {rule.area}
                        </Badge>
                        {rule.province && rule.province !== 'all' && (
                          <Badge variant="secondary" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {rule.province}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Score ≥ {rule.minScore} · Hasta {rule.maxPrice}€
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                    <Button size="icon" variant="ghost" onClick={() => removeRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
