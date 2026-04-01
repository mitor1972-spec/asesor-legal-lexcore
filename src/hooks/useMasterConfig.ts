import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Legal Areas ───
export function useMasterLegalAreas() {
  return useQuery({
    queryKey: ['master-legal-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_legal_areas')
        .select('*')
        .order('priority_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertLegalArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (area: {
      id?: string;
      name: string;
      area_type: string;
      is_active: boolean;
      visible_marketplace: boolean;
      priority_order: number;
      icon?: string | null;
    }) => {
      const { error } = await supabase
        .from('master_legal_areas')
        .upsert(area as any, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-legal-areas'] });
      toast.success('Área legal guardada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Specialties ───
export function useMasterSpecialties() {
  return useQuery({
    queryKey: ['master-specialties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_specialties')
        .select('*, master_specialty_areas(area_id)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      specialty,
      areaIds,
    }: {
      specialty: {
        id?: string;
        name: string;
        is_active: boolean;
        is_commercial_vertical: boolean;
        is_star: boolean;
        direct_purchase_allowed: boolean;
        commission_allowed: boolean;
        default_commission_percent: number | null;
        suggested_fixed_price: number | null;
        visible_marketplace?: boolean;
        allows_override?: boolean;
        sort_order?: number;
      };
      areaIds: string[];
    }) => {
      // Upsert specialty
      const { data, error } = await supabase
        .from('master_specialties')
        .upsert(specialty as any, { onConflict: 'id' })
        .select('id')
        .single();
      if (error) throw error;
      const specId = data.id;

      // Replace area associations
      await supabase
        .from('master_specialty_areas')
        .delete()
        .eq('specialty_id', specId);

      if (areaIds.length > 0) {
        const { error: linkErr } = await supabase
          .from('master_specialty_areas')
          .insert(areaIds.map((aid) => ({ specialty_id: specId, area_id: aid })) as any);
        if (linkErr) throw linkErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-specialties'] });
      toast.success('Especialidad guardada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Global Rules ───
export function useMasterGlobalRules() {
  return useQuery({
    queryKey: ['master-global-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_global_rules')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateGlobalRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rules: {
      id: string;
      default_commission_percent: number;
      min_sellable_score: number;
      min_sellable_price: number;
      allowed_models: string[];
    }) => {
      const { error } = await supabase
        .from('master_global_rules')
        .update(rules as any)
        .eq('id', rules.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-global-rules'] });
      toast.success('Reglas globales actualizadas');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Case Statuses ───
export function useMasterCaseStatuses() {
  return useQuery({
    queryKey: ['master-case-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_case_statuses')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: {
      id?: string;
      name: string;
      color: string;
      is_active: boolean;
      is_final: boolean;
      sort_order: number;
    }) => {
      const { error } = await supabase
        .from('master_case_statuses')
        .upsert(status as any, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-case-statuses'] });
      toast.success('Estado guardado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Active Provinces ───
export function useMasterActiveProvinces() {
  return useQuery({
    queryKey: ['master-active-provinces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_active_provinces')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertActiveProvince() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (province: { id?: string; name: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('master_active_provinces')
        .upsert(province as any, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-active-provinces'] });
      toast.success('Provincia guardada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useBulkInsertProvinces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]) => {
      const rows = names.map((name) => ({ name, is_active: true }));
      const { error } = await supabase
        .from('master_active_provinces')
        .upsert(rows as any, { onConflict: 'name' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-active-provinces'] });
      toast.success('Provincias importadas');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Lawfirm Commissions ───
export function useMasterLawfirmCommissions() {
  return useQuery({
    queryKey: ['master-lawfirm-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_lawfirm_commissions')
        .select('*, lawfirms(name), master_specialties(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertLawfirmCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commission: {
      id?: string;
      lawfirm_id: string;
      specialty_id: string;
      commission_percent: number;
      is_active: boolean;
      start_date: string;
      end_date?: string | null;
    }) => {
      const { error } = await supabase
        .from('master_lawfirm_commissions')
        .upsert(commission as any, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-lawfirm-commissions'] });
      toast.success('Comisión guardada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
