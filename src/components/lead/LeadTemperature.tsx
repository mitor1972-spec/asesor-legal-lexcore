import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Thermometer, MapPin, Scale, Zap, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocation } from '@/lib/cityProvinceMapping';

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
  icon: React.ReactNode;
  label: string;
  value: string;
  isComplete?: boolean;
}

function Factor({ icon, label, value, isComplete = true }: FactorProps) {
  const hasValue = value && value.trim() !== '';
  
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className={cn("flex-shrink-0", hasValue && isComplete ? "text-green-500" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-medium truncate", hasValue ? "text-foreground" : "text-muted-foreground/50")}>
        {value || ''}
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
  
  // Location with auto-province detection
  const ciudad = f.ciudad as string | undefined;
  const provincia = f.provincia as string | undefined;
  const location = formatLocation(ciudad, provincia);

  const urgenciaAplica = f.urgencia_aplica as boolean | undefined;
  const urgenciaNivel = f.urgencia_nivel as string | undefined;
  const areaLegal = f.area_legal as string | undefined;
  const cuantia = f.cuantia as number | undefined;
  const hasCuantia = cuantia !== null && cuantia !== undefined && cuantia !== 0;

  // Mini variant - badge style with thermometer bar for the leads list
  if (variant === 'mini') {
    const bgColorClass = score <= 30 
      ? 'bg-red-500' 
      : score <= 50 
        ? 'bg-orange-500' 
        : score <= 70 
          ? 'bg-yellow-400' 
          : 'bg-green-500';
    
    const textColorClass = score <= 30 || score > 70 
      ? 'text-white' 
      : score <= 50 
        ? 'text-white' 
        : 'text-gray-900'; // yellow needs dark text

    const barBgColor = score <= 30 
      ? 'bg-red-500' 
      : score <= 50 
        ? 'bg-orange-500' 
        : score <= 70 
          ? 'bg-yellow-400' 
          : 'bg-green-500';
    
    return (
      <div className="flex items-center gap-2">
        {/* Mini thermometer bar */}
        <div className="relative w-12 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("absolute left-0 top-0 h-full rounded-full transition-all", barBgColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Score badge */}
        <span className={cn(
          "inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-xs font-bold",
          bgColorClass,
          textColorClass
        )}>
          {score}
        </span>
      </div>
    );
  }

  // Full variant with card and factors
  return (
    <Card className="shadow-soft border-border">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Thermometer className="h-4 w-4 text-primary" />
          Temperatura del Lead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {/* Temperature Bar - 30% thinner */}
        <div className="space-y-1">
          <div className="relative h-2.5 bg-gradient-to-r from-red-500 via-orange-400 via-50% via-yellow-400 to-green-500 rounded-full overflow-visible">
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-foreground rounded-full shadow-lg transition-all flex items-center justify-center"
              style={{ left: `calc(${percentage}% - 8px)` }}
            >
              <div className={cn("w-2 h-2 rounded-full", config.bgColor)} />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-0.5">
            <span>Frío</span>
            <span className={cn("font-bold text-sm", config.textColor)}>
              {score} - {config.label}
            </span>
            <span>Caliente</span>
          </div>
        </div>

        {/* Key Factors Grid - New factors */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
          <Factor 
            icon={contactComplete ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            label="Contacto" 
            value={contactComplete ? 'Completo' : 'Incompleto'} 
            isComplete={contactComplete}
          />
          <Factor 
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Ubicación" 
            value={location}
            isComplete={Boolean(location)}
          />
          <Factor 
            icon={<Scale className="h-3.5 w-3.5" />}
            label="Área" 
            value={areaLegal || ''}
            isComplete={Boolean(areaLegal)}
          />
          <Factor 
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Urgencia" 
            value={urgenciaAplica ? (urgenciaNivel || 'Sí') : 'No'} 
            isComplete={urgenciaAplica === true}
          />
          {hasCuantia && (
            <Factor 
              icon={<Euro className="h-3.5 w-3.5" />}
              label="Cuantía" 
              value={`${Number(cuantia).toLocaleString()}€`}
              isComplete={true}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
