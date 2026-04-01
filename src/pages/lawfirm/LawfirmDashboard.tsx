import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLawfirmCases } from '@/hooks/useLawfirmCases';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, ShoppingCart as ShoppingCartIcon, Briefcase, CreditCard,
  TrendingUp, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CasesByAreaWidget, CasesByProvinceWidget } from '@/components/lawfirm/DashboardWidgets';
import { TopOpportunitiesCard } from '@/components/lawfirm/TopOpportunitiesCard';
import { ImmediateActionsCard } from '@/components/lawfirm/ImmediateActionsCard';
import { RecentActivityCard } from '@/components/lawfirm/RecentActivityCard';
import { AdvancedKPIs } from '@/components/lawfirm/AdvancedKPIs';
import { LeadDetailModal } from '@/components/leadsmarket/LeadDetailModal';
import { ShoppingCart as ShoppingCartPanel, CartButton } from '@/components/leadsmarket/ShoppingCart';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ProfileGateDialog } from '@/components/lawfirm/ProfileGateDialog';
import { useLawfirmProfileGate } from '@/hooks/useLawfirmProfileGate';
import type { MarketplaceLead, CartItem, RawScores } from '@/types/marketplace';

const statusLabels: Record<string, string> = {
  received: 'Recibido', reviewing: 'Revisando', contacted: 'Contactado',
  in_progress: 'En curso', won: 'Ganado', lost: 'Perdido',
  rejected: 'Rechazado', archived: 'Archivado',
};

const statusColors: Record<string, string> = {
  received: 'hsl(217, 91%, 60%)', reviewing: 'hsl(38, 92%, 50%)',
  contacted: 'hsl(280, 67%, 56%)', in_progress: 'hsl(217, 91%, 60%)',
  won: 'hsl(142, 71%, 45%)', lost: 'hsl(0, 84%, 60%)',
  rejected: 'hsl(0, 0%, 50%)', archived: 'hsl(0, 0%, 40%)',
};

