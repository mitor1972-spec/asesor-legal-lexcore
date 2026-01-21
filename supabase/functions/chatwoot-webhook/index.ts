import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuración Chatwoot
const CHATWOOT_ACCOUNT_ID = "138173";
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") || "";

// Regex para detectar alias automáticos tipo "lively-frog-81"
const ALIAS_REGEX = /^[a-z]+-[a-z]+-\d+$/i;

// Regex para extracción de datos del texto
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX_ES = /(?:\+34\s?)?(?:6|7|8|9)\d{8}/g;
const NAME_REGEX = /(?:me llamo|soy|mi nombre es|llamo)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,3})/i;

interface ChatwootMessage {
  id: number;
  content: string | null;
  message_type: number;
  created_at: number;
  sender?: {
    id?: number;
    name?: string;
    type?: string;
    email?: string;
    phone_number?: string;
    additional_attributes?: {
      city?: string;
      country?: string;
    };
  };
}

// Verificar si un nombre es un alias automático
function looksLikeAlias(name: string | null | undefined): boolean {
  if (!name || name.trim() === "") return true;
  return ALIAS_REGEX.test(name.trim());
}

// Extraer datos de contacto del texto de los mensajes
function extractContactFromText(text: string): {
  email: string | null;
  phone: string | null;
  name: string | null;
} {
  const emailMatches = text.match(EMAIL_REGEX);
  const phoneMatches = text.match(PHONE_REGEX_ES);
  const nameMatch = text.match(NAME_REGEX);
  
  return {
    email: emailMatches ? emailMatches[0].toLowerCase() : null,
    phone: phoneMatches ? phoneMatches[0].replace(/[\s.-]/g, "") : null,
    name: nameMatch ? nameMatch[1].trim() : null,
  };
}

// Obtener TODOS los mensajes de una conversación
async function getConversationMessages(conversationId: number): Promise<ChatwootMessage[]> {
  const url = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
  
  console.log(`[Chatwoot API] Fetching messages from: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api_access_token": CHATWOOT_API_TOKEN,
        "Content-Type": "application/json",
      },
    });
    
    console.log(`[Chatwoot API] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Chatwoot API] Error: ${response.status} - ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.payload && Array.isArray(data.payload)) {
      console.log(`[Chatwoot API] Found ${data.payload.length} messages`);
      return data.payload;
    }
    
    console.warn("[Chatwoot API] No payload array in response");
    return [];
    
  } catch (error) {
    console.error("[Chatwoot API] Exception:", error);
    return [];
  }
}

