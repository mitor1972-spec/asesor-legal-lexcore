import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ShoppingCart, MapPin, Scale, TrendingUp, Clock, Loader2, AlertCircle, Wallet, Filter, Zap, Euro, MessageSquareQuote, BarChart3 } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';

interface MarketplaceLead {
  id: string;
  marketplace_summary: string;
  marketplace_price: number;
  score_final: number;
  source_channel: string;
  created_at: string;
  structured_fields: {
    legal_area?: string;
    area_legal?: string;
    province?: string;
    provincia?: string;
    city?: string;
    ciudad?: string;
    urgency?: string;
    urgencia?: string;
    complexity?: string;
    complejidad?: string;
    estimated_amount?: number;
    cuantia_estimada?: number;
    key_phrases?: string[];
    frases_clave?: string[];
  };
  vj_value?: number;
  vj_key_phrases?: string[];
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

  // Fetch marketplace leads with lexcore data
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
          lead_assignments!left(id),
          lexcore_runs(
            vj_json,
            llm_response_json
          )
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
      
      return filtered.map(l => {
        // Get latest lexcore run
        const latestRun = l.lexcore_runs?.[0];
        const vjData = latestRun?.vj_json as any;
        const llmResponse = latestRun?.llm_response_json as any;
        
        return {
          id: l.id,
          marketplace_summary: l.marketplace_summary || l.case_summary?.substring(0, 300) || 'Lead disponible para compra',
          marketplace_price: l.marketplace_price || l.price_final || 25,
          score_final: l.score_final || 0,
          source_channel: l.source_channel,
          created_at: l.created_at,
          structured_fields: l.structured_fields || {},
          vj_value: vjData?.vj ?? vjData?.VJ ?? null,
          vj_key_phrases: vjData?.key_phrases || llmResponse?.key_phrases || [],
        };
      }) as MarketplaceLead[];
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
        <div className="grid gap-5 md:grid-cols-2">
          {leads?.map((lead) => {
            const fields = lead.structured_fields || {};
            const legalArea = fields.legal_area || fields.area_legal || 'Sin área';
            const province = fields.province || fields.provincia || 'Sin provincia';
            const city = fields.city || fields.ciudad;
            const location = city ? `${province} (${city})` : province;
            const urgency = fields.urgency || fields.urgencia;
            const complexity = fields.complexity || fields.complejidad || 'Media';
            const estimatedAmount = fields.estimated_amount || fields.cuantia_estimada;
            const keyPhrases = lead.vj_key_phrases || fields.key_phrases || fields.frases_clave || [];
            
            // Score color based on value
            const getScoreColor = (score: number) => {
              if (score >= 70) return 'text-success bg-success/10 border-success/30';
              if (score >= 40) return 'text-warning bg-warning/10 border-warning/30';
              return 'text-muted-foreground bg-muted border-border';
            };
            
            return (
              <Card key={lead.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-2">
                {/* Header: Área + Score */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-lawfirm-primary" />
                    <span className="font-semibold text-base">{legalArea}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-sm font-bold px-3 py-1 ${getScoreColor(lead.score_final)}`}
                  >
                    🟢 {lead.score_final} pts
                  </Badge>
                </div>
                
                <CardContent className="p-4 space-y-4">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{location}</span>
                  </div>
                  
                  {/* AI Summary */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Resumen del caso:
                    </p>
                    <p className="text-sm leading-relaxed line-clamp-4">
                      "{lead.marketplace_summary}"
                    </p>
                  </div>
                  
                  <Separator />
                  
                  {/* Scoring Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-lawfirm-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Scoring LEXCORE™
                      </span>
                    </div>
                    
                    {/* Scoring Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">📊 Score:</span>
                        <span className="font-bold">{lead.score_final}/100</span>
                      </div>
                      {lead.vj_value !== null && lead.vj_value !== undefined && (
                        <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">📈 VJ:</span>
                          <span className={`font-bold ${lead.vj_value > 0 ? 'text-success' : lead.vj_value < 0 ? 'text-destructive' : ''}`}>
                            {lead.vj_value > 0 ? '+' : ''}{lead.vj_value}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">🎯 Comp.:</span>
                        <span className="font-medium">{complexity}</span>
                      </div>
                    </div>
                    
                    {/* Second row */}
                    <div className="flex flex-wrap gap-2">
                      {urgency && (
                        <Badge variant="outline" className="gap-1 text-warning border-warning/30 bg-warning/10">
                          <Zap className="h-3 w-3" />
                          Urgente
                        </Badge>
                      )}
                      {estimatedAmount && (
                        <Badge variant="outline" className="gap-1">
                          <Euro className="h-3 w-3" />
                          {estimatedAmount.toLocaleString('es-ES')}€
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        📥 {lead.source_channel || 'Web'}
                      </Badge>
                    </div>
                    
                    {/* Key Phrases */}
                    {keyPhrases.length > 0 && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-lawfirm-primary/5 border border-lawfirm-primary/20">
                        <MessageSquareQuote className="h-4 w-4 text-lawfirm-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground italic line-clamp-2">
                          "{keyPhrases.slice(0, 3).join('", "')}"
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Footer: Price + Buy */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-lawfirm-primary">
                        {lead.marketplace_price?.toFixed(0) || '0'}€
                      </span>
                    </div>
                    <Button 
                      onClick={() => handlePurchaseClick(lead)}
                      disabled={balance < (lead.marketplace_price || 0)}
                      className="gap-2"
                      size="lg"
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
                      {selectedLead.structured_fields?.legal_area || selectedLead.structured_fields?.area_legal || 'Sin área'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {selectedLead.structured_fields?.province || selectedLead.structured_fields?.provincia || 'Sin provincia'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-success bg-success/10 border-success/30">
                      🟢 {selectedLead.score_final} pts
                    </Badge>
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
