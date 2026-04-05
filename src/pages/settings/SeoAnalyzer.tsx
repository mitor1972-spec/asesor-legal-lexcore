import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Search, Globe, Loader2, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Target, ArrowRight, Brain, Sparkles, Phone, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ── Types ── */
interface Finding { label: string; value: string; status: 'good' | 'warning' | 'error'; }
interface Section { title: string; icon: string; score: number; findings: Finding[]; }
interface Keyword { word: string; density: number; relevance: 'alta' | 'media' | 'baja'; }
interface KeyProblem { problem: string; why: string; impact: string; severity: 'critico' | 'importante' | 'mejorable'; }
interface Recommendation { action: string; reason: string; impact: 'alto' | 'medio' | 'bajo'; }
interface Subscore { score: number; label: string; }
interface AiReadiness { score: number; assessment: string; improvements: string[]; }
interface SeoAnalysis {
  score: number;
  level: string;
  summary: string;
  subscores: Record<string, Subscore>;
  keyProblems: KeyProblem[];
  recommendations: Recommendation[];
  aiReadiness: AiReadiness;
  sections: Section[];
  keywords: Keyword[];
  asesorLegalHelp: string;
  cta: string;
  raw?: string;
}

const SEO_ANALYZER_URL_KEY = 'seo-analyzer:url';
const SEO_ANALYZER_REPORT_KEY = 'seo-analyzer:report';
const SEO_ANALYZER_REPORT_URL_KEY = 'seo-analyzer:report-url';

