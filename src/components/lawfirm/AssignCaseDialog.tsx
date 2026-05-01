import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLawfirmBranches, useLawfirmTeam } from '@/hooks/useLawfirmProfile';

interface AssignCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  currentBranchId: string | null;
  currentLawyerId: string | null;
}

export function AssignCaseDialog({
  open, onOpenChange, assignmentId, currentBranchId, currentLawyerId,
}: AssignCaseDialogProps) {
  const queryClient = useQueryClient();
  const { data: branches = [] } = useLawfirmBranches();
  const { data: team = [] } = useLawfirmTeam();

  const [branchId, setBranchId] = useState<string>(currentBranchId || 'none');
  const [lawyerId, setLawyerId] = useState<string>(currentLawyerId || 'none');

  useEffect(() => {
    if (open) {
      setBranchId(currentBranchId || 'none');
      setLawyerId(currentLawyerId || 'none');
    }
  }, [open, currentBranchId, currentLawyerId]);

  // Filter team members by selected branch (if any)
  const filteredTeam = branchId && branchId !== 'none'
    ? team.filter((m: any) => !m.branch_id || m.branch_id === branchId)
    : team;

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('lead_assignments')
        .update({
          branch_id: branchId === 'none' ? null : branchId,
          assigned_lawyer_id: lawyerId === 'none' ? null : lawyerId,
        })
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case'] });
      toast.success('Asignación actualizada');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al actualizar la asignación'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />Asignar caso
          </DialogTitle>
          <DialogDescription>
            Asigna este caso a una sucursal y a un abogado responsable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Sin sucursal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sucursal</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}{b.province ? ` — ${b.province}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Abogado responsable</Label>
            <Select value={lawyerId} onValueChange={setLawyerId}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {filteredTeam.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {branchId !== 'none' && filteredTeam.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay miembros vinculados a esta sucursal.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar asignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
