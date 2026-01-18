import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subWeeks, subMonths, subQuarters, subYears } from 'date-fns';

export type DatePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(period: DatePeriod, customRange?: DateRange): DateRange {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfDay(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfDay(now) };
    case 'custom':
      return customRange || { start: startOfMonth(now), end: endOfDay(now) };
    default:
      return { start: startOfMonth(now), end: endOfDay(now) };
  }
}

export function getPreviousDateRange(period: DatePeriod, customRange?: DateRange): DateRange {
  const current = getDateRange(period, customRange);
  const diff = current.end.getTime() - current.start.getTime();
  
  switch (period) {
    case 'today':
      return { start: startOfDay(subDays(current.start, 1)), end: endOfDay(subDays(current.end, 1)) };
    case 'week':
      return { start: subWeeks(current.start, 1), end: subWeeks(current.end, 1) };
    case 'month':
      return { start: subMonths(current.start, 1), end: subMonths(current.end, 1) };
    case 'quarter':
      return { start: subQuarters(current.start, 1), end: subQuarters(current.end, 1) };
    case 'year':
      return { start: subYears(current.start, 1), end: subYears(current.end, 1) };
    case 'custom':
      return { 
        start: new Date(current.start.getTime() - diff - 1), 
        end: new Date(current.end.getTime() - diff - 1) 
      };
    default:
      return { start: subMonths(current.start, 1), end: subMonths(current.end, 1) };
  }
}

export interface DashboardMetrics {
  totalLeads: number;
  totalValue: number;
  leadsWon: number;
  conversionRate: number;
  prevTotalLeads: number;
  prevTotalValue: number;
  prevLeadsWon: number;
  prevConversionRate: number;
  leadsByStatus: { status: string; count: number }[];
  leadsByArea: { area: string; count: number }[];
  leadsByChannel: { channel: string; count: number }[];
  scoreDistribution: { range: string; count: number; color: string }[];
  topLawfirms: { name: string; leads: number; value: number }[];
  dailyEvolution: { date: string; total: number; derived: number; won: number }[];
  recentLeads: {
    id: string;
    date: string;
    name: string;
    area: string;
    lawfirm: string | null;
    score: number | null;
    price: number | null;
    status: string;
  }[];
}

export function useDashboardMetrics(period: DatePeriod, customRange?: DateRange) {
  const dateRange = getDateRange(period, customRange);
  const prevRange = getPreviousDateRange(period, customRange);
  
  return useQuery({
    queryKey: ['dashboard-metrics', period, customRange?.start?.toISOString(), customRange?.end?.toISOString()],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Fetch current period leads
      const { data: currentLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*, lead_assignments(lawfirm_id, firm_status, lawfirms(name))')
        .is('archived_at', null)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (leadsError) throw leadsError;

      // Fetch previous period leads for comparison
      const { data: prevLeads, error: prevError } = await supabase
        .from('leads')
        .select('id, price_final, status_internal')
        .is('archived_at', null)
        .gte('created_at', prevRange.start.toISOString())
        .lte('created_at', prevRange.end.toISOString());
      
      if (prevError) throw prevError;

      // Calculate current period metrics
      const leads = currentLeads || [];
      const totalLeads = leads.length;
      const totalValue = leads.reduce((sum, l) => sum + (l.price_final || 0), 0);
      
      // Count "won" leads - leads with assignments that have firm_status = 'won'
      const leadsWon = leads.filter(l => {
        const assignments = l.lead_assignments as any[];
        return assignments?.some(a => a.firm_status === 'won');
      }).length;
      
      const conversionRate = totalLeads > 0 ? (leadsWon / totalLeads) * 100 : 0;

      // Previous period metrics
      const prev = prevLeads || [];
      const prevTotalLeads = prev.length;
      const prevTotalValue = prev.reduce((sum, l) => sum + (l.price_final || 0), 0);
      const prevLeadsWon = 0; // Simplified - would need join
      const prevConversionRate = prevTotalLeads > 0 ? (prevLeadsWon / prevTotalLeads) * 100 : 0;

      // Leads by status
      const statusCounts: Record<string, number> = {};
      leads.forEach(l => {
        const status = l.status_internal || 'Pendiente';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const leadsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      // Leads by area
      const areaCounts: Record<string, number> = {};
      leads.forEach(l => {
        const fields = l.structured_fields as any;
        const area = fields?.area_legal || 'Sin clasificar';
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
      const leadsByArea = Object.entries(areaCounts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Leads by channel
      const channelCounts: Record<string, number> = {};
      leads.forEach(l => {
        const channel = l.source_channel || 'Otro';
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      });
      const leadsByChannel = Object.entries(channelCounts).map(([channel, count]) => ({ channel, count }));

      // Score distribution
      const scoreRanges = [
        { range: '0-30', min: 0, max: 30, color: 'hsl(0, 84%, 60%)' },
        { range: '31-50', min: 31, max: 50, color: 'hsl(38, 92%, 50%)' },
        { range: '51-70', min: 51, max: 70, color: 'hsl(48, 96%, 53%)' },
        { range: '71-100', min: 71, max: 100, color: 'hsl(142, 71%, 45%)' },
      ];
      
      const scoreDistribution = scoreRanges.map(({ range, min, max, color }) => ({
        range,
        count: leads.filter(l => l.score_final !== null && l.score_final >= min && l.score_final <= max).length,
        color,
      }));

      // Top lawfirms
      const lawfirmStats: Record<string, { name: string; leads: number; value: number }> = {};
      leads.forEach(l => {
        const assignments = l.lead_assignments as any[];
        assignments?.forEach(a => {
          if (a.lawfirms?.name) {
            const name = a.lawfirms.name;
            if (!lawfirmStats[name]) {
              lawfirmStats[name] = { name, leads: 0, value: 0 };
            }
            lawfirmStats[name].leads += 1;
            lawfirmStats[name].value += l.price_final || 0;
          }
        });
      });
      const topLawfirms = Object.values(lawfirmStats)
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);

      // Daily evolution
      const dailyStats: Record<string, { total: number; derived: number; won: number }> = {};
      leads.forEach(l => {
        const date = l.created_at.split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { total: 0, derived: 0, won: 0 };
        }
        dailyStats[date].total += 1;
        if (l.status_internal === 'Derivado') {
          dailyStats[date].derived += 1;
        }
        const assignments = l.lead_assignments as any[];
        if (assignments?.some(a => a.firm_status === 'won')) {
          dailyStats[date].won += 1;
        }
      });
      const dailyEvolution = Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Recent leads
      const recentLeads = leads
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(l => {
          const fields = l.structured_fields as any;
          const assignments = l.lead_assignments as any[];
          const lawfirm = assignments?.[0]?.lawfirms?.name || null;
          
          return {
            id: l.id,
            date: l.created_at,
            name: [fields?.nombre, fields?.apellidos].filter(Boolean).join(' ') || 'Sin nombre',
            area: fields?.area_legal || '-',
            lawfirm,
            score: l.score_final,
            price: l.price_final,
            status: l.status_internal || 'Pendiente',
          };
        });

      return {
        totalLeads,
        totalValue,
        leadsWon,
        conversionRate,
        prevTotalLeads,
        prevTotalValue,
        prevLeadsWon,
        prevConversionRate,
        leadsByStatus,
        leadsByArea,
        leadsByChannel,
        scoreDistribution,
        topLawfirms,
        dailyEvolution,
        recentLeads,
      };
    },
  });
}
