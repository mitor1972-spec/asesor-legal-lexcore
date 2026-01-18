import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import type { LeadStatus } from '@/lib/constants';

interface RecentLead {
  id: string;
  date: string;
  name: string;
  area: string;
  lawfirm: string | null;
  score: number | null;
  price: number | null;
  status: string;
}

interface RecentLeadsTableProps {
  leads: RecentLead[];
}

const statusColors: Record<LeadStatus, string> = {
  'Pendiente': 'bg-warning/10 text-warning border-warning/20',
  'Derivado': 'bg-primary/10 text-primary border-primary/20',
  'Facturado': 'bg-success/10 text-success border-success/20',
  'Cerrado': 'bg-muted text-muted-foreground border-border',
};

export function RecentLeadsTable({ leads }: RecentLeadsTableProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Últimos Leads
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/leads" className="text-xs">
            Ver todos
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Despacho</TableHead>
              <TableHead className="text-center">Temp</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Sin leads en este período
                </TableCell>
              </TableRow>
            ) : (
              leads.map(lead => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => window.location.href = `/leads/${lead.id}`}
                >
                  <TableCell className="text-xs">
                    {format(new Date(lead.date), 'dd/MM/yy', { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{lead.area}</TableCell>
                  <TableCell className="text-xs">
                    {lead.lawfirm || <span className="text-muted-foreground">Pendiente</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.score !== null ? (
                      <LeadTemperature score={lead.score} variant="mini" />
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {lead.price !== null ? (
                      <Badge variant="outline" className="font-mono text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        {lead.price}€
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status as LeadStatus] || statusColors['Pendiente']}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
