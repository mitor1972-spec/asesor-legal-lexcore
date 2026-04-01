import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

const TERMS_VERSION = 'v1';

export function useCommissionTerms() {
  const { user } = useAuthContext();
  const { isImpersonating, impersonatedLawfirm } = useImpersonation();
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;
  const queryClient = useQueryClient();

  const { data: acceptance, isLoading } = useQuery({
    queryKey: ['commission-terms', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return null;
      const { data, error } = await supabase
        .from('commission_terms_acceptance')
        .select('*')
        .eq('lawfirm_id', lawfirmId)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!lawfirmId,
  });

  const acceptTerms = useMutation({
    mutationFn: async () => {
      if (!lawfirmId || !user?.id) throw new Error('Missing lawfirm/user');
      const { error } = await supabase
        .from('commission_terms_acceptance')
        .upsert({
          lawfirm_id: lawfirmId,
          accepted_by_user_id: user.id,
          terms_version: TERMS_VERSION,
          ip_address: 'client',
        }, { onConflict: 'lawfirm_id,terms_version' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-terms'] });
    },
  });

  return {
    hasAcceptedTerms: !!acceptance,
    isLoading,
    acceptTerms,
    termsVersion: TERMS_VERSION,
  };
}
