import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, LayoutDashboard, BarChart3, Radar, 
  Phone, Mail, Globe, ArrowRight, Loader2, Building2
} from 'lucide-react';

export default function LawfirmPortada() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const quickLinks = [
    { label: 'Dashboard', description: 'Métricas y oportunidades', icon: LayoutDashboard, href: '/despacho/dashboard', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Informes', description: 'Análisis de rendimiento', icon: BarChart3, href: '/despacho/informes', gradient: 'from-violet-500 to-violet-600' },
    { label: 'Radar', description: 'Alertas personalizadas', icon: Radar, href: '/despacho/radar', gradient: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-lawfirm-primary via-lawfirm-primary/90 to-lawfirm-primary/70 text-white p-8 md:p-12 mb-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex-1 space-y-4">
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Scale className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                  Asesor.Legal
                </h1>
                <p className="text-white/80 text-sm md:text-base font-medium">
                  IA aplicada a contactos jurídicos
                </p>
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-semibold leading-snug max-w-lg">
              Bienvenido al mejor marketplace de casos jurídicos de España
            </h2>
          </div>

          {/* Lawfirm Card */}
          {lawfirm && (
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white min-w-[260px]">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">{lawfirm.name}</p>
                    {lawfirm.province && (
                      <p className="text-white/70 text-sm">{lawfirm.city ? `${lawfirm.city}, ` : ''}{lawfirm.province}</p>
                    )}
                  </div>
                </div>
                {lawfirm.contact_person && (
                  <p className="text-white/80 text-sm border-t border-white/20 pt-2">
                    Responsable: {lawfirm.contact_person}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {quickLinks.map((link) => (
          <Card
            key={link.label}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-lawfirm-primary/30 overflow-hidden"
            onClick={() => navigate(link.href)}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${link.gradient} text-white shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <link.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">{link.label}</p>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Info */}
      <Card className="border-2 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left: Brand */}
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-lawfirm-primary">
                  <Scale className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold">Asesor.Legal</h3>
                  <span className="text-lawfirm-primary font-medium text-sm">Powered by Lexcore™</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Plataforma líder en captación y distribución inteligente de casos jurídicos. 
                Tecnología de IA aplicada para conectar clientes con los mejores despachos de España.
              </p>
            </div>

            {/* Right: Contact Details */}
            <div className="p-8 space-y-5">
              <h4 className="font-semibold text-lg mb-4">Datos de contacto</h4>
              <a href="tel:+34668510087" className="flex items-center gap-4 text-sm group hover:text-lawfirm-primary transition-colors">
                <div className="p-2 rounded-lg bg-muted group-hover:bg-lawfirm-primary/10 transition-colors">
                  <Phone className="h-4 w-4 text-lawfirm-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">668 51 00 87</p>
                </div>
              </a>
              <a href="mailto:info@asesor.legal" className="flex items-center gap-4 text-sm group hover:text-lawfirm-primary transition-colors">
                <div className="p-2 rounded-lg bg-muted group-hover:bg-lawfirm-primary/10 transition-colors">
                  <Mail className="h-4 w-4 text-lawfirm-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">info@asesor.legal</p>
                </div>
              </a>
              <a href="https://www.asesor.legal" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-sm group hover:text-lawfirm-primary transition-colors">
                <div className="p-2 rounded-lg bg-muted group-hover:bg-lawfirm-primary/10 transition-colors">
                  <Globe className="h-4 w-4 text-lawfirm-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Web</p>
                  <p className="font-medium">www.Asesor.Legal</p>
                </div>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
