import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { MessageSquare } from 'lucide-react';

interface ChannelChartProps {
  data: { channel: string; count: number }[];
}

const channelColors: Record<string, string> = {
  'Web chat': 'hsl(221, 83%, 53%)',
  'Teléfono': 'hsl(142, 71%, 45%)',
  'WhatsApp': 'hsl(142, 70%, 40%)',
  'Email': 'hsl(38, 92%, 50%)',
  'Otro': 'hsl(215, 14%, 34%)',
};

const chartConfig = {
  'Web chat': { label: 'Web chat', color: channelColors['Web chat'] },
  'Teléfono': { label: 'Teléfono', color: channelColors['Teléfono'] },
  'WhatsApp': { label: 'WhatsApp', color: channelColors['WhatsApp'] },
  'Email': { label: 'Email', color: channelColors['Email'] },
  'Otro': { label: 'Otro', color: channelColors['Otro'] },
};

export function ChannelChart({ data }: ChannelChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  
  const chartData = data.map(d => ({
    name: d.channel,
    value: d.count,
    fill: channelColors[d.channel] || channelColors['Otro'],
    percentage: total > 0 ? ((d.count / total) * 100).toFixed(1) : '0',
  }));

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" />
          Leads por Canal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percentage }) => `${percentage}%`}
              labelLine={false}
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
      </CardContent>
    </Card>
  );
}
