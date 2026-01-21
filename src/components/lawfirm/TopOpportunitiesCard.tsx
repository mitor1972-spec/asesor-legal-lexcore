import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye, ShoppingCart, MapPin, Scale, Clock } from 'lucide-react';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { Link } from 'react-router-dom';
import type { MarketplaceLead } from '@/types/marketplace';

interface TopOpportunitiesCardProps {
  leads: MarketplaceLead[];
  balance: number;
  onViewDetails: (lead: MarketplaceLead) => void;
  onPurchase: (lead: MarketplaceLead) => void;
}

export function TopOpportunitiesCard({ leads, balance, onViewDetails, onPurchase }: TopOpportunitiesCardProps) {
  // Get top 3 leads by score/price
  const topLeads = leads
    .sort((a, b) => (b.score_final || 0) - (a.score_final || 0))
    .slice(0, 3);

  if (topLeads.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-lawfirm-primary/5 to-lawfirm-primary/10 border-lawfirm-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-lawfirm-primary" />
            Oportunidades Destacadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No hay leads disponibles en este momento
          </p>
          <Link to="/despacho/leadsmarket">
            <Button variant="outline" className="w-full">
              Ir a LeadsMarket
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-lawfirm-primary/5 to-lawfirm-primary/10 border-lawfirm-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-lawfirm-primary" />
            Oportunidades Destacadas
          </CardTitle>
          <Link to="/despacho/leadsmarket">
            <Button variant="ghost" size="sm">
              Ver todas →
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topLeads.map((lead) => {
          const fields = lead.structured_fields || {};
          const canAfford = balance >= lead.marketplace_price;
          
          return (
            <div 
              key={lead.id}
              className="p-3 rounded-lg bg-card border hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LeadTemperature score={lead.score_final} variant="mini" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Scale className="h-3 w-3 mr-1" />
                        {fields.area_legal || fields.legal_area || 'Legal'}
                      </Badge>
                      {(fields.provincia || fields.province) && (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {fields.provincia || fields.province}
                        </Badge>
                      )}
                      {(fields.urgencia_nivel) && (
                        <Badge variant="destructive" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Urgente
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {lead.marketplace_summary?.substring(0, 120)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Ref: {lead.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-lg font-bold text-lawfirm-primary">
                    {lead.marketplace_price}€
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onViewDetails(lead)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => onPurchase(lead)}
                      disabled={!canAfford}
                      title={!canAfford ? 'Saldo insuficiente' : 'Comprar lead'}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
