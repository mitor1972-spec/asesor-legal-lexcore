import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye, ShoppingCart, MapPin, Scale, Clock, Radar, ArrowRight } from 'lucide-react';
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
  // Filter: urgent OR score > 50, then sort by score desc
  const relevantLeads = leads
    .filter(lead => {
      const fields = lead.structured_fields || {};
      const isUrgent = !!fields.urgencia_aplica || !!fields.urgencia_nivel;
      const highScore = (lead.score_final || 0) > 50;
      return isUrgent || highScore;
    })
    .sort((a, b) => (b.score_final || 0) - (a.score_final || 0))
    .slice(0, 5);

  if (relevantLeads.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-lawfirm-primary/5 to-lawfirm-primary/10 border-lawfirm-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-lawfirm-primary" />
            Oportunidades Destacadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center py-2">
            No hay leads urgentes o con scoring alto en este momento.
          </p>
          <RadarCTA />
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
        {relevantLeads.map((lead) => {
          const fields = lead.structured_fields || {};
          const canAfford = balance >= lead.marketplace_price;
          const isUrgent = !!fields.urgencia_aplica || !!fields.urgencia_nivel;
          const area = fields.area_legal || fields.legal_area || 'Legal';
          const province = fields.provincia || fields.province || '';

          return (
            <div 
              key={lead.id}
              className={`p-3 rounded-lg bg-card border transition-all hover:shadow-md ${isUrgent ? 'border-destructive/50' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: key data */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <LeadTemperature score={lead.score_final} variant="mini" />
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {isUrgent && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Urgente
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs shrink-0">
                      <Scale className="h-3 w-3 mr-1" />
                      {area}
                    </Badge>
                    {province && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        <MapPin className="h-3 w-3 mr-1" />
                        {province}
                      </Badge>
                    )}
                    <span className="text-sm font-bold text-lawfirm-primary shrink-0">
                      {lead.marketplace_price}€
                    </span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      #{lead.id.substring(0, 6)}
                    </span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onViewDetails(lead)}
                    title="Ver informe"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => onPurchase(lead)}
                    disabled={!canAfford}
                    title={!canAfford ? 'Saldo insuficiente' : 'Comprar lead'}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Radar CTA */}
        <RadarCTA />
      </CardContent>
    </Card>
  );
}

function RadarCTA() {
  return (
    <Link 
      to="/despacho/radar"
      className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-lawfirm-primary/30 bg-lawfirm-primary/5 hover:bg-lawfirm-primary/10 transition-colors group"
    >
      <Radar className="h-5 w-5 text-lawfirm-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Activa tu Radar</p>
        <p className="text-xs text-muted-foreground">
          Recibe alertas automáticas cuando lleguen leads que encajen con tu despacho.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-lawfirm-primary transition-colors shrink-0" />
    </Link>
  );
}
