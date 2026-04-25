import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessDocumentRequest {
  document_id: string;
  lead_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, lead_id }: ProcessDocumentRequest = await req.json();

    if (!document_id || !lead_id) {
      return new Response(JSON.stringify({ error: "document_id and lead_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ProcessDocument] Processing document ${document_id} for lead ${lead_id}`);

    // Fetch document metadata
    const { data: doc, error: docError } = await supabase
      .from("lead_attachments")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("structured_fields")
      .eq("id", lead_id)
      .single();

    if (leadError) {
      console.error("[ProcessDocument] Lead not found:", leadError);
    }

    // Fetch OpenAI API key
    const { data: apiSettings } = await supabase
      .from("api_settings")
      .select("key_value")
      .eq("key_name", "OPENAI_API_KEY")
      .eq("is_active", true)
      .single();

    const openAIKey = apiSettings?.key_value || Deno.env.get("OPENAI_API_KEY");

    if (!openAIKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, we generate a summary based on filename and category
    // In production, you'd download the file and process with GPT-4 Vision or extract text
    const categoryLabels: Record<string, string> = {
      datos_personales: "Datos Personales (DNI, documentos de identidad)",
      notificaciones_juzgado: "Notificación Judicial o Policial",
      documentacion_caso: "Documentación del Caso",
      fotografias: "Fotografía o Imagen",
      comunicaciones: "Comunicación (Email, WhatsApp, Carta)",
    };

    const fileType = doc.file_type || "application/octet-stream";
    const fileName = doc.file_name || "documento";
    const category = doc.category || "documentacion_caso";

    // Build a prompt for the AI to analyze the document metadata
    const systemPrompt = `Eres un asistente legal experto en clasificación y resumen de documentos judiciales y legales en España.
Dado el nombre y tipo de un documento, genera:
1. Un resumen breve (1-2 frases) describiendo qué podría contener
2. Datos que podrían extraerse (nombre, DNI, fechas, cantidades)
3. Relevancia para un caso legal

Responde en JSON con este formato:
{
  "summary": "...",
  "potential_data": {
    "nombre": "...",
    "email": "...",
    "telefono": "...",
    "cuantia": null,
    "fechas_relevantes": [],
    "otros": {}
  },
  "relevance": "alta|media|baja",
  "document_type": "..." 
}`;

    const userPrompt = `Analiza este documento:
- Nombre de archivo: ${fileName}
- Tipo MIME: ${fileType}
- Categoría asignada: ${categoryLabels[category] || category}
- Tamaño: ${doc.file_size ? Math.round(doc.file_size / 1024) + " KB" : "desconocido"}

Genera un análisis basado en el nombre y tipo del archivo.`;

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("[ProcessDocument] OpenAI error:", errorText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await openAIResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content;

    let parsedResult;
    try {
      parsedResult = JSON.parse(aiContent);
    } catch {
      console.error("[ProcessDocument] Failed to parse AI response:", aiContent);
      parsedResult = {
        summary: `Documento: ${fileName}`,
        potential_data: {},
        relevance: "media",
        document_type: category,
      };
    }

    console.log("[ProcessDocument] AI analysis complete:", parsedResult);

    // Update the document with AI summary
    const { error: updateDocError } = await supabase
      .from("lead_attachments")
      .update({
        ai_summary: parsedResult.summary,
        ai_extracted_data: parsedResult.potential_data || {},
        processed_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    if (updateDocError) {
      console.error("[ProcessDocument] Error updating document:", updateDocError);
    }

    // If we found new contact info, update the lead
    const extractedData = parsedResult.potential_data || {};
    const currentFields = lead?.structured_fields || {};
    const updates: Record<string, unknown> = {};

    // Only update if current field is empty and we have new data
    if (extractedData.nombre && !currentFields.nombre) {
      updates.nombre = extractedData.nombre;
    }
    if (extractedData.email && !currentFields.email) {
      updates.email = extractedData.email;
    }
    if (extractedData.telefono && !currentFields.telefono) {
      updates.telefono = extractedData.telefono;
    }
    if (extractedData.cuantia && !currentFields.cuantia) {
      updates.cuantia = extractedData.cuantia;
    }

    if (Object.keys(updates).length > 0) {
      console.log("[ProcessDocument] Updating lead with extracted data:", updates);
      
      const { error: updateLeadError } = await supabase
        .from("leads")
        .update({
          structured_fields: { ...currentFields, ...updates },
        })
        .eq("id", lead_id);

      if (updateLeadError) {
        console.error("[ProcessDocument] Error updating lead:", updateLeadError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        summary: parsedResult.summary,
        extracted_data: parsedResult.potential_data,
        relevance: parsedResult.relevance,
        lead_updated: Object.keys(updates).length > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[ProcessDocument] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
