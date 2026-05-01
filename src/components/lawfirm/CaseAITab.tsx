import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Sparkles, Mail, FileText, Loader2, Copy, RefreshCw, AlertTriangle, Scale, FileSignature, Download } from 'lucide-react';
import { useLegalHelp, useGenerateLegalHelp } from '@/hooks/useLegalHelp';
import { useGenerateCaseSummary } from '@/hooks/useCaseSummary';
import { processAndSanitize } from '@/lib/sanitize';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface CaseAITabProps {
  leadId: string;
  leadText: string;
  structuredFields: Record<string, unknown> | null;
  sourceChannel?: string;
  caseSummary?: string | null;
}

const EMAIL_TYPES = [
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'documentacion', label: 'Solicitud documentación' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'avance', label: 'Comunicación de avance' },
];

const LEGAL_DOC_TYPES = [
  { value: 'engagement_letter', label: 'Hoja de encargo' },
  { value: 'burofax', label: 'Burofax' },
  { value: 'demanda', label: 'Demanda' },
  { value: 'escrito_admin', label: 'Escrito administración' },
  { value: 'email_cliente', label: 'Email al cliente' },
];

export function CaseAITab({ leadId, leadText, structuredFields, sourceChannel, caseSummary }: CaseAITabProps) {
  const queryClient = useQueryClient();
  const { data: legalHelp, isLoading: isLoadingHelp } = useLegalHelp(leadId);
  const generateLegalHelp = useGenerateLegalHelp();
  const generateSummary = useGenerateCaseSummary();

  const [emailType, setEmailType] = useState('presupuesto');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Deep analysis state
  const deepAnalysis = (structuredFields?.deep_analysis as string) || '';
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [localDeepAnalysis, setLocalDeepAnalysis] = useState<string>(deepAnalysis);

  // Legal doc generator
  const [docType, setDocType] = useState('engagement_letter');
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const handleGenerateSummary = async () => {
    try {
      await generateSummary.mutateAsync({
        leadId,
        leadText,
        structuredFields: structuredFields || undefined,
        sourceChannel,
      });
      toast.success('Resumen profesional generado');
    } catch {
      toast.error('Error al generar resumen');
    }
  };

  const handleGenerateLegalHelp = async () => {
    try {
      await generateLegalHelp.mutateAsync({ leadId });
      toast.success('Orientación legal generada');
    } catch {
      toast.error('Error al generar orientación legal');
    }
  };

  const handleGenerateEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const f = structuredFields || {};
      const clientName = (f.nombre as string) || 'Estimado/a cliente';
      const area = (f.area_legal as string) || 'su consulta';

      const typeLabels: Record<string, string> = {
        presupuesto: 'envío de presupuesto profesional',
        documentacion: 'solicitud de documentación necesaria',
        seguimiento: 'seguimiento del caso',
        avance: 'comunicación de avance procesal',
      };

      const prompt = `Genera un email profesional de un abogado español a su cliente "${clientName}" sobre "${area}". 
Tipo: ${typeLabels[emailType]}.
Contexto del caso: ${leadText.substring(0, 500)}
Tono formal pero cercano. En español. Solo el cuerpo del email, sin asunto. Máximo 200 palabras.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-legal-help`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            mode: 'email_draft',
            extra_context: prompt,
          }),
        }
      );

      if (!response.ok) {
        // Fallback: generate a template locally
        const templates: Record<string, string> = {
          presupuesto: `Estimado/a ${clientName},\n\nGracias por confiar en nuestro despacho para su caso de ${area}.\n\nTras analizar la información facilitada, le remitimos nuestra propuesta de honorarios profesionales:\n\n[Incluir desglose de honorarios]\n\nQuedamos a su disposición para resolver cualquier duda.\n\nUn cordial saludo,`,
          documentacion: `Estimado/a ${clientName},\n\nEn relación con su caso de ${area}, necesitamos que nos facilite la siguiente documentación:\n\n1. [Documento 1]\n2. [Documento 2]\n3. [Documento 3]\n\nPuede enviarla por email o entregarla en nuestras oficinas.\n\nUn cordial saludo,`,
          seguimiento: `Estimado/a ${clientName},\n\nNos ponemos en contacto con usted para informarle sobre el estado actual de su caso de ${area}.\n\n[Estado actual del caso]\n\nSi tiene alguna consulta, no dude en contactarnos.\n\nUn cordial saludo,`,
          avance: `Estimado/a ${clientName},\n\nLe comunicamos que se han producido avances en su caso de ${area}.\n\n[Describir avances]\n\nLos próximos pasos previstos son:\n\n[Próximos pasos]\n\nQuedamos a su disposición.\n\nUn cordial saludo,`,
        };
        setGeneratedEmail(templates[emailType] || templates.presupuesto);
        toast.success('Email borrador generado (plantilla)');
        return;
      }

      const data = await response.json();
      setGeneratedEmail(data.email_draft || data.legal_orientation || 'No se pudo generar el email.');
      toast.success('Email borrador generado con IA');
    } catch (error) {
      console.error('Error generating email:', error);
      // Use fallback template
      const f = structuredFields || {};
      const clientName = (f.nombre as string) || 'Estimado/a cliente';
      setGeneratedEmail(`Estimado/a ${clientName},\n\n[Escriba su mensaje aquí]\n\nUn cordial saludo,`);
      toast.success('Plantilla de email cargada');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleDeepAnalyze = async () => {
    setIsDeepAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-case-deep`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ lead_id: leadId }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en análisis');
      setLocalDeepAnalysis(data.analysis);
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['case-timeline', leadId] });
      toast.success('Análisis jurídico profundo generado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error en análisis profundo');
    } finally {
      setIsDeepAnalyzing(false);
    }
  };

  const handleGenerateDoc = async () => {
    setIsGeneratingDoc(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-legal-document`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ lead_id: leadId, document_type: docType }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error generando documento');
      setGeneratedDoc(data.document);
      queryClient.invalidateQueries({ queryKey: ['case-timeline', leadId] });
      toast.success('Borrador generado. Revisa antes de enviar.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error generando documento');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}-${leadId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
    navigator.clipboard.writeText(generatedEmail);
    toast.success('Email copiado al portapapeles');
  };

  const handleCopyLegalHelp = () => {
    if (!legalHelp) return;
    const text = [
      'ORIENTACIÓN LEGAL', legalHelp.legal_orientation,
      '\nDOCUMENTACIÓN', legalHelp.documentation_needed,
      '\nPRÓXIMOS PASOS COMERCIALES', legalHelp.commercial_next_steps,
      '\nPRÓXIMOS PASOS JURÍDICOS', legalHelp.legal_next_steps,
      '\nRIESGOS', legalHelp.risks_alerts,
      '\nCOMPLEJIDAD', legalHelp.estimated_complexity,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="space-y-4">
      {/* AI Summary Generation */}
      <Card className="shadow-soft">
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Resumen Profesional del Caso
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleGenerateSummary} disabled={generateSummary.isPending}>
            {generateSummary.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            {caseSummary ? 'Regenerar' : 'Generar'} resumen
          </Button>
        </CardHeader>
        <CardContent className="py-2 px-3">
          {caseSummary ? (
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm" 
              dangerouslySetInnerHTML={{ __html: processAndSanitize(caseSummary) }} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Genera un resumen estructurado: hechos, pretensión, riesgos y próximos pasos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Draft Generation */}
      <Card className="shadow-soft">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Generar Email Tipo al Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Tipo de email</Label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMAIL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={handleGenerateEmail} disabled={isGeneratingEmail}>
                {isGeneratingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Generar
              </Button>
            </div>
          </div>

          {generatedEmail && (
            <div className="space-y-2">
              <Textarea
                value={generatedEmail}
                onChange={e => setGeneratedEmail(e.target.value)}
                rows={8}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyEmail}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copiar
                </Button>
                <p className="text-xs text-muted-foreground self-center">Editable antes de enviar. No se envía automáticamente.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Help / Orientation */}
      <Card className="shadow-soft border-primary/20">
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Orientación Legal IA
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleGenerateLegalHelp} disabled={generateLegalHelp.isPending}>
              {generateLegalHelp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              {legalHelp ? 'Regenerar' : 'Generar'}
            </Button>
            {legalHelp && (
              <Button size="sm" variant="outline" onClick={handleCopyLegalHelp}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />Copiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-3">
          {isLoadingHelp ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : legalHelp ? (
            <div className="space-y-4">
              <Badge variant="secondary" className="text-xs">{legalHelp.estimated_complexity}</Badge>
              {[
                { title: '1) Orientación Legal', content: legalHelp.legal_orientation },
                { title: '2) Documentación', content: legalHelp.documentation_needed },
                { title: '3) Pasos Comerciales', content: legalHelp.commercial_next_steps },
                { title: '4) Pasos Jurídicos', content: legalHelp.legal_next_steps },
              ].map(section => (
                <section key={section.title}>
                  <h3 className="font-semibold text-xs mb-1">{section.title}</h3>
                  <div className="bg-muted/50 rounded-lg p-3 prose prose-sm max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: processAndSanitize(section.content || '') }} />
                  </div>
                </section>
              ))}
              <section>
                <h3 className="font-semibold text-xs mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />5) Riesgos
                </h3>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: processAndSanitize(legalHelp.risks_alerts || '') }} />
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Genera orientación legal con IA para este caso</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
