import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LawfirmCase } from '@/hooks/useLawfirmCases';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, MessageCircle, ArrowRight } from 'lucide-react';

interface RecentActivityCardProps {
  cases: LawfirmCase[];
}

const statusIcons: Record<string, React.ReactNode> = {
  received: <Clock className="h-4 w-4 text-blue-500" />,
  reviewing: <Clock className="h-4 w-4 text-amber-500" />,
  contacted: <MessageCircle className="h-4 w-4 text-purple-500" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  won: <CheckCircle className="h-4 w-4 text-green-500" />,
  lost: <XCircle className="h-4 w-4 text-red-500" />,
  rejected: <XCircle className="h-4 w-4 text-gray-500" />,
};

const statusLabels: Record<string, string> = {
  received: 'Nuevo',
  reviewing: 'Revisando',
  contacted: 'Contactado',
  in_progress: 'En curso',
  won: 'Ganado',
  lost: 'Perdido',
  rejected: 'Rechazado',
};

export function RecentActivityCard({ cases }: RecentActivityCardProps) {
  // Get most recent 5 cases sorted by assigned_at
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
    .slice(0, 5);

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Actividad Reciente</CardTitle>
        <Link 
          to="/despacho/casos" 
          className="text-xs text-lawfirm-primary hover:underline flex items-center gap-1"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {recentCases.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay actividad reciente
          </p>
        ) : (
          <div className="space-y-3">
            {recentCases.map((caseItem) => {
              const fields = caseItem.lead?.structured_fields as Record<string, string> | null;
              const timeAgo = formatDistanceToNow(new Date(caseItem.assigned_at), { 
                addSuffix: true, 
                locale: es 
              });

              return (
                <Link
                  key={caseItem.id}
                  to={`/despacho/casos/${caseItem.id}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {statusIcons[caseItem.firm_status] || statusIcons.received}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fields?.nombre || 'Cliente'} — {fields?.area_legal || 'Caso'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        {statusLabels[caseItem.firm_status] || caseItem.firm_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
