import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdateOperationalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const { error } = await supabase
        .from('lead_assignments')
        .update({ operational_status: status } as any)
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success('Estado operativo actualizado');
      qc.invalidateQueries({ queryKey: ['lawfirm-case', vars.assignmentId] });
      qc.invalidateQueries({ queryKey: ['lawfirm-cases'] });
    },
    onError: () => toast.error('No se pudo actualizar el estado operativo'),
  });
}
