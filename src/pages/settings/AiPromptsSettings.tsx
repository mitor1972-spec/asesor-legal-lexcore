import { useState } from 'react';
import { useAiPrompts, useUpdateAiPrompt } from '@/hooks/useAiPrompts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Bot, Sparkles, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  'marketplace_summary': <Sparkles className="h-5 w-5" />,
  'scoring_conclusion': <Bot className="h-5 w-5" />,
};

const DEFAULT_PROMPTS: Record<string, string> = {
  'marketplace_summary': 'Un párrafo de 3-5 frases que describa de qué trata este caso legal de forma clara y atractiva para abogados. Debe explicar: el tipo de problema legal, la situación del cliente, qué busca conseguir y por qué es un caso interesante. NO incluir datos personales (nombre, teléfono, email). Redactar en tercera persona.',
  'scoring_conclusion': '2-4 líneas resumiendo el lead y el scoring',
};

export default function AiPromptsSettings() {
  const { data: prompts, isLoading } = useAiPrompts();
  const updatePrompt = useUpdateAiPrompt();
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setEditedPrompts(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (id: string) => {
    const newText = editedPrompts[id];
    if (newText !== undefined) {
      await updatePrompt.mutateAsync({ id, prompt_text: newText });
      setEditedPrompts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleReset = (id: string, key: string) => {
    const defaultText = DEFAULT_PROMPTS[key];
    if (defaultText) {
      setEditedPrompts(prev => ({ ...prev, [id]: defaultText }));
    }
  };

  const hasChanges = (id: string, originalText: string) => {
    return editedPrompts[id] !== undefined && editedPrompts[id] !== originalText;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Instrucciones IA
        </h1>
        <p className="text-muted-foreground">
          Configura las instrucciones que la IA utiliza para generar resúmenes y conclusiones
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">¿Cómo funcionan estas instrucciones?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Estas instrucciones se envían a la IA cada vez que se calcula el scoring de un lead.
                La IA las usa para generar los resúmenes y conclusiones. Si modificas las instrucciones,
                los nuevos leads usarán las nuevas instrucciones. Para actualizar leads existentes,
                usa el botón "Re-ejecutar Lexcore" en la página de Leads.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {prompts?.map((prompt) => {
          const currentText = editedPrompts[prompt.id] ?? prompt.prompt_text;
          const isModified = hasChanges(prompt.id, prompt.prompt_text);

          return (
            <Card key={prompt.id} className="shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {PROMPT_ICONS[prompt.prompt_key] || <Bot className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{prompt.prompt_name}</CardTitle>
                      <CardDescription>{prompt.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isModified && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        Sin guardar
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {prompt.prompt_key}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={currentText}
                  onChange={(e) => handleChange(prompt.id, e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                  placeholder="Escribe las instrucciones para la IA..."
                />
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Última actualización: {format(new Date(prompt.updated_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReset(prompt.id, prompt.prompt_key)}
                      disabled={updatePrompt.isPending}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar por defecto
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(prompt.id)}
                      disabled={!isModified || updatePrompt.isPending}
                      className="gradient-brand"
                    >
                      {updatePrompt.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
