import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AREAS_LEGALES, PROVINCIAS_ESPANA, URGENCY_LEVELS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLawfirmBranches, useLawfirmTeam, useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useMasterSpecialties } from '@/hooks/useMasterConfig';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, User, Scale, Euro, FileText, StickyNote, Building2 } from 'lucide-react';

interface NewCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CASE_TYPES = [
  { value: 'crm_manual', label: 'Caso propio del despacho' },
  { value: 'compra_directa', label: 'Compra directa' },
  { value: 'comision', label: 'Comisión' },
];

const ECONOMIC_STATUSES = [
  { value: 'pending_budget', label: 'Pendiente presupuesto' },
  { value: 'budget_accepted', label: 'Presupuesto aceptado' },
  { value: 'in_execution', label: 'En ejecución' },
  { value: 'collected', label: 'Cobrado' },
  { value: 'uncollectible', label: 'Incobrable' },
];

export function NewCaseDialog({ open, onOpenChange }: NewCaseDialogProps) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [client, setClient] = useState({
    nombre: '', apellidos: '', telefono: '', email: '', direccion: '', notas_cliente: '',
  });

  const [legal, setLegal] = useState({
    area_legal: '', subarea: '', case_type: 'crm_manual', provincia: '',
    cuantia: '', urgencia: false, urgencia_nivel: '', caso_estrella: false,
  });

  const [economics, setEconomics] = useState({
    minuta_fija: '', otros_cargos: '', porcentaje_exito: '',
    cuantia_exito: '', estado_economico: 'pending_budget',
  });

  const [notes, setNotes] = useState({
    cronologia: '', estrategia: '', observaciones: '',
  });

  const [descripcion, setDescripcion] = useState('');

  const resetForm = () => {
    setClient({ nombre: '', apellidos: '', telefono: '', email: '', direccion: '', notas_cliente: '' });
    setLegal({ area_legal: '', subarea: '', case_type: 'crm_manual', provincia: '', cuantia: '', urgencia: false, urgencia_nivel: '', caso_estrella: false });
    setEconomics({ minuta_fija: '', otros_cargos: '', porcentaje_exito: '', cuantia_exito: '', estado_economico: 'pending_budget' });
    setNotes({ cronologia: '', estrategia: '', observaciones: '' });
    setDescripcion('');
  };

  const handleSubmit = async () => {
    if (!client.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!user?.profile?.lawfirm_id) {
      toast.error('No tienes un despacho asociado');
      return;
    }

    setIsSubmitting(true);
    try {
      const structuredFields: Record<string, unknown> = {
        nombre: client.nombre,
        apellidos: client.apellidos,
        telefono: client.telefono,
        email: client.email,
        direccion: client.direccion,
        notas_cliente: client.notas_cliente,
        area_legal: legal.area_legal,
        subarea: legal.subarea,
        provincia: legal.provincia,
        cuantia: legal.cuantia ? parseFloat(legal.cuantia) : null,
        urgencia_aplica: legal.urgencia,
        urgencia_nivel: legal.urgencia ? legal.urgencia_nivel : null,
        caso_estrella: legal.caso_estrella,
        case_type: legal.case_type,
        estado_economico: economics.estado_economico,
        minuta_fija: economics.minuta_fija ? parseFloat(economics.minuta_fija) : null,
        otros_cargos: economics.otros_cargos ? parseFloat(economics.otros_cargos) : null,
        porcentaje_exito: economics.porcentaje_exito ? parseFloat(economics.porcentaje_exito) : null,
        cuantia_exito: economics.cuantia_exito ? parseFloat(economics.cuantia_exito) : null,
        notas_cronologia: notes.cronologia,
        notas_estrategia: notes.estrategia,
        notas_observaciones: notes.observaciones,
        origen: 'CRM Manual',
      };

      const leadText = `Cliente: ${client.nombre} ${client.apellidos}\nTeléfono: ${client.telefono}\nEmail: ${client.email}\n\n${descripcion}`;

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          lead_text: leadText,
          source_channel: 'Web chat',
          status_internal: 'Aceptado',
          structured_fields: structuredFields as any,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      const assignmentData: Record<string, unknown> = {
        lead_id: lead.id,
        lawfirm_id: user.profile.lawfirm_id,
        firm_status: 'received',
        status_delivery: 'delivered',
        service_type: legal.case_type,
        assigned_by_user_id: user.id,
        is_commission: legal.case_type === 'comision',
        client_fee: economics.minuta_fija ? parseFloat(economics.minuta_fija) : null,
        success_percentage: economics.porcentaje_exito ? parseFloat(economics.porcentaje_exito) : null,
        claimed_amount: economics.cuantia_exito ? parseFloat(economics.cuantia_exito) : null,
        firm_notes: [notes.cronologia, notes.estrategia, notes.observaciones].filter(Boolean).join('\n\n---\n\n') || null,
      };

      const { error: assignError } = await supabase
        .from('lead_assignments')
        .insert(assignmentData as any);

      if (assignError) throw assignError;

      toast.success('Caso creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Error al crear el caso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Caso — CRM Despacho
          </DialogTitle>
          <DialogDescription>Crea un caso con toda la configuración profesional</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="client" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start shrink-0">
            <TabsTrigger value="client" className="text-xs gap-1"><User className="h-3.5 w-3.5" />Cliente</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs gap-1"><Scale className="h-3.5 w-3.5" />Legal</TabsTrigger>
            <TabsTrigger value="economics" className="text-xs gap-1"><Euro className="h-3.5 w-3.5" />Economía</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1"><StickyNote className="h-3.5 w-3.5" />Notas</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1 mt-3">
            {/* CLIENT TAB */}
            <TabsContent value="client" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={client.nombre} onChange={e => setClient(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Apellidos</Label>
                  <Input value={client.apellidos} onChange={e => setClient(p => ({ ...p, apellidos: e.target.value }))} placeholder="Pérez García" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={client.telefono} onChange={e => setClient(p => ({ ...p, telefono: e.target.value }))} placeholder="612345678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={client.email} onChange={e => setClient(p => ({ ...p, email: e.target.value }))} placeholder="cliente@email.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dirección</Label>
                <Input value={client.direccion} onChange={e => setClient(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle, nº, CP, Ciudad" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción del caso</Label>
                <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe el caso legal..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notas sobre el cliente</Label>
                <Textarea value={client.notas_cliente} onChange={e => setClient(p => ({ ...p, notas_cliente: e.target.value }))} placeholder="Observaciones sobre el cliente..." rows={2} />
              </div>
            </TabsContent>

            {/* LEGAL TAB */}
            <TabsContent value="legal" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Área Legal</Label>
                  <Select value={legal.area_legal} onValueChange={v => setLegal(p => ({ ...p, area_legal: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {AREAS_LEGALES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subárea / Tipo</Label>
                  <Input value={legal.subarea} onChange={e => setLegal(p => ({ ...p, subarea: e.target.value }))} placeholder="Ej: Divorcio contencioso" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de caso</Label>
                  <Select value={legal.case_type} onValueChange={v => setLegal(p => ({ ...p, case_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Provincia</Label>
                  <Select value={legal.provincia} onValueChange={v => setLegal(p => ({ ...p, provincia: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_ESPANA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cuantía estimada (€)</Label>
                  <Input type="number" value={legal.cuantia} onChange={e => setLegal(p => ({ ...p, cuantia: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-xs font-medium">¿Urgente?</Label>
                  <p className="text-xs text-muted-foreground">Plazos críticos</p>
                </div>
                <Switch checked={legal.urgencia} onCheckedChange={c => setLegal(p => ({ ...p, urgencia: c }))} />
              </div>
              {legal.urgencia && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Nivel de urgencia</Label>
                  <Select value={legal.urgencia_nivel} onValueChange={v => setLegal(p => ({ ...p, urgencia_nivel: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {URGENCY_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-xs font-medium">Caso estrella</Label>
                  <p className="text-xs text-muted-foreground">Destacar internamente</p>
                </div>
                <Switch checked={legal.caso_estrella} onCheckedChange={c => setLegal(p => ({ ...p, caso_estrella: c }))} />
              </div>
            </TabsContent>

            {/* ECONOMICS TAB */}
            <TabsContent value="economics" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Minuta fija (€)</Label>
                  <Input type="number" value={economics.minuta_fija} onChange={e => setEconomics(p => ({ ...p, minuta_fija: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Otros cargos (€)</Label>
                  <Input type="number" value={economics.otros_cargos} onChange={e => setEconomics(p => ({ ...p, otros_cargos: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">% Variable a éxito</Label>
                  <Input type="number" min={0} max={100} value={economics.porcentaje_exito} onChange={e => setEconomics(p => ({ ...p, porcentaje_exito: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cuantía estimada éxito (€)</Label>
                  <Input type="number" value={economics.cuantia_exito} onChange={e => setEconomics(p => ({ ...p, cuantia_exito: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado económico</Label>
                <Select value={economics.estado_economico} onValueChange={v => setEconomics(p => ({ ...p, estado_economico: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ECONOMIC_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {legal.case_type === 'comision' && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-xs">Información de comisión</p>
                  <p className="text-xs text-muted-foreground">
                    Este caso es comisionable. La comisión se calculará automáticamente según la configuración vigente al cerrar el caso.
                  </p>
                </div>
              )}

              {/* Preview */}
              {(economics.minuta_fija || economics.porcentaje_exito) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium">Resumen estimado</p>
                  {economics.minuta_fija && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Minuta fija:</span>
                      <span>{parseFloat(economics.minuta_fija).toLocaleString('es-ES')} €</span>
                    </div>
                  )}
                  {economics.otros_cargos && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Otros cargos:</span>
                      <span>{parseFloat(economics.otros_cargos).toLocaleString('es-ES')} €</span>
                    </div>
                  )}
                  {economics.porcentaje_exito && economics.cuantia_exito && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Fee éxito estimado ({economics.porcentaje_exito}%):</span>
                      <span>{(parseFloat(economics.cuantia_exito) * parseFloat(economics.porcentaje_exito) / 100).toLocaleString('es-ES')} €</span>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* NOTES TAB */}
            <TabsContent value="notes" className="mt-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cronología</Label>
                <Textarea value={notes.cronologia} onChange={e => setNotes(p => ({ ...p, cronologia: e.target.value }))} placeholder="Hechos relevantes en orden cronológico..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estrategia</Label>
                <Textarea value={notes.estrategia} onChange={e => setNotes(p => ({ ...p, estrategia: e.target.value }))} placeholder="Línea de actuación prevista..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observaciones</Label>
                <Textarea value={notes.observaciones} onChange={e => setNotes(p => ({ ...p, observaciones: e.target.value }))} placeholder="Otras observaciones relevantes..." rows={3} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="bg-muted/50 rounded-md p-2.5 text-xs text-muted-foreground shrink-0 mt-2">
          <p>• Caso creado directamente en tu despacho • Sin coste ni scoring Lexcore • Origen: CRM Manual</p>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear caso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
