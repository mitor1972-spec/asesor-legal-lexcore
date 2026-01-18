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
    
    if (!lead_id) {
      throw new Error('lead_id is required');
    }

    console.log('Generating legal help for lead:', lead_id, 'lawfirm:', lawfirm_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create admin client for data operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }
    
    console.log('Authenticated user:', user.id);
    
    // Check if user has access to this lead
    // Option 1: Internal user (admin/operator) - can access any lead
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isInternal = userRoles?.some(r => r.role === 'admin' || r.role === 'operator');
    
    // Option 2: Lawfirm user - can only access leads assigned to their lawfirm
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('lawfirm_id, is_active')
      .eq('id', user.id)
      .single();
    
    if (!userProfile?.is_active) {
      throw new Error('Unauthorized: User account is inactive');
    }
    
    const userLawfirmId = userProfile?.lawfirm_id;
    
    // Verify authorization
    if (!isInternal) {
      // For lawfirm users, check if lead is assigned to their lawfirm
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('lead_assignments')
        .select('id')
        .eq('lead_id', lead_id)
        .eq('lawfirm_id', userLawfirmId)
        .maybeSingle();
      
      if (assignmentError || !assignment) {
        throw new Error('Unauthorized: Lead not assigned to your lawfirm');
      }
      
      // Also verify the lawfirm_id matches if provided
      if (lawfirm_id && lawfirm_id !== userLawfirmId) {
        throw new Error('Unauthorized: Cannot generate help for other lawfirms');
      }
    }
    
    console.log('Authorization verified - isInternal:', isInternal, 'userLawfirmId:', userLawfirmId);

    // Fetch lead data using admin client
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || 'Unknown error'}`);
    }

    // Determine which lawfirm_id to use
    const targetLawfirmId = lawfirm_id || userLawfirmId || '00000000-0000-0000-0000-000000000000';

    // Fetch lawfirm to check for custom API key (if lawfirm_id provided)
    let lawfirmName = 'Asesor.Legal';
    if (targetLawfirmId && targetLawfirmId !== '00000000-0000-0000-0000-000000000000') {
      const { data: lawfirm } = await supabaseAdmin
        .from('lawfirms')
        .select('name')
        .eq('id', targetLawfirmId)
        .single();
      
      if (lawfirm) {
        lawfirmName = lawfirm.name;
      }
    }

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
    const { data: insertedHelp, error: insertError } = await supabaseAdmin
      .from('lead_legal_help')
      .insert({
        lead_id,
        lawfirm_id: targetLawfirmId,
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
      status: error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});