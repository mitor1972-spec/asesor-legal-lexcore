import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, CheckCircle2, ShieldCheck, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/client-upload`;

const CATEGORIES = [
  { value: 'dni', label: 'DNI / NIE' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'factura', label: 'Factura' },
  { value: 'burofax', label: 'Burofax' },
  { value: 'resolucion', label: 'Resolución administrativa' },
  { value: 'demanda', label: 'Demanda' },
  { value: 'sentencia', label: 'Sentencia' },
  { value: 'justificante_pago', label: 'Justificante de pago' },
  { value: 'prueba', label: 'Prueba documental' },
  { value: 'otros', label: 'Otros' },
];

interface LinkInfo {
  valid: boolean;
  firm_name: string;
  firm_logo: string | null;
  max_files: number;
  used_count: number;
  remaining: number;
  expires_at: string;
  client_message?: string | null;
}

export default function ClientUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('otros');
  const [note, setNote] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  useEffect(() => {
    if (!token) { setError('Token no proporcionado'); setLoading(false); return; }
    fetch(`${FUNCTIONS_URL}?action=validate&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setLinkInfo(data);
      })
      .catch(() => setError('No se pudo validar el enlace'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (linkInfo && list.length > linkInfo.remaining) {
      toast.error(`Solo puedes subir ${linkInfo.remaining} archivo(s) más`);
      return;
    }
    setFiles(list);
  };

  const handleUpload = async () => {
    if (!token || !files.length || !accepted || !linkInfo) return;
    setUploading(true);
    let success = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('file', file);
      fd.append('category', category);
      if (note) fd.append('note', note);
      try {
        const r = await fetch(`${FUNCTIONS_URL}?action=upload`, { method: 'POST', body: fd });
        const data = await r.json();
        if (data.success) success++;
        else toast.error(`${file.name}: ${data.error}`);
      } catch {
        toast.error(`No se pudo subir ${file.name}`);
      }
    }
    setUploadedCount(prev => prev + success);
    setFiles([]);
    setNote('');
    if (success > 0) {
      toast.success(`${success} archivo(s) enviado(s) correctamente`);
      // Refresh link info
      const r = await fetch(`${FUNCTIONS_URL}?action=validate&token=${encodeURIComponent(token)}`);
      const data = await r.json();
      if (data.valid) setLinkInfo(data);
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !linkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Enlace no disponible</h1>
            <p className="text-sm text-muted-foreground">{error || 'El enlace no es válido o ha caducado.'}</p>
            <p className="text-xs text-muted-foreground">Si necesitas enviar documentación, contacta con tu despacho.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDone = linkInfo.remaining === 0;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader className="text-center">
            {linkInfo.firm_logo && (
              <img src={linkInfo.firm_logo} alt={linkInfo.firm_name} className="h-12 mx-auto mb-2 object-contain" />
            )}
            <CardTitle className="text-xl">Subida segura de documentación</CardTitle>
            <p className="text-sm text-muted-foreground">para su expediente en <strong>{linkInfo.firm_name}</strong></p>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkInfo.client_message && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                {linkInfo.client_message}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Conexión segura · Caduca el {new Date(linkInfo.expires_at).toLocaleDateString('es-ES')}
              · {linkInfo.remaining}/{linkInfo.max_files} archivos disponibles
            </div>
          </CardContent>
        </Card>

        {allDone ? (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="font-medium">Has subido todos los archivos disponibles</p>
              <p className="text-sm text-muted-foreground">Si necesitas enviar más, solicita un nuevo enlace al despacho.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subir documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo de documento</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Archivos *</label>
                <Input
                  type="file"
                  multiple
                  onChange={handleFilesChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                />
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />{f.name} · {(f.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: PDF, Word, Excel, imágenes. Máx 25 MB por archivo.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Comentario (opcional)</label>
                <Textarea
                  rows={3}
                  placeholder="Indica cualquier información relevante para tu abogado..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox id="legal" checked={accepted} onCheckedChange={c => setAccepted(!!c)} className="mt-0.5" />
                <label htmlFor="legal" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Autorizo el envío de estos documentos al despacho <strong>{linkInfo.firm_name}</strong> en
                  el contexto de mi expediente. Los archivos se almacenan de forma segura y solo serán
                  accesibles por mi despacho. Acepto el tratamiento de mis datos según la política de privacidad.
                </label>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleUpload}
                disabled={!files.length || !accepted || uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar {files.length} archivo{files.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        )}

        {uploadedCount > 0 && (
          <p className="text-center text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 inline mr-1" />
            {uploadedCount} archivo(s) enviado(s) en esta sesión
          </p>
        )}
      </div>
    </div>
  );
}
