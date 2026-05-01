import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Upload, FileText, Image as ImageIcon, File, Trash2, Download, Sparkles, Clock, FolderOpen,
  AlertCircle, CheckCircle2, XCircle, AlertTriangle, MoreVertical, Loader2, ShieldCheck, User,
} from 'lucide-react';
import {
  useLeadDocuments, useUploadDocument, useDeleteDocument, useUpdateDocumentStatus,
  DOCUMENT_CATEGORIES, type DocumentCategory, type LeadDocument, getDocumentSignedUrl,
} from '@/hooks/useLeadDocuments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  leadId: string;
  lawfirmId: string;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
    validated: { label: 'Validado', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
    rejected: { label: 'Rechazado', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
    needs_fix: { label: 'Subsanar', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: AlertTriangle },
  };
  const it = map[status] || map.pending;
  const Icon = it.icon;
  return (
    <Badge variant="secondary" className={`${it.cls} text-xs`}>
      <Icon className="h-3 w-3 mr-1" />{it.label}
    </Badge>
  );
};

interface ValidationResult {
  validated: { file_name: string; reason: string }[];
  issues: { file_name: string; issue: string }[];
  missing: string[];
  completeness_score: number;
  recommendation: string;
}

function DocumentRow({
  doc, onDelete, onDownload, onAnalyze, onSetStatus, analyzing,
}: {
  doc: LeadDocument;
  onDelete: (d: LeadDocument) => void;
  onDownload: (d: LeadDocument) => void;
  onAnalyze: (d: LeadDocument) => void;
  onSetStatus: (d: LeadDocument, s: 'validated' | 'rejected' | 'needs_fix') => void;
  analyzing: boolean;
}) {
  const isClient = doc.uploaded_by_type === 'client';
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">{getFileIcon(doc.file_type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{doc.file_name}</p>
              {getStatusBadge(doc.status)}
              {isClient && (
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />Cliente
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formatFileSize(doc.file_size)}</span>
              <span>·</span>
              <Clock className="h-3 w-3" />
              {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: es })}
            </div>
            {doc.client_note && (
              <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-xs">
                <p className="font-medium mb-0.5">Nota del cliente:</p>
                <p>{doc.client_note}</p>
              </div>
            )}
            {doc.ai_summary && (
              <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                <div className="flex items-center gap-1 text-primary mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span className="font-medium">Resumen IA</span>
                </div>
                <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{doc.ai_summary}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAnalyze(doc)} title="Analizar con IA">
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAnalyze(doc)}>
                  <Sparkles className="h-4 w-4 mr-2" />Analizar con IA
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSetStatus(doc, 'validated')}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />Marcar validado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetStatus(doc, 'rejected')}>
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />Marcar rechazado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetStatus(doc, 'needs_fix')}>
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />Solicitar subsanación
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDownload(doc)}>
                  <Download className="h-4 w-4 mr-2" />Descargar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(doc)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CaseDocumentsTab({ leadId, lawfirmId }: Props) {
  const { data: documents, isLoading, refetch } = useLeadDocuments(leadId);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const setStatus = useUpdateDocumentStatus();

  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('documentacion_caso');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} excede 25MB`); continue; }
      try {
        await uploadDocument.mutateAsync({ leadId, lawfirmId, file, category: selectedCategory });
        toast.success(`${file.name} subido`);
      } catch (err) {
        console.error(err);
        toast.error(`Error subiendo ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (doc: LeadDocument) => {
    if (!confirm(`¿Eliminar "${doc.file_name}"?`)) return;
    try {
      await deleteDocument.mutateAsync({ id: doc.id, storagePath: doc.storage_path, leadId });
      toast.success('Documento eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const handleDownload = async (doc: LeadDocument) => {
    const url = await getDocumentSignedUrl(doc.storage_path);
    if (url) window.open(url, '_blank');
    else toast.error('No se pudo obtener el documento');
  };

  const handleAnalyze = async (doc: LeadDocument) => {
    setAnalyzingId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { document_id: doc.id, lead_id: leadId },
      });
      if (error) throw error;
      toast.success('Documento analizado');
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error al analizar');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleSetStatus = async (doc: LeadDocument, status: 'validated' | 'rejected' | 'needs_fix') => {
    try {
      await setStatus.mutateAsync({ id: doc.id, status, leadId });
      toast.success('Estado actualizado');
    } catch { toast.error('Error'); }
  };

  const handleValidateAll = async () => {
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-case-documents', {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      setValidationResult(data);
      setValidationOpen(true);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Error al validar');
    } finally {
      setValidating(false);
    }
  };

  const filteredDocs = filterCategory === 'all'
    ? documents
    : documents?.filter(d => d.category === filterCategory);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Documentos del caso ({documents?.length || 0})</h3>
        <div className="flex items-center gap-2">
          <Button onClick={handleValidateAll} disabled={validating || !documents?.length} variant="outline" size="sm">
            {validating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
            Validar documentación
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full sm:max-w-[220px]">
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentCategory)}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadDocument.isPending} className="gap-2">
              <Upload className="h-4 w-4" />
              {uploadDocument.isPending ? 'Subiendo...' : 'Subir documento'}
            </Button>
            <input
              ref={fileInputRef} type="file" multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              onChange={handleFileSelect} className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Formatos: PDF, Word, Excel, imágenes. Máx 25 MB por archivo.
          </p>
        </CardContent>
      </Card>

      {/* Filter */}
      {documents && documents.length > 0 && (
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {DOCUMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {filteredDocs?.length || 0} documento{filteredDocs?.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Documents */}
      {!documents?.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium">Sin documentos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sube documentos o solicítalos al cliente con un enlace seguro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredDocs?.map(doc => (
            <DocumentRow
              key={doc.id} doc={doc}
              analyzing={analyzingId === doc.id}
              onDelete={handleDelete} onDownload={handleDownload}
              onAnalyze={handleAnalyze} onSetStatus={handleSetStatus}
            />
          ))}
        </div>
      )}

      {/* Validation Dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Validación documental del caso
            </DialogTitle>
          </DialogHeader>
          {validationResult && (
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium mb-1">Completitud del expediente</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary transition-all"
                      style={{ width: `${validationResult.completeness_score}%` }} />
                  </div>
                  <span className="font-semibold text-sm">{validationResult.completeness_score}%</span>
                </div>
              </div>

              {validationResult.validated?.length > 0 && (
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-1 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Documentos validados ({validationResult.validated.length})
                  </h4>
                  <div className="space-y-1.5">
                    {validationResult.validated.map((d, i) => (
                      <div key={i} className="text-sm p-2 bg-green-50 dark:bg-green-950/30 rounded">
                        <p className="font-medium">✓ {d.file_name}</p>
                        <p className="text-xs text-muted-foreground">{d.reason}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {validationResult.issues?.length > 0 && (
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Problemas detectados ({validationResult.issues.length})
                  </h4>
                  <div className="space-y-1.5">
                    {validationResult.issues.map((d, i) => (
                      <div key={i} className="text-sm p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                        <p className="font-medium">⚠ {d.file_name}</p>
                        <p className="text-xs text-muted-foreground">{d.issue}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {validationResult.missing?.length > 0 && (
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-1 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Documentación pendiente ({validationResult.missing.length})
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {validationResult.missing.map((m, i) => (
                      <li key={i} className="p-2 bg-red-50 dark:bg-red-950/30 rounded">✗ {m}</li>
                    ))}
                  </ul>
                </section>
              )}

              {validationResult.recommendation && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-1 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />Recomendación IA
                  </p>
                  <p className="text-sm">{validationResult.recommendation}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
