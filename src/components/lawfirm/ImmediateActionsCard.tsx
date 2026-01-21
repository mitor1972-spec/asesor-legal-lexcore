import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Flame,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LawfirmCase } from '@/hooks/useLawfirmCases';

interface ImmediateActionsCardProps {
  cases: LawfirmCase[];
  onMarkCompleted?: (caseId: string) => void;
}

interface ActionItem {
  caseId: string;
  assignmentId: string;
  clientName: string;
  area: string;
  province: string;
  action: 'call' | 'email' | 'whatsapp';
  priority: number; // Higher = more urgent
  preferredTime?: string;
  urgencyLevel?: string;
  score: number;
}

export function ImmediateActionsCard({ cases, onMarkCompleted }: ImmediateActionsCardProps) {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  // Generate action items from pending cases
  const actionItems: ActionItem[] = cases
    .filter(c => ['received', 'reviewing'].includes(c.firm_status))
    .map(c => {
      const fields = c.lead?.structured_fields as Record<string, unknown> | null;
      const preference = fields?.preferencia_contacto as string;
      const urgency = fields?.urgencia_nivel as string;
      const urgencyApplies = fields?.urgencia_aplica as boolean;
      const score = c.lead?.score_final || 0;
      
      // Calculate priority based on urgency + score + clarity
      let priority = score;
      if (urgencyApplies || urgency) {
        priority += 30;
        if (urgency === 'Alta' || urgency === 'Muy Alta') priority += 20;
      }
      
      // Determine action type
      let action: 'call' | 'email' | 'whatsapp' = 'call';
      if (preference === 'Email') action = 'email';
      else if (preference === 'WhatsApp') action = 'whatsapp';
      
      return {
        caseId: c.lead_id,
        assignmentId: c.id,
        clientName: (fields?.nombre as string) || 'Cliente',
        area: (fields?.area_legal as string) || 'Legal',
        province: (fields?.provincia as string) || 'España',
        action,
        priority,
        preferredTime: fields?.franja_horaria as string,
        urgencyLevel: urgency,
        score
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  const handleToggleComplete = (assignmentId: string) => {
    setCompletedActions(prev => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
        onMarkCompleted?.(assignmentId);
      }
      return next;
    });
  };

  const ActionIcon = ({ action }: { action: ActionItem['action'] }) => {
    switch (action) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: ActionItem['action']) => {
    switch (action) {
      case 'call': return 'Llamar';
      case 'email': return 'Email';
      case 'whatsapp': return 'WhatsApp';
    }
  };

  if (actionItems.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-warning" />
            Acciones Inmediatas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
            <p className="text-muted-foreground">
              ¡Genial! No hay acciones pendientes
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-warning" />
          Acciones Inmediatas
          <Badge variant="secondary" className="ml-auto">
            {actionItems.filter(a => !completedActions.has(a.assignmentId)).length} pendientes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionItems.map((item, index) => {
          const isCompleted = completedActions.has(item.assignmentId);
          
          return (
            <div 
              key={item.assignmentId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isCompleted 
                  ? 'bg-muted/50 opacity-60' 
                  : index === 0 
                    ? 'bg-warning/5 border-warning/30' 
                    : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox 
                checked={isCompleted}
                onCheckedChange={() => handleToggleComplete(item.assignmentId)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
                    {item.clientName}
                  </span>
                  {item.urgencyLevel && (
                    <Badge variant="destructive" className="text-xs">
                      <Flame className="h-3 w-3 mr-1" />
                      {item.urgencyLevel}
                    </Badge>
                  )}
                  {index === 0 && !isCompleted && (
                    <Badge className="bg-warning text-warning-foreground text-xs">
                      Prioridad
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.area} • {item.province}
                  {item.preferredTime && ` • ${item.preferredTime}`}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Ref: {item.caseId.substring(0, 8)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  size="sm" 
                  variant={isCompleted ? 'ghost' : 'outline'}
                  disabled={isCompleted}
                >
                  <ActionIcon action={item.action} />
                  <span className="ml-1 hidden sm:inline">{getActionLabel(item.action)}</span>
                </Button>
                <Link to={`/despacho/casos/${item.assignmentId}`}>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
