import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLawfirmProfile, useUpdateLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, CreditCard, Loader2, Save, AlertTriangle, CheckCircle2, Clock, Banknote, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function LawfirmBilling() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const updateProfile = useUpdateLawfirmProfile();

  const [fiscal, setFiscal] = useState({
    fiscal_name: '',
    cif: '',
    fiscal_email: '',
    fiscal_address: '',
    fiscal_city: '',
    fiscal_province: '',
    fiscal_postal_code: '',
  });

  useEffect(() => {
    if (lawfirm) {
      setFiscal({
        fiscal_name: lawfirm.fiscal_name || lawfirm.name || '',
        cif: lawfirm.cif || '',
        fiscal_email: lawfirm.fiscal_email || lawfirm.contact_email || '',
        fiscal_address: lawfirm.fiscal_address || lawfirm.address || '',
        fiscal_city: lawfirm.fiscal_city || lawfirm.city || '',
        fiscal_province: lawfirm.fiscal_province || lawfirm.province || '',
        fiscal_postal_code: lawfirm.fiscal_postal_code || lawfirm.postal_code || '',
      });
    }
  }, [lawfirm]);

  const isFiscalComplete = fiscal.fiscal_name && fiscal.cif && fiscal.fiscal_address && fiscal.fiscal_city && fiscal.fiscal_province && fiscal.fiscal_postal_code && fiscal.fiscal_email;

  const creditLineStatus = lawfirm?.credit_line_status || 'none';
  const creditLineEnabled = lawfirm?.credit_line_enabled ?? false;
  const creditLineAmount = lawfirm?.credit_line_amount ?? 0;
  const balance = lawfirm?.marketplace_balance ?? 0;
  const creditUsed = Math.max(0, creditLineAmount - balance);
  const hasValidCard = lawfirm?.has_valid_card ?? false;

  // Fetch transactions
  const { data: transactions } = useQuery({
    queryKey: ['billing-transactions', lawfirm?.id],
    queryFn: async () => {
      if (!lawfirm?.id) return [];
      const { data } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('lawfirm_id', lawfirm.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!lawfirm?.id,
  });

  const handleSaveFiscal = async () => {
    try {
      await updateProfile.mutateAsync(fiscal);
      toast.success('Datos fiscales guardados');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleRequestCreditLine = async () => {
    try {
      await updateProfile.mutateAsync({
        credit_line_status: 'pending',
        credit_line_requested_at: new Date().toISOString(),
      });
      toast.success('Solicitud de línea de crédito enviada. Te notificaremos cuando sea aprobada.');
    } catch {
      toast.error('Error al solicitar línea de crédito');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Facturación y Pagos
        </h1>
        <p className="text-sm text-muted-foreground">Datos fiscales, métodos de pago y línea de crédito</p>
      </div>

      {!isFiscalComplete && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Debes completar tus datos fiscales para poder operar. Rellena todos los campos obligatorios.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="fiscal" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="fiscal" className="text-xs">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Datos Fiscales
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Método de Pago
          </TabsTrigger>
          <TabsTrigger value="credit" className="text-xs">
            <Banknote className="mr-1.5 h-3.5 w-3.5" />
            Línea de Crédito
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        {/* DATOS FISCALES */}
        <TabsContent value="fiscal">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Datos Fiscales</CardTitle>
                <Button onClick={handleSaveFiscal} disabled={updateProfile.isPending} size="sm">
                  {updateProfile.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                  Guardar
                </Button>
              </div>
              <CardDescription className="text-xs">Información utilizada para la emisión de facturas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Razón Social *</Label>
                  <Input value={fiscal.fiscal_name} onChange={e => setFiscal(p => ({ ...p, fiscal_name: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CIF *</Label>
                  <Input value={fiscal.cif} onChange={e => setFiscal(p => ({ ...p, cif: e.target.value }))} className="h-9" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Dirección Fiscal *</Label>
                  <Input value={fiscal.fiscal_address} onChange={e => setFiscal(p => ({ ...p, fiscal_address: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ciudad *</Label>
                  <Input value={fiscal.fiscal_city} onChange={e => setFiscal(p => ({ ...p, fiscal_city: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Provincia *</Label>
                  <Input value={fiscal.fiscal_province} onChange={e => setFiscal(p => ({ ...p, fiscal_province: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Código Postal *</Label>
                  <Input value={fiscal.fiscal_postal_code} onChange={e => setFiscal(p => ({ ...p, fiscal_postal_code: e.target.value }))} className="h-9 w-28" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Fiscal *</Label>
                  <Input type="email" value={fiscal.fiscal_email} onChange={e => setFiscal(p => ({ ...p, fiscal_email: e.target.value }))} className="h-9" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MÉTODO DE PAGO */}
        <TabsContent value="payment">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Método de Pago</CardTitle>
              <CardDescription className="text-xs">Tarjeta de crédito obligatoria para compra directa de leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasValidCard ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Tarjeta válida registrada</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Puedes realizar compras directas</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Sin tarjeta registrada</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">No puedes realizar compras directas sin tarjeta válida</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-6 text-center">
                    <CreditCard className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Integración de pagos próximamente</p>
                    <Badge variant="secondary" className="mt-2 text-xs">Próximamente</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LÍNEA DE CRÉDITO */}
        <TabsContent value="credit">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Línea de Crédito</CardTitle>
              <CardDescription className="text-xs">Crédito interno a liquidar — no es prepago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {creditLineEnabled ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Crédito aprobado</p>
                      <p className="text-xl font-bold text-foreground">{creditLineAmount.toFixed(2)}€</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Utilizado</p>
                      <p className="text-xl font-bold text-amber-600">{creditUsed.toFixed(2)}€</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Disponible</p>
                      <p className="text-xl font-bold text-emerald-600">{balance.toFixed(2)}€</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-lawfirm-primary h-2 rounded-full transition-all"
                      style={{ width: `${creditLineAmount > 0 ? Math.min(100, (creditUsed / creditLineAmount) * 100) : 0}%` }}
                    />
                  </div>
                </>
              ) : creditLineStatus === 'pending' ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Solicitud pendiente</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">Tu solicitud de línea de crédito está siendo revisada por el administrador</p>
                  </div>
                </div>
              ) : creditLineStatus === 'rejected' ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Solicitud rechazada</p>
                    <p className="text-xs text-red-600 dark:text-red-500">Puedes volver a solicitarla si lo necesitas</p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={handleRequestCreditLine}>
                    Volver a solicitar
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Banknote className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mb-1">No tienes línea de crédito activa</p>
                  <p className="text-xs text-muted-foreground mb-4">Solicita una línea de crédito para operar sin prepago</p>
                  <Button onClick={handleRequestCreditLine} disabled={!isFiscalComplete}>
                    Solicitar línea de crédito
                  </Button>
                  {!isFiscalComplete && (
                    <p className="text-xs text-destructive mt-2">Completa tus datos fiscales primero</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOVIMIENTOS */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historial de Movimientos</CardTitle>
              <CardDescription className="text-xs">Compras, comisiones y pagos realizados</CardDescription>
            </CardHeader>
            <CardContent>
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay movimientos registrados</p>
                  <p className="text-xs mt-1">Los movimientos aparecerán aquí al operar</p>
                </div>
              ) : (
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium">{tx.description || tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
