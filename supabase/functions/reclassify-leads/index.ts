import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

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
  "Derecho Constitucional", "Derecho Tributario", "Derecho Internacional"
];

interface ReclassifyResult {
  lead_id: string;
  nombre: string | null;
  old_area: string | null;
  new_area: string | null;
  changed: boolean;
  error?: string;
}

serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

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
    const { since_date, limit = 50, dry_run = false, area_filter } = body;

    console.log(`[Reclassify] Starting. since_date=${since_date}, limit=${limit}, dry_run=${dry_run}, area_filter=${area_filter}`);

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

    // Query leads to reclassify
    let query = supabase
      .from("leads")
      .select("id, lead_text, structured_fields, created_at")
      .or('is_demo.is.null,is_demo.eq.false')
      .is('discarded_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (since_date) {
      query = query.gte('created_at', since_date);
    }

    if (area_filter) {
      query = query.contains('structured_fields', { area_legal: area_filter });
    }

    const { data: leads, error: queryError } = await query;

    if (queryError) {
      console.error("[Reclassify] Query error:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Reclassify] Found ${leads?.length || 0} leads to process`);

    const results: ReclassifyResult[] = [];

    for (const lead of leads || []) {
      const result = await reclassifyLead(supabase, lead, openAIKey, dry_run);
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const changed = results.filter(r => r.changed).length;
    const errors = results.filter(r => r.error).length;

    console.log(`[Reclassify] Complete. Total=${results.length}, Changed=${changed}, Errors=${errors}`);

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      total: results.length,
      changed,
      errors,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Reclassify] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function reclassifyLead(
  supabase: any,
  lead: any,
  openAIKey: string,
  dryRun: boolean
): Promise<ReclassifyResult> {
  const fields = lead.structured_fields || {};
  const oldArea = fields.area_legal || null;
  const nombre = fields.nombre || fields._contact_alias || null;

  const result: ReclassifyResult = {
    lead_id: lead.id,
    nombre,
    old_area: oldArea,
    new_area: null,
    changed: false,
  };

  try {
    const leadText = lead.lead_text || "";
    if (!leadText.trim()) {
      result.error = "No lead text";
      return result;
    }

    // Call OpenAI to classify ONLY the legal area
    const classificationPrompt = `Eres un asistente legal EXPERTO en clasificar consultas legales en España.

TAREA: Analiza el texto y determina el ÁREA LEGAL correcta.

TEXTO:
"""
${leadText.substring(0, 4000)}
"""

=== GUÍA DE CLASIFICACIÓN ===

⚠️ "Derecho Laboral" SOLO aplica cuando hay relación empleador-empleado (despidos, nóminas, contratos de trabajo).

1. "Derecho de Consumidores" - Problemas con:
   - Compras online que no llegan, envíos perdidos
   - Productos defectuosos
   - Gimnasios, academias, suscripciones
   - Reclamaciones a empresas de transporte (UPS, SEUR, Correos...)
   - Garantías, devoluciones, cobros indebidos
   - Cualquier conflicto COMPRADOR vs VENDEDOR/EMPRESA

2. "Derecho Laboral" - SOLO si:
   - Despido, ERE, ERTE
   - Reclamación de salarios/nóminas
   - Acoso laboral
   - El usuario ES EMPLEADO de la empresa

3. "Derecho Inmobiliario" - Temas de:
   - Alquiler, arrendamiento
   - Okupas, desahucios
   - Compraventa de viviendas
   - Comunidades de vecinos

4. "Derecho Penal" - Cuando hay:
   - Delitos (robo, estafa, amenazas, coacciones)
   - Denuncias, juicios penales

5. "Derecho Civil" - Para:
   - Herencias, testamentos
   - Deudas, reclamación de cantidad
   - Contratos civiles

6. "Derecho de Familia" - Temas de:
   - Divorcio, separación
   - Custodia de hijos
   - Pensiones alimenticias

7. "Derecho de Tráfico" - Para:
   - Accidentes de tráfico
   - Multas de tráfico

8. "Derecho Bancario" - Problemas con:
   - Bancos, hipotecas
   - Cláusulas abusivas

=== EJEMPLOS ===

- "UPS me perdió un paquete" → Derecho de Consumidores
- "El gimnasio me sigue cobrando" → Derecho de Consumidores  
- "Pedido que no llega" → Derecho de Consumidores
- "Okupas en mi casa" → Derecho Inmobiliario
- "Me despidieron" → Derecho Laboral
- "No me pagan la nómina" → Derecho Laboral

Responde SOLO con el nombre del área legal de esta lista:
${AREAS_LEGALES.join(", ")}

Si no puedes determinar el área, responde "null".

ÁREA LEGAL:`;

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un clasificador de consultas legales. Responde SOLO con el nombre del área legal." },
          { role: "user", content: classificationPrompt }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      result.error = `OpenAI error: ${openAIResponse.status}`;
      console.error(`[Reclassify] OpenAI error for ${lead.id}: ${errorText}`);
      return result;
    }

    const openAIData = await openAIResponse.json();
    const content = openAIData.choices?.[0]?.message?.content?.trim() || "";

    // Validate the response is a valid area
    const newArea = AREAS_LEGALES.find(area => 
      content.toLowerCase().includes(area.toLowerCase())
    ) || null;

    result.new_area = newArea;
    result.changed = newArea !== null && newArea !== oldArea;

    if (result.changed && !dryRun) {
      // Update the lead
      const updatedFields = { ...fields, area_legal: newArea };
      
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          structured_fields: updatedFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) {
        result.error = `Update failed: ${updateError.message}`;
        result.changed = false;
      } else {
        console.log(`[Reclassify] Lead ${lead.id} (${nombre}): ${oldArea} -> ${newArea}`);
      }
    }

    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}
