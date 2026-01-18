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
import { toast } from 'sonner';
import { Copy, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export default function ChatwootSettings() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

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
  const { data: logs, isLoading: logsLoading } = useQuery({
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

        {/* Import Logs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de importaciones</CardTitle>
            <CardDescription>
              Últimas 50 importaciones de Chatwoot
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : logs && logs.length > 0 ? (
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
                    {logs.map((log) => (
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
              <p className="text-muted-foreground">No hay importaciones registradas</p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
