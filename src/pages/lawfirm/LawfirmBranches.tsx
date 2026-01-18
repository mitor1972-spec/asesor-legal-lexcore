import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { Building, Plus, MapPin, Mail, Loader2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  province: string | null;
  email_derivations: string | null;
  created_at: string;
}

export default function LawfirmBranches() {
  const { data: lawfirm } = useLawfirmProfile();
  
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
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Añadir sucursal
          <Badge variant="secondary" className="ml-2 text-xs">Próximamente</Badge>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Oficinas del despacho</CardTitle>
          <CardDescription>
            {branches?.length || 0} sucursal{(branches?.length || 0) !== 1 ? 'es' : ''} registrada{(branches?.length || 0) !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!branches || branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay sucursales registradas</p>
              <p className="text-sm mt-1">Añade sucursales para derivar leads por ubicación</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {branches.map((branch) => (
                <Card key={branch.id} className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{branch.name}</h3>
                        {branch.province && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {branch.province}
                          </p>
                        )}
                        {branch.email_derivations && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />
                            {branch.email_derivations}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">Activa</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
