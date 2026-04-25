import { useState } from 'react';
import { useAiLogs } from '@/hooks/useAiPrompts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Loader2, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AiLogsTabProps {
  availablePromptKeys: string[];
}

export function AiLogsTab({ availablePromptKeys }: AiLogsTabProps) {
  const [promptKey, setPromptKey] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logs, isLoading, refetch, isFetching } = useAiLogs({
    prompt_key: promptKey === 'all' ? undefined : promptKey,
    status: status === 'all' ? undefined : status,
    limit: 200,
  });

  const filtered = (logs ?? []).filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.prompt_key.toLowerCase().includes(s) ||
      (l.function_name ?? '').toLowerCase().includes(s) ||
      (l.error_message ?? '').toLowerCase().includes(s) ||
      (l.lead_id ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Prompt</label>
          <Select value={promptKey} onValueChange={setPromptKey}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {availablePromptKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Estado</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Éxito</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Buscar</label>
          <Input
            placeholder="prompt, función, lead, error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay logs que coincidan con los filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <Card
              key={log.id}
              className={`shadow-soft ${log.status === 'error' ? 'border-destructive/40' : ''}`}
            >
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold">{log.prompt_key}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          v{log.prompt_version ?? '?'}
                        </Badge>
                        {log.function_name && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {log.function_name}
                          </Badge>
                        )}
                        {log.model && (
                          <span className="text-[10px] text-muted-foreground">{log.model}</span>
                        )}
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1 line-clamp-2">
                          {log.error_message}
                        </p>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                        <span>
                          {format(new Date(log.created_at), "d MMM HH:mm:ss", { locale: es })}
                        </span>
                        {log.duration_ms != null && <span>· {log.duration_ms}ms</span>}
                        {log.tokens_input != null && (
                          <span>
                            · tokens {log.tokens_input}/{log.tokens_output ?? '?'}
                          </span>
                        )}
                        {log.lead_id && (
                          <span className="font-mono">· lead {log.lead_id.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de ejecución IA</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Prompt:</span>{' '}
                  <span className="font-mono">{selectedLog.prompt_key}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Versión:</span> v{selectedLog.prompt_version}
                </div>
                <div>
                  <span className="text-muted-foreground">Función:</span>{' '}
                  {selectedLog.function_name ?? '–'}
                </div>
                <div>
                  <span className="text-muted-foreground">Modelo:</span> {selectedLog.model ?? '–'}
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span> {selectedLog.status}
                </div>
                <div>
                  <span className="text-muted-foreground">Duración:</span>{' '}
                  {selectedLog.duration_ms ?? '–'}ms
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-destructive">Error</h4>
                  <pre className="bg-destructive/5 border border-destructive/20 rounded p-3 text-xs whitespace-pre-wrap">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  Input
                </h4>
                <pre className="bg-muted rounded p-3 text-xs whitespace-pre-wrap max-h-64 overflow-auto">
                  {JSON.stringify(selectedLog.input, null, 2)}
                </pre>
              </div>

              {selectedLog.output && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Output</h4>
                  <pre className="bg-muted rounded p-3 text-xs whitespace-pre-wrap max-h-64 overflow-auto">
                    {selectedLog.output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
