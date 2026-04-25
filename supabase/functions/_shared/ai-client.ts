// =====================================================================
// Centralized AI Client — single entry point for all OpenAI calls.
//
// Usage in any edge function:
//
//   import { callAI } from "../_shared/ai-client.ts";
//
//   const result = await callAI({
//     prompt_key: "extract_lead",
//     variables: { lead_text: "...", areas_legales: "Civil, Penal, ..." },
//     function_name: "extract-lead-data",
//     lead_id: leadId, // optional
//   });
//
//   result.parsed   -> JSON object (if response_format = 'json_object')
//   result.text     -> raw string output
//   result.usage    -> { prompt_tokens, completion_tokens }
//
// The helper:
//   1. Loads the prompt definition from `ai_prompts` (BD is the single source of truth)
//   2. Renders {{variables}} into system_prompt + user_template
//   3. Loads the OpenAI key from `api_settings` (fallback to env OPENAI_API_KEY)
//   4. Calls OpenAI Chat Completions
//   5. Parses JSON when response_format = 'json_object'
//   6. Logs everything to `ai_logs` (success or error)
// =====================================================================

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface CallAIOptions {
  /** prompt_key in ai_prompts table */
  prompt_key: string;
  /** Variables to inject into {{placeholders}} of system_prompt + user_template */
  variables?: Record<string, unknown>;
  /** Name of the calling edge function (for logging) */
  function_name?: string;
  /** Lead being processed (for logging / traceability) */
  lead_id?: string | null;
  /** Override the model declared in BD (rare; for explicit testing) */
  model_override?: string;
  /** Pre-built admin client (optional). If not provided, the helper creates one with the service role key. */
  admin?: SupabaseClient;
}

export interface CallAIResult {
  text: string;
  parsed: unknown | null;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  prompt_version: number;
  model: string;
  duration_ms: number;
}

export class AIError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getAdminClient(provided?: SupabaseClient): SupabaseClient {
  if (provided) return provided;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new AIError("Supabase env vars missing", 500);
  return createClient(url, key);
}

/** Replace {{variable}} placeholders. Missing vars are left as empty strings. */
export function renderTemplate(tpl: string, vars: Record<string, unknown> = {}): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  });
}

async function loadPrompt(admin: SupabaseClient, prompt_key: string) {
  const { data, error } = await admin
    .from("ai_prompts")
    .select("prompt_key, system_prompt, user_template, prompt_text, model, temperature, max_tokens, response_format, version, is_active")
    .eq("prompt_key", prompt_key)
    .maybeSingle();

  if (error) throw new AIError(`Error loading prompt '${prompt_key}': ${error.message}`, 500);
  if (!data) throw new AIError(`Prompt '${prompt_key}' not found in ai_prompts`, 404);
  if (!data.is_active) throw new AIError(`Prompt '${prompt_key}' is disabled`, 400);
  return data;
}

async function loadOpenAIKey(admin: SupabaseClient): Promise<string> {
  const { data } = await admin
    .from("api_settings")
    .select("key_value")
    .eq("key_name", "OPENAI_API_KEY")
    .eq("is_active", true)
    .maybeSingle();

  const key = data?.key_value || Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new AIError("OpenAI API key not configured", 500);
  return key;
}

async function logAI(
  admin: SupabaseClient,
  payload: {
    prompt_key: string;
    prompt_version: number;
    function_name?: string;
    lead_id?: string | null;
    model: string;
    input: unknown;
    output?: string;
    status: "success" | "error";
    error_message?: string;
    duration_ms: number;
    tokens_input?: number;
    tokens_output?: number;
  }
) {
  try {
    await admin.from("ai_logs").insert({
      prompt_key: payload.prompt_key,
      prompt_version: payload.prompt_version,
      function_name: payload.function_name ?? null,
      lead_id: payload.lead_id ?? null,
      model: payload.model,
      input: payload.input as Record<string, unknown>,
      output: payload.output ?? null,
      status: payload.status,
      error_message: payload.error_message ?? null,
      duration_ms: payload.duration_ms,
      tokens_input: payload.tokens_input ?? null,
      tokens_output: payload.tokens_output ?? null,
    });
  } catch (e) {
    // Logging must never break the caller
    console.error("[ai-client] Failed to write ai_logs:", e);
  }
}

export async function callAI(opts: CallAIOptions): Promise<CallAIResult> {
  const admin = getAdminClient(opts.admin);
  const prompt = await loadPrompt(admin, opts.prompt_key);
  const openaiKey = await loadOpenAIKey(admin);

  const vars = opts.variables ?? {};
  const systemPrompt = renderTemplate(prompt.system_prompt ?? "", vars);
  // Prefer user_template; fall back to legacy prompt_text
  const userPrompt = renderTemplate(prompt.user_template ?? prompt.prompt_text ?? "", vars);
  const model = opts.model_override || prompt.model;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: Number(prompt.temperature ?? 0.3),
    max_tokens: Number(prompt.max_tokens ?? 2000),
  };
  if (prompt.response_format === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const started = Date.now();
  let openAIResponse: Response;
  try {
    openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const duration_ms = Date.now() - started;
    const msg = e instanceof Error ? e.message : "Network error calling OpenAI";
    await logAI(admin, {
      prompt_key: prompt.prompt_key,
      prompt_version: prompt.version,
      function_name: opts.function_name,
      lead_id: opts.lead_id ?? null,
      model,
      input: { systemPrompt, userPrompt, vars },
      status: "error",
      error_message: msg,
      duration_ms,
    });
    throw new AIError(msg, 502);
  }

  const duration_ms = Date.now() - started;

  if (!openAIResponse.ok) {
    const errText = await openAIResponse.text();
    await logAI(admin, {
      prompt_key: prompt.prompt_key,
      prompt_version: prompt.version,
      function_name: opts.function_name,
      lead_id: opts.lead_id ?? null,
      model,
      input: { systemPrompt, userPrompt, vars },
      status: "error",
      error_message: `OpenAI ${openAIResponse.status}: ${errText.slice(0, 500)}`,
      duration_ms,
    });
    throw new AIError(`OpenAI error ${openAIResponse.status}`, openAIResponse.status, errText);
  }

  const data = await openAIResponse.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  let parsed: unknown | null = null;
  if (prompt.response_format === "json_object" && text) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : JSON.parse(text);
    } catch (e) {
      await logAI(admin, {
        prompt_key: prompt.prompt_key,
        prompt_version: prompt.version,
        function_name: opts.function_name,
        lead_id: opts.lead_id ?? null,
        model,
        input: { systemPrompt, userPrompt, vars },
        output: text,
        status: "error",
        error_message: `JSON parse error: ${e instanceof Error ? e.message : "unknown"}`,
        duration_ms,
        tokens_input: data.usage?.prompt_tokens,
        tokens_output: data.usage?.completion_tokens,
      });
      throw new AIError("Failed to parse AI JSON response", 500, text);
    }
  }

  await logAI(admin, {
    prompt_key: prompt.prompt_key,
    prompt_version: prompt.version,
    function_name: opts.function_name,
    lead_id: opts.lead_id ?? null,
    model,
    input: { vars }, // store only variables (not full prompt) to keep logs small
    output: text,
    status: "success",
    duration_ms,
    tokens_input: data.usage?.prompt_tokens,
    tokens_output: data.usage?.completion_tokens,
  });

  return {
    text,
    parsed,
    usage: data.usage ?? null,
    prompt_version: prompt.version,
    model,
    duration_ms,
  };
}
