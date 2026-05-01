import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-client.ts";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { lead_id } = await req.json();
    if (!lead_id) return json({ error: "lead_id required" }, 400);

    const { data: lead, error: le } = await supabase
      .from("leads").select("structured_fields, case_summary").eq("id", lead_id).maybeSingle();
    if (le || !lead) return json({ error: "Lead not found" }, 404);

    const { data: assignment } = await supabase
      .from("lead_assignments").select("lawfirm_id").eq("lead_id", lead_id)
      .order("assigned_at", { ascending: false }).limit(1).maybeSingle();
    const assignedFirmId = assignment?.lawfirm_id ?? null;

    // Authorization
    const userId = userData.user.id;
    const { data: profile } = await supabase.from("profiles").select("lawfirm_id").eq("id", userId).maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isInternal = roles?.some(r => r.role === "admin" || r.role === "operator") ?? false;
    const sameFirm = assignedFirmId && profile?.lawfirm_id === assignedFirmId;
    if (!isInternal && !sameFirm) return json({ error: "Forbidden" }, 403);

    const { data: docs } = await supabase
      .from("case_documents")
      .select("id, file_name, category, ai_summary, status, lawfirm_id")
      .eq("lead_id", lead_id);

    const documentsList = (docs || []).map(d =>
      `- ${d.file_name} (${d.category || 'otros'}) [${d.status}]: ${d.ai_summary || 'sin analizar'}`
    ).join("\n") || "(no hay documentos aportados)";

    const fields = (lead.structured_fields as Record<string, unknown>) || {};

    const result = await callAI({
      prompt_key: "validate_case_documents",
      function_name: "validate-case-documents",
      lead_id,
      variables: {
        area_legal: (fields.area_legal as string) || "no especificada",
        subarea: (fields.subarea as string) || "",
        case_summary: lead.case_summary || JSON.stringify(fields).slice(0, 1500),
        documents_list: documentsList,
      },
    });

    const parsed = result.parsed as any || {
      validated: [], issues: [], missing: [], completeness_score: 0,
      recommendation: "No se pudo procesar la respuesta de la IA.",
    };

    const lawfirmId = docs?.[0]?.lawfirm_id;
    if (lawfirmId) {
      await supabase.from("case_timeline_events").insert({
        lead_id,
        lawfirm_id: lawfirmId,
        event_type: "documentation_validated",
        title: "Documentación del caso validada",
        description: `${parsed.validated?.length || 0} validados · ${parsed.missing?.length || 0} pendientes · ${parsed.issues?.length || 0} con incidencias`,
        metadata: { completeness_score: parsed.completeness_score },
      });
    }

    return json(parsed);
  } catch (e) {
    console.error("[validate-case-documents]", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
