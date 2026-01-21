import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLawfirmCases } from '@/hooks/useLawfirmCases';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLawfirmProfile, useLawfirmTeam, useLawfirmBranches } from '@/hooks/useLawfirmProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { LeadReference } from '@/components/common/LeadReference';
import { Link } from 'react-router-dom';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowRight,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { 
  CasesByAreaWidget, 
  CasesByProvinceWidget, 
  CasesByBranchWidget, 
  CasesByLawyerWidget, 
  WonCasesTable 
} from '@/components/lawfirm/DashboardWidgets';
import { TopOpportunitiesCard } from '@/components/lawfirm/TopOpportunitiesCard';
import { ImmediateActionsCard } from '@/components/lawfirm/ImmediateActionsCard';
import { AdvancedKPIs } from '@/components/lawfirm/AdvancedKPIs';
import { LeadDetailModal } from '@/components/leadsmarket/LeadDetailModal';
import { toast } from 'sonner';
import type { MarketplaceLead, RawScores } from '@/types/marketplace';

const statusLabels: Record<string, string> = {
  received: 'Recibido',
  reviewing: 'Revisando',
  contacted: 'Contactado',
  in_progress: 'En curso',
  won: 'Ganado',
  lost: 'Perdido',
  rejected: 'Rechazado',
  archived: 'Archivado',
};

const statusColors: Record<string, string> = {
  received: 'hsl(217, 91%, 60%)',
  reviewing: 'hsl(38, 92%, 50%)',
  contacted: 'hsl(280, 67%, 56%)',
  in_progress: 'hsl(217, 91%, 60%)',
  won: 'hsl(142, 71%, 45%)',
  lost: 'hsl(0, 84%, 60%)',
  rejected: 'hsl(0, 0%, 50%)',
  archived: 'hsl(0, 0%, 40%)',
};

