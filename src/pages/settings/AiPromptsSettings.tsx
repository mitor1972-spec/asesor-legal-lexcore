import { useMemo, useState } from 'react';
import { useAiPrompts, AiPrompt } from '@/hooks/useAiPrompts';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Bot, Sparkles, Gauge, LifeBuoy, BarChart3, ScrollText, Info } from 'lucide-react';
import { PromptCard } from '@/components/ai/PromptCard';
import { TestPromptDialog } from '@/components/ai/TestPromptDialog';
import { AiLogsTab } from '@/components/ai/AiLogsTab';

// =====================================================================
// Logical grouping for the UI. If a prompt_key is not listed here it
// will appear under "Otros" so nothing is ever hidden.
// =====================================================================
const GROUPS: Array<{
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt_keys: string[];
}> = [
  {
    key: 'leads',
    title: 'Leads',
    description: 'Extracción, ficha interna y resumen público de cada lead.',
    icon: <Sparkles className="h-4 w-4" />,
    prompt_keys: ['extract_lead', 'case_summary', 'marketplace_summary'],
  },
  {
    key: 'scoring',
    title: 'Scoring (Lexcore)',
    description: 'Cálculo y conclusión del scoring Lexcore.',
    icon: <Gauge className="h-4 w-4" />,
    prompt_keys: ['lexcore_scoring_system', 'lexcore_scoring_rules', 'scoring_conclusion'],
  },
  {
    key: 'support',
    title: 'Soporte al despacho',
    description: 'Ayuda legal y procesado de documentos para abogados.',
    icon: <LifeBuoy className="h-4 w-4" />,
    prompt_keys: ['legal_help', 'process_document'],
  },
  {
    key: 'commercial',
    title: 'Comercial / Marketing',
    description: 'Asistente comercial y auditoría SEO.',
    icon: <BarChart3 className="h-4 w-4" />,
    prompt_keys: ['commercial_assistant', 'seo_analyzer'],
  },
];

export default function AiPromptsSettings() {
  const { data: prompts, isLoading } = useAiPrompts();
  const [testPrompt, setTestPrompt] = useState<AiPrompt | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  const grouped = useMemo(() => {
    const byKey = new Map((prompts ?? []).map((p) => [p.prompt_key, p]));
    const placedKeys = new Set<string>();
    const groups = GROUPS.map((g) => {
      const items = g.prompt_keys
        .map((k) => byKey.get(k))
        .filter((p): p is AiPrompt => Boolean(p));
      items.forEach((i) => placedKeys.add(i.prompt_key));
      return { ...g, items };
    });
    const others = (prompts ?? []).filter((p) => !placedKeys.has(p.prompt_key));
    return { groups, others };
  }, [prompts]);

  const handleTest = (prompt: AiPrompt) => {
    setTestPrompt(prompt);
    setTestOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalActive = (prompts ?? []).filter((p) => p.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Centro de control IA
          </h1>
          <p className="text-muted-foreground">
            Único punto de gestión de todos los prompts del sistema. Edita, activa/desactiva y prueba sin tocar producción.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalActive}</span> prompts activos /
          <span className="font-semibold text-foreground">{prompts?.length ?? 0}</span> totales
        </div>
      </div>

      <Alert className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle>Single source of truth</AlertTitle>
        <AlertDescription className="text-sm">
          Toda la lógica IA del sistema se sirve desde la tabla <code>ai_prompts</code> a través
          del helper centralizado <code>_shared/ai-client.ts</code>. Cada ejecución (real o de
          prueba) se registra en <code>ai_logs</code>.{' '}
          <strong>La sección antigua &laquo;Configuración Lexcore&raquo; queda como legacy</strong>{' '}
          hasta que validemos la migración completa de las edge functions (Fase 6).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Prompts
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Logs de ejecución
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-8">
          {grouped.groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="p-1.5 rounded bg-primary/10 text-primary">{group.icon}</div>
                <div>
                  <h2 className="text-lg font-semibold">{group.title}</h2>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.items.length} prompt{group.items.length === 1 ? '' : 's'}
                </span>
              </div>

              {group.items.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Sin prompts en esta sección.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {group.items.map((p) => (
                    <PromptCard key={p.id} prompt={p} onTest={handleTest} />
                  ))}
                </div>
              )}
            </section>
          ))}

          {grouped.others.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <h2 className="text-lg font-semibold">Otros</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {grouped.others.length} prompt{grouped.others.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-3">
                {grouped.others.map((p) => (
                  <PromptCard key={p.id} prompt={p} onTest={handleTest} />
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <AiLogsTab availablePromptKeys={(prompts ?? []).map((p) => p.prompt_key)} />
        </TabsContent>
      </Tabs>

      <TestPromptDialog prompt={testPrompt} open={testOpen} onOpenChange={setTestOpen} />
    </div>
  );
}
