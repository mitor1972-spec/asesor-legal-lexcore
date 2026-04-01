import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Radar, Plus, Trash2, Bell, BellOff, Scale, MapPin, Zap, Search } from 'lucide-react';
import { toast } from 'sonner';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';
import { useMasterSpecialties } from '@/hooks/useMasterConfig';

interface RadarRule {
  id: string;
  name: string;
  areas: string[];
  specialties: string[];
  provinces: string[];
  minScore: number;
  maxScore: number;
  minPrice: number;
  maxPrice: number;
  enabled: boolean;
}

export default function LawfirmRadar() {
  const { data: masterSpecialties } = useMasterSpecialties();
  const activeSpecialties = (masterSpecialties || []).filter((s: any) => s.is_active).map((s: any) => s.name);
  const [rules, setRules] = useState<RadarRule[]>(() => {
    const stored = localStorage.getItem('radar_rules');
    return stored ? JSON.parse(stored) : [];
  });
  const [adding, setAdding] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [provSearch, setProvSearch] = useState('');
  const [specSearch, setSpecSearch] = useState('');
  const [draft, setDraft] = useState<Omit<RadarRule, 'id' | 'enabled'>>({
    name: '',
    areas: [],
    specialties: [],
    provinces: [],
    minScore: 0,
    maxScore: 100,
    minPrice: 0,
    maxPrice: 200,
  });

  // Persist rules
  useEffect(() => {
    localStorage.setItem('radar_rules', JSON.stringify(rules));
  }, [rules]);

  const toggleArea = (area: string) => {
    setDraft(d => ({
      ...d,
      areas: d.areas.includes(area) ? d.areas.filter(a => a !== area) : [...d.areas, area],
    }));
  };

  const toggleProvince = (prov: string) => {
    setDraft(d => ({
      ...d,
      provinces: d.provinces.includes(prov) ? d.provinces.filter(p => p !== prov) : [...d.provinces, prov],
    }));
  };

  const toggleSpecialty = (spec: string) => {
    setDraft(d => ({
      ...d,
      specialties: d.specialties.includes(spec) ? d.specialties.filter(s => s !== spec) : [...d.specialties, spec],
    }));
  };

  const addRule = () => {
    if (!draft.name || (draft.areas.length === 0 && draft.specialties.length === 0)) {
      toast.error('Indica al menos un nombre y un área o especialidad');
      return;
    }
    setRules(prev => [...prev, { ...draft, id: crypto.randomUUID(), enabled: true }]);
    setDraft({ name: '', areas: [], specialties: [], provinces: [], minScore: 0, maxScore: 100, minPrice: 0, maxPrice: 200 });
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

  const filteredAreas = LEGAL_AREAS.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
  const filteredProvinces = PROVINCES.filter(p => p.toLowerCase().includes(provSearch.toLowerCase()));
  const filteredSpecialties = activeSpecialties.filter(s => s.toLowerCase().includes(specSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
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

      <Card className="border-lawfirm-primary/20 bg-lawfirm-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-lawfirm-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">¿Cómo funciona?</p>
              <p className="text-muted-foreground mt-1">
                Define reglas con múltiples áreas legales, provincias, rango de scoring y rango de precio. 
                Cuando entre un lead que coincida, recibirás una alerta por email en tiempo real 
                para que puedas adquirirlo antes que otros despachos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {adding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva Regla de Radar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Nombre de la regla</Label>
              <Input 
                placeholder="Ej: Bancario + Laboral Madrid" 
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              />
            </div>

            {/* Áreas del derecho - multi-select */}
            <div className="space-y-2">
              <Label>Áreas del Derecho (selección múltiple)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar áreas..." 
                  value={areaSearch}
                  onChange={e => setAreaSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {draft.areas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {draft.areas.map(a => (
                    <Badge key={a} variant="default" className="cursor-pointer" onClick={() => toggleArea(a)}>
                      {a} ×
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-1">
                  {filteredAreas.map(area => (
                    <label key={area} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <Checkbox 
                        checked={draft.areas.includes(area)}
                        onCheckedChange={() => toggleArea(area)}
                      />
                      {area}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Especialidades - multi-select */}
            <div className="space-y-2">
              <Label>Especialidades (selección múltiple)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar especialidades..." 
                  value={specSearch}
                  onChange={e => setSpecSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {draft.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {draft.specialties.map(s => (
                    <Badge key={s} variant="default" className="cursor-pointer bg-green-600" onClick={() => toggleSpecialty(s)}>
                      {s} ×
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-1">
                  {filteredSpecialties.map(spec => (
                    <label key={spec} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <Checkbox 
                        checked={draft.specialties.includes(spec)}
                        onCheckedChange={() => toggleSpecialty(spec)}
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Provincias - multi-select */}
            <div className="space-y-2">
              <Label>Provincias (selección múltiple, vacío = todas)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar provincias..." 
                  value={provSearch}
                  onChange={e => setProvSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {draft.provinces.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {draft.provinces.map(p => (
                    <Badge key={p} variant="secondary" className="cursor-pointer" onClick={() => toggleProvince(p)}>
                      {p} ×
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-1">
                  {filteredProvinces.map(prov => (
                    <label key={prov} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <Checkbox 
                        checked={draft.provinces.includes(prov)}
                        onCheckedChange={() => toggleProvince(prov)}
                      />
                      {prov}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Price and Score ranges */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Label className="font-medium">Rango de Precio (€)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Mínimo</Label>
                    <Input 
                      type="number" min={0}
                      value={draft.minPrice}
                      onChange={e => setDraft(d => ({ ...d, minPrice: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Máximo</Label>
                    <Input 
                      type="number" min={0}
                      value={draft.maxPrice}
                      onChange={e => setDraft(d => ({ ...d, maxPrice: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-medium">Rango de Score</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Mínimo</Label>
                    <Input 
                      type="number" min={0} max={100}
                      value={draft.minScore}
                      onChange={e => setDraft(d => ({ ...d, minScore: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Máximo</Label>
                    <Input 
                      type="number" min={0} max={100}
                      value={draft.maxScore}
                      onChange={e => setDraft(d => ({ ...d, maxScore: Number(e.target.value) }))}
                    />
                  </div>
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
                        {rule.areas.map(a => (
                          <Badge key={a} variant="outline" className="text-xs">
                            <Scale className="h-3 w-3 mr-1" />{a}
                          </Badge>
                        ))}
                        {(rule.specialties || []).map(s => (
                          <Badge key={s} variant="default" className="text-xs bg-green-600">
                            {s}
                          </Badge>
                        ))}
                        {rule.provinces.length > 0 && rule.provinces.map(p => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />{p}
                          </Badge>
                        ))}
                        <span className="text-xs text-muted-foreground">
                          Score {rule.minScore}-{rule.maxScore} · {rule.minPrice}€-{rule.maxPrice}€
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
