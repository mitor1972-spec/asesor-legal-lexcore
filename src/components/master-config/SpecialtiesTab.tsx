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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Pencil, Star, ShoppingCart, Handshake, Eye, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  visible_marketplace: boolean;
  allows_override: boolean;
  sort_order: number;
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
  visible_marketplace: true,
  allows_override: true,
  sort_order: 0,
  areaIds: [],
};

export function SpecialtiesTab() {
  const { data: specialties, isLoading } = useMasterSpecialties();
  const { data: areas } = useMasterLegalAreas();
  const upsert = useUpsertSpecialty();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SpecForm>(emptyForm);

  const openNew = () => {
    const nextOrder = (specialties?.length || 0) + 1;
    setForm({ ...emptyForm, sort_order: nextOrder });
    setDialogOpen(true);
  };

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
      visible_marketplace: s.visible_marketplace ?? true,
      allows_override: s.allows_override ?? true,
      sort_order: s.sort_order ?? 0,
      areaIds: (s.master_specialty_areas || []).map((sa: any) => sa.area_id),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
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
  const areaMap = new Map((areas || []).map((a) => [a.id, a.name]));
  const totalActive = (specialties || []).filter((s: any) => s.is_active).length;
  const totalStar = (specialties || []).filter((s: any) => s.is_star).length;

  // Quick inline toggle
  const handleQuickToggle = (s: any, field: string, value: boolean) => {
    const areaIds = (s.master_specialty_areas || []).map((sa: any) => sa.area_id);
    upsert.mutate({
      specialty: {
        id: s.id,
        name: s.name,
        is_active: field === 'is_active' ? value : s.is_active,
        is_commercial_vertical: s.is_commercial_vertical,
        is_star: field === 'is_star' ? value : s.is_star,
        direct_purchase_allowed: s.direct_purchase_allowed,
        commission_allowed: s.commission_allowed,
        default_commission_percent: s.default_commission_percent,
        suggested_fixed_price: s.suggested_fixed_price,
        visible_marketplace: field === 'visible_marketplace' ? value : (s.visible_marketplace ?? true),
        allows_override: s.allows_override ?? true,
        sort_order: s.sort_order ?? 0,
      },
      areaIds,
    });
  };

  if (isLoading) return <p className="text-muted-foreground text-sm py-4">Cargando especialidades...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Especialidades</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs font-normal">{specialties?.length || 0} total</Badge>
              <Badge variant="outline" className="text-xs font-normal text-success border-success/30">{totalActive} activas</Badge>
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-500/30">⭐ {totalStar} estrella</Badge>
            </div>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-8 px-2">#</TableHead>
                  <TableHead className="px-2">Nombre</TableHead>
                  <TableHead className="px-2">Áreas</TableHead>
                  <TableHead className="text-center px-1 w-14">⭐</TableHead>
                  <TableHead className="text-center px-1 w-14">
                    <span title="Vertical comercial">Vert.</span>
                  </TableHead>
                  <TableHead className="text-center px-1 w-16">Modelo</TableHead>
                  <TableHead className="text-center px-1 w-14">% Com</TableHead>
                  <TableHead className="text-center px-1 w-14">
                    <Eye className="h-3.5 w-3.5 mx-auto" />
                  </TableHead>
                  <TableHead className="text-center px-1 w-14">Activa</TableHead>
                  <TableHead className="w-10 px-1" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(specialties || []).map((s: any) => {
                  const linkedAreas = (s.master_specialty_areas || [])
                    .map((sa: any) => areaMap.get(sa.area_id))
                    .filter(Boolean);

                  const modelLabel = s.direct_purchase_allowed && s.commission_allowed
                    ? 'Ambos'
                    : s.direct_purchase_allowed
                      ? 'Compra'
                      : s.commission_allowed
                        ? 'Comisión'
                        : '—';

                  return (
                    <TableRow
                      key={s.id}
                      className={cn(
                        'h-9 text-xs',
                        !s.is_active && 'opacity-40'
                      )}
                    >
                      <TableCell className="px-2 text-muted-foreground font-mono text-[10px]">
                        {s.sort_order || '–'}
                      </TableCell>
                      <TableCell className="px-2 font-medium text-sm max-w-[200px] truncate">
                        {s.name}
                      </TableCell>
                      <TableCell className="px-2">
                        {linkedAreas.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {linkedAreas.length} área{linkedAreas.length !== 1 ? 's' : ''}
                                </Badge>
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start">
                              <div className="space-y-1">
                                {linkedAreas.map((name: string) => (
                                  <div key={name} className="text-xs py-0.5 px-1">{name}</div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Sin áreas</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center px-1">
                        <button
                          onClick={() => handleQuickToggle(s, 'is_star', !s.is_star)}
                          className={cn(
                            'transition-colors',
                            s.is_star ? 'text-amber-500' : 'text-muted-foreground/30 hover:text-amber-400'
                          )}
                        >
                          <Star className="h-3.5 w-3.5 mx-auto" fill={s.is_star ? 'currentColor' : 'none'} />
                        </button>
                      </TableCell>
                      <TableCell className="text-center px-1">
                        {s.is_commercial_vertical && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">V</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center px-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1 py-0',
                            modelLabel === 'Ambos' && 'border-primary/40 text-primary',
                            modelLabel === 'Comisión' && 'border-success/40 text-success',
                            modelLabel === 'Compra' && 'border-blue-500/40 text-blue-600'
                          )}
                        >
                          {modelLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center px-1 font-mono text-[11px]">
                        {s.commission_allowed ? `${s.default_commission_percent ?? 20}%` : '—'}
                      </TableCell>
                      <TableCell className="text-center px-1">
                        <Switch
                          className="scale-75"
                          checked={s.visible_marketplace ?? true}
                          onCheckedChange={(v) => handleQuickToggle(s, 'visible_marketplace', v)}
                        />
                      </TableCell>
                      <TableCell className="text-center px-1">
                        <Switch
                          className="scale-75"
                          checked={s.is_active}
                          onCheckedChange={(v) => handleQuickToggle(s, 'is_active', v)}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!specialties || specialties.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground text-sm py-8">
                      Sin especialidades registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{form.id ? 'Editar' : 'Nueva'} Especialidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input className="h-8 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Orden</Label>
                <Input className="h-8 text-sm" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Áreas asociadas</Label>
              <ScrollArea className="border rounded-md p-2 h-32">
                <div className="space-y-1">
                  {activeAreas.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 py-0.5">
                      <Checkbox
                        className="h-3.5 w-3.5"
                        checked={form.areaIds.includes(a.id)}
                        onCheckedChange={() => toggleArea(a.id)}
                      />
                      <span className="text-xs">{a.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto px-1 py-0">
                        {a.area_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Activa</Label>
                <Switch className="scale-90" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Estrella</Label>
                <Switch className="scale-90" checked={form.is_star} onCheckedChange={(v) => setForm({ ...form, is_star: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Vertical</Label>
                <Switch className="scale-90" checked={form.is_commercial_vertical} onCheckedChange={(v) => setForm({ ...form, is_commercial_vertical: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Marketplace</Label>
                <Switch className="scale-90" checked={form.visible_marketplace} onCheckedChange={(v) => setForm({ ...form, visible_marketplace: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Compra</Label>
                <Switch className="scale-90" checked={form.direct_purchase_allowed} onCheckedChange={(v) => setForm({ ...form, direct_purchase_allowed: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Comisión</Label>
                <Switch className="scale-90" checked={form.commission_allowed} onCheckedChange={(v) => setForm({ ...form, commission_allowed: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs whitespace-nowrap">Override</Label>
                <Switch className="scale-90" checked={form.allows_override} onCheckedChange={(v) => setForm({ ...form, allows_override: v })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">% Comisión defecto</Label>
                <Input
                  className="h-8 text-sm"
                  type="number"
                  value={form.default_commission_percent ?? ''}
                  onChange={(e) => setForm({ ...form, default_commission_percent: e.target.value ? parseFloat(e.target.value) : null })}
                  disabled={!form.commission_allowed}
                />
              </div>
              <div>
                <Label className="text-xs">Precio sugerido (€)</Label>
                <Input
                  className="h-8 text-sm"
                  type="number"
                  value={form.suggested_fixed_price ?? ''}
                  onChange={(e) => setForm({ ...form, suggested_fixed_price: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending || !form.name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
