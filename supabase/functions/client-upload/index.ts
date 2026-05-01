import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_PREFIXES = [
  'image/', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel', 'text/'
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'validate';

    if (action === 'validate') {
      const token = url.searchParams.get('token');
      if (!token) return json({ error: 'Token requerido' }, 400);

      const { data: link, error } = await supabase
        .from('case_upload_links')
        .select('id, lead_id, lawfirm_id, expires_at, max_files, used_count, is_active, client_message')
        .eq('token', token)
        .maybeSingle();

      if (error || !link) return json({ error: 'Enlace no válido' }, 404);
      if (!link.is_active) return json({ error: 'Enlace desactivado' }, 410);
      if (new Date(link.expires_at) < new Date()) return json({ error: 'Enlace caducado' }, 410);
      if (link.used_count >= link.max_files) return json({ error: 'Se ha alcanzado el número máximo de archivos' }, 410);

      // Get firm name (no sensitive data)
      const { data: firm } = await supabase
        .from('lawfirms').select('name, logo_url').eq('id', link.lawfirm_id).maybeSingle();

      return json({
        valid: true,
        firm_name: firm?.name || 'Despacho',
        firm_logo: firm?.logo_url || null,
        max_files: link.max_files,
        used_count: link.used_count,
        remaining: link.max_files - link.used_count,
        expires_at: link.expires_at,
        client_message: link.client_message,
      });
    }

    if (action === 'upload' && req.method === 'POST') {
      const form = await req.formData();
      const token = form.get('token') as string;
      const file = form.get('file') as File;
      const category = (form.get('category') as string) || 'otros';
      const note = form.get('note') as string | null;

      if (!token || !file) return json({ error: 'Token y archivo requeridos' }, 400);
      if (file.size > MAX_FILE_SIZE) return json({ error: 'Archivo demasiado grande (máx 25MB)' }, 413);
      if (!ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p))) {
        return json({ error: 'Tipo de archivo no permitido' }, 415);
      }

      // Validate token
      const { data: link } = await supabase
        .from('case_upload_links')
        .select('id, lead_id, lawfirm_id, expires_at, max_files, used_count, is_active')
        .eq('token', token).maybeSingle();

      if (!link || !link.is_active) return json({ error: 'Enlace no válido' }, 404);
      if (new Date(link.expires_at) < new Date()) return json({ error: 'Enlace caducado' }, 410);
      if (link.used_count >= link.max_files) return json({ error: 'Límite alcanzado' }, 410);

      // Upload to storage
      const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 200);
      const storagePath = `${link.lawfirm_id}/${link.lead_id}/${crypto.randomUUID()}-${safeName}`;
      const buffer = await file.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from('case-documents')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });
      if (uploadErr) {
        console.error('Storage error:', uploadErr);
        return json({ error: 'Error al guardar el archivo' }, 500);
      }

      // Create case_documents record
      const { error: docErr } = await supabase.from('case_documents').insert({
        lead_id: link.lead_id,
        lawfirm_id: link.lawfirm_id,
        uploaded_by_type: 'client',
        file_name: file.name,
        storage_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        category,
        status: 'pending',
        upload_link_id: link.id,
        ai_extracted_data: note ? { client_note: note } : {},
      });
      if (docErr) {
        console.error('DB insert error:', docErr);
        return json({ error: 'Error al registrar el documento' }, 500);
      }

      // Increment counter
      await supabase.from('case_upload_links')
        .update({ used_count: link.used_count + 1 })
        .eq('id', link.id);

      // Add timeline event
      await supabase.from('case_timeline_events').insert({
        lead_id: link.lead_id,
        lawfirm_id: link.lawfirm_id,
        event_type: 'docs_received',
        title: 'Documento recibido del cliente',
        description: `${file.name}${note ? ` — Nota: ${note}` : ''}`,
        metadata: { source: 'client_upload_link', category },
      });

      return json({ success: true, file_name: file.name });
    }

    return json({ error: 'Acción no soportada' }, 400);
  } catch (e) {
    console.error('client-upload error:', e);
    return json({ error: 'Error interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
