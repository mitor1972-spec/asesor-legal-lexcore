import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, UserPlus, CreditCard, Megaphone, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface LawfirmAlert {
  id: string;
  type: 'new_registration' | 'credit_request' | 'ad_interest' | 'profile_incomplete';
  lawfirmName: string;
  date: string;
  detail: string;
}

export interface AdminCRMData {
  totalLawfirms: number;
  newLawfirms: number;
  pendingOnboarding: number;
  creditRequests: number;
  adInterests: number;
  recentLawfirms: {
    id: string;
    name: string;
    createdAt: string;
    registrationType: string | null;
    onboardingCompleted: boolean;
    contactEmail: string | null;
    province: string | null;
  }[];
  alerts: LawfirmAlert[];
}

// ─── KPI Row ───────────────────────────────────────────────

interface AdminCRMKPIsProps {
  data: AdminCRMData;
  isLoading?: boolean;
}

export function AdminCRMKPIs({ data, isLoading }: AdminCRMKPIsProps) {
  const cards = [
    { title: 'Despachos Registrados', value: data.totalLawfirms, icon: Building2, color: 'text-primary', bg: 'bg-primary/10', link: '/settings/lawfirms' },
    { title: 'Nuevos (periodo)', value: data.newLawfirms, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-500/10', link: '/settings/lawfirms?filter=nuevos' },
    { title: 'Onboarding Pendiente', value: data.pendingOnboarding, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10', link: '/settings/lawfirms?filter=onboarding' },
    { title: 'Solicitudes Crédito', value: data.creditRequests, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-500/10', link: '/settings/lawfirm-applications?filter=credito' },
    { title: 'Interés Publicidad', value: data.adInterests, icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-500/10', link: '/settings/lawfirm-applications?filter=publicidad' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map(c => (
        <Link key={c.title} to={c.link} className="block">
          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02] hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle>
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">
                {isLoading ? '...' : c.value}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ─── Alerts / Action Items ─────────────────────────────────

export function AdminAlertsFeed({ alerts }: { alerts: LawfirmAlert[] }) {
  const iconMap = {
    new_registration: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    credit_request: { icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    ad_interest: { icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    profile_incomplete: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  };

  const labelMap: Record<string, string> = {
    new_registration: 'Nuevo registro',
    credit_request: 'Solicitud crédito',
    ad_interest: 'Interés publicidad',
    profile_incomplete: 'Perfil incompleto',
  };

  // Cada tipo de alerta lleva a una sección distinta
  const linkFor = (alert: LawfirmAlert): string => {
    if (alert.type === 'new_registration' || alert.type === 'profile_incomplete') {
      return `/settings/lawfirms?highlight=${alert.id}`;
    }
    return `/settings/lawfirm-applications?highlight=${alert.id}`;
  };

  if (alerts.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Centro de Alertas — Despachos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <CheckCircle className="h-4 w-4 text-success" />
            No hay alertas pendientes
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Centro de Alertas — Despachos
          <Badge variant="destructive" className="ml-auto text-xs">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.map((a, i) => {
          const cfg = iconMap[a.type];
          return (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`p-1.5 rounded-md ${cfg.bg} mt-0.5`}>
                <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{a.lawfirmName}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{labelMap[a.type]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(a.date), 'dd/MM', { locale: es })}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Recent Lawfirms Table ─────────────────────────────────

export function RecentLawfirmsTable({ lawfirms }: { lawfirms: AdminCRMData['recentLawfirms'] }) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Últimos Despachos Registrados
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/settings/lawfirms" className="text-xs">
            Ver todos <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Despacho</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Provincia</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lawfirms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  Sin registros nuevos en este período
                </TableCell>
              </TableRow>
            ) : (
              lawfirms.map(lf => (
                <TableRow key={lf.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="text-xs">
                    {format(new Date(lf.createdAt), 'dd/MM/yy', { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{lf.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{lf.contactEmail || '—'}</TableCell>
                  <TableCell className="text-xs">{lf.province || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      lf.registrationType === 'full'
                        ? 'bg-primary/10 text-primary border-primary/20 text-[10px]'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'
                    }>
                      {lf.registrationType === 'full' ? 'Completo' : 'Rápido'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lf.onboardingCompleted ? (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Completado</Badge>
                    ) : (
                      <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Pendiente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
