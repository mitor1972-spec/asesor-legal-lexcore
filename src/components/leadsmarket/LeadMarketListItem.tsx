import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeadReference } from '@/components/common/LeadReference';
import { 
  Scale, MapPin, Zap, ShoppingCart, Eye, Euro
} from 'lucide-react';
import type { MarketplaceLead } from '@/types/marketplace';

interface LeadMarketListItemProps {
  lead: MarketplaceLead;
  onAddToCart: (lead: MarketplaceLead) => void;
  onViewDetails: (lead: MarketplaceLead) => void;
  isInCart: boolean;
  canAfford: boolean;
}

export function LeadMarketListItem({ lead, onAddToCart, onViewDetails, isInCart, canAfford }: LeadMarketListItemProps) {
  const fields = lead.structured_fields || {};
  const legalArea = fields.legal_area || fields.area_legal || 'Sin área';
  const province = fields.province || fields.provincia || 'Sin provincia';
  const city = fields.city || fields.ciudad;
  const location = city ? `${province} (${city})` : province;
  const isUrgent = fields.urgencia_aplica === true;
  const cuantia = fields.cuantia_aproximada;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-500/10 border-green-500/30';
    if (score >= 40) return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
    return 'text-muted-foreground bg-muted border-border';
  };

  const getScoreBarColor = (score: number) => {
    if (score <= 30) return 'bg-red-500';
    if (score <= 50) return 'bg-orange-500';
    if (score <= 70) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Score thermometer */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative w-2 h-12 bg-muted rounded-full overflow-hidden">
              <div 
                className={`absolute bottom-0 left-0 w-full rounded-full transition-all ${getScoreBarColor(lead.score_final)}`}
                style={{ height: `${Math.min(Math.max(lead.score_final, 0), 100)}%` }}
              />
            </div>
            <Badge 
              variant="outline" 
              className={`text-sm font-bold px-2 py-0.5 ${getScoreColor(lead.score_final)}`}
            >
              {lead.score_final}
            </Badge>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Scale className="h-4 w-4 text-lawfirm-primary shrink-0" />
              <span className="font-semibold truncate">{legalArea}</span>
              {isUrgent && (
                <Badge variant="destructive" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Urgente
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
              <span>{lead.source_channel || 'Web chat'}</span>
              {cuantia && (
                <span className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  ~{cuantia}
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {lead.marketplace_summary || lead.case_summary?.substring(0, 150) || 'Lead disponible para compra'}
            </p>

            <LeadReference 
              leadId={lead.id}
              conversationId={lead.conversation_id}
              chatwootAlias={fields._contact_alias}
              variant="compact"
            />
          </div>

          {/* Price & Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-2xl font-bold text-lawfirm-primary">
              {lead.marketplace_price?.toFixed(0) || '0'}€
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(lead)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => onAddToCart(lead)}
                disabled={!canAfford || isInCart}
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                {isInCart ? 'En carrito' : 'Añadir'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
