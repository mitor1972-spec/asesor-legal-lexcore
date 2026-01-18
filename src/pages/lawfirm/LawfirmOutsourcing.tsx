import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Handshake, Users, Zap, TrendingUp, Target, Calendar, FileText } from 'lucide-react';

export default function LawfirmOutsourcing() {
  const openContactForm = () => {
    window.open('https://elite-work.com/contacto', '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Handshake className="h-6 w-6 text-lawfirm-primary" />
          Outsourcing Comercial
        </h1>
        <p className="text-lg text-muted-foreground">
          Servicio ofrecido por <strong>Elite Work</strong> - Consultoría estratégica para la captación de clientes empresariales.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dedicated Sales Team */}
        <Card className="border-2 hover:border-lawfirm-primary/30 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-lawfirm-primary/10 rounded-lg">
                <Users className="h-8 w-8 text-lawfirm-primary" />
              </div>
              <Badge variant="secondary" className="text-base">
                Desde 990€/mes
              </Badge>
            </div>
            <CardTitle className="text-xl mt-4">👔 Comerciales Dedicados</CardTitle>
            <CardDescription className="text-base">
              Equipo de comerciales profesionales dedicados exclusivamente a captar clientes para tu despacho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Target className="h-5 w-5 text-lawfirm-primary mt-0.5" />
                <span>Captación de empresas que necesitan servicios legales</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-lawfirm-primary mt-0.5" />
                <span>Prospección activa en tu zona y sector</span>
              </li>
              <li className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-lawfirm-primary mt-0.5" />
                <span>Reuniones concertadas con decisores</span>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-lawfirm-primary mt-0.5" />
                <span>Reporting semanal de actividad</span>
              </li>
            </ul>

            <Button 
              onClick={openContactForm} 
              className="w-full gap-2 mt-4"
              size="lg"
            >
              Solicitar información
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Punctual Sales Forces */}
        <Card className="border-2 hover:border-lawfirm-primary/30 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Zap className="h-8 w-8 text-amber-500" />
              </div>
              <Badge variant="secondary" className="text-base">
                Desde 1.500€/campaña
              </Badge>
            </div>
            <CardTitle className="text-xl mt-4">⚡ Fuerzas de Ventas Puntuales</CardTitle>
            <CardDescription className="text-base">
              Equipos comerciales para campañas específicas o temporadas altas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Target className="h-5 w-5 text-amber-500 mt-0.5" />
                <span>Lanzamiento de nuevos servicios</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5" />
                <span>Campañas sectoriales (PYMES, startups, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="h-5 w-5 text-amber-500 mt-0.5" />
                <span>Expansión a nuevas zonas geográficas</span>
              </li>
              <li className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-amber-500 mt-0.5" />
                <span>Cobertura de vacaciones o bajas</span>
              </li>
            </ul>

            <Button 
              onClick={openContactForm} 
              variant="outline"
              className="w-full gap-2 mt-4"
              size="lg"
            >
              Solicitar información
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Elite Work Footer */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-lg border">
                <Handshake className="h-6 w-6 text-lawfirm-primary" />
              </div>
              <div>
                <p className="font-medium">🌐 Powered by Elite-Work.com</p>
                <p className="text-sm text-muted-foreground">
                  Especialistas en externalización comercial para despachos profesionales
                </p>
              </div>
            </div>
            <Button 
              variant="link" 
              className="gap-2"
              onClick={() => window.open('https://elite-work.com', '_blank')}
            >
              Conocer más sobre Elite Work
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
