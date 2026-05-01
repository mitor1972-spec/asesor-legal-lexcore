// =====================================================================
// extract-lead-data
//
// Refactor (Fase 6 · paso 2):
//   - El prompt vive ahora en `ai_prompts.extract_lead`
//     (editable desde /settings/ai-prompts).
//   - Esta función SOLO se encarga de:
//       1. validar auth
//       2. preparar variables ({{lead_text}}, {{areas_legales}})
//       3. llamar al helper centralizado callAI()
//       4. devolver el JSON extraído
//   - Cada ejecución queda registrada en `ai_logs` automáticamente.
//
// La firma externa se mantiene 100% compatible:
//   { success, extracted_data, usage }
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-client.ts";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Lista canónica de áreas legales — se inyecta en el prompt como variable.
// Mantener aquí permite que la BD del prompt no tenga que actualizarse cada
// vez que añadimos una nueva área.
const AREAS_LEGALES = [
  "Derecho Civil", "Derecho de Familia", "Derecho Canónico", "Derecho Municipal",
  "Derecho de Extranjería", "Derecho Notarial", "Derecho de Consumidores",
  "Derecho Inmobiliario", "Derecho Médico", "Derecho de Seguros", "Derecho Concursal",
  "Derecho Militar", "Derecho Sanitario", "Derecho de Vivienda", "Derecho Bancario",
  "Derecho de Propiedad Industrial", "Derecho de Animales", "Derecho de Transporte",
  "Derecho de Tráfico", "Derecho Bursátil", "Derecho de Propiedad Intelectual",
  "Derecho Deportivo", "Derecho Marítimo", "Derecho Mercado de Valores",
  "Derecho de Protección de Datos", "Derecho de Aguas", "Derecho Aeronáutico",
  "Mediación y arbitraje", "Derecho de Nuevas Tecnologías", "Derecho Alimentario",
  "Derecho del Medio Ambiente", "Derecho Urbanístico", "Derecho Fiscal",
  "Derecho Penal", "Derecho Administrativo", "Derecho Laboral", "Derecho Procesal",
  "Derecho Mercantil", "Derecho Comunitario", "Derecho Societario",
  "Derecho Constitucional", "Derecho Tributario", "Derecho Internacional",
];

Deno.serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Body ----
    const body = await req.json();
    const { lead_text, lead_id } = body;
    if (!lead_text || typeof lead_text !== "string") {
      return new Response(JSON.stringify({ error: "lead_text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Admin client (reused by callAI for prompt + logging) ----
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log(
      `[extract-lead-data] callAI(extract_lead) · lead_id=${lead_id ?? "(none)"} · text_len=${lead_text.length}`,
    );

    const result = await callAI({
      prompt_key: "extract_lead",
      variables: {
        lead_text,
        areas_legales: AREAS_LEGALES.join(", "),
      },
      function_name: "extract-lead-data",
      lead_id: lead_id ?? null,
      admin,
    });

    if (!result.parsed) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          raw: result.text,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[extract-lead-data] Done. v${result.prompt_version} · ${result.duration_ms}ms`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: result.parsed,
        usage: result.usage,
        prompt_version: result.prompt_version,
        duration_ms: result.duration_ms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[extract-lead-data] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
