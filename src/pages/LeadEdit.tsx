import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLead, useUpdateLead } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AREAS_LEGALES, PROVINCIAS_ESPANA, SOURCE_CHANNELS, URGENCY_LEVELS, type SourceChannel, type AreaLegal, type Provincia, type UrgencyLevel } from '@/lib/constants';
import type { StructuredFields } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function LeadEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const updateMutation = useUpdateLead();
  
  const [leadText, setLeadText] = useState('');
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>('Web chat');
  const [fields, setFields] = useState<StructuredFields>({ urgencia_aplica: false, n_despachos: 1 });

  useEffect(() => {
    if (lead) {
      setLeadText(lead.lead_text);
      setSourceChannel(lead.source_channel);
      setFields(lead.structured_fields || { urgencia_aplica: false, n_despachos: 1 });
    }
  }, [lead]);

  const updateField = <K extends keyof StructuredFields>(key: K, value: StructuredFields[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (leadText.length < 50) {
      toast.error('El texto del lead debe tener al menos 50 caracteres');
      return;
    }
    if (!fields.area_legal) {
      toast.error('Selecciona un área legal');
      return;
    }
    try {
      await updateMutation.mutateAsync({ 
        id, 
        lead_text: leadText, 
        source_channel: sourceChannel, 
        structured_fields: fields 
      });
      toast.success('Lead actualizado correctamente');
      navigate(`/leads/${id}`);
    } catch {
      toast.error('Error al actualizar el lead');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Lead no encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Editar Lead</h1>
          <p className="text-muted-foreground">Lead #{id?.slice(0, 8)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle>Contenido del Lead</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-text">Conversación / Texto del lead *</Label>
              <Textarea 
                id="lead-text" 
                placeholder="Describe el caso del cliente..." 
                className="min-h-[200px]" 
                value={leadText} 
                onChange={e => setLeadText(e.target.value)} 
                required 
              />
              <p className="text-xs text-muted-foreground">{leadText.length}/50 caracteres mínimo</p>
            </div>
            <div className="space-y-2">
              <Label>Canal de entrada</Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_CHANNELS.map(ch => (
                  <Button 
                    key={ch} 
                    type="button" 
                    variant={sourceChannel === ch ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setSourceChannel(ch)}
                  >
                    {ch}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Datos de Contacto</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={fields.nombre || ''} onChange={e => updateField('nombre', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={fields.apellidos || ''} onChange={e => updateField('apellidos', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input type="tel" value={fields.telefono || ''} onChange={e => updateField('telefono', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={fields.email || ''} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={fields.ciudad || ''} onChange={e => updateField('ciudad', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Select value={fields.provincia || ''} onValueChange={v => updateField('provincia', v as Provincia)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {PROVINCIAS_ESPANA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle>Clasificación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Área Legal *</Label>
                <Select value={fields.area_legal || ''} onValueChange={v => updateField('area_legal', v as AreaLegal)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                  <SelectContent>
                    {AREAS_LEGALES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subárea</Label>
                <Input value={fields.subarea || ''} onChange={e => updateField('subarea', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cuantía (€)</Label>
                <Input 
                  type="number" 
                  value={fields.cuantia ?? ''} 
                  onChange={e => updateField('cuantia', e.target.value ? Number(e.target.value) : null)} 
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="urgencia" 
                  checked={fields.urgencia_aplica || false} 
                  onCheckedChange={c => updateField('urgencia_aplica', !!c)} 
                />
                <Label htmlFor="urgencia">Urgencia aplica</Label>
              </div>
              {fields.urgencia_aplica && (
                <Select value={fields.urgencia_nivel || ''} onValueChange={v => updateField('urgencia_nivel', v as UrgencyLevel)}>
                  <SelectTrigger><SelectValue placeholder="Nivel de urgencia" /></SelectTrigger>
                  <SelectContent>
                    {URGENCY_LEVELS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle>Notas Internas</CardTitle></CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Notas del operador..." 
                value={fields.notas_operador || ''} 
                onChange={e => updateField('notas_operador', e.target.value)} 
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" className="gradient-brand" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
