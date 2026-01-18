import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Thermometer } from 'lucide-react';

interface ScoreDistributionChartProps {
  data: { range: string; count: number; color: string }[];
}

const chartConfig = {
  count: { label: 'Leads', color: 'hsl(221, 83%, 53%)' },
};

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const rangeLabels: Record<string, string> = {
    '0-30': 'Frío',
    '31-50': 'Tibio',
    '51-70': 'Cálido',
    '71-100': 'Caliente',
  };

  const chartData = data.map(d => ({
    ...d,
    label: rangeLabels[d.range] || d.range,
    fullLabel: `${rangeLabels[d.range] || d.range} (${d.range})`,
  }));

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Thermometer className="h-4 w-4 text-primary" />
          Distribución de Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis 
              dataKey="fullLabel" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
