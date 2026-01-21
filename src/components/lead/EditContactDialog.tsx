import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVINCIAS_ESPANA } from '@/lib/constants';
import { useUpdateLead } from '@/hooks/useLeads';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getRealName, getContactPhone, getContactEmail } from '@/lib/contactUtils';

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  structuredFields: Record<string, unknown> | null;
  onSuccess?: () => void;
}

export function EditContactDialog({ open, onOpenChange, leadId, structuredFields, onSuccess }: EditContactDialogProps) {
  const updateMutation = useUpdateLead();
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    ciudad: '',
    provincia: '',
  });

  useEffect(() => {
    if (structuredFields && open) {
      // Use helper functions that exclude aliases
      const realName = getRealName(structuredFields);
      setFormData({
        nombre: realName || '',
        apellidos: (structuredFields.apellidos as string) || '',
        telefono: getContactPhone(structuredFields) || '',
        email: getContactEmail(structuredFields) || '',
        ciudad: (structuredFields.ciudad as string) || '',
        provincia: (structuredFields.provincia as string) || '',
      });
    }
  }, [structuredFields, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newFields = {
        ...structuredFields,
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        telefono: formData.telefono,
        email: formData.email,
        ciudad: formData.ciudad,
        provincia: formData.provincia || undefined,
      };

      await updateMutation.mutateAsync({
        id: leadId,
        structured_fields: newFields as any,
      });

      toast.success('Datos de contacto actualizados');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Error al guardar los cambios');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar datos de contacto</DialogTitle>
          <DialogDescription>
            Modifica la información de contacto del lead
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input
                id="apellidos"
                value={formData.apellidos}
                onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                placeholder="Apellidos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@ejemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                placeholder="Ciudad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provincia">Provincia</Label>
              <Select
                value={formData.provincia}
                onValueChange={(value) => setFormData(prev => ({ ...prev, provincia: value }))}
              >
                <SelectTrigger id="provincia">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCIAS_ESPANA.map((prov) => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
