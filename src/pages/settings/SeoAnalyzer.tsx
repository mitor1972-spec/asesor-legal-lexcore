import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Search, Globe, Loader2, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FindingStatus = 'good' | 'warning' | 'error';

interface Finding {
  label: string;
  value: string;
  status: FindingStatus;
}

interface Section {
  title: string;
  score: number;
  icon: string;
  findings: Finding[];
  recommendations: string[];
}

interface Keyword {
  word: string;
  density: number;
  relevance: 'alta' | 'media' | 'baja';
}

interface TopAction {
  priority: number;
  action: string;
  impact: 'alto' | 'medio' | 'bajo';
}

interface SeoAnalysis {
  score: number;
  sections: Section[];
  keywords: Keyword[];
  topActions: TopAction[];
  summary: string;
  raw?: string;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function StatusIcon({ status }: { status: FindingStatus }) {
  if (status === 'good') return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
}

function ImpactBadge({ impact }: { impact: string }) {
  const variant = impact === 'alto' ? 'destructive' : impact === 'medio' ? 'secondary' : 'outline';
  return <Badge variant={variant} className="text-xs">{impact}</Badge>;
}

export default function SeoAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState('');
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-seo', {
        body: { url: url.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalysis(data.analysis);
      setAnalyzedUrl(data.url);
      toast({ title: 'Análisis completado', description: `Puntuación SEO: ${data.analysis.score}/100` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo analizar la URL', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Verificación SEO
        </h1>
        <p className="text-muted-foreground">Analiza el posicionamiento SEO de la web de un despacho de abogados</p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://www.despacho-ejemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              {loading ? 'Analizando…' : 'Analizar SEO'}
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground mt-3 animate-pulse">
              ⏳ Descargando y analizando la web con IA… esto puede tardar 20-40 segundos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <>
          {/* Global Score */}
          <Card className="border-2" style={{ borderColor: analysis.score >= 80 ? 'hsl(var(--chart-2))' : analysis.score >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-5))' }}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center">
                  <div className={`text-6xl font-bold font-display ${scoreColor(analysis.score)}`}>
                    {analysis.score}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">/ 100</p>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-1">Puntuación SEO Global</h2>
                  <p className="text-sm text-muted-foreground mb-3">{analyzedUrl}</p>
                  <Progress value={analysis.score} className="h-3" />
                  {analysis.summary && (
                    <p className="text-sm text-muted-foreground mt-3">{analysis.summary}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Actions */}
          {analysis.topActions?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Acciones Prioritarias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.topActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {a.priority}
                    </span>
                    <p className="text-sm flex-1">{a.action}</p>
                    <ImpactBadge impact={a.impact} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          <div className="grid gap-4 lg:grid-cols-2">
            {analysis.sections?.map((section, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{section.icon}</span>
                      {section.title}
                    </CardTitle>
                    <Badge variant="outline" className={scoreColor(section.score)}>
                      {section.score}/100
                    </Badge>
                  </div>
                  <Progress value={section.score} className="h-1.5" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {section.findings?.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2 text-sm">
                      <StatusIcon status={f.status} />
                      <div>
                        <span className="font-medium">{f.label}:</span>{' '}
                        <span className="text-muted-foreground">{f.value}</span>
                      </div>
                    </div>
                  ))}
                  {section.recommendations?.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-1">
                        {section.recommendations.map((r, ri) => (
                          <div key={ri} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ArrowRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                            {r}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Keywords */}
          {analysis.keywords?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Palabras Clave Detectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant={kw.relevance === 'alta' ? 'default' : kw.relevance === 'media' ? 'secondary' : 'outline'}
                    >
                      {kw.word} ({kw.density}%)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
