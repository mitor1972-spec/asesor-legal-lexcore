import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AiPrompt {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_text: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAiPrompts() {
  return useQuery({
    queryKey: ['ai-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('prompt_key');
      
      if (error) throw error;
      return data as AiPrompt[];
    },
  });
}

export function useUpdateAiPrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, prompt_text }: { id: string; prompt_text: string }) => {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ prompt_text })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-prompts'] });
      toast.success('Instrucciones actualizadas');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar: ' + error.message);
    },
  });
}
