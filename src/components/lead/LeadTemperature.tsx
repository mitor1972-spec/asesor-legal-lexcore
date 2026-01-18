import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadTemperatureProps {
  score: number | null;
  structuredFields?: Record<string, unknown> | null;
  variant?: 'full' | 'mini';
}

function getTemperatureConfig(score: number) {
  if (score <= 30) {
    return {
      label: 'Frío',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500',
      textColor: 'text-red-500',
    };
  } else if (score <= 50) {
    return {
      label: 'Tibio',
      color: 'from-orange-400 to-orange-500',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-500',
    };
  } else if (score <= 70) {
    return {
      label: 'Cálido',
      color: 'from-yellow-400 to-yellow-500',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-500',
    };
  } else {
    return {
      label: 'Caliente',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500',
      textColor: 'text-green-500',
    };
  }
}

interface FactorProps {
  label: string;
  isComplete: boolean;
  value?: string;
}

function Factor({ label, isComplete, value }: FactorProps) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {isComplete ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-medium", isComplete ? "text-foreground" : "text-yellow-600")}>
        {value}
      </span>
    </div>
  );
}

export function LeadTemperature({ score, structuredFields, variant = 'full' }: LeadTemperatureProps) {
  if (score === null) return null;

  const config = getTemperatureConfig(score);
  const percentage = Math.min(Math.max(score, 0), 100);
  const f = structuredFields || {};

  // Calculate factors
  const hasNombre = Boolean(f.nombre);
  const hasTelefono = Boolean(f.telefono);
  const hasEmail = Boolean(f.email);
  const contactComplete = hasNombre && (hasTelefono || hasEmail);

  const hasDocs = Boolean(f.aporta_documentacion);
  const hasIntencion = Boolean(f.solicita_abogado);
  const urgenciaAplica = f.urgencia_aplica as boolean | undefined;
  const urgenciaNivel = f.urgencia_nivel as string | undefined;
  const hasCasoClaro = Boolean(f.area_legal && f.subarea);
  const hasCuantia = f.cuantia !== null && f.cuantia !== undefined && f.cuantia !== '';

  // Mini variant - just the bar for the leads list
  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="relative flex-1 h-2 bg-gradient-to-r from-red-500 via-orange-400 via-yellow-400 to-green-500 rounded-full overflow-hidden">
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-foreground rounded-full shadow-md transition-all"
            style={{ left: `calc(${percentage}% - 5px)` }}
          />
        </div>
        <span className={cn("text-xs font-bold min-w-[24px]", config.textColor)}>
          {score}
        </span>
      </div>
    );
  }

  // Full variant with card and factors
  return (
    <Card className="shadow-soft border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Thermometer className="h-5 w-5 text-primary" />
          Temperatura del Lead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature Bar */}
        <div className="space-y-2">
          <div className="relative h-4 bg-gradient-to-r from-red-500 via-orange-400 via-50% via-yellow-400 to-green-500 rounded-full overflow-visible">
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-foreground rounded-full shadow-lg transition-all flex items-center justify-center"
              style={{ left: `calc(${percentage}% - 10px)` }}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full", config.bgColor)} />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>🔴 Frío</span>
            <span className={cn("font-bold text-sm -mt-0.5", config.textColor)}>
              {score} - {config.label}
            </span>
            <span>🟢 Caliente</span>
          </div>
        </div>

        {/* Key Factors Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2 border-t">
          <Factor 
            label="Contacto" 
            isComplete={contactComplete} 
            value={contactComplete ? 'Completo' : 'Incompleto'} 
          />
          <Factor 
            label="Docs" 
            isComplete={hasDocs} 
            value={hasDocs ? 'Sí' : 'Faltan'} 
          />
          <Factor 
            label="Intención" 
            isComplete={hasIntencion} 
            value={hasIntencion ? 'Alta' : 'No consta'} 
          />
          <Factor 
            label="Urgencia" 
            isComplete={urgenciaAplica === true} 
            value={urgenciaAplica ? (urgenciaNivel || 'Sí') : 'No'} 
          />
          <Factor 
            label="Caso" 
            isComplete={hasCasoClaro} 
            value={hasCasoClaro ? 'Claro' : 'Incompleto'} 
          />
          <Factor 
            label="Cuantía" 
            isComplete={hasCuantia} 
            value={hasCuantia ? `${Number(f.cuantia).toLocaleString()}€` : 'No consta'} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
