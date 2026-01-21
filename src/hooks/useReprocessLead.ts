import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReprocessResult {
  lead_id: string;
  success: boolean;
  extracted_data?: Record<string, unknown>;
  error?: string;
  changes_made: string[];
}

interface ReprocessResponse {
  success: boolean;
  processed: number;
  successful: number;
  results: ReprocessResult[];
}

export function useReprocessLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string): Promise<ReprocessResult> => {
      const { data, error } = await supabase.functions.invoke<ReprocessResponse>('reprocess-lead', {
        body: { lead_id: leadId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.results?.[0]?.error || 'Reprocess failed');

      return data.results[0];
    },
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
}

export function useReprocessLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]): Promise<ReprocessResponse> => {
      const { data, error } = await supabase.functions.invoke<ReprocessResponse>('reprocess-lead', {
        body: { lead_ids: leadIds },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Batch reprocess failed');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
}
