import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLeads, useArchiveLead } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LEAD_STATUSES, SOURCE_CHANNELS, AREAS_LEGALES, type LeadStatus, type SourceChannel } from '@/lib/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Search, Pencil, Archive, Thermometer, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { supabase } from '@/integrations/supabase/client';
import { exportLeadsToExcel } from '@/lib/exportToExcel';

const statusColors: Record<LeadStatus, string> = {
  'Pendiente': 'bg-warning/10 text-warning border-warning/20',
  'Derivado': 'bg-primary/10 text-primary border-primary/20',
  'Facturado': 'bg-success/10 text-success border-success/20',
  'Cerrado': 'bg-muted text-muted-foreground border-border',
};

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState<LeadStatus | ''>(searchParams.get('status') as LeadStatus || '');
  const [channel, setChannel] = useState<SourceChannel | ''>(searchParams.get('channel') as SourceChannel || '');
  const [areaLegal, setAreaLegal] = useState(searchParams.get('area') || '');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLeads(
    { search: search || undefined, status: status || undefined, channel: channel || undefined, areaLegal: areaLegal || undefined },
    page
  );
  const archiveMutation = useArchiveLead();

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row click navigation
    if (confirm('¿Archivar este lead?')) {
      try {
        await archiveMutation.mutateAsync(id);
        toast.success('Lead archivado');
      } catch {
        toast.error('Error al archivar');
      }
    }
  };

  const handleRowClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, lead_assignments(lawfirm_id, assigned_at, firm_status, contacted_at, result_notes, lawfirms(name))')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      exportLeadsToExcel(data as any || []);
      toast.success('Exportación completada');
    } catch {
      toast.error('Error al exportar');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Leads</h1>
          <p className="text-muted-foreground">{data?.totalCount ?? 0} leads en total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />Exportar Excel
          </Button>
          <Button asChild className="gradient-brand">
            <Link to="/leads/new"><Plus className="mr-2 h-4 w-4" />Nuevo Lead</Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status || "__all__"} onValueChange={v => setStatus(v === "__all__" ? '' : v as LeadStatus)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={channel || "__all__"} onValueChange={v => setChannel(v === "__all__" ? '' : v as SourceChannel)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {SOURCE_CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={areaLegal || "__all__"} onValueChange={v => setAreaLegal(v === "__all__" ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Área Legal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {AREAS_LEGALES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Área</TableHead>
              <TableHead className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  Temperatura
                </span>
              </TableHead>
              <TableHead className="text-center">Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : data?.leads.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay leads</TableCell></TableRow>
            ) : (
              data?.leads.map(lead => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(lead.id)}
                >
                  <TableCell className="text-sm">{format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                  <TableCell className="font-medium">{lead.structured_fields?.nombre || 'Sin nombre'} {lead.structured_fields?.apellidos || ''}</TableCell>
                  <TableCell><Badge variant="outline">{lead.source_channel}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.structured_fields?.area_legal || '-'}</TableCell>
                  <TableCell className="text-center">
                    {lead.score_final !== null ? (
                      <LeadTemperature score={lead.score_final} variant="mini" />
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.price_final !== null ? (
                      <Badge variant="outline" className="font-mono bg-green-500/10 text-green-600 border-green-500/20">
                        {lead.price_final}€
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell><Badge className={statusColors[lead.status_internal]}>{lead.status_internal}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" asChild><Link to={`/leads/${lead.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>
                      <Button variant="ghost" size="icon" onClick={(e) => handleArchive(e, lead.id)}><Archive className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">Página {page} de {data.totalPages}</span>
          <Button variant="outline" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  );
}
