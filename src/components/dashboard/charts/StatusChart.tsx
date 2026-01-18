import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface StatusChartProps {
  data: { status: string; count: number }[];
}

const statusColors: Record<string, string> = {
  'Pendiente': 'hsl(38, 92%, 50%)',
  'Derivado': 'hsl(221, 83%, 53%)',
  'Facturado': 'hsl(142, 71%, 45%)',
  'Cerrado': 'hsl(215, 14%, 34%)',
};

const chartConfig = {
  Pendiente: { label: 'Pendiente', color: statusColors['Pendiente'] },
  Derivado: { label: 'Derivado', color: statusColors['Derivado'] },
  Facturado: { label: 'Facturado', color: statusColors['Facturado'] },
  Cerrado: { label: 'Cerrado', color: statusColors['Cerrado'] },
};

export function StatusChart({ data }: StatusChartProps) {
  const chartData = data.map(d => ({
    name: d.status,
    value: d.count,
    fill: statusColors[d.status] || 'hsl(215, 14%, 34%)',
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Leads por Estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend 
              formatter={(value, entry: any) => (
                <span className="text-xs text-foreground">
                  {value}: {entry.payload.value}
                </span>
              )}
            />
          </PieChart>
        </ChartContainer>
        <div className="text-center text-sm text-muted-foreground mt-2">
          Total: {total} leads
        </div>
      </CardContent>
    </Card>
  );
}
