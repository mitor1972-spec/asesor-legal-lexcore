import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, RefreshCw } from 'lucide-react';

interface CaseSummaryViewProps {
  summary: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function CaseSummaryView({ summary, isGenerating, onGenerate }: CaseSummaryViewProps) {
  if (!summary && !isGenerating) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin resumen generado</h3>
          <p className="text-muted-foreground mb-4">
            El resumen estructurado del caso aún no ha sido generado.
          </p>
          <Button onClick={onGenerate} disabled={isGenerating}>
            <FileText className="mr-2 h-4 w-4" />
            Generar resumen con IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
          <h3 className="text-lg font-medium mb-2">Generando resumen...</h3>
          <p className="text-muted-foreground">
            Analizando la conversación y generando el resumen estructurado del caso.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse the summary to render with proper formatting
  const renderSummary = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Bold headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h3 key={index} className="font-bold text-base mt-4 mb-2 text-foreground">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
      }
      // Section headers with **
      if (line.includes('**') && line.includes(':')) {
        const parts = line.split('**');
        return (
          <p key={index} className="mb-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Dividers
      if (line.startsWith('---') || line.startsWith('___')) {
        return <hr key={index} className="my-3 border-border" />;
      }
      // Bullet points
      if (line.startsWith('•') || line.startsWith('-')) {
        return (
          <p key={index} className="ml-4 mb-1 text-sm">
            {line}
          </p>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // Regular text
      return (
        <p key={index} className="mb-1 text-sm">
          {line}
        </p>
      );
    });
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resumen Estructurado del Caso
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderSummary(summary!)}
        </div>
      </CardContent>
    </Card>
  );
}