import { useState, useMemo } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Building2, Edit2, Package, ShoppingCart, Store, ChevronDown, ChevronRight,
  Layers, Scale, Tag, Users, CheckCircle, XCircle, Clock, Eye, TrendingUp,
  ExternalLink, Plus, Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/* ────────── types ────────── */
interface Category {
  id: string; name: string; slug: string; description: string | null;
  icon: string | null; sort_order: number; is_active: boolean; priority: string | null;
}
interface Subcategory {
  id: string; category_id: string; name: string; slug: string;
  description: string | null; sort_order: number; is_active: boolean;
}
interface Provider {
  id: string; category_id: string; name: string; cif: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  website: string | null; description: string | null; commission_percent: number;
  is_active: boolean; provinces_covered: string[]; notes: string | null;
  modality: string | null; response_time: string | null;
  is_featured: boolean | null; is_sponsored: boolean | null; created_at: string;
  status: string; total_orders: number; rating: number;
  short_description: string | null; promo_description: string | null;
  promo_discount_percent: number | null;
}
interface Service {
  id: string; provider_id: string; name: string; description: string | null;
  price: number; price_type: string; promo_price: number | null;
  promo_label: string | null; is_active: boolean;
}
interface Order {
  id: string; provider_id: string; total_price: number;
  commission_amount: number; status: string; created_at: string;
}
interface Application {
  id: string; company_name: string; contact_name: string; contact_email: string;
  category_id: string; status: string; created_at: string;
  proposed_commission_percent: number; modality: string | null;
  promo_discount_percent: number | null;
}
interface LegalArea { id: string; name: string; slug: string; }

