import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Inbox, Euro, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percent';
  link?: string;
}

function KPICard({ title, value, icon: Icon, change, changeLabel, format = 'number', link }: KPICardProps) {
  const formattedValue = () => {
    if (typeof value !== 'number') return value;
    if (format === 'currency') {
      return `${Math.round(value).toLocaleString('es-ES', { maximumFractionDigits: 0, useGrouping: true })}€`;
    }
    if (format === 'percent') return `${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    return value.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  };

  const changeColor = change === undefined || change === 0 
    ? 'text-muted-foreground' 
    : change > 0 
      ? 'text-success' 
      : 'text-destructive';

  const ChangeIcon = change === undefined || change === 0 
    ? Minus 
    : change > 0 
      ? TrendingUp 
      : TrendingDown;

  const cardContent = (
    <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02] hover:border-primary/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-display font-bold">{formattedValue()}</div>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs mt-1', changeColor)}>
            <ChangeIcon className="h-3 w-3" />
            <span>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
              {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link to={link}>{cardContent}</Link>;
  }

  return cardContent;
}

interface DashboardKPIsProps {
  totalLeads: number;
  totalValue: number;
  leadsWon: number;
  conversionRate: number;
  prevTotalLeads: number;
  prevTotalValue: number;
  prevLeadsWon: number;
  prevConversionRate: number;
  isLoading?: boolean;
}

export function DashboardKPIs({
  totalLeads,
  totalValue,
  leadsWon,
  conversionRate,
  prevTotalLeads,
  prevTotalValue,
  prevLeadsWon,
  prevConversionRate,
  isLoading,
}: DashboardKPIsProps) {
  const calcChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const kpis = [
    {
      title: 'Leads Totales',
      value: isLoading ? '...' : totalLeads,
      icon: Inbox,
      change: isLoading ? undefined : calcChange(totalLeads, prevTotalLeads),
      format: 'number' as const,
      link: '/leads',
    },
    {
      title: 'Valor Total',
      value: isLoading ? 0 : totalValue,
      icon: Euro,
      change: isLoading ? undefined : calcChange(totalValue, prevTotalValue),
      format: 'currency' as const,
      link: '/leads',
    },
    {
      title: 'Leads Ganados',
      value: isLoading ? '...' : leadsWon,
      icon: Trophy,
      change: isLoading ? undefined : calcChange(leadsWon, prevLeadsWon),
      format: 'number' as const,
      link: '/leads?status=Aceptado',
    },
    {
      title: 'Tasa Conversión',
      value: isLoading ? 0 : conversionRate,
      icon: TrendingUp,
      change: isLoading ? undefined : conversionRate - prevConversionRate,
      format: 'percent' as const,
      link: '/reports/sales',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
}
