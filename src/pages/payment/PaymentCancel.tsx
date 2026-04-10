import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Pago cancelado</h1>
            <p className="text-muted-foreground mt-2">
              Has cancelado el proceso de pago. No se ha realizado ningún cargo.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-sm text-muted-foreground">
            Si has experimentado algún problema durante el proceso de pago,
            por favor contacta con nuestro equipo de soporte.
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Link to="/despacho/leadsmarket">
              <Button>Volver al marketplace</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
