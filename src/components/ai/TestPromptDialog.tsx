import { useState } from 'react';
import { AiPrompt, useTestAiPrompt } from '@/hooks/useAiPrompts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TestPromptDialogProps {
  prompt: AiPrompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAMPLE_VARIABLES: Record<string, Record<string, unknown>> = {
  extract_lead: {
    lead_text:
      '— Hola, tuve un accidente de tráfico ayer en Madrid, el otro coche se saltó un STOP. Tengo lesiones cervicales y el coche siniestro total. Me llamo Juan Pérez, mi teléfono es 600123456.',
    areas_legales: 'Civil, Penal, Laboral, Tráfico, Familia, Mercantil',
  },
  case_summary: {
    lead_text: 'Cliente sufrió accidente de tráfico con lesiones cervicales en Madrid.',
    structured_fields: { area_legal: 'Tráfico', urgencia: 'alta' },
  },
  marketplace_summary: {
    lead_text: 'Accidente de tráfico con lesiones cervicales y daños materiales.',
    structured_fields: { area_legal: 'Tráfico', provincia: 'Madrid' },
  },
  legal_help: {
    lead_text: 'Despido improcedente tras 5 años en la empresa.',
    structured_fields: { area_legal: 'Laboral' },
  },
  process_document: {
    file_name: 'sentencia.pdf',
    file_type: 'application/pdf',
  },
  commercial_assistant: {
    user_message: 'Quiero captar más casos de derecho laboral en Barcelona.',
  },
  seo_analyzer: {
    url: 'https://ejemplo-despacho.com',
    html: '<html><head><title>Despacho</title></head><body><h1>Bienvenido</h1></body></html>',
  },
  lexcore_scoring_system: {
    lead_text: 'Accidente de tráfico con lesiones',
    structured_fields: { area_legal: 'Tráfico' },
  },
  lexcore_scoring_rules: {},
  scoring_conclusion: {
    score: 78,
    area_legal: 'Tráfico',
  },
};

export function TestPromptDialog({ prompt, open, onOpenChange }: TestPromptDialogProps) {
  const [variablesJson, setVariablesJson] = useState('{}');
  const [result, setResult] = useState<any>(null);
  const testMutation = useTestAiPrompt();

  // Reset when opening with a new prompt
  const handleOpenChange = (next: boolean) => {
    if (next && prompt) {
      const sample = SAMPLE_VARIABLES[prompt.prompt_key] ?? {};
      setVariablesJson(JSON.stringify(sample, null, 2));
      setResult(null);
    }
    onOpenChange(next);
  };

  const handleRun = async () => {
    if (!prompt) return;
    let variables: Record<string, unknown> = {};
    try {
      variables = JSON.parse(variablesJson || '{}');
    } catch {
      toast.error('JSON de variables inválido');
      return;
    }
    setResult(null);
    const res = await testMutation.mutateAsync({
      prompt_key: prompt.prompt_key,
      variables,
    });
    setResult(res);
    if (res.ok) {
      toast.success(`Ejecutado en ${res.duration_ms}ms`);
    } else {
      toast.error('Error en la ejecución');
    }
  };

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Probar prompt: {prompt.prompt_name}
          </DialogTitle>
          <DialogDescription>
            Ejecuta el prompt con datos de prueba. <strong>No afecta a leads ni a producción.</strong>{' '}
            La ejecución queda registrada en <code>ai_logs</code> con función{' '}
            <code>test-ai-prompt</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">key: {prompt.prompt_key}</Badge>
            <Badge variant="outline">modelo: {prompt.model}</Badge>
            <Badge variant="outline">temp: {prompt.temperature}</Badge>
            <Badge variant="outline">max_tokens: {prompt.max_tokens}</Badge>
            <Badge variant="outline">format: {prompt.response_format}</Badge>
            <Badge variant="outline">v{prompt.version}</Badge>
          </div>

          <div className="space-y-2">
            <Label>Variables (JSON)</Label>
            <Textarea
              value={variablesJson}
              onChange={(e) => setVariablesJson(e.target.value)}
              className="min-h-[180px] font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Estas variables se inyectan en los placeholders <code>{'{{variable}}'}</code> del
              system prompt y user template.
            </p>
          </div>

          <Button
            onClick={handleRun}
            disabled={testMutation.isPending}
            className="gradient-brand"
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Ejecutar prompt
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-3 pt-2 border-t">
              {result.ok ? (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium">Éxito</span> · {result.duration_ms}ms · modelo{' '}
                    {result.model} · tokens in/out:{' '}
                    {result.usage?.prompt_tokens ?? '–'}/{result.usage?.completion_tokens ?? '–'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">Error:</span> {result.error}
                  </AlertDescription>
                </Alert>
              )}

              {result.text && (
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Output (texto)
                  </Label>
                  <pre className="bg-muted rounded-md p-3 text-xs whitespace-pre-wrap max-h-72 overflow-auto">
                    {result.text}
                  </pre>
                </div>
              )}

              {result.parsed && (
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Parsed JSON
                  </Label>
                  <pre className="bg-muted rounded-md p-3 text-xs whitespace-pre-wrap max-h-72 overflow-auto">
                    {JSON.stringify(result.parsed, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
