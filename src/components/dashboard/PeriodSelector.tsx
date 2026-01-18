import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DatePeriod } from '@/hooks/useDashboardMetrics';

interface PeriodSelectorProps {
  period: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}

const periodLabels: Record<DatePeriod, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  quarter: 'Este trimestre',
  year: 'Este año',
  custom: 'Personalizado',
};

export function PeriodSelector({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: PeriodSelectorProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Select value={period} onValueChange={(v) => onPeriodChange(v as DatePeriod)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(periodLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === 'custom' && onCustomRangeChange && (
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {customRange ? (
                <>
                  {format(customRange.start, 'dd MMM', { locale: es })} -{' '}
                  {format(customRange.end, 'dd MMM yyyy', { locale: es })}
                </>
              ) : (
                'Seleccionar fechas'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={
                customRange
                  ? { from: customRange.start, to: customRange.end }
                  : undefined
              }
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onCustomRangeChange({ start: range.from, end: range.to });
                  setDatePopoverOpen(false);
                }
              }}
              locale={es}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
