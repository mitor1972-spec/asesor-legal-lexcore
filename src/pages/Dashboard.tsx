import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';
import { useDashboardMetrics, type DatePeriod } from '@/hooks/useDashboardMetrics';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { EvolutionChart } from '@/components/dashboard/charts/EvolutionChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { LegalAreaChart } from '@/components/dashboard/charts/AreaChart';
import { ChannelChart } from '@/components/dashboard/charts/ChannelChart';
import { ScoreDistributionChart } from '@/components/dashboard/charts/ScoreDistributionChart';
import { TopLawfirmsCard } from '@/components/dashboard/TopLawfirmsCard';
import { RecentLeadsTable } from '@/components/dashboard/RecentLeadsTable';

export default function Dashboard() {
  const [period, setPeriod] = useState<DatePeriod>('month');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>();
  
  const { data: metrics, isLoading } = useDashboardMetrics(period, customRange);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Panel de Control
          </h1>
          <p className="text-muted-foreground">Métricas y análisis de leads</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          <Button asChild className="gradient-brand">
            <Link to="/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <DashboardKPIs
        totalLeads={metrics?.totalLeads ?? 0}
        totalValue={metrics?.totalValue ?? 0}
        leadsWon={metrics?.leadsWon ?? 0}
        conversionRate={metrics?.conversionRate ?? 0}
        prevTotalLeads={metrics?.prevTotalLeads ?? 0}
        prevTotalValue={metrics?.prevTotalValue ?? 0}
        prevLeadsWon={metrics?.prevLeadsWon ?? 0}
        prevConversionRate={metrics?.prevConversionRate ?? 0}
        isLoading={isLoading}
      />

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EvolutionChart data={metrics?.dailyEvolution ?? []} />
        <StatusChart data={metrics?.leadsByStatus ?? []} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LegalAreaChart data={metrics?.leadsByArea ?? []} />
        <TopLawfirmsCard data={metrics?.topLawfirms ?? []} />
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelChart data={metrics?.leadsByChannel ?? []} />
        <ScoreDistributionChart data={metrics?.scoreDistribution ?? []} />
      </div>

      {/* Recent Leads */}
      <RecentLeadsTable leads={metrics?.recentLeads ?? []} />
    </div>
  );
}
