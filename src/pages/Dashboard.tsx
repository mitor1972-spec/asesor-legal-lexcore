import { useLeadStats } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Send, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { data: stats, isLoading } = useLeadStats();

  const statCards = [
    { label: 'Total Leads', value: stats?.total ?? 0, icon: Users, color: 'text-primary' },
    { label: 'Pendientes', value: stats?.pending ?? 0, icon: Clock, color: 'text-warning' },
    { label: 'Derivados', value: stats?.derived ?? 0, icon: Send, color: 'text-success' },
    { label: 'Hoy', value: stats?.today ?? 0, icon: CalendarPlus, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Vista general de tus leads</p>
        </div>
        <Button asChild className="gradient-brand">
          <Link to="/leads/new">Nuevo Lead</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold">
                  {isLoading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/leads">Ver todos los leads</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/leads?status=Pendiente">Ver pendientes</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
