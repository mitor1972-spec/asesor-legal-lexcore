import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Scale, MapPin, Zap, Phone, Target, 
  TrendingUp, MessageSquareQuote, ShoppingCart, AlertTriangle, 
  CheckCircle, ClipboardList, BookOpen, Euro, Calendar,
  FileText, Shield, Eye, Crosshair
} from 'lucide-react';
import type { MarketplaceLead } from '@/types/marketplace';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { redactContactFromText, isContactField, LEXCORE_SCORING_GROUPS } from '@/lib/contactSanitizer';

interface LeadDetailModalProps {
  lead: MarketplaceLead | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (lead: MarketplaceLead) => void;
  isInCart: boolean;
  canAfford: boolean;
}

const GROUP_ICONS: Record<string, typeof Phone> = {
  contactability: Phone,
  intent: Target,
  urgency: Zap,
  case_quality: FileText,
  evidence: Shield,
  clarity: Eye,
};

function cleanValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'N/A' || s === 'No consta' || s === 'No disponible' || s === 'Sin nombre') return null;
  return s;
}

export function LeadDetailModal({ lead, open, onClose, onAddToCart, isInCart, canAfford }: LeadDetailModalProps) {
  if (!lead) return null;

  const fields = lead.structured_fields || {};
  const legalArea = cleanValue(fields.legal_area || fields.area_legal) || 'Sin área';
  const subarea = cleanValue(fields.subarea);
  const province = cleanValue(fields.province || fields.provincia) || 'Sin provincia';
  const city = cleanValue(fields.city || fields.ciudad);
  const location = city ? `${province} (${city})` : province;
  const isUrgent = fields.urgencia_aplica === true;
  const chatwootAlias = fields._contact_alias as string || null;
  const conversationId = lead.conversation_id;
  const formattedDate = lead.created_at 
    ? format(new Date(lead.created_at), "dd MMM yyyy, HH:mm", { locale: es })
    : null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-500/10 border-green-500/30';
    if (score >= 40) return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
    return 'text-muted-foreground bg-muted border-border';
  };

  // Check if there's a lexcore run with real data
  const hasLexcoreRun = lead.raw_scores && Object.keys(lead.raw_scores).length > 0;

  const renderScoreBar = (group: typeof LEXCORE_SCORING_GROUPS[number]) => {
    const Icon = GROUP_ICONS[group.key] || Crosshair;
    const data = lead.raw_scores?.[group.key];
    const score = data?.score ?? 0;
    const max = data?.max ?? group.max;
    const percent = max > 0 ? (score / max) * 100 : 0;

    // For urgency, check if mode A (urgencia_aplica)
    if (group.key === 'urgency' && !isUrgent && (!data || data.score === 0)) {
      return (
        <div key={group.key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{group.label}</span>
            </div>
            <span className="text-xs text-muted-foreground italic">No aplica</span>
          </div>
        </div>
      );
    }
    
    return (
      <div key={group.key} className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{group.label}</span>
          </div>
          <span className="font-medium">{score}/{max}</span>
        </div>
        <Progress value={percent} className="h-2" />
        {data?.breakdown && (
          <p className="text-xs text-muted-foreground italic">{data.breakdown}</p>
        )}
      </div>
    );
  };

  // Redact contact info from summaries
  const redactedSummary = redactContactFromText(lead.case_summary || lead.marketplace_summary, fields);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6 text-lawfirm-primary" />
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {legalArea}
                  {subarea && <span className="text-base text-muted-foreground font-normal">· {subarea}</span>}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded" title={lead.id}>
                    Lead #{lead.id.slice(0, 8)}
                  </span>
                  {(chatwootAlias || conversationId) && (
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      CW: {chatwootAlias || `#${conversationId}`}
                    </span>
                  )}
                  <MapPin className="h-3 w-3" />
                  {location}
                  {formattedDate && (
                    <>
                      <span>•</span>
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </>
                  )}
                  {isUrgent && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
                        <Zap className="h-3 w-3" />
                        URGENTE
                      </Badge>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`text-2xl font-bold px-4 py-2 ${getScoreColor(lead.score_final)}`}
            >
              {lead.score_final}/100
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="space-y-6 py-4">
            {/* Contact Info Blocked Notice */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400">Datos de contacto ocultos</p>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    El nombre, teléfono y email del cliente se mostrarán tras la compra del lead
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Scoring Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-lawfirm-primary" />
                  Análisis LEXCORE™
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasLexcoreRun ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {LEXCORE_SCORING_GROUPS.map(group => renderScoreBar(group))}
                    
                    {lead.vj_value !== null && lead.vj_value !== undefined && (
                      <div className="md:col-span-2 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Viabilidad Jurídica (VJ)
                        </span>
                        <span className={`text-lg font-bold ${lead.vj_value > 0 ? 'text-green-600' : lead.vj_value < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {lead.vj_value > 0 ? '+' : ''}{lead.vj_value} puntos
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Scoring pendiente</p>
                )}
              </CardContent>
            </Card>

            {/* Case Summary (redacted) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-lawfirm-primary" />
                  Resumen del Caso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {redactedSummary || 'Sin resumen disponible'}
                  </p>
                </div>
                
                {lead.vj_key_phrases && lead.vj_key_phrases.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <MessageSquareQuote className="h-4 w-4" />
                      Frases clave identificadas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lead.vj_key_phrases.map((phrase, i) => (
                        <Badge key={i} variant="secondary">
                          "{phrase}"
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Structured Fields (without contact info) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-lawfirm-primary" />
                  Datos Extraídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(fields)
                    .filter(([key]) => !isContactField(key) && !['_contact_alias', '_incomplete', 'transcript_stats', 'pending_ai_validation'].includes(key) && !key.startsWith('_'))
                    .filter(([, value]) => {
                      const cleaned = cleanValue(value);
                      return cleaned !== null;
                    })
                    .map(([key, value]) => {
                      // Render objects properly
                      let displayValue: string;
                      if (typeof value === 'object' && value !== null) {
                        // Skip complex objects entirely in lawyer portal
                        return null;
                      } else if (typeof value === 'boolean') {
                        displayValue = value ? 'Sí' : 'No';
                      } else {
                        displayValue = String(value);
                      }
                      
                      return (
                        <div key={key} className="flex justify-between items-start p-2 bg-muted/30 rounded">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-sm font-medium text-right max-w-[60%]">
                            {displayValue}
                          </span>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                </div>
              </CardContent>
            </Card>

            {/* Legal Orientation Placeholder */}
            <Card className="border-lawfirm-primary/20 bg-lawfirm-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-lawfirm-primary" />
                  Orientación Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Legislación aplicable</p>
                    <p className="text-xs text-muted-foreground">
                      Se mostrará la legislación relevante tras la compra
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <ClipboardList className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Documentación necesaria</p>
                    <p className="text-xs text-muted-foreground">
                      Lista de documentos a solicitar al cliente
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Alertas y riesgos</p>
                    <p className="text-xs text-muted-foreground">
                      Puntos de atención identificados
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-lawfirm-primary" />
              <span className="text-2xl font-bold text-lawfirm-primary">
                {lead.marketplace_price?.toFixed(0) || '0'}€
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button 
                onClick={() => { onAddToCart(lead); onClose(); }}
                disabled={isInCart}
                className="gap-2 cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4" />
                {isInCart ? '✓ Ya en carrito' : 'Añadir al carrito'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}