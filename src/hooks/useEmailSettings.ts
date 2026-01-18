import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailSettings {
  id: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_security: string | null;
  smtp_user: string | null;
  smtp_password: string | null;
  sender_email: string | null;
  sender_name: string | null;
  is_configured: boolean | null;
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  body_html: string;
  variables: string[] | null;
  is_active: boolean | null;
}

export function useEmailSettings() {
  return useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EmailSettings | null;
    },
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<EmailSettings>) => {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('email_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('email_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_settings')
          .insert(settings);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_key');

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async ({
      to,
      template_key,
      variables,
      lead_id,
      lawfirm_id,
    }: {
      to: string;
      template_key: string;
      variables: Record<string, string>;
      lead_id?: string;
      lawfirm_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, template_key, variables, lead_id, lawfirm_id },
      });

      if (error) throw error;
      return data;
    },
  });
}
