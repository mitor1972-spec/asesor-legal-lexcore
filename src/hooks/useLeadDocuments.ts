import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type DocumentCategory = 
  | 'datos_personales' 
  | 'notificaciones_juzgado' 
  | 'documentacion_caso' 
  | 'fotografias' 
  | 'comunicaciones';

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; description: string }[] = [
  { value: 'datos_personales', label: 'Datos Personales', description: 'DNI, pasaporte, domicilio, etc.' },
  { value: 'notificaciones_juzgado', label: 'Notificaciones Juzgado/Policía', description: 'Citaciones, requerimientos, denuncias' },
  { value: 'documentacion_caso', label: 'Documentación del Caso', description: 'Contratos, facturas, pruebas' },
  { value: 'fotografias', label: 'Fotografías', description: 'Imágenes de daños, pruebas visuales' },
  { value: 'comunicaciones', label: 'Comunicaciones', description: 'Emails, WhatsApp, cartas' },
];

export interface LeadDocument {
  id: string;
  lead_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by_user_id: string | null;
  uploaded_at: string;
  attachment_context: string;
  category: DocumentCategory;
  ai_summary: string | null;
  ai_extracted_data: Record<string, unknown> | null;
  processed_at: string | null;
}

export function useLeadDocuments(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_attachments')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as LeadDocument[];
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
      file,
      category,
    }: {
      leadId: string;
      file: File;
      category: DocumentCategory;
    }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${leadId}/${Date.now()}-${file.name}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { data: attachment, error: dbError } = await supabase
        .from('lead_attachments')
        .insert({
          lead_id: leadId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: uploadData.path,
          uploaded_by_user_id: user?.id,
          attachment_context: 'update',
          category,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return attachment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', variables.leadId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath, leadId }: { id: string; storagePath: string; leadId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('lead-documents')
        .remove([storagePath]);

      if (storageError) console.error('Storage deletion error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('lead_attachments')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', variables.leadId] });
    },
  });
}

export function useProcessDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, leadId }: { documentId: string; leadId: string }) => {
      // Call edge function to process document with AI
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { document_id: documentId, lead_id: leadId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
    },
  });
}

export function getDocumentUrl(storagePath: string): string {
  const { data } = supabase.storage.from('lead-documents').getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('lead-documents')
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  
  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
  return data.signedUrl;
}