/* ────────── hooks ────────── */
const useCategories = () => useQuery({
  queryKey: ['provider-categories'],
  queryFn: async () => {
    const { data, error } = await supabase.from('provider_categories').select('*').order('sort_order');
    if (error) throw error;
    return data as Category[];
  },
});
const useSubcategories = () => useQuery({
  queryKey: ['provider-subcategories'],
  queryFn: async () => {
    const { data, error } = await supabase.from('provider_subcategories').select('*').order('sort_order');
    if (error) throw error;
    return data as Subcategory[];
  },
});
const useProviders = () => useQuery({
  queryKey: ['providers'],
  queryFn: async () => {
    const { data, error } = await supabase.from('providers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Provider[];
  },
});
const useServices = () => useQuery({
  queryKey: ['provider-services'],
  queryFn: async () => {
    const { data, error } = await supabase.from('provider_services').select('*').order('sort_order');
    if (error) throw error;
    return data as Service[];
  },
});
const useOrders = () => useQuery({
  queryKey: ['provider-orders'],
  queryFn: async () => {
    const { data, error } = await supabase.from('provider_orders').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data as Order[];
  },
});
const useApplications = () => useQuery({
  queryKey: ['provider-applications'],
  queryFn: async () => {
    const { data, error } = await supabase.from('provider_applications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Application[];
  },
});
const useLegalAreas = () => useQuery({
  queryKey: ['marketplace-legal-areas'],
  queryFn: async () => {
    const { data, error } = await supabase.from('marketplace_legal_areas').select('*').order('sort_order');
    if (error) throw error;
    return data as LegalArea[];
  },
});

/* ────────── helpers ────────── */
const statusBadge = (s: string) => {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
    approved: { color: 'bg-green-100 text-green-800', label: 'Aprobado' },
    active: { color: 'bg-primary/10 text-primary', label: 'Activo' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rechazado' },
    suspended: { color: 'bg-muted text-muted-foreground', label: 'Suspendido' },
  };
  const m = map[s] ?? map.pending;
  return <Badge className={m.color}>{m.label}</Badge>;
};

/* ────────── main ────────── */
export default function ProviderMarketplace() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: providers = [] } = useProviders();
  const { data: services = [] } = useServices();
  const { data: orders = [] } = useOrders();
  const { data: applications = [] } = useApplications();
  const { data: legalAreas = [] } = useLegalAreas();

  const [tab, setTab] = useState('overview');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  /* ── provider dialog ── */
  const [providerDialog, setProviderDialog] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [pf, setPf] = useState({
    name: '', category_id: '', cif: '', contact_name: '', contact_email: '',
    contact_phone: '', website: '', description: '', commission_percent: '15',
    notes: '', modality: 'ambas', response_time: '',
  });

  const openNewProvider = (catId?: string) => {
    setEditProvider(null);
    setPf({ name: '', category_id: catId ?? categories[0]?.id ?? '', cif: '', contact_name: '', contact_email: '', contact_phone: '', website: '', description: '', commission_percent: '15', notes: '', modality: 'ambas', response_time: '' });
    setProviderDialog(true);
  };

  const openEditProvider = (p: Provider) => {
    setEditProvider(p);
    setPf({ name: p.name, category_id: p.category_id, cif: p.cif ?? '', contact_name: p.contact_name ?? '', contact_email: p.contact_email ?? '', contact_phone: p.contact_phone ?? '', website: p.website ?? '', description: p.description ?? '', commission_percent: String(p.commission_percent), notes: p.notes ?? '', modality: p.modality ?? 'ambas', response_time: p.response_time ?? '' });
    setProviderDialog(true);
  };

  const saveProvider = useMutation({
    mutationFn: async () => {
      const payload = { name: pf.name, category_id: pf.category_id, cif: pf.cif || null, contact_name: pf.contact_name || null, contact_email: pf.contact_email || null, contact_phone: pf.contact_phone || null, website: pf.website || null, description: pf.description || null, commission_percent: Number(pf.commission_percent), notes: pf.notes || null, modality: pf.modality, response_time: pf.response_time || null };
      if (editProvider) {
        const { error } = await supabase.from('providers').update(payload).eq('id', editProvider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('providers').insert({ ...payload, status: 'active' } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); setProviderDialog(false); toast.success(editProvider ? 'Proveedor actualizado' : 'Proveedor creado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleProvider = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('providers').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });

  /* ── application actions ── */
  const approveApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.from('provider_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() } as any).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-applications'] }); toast.success('Solicitud aprobada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.from('provider_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() } as any).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-applications'] }); toast.success('Solicitud rechazada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ── computed ── */
  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? '—';
  const provName = (id: string) => providers.find(p => p.id === id)?.name ?? '—';
  const subcatsByCat = useMemo(() => {
    const map: Record<string, Subcategory[]> = {};
    subcategories.forEach(s => { (map[s.category_id] ??= []).push(s); });
    return map;
  }, [subcategories]);
  const provsByCat = useMemo(() => {
    const map: Record<string, Provider[]> = {};
    providers.forEach(p => { (map[p.category_id] ??= []).push(p); });
    return map;
  }, [providers]);

  const totalCommission = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.commission_amount, 0);
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_price, 0);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const activeProviders = providers.filter(p => p.is_active);

  const toggleExpanded = (id: string) => {
    setExpandedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const orderStatusColor = (s: string) => ({ pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }[s] ?? 'bg-muted text-muted-foreground');

  if (loadingCats) return <div className="p-6 text-muted-foreground">Cargando marketplace…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6 text-primary" /> Marketplace de Proveedores</h1>
          <p className="text-muted-foreground mt-1">Panel de administración y monitorización del marketplace.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open('/registro-proveedor', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-1" />Ver registro público
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Proveedores activos</p><p className="text-2xl font-bold text-primary">{activeProviders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total proveedores</p><p className="text-2xl font-bold">{providers.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Solicitudes pendientes</p><p className="text-2xl font-bold text-amber-600">{pendingApps.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Servicios</p><p className="text-2xl font-bold">{services.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Facturación total</p><p className="text-2xl font-bold">{totalRevenue.toLocaleString('es-ES')}€</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Comisión acumulada</p><p className="text-2xl font-bold text-primary">{totalCommission.toLocaleString('es-ES')}€</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 mr-1" />Resumen</TabsTrigger>
          <TabsTrigger value="applications" className="relative">
            <Inbox className="h-4 w-4 mr-1" />Solicitudes
            {pendingApps.length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem]">{pendingApps.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="providers"><Building2 className="h-4 w-4 mr-1" />Proveedores</TabsTrigger>
          <TabsTrigger value="catalog"><Layers className="h-4 w-4 mr-1" />Catálogo</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" />Pedidos</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Solicitudes recientes</CardTitle>
                <CardDescription>Últimas solicitudes de proveedores que quieren unirse al marketplace.</CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No hay solicitudes aún</p>
                ) : (
                  <div className="space-y-2">
                    {applications.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{a.company_name}</p>
                          <p className="text-xs text-muted-foreground">{catName(a.category_id)} · {a.contact_email}</p>
                        </div>
                        {statusBadge(a.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proveedores por categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.slice(0, 8).map(cat => {
                    const count = (provsByCat[cat.id] ?? []).length;
                    return (
                      <div key={cat.id} className="flex items-center justify-between text-sm">
                        <span>{cat.name}</span>
                        <Badge variant={count > 0 ? 'default' : 'outline'}>{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enlace de registro público</CardTitle>
              <CardDescription>Comparte este enlace con proveedores para que se registren en el marketplace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/registro-proveedor`} className="font-mono text-sm" />
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/registro-proveedor`); toast.success('Enlace copiado'); }}>Copiar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Applications ── */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solicitudes de proveedores</CardTitle>
              <CardDescription>{pendingApps.length} pendientes de revisión · {applications.length} total</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay solicitudes</TableCell></TableRow>}
                {applications.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.company_name}
                      {a.promo_discount_percent && Number(a.promo_discount_percent) > 0 && (
                        <Badge className="ml-2 bg-green-100 text-green-800 text-xs">{a.promo_discount_percent}% dto</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs">{catName(a.category_id)}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{a.contact_email}</TableCell>
                    <TableCell>{a.proposed_commission_percent}%</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(a.created_at), 'dd/MM/yy', { locale: es })}</TableCell>
                    <TableCell>
                      {a.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => approveApp.mutate(a.id)} title="Aprobar">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => rejectApp.mutate(a.id)} title="Rechazar">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Providers ── */}
        <TabsContent value="providers" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{providers.length} proveedores · {activeProviders.length} activos</p>
            <Button onClick={() => openNewProvider()}><Plus className="h-4 w-4 mr-1" />Crear manualmente</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead className="hidden md:table-cell">Servicios</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay proveedores</TableCell></TableRow>}
                {providers.map(p => {
                  const svcCount = services.filter(s => s.provider_id === p.id).length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{p.name}</span>
                          {p.is_featured && <Badge className="ml-1 bg-amber-100 text-amber-800 text-xs">★</Badge>}
                          {p.short_description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{p.short_description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs">{catName(p.category_id)}</Badge></TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>{p.commission_percent}%</TableCell>
                      <TableCell className="hidden md:table-cell">{svcCount}</TableCell>
                      <TableCell><Switch checked={!!p.is_active} onCheckedChange={v => toggleProvider.mutate({ id: p.id, active: v })} /></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEditProvider(p)}><Edit2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Catalog ── */}
        <TabsContent value="catalog" className="space-y-3">
          <p className="text-sm text-muted-foreground">Estructura del marketplace: {categories.length} categorías · {subcategories.length} subcategorías · {legalAreas.length} áreas jurídicas</p>
          {categories.map(cat => {
            const subs = subcatsByCat[cat.id] ?? [];
            const provs = provsByCat[cat.id] ?? [];
            const isOpen = expandedCats.has(cat.id);
            return (
              <Card key={cat.id} className="overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={() => toggleExpanded(cat.id)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0">
                          <span className="font-semibold text-sm">{cat.name}</span>
                          {cat.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{subs.length} sub · {provs.length} prov</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t border-border">
                      {subs.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subcategorías</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {subs.map(s => <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>)}
                          </div>
                        </div>
                      )}
                      {provs.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proveedores</span>
                          <div className="mt-1 space-y-1">
                            {provs.map(p => (
                              <div key={p.id} className="flex items-center justify-between text-sm py-1">
                                <div className="flex items-center gap-2">
                                  <span className={p.is_active ? '' : 'text-muted-foreground line-through'}>{p.name}</span>
                                  {statusBadge(p.status)}
                                </div>
                                <span className="text-xs text-muted-foreground">{p.commission_percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Orders ── */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pedidos</CardTitle>
              <CardDescription>Facturación: {totalRevenue.toLocaleString('es-ES')}€ · Comisiones: {totalCommission.toLocaleString('es-ES')}€</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead>Total</TableHead><TableHead>Comisión</TableHead><TableHead>Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay pedidos</TableCell></TableRow>}
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm">{format(new Date(o.created_at), 'dd/MM/yy', { locale: es })}</TableCell>
                    <TableCell>{provName(o.provider_id)}</TableCell>
                    <TableCell>{o.total_price.toLocaleString('es-ES')}€</TableCell>
                    <TableCell className="text-primary font-medium">{o.commission_amount.toLocaleString('es-ES')}€</TableCell>
                    <TableCell><Badge className={orderStatusColor(o.status)}>{o.status}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editProvider ? 'Editar proveedor' : 'Crear proveedor manualmente'}</DialogTitle></DialogHeader>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Modalidad</Label>
                <Select value={pf.modality} onValueChange={v => setPf(p => ({ ...p, modality: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="ambas">Ambas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Tiempo de respuesta</Label><Input placeholder="Ej: 24h" value={pf.response_time} onChange={e => setPf(p => ({ ...p, response_time: e.target.value }))} /></div>
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
    </div>
  );
}
