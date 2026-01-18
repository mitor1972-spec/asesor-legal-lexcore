import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, lawfirm_id } = await req.json();
    
    if (!lead_id || !lawfirm_id) {
      throw new Error('lead_id and lawfirm_id are required');
    }

    console.log('Generating legal help for lead:', lead_id, 'lawfirm:', lawfirm_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || 'Unknown error'}`);
    }

    // Fetch lawfirm to check for custom API key
    const { data: lawfirm } = await supabase
      .from('lawfirms')
      .select('openai_api_key, name')
      .eq('id', lawfirm_id)
      .single();

    // Prepare case context
    const structuredFields = lead.structured_fields || {};
    const caseSummary = lead.case_summary || '';

    const prompt = `Eres un asistente legal experto que ayuda a abogados españoles a gestionar nuevos casos.

DATOS DEL CASO:
"""
${caseSummary}
"""

DATOS ESTRUCTURADOS:
"""
Área legal: ${structuredFields.area_legal || 'No especificada'}
Provincia: ${structuredFields.provincia || 'No especificada'}
Urgencia: ${structuredFields.urgencia_nivel || 'No especificada'}
Cuantía estimada: ${structuredFields.cuantia_estimada || 'No especificada'}
Documentación disponible: ${structuredFields.documentacion_disponible || 'No especificada'}
Contacto preferido: ${structuredFields.preferencia_contacto || 'No especificada'}
Horario contacto: ${structuredFields.horario_contacto || 'No especificado'}
"""

CONVERSACIÓN ORIGINAL:
"""
${lead.lead_text?.substring(0, 3000) || 'No disponible'}
"""

Genera una guía práctica para el abogado que va a llevar este caso.`;

    // Call Lovable AI Gateway
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Eres un asistente legal experto para abogados españoles. Responde siempre en JSON válido.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_legal_help",
              description: "Proporciona orientación legal estructurada para el abogado",
              parameters: {
                type: "object",
                properties: {
                  legal_orientation: {
                    type: "string",
                    description: "Orientación legal sobre el tipo de caso, legislación aplicable, jurisprudencia relevante. 3-5 puntos en formato markdown con viñetas."
                  },
                  documentation_needed: {
                    type: "string",
                    description: "Lista de documentos que debe solicitar al cliente para poder actuar. 5-8 puntos específicos en formato markdown con viñetas."
                  },
                  commercial_next_steps: {
                    type: "string",
                    description: "Pasos comerciales inmediatos: cómo contactar, qué decir, cómo cerrar el cliente. 3-5 puntos en formato markdown con viñetas."
                  },
                  legal_next_steps: {
                    type: "string",
                    description: "Pasos jurídicos a seguir una vez contratado: demandas, plazos, juzgado competente. 4-6 puntos en formato markdown con viñetas."
                  },
                  risks_alerts: {
                    type: "string",
                    description: "Riesgos y alertas importantes del caso. Puntos débiles, posibles problemas. 2-4 puntos con emoji ⚠️ en formato markdown."
                  },
                  estimated_complexity: {
                    type: "string",
                    description: "Alta / Media / Baja - con breve justificación de una línea."
                  }
                },
                required: ["legal_orientation", "documentation_needed", "commercial_next_steps", "legal_next_steps", "risks_alerts", "estimated_complexity"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_legal_help" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your account.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract the tool call arguments
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const legalHelp = JSON.parse(toolCall.function.arguments);

    // Save to database
    const { data: insertedHelp, error: insertError } = await supabase
      .from('lead_legal_help')
      .insert({
        lead_id,
        lawfirm_id,
        legal_orientation: legalHelp.legal_orientation,
        documentation_needed: legalHelp.documentation_needed,
        commercial_next_steps: legalHelp.commercial_next_steps,
        legal_next_steps: legalHelp.legal_next_steps,
        risks_alerts: legalHelp.risks_alerts,
        estimated_complexity: legalHelp.estimated_complexity,
        llm_response_json: aiData
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving legal help:', insertError);
      throw new Error(`Error saving legal help: ${insertError.message}`);
    }

    console.log('Legal help generated and saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      data: insertedHelp 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-legal-help:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
