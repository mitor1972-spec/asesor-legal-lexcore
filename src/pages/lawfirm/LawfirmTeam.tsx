import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLawfirmTeam } from '@/hooks/useLawfirmProfile';
import { Users, UserPlus, Mail, Loader2 } from 'lucide-react';

export default function LawfirmTeam() {
  const { data: team, isLoading } = useLawfirmTeam();
  
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      'lawfirm_admin': 'Administrador',
      'lawfirm_manager': 'Manager',
      'lawfirm_lawyer': 'Abogado',
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
        <Button disabled>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar miembro
          <Badge variant="secondary" className="ml-2 text-xs">Próximamente</Badge>
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
              {team.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {member.full_name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
