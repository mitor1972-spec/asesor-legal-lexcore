import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, StructuredFields } from '@/types';
import type { LeadStatus, SourceChannel } from '@/lib/constants';
import type { Json } from '@/integrations/supabase/types';

interface LeadFilters {
  search?: string;
  status?: LeadStatus;
  channel?: SourceChannel;
  areaLegal?: string;
  dateFrom?: Date;
  dateTo?: Date;
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

export function useLeads(filters?: LeadFilters, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['leads', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters?.status) {
        query = query.eq('status_internal', filters.status);
      }

      if (filters?.channel) {
        query = query.eq('source_channel', filters.channel);
      }

      if (filters?.areaLegal) {
        query = query.contains('structured_fields', { area_legal: filters.areaLegal });
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      if (filters?.search) {
        query = query.or(
          `lead_text.ilike.%${filters.search}%,structured_fields->nombre.ilike.%${filters.search}%,structured_fields->apellidos.ilike.%${filters.search}%,structured_fields->email.ilike.%${filters.search}%,structured_fields->telefono.ilike.%${filters.search}%`
        );
      }

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

export function useLeadStats() {
  return useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalResult, pendingResult, derivedResult, todayResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .eq('status_internal', 'Pendiente'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .eq('status_internal', 'Derivado'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
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
