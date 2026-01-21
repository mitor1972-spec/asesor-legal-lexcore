import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Download,
  Sparkles,
  Clock,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { 
  useLeadDocuments, 
  useUploadDocument, 
  useDeleteDocument,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type LeadDocument,
  getDocumentSignedUrl 
} from '@/hooks/useLeadDocuments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CaseDocumentsTabProps {
  leadId: string;
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const getCategoryColor = (category: DocumentCategory): string => {
  const colors: Record<DocumentCategory, string> = {
    datos_personales: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    notificaciones_juzgado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    documentacion_caso: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    fotografias: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    comunicaciones: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return colors[category] || 'bg-muted text-muted-foreground';
};

function DocumentCard({ doc, onDelete, onDownload }: { 
  doc: LeadDocument; 
  onDelete: (doc: LeadDocument) => void;
  onDownload: (doc: LeadDocument) => void;
}) {
  const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category;
  
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            {getFileIcon(doc.file_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{doc.file_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={getCategoryColor(doc.category)}>
                {categoryLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(doc.file_size)}
              </span>
            </div>
            
            {doc.ai_summary && (
              <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                <div className="flex items-center gap-1 text-primary mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span className="font-medium">Resumen IA</span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{doc.ai_summary}</p>
              </div>
            )}
            
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: es })}
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDownload(doc)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(doc)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CaseDocumentsTab({ leadId }: CaseDocumentsTabProps) {
  const { data: documents, isLoading } = useLeadDocuments(leadId);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('documentacion_caso');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10MB`);
        continue;
      }

      try {
        await uploadDocument.mutateAsync({
          leadId,
          file,
          category: selectedCategory,
        });
        toast.success(`${file.name} subido correctamente`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Error subiendo ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: LeadDocument) => {
    if (!confirm(`¿Eliminar "${doc.file_name}"?`)) return;
    
    try {
      await deleteDocument.mutateAsync({
        id: doc.id,
        storagePath: doc.storage_path,
        leadId,
      });
      toast.success('Documento eliminado');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    const url = await getDocumentSignedUrl(doc.storage_path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Error al obtener el documento');
    }
  };

  // Group documents by category
  const groupedDocs = documents?.reduce((acc, doc) => {
    const cat = doc.category || 'documentacion_caso';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, LeadDocument[]>) || {};

  const filteredDocs = filterCategory === 'all' 
    ? documents 
    : documents?.filter(d => d.category === filterCategory);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full sm:max-w-[200px]">
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div>
                        <span>{cat.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {cat.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocument.isPending}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadDocument.isPending ? 'Subiendo...' : 'Subir Documentos'}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            Formatos: PDF, Word, Excel, imágenes. Máximo 10MB por archivo.
          </p>
        </CardContent>
      </Card>

      {/* Filter */}
      {documents && documents.length > 0 && (
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {DOCUMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label} ({groupedDocs[cat.value]?.length || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Badge variant="secondary" className="ml-auto">
            {filteredDocs?.length || 0} documento{filteredDocs?.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Documents List */}
      {!documents?.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium">Sin documentos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sube documentos para organizar la información del caso
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredDocs?.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
