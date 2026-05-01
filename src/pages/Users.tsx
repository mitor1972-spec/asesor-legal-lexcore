import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users as UsersIcon, Shield, ShieldCheck, Building2, Briefcase, Scale } from 'lucide-react';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import type { AppRole } from '@/types';

const ROLE_LABELS: Record<AppRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Administrador', icon: ShieldCheck, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  operator: { label: 'Operador', icon: Shield, color: 'bg-primary/10 text-primary border-primary/20' },
  lawfirm_admin: { label: 'Admin Bufete', icon: Building2, color: 'bg-warning/10 text-warning border-warning/20' },
  lawfirm_manager: { label: 'Gerente Bufete', icon: Briefcase, color: 'bg-success/10 text-success border-success/20' },
  lawfirm_lawyer: { label: 'Abogado', icon: Scale, color: 'bg-muted text-muted-foreground border-border' },
};

const ALL_ROLES: AppRole[] = ['admin', 'operator', 'lawfirm_admin', 'lawfirm_manager', 'lawfirm_lawyer'];

type UserWithRole = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string | null;
  role: AppRole | null;
};

export default function Users() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge data
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]));
      
      return (profiles || []).map(p => ({
        ...p,
        role: rolesMap.get(p.id) || null,
      })) as UserWithRole[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Check if user already has a role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rol actualizado');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar el rol');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      console.error('Error toggling active:', error);
      toast.error('Error al cambiar el estado');
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" />
            Usuarios
          </h1>
          <p className="text-muted-foreground">Gestiona los usuarios y sus roles</p>
        </div>
        <CreateUserDialog />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha registro</TableHead>
                <TableHead className="text-center">Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((user) => {
                  const roleInfo = user.role ? ROLE_LABELS[user.role] : null;
                  const RoleIcon = roleInfo?.icon || Shield;
                  
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={(e) => {
                        // No interceptar si pulsan en el Select o el Switch
                        if ((e.target as HTMLElement).closest('button, [role="combobox"], [role="switch"]')) return;
                        toast.info(`${user.full_name || user.email} — usa el selector de rol o el switch para editar`);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || ''}
                          onValueChange={(value) => {
                            updateRoleMutation.mutate({ userId: user.id, newRole: value as AppRole });
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sin rol">
                              {user.role && (
                                <div className="flex items-center gap-2">
                                  <RoleIcon className="h-4 w-4" />
                                  {ROLE_LABELS[user.role].label}
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map((role) => {
                              const info = ROLE_LABELS[role];
                              const Icon = info.icon;
                              return (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {info.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.created_at
                          ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: es })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={user.is_active ?? true}
                          onCheckedChange={(checked) => {
                            toggleActiveMutation.mutate({ userId: user.id, isActive: checked });
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Descripción de Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_ROLES.map((role) => {
              const info = ROLE_LABELS[role];
              const Icon = info.icon;
              return (
                <div key={role} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className={`p-2 rounded-lg ${info.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <Badge className={info.color}>{info.label}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role === 'admin' && 'Acceso total al sistema'}
                      {role === 'operator' && 'Gestión de leads y derivaciones'}
                      {role === 'lawfirm_admin' && 'Admin del bufete'}
                      {role === 'lawfirm_manager' && 'Gerente del bufete'}
                      {role === 'lawfirm_lawyer' && 'Abogado del bufete'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
