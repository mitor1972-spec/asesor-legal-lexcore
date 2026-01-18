import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ShoppingCart, MapPin, Scale, TrendingUp, Clock, Loader2, AlertCircle, Wallet, Filter } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';
import { LeadTemperature } from '@/components/lead/LeadTemperature';

interface MarketplaceLead {
  id: string;
  marketplace_summary: string;
  marketplace_price: number;
  score_final: number;
  source_channel: string;
  created_at: string;
  structured_fields: {
    legal_area?: string;
    province?: string;
    urgency?: string;
    complexity?: string;
  };
}

export default function LeadsMarket() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  // Fetch marketplace leads - show all pending leads not yet assigned
  const { data: leads, isLoading } = useQuery({
    queryKey: ['marketplace-leads', areaFilter, provinceFilter, minScore],
    queryFn: async () => {
      // Get leads that are pending and not archived
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
          structured_fields,
          lead_assignments!left(id)
        `)
        .is('archived_at', null)
        .eq('status_internal', 'Pendiente')
        .order('score_final', { ascending: false, nullsFirst: false });

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
      
      return filtered.map(l => ({
        id: l.id,
        marketplace_summary: l.marketplace_summary || l.case_summary?.substring(0, 200) || 'Lead disponible para compra',
        marketplace_price: l.marketplace_price || l.price_final || 25,
        score_final: l.score_final || 0,
        source_channel: l.source_channel,
        created_at: l.created_at,
        structured_fields: l.structured_fields || {},
      })) as MarketplaceLead[];
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (lead: MarketplaceLead) => {
      const { data, error } = await supabase.functions.invoke('purchase-lead', {
        body: {
          lead_id: lead.id,
          lawfirm_id: user?.profile?.lawfirm_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('¡Lead comprado! Ya tienes acceso completo en "Mis Casos"');
      queryClient.invalidateQueries({ queryKey: ['marketplace-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-balance'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      setShowConfirmDialog(false);
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al comprar el lead');
    },
  });

  const handlePurchaseClick = (lead: MarketplaceLead) => {
    setSelectedLead(lead);
    setShowConfirmDialog(true);
  };

  const confirmPurchase = () => {
    if (selectedLead) {
      purchaseMutation.mutate(selectedLead);
    }
  };

  const balance = lawfirm?.marketplace_balance || 0;
  const canAfford = selectedLead ? balance >= (selectedLead.marketplace_price || 0) : false;
  const newBalance = selectedLead ? balance - (selectedLead.marketplace_price || 0) : balance;

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
        
        <Card className="bg-gradient-to-r from-lawfirm-primary/10 to-lawfirm-primary/5 border-lawfirm-primary/20">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-lawfirm-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Tu saldo</p>
              <p className="text-lg font-bold text-lawfirm-primary">{balance.toFixed(2)}€</p>
            </div>
          </CardContent>
        </Card>
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

            <Badge variant="secondary" className="h-9 px-3">
              {leads?.length || 0} leads disponibles
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[200px]" />
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {leads?.map((lead) => {
            const fields = lead.structured_fields || {};
            
            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-lawfirm-primary" />
                      <CardTitle className="text-base">
                        {fields.legal_area || 'Sin área'}
                      </CardTitle>
                    </div>
                    <LeadTemperature score={lead.score_final} variant="mini" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {fields.province || 'Sin provincia'}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {lead.marketplace_summary || 'Resumen no disponible'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {fields.complexity || 'Media'}
                    </Badge>
                    {fields.urgency && (
                      <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                        <Clock className="h-3 w-3" />
                        Urgente
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {lead.source_channel || 'Web'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-lg font-bold text-lawfirm-primary">
                      {lead.marketplace_price?.toFixed(2) || '0.00'}€
                    </div>
                    <Button 
                      onClick={() => handlePurchaseClick(lead)}
                      disabled={balance < (lead.marketplace_price || 0)}
                      className="gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Comprar lead
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Confirmar compra de lead
            </DialogTitle>
            <DialogDescription>
              Revisa los detalles antes de confirmar
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-lawfirm-primary" />
                    <span className="font-medium">
                      {selectedLead.structured_fields?.legal_area || 'Sin área'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {selectedLead.structured_fields?.province || 'Sin provincia'}
                  </div>
                  <div className="flex items-center gap-2">
                    <LeadTemperature score={selectedLead.score_final} variant="mini" />
                    <span className="text-sm text-muted-foreground">
                      Score: {selectedLead.score_final}/100
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio:</span>
                  <span className="font-medium">{selectedLead.marketplace_price?.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tu saldo actual:</span>
                  <span className="font-medium">{balance.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Saldo tras compra:</span>
                  <span className={`font-bold ${canAfford ? 'text-success' : 'text-destructive'}`}>
                    {newBalance.toFixed(2)}€
                  </span>
                </div>
              </div>

              {!canAfford && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  Saldo insuficiente para esta compra
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Se descontará el importe de tu saldo</p>
                <p>• Tendrás acceso completo al lead (datos de contacto)</p>
                <p>• El lead desaparecerá del Marketplace</p>
                <p>• No hay devoluciones</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={purchaseMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmPurchase}
              disabled={!canAfford || purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                '✅ Confirmar compra'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
