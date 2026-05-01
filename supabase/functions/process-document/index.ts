import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { document_id, lead_id } = await req.json();
    if (!document_id || !lead_id) {
      return json({ error: "document_id and lead_id required" }, 400);
    }

    const { data: doc, error: docErr } = await supabase
      .from("case_documents").select("*").eq("id", document_id).maybeSingle();
    if (docErr || !doc) return json({ error: "Document not found" }, 404);

    const { data: lead } = await supabase
      .from("leads").select("structured_fields, case_summary").eq("id", lead_id).maybeSingle();

    const fields = (lead?.structured_fields as Record<string, unknown>) || {};

    const result = await callAI({
      prompt_key: "process_document",
      function_name: "process-document",
      lead_id,
      variables: {
        file_name: doc.file_name,
        file_type: doc.file_type || "unknown",
        file_size_kb: doc.file_size ? Math.round(doc.file_size / 1024) : 0,
        category: doc.category || "otros",
        client_note: doc.client_note || "",
        case_area: (fields.area_legal as string) || "",
        case_summary: lead?.case_summary || "",
      },
    });

    const parsed = (result.parsed as any) || tryParseLoose(result.text);
    const summary = parsed?.summary || result.text.slice(0, 500);
    const extracted = parsed?.potential_data || {};

    await supabase.from("case_documents").update({
      ai_summary: summary,
      ai_extracted_data: extracted,
      ai_validation_status: parsed?.relevance || null,
    }).eq("id", document_id);

    // Backfill missing contact fields in lead
    const updates: Record<string, unknown> = {};
    if (extracted.nombre && !fields.nombre) updates.nombre = extracted.nombre;
    if (extracted.email && !fields.email) updates.email = extracted.email;
    if (extracted.telefono && !fields.telefono) updates.telefono = extracted.telefono;
    if (extracted.cuantia && !fields.cuantia) updates.cuantia = extracted.cuantia;

    if (Object.keys(updates).length > 0) {
      await supabase.from("leads")
        .update({ structured_fields: { ...fields, ...updates } as any })
        .eq("id", lead_id);
    }

    // Timeline
    await supabase.from("case_timeline_events").insert({
      lead_id,
      lawfirm_id: doc.lawfirm_id,
      event_type: "document_analyzed",
      title: "Documento analizado por IA",
      description: doc.file_name,
      metadata: { document_id, relevance: parsed?.relevance },
    });

    return json({ success: true, summary, extracted_data: extracted, relevance: parsed?.relevance });
  } catch (e) {
    console.error("[process-document]", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

function tryParseLoose(text: string): any {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
