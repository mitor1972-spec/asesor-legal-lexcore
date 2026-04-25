import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Eye, Building2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AssignmentRow {
  id: string;
  lead_id: string;
  lawfirm_id: string;
  assigned_at: string;
  status_delivery: 'pending' | 'sent' | 'failed' | 'delivered' | null;
  firm_status: string | null;
  lead: {
    id: string;
    status_internal: string | null;
    structured_fields: Record<string, unknown> | null;
    case_summary: string | null;
    lead_text: string | null;
  } | null;
  lawfirm: {
    id: string;
    name: string;
    contact_email: string | null;
  } | null;
}

interface EmailLogRow {
  id: string;
  lead_id: string | null;
  lawfirm_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'sent':
    case 'delivered':
      return <Badge className="bg-green-600 hover:bg-green-700">Enviado</Badge>;
    case 'failed':
      return <Badge variant="destructive">Fallido</Badge>;
    case 'pending':
    default:
      return <Badge variant="secondary">Pendiente</Badge>;
  }
};

export default function AssignmentsTracking() {
  const queryClient = useQueryClient();
  const [filterLawfirm, setFilterLawfirm] = useState<string>('all');
  const [filterDelivery, setFilterDelivery] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Fetch assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['admin-assignments-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignments')
        .select(`
          id, lead_id, lawfirm_id, assigned_at, status_delivery, firm_status,
          lead:leads ( id, status_internal, structured_fields, case_summary, lead_text ),
          lawfirm:lawfirms ( id, name, contact_email )
        `)
        .order('assigned_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as unknown as AssignmentRow[];
    },
  });

  // Fetch latest email log per assignment (by lead_id + lawfirm_id, latest)
  const { data: emailLogs } = useQuery({
    queryKey: ['admin-assignments-email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_log')
        .select('id, lead_id, lawfirm_id, status, error_message, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
  });

  // Map: latest log per (lead_id, lawfirm_id)
  const logByPair = useMemo(() => {
    const map = new Map<string, EmailLogRow>();
    (emailLogs ?? []).forEach(l => {
      const key = `${l.lead_id}::${l.lawfirm_id}`;
      if (!map.has(key)) map.set(key, l);
    });
    return map;
  }, [emailLogs]);

  // Build filter dropdowns
  const lawfirmOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (assignments ?? []).forEach(a => {
      if (a.lawfirm) seen.set(a.lawfirm.id, a.lawfirm.name);
    });
    return Array.from(seen.entries());
  }, [assignments]);

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    (assignments ?? []).forEach(a => {
      const area = (a.lead?.structured_fields as Record<string, unknown> | null)?.area_legal;
      if (typeof area === 'string' && area) set.add(area);
    });
    return Array.from(set).sort();
  }, [assignments]);

  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    (assignments ?? []).forEach(a => {
      const p = (a.lead?.structured_fields as Record<string, unknown> | null)?.provincia;
      if (typeof p === 'string' && p) set.add(p);
    });
    return Array.from(set).sort();
  }, [assignments]);

  // Apply filters
  const filtered = useMemo(() => {
    return (assignments ?? []).filter(a => {
      if (filterLawfirm !== 'all' && a.lawfirm_id !== filterLawfirm) return false;
      if (filterDelivery !== 'all' && (a.status_delivery ?? 'pending') !== filterDelivery) return false;

      const sf = (a.lead?.structured_fields ?? {}) as Record<string, unknown>;
      if (filterArea !== 'all' && sf.area_legal !== filterArea) return false;
      if (filterProvince !== 'all' && sf.provincia !== filterProvince) return false;

      if (filterFrom) {
        const from = new Date(filterFrom).getTime();
        if (new Date(a.assigned_at).getTime() < from) return false;
      }
      if (filterTo) {
        const to = new Date(filterTo).getTime() + 24 * 3600 * 1000;
        if (new Date(a.assigned_at).getTime() > to) return false;
      }
      return true;
    });
  }, [assignments, filterLawfirm, filterDelivery, filterArea, filterProvince, filterFrom, filterTo]);

  // Resend mutation
  const resend = async (a: AssignmentRow) => {
    if (!a.lawfirm?.contact_email) {
      toast.error('El despacho no tiene email de contacto');
      return;
    }
    setResendingId(a.id);
    try {
      const sf = (a.lead?.structured_fields ?? {}) as Record<string, unknown>;
      const variables: Record<string, string> = {
        nombre_despacho: a.lawfirm.name,
        area_legal: String(sf.area_legal || 'No especificada'),
        ciudad: String(sf.ciudad || 'No especificada'),
        provincia: String(sf.provincia || 'No especificada'),
        nombre_cliente: [sf.nombre, sf.apellidos].filter(Boolean).join(' ').trim() || 'No facilitado',
        telefono_cliente: String(sf.telefono || 'No facilitado'),
        email_cliente: String(sf.email || 'No facilitado'),
        resumen_caso: String(a.lead?.case_summary || a.lead?.lead_text || '').slice(0, 1500),
        enlace_caso: `${window.location.origin}/despacho/casos/${a.lead_id}`,
      };

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: a.lawfirm.contact_email,
          template_key: 'lead_assigned',
          variables,
          lead_id: a.lead_id,
          lawfirm_id: a.lawfirm_id,
          assignment_id: a.id,
        },
      });

      if (error) {
        toast.error(`Error al reenviar: ${error.message}`);
      } else if ((data as { status?: string })?.status === 'failed') {
        toast.error(`Email no enviado: ${(data as { error?: string }).error || 'fallo desconocido'}`);
      } else {
        toast.success(`Email reenviado a ${a.lawfirm.contact_email}`);
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-assignments-tracking'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-assignments-email-logs'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al reenviar');
    } finally {
      setResendingId(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter(a => a.status_delivery === 'sent' || a.status_delivery === 'delivered').length;
    const failed = filtered.filter(a => a.status_delivery === 'failed').length;
    const pending = filtered.filter(a => !a.status_delivery || a.status_delivery === 'pending').length;
    return { total, sent, failed, pending };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asignaciones globales</h1>
          <p className="text-sm text-muted-foreground">
            Trazabilidad completa de los casos asignados a despachos y estado de envío de email.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-assignments-tracking'] });
            queryClient.invalidateQueries({ queryKey: ['admin-assignments-email-logs'] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refrescar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total filtrado</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Enviados</div><div className="text-2xl font-bold text-green-600">{stats.sent}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Fallidos</div><div className="text-2xl font-bold text-red-600">{stats.failed}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pendientes</div><div className="text-2xl font-bold text-amber-600">{stats.pending}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select value={filterLawfirm} onValueChange={setFilterLawfirm}>
            <SelectTrigger><SelectValue placeholder="Despacho" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los despachos</SelectItem>
              {lawfirmOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDelivery} onValueChange={setFilterDelivery}>
            <SelectTrigger><SelectValue placeholder="Estado envío" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger><SelectValue placeholder="Área legal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {areaOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProvince} onValueChange={setFilterProvince}>
            <SelectTrigger><SelectValue placeholder="Provincia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las provincias</SelectItem>
              {provinceOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="Desde" />
          <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="Hasta" />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No hay asignaciones con los filtros aplicados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Despacho</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Localización</TableHead>
                  <TableHead>Estado caso</TableHead>
                  <TableHead>Envío email</TableHead>
                  <TableHead>Último intento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => {
                  const sf = (a.lead?.structured_fields ?? {}) as Record<string, unknown>;
                  const log = logByPair.get(`${a.lead_id}::${a.lawfirm_id}`);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(a.assigned_at), 'dd MMM yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{a.lawfirm?.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{a.lawfirm?.contact_email ?? 'sin email'}</div>
                      </TableCell>
                      <TableCell className="text-sm">{String(sf.area_legal || '—')}</TableCell>
                      <TableCell className="text-sm">
                        {String(sf.ciudad || '—')}{sf.provincia ? ` (${sf.provincia})` : ''}
                      </TableCell>
                      <TableCell><Badge variant="outline">{a.lead?.status_internal ?? '—'}</Badge></TableCell>
                      <TableCell>{statusBadge(a.status_delivery)}</TableCell>
                      <TableCell className="text-xs">
                        {log?.sent_at ? (
                          <div>
                            <div>{format(new Date(log.sent_at), 'dd MMM HH:mm', { locale: es })}</div>
                            {log.error_message && (
                              <div className="text-red-600 flex items-start gap-1 mt-1 max-w-[220px]">
                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="truncate" title={log.error_message}>{log.error_message}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resend(a)}
                            disabled={resendingId === a.id || !a.lawfirm?.contact_email}
                            title="Reenviar email"
                          >
                            {resendingId === a.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Send className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" asChild title="Ver caso">
                            <Link to={`/leads/${a.lead_id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild title="Ver despacho">
                            <Link to={`/settings/lawfirms?id=${a.lawfirm_id}`}>
                              <Building2 className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
