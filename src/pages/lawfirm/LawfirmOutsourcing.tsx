import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Handshake, 
  Users, 
  Zap, 
  TrendingUp, 
  Target, 
  Calendar, 
  FileText,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Award,
  BarChart3,
  Clock,
  Shield,
  Star
} from 'lucide-react';

export default function LawfirmOutsourcing() {
  const openContactForm = () => {
    window.open('https://elite-work.com/contacto', '_blank');
  };

  const whatsappContact = () => {
    window.open('https://wa.me/34600000000?text=Hola,%20me%20interesa%20el%20servicio%20de%20outsourcing%20comercial%20para%20mi%20despacho', '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-lawfirm-primary to-lawfirm-primary/70 rounded-xl">
            <Handshake className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Outsourcing Comercial</h1>
            <p className="text-muted-foreground">
              Servicio premium de captación de clientes B2B para despachos
            </p>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <Card className="bg-gradient-to-r from-lawfirm-primary/10 via-lawfirm-primary/5 to-transparent border-lawfirm-primary/20">
        <CardContent className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-lawfirm-primary">+150</p>
              <p className="text-sm text-muted-foreground">Despachos clientes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-lawfirm-primary">+2.500</p>
              <p className="text-sm text-muted-foreground">Reuniones concertadas/año</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-lawfirm-primary">85%</p>
              <p className="text-sm text-muted-foreground">Tasa de retención</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-lawfirm-primary">12</p>
              <p className="text-sm text-muted-foreground">Años de experiencia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Services Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dedicated Sales Team */}
        <Card className="border-2 hover:border-lawfirm-primary/50 hover:shadow-xl transition-all group">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-lawfirm-primary to-lawfirm-primary/70 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="text-right">
                <Badge className="bg-lawfirm-primary text-white text-lg px-3 py-1">
                  Desde 990€/mes
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Sin permanencia</p>
              </div>
            </div>
            <CardTitle className="text-2xl mt-4 flex items-center gap-2">
              <span>👔</span> Comerciales Dedicados
            </CardTitle>
            <CardDescription className="text-base">
              Equipo de comerciales senior dedicados exclusivamente a la captación de clientes empresariales para tu despacho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Incluye:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Base de datos de empresas segmentada por sector y tamaño</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Llamadas de prospección con argumentario personalizado</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Concertación de reuniones con decisores (mínimo 8/mes)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>CRM dedicado con seguimiento en tiempo real</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Reporting semanal + reunión mensual de seguimiento</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">💡 Ideal para:</p>
              <p className="text-sm text-muted-foreground">
                Despachos que quieren un flujo constante de nuevos clientes corporativos sin tener que gestionar un equipo comercial interno.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={openContactForm} 
                className="flex-1 gap-2"
                size="lg"
              >
                Solicitar propuesta
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                onClick={whatsappContact} 
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Punctual Sales Forces */}
        <Card className="border-2 hover:border-amber-500/50 hover:shadow-xl transition-all group">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div className="text-right">
                <Badge className="bg-amber-500 text-white text-lg px-3 py-1">
                  Desde 1.500€/campaña
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Duración flexible</p>
              </div>
            </div>
            <CardTitle className="text-2xl mt-4 flex items-center gap-2">
              <span>⚡</span> Fuerzas de Ventas Puntuales
            </CardTitle>
            <CardDescription className="text-base">
              Equipos comerciales de alto rendimiento para campañas específicas, lanzamientos o picos de demanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Casos de uso:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <span>Lanzamiento de nuevas áreas de práctica</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <span>Campañas sectoriales (PYMES, startups, franquicias...)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <span>Expansión a nuevas ciudades o provincias</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <span>Cobertura de vacaciones o bajas del equipo</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <span>Sprints de ventas para cumplir objetivos trimestrales</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">⏱️ Duración típica:</p>
              <p className="text-sm text-muted-foreground">
                Campañas de 2 a 12 semanas con objetivos claros y medibles. Resultados desde la primera semana.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={openContactForm} 
                variant="outline"
                className="flex-1 gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                size="lg"
              >
                Diseñar campaña
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                onClick={whatsappContact} 
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Services */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-lawfirm-primary" />
          Servicios Complementarios
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Auditoría Comercial</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Análisis de tu proceso de ventas actual y propuestas de mejora.
                  </p>
                  <p className="text-sm font-medium text-blue-600 mt-2">Desde 490€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Formación Comercial</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Capacitación de tu equipo en técnicas de venta consultiva legal.
                  </p>
                  <p className="text-sm font-medium text-purple-600 mt-2">Desde 750€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                  <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Email Marketing B2B</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Campañas de email automatizadas para nurturing de leads.
                  </p>
                  <p className="text-sm font-medium text-green-600 mt-2">Desde 390€/mes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Why Elite Work */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-lawfirm-primary" />
            ¿Por qué Elite Work?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Especialización Legal</p>
                <p className="text-sm text-muted-foreground">12 años trabajando exclusivamente con despachos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-lawfirm-primary mt-0.5" />
              <div>
                <p className="font-medium">Sin Permanencia</p>
                <p className="text-sm text-muted-foreground">Flexibilidad total, cancela cuando quieras</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Resultados Medibles</p>
                <p className="text-sm text-muted-foreground">KPIs claros y reporting transparente</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Equipo Senior</p>
                <p className="text-sm text-muted-foreground">Comerciales con +5 años de experiencia</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Footer */}
      <Card className="bg-gradient-to-r from-lawfirm-primary to-lawfirm-primary/80 text-white">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Handshake className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">¿Listo para crecer?</p>
                <p className="text-white/80">
                  Agenda una llamada de 15 minutos sin compromiso
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={openContactForm}
                size="lg"
                variant="secondary"
                className="gap-2 bg-white text-lawfirm-primary hover:bg-white/90"
              >
                Agendar llamada
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="gap-2 border-white/30 text-white hover:bg-white/10"
                onClick={() => window.open('https://elite-work.com', '_blank')}
              >
                elite-work.com
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
