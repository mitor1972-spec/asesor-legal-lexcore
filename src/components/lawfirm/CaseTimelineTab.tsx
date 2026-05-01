import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { leadId: string; }

const EVENT_LABELS: Record<string, string> = {
  assigned: 'Caso recibido',
  contacted: 'Cliente contactado',
  docs_requested: 'Documentación solicitada',
  docs_received: 'Documentos recibidos',
  ai_analyzed: 'Análisis IA generado',
  engagement_generated: 'Hoja de encargo generada',
  engagement_signed: 'Hoja de encargo firmada',
  payment: 'Pago registrado',
  doc_generated: 'Documento jurídico generado',
  closed: 'Caso cerrado',
  custom: 'Evento',
};

export function CaseTimelineTab({ leadId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['case-timeline', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_timeline_events' as any)
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!leadId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!data?.length) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Aún no hay eventos en el timeline. Las acciones del caso (contactos, documentos, IA, cierre…) aparecerán aquí automáticamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Timeline del caso</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <div className="space-y-3 border-l-2 border-border pl-4">
          {data.map(ev => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
              <p className="font-medium text-sm">{ev.title || EVENT_LABELS[ev.event_type] || ev.event_type}</p>
              {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(ev.created_at), "dd MMM yyyy HH:mm", { locale: es })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
