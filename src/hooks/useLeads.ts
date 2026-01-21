import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, StructuredFields } from '@/types';
import type { LeadStatus, SourceChannel } from '@/lib/constants';
import type { Json } from '@/integrations/supabase/types';
import { applyVisibleLeadsFilters } from '@/lib/leadsQuery';

interface LeadFilters {
  search?: string;
  status?: LeadStatus;
  channel?: SourceChannel;
  areaLegal?: string;
  dateFrom?: Date;
  dateTo?: Date;
  showArchived?: boolean;
  showInvalid?: boolean; // For admin debugging: show leads without contact
}

interface CreateLeadData {
  lead_text: string;
  source_channel: SourceChannel;
  structured_fields: StructuredFields;
}

interface UpdateLeadData extends Partial<CreateLeadData> {
  id: string;
  status_internal?: LeadStatus;
}

/**
 * Main hook for fetching leads with unified filtering.
 * Uses applyVisibleLeadsFilters to ensure consistency with Dashboard and LeadMarket.
 * 
 * GOLDEN RULE: Only leads with email OR phone are shown (unless showInvalid=true)
 */
export function useLeads(filters?: LeadFilters, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['leads', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply unified filters from leadsQuery.ts (GOLDEN RULE enforced here)
      query = applyVisibleLeadsFilters(query, {
        includeArchived: filters?.showArchived,
        includeInvalid: filters?.showInvalid,
        status: filters?.status,
        channel: filters?.channel,
        areaLegal: filters?.areaLegal,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        search: filters?.search,
      });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        leads: (data || []) as Lead[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!id,
  });
}

/**
 * Lead stats hook - uses unified filtering from leadsQuery.ts
 * 
 * GOLDEN RULE: Only counts leads with email OR phone (valid contact)
 */
export function useLeadStats() {
  return useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Apply GOLDEN RULE filter: must have email OR phone
      const validContactFilter = 'structured_fields->>email.neq.,structured_fields->>telefono.neq.';
      const incompleteFilter = 'structured_fields->_incomplete.is.null,structured_fields->_incomplete.eq.false';

      const [totalResult, pendingResult, derivedResult, todayResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .or(incompleteFilter)
          .or(validContactFilter),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .or(incompleteFilter)
          .or(validContactFilter)
          .eq('status_internal', 'Pendiente'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .or(incompleteFilter)
          .or(validContactFilter)
          .eq('status_internal', 'Enviado'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .or(incompleteFilter)
          .or(validContactFilter)
          .gte('created_at', today.toISOString()),
      ]);

      return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        derived: derivedResult.count || 0,
        today: todayResult.count || 0,
      };
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          lead_text: data.lead_text,
          source_channel: data.source_channel,
          structured_fields: data.structured_fields as unknown as Json,
          created_by_user_id: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add history entry
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        user_id: userData.user?.id,
        action: 'created',
        details: { source_channel: data.source_channel } as unknown as Json,
      });

      return lead as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateLeadData) => {
      const { id, ...updateData } = data;
      const { data: userData } = await supabase.auth.getUser();

      const dbUpdate: Record<string, unknown> = {};
      if (updateData.lead_text) dbUpdate.lead_text = updateData.lead_text;
      if (updateData.source_channel) dbUpdate.source_channel = updateData.source_channel;
      if (updateData.structured_fields) dbUpdate.structured_fields = updateData.structured_fields as unknown as Json;
      if (updateData.status_internal) dbUpdate.status_internal = updateData.status_internal;

      const { data: lead, error } = await supabase
        .from('leads')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add history entry
      await supabase.from('lead_history').insert({
        lead_id: id,
        user_id: userData.user?.id,
        action: 'updated',
        details: dbUpdate as unknown as Json,
      });

      return lead as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useArchiveLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('leads')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Add history entry
      await supabase.from('lead_history').insert({
        lead_id: id,
        user_id: userData.user?.id,
        action: 'archived',
        details: {},
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useLeadHistory(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-history', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('lead_history')
        .select('*, profiles:user_id(full_name, email)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });
}

export function useRestoreLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('leads')
        .update({ archived_at: null })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('lead_history').insert({
        lead_id: id,
        user_id: userData.user?.id,
        action: 'restored',
        details: {},
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete related records
      await supabase.from('lead_history').delete().eq('lead_id', id);
      await supabase.from('lead_attachments').delete().eq('lead_id', id);
      await supabase.from('lead_assignments').delete().eq('lead_id', id);
      await supabase.from('lexcore_runs').delete().eq('lead_id', id);
      await supabase.from('case_activities').delete().eq('lead_id', id);
      await supabase.from('lead_legal_help').delete().eq('lead_id', id);
      await supabase.from('lead_purchases').delete().eq('lead_id', id);
      await supabase.from('chatwoot_conversations').delete().eq('lead_id', id);

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}
