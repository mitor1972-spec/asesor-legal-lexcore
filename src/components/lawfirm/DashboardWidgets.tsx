import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LawfirmCase } from '@/hooks/useLawfirmCases';
import { MapPin, Scale, Building2, User, Trophy } from 'lucide-react';

interface DashboardWidgetsProps {
  cases: LawfirmCase[];
  branches?: Array<{ id: string; name: string; province: string | null }>;
  lawyers?: Array<{ id: string; full_name: string | null; email: string }>;
}

export function CasesByAreaWidget({ cases }: { cases: LawfirmCase[] }) {
  const areaCount = cases.reduce((acc, c) => {
    const area = (c.lead?.structured_fields as Record<string, string>)?.area_legal || 'Sin clasificar';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedAreas = Object.entries(areaCount).sort((a, b) => b[1] - a[1]);

  if (sortedAreas.length === 0) return null;

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-lawfirm-primary" />
          Casos por Área Legal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedAreas.slice(0, 6).map(([area, count]) => (
            <div key={area} className="flex justify-between items-center text-sm">
              <span className="truncate">{area}</span>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CasesByProvinceWidget({ cases }: { cases: LawfirmCase[] }) {
  const provinceCount = cases.reduce((acc, c) => {
    const province = (c.lead?.structured_fields as Record<string, string>)?.provincia || 'Sin provincia';
    acc[province] = (acc[province] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedProvinces = Object.entries(provinceCount).sort((a, b) => b[1] - a[1]);

  if (sortedProvinces.length === 0) return null;

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-lawfirm-primary" />
          Casos por Provincia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedProvinces.slice(0, 6).map(([province, count]) => (
            <div key={province} className="flex justify-between items-center text-sm">
              <span className="truncate">{province}</span>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CasesByBranchWidget({ 
  cases, 
  branches = [] 
}: { 
  cases: LawfirmCase[]; 
  branches?: Array<{ id: string; name: string; province: string | null }> 
}) {
  // Group by branch_id from lead_assignments
  const branchCount = cases.reduce((acc, c) => {
    const branchId = (c as any).branch_id || 'sin_sede';
    acc[branchId] = (acc[branchId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const branchData = Object.entries(branchCount).map(([branchId, count]) => {
    const branch = branches.find(b => b.id === branchId);
    return {
      name: branch?.name || 'Sin sede asignada',
      province: branch?.province,
      count
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-lawfirm-primary" />
          Casos por Sede
        </CardTitle>
      </CardHeader>
      <CardContent>
        {branchData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay sedes configuradas</p>
        ) : (
          <div className="space-y-2">
            {branchData.slice(0, 6).map(({ name, province, count }) => (
              <div key={name} className="flex justify-between items-center text-sm">
                <span className="truncate">
                  {name}
                  {province && <span className="text-muted-foreground ml-1">({province})</span>}
                </span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CasesByLawyerWidget({ 
  cases, 
  lawyers = [] 
}: { 
  cases: LawfirmCase[]; 
  lawyers?: Array<{ id: string; full_name: string | null; email: string }> 
}) {
  const lawyerCount = cases.reduce((acc, c) => {
    const lawyerId = c.assigned_lawyer_id || 'sin_abogado';
    acc[lawyerId] = (acc[lawyerId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lawyerData = Object.entries(lawyerCount).map(([lawyerId, count]) => {
    const lawyer = lawyers.find(l => l.id === lawyerId);
    return {
      name: lawyer?.full_name || lawyer?.email || 'Sin asignar',
      count
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-lawfirm-primary" />
          Casos por Abogado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lawyerData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay abogados asignados</p>
        ) : (
          <div className="space-y-2">
            {lawyerData.slice(0, 6).map(({ name, count }) => (
              <div key={name} className="flex justify-between items-center text-sm">
                <span className="truncate">{name}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WonCasesTable({ cases }: { cases: LawfirmCase[] }) {
  const wonCases = cases.filter(c => c.firm_status === 'won');

  if (wonCases.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-success" />
            Casos Ganados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no hay casos marcados como ganados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-success" />
          Casos Ganados ({wonCases.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Abogado</TableHead>
              <TableHead className="text-right pr-4">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wonCases.slice(0, 10).map((c) => {
              const fields = c.lead?.structured_fields as Record<string, string> | null;
              return (
                <TableRow key={c.id}>
                  <TableCell className="pl-4 text-sm">
                    {format(new Date(c.assigned_at), 'dd/MM/yy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {fields?.nombre || 'Cliente'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {fields?.area_legal || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.assigned_lawyer?.full_name || c.assigned_lawyer?.email || '-'}
                  </TableCell>
                  <TableCell className="text-right pr-4 text-sm font-medium text-success">
                    {c.result_amount ? `${c.result_amount.toLocaleString('es-ES')} €` : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
