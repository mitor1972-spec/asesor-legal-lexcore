import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Bot, Mail, Check, Star, Crown, Sparkles, Handshake, TrendingUp, Users, Target, Award, BarChart3 } from 'lucide-react';

interface PlanCardProps {
  name: string;
  price: string;
  priceUnit: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  onContract: () => void;
}

function PlanCard({ name, price, priceUnit, features, highlight, badge, onContract }: PlanCardProps) {
  return (
    <Card className={`relative ${highlight ? 'border-primary shadow-lg' : ''}`}>
      {badge && (
        <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">{badge}</Badge>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{name}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground">/{priceUnit}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button 
          className="w-full" 
          variant={highlight ? 'default' : 'outline'}
          onClick={onContract}
        >
          Contratar
        </Button>
      </CardContent>
    </Card>
  );
}

function StatsHero() {
  const stats = [
    { icon: Globe, value: '90.000+', label: 'Visitas / mes', color: 'from-blue-500 to-blue-700' },
    { icon: Bot, value: '1.000+', label: 'Consultas IA / mes', color: 'from-violet-500 to-violet-700' },
    { icon: Target, value: '400+', label: 'Leads filtrados / mes', color: 'from-emerald-500 to-emerald-700' },
    { icon: TrendingUp, value: '+5%', label: 'Crecimiento mensual', color: 'from-amber-500 to-amber-700' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-7 w-7" />
          <h2 className="text-xl font-bold">2º portal jurídico de España</h2>
        </div>
        <p className="text-blue-100 text-sm max-w-2xl">
          Según el último informe de tráfico sectorial, Asesor.Legal es el segundo directorio jurídico más visitado de España, solo por detrás de elabogado.com. Tu despacho merece estar donde están los clientes.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-md">
            <div className={`bg-gradient-to-br ${s.color} p-3 text-white`}>
              <s.icon className="h-5 w-5 mb-1 opacity-80" />
              <p className="text-2xl font-extrabold leading-tight">{s.value}</p>
              <p className="text-xs opacity-90 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Value propositions */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">Mejora tu SEO y tráfico orgánico</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Tu perfil en Asesor.Legal genera backlinks de alta autoridad y mejora tu posicionamiento en buscadores.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-violet-50/80 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-violet-900 dark:text-violet-100">Recomendación directa por IA</p>
                <p className="text-xs text-violet-700 dark:text-violet-300 mt-1">Nuestro asistente identifica área legal, especialidad y provincia del cliente, y recomienda tu despacho directamente.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">Oportunidades reales de clientes</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Miles de usuarios buscan abogados cada mes. Anunciarte aquí significa acceder a demanda real y cualificada.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LawfirmAdvertising() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'web';

  const handleContract = (plan: string) => {
    window.open(`mailto:ventas@asesor.legal?subject=Contratar plan ${plan}`, '_blank');
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          📢 Opciones de Publicidad
        </h1>
        <p className="text-muted-foreground">Potencia la visibilidad de tu despacho con nuestros canales de publicidad</p>
      </div>

      {/* Commercial stats hero */}
      <StatsHero />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl h-12 bg-card border border-border p-1 gap-1">
          <TabsTrigger value="web" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-medium transition-all">
            <Globe className="h-4 w-4" />
            Web
          </TabsTrigger>
          <TabsTrigger value="asistente" className="flex items-center gap-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-medium transition-all">
            <Bot className="h-4 w-4" />
            Asistente IA
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-medium transition-all">
            <Mail className="h-4 w-4" />
            Newsletters
          </TabsTrigger>
          <TabsTrigger value="outsourcing" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md font-medium transition-all">
            <Handshake className="h-4 w-4" />
            Outsourcing
          </TabsTrigger>
        </TabsList>

        {/* Web Advertising */}
        <TabsContent value="web">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Publicidad en Asesor.Legal
              </CardTitle>
              <CardDescription>
                Destaca tu despacho en las búsquedas de abogados de nuestra web — con +90.000 visitas mensuales, tu perfil será visto por miles de potenciales clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <PlanCard
                  name="BÁSICO"
                  price="49€"
                  priceUnit="mes"
                  features={[
                    "1 área legal",
                    "1 provincia",
                    "Listado básico"
                  ]}
                  onContract={() => handleContract('Web Básico')}
                />
                <PlanCard
                  name="PREMIUM"
                  price="99€"
                  priceUnit="mes"
                  features={[
                    "3 áreas legales",
                    "3 provincias",
                    "Badge oro destacado",
                    "Prioridad en listados"
                  ]}
                  highlight
                  badge="Popular"
                  onContract={() => handleContract('Web Premium')}
                />
                <PlanCard
                  name="DESTACADO"
                  price="199€"
                  priceUnit="mes"
                  features={[
                    "Todas las áreas",
                    "Toda España",
                    "TOP 3 en resultados",
                    "Banner promocional"
                  ]}
                  onContract={() => handleContract('Web Destacado')}
                />
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Estado actual</p>
                    <p className="text-sm text-muted-foreground">Sin publicidad activa</p>
                  </div>
                  <Badge variant="secondary">Sin plan</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asistente Virtual IA */}
        <TabsContent value="asistente">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-600" />
                Publicidad en Asistente Virtual IA
              </CardTitle>
              <CardDescription>
                Nuestro asistente IA atiende +1.000 consultas jurídicas al mes. Cuando un usuario describe su problema, el asistente identifica automáticamente el área legal, especialidad y provincia — y puede recomendar tu despacho directamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                <Card>
                  <CardHeader className="text-center pb-2">
                    <Star className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                    <CardTitle className="text-lg">RECOMENDACIÓN</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">79€</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>El asistente menciona tu despacho como opción</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Apareces en respuestas relevantes</span>
                      </li>
                    </ul>
                    <Button className="w-full" variant="outline" onClick={() => handleContract('Asistente IA Recomendación')}>
                      Contratar
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-primary shadow-lg relative">
                  <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">Mejor opción</Badge>
                  <CardHeader className="text-center pb-2">
                    <Crown className="h-8 w-8 mx-auto text-primary mb-2" />
                    <CardTitle className="text-lg">PREFERENTE</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">149€</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>El asistente recomienda PRIMERO tu despacho</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Incluye datos de contacto directos</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Prioridad absoluta en todas las consultas</span>
                      </li>
                    </ul>
                    <Button className="w-full" onClick={() => handleContract('Asistente IA Preferente')}>
                      Contratar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Newsletter */}
        <TabsContent value="newsletter">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                Publicidad en Newsletters
              </CardTitle>
              <CardDescription>
                Aparece en nuestros emails semanales a +50.000 suscriptores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <PlanCard
                  name="MENCIÓN"
                  price="99€"
                  priceUnit="envío"
                  features={[
                    "Logo + nombre",
                    "Sección 'Colaboradores'",
                    "1 envío semanal"
                  ]}
                  onContract={() => handleContract('Newsletter Mención')}
                />
                <PlanCard
                  name="DESTACADO"
                  price="199€"
                  priceUnit="envío"
                  features={[
                    "Logo + texto promocional",
                    "Enlace destacado",
                    "Posición preferente"
                  ]}
                  highlight
                  badge="Recomendado"
                  onContract={() => handleContract('Newsletter Destacado')}
                />
                <PlanCard
                  name="EXCLUSIVO"
                  price="499€"
                  priceUnit="envío"
                  features={[
                    "Artículo patrocinado completo",
                    "Diseño personalizado",
                    "Máxima visibilidad"
                  ]}
                  onContract={() => handleContract('Newsletter Exclusivo')}
                />
              </div>

              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-900 dark:text-emerald-100">Próximo envío: 25/01/2026</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">Suscriptores activos: 52.340</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outsourcing Comercial */}
        <TabsContent value="outsourcing">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-amber-600" />
                Outsourcing Comercial
              </CardTitle>
              <CardDescription>
                Externaliza la captación de clientes con un equipo comercial dedicado a tu despacho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
                <PlanCard
                  name="EQUIPO COMERCIAL"
                  price="Consultar"
                  priceUnit="mes"
                  features={[
                    "Equipo de ventas dedicado",
                    "Captación de clientes B2B",
                    "Informes mensuales de resultados",
                    "Sin permanencia"
                  ]}
                  highlight
                  badge="Personalizado"
                  onContract={() => handleContract('Outsourcing Equipo Comercial')}
                />
                <PlanCard
                  name="CAMPAÑA PUNTUAL"
                  price="Consultar"
                  priceUnit="campaña"
                  features={[
                    "Fuerza de ventas temporal",
                    "Ideal para lanzamientos",
                    "Campañas específicas por área",
                    "Resultados medibles"
                  ]}
                  onContract={() => handleContract('Outsourcing Campaña Puntual')}
                />
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Powered by <span className="font-semibold text-foreground">Elite Work</span> — consultora estratégica especializada en servicios profesionales. Contacta con nosotros para diseñar un plan a medida.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
