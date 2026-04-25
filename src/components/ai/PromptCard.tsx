import { useState } from 'react';
import { AiPrompt, useUpdateAiPrompt } from '@/hooks/useAiPrompts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Save,
  Loader2,
  Play,
  ChevronDown,
  ChevronRight,
  Bot,
  Code2,
  Settings2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PROMPT_USAGE: Record<string, string> = {
  extract_lead: 'Edge function: extract-lead-data, reprocess-lead',
  case_summary: 'Edge function: generate-case-summary',
  marketplace_summary: 'Resumen público (sin PII) — pendiente de conexión',
  legal_help: 'Edge function: generate-legal-help',
  process_document: 'Edge function: process-document',
  commercial_assistant: 'Edge function: commercial-assistant',
  seo_analyzer: 'Edge function: analyze-seo',
  lexcore_scoring_system: 'Edge function: calculate-lexcore (sistema)',
  lexcore_scoring_rules: 'Edge function: calculate-lexcore (reglas)',
  scoring_conclusion: 'Edge function: calculate-lexcore (conclusión)',
};

interface PromptCardProps {
  prompt: AiPrompt;
  onTest: (prompt: AiPrompt) => void;
}

export function PromptCard({ prompt, onTest }: PromptCardProps) {
  const updateMutation = useUpdateAiPrompt();
  const [open, setOpen] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState(prompt.system_prompt ?? '');
  const [userTemplate, setUserTemplate] = useState(prompt.user_template ?? prompt.prompt_text ?? '');
  const [model, setModel] = useState(prompt.model);
  const [temperature, setTemperature] = useState(String(prompt.temperature));
  const [maxTokens, setMaxTokens] = useState(String(prompt.max_tokens));
  const [responseFormat, setResponseFormat] = useState(prompt.response_format);
  const [isActive, setIsActive] = useState(prompt.is_active);

  const isDirty =
    systemPrompt !== (prompt.system_prompt ?? '') ||
    userTemplate !== (prompt.user_template ?? prompt.prompt_text ?? '') ||
    model !== prompt.model ||
    Number(temperature) !== Number(prompt.temperature) ||
    Number(maxTokens) !== Number(prompt.max_tokens) ||
    responseFormat !== prompt.response_format ||
    isActive !== prompt.is_active;

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: prompt.id,
      system_prompt: systemPrompt,
      user_template: userTemplate,
      // Keep legacy prompt_text in sync (some old callers may still read it)
      prompt_text: userTemplate || prompt.prompt_text,
      model,
      temperature: Number(temperature),
      max_tokens: Number(maxTokens),
      response_format: responseFormat,
      is_active: isActive,
    });
  };

  const usage = PROMPT_USAGE[prompt.prompt_key] ?? 'Uso no documentado';

  return (
    <Card className={`shadow-soft ${!prompt.is_active ? 'opacity-70' : ''}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {prompt.prompt_name}
                  {!prompt.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Desactivado
                    </Badge>
                  )}
                  {isDirty && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs"
                    >
                      Sin guardar
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {prompt.description}
                </CardDescription>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {prompt.prompt_key}
                  </span>
                  <span>· {usage}</span>
                  <span>
                    · v{prompt.version} · {format(new Date(prompt.updated_at), "d MMM yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onTest(prompt);
                }}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Probar
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost">
                  {open ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {open ? 'Ocultar' : 'Editar'}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {/* Config row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-md bg-muted/50">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Settings2 className="h-3 w-3" /> Modelo
                </Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                    <SelectItem value="gpt-4.1-mini">gpt-4.1-mini</SelectItem>
                    <SelectItem value="gpt-4.1">gpt-4.1</SelectItem>
                    <SelectItem value="gpt-5-mini">gpt-5-mini</SelectItem>
                    <SelectItem value="gpt-5">gpt-5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Max tokens</Label>
                <Input
                  type="number"
                  step="100"
                  min="100"
                  max="16000"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Code2 className="h-3 w-3" /> Formato
                </Label>
                <Select value={responseFormat} onValueChange={setResponseFormat}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="json_object">json_object</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">System prompt</Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Rol e instrucciones generales para la IA..."
                className="min-h-[140px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Define el comportamiento base. Soporta placeholders <code>{'{{variable}}'}</code>.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">User template</Label>
              <Textarea
                value={userTemplate}
                onChange={(e) => setUserTemplate(e.target.value)}
                placeholder="Plantilla del mensaje del usuario..."
                className="min-h-[180px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Mensaje enviado por el usuario. Las variables se inyectan vía{' '}
                <code>{'{{variable}}'}</code>.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-sm">{isActive ? 'Activo' : 'Desactivado'}</Label>
              </div>

              <Button
                onClick={handleSave}
                disabled={!isDirty || updateMutation.isPending}
                className="gradient-brand"
                size="sm"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar cambios
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
