import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RawScore {
  score: number;
  max: number;
  breakdown: string;
}

export interface Penalty {
  name: string;
  value: number;
  reason: string;
}

export interface Adjustment {
  name: string;
  value: number;
  reason: string;
}

export interface VJ {
  value: number;
  reason: string;
}

export interface LexcoreRun {
  id: string;
  lead_id: string;
  config_id: string;
  computed_at: string;
  mode_used: 'A' | 'B';
  flags_json: {
    no_contactable?: boolean;
    urgency_applies?: boolean;
    patrimonial_cap_applies?: boolean;
    amount_present?: boolean;
  };
  raw_scores_json: {
    contactability: RawScore;
    intent: RawScore;
    urgency?: RawScore;
    case_quality: RawScore;
    evidence: RawScore;
    clarity: RawScore;
  };
  weighted_scores_json: Record<string, number>;
  penalties_json: Penalty[];
  adjustments_json: Adjustment[];
  vj_json: VJ;
  score_final: number;
  price_lexcore: number;
  price_after_caps: number | null;
  potential_internal: number | null;
  conclusion_text: string | null;
  audit_table_json: unknown;
  llm_response_json: unknown;
  executed_by: string | null;
  lexcore_configs?: {
    version_name: string;
  };
}

export function useLexcoreRuns(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lexcore-runs', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lexcore_runs')
        .select(`
          *,
          lexcore_configs (version_name)
        `)
        .eq('lead_id', leadId)
        .order('computed_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        flags_json: item.flags_json as unknown as LexcoreRun['flags_json'],
        raw_scores_json: item.raw_scores_json as unknown as LexcoreRun['raw_scores_json'],
        weighted_scores_json: item.weighted_scores_json as unknown as LexcoreRun['weighted_scores_json'],
        penalties_json: item.penalties_json as unknown as LexcoreRun['penalties_json'],
        adjustments_json: item.adjustments_json as unknown as LexcoreRun['adjustments_json'],
        vj_json: item.vj_json as unknown as LexcoreRun['vj_json'],
      })) as LexcoreRun[];
    },
    enabled: !!leadId,
  });
}

export function useExtractLeadData() {
  return useMutation({
    mutationFn: async (leadText: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-lead-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ lead_text: leadText }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error extracting data');
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error('Error extrayendo datos: ' + error.message);
    },
  });
}

export function useCalculateLexcore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      leadText, 
      structuredFields, 
      sourceChannel 
    }: { 
      leadId: string; 
      leadText: string; 
      structuredFields: Record<string, unknown>;
      sourceChannel: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-lexcore`,
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
            source_channel: sourceChannel,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error calculating score');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lexcore-runs', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      toast.success('Scoring Lexcore calculado');
    },
    onError: (error: Error) => {
      toast.error('Error calculando scoring: ' + error.message);
    },
  });
}
