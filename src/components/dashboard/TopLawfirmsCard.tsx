import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TopLawfirmsCardProps {
  data: { name: string; leads: number; value: number }[];
}

export function TopLawfirmsCard({ data }: TopLawfirmsCardProps) {
  const maxLeads = Math.max(...data.map(d => d.leads), 1);

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Top Despachos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin datos en este período
          </p>
        ) : (
          data.map((firm, index) => (
            <div
              key={firm.name}
              className="flex items-center gap-3 group"
            >
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-gray-100 text-gray-600' :
                index === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-muted text-muted-foreground'
              )}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{firm.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{firm.leads} leads</span>
                  <span>•</span>
                  <span>{firm.value.toLocaleString('es-ES')}€</span>
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(firm.leads / maxLeads) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
        
        {data.length > 0 && (
          <Link 
            to="/settings/lawfirms"
            className="flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-2"
          >
            Ver todos los despachos
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
