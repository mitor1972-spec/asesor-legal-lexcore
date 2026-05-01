// =====================================================================
// generate-case-summary
//
// Refactor (Fase 6 · paso 1):
//   - Toda la lógica del prompt vive ahora en `ai_prompts.case_summary`
//     (editable desde el panel /settings/ai-prompts).
//   - Esta función SOLO se encarga de:
//        1. cargar el lead + scoring
//        2. preparar las variables
//        3. llamar al helper centralizado callAI()
//        4. guardar el resultado en leads.case_summary
//   - Cada ejecución queda registrada en `ai_logs` automáticamente.
//
// El comportamiento externo es 100% compatible: misma firma, misma respuesta.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-client.ts";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { lead_id } = body;
    let { lead_text, structured_fields, scoring_data, source_channel } = body;

    if (!lead_id) {
      throw new Error("Missing required field: lead_id");
    }

    // --- Auto-fetch lead if needed (consistent with extract-lead-data pattern) ---
    if (!lead_text) {
      console.log(`[generate-case-summary] Fetching lead ${lead_id}...`);
      const { data: lead, error: leadError } = await admin
        .from("leads")
        .select("lead_text, structured_fields, source_channel")
        .eq("id", lead_id)
        .single();

      if (leadError || !lead) {
        throw new Error(
          `Failed to fetch lead: ${leadError?.message || "Lead not found"}`
        );
      }

      lead_text = lead.lead_text;
      structured_fields = structured_fields || lead.structured_fields;
      source_channel = source_channel || lead.source_channel;
    }

    if (!lead_text) {
      throw new Error("No lead_text available for summary generation");
    }

    // --- Fetch latest lexcore scoring if not provided ---
    if (!scoring_data) {
      const { data: lexcoreRun } = await admin
        .from("lexcore_runs")
        .select("score_final, price_lexcore, vj_json")
        .eq("lead_id", lead_id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lexcoreRun) scoring_data = lexcoreRun;
    }

    const sf = structured_fields || {};
    const scoring = scoring_data || {};

    // --- Build variables for the centralized prompt ---
    const variables = {
      lead_text,
      nombre: sf.nombre ?? "",
      apellidos: sf.apellidos ?? "",
      telefono: sf.telefono ?? "",
      email: sf.email ?? "",
      ciudad: sf.ciudad ?? "",
      provincia: sf.provincia ?? "",
      area_legal: sf.area_legal ?? "",
      subarea: sf.subarea ?? "",
      cuantia: sf.cuantia ? `${Number(sf.cuantia).toLocaleString("es-ES")}€` : "",
      urgencia: sf.urgencia_aplica ? sf.urgencia_nivel ?? "" : "",
      canal: source_channel ?? "",
      score_final: scoring.score_final ?? "",
      price_lexcore: scoring.price_lexcore ? `${scoring.price_lexcore}€` : "",
      vj_score: scoring.vj_json?.score ?? "",
      vj_conclusion: scoring.vj_json?.conclusion ?? "",
    };

    console.log(
      `[generate-case-summary] Calling callAI(case_summary) for lead ${lead_id}...`
    );

    const result = await callAI({
      prompt_key: "case_summary",
      variables,
      function_name: "generate-case-summary",
      lead_id,
      admin,
    });

    const summary = result.text;
    if (!summary) {
      throw new Error("Empty summary returned from AI");
    }

    // --- Persist the summary on the lead ---
    const { error: updateError } = await admin
      .from("leads")
      .update({ case_summary: summary })
      .eq("id", lead_id);

    if (updateError) {
      console.error("[generate-case-summary] Update error:", updateError);
      throw updateError;
    }

    console.log(
      `[generate-case-summary] Done. v${result.prompt_version} · ${result.duration_ms}ms`
    );

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        lead_id,
        prompt_version: result.prompt_version,
        duration_ms: result.duration_ms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-case-summary] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