// Detectar área legal basado en palabras clave
function detectLegalArea(text: string): string | null {
  const areaKeywords: Record<string, string[]> = {
    "Derecho de Familia": ["divorcio", "custodia", "pensión", "matrimonio", "hijos", "separación", "manutención"],
    "Derecho Laboral": ["despido", "trabajo", "contrato laboral", "finiquito", "empresa", "ERE", "ERTE", "nómina", "desempleo"],
    "Derecho Penal": ["denuncia", "delito", "robo", "estafa", "penal", "juicio", "acusación", "víctima"],
    "Derecho de Propiedad Intelectual": ["plagio", "copyright", "autor", "propiedad intelectual", "derechos de autor", "TFM", "TFG", "tesis"],
    "Derecho Civil": ["herencia", "testamento", "contrato", "deuda", "reclamación", "indemnización"],
    "Derecho de Extranjería": ["visado", "residencia", "NIE", "extranjería", "nacionalidad", "permiso de trabajo"],
    "Derecho Inmobiliario": ["alquiler", "vivienda", "hipoteca", "inquilino", "arrendamiento", "desahucio", "piso", "casa"],
    "Derecho de Consumidores": ["consumidor", "reclamación producto", "garantía", "devolución", "compra"],
    "Derecho Administrativo": ["multa", "administración", "recurso administrativo", "sanción", "ayuntamiento"],
    "Derecho Mercantil": ["empresa", "sociedad", "autónomo", "factura", "impago", "negocio"],
    "Derecho de Tráfico": ["accidente", "tráfico", "multa de tráfico", "puntos", "carnet"],
    "Derecho Bancario": ["banco", "préstamo", "cláusula", "hipoteca", "tarjeta", "intereses"],
  };
  
  const textLower = text.toLowerCase();
  
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        return area;
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Verificar token de seguridad
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expectedToken = "6b8f29d7-d55f-41ed-829d-70c31f3ada4c";
    
    if (token !== expectedToken) {
      console.error("[Webhook] Invalid token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const eventType = payload.event;
    
    // ==========================================
    // EXTRAER CONVERSATION_ID DE FORMA ROBUSTA
    // ==========================================
    const conversation = payload.conversation ?? payload;
    const conversationId: number | null = 
      conversation?.id ?? 
      payload.conversation_id ?? 
      conversation?.conversation_id ?? 
      null;
    
    // ==========================================
    // EXTRAER DATOS DEL CONTACTO (RAW - SIN MODIFICAR)
    // ==========================================
    const contact = (payload.sender?.type === "contact") 
      ? payload.sender 
      : conversation?.meta?.sender;
    
    const rawName: string | null = contact?.name ?? null;
    const email: string | null = contact?.email ?? null;
    const phone: string | null = contact?.phone_number ?? contact?.phone ?? null;
    const isAlias = looksLikeAlias(rawName);
    
    // ==========================================
    // LOG DE VERIFICACIÓN (ANTES DE DECIDIR)
    // ==========================================
    const messageType = payload.message_type;
    const senderType = payload.sender?.type;
    
    console.log(`[Webhook] Decision data: ${JSON.stringify({
      event: eventType,
      message_type: messageType,
      sender_type: senderType,
      conversation_id: conversationId,
      rawName: rawName,
      looksLikeAlias: isAlias,
      email: email,
      phone: phone,
    })}`);
    
    // Inicializar Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Registrar el webhook recibido
    const { data: logData } = await supabase.from("webhook_logs").insert({
      source: "chatwoot",
      event_type: eventType,
      payload: payload,
      result: "processing",
    }).select().single();

    // ==========================================
    // FILTRO 1: IGNORAR OUTGOING (ROBUSTO)
    // ==========================================
    const isOutgoing = 
      messageType === "outgoing" || 
      messageType === 1 || 
      senderType === "user";
    
    if (isOutgoing) {
      console.log(`[Webhook] Ignored outgoing message (message_type=${messageType}, sender.type=${senderType})`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "ignored outgoing message",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "outgoing message" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar que tenemos conversation_id
    if (!conversationId) {
      console.warn("[Webhook] No conversation ID in payload");
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "No conversation ID",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "No conversation ID" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // FILTRO 2: GATE ANTI-LEAD-VACÍO (DETERMINISTA)
    // ==========================================
    // Si no hay email, no hay phone, y el nombre es null o es un alias -> NO crear lead
    const hasEmail = email !== null && email.trim() !== "";
    const hasPhone = phone !== null && phone.trim() !== "";
    const hasValidName = rawName !== null && !isAlias;
    
    if (!hasEmail && !hasPhone && !hasValidName) {
      console.log(`[Webhook] Ignored missing-contact lead (rawName=${rawName}, looksLikeAlias=${isAlias}, email=${email}, phone=${phone})`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "ignored missing-contact lead",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "missing-contact (no email, no phone, name is null or alias)" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FILTRO DE SEGURIDAD: Solo procesar conversaciones desde el 17/01/2026
    const FECHA_MINIMA = new Date("2026-01-17T00:00:00Z").getTime() / 1000;
    const conversationCreatedAt = conversation?.created_at || 0;
    
    if (conversationCreatedAt < FECHA_MINIMA) {
      console.log(`[Webhook] Conversation ${conversationId} is too old (created: ${conversationCreatedAt}), skipping`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "Conversation before cutoff date (17/01/2026)",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "skipped", 
        reason: "Conversation before cutoff date 17/01/2026" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // VERIFICAR SI YA EXISTE LEAD PARA ESTA CONVERSACIÓN
    // ==========================================
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, structured_fields, lead_text")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    // Si ya existe un lead, intentar actualizar con nuevos datos del mensaje
    if (existingLead) {
      console.log(`[Webhook] Lead exists for conversation ${conversationId}: ${existingLead.id} - checking for new data`);
      
      // Extraer datos del mensaje incoming actual
      const incomingContent = payload.content || "";
      const extractedFromText = extractContactFromText(incomingContent);
      
      const currentFields = existingLead.structured_fields as Record<string, unknown> || {};
      const updates: Record<string, unknown> = {};
      let hasUpdates = false;
      
      // Solo actualizar campos que están vacíos
      if (!currentFields.contact_email && extractedFromText.email) {
        updates.contact_email = extractedFromText.email;
        hasUpdates = true;
      }
      if (!currentFields.contact_phone && extractedFromText.phone) {
        updates.contact_phone = extractedFromText.phone;
        hasUpdates = true;
      }
      if (looksLikeAlias(currentFields.contact_name as string) && extractedFromText.name && !looksLikeAlias(extractedFromText.name)) {
        updates.contact_name = extractedFromText.name;
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        const newFields = { ...currentFields, ...updates };
        const newLeadText = existingLead.lead_text 
          ? `${existingLead.lead_text}\n\n${incomingContent}`
          : incomingContent;
        
        await supabase
          .from("leads")
          .update({
            structured_fields: newFields,
            lead_text: newLeadText,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLead.id);
        
        // Actualizar también chatwoot_conversations
        await supabase
          .from("chatwoot_conversations")
          .update({
            contact_name: (newFields.contact_name as string) || null,
            contact_email: (newFields.contact_email as string) || null,
            contact_phone: (newFields.contact_phone as string) || null,
            processed_at: new Date().toISOString(),
          })
          .eq("chatwoot_conversation_id", conversationId);
        
        console.log(`[Webhook] Lead updated from incoming - conversation_id=${conversationId}, lead_id=${existingLead.id}, updates=${JSON.stringify(updates)}`);
        
        if (logData?.id) {
          await supabase.from("webhook_logs").update({
            result: "success",
            error_message: `Updated existing lead with: ${Object.keys(updates).join(", ")}`,
            processing_time_ms: Date.now() - startTime,
          }).eq("id", logData.id);
        }
        
        return new Response(JSON.stringify({ 
          status: "updated", 
          lead_id: existingLead.id,
          conversation_id: conversationId,
          updates: updates,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // No hay nuevos datos
      console.log(`[Webhook] No new contact data in incoming message for conversation ${conversationId}`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "Lead exists, no new contact data",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "skipped", 
        reason: "Lead exists, no new data",
        lead_id: existingLead.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // OBTENER MENSAJES Y EXTRAER DATOS
    // ==========================================
    const messages = await getConversationMessages(conversationId);
    
    if (messages.length === 0) {
      console.warn("[Webhook] No messages retrieved from API");
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "error",
          error_message: "No messages from Chatwoot API",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "error", 
        reason: "Could not fetch messages from Chatwoot" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtrar solo mensajes del USUARIO (message_type = 0)
    const userMessages = messages
      .filter(m => m.message_type === 0 && m.content)
      .sort((a, b) => a.created_at - b.created_at);
    
    if (userMessages.length === 0) {
      console.warn("[Webhook] No user messages in conversation");
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "No user messages in conversation",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "skipped", 
        reason: "No user messages" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construir texto completo y extraer datos
    const fullText = userMessages.map(m => m.content).join("\n");
    const extractedFromText = extractContactFromText(fullText);
    
    // Detectar área legal
    const legalArea = detectLegalArea(fullText);
    
    // Ubicación del contacto (desde metadata de Chatwoot)
    let ubicacion: string | null = null;
    if (contact?.additional_attributes?.city) {
      ubicacion = `${contact.additional_attributes.city}, ${contact.additional_attributes.country || "España"}`;
    }

    // Construir lead_text
    const leadText = userMessages.map(m => m.content).join("\n\n");

    // ==========================================
    // PREPARAR STRUCTURED_FIELDS
    // ==========================================
    // IMPORTANTE: NUNCA usar "Sin nombre" como valor - dejar NULL si no hay nombre válido
    const finalName = extractedFromText.name || (hasValidName ? rawName : null);
    const finalEmail = extractedFromText.email || email;
    const finalPhone = extractedFromText.phone || phone;
    
    const structuredFields = {
      contact_name: finalName, // NULL si no hay nombre válido (NO "Sin nombre")
      contact_phone: finalPhone,
      contact_email: finalEmail,
      city: ubicacion,
      province: null,
      legal_area: legalArea,
      urgency: "media",
      amount: null,
      company_involved: null,
    };

    // ==========================================
    // VALIDACIÓN FINAL PRE-INSERT
    // ==========================================
    const hasFinalEmail = finalEmail !== null && finalEmail.trim() !== "";
    const hasFinalPhone = finalPhone !== null && finalPhone.trim() !== "";
    const hasFinalValidName = finalName !== null && !looksLikeAlias(finalName);
    
    if (!hasFinalEmail && !hasFinalPhone && !hasFinalValidName) {
      console.log(`[Webhook] Ignored missing-contact lead after text extraction (no valid name/email/phone)`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "ignored missing-contact lead (after text extraction)",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "missing-contact after text extraction" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Webhook] Creating lead with structured_fields:", JSON.stringify(structuredFields, null, 2));

    // ==========================================
    // UPSERT LEAD (DEDUPLICACIÓN POR CONVERSATION_ID)
    // ==========================================
    const { data: newLead, error: upsertError } = await supabase
      .from("leads")
      .upsert({
        conversation_id: conversationId,
        lead_text: leadText,
        structured_fields: structuredFields,
        source_channel: "Web chat",
        status_internal: "Pendiente",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "conversation_id",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("[Webhook] Error upserting lead:", upsertError);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "error",
          error_message: upsertError.message,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      throw upsertError;
    }

    console.log(`[Webhook] Upsert lead ok - lead_id=${newLead.id}, conversation_id=${conversationId}`);

    // Registrar en chatwoot_conversations con UPSERT
    await supabase.from("chatwoot_conversations").upsert({
      chatwoot_conversation_id: conversationId,
      chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
      chatwoot_contact_id: contact?.id || null,
      contact_name: structuredFields.contact_name,
      contact_phone: structuredFields.contact_phone,
      contact_email: structuredFields.contact_email,
      conversation_content: leadText,
      messages_count: messages.length,
      lead_id: newLead.id,
      processed_at: new Date().toISOString(),
      status: "processed",
    }, {
      onConflict: "chatwoot_conversation_id",
    });

    // Registrar en import logs
    await supabase.from("chatwoot_import_logs").insert({
      chatwoot_conversation_id: conversationId,
      event_type: eventType,
      status: "success",
      payload_json: {
        extracted: structuredFields,
        messages_count: messages.length,
        user_messages_count: userMessages.length,
      },
    });

    // Actualizar log como éxito
    if (logData?.id) {
      await supabase.from("webhook_logs").update({
        result: "success",
        error_message: null,
        processing_time_ms: Date.now() - startTime,
      }).eq("id", logData.id);
    }

    // ==========================================
    // PIPELINE IA: Extraer datos + Calcular Lexcore
    // ==========================================
    try {
      // Paso 1: Reprocesar con IA para extraer datos estructurados del texto
      const reprocessUrl = `${supabaseUrl}/functions/v1/reprocess-lead`;
      const reprocessResponse = await fetch(reprocessUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ lead_id: newLead.id }),
      });
      
      if (reprocessResponse.ok) {
        const reprocessData = await reprocessResponse.json();
        console.log(`[Webhook] AI extraction completed for lead ${newLead.id}:`, JSON.stringify(reprocessData.results?.[0]?.changes_made || []));
      } else {
        console.warn(`[Webhook] AI extraction failed (${reprocessResponse.status}) - continuing with Lexcore`);
      }
      
      // Paso 2: Calcular Lexcore
      const lexcoreUrl = `${supabaseUrl}/functions/v1/calculate-lexcore`;
      await fetch(lexcoreUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          lead_id: newLead.id,
          lead_text: leadText,
          structured_fields: structuredFields,
          source_channel: "Web chat",
        }),
      });
      console.log(`[Webhook] Lexcore calculation triggered for lead ${newLead.id}`);
    } catch (pipelineError) {
      console.warn("[Webhook] Pipeline (AI+Lexcore) failed (non-blocking):", pipelineError);
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      lead_id: newLead.id,
      conversation_id: conversationId,
      extracted: {
        nombre: structuredFields.contact_name,
        email: structuredFields.contact_email,
        telefono: structuredFields.contact_phone,
        ubicacion: ubicacion,
        area: legalArea,
        messages_processed: messages.length,
        user_messages: userMessages.length,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Webhook] Error:", error);
    
    return new Response(JSON.stringify({ 
      status: "error", 
      message: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
