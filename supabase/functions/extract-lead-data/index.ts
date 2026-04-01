import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AREAS_LEGALES = [
  "Derecho Civil", "Derecho de Familia", "Derecho Canónico", "Derecho Municipal",
  "Derecho de Extranjería", "Derecho Notarial", "Derecho de Consumidores",
  "Derecho Inmobiliario", "Derecho Médico", "Derecho de Seguros", "Derecho Concursal",
  "Derecho Militar", "Derecho Sanitario", "Derecho de Vivienda", "Derecho Bancario",
  "Derecho de Propiedad Industrial", "Derecho de Animales", "Derecho de Transporte",
  "Derecho Bursátil", "Derecho de Propiedad Intelectual", "Derecho Deportivo",
  "Derecho Marítimo", "Derecho Mercado de Valores", "Derecho de Protección de Datos",
  "Derecho de Aguas", "Derecho Aeronáutico", "Mediación y arbitraje",
  "Derecho de Nuevas Tecnologías", "Derecho Alimentario", "Derecho del Medio Ambiente",
  "Derecho Urbanístico", "Derecho Fiscal", "Derecho Penal", "Derecho Administrativo",
  "Derecho Laboral", "Derecho Procesal", "Derecho Mercantil", "Derecho Comunitario",
  "Derecho Societario", "Derecho Constitucional", "Derecho Tributario", "Derecho Internacional"
];

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

    const { lead_text } = await req.json();
    if (!lead_text || typeof lead_text !== "string") {
      return new Response(JSON.stringify({ error: "lead_text is required" }), {
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

    const openAIKey = apiSetting.key_value;

    const extractionPrompt = `Eres un asistente legal especializado en extraer información de conversaciones con clientes en España.

Analiza el siguiente texto de un lead/consulta legal y extrae la información en formato JSON.

TEXTO DEL LEAD:
"""
${lead_text}
"""

Extrae y devuelve SOLO un JSON válido con esta estructura (usa null si no encuentras el dato):

{
  "nombre": "string o null",
  "apellidos": "string o null", 
  "telefono": "string o null",
  "email": "string o null",
  "ciudad": "string o null",
  "provincia": "string o null - SIEMPRE incluir aunque debas inferirla",
  "area_legal": "una de la lista o null",
  "subarea": "string o null - la especialidad específica del caso, ej: divorcio, despido improcedente, multa de tráfico, herencia, desahucio, etc.",
  "tipo_caso": "string o null - tipo concreto del asunto, ej: recurso multa, custodia compartida, impago factura, etc.",
  "cuantia": "número o null",
  "cuantia_texto": "string original si aparece",
  "urgencia_aplica": true/false,
  "urgencia_nivel": "Alta/Media/Baja o null",
  "urgencia_motivo": "string o null",
  "hechos_clave": "resumen breve de los hechos",
  "pretension_cliente": "qué quiere conseguir el cliente",
  "contraparte": "string o null",
  "documentacion_mencionada": ["lista de docs mencionados"],
  "preferencia_contacto": "Teléfono/Email/WhatsApp o null",
  "franja_horaria": "string o null"
}

ÁREAS LEGALES VÁLIDAS (usa exactamente una de estas):
${AREAS_LEGALES.join(", ")}

REGLAS:
- Si hay teléfono, normalízalo a formato español (9 dígitos)
- Si hay fechas límite, plazos o riesgo inmediato: urgencia_aplica = true
- NO inventes datos que no estén en el texto
- MUY IMPORTANTE: Si el usuario menciona una ciudad pero NO la provincia, DEBES inferir la provincia correcta. Por ejemplo: "Salou" → provincia: "Tarragona", "Marbella" → provincia: "Málaga", "Benidorm" → provincia: "Alicante"
- Siempre devuelve CIUDAD y PROVINCIA como campos separados
- Devuelve SOLO el JSON, sin explicaciones`;

    console.log("Calling OpenAI for extraction...");
    
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente de extracción de datos legales. Responde SOLO con JSON válido." },
          { role: "user", content: extractionPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
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
    let extractedData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extraction successful:", JSON.stringify(extractedData));

    return new Response(JSON.stringify({ 
      success: true, 
      extracted_data: extractedData,
      usage: openAIData.usage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Extract lead data error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
