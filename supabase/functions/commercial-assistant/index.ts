// =====================================================================
// commercial-assistant
//
// Refactor (Fase 6 · paso 4):
//   - El system prompt vive ahora en `ai_prompts.commercial_assistant`
//     (editable desde /settings/ai-prompts).
//   - Se mantiene streaming SSE con Lovable AI Gateway (UX en tiempo real).
//   - callAI NO se usa aquí (no soporta streaming): cargamos manualmente
//     el system_prompt desde BD y registramos el evento mínimo en ai_logs.
//
// Razón: streaming token-a-token es esencial para la UX del chat.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Fallback en caso de que el prompt no esté en BD (deploy inicial / BD vacía).
const FALLBACK_SYSTEM_PROMPT = `Eres un asesor comercial experto de Asesor.Legal / LexMarket. Ayudas a abogados españoles a elegir la mejor estrategia de captación de clientes y publicidad para su despacho. Sé claro, profesional, conciso y orientado a resultados. Responde siempre en español.`;

async function loadSystemPrompt(admin: ReturnType<typeof createClient>) {
  try {
    const { data, error } = await admin
      .from("ai_prompts")
      .select("system_prompt, version, is_active")
      .eq("prompt_key", "commercial_assistant")
      .maybeSingle();

    if (error) {
      console.warn("[commercial-assistant] Error loading prompt:", error.message);
      return { systemPrompt: FALLBACK_SYSTEM_PROMPT, version: 0, source: "fallback" as const };
    }
    if (!data || !data.is_active || !data.system_prompt) {
      console.warn("[commercial-assistant] Prompt missing or inactive, using fallback");
      return { systemPrompt: FALLBACK_SYSTEM_PROMPT, version: 0, source: "fallback" as const };
    }
    return {
      systemPrompt: data.system_prompt,
      version: data.version ?? 1,
      source: "db" as const,
    };
  } catch (e) {
    console.warn("[commercial-assistant] Exception loading prompt:", e);
    return { systemPrompt: FALLBACK_SYSTEM_PROMPT, version: 0, source: "fallback" as const };
  }
}

async function logToAiLogs(
  admin: ReturnType<typeof createClient>,
  payload: {
    user_id: string;
    prompt_version: number;
    source: string;
    messages_count: number;
    status: "success" | "error";
    error_message?: string;
  },
) {
  try {
    await admin.from("ai_logs").insert({
      prompt_key: "commercial_assistant",
      prompt_version: payload.prompt_version,
      function_name: "commercial-assistant",
      lead_id: null,
      model: "google/gemini-3-flash-preview",
      input: {
        user_id: payload.user_id,
        messages_count: payload.messages_count,
        prompt_source: payload.source,
        streaming: true,
      },
      output: null, // streaming: respuesta no se captura
      status: payload.status,
      error_message: payload.error_message ?? null,
      duration_ms: 0, // no medible con streaming
    });
  } catch (e) {
    console.warn("[commercial-assistant] Failed to write ai_logs:", e);
  }
}

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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Body ----
    const body = await req.json();
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Admin client (para cargar el prompt y loguear) ----
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ---- Load centralized system prompt from BD ----
    const { systemPrompt, version, source } = await loadSystemPrompt(admin);
    console.log(
      `[commercial-assistant] prompt source=${source} v${version} · user=${user.id} · msgs=${messages.length}`,
    );

    // ---- Lovable AI (streaming) ----
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        await logToAiLogs(admin, {
          user_id: user.id,
          prompt_version: version,
          source,
          messages_count: messages.length,
          status: "error",
          error_message: "Rate limited (429)",
        });
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, inténtalo de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        await logToAiLogs(admin, {
          user_id: user.id,
          prompt_version: version,
          source,
          messages_count: messages.length,
          status: "error",
          error_message: "Credits exhausted (402)",
        });
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contacta con soporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      await logToAiLogs(admin, {
        user_id: user.id,
        prompt_version: version,
        source,
        messages_count: messages.length,
        status: "error",
        error_message: `Gateway ${response.status}: ${t.slice(0, 200)}`,
      });
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Log success (fire-and-forget, antes de devolver el stream) ----
    await logToAiLogs(admin, {
      user_id: user.id,
      prompt_version: version,
      source,
      messages_count: messages.length,
      status: "success",
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[commercial-assistant] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
