import { useState } from 'react';
import { useMasterLawfirmCommissions, useUpsertLawfirmCommission, useMasterSpecialties } from '@/hooks/useMasterConfig';
import { useLawfirms } from '@/hooks/useLawfirms';
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

interface CommForm {
  id?: string;
  lawfirm_id: string;
  specialty_id: string;
  commission_percent: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const emptyForm: CommForm = {
  lawfirm_id: '',
  specialty_id: '',
  commission_percent: 20,
  is_active: true,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
};

export function LawfirmCommissionsTab() {
  const { data: commissions, isLoading } = useMasterLawfirmCommissions();
  const { data: lawfirms } = useLawfirms();
  const { data: specialties } = useMasterSpecialties();
  const upsert = useUpsertLawfirmCommission();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CommForm>(emptyForm);

  const openNew = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setForm({
      id: c.id,
      lawfirm_id: c.lawfirm_id,
      specialty_id: c.specialty_id,
      commission_percent: c.commission_percent,
      is_active: c.is_active,
      start_date: c.start_date,
      end_date: c.end_date || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.lawfirm_id || !form.specialty_id) return;
    upsert.mutate(
      { ...form, end_date: form.end_date || null },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Cargando...</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Comisiones por Despacho</CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nueva Comisión
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Prioridad: Comisión despacho → % especialidad → Comisión global
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Despacho</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead className="text-center">% Comisión</TableHead>
                <TableHead className="text-center">Desde</TableHead>
                <TableHead className="text-center">Hasta</TableHead>
                <TableHead className="text-center">Activa</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(commissions || []).map((c: any) => (
                <TableRow key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{c.lawfirms?.name || '—'}</TableCell>
                  <TableCell>{c.master_specialties?.name || '—'}</TableCell>
                  <TableCell className="text-center">{c.commission_percent}%</TableCell>
                  <TableCell className="text-center text-sm">{c.start_date}</TableCell>
                  <TableCell className="text-center text-sm">{c.end_date || '∞'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs">
                      {c.is_active ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!commissions || commissions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                    Sin comisiones personalizadas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar' : 'Nueva'} Comisión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Despacho</Label>
              <Select value={form.lawfirm_id} onValueChange={(v) => setForm({ ...form, lawfirm_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar despacho" /></SelectTrigger>
                <SelectContent>
                  {(lawfirms || []).map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Especialidad</Label>
              <Select value={form.specialty_id} onValueChange={(v) => setForm({ ...form, specialty_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar especialidad" /></SelectTrigger>
                <SelectContent>
                  {(specialties || []).filter((s: any) => s.is_active && s.commission_allowed).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>% Comisión</Label>
              <Input
                type="number"
                value={form.commission_percent}
                onChange={(e) => setForm({ ...form, commission_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Fecha fin (opcional)</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Activa</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
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
