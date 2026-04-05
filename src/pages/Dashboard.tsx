import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';
import { useDashboardMetrics, type DatePeriod } from '@/hooks/useDashboardMetrics';
import { useAdminCRMMetrics } from '@/hooks/useAdminCRMMetrics';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { EvolutionChart } from '@/components/dashboard/charts/EvolutionChart';
import { StatusChart } from '@/components/dashboard/charts/StatusChart';
import { LegalAreaChart } from '@/components/dashboard/charts/AreaChart';
import { ChannelChart } from '@/components/dashboard/charts/ChannelChart';
import { ScoreDistributionChart } from '@/components/dashboard/charts/ScoreDistributionChart';
import { TopLawfirmsCard } from '@/components/dashboard/TopLawfirmsCard';
import { RecentLeadsTable } from '@/components/dashboard/RecentLeadsTable';
import { NewLeadButton } from '@/components/lead/NewLeadButton';
import { AdminCRMKPIs, AdminAlertsFeed, RecentLawfirmsTable } from '@/components/dashboard/AdminCRMWidgets';
import { Separator } from '@/components/ui/separator';

export default function Dashboard() {
  const [period, setPeriod] = useState<DatePeriod>('all');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>();
  
  const { data: metrics, isLoading } = useDashboardMetrics(period, customRange);
  const { data: crmData, isLoading: crmLoading } = useAdminCRMMetrics(period, customRange);

  const defaultCRM = {
    totalLawfirms: 0, newLawfirms: 0, pendingOnboarding: 0,
    creditRequests: 0, adInterests: 0, recentLawfirms: [], alerts: [],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Panel de Control
          </h1>
          <p className="text-muted-foreground">Métricas de leads y gestión de despachos</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          <NewLeadButton />
        </div>
      </div>

      {/* ═══ SECCIÓN CRM DESPACHOS ═══ */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
          🏛️ CRM Despachos
        </h2>
        <AdminCRMKPIs data={crmData ?? defaultCRM} isLoading={crmLoading} />

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminAlertsFeed alerts={crmData?.alerts ?? []} />
          <RecentLawfirmsTable lawfirms={crmData?.recentLawfirms ?? []} />
        </div>
      </div>

      <Separator />

      {/* ═══ SECCIÓN LEADS ═══ */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
          📋 Leads
        </h2>

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

        {/* Recent Leads */}
        <RecentLeadsTable leads={metrics?.recentLeads ?? []} />

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
      </div>
    </div>
  );
}
