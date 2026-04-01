import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { ShoppingCart, Wallet, Filter, LayoutGrid, List, ArrowUpDown, RotateCcw, Search, Zap, Percent, TrendingUp, Euro } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';
import { LeadMarketCard } from '@/components/leadsmarket/LeadMarketCard';
import { LeadMarketListItem } from '@/components/leadsmarket/LeadMarketListItem';
import { LeadDetailModal } from '@/components/leadsmarket/LeadDetailModal';
import { ShoppingCart as ShoppingCartPanel, CartButton } from '@/components/leadsmarket/ShoppingCart';
import type { MarketplaceLead, CartItem, RawScores } from '@/types/marketplace';

export default function LeadsMarket() {
  const { user } = useAuthContext();
  const { isImpersonating, impersonatedLawfirm } = useImpersonation();
  const queryClient = useQueryClient();
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;
  
  // Draft filter state (not applied until user clicks)
  const [draftArea, setDraftArea] = useState<string>('all');
  const [draftProvince, setDraftProvince] = useState<string>('all');
  const [draftMinScore, setDraftMinScore] = useState<string>('');
  const [draftSortBy, setDraftSortBy] = useState<string>('date_desc');
  
  // Applied filter state
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  
  // Quick filter state
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Apply filters
  const handleApplyFilters = () => {
    setAreaFilter(draftArea);
    setProvinceFilter(draftProvince);
    setMinScore(draftMinScore);
    setSortBy(draftSortBy);
    setQuickFilter(null);
  };

  // Clear filters
  const handleClearFilters = () => {
    setDraftArea('all');
    setDraftProvince('all');
    setDraftMinScore('');
    setDraftSortBy('date_desc');
    setAreaFilter('all');
    setProvinceFilter('all');
    setMinScore('');
    setSortBy('date_desc');
    setQuickFilter(null);
  };

  // Fetch lawfirm balance
  const { data: lawfirm } = useQuery({
    queryKey: ['lawfirm-balance', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return null;
      const { data, error } = await supabase
        .from('lawfirms')
        .select('id, name, marketplace_balance')
        .eq('id', lawfirmId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lawfirmId,
  });

  // Fetch commission areas
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

  // Fetch marketplace leads - exclude score 0 and leads before March 20
  const { data: rawLeads, isLoading } = useQuery({
    queryKey: ['marketplace-leads'],
    queryFn: async () => {
      const query = supabase
        .from('leads')
        .select(`
          id, 
          marketplace_summary, 
          case_summary,
          marketplace_price, 
          price_final,
          score_final, 
          source_channel, 
          created_at, 
          conversation_id,
          structured_fields,
          lead_assignments!left(id),
          lexcore_runs(
            vj_json,
            raw_scores_json,
            llm_response_json,
            computed_at
          )
        `)
        .is('archived_at', null)
        .is('discarded_at', null)
        .or('structured_fields->_incomplete.is.null,structured_fields->_incomplete.eq.false')
        .eq('status_internal', 'Pendiente')
        .or('structured_fields->>email.neq.,structured_fields->>telefono.neq.')
        .or('is_demo.is.null,is_demo.eq.false')
        .gt('score_final', 0)
        .gte('created_at', '2025-03-20T00:00:00Z')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out leads that already have assignments (purchased/assigned)
      const filtered = (data || []).filter(l => 
        !l.lead_assignments || l.lead_assignments.length === 0
      );
      
      return filtered.map(l => {
        // Sort lexcore_runs by computed_at desc to get latest
        const sortedRuns = [...(l.lexcore_runs || [])].sort((a: any, b: any) => 
          new Date(b.computed_at || 0).getTime() - new Date(a.computed_at || 0).getTime()
        );
        const latestRun = sortedRuns[0];
        const vjData = latestRun?.vj_json as any;
        const rawScores = latestRun?.raw_scores_json as unknown as RawScores | null;
        const llmResponse = latestRun?.llm_response_json as any;
        const sf = l.structured_fields as any;
        const legalArea = sf?.area_legal || sf?.legal_area || '';
        const commPct = commissionAreas?.[legalArea];
        
        return {
          id: l.id,
          marketplace_summary: l.marketplace_summary || l.case_summary?.substring(0, 300) || 'Lead disponible para compra',
          marketplace_price: l.marketplace_price || l.price_final || 25,
          score_final: l.score_final || 0,
          source_channel: l.source_channel,
          created_at: l.created_at,
          structured_fields: l.structured_fields || {},
          vj_value: vjData?.value ?? vjData?.vj ?? null,
          vj_key_phrases: llmResponse?.key_phrases || [],
          raw_scores: rawScores || llmResponse?.raw_scores || null,
          case_summary: l.case_summary,
          commission_available: commPct != null,
          commission_percent: commPct ?? undefined,
          conversation_id: l.conversation_id,
        } as MarketplaceLead;
      });
    },
  });

  // Quick filter counts
  const quickFilterCounts = useMemo(() => {
    if (!rawLeads) return { urgent: 0, commission: 0, highScore: 0, highPrice: 0 };
    return {
      urgent: rawLeads.filter(l => l.structured_fields?.urgencia_aplica === true).length,
      commission: rawLeads.filter(l => l.commission_available).length,
      highScore: rawLeads.filter(l => l.score_final > 60).length,
      highPrice: rawLeads.filter(l => (l.marketplace_price || 0) > 30).length,
    };
  }, [rawLeads]);

  // Apply client-side filtering
  const leads = useMemo(() => {
    if (!rawLeads) return [];
    let filtered = [...rawLeads];

    // Quick filters
    if (quickFilter === 'urgent') {
      filtered = filtered.filter(l => l.structured_fields?.urgencia_aplica === true);
    } else if (quickFilter === 'commission') {
      filtered = filtered.filter(l => l.commission_available);
    } else if (quickFilter === 'highScore') {
      filtered = filtered.filter(l => l.score_final > 60);
    } else if (quickFilter === 'highPrice') {
      filtered = filtered.filter(l => (l.marketplace_price || 0) > 30);
    }

    if (areaFilter !== 'all') {
      filtered = filtered.filter(l => {
        const fields = l.structured_fields as any;
        return fields?.area_legal === areaFilter || fields?.legal_area === areaFilter;
      });
    }
    if (provinceFilter !== 'all') {
      filtered = filtered.filter(l => {
        const fields = l.structured_fields as any;
        return fields?.provincia === provinceFilter || fields?.province === provinceFilter;
      });
    }
    if (minScore && !isNaN(parseInt(minScore))) {
      filtered = filtered.filter(l => (l.score_final || 0) >= parseInt(minScore));
    }

    // Sort
    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.marketplace_price || 25) - (b.marketplace_price || 25));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.marketplace_price || 25) - (a.marketplace_price || 25));
    } else if (sortBy === 'score_desc') {
      filtered.sort((a, b) => (b.score_final || 0) - (a.score_final || 0));
    } else if (sortBy === 'area') {
      filtered.sort((a, b) => {
        const aArea = (a.structured_fields as any)?.area_legal || '';
        const bArea = (b.structured_fields as any)?.area_legal || '';
        return aArea.localeCompare(bArea);
      });
    }

    return filtered;
  }, [rawLeads, areaFilter, provinceFilter, minScore, sortBy, quickFilter]);

  const balance = lawfirm?.marketplace_balance || 0;

  // Add to cart (with optional commission mode)
  const handleAddToCart = (lead: MarketplaceLead, isCommission?: boolean) => {
    if (cartItems.some(item => item.id === lead.id)) {
      toast.info('Este lead ya está en tu carrito');
      return;
    }
    
    const fields = lead.structured_fields || {};
    const newItem: CartItem = {
      id: lead.id,
      legalArea: fields.legal_area || fields.area_legal || 'Sin área',
      province: fields.province || fields.provincia || 'Sin provincia',
      score: lead.score_final,
      price: lead.marketplace_price,
      commissionPercent: lead.commission_percent,
      isCommission: isCommission || false,
    };
    
    setCartItems(prev => [...prev, newItem]);
    toast.success(isCommission ? 'Lead añadido a comisión' : 'Lead añadido al carrito');
  };

  // Toggle commission model for a cart item
  const handleToggleCommission = (id: string, isCommission: boolean) => {
    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, isCommission } : item
    ));
  };

  // View details
  const handleViewDetails = (lead: MarketplaceLead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  // Remove from cart
  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // Clear cart
  const handleClearCart = () => {
    setCartItems([]);
    toast.info('Carrito vaciado');
  };

  // Checkout
  const handleCheckout = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    
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
      toast.success(`¡${successCount} lead${successCount > 1 ? 's' : ''} comprado${successCount > 1 ? 's' : ''}! Ya tienes acceso completo en "Mis Casos"`);
      setCartItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
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

  const handleQuickFilter = (filter: string) => {
    setQuickFilter(prev => prev === filter ? null : filter);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-lawfirm-primary" />
            LeadsMarket
          </h1>
          <p className="text-muted-foreground">
            Compra leads antes de que sean asignados a otros despachos
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Card className="bg-gradient-to-r from-lawfirm-primary/10 to-lawfirm-primary/5 border-lawfirm-primary/20">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-lawfirm-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Crédito disponible</p>
                <p className="text-lg font-bold text-lawfirm-primary">{balance.toFixed(2)}€</p>
              </div>
            </CardContent>
          </Card>

          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}
          >
            <ToggleGroupItem value="grid" aria-label="Vista cuadrícula" className="h-9 w-9 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Vista lista" className="h-9 w-9 p-0">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <CartButton 
            itemCount={cartItems.length} 
            onClick={() => setShowCart(true)} 
          />
        </div>
      </div>

      {/* Filters - single line */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            
            <Select value={draftArea} onValueChange={setDraftArea}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Área legal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {LEGAL_AREAS.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={draftProvince} onValueChange={setDraftProvince}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Provincia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PROVINCES.map(prov => (
                  <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Score mín."
              value={draftMinScore}
              onChange={(e) => setDraftMinScore(e.target.value)}
              min={0}
              max={100}
              className="w-[90px] h-8 text-xs"
            />

            <Select value={draftSortBy} onValueChange={setDraftSortBy}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Más recientes</SelectItem>
                <SelectItem value="score_desc">Mayor puntuación</SelectItem>
                <SelectItem value="price_asc">Precio ↑</SelectItem>
                <SelectItem value="price_desc">Precio ↓</SelectItem>
                <SelectItem value="area">Área legal</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={handleApplyFilters} className="gap-1 h-8 text-xs">
              <Search className="h-3 w-3" />
              Aplicar
            </Button>
            <Button size="icon" variant="ghost" onClick={handleClearFilters} className="h-8 w-8" title="Limpiar filtros">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => handleQuickFilter('urgent')}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer text-left ${
            quickFilter === 'urgent' 
              ? 'bg-red-500/10 border-red-500/40 shadow-sm' 
              : 'bg-card hover:bg-muted/50 border-border'
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Urgentes</p>
            <p className="text-lg font-bold text-red-600">{quickFilterCounts.urgent}</p>
          </div>
        </button>

        <button
          onClick={() => handleQuickFilter('commission')}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer text-left ${
            quickFilter === 'commission' 
              ? 'bg-green-500/10 border-green-500/40 shadow-sm' 
              : 'bg-card hover:bg-muted/50 border-border'
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <Percent className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Comisionables</p>
            <p className="text-lg font-bold text-green-600">{quickFilterCounts.commission}</p>
          </div>
        </button>

        <button
          onClick={() => handleQuickFilter('highScore')}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer text-left ${
            quickFilter === 'highScore' 
              ? 'bg-blue-500/10 border-blue-500/40 shadow-sm' 
              : 'bg-card hover:bg-muted/50 border-border'
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Score &gt; 60</p>
            <p className="text-lg font-bold text-blue-600">{quickFilterCounts.highScore}</p>
          </div>
        </button>

        <button
          onClick={() => handleQuickFilter('highPrice')}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer text-left ${
            quickFilter === 'highPrice' 
              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm' 
              : 'bg-card hover:bg-muted/50 border-border'
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Euro className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Precio &gt; 30€</p>
            <p className="text-lg font-bold text-amber-600">{quickFilterCounts.highPrice}</p>
          </div>
        </button>
      </div>

      {/* Leads Grid */}
      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[450px]" />
          ))}
        </div>
      ) : leads?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No hay leads disponibles</h3>
            <p className="text-muted-foreground mt-1">
              {quickFilter ? 'No hay leads con este filtro. Prueba otro criterio.' : 'Cuando haya nuevos leads disponibles, aparecerán aquí automáticamente'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {leads?.map((lead) => (
            <LeadMarketCard
              key={lead.id}
              lead={lead}
              onAddToCart={handleAddToCart}
              onViewDetails={handleViewDetails}
              isInCart={isInCart(lead.id)}
              canAfford={balance >= lead.marketplace_price}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {leads?.map((lead) => (
            <LeadMarketListItem
              key={lead.id}
              lead={lead}
              onAddToCart={handleAddToCart}
              onViewDetails={handleViewDetails}
              isInCart={isInCart(lead.id)}
              canAfford={balance >= lead.marketplace_price}
            />
          ))}
        </div>
      )}

      {/* Shopping Cart Panel */}
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

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLead(null);
        }}
        onAddToCart={handleAddToCart}
        isInCart={selectedLead ? isInCart(selectedLead.id) : false}
        canAfford={selectedLead ? balance >= selectedLead.marketplace_price : false}
      />
    </div>
  );
}
