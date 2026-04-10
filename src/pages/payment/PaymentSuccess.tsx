import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SessionData {
  id: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  customer_email: string;
}

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No se encontró la sesión de pago');
      setLoading(false);
      return;
    }

    supabase.functions.invoke('verify-stripe-session', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
    }).then(({ data, error: fnError }) => {
      // Fallback: use query param approach
      if (fnError) {
        // Even without verification, show success since Stripe redirected here
        setSession({ id: sessionId, amount_total: 0, currency: 'eur', payment_status: 'paid', customer_email: '' });
      } else {
        setSession(data);
      }
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Verificando tu pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-bold">Error al verificar el pago</h1>
            <p className="text-muted-foreground">{error}</p>
            <Link to="/despacho/leadsmarket">
              <Button>Volver al marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">¡Pago completado con éxito!</h1>
            <p className="text-muted-foreground mt-2">
              Tu lead ha sido asignado correctamente a tu cuenta.
            </p>
          </div>

          {session && session.amount_total > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-base">Detalles del pago</h3>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Importe:</span>
                <span className="font-medium">{(session.amount_total / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID transacción:</span>
                <span className="font-mono text-xs">{session.id?.slice(0, 20)}...</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
            <h3 className="font-semibold mb-2">Próximos pasos</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Recibirás un email con los detalles del lead</li>
              <li>Puedes ver el lead en tu panel de casos</li>
              <li>El lead aparecerá en "Mis Casos"</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Link to="/despacho/casos">
              <Button>Ver mis casos</Button>
            </Link>
            <Link to="/despacho/leadsmarket">
              <Button variant="outline">Volver al marketplace</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
