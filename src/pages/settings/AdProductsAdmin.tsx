import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdCategories, useAdProducts, useAdOrders, useAdInvoices, useUpdateProduct } from '@/hooks/useAdProducts';
import { Globe, Crown, Users, Mail, TrendingUp, Package, ShoppingCart, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const iconMap: Record<string, any> = { Globe, Crown, Users, Mail, TrendingUp };

export default function AdProductsAdmin() {
  const { data: categories, isLoading: catLoading } = useAdCategories();
  const { data: products, isLoading: prodLoading } = useAdProducts();
  const { data: orders } = useAdOrders();
  const { data: invoices } = useAdInvoices();
  const updateProduct = useUpdateProduct();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const filteredProducts = selectedCat
    ? products?.filter(p => p.category_id === selectedCat)
    : products;

  const activeOrders = orders?.filter(o => o.status === 'active') || [];
  const pendingOrders = orders?.filter(o => o.payment_status === 'pending') || [];
  const totalRevenue = orders?.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.final_amount, 0) || 0;

  if (catLoading || prodLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">📦 Gestión de Productos Publicitarios</h1>
        <p className="text-muted-foreground">Configura el catálogo de publicidad, precios y gestiona contrataciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Productos activos</p><p className="text-2xl font-bold">{products?.filter(p => p.is_active).length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Contratos activos</p><p className="text-2xl font-bold text-green-600">{activeOrders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pendientes de pago</p><p className="text-2xl font-bold text-amber-600">{pendingOrders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Facturación total</p><p className="text-2xl font-bold text-primary">{totalRevenue.toLocaleString('es-ES')}€</p></CardContent></Card>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog" className="flex items-center gap-2"><Package className="h-4 w-4" />Catálogo</TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Contrataciones</TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2"><FileText className="h-4 w-4" />Facturas</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 mt-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={!selectedCat ? 'default' : 'outline'} onClick={() => setSelectedCat(null)}>Todos</Button>
            {categories?.map(cat => (
              <Button key={cat.id} size="sm" variant={selectedCat === cat.id ? 'default' : 'outline'} onClick={() => setSelectedCat(cat.id)}>
                {cat.name}
              </Button>
            ))}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Precio base</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Destacado</TableHead>
                  <TableHead>Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.badge && <Badge variant="secondary" className="mt-1">{product.badge}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(product.category as any)?.name}</TableCell>
                    <TableCell><Badge variant="outline">{product.product_type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{product.base_price.toLocaleString('es-ES')}€</TableCell>
                    <TableCell className="text-sm">/{product.price_unit}</TableCell>
                    <TableCell>
                      <Switch checked={product.is_featured} onCheckedChange={(v) => {
                        updateProduct.mutate({ id: product.id, is_featured: v } as any);
                        toast.success(v ? 'Marcado como destacado' : 'Destacado eliminado');
                      }} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={product.is_active} onCheckedChange={(v) => {
                        updateProduct.mutate({ id: product.id, is_active: v } as any);
                        toast.success(v ? 'Producto activado' : 'Producto desactivado');
                      }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Contrataciones</CardTitle><CardDescription>Todos los pedidos de publicidad</CardDescription></CardHeader>
            <CardContent>
              {!orders?.length ? (
                <p className="text-muted-foreground text-center py-8">No hay contrataciones aún</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Despacho</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{(order.lawfirm as any)?.name || '—'}</TableCell>
                        <TableCell>{(order.product as any)?.name || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{order.duration}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{order.final_amount.toLocaleString('es-ES')}€</TableCell>
                        <TableCell>
                          <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {order.payment_status === 'paid' ? 'Pagado' : order.payment_status === 'pending' ? 'Pendiente' : order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'active' ? 'default' : 'secondary'}>
                            {order.status === 'active' ? 'Activo' : order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString('es-ES')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Facturas</CardTitle><CardDescription>Registro de facturación publicitaria</CardDescription></CardHeader>
            <CardContent>
              {!invoices?.length ? (
                <p className="text-muted-foreground text-center py-8">No hay facturas aún</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.concept || '—'}</TableCell>
                        <TableCell className="text-right">{inv.amount?.toLocaleString('es-ES')}€</TableCell>
                        <TableCell className="text-right">{inv.tax_amount?.toLocaleString('es-ES')}€</TableCell>
                        <TableCell className="text-right font-bold">{inv.total_amount?.toLocaleString('es-ES')}€</TableCell>
                        <TableCell><Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status === 'paid' ? 'Pagada' : 'Pendiente'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
