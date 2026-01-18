import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PriceStep {
  min_score: number;
  max_score: number;
  price: number;
}

export interface WeightsConfig {
  contactability: number;
  intent: number;
  urgency?: number;
  case_quality: number;
  evidence: number;
  clarity: number;
}

export interface PatrimonialCap {
  min_amount?: number;
  max_amount?: number;
  max_price: number;
}

export interface LexcoreConfigJson {
  version: string;
  min_price: number;
  max_price: number;
  price_steps: PriceStep[];
  weights_mode_a: WeightsConfig;
  weights_mode_b: WeightsConfig;
  patrimonial_caps: PatrimonialCap[];
  vj_allowed_values: number[];
  vj_max_price_step_change: number;
}

export interface LexcoreConfig {
  id: string;
  version_name: string;
  is_active: boolean;
  config_json: LexcoreConfigJson;
  created_by: string | null;
  created_at: string;
}

export function useLexcoreConfigs() {
  return useQuery({
    queryKey: ['lexcore-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lexcore_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        config_json: item.config_json as unknown as LexcoreConfigJson,
      })) as LexcoreConfig[];
    },
  });
}

export function useActiveConfig() {
  return useQuery({
    queryKey: ['lexcore-configs', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lexcore_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        config_json: data.config_json as unknown as LexcoreConfigJson,
      } as LexcoreConfig;
    },
  });
}

export function useActivateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('lexcore_configs')
        .update({ is_active: true })
        .eq('id', configId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lexcore-configs'] });
      toast.success('Configuración activada');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });
}

export function useUpdateConfigJson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ configId, configJson }: { configId: string; configJson: LexcoreConfigJson }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('lexcore_configs')
        .update({ config_json: configJson as any })
        .eq('id', configId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lexcore-configs'] });
      toast.success('Configuración guardada');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ versionName, configJson, activate }: { 
      versionName: string; 
      configJson: LexcoreConfigJson;
      activate?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('lexcore_configs')
        .insert([{ 
          version_name: versionName, 
          config_json: configJson as any,
          is_active: activate || false,
          created_by: user?.id 
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lexcore-configs'] });
      toast.success('Nueva versión creada');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });
}

export function useDuplicateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ config, newName }: { config: LexcoreConfig; newName: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('lexcore_configs')
        .insert([{ 
          version_name: newName, 
          config_json: config.config_json as any,
          is_active: false,
          created_by: user?.id 
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lexcore-configs'] });
      toast.success('Configuración duplicada');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });
}
