import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, Users, Euro, Target, ArrowUpRight, ArrowDownRight,
  Download, Calendar, Scale, Phone, MessageSquare, Mail, CheckCircle, XCircle
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid
} from 'recharts';
import * as XLSX from 'xlsx';

type Period = 'month' | 'quarter' | 'year' | 'all';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function LawfirmReports() {
  const { user } = useAuthContext();
  const [period, setPeriod] = useState<Period>('month');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'month':
        return { start: startOfMonth(now), end: now };
      case 'quarter':
        return { start: subMonths(now, 3), end: now };
      case 'year':
        return { start: startOfYear(now), end: now };
      default:
        return { start: new Date(2020, 0, 1), end: now };
    }
  };

  // Fetch cases data
  const { data: casesData, isLoading } = useQuery({
    queryKey: ['lawfirm-reports', user?.profile?.lawfirm_id, period],
    queryFn: async () => {
      if (!user?.profile?.lawfirm_id) return null;
      
      const { start, end } = getDateRange();
      
      const { data: assignments, error } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          firm_status,
          result_amount,
          assigned_at,
          lead:leads(
            id,
            score_final,
            price_final,
            source_channel,
            structured_fields
          )
        `)
        .eq('lawfirm_id', user.profile.lawfirm_id)
        .gte('assigned_at', start.toISOString())
        .lte('assigned_at', end.toISOString());

      if (error) throw error;

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('lead_purchases')
        .select('price_paid, purchased_at')
        .eq('lawfirm_id', user.profile.lawfirm_id)
        .gte('purchased_at', start.toISOString())
        .lte('purchased_at', end.toISOString());

      return { assignments: assignments || [], purchases: purchases || [] };
    },
    enabled: !!user?.profile?.lawfirm_id,
  });

  const assignments = casesData?.assignments || [];
  const purchases = casesData?.purchases || [];

  // Calculate KPIs
  const totalLeads = assignments.length;
  const wonLeads = assignments.filter(a => a.firm_status === 'won').length;
  const lostLeads = assignments.filter(a => a.firm_status === 'lost').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100) : 0;
  const totalInvestment = purchases.reduce((sum, p) => sum + (p.price_paid || 0), 0);
  const totalRevenue = assignments.reduce((sum, a) => sum + (a.result_amount || 0), 0);
  const roi = totalInvestment > 0 ? (((totalRevenue - totalInvestment) / totalInvestment) * 100) : 0;
  const avgLeadCost = purchases.length > 0 ? totalInvestment / purchases.length : 0;
  const avgRevenue = wonLeads > 0 ? totalRevenue / wonLeads : 0;

  // Group by status
  const statusData = Object.entries(
    assignments.reduce((acc, a) => {
      const status = a.firm_status || 'received';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: getStatusLabel(name), value }));

  // Group by area
  const areaData = Object.entries(
    assignments.reduce((acc, a) => {
      const fields = a.lead?.structured_fields as Record<string, string> | null;
      const area = fields?.area_legal || fields?.legal_area || 'Sin área';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).slice(0, 6);

  // Group by channel
  const channelData = Object.entries(
    assignments.reduce((acc, a) => {
      const channel = a.lead?.source_channel || 'Otro';
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Monthly evolution
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthAssignments = assignments.filter(a => {
      const d = new Date(a.assigned_at);
      return d >= monthStart && d <= monthEnd;
    });
    
    return {
      month: format(date, 'MMM', { locale: es }),
      recibidos: monthAssignments.length,
      ganados: monthAssignments.filter(a => a.firm_status === 'won').length,
    };
  });

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      received: 'Recibido',
      reviewing: 'Revisando',
      contacted: 'Contactado',
      in_progress: 'En curso',
      won: 'Ganado',
      lost: 'Perdido',
      rejected: 'Rechazado',
      archived: 'Archivado',
    };
    return labels[status] || status;
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'Teléfono': return Phone;
      case 'Web chat': return MessageSquare;
      case 'WhatsApp': return MessageSquare;
      case 'Email': return Mail;
      default: return MessageSquare;
    }
  };

  const exportToExcel = () => {
    const data = assignments.map(a => {
      const fields = a.lead?.structured_fields as Record<string, string> | null;
      return {
        'Fecha': format(new Date(a.assigned_at), 'dd/MM/yyyy'),
        'Área': fields?.area_legal || fields?.legal_area || '-',
        'Provincia': fields?.provincia || fields?.province || '-',
        'Canal': a.lead?.source_channel || '-',
        'Score': a.lead?.score_final || 0,
        'Estado': getStatusLabel(a.firm_status),
        'Importe ganado': a.result_amount || 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe');
    XLSX.writeFile(wb, `informe-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-lawfirm-primary" />
            Informes y Estadísticas
          </h1>
          <p className="text-muted-foreground">
            Analiza el rendimiento de tu despacho
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
              <SelectItem value="all">Todo el histórico</SelectItem>
            </SelectContent>
          </Select>
          
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {wonLeads} ganados, {lostLeads} perdidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Conversión
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lawfirm-primary">
              {conversionRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {conversionRate >= 20 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              {wonLeads} de {totalLeads} leads convertidos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inversión en Leads
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvestment.toFixed(0)}€</div>
            <p className="text-xs text-muted-foreground">
              Media: {avgLeadCost.toFixed(0)}€ por lead
            </p>
          </CardContent>
        </Card>

        <Card className={roi >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ROI
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Facturado: {totalRevenue.toFixed(0)}€
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolución Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="recibidos" stroke="#4f46e5" name="Recibidos" strokeWidth={2} />
                  <Line type="monotone" dataKey="ganados" stroke="#10b981" name="Ganados" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de los Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads por Área Legal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channelData.map((channel, i) => {
                const Icon = getChannelIcon(channel.name);
                const percent = totalLeads > 0 ? (channel.value / totalLeads) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{channel.name}</span>
                        <span className="font-medium">{channel.value} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-lawfirm-primary rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leads ganados</p>
              <p className="text-2xl font-bold text-green-600">{wonLeads}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leads perdidos</p>
              <p className="text-2xl font-bold text-red-600">{lostLeads}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-lawfirm-primary/5 border-lawfirm-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-lawfirm-primary/10 rounded-lg">
              <Euro className="h-6 w-6 text-lawfirm-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Facturación media</p>
              <p className="text-2xl font-bold text-lawfirm-primary">{avgRevenue.toFixed(0)}€</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
