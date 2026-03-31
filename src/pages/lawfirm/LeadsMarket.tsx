import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { ShoppingCart, Wallet, Filter, LayoutGrid, List, FileDown, ArrowUpDown } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';
import { LeadMarketCard } from '@/components/leadsmarket/LeadMarketCard';
import { LeadMarketListItem } from '@/components/leadsmarket/LeadMarketListItem';
import { LeadDetailModal } from '@/components/leadsmarket/LeadDetailModal';
import { ShoppingCart as ShoppingCartPanel, CartButton } from '@/components/leadsmarket/ShoppingCart';
import type { MarketplaceLead, CartItem, RawScores } from '@/types/marketplace';
import { exportLeadsToExcel } from '@/lib/exportToExcel';

export default function LeadsMarket() {
  const { user } = useAuthContext();
  const { mode } = useDemoMode();
  const queryClient = useQueryClient();
  
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Fetch lawfirm balance
  const { data: lawfirm } = useQuery({
    queryKey: ['lawfirm-balance', user?.profile?.lawfirm_id],
    queryFn: async () => {
      if (!user?.profile?.lawfirm_id) return null;
      const { data, error } = await supabase
        .from('lawfirms')
        .select('id, name, marketplace_balance')
        .eq('id', user.profile.lawfirm_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.lawfirm_id,
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

  // Fetch marketplace leads with lexcore data
  const { data: leads, isLoading } = useQuery({
    queryKey: ['marketplace-leads', areaFilter, provinceFilter, minScore, mode, sortBy],
    queryFn: async () => {
      let query = supabase
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
            llm_response_json
          )
        `)
        .is('archived_at', null)
        .is('discarded_at', null) // CRITICAL: Exclude discarded leads
        .or('structured_fields->_incomplete.is.null,structured_fields->_incomplete.eq.false')
        .eq('status_internal', 'Pendiente')
        // GOLDEN RULE: Lead must have email OR phone to be shown in marketplace
        .or('structured_fields->>email.neq.,structured_fields->>telefono.neq.')
        .order('created_at', { ascending: false });

      // Apply demo mode filter
      if (mode === 'demo') {
        query = query.eq('is_demo', true);
      } else {
        query = query.or('is_demo.is.null,is_demo.eq.false');
      }

      if (minScore && !isNaN(parseInt(minScore))) {
        query = query.gte('score_final', parseInt(minScore));
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out leads that already have assignments
      let filtered = (data || []).filter(l => 
        !l.lead_assignments || l.lead_assignments.length === 0
      );

      // Filter by area and province in frontend (since it's in JSONB)
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
      
      // Sort based on selected option
      if (sortBy === 'price_asc') {
        filtered.sort((a, b) => (a.marketplace_price || a.price_final || 25) - (b.marketplace_price || b.price_final || 25));
      } else if (sortBy === 'price_desc') {
        filtered.sort((a, b) => (b.marketplace_price || b.price_final || 25) - (a.marketplace_price || a.price_final || 25));
      } else if (sortBy === 'score_desc') {
        filtered.sort((a, b) => (b.score_final || 0) - (a.score_final || 0));
      } else if (sortBy === 'area') {
        filtered.sort((a, b) => {
          const aArea = (a.structured_fields as any)?.area_legal || '';
          const bArea = (b.structured_fields as any)?.area_legal || '';
          return aArea.localeCompare(bArea);
        });
      }
      // date_desc is default from DB query
      
        return filtered.map(l => {
        // Get latest lexcore run
        const latestRun = l.lexcore_runs?.[0];
        const vjData = latestRun?.vj_json as any;
        const rawScores = latestRun?.raw_scores_json as unknown as RawScores | null;
        const llmResponse = latestRun?.llm_response_json as any;
        const legalArea = (l.structured_fields as any)?.area_legal || (l.structured_fields as any)?.legal_area || '';
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
        } as MarketplaceLead;
      });
    },
  });

  const balance = lawfirm?.marketplace_balance || 0;
  const isDemoMode = mode === 'demo';

  // Add to cart
  const handleAddToCart = (lead: MarketplaceLead) => {
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
    };
    
    setCartItems(prev => [...prev, newItem]);
    toast.success('Lead añadido al carrito');
  };

  // Toggle commission model for a cart item
  const handleToggleCommission = (id: string, isCommission: boolean) => {
    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, isCommission } : item
    ));

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

  // Checkout - purchase multiple leads
  const handleCheckout = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    
    setIsCheckingOut(true);
    let successCount = 0;
    let errorCount = 0;

    for (const leadId of selectedIds) {
      try {
        const { data, error } = await supabase.functions.invoke('purchase-lead', {
          body: {
            lead_id: leadId,
            lawfirm_id: user?.profile?.lawfirm_id,
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
      
      // Remove purchased leads from cart
      setCartItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['marketplace-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-balance'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
    }
    
    if (errorCount > 0) {
      toast.error(`Error al comprar ${errorCount} lead${errorCount > 1 ? 's' : ''}`);
    }

    setShowCart(false);
  };

  // Export visible leads to Excel
  const handleExportLeads = () => {
    if (!leads || leads.length === 0) {
      toast.error('No hay leads para exportar');
      return;
    }

    const exportData = leads.map(lead => {
      const fields = lead.structured_fields || {};
      return {
        id: lead.id,
        created_at: lead.created_at,
        source_channel: lead.source_channel,
        status_internal: 'Pendiente',
        score_final: lead.score_final,
        price_final: lead.marketplace_price,
        structured_fields: {
          ...fields,
          nombre: fields.nombre || fields.name || '',
          apellidos: fields.apellidos || '',
          telefono: fields.telefono || fields.phone || '',
          email: fields.email || fields.correo || '',
          ciudad: fields.ciudad || fields.city || '',
          provincia: fields.provincia || fields.province || '',
          area_legal: fields.area_legal || fields.legal_area || '',
          subarea: fields.subarea || '',
          cuantia: fields.cuantia,
        },
      };
    });

    exportLeadsToExcel(exportData as any, `leadsmarket_${mode}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${leads.length} leads exportados correctamente`);
  };

  // Check if lead is in cart
  const isInCart = (id: string) => cartItems.some(item => item.id === id);

  return (
    <div className="space-y-6 animate-fade-in">
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
          <Button variant="outline" size="sm" onClick={handleExportLeads} disabled={!leads || leads.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Card className="bg-gradient-to-r from-lawfirm-primary/10 to-lawfirm-primary/5 border-lawfirm-primary/20">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-lawfirm-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Tu saldo</p>
                <p className="text-lg font-bold text-lawfirm-primary">{balance.toFixed(2)}€</p>
              </div>
            </CardContent>
          </Card>
          
          <CartButton 
            itemCount={cartItems.length} 
            onClick={() => setShowCart(true)} 
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="flex-1 min-w-[150px] max-w-[200px]">
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Área legal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  {LEGAL_AREAS.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px] max-w-[200px]">
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las provincias</SelectItem>
                  {PROVINCES.map(prov => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[120px]">
              <Input
                type="number"
                placeholder="Score mín."
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                min={0}
                max={100}
              />
            </div>

            <div className="flex-1 min-w-[150px] max-w-[200px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Más recientes</SelectItem>
                  <SelectItem value="score_desc">Mayor puntuación</SelectItem>
                  <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
                  <SelectItem value="area">Área legal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="h-9 px-3">
            </Badge>

            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}
              className="ml-auto"
            >
              <ToggleGroupItem value="grid" aria-label="Vista cuadrícula">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Vista lista">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid - Using new LeadMarketCard component */}
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
              Cuando haya nuevos leads disponibles, aparecerán aquí automáticamente
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
              canAfford={isDemoMode || balance >= lead.marketplace_price}
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
              canAfford={isDemoMode || balance >= lead.marketplace_price}
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
        canAfford={isDemoMode || (selectedLead ? balance >= selectedLead.marketplace_price : false)}
      />
    </div>
  );
}