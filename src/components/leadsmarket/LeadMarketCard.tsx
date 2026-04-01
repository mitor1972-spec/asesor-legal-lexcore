import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Scale, MapPin, Zap, Phone, Target, ShoppingCart, Eye, Euro, Calendar,
  TrendingUp, FileText, Shield, Crosshair, Percent
} from 'lucide-react';
import type { MarketplaceLead } from '@/types/marketplace';
import { LeadReference } from '@/components/common/LeadReference';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { redactContactFromText, LEXCORE_SCORING_GROUPS } from '@/lib/contactSanitizer';

interface LeadMarketCardProps {
  lead: MarketplaceLead;
  onAddToCart: (lead: MarketplaceLead, isCommission?: boolean) => void;
  onViewDetails: (lead: MarketplaceLead) => void;
  isInCart: boolean;
  canAfford: boolean;
}

const GROUP_ICONS: Record<string, typeof Phone> = {
  contactability: Phone,
  intent: Target,
  urgency: Zap,
  case_quality: FileText,
  evidence: Shield,
  clarity: Crosshair,
};

function cleanValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'N/A' || s === 'No consta' || s === 'No disponible' || s === 'Sin nombre') return null;
  return s;
}

export function LeadMarketCard({ lead, onAddToCart, onViewDetails, isInCart, canAfford }: LeadMarketCardProps) {
  const fields = lead.structured_fields || {};
  const legalArea = cleanValue(fields.legal_area || fields.area_legal) || 'Sin área';
  const subarea = cleanValue(fields.subarea) || cleanValue(fields.tipo_caso);
  const province = cleanValue(fields.province || fields.provincia);
  const city = cleanValue(fields.city || fields.ciudad);
  const location = province 
    ? (city ? `${province} (${city})` : province)
    : (city || 'Sin ubicación');
  const isUrgent = fields.urgencia_aplica === true;
  const cuantia = cleanValue(fields.cuantia_aproximada);
  const complejidad = cleanValue(fields.complejidad);
  const hasLexcoreRun = lead.raw_scores && Object.keys(lead.raw_scores).length > 0;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-500/10 border-green-500/30';
    if (score >= 40) return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
    return 'text-muted-foreground bg-muted border-border';
  };

  const renderScoreBar = (group: typeof LEXCORE_SCORING_GROUPS[number]) => {
    const Icon = GROUP_ICONS[group.key] || Crosshair;
    const data = lead.raw_scores?.[group.key];
    const score = data?.score ?? 0;
    const max = data?.max ?? group.max;
    const percent = max > 0 ? (score / max) * 100 : 0;

    if (group.key === 'urgency' && !isUrgent && (!data || data.score === 0)) {
      return (
        <div key={group.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{group.label}</span>
            </div>
            <span className="text-xs text-muted-foreground italic">N/A</span>
          </div>
        </div>
      );
    }
    
    return (
      <div key={group.key} className="space-y-1">
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

  const formattedDate = lead.created_at 
    ? format(new Date(lead.created_at), "dd MMM yyyy, HH:mm", { locale: es })
    : null;

  const price = lead.marketplace_price || 0;
  const redactedSummary = redactContactFromText(lead.marketplace_summary, fields);

  return (
    <Card className={`overflow-hidden hover:shadow-xl transition-all duration-200 border-2 flex flex-col ${isUrgent ? 'border-red-500 shadow-red-500/20' : price >= 30 ? 'border-green-500/30 bg-green-500/[0.02]' : ''}`}>
      {/* Header with Score + Price */}
      <div className={`flex items-center justify-between p-4 border-b ${isUrgent ? 'bg-red-500/5' : 'bg-muted/40'}`}>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-lawfirm-primary flex-shrink-0" />
            <span className="font-semibold text-base truncate">{legalArea}</span>
          </div>
          {subarea && (
            <span className="text-sm text-muted-foreground ml-7 truncate">{subarea}</span>
          )}
          <LeadReference 
            leadId={lead.id}
            conversationId={lead.conversation_id}
            chatwootAlias={fields._contact_alias as string | undefined}
            variant="compact"
          />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`flex flex-col items-center rounded-lg px-3 py-1.5 border ${getScoreColor(lead.score_final)}`}>
            <span className="text-xs font-medium opacity-70">SCORING</span>
            <span className="text-xl font-bold">{lead.score_final}</span>
          </div>
          <div className="flex flex-col items-center bg-lawfirm-primary/10 border border-lawfirm-primary/30 rounded-lg px-3 py-1.5">
            <span className="text-xs text-lawfirm-primary/70 font-medium">PRECIO</span>
            <span className="text-xl font-bold text-lawfirm-primary">{price}€</span>
          </div>
        </div>
      </div>

      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-0">
          {/* Left Column - Case Info */}
          <div className="p-4 border-r space-y-2">
            <div className="space-y-2 text-sm">
              {subarea && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📋</span>
                  <span className="font-medium">{subarea}</span>
                </div>
              )}
              {city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{city}</span>
                </div>
              )}
              {province && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground ml-0.5">🗺️</span>
                  <span>{province}</span>
                </div>
              )}
              {!city && !province && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Sin ubicación</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{formattedDate}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">📥</span>
                <span>{lead.source_channel || 'Web chat'}</span>
              </div>
              {isUrgent && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 font-bold">⚠ URGENTE</span>
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
              {lead.commission_available && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                    Comisionable ({lead.commission_percent || 20}%)
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Scoring */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-lawfirm-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Scoring LEXCORE™
              </span>
            </div>
            {hasLexcoreRun ? (
              <div className="space-y-3">
                {LEXCORE_SCORING_GROUPS.map(group => renderScoreBar(group))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">Scoring pendiente</p>
            )}
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

        {/* Full-width Summary (redacted) */}
        <div className="px-4 pb-3 pt-2 border-t space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            📝 Resumen:
          </p>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-sm leading-relaxed text-foreground">
              {redactedSummary || 'Sin resumen disponible'}
            </p>
          </div>
          {lead.vj_key_phrases && lead.vj_key_phrases.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {lead.vj_key_phrases.slice(0, 3).map((phrase, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {phrase}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Actions - Two buttons for commission-eligible leads */}
        <div className="flex items-center justify-end p-4 border-t bg-muted/20 gap-2 mt-auto">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(lead)}
            className="gap-1 cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            Ver informe
          </Button>
          {lead.commission_available && !isInCart && (
            <Button 
              onClick={() => onAddToCart(lead, true)}
              size="sm"
              variant="outline"
              className="gap-1 cursor-pointer border-green-500/50 text-green-700 hover:bg-green-500/10 hover:text-green-800"
            >
              <Percent className="h-4 w-4" />
              Adquirir a comisión
            </Button>
          )}
          <Button 
            onClick={() => onAddToCart(lead, false)}
            disabled={isInCart}
            size="sm"
            className="gap-1 cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            {isInCart ? '✓ En carrito' : `Comprar ${price}€`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
