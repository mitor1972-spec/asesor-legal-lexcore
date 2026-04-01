import { useState } from 'react';
import { useMasterSpecialties, useUpsertSpecialty, useMasterLegalAreas } from '@/hooks/useMasterConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil } from 'lucide-react';

interface SpecForm {
  id?: string;
  name: string;
  is_active: boolean;
  is_commercial_vertical: boolean;
  is_star: boolean;
  direct_purchase_allowed: boolean;
  commission_allowed: boolean;
  default_commission_percent: number | null;
  suggested_fixed_price: number | null;
  areaIds: string[];
}

const emptyForm: SpecForm = {
  name: '',
  is_active: true,
  is_commercial_vertical: false,
  is_star: false,
  direct_purchase_allowed: true,
  commission_allowed: true,
  default_commission_percent: 20,
  suggested_fixed_price: null,
  areaIds: [],
};

export function SpecialtiesTab() {
  const { data: specialties, isLoading } = useMasterSpecialties();
  const { data: areas } = useMasterLegalAreas();
  const upsert = useUpsertSpecialty();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SpecForm>(emptyForm);

  const openNew = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: any) => {
    setForm({
      id: s.id,
      name: s.name,
      is_active: s.is_active,
      is_commercial_vertical: s.is_commercial_vertical,
      is_star: s.is_star,
      direct_purchase_allowed: s.direct_purchase_allowed,
      commission_allowed: s.commission_allowed,
      default_commission_percent: s.default_commission_percent,
      suggested_fixed_price: s.suggested_fixed_price,
      areaIds: (s.master_specialty_areas || []).map((sa: any) => sa.area_id),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.areaIds.length === 0) return;
    const { areaIds, ...specialty } = form;
    upsert.mutate(
      { specialty, areaIds },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  const toggleArea = (areaId: string) => {
    setForm((f) => ({
      ...f,
      areaIds: f.areaIds.includes(areaId)
        ? f.areaIds.filter((id) => id !== areaId)
        : [...f.areaIds, areaId],
    }));
  };

  const activeAreas = (areas || []).filter((a) => a.is_active);

  if (isLoading) return <p className="text-muted-foreground text-sm">Cargando...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Especialidades</CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nueva Especialidad
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Áreas</TableHead>
                <TableHead className="text-center">Vertical</TableHead>
                <TableHead className="text-center">Estrella</TableHead>
                <TableHead className="text-center">% Comisión</TableHead>
                <TableHead className="text-center">Activa</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(specialties || []).map((s: any) => (
                <TableRow key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(s.master_specialty_areas || []).map((sa: any) => {
                        const area = (areas || []).find((a) => a.id === sa.area_id);
                        return area ? (
                          <Badge key={sa.area_id} variant="outline" className="text-xs">
                            {area.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {s.is_commercial_vertical && <Badge className="text-xs">Sí</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.is_star && <Badge variant="secondary" className="text-xs">⭐</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.commission_allowed ? `${s.default_commission_percent}%` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                      {s.is_active ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!specialties || specialties.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                    Sin especialidades registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar' : 'Nueva'} Especialidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <Label className="mb-2 block">Áreas asociadas *</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {activeAreas.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.areaIds.includes(a.id)}
                      onCheckedChange={() => toggleArea(a.id)}
                    />
                    <span className="text-sm">{a.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {a.area_type}
                    </Badge>
                  </div>
                ))}
              </div>
              {form.areaIds.length === 0 && (
                <p className="text-xs text-destructive mt-1">Selecciona al menos un área</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Activa</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Vertical comercial</Label>
                <Switch checked={form.is_commercial_vertical} onCheckedChange={(v) => setForm({ ...form, is_commercial_vertical: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Estrella</Label>
                <Switch checked={form.is_star} onCheckedChange={(v) => setForm({ ...form, is_star: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Compra directa</Label>
                <Switch checked={form.direct_purchase_allowed} onCheckedChange={(v) => setForm({ ...form, direct_purchase_allowed: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Comisión permitida</Label>
                <Switch checked={form.commission_allowed} onCheckedChange={(v) => setForm({ ...form, commission_allowed: v })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>% Comisión por defecto</Label>
                <Input
                  type="number"
                  value={form.default_commission_percent ?? ''}
                  onChange={(e) => setForm({ ...form, default_commission_percent: e.target.value ? parseFloat(e.target.value) : null })}
                  disabled={!form.commission_allowed}
                />
              </div>
              <div>
                <Label>Precio cerrado sugerido (€)</Label>
                <Input
                  type="number"
                  value={form.suggested_fixed_price ?? ''}
                  onChange={(e) => setForm({ ...form, suggested_fixed_price: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsert.isPending || form.areaIds.length === 0}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
