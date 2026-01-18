import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const userId = claims.claims.sub as string;
    const { lead_id, lead_text, structured_fields, source_channel } = await req.json();

    if (!lead_id || !lead_text) {
      return new Response(JSON.stringify({ error: "lead_id and lead_text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active Lexcore config
    const { data: config, error: configError } = await supabase
      .from("lexcore_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config) {
      console.error("Config error:", configError);
      return new Response(JSON.stringify({ error: "No active Lexcore configuration found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI API key from api_settings
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: apiSetting, error: apiError } = await adminClient
      .from("api_settings")
      .select("key_value")
      .eq("key_name", "OPENAI_API_KEY")
      .eq("is_active", true)
      .maybeSingle();

    if (apiError || !apiSetting) {
      console.error("API key error:", apiError);
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch AI prompts from database
    const { data: aiPrompts, error: promptsError } = await adminClient
      .from("ai_prompts")
      .select("prompt_key, prompt_text")
      .eq("is_active", true);

    if (promptsError) {
      console.error("AI prompts error:", promptsError);
    }

    // Build prompts map with fallbacks
    const promptsMap: Record<string, string> = {};
    for (const p of aiPrompts || []) {
      promptsMap[p.prompt_key] = p.prompt_text;
    }

    const marketplaceSummaryPrompt = promptsMap["marketplace_summary"] || 
      "Un párrafo de 3-5 frases que describa de qué trata este caso legal de forma clara y atractiva para abogados. Debe explicar: el tipo de problema legal, la situación del cliente, qué busca conseguir y por qué es un caso interesante. NO incluir datos personales (nombre, teléfono, email). Redactar en tercera persona.";
    
    const conclusionPrompt = promptsMap["scoring_conclusion"] || 
      "2-4 líneas resumiendo el lead y el scoring";

    // Get configurable scoring rules from database
    const scoringRulesPrompt = promptsMap["lexcore_scoring_rules"] || `## GRUPOS DE SCORING (evalúa cada uno de 0 a su máximo):

### 1. CONTACTABILIDAD (max 8):
- Teléfono válido: +5
- Email válido: +3
- Nombre completo: +1 (cap en 8)

### 2. INTENCIÓN (max 20):
- Solicita abogado explícitamente: 0/6/10
- Acepta que tendrá coste: 0/2/4
- Busca acción (no solo info): 0/2/4
- Disponible para llamada: 0/1/2

### 3. URGENCIA (max 10, solo Modo A):
- Plazo específico: 0/3/5
- Riesgo inmediato: 0/2/3
- Ventana de oportunidad: 0/1/2

### 4. CASO (max 25):
- Área/subárea clara: 0-5
- Hechos y cronología: 0-7
- Petición concreta: 0-5
- Identificadores trazables: 0-3
- Contraparte identificada: 0-2
- Fase procesal definida: 0-3

### 5. EVIDENCIA (max 10):
- 0: Nada
- 2: Menciona que tiene docs
- 4: Describe docs básicos
- 6: Aporta docs relevantes
- 8: Docs clave del caso
- 10: Expediente completo

### 6. CLARIDAD (max 10):
- Relato ordenado: 0-4
- Completitud: 0-3
- Coherencia: 0-2
- Tono colaborativo: 0-1

## PENALIZACIONES (aplicar si procede):
- Caso demasiado genérico: -10 a -20
- Faltan datos críticos: -5 a -15
- Falta documentación razonable: -3 a -10
- Contacto incompleto real: -3 a -8
- Segunda opinión (ya tiene abogado): -6
- Precedente negativo: -6
- Inconsistencia temporal: -3 a -8

## AJUSTES COMERCIALES:
- Exclusividad (n_despachos): 1 despacho +6 / 2: -6 / 3: -12 / 4+: -18
- Canal: Teléfono +6 / Web +4 / WhatsApp +2 / Email 0
- Cuantía: <1000€ -10 / 1000-4999€ 0 / 5000-19999€ +4 / >20000€ +6

## VJ (Valoración de Juicio):
- Solo valores: +10, +6, 0, -6, -10
- Máximo impacto: ±1 tramo de precio
- Justificar en 1 frase

## GATE NO CONTACTABLE:
Si no hay teléfono válido NI email válido → precio_final = 5€

## SCORE MÁXIMO:
El score_final NUNCA puede superar 95. Un score de 100 es IMPOSIBLE.
Reserva 90-95 solo para leads excepcionales con toda la información perfecta.`;

    const openAIKey = apiSetting.key_value;
    const configJson = config.config_json;

    const scoringPrompt = `Eres el motor de scoring Lexcore™ para leads legales en España.

DATOS DEL LEAD:
"""
${JSON.stringify(structured_fields || {}, null, 2)}
"""

TEXTO ORIGINAL:
"""
${lead_text}
"""

CANAL DE ORIGEN: ${source_channel || "Web chat"}

CONFIGURACIÓN DE SCORING:
${JSON.stringify(configJson, null, 2)}

Analiza el lead y calcula el scoring siguiendo estas reglas:

## MODO A vs MODO B
- Si urgencia_aplica = true → usar MODO A (incluye grupo urgencia, pesos en weights_mode_a)
- Si urgencia_aplica = false → usar MODO B (sin grupo urgencia, pesos en weights_mode_b)

${scoringRulesPrompt}

## CÁLCULO DEL PRECIO:
Usa los price_steps de la configuración para mapear score_final a precio.

Devuelve SOLO un JSON válido:

{
  "mode_used": "A" o "B",
  "flags": {
    "no_contactable": boolean,
    "urgency_applies": boolean,
    "patrimonial_cap_applies": boolean,
    "amount_present": boolean
  },
  "raw_scores": {
    "contactability": {"score": X, "max": 8, "breakdown": "explicación breve"},
    "intent": {"score": X, "max": 20, "breakdown": "..."},
    "urgency": {"score": X, "max": 10, "breakdown": "..."}, 
    "case_quality": {"score": X, "max": 25, "breakdown": "..."},
    "evidence": {"score": X, "max": 10, "breakdown": "..."},
    "clarity": {"score": X, "max": 10, "breakdown": "..."}
  },
  "weighted_scores": {
    "contactability": X,
    "intent": X,
    "urgency": X,
    "case_quality": X,
    "evidence": X,
    "clarity": X
  },
  "subtotal_weighted": X,
  "penalties": [
    {"name": "nombre", "value": -X, "reason": "..."}
  ],
  "adjustments": [
    {"name": "exclusividad/canal/cuantia", "value": X, "reason": "..."}
  ],
  "vj": {
    "value": X,
    "reason": "1 frase de justificación"
  },
  "score_final": X (0-100, mínimo 0),
  "price_before_caps": X,
  "price_final": X,
  "conclusion": "${conclusionPrompt}",
  "marketplace_summary": "${marketplaceSummaryPrompt}"
}`;


    console.log("Calling OpenAI for scoring...");
    
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres el motor de scoring Lexcore para leads legales. Responde SOLO con JSON válido." },
          { role: "user", content: scoringPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI error:", openAIResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Error calling OpenAI API", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAIData = await openAIResponse.json();
    const content = openAIData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No response from OpenAI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from response
    let scoringResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoringResult = JSON.parse(jsonMatch[0]);
      } else {
        scoringResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scoring result:", JSON.stringify(scoringResult));

    // Save the run to lexcore_runs
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
        // Cap score at 95 max (100 is impossible)
        score_final: Math.max(0, Math.min(95, scoringResult.score_final || 0)),
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
      return new Response(JSON.stringify({ error: "Failed to save scoring run", details: runError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the lead with score, price, and marketplace summary
    // Cap score at 95 max (100 is impossible)
    const cappedScore = Math.max(0, Math.min(95, scoringResult.score_final || 0));
    const updateData: Record<string, any> = {
      score_final: cappedScore,
      price_final: scoringResult.price_final,
    };
    
    // Add marketplace summary if generated
    if (scoringResult.marketplace_summary) {
      updateData.marketplace_summary = scoringResult.marketplace_summary;
      updateData.marketplace_price = scoringResult.price_final;
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id);

    if (updateError) {
      console.error("Error updating lead:", updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      scoring: scoringResult,
      run_id: runData.id,
      usage: openAIData.usage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Calculate lexcore error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
