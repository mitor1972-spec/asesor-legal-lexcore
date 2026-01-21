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
const NAME_PATTERNS = [
  /(?:me llamo|soy|mi nombre es|llamo)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,4})/i,
  /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})$/m, // Nombre propio en línea sola
];

interface ChatwootMessage {
  id: number;
  content: string | null;
  message_type: number; // 0 = incoming (user), 1 = outgoing (agent)
  created_at: number;
  sender?: {
    id?: number;
    name?: string;
    type?: string;
    email?: string;
    phone_number?: string;
  };
}

interface TranscriptStats {
  total_messages: number;
  incoming_count: number;
  outgoing_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  last_incoming_excerpt: string | null;
  last_outgoing_excerpt: string | null;
  pages_fetched: number;
}

// Verificar si un nombre es un alias automático
function looksLikeAlias(name: string | null | undefined): boolean {
  if (!name || name.trim() === "") return true;
  return ALIAS_REGEX.test(name.trim());
}

// Extraer datos de contacto del texto completo
function extractContactFromText(text: string): {
  email: string | null;
  phone: string | null;
  name: string | null;
} {
  const emailMatches = text.match(EMAIL_REGEX);
  const phoneMatches = text.match(PHONE_REGEX_ES);
  
  let name: string | null = null;
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1] && !looksLikeAlias(match[1])) {
      name = match[1].trim();
      break;
    }
  }
  
  return {
    email: emailMatches ? emailMatches[0].toLowerCase() : null,
    phone: phoneMatches ? phoneMatches[0].replace(/[\s.-]/g, "") : null,
    name,
  };
}

/**
 * FETCH COMPLETO CON PAGINACIÓN - Obtener TODOS los mensajes de una conversación
 */