export default function LawfirmDashboard() {
  const { user } = useAuthContext();
  const { impersonatedLawfirm, isImpersonating } = useImpersonation();
  const queryClient = useQueryClient();
  const { data: lawfirm } = useLawfirmProfile();
  const { data: cases = [], isLoading } = useLawfirmCases();
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;
  
  // Profile gate
  const { isProfileComplete, missingFields } = useLawfirmProfileGate();
  const [showProfileGate, setShowProfileGate] = useState(false);

  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fetch available marketplace leads
  const { data: marketplaceLeads = [] } = useQuery({
    queryKey: ['dashboard-opportunities', lawfirmId],
    queryFn: async () => {
      const query = supabase
        .from('leads')
        .select(`
          id, marketplace_summary, case_summary, marketplace_price, price_final,
          score_final, source_channel, created_at, structured_fields, conversation_id,
          lead_assignments!left(id),
          lexcore_runs(vj_json, raw_scores_json, llm_response_json)
        `)
        .is('archived_at', null)
        .is('discarded_at', null)
        .or('structured_fields->_incomplete.is.null,structured_fields->_incomplete.eq.false')
        .eq('status_internal', 'Pendiente')
        .or('structured_fields->>email.neq.,structured_fields->>telefono.neq.')
        .or('is_demo.is.null,is_demo.eq.false')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      const filtered = (data || []).filter(l => !l.lead_assignments || l.lead_assignments.length === 0);
      
      return filtered.map(l => {
        const latestRun = l.lexcore_runs?.[0];
        const vjData = latestRun?.vj_json as any;
        const rawScores = latestRun?.raw_scores_json as unknown as RawScores | null;
        const llmResponse = latestRun?.llm_response_json as any;
        
        return {
          id: l.id,
          marketplace_summary: l.marketplace_summary || l.case_summary?.substring(0, 300) || 'Lead disponible',
          marketplace_price: l.marketplace_price || l.price_final || 25,
          score_final: l.score_final || 0,
          source_channel: l.source_channel,
          created_at: l.created_at,
          structured_fields: l.structured_fields || {},
          conversation_id: l.conversation_id,
          vj_value: vjData?.value ?? vjData?.vj ?? null,
          vj_key_phrases: llmResponse?.key_phrases || [],
          raw_scores: rawScores || llmResponse?.raw_scores || null,
          case_summary: l.case_summary,
        } as MarketplaceLead;
      });
    },
    enabled: !!lawfirmId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Fetch commission areas for cart
  const { data: commissionAreas } = useQuery({
    queryKey: ['commission-areas-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_areas')
        .select('legal_area, commission_percent')
        .eq('is_active', true);
      if (error) return {};
      const map: Record<string, number> = {};
      (data || []).forEach(a => { map[a.legal_area] = a.commission_percent; });
      return map;
    },
  });

  const balance = lawfirm?.marketplace_balance || 0;

  // Cart handlers
  const handleAddToCart = (lead: MarketplaceLead) => {
    if (cartItems.some(item => item.id === lead.id)) {
      toast.info('Este lead ya está en tu carrito');
      return;
    }
    const fields = lead.structured_fields || {};
    const legalArea = fields.legal_area || fields.area_legal || 'Sin área';
    const commPct = commissionAreas?.[legalArea];
    const newItem: CartItem = {
      id: lead.id,
      legalArea,
      province: fields.province || fields.provincia || 'Sin provincia',
      score: lead.score_final,
      price: lead.marketplace_price,
      commissionPercent: commPct,
    };
    setCartItems(prev => [...prev, newItem]);
    toast.success('Lead añadido al carrito');
  };

  const handleToggleCommission = (id: string, isCommission: boolean) => {
    setCartItems(prev => prev.map(item =>
      item.id === id ? { ...item, isCommission } : item
    ));
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast.info('Carrito vaciado');
  };

  const handleCheckout = async (selectedIds: string[]) => {
    if (selectedIds.length === 0 || !lawfirmId) return;
    setIsCheckingOut(true);
    let successCount = 0;
    let errorCount = 0;

    for (const leadId of selectedIds) {
      const cartItem = cartItems.find(i => i.id === leadId);
      try {
        const { data, error } = await supabase.functions.invoke('purchase-lead', {
          body: {
            lead_id: leadId,
            lawfirm_id: lawfirmId,
            is_commission: cartItem?.isCommission || false,
            commission_percent: cartItem?.isCommission ? (cartItem.commissionPercent || 20) : undefined,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        successCount++;
      } catch (error) {
        console.error('Error purchasing lead:', leadId, error);
        errorCount++;
      }
    }

    setIsCheckingOut(false);
    if (successCount > 0) {
      toast.success(`¡${successCount} lead${successCount > 1 ? 's' : ''} comprado${successCount > 1 ? 's' : ''}!`);
      setCartItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
      queryClient.invalidateQueries({ queryKey: ['dashboard-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-balance'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
    }
    if (errorCount > 0) {
      toast.error(`Error al comprar ${errorCount} lead${errorCount > 1 ? 's' : ''}`);
    }
    setShowCart(false);
  };

  const isInCart = (id: string) => cartItems.some(item => item.id === id);

  const handleViewDetails = (lead: MarketplaceLead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  // Chart data
  const statusCounts = cases.reduce((acc, c) => { acc[c.firm_status] = (acc[c.firm_status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const chartData = Object.entries(statusCounts)
    .filter(([status]) => ['received', 'reviewing', 'contacted', 'in_progress', 'won', 'lost'].includes(status))
    .map(([status, count]) => ({ name: statusLabels[status] || status, value: count, color: statusColors[status] }));

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-pulse text-muted-foreground">Cargando...</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with summary stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            ¡Bienvenido, {user?.profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground">{lawfirm?.name || 'Tu despacho'} — Resumen ejecutivo</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CartButton 
            itemCount={cartItems.length} 
            onClick={() => setShowCart(true)} 
          />
        </div>
      </div>

      {/* Quick Summary Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ShoppingCartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{marketplaceLeads.length}</p>
              <p className="text-xs text-muted-foreground">Leads disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50 dark:border-green-800/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cases.length}</p>
              <p className="text-xs text-muted-foreground">Tus casos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border-violet-200/50 dark:border-violet-800/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{balance.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">Crédito disponible</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {cases.length > 0 
                  ? Math.round((cases.filter(c => ['contacted','in_progress','won'].includes(c.firm_status)).length / cases.length) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Conversión</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunities */}
      <TopOpportunitiesCard leads={marketplaceLeads} balance={balance} onViewDetails={handleViewDetails} onPurchase={handleAddToCart} isInCart={isInCart} />

      {/* Advanced KPIs */}
      <AdvancedKPIs cases={cases} availableLeadsCount={marketplaceLeads.length} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Immediate Actions (CRM) */}
          <ImmediateActionsCard cases={cases} />

          {/* Status Chart */}
          {chartData.length > 0 && (
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="text-lg">Casos por Estado</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          <RecentActivityCard cases={cases} />
          <CasesByAreaWidget cases={cases} />
          <CasesByProvinceWidget cases={cases} />

          {/* Quick Navigation */}
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Acceso rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Ver LeadMarket', href: '/despacho/leadsmarket' },
                { label: 'Mis Casos', href: '/despacho/casos' },
                { label: 'Radar', href: '/despacho/radar' },
                { label: 'Informes', href: '/despacho/informes' },
              ].map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm group"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-lawfirm-primary transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedLead(null); }}
        onAddToCart={handleAddToCart}
        isInCart={selectedLead ? isInCart(selectedLead.id) : false}
        canAfford={selectedLead ? balance >= selectedLead.marketplace_price : false}
      />
      <ShoppingCartPanel
        items={cartItems}
        open={showCart}
        onClose={() => setShowCart(false)}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onToggleCommission={handleToggleCommission}
        balance={balance}
        isCheckingOut={isCheckingOut}
      />
    </div>
  );
}
