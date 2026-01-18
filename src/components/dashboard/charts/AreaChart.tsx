import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Scale } from 'lucide-react';

interface LegalAreaChartProps {
  data: { area: string; count: number }[];
}

const chartConfig = {
  count: { label: 'Leads', color: 'hsl(221, 83%, 53%)' },
};

export function LegalAreaChart({ data }: LegalAreaChartProps) {
  // Truncate long area names
  const chartData = data.map(d => ({
    ...d,
    shortArea: d.area.length > 20 ? d.area.substring(0, 18) + '...' : d.area,
  }));

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          Leads por Área Legal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-border" />
            <XAxis 
              type="number" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis 
              type="category" 
              dataKey="shortArea" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value, name, props) => [value, props.payload.area]}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(221, 83%, 53%)"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`hsl(221, 83%, ${53 - index * 3}%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