export default function LawfirmDashboard() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: lawfirm } = useLawfirmProfile();
  const { data: cases = [], isLoading } = useLawfirmCases();
  const { data: team = [] } = useLawfirmTeam();
  const { data: branches = [] } = useLawfirmBranches();
  
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch available marketplace leads
  const { data: marketplaceLeads = [] } = useQuery({
    queryKey: ['dashboard-opportunities', user?.profile?.lawfirm_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, 
          marketplace_summary, 
          case_summary,
          marketplace_price, 
          price_final,
          score_final, 
          source_channel, 
          created_at, 
          structured_fields,
          conversation_id,
          lead_assignments!left(id),
          lexcore_runs(
            vj_json,
            raw_scores_json,
            llm_response_json
          )
        `)
        .is('archived_at', null)
        .is('discarded_at', null)
        .eq('status_internal', 'Pendiente')
        .or('structured_fields->>email.neq.,structured_fields->>telefono.neq.')
        .order('score_final', { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      
      // Filter unassigned
      const filtered = (data || []).filter(l => 
        !l.lead_assignments || l.lead_assignments.length === 0
      );
      
      return filtered.map(l => {
        const latestRun = l.lexcore_runs?.[0];
        const vjData = latestRun?.vj_json as any;
        const rawScores = latestRun?.raw_scores_json as unknown as RawScores | null;
        const llmResponse = latestRun?.llm_response_json as any;
        
        return {
          id: l.id,
          marketplace_summary: l.marketplace_summary || l.case_summary?.substring(0, 300) || 'Lead disponible',
          marketplace_price: l.marketplace_price || l.price_final || 25,
          score_final: l.score_final || 0,
          source_channel: l.source_channel,
          created_at: l.created_at,
          structured_fields: l.structured_fields || {},
          conversation_id: l.conversation_id,
          vj_value: vjData?.value ?? vjData?.vj ?? null,
          vj_key_phrases: llmResponse?.key_phrases || [],
          raw_scores: rawScores || llmResponse?.raw_scores || null,
          case_summary: l.case_summary,
        } as MarketplaceLead;
      });
    },
    enabled: !!user?.profile?.lawfirm_id,
  });

  const balance = lawfirm?.marketplace_balance || 0;

  // Handle purchase
  const handlePurchase = async (lead: MarketplaceLead) => {
    try {
      const { data, error } = await supabase.functions.invoke('purchase-lead', {
        body: {
          lead_id: lead.id,
          lawfirm_id: user?.profile?.lawfirm_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('¡Lead comprado! Ya tienes acceso completo en "Mis Casos"');
      queryClient.invalidateQueries({ queryKey: ['dashboard-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-balance'] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
    } catch (error) {
      console.error('Error purchasing:', error);
      toast.error('Error al comprar el lead');
    }
  };

  // View details
  const handleViewDetails = (lead: MarketplaceLead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  // Calculate chart data
  const statusCounts = cases.reduce((acc, c) => {
    acc[c.firm_status] = (acc[c.firm_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts)
    .filter(([status]) => ['received', 'reviewing', 'contacted', 'in_progress', 'won', 'lost'].includes(status))
    .map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status]
    }));

  // Recent cases
  const recentCases = cases.slice(0, 5);

  // Team lawyers (for widgets)
  const lawyers = team.map(m => ({ id: m.id, full_name: m.full_name, email: m.email }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            ¡Bienvenido, {user?.profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground">
            {lawfirm?.name || 'Tu despacho'} — Resumen ejecutivo
          </p>
        </div>
        <Card className="bg-gradient-to-r from-lawfirm-primary/10 to-lawfirm-primary/5 border-lawfirm-primary/20">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-lawfirm-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Saldo disponible</p>
              <p className="text-lg font-bold text-lawfirm-primary">{balance.toFixed(2)}€</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunities */}
      <TopOpportunitiesCard 
        leads={marketplaceLeads}
        balance={balance}
        onViewDetails={handleViewDetails}
        onPurchase={handlePurchase}
      />

      {/* Advanced KPIs */}
      <AdvancedKPIs cases={cases} availableLeadsCount={marketplaceLeads.length} />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Actions & Status Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Immediate Actions */}
          <ImmediateActionsCard cases={cases} />
          
          {/* Status Chart */}
          {chartData.length > 0 && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Casos por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Won Cases Table */}
          <WonCasesTable cases={cases} />
        </div>
        
        {/* Right column: Widgets */}
        <div className="space-y-4">
          <CasesByAreaWidget cases={cases} />
          <CasesByProvinceWidget cases={cases} />
          <CasesByBranchWidget cases={cases} branches={branches} />
          <CasesByLawyerWidget cases={cases} lawyers={lawyers} />
        </div>
      </div>

      {/* Recent Cases */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Últimos Casos Recibidos</CardTitle>
          <Link 
            to="/despacho/casos" 
            className="text-sm text-lawfirm-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aún no tienes casos asignados
            </p>
          ) : (
            <div className="space-y-3">
              {recentCases.map((caseItem) => {
                const fields = caseItem.lead?.structured_fields as Record<string, string> | null;
                return (
                  <Link
                    key={caseItem.id}
                    to={`/despacho/casos/${caseItem.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <LeadTemperature 
                        score={caseItem.lead?.score_final || 0} 
                        variant="mini" 
                      />
                      <div>
                        <p className="font-medium">
                          {fields?.nombre || 'Cliente'} — {fields?.area_legal || 'Caso'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {fields?.provincia || 'España'} • {statusLabels[caseItem.firm_status] || caseItem.firm_status}
                        </p>
                        <LeadReference 
                          leadId={caseItem.lead_id}
                          conversationId={caseItem.lead?.conversation_id}
                          chatwootAlias={fields?._contact_alias}
                          variant="compact"
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(caseItem.assigned_at), 'dd/MM/yy', { locale: es })}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLead(null);
        }}
        onAddToCart={handlePurchase}
        isInCart={false}
        canAfford={selectedLead ? balance >= selectedLead.marketplace_price : false}
      />
    </div>
  );
}
