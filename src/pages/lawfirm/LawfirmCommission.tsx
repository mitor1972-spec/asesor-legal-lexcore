import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { 
  Percent, Scale, Info, Briefcase, TrendingUp, 
  ArrowRight, Loader2, ShoppingCart, DollarSign, 
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

export default function LawfirmCommission() {
  const { user } = useAuthContext();
  const { isImpersonating, impersonatedLawfirm } = useImpersonation();
  const navigate = useNavigate();
  const lawfirmId = isImpersonating ? impersonatedLawfirm?.id : user?.profile?.lawfirm_id;

  // Fetch commissionable specialties from master config
  const { data: commissionSpecialties, isLoading: loadingSpecialties } = useQuery({
    queryKey: ['commission-specialties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_specialties')
        .select('id, name, commission_allowed, default_commission_percent, is_active, sort_order')
        .eq('is_active', true)
        .eq('commission_allowed', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch lawfirm's commission cases
  const { data: commissionCases, isLoading: loadingCases } = useQuery({
    queryKey: ['commission-cases', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return [];
      const { data, error } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          firm_status,
          client_fee,
          claimed_amount,
          won_amount,
          won_percentage,
          success_percentage,
          commission_percent,
          assigned_at,
          result_amount,
          result_notes,
          leads(
            structured_fields,
            score_final,
            case_summary
          )
        `)
        .eq('lawfirm_id', lawfirmId)
        .eq('is_commission', true)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lawfirmId,
  });

  // Compute commission financial summary
  const stats = {
    totalCases: commissionCases?.length || 0,
    activeCases: commissionCases?.filter(c => !['won', 'lost'].includes(c.firm_status || '')).length || 0,
    wonCases: commissionCases?.filter(c => c.firm_status === 'won').length || 0,
    lostCases: commissionCases?.filter(c => c.firm_status === 'lost').length || 0,
    totalMinutas: commissionCases?.reduce((sum, c) => sum + (c.client_fee || 0), 0) || 0,
    totalExito: commissionCases?.reduce((sum, c) => sum + (c.won_amount || 0), 0) || 0,
    totalCommissionOwed: commissionCases?.reduce((sum, c) => {
      const pct = (c.commission_percent || 20) / 100;
      const minutaComm = (c.client_fee || 0) * pct;
      const exitoComm = (c.won_amount || 0) * pct;
      return sum + minutaComm + exitoComm;
    }, 0) || 0,
  };

  const isLoading = loadingSpecialties || loadingCases;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'won':
        return <Badge className="bg-green-600">Ganado</Badge>;
      case 'lost':
        return <Badge variant="destructive">Perdido</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600">En curso</Badge>;
      case 'contacted':
        return <Badge variant="secondary">Contactado</Badge>;
      case 'accepted':
        return <Badge className="bg-lawfirm-primary">Aceptado</Badge>;
      default:
        return <Badge variant="outline">Recibido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-green-600" />
            Casos a Comisión
          </h1>
          <p className="text-muted-foreground">
            Adquiere leads sin coste inicial — solo pagas un % sobre los honorarios cobrados
          </p>
        </div>
        <Button onClick={() => navigate('/despacho/leadsmarket')} className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Ir al LeadMarket
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCases}</p>
                <p className="text-xs text-muted-foreground">Total casos comisión</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCases}</p>
                <p className="text-xs text-muted-foreground">Casos activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.wonCases}</p>
                <p className="text-xs text-muted-foreground">Casos ganados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCommissionOwed.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground">Comisión acumulada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      {stats.totalCases > 0 && (
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Resumen financiero de comisiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total minutas cobradas</p>
                <p className="text-2xl font-bold">{stats.totalMinutas.toFixed(2)}€</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total éxito obtenido</p>
                <p className="text-2xl font-bold">{stats.totalExito.toFixed(2)}€</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Comisión total a pagar</p>
                <p className="text-2xl font-bold text-amber-600">{stats.totalCommissionOwed.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-green-600" />
            ¿Cómo funciona el modelo a comisión?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold flex-shrink-0">1</div>
              <div className="space-y-1">
                <p className="font-semibold">Adquiere el lead gratis</p>
                <p className="text-sm text-muted-foreground">
                  En el LeadMarket, activa el interruptor "Modelo comisión" en el carrito. El lead se añade a tus casos sin coste.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold flex-shrink-0">2</div>
              <div className="space-y-1">
                <p className="font-semibold">Gestiona el caso</p>
                <p className="text-sm text-muted-foreground">
                  Trabaja el caso normalmente. Registra la minuta (honorarios fijos) y, si aplica, el porcentaje de éxito acordado.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold flex-shrink-0">3</div>
              <div className="space-y-1">
                <p className="font-semibold">Paga solo si cobras</p>
                <p className="text-sm text-muted-foreground">
                  Se aplica la comisión sobre la minuta cobrada al cliente y sobre el porcentaje de éxito obtenido. Si no cobras, no pagas.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available commission specialties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-lawfirm-primary" />
            Especialidades disponibles a comisión
          </CardTitle>
          <CardDescription>
            Solo los leads de estas especialidades permiten adquisición en modelo comisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!commissionSpecialties || commissionSpecialties.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay especialidades comisionables configuradas actualmente.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {commissionSpecialties.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Scale className="h-5 w-5 text-lawfirm-primary" />
                    <span className="font-medium">{spec.name}</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">
                    {spec.default_commission_percent ?? 20}% comisión
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission cases list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-lawfirm-primary" />
            Mis casos a comisión
          </CardTitle>
          <CardDescription>
            Casos adquiridos con el modelo de comisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissionCases && commissionCases.length > 0 ? (
            <div className="space-y-3">
              {commissionCases.map((c) => {
                const lead = c.leads as any;
                const fields = lead?.structured_fields || {};
                const area = fields.area_legal || fields.legal_area || 'Sin área';
                const province = fields.provincia || fields.province || '—';
                const commPct = c.commission_percent || 20;
                const minutaComm = (c.client_fee || 0) * (commPct / 100);
                const exitoComm = (c.won_amount || 0) * (commPct / 100);
                const totalComm = minutaComm + exitoComm;

                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/despacho/casos/${c.lead_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                        <Percent className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{area}</p>
                          {getStatusBadge(c.firm_status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{province} · Comisión: {commPct}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm flex-shrink-0">
                      <div className="text-right">
                        <p className="text-muted-foreground">Minuta</p>
                        <p className="font-medium">{(c.client_fee || 0).toFixed(0)}€</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Éxito</p>
                        <p className="font-medium">{(c.won_amount || 0).toFixed(0)}€</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="text-right">
                        <p className="text-muted-foreground">Comisión</p>
                        <p className="font-bold text-amber-600">{totalComm.toFixed(0)}€</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Percent className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Aún no tienes casos a comisión</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ve al LeadMarket, activa "Modelo comisión" en el carrito para leads de áreas elegibles
              </p>
              <Button 
                variant="outline" 
                className="mt-4 gap-2"
                onClick={() => navigate('/despacho/leadsmarket')}
              >
                <ShoppingCart className="h-4 w-4" />
                Explorar LeadMarket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info footer */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Comisión sobre honorarios:</strong> Se aplica el porcentaje indicado sobre la minuta (honorarios fijos) cobrada al cliente.
              </p>
              <p>
                <strong>Comisión sobre éxito:</strong> Si el caso tiene componente de éxito (variable), también se aplica el porcentaje sobre lo obtenido.
              </p>
              <p>
                Las comisiones se liquidan mensualmente. Contacta con soporte para cualquier consulta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
