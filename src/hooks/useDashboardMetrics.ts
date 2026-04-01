import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subWeeks, subMonths, subQuarters, subYears } from 'date-fns';
import { applyVisibleLeadsFilters } from '@/lib/leadsQuery';

export type DatePeriod = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(period: DatePeriod, customRange?: DateRange): DateRange {
  const now = new Date();
  switch (period) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'month': return { start: startOfMonth(now), end: endOfDay(now) };
    case 'quarter': return { start: startOfQuarter(now), end: endOfDay(now) };
    case 'year': return { start: startOfYear(now), end: endOfDay(now) };
    case 'all': return { start: new Date('2020-01-01'), end: endOfDay(now) };
    case 'custom': return customRange || { start: startOfMonth(now), end: endOfDay(now) };
    default: return { start: startOfMonth(now), end: endOfDay(now) };
  }
}

export function getPreviousDateRange(period: DatePeriod, customRange?: DateRange): DateRange {
  const current = getDateRange(period, customRange);
  switch (period) {
    case 'today': return { start: startOfDay(subDays(current.start, 1)), end: endOfDay(subDays(current.end, 1)) };
    case 'week': return { start: subWeeks(current.start, 1), end: subWeeks(current.end, 1) };
    case 'month': return { start: subMonths(current.start, 1), end: subMonths(current.end, 1) };
    case 'quarter': return { start: subQuarters(current.start, 1), end: subQuarters(current.end, 1) };
    case 'year': return { start: subYears(current.start, 1), end: subYears(current.end, 1) };
    case 'all': return { start: new Date('2019-01-01'), end: new Date('2019-12-31') };
    case 'custom': {
      const diff = current.end.getTime() - current.start.getTime();
      return { start: new Date(current.start.getTime() - diff - 1), end: new Date(current.end.getTime() - diff - 1) };
    }
    default: return { start: subMonths(current.start, 1), end: subMonths(current.end, 1) };
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
    id: string; date: string; name: string; area: string;
    lawfirm: string | null; score: number | null; price: number | null; status: string;
  }[];
}

function getLeadCommercialValue(lead: { marketplace_price?: number | null; price_final?: number | null; score_final?: number | null }) {
  const persistedValue = [lead.marketplace_price, lead.price_final].find(
    (value): value is number => typeof value === 'number' && value > 0
  );

  if (persistedValue !== undefined) return persistedValue;

  const score = lead.score_final;
  if (typeof score === 'number') {
    if (score >= 80) return 75;
    if (score >= 65) return 55;
    if (score >= 50) return 40;
    if (score >= 35) return 30;
    if (score >= 20) return 20;
    if (score > 0) return 10;
  }

  return 5;
}

