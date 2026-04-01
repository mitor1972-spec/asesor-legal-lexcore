import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, ShoppingCart, Briefcase, BarChart3, Radar, 
  ArrowRight, TrendingUp, Users, Loader2 
} from 'lucide-react';

export default function LawfirmPortada() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['portada-stats', lawfirm?.id],
    queryFn: async () => {
      if (!lawfirm?.id) return null;
      const [marketplace, cases] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_in_marketplace', true),
        supabase.from('lead_assignments').select('*', { count: 'exact', head: true }).eq('lawfirm_id', lawfirm.id),
      ]);
      return {
        marketplaceCount: marketplace.count || 0,
        totalCases: cases.count || 0,
      };
    },
    enabled: !!lawfirm?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const quickActions = [
    { label: 'Ver LeadMarket', icon: ShoppingCart, href: '/despacho/leadsmarket', color: 'text-blue-600' },
    { label: 'Mis Casos', icon: Briefcase, href: '/despacho/casos', color: 'text-green-600' },
    { label: 'Dashboard', icon: BarChart3, href: '/despacho/dashboard', color: 'text-purple-600' },
    { label: 'Radar', icon: Radar, href: '/despacho/radar', color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-lawfirm-primary/10 to-transparent rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-lawfirm-primary rounded-xl">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">
              Bienvenido, {lawfirm?.contact_person || lawfirm?.name}
            </h1>
            <p className="text-muted-foreground text-lg">
              {lawfirm?.name} — Portal del Despacho
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-lawfirm-primary">{stats?.marketplaceCount || 0}</p>
            <p className="text-sm text-muted-foreground">Leads disponibles</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-lawfirm-primary">{stats?.totalCases || 0}</p>
            <p className="text-sm text-muted-foreground">Tus casos</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-lawfirm-primary">
              {lawfirm?.marketplace_balance?.toFixed(0) || '0'}€
            </p>
            <p className="text-sm text-muted-foreground">Crédito disponible</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Acceso rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.label} 
              className="cursor-pointer hover:shadow-md transition-all hover:border-lawfirm-primary/30 group"
              onClick={() => navigate(action.href)}
            >
              <CardContent className="pt-6 text-center">
                <action.icon className={`h-8 w-8 mx-auto mb-3 ${action.color} group-hover:scale-110 transition-transform`} />
                <p className="font-medium">{action.label}</p>
                <ArrowRight className="h-4 w-4 mx-auto mt-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-lawfirm-primary" />
              Novedades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="mt-0.5">Nuevo</Badge>
              <div>
                <p className="font-medium text-sm">LeadMarket mejorado</p>
                <p className="text-sm text-muted-foreground">Filtros avanzados y compra rápida de leads</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="mt-0.5">Nuevo</Badge>
              <div>
                <p className="font-medium text-sm">Radar de oportunidades</p>
                <p className="text-sm text-muted-foreground">Configura alertas personalizadas para nuevos leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-lawfirm-primary" />
              Tu despacho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Provincia</span>
              <span className="font-medium">{lawfirm?.province || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Áreas</span>
              <span className="font-medium">{lawfirm?.areas_accepted?.length || 0} áreas configuradas</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={lawfirm?.is_active ? 'default' : 'secondary'}>
                {lawfirm?.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => navigate('/despacho/configuracion')}
            >
              Ver configuración completa
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
