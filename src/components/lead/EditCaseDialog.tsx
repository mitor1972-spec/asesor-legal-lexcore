import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AREAS_LEGALES, URGENCY_LEVELS } from '@/lib/constants';
import { useUpdateLead } from '@/hooks/useLeads';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  structuredFields: Record<string, unknown> | null;
  onSuccess?: () => void;
}

export function EditCaseDialog({ open, onOpenChange, leadId, structuredFields, onSuccess }: EditCaseDialogProps) {
  const updateMutation = useUpdateLead();
  
  const [formData, setFormData] = useState({
    area_legal: '',
    subarea: '',
    cuantia: '',
    urgencia_aplica: false,
    urgencia_nivel: '',
  });

  useEffect(() => {
    if (structuredFields && open) {
      setFormData({
        area_legal: (structuredFields.area_legal as string) || '',
        subarea: (structuredFields.subarea as string) || '',
        cuantia: structuredFields.cuantia ? String(structuredFields.cuantia) : '',
        urgencia_aplica: Boolean(structuredFields.urgencia_aplica),
        urgencia_nivel: (structuredFields.urgencia_nivel as string) || '',
      });
    }
  }, [structuredFields, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newFields = {
        ...structuredFields,
        area_legal: formData.area_legal || undefined,
        subarea: formData.subarea,
        cuantia: formData.cuantia ? parseFloat(formData.cuantia) : null,
        urgencia_aplica: formData.urgencia_aplica,
        urgencia_nivel: formData.urgencia_aplica ? formData.urgencia_nivel : null,
      };

      await updateMutation.mutateAsync({
        id: leadId,
        structured_fields: newFields as any,
      });

      toast.success('Datos del caso actualizados');
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
          <DialogTitle>Editar datos del caso</DialogTitle>
          <DialogDescription>
            Modifica la clasificación y detalles del caso
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="area_legal">Área Legal</Label>
            <Select
              value={formData.area_legal}
              onValueChange={(value) => setFormData(prev => ({ ...prev, area_legal: value }))}
            >
              <SelectTrigger id="area_legal">
                <SelectValue placeholder="Seleccionar área" />
              </SelectTrigger>
              <SelectContent>
                {AREAS_LEGALES.map((area) => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subarea">Subárea / Tipo de caso</Label>
            <Input
              id="subarea"
              value={formData.subarea}
              onChange={(e) => setFormData(prev => ({ ...prev, subarea: e.target.value }))}
              placeholder="Ej: Divorcio contencioso"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuantia">Cuantía estimada (€)</Label>
            <Input
              id="cuantia"
              type="number"
              value={formData.cuantia}
              onChange={(e) => setFormData(prev => ({ ...prev, cuantia: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="urgencia_aplica">¿Caso urgente?</Label>
              <p className="text-sm text-muted-foreground">Marcar si hay plazos críticos</p>
            </div>
            <Switch
              id="urgencia_aplica"
              checked={formData.urgencia_aplica}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, urgencia_aplica: checked }))}
            />
          </div>

          {formData.urgencia_aplica && (
            <div className="space-y-2">
              <Label htmlFor="urgencia_nivel">Nivel de urgencia</Label>
              <Select
                value={formData.urgencia_nivel}
                onValueChange={(value) => setFormData(prev => ({ ...prev, urgencia_nivel: value }))}
              >
                <SelectTrigger id="urgencia_nivel">
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
