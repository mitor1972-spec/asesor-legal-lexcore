import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cog } from 'lucide-react';

export default function LexcoreConfig() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Cog className="h-6 w-6" />
          Configuración Lexcore
        </h1>
        <p className="text-muted-foreground">Ajustes generales del sistema Lexcore</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>
            Personaliza el comportamiento y apariencia del sistema Lexcore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Cog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Próximamente</p>
              <p className="text-sm">Esta funcionalidad estará disponible pronto</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
