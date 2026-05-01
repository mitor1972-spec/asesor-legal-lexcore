import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useLawfirmBranches } from '@/hooks/useLawfirmProfile';
import { useMasterSpecialties } from '@/hooks/useMasterConfig';
import { InviteMemberDialog } from '@/components/lawfirm/InviteMemberDialog';
import { Users, UserPlus, Mail, Phone, Building, Loader2 } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
  branch_id: string | null;
  phone: string | null;
  legal_areas: string[] | null;
  role: string;
}

export default function LawfirmTeam() {
  const { user } = useAuthContext();
  const { impersonatedLawfirm, isImpersonating } = useImpersonation();
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: branches = [] } = useLawfirmBranches();
  const { data: specialties = [] } = useMasterSpecialties();

  const { data: team, isLoading } = useQuery({
    queryKey: ['lawfirm-team', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active, created_at, branch_id, phone, legal_areas')
        .eq('lawfirm_id', lawfirmId);
      if (error) throw error;

      const userIds = data.map((p) => p.id);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      const rolesMap = new Map(rolesData?.map((r) => [r.user_id, r.role]) || []);

      return data.map((p) => ({
        ...p,
        role: rolesMap.get(p.id) || 'lawfirm_lawyer',
      })) as TeamMember[];
    },
    enabled: !!lawfirmId,
  });

  const branchById = new Map<string, string>(
    (branches as any[]).map((b) => [b.id, b.name])
  );
  const areaNameById = new Map<string, string>(
    (specialties as any[]).map((s) => [s.id, s.name])
  );

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      lawfirm_admin: 'Administrador',
      lawfirm_manager: 'Gerente',
      lawfirm_lawyer: 'Abogado',
    };
    return roles[role] || role;
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    if (role === 'lawfirm_admin') return 'default';
    if (role === 'lawfirm_manager') return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Equipo
          </h1>
          <p className="text-muted-foreground">Gestiona los miembros de tu despacho</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar miembro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Miembros del equipo</CardTitle>
          <CardDescription>
            {team?.length || 0} miembro{(team?.length || 0) !== 1 ? 's' : ''} en el despacho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!team || team.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay miembros registrados</p>
            </div>
          ) : (
            <div className="divide-y">
              {team.map((member) => {
                const areas = member.legal_areas || [];
                return (
                  <div
                    key={member.id}
                    className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-3"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar className="bg-primary text-primary-foreground">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.full_name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2) || member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{member.full_name || 'Sin nombre'}</p>
                        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </span>
                          )}
                          {member.branch_id && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {branchById.get(member.branch_id) || 'Sucursal'}
                            </span>
                          )}
                        </div>
                        {areas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {areas.slice(0, 5).map((id) => (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {areaNameById.get(id) || id}
                              </Badge>
                            ))}
                            {areas.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{areas.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                      {!member.is_active && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
