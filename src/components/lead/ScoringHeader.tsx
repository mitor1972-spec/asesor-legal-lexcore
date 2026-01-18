import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Scale, MessageSquare, Lock, Inbox, Euro } from 'lucide-react';
import type { LexcoreRun } from '@/hooks/useLexcoreRuns';

interface ScoringHeaderProps {
  scoreFinal: number | null;
  priceFinal: number | null;
  latestRun?: LexcoreRun;
  sourceChannel?: string;
}

export function ScoringHeader({ scoreFinal, priceFinal, latestRun, sourceChannel }: ScoringHeaderProps) {
  if (scoreFinal === null) {
    return null;
  }

  const vj = latestRun?.vj_json;
  const vjScore = vj?.value ?? 0;
  const vjConclusion = vj?.reason || '';

  // Get adjustments
  const adjustments = latestRun?.adjustments_json || [];
  const accessAdjustment = adjustments.find((a) => 
    a.name?.toLowerCase().includes('acceso') || a.name?.toLowerCase().includes('exclusiv')
  );
  const channelAdjustment = adjustments.find((a) => 
    a.name?.toLowerCase().includes('canal')
  );

  const nDespachos = 1; // Default, can be extracted from structured fields if available
  const accessPoints = accessAdjustment?.value || 0;
  const channelPoints = channelAdjustment?.value || 0;

  return (
    <Card className="shadow-soft border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle className="h-4 w-4 text-primary" />
          Valoración del lead - Lexcore™
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Score */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <CheckCircle className="h-3 w-3" />
              Score
            </div>
            <div className="text-xl font-bold text-primary">{scoreFinal}/100</div>
          </div>

          {/* VJ */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Scale className="h-3 w-3" />
              VJ (Viabilidad)
            </div>
            <div className="text-xl font-bold">
              <span className={vjScore > 0 ? 'text-green-600' : vjScore < 0 ? 'text-red-600' : ''}>
                {vjScore > 0 ? '+' : ''}{vjScore}
              </span>
            </div>
          </div>

          {/* Access */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Lock className="h-3 w-3" />
              Acceso
            </div>
            <div className="text-sm font-medium">
              {nDespachos} despacho{nDespachos > 1 ? 's' : ''} 
              {nDespachos === 1 && <span className="text-primary text-xs ml-1">(exclusivo)</span>}
              {accessPoints !== 0 && (
                <Badge variant="outline" className="ml-1 text-xs py-0">
                  {accessPoints > 0 ? '+' : ''}{accessPoints}
                </Badge>
              )}
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Inbox className="h-3 w-3" />
              Canal
            </div>
            <div className="text-sm font-medium">
              {sourceChannel || ''}
              {channelPoints !== 0 && (
                <Badge variant="outline" className="ml-1 text-xs py-0">
                  {channelPoints > 0 ? '+' : ''}{channelPoints}
                </Badge>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Euro className="h-3 w-3" />
              Precio
            </div>
            <div className="text-xl font-bold text-green-600">{priceFinal}€</div>
          </div>
        </div>

        {/* VJ Conclusion - only if exists */}
        {vjConclusion && (
          <div className="pt-1 border-t">
            <div className="flex items-start gap-1.5">
              <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground italic">"{vjConclusion}"</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
