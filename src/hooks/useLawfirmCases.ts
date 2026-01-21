import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export interface LawfirmCase {
  id: string;
  lead_id: string;
  lawfirm_id: string;
  branch_id: string | null;
  assigned_at: string;
  firm_status: string;
  firm_notes: string | null;
  assigned_lawyer_id: string | null;
  contacted_at: string | null;
  result_amount: number | null;
  result_notes: string | null;
  service_type: string | null;
  lost_reason: string | null;
  // Economic fields (Phase 7C)
  lead_cost: number | null;
  client_fee: number | null;
  success_percentage: number | null;
  claimed_amount: number | null;
  fee_accepted_at: string | null;
  won_amount: number | null;
  won_percentage: number | null;
  lead: {
    id: string;
    lead_text: string;
    case_summary: string | null;
    score_final: number | null;
    price_final: number | null;
    source_channel: string | null;
    structured_fields: Record<string, unknown> | null;
    created_at: string;
    conversation_id: number | null;
  };
  assigned_lawyer?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export function useLawfirmCases() {
  const { user } = useAuthContext();
  const { impersonatedLawfirm, isImpersonating } = useImpersonation();
  
  // Use impersonated lawfirm ID if impersonating
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['lawfirm-cases', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return [];

      const { data, error } = await supabase
        .from('lead_assignments')
        .select(`
          *,
          lead:leads!lead_assignments_lead_id_fkey (
            id,
            lead_text,
            case_summary,
            score_final,
            price_final,
            source_channel,
            structured_fields,
            created_at,
            conversation_id
          ),
          assigned_lawyer:profiles!lead_assignments_assigned_lawyer_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('lawfirm_id', lawfirmId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as LawfirmCase[];
    },
    enabled: !!lawfirmId,
  });
}

export function useLawfirmCase(assignmentId: string | undefined) {
  const { user } = useAuthContext();
  const { impersonatedLawfirm, isImpersonating } = useImpersonation();
  
  // Use impersonated lawfirm ID if impersonating
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['lawfirm-case', assignmentId],
    queryFn: async () => {
      if (!assignmentId || !lawfirmId) return null;

      const { data, error } = await supabase
        .from('lead_assignments')
        .select(`
          *,
          lead:leads!lead_assignments_lead_id_fkey (
            id,
            lead_text,
            case_summary,
            score_final,
            price_final,
            source_channel,
            structured_fields,
            created_at,
            conversation_id
          ),
          assigned_lawyer:profiles!lead_assignments_assigned_lawyer_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', assignmentId)
        .eq('lawfirm_id', lawfirmId)
        .single();

      if (error) throw error;
      return data as unknown as LawfirmCase;
    },
    enabled: !!assignmentId && !!lawfirmId,
  });
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      firmStatus, 
      contactedAt 
    }: { 
      assignmentId: string; 
      firmStatus: string;
      contactedAt?: string;
    }) => {
      const updateData: Record<string, unknown> = { firm_status: firmStatus };
      if (contactedAt) {
        updateData.contacted_at = contactedAt;
      }

      const { error } = await supabase
        .from('lead_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case'] });
    },
  });
}

export function useUpdateCaseNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      firmNotes 
    }: { 
      assignmentId: string; 
      firmNotes: string;
    }) => {
      const { error } = await supabase
        .from('lead_assignments')
        .update({ firm_notes: firmNotes })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case'] });
    },
  });
}

export function useCloseCaseResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      firmStatus,
      resultAmount,
      resultNotes,
      serviceType,
      lostReason
    }: { 
      assignmentId: string; 
      firmStatus: 'won' | 'lost' | 'rejected';
      resultAmount?: number;
      resultNotes?: string;
      serviceType?: string;
      lostReason?: string;
    }) => {
      const updateData: Record<string, unknown> = { 
        firm_status: firmStatus,
        result_amount: resultAmount,
        result_notes: resultNotes
      };

      if (serviceType) {
        updateData.service_type = serviceType;
      }
      if (lostReason) {
        updateData.lost_reason = lostReason;
      }

      const { error } = await supabase
        .from('lead_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case'] });
    },
  });
}
