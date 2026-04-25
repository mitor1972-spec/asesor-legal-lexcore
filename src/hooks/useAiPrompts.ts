import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AiPrompt {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_text: string;
  system_prompt: string | null;
  user_template: string | null;
  description: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  response_format: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiLog {
  id: string;
  prompt_key: string;
  prompt_version: number | null;
  function_name: string | null;
  lead_id: string | null;
  model: string | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  input: any;
  output: string | null;
  created_at: string;
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
      return data as unknown as AiPrompt[];
    },
  });
}

export type AiPromptUpdate = Partial<
  Pick<
    AiPrompt,
    | 'prompt_text'
    | 'system_prompt'
    | 'user_template'
    | 'model'
    | 'temperature'
    | 'max_tokens'
    | 'response_format'
    | 'is_active'
    | 'description'
  >
>;

export function useUpdateAiPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AiPromptUpdate) => {
      const { error } = await supabase
        .from('ai_prompts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-prompts'] });
      toast.success('Prompt actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar: ' + error.message);
    },
  });
}

export function useAiLogs(filters?: { prompt_key?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['ai-logs', filters],
    queryFn: async () => {
      let q = supabase.from('ai_logs').select('*').order('created_at', { ascending: false });
      if (filters?.prompt_key) q = q.eq('prompt_key', filters.prompt_key);
      if (filters?.status) q = q.eq('status', filters.status);
      q = q.limit(filters?.limit ?? 100);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AiLog[];
    },
  });
}

export interface TestPromptResult {
  ok: boolean;
  text?: string;
  parsed?: any;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  model?: string;
  prompt_version?: number;
  duration_ms?: number;
  error?: string;
  details?: any;
}

export function useTestAiPrompt() {
  return useMutation({
    mutationFn: async (payload: {
      prompt_key: string;
      variables: Record<string, unknown>;
      model_override?: string;
    }): Promise<TestPromptResult> => {
      const { data, error } = await supabase.functions.invoke('test-ai-prompt', {
        body: payload,
      });
      if (error) {
        return { ok: false, error: error.message };
      }
      return data as TestPromptResult;
    },
  });
}
