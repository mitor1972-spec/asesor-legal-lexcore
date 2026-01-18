import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Bot, Mail, Check, Star, Crown, Sparkles } from 'lucide-react';

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
    <Card className={`relative ${highlight ? 'border-lawfirm-primary shadow-lg' : ''}`}>
      {badge && (
        <Badge className="absolute -top-2 right-4 bg-lawfirm-primary">{badge}</Badge>
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

export default function LawfirmAdvertising() {
  const handleContract = (plan: string) => {
    window.open(`mailto:ventas@asesor.legal?subject=Contratar plan ${plan}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          📢 Publicidad y Visibilidad
        </h1>
        <p className="text-muted-foreground">Destaca tu despacho y consigue más clientes</p>
      </div>

      <Tabs defaultValue="web" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="web" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Web
          </TabsTrigger>
          <TabsTrigger value="amara" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Asistente
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Newsletter
          </TabsTrigger>
        </TabsList>

        {/* Web Advertising */}
        <TabsContent value="web">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Publicidad en Asesor.Legal
              </CardTitle>
              <CardDescription>
                Destaca tu despacho en las búsquedas de abogados de nuestra web
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

        {/* Amara Assistant */}
        <TabsContent value="amara">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Publicidad en Asistente AMARA
              </CardTitle>
              <CardDescription>
                Tu despacho puede ser recomendado directamente por Amara cuando usuarios pregunten por abogados de tus áreas en tus provincias
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
                        <span>Amara menciona tu despacho como opción</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Apareces en respuestas relevantes</span>
                      </li>
                    </ul>
                    <Button className="w-full" variant="outline" onClick={() => handleContract('Amara Recomendación')}>
                      Contratar
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-lawfirm-primary shadow-lg relative">
                  <Badge className="absolute -top-2 right-4 bg-lawfirm-primary">Mejor opción</Badge>
                  <CardHeader className="text-center pb-2">
                    <Crown className="h-8 w-8 mx-auto text-lawfirm-primary mb-2" />
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
                        <span>Amara recomienda PRIMERO tu despacho</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Incluye datos de contacto</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Prioridad absoluta</span>
                      </li>
                    </ul>
                    <Button className="w-full" onClick={() => handleContract('Amara Preferente')}>
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
                <Mail className="h-5 w-5" />
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

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Próximo envío: 25/01/2026</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Suscriptores activos: 52.340</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
