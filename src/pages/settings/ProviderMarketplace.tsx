import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Building2, Edit2, Trash2, Package, ShoppingCart, Store } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/* ────────── types ────────── */
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Provider {
  id: string;
  category_id: string;
  name: string;
  cif: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
  commission_percent: number;
  is_active: boolean;
  provinces_covered: string[];
  notes: string | null;
  created_at: string;
}

interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  price: number;
  price_type: string;
  promo_price: number | null;
  promo_label: string | null;
  is_active: boolean;
}

interface Order {
  id: string;
  service_id: string;
  provider_id: string;
  lawfirm_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_percent: number;
  commission_amount: number;
  provider_payout: number;
  status: string;
  notes: string | null;
  created_at: string;
}

/* ────────── queries ────────── */
function useCategories() {
  return useQuery({
    queryKey: ['provider-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Category[];
    },
  });
}

function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Provider[];
    },
  });
}

function useServices() {
  return useQuery({
    queryKey: ['provider-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_services')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Service[];
    },
  });
}

function useOrders() {
  return useQuery({
    queryKey: ['provider-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Order[];
    },
  });
}

/* ────────── main component ────────── */
export default function ProviderMarketplace() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: providers = [], isLoading: loadingProviders } = useProviders();
  const { data: services = [] } = useServices();
  const { data: orders = [] } = useOrders();

  const [tab, setTab] = useState('providers');

  /* ── provider dialog ── */
  const [providerDialog, setProviderDialog] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [pf, setPf] = useState({ name: '', category_id: '', cif: '', contact_name: '', contact_email: '', contact_phone: '', website: '', description: '', commission_percent: '15', notes: '' });

  const openNewProvider = () => {
    setEditProvider(null);
    setPf({ name: '', category_id: categories[0]?.id ?? '', cif: '', contact_name: '', contact_email: '', contact_phone: '', website: '', description: '', commission_percent: '15', notes: '' });
    setProviderDialog(true);
  };

  const openEditProvider = (p: Provider) => {
    setEditProvider(p);
    setPf({ name: p.name, category_id: p.category_id, cif: p.cif ?? '', contact_name: p.contact_name ?? '', contact_email: p.contact_email ?? '', contact_phone: p.contact_phone ?? '', website: p.website ?? '', description: p.description ?? '', commission_percent: String(p.commission_percent), notes: p.notes ?? '' });
    setProviderDialog(true);
  };

  const saveProvider = useMutation({
    mutationFn: async () => {
      const payload = {
        name: pf.name,
        category_id: pf.category_id,
        cif: pf.cif || null,
        contact_name: pf.contact_name || null,
        contact_email: pf.contact_email || null,
        contact_phone: pf.contact_phone || null,
        website: pf.website || null,
        description: pf.description || null,
        commission_percent: Number(pf.commission_percent),
        notes: pf.notes || null,
      };
      if (editProvider) {
        const { error } = await supabase.from('providers').update(payload).eq('id', editProvider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('providers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] });
      setProviderDialog(false);
      toast.success(editProvider ? 'Proveedor actualizado' : 'Proveedor creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleProvider = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('providers').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });

  /* ── service dialog ── */
  const [serviceDialog, setServiceDialog] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [sf, setSf] = useState({ name: '', provider_id: '', description: '', price: '0', price_type: 'fixed', promo_price: '', promo_label: '' });

  const openNewService = (providerId?: string) => {
    setEditService(null);
    setSf({ name: '', provider_id: providerId ?? providers[0]?.id ?? '', description: '', price: '0', price_type: 'fixed', promo_price: '', promo_label: '' });
    setServiceDialog(true);
  };

  const openEditService = (s: Service) => {
    setEditService(s);
    setSf({ name: s.name, provider_id: s.provider_id, description: s.description ?? '', price: String(s.price), price_type: s.price_type, promo_price: s.promo_price != null ? String(s.promo_price) : '', promo_label: s.promo_label ?? '' });
    setServiceDialog(true);
  };

  const saveService = useMutation({
    mutationFn: async () => {
      const payload = {
        name: sf.name,
        provider_id: sf.provider_id,
        description: sf.description || null,
        price: Number(sf.price),
        price_type: sf.price_type,
        promo_price: sf.promo_price ? Number(sf.promo_price) : null,
        promo_label: sf.promo_label || null,
      };
      if (editService) {
        const { error } = await supabase.from('provider_services').update(payload).eq('id', editService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('provider_services').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-services'] });
      setServiceDialog(false);
      toast.success(editService ? 'Servicio actualizado' : 'Servicio creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleService = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('provider_services').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-services'] }),
  });

  /* ── helpers ── */
  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? '—';
  const provName = (id: string) => providers.find(p => p.id === id)?.name ?? '—';
  const statusColor = (s: string) => ({ pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }[s] ?? 'bg-muted text-muted-foreground');

  const totalCommission = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.commission_amount, 0);
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_price, 0);

  if (loadingCats || loadingProviders) {
    return <div className="p-6 text-muted-foreground">Cargando marketplace…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6 text-primary" /> Marketplace de Proveedores</h1>
        <p className="text-muted-foreground mt-1">Gestiona proveedores externos (procuradores, notarios, peritos…) que ofrecen servicios a tus abogados.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Categorías</p><p className="text-2xl font-bold">{categories.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Proveedores</p><p className="text-2xl font-bold">{providers.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Servicios</p><p className="text-2xl font-bold">{services.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Comisión acumulada</p><p className="text-2xl font-bold text-primary">{totalCommission.toLocaleString('es-ES')}€</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="providers"><Building2 className="h-4 w-4 mr-1" />Proveedores</TabsTrigger>
          <TabsTrigger value="services"><Package className="h-4 w-4 mr-1" />Servicios</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" />Pedidos</TabsTrigger>
        </TabsList>

        {/* ── Proveedores ── */}
        <TabsContent value="providers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewProvider}><Plus className="h-4 w-4 mr-1" />Nuevo proveedor</Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay proveedores registrados</TableCell></TableRow>
                )}
                {providers.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline">{catName(p.category_id)}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.contact_email || p.contact_phone || '—'}</TableCell>
                    <TableCell>{p.commission_percent}%</TableCell>
                    <TableCell><Switch checked={p.is_active} onCheckedChange={v => toggleProvider.mutate({ id: p.id, active: v })} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditProvider(p)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openNewService(p.id)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Servicios ── */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openNewService()}><Plus className="h-4 w-4 mr-1" />Nuevo servicio</Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="hidden md:table-cell">Promo</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay servicios registrados</TableCell></TableRow>
                )}
                {services.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{provName(s.provider_id)}</TableCell>
                    <TableCell>{s.price.toLocaleString('es-ES')}€ <span className="text-xs text-muted-foreground">({s.price_type})</span></TableCell>
                    <TableCell className="hidden md:table-cell">{s.promo_price != null ? <Badge className="bg-green-100 text-green-800">{s.promo_label || `${s.promo_price}€`}</Badge> : '—'}</TableCell>
                    <TableCell><Switch checked={s.is_active} onCheckedChange={v => toggleService.mutate({ id: s.id, active: v })} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => openEditService(s)}><Edit2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Pedidos ── */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimos pedidos</CardTitle>
              <CardDescription>Facturación total: {totalRevenue.toLocaleString('es-ES')}€ · Comisiones: {totalCommission.toLocaleString('es-ES')}€</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden md:table-cell">Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay pedidos todavía</TableCell></TableRow>
                )}
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm">{format(new Date(o.created_at), 'dd/MM/yy', { locale: es })}</TableCell>
                    <TableCell>{provName(o.provider_id)}</TableCell>
                    <TableCell className="hidden md:table-cell">{o.quantity}</TableCell>
                    <TableCell>{o.total_price.toLocaleString('es-ES')}€</TableCell>
                    <TableCell className="text-primary font-medium">{o.commission_amount.toLocaleString('es-ES')}€</TableCell>
                    <TableCell><Badge className={statusColor(o.status)}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Provider Dialog ── */}
      <Dialog open={providerDialog} onOpenChange={setProviderDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProvider ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre *</Label><Input value={pf.name} onChange={e => setPf(p => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>Categoría *</Label>
              <Select value={pf.category_id} onValueChange={v => setPf(p => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CIF</Label><Input value={pf.cif} onChange={e => setPf(p => ({ ...p, cif: e.target.value }))} /></div>
              <div><Label>Comisión %</Label><Input type="number" value={pf.commission_percent} onChange={e => setPf(p => ({ ...p, commission_percent: e.target.value }))} /></div>
            </div>
            <div><Label>Persona de contacto</Label><Input value={pf.contact_name} onChange={e => setPf(p => ({ ...p, contact_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={pf.contact_email} onChange={e => setPf(p => ({ ...p, contact_email: e.target.value }))} /></div>
              <div><Label>Teléfono</Label><Input value={pf.contact_phone} onChange={e => setPf(p => ({ ...p, contact_phone: e.target.value }))} /></div>
            </div>
            <div><Label>Web</Label><Input value={pf.website} onChange={e => setPf(p => ({ ...p, website: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Textarea value={pf.description} onChange={e => setPf(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div><Label>Notas internas</Label><Textarea value={pf.notes} onChange={e => setPf(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveProvider.mutate()} disabled={!pf.name || !pf.category_id || saveProvider.isPending}>{saveProvider.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Service Dialog ── */}
      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editService ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre *</Label><Input value={sf.name} onChange={e => setSf(s => ({ ...s, name: e.target.value }))} /></div>
            <div>
              <Label>Proveedor *</Label>
              <Select value={sf.provider_id} onValueChange={v => setSf(s => ({ ...s, provider_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio (€) *</Label><Input type="number" value={sf.price} onChange={e => setSf(s => ({ ...s, price: e.target.value }))} /></div>
              <div>
                <Label>Tipo precio</Label>
                <Select value={sf.price_type} onValueChange={v => setSf(s => ({ ...s, price_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fijo</SelectItem>
                    <SelectItem value="from">Desde</SelectItem>
                    <SelectItem value="per_unit">Por unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio promo (€)</Label><Input type="number" value={sf.promo_price} onChange={e => setSf(s => ({ ...s, promo_price: e.target.value }))} /></div>
              <div><Label>Etiqueta promo</Label><Input placeholder="Ej: -20% lanzamiento" value={sf.promo_label} onChange={e => setSf(s => ({ ...s, promo_label: e.target.value }))} /></div>
            </div>
            <div><Label>Descripción</Label><Textarea value={sf.description} onChange={e => setSf(s => ({ ...s, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveService.mutate()} disabled={!sf.name || !sf.provider_id || saveService.isPending}>{saveService.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
