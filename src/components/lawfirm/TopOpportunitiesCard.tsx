import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye, MapPin, Scale, Zap, Radar, ArrowRight, Euro, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MarketplaceLead } from '@/types/marketplace';
import { redactContactFromText } from '@/lib/contactSanitizer';

interface TopOpportunitiesCardProps {
  leads: MarketplaceLead[];
  balance: number;
  onViewDetails: (lead: MarketplaceLead) => void;
  onPurchase: (lead: MarketplaceLead) => void;
  isInCart?: (id: string) => boolean;
}

export function TopOpportunitiesCard({ leads, balance, onViewDetails, onPurchase, isInCart }: TopOpportunitiesCardProps) {
  // Filter: urgent OR score >= 60, sort urgent first then by score, max 6
  const relevantLeads = leads
    .filter(lead => {
      const fields = lead.structured_fields || {};
      const isUrgent = !!fields.urgencia_aplica || !!fields.urgencia_nivel;
      const highScore = (lead.score_final || 0) >= 60;
      return isUrgent || highScore;
    })
    .sort((a, b) => {
      const aUrgent = !!(a.structured_fields?.urgencia_aplica || a.structured_fields?.urgencia_nivel);
      const bUrgent = !!(b.structured_fields?.urgencia_aplica || b.structured_fields?.urgencia_nivel);
      if (aUrgent !== bUrgent) return bUrgent ? 1 : -1;
      if ((b.score_final || 0) !== (a.score_final || 0)) return (b.score_final || 0) - (a.score_final || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 6);

  if (relevantLeads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-lawfirm-primary" />
            Oportunidades Destacadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center py-2">
            No hay oportunidades destacadas en este momento.
          </p>
          <RadarCTA />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relevantLeads.map((lead) => {
            const fields = lead.structured_fields || {};
            const isUrgent = !!fields.urgencia_aplica || !!fields.urgencia_nivel;
            const area = fields.area_legal || fields.legal_area || 'Legal';
            const province = fields.provincia || fields.province || 'Sin provincia';
            const summary = redactContactFromText(lead.marketplace_summary, fields);

            const getScoreColor = (score: number) => {
              if (score >= 70) return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/40';
              if (score >= 50) return 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40';
              return 'text-muted-foreground bg-muted';
            };

            return (
              <Card 
                key={lead.id}
                className={`cursor-pointer hover:shadow-md transition-all border ${isUrgent ? 'border-red-400' : ''}`}
                onClick={() => onViewDetails(lead)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Scale className="h-4 w-4 text-lawfirm-primary flex-shrink-0" />
                      <span className="font-semibold text-sm truncate">{area}</span>
                    </div>
                    {isUrgent && (
                      <Badge variant="destructive" className="text-xs shrink-0 px-1.5 py-0">
                        <Zap className="h-3 w-3 mr-0.5" />
                        Urgente
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{province}</span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {summary || 'Lead disponible'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <Badge variant="outline" className={`text-xs font-bold ${getScoreColor(lead.score_final)}`}>
                      {lead.score_final} pts
                    </Badge>
                    <span className="text-sm font-bold text-lawfirm-primary flex items-center gap-0.5">
                      <Euro className="h-3 w-3" />
                      {lead.marketplace_price}€
                    </span>
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full gap-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); onViewDetails(lead); }}
                  >
                    <Eye className="h-3 w-3" />
                    Ver informe
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

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