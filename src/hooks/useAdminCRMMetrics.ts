import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDateRange, type DatePeriod } from '@/hooks/useDashboardMetrics';
import type { AdminCRMData, LawfirmAlert } from '@/components/dashboard/AdminCRMWidgets';

interface DateRange { start: Date; end: Date }

export function useAdminCRMMetrics(period: DatePeriod, customRange?: DateRange) {
  const dateRange = getDateRange(period, customRange);

  return useQuery({
    queryKey: ['admin-crm-metrics', period, customRange?.start?.toISOString(), customRange?.end?.toISOString()],
    queryFn: async (): Promise<AdminCRMData> => {
      // All lawfirms (non-demo)
      const { data: allLawfirms, error: lfErr } = await supabase
        .from('lawfirms')
        .select('id, name, created_at, registration_type, onboarding_completed, contact_email, province, interested_in_advertising, credit_line_status, credit_line_amount, settings_json, status, is_active')
        .or('is_demo.is.null,is_demo.eq.false')
        .order('created_at', { ascending: false });

      if (lfErr) throw lfErr;

      const lawfirms = allLawfirms || [];
      const totalLawfirms = lawfirms.length;

      // Filter by period
      const periodLawfirms = lawfirms.filter(lf => {
        const d = new Date(lf.created_at!);
        return d >= dateRange.start && d <= dateRange.end;
      });

      const newLawfirms = periodLawfirms.length;
      const pendingOnboarding = lawfirms.filter(lf => !lf.onboarding_completed).length;
      const creditRequests = lawfirms.filter(lf => lf.credit_line_status === 'requested').length;
      const adInterests = lawfirms.filter(lf => lf.interested_in_advertising === true).length;

      // Recent lawfirms (period-scoped, max 10)
      const recentLawfirms = periodLawfirms.slice(0, 10).map(lf => ({
        id: lf.id,
        name: lf.name,
        createdAt: lf.created_at!,
        registrationType: lf.registration_type,
        onboardingCompleted: lf.onboarding_completed ?? false,
        contactEmail: lf.contact_email,
        province: lf.province,
      }));

      // Build alerts
      const alerts: LawfirmAlert[] = [];

      // New registrations in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      lawfirms.forEach(lf => {
        const d = new Date(lf.created_at!);
        if (d >= sevenDaysAgo) {
          alerts.push({
            id: lf.id,
            type: 'new_registration',
            lawfirmName: lf.name,
            date: lf.created_at!,
            detail: `Registro ${lf.registration_type === 'full' ? 'completo' : 'rápido'}${lf.province ? ` — ${lf.province}` : ''}`,
          });
        }

        if (lf.credit_line_status === 'requested') {
          alerts.push({
            id: lf.id,
            type: 'credit_request',
            lawfirmName: lf.name,
            date: lf.created_at!,
            detail: `Solicita línea de crédito de ${lf.credit_line_amount?.toLocaleString('es-ES') ?? 500}€`,
          });
        }

        if (lf.interested_in_advertising) {
          const settingsJson = lf.settings_json as Record<string, unknown> | null;
          const adTypes: string[] = [];
          if (settingsJson?.ad_directorio) adTypes.push('Directorio');
          if (settingsJson?.ad_asistente) adTypes.push('IA');
          if (settingsJson?.ad_newsletter) adTypes.push('Newsletter');
          if (settingsJson?.ad_web) adTypes.push('Web');
          alerts.push({
            id: lf.id,
            type: 'ad_interest',
            lawfirmName: lf.name,
            date: lf.created_at!,
            detail: adTypes.length > 0 ? `Interesado en: ${adTypes.join(', ')}` : 'Interesado en publicidad',
          });
        }

        if (!lf.onboarding_completed && d < sevenDaysAgo) {
          alerts.push({
            id: lf.id,
            type: 'profile_incomplete',
            lawfirmName: lf.name,
            date: lf.created_at!,
            detail: 'Perfil no completado — considerar contacto',
          });
        }
      });

      // Sort alerts by date desc
      alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        totalLawfirms,
        newLawfirms,
        pendingOnboarding,
        creditRequests,
        adInterests,
        recentLawfirms,
        alerts: alerts.slice(0, 20),
      };
    },
  });
}
