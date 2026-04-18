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
import { Receipt, CreditCard, Loader2, Save, AlertTriangle, CheckCircle2, Clock, Banknote, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CardData {
  id: string;
  holder_name: string;
  card_number: string;
  expiry: string;
  cvv: string;
}

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

  const [creditRequestAmount, setCreditRequestAmount] = useState(500);
  const [cards, setCards] = useState<CardData[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState<Omit<CardData, 'id'>>({
    holder_name: '',
    card_number: '',
    expiry: '',
    cvv: '',
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
      // Pre-fill card holder name
      setNewCard(p => ({ ...p, holder_name: lawfirm.contact_person || lawfirm.name || '' }));
    }
  }, [lawfirm]);

  const isFiscalComplete = fiscal.fiscal_name && fiscal.cif && fiscal.fiscal_address && fiscal.fiscal_city && fiscal.fiscal_province && fiscal.fiscal_postal_code && fiscal.fiscal_email;

  const creditLineStatus = lawfirm?.credit_line_status || 'none';
  const creditLineEnabled = lawfirm?.credit_line_enabled ?? false;
  const creditLineAmount = lawfirm?.credit_line_amount ?? 0;
  const balance = lawfirm?.marketplace_balance ?? 0;
  const creditUsed = Math.max(0, creditLineAmount - balance);

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[LawfirmBilling] Save fiscal failed:', err);
      toast.error('Error al guardar');
    }
  };

  const handleCopyFromLawfirm = () => {
    if (!lawfirm) return;
    setFiscal({
      fiscal_name: lawfirm.name || '',
      cif: lawfirm.cif || '',
      fiscal_email: lawfirm.contact_email || '',
      fiscal_address: lawfirm.address || '',
      fiscal_city: lawfirm.city || '',
      fiscal_province: lawfirm.province || '',
      fiscal_postal_code: lawfirm.postal_code || '',
    });
    toast.success('Datos copiados desde el perfil del despacho');
  };

  const handleRequestCreditLine = async () => {
    try {
      await updateProfile.mutateAsync({
        credit_line_status: 'pending',
        credit_line_requested_at: new Date().toISOString(),
        credit_line_amount: creditRequestAmount,
      });
      toast.success(`Solicitud de línea de crédito de ${creditRequestAmount}€ enviada.`);
    } catch {
      toast.error('Error al solicitar línea de crédito');
    }
  };

  const handleAddCard = () => {
    if (!newCard.card_number || !newCard.expiry || !newCard.cvv || !newCard.holder_name) {
      toast.error('Rellena todos los campos de la tarjeta');
      return;
    }
    const cleaned = newCard.card_number.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      toast.error('Número de tarjeta no válido');
      return;
    }
    setCards(prev => [...prev, { ...newCard, id: crypto.randomUUID() }]);
    setNewCard({ holder_name: lawfirm?.contact_person || '', card_number: '', expiry: '', cvv: '' });
    setShowAddCard(false);
    toast.success('Tarjeta añadida correctamente');
  };

  const handleRemoveCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    toast.success('Tarjeta eliminada');
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
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
        <TabsList className="h-10 bg-muted/80 p-1">
          <TabsTrigger value="fiscal" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Datos Fiscales
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Método de Pago
          </TabsTrigger>
          <TabsTrigger value="credit" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Banknote className="mr-1.5 h-3.5 w-3.5" />
            Línea de Crédito
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white">
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Método de Pago</CardTitle>
                  <CardDescription className="text-xs">Tarjeta de crédito/débito para compra de leads</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddCard(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Añadir tarjeta
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing cards */}
              {cards.length > 0 ? (
                <div className="space-y-3">
                  {cards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <CreditCard className="h-8 w-8 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{card.holder_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          •••• •••• •••• {card.card_number.replace(/\s/g, '').slice(-4)}
                        </p>
                        <p className="text-xs text-muted-foreground">Caduca: {card.expiry}</p>
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">Activa</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveCard(card.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : !showAddCard ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Sin tarjeta registrada</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">Añade una tarjeta para poder comprar leads</p>
                  </div>
                </div>
              ) : null}

              {/* Add card form */}
              {showAddCard && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Nueva tarjeta
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Titular de la tarjeta</Label>
                      <Input value={newCard.holder_name} onChange={e => setNewCard(p => ({ ...p, holder_name: e.target.value }))}
                        placeholder="Nombre como aparece en la tarjeta" className="h-9" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Número de tarjeta</Label>
                      <Input value={newCard.card_number}
                        onChange={e => setNewCard(p => ({ ...p, card_number: formatCardNumber(e.target.value) }))}
                        placeholder="1234 5678 9012 3456" className="h-9 font-mono" maxLength={19} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fecha de caducidad</Label>
                      <Input value={newCard.expiry}
                        onChange={e => setNewCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                        placeholder="MM/AA" className="h-9 font-mono w-24" maxLength={5} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CVV</Label>
                      <Input value={newCard.cvv}
                        onChange={e => setNewCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        placeholder="123" className="h-9 font-mono w-20" maxLength={4} type="password" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleAddCard}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Guardar tarjeta
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddCard(false)}>Cancelar</Button>
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
                      className="bg-primary h-2 rounded-full transition-all"
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
                <div className="text-center py-6 space-y-4">
                  <Banknote className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">No tienes línea de crédito activa</p>
                    <p className="text-xs text-muted-foreground mb-4">Solicita una línea de crédito para operar sin prepago</p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Importe solicitado (€)</Label>
                      <Input
                        type="number"
                        value={creditRequestAmount}
                        onChange={e => setCreditRequestAmount(Math.max(100, +e.target.value || 500))}
                        min={100}
                        step={100}
                        className="h-10 text-center text-lg font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground">Mínimo 100€ · Se recomienda empezar con 500€</p>
                    </div>
                    <Button onClick={handleRequestCreditLine} disabled={!isFiscalComplete} className="w-full">
                      Solicitar línea de {creditRequestAmount}€
                    </Button>
                    {!isFiscalComplete && (
                      <p className="text-xs text-destructive">Completa tus datos fiscales primero</p>
                    )}
                  </div>
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
