import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApiSetting {
  id: string;
  key_name: string;
  key_value: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useApiSettings() {
  return useQuery({
    queryKey: ['api-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_settings')
        .select('*')
        .order('key_name');
      
      if (error) throw error;
      return data as ApiSetting[];
    },
  });
}

export function useApiSetting(keyName: string) {
  return useQuery({
    queryKey: ['api-settings', keyName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_settings')
        .select('*')
        .eq('key_name', keyName)
        .maybeSingle();
      
      if (error) throw error;
      return data as ApiSetting | null;
    },
  });
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keyName, keyValue }: { keyName: string; keyValue: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Check if key exists
      const { data: existing } = await supabase
        .from('api_settings')
        .select('id')
        .eq('key_name', keyName)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('api_settings')
          .update({ 
            key_value: keyValue, 
            is_active: true,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('api_settings')
          .insert({ 
            key_name: keyName, 
            key_value: keyValue, 
            is_active: true,
            created_by: user.id 
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-settings'] });
      toast.success('API Key guardada correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar la API Key: ' + error.message);
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyName: string) => {
      const { error } = await supabase
        .from('api_settings')
        .delete()
        .eq('key_name', keyName);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-settings'] });
      toast.success('API Key eliminada');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });
}
