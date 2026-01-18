import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { CreditCard, Receipt, Download, Loader2, Plus } from 'lucide-react';

export default function LawfirmBilling() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Datos Fiscales y Facturación
        </h1>
        <p className="text-muted-foreground">Gestiona tus datos de facturación y métodos de pago</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Billing data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos Fiscales</CardTitle>
            <CardDescription>Información para facturas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Razón Social</Label>
              <Input value={lawfirm?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>CIF</Label>
              <Input value={lawfirm?.cif || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Dirección fiscal</Label>
              <Input 
                value={[lawfirm?.address, lawfirm?.postal_code, lawfirm?.city, lawfirm?.province]
                  .filter(Boolean).join(', ') || ''} 
                disabled 
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Para modificar estos datos, ve a la sección de Configuración
            </p>
          </CardContent>
        </Card>

        {/* Balance and payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saldo y Pagos</CardTitle>
            <CardDescription>Tu saldo disponible en LeadsMarket</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-lawfirm-primary/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo actual</span>
                <span className="text-3xl font-bold text-lawfirm-primary">
                  {lawfirm?.marketplace_balance?.toFixed(2) || '0.00'}€
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Método de Pago</h3>
                  <p className="text-sm text-muted-foreground">
                    Añade una tarjeta para recargar saldo
                  </p>
                </div>
                <Badge variant="secondary">Próximamente</Badge>
              </div>
              <Button variant="outline" className="w-full" disabled>
                <Plus className="mr-2 h-4 w-4" />
                Añadir tarjeta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Facturas
          </CardTitle>
          <CardDescription>Descarga tus facturas anteriores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay facturas disponibles</p>
            <p className="text-sm mt-1">Tus facturas aparecerán aquí cuando realices compras</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
