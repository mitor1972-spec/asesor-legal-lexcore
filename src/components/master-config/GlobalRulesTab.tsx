import { useState, useEffect } from 'react';
import {
  useMasterGlobalRules, useUpdateGlobalRules,
  useMasterCaseStatuses, useUpsertCaseStatus,
  useMasterActiveProvinces, useUpsertActiveProvince, useBulkInsertProvinces,
} from '@/hooks/useMasterConfig';
import { PROVINCIAS_ESPANA } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Upload } from 'lucide-react';

export function GlobalRulesTab() {
  const { data: rules, isLoading: rulesLoading } = useMasterGlobalRules();
  const updateRules = useUpdateGlobalRules();
  const { data: statuses } = useMasterCaseStatuses();
  const upsertStatus = useUpsertCaseStatus();
  const { data: provinces } = useMasterActiveProvinces();
  const upsertProvince = useUpsertActiveProvince();
  const bulkInsert = useBulkInsertProvinces();

  const [rForm, setRForm] = useState({
    id: '',
    default_commission_percent: 20,
    min_sellable_score: 40,
    min_sellable_price: 5,
    allowed_models: ['compra_directa', 'comision'] as string[],
  });

  useEffect(() => {
    if (rules) {
      setRForm({
        id: rules.id,
        default_commission_percent: rules.default_commission_percent,
        min_sellable_score: rules.min_sellable_score,
        min_sellable_price: rules.min_sellable_price,
        allowed_models: rules.allowed_models || [],
      });
    }
  }, [rules]);

  const toggleModel = (model: string) => {
    setRForm((f) => ({
      ...f,
      allowed_models: f.allowed_models.includes(model)
        ? f.allowed_models.filter((m) => m !== model)
        : [...f.allowed_models, model],
    }));
  };

  const [statusDialog, setStatusDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#6b7280', is_active: true, is_final: false, sort_order: 0 });

  const importAllProvinces = () => {
    bulkInsert.mutate([...PROVINCIAS_ESPANA]);
  };

  if (rulesLoading) return <p className="text-muted-foreground text-sm">Cargando...</p>;

  return (
    <div className="space-y-6">
      {/* Global Rules */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Reglas Globales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Comisión global por defecto (%)</Label>
              <Input
                type="number"
                value={rForm.default_commission_percent}
                onChange={(e) => setRForm({ ...rForm, default_commission_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Score mínimo vendible</Label>
              <Input
                type="number"
                value={rForm.min_sellable_score}
                onChange={(e) => setRForm({ ...rForm, min_sellable_score: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Precio mínimo vendible (€)</Label>
              <Input
                type="number"
                value={rForm.min_sellable_price}
                onChange={(e) => setRForm({ ...rForm, min_sellable_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Modelos permitidos</Label>
            <div className="flex gap-4">
              {[
                { key: 'compra_directa', label: 'Compra directa' },
                { key: 'comision', label: 'Comisión' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={rForm.allowed_models.includes(key)}
                    onCheckedChange={() => toggleModel(key)}
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={() => updateRules.mutate(rForm)} disabled={updateRules.isPending}>
            Guardar Reglas
          </Button>
        </CardContent>
      </Card>

      {/* Case Statuses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Estados del Caso</CardTitle>
          <Button size="sm" onClick={() => { setStatusForm({ name: '', color: '#6b7280', is_active: true, is_final: false, sort_order: (statuses?.length || 0) }); setStatusDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Estado
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center">Color</TableHead>
                <TableHead className="text-center">Final</TableHead>
                <TableHead className="text-center">Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(statuses || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="inline-block w-5 h-5 rounded" style={{ backgroundColor: s.color }} />
                  </TableCell>
                  <TableCell className="text-center">
                    {s.is_final && <Badge variant="secondary" className="text-xs">Final</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(v) => upsertStatus.mutate({ ...s, is_active: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!statuses || statuses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">Sin estados</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Provinces */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Provincias Activas</CardTitle>
          <Button size="sm" variant="outline" onClick={importAllProvinces} disabled={bulkInsert.isPending}>
            <Upload className="h-4 w-4 mr-1" /> Importar todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(provinces || []).map((p: any) => (
              <Badge
                key={p.id}
                variant={p.is_active ? 'default' : 'secondary'}
                className="cursor-pointer text-xs"
                onClick={() => upsertProvince.mutate({ ...p, is_active: !p.is_active })}
              >
                {p.name}
              </Badge>
            ))}
            {(!provinces || provinces.length === 0) && (
              <p className="text-sm text-muted-foreground">
                Sin provincias. Haz clic en "Importar todas" para cargar las 50 provincias.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Estado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={statusForm.name} onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Color</Label>
              <Input type="color" value={statusForm.color} onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })} className="h-10 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Es estado final</Label>
              <Switch checked={statusForm.is_final} onCheckedChange={(v) => setStatusForm({ ...statusForm, is_final: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!statusForm.name.trim()) return;
                upsertStatus.mutate(statusForm, { onSuccess: () => setStatusDialog(false) });
              }}
              disabled={upsertStatus.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
