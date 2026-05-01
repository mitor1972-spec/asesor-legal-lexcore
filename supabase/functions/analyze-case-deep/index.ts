import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // JWT validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { lead_id } = await req.json();
    if (!lead_id) return json({ error: "lead_id required" }, 400);

    const { data: lead, error: le } = await admin
      .from("leads")
      .select("structured_fields, case_summary, lead_text")
      .eq("id", lead_id)
      .maybeSingle();
    if (le || !lead) return json({ error: "Lead not found" }, 404);

    const { data: assignment } = await admin
      .from("lead_assignments")
      .select("lawfirm_id")
      .eq("lead_id", lead_id)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lawfirmId = assignment?.lawfirm_id ?? null;

    const { data: docs } = await admin
      .from("case_documents")
      .select("file_name, category, ai_summary, status")
      .eq("lead_id", lead_id);

    const documentsList = (docs || []).map(d =>
      `- ${d.file_name} (${d.category || 'otros'}) [${d.status}]: ${d.ai_summary || 'sin analizar'}`
    ).join("\n") || "(no hay documentos aportados)";

    const fields = (lead.structured_fields as Record<string, unknown>) || {};

    const result = await callAI({
      prompt_key: "analyze_case_deep",
      function_name: "analyze-case-deep",
      lead_id,
      variables: {
        structured_fields: JSON.stringify(fields, null, 2),
        case_summary: lead.case_summary || lead.lead_text || "(sin resumen)",
        documents_list: documentsList,
      },
    });

    // Save to lead and timeline
    const updatedFields = { ...fields, deep_analysis: result.text, deep_analysis_at: new Date().toISOString() };
    await admin.from("leads").update({ structured_fields: updatedFields }).eq("id", lead_id);

    if (lawfirmId) {
      await admin.from("case_timeline_events").insert({
        lead_id,
        lawfirm_id: lawfirmId,
        event_type: "ai_deep_analysis",
        title: "Análisis jurídico profundo generado",
        description: "Informe IA completo: viabilidad, riesgos, estrategia y próximos pasos.",
        metadata: { model: result.model, prompt_version: result.prompt_version },
      });
    }

    return json({ success: true, analysis: result.text, model: result.model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[analyze-case-deep]", msg);
    return json({ error: msg }, 500);
  }
});
