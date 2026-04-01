import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, LayoutDashboard, BarChart3, Radar, ShoppingCart, Briefcase,
  Phone, Mail, Globe, ArrowRight, Loader2, Building2, Sparkles,
  Shield, Zap, TrendingUp, Users, CheckCircle2, Star
} from 'lucide-react';
import heroBg from '@/assets/portada-hero-bg.jpg';

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
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const features = [
    { icon: Zap, title: 'Leads cualificados', desc: 'Casos verificados con scoring IA' },
    { icon: Shield, title: 'Sin riesgo', desc: 'Modelo a comisión disponible' },
    { icon: TrendingUp, title: 'Crecimiento', desc: 'Nuevos clientes cada día' },
    { icon: Sparkles, title: 'IA avanzada', desc: 'Valoración automática de casos' },
  ];

  const quickLinks = [
    { label: 'Dashboard', description: 'Métricas, oportunidades y CRM', icon: LayoutDashboard, href: '/despacho/dashboard', color: 'bg-blue-500' },
    { label: 'LeadMarket', description: 'Compra leads cualificados', icon: ShoppingCart, href: '/despacho/leadsmarket', color: 'bg-emerald-500' },
    { label: 'Mis Casos', description: 'Gestiona tu cartera', icon: Briefcase, href: '/despacho/casos', color: 'bg-violet-500' },
    { label: 'Informes', description: 'Análisis de rendimiento', icon: BarChart3, href: '/despacho/informes', color: 'bg-amber-500' },
    { label: 'Radar', description: 'Alertas personalizadas', icon: Radar, href: '/despacho/radar', color: 'bg-orange-500' },
    { label: 'Equipo', description: 'Gestión de abogados', icon: Users, href: '/despacho/equipo', color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in -m-6">
      {/* Hero Section with background image */}
      <div className="relative overflow-hidden min-h-[420px] flex items-center">
        <img 
          src={heroBg} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={800}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        
        <div className="relative z-10 w-full px-8 md:px-12 py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 max-w-6xl">
            {/* Left: Brand + Headline */}
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10">
                  <Scale className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                    Asesor.Legal
                  </h1>
                  <p className="text-white/60 text-sm font-medium tracking-wide">
                    IA aplicada a contactos jurídicos
                  </p>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Bienvenido al mejor<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">
                  marketplace de casos jurídicos
                </span>
                <br />de España
              </h2>

              <div className="flex items-center gap-4">
                <Button 
                  size="lg"
                  className="bg-lawfirm-primary hover:bg-lawfirm-primary/90 text-white shadow-lg shadow-lawfirm-primary/30"
                  onClick={() => navigate('/despacho/dashboard')}
                >
                  Ir al Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  className="bg-white text-lawfirm-primary hover:bg-white/90 font-semibold shadow-lg"
                  onClick={() => navigate('/despacho/leadsmarket')}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ver Leads
                </Button>
              </div>
            </div>

            {/* Right: Lawfirm Card + Stats */}
            <div className="space-y-4 w-full lg:w-auto lg:min-w-[320px]">
              {lawfirm && (
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white shadow-2xl">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/20 rounded-lg">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight">{lawfirm.name}</p>
                        {lawfirm.province && (
                          <p className="text-white/60 text-sm">{lawfirm.city ? `${lawfirm.city}, ` : ''}{lawfirm.province}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{stats?.marketplaceCount || 0}</p>
                        <p className="text-[11px] text-white/60">Leads activos</p>
                      </div>
                      <div className="text-center border-x border-white/20">
                        <p className="text-2xl font-bold">{stats?.totalCases || 0}</p>
                        <p className="text-[11px] text-white/60">Tus casos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{lawfirm.marketplace_balance?.toFixed(0) || '0'}€</p>
                        <p className="text-[11px] text-white/60">Crédito</p>
                      </div>
                    </div>
                    {lawfirm.contact_person && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                          {lawfirm.contact_person.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lawfirm.contact_person}</p>
                          <p className="text-[11px] text-white/60">Responsable</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Strip */}
      <div className="px-6 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border">
              <div className="p-2 rounded-lg bg-lawfirm-primary/10 shrink-0">
                <f.icon className="h-5 w-5 text-lawfirm-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="px-6 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-display font-bold">Acceso rápido</h3>
          <Badge variant="outline" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {lawfirm?.is_active ? 'Despacho activo' : 'Despacho inactivo'}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Card
              key={link.label}
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 border hover:border-lawfirm-primary/30 overflow-hidden"
              onClick={() => navigate(link.href)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${link.color} text-white shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <link.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{link.label}</p>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact + Brand Section */}
      <div className="px-6 md:px-8 pb-8">
        <Card className="overflow-hidden border-2">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-5">
              {/* Left: Brand (3 cols) */}
              <div className="md:col-span-3 p-8 md:p-10 bg-gradient-to-br from-muted/30 to-muted/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-600/30">
                    <Scale className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold">Asesor.Legal</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lawfirm-primary font-medium text-sm">Powered by Lexcore™</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
                  Plataforma líder en captación y distribución inteligente de casos jurídicos. 
                  Tecnología de IA aplicada para conectar clientes con los mejores despachos de España.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Inteligencia Artificial', href: '/despacho/ia-servicios' },
                    { label: 'Scoring Legal', href: '/despacho/radar' },
                    { label: 'Marketplace', href: '/despacho/leadsmarket' },
                    { label: 'CRM Jurídico', href: '/despacho/casos' },
                  ].map(tag => (
                    <Badge
                      key={tag.label}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-lawfirm-primary hover:text-white transition-colors"
                      onClick={() => navigate(tag.href)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Right: Contact (2 cols) */}
              <div className="md:col-span-2 p-8 md:p-10 border-t md:border-t-0 md:border-l space-y-6">
                <h4 className="font-semibold text-lg">Datos de contacto</h4>
                <div className="space-y-4">
                  <a href="tel:+34668510087" className="flex items-center gap-4 group hover:text-lawfirm-primary transition-colors">
                    <div className="p-2.5 rounded-lg bg-lawfirm-primary/10 group-hover:bg-lawfirm-primary/20 transition-colors">
                      <Phone className="h-5 w-5 text-lawfirm-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                      <p className="font-semibold">668 51 00 87</p>
                    </div>
                  </a>
                  <a href="mailto:info@asesor.legal" className="flex items-center gap-4 group hover:text-lawfirm-primary transition-colors">
                    <div className="p-2.5 rounded-lg bg-lawfirm-primary/10 group-hover:bg-lawfirm-primary/20 transition-colors">
                      <Mail className="h-5 w-5 text-lawfirm-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-semibold">info@asesor.legal</p>
                    </div>
                  </a>
                  <a href="https://www.asesor.legal" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group hover:text-lawfirm-primary transition-colors">
                    <div className="p-2.5 rounded-lg bg-lawfirm-primary/10 group-hover:bg-lawfirm-primary/20 transition-colors">
                      <Globe className="h-5 w-5 text-lawfirm-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Web</p>
                      <p className="font-semibold">www.Asesor.Legal</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
