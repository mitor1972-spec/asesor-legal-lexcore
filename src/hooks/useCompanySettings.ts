import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: string;
  logo_url: string | null;
  company_name: string | null;
  legal_name: string | null;
  cif: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  timezone: string | null;
  date_format: string | null;
  currency: string | null;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as CompanySettings | null;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CompanySettings>) => {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert(settings);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const filename = `logo-${Date.now()}.${file.name.split('.').pop()}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(uploadData.path);

      // Update company settings
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({ logo_url: urlData.publicUrl });
        if (error) throw error;
      }

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });
}
