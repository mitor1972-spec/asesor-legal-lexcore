import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useCaseActivities, useCreateCaseActivity, useUpdateCaseActivity, useDeleteCaseActivity } from '@/hooks/useCaseActivities';
import { Phone, Mail, Calendar, FileText, Bell, Plus, Trash2, Check, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CaseTrackingTabProps {
  leadId: string;
}

const activityTypes = [
  { value: 'call', label: 'Llamada', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Reunión', icon: Calendar },
  { value: 'note', label: 'Nota', icon: FileText },
  { value: 'task', label: 'Tarea', icon: Check },
  { value: 'reminder', label: 'Recordatorio', icon: Bell },
];

const callResults = [
  { value: 'answered', label: 'Contestó' },
  { value: 'no_answer', label: 'No contestó' },
  { value: 'voicemail', label: 'Buzón de voz' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'scheduled', label: 'Cita programada' },
];

export function CaseTrackingTab({ leadId }: CaseTrackingTabProps) {
  const { data: activities, isLoading } = useCaseActivities(leadId);
  const createMutation = useCreateCaseActivity();
  const updateMutation = useUpdateCaseActivity();
  const deleteMutation = useDeleteCaseActivity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState<string>('call');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [callDuration, setCallDuration] = useState('');
  const [callResult, setCallResult] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailDirection, setEmailDirection] = useState<'sent' | 'received'>('sent');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setCallDuration('');
    setCallResult('');
    setEmailSubject('');
    setEmailDirection('sent');
    setTaskDueDate('');
    setReminderDate('');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    try {
      await createMutation.mutateAsync({
        lead_id: leadId,
        activity_type: activityType as any,
        title,
        notes: notes || null,
        call_duration_minutes: callDuration ? parseInt(callDuration) : null,
        call_result: callResult || null,
        email_subject: emailSubject || null,
        email_direction: activityType === 'email' ? emailDirection : null,
        task_due_date: taskDueDate || null,
        reminder_date: reminderDate || null,
      });
      toast.success('Actividad registrada');
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error('Error al registrar actividad');
    }
  };

  const handleToggleTask = async (activity: { id: string; task_completed: boolean | null }) => {
    try {
      await updateMutation.mutateAsync({
        id: activity.id,
        leadId,
        task_completed: !activity.task_completed,
      });
    } catch {
      toast.error('Error al actualizar tarea');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
      await deleteMutation.mutateAsync({ id, leadId });
      toast.success('Actividad eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const getActivityIcon = (type: string) => {
    const activity = activityTypes.find(a => a.value === type);
    return activity?.icon || FileText;
  };

  const pendingTasks = activities?.filter(a => a.activity_type === 'task' && !a.task_completed) || [];
  const upcomingReminders = activities?.filter(a => a.activity_type === 'reminder' && !a.reminder_sent && a.reminder_date && new Date(a.reminder_date) >= new Date()) || [];

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-soft">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Llamadas</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {activities?.filter(a => a.activity_type === 'call').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Emails</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {activities?.filter(a => a.activity_type === 'email').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tareas pendientes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Recordatorios</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upcomingReminders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Activity Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Historial de actividad</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva actividad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar actividad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Tipo de actividad</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Primera llamada de contacto"
                />
              </div>

              {activityType === 'call' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Duración (min)</Label>
                      <Input
                        type="number"
                        value={callDuration}
                        onChange={(e) => setCallDuration(e.target.value)}
                        placeholder="5"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Resultado</Label>
                      <Select value={callResult} onValueChange={setCallResult}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {callResults.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {activityType === 'email' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Asunto</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Asunto del email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Dirección</Label>
                    <Select value={emailDirection} onValueChange={(v) => setEmailDirection(v as 'sent' | 'received')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="received">Recibido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activityType === 'task' && (
                <div className="grid gap-2">
                  <Label>Fecha límite</Label>
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
              )}

              {activityType === 'reminder' && (
                <div className="grid gap-2">
                  <Label>Fecha del recordatorio</Label>
                  <Input
                    type="datetime-local"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activities List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities && activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            const isTask = activity.activity_type === 'task';
            
            return (
              <Card key={activity.id} className={cn(
                "shadow-soft",
                isTask && activity.task_completed && "opacity-60"
              )}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {isTask ? (
                      <Checkbox
                        checked={activity.task_completed || false}
                        onCheckedChange={() => handleToggleTask(activity)}
                        className="mt-1"
                      />
                    ) : (
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "font-medium text-sm",
                          isTask && activity.task_completed && "line-through"
                        )}>
                          {activity.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(activity.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {activity.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{activity.notes}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                        
                        {activity.activity_type === 'call' && activity.call_duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.call_duration_minutes} min
                          </span>
                        )}
                        
                        {activity.activity_type === 'call' && activity.call_result && (
                          <span>{callResults.find(r => r.value === activity.call_result)?.label}</span>
                        )}
                        
                        {activity.activity_type === 'email' && activity.email_direction && (
                          <span>{activity.email_direction === 'sent' ? 'Enviado' : 'Recibido'}</span>
                        )}
                        
                        {activity.activity_type === 'task' && activity.task_due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(activity.task_due_date), "dd/MM/yyyy", { locale: es })}
                          </span>
                        )}
                        
                        {activity.user?.full_name && (
                          <span>por {activity.user.full_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-soft">
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay actividades registradas</p>
            <p className="text-sm text-muted-foreground">Registra llamadas, emails y tareas de seguimiento</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
