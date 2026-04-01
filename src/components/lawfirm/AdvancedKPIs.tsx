import { Card, CardContent } from '@/components/ui/card';
import { 
  Briefcase, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp,
  Percent,
  Receipt,
  Wallet,
  Target,
  Trophy
} from 'lucide-react';
import type { LawfirmCase } from '@/hooks/useLawfirmCases';

interface AdvancedKPIsProps {
  cases: LawfirmCase[];
  availableLeadsCount: number;
}

export function AdvancedKPIs({ cases, availableLeadsCount }: AdvancedKPIsProps) {
  const casesWon = cases.filter(c => c.firm_status === 'won').length;
  
  // Total lead cost (all time)
  const totalLeadCost = cases.reduce((sum, c) => sum + (c.lead_cost || c.lead?.price_final || 0), 0);
  
  // Cases converted to clients (contacted + in_progress + won)
  const casesConverted = cases.filter(c => 
    ['contacted', 'in_progress', 'won'].includes(c.firm_status)
  ).length;
  
  // Conversion rate: converted / total purchased
  const totalPurchased = cases.length;
  const conversionRate = totalPurchased > 0 
    ? Math.round((casesConverted / totalPurchased) * 100) 
    : 0;
  
  // Minutas cobradas (client_fee from won cases)
  const minutasCobradas = cases
    .filter(c => c.firm_status === 'won')
    .reduce((sum, c) => sum + (c.client_fee || c.result_amount || 0), 0);
  
  // % a éxito ganado
  const exitoGanado = cases
    .filter(c => c.firm_status === 'won' && c.won_amount)
    .reduce((sum, c) => sum + (c.won_amount || 0), 0);
  
  // Total ingresos
  const totalIngresos = minutasCobradas + exitoGanado;

  const kpis = [
    { 
      label: 'Total Casos Disponibles', 
      value: availableLeadsCount, 
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Coste Total Leads', 
      value: `${totalLeadCost.toLocaleString('es-ES')}€`, 
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    { 
      label: 'Convertidos a Clientes', 
      value: casesConverted, 
      icon: CheckCircle2,
      color: 'text-lawfirm-primary',
      bgColor: 'bg-lawfirm-primary/10'
    },
    { 
      label: 'Ratio Conversión', 
      value: `${conversionRate}%`, 
      icon: Percent,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Minutas Cobradas', 
      value: `${minutasCobradas.toLocaleString('es-ES')}€`, 
      icon: Receipt,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      label: '% Éxito Ganado', 
      value: `${exitoGanado.toLocaleString('es-ES')}€`, 
      icon: TrendingUp,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    { 
      label: 'Total Casos Ganados', 
      value: casesWon, 
      icon: Trophy,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    { 
      label: 'Total Ingresos', 
      value: `${totalIngresos.toLocaleString('es-ES')}€`, 
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10'
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="shadow-soft hover:shadow-medium transition-shadow">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-lg font-bold leading-tight">{kpi.value}</p>
            <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
