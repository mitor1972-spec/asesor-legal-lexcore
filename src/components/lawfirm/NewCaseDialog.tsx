import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AREAS_LEGALES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

interface NewCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCaseDialog({ open, onOpenChange }: NewCaseDialogProps) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    area_legal: '',
    descripcion: '',
    notas: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!user?.profile?.lawfirm_id) {
      toast.error('No tienes un despacho asociado');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          lead_text: `Cliente: ${formData.nombre}\nTeléfono: ${formData.telefono}\nEmail: ${formData.email}\n\n${formData.descripcion}`,
          source_channel: 'Web chat',
          status_internal: 'Aceptado',
          structured_fields: {
            nombre: formData.nombre,
            telefono: formData.telefono,
            email: formData.email,
            area_legal: formData.area_legal,
            origen: 'CRM Manual',
          },
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 2. Create the assignment directly to the lawfirm
      const { error: assignError } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: lead.id,
          lawfirm_id: user.profile.lawfirm_id,
          firm_status: 'received',
          status_delivery: 'delivered',
          firm_notes: formData.notas || null,
          service_type: 'crm_manual',
          assigned_by_user_id: user.id,
        });

      if (assignError) throw assignError;

      toast.success('Caso creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      onOpenChange(false);
      
      // Reset form
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        area_legal: '',
        descripcion: '',
        notas: '',
      });
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Error al crear el caso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Caso Manual
          </DialogTitle>
          <DialogDescription>
            Crea un caso para gestionar clientes propios en tu CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del cliente *</Label>
              <Input 
                id="nombre" 
                value={formData.nombre}
                onChange={e => handleInputChange('nombre', e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input 
                id="telefono" 
                value={formData.telefono}
                onChange={e => handleInputChange('telefono', e.target.value)}
                placeholder="612345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area_legal">Área legal</Label>
              <Select value={formData.area_legal} onValueChange={v => handleInputChange('area_legal', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS_LEGALES.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción del caso</Label>
            <Textarea 
              id="descripcion" 
              value={formData.descripcion}
              onChange={e => handleInputChange('descripcion', e.target.value)}
              placeholder="Describe el caso legal..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas internas</Label>
            <Textarea 
              id="notas" 
              value={formData.notas}
              onChange={e => handleInputChange('notas', e.target.value)}
              placeholder="Notas privadas sobre el caso..."
              rows={2}
            />
          </div>

          <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
            <p>• Este caso se creará directamente en tu despacho</p>
            <p>• No tiene coste y no pasa por el scoring Lexcore</p>
            <p>• Se marcará como "Origen: CRM Manual"</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear caso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
