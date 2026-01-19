import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLawfirmCases } from '@/hooks/useLawfirmCases';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLawfirmProfile, useLawfirmTeam, useLawfirmBranches } from '@/hooks/useLawfirmProfile';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { Link } from 'react-router-dom';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  ArrowRight 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { 
  CasesByAreaWidget, 
  CasesByProvinceWidget, 
  CasesByBranchWidget, 
  CasesByLawyerWidget, 
  WonCasesTable 
} from '@/components/lawfirm/DashboardWidgets';

const statusLabels: Record<string, string> = {
  received: 'Recibido',
  reviewing: 'Revisando',
  contacted: 'Contactado',
  in_progress: 'En curso',
  won: 'Ganado',
  lost: 'Perdido',
  rejected: 'Rechazado',
  archived: 'Archivado',
};

const statusColors: Record<string, string> = {
  received: 'hsl(217, 91%, 60%)',
  reviewing: 'hsl(38, 92%, 50%)',
  contacted: 'hsl(280, 67%, 56%)',
  in_progress: 'hsl(217, 91%, 60%)',
  won: 'hsl(142, 71%, 45%)',
  lost: 'hsl(0, 84%, 60%)',
  rejected: 'hsl(0, 0%, 50%)',
  archived: 'hsl(0, 0%, 40%)',
};

export default function LawfirmDashboard() {
  const { user } = useAuthContext();
  const { data: lawfirm } = useLawfirmProfile();
  const { data: cases = [], isLoading } = useLawfirmCases();
  const { data: team = [] } = useLawfirmTeam();
  const { data: branches = [] } = useLawfirmBranches();

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const monthStart = startOfMonth(now);

  // Calculate stats
  const totalCases = cases.length;
  const newCases = cases.filter(c => new Date(c.assigned_at) >= sevenDaysAgo).length;
  const inProgressCases = cases.filter(c => 
    ['received', 'reviewing', 'contacted', 'in_progress'].includes(c.firm_status)
  ).length;
  const closedThisMonth = cases.filter(c => 
    ['won', 'lost'].includes(c.firm_status) && 
    new Date(c.assigned_at) >= monthStart
  ).length;

  // Status chart data
  const statusCounts = cases.reduce((acc, c) => {
    acc[c.firm_status] = (acc[c.firm_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts)
    .filter(([status]) => ['received', 'reviewing', 'contacted', 'in_progress', 'won', 'lost'].includes(status))
    .map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status]
    }));

  // Recent cases
  const recentCases = cases.slice(0, 5);

  // Team lawyers (for widgets)
  const lawyers = team.map(m => ({ id: m.id, full_name: m.full_name, email: m.email }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">
          ¡Bienvenido, {user?.profile?.full_name?.split(' ')[0] || 'Usuario'}!
        </h1>
        <p className="text-muted-foreground">
          {lawfirm?.name || 'Tu despacho'} — Resumen de actividad
        </p>
      </div>

      {/* Stats Grid - Clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/despacho/casos">
          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Casos Totales
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCases}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/despacho/casos?tab=new">
          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nuevos (7 días)
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-lawfirm-primary">{newCases}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/despacho/casos?tab=in_progress">
          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En Curso
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCases}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/despacho/casos?tab=closed">
          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cerrados (mes)
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{closedThisMonth}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Casos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CasesByAreaWidget cases={cases} />
        <CasesByProvinceWidget cases={cases} />
        <CasesByBranchWidget cases={cases} branches={branches} />
        <CasesByLawyerWidget cases={cases} lawyers={lawyers} />
      </div>

      {/* Won Cases Table */}
      <WonCasesTable cases={cases} />

      {/* Recent Cases */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Últimos Casos Recibidos</CardTitle>
          <Link 
            to="/despacho/casos" 
            className="text-sm text-lawfirm-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aún no tienes casos asignados
            </p>
          ) : (
            <div className="space-y-3">
              {recentCases.map((caseItem) => {
                const fields = caseItem.lead?.structured_fields as Record<string, string> | null;
                return (
                  <Link
                    key={caseItem.id}
                    to={`/despacho/casos/${caseItem.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <LeadTemperature 
                        score={caseItem.lead?.score_final || 0} 
                        variant="mini" 
                      />
                      <div>
                        <p className="font-medium">
                          {fields?.nombre || 'Cliente'} — {fields?.area_legal || 'Caso'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {fields?.provincia || 'España'} • {statusLabels[caseItem.firm_status] || caseItem.firm_status}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(caseItem.assigned_at), 'dd/MM/yy', { locale: es })}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
