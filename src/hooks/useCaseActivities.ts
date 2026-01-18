import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface CaseActivity {
  id: string;
  lead_id: string;
  lawfirm_id: string;
  user_id: string | null;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'reminder';
  title: string;
  notes: string | null;
  call_duration_minutes: number | null;
  call_result: string | null;
  email_subject: string | null;
  email_direction: 'sent' | 'received' | null;
  task_completed: boolean | null;
  task_due_date: string | null;
  reminder_date: string | null;
  reminder_sent: boolean | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string | null;
  };
}

export function useCaseActivities(leadId: string | undefined) {
  const { user } = useAuthContext();
  const lawfirmId = user?.profile?.lawfirm_id;

  return useQuery({
    queryKey: ['case-activities', leadId, lawfirmId],
    queryFn: async () => {
      if (!leadId) return [];

      const query = supabase
        .from('case_activities')
        .select(`
          *,
          user:profiles!case_activities_user_id_fkey(full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (lawfirmId) {
        query.eq('lawfirm_id', lawfirmId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaseActivity[];
    },
    enabled: !!leadId,
  });
}

export function useCreateCaseActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (activity: Partial<CaseActivity> & { lead_id: string }) => {
      const lawfirmId = user?.profile?.lawfirm_id;
      if (!lawfirmId) throw new Error('No lawfirm ID');

      const insertData = {
        lead_id: activity.lead_id,
        lawfirm_id: lawfirmId,
        user_id: user?.id,
        activity_type: activity.activity_type || 'note',
        title: activity.title || 'Sin título',
        notes: activity.notes || null,
        call_duration_minutes: activity.call_duration_minutes || null,
        call_result: activity.call_result || null,
        email_subject: activity.email_subject || null,
        email_direction: activity.email_direction || null,
        task_completed: activity.task_completed || false,
        task_due_date: activity.task_due_date || null,
        reminder_date: activity.reminder_date || null,
        reminder_sent: activity.reminder_sent || false,
      };

      const { data, error } = await supabase
        .from('case_activities')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-activities', data.lead_id] });
    },
  });
}

export function useUpdateCaseActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leadId, ...updates }: Partial<CaseActivity> & { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('case_activities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['case-activities', leadId] });
    },
  });
}

export function useDeleteCaseActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('case_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['case-activities', leadId] });
    },
  });
}
