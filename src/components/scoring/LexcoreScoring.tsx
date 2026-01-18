import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, FileJson, Sparkles } from 'lucide-react';
import { useLexcoreRuns, useCalculateLexcore, LexcoreRun } from '@/hooks/useLexcoreRuns';
import { Lead, StructuredFields } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LexcoreScoringProps {
  lead: Lead;
}

export function LexcoreScoring({ lead }: LexcoreScoringProps) {
  const { data: runs, isLoading } = useLexcoreRuns(lead.id);
  const calculateLexcore = useCalculateLexcore();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<LexcoreRun | null>(null);

  const latestRun = runs?.[0];

  const handleRecalculate = async () => {
    await calculateLexcore.mutateAsync({
      leadId: lead.id,
      leadText: lead.lead_text,
      structuredFields: lead.structured_fields as unknown as Record<string, unknown>,
      sourceChannel: lead.source_channel,
    });
  };

  const showJson = (run: LexcoreRun) => {
    setSelectedRun(run);
    setJsonDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!latestRun) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="font-medium">Sin scoring calculado</p>
              <p className="text-sm text-muted-foreground">
                Calcula el scoring Lexcore para este lead
              </p>
            </div>
            <Button 
              onClick={handleRecalculate} 
              disabled={calculateLexcore.isPending}
            >
              {calculateLexcore.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Calcular Lexcore
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scoreGroups = [
    { key: 'contactability', label: 'Contactabilidad' },
    { key: 'intent', label: 'Intención' },
    { key: 'urgency', label: 'Urgencia' },
    { key: 'case_quality', label: 'Caso' },
    { key: 'evidence', label: 'Evidencia' },
    { key: 'clarity', label: 'Claridad' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with main metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              LEXCORE™ SCORING
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Run #{runs?.length || 1}</span>
              <span>•</span>
              <span>Config: {latestRun.lexcore_configs?.version_name || 'N/A'}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculado: {format(new Date(latestRun.computed_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conclusion */}
          {latestRun.conclusion_text && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Conclusión</p>
              <p className="text-sm text-muted-foreground">{latestRun.conclusion_text}</p>
            </div>
          )}

          {/* Main metrics cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background border rounded-lg">
              <p className="text-3xl font-bold text-primary">{latestRun.score_final}</p>
              <p className="text-xs text-muted-foreground">/100</p>
              <p className="text-sm font-medium mt-1">SCORE</p>
            </div>
            <div className="text-center p-4 bg-background border rounded-lg">
              <p className="text-3xl font-bold text-green-600">{latestRun.price_lexcore}€</p>
              <p className="text-sm font-medium mt-1">PRECIO</p>
            </div>
            <div className="text-center p-4 bg-background border rounded-lg">
              <p className="text-3xl font-bold">
                {latestRun.vj_json?.value > 0 ? '+' : ''}{latestRun.vj_json?.value || 0}
              </p>
              <p className="text-sm font-medium mt-1">VJ</p>
            </div>
            <div className="text-center p-4 bg-background border rounded-lg">
              <Badge variant={latestRun.mode_used === 'A' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                {latestRun.mode_used}
              </Badge>
              <p className="text-sm font-medium mt-2">
                {latestRun.mode_used === 'A' ? '(urgencia)' : '(sin urgencia)'}
              </p>
            </div>
          </div>

          {/* Scoring table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Grupo</th>
                  <th className="text-center py-2 px-2 font-medium">Raw</th>
                  <th className="text-center py-2 px-2 font-medium">Peso</th>
                  <th className="text-center py-2 px-2 font-medium">Puntos</th>
                  <th className="text-left py-2 px-2 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {scoreGroups.map(({ key, label }) => {
                  const rawScore = latestRun.raw_scores_json?.[key as keyof typeof latestRun.raw_scores_json];
                  const weightedScore = latestRun.weighted_scores_json?.[key];
                  
                  if (!rawScore && key === 'urgency' && latestRun.mode_used === 'B') {
                    return null;
                  }
                  
                  return (
                    <tr key={key} className="border-b">
                      <td className="py-2 px-2">{label}</td>
                      <td className="text-center py-2 px-2">
                        {rawScore ? `${rawScore.score}/${rawScore.max}` : '-'}
                      </td>
                      <td className="text-center py-2 px-2">
                        {weightedScore !== undefined ? `${Math.round((weightedScore / latestRun.score_final) * 100) || 0}%` : '-'}
                      </td>
                      <td className="text-center py-2 px-2 font-mono">
                        {weightedScore?.toFixed(1) || '-'}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs max-w-[200px] truncate">
                        {rawScore?.breakdown || '-'}
                      </td>
                    </tr>
                  );
                })}
                
                {/* Penalties */}
                {latestRun.penalties_json?.length > 0 && latestRun.penalties_json.map((penalty, i) => (
                  <tr key={`penalty-${i}`} className="border-b bg-red-50 dark:bg-red-950/20">
                    <td className="py-2 px-2 text-red-600">Penalización</td>
                    <td className="text-center py-2 px-2">-</td>
                    <td className="text-center py-2 px-2">-</td>
                    <td className="text-center py-2 px-2 font-mono text-red-600">{penalty.value}</td>
                    <td className="py-2 px-2 text-xs text-red-600">{penalty.name}: {penalty.reason}</td>
                  </tr>
                ))}
                
                {/* Adjustments */}
                {latestRun.adjustments_json?.length > 0 && latestRun.adjustments_json.map((adj, i) => (
                  <tr key={`adj-${i}`} className="border-b bg-blue-50 dark:bg-blue-950/20">
                    <td className="py-2 px-2 text-blue-600">Ajuste</td>
                    <td className="text-center py-2 px-2">-</td>
                    <td className="text-center py-2 px-2">-</td>
                    <td className="text-center py-2 px-2 font-mono text-blue-600">
                      {adj.value > 0 ? '+' : ''}{adj.value}
                    </td>
                    <td className="py-2 px-2 text-xs text-blue-600">{adj.name}: {adj.reason}</td>
                  </tr>
                ))}

                {/* VJ */}
                {latestRun.vj_json && (
                  <tr className="border-b bg-purple-50 dark:bg-purple-950/20">
                    <td className="py-2 px-2 text-purple-600">VJ</td>
                    <td className="text-center py-2 px-2">-</td>
                    <td className="text-center py-2 px-2">-</td>
                    <td className="text-center py-2 px-2 font-mono text-purple-600">
                      {latestRun.vj_json.value > 0 ? '+' : ''}{latestRun.vj_json.value}
                    </td>
                    <td className="py-2 px-2 text-xs text-purple-600">{latestRun.vj_json.reason}</td>
                  </tr>
                )}

                {/* Final */}
                <tr className="font-medium bg-muted">
                  <td className="py-2 px-2">SCORE FINAL</td>
                  <td className="text-center py-2 px-2">-</td>
                  <td className="text-center py-2 px-2">-</td>
                  <td className="text-center py-2 px-2 font-mono">{latestRun.score_final}</td>
                  <td className="py-2 px-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRecalculate}
              disabled={calculateLexcore.isPending}
            >
              {calculateLexcore.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recalcular
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => showJson(latestRun)}
            >
              <FileJson className="h-4 w-4 mr-2" />
              Ver JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History - Always show if there are runs */}
      {runs && runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runs.map((run, index) => (
                <div 
                  key={run.id} 
                  className={`flex items-center justify-between py-3 px-4 rounded-lg border text-sm cursor-pointer transition-colors ${
                    index === 0 
                      ? 'bg-primary/5 border-primary/30 hover:bg-primary/10' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => showJson(run)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <div>
                      <span className="font-medium">
                        Run #{runs.length - index}
                        {index === 0 && <Badge variant="secondary" className="ml-2 text-xs">actual</Badge>}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(run.computed_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`font-semibold ${index === 0 ? 'text-primary' : ''}`}>
                      Score: {run.score_final}
                    </span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-green-600">{run.price_lexcore}€</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* JSON Dialog */}
      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Respuesta completa del LLM</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
              {JSON.stringify(selectedRun?.llm_response_json, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
