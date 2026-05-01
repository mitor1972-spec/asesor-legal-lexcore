import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useMasterSpecialties } from '@/hooks/useMasterConfig';
import { BranchFormDialog } from '@/components/lawfirm/BranchFormDialog';
import { Building, Plus, MapPin, Mail, Phone, Loader2, Pencil } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  address: string | null;
  phone: string | null;
  email_derivations: string | null;
  areas_accepted: string[] | null;
  created_at: string;
}

export default function LawfirmBranches() {
  const { data: lawfirm } = useLawfirmProfile();
  const { data: specialties = [] } = useMasterSpecialties();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const { data: branches, isLoading } = useQuery({
    queryKey: ['lawfirm-branches', lawfirm?.id],
    queryFn: async () => {
      if (!lawfirm?.id) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('lawfirm_id', lawfirm.id)
        .order('name');
      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!lawfirm?.id,
  });

  // Map area id -> name
  const areaNameById = new Map<string, string>(
    (specialties as any[]).map((s) => [s.id, s.name])
  );

  const openCreate = () => {
    setEditingBranch(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditingBranch(b);
    setDialogOpen(true);
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
            <Building className="h-6 w-6" />
            Sucursales
          </h1>
          <p className="text-muted-foreground">Gestiona las oficinas de tu despacho</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Añadir sucursal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Oficinas del despacho</CardTitle>
          <CardDescription>
            {branches?.length || 0} sucursal{(branches?.length || 0) !== 1 ? 'es' : ''} registrada
            {(branches?.length || 0) !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!branches || branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay sucursales registradas</p>
              <p className="text-sm mt-1">
                Crea sucursales para asignar abogados y áreas legales por oficina
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {branches.map((branch) => {
                const areas = branch.areas_accepted || [];
                return (
                  <Card key={branch.id} className="border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{branch.name}</h3>
                          {(branch.city || branch.province) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {[branch.city, branch.province].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">Activa</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      {branch.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {branch.phone}
                        </p>
                      )}
                      {branch.email_derivations && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {branch.email_derivations}
                        </p>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Áreas legales ({areas.length})
                        </p>
                        {areas.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground">
                            Sin áreas asignadas
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {areas.slice(0, 6).map((id) => (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {areaNameById.get(id) || id}
                              </Badge>
                            ))}
                            {areas.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{areas.length - 6} más
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(branch)}
                        className="w-full"
                      >
                        <Pencil className="mr-2 h-3 w-3" />
                        Editar
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <BranchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branch={editingBranch}
      />
    </div>
  );
}
