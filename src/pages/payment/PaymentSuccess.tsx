import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'verifying' | 'assigned' | 'pending_assignment' | 'error';

interface SessionData {
  id: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  customer_email?: string;
  lead_id?: string;
}

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 8; // ~12 segundos

export default function PaymentSuccess() {
  const [status, setStatus] = useState<Status>('verifying');
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No se encontró la sesión de pago');
      setStatus('error');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      // 1. Verificar sesión Stripe (puede devolver lead_id si el webhook ya guardó la metadata)
      let leadId: string | undefined;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-stripe-session', {
          body: { session_id: sessionId },
        });
        if (!fnError && data) {
          setSession({ id: sessionId, ...data });
          leadId = data.lead_id || data.metadata?.lead_id;
        } else {
          setSession({ id: sessionId });
        }
      } catch (e) {
        console.warn('[PaymentSuccess] verify-stripe-session falló, se continúa con polling', e);
        setSession({ id: sessionId });
      }

      if (cancelled) return;

      // 2. Polling: buscar lead_assignment hasta que aparezca
      const checkAssignment = async (): Promise<boolean> => {
        // Si tenemos lead_id, buscamos por lead_id directamente
        if (leadId) {
          const { data } = await supabase
            .from('lead_assignments')
            .select('id')
            .eq('lead_id', leadId)
            .maybeSingle();
          return !!data;
        }
        // Fallback: buscar la asignación más reciente del usuario actual
        // (no podemos filtrar por session_id porque no se guarda en lead_assignments)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { data: profile } = await supabase
          .from('profiles')
          .select('lawfirm_id')
          .eq('id', user.id)
          .maybeSingle();
        if (!profile?.lawfirm_id) return false;
        const { data } = await supabase
          .from('lead_assignments')
          .select('id, assigned_at')
          .eq('lawfirm_id', profile.lawfirm_id)
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        // Solo aceptamos asignaciones de los últimos 2 minutos
        if (!data) return false;
        const assignedAt = new Date((data as any).assigned_at).getTime();
        return Date.now() - assignedAt < 2 * 60 * 1000;
      };

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        const found = await checkAssignment();
        if (found) {
          setStatus('assigned');
          return;
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }

      // Timeout: el pago llegó pero la asignación tarda. Mostrar mensaje neutro.
      if (!cancelled) setStatus('pending_assignment');
    };

    void verify();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Verificando tu pago…</p>
            <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
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

  const isAssigned = status === 'assigned';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 text-center space-y-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
            isAssigned
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            {isAssigned ? (
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            ) : (
              <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              {isAssigned ? '¡Pago completado con éxito!' : 'Pago recibido'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAssigned
                ? 'Tu lead ha sido asignado correctamente y ya está disponible en tus casos.'
                : 'Hemos recibido tu pago. Estamos activando el caso, puede tardar un par de minutos en aparecer en "Mis Casos".'}
            </p>
          </div>

          {session && session.amount_total != null && session.amount_total > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-base">Detalles del pago</h3>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Importe:</span>
                <span className="font-medium">{(session.amount_total / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID transacción:</span>
                <span className="font-mono text-xs">{session.id?.slice(0, 20)}…</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
            <h3 className="font-semibold mb-2">Próximos pasos</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Recibirás un email con los detalles del lead</li>
              <li>El caso aparecerá en "Mis Casos"</li>
              {!isAssigned && (
                <li>Si en 5 minutos no lo ves, contacta con soporte con el ID de transacción</li>
              )}
            </ul>
          </div>

          <div className="flex gap-3 justify-center pt-2 flex-wrap">
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
