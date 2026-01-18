import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Scale, MessageSquare, Lock, Inbox } from 'lucide-react';
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
  const vjConclusion = vj?.reason || 'Sin conclusión disponible';

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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-5 w-5 text-primary" />
          Valoración del lead - Lexcore™
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Score */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4" />
              Score
            </div>
            <div className="text-2xl font-bold text-primary">{scoreFinal}/100</div>
          </div>

          {/* VJ */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Scale className="h-4 w-4" />
              VJ (Viabilidad)
            </div>
            <div className="text-2xl font-bold">
              <span className={vjScore > 0 ? 'text-green-600' : vjScore < 0 ? 'text-red-600' : ''}>
                {vjScore > 0 ? '+' : ''}{vjScore}
              </span>
            </div>
          </div>

          {/* Access */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Lock className="h-4 w-4" />
              Acceso al lead
            </div>
            <div className="font-medium">
              {nDespachos} despacho{nDespachos > 1 ? 's' : ''} 
              {nDespachos === 1 && <span className="text-primary"> (exclusivo)</span>}
              {accessPoints !== 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {accessPoints > 0 ? '+' : ''}{accessPoints}
                </Badge>
              )}
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Inbox className="h-4 w-4" />
              Canal
            </div>
            <div className="font-medium">
              {sourceChannel || 'No especificado'}
              {channelPoints !== 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {channelPoints > 0 ? '+' : ''}{channelPoints}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* VJ Conclusion */}
        <div className="pt-2 border-t">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground italic">"{vjConclusion}"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}