export function useDashboardMetrics(period: DatePeriod, customRange?: DateRange) {
  const dateRange = getDateRange(period, customRange);
  const prevRange = getPreviousDateRange(period, customRange);
  
  return useQuery({
    queryKey: ['dashboard-metrics', period, customRange?.start?.toISOString(), customRange?.end?.toISOString()],
    queryFn: async (): Promise<DashboardMetrics> => {
      let currentQuery = supabase
        .from('leads')
        .select('*, lead_assignments(lawfirm_id, firm_status, lawfirms(name))');
      
      currentQuery = applyVisibleLeadsFilters(currentQuery, {
        demoMode: 'real',
        dateFrom: dateRange.start,
        dateTo: dateRange.end,
      });
      
      const { data: currentLeads, error: leadsError } = await currentQuery;
      if (leadsError) throw leadsError;

      let prevQuery = supabase.from('leads').select('id, marketplace_price, price_final, score_final, status_internal');
      prevQuery = applyVisibleLeadsFilters(prevQuery, {
        demoMode: 'real',
        dateFrom: prevRange.start,
        dateTo: prevRange.end,
      });
      
      const { data: prevLeads, error: prevError } = await prevQuery;
      if (prevError) throw prevError;

      const leads = currentLeads || [];
      const totalLeads = leads.length;
      const totalValue = leads.reduce((sum, l) => sum + getLeadCommercialValue(l), 0);
      const leadsWon = leads.filter(l => {
        const assignments = l.lead_assignments as any[];
        return assignments?.some(a => a.firm_status === 'won');
      }).length;
      const conversionRate = totalLeads > 0 ? (leadsWon / totalLeads) * 100 : 0;

      const prev = prevLeads || [];
      const prevTotalLeads = prev.length;
      const prevTotalValue = prev.reduce((sum, l) => sum + getLeadCommercialValue(l), 0);
      const prevLeadsWon = 0;
      const prevConversionRate = prevTotalLeads > 0 ? (prevLeadsWon / prevTotalLeads) * 100 : 0;

      const statusCounts: Record<string, number> = {};
      leads.forEach(l => { const s = l.status_internal || 'Pendiente'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
      const leadsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      const areaCounts: Record<string, number> = {};
      leads.forEach(l => { const f = l.structured_fields as any; const a = f?.area_legal || 'Sin clasificar'; areaCounts[a] = (areaCounts[a] || 0) + 1; });
      const leadsByArea = Object.entries(areaCounts).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count).slice(0, 10);

      const channelCounts: Record<string, number> = {};
      leads.forEach(l => { const c = l.source_channel || 'Otro'; channelCounts[c] = (channelCounts[c] || 0) + 1; });
      const leadsByChannel = Object.entries(channelCounts).map(([channel, count]) => ({ channel, count }));

      const scoreRanges = [
        { range: '0-30', min: 0, max: 30, color: 'hsl(0, 84%, 60%)' },
        { range: '31-50', min: 31, max: 50, color: 'hsl(38, 92%, 50%)' },
        { range: '51-70', min: 51, max: 70, color: 'hsl(48, 96%, 53%)' },
        { range: '71-100', min: 71, max: 100, color: 'hsl(142, 71%, 45%)' },
      ];
      const scoreDistribution = scoreRanges.map(({ range, min, max, color }) => ({
        range, count: leads.filter(l => l.score_final !== null && l.score_final >= min && l.score_final <= max).length, color,
      }));

      const lawfirmStats: Record<string, { name: string; leads: number; value: number }> = {};
      leads.forEach(l => {
        const assignments = l.lead_assignments as any[];
        assignments?.forEach(a => {
          if (a.lawfirms?.name) {
            const name = a.lawfirms.name;
            if (!lawfirmStats[name]) lawfirmStats[name] = { name, leads: 0, value: 0 };
            lawfirmStats[name].leads += 1;
            lawfirmStats[name].value += getLeadCommercialValue(l);
          }
        });
      });
      const topLawfirms = Object.values(lawfirmStats).sort((a, b) => b.leads - a.leads).slice(0, 5);

      const dailyStats: Record<string, { total: number; derived: number; won: number }> = {};
      leads.forEach(l => {
        const date = l.created_at.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = { total: 0, derived: 0, won: 0 };
        dailyStats[date].total += 1;
        if (l.status_internal === 'Enviado') dailyStats[date].derived += 1;
        const assignments = l.lead_assignments as any[];
        if (assignments?.some(a => a.firm_status === 'won')) dailyStats[date].won += 1;
      });
      const dailyEvolution = Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats })).sort((a, b) => a.date.localeCompare(b.date));

      const recentLeads = leads
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(l => {
          const fields = l.structured_fields as any;
          const assignments = l.lead_assignments as any[];
          const lawfirm = assignments?.[0]?.lawfirms?.name || null;
          const nameParts = [fields?.nombre, fields?.apellidos].filter(Boolean);
          const name = nameParts.length > 0 ? nameParts.join(' ') : '';
          return { id: l.id, date: l.created_at, name, area: fields?.area_legal || '-', lawfirm, score: l.score_final, price: getLeadCommercialValue(l), status: l.status_internal || 'Pendiente' };
        });

      return { totalLeads, totalValue, leadsWon, conversionRate, prevTotalLeads, prevTotalValue, prevLeadsWon, prevConversionRate, leadsByStatus, leadsByArea, leadsByChannel, scoreDistribution, topLawfirms, dailyEvolution, recentLeads };
    },
  });
}