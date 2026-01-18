import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface LegalHelp {
  id: string;
  lead_id: string;
  lawfirm_id: string | null;
  generated_at: string;
  legal_orientation: string | null;
  documentation_needed: string | null;
  commercial_next_steps: string | null;
  legal_next_steps: string | null;
  risks_alerts: string | null;
  estimated_complexity: string | null;
}

export function useLegalHelp(leadId: string | undefined) {
  const { user, isInternal } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['legal-help', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      // For internal users (preview mode), get any legal help for this lead
      // For lawfirm users, filter by their lawfirm
      let query = supabase
        .from('lead_legal_help')
        .select('*')
        .eq('lead_id', leadId)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (!isInternal && lawfirmId) {
        query = query.eq('lawfirm_id', lawfirmId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as LegalHelp | null;
    },
    enabled: !!leadId,
  });
}

export function useGenerateLegalHelp() {
  const queryClient = useQueryClient();
  const { user, isInternal } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      // Internal users in preview may not belong to a lawfirm; store legal help with lawfirm_id = null
      if (!lawfirmId && !isInternal) throw new Error('No lawfirm ID found');

      const { data, error } = await supabase.functions.invoke('generate-legal-help', {
        body: { lead_id: leadId, lawfirm_id: lawfirmId ?? null },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-help', variables.leadId] });
    },
  });
}
