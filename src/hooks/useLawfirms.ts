import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';


export interface Lawfirm {
  id: string;
  name: string;
  status: string | null;
  cif: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  website: string | null;
  logo_url: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  email_derivations: string | null;
  areas_accepted: string[] | null;
  provinces_accepted: string[] | null;
  min_lead_score: number | null;
  max_lead_price: number | null;
  monthly_capacity: number | null;
  exclusions: string[] | null;
  payment_model: string | null;
  initial_credit: number | null;
  discount_percent: number | null;
  commercial_notes: string | null;
  openai_api_key: string | null;
  is_active: boolean | null;
  created_at: string | null;
  settings_json: Json | null;
  marketplace_balance: number | null;
  marketplace_alerts_enabled: boolean | null;
  alert_frequency: string | null;
}

export function useLawfirms() {
  const { mode } = useDemoMode();
  
  return useQuery({
    queryKey: ['lawfirms', mode],
    queryFn: async () => {
      let query = supabase
        .from('lawfirms')
        .select('*')
        .order('name');

      // Apply demo mode filter
      if (mode === 'demo') {
        query = query.eq('is_demo', true);
      } else {
        query = query.or('is_demo.is.null,is_demo.eq.false');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lawfirm[];
    },
  });
}

export function useLawfirm(id: string | undefined) {
  return useQuery({
    queryKey: ['lawfirm', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('lawfirms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Lawfirm;
    },
    enabled: !!id,
  });
}

export function useCreateLawfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lawfirm: Partial<Lawfirm>) => {
      const insertData = {
        name: lawfirm.name || 'Nuevo Despacho',
        ...lawfirm,
        status: (lawfirm.status as 'active' | 'inactive') || 'active',
      };

      const { data, error } = await supabase
        .from('lawfirms')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Lawfirm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirms'] });
    },
  });
}

export function useUpdateLawfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lawfirm> & { id: string }) => {
      const updateData = {
        ...updates,
        status: updates.status as 'active' | 'inactive' | undefined,
      };

      const { error } = await supabase
        .from('lawfirms')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lawfirms'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm', id] });
    },
  });
}

export function useDeleteLawfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lawfirms')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirms'] });
    },
  });
}
