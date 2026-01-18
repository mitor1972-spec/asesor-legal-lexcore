import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import type { Json } from '@/integrations/supabase/types';

export interface Lawfirm {
  id: string;
  name: string;
  status: string | null;
  email_derivations: string | null;
  created_at: string | null;
  cif: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  website: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  areas_accepted: string[] | null;
  provinces_accepted: string[] | null;
  min_lead_score: number | null;
  max_lead_price: number | null;
  monthly_capacity: number | null;
  exclusions: string[] | null;
  openai_api_key: string | null;
  settings_json: Json | null;
  marketplace_balance: number | null;
  marketplace_alerts_enabled: boolean | null;
  alert_frequency: string | null;
  is_active: boolean | null;
}

export function useLawfirmProfile() {
  const { user } = useAuthContext();
  const { impersonatedLawfirm, isImpersonating } = useImpersonation();
  
  // Use impersonated lawfirm ID if impersonating, otherwise use user's lawfirm ID
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['lawfirm-profile', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return null;

      // If impersonating, return the impersonated lawfirm directly
      if (isImpersonating && impersonatedLawfirm) {
        return impersonatedLawfirm as Lawfirm;
      }

      const { data, error } = await supabase
        .from('lawfirms')
        .select('*')
        .eq('id', lawfirmId)
        .single();

      if (error) throw error;
      return data as Lawfirm;
    },
    enabled: !!lawfirmId,
  });
}

export function useUpdateLawfirmProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!lawfirmId) throw new Error('No lawfirm ID');

      const { error } = await supabase
        .from('lawfirms')
        .update(updates as any)
        .eq('id', lawfirmId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-profile', lawfirmId] });
    },
  });
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
  role: string;
}

export function useLawfirmTeam() {
  const { user } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['lawfirm-team', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          is_active,
          created_at
        `)
        .eq('lawfirm_id', lawfirmId);

      if (error) throw error;

      // Fetch roles separately to avoid type issues
      const userIds = data.map(p => p.id);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

      return data.map(profile => ({
        ...profile,
        role: rolesMap.get(profile.id) || 'lawfirm_lawyer'
      })) as TeamMember[];
    },
    enabled: !!lawfirmId,
  });
}
