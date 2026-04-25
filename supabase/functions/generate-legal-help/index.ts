// =====================================================================
// generate-legal-help
//
// Refactor (Fase 6 · paso 4):
//   - El prompt vive ahora en `ai_prompts.legal_help` (editable desde
//     /settings/ai-prompts).
//   - Esta función SOLO se encarga de:
//       1. validar auth + permisos del usuario sobre el lead
//       2. cargar lead + lawfirm
//       3. preparar variables y llamar a callAI()
//       4. persistir el resultado en lead_legal_help
//   - Cada ejecución queda registrada en `ai_logs` automáticamente.
//
// La firma externa se mantiene 100% compatible: { success, data }
//
// IMPORTANTE: Se ha cambiado el proveedor de Lovable AI (Gemini + tool
// calling) a OpenAI gpt-4o-mini con response_format=json_object, según
// la configuración del prompt en BD. Si el prompt cambia de modelo,
// la función lo respeta automáticamente.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, lawfirm_id } = await req.json();

    if (!lead_id) {
      throw new Error("lead_id is required");
    }

    console.log(
      `[generate-legal-help] lead_id=${lead_id} lawfirm_id=${lawfirm_id ?? "(none)"}`,
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Authorization header is required");
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseUser.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized: Invalid token");
    }
    const userId = claimsData.claims.sub as string;

    // ---- Authorization (intacto: roles internos vs lawfirm asignado) ----
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isInternal = userRoles?.some(
      (r) => r.role === "admin" || r.role === "operator",
    );

    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("lawfirm_id, is_active")
      .eq("id", userId)
      .single();

    if (!userProfile?.is_active) {
      throw new Error("Unauthorized: User account is inactive");
    }

    const userLawfirmId = userProfile?.lawfirm_id;

    if (!isInternal) {
      if (!userLawfirmId) {
        throw new Error("Unauthorized: No lawfirm associated with user");
      }
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from("lead_assignments")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("lawfirm_id", userLawfirmId)
        .maybeSingle();
      if (assignmentError || !assignment) {
        throw new Error("Unauthorized: Lead not assigned to your lawfirm");
      }
      if (lawfirm_id && lawfirm_id !== userLawfirmId) {
        throw new Error("Unauthorized: Cannot generate help for other lawfirms");
      }
    }

    // ---- Fetch lead ----
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || "Unknown error"}`);
    }

    const targetLawfirmId = (lawfirm_id ?? userLawfirmId ?? null) as string | null;

    // ---- Build variables for the centralized prompt ----
    const sf = lead.structured_fields || {};
    const variables = {
      case_summary: lead.case_summary || "",
      area_legal: sf.area_legal || "",
      provincia: sf.provincia || "",
      urgencia_nivel: sf.urgencia_nivel || "",
      cuantia: sf.cuantia
        ? `${Number(sf.cuantia).toLocaleString("es-ES")}€`
        : (sf.cuantia_estimada || ""),
      documentacion: Array.isArray(sf.documentacion_mencionada)
        ? sf.documentacion_mencionada.join(", ")
        : (sf.documentacion_disponible || ""),
      preferencia_contacto: sf.preferencia_contacto || "",
      horario_contacto: sf.franja_horaria || sf.horario_contacto || "",
      lead_text: (lead.lead_text || "").substring(0, 3000),
    };

    console.log(`[generate-legal-help] callAI(legal_help) for lead ${lead_id}...`);

    const result = await callAI({
      prompt_key: "legal_help",
      variables,
      function_name: "generate-legal-help",
      lead_id,
      admin: supabaseAdmin,
    });

    const legalHelp = result.parsed as Record<string, any> | null;
    if (!legalHelp) {
      throw new Error("Failed to parse AI response");
    }

    // ---- Validate required fields ----
    const required = [
      "legal_orientation",
      "documentation_needed",
      "commercial_next_steps",
      "legal_next_steps",
      "risks_alerts",
      "estimated_complexity",
    ];
    const missing = required.filter((k) => !legalHelp[k]);
    if (missing.length) {
      console.warn(`[generate-legal-help] Missing fields: ${missing.join(", ")}`);
    }

    // ---- Persist (sin cambios de esquema) ----
    const { data: insertedHelp, error: insertError } = await supabaseAdmin
      .from("lead_legal_help")
      .insert({
        lead_id,
        lawfirm_id: targetLawfirmId,
        legal_orientation: legalHelp.legal_orientation ?? "",
        documentation_needed: legalHelp.documentation_needed ?? "",
        commercial_next_steps: legalHelp.commercial_next_steps ?? "",
        legal_next_steps: legalHelp.legal_next_steps ?? "",
        risks_alerts: legalHelp.risks_alerts ?? "",
        estimated_complexity: legalHelp.estimated_complexity ?? "",
        llm_response_json: legalHelp,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving legal help:", insertError);
      throw new Error(`Error saving legal help: ${insertError.message}`);
    }

    console.log(
      `[generate-legal-help] Done. v${result.prompt_version} · ${result.duration_ms}ms`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedHelp,
        prompt_version: result.prompt_version,
        duration_ms: result.duration_ms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-legal-help] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof AIError
      ? error.status
      : message.includes("Unauthorized")
        ? 403
        : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
