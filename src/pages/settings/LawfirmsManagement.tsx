import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function LawfirmsManagement() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Gestión de Despachos
        </h1>
        <p className="text-muted-foreground">Administra los despachos de abogados y sus sucursales</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Despachos Registrados</CardTitle>
          <CardDescription>
            Aquí podrás crear, editar y gestionar los despachos de abogados asociados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Próximamente</p>
              <p className="text-sm">Esta funcionalidad estará disponible pronto</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
