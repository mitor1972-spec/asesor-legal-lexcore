import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  AlertTriangle,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getChatwootAlias } from '@/lib/contactUtils';

interface DiscardedLead {
  id: string;
  created_at: string;
  discarded_at: string;
  discard_reason: string | null;
  source_channel: string;
  structured_fields: Record<string, unknown>;
  conversation_id: number | null;
  lead_text: string;
}

export default function DiscardedLeads() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Fetch discarded leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ['discarded-leads', search],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, created_at, discarded_at, discard_reason, source_channel, structured_fields, conversation_id, lead_text')
        .not('discarded_at', 'is', null)
        .order('discarded_at', { ascending: false })
        .limit(100);

      if (search) {
        query = query.or(
          `lead_text.ilike.%${search}%,structured_fields->>_contact_alias.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DiscardedLead[];
    }
  });

  // Restore lead mutation
  const restoreMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .update({ 
          discarded_at: null, 
          discard_reason: null 
        })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discarded-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead restaurado correctamente');
    },
    onError: (error) => {
      toast.error('Error al restaurar: ' + error.message);
    }
  });

  // Permanently delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discarded-leads'] });
      toast.success('Lead eliminado permanentemente');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    }
  });

  const getReasonBadge = (reason: string | null) => {
    switch (reason) {
      case 'missing_contact':
        return <Badge variant="destructive">Sin contacto</Badge>;
      case 'duplicate':
        return <Badge variant="secondary">Duplicado</Badge>;
      case 'invalid_data':
        return <Badge variant="outline">Datos inválidos</Badge>;
      default:
        return <Badge variant="outline">{reason || 'Sin razón'}</Badge>;
    }
  };

  const getContactInfo = (sf: Record<string, unknown>) => {
    const email = sf?.email as string;
    const phone = sf?.telefono as string;
    const hasEmail = email && email.trim() !== '';
    const hasPhone = phone && phone.trim() !== '';
    
    return (
      <div className="flex gap-2">
        <Mail className={`h-4 w-4 ${hasEmail ? 'text-primary' : 'text-muted-foreground/30'}`} />
        <Phone className={`h-4 w-4 ${hasPhone ? 'text-primary' : 'text-muted-foreground/30'}`} />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Leads Descartados
          </h1>
          <p className="text-muted-foreground">
            Leads sin contacto válido (sin email ni teléfono)
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {leads?.length || 0} leads
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Buscar por alias de Chatwoot o contenido del lead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por alias, conversation_id o texto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leads?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay leads descartados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID / Alias Chatwoot</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Descartado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => {
                  const alias = getChatwootAlias(lead.structured_fields);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-xs text-muted-foreground">
                            {lead.id.slice(0, 8)}...
                          </div>
                          {alias && (
                            <div className="flex items-center gap-1 text-sm">
                              <MessageSquare className="h-3 w-3" />
                              {alias}
                            </div>
                          )}
                          {lead.conversation_id && (
                            <div className="text-xs text-muted-foreground">
                              Conv: {lead.conversation_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.source_channel}</Badge>
                      </TableCell>
                      <TableCell>
                        {getContactInfo(lead.structured_fields)}
                      </TableCell>
                      <TableCell>
                        {getReasonBadge(lead.discard_reason)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(lead.discarded_at), 'dd MMM yyyy', { locale: es })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(lead.discarded_at), 'HH:mm', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/leads/${lead.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreMutation.mutate(lead.id)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restaurar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('¿Eliminar permanentemente este lead?')) {
                                deleteMutation.mutate(lead.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
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
