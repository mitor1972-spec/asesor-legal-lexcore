// =====================================================================
// calculate-lexcore
//
// Refactor (Fase 6 · paso 3):
//   - El prompt de scoring vive ahora en `ai_prompts.lexcore_scoring_system`
//     (editable desde /settings/ai-prompts).
//   - Esta función SOLO se encarga de:
//       1. validar auth (acepta service-role para invocaciones internas)
//       2. cargar el lead y la configuración Lexcore activa
//       3. preparar variables (structured_fields, lead_text, source_channel, config_json)
//       4. llamar al helper centralizado callAI()
//       5. persistir el resultado en lexcore_runs y actualizar el lead
//   - Cada ejecución queda registrada en `ai_logs` automáticamente.
//
// La firma externa se mantiene 100% compatible:
//   { success, scoring, run_id, usage }
//
// Reglas de negocio NO modificadas:
//   - score_final cap a 95
//   - fallback de precio cuando price_final <= 0
//   - actualización de leads.marketplace_summary, marketplace_price, score_final, price_final
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-client.ts";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    // ---- Auth (admite service-role para llamadas internas, p.ej. reprocess) ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRoleRequest = token === supabaseServiceRoleKey;

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const supabase = isServiceRoleRequest
      ? adminClient
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

    let userId: string | null = null;
    if (!isServiceRoleRequest) {
      const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claims.claims.sub as string;
    }

    // ---- Body ----
    const requestBody = await req.json();
    const { lead_id } = requestBody;
    let { lead_text, structured_fields, source_channel } = requestBody;

    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Auto-fetch lead snapshot (siempre tomamos la versión más reciente de BD) ----
    console.log(`[Lexcore] Fetching lead snapshot lead_id=${lead_id}`);
    const { data: leadData, error: leadError } = await adminClient
      .from("leads")
      .select("lead_text, structured_fields, source_channel")
      .eq("id", lead_id)
      .single();

    if (leadError || !leadData) {
      console.error("Lead fetch error:", leadError);
      return new Response(JSON.stringify({ error: "Lead not found", lead_id }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    lead_text = leadData.lead_text || lead_text;
    structured_fields = leadData.structured_fields ?? structured_fields;
    source_channel = leadData.source_channel ?? source_channel;

    if (!lead_text) {
      return new Response(
        JSON.stringify({ error: "lead_text is required (or lead must have text in database)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Active Lexcore configuration ----
    const { data: config, error: configError } = await supabase
      .from("lexcore_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config) {
      console.error("Config error:", configError);
      return new Response(
        JSON.stringify({ error: "No active Lexcore configuration found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Centralized AI call ----
    console.log(
      `[Lexcore] callAI(lexcore_scoring_system) · lead_id=${lead_id} · text_len=${lead_text.length} · internal=${isServiceRoleRequest}`,
    );

    const result = await callAI({
      prompt_key: "lexcore_scoring_system",
      variables: {
        structured_fields: structured_fields || {},
        lead_text,
        source_channel: source_channel || "Web chat",
        config_json: config.config_json,
      },
      function_name: "calculate-lexcore",
      lead_id,
      admin: adminClient,
    });

    const scoringResult = result.parsed as Record<string, any> | null;
    if (!scoringResult) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: result.text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Persist run (lexcore_runs) — lógica intacta ----
    const cappedScore = Math.max(0, Math.min(95, scoringResult.score_final || 0));

    const { data: runData, error: runError } = await supabase
      .from("lexcore_runs")
      .insert({
        lead_id,
        config_id: config.id,
        mode_used: scoringResult.mode_used,
        flags_json: scoringResult.flags,
        raw_scores_json: scoringResult.raw_scores,
        weighted_scores_json: scoringResult.weighted_scores,
        penalties_json: scoringResult.penalties,
        adjustments_json: scoringResult.adjustments,
        vj_json: scoringResult.vj,
        score_final: cappedScore,
        price_lexcore: scoringResult.price_final || 5,
        price_after_caps: scoringResult.price_final || 5,
        conclusion_text: scoringResult.conclusion,
        llm_response_json: scoringResult,
        executed_by: userId,
      })
      .select()
      .single();

    if (runError) {
      console.error("Error saving run:", runError);
      return new Response(
        JSON.stringify({ error: "Failed to save scoring run", details: runError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Update lead — fallback de precio intacto ----
    let finalPrice = scoringResult.price_final || 0;
    if (finalPrice <= 0 && cappedScore > 0) {
      if (cappedScore >= 80) finalPrice = 75;
      else if (cappedScore >= 65) finalPrice = 55;
      else if (cappedScore >= 50) finalPrice = 40;
      else if (cappedScore >= 35) finalPrice = 30;
      else if (cappedScore >= 20) finalPrice = 20;
      else finalPrice = 10;
    }
    if (finalPrice <= 0) finalPrice = 5;

    const updateData: Record<string, any> = {
      score_final: cappedScore,
      price_final: finalPrice,
      marketplace_price: finalPrice,
    };
    if (scoringResult.marketplace_summary) {
      updateData.marketplace_summary = scoringResult.marketplace_summary;
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id);

    if (updateError) {
      console.error("Error updating lead:", updateError);
    }

    console.log(
      `[Lexcore] Done. v${result.prompt_version} · ${result.duration_ms}ms · score=${cappedScore} · price=${finalPrice}€`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        scoring: scoringResult,
        run_id: runData.id,
        usage: result.usage,
        prompt_version: result.prompt_version,
        duration_ms: result.duration_ms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[calculate-lexcore] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
