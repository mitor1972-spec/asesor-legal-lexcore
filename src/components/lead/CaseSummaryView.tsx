import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, RefreshCw } from 'lucide-react';

interface CaseSummaryViewProps {
  summary: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

// Phrases to filter out from the summary (only for display, not for email)
const PHRASES_TO_FILTER = [
  'Buenos días, Por medio del presente les compartimos ficha resumen de un \'posible\' cliente para su tratamiento.',
  'Buenos días, Por medio del presente les compartimos ficha resumen de un "posible" cliente para su tratamiento.',
  'Buenos días, Por medio del presente les compartimos ficha resumen',
  'Por medio del presente les compartimos',
  'Buenos días,',
];

// Values to hide when they are empty/undefined
const VALUES_TO_HIDE = [
  'Email: No consta',
  'Email: undefined',
  'Email: null',
  'Urgencia: undefined',
  'Urgencia: null',
  'undefined',
];

function filterSummaryPhrases(text: string): string {
  let filtered = text;
  for (const phrase of PHRASES_TO_FILTER) {
    filtered = filtered.replace(phrase, '').trim();
  }
  // Remove problematic values
  for (const value of VALUES_TO_HIDE) {
    filtered = filtered.replace(new RegExp(value, 'gi'), '').trim();
  }
  // Remove leading dashes or empty lines that might remain
  filtered = filtered.replace(/^[-–—\s]+/gm, '').trim();
  // Remove lines that are now empty or just whitespace
  filtered = filtered.split('\n').filter(line => line.trim() !== '').join('\n');
  return filtered;
}

export function CaseSummaryView({ summary, isGenerating, onGenerate }: CaseSummaryViewProps) {
  if (!summary && !isGenerating) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base font-medium mb-1">Sin resumen generado</h3>
          <p className="text-muted-foreground text-sm mb-3">
            El resumen estructurado del caso aún no ha sido generado.
          </p>
          <Button onClick={onGenerate} disabled={isGenerating} size="sm">
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
        <CardContent className="py-8 text-center">
          <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
          <h3 className="text-base font-medium mb-1">Generando resumen...</h3>
          <p className="text-muted-foreground text-sm">
            Analizando la conversación y generando el resumen estructurado del caso.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter the summary and parse for rendering
  const filteredSummary = filterSummaryPhrases(summary!);
  
  const renderSummary = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Bold headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h3 key={index} className="font-bold text-sm mt-2 mb-1 text-foreground">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
      }
      // Section headers with **
      if (line.includes('**') && line.includes(':')) {
        const parts = line.split('**');
        return (
          <p key={index} className="mb-0.5 text-sm">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Dividers
      if (line.startsWith('---') || line.startsWith('___')) {
        return <hr key={index} className="my-2 border-border" />;
      }
      // Bullet points
      if (line.startsWith('•') || line.startsWith('-')) {
        return (
          <p key={index} className="ml-3 mb-0.5 text-sm">
            {line}
          </p>
        );
      }
      // Empty lines - smaller gap
      if (line.trim() === '') {
        return <div key={index} className="h-1" />;
      }
      // Regular text
      return (
        <p key={index} className="mb-0.5 text-sm">
          {line}
        </p>
      );
    });
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Resumen Estructurado del Caso
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Regenerar
        </Button>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderSummary(filteredSummary)}
        </div>
      </CardContent>
    </Card>
  );
}
