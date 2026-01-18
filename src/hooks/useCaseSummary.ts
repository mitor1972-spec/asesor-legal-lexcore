import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateSummaryParams {
  leadId: string;
  leadText: string;
  structuredFields?: Record<string, unknown>;
  scoringData?: Record<string, unknown>;
  sourceChannel?: string;
}

export function useGenerateCaseSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      leadText,
      structuredFields,
      scoringData,
      sourceChannel,
    }: GenerateSummaryParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-case-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            lead_text: leadText,
            structured_fields: structuredFields,
            scoring_data: scoringData,
            source_channel: sourceChannel,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error generating case summary');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
    },
    onError: (error) => {
      console.error('Case summary generation error:', error);
      toast.error('Error al generar el resumen del caso');
    },
  });
}