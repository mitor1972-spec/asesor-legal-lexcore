import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Regex para detectar alias automáticos tipo "lively-frog-81"
const ALIAS_REGEX = /^[a-z]+-[a-z]+-\d+$/i;

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

interface ReprocessResult {
  lead_id: string;
  success: boolean;
  extracted_data?: Record<string, unknown>;
  error?: string;
  changes_made: string[];
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { lead_id, lead_ids } = body;

    // Support single or multiple leads
    const idsToProcess: string[] = lead_ids || (lead_id ? [lead_id] : []);

    if (idsToProcess.length === 0) {
      return new Response(JSON.stringify({ error: "lead_id or lead_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Reprocess] Processing ${idsToProcess.length} leads`);

    // Get OpenAI API key
    const { data: apiSetting } = await supabase
      .from("api_settings")
      .select("key_value")
      .eq("key_name", "OPENAI_API_KEY")
      .eq("is_active", true)
      .maybeSingle();

    if (!apiSetting) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAIKey = apiSetting.key_value;
    const results: ReprocessResult[] = [];

    for (const id of idsToProcess) {
      const result = await processLead(supabase, id, openAIKey);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Reprocess] Completed: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successful: successCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Reprocess] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processLead(
  supabase: any,
  leadId: string,
  openAIKey: string
): Promise<ReprocessResult> {
  const result: ReprocessResult = {
    lead_id: leadId,
    success: false,
    changes_made: [],
  };

  try {
    // Get lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      result.error = `Lead not found: ${leadError?.message}`;
      return result;
    }

    const leadText = lead.lead_text || "";
    if (!leadText.trim()) {
      result.error = "Lead has no text to process";
      return result;
    }

    console.log(`[Reprocess] Extracting data from lead ${leadId}`);

    // Call OpenAI to extract data with IMPROVED LEGAL AREA CLASSIFICATION
    const extractionPrompt = `Eres un asistente legal EXPERTO en clasificar consultas legales en España.

TAREA PRINCIPAL: Analiza el texto y extrae TODOS los datos estructurados correctamente.

TEXTO DEL LEAD:
"""
${leadText}
"""

Extrae y devuelve SOLO un JSON válido con esta estructura (usa null si no encuentras el dato):

{
  "nombre": "string o null - SOLO el nombre propio de la persona, NUNCA mezclar con ciudad, preferencia de contacto ni otras frases",
  "apellidos": "string o null - SOLO los apellidos",
  "telefono": "string o null - formato español 9 dígitos",
  "email": "string o null",
  "ciudad": "string o null - la CIUDAD mencionada, ej: Málaga, Salou, Marbella",
  "provincia": "string o null - SIEMPRE incluir aunque debas inferirla de la ciudad. Si dicen 'Málaga' como ciudad, provincia es 'Málaga'. Si dicen 'Salou', provincia es 'Tarragona'",
  "area_legal": "una de la lista o null - CRÍTICO: clasificar correctamente",
  "subarea": "string o null - la especialidad concreta: 'Multa de tráfico', 'Divorcio', 'Despido improcedente', 'Desahucio', 'Herencia', 'Reclamación de cantidad', etc.",
  "tipo_caso": "string o null - tipo concreto: 'Recurso multa', 'Custodia compartida', 'Impago factura', etc.",
  "cuantia": "número o null",
  "cuantia_texto": "string original si aparece",
  "urgencia_aplica": true/false,
  "urgencia_nivel": "Alta/Media/Baja o null",
  "urgencia_motivo": "string o null",
  "hechos_clave": "resumen breve de los hechos principales",
  "pretension_cliente": "qué quiere conseguir el cliente"
}

ÁREAS LEGALES VÁLIDAS:
${AREAS_LEGALES.join(", ")}

=== REGLAS CRÍTICAS ===

⚠️ SEPARACIÓN DE CAMPOS - MUY IMPORTANTE:
- "nombre" debe contener SOLO el nombre propio (ej: "Alejandro", "María García")
- NUNCA incluir en "nombre" la ciudad, preferencia de contacto ni otras frases
- Si el usuario dice "Me llamo Alejandro, soy de Málaga, prefiero por teléfono":
  nombre: "Alejandro", ciudad: "Málaga", provincia: "Málaga"
- Si hay texto tipo "alejandro Malaga Por telefono", separar: nombre="Alejandro", ciudad="Málaga"

⚠️ PROVINCIA - OBLIGATORIA si hay ciudad:
- Si mencionan una ciudad española, SIEMPRE inferir la provincia
- Ejemplos: Salou→Tarragona, Marbella→Málaga, Benidorm→Alicante, Sevilla→Sevilla

⚠️ SUBAREA - OBLIGATORIA si se puede determinar:
- Multas → subarea: "Multa de tráfico"
- Divorcio → subarea: "Divorcio"
- Despido → subarea: "Despido"
- Herencia → subarea: "Herencia"
- Desahucio → subarea: "Desahucio"
- Accidente → subarea: "Accidente de tráfico"
- Reclamación bancaria → subarea: "Reclamación bancaria"

⚠️ CLASIFICACIÓN DE ÁREA LEGAL:
- "Derecho Laboral" SOLO aplica cuando hay relación empleador-empleado
- "Derecho de Consumidores": compras, gimnasios, suscripciones, envíos
- "Derecho de Tráfico": multas, accidentes, carnet de puntos
- "Derecho Inmobiliario": alquileres, okupas, desahucios, compraventa viviendas
- "Derecho Penal": delitos, denuncias, estafas
- "Derecho Civil": herencias, deudas, contratos
- "Derecho de Familia": divorcio, custodia, pensiones
- "Derecho Bancario": bancos, hipotecas, cláusulas abusivas

Devuelve SOLO el JSON, sin explicaciones.`;

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
      result.error = `OpenAI error: ${openAIResponse.status} - ${errorText}`;
      return result;
    }

    const openAIData = await openAIResponse.json();
    const content = openAIData.choices?.[0]?.message?.content;

    if (!content) {
      result.error = "No response from OpenAI";
      return result;
    }

    // Parse JSON from response
    let extractedData: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch {
      result.error = `Failed to parse AI response: ${content.substring(0, 100)}`;
      return result;
    }

    result.extracted_data = extractedData;

    // Merge with existing structured_fields, only updating empty fields
    const currentFields = (lead.structured_fields as Record<string, unknown>) || {};
    const updatedFields = { ...currentFields };
    let hasChanges = false;

    // Map extracted fields to our schema
    const fieldMappings: [string, string][] = [
      ["nombre", "nombre"],
      ["apellidos", "apellidos"],
      ["telefono", "telefono"],
      ["email", "email"],
      ["ciudad", "ciudad"],
      ["provincia", "provincia"],
      ["area_legal", "area_legal"],
      ["subarea", "subarea"],
      ["tipo_caso", "tipo_caso"],
      ["cuantia", "cuantia"],
      ["cuantia_texto", "cuantia_texto"],
      ["urgencia_aplica", "urgencia_aplica"],
      ["urgencia_nivel", "urgencia_nivel"],
      ["urgencia_motivo", "urgencia_motivo"],
      ["hechos_clave", "hechos_clave"],
      ["pretension_cliente", "pretension_cliente"],
    ];

    // Helper to detect if a value looks like a malformed name (contains phrases)
    const looksLikeBadName = (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      const v = value.toLowerCase();
      // Detect phrases that indicate extraction went wrong
      return v.includes(" y ") || 
             v.includes("me gustaría") || 
             v.includes("quisiera") ||
             v.includes("tengo") ||
             v.includes("soy ") ||
             v.includes("me llamo") ||
             v.length > 40; // Names longer than 40 chars are suspicious
    };

    for (const [extractedKey, dbKey] of fieldMappings) {
      const newValue = extractedData[extractedKey];
      const currentValue = currentFields[dbKey];

      // Only update if we have new data
      if (newValue !== null && newValue !== undefined && newValue !== "") {
        const isEmpty = currentValue === null || currentValue === undefined || currentValue === "";
        const isAlias = typeof currentValue === "string" && ALIAS_REGEX.test(currentValue);
        const isSinNombre = currentValue === "Sin nombre";
        // For nombre field, also replace if it looks like a bad extraction
        const isBadName = dbKey === "nombre" && looksLikeBadName(currentValue);
        
        // CRITICAL: These fields ALWAYS get updated from AI classification
        const alwaysUpdate = ["area_legal", "ciudad", "provincia", "subarea", "tipo_caso"];
        const isAlwaysUpdate = alwaysUpdate.includes(dbKey);

        if (isEmpty || isAlias || isSinNombre || isBadName || isAlwaysUpdate) {
          if (currentValue !== newValue) {
            updatedFields[dbKey] = newValue;
            result.changes_made.push(`${dbKey}: ${currentValue} -> ${newValue}`);
            hasChanges = true;
          }
        }
      }
    }

    // Remove _incomplete flag if we now have contact data
    const hasContactData = 
      (updatedFields.email && updatedFields.email !== "") ||
      (updatedFields.telefono && updatedFields.telefono !== "") ||
      (updatedFields.nombre && !ALIAS_REGEX.test(String(updatedFields.nombre)) && updatedFields.nombre !== "Sin nombre");

    if (hasContactData && currentFields._incomplete) {
      delete updatedFields._incomplete;
      result.changes_made.push("_incomplete: removed");
      hasChanges = true;
    }

    // Update lead if there are changes
    if (hasChanges) {
      // Calculate a deterministic price based on score if price is missing or 0
      const currentScore = lead.score_final || 0;
      const currentPrice = lead.price_final || 0;
      let priceToSet = currentPrice;
      
      if (currentPrice === 0 && currentScore > 0) {
        // Deterministic price calculation based on score ranges
        if (currentScore >= 80) priceToSet = 75;
        else if (currentScore >= 65) priceToSet = 55;
        else if (currentScore >= 50) priceToSet = 40;
        else if (currentScore >= 35) priceToSet = 30;
        else if (currentScore >= 20) priceToSet = 20;
        else priceToSet = 10;
      }

      const updatePayload: Record<string, unknown> = {
        structured_fields: updatedFields,
        updated_at: new Date().toISOString(),
      };

      // Set price if it was 0
      if (currentPrice === 0 && priceToSet > 0) {
        updatePayload.price_final = priceToSet;
        updatePayload.marketplace_price = priceToSet;
        result.changes_made.push(`price: 0 -> ${priceToSet}€ (auto-calculated from score ${currentScore})`);
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", leadId);

      if (updateError) {
        result.error = `Failed to update lead: ${updateError.message}`;
        return result;
      }

      console.log(`[Reprocess] Lead ${leadId} updated with ${result.changes_made.length} changes`);
    } else {
      result.changes_made.push("No new data to update");
    }

    result.success = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}
