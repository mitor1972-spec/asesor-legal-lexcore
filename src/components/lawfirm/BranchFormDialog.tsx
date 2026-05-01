import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMasterSpecialties } from '@/hooks/useMasterConfig';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Building, Save } from 'lucide-react';
import { toast } from 'sonner';

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: {
    id: string;
    name: string;
    city?: string | null;
    province?: string | null;
    address?: string | null;
    phone?: string | null;
    email_derivations?: string | null;
    areas_accepted?: string[] | null;
  } | null;
}

export function BranchFormDialog({ open, onOpenChange, branch }: BranchFormDialogProps) {
  const { data: lawfirm } = useLawfirmProfile();
  const { data: specialties = [], isLoading: loadingAreas } = useMasterSpecialties();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(branch?.name || '');
      setCity(branch?.city || '');
      setProvince(branch?.province || '');
      setAddress(branch?.address || '');
      setPhone(branch?.phone || '');
      setEmail(branch?.email_derivations || '');
      setSelectedAreas(branch?.areas_accepted || []);
    }
  }, [open, branch]);

  // Filter active specialties only
  const availableAreas = (specialties as any[]).filter((s) => s.is_active);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!lawfirm?.id) throw new Error('No lawfirm');
      if (!name.trim()) throw new Error('El nombre es obligatorio');

      const payload: any = {
        lawfirm_id: lawfirm.id,
        name: name.trim(),
        city: city.trim() || null,
        province: province.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email_derivations: email.trim() || null,
        areas_accepted: selectedAreas,
      };

      if (branch?.id) {
        const { error } = await supabase.from('branches').update(payload).eq('id', branch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-branches'] });
      toast.success(branch ? 'Sucursal actualizada' : 'Sucursal creada correctamente');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la sucursal'),
  });

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {branch ? 'Editar sucursal' : 'Crear nueva sucursal'}
          </DialogTitle>
          <DialogDescription>
            Las áreas legales que asignes definirán qué casos pueden gestionar los abogados de esta sucursal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="branch-name">Nombre de la sucursal *</Label>
              <Input
                id="branch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Hispajuris Madrid"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-city">Ciudad</Label>
              <Input id="branch-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-province">Provincia</Label>
              <Input
                id="branch-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="branch-address">Dirección</Label>
              <Input
                id="branch-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Teléfono</Label>
              <Input id="branch-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-email">Email derivaciones</Label>
              <Input
                id="branch-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Áreas legales que cubre esta sucursal</Label>
            <p className="text-xs text-muted-foreground">
              Los abogados de esta sucursal solo podrán trabajar las áreas seleccionadas.
            </p>
            {loadingAreas ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {availableAreas.map((area: any) => (
                  <label
                    key={area.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                  >
                    <Checkbox
                      checked={selectedAreas.includes(area.id)}
                      onCheckedChange={() => toggleArea(area.id)}
                    />
                    <span>{area.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedAreas.length} área{selectedAreas.length !== 1 ? 's' : ''} seleccionada
              {selectedAreas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {branch ? 'Guardar cambios' : 'Crear sucursal'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
