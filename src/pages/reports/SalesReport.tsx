import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, BarChart3, Building2, Scale } from 'lucide-react';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { getDateRange, type DatePeriod } from '@/hooks/useDashboardMetrics';
import { exportReportToExcel } from '@/lib/exportToExcel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LawfirmStat {
  id: string;
  name: string;
  leads: number;
  value: number;
  won: number;
  conversionRate: number;
  avgResponseTime: string;
}

interface AreaStat {
  area: string;
  leads: number;
  value: number;
  won: number;
  conversionRate: number;
  avgScore: number;
}

export default function SalesReport() {
  const [period, setPeriod] = useState<DatePeriod>('month');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>();
  const [lawfirmFilter, setLawfirmFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const dateRange = getDateRange(period, customRange);

  // Fetch lawfirms for filter
  const { data: lawfirms } = useQuery({
    queryKey: ['lawfirms-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lawfirms')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['sales-report', period, customRange?.start, lawfirmFilter, areaFilter],
    queryFn: async () => {
      // Fetch leads with assignments
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*, lead_assignments(*, lawfirms(id, name))')
        .is('archived_at', null)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (error) throw error;
      
      const leadsData = leads || [];
      
      // Calculate summary
      const totalLeads = leadsData.length;
      const totalValue = leadsData.reduce((sum, l) => sum + (l.price_final || 0), 0);
      const ticketMedio = totalLeads > 0 ? totalValue / totalLeads : 0;
      
      // Calculate lawfirm stats
      const lawfirmStats: Record<string, LawfirmStat> = {};
      leadsData.forEach(lead => {
        const _la = lead.lead_assignments as unknown; const assignments: any[] = Array.isArray(_la) ? _la : (_la ? [_la] : []);
        assignments?.forEach(a => {
          if (a.lawfirms) {
            const id = a.lawfirms.id;
            const name = a.lawfirms.name;
            
            if (!lawfirmStats[id]) {
              lawfirmStats[id] = {
                id,
                name,
                leads: 0,
                value: 0,
                won: 0,
                conversionRate: 0,
                avgResponseTime: '-',
              };
            }
            
            lawfirmStats[id].leads += 1;
            lawfirmStats[id].value += lead.price_final || 0;
            
            if (a.firm_status === 'won') {
              lawfirmStats[id].won += 1;
            }
          }
        });
      });
      
      // Calculate conversion rates
      Object.values(lawfirmStats).forEach(stat => {
        stat.conversionRate = stat.leads > 0 ? (stat.won / stat.leads) * 100 : 0;
      });
      
      const lawfirmStatsList = Object.values(lawfirmStats).sort((a, b) => b.leads - a.leads);
      
      // Calculate area stats
      const areaStats: Record<string, AreaStat> = {};
      leadsData.forEach(lead => {
        const fields = lead.structured_fields as any;
        const area = fields?.area_legal || 'Sin clasificar';
        
        if (!areaStats[area]) {
          areaStats[area] = {
            area,
            leads: 0,
            value: 0,
            won: 0,
            conversionRate: 0,
            avgScore: 0,
          };
        }
        
        areaStats[area].leads += 1;
        areaStats[area].value += lead.price_final || 0;
        
        if (lead.score_final) {
          areaStats[area].avgScore = 
            (areaStats[area].avgScore * (areaStats[area].leads - 1) + lead.score_final) / areaStats[area].leads;
        }
        
        const _la = lead.lead_assignments as unknown; const assignments: any[] = Array.isArray(_la) ? _la : (_la ? [_la] : []);
        if (assignments?.some(a => a.firm_status === 'won')) {
          areaStats[area].won += 1;
        }
      });
      
      Object.values(areaStats).forEach(stat => {
        stat.conversionRate = stat.leads > 0 ? (stat.won / stat.leads) * 100 : 0;
      });
      
      const areaStatsList = Object.values(areaStats).sort((a, b) => b.leads - a.leads);
      
      // Count won leads
      const leadsWon = leadsData.filter(l => {
        const _la = l.lead_assignments as unknown; const assignments: any[] = Array.isArray(_la) ? _la : (_la ? [_la] : []);
        return assignments?.some(a => a.firm_status === 'won');
      }).length;
      
      const wonValue = leadsData
        .filter(l => {
          const _la = l.lead_assignments as unknown; const assignments: any[] = Array.isArray(_la) ? _la : (_la ? [_la] : []);
          return assignments?.some(a => a.firm_status === 'won');
        })
        .reduce((sum, l) => sum + (l.price_final || 0), 0);
      
      const conversionRate = totalLeads > 0 ? (leadsWon / totalLeads) * 100 : 0;
      
      return {
        summary: {
          totalLeads,
          totalValue,
          ticketMedio,
          leadsWon,
          wonValue,
          conversionRate,
        },
        lawfirmStats: lawfirmStatsList,
        areaStats: areaStatsList,
      };
    },
  });

  const handleExportLawfirms = () => {
    if (!reportData?.lawfirmStats) return;
    
    const data = reportData.lawfirmStats.map(s => ({
      'Despacho': s.name,
      'Leads': s.leads,
      'Valor (€)': s.value,
      'Ganados': s.won,
      'Conversión (%)': s.conversionRate.toFixed(1),
    }));
    
    exportReportToExcel(
      data, 
      'Despachos', 
      `informe-despachos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );
  };

  const handleExportAreas = () => {
    if (!reportData?.areaStats) return;
    
    const data = reportData.areaStats.map(s => ({
      'Área Legal': s.area,
      'Leads': s.leads,
      'Valor (€)': s.value,
      'Ganados': s.won,
      'Conversión (%)': s.conversionRate.toFixed(1),
      'Score Medio': Math.round(s.avgScore),
    }));
    
    exportReportToExcel(
      data, 
      'Áreas', 
      `informe-areas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Informe de Ventas
          </h1>
          <p className="text-muted-foreground">Análisis detallado por despacho y área legal</p>
        </div>
        <PeriodSelector
          period={period}
          onPeriodChange={setPeriod}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <Select value={lawfirmFilter} onValueChange={setLawfirmFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los despachos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los despachos</SelectItem>
                {lawfirms?.map(lf => (
                  <SelectItem key={lf.id} value={lf.id}>{lf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {reportData?.areaStats.map(a => (
                  <SelectItem key={a.area} value={a.area}>{a.area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-soft bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{reportData?.summary.totalLeads ?? 0}</p>
              <p className="text-xs text-muted-foreground">Leads enviados</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{(reportData?.summary.totalValue ?? 0).toLocaleString('es-ES')}€</p>
              <p className="text-xs text-muted-foreground">Valor total</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{(reportData?.summary.ticketMedio ?? 0).toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">Ticket medio</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{reportData?.summary.leadsWon ?? 0}</p>
              <p className="text-xs text-muted-foreground">Leads ganados</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{(reportData?.summary.wonValue ?? 0).toLocaleString('es-ES')}€</p>
              <p className="text-xs text-muted-foreground">Valor ganado</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{(reportData?.summary.conversionRate ?? 0).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Conversión</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lawfirm Stats */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Detalle por Despacho
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportLawfirms}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Despacho</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ganados</TableHead>
                <TableHead className="text-center">Conversión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell>
                </TableRow>
              ) : reportData?.lawfirmStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Sin datos en este período
                  </TableCell>
                </TableRow>
              ) : (
                reportData?.lawfirmStats.map(stat => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell className="text-center">{stat.leads}</TableCell>
                    <TableCell className="text-right font-mono">{stat.value.toLocaleString('es-ES')}€</TableCell>
                    <TableCell className="text-center">{stat.won}</TableCell>
                    <TableCell className="text-center">{stat.conversionRate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Area Stats */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Detalle por Área Legal
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportAreas}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ganados</TableHead>
                <TableHead className="text-center">Conversión</TableHead>
                <TableHead className="text-center">Score medio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell>
                </TableRow>
              ) : reportData?.areaStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Sin datos en este período
                  </TableCell>
                </TableRow>
              ) : (
                reportData?.areaStats.map(stat => (
                  <TableRow key={stat.area}>
                    <TableCell className="font-medium">{stat.area}</TableCell>
                    <TableCell className="text-center">{stat.leads}</TableCell>
                    <TableCell className="text-right font-mono">{stat.value.toLocaleString('es-ES')}€</TableCell>
                    <TableCell className="text-center">{stat.won}</TableCell>
                    <TableCell className="text-center">{stat.conversionRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{Math.round(stat.avgScore)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
