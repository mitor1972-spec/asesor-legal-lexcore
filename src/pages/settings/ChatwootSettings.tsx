import { useState } from 'react';
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
import { toast } from 'sonner';
import { Copy, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle, Activity, FileText, Clipboard, Play } from 'lucide-react';
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
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => refetchWebhookLogs()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
              
              {webhookLogsLoading ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : webhookLogs && webhookLogs.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {webhookLogs.map((log) => (
                      <Collapsible
                        key={log.id}
                        open={expandedLogId === log.id}
                        onOpenChange={(open) => setExpandedLogId(open ? log.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: es })}
                                </span>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {log.method}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {log.event_type || 'unknown'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {log.processing_time_ms && (
                                  <span className="text-xs text-muted-foreground">
                                    {log.processing_time_ms}ms
                                  </span>
                                )}
                                {getResultBadge(log.result)}
                              </div>
                            </div>
                            {log.error_message && (
                              <p className="text-sm text-destructive mt-1">
                                {log.error_message}
                              </p>
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 p-3 bg-muted rounded-lg space-y-3">
                            {/* Copy Full Log Button at the top */}
                            <div className="flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyFullLog(log);
                                }}
                              >
                                <Clipboard className="w-3 h-3 mr-1" />
                                Copiar log completo
                              </Button>
                            </div>
                            
                            {log.query_params && Object.keys(log.query_params).length > 0 && (
                              <div>
                                <Label className="text-xs">Query Params</Label>
                                <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
                                  {JSON.stringify(log.query_params, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.headers && Object.keys(log.headers).length > 0 && (
                              <div>
                                <Label className="text-xs">Headers</Label>
                                <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto max-h-32">
                                  {JSON.stringify(log.headers, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.payload && (
                              <div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">Payload</Label>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyPayload(log.payload);
                                    }}
                                  >
                                    <Clipboard className="w-3 h-3 mr-1" />
                                    Copiar payload
                                  </Button>
                                </div>
                                <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto max-h-64">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay peticiones registradas</p>
                  <p className="text-sm mt-1">Las peticiones de Chatwoot aparecerán aquí cuando lleguen</p>
                </div>
              )}
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
    </div>
  );
}
