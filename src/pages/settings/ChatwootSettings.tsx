import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle, Activity, FileText, Clipboard, Play, Database, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ChatwootSettings {
  id: string;
  webhook_token: string;
  is_active: boolean;
  only_resolved_conversations: boolean;
  auto_process_lexcore: boolean;
  default_source_channel: string;
  created_at: string;
  updated_at: string;
}

interface ImportLog {
  id: string;
  chatwoot_conversation_id: number | null;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface WebhookLog {
  id: string;
  created_at: string;
  source: string;
  event_type: string | null;
  method: string | null;
  path: string | null;
  query_params: Record<string, string> | null;
  headers: Record<string, string> | null;
  payload: any;
  result: string;
  error_message: string | null;
  processing_time_ms: number | null;
}

export default function ChatwootSettings() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [manualConvId, setManualConvId] = useState('');
  const [processingManual, setProcessingManual] = useState(false);
  const [runningBackfill, setRunningBackfill] = useState(false);
  const [backfillResults, setBackfillResults] = useState<any>(null);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatwoot-webhook`;

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['chatwoot-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatwoot_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as ChatwootSettings;
    },
  });

  // Fetch import logs
  const { data: importLogs, isLoading: importLogsLoading } = useQuery({
    queryKey: ['chatwoot-import-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatwoot_import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ImportLog[];
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch webhook logs
  const { data: webhookLogs, isLoading: webhookLogsLoading, refetch: refetchWebhookLogs } = useQuery({
    queryKey: ['webhook-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('source', 'chatwoot')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as WebhookLog[];
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<ChatwootSettings>) => {
      if (!settings?.id) throw new Error('No settings found');
      
      const { error } = await supabase
        .from('chatwoot_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', settings.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatwoot-settings'] });
      toast.success('Configuración guardada');
    },
    onError: (error: Error) => {
      toast.error('Error guardando configuración: ' + error.message);
    },
  });

  // Regenerate token mutation
  const regenerateToken = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error('No settings found');
      
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from('chatwoot_settings')
        .update({ webhook_token: newToken, updated_at: new Date().toISOString() })
        .eq('id', settings.id);
      
      if (error) throw error;
      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatwoot-settings'] });
      toast.success('Token regenerado. Recuerda actualizar la URL en Chatwoot.');
    },
    onError: (error: Error) => {
      toast.error('Error regenerando token: ' + error.message);
    },
  });

  const webhookUrl = settings ? `${webhookBaseUrl}?token=${settings.webhook_token}` : '';

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success('URL copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error copiando URL');
    }
  };

  const copyPayload = async (payload: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success('Payload copiado al portapapeles');
    } catch {
      toast.error('Error copiando payload');
    }
  };

  const copyFullLog = async (log: WebhookLog) => {
    try {
      const fullLog = {
        id: log.id,
        created_at: log.created_at,
        source: log.source,
        event_type: log.event_type,
        method: log.method,
        result: log.result,
        error_message: log.error_message,
        processing_time_ms: log.processing_time_ms,
        query_params: log.query_params,
        headers: log.headers,
        payload: log.payload,
      };
      await navigator.clipboard.writeText(JSON.stringify(fullLog, null, 2));
      toast.success('Log completo copiado al portapapeles');
    } catch {
      toast.error('Error copiando log');
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Éxito</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'ignored':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Ignorado</Badge>;
      case 'pending':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pendiente</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Éxito</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'skipped':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Omitido</Badge>;
      case 'ignored':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Ignorado</Badge>;
      case 'logged':
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Registrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (settingsLoading) {
    return (
      <div className="p-6">Cargando...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integración Chatwoot</h1>
        <p className="text-muted-foreground">
          Configura el webhook para importar conversaciones automáticamente desde Chatwoot
        </p>
      </div>

      {/* Webhook URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            URL del Webhook
          </CardTitle>
          <CardDescription>
            Copia esta URL y configúrala en Chatwoot → Configuración → Integraciones → Webhooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyWebhookUrl}>
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateToken.mutate()}
              disabled={regenerateToken.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${regenerateToken.isPending ? 'animate-spin' : ''}`} />
              Regenerar Token
            </Button>
            <p className="text-sm text-muted-foreground">
              Si regeneras el token, deberás actualizar la URL en Chatwoot
            </p>
          </div>

          {/* Current Token Display */}
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">Token actual</Label>
            <p className="font-mono text-sm mt-1">{settings?.webhook_token}</p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Personaliza cómo se procesan las conversaciones de Chatwoot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Integración activa</Label>
              <p className="text-sm text-muted-foreground">
                Activa o desactiva la recepción de webhooks
              </p>
            </div>
            <Switch
              checked={settings?.is_active ?? false}
              onCheckedChange={(checked) => updateSettings.mutate({ is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Solo conversaciones resueltas</Label>
              <p className="text-sm text-muted-foreground">
                Solo importar cuando la conversación se marque como resuelta
              </p>
            </div>
            <Switch
              checked={settings?.only_resolved_conversations ?? true}
              onCheckedChange={(checked) => updateSettings.mutate({ only_resolved_conversations: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Procesar con Lexcore automáticamente</Label>
              <p className="text-sm text-muted-foreground">
                Calcular scoring y precio al crear el lead
              </p>
            </div>
            <Switch
              checked={settings?.auto_process_lexcore ?? true}
              onCheckedChange={(checked) => updateSettings.mutate({ auto_process_lexcore: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Canal de origen por defecto</Label>
            <Select
              value={settings?.default_source_channel ?? 'Web chat'}
              onValueChange={(value) => updateSettings.mutate({ default_source_channel: value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Web chat">Web chat</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Teléfono">Teléfono</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Backfill Card - Fase 3 */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600" />
            Backfill: Reprocesar Todas las Conversaciones
          </CardTitle>
          <CardDescription>
            Reprocesa todas las conversaciones de Chatwoot existentes aplicando la regla de oro (email O teléfono requerido) y ejecutando el pipeline completo (IA → Lexcore → Resumen)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              ⚠️ Este proceso puede tardar varios minutos. Procesará:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
              <li>Primero los 10 aliases prioritarios (floral-surf-101, etc.)</li>
              <li>Luego todas las conversaciones resueltas</li>
              <li>Y conversaciones abiertas con más de 24h de inactividad</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-500/10"
              onClick={async () => {
                setRunningBackfill(true);
                setBackfillResults(null);
                try {
                  const { data, error } = await supabase.functions.invoke('backfill-chatwoot', {
                    body: { 
                      limit: 100,
                      inactivity_hours: 24
                    }
                  });
                  
                  if (error) throw error;
                  
                  if (data?.success) {
                    setBackfillResults(data.summary);
                    toast.success(`Backfill completado`, {
                      description: `Procesados: ${data.summary.total_processed}, Creados: ${data.summary.created}, Actualizados: ${data.summary.updated}`
                    });
                    queryClient.invalidateQueries({ queryKey: ['chatwoot-import-logs'] });
                    queryClient.invalidateQueries({ queryKey: ['leads'] });
                    queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
                  } else {
                    toast.error(data?.error || 'Error en backfill');
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Error ejecutando backfill');
                } finally {
                  setRunningBackfill(false);
                }
              }}
              disabled={runningBackfill}
            >
              {runningBackfill ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Ejecutar Backfill Completo
                </>
              )}
            </Button>
          </div>
          
          {backfillResults && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Resultados del Backfill:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-2 bg-background rounded border">
                  <p className="text-muted-foreground">Total procesados</p>
                  <p className="text-lg font-bold">{backfillResults.total_processed}</p>
                </div>
                <div className="p-2 bg-green-500/10 rounded border border-green-500/30">
                  <p className="text-green-600">Creados</p>
                  <p className="text-lg font-bold text-green-600">{backfillResults.created}</p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded border border-blue-500/30">
                  <p className="text-blue-600">Actualizados</p>
                  <p className="text-lg font-bold text-blue-600">{backfillResults.updated}</p>
                </div>
                <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30">
                  <p className="text-amber-600">Rechazados (sin contacto)</p>
                  <p className="text-lg font-bold text-amber-600">{backfillResults.rejected}</p>
                </div>
              </div>
              {backfillResults.errors > 0 && (
                <p className="text-sm text-destructive">Errores: {backfillResults.errors}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Processing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Procesar Conversación Manual
          </CardTitle>
          <CardDescription>
            Procesa una conversación acumulada que no fue cerrada como "resuelta" en Chatwoot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="ID o alias (ej: 3311 o billowing-mountain-320)"
              value={manualConvId}
              onChange={(e) => setManualConvId(e.target.value)}
              className="max-w-[300px]"
            />
            <Button 
            onClick={async () => {
                const trimmedInput = manualConvId.trim();
                
                if (!trimmedInput) {
                  toast.error('Ingresa un ID de conversación o alias de contacto');
                  return;
                }
                
                setProcessingManual(true);
                try {
                  // Check if it's a number (conversation_id) or string (alias)
                  const isNumeric = /^\d+$/.test(trimmedInput);
                  
                  const { data, error } = await supabase.functions.invoke('process-chatwoot-conversation', {
                    body: isNumeric 
                      ? { conversation_id: parseInt(trimmedInput, 10) }
                      : { contact_alias: trimmedInput }
                  });
                  
                  if (error) throw error;
                  
                  if (data?.success) {
                    const action = data.action === 'reprocessed' ? 'Reprocesado' : 'Creado';
                    toast.success(`${action} lead: ${data.lead_id}`, {
                      description: data.changes?.length > 0 
                        ? `Cambios: ${data.changes.length}` 
                        : undefined
                    });
                    setManualConvId('');
                    queryClient.invalidateQueries({ queryKey: ['chatwoot-import-logs'] });
                    queryClient.invalidateQueries({ queryKey: ['leads'] });
                  } else {
                    toast.error(data?.error || 'Error procesando conversación', {
                      description: data?.hint
                    });
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Error al procesar');
                } finally {
                  setProcessingManual(false);
                }
              }}
              disabled={processingManual || !manualConvId.trim()}
            >
              {processingManual ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Procesar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Introduce el ID de conversación de Chatwoot para procesar los mensajes acumulados y crear un lead.
          </p>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Logs de Webhook
          </CardTitle>
          <CardDescription>
            Monitorea todas las peticiones recibidas y su procesamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="webhook">
            <TabsList className="mb-4">
              <TabsTrigger value="webhook">
                Peticiones Recibidas ({webhookLogs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="imports">
                Importaciones ({importLogs?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="webhook">
              <div className="flex items-center justify-between mb-4 gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por alias, conversation_id o texto..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchWebhookLogs()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
              
              {webhookLogsLoading ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : (() => {
                // Filter logs based on search
                const filteredLogs = webhookLogs?.filter(log => {
                  if (!logSearch.trim()) return true;
                  const search = logSearch.toLowerCase();
                  const payloadStr = JSON.stringify(log.payload || {}).toLowerCase();
                  const convId = log.payload?.conversation?.id || log.payload?.conversation_id;
                  const alias = log.payload?.sender?.name || log.payload?.conversation?.meta?.sender?.name || '';
                  
                  return (
                    log.id.toLowerCase().includes(search) ||
                    (convId && String(convId).includes(search)) ||
                    alias.toLowerCase().includes(search) ||
                    payloadStr.includes(search) ||
                    (log.event_type || '').toLowerCase().includes(search) ||
                    (log.error_message || '').toLowerCase().includes(search)
                  );
                }) || [];
                
                // Group logs by conversation_id
                const groupedLogs = filteredLogs.reduce((acc, log) => {
                  const convId = log.payload?.conversation?.id || log.payload?.conversation_id || 'unknown';
                  if (!acc[convId]) acc[convId] = [];
                  acc[convId].push(log);
                  return acc;
                }, {} as Record<string, WebhookLog[]>);
                
                return Object.keys(groupedLogs).length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {Object.entries(groupedLogs).map(([convId, logs]) => {
                        const alias = logs[0]?.payload?.sender?.name || 
                                     logs[0]?.payload?.conversation?.meta?.sender?.name || '';
                        
                        return (
                          <div key={convId} className="border rounded-lg overflow-hidden">
                            <div className="p-3 bg-muted/50 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono">
                                  Conv #{convId}
                                </Badge>
                                {alias && (
                                  <span className="text-sm text-muted-foreground">
                                    {alias}
                                  </span>
                                )}
                              </div>
                              <Badge variant="secondary">{logs.length} eventos</Badge>
                            </div>
                            <div className="divide-y">
                              {logs.map((log) => (
                                <div 
                                  key={log.id} 
                                  className="p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground font-mono" title={log.id}>
                                        #{log.id.slice(0, 8)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: es })}
                                      </span>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {log.event_type || 'unknown'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {log.processing_time_ms && (
                                        <span className="text-xs text-muted-foreground">
                                          {log.processing_time_ms}ms
                                        </span>
                                      )}
                                      {getResultBadge(log.result)}
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLog(log);
                                        }}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {log.error_message && (
                                    <p className="text-sm text-destructive mt-1 truncate" title={log.error_message}>
                                      {log.error_message}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    {logSearch ? (
                      <p>No se encontraron logs para "{logSearch}"</p>
                    ) : (
                      <>
                        <p>No hay peticiones registradas</p>
                        <p className="text-sm mt-1">Las peticiones de Chatwoot aparecerán aquí cuando lleguen</p>
                      </>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="imports">
              {importLogsLoading ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : importLogs && importLogs.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Conversación</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.chatwoot_conversation_id || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.event_type}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay importaciones registradas</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Large Modal for Log Details */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-sm">#{selectedLog?.id.slice(0, 8)}</span>
              {selectedLog && getResultBadge(selectedLog.result)}
              {selectedLog?.processing_time_ms && (
                <span className="text-sm text-muted-foreground font-normal">
                  {selectedLog.processing_time_ms}ms
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
              {' • '}
              {selectedLog?.event_type || 'unknown event'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectedLog && copyPayload(selectedLog.payload)}
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Copiar Payload
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectedLog && copyFullLog(selectedLog)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Log Completo
            </Button>
          </div>

          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {selectedLog?.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <Label className="text-xs text-destructive">Error</Label>
                  <p className="text-sm mt-1">{selectedLog.error_message}</p>
                </div>
              )}
              
              {selectedLog?.query_params && Object.keys(selectedLog.query_params).length > 0 && (
                <div>
                  <Label className="text-xs">Query Params</Label>
                  <pre className="text-xs mt-1 p-3 bg-muted rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.query_params, null, 2)}
                  </pre>
                </div>
              )}
              
              <div>
                <Label className="text-xs">Payload Completo</Label>
                <pre className="text-xs mt-1 p-3 bg-muted rounded-lg overflow-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedLog?.payload, null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
