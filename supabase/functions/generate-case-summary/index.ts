import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUMMARY_TEMPLATE = `Buenos días,

Por medio del presente les compartimos ficha resumen de un "posible" cliente para su tratamiento.

________________________________________

**Resumen – [Nombre] y [Asunto]**

----------------------------

**1) DATOS CLAVE**

• Nombre: {nombre}
• Teléfono: {telefono}
• Email: {email}
• Preferencia de contacto: {preferencia_contacto}
• Ciudad: {ciudad}
• Área: {area_legal}
• Tipo de caso: {tipo_caso}
• Cuantía: {cuantia}
• Fecha de entrada: {fecha_entrada}
• Canal: {canal}
• Calidad del contacto: {calidad_contacto}
• Urgencia: {urgencia}
• Cliente solicita abogado explícitamente: {solicita_abogado}

----------------------------

**2) RESUMEN EJECUTIVO**

• Tipo de caso: {tipo_caso_ejecutivo}
• Pretensión del cliente: {pretension}
• Hechos clave: {hechos_clave}
• Urgencia/Plazos: {urgencia_plazos}
• Breve resumen: {breve_resumen}

----------------------------

**3) MOTIVO DE CONSULTA**

• Consulta del cliente: {consulta_cliente}
• Objetivo del cliente: {objetivo_cliente}

----------------------------

**4) CLASIFICACIÓN JURÍDICA**

• Área legal: {area_legal_clasificacion}
• Subárea: {subarea}
• Rol del cliente: {rol_cliente}
• Contraparte: {contraparte}

----------------------------

**5) HECHOS Y CRONOLOGÍA**

{hechos_cronologia}
• Qué ha hecho ya el cliente: {acciones_cliente}

----------------------------

**6) DOCUMENTACIÓN Y PRUEBAS**

• Aporta documentación: {aporta_documentacion}
• Pruebas disponibles: {pruebas_disponibles}
• Faltan documentos clave: {documentos_faltantes}

----------------------------

**7) URGENCIA Y PLAZOS**

• Nivel de urgencia: {nivel_urgencia}
• Motivo de urgencia: {motivo_urgencia}
• Fechas límite conocidas: {fechas_limite}

----------------------------

**8) CONTEXTO JURÍDICO**

• Vías habituales: {vias_habituales}
• Puntos que suelen decidir el caso: {puntos_decision}

----------------------------

**9) ORIENTACIÓN PARA EL ABOGADO**

• Estrategia inicial sugerida: {estrategia_inicial}
• Riesgos/alertas: {riesgos_alertas}
• Puntos sensibles del cliente: {puntos_sensibles}

----------------------------

**10) PRÓXIMOS PASOS**

• Acción inmediata: {accion_inmediata}
• Acción secundaria: {accion_secundaria}

----------------------------

**11) QUÉ FALTA POR CONFIRMAR**

{puntos_confirmar}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Use service role key for internal calls from webhook
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { lead_id } = body;
    let { lead_text, structured_fields, scoring_data, source_channel } = body;

    if (!lead_id) {
      throw new Error('Missing required field: lead_id');
    }

    // If lead_text is not provided, fetch it from the database
    if (!lead_text) {
      console.log(`[generate-case-summary] Fetching lead data for ${lead_id}...`);
      
      const { data: lead, error: leadError } = await serviceClient
        .from('leads')
        .select('lead_text, structured_fields, source_channel')
        .eq('id', lead_id)
        .single();
      
      if (leadError || !lead) {
        throw new Error(`Failed to fetch lead: ${leadError?.message || 'Lead not found'}`);
      }
      
      lead_text = lead.lead_text;
      structured_fields = structured_fields || lead.structured_fields;
      source_channel = source_channel || lead.source_channel;
      
      console.log(`[generate-case-summary] Lead data fetched: ${lead_text?.length || 0} chars`);
    }

    if (!lead_text) {
      throw new Error('No lead_text available for summary generation');
    }

    // Fetch lexcore scoring data if not provided
    if (!scoring_data) {
      const { data: lexcoreRun } = await serviceClient
        .from('lexcore_runs')
        .select('score_final, price_lexcore, vj_json')
        .eq('lead_id', lead_id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lexcoreRun) {
        scoring_data = lexcoreRun;
      }
    }

    // Get OpenAI API key from api_settings
    const { data: apiKeyData } = await serviceClient
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'OPENAI_API_KEY')
      .eq('is_active', true)
      .single();

    let openaiKey = apiKeyData?.key_value;

    // Fallback to environment variable if not in database
    if (!openaiKey) {
      openaiKey = Deno.env.get('OPENAI_API_KEY');
    }

    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const sf = structured_fields || {};
    const scoring = scoring_data || {};
    
    // Format date
    const fechaEntrada = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    const systemPrompt = `Eres un asistente legal experto que genera resúmenes estructurados de casos para despachos de abogados.

Tu tarea es analizar la conversación del cliente y generar un resumen siguiendo EXACTAMENTE la plantilla proporcionada.

REGLAS ESTRICTAS:
1. Si un dato no aparece en la conversación, DEJA EL CAMPO EN BLANCO (no escribas "No consta", "N/A", "No disponible", etc.)
2. NO inventes ni supongas información que no esté explícita
3. Usa bullets con "•" 
4. Fechas en formato dd/mm/aaaa
5. Mantén los títulos en negrita con **
6. Sé conciso pero completo
7. En "Hechos y Cronología" lista cada hecho como "• Hecho N: descripción"
8. En "Qué falta por confirmar" lista puntos para preguntar en la primera llamada
9. OMITE completamente las líneas donde no haya información (no incluyas líneas vacías o con guiones)

DATOS YA EXTRAÍDOS:
- Nombre: ${sf.nombre || ''}
- Apellidos: ${sf.apellidos || ''}
- Teléfono: ${sf.telefono || ''}
- Email: ${sf.email || ''}
- Ciudad: ${sf.ciudad || ''}
- Provincia: ${sf.provincia || ''}
- Área legal: ${sf.area_legal || ''}
- Subárea: ${sf.subarea || ''}
- Cuantía: ${sf.cuantia ? sf.cuantia.toLocaleString() + '€' : ''}
- Urgencia: ${sf.urgencia_aplica ? sf.urgencia_nivel : ''}
- Canal: ${source_channel || ''}

DATOS DE SCORING:
- Score final: ${scoring.score_final || ''}
- Precio: ${scoring.price_lexcore ? scoring.price_lexcore + '€' : ''}
- VJ (Viabilidad): ${scoring.vj_json?.score || ''}
- Conclusión VJ: ${scoring.vj_json?.conclusion || ''}`;

    const userPrompt = `Genera el resumen estructurado para esta conversación de cliente:

---CONVERSACIÓN---
${lead_text}
---FIN CONVERSACIÓN---

Sigue la plantilla EXACTAMENTE. Completa cada campo con la información de la conversación. Si no hay información para un campo, DÉJALO EN BLANCO (no escribas "No consta" ni ningún placeholder).

PLANTILLA A SEGUIR:
${SUMMARY_TEMPLATE}

Genera el resumen completo:`;

    console.log('Calling OpenAI API for summary generation...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    console.log('Summary generated successfully, updating lead...');

    // Update the lead with the generated summary (reuse serviceClient from top)

    const { error: updateError } = await serviceClient
      .from('leads')
      .update({ case_summary: summary })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead with summary:', updateError);
      throw updateError;
    }

    console.log('Lead updated with summary successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        lead_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-case-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});