import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Bot, MessageSquare, FileText, Calendar, TrendingUp, ArrowRight, Mail } from 'lucide-react';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  price: string;
  onInfo: () => void;
  onContract: () => void;
}

function ServiceCard({ icon, title, description, features, price, onInfo, onContract }: ServiceCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-3 bg-lawfirm-primary/10 rounded-lg">
            {icon}
          </div>
          <Badge variant="secondary">{price}</Badge>
        </div>
        <CardTitle className="text-xl mt-4">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-lawfirm-primary mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={onInfo}>
            Más información
          </Button>
          <Button className="flex-1" onClick={onContract}>
            Contratar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LawfirmAIServices() {
  const handleInfo = (service: string) => {
    window.open(`mailto:ia@asesor.legal?subject=Información sobre ${service}`, '_blank');
  };

  const handleContract = (service: string) => {
    window.open(`mailto:ia@asesor.legal?subject=Contratar ${service}`, '_blank');
  };

  const handleContactSales = () => {
    window.open('mailto:ventas@asesor.legal?subject=Consulta servicios IA personalizados', '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          IA para Despachos
        </h1>
        <p className="text-muted-foreground">Potencia tu despacho con inteligencia artificial</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ServiceCard
          icon={<Bot className="h-6 w-6 text-lawfirm-primary" />}
          title="Asistente Virtual Propio"
          description="Tu propio chatbot con tu marca para tu web. Atiende consultas 24/7 y captura leads directamente."
          features={[
            "Chatbot personalizado con tu branding",
            "Atención 24/7 a visitantes de tu web",
            "Captura automática de datos de contacto",
            "Clasificación de consultas por área legal",
            "Integración con tu email y CRM",
            "Panel de estadísticas de conversaciones"
          ]}
          price="Desde 149€/mes"
          onInfo={() => handleInfo('Asistente Virtual')}
          onContract={() => handleContract('Asistente Virtual')}
        />

        <ServiceCard
          icon={<MessageSquare className="h-6 w-6 text-lawfirm-primary" />}
          title="GPT Personalizado"
          description="Asistente IA entrenado con TUS documentos, plantillas y criterios."
          features={[
            "Entrenado con tus documentos y criterios",
            "Redacta borradores de escritos",
            "Analiza contratos y documentos",
            "Responde consultas internas",
            "Busca jurisprudencia relevante",
            "Acceso ilimitado para tu equipo"
          ]}
          price="Desde 299€/mes"
          onInfo={() => handleInfo('GPT Personalizado')}
          onContract={() => handleContract('GPT Personalizado')}
        />

        <ServiceCard
          icon={<FileText className="h-6 w-6 text-lawfirm-primary" />}
          title="CRM Legal con IA"
          description="Sistema completo de gestión de clientes con IA integrada."
          features={[
            "Seguimiento automático de casos",
            "Recordatorios inteligentes de plazos",
            "Generación automática de documentos",
            "Análisis predictivo de casos",
            "Facturación y control de horas",
            "Informes y métricas avanzadas"
          ]}
          price="Desde 399€/mes"
          onInfo={() => handleInfo('CRM Legal con IA')}
          onContract={() => handleContract('CRM Legal con IA')}
        />
      </div>

      {/* Additional features section */}
      <Card className="bg-gradient-to-r from-lawfirm-primary/10 to-transparent border-lawfirm-primary/30">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg inline-block mb-3 shadow-sm">
                <Calendar className="h-6 w-6 text-lawfirm-primary" />
              </div>
              <h3 className="font-medium">Gestión de Plazos</h3>
              <p className="text-sm text-muted-foreground">Nunca pierdas un vencimiento</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg inline-block mb-3 shadow-sm">
                <TrendingUp className="h-6 w-6 text-lawfirm-primary" />
              </div>
              <h3 className="font-medium">Análisis Predictivo</h3>
              <p className="text-sm text-muted-foreground">Anticipa resultados de casos</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg inline-block mb-3 shadow-sm">
                <FileText className="h-6 w-6 text-lawfirm-primary" />
              </div>
              <h3 className="font-medium">Documentos IA</h3>
              <p className="text-sm text-muted-foreground">Genera escritos en segundos</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg inline-block mb-3 shadow-sm">
                <Mail className="h-6 w-6 text-lawfirm-primary" />
              </div>
              <h3 className="font-medium">Email Inteligente</h3>
              <p className="text-sm text-muted-foreground">Redacta respuestas automáticas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom solution CTA */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-lg">¿Necesitas algo personalizado?</h3>
              <p className="text-muted-foreground">
                Desarrollamos soluciones de IA a medida para despachos con necesidades específicas
              </p>
            </div>
            <Button size="lg" onClick={handleContactSales}>
              <Mail className="mr-2 h-4 w-4" />
              Contactar con ventas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
