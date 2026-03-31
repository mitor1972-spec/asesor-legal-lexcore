import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, Scale, Info } from 'lucide-react';

export default function LawfirmCommission() {
  const { data: commissionAreas, isLoading } = useQuery({
    queryKey: ['commission-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_areas')
        .select('*')
        .eq('is_active', true)
        .order('legal_area');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Percent className="h-6 w-6 text-green-600" />
          Casos a Comisión
        </h1>
        <p className="text-muted-foreground">
          Adquiere leads sin coste inicial. Solo pagas una comisión sobre los honorarios cobrados.
        </p>
      </div>

      {/* How it works */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-green-600" />
            ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="font-semibold">1. Adquiere el lead gratis</p>
              <p className="text-muted-foreground">
                Al elegir el modelo de comisión en el LeadsMarket, el lead se añade a tus casos sin coste.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">2. Gestiona el caso</p>
              <p className="text-muted-foreground">
                Trabaja el caso como cualquier otro. Registra los honorarios acordados con el cliente.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">3. Comisión sobre resultados</p>
              <p className="text-muted-foreground">
                Se aplica la comisión sobre la minuta cobrada al cliente y sobre el porcentaje de éxito obtenido.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas with commission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-lawfirm-primary" />
            Áreas disponibles a comisión
          </CardTitle>
          <CardDescription>
            Estas son las áreas legales donde puedes adquirir leads en modelo comisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : !commissionAreas || commissionAreas.length === 0 ? (
            <p className="text-muted-foreground">No hay áreas comisionables configuradas actualmente.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {commissionAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Scale className="h-5 w-5 text-lawfirm-primary" />
                    <span className="font-medium">{area.legal_area}</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">
                    {area.commission_percent}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info box */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Comisión sobre honorarios:</strong> Se aplica el porcentaje indicado sobre la minuta (honorarios fijos) cobrada al cliente.
              </p>
              <p>
                <strong>Comisión sobre éxito:</strong> Si el caso tiene componente de éxito (variable), también se aplica el porcentaje sobre lo obtenido.
              </p>
              <p>
                La lista de áreas comisionables se actualiza periódicamente. Contacta con soporte si necesitas más información.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
