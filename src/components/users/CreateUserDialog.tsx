import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Shield, ShieldCheck, Building2, Briefcase, Scale, Loader2 } from 'lucide-react';
import type { AppRole } from '@/types';

const ROLE_LABELS: Record<AppRole, { label: string; icon: typeof Shield }> = {
  admin: { label: 'Administrador', icon: ShieldCheck },
  operator: { label: 'Operador', icon: Shield },
  lawfirm_admin: { label: 'Admin Bufete', icon: Building2 },
  lawfirm_manager: { label: 'Gerente Bufete', icon: Briefcase },
  lawfirm_lawyer: { label: 'Abogado', icon: Scale },
};

interface CreateUserDialogProps {
  availableRoles?: AppRole[];
  defaultLawfirmId?: string;
}

export function CreateUserDialog({ 
  availableRoles = ['admin', 'operator', 'lawfirm_admin', 'lawfirm_manager', 'lawfirm_lawyer'],
  defaultLawfirmId 
}: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [lawfirmId, setLawfirmId] = useState(defaultLawfirmId || '');
  const queryClient = useQueryClient();

  // Fetch lawfirms for selection (only if admin roles are available)
  const { data: lawfirms } = useQuery({
    queryKey: ['lawfirms-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lawfirms')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: availableRoles.some(r => r.startsWith('lawfirm_')),
  });

  const isLawfirmRole = role.startsWith('lawfirm_');
  const showLawfirmSelector = isLawfirmRole && !defaultLawfirmId;

  const createUserMutation = useMutation({
    mutationFn: async () => {
      // 1. Create user via Supabase Auth admin API (using edge function)
      const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          full_name: fullName,
          role,
          lawfirm_id: isLawfirmRole ? (defaultLawfirmId || lawfirmId) : null,
        },
      });

      if (authError) throw authError;
      if (authData?.error) throw new Error(authData.error);

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-users'] });
      toast.success('Usuario creado correctamente');
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Error al crear el usuario');
    },
  });

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('');
    setLawfirmId(defaultLawfirmId || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName || !role) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (isLawfirmRole && !defaultLawfirmId && !lawfirmId) {
      toast.error('Debes seleccionar un despacho para este rol');
      return;
    }

    createUserMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Crear Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Introduce los datos del nuevo usuario. Se le enviará un email de confirmación.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan García"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => {
                    const info = ROLE_LABELS[r];
                    const Icon = info.icon;
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {info.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {showLawfirmSelector && (
              <div className="space-y-2">
                <Label htmlFor="lawfirm">Despacho</Label>
                <Select value={lawfirmId} onValueChange={setLawfirmId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un despacho" />
                  </SelectTrigger>
                  <SelectContent>
                    {lawfirms?.map((lf) => (
                      <SelectItem key={lf.id} value={lf.id}>
                        {lf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={createUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Usuario'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
