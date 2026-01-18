import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key } from 'lucide-react';

export default function ApiKeys() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          API Keys
        </h1>
        <p className="text-muted-foreground">Gestiona las claves de API para integraciones</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Claves de API</CardTitle>
          <CardDescription>
            Aquí podrás configurar las claves de API para servicios externos como OpenAI, Twilio, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Próximamente</p>
              <p className="text-sm">Esta funcionalidad estará disponible pronto</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