async function fetchAllMessagesWithPagination(conversationId: number): Promise<{ messages: ChatwootMessage[]; stats: TranscriptStats }> {
  const allMessages: ChatwootMessage[] = [];
  let page = 1;
  const perPage = 100; // Chatwoot default max
  let hasMore = true;
  let pagesCount = 0;
  
  console.log(`[FETCH] Starting paginated fetch for conversation ${conversationId}`);
  
  while (hasMore) {
    const url = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages?page=${page}&per_page=${perPage}`;
    
    console.log(`[FETCH] Requesting page ${page}: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "api_access_token": CHATWOOT_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      
      console.log(`[FETCH] Page ${page} response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FETCH] API Error on page ${page}: ${response.status} - ${errorText}`);
        break;
      }
      
      const data = await response.json();
      const messages = data.payload || [];
      const meta = data.meta || {};
      
      console.log(`[FETCH] Page ${page}: received ${messages.length} messages (meta: ${JSON.stringify(meta)})`);
      
      allMessages.push(...messages);
      pagesCount++;
      
      // Check pagination
      if (messages.length < perPage) {
        hasMore = false;
      } else {
        page++;
        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`[FETCH] Exception on page ${page}:`, error);
      break;
    }
  }
  
  // Sort by created_at ascending
  allMessages.sort((a, b) => a.created_at - b.created_at);
  
  // Calculate stats
  const incomingMessages = allMessages.filter(m => m.message_type === 0);
  const outgoingMessages = allMessages.filter(m => m.message_type === 1);
  
  const stats: TranscriptStats = {
    total_messages: allMessages.length,
    incoming_count: incomingMessages.length,
    outgoing_count: outgoingMessages.length,
    first_message_at: allMessages.length > 0 
      ? new Date(allMessages[0].created_at * 1000).toISOString() 
      : null,
    last_message_at: allMessages.length > 0 
      ? new Date(allMessages[allMessages.length - 1].created_at * 1000).toISOString() 
      : null,
    last_incoming_excerpt: incomingMessages.length > 0 
      ? (incomingMessages[incomingMessages.length - 1].content || "").substring(0, 50) 
      : null,
    last_outgoing_excerpt: outgoingMessages.length > 0 
      ? (outgoingMessages[outgoingMessages.length - 1].content || "").substring(0, 50) 
      : null,
    pages_fetched: pagesCount,
  };
  
  console.log(`[FETCH] Complete transcript stats: ${JSON.stringify(stats)}`);
  
  return { messages: allMessages, stats };
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
    // EXTRAER DATOS DEL CONTACTO (METADATA CHATWOOT - NO ES EL NOMBRE REAL)
    // ==========================================
    const contact = (payload.sender?.type === "contact") 
      ? payload.sender 
      : conversation?.meta?.sender;
    
    const contactAlias: string | null = contact?.name ?? null; // Este es el ALIAS (floral-surf-101)
    const contactEmail: string | null = contact?.email ?? null;
    const contactPhone: string | null = contact?.phone_number ?? contact?.phone ?? null;
    const isAlias = looksLikeAlias(contactAlias);
    
    // ==========================================
    // LOG DE ENTRADA DETALLADO (REQUISITO A)
    // ==========================================
    const payloadMessagesCount = Array.isArray(payload.messages) ? payload.messages.length : 0;
    const messageType = payload.message_type;
    const senderType = payload.sender?.type;
    
    console.log(`[WEBHOOK_ENTRY] ${JSON.stringify({
      event: eventType,
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: messageType,
      payload_messages_count: payloadMessagesCount,
      contact_alias: contactAlias,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      is_alias: isAlias,
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
    // VALIDAR CONVERSATION_ID
    // ==========================================
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
    // REQUISITO D: DEDUPLICACIÓN POR TIMESTAMP
    // ==========================================
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, structured_fields, lead_text, last_message_at, last_processed_at, conversation_id, discarded_at, discard_reason")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    // ==========================================
    // REQUISITO #1: FETCH TRANSCRIPT COMPLETO CON PAGINACIÓN
    // ==========================================
    console.log(`[Webhook] Fetching FULL transcript for conversation ${conversationId} (NOT using payload.messages)`);
    
    const { messages: allMessages, stats: transcriptStats } = await fetchAllMessagesWithPagination(conversationId);
    
    // Log del transcript (REQUISITO A - punto 3)
    console.log(`[TRANSCRIPT] ${JSON.stringify({
      conversation_id: conversationId,
      transcript_messages_count: transcriptStats.total_messages,
      incoming_count: transcriptStats.incoming_count,
      outgoing_count: transcriptStats.outgoing_count,
      first_message_at: transcriptStats.first_message_at,
      last_message_at: transcriptStats.last_message_at,
      last_incoming_excerpt: transcriptStats.last_incoming_excerpt,
      last_outgoing_excerpt: transcriptStats.last_outgoing_excerpt,
      pages_fetched: transcriptStats.pages_fetched,
    })}`);
    
    // Validar que tenemos mensajes
    if (allMessages.length === 0) {
      console.warn("[Webhook] No messages in transcript");
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: "No messages in transcript after full fetch",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "skipped", 
        reason: "No messages in transcript" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // REQUISITO D: DEDUPLICACIÓN - Comprobar si ya procesamos este estado
    // ==========================================
    const lastMessageTimestamp = transcriptStats.last_message_at;
    
    if (existingLead && existingLead.last_processed_at && existingLead.last_message_at) {
      const lastProcessedAt = new Date(existingLead.last_processed_at).getTime();
      const lastMsgAt = new Date(existingLead.last_message_at).getTime();
      const currentLastMsgAt = lastMessageTimestamp ? new Date(lastMessageTimestamp).getTime() : 0;
      
      // Si el último mensaje no ha cambiado desde el último procesamiento, skip
      if (currentLastMsgAt <= lastMsgAt && lastMsgAt <= lastProcessedAt) {
        console.log(`[Webhook] DEDUPE: Skipping - no new messages since last processing (last_message_at=${existingLead.last_message_at}, last_processed_at=${existingLead.last_processed_at})`);
        
        if (logData?.id) {
          await supabase.from("webhook_logs").update({
            result: "skipped",
            error_message: "Dedupe: no new messages since last processing",
            processing_time_ms: Date.now() - startTime,
          }).eq("id", logData.id);
        }
        
        return new Response(JSON.stringify({ 
          status: "skipped", 
          reason: "dedupe - no new messages",
          lead_id: existingLead.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ==========================================
    // CONSTRUIR TRANSCRIPT COMPLETO
    // ==========================================
    // Incluir TODOS los mensajes para contexto de IA, pero priorizar incoming para extracción
    const incomingMessages = allMessages.filter(m => m.message_type === 0 && m.content);
    const allMessageContents = allMessages.filter(m => m.content);
    
    // Transcript completo (incoming + outgoing) para IA
    const fullTranscript = allMessageContents
      .map(m => `[${m.message_type === 0 ? 'USER' : 'AGENT'}]: ${m.content}`)
      .join("\n\n");
    
    // Texto solo de usuario (incoming) para extracción de contacto
    const userText = incomingMessages.map(m => m.content).join("\n\n");
    
    console.log(`[Webhook] Built transcripts: fullTranscript=${fullTranscript.length} chars, userText=${userText.length} chars`);

    // ==========================================
    // REQUISITO #3: EXTRAER DATOS - Priorizar INCOMING del contacto
    // ==========================================
    const extractedFromText = extractContactFromText(userText);
    
    // IMPORTANTE: Usar solo datos extraídos del texto, NO el alias de Chatwoot
    // El campo contact_alias guardará el alias de Chatwoot (floral-surf-101)
    // El campo nombre (structured_fields.nombre) solo se llena si hay nombre real en el texto
    
    // Detectar área legal del texto completo
    const legalArea = detectLegalArea(fullTranscript);
    
    console.log(`[EXTRACTION] ${JSON.stringify({
      conversation_id: conversationId,
      contact_alias: contactAlias,
      extracted_name: extractedFromText.name,
      extracted_email: extractedFromText.email || contactEmail,
      extracted_phone: extractedFromText.phone || contactPhone,
      detected_legal_area: legalArea,
    })}`);

    // ==========================================
    // PREPARAR STRUCTURED_FIELDS
    // ==========================================
    const finalEmail = extractedFromText.email || contactEmail;
    const finalPhone = extractedFromText.phone || contactPhone;
    const finalName = extractedFromText.name; // Solo nombre extraído del texto, NUNCA el alias
    
    const structuredFields: Record<string, unknown> = {
      nombre: finalName, // NULL si no hay nombre real extraído
      telefono: finalPhone,
      email: finalEmail,
      area_legal: legalArea,
      _contact_alias: contactAlias, // Guardar alias por separado (REQUISITO #3)
      _transcript_stats: transcriptStats,
    };
    
    // Eliminar _incomplete flag si tenemos datos de contacto
    if (finalEmail || finalPhone || finalName) {
      delete structuredFields._incomplete;
    }

    // ==========================================
    // GOLDEN RULE VALIDATION: Lead must have email OR phone
    // Leads without contact info are NOT commercial leads
    // ==========================================
    const hasValidContact = !!(finalEmail || finalPhone);
    const now = new Date().toISOString();
    
    if (!hasValidContact) {
      console.log(`[Webhook] GOLDEN RULE: Lead invalid - no email and no phone for conversation ${conversationId}`);
      
      // Create/update lead with discarded_at flag (soft-delete pattern)
      // This allows the lead to be reactivated if contact info arrives later
      const discardedLeadData = {
        conversation_id: conversationId,
        lead_text: fullTranscript,
        structured_fields: {
          ...structuredFields,
          _incomplete: true,
        },
        source_channel: "Web chat",
        status_internal: "Pendiente",
        last_message_at: lastMessageTimestamp,
        last_processed_at: now,
        updated_at: now,
        // CRITICAL: Mark as discarded with reason
        discarded_at: now,
        discard_reason: "missing_contact",
        price_final: 0, // No commercial value without contact
      };
      
      const { data: discardedLead, error: discardError } = await supabase
        .from("leads")
        .upsert(discardedLeadData, {
          onConflict: "conversation_id",
        })
        .select()
        .single();
      
      // Log the conversation for debugging
      await supabase.from("chatwoot_conversations").upsert({
        chatwoot_conversation_id: conversationId,
        chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
        contact_name: contactAlias,
        conversation_content: fullTranscript.substring(0, 10000),
        messages_count: allMessages.length,
        status: "discarded_no_contact",
        processed_at: now,
        lead_id: discardedLead?.id,
      }, {
        onConflict: "chatwoot_conversation_id",
      });
      
      await supabase.from("chatwoot_import_logs").insert({
        chatwoot_conversation_id: conversationId,
        event_type: eventType,
        status: "discarded_no_contact",
        payload_json: {
          transcript_stats: transcriptStats,
          reason: "GOLDEN RULE: No email AND no phone - lead discarded",
          contact_alias: contactAlias,
          lead_id: discardedLead?.id,
        },
      });
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "discarded",
          error_message: "GOLDEN RULE: No email AND no phone - lead stored but discarded",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "discarded", 
        reason: "GOLDEN RULE: Lead must have email OR phone to be commercial",
        conversation_id: conversationId,
        contact_alias: contactAlias,
        lead_id: discardedLead?.id,
        note: "Lead stored in 'Leads Descartados' - can be reactivated if contact info arrives",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Webhook] GOLDEN RULE: Lead VALID - has ${finalEmail ? 'email' : ''}${finalEmail && finalPhone ? ' and ' : ''}${finalPhone ? 'phone' : ''}`);

    // ==========================================
    // UPSERT LEAD CON TIMESTAMPS (REQUISITO #4)
    // INCLUDING REACTIVATION: Clear discarded_at if lead was previously discarded
    // ==========================================
    
    const leadData = {
      conversation_id: conversationId,
      lead_text: fullTranscript, // Transcript COMPLETO para IA
      structured_fields: existingLead 
        ? { ...(existingLead.structured_fields as Record<string, unknown> || {}), ...structuredFields }
        : structuredFields,
      source_channel: "Web chat",
      status_internal: "Pendiente",
      last_message_at: lastMessageTimestamp,
      last_processed_at: now,
      updated_at: now,
      // REACTIVATION: Clear discarded status since we now have valid contact
      discarded_at: null,
      discard_reason: null,
    };
    
    console.log(`[Webhook] Upserting lead with data: ${JSON.stringify({
      conversation_id: conversationId,
      has_name: !!finalName,
      has_email: !!finalEmail,
      has_phone: !!finalPhone,
      transcript_length: fullTranscript.length,
      last_message_at: lastMessageTimestamp,
      reactivating: !!(existingLead?.discarded_at),
    })}`);

    const { data: upsertedLead, error: upsertError } = await supabase
      .from("leads")
      .upsert(leadData, {
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

    console.log(`[Webhook] Upsert lead OK - lead_id=${upsertedLead.id}, conversation_id=${conversationId}, action=${existingLead ? 'updated' : 'created'}`);

    // Registrar en chatwoot_conversations con UPSERT
    await supabase.from("chatwoot_conversations").upsert({
      chatwoot_conversation_id: conversationId,
      chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
      chatwoot_contact_id: contact?.id || null,
      contact_name: finalName || contactAlias, // Para referencia visual
      contact_phone: finalPhone,
      contact_email: finalEmail,
      conversation_content: fullTranscript.substring(0, 10000),
      messages_count: allMessages.length,
      lead_id: upsertedLead.id,
      processed_at: now,
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
        transcript_stats: transcriptStats,
        extracted: {
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          area: legalArea,
        },
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
    // PIPELINE IA COMPLETO: Extract → POST-IA GATE → Lexcore → Summary
    // ==========================================
    let finalLeadValid = true; // Track if lead is still valid after AI extraction
    
    try {
      // Paso 1: Reprocesar con IA para extraer datos estructurados del texto COMPLETO
      const reprocessUrl = `${supabaseUrl}/functions/v1/reprocess-lead`;
      const reprocessResponse = await fetch(reprocessUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ lead_id: upsertedLead.id }),
      });
      
      if (reprocessResponse.ok) {
        const reprocessData = await reprocessResponse.json();
        console.log(`[Webhook] AI extraction completed for lead ${upsertedLead.id}:`, JSON.stringify(reprocessData.results?.[0]?.changes_made || []));
        
        // ==========================================
        // GATE POST-IA: Re-verify contact after AI extraction
        // ==========================================
        const { data: updatedLead } = await supabase
          .from("leads")
          .select("id, structured_fields")
          .eq("id", upsertedLead.id)
          .single();
        
        if (updatedLead) {
          const sf = updatedLead.structured_fields as Record<string, unknown>;
          const postAiEmail = sf?.email as string;
          const postAiPhone = sf?.telefono as string;
          const postAiHasContact = !!(
            (postAiEmail && postAiEmail.trim() !== '') || 
            (postAiPhone && postAiPhone.trim() !== '')
          );
          
          if (!postAiHasContact) {
            console.log(`[Webhook] POST-IA GATE: Lead ${upsertedLead.id} has no contact after AI extraction - marking as discarded`);
            
            await supabase
              .from("leads")
              .update({
                discarded_at: new Date().toISOString(),
                discard_reason: "missing_contact_post_ai",
                price_final: 0,
              })
              .eq("id", upsertedLead.id);
            
            finalLeadValid = false;
          } else {
            console.log(`[Webhook] POST-IA GATE: Lead ${upsertedLead.id} confirmed valid - email=${!!postAiEmail}, phone=${!!postAiPhone}`);
          }
        }
      } else {
        console.warn(`[Webhook] AI extraction failed (${reprocessResponse.status}) - continuing with Lexcore`);
      }
      
      // Only run Lexcore and Summary if lead is still valid
      if (finalLeadValid) {
        // Paso 2: Calcular Lexcore
        const lexcoreUrl = `${supabaseUrl}/functions/v1/calculate-lexcore`;
        await fetch(lexcoreUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            lead_id: upsertedLead.id,
            lead_text: fullTranscript,
            structured_fields: structuredFields,
            source_channel: "Web chat",
          }),
        });
        console.log(`[Webhook] Lexcore calculation triggered for lead ${upsertedLead.id}`);
        
        // Paso 3: Generar resumen estructurado AUTOMÁTICAMENTE (REQUISITO FASE 2)
        const summaryUrl = `${supabaseUrl}/functions/v1/generate-case-summary`;
        const summaryResponse = await fetch(summaryUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ lead_id: upsertedLead.id }),
        });
        
        if (summaryResponse.ok) {
          console.log(`[Webhook] Case summary generated for lead ${upsertedLead.id}`);
        } else {
          console.warn(`[Webhook] Case summary generation failed (${summaryResponse.status})`);
        }
      }
    } catch (pipelineError) {
      console.warn("[Webhook] Pipeline (AI+Lexcore+Summary) failed (non-blocking):", pipelineError);
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      action: existingLead ? "updated" : "created",
      lead_id: upsertedLead.id,
      conversation_id: conversationId,
      transcript_stats: transcriptStats,
      extracted: {
        nombre: finalName,
        email: finalEmail,
        telefono: finalPhone,
        area: legalArea,
        contact_alias: contactAlias,
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
