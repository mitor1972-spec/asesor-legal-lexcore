import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLeads, useArchiveLead, useRestoreLead, useDeleteLead } from '@/hooks/useLeads';
import { useCalculateLexcore } from '@/hooks/useLexcoreRuns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LEAD_STATUSES, SOURCE_CHANNELS, AREAS_LEGALES, type LeadStatus, type SourceChannel } from '@/lib/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Search, Pencil, Archive, Thermometer, FileDown, Building2, X, Trash2, RotateCcw, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { BulkAssignDialog } from '@/components/lead/BulkAssignDialog';
import { CleanupLeadsDialog } from '@/components/admin/CleanupLeadsDialog';
import { supabase } from '@/integrations/supabase/client';
import { exportLeadsToExcel } from '@/lib/exportToExcel';
import { getDisplayName } from '@/lib/contactUtils';

const statusColors: Record<LeadStatus, string> = {
  'Pendiente': 'bg-warning/10 text-warning border-warning/20',
  'Enviado': 'bg-primary/10 text-primary border-primary/20',
  'Aceptado': 'bg-success/10 text-success border-success/20',
};

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState<LeadStatus | ''>(searchParams.get('status') as LeadStatus || '');
  const [channel, setChannel] = useState<SourceChannel | ''>(searchParams.get('channel') as SourceChannel || '');
  const [areaLegal, setAreaLegal] = useState(searchParams.get('area') || '');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  const { data, isLoading } = useLeads(
    { search: search || undefined, status: status || undefined, channel: channel || undefined, areaLegal: areaLegal || undefined, showArchived },
    page
  );
  const archiveMutation = useArchiveLead();
  const restoreMutation = useRestoreLead();
  const deleteMutation = useDeleteLead();
  const calculateLexcore = useCalculateLexcore();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState({ current: 0, total: 0 });

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Archivar este lead?')) {
      try {
        await archiveMutation.mutateAsync(id);
        toast.success('Lead archivado');
      } catch {
        toast.error('Error al archivar');
      }
    }
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await restoreMutation.mutateAsync(id);
      toast.success('Lead restaurado');
    } catch {
      toast.error('Error al restaurar');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿ELIMINAR PERMANENTEMENTE este lead? Esta acción no se puede deshacer.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Lead eliminado permanentemente');
      } catch {
        toast.error('Error al eliminar');
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

  const toggleLeadSelection = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked && data?.leads) {
      setSelectedLeads(data.leads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const allSelected = data?.leads && data.leads.length > 0 && selectedLeads.length === data.leads.length;

  const handleBulkAssignSuccess = () => {
    setSelectedLeads([]);
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecciona al menos un lead');
      return;
    }

    const confirmed = confirm(
      `¿Eliminar ${selectedLeads.length} lead(s)?\n\nLos leads se archivarán y podrás restaurarlos después si es necesario.`
    );

    if (!confirmed) return;

    let successCount = 0;
    let errorCount = 0;

    for (const leadId of selectedLeads) {
      try {
        await archiveMutation.mutateAsync(leadId);
        successCount++;
      } catch (error) {
        console.error(`Error archiving lead ${leadId}:`, error);
        errorCount++;
      }
    }

    setSelectedLeads([]);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`✅ ${successCount} lead(s) eliminados`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} lead(s) eliminados, ${errorCount} con errores`);
    } else if (errorCount > 0) {
      toast.error(`${errorCount} lead(s) con errores`);
    }
  };

  const handleRecalculateLexcore = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecciona al menos un lead');
      return;
    }

    const confirmed = confirm(
      `¿Re-ejecutar Lexcore para ${selectedLeads.length} lead(s)?\n\nEsto actualizará:\n• Puntuación (score)\n• Precio\n• Resumen para marketplace\n• Toda la valoración IA`
    );

    if (!confirmed) return;

    setIsRecalculating(true);
    setRecalcProgress({ current: 0, total: selectedLeads.length });
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedLeads.length; i++) {
      const leadId = selectedLeads[i];
      setRecalcProgress({ current: i + 1, total: selectedLeads.length });
      
      try {
        // Get lead data
        const { data: lead, error: fetchError } = await supabase
          .from('leads')
          .select('lead_text, structured_fields, source_channel')
          .eq('id', leadId)
          .single();

        if (fetchError || !lead) {
          console.error(`Error fetching lead ${leadId}:`, fetchError);
          errorCount++;
          continue;
        }

        if (!lead.lead_text || lead.lead_text.trim() === '') {
          console.warn(`Lead ${leadId} has no lead_text, skipping`);
          errorCount++;
          continue;
        }

        // Re-calculate Lexcore
        await calculateLexcore.mutateAsync({
          leadId,
          leadText: lead.lead_text,
          structuredFields: (lead.structured_fields as Record<string, unknown>) || {},
          sourceChannel: lead.source_channel || 'Web chat',
        });

        successCount++;
      } catch (error) {
        console.error(`Error recalculating lead ${leadId}:`, error);
        errorCount++;
      }
    }

    setIsRecalculating(false);
    setRecalcProgress({ current: 0, total: 0 });
    setSelectedLeads([]);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`✅ ${successCount} lead(s) recalculados correctamente`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} lead(s) OK, ${errorCount} con errores`);
    } else if (errorCount > 0) {
      toast.error(`${errorCount} lead(s) con errores`);
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
          <CleanupLeadsDialog />
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtros</CardTitle>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => { setShowArchived(!showArchived); setPage(1); }}
            >
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? 'Ver activos' : 'Ver archivados'}
            </Button>
          </div>
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

      {/* Bulk actions bar */}
      {selectedLeads.length > 0 && (
        <Card className={isRecalculating ? "bg-amber-500/10 border-amber-500/30" : "bg-primary/5 border-primary/20"}>
          <CardContent className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isRecalculating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    Procesando {recalcProgress.current} de {recalcProgress.total}...
                  </span>
                ) : (
                  `☑️ ${selectedLeads.length} leads seleccionados`
                )}
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleRecalculateLexcore}
                  disabled={isRecalculating}
                  className="bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                >
                  {isRecalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isRecalculating ? `${recalcProgress.current}/${recalcProgress.total}` : 'Re-ejecutar Lexcore'}
                </Button>
                <Button size="sm" onClick={() => setShowBulkAssign(true)} disabled={isRecalculating}>
                  <Building2 className="mr-2 h-4 w-4" />Asignar a despacho
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isRecalculating}
                >
                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedLeads([])} disabled={isRecalculating}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Progress bar */}
            {isRecalculating && recalcProgress.total > 0 && (
              <div className="space-y-1">
                <div className="h-2 bg-amber-200/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(recalcProgress.current / recalcProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-amber-600 text-center">
                  {Math.round((recalcProgress.current / recalcProgress.total) * 100)}% completado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={allSelected ?? false}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Área</TableHead>
              <TableHead className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  Temp.
                </span>
              </TableHead>
              <TableHead className="text-center">Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : data?.leads.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay leads</TableCell></TableRow>
            ) : (
              data?.leads.map(lead => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(lead.id)}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => toggleLeadSelection(lead.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                  <TableCell className="font-medium">
                    {getDisplayName(lead.structured_fields as Record<string, unknown>) || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{lead.source_channel}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cleanField(lead.structured_fields?.area_legal) || <span className="text-muted-foreground">—</span>}</TableCell>
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
                      {showArchived ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={(e) => handleRestore(e, lead.id)} title="Restaurar">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, lead.id)} title="Eliminar permanentemente" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" asChild title="Editar">
                            <Link to={`/leads/${lead.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => handleArchive(e, lead.id)} title="Archivar">
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, lead.id)} title="Eliminar" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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

      <BulkAssignDialog
        open={showBulkAssign}
        onOpenChange={setShowBulkAssign}
        leadIds={selectedLeads}
        onSuccess={handleBulkAssignSuccess}
      />
    </div>
  );
}
