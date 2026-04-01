import { useState } from 'react';
import { useMasterLegalAreas, useUpsertLegalArea } from '@/hooks/useMasterConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil } from 'lucide-react';

interface AreaForm {
  id?: string;
  name: string;
  area_type: string;
  is_active: boolean;
  visible_marketplace: boolean;
  priority_order: number;
  icon: string;
}

const emptyForm: AreaForm = {
  name: '',
  area_type: 'principal',
  is_active: true,
  visible_marketplace: true,
  priority_order: 0,
  icon: '',
};

export function LegalAreasTab() {
  const { data: areas, isLoading } = useMasterLegalAreas();
  const upsert = useUpsertLegalArea();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AreaForm>(emptyForm);

  const openNew = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setForm({
      id: a.id,
      name: a.name,
      area_type: a.area_type,
      is_active: a.is_active,
      visible_marketplace: a.visible_marketplace,
      priority_order: a.priority_order,
      icon: a.icon || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    upsert.mutate(
      { ...form, icon: form.icon || null },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  const toggleActive = (a: any) => {
    upsert.mutate({ ...a, is_active: !a.is_active });
  };

  const principals = (areas || []).filter((a) => a.area_type === 'principal');
  const specialized = (areas || []).filter((a) => a.area_type === 'especializada');

  if (isLoading) return <p className="text-muted-foreground text-sm">Cargando...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Áreas Legales</CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nueva Área
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Principal */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">▾ Áreas Principales</h3>
            <AreaTable areas={principals} onEdit={openEdit} onToggle={toggleActive} />
          </div>
          {/* Specialized */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">▾ Áreas Especializadas</h3>
            {specialized.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin áreas especializadas</p>
            ) : (
              <AreaTable areas={specialized} onEdit={openEdit} onToggle={toggleActive} />
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar' : 'Nueva'} Área Legal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.area_type} onValueChange={(v) => setForm({ ...form, area_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="especializada">Especializada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orden de prioridad</Label>
              <Input type="number" value={form.priority_order} onChange={(e) => setForm({ ...form, priority_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Icono (opcional)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="nombre-icono" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Activa</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Visible en Marketplace</Label>
              <Switch checked={form.visible_marketplace} onCheckedChange={(v) => setForm({ ...form, visible_marketplace: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AreaTable({ areas, onEdit, onToggle }: { areas: any[]; onEdit: (a: any) => void; onToggle: (a: any) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="w-20 text-center">Orden</TableHead>
          <TableHead className="w-28 text-center">Marketplace</TableHead>
          <TableHead className="w-20 text-center">Activa</TableHead>
          <TableHead className="w-16" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {areas.map((a) => (
          <TableRow key={a.id} className={!a.is_active ? 'opacity-50' : ''}>
            <TableCell className="font-medium">{a.name}</TableCell>
            <TableCell className="text-center">{a.priority_order}</TableCell>
            <TableCell className="text-center">
              {a.visible_marketplace ? (
                <Badge variant="default" className="text-xs">Sí</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">No</Badge>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Switch checked={a.is_active} onCheckedChange={() => onToggle(a)} />
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => onEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {areas.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
              Sin áreas registradas
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