/* ── Helpers ── */
function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 60) return 'text-amber-600 dark:text-amber-400';
  if (s >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function levelLabel(l: string) {
  const map: Record<string, { text: string; cls: string }> = {
    bien_trabajada: { text: '✅ Web bien trabajada', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    mejorable: { text: '⚠️ Web mejorable', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    deficiente: { text: '🔶 Web deficiente', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    critica: { text: '🔴 Web crítica', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  };
  return map[l] ?? map.mejorable;
}

function severityBadge(s: string) {
  if (s === 'critico') return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
  if (s === 'importante') return <Badge className="text-xs bg-amber-500 hover:bg-amber-600">Importante</Badge>;
  return <Badge variant="outline" className="text-xs">Mejorable</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'good') return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
}

function ImpactBadge({ impact }: { impact: string }) {
  if (impact === 'alto') return <Badge variant="destructive" className="text-xs">Alto impacto</Badge>;
  if (impact === 'medio') return <Badge variant="secondary" className="text-xs">Impacto medio</Badge>;
  return <Badge variant="outline" className="text-xs">Bajo impacto</Badge>;
}

function readStoredReport(): SeoAnalysis | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(SEO_ANALYZER_REPORT_KEY);
    return stored ? (JSON.parse(stored) as SeoAnalysis) : null;
  } catch {
    return null;
  }
}

/* ── Component ── */
export default function SeoAnalyzer() {
  const [url, setUrl] = useState(() => (typeof window === 'undefined' ? '' : window.localStorage.getItem(SEO_ANALYZER_URL_KEY) ?? ''));
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(() => readStoredReport());
  const [analyzedUrl, setAnalyzedUrl] = useState(() => (typeof window === 'undefined' ? '' : window.localStorage.getItem(SEO_ANALYZER_REPORT_URL_KEY) ?? ''));
  const { toast } = useToast();

  useEffect(() => {
    window.localStorage.setItem(SEO_ANALYZER_URL_KEY, url);
  }, [url]);

  useEffect(() => {
    if (!analysis) return;
    window.localStorage.setItem(SEO_ANALYZER_REPORT_KEY, JSON.stringify(analysis));
    window.localStorage.setItem(SEO_ANALYZER_REPORT_URL_KEY, analyzedUrl);
  }, [analysis, analyzedUrl]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-seo', { body: { url: url.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      setAnalyzedUrl(data.url);
      setUrl(data.url);
      toast({ title: 'Análisis completado', description: `Puntuación SEO: ${data.analysis.score}/100` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo analizar la URL', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const subscoreEntries = analysis?.subscores ? Object.entries(analysis.subscores) : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Verificación SEO para Despachos
        </h1>
        <p className="text-muted-foreground">Diagnóstico de visibilidad, captación y posicionamiento de la web de un despacho</p>
      </div>

      {/* URL Input */}
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
              {loading ? 'Analizando…' : 'Analizar'}
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground mt-3 animate-pulse">
              ⏳ Descargando y analizando la web con IA… esto puede tardar 30-60 segundos.
            </p>
          )}
          {!loading && (analysis || url) && (
            <p className="text-xs text-muted-foreground mt-3">
              Se guarda automáticamente la URL y el último informe para que no pierdas el trabajo.
            </p>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* ═══ 1. VALORACIÓN GENERAL ═══ */}
          <Card className="border-2 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center shrink-0">
                  <div className={`text-6xl font-bold font-display ${scoreColor(analysis.score)}`}>{analysis.score}</div>
                  <p className="text-xs text-muted-foreground mt-1">de 100</p>
                  <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${levelLabel(analysis.level).cls}`}>
                    {levelLabel(analysis.level).text}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">{analyzedUrl}</p>
                  <Progress value={analysis.score} className="h-3" />
                  <p className="text-base font-medium">{analysis.summary}</p>
                </div>
              </div>

              {/* Subscores */}
              {subscoreEntries.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                  {subscoreEntries.map(([key, sub]) => (
                    <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
                      <div className={`text-2xl font-bold ${scoreColor(sub.score)}`}>{sub.score}</div>
                      <p className="text-xs text-muted-foreground mt-1">{sub.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ 2. 5 PROBLEMAS CLAVE ═══ */}
          {analysis.keyProblems?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Problemas clave detectados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.keyProblems.map((p, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-destructive/10 text-destructive text-sm font-bold shrink-0">{i + 1}</span>
                        <p className="font-medium text-sm">{p.problem}</p>
                      </div>
                      {severityBadge(p.severity)}
                    </div>
                    <div className="ml-10 space-y-1 text-sm text-muted-foreground">
                      <p>📌 <strong>¿Por qué?</strong> {p.why}</p>
                      <p>📉 <strong>Efecto:</strong> {p.impact}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ═══ 3. RECOMENDACIONES ═══ */}
          {analysis.recommendations?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recomendaciones SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{r.action}</p>
                      <p className="text-xs text-muted-foreground">{r.reason}</p>
                    </div>
                    <ImpactBadge impact={r.impact} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ═══ 4. PREPARACIÓN PARA IA ═══ */}
          {analysis.aiReadiness && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Preparación para SEO con IA
                  </CardTitle>
                  <Badge variant="outline" className={scoreColor(analysis.aiReadiness.score)}>
                    {analysis.aiReadiness.score}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={analysis.aiReadiness.score} className="h-2" />
                <p className="text-sm">{analysis.aiReadiness.assessment}</p>
                {analysis.aiReadiness.improvements?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Qué mejorar:</p>
                    {analysis.aiReadiness.improvements.map((imp, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-3 w-3 mt-1 text-primary shrink-0" />
                        {imp}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══ SECCIONES DETALLADAS ═══ */}
          {analysis.sections?.length > 0 && (
            <>
              <Separator />
              <h2 className="text-lg font-display font-semibold">Detalle por áreas</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {analysis.sections.map((section, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span>{section.icon}</span> {section.title}
                        </CardTitle>
                        <Badge variant="outline" className={scoreColor(section.score)}>{section.score}/100</Badge>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* ═══ KEYWORDS ═══ */}
          {analysis.keywords?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Palabras clave detectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((kw, i) => (
                    <Badge key={i} variant={kw.relevance === 'alta' ? 'default' : kw.relevance === 'media' ? 'secondary' : 'outline'}>
                      {kw.word} ({kw.density}%)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ 5. ASESOR.LEGAL ═══ */}
          {(analysis.asesorLegalHelp || analysis.cta) && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-3">
                    <h3 className="font-display font-semibold text-lg">¿Cómo puede ayudarte Asesor.Legal?</h3>
                    {analysis.asesorLegalHelp && <p className="text-sm text-muted-foreground leading-relaxed">{analysis.asesorLegalHelp}</p>}
                    {analysis.cta && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
                        <Phone className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm font-medium">{analysis.cta}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
