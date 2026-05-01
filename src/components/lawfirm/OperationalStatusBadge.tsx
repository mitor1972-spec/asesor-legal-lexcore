import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const OPERATIONAL_STATUSES = [
  { value: 'nuevo', label: 'Nuevo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'contactado', label: 'Contactado', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { value: 'pendiente_documentacion', label: 'Pendiente documentación', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'documentacion_recibida', label: 'Documentación recibida', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'analizado_ia', label: 'Analizado por IA', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  { value: 'pendiente_hoja', label: 'Pendiente hoja de encargo', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'hoja_enviada', label: 'Hoja enviada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'hoja_firmada', label: 'Hoja firmada', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'pendiente_pago', label: 'Pendiente pago', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'en_tramite', label: 'En trámite', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  { value: 'cerrado_ganado', label: 'Cerrado ganado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'cerrado_perdido', label: 'Cerrado perdido', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
] as const;

export function getOperationalStatusLabel(value?: string | null) {
  return OPERATIONAL_STATUSES.find(s => s.value === value)?.label ?? 'Nuevo';
}

export function OperationalStatusBadge({ value }: { value?: string | null }) {
  const status = OPERATIONAL_STATUSES.find(s => s.value === value) ?? OPERATIONAL_STATUSES[0];
  return <Badge variant="outline" className={`text-xs ${status.color}`}>{status.label}</Badge>;
}

interface SelectorProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OperationalStatusSelect({ value, onChange, disabled }: SelectorProps) {
  return (
    <Select value={value ?? 'nuevo'} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[220px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPERATIONAL_STATUSES.map(s => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
