import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuración Chatwoot
const CHATWOOT_ACCOUNT_ID = "138173";
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") || "2GmoSRCQ9v71JhvgKWvC11Zw";

// Regex para detectar alias automáticos tipo "lively-frog-81"
const ALIAS_REGEX = /^[a-z]+-[a-z]+-\d+$/i;

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
  attachments?: Array<{
    file_type: string;
    data_url: string;
  }>;
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

// Verificar si un nombre es un alias automático
function isAutoAlias(name: string | null | undefined): boolean {
  if (!name) return true;
  return ALIAS_REGEX.test(name.trim());
}

// Extraer datos del lead de los mensajes
function extractLeadData(messages: ChatwootMessage[]): {
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  ubicacion: string | null;
  descripcion: string;
  area_legal: string | null;
  urgencia: string | null;
} {
  // Filtrar solo mensajes del USUARIO (message_type = 0)
  const userMessages = messages
    .filter(m => m.message_type === 0 && m.content)
    .sort((a, b) => a.created_at - b.created_at);
  
  console.log(`[Extract] Processing ${userMessages.length} user messages`);
  
  const fullText = userMessages.map(m => m.content).join("\n");
  
  // Patrones de extracción
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;
  const phoneRegex = /(?:\+34\s?)?[67]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|\d{9}/g;
  const nameRegex = /(?:me llamo|soy|mi nombre es|llamo)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,3})/i;
  
  // Buscar ubicación en el texto
  const locationRegex = /(?:en|de|desde|vivo en|estoy en|soy de)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)/gi;
  
  // Extraer email
  const emailMatches = fullText.match(emailRegex);
  const email = emailMatches ? emailMatches[0].toLowerCase() : null;
  
  // Extraer teléfono
  const phoneMatches = fullText.match(phoneRegex);
  const telefono = phoneMatches ? phoneMatches[0].replace(/[\s.-]/g, "") : null;
  
  // Extraer nombre - buscar patrón específico o mensaje con nombre completo
  let nombre: string | null = null;
  const nameMatch = fullText.match(nameRegex);
  if (nameMatch) {
    nombre = nameMatch[1].trim();
  } else {
    // Buscar mensajes cortos que parezcan nombres
    for (let i = 0; i < userMessages.length; i++) {
      const msg = userMessages[i].content || "";
      if (msg.length < 50 && msg.length > 3) {
        const words = msg.trim().split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
          const looksLikeName = words.every(w => /^[A-ZÁÉÍÓÚÑa-záéíóúñ]+$/.test(w));
          if (looksLikeName && /[A-ZÁÉÍÓÚÑ]/.test(msg)) {
            nombre = msg.trim();
            break;
          }
        }
      }
    }
  }
  
  // Extraer ubicación del texto
  let ubicacion: string | null = null;
  const locationMatches = fullText.matchAll(locationRegex);
  for (const match of locationMatches) {
    const loc = match[1].trim();
    if (!["el", "la", "los", "las", "un", "una", "que", "mi", "tu"].includes(loc.toLowerCase())) {
      ubicacion = loc;
      break;
    }
  }
  
  // Detectar área legal
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
  
  let area_legal: string | null = null;
  const textLower = fullText.toLowerCase();
  
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        area_legal = area;
        break;
      }
    }
    if (area_legal) break;
  }
  
  // Detectar urgencia
  let urgencia: string | null = "media";
  const urgenciaAlta = ["urgente", "urgencia", "rápido", "inmediato", "cuanto antes", "prisa", "ya"];
  const urgenciaBaja = ["puedo esperar", "sin prisa", "cuando pueda", "no corre prisa", "tranquilamente"];
  
  for (const palabra of urgenciaAlta) {
    if (textLower.includes(palabra)) {
      urgencia = "alta";
      break;
    }
  }
  for (const palabra of urgenciaBaja) {
    if (textLower.includes(palabra)) {
      urgencia = "baja";
      break;
    }
  }
  
  // Descripción: primer mensaje del usuario (el caso)
  const descripcion = userMessages[0]?.content || fullText.substring(0, 500);
  
  console.log(`[Extract] Results: nombre=${nombre}, email=${email}, telefono=${telefono}, ubicacion=${ubicacion}, area=${area_legal}`);
  
  return {
    nombre,
    telefono,
    email,
    ubicacion,
    descripcion,
    area_legal,
    urgencia,
  };
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
    
    // Extraer conversation correctamente
    const conversation = payload.conversation ?? payload;
    const conversationId = conversation?.id;
    
    console.log(`[Webhook] Received event: ${eventType}, conversation: ${conversationId}`);
    
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
    // FILTRO 1: Ignorar mensajes OUTGOING
    // ==========================================
    const messageType = payload.message_type;
    const senderType = payload.sender?.type;
    
    // message_type puede ser "outgoing" (string) o el sender puede ser un "user" (agente)
    if (messageType === "outgoing" || senderType === "user") {
      console.log(`[Webhook] Ignored outgoing message (message_type=${messageType}, sender.type=${senderType})`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "Ignored outgoing message",
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
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "No conversation ID" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // FILTRO 2: Extraer contacto CORRECTO
    // ==========================================
    // Si payload.sender es un contact, usarlo; si no, usar conversation.meta.sender
    const contact = (payload.sender?.type === "contact") 
      ? payload.sender 
      : conversation?.meta?.sender;
    
    const contactName = contact?.name || null;
    const contactEmail = contact?.email || null;
    const contactPhone = contact?.phone_number || null;
    
    console.log(`[Webhook] Contact extracted: name=${contactName}, email=${contactEmail}, phone=${contactPhone}`);

    // ==========================================
    // FILTRO 3: Gate anti-lead-vacío
    // ==========================================
    // No crear lead si: no hay email, no hay phone, y el nombre es un alias
    if (!contactEmail && !contactPhone && isAutoAlias(contactName)) {
      console.log(`[Webhook] Ignored missing-contact lead (name=${contactName} is alias, no email/phone)`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "Missing contact data (alias name, no email/phone)",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "missing-contact (alias name, no email, no phone)" 
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
    // DEDUPLICACIÓN: Verificar si ya existe lead para esta conversación
    // ==========================================
    const { data: existingConv } = await supabase
      .from("chatwoot_conversations")
      .select("id, lead_id")
      .eq("chatwoot_conversation_id", conversationId)
      .maybeSingle();

    if (existingConv?.lead_id) {
      console.log(`[Webhook] Lead already exists for conversation ${conversationId}: ${existingConv.lead_id}`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "Lead already exists",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "skipped", 
        reason: "Lead already exists",
        lead_id: existingConv.lead_id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener TODOS los mensajes de la conversación desde la API de Chatwoot
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

    // Verificar que hay mensajes del usuario
    const userMessages = messages.filter(m => m.message_type === 0 && m.content);
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

    // Extraer datos del lead de los mensajes (IA solo en incoming)
    const extracted = extractLeadData(messages);

    // Ubicación: preferir la extraída del chat, si no la del IP del contacto
    let ubicacionFinal = extracted.ubicacion;
    if (!ubicacionFinal && contact?.additional_attributes?.city) {
      ubicacionFinal = `${contact.additional_attributes.city}, ${contact.additional_attributes.country || "España"}`;
    }

    // Construir lead_text con todos los mensajes del usuario
    const leadText = userMessages.map(m => m.content).join("\n\n");

    // Preparar structured_fields - PRIORIZAR datos extraídos del texto sobre metadata
    const structuredFields = {
      contact_name: extracted.nombre || (isAutoAlias(contactName) ? null : contactName),
      contact_phone: extracted.telefono || contactPhone,
      contact_email: extracted.email || contactEmail,
      city: ubicacionFinal || null,
      province: null,
      legal_area: extracted.area_legal || null,
      urgency: extracted.urgencia || "media",
      amount: null,
      company_involved: null,
    };

    // ==========================================
    // VALIDACIÓN FINAL: Verificar que hay datos mínimos
    // ==========================================
    const hasValidName = structuredFields.contact_name && !isAutoAlias(structuredFields.contact_name);
    const hasValidContact = structuredFields.contact_email || structuredFields.contact_phone;
    
    if (!hasValidName && !hasValidContact) {
      console.log(`[Webhook] Ignored missing-contact lead after extraction (no valid name/email/phone)`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "No valid contact data after extraction",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored", 
        reason: "missing-contact after extraction" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Webhook] Creating lead with structured_fields:", JSON.stringify(structuredFields, null, 2));

    // Crear el lead en la tabla leads
    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        lead_text: leadText,
        structured_fields: structuredFields,
        source_channel: "Web chat",
        status_internal: "Pendiente",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Webhook] Error creating lead:", insertError);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "error",
          error_message: insertError.message,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      throw insertError;
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

    // Intentar calcular Lexcore automáticamente
    try {
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
    } catch (lexcoreError) {
      console.warn("[Webhook] Lexcore calculation failed (non-blocking):", lexcoreError);
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      lead_id: newLead.id,
      conversation_id: conversationId,
      extracted: {
        nombre: structuredFields.contact_name,
        email: structuredFields.contact_email,
        telefono: structuredFields.contact_phone,
        ubicacion: ubicacionFinal,
        area: extracted.area_legal,
        urgencia: extracted.urgencia,
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
