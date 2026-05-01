import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';

interface Props { leadId: string; }

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
};
const PRIORITY_LABELS: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };

export function CaseTasksTab({ leadId }: Props) {
  const qc = useQueryClient();
  const { data: profile } = useLawfirmProfile();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'medium' });

  const { data, isLoading } = useQuery({
    queryKey: ['case-tasks', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_tasks' as any).select('*').eq('lead_id', leadId)
        .order('status').order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!leadId,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('El título es obligatorio');
      const { error } = await supabase.from('case_tasks' as any).insert({
        lead_id: leadId,
        lawfirm_id: profile?.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarea creada');
      setForm({ title: '', description: '', due_date: '', priority: 'medium' });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['case-tasks', leadId] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al crear tarea'),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('case_tasks' as any).update({
        status: completed ? 'completed' : 'pending',
        completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-tasks', leadId] }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <Card className="shadow-soft">
        <CardHeader className="py-2 px-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4" />Tareas del caso</CardTitle>
          {!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5 mr-1" />Nueva tarea</Button>}
        </CardHeader>
        <CardContent className="space-y-2 py-2 px-3">
          {creating && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <Input placeholder="Título de la tarea *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Descripción (opcional)" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="flex gap-2">
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="flex-1" />
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => createTask.mutate()} disabled={createTask.isPending}>
                  {createTask.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Crear
                </Button>
              </div>
            </div>
          )}

          {!data?.length && !creating && (
            <p className="text-sm text-muted-foreground text-center py-6">Aún no hay tareas. Crea la primera para organizar el trabajo del caso.</p>
          )}

          {data?.map(task => (
            <div key={task.id} className={`flex items-start gap-2 p-2 border rounded-lg ${task.status === 'completed' ? 'opacity-60' : ''}`}>
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={c => toggleTask.mutate({ id: task.id, completed: !!c })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</Badge>
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Vence: {format(new Date(task.due_date), "dd MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
