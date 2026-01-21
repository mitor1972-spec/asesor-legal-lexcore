import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  TrendingUp,
  Percent,
  Receipt,
  Wallet,
  Target
} from 'lucide-react';
import type { LawfirmCase } from '@/hooks/useLawfirmCases';

interface AdvancedKPIsProps {
  cases: LawfirmCase[];
  availableLeadsCount: number;
}

export function AdvancedKPIs({ cases, availableLeadsCount }: AdvancedKPIsProps) {
  // Calculate metrics
  const casesAccepted = cases.filter(c => 
    ['reviewing', 'contacted', 'in_progress', 'won', 'lost'].includes(c.firm_status)
  ).length;
  
  const casesWon = cases.filter(c => c.firm_status === 'won').length;
  const casesLost = cases.filter(c => c.firm_status === 'lost').length;
  
  // Cost of leads (price_final from lead)
  const totalLeadCost = cases.reduce((sum, c) => sum + (c.lead?.price_final || 0), 0);
  
  // Revenue from won cases
  const minutaCobrada = cases
    .filter(c => c.firm_status === 'won')
    .reduce((sum, c) => sum + (c.result_amount || 0), 0);
  
  // Success fee (placeholder - would need a field for this)
  const exitoCobrado = cases
    .filter(c => c.firm_status === 'won' && (c as any).service_type === 'exito')
    .reduce((sum, c) => sum + ((c.result_amount || 0) * 0.15), 0); // 15% example
  
  const totalIngresos = minutaCobrada + exitoCobrado;
  
  // Conversion rate
  const conversionRate = casesAccepted > 0 
    ? Math.round((casesWon / casesAccepted) * 100) 
    : 0;

  const kpis = [
    { 
      label: 'Casos Disponibles', 
      value: availableLeadsCount, 
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Casos Aceptados', 
      value: casesAccepted, 
      icon: CheckCircle2,
      color: 'text-lawfirm-primary',
      bgColor: 'bg-lawfirm-primary/10'
    },
    { 
      label: 'Casos Ganados', 
      value: casesWon, 
      icon: Target,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    { 
      label: 'Casos Perdidos', 
      value: casesLost, 
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    { 
      label: 'Coste Leads', 
      value: `${totalLeadCost.toLocaleString('es-ES')}€`, 
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    { 
      label: 'Minutas Cobradas', 
      value: `${minutaCobrada.toLocaleString('es-ES')}€`, 
      icon: Receipt,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      label: '% Éxito Cobrado', 
      value: `${exitoCobrado.toLocaleString('es-ES')}€`, 
      icon: TrendingUp,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    { 
      label: 'Total Ingresos', 
      value: `${totalIngresos.toLocaleString('es-ES')}€`, 
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10'
    },
    { 
      label: 'Ratio Conversión', 
      value: `${conversionRate}%`, 
      icon: Percent,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="shadow-soft hover:shadow-medium transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
