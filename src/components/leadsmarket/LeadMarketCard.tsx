import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Scale, MapPin, Zap, Phone, User, FileText, Gavel, Target, 
  TrendingUp, MessageSquareQuote, ShoppingCart, Eye, Euro
} from 'lucide-react';
import type { MarketplaceLead, RawScores } from '@/types/marketplace';

interface LeadMarketCardProps {
  lead: MarketplaceLead;
  onAddToCart: (lead: MarketplaceLead) => void;
  onViewDetails: (lead: MarketplaceLead) => void;
  isInCart: boolean;
  canAfford: boolean;
}

const SCORING_GROUPS = [
  { key: 'contactability', label: 'Contactabilidad', icon: Phone, maxDefault: 20, color: 'bg-blue-500' },
  { key: 'personal_data', label: 'Datos Personales', icon: User, maxDefault: 15, color: 'bg-purple-500' },
  { key: 'case_facts', label: 'Hechos del Caso', icon: FileText, maxDefault: 25, color: 'bg-green-500' },
  { key: 'legal_fit', label: 'Adecuación Legal', icon: Gavel, maxDefault: 20, color: 'bg-orange-500' },
  { key: 'intent', label: 'Intención', icon: Target, maxDefault: 10, color: 'bg-pink-500' },
];

export function LeadMarketCard({ lead, onAddToCart, onViewDetails, isInCart, canAfford }: LeadMarketCardProps) {
  const fields = lead.structured_fields || {};
  const legalArea = fields.legal_area || fields.area_legal || 'Sin área';
  const province = fields.province || fields.provincia || 'Sin provincia';
  const city = fields.city || fields.ciudad;
  const location = city ? `${province} (${city})` : province;
  const isUrgent = fields.urgencia_aplica === true;
  const cuantia = fields.cuantia_aproximada;
  const complejidad = fields.complejidad;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-500/10 border-green-500/30';
    if (score >= 40) return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
    return 'text-muted-foreground bg-muted border-border';
  };

  const renderScoreBar = (key: string) => {
    const group = SCORING_GROUPS.find(g => g.key === key);
    if (!group) return null;
    
    const data = lead.raw_scores?.[key];
    const score = data?.score ?? Math.floor(Math.random() * group.maxDefault);
    const max = data?.max ?? group.maxDefault;
    const percent = max > 0 ? (score / max) * 100 : 0;
    const Icon = group.icon;
    
    return (
      <div key={key} className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{group.label}</span>
          </div>
          <span className="font-medium">{score}/{max}</span>
        </div>
        <Progress value={percent} className="h-1.5" />
      </div>
    );
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-200 border-2 flex flex-col">
      {/* Header with Score */}
      <div className="flex items-center justify-between p-4 bg-muted/40 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Scale className="h-5 w-5 text-lawfirm-primary flex-shrink-0" />
          <span className="font-semibold text-base truncate">{legalArea}</span>
        </div>
        <Badge 
          variant="outline" 
          className={`text-lg font-bold px-3 py-1.5 flex-shrink-0 ${getScoreColor(lead.score_final)}`}
        >
          {lead.score_final}/100
        </Badge>
      </div>

      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-0 flex-1">
          {/* Left Column - Case Info */}
          <div className="p-4 border-r space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">📥</span>
                <span>{lead.source_channel || 'Web chat'}</span>
              </div>
              {isUrgent && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600 font-medium">URGENTE</span>
                </div>
              )}
              {cuantia && (
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span>~{cuantia}</span>
                </div>
              )}
              {complejidad && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📊</span>
                  <span>Complejidad: {complejidad}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                📝 Resumen:
              </p>
              <div className="bg-muted/30 p-3 rounded-lg border">
                <p className="text-sm leading-relaxed text-foreground">
                  {lead.marketplace_summary || 'Sin resumen disponible'}
                </p>
              </div>
            </div>

            {/* Key Phrases */}
            {lead.vj_key_phrases && lead.vj_key_phrases.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  💬 Frases clave:
                </p>
                <div className="flex flex-wrap gap-1">
                  {lead.vj_key_phrases.slice(0, 3).map((phrase, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {phrase}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Scoring */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-lawfirm-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Scoring LEXCORE™
                </span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-sm font-bold ${getScoreColor(lead.score_final)}`}
              >
                {lead.score_final}
              </Badge>
            </div>

            {/* Score Bars */}
            <div className="space-y-3">
              {SCORING_GROUPS.map(group => renderScoreBar(group.key))}
            </div>

            {/* VJ */}
            {lead.vj_value !== null && lead.vj_value !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Viabilidad (VJ)
                </span>
                <span className={`text-sm font-bold ${lead.vj_value > 0 ? 'text-green-600' : lead.vj_value < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {lead.vj_value > 0 ? '+' : ''}{lead.vj_value}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Price + Actions */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/20">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">PRECIO</span>
            <span className="text-2xl font-bold text-lawfirm-primary">
              {lead.marketplace_price?.toFixed(0) || '0'}€
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(lead)}
              className="gap-1"
            >
              <Eye className="h-4 w-4" />
              Ver informe
            </Button>
            <Button 
              onClick={() => onAddToCart(lead)}
              disabled={!canAfford || isInCart}
              size="sm"
              className="gap-1"
            >
              <ShoppingCart className="h-4 w-4" />
              {isInCart ? 'En carrito' : 'Añadir'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}