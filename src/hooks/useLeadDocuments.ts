import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Document hooks — UNIFIED on `case_documents` table.
 * The legacy `lead_attachments` table is no longer used by the lawyer workspace.
 * `case_documents` is shared between lawyer uploads and the public client upload portal,
 * so the lawyer sees ALL documents (own + client) in a single tab.
 */

export type DocumentCategory =
  | 'datos_personales'
  | 'notificaciones_juzgado'
  | 'documentacion_caso'
  | 'fotografias'
  | 'comunicaciones'
  | 'dni'
  | 'contrato'
  | 'factura'
  | 'burofax'
  | 'resolucion'
  | 'demanda'
  | 'sentencia'
  | 'justificante_pago'
  | 'prueba'
  | 'otros';

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; description: string }[] = [
  { value: 'datos_personales', label: 'Datos Personales', description: 'DNI, pasaporte, domicilio, etc.' },
  { value: 'notificaciones_juzgado', label: 'Notificaciones Juzgado/Policía', description: 'Citaciones, requerimientos, denuncias' },
  { value: 'documentacion_caso', label: 'Documentación del Caso', description: 'Contratos, facturas, pruebas' },
  { value: 'fotografias', label: 'Fotografías', description: 'Imágenes de daños, pruebas visuales' },
  { value: 'comunicaciones', label: 'Comunicaciones', description: 'Emails, WhatsApp, cartas' },
  { value: 'otros', label: 'Otros', description: 'Otros documentos' },
];

export interface LeadDocument {
  id: string;
  lead_id: string;
  lawfirm_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_by_type: 'lawyer' | 'client' | string;
  created_at: string;
  updated_at: string;
  category: string;
  status: string;
  ai_summary: string | null;
  ai_extracted_data: Record<string, unknown> | null;
  ai_validation_status: string | null;
  client_note: string | null;
  upload_link_id: string | null;
  // Compatibility alias
  uploaded_at: string;
}

export function useLeadDocuments(leadId: string | undefined) {
  return useQuery({
    queryKey: ['case-documents', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('case_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data || []) as any[]).map(d => ({ ...d, uploaded_at: d.created_at })) as LeadDocument[];
    },
    enabled: !!leadId,
  });
}

export function useUploadDocument() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      lawfirmId,
      file,
      category,
    }: {
      leadId: string;
      lawfirmId: string;
      file: File;
      category: DocumentCategory;
    }) => {
      const safe = file.name.replace(/[^\w.\-]/g, '_').slice(0, 200);
      const filePath = `${lawfirmId}/${leadId}/${Date.now()}-${safe}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: doc, error: dbError } = await supabase
        .from('case_documents')
        .insert({
          lead_id: leadId,
          lawfirm_id: lawfirmId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: uploadData.path,
          uploaded_by: user?.id,
          uploaded_by_type: 'lawyer',
          category,
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Timeline event
      await supabase.from('case_timeline_events').insert({
        lead_id: leadId,
        lawfirm_id: lawfirmId,
        event_type: 'document_uploaded',
        title: 'Documento subido por el despacho',
        description: file.name,
        metadata: { category, document_id: doc.id },
      });

      return doc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['case-timeline', variables.leadId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath, leadId }: { id: string; storagePath: string; leadId: string }) => {
      const { error: storageError } = await supabase.storage
        .from('case-documents')
        .remove([storagePath]);
      if (storageError) console.error('Storage deletion error:', storageError);

      const { error: dbError } = await supabase.from('case_documents').delete().eq('id', id);
      if (dbError) throw dbError;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.leadId] });
    },
  });
}

export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, leadId }: { id: string; status: 'validated' | 'rejected' | 'needs_fix' | 'pending'; leadId: string }) => {
      const { error } = await supabase.from('case_documents').update({ status }).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.leadId] });
    },
  });
}

export function useProcessDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, leadId }: { documentId: string; leadId: string }) => {
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { document_id: documentId, lead_id: leadId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.leadId] });
    },
  });
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('case-documents')
    .createSignedUrl(storagePath, 60 * 60);
  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

export function getDocumentUrl(storagePath: string): string {
  const { data } = supabase.storage.from('case-documents').getPublicUrl(storagePath);
  return data.publicUrl;
}
