// =====================================================================
// test-ai-prompt
// Allows admins to execute any prompt from `ai_prompts` against custom
// variables, WITHOUT touching production flows. The result is logged in
// `ai_logs` with function_name = 'test-ai-prompt' for traceability.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-client.ts";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    // --- AuthN/Z: only internal users (admin/operator) can test prompts ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isInternal, error: roleErr } = await admin.rpc(
      "is_internal_user",
      { _user_id: userData.user.id }
    );
    if (roleErr || !isInternal) {
      return new Response(
        JSON.stringify({ error: "Forbidden: internal users only" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Run prompt ---
    const body = await req.json().catch(() => ({}));
    const prompt_key = body?.prompt_key;
    const variables = body?.variables ?? {};
    const model_override = body?.model_override;

    if (!prompt_key || typeof prompt_key !== "string") {
      return new Response(JSON.stringify({ error: "prompt_key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await callAI({
      prompt_key,
      variables,
      function_name: "test-ai-prompt",
      lead_id: null,
      model_override,
      admin,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        text: result.text,
        parsed: result.parsed,
        usage: result.usage,
        model: result.model,
        prompt_version: result.prompt_version,
        duration_ms: result.duration_ms,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[test-ai-prompt] error:", message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
        details: e instanceof AIError ? e.details : undefined,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
