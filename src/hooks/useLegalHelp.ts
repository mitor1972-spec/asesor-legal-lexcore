import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface LegalHelp {
  id: string;
  lead_id: string;
  lawfirm_id: string;
  generated_at: string;
  legal_orientation: string | null;
  documentation_needed: string | null;
  commercial_next_steps: string | null;
  legal_next_steps: string | null;
  risks_alerts: string | null;
  estimated_complexity: string | null;
}

export function useLegalHelp(leadId: string | undefined) {
  const { user } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['legal-help', leadId, lawfirmId],
    queryFn: async () => {
      if (!leadId || !lawfirmId) return null;

      const { data, error } = await supabase
        .from('lead_legal_help')
        .select('*')
        .eq('lead_id', leadId)
        .eq('lawfirm_id', lawfirmId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LegalHelp | null;
    },
    enabled: !!leadId && !!lawfirmId,
  });
}

export function useGenerateLegalHelp() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      if (!lawfirmId) throw new Error('No lawfirm ID found');

      const { data, error } = await supabase.functions.invoke('generate-legal-help', {
        body: { lead_id: leadId, lawfirm_id: lawfirmId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-help', variables.leadId, lawfirmId] });
    },
  });
}
