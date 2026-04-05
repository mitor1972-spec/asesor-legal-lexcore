import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useCreateOrder } from '@/hooks/useAdProducts';
import { CreditCard, Wallet, Loader2, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface ContractAdDialogProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  basePrice: number;
  priceUnit: string;
  features: string[];
  productType?: string;
}

type Step = 'config' | 'fiscal' | 'payment' | 'success';

export function ContractAdDialog({
  open,
  onClose,
  productName,
  basePrice,
  priceUnit,
  features,
  productType = 'advertising',
}: ContractAdDialogProps) {
  const { data: lawfirm } = useLawfirmProfile();
  const createOrder = useCreateOrder();

  const [step, setStep] = useState<Step>('config');
  const [loading, setLoading] = useState(false);

  // Config
  const [duration, setDuration] = useState('monthly');
  const [notes, setNotes] = useState('');

  // Fiscal
  const [fiscalName, setFiscalName] = useState('');
  const [fiscalCif, setFiscalCif] = useState('');
  const [fiscalAddress, setFiscalAddress] = useState('');
  const [fiscalCity, setFiscalCity] = useState('');
  const [fiscalProvince, setFiscalProvince] = useState('');
  const [fiscalPostalCode, setFiscalPostalCode] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('balance');

  // Pre-fill fiscal from lawfirm
  useEffect(() => {
    if (lawfirm) {
      setFiscalName(lawfirm.fiscal_name || lawfirm.name || '');
      setFiscalCif(lawfirm.cif || '');
      setFiscalAddress(lawfirm.fiscal_address || lawfirm.address || '');
      setFiscalCity(lawfirm.fiscal_city || lawfirm.city || '');
      setFiscalProvince(lawfirm.fiscal_province || lawfirm.province || '');
      setFiscalPostalCode(lawfirm.fiscal_postal_code || lawfirm.postal_code || '');
    }
  }, [lawfirm]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('config');
      setDuration('monthly');
      setNotes('');
      setLoading(false);
    }
  }, [open]);

  // Price calculation
  const discountMap: Record<string, number> = {
    monthly: 0,
    quarterly: 10,
    semester: 15,
    annual: 20,
  };
  const monthsMap: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semester: 6,
    annual: 12,
  };
  const durationLabels: Record<string, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral (-10%)',
    semester: 'Semestral (-15%)',
    annual: 'Anual (-20%)',
  };

  const discount = discountMap[duration] || 0;
  const months = monthsMap[duration] || 1;
  const monthlyAfterDiscount = basePrice * (1 - discount / 100);
  const totalPrice = monthlyAfterDiscount * months;
  const balance = (lawfirm as any)?.marketplace_balance ?? 0;
  const hasEnoughBalance = balance >= totalPrice;

  const validateFiscal = () => {
    if (!fiscalName.trim() || !fiscalCif.trim() || !fiscalAddress.trim()) {
      toast.error('Rellena al menos nombre fiscal, CIF y dirección');
      return false;
    }
    return true;
  };

  const handleConfirmPayment = async () => {
    if (!lawfirm) return;
    setLoading(true);
    try {
      if (paymentMethod === 'balance' && !hasEnoughBalance) {
        toast.error(`Saldo insuficiente. Necesitas ${totalPrice.toFixed(2)}€ y tienes ${balance.toFixed(2)}€`);
        setLoading(false);
        return;
      }

      // Create the order
      await createOrder.mutateAsync({
        lawfirm_id: lawfirm.id,
        product_id: '00000000-0000-0000-0000-000000000000', // placeholder - ideally from ad_products
        duration,
        base_amount: basePrice * months,
        discount_percent: discount,
        final_amount: totalPrice,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'balance' ? 'paid' : 'pending',
        status: paymentMethod === 'balance' ? 'active' : 'pending_payment',
        notes: `${productName}${notes ? ' — ' + notes : ''}`,
        config_json: {
          product_name: productName,
          features,
          fiscal: { fiscalName, fiscalCif, fiscalAddress, fiscalCity, fiscalProvince, fiscalPostalCode },
        },
      });

      // Deduct balance if paying with balance
      if (paymentMethod === 'balance') {
        await supabase
          .from('lawfirms')
          .update({ marketplace_balance: balance - totalPrice } as any)
          .eq('id', lawfirm.id);
      }

      setStep('success');
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'success' ? '¡Contratación completada!' : `Contratar: ${productName}`}
          </DialogTitle>
          {step !== 'success' && (
            <DialogDescription>
              {step === 'config' && 'Configura la duración de tu plan'}
              {step === 'fiscal' && 'Datos de facturación'}
              {step === 'payment' && 'Confirma el pago'}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Progress */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 mb-2">
            {['config', 'fiscal', 'payment'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : ['config', 'fiscal', 'payment'].indexOf(step) > i
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="flex-1 h-0.5 bg-muted" />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Config */}
        {step === 'config' && (
          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <p className="font-semibold">{productName}</p>
                <p className="text-2xl font-bold mt-1">
                  {basePrice}€<span className="text-sm font-normal text-muted-foreground">/{priceUnit}</span>
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Duración del contrato</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(durationLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {discount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Badge variant="secondary" className="bg-primary/10 text-primary">-{discount}%</Badge>
                <span className="text-sm">Descuento por contratación {durationLabels[duration].split(' ')[0].toLowerCase()}</span>
              </div>
            )}

            <Separator />

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Precio mensual</span>
                <span>{monthlyAfterDiscount.toFixed(2)}€/mes</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total ({months} {months === 1 ? 'mes' : 'meses'})</span>
                <span>{totalPrice.toFixed(2)}€</span>
              </div>
              <p className="text-xs text-muted-foreground">+ IVA (21%)</p>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Áreas legales, provincias específicas..."
                rows={2}
              />
            </div>

            <Button className="w-full" onClick={() => setStep('fiscal')}>
              Continuar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Fiscal */}
        {step === 'fiscal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre / Razón Social *</Label>
                <Input value={fiscalName} onChange={(e) => setFiscalName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CIF/NIF *</Label>
                <Input value={fiscalCif} onChange={(e) => setFiscalCif(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Código Postal</Label>
                <Input value={fiscalPostalCode} onChange={(e) => setFiscalPostalCode(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Dirección fiscal *</Label>
                <Input value={fiscalAddress} onChange={(e) => setFiscalAddress(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Ciudad</Label>
                <Input value={fiscalCity} onChange={(e) => setFiscalCity(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Provincia</Label>
                <Input value={fiscalProvince} onChange={(e) => setFiscalProvince(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('config')} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (validateFiscal()) setStep('payment');
                }}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            {/* Order summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Producto</span>
                  <span className="font-medium text-sm">{productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Duración</span>
                  <span className="text-sm">{durationLabels[duration].split(' ')[0]}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal</span>
                  <span className="text-sm">{totalPrice.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">IVA (21%)</span>
                  <span className="text-sm">{(totalPrice * 0.21).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{(totalPrice * 1.21).toFixed(2)}€</span>
                </div>
                <p className="text-xs text-muted-foreground">Factura a: {fiscalName} — {fiscalCif}</p>
              </CardContent>
            </Card>

            {/* Payment method */}
            <div className="space-y-2">
              <Label className="font-medium">Método de pago</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('balance')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === 'balance'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Wallet className="h-5 w-5 mb-2 text-primary" />
                  <p className="font-medium text-sm">Saldo LexMarket</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponible: {balance.toFixed(2)}€
                  </p>
                  {!hasEnoughBalance && (
                    <p className="text-xs text-destructive mt-1">Saldo insuficiente</p>
                  )}
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <CreditCard className="h-5 w-5 mb-2 text-primary" />
                  <p className="font-medium text-sm">Tarjeta de crédito</p>
                  <p className="text-xs text-muted-foreground mt-1">Pago seguro con Stripe</p>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Pago seguro. Puedes cancelar en cualquier momento.</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('fiscal')} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
                disabled={loading || (paymentMethod === 'balance' && !hasEnoughBalance)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                {paymentMethod === 'card' ? 'Pagar con tarjeta' : 'Confirmar pago'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">¡Contratación realizada!</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {paymentMethod === 'balance'
                ? `Se han descontado ${(totalPrice * 1.21).toFixed(2)}€ de tu saldo. Tu plan estará activo en breve.`
                : 'Recibirás un enlace de pago en tu email. El plan se activará una vez confirmado el pago.'}
            </p>
            <Button onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
