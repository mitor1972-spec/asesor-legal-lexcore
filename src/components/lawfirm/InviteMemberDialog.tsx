import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLawfirmProfile, useLawfirmBranches } from '@/hooks/useLawfirmProfile';
import { useMasterSpecialties } from '@/hooks/useMasterConfig';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AppRole } from '@/types';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GENERAL_BRANCH_VALUE = '__general__';

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { data: lawfirm } = useLawfirmProfile();
  const { data: branches = [] } = useLawfirmBranches();
  const { data: specialties = [] } = useMasterSpecialties();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState<string>(GENERAL_BRANCH_VALUE);
  const [role, setRole] = useState<AppRole>('lawfirm_lawyer');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setBranchId(GENERAL_BRANCH_VALUE);
      setRole('lawfirm_lawyer');
      setSelectedAreas([]);
    }
  }, [open]);

  // Areas available depend on selected branch
  const allActiveAreas = useMemo(
    () => (specialties as any[]).filter((s) => s.is_active),
    [specialties]
  );

  const availableAreas = useMemo(() => {
    if (branchId === GENERAL_BRANCH_VALUE) {
      // "General" branch -> all areas the lawfirm has accepted (or all if lawfirm has none defined)
      const firmAreas = lawfirm?.areas_accepted || [];
      if (firmAreas.length === 0) return allActiveAreas;
      return allActiveAreas.filter((a) => firmAreas.includes(a.name) || firmAreas.includes(a.id));
    }
    const branch = branches.find((b: any) => b.id === branchId) as any;
    const areas: string[] = branch?.areas_accepted || [];
    if (areas.length === 0) return [];
    return allActiveAreas.filter((a) => areas.includes(a.id));
  }, [branchId, allActiveAreas, branches, lawfirm]);

  // Reset selected areas when branch changes
  useEffect(() => {
    setSelectedAreas((prev) => prev.filter((id) => availableAreas.some((a: any) => a.id === id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error('El nombre es obligatorio');
      if (!email.trim()) throw new Error('El email es obligatorio');
      if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
          lawfirm_id: lawfirm?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId = data?.user?.id;
      if (!newUserId) throw new Error('No se pudo crear el usuario');

      // Update profile with branch + areas + phone
      const profileUpdate: any = {
        phone: phone.trim() || null,
        legal_areas: selectedAreas,
      };
      if (branchId !== GENERAL_BRANCH_VALUE) {
        profileUpdate.branch_id = branchId;
      }
      const { error: pErr } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', newUserId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-team'] });
      toast.success('Miembro añadido correctamente');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al invitar miembro'),
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
            <UserPlus className="h-5 w-5" />
            Añadir nuevo miembro
          </DialogTitle>
          <DialogDescription>
            El abogado podrá acceder con email y contraseña. Las áreas legales se filtran según la sucursal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nombre completo *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Contraseña inicial * (mín. 8 caracteres)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="El abogado podrá cambiarla luego"
              />
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL_BRANCH_VALUE}>General (sin sucursal)</SelectItem>
                  {(branches as any[]).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lawfirm_lawyer">Abogado</SelectItem>
                  <SelectItem value="lawfirm_manager">Gerente</SelectItem>
                  <SelectItem value="lawfirm_admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Áreas legales asignadas</Label>
            <p className="text-xs text-muted-foreground">
              {branchId === GENERAL_BRANCH_VALUE
                ? 'Mostrando áreas disponibles del despacho.'
                : 'Solo áreas que cubre la sucursal seleccionada.'}
            </p>
            {availableAreas.length === 0 ? (
              <div className="border rounded-md p-4 text-sm text-muted-foreground text-center">
                Esta sucursal no tiene áreas legales configuradas. Edita la sucursal primero.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto border rounded-md p-3">
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
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={inviteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Añadir miembro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
