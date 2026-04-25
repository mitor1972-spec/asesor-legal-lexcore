import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// IMPROVED: Spanish phone regex - more comprehensive
// Matches: 647989870, +34 647 989 870, 647 98 98 70, etc.
const PHONE_REGEX_ES = /(?:\+34[\s.-]?)?(?:6|7|8|9)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}|(?:\+34[\s.-]?)?(?:6|7|8|9)\d{8}/g;

const NAME_PATTERNS = [
  /(?:me llamo|soy|mi nombre es|llamo)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,4})/i,
  /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})$/m,
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

// Strip HTML from content
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extraer datos de contacto del texto completo
function extractContactFromText(text: string): {
  email: string | null;
  phone: string | null;
  name: string | null;
} {
  // Strip HTML first
  const cleanText = stripHtml(text);
  
  const emailMatches = cleanText.match(EMAIL_REGEX);
  const phoneMatches = cleanText.match(PHONE_REGEX_ES);
  
  let name: string | null = null;
  for (const pattern of NAME_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match && match[1] && !looksLikeAlias(match[1])) {
      name = match[1].trim();
      break;
    }
  }
  
  // Clean phone number - remove all non-digits except leading +
  let phone: string | null = null;
  if (phoneMatches) {
    phone = phoneMatches[0].replace(/[\s.-]/g, "");
    // Normalize to 9 digits if starts with +34
    if (phone.startsWith("+34")) {
      phone = phone.substring(3);
    }
  }
  
  return {
    email: emailMatches ? emailMatches[0].toLowerCase() : null,
    phone,
    name,
  };
}

/**
 * FETCH COMPLETO CON PAGINACIÓN - Obtener TODOS los mensajes de una conversación
 */
async function fetchAllMessagesWithPagination(conversationId: number): Promise<{ messages: ChatwootMessage[]; stats: TranscriptStats }> {
  const allMessages: ChatwootMessage[] = [];
  let page = 1;
  const perPage = 100;
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
      
      if (messages.length < perPage) {
        hasMore = false;
      } else {
        page++;
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
      ? stripHtml(incomingMessages[incomingMessages.length - 1].content || "").substring(0, 50) 
      : null,
    last_outgoing_excerpt: outgoingMessages.length > 0 
      ? stripHtml(outgoingMessages[outgoingMessages.length - 1].content || "").substring(0, 50) 
      : null,
    pages_fetched: pagesCount,
  };
  
  console.log(`[FETCH] Complete transcript stats: ${JSON.stringify(stats)}`);
  
  return { messages: allMessages, stats };
}

/**
 * INTENT FILTER: Detect if conversation shows real lead intent (seeking a lawyer)
 * vs. just informational queries to the virtual assistant.
 * 
 * A real lead typically:
 * - Mentions wanting to hire/consult a lawyer
 * - Provides contact information voluntarily
 * - Describes a specific legal problem with personal involvement
 * - Asks about costs/fees for legal services
 * 
 * NOT a lead:
 * - Generic legal questions without personal case
 * - Short interactions with no follow-up
 * - Bot-only interactions with no substantive user input
 */
function detectLeadIntent(fullTranscript: string, userText: string, stats: TranscriptStats): {
  isLead: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
} {
  const textLower = userText.toLowerCase();
  const transcriptLower = fullTranscript.toLowerCase();
  
  // STRONG POSITIVE signals - user wants a lawyer
  const strongPositive = [
    'necesito un abogado', 'busco abogado', 'quiero contratar', 'necesito asesoramiento',
    'me gustaría consultar con un abogado', 'pueden ayudarme', 'quiero hablar con un abogado',
    'necesito ayuda legal', 'quiero un presupuesto', 'cuánto cobra', 'cuánto cuesta',
    'me pueden llamar', 'pueden contactar', 'mi teléfono es', 'mi email es',
    'llámame', 'contactadme', 'quiero que me llamen', 'me pongo en contacto',
    'necesito representación', 'quiero demandar', 'quiero recurrir',
    'me han despedido', 'me han denunciado', 'me deben dinero', 'quiero divorciarme',
  ];
  
  // NEGATIVE signals - just informational queries
  const negativeSignals = [
    'solo una pregunta', 'pregunta rápida', 'es solo curiosidad',
    'no necesito abogado', 'solo quería saber', 'gracias por la información',
  ];
  
  const hasStrongPositive = strongPositive.some(s => textLower.includes(s));
  const hasNegative = negativeSignals.some(s => textLower.includes(s));
  
  // Very short conversations with only 1-2 user messages are likely not leads
  if (stats.incoming_count <= 1 && userText.length < 100) {
    return { isLead: false, confidence: 'high', reason: 'Too short: single brief message' };
  }
  
  // If user has provided contact info, they're likely a lead regardless
  const hasContactInText = !!(
    userText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ||
    userText.match(/(?:\+34[\s.-]?)?(?:6|7|8|9)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g)
  );
  
  if (hasContactInText) {
    return { isLead: true, confidence: 'high', reason: 'User provided contact information' };
  }
  
  if (hasStrongPositive && !hasNegative) {
    return { isLead: true, confidence: 'high', reason: 'Strong intent signals detected' };
  }
  
  if (hasNegative && !hasStrongPositive) {
    return { isLead: false, confidence: 'medium', reason: 'Negative intent signals detected' };
  }
  
  // Medium-length conversations with personal case details are likely leads
  const personalCaseSignals = [
    'mi caso', 'mi situación', 'me pasó', 'me han', 'me hicieron',
    'tengo un problema', 'mi ex', 'mi jefe', 'mi empresa', 'mi contrato',
    'me despidieron', 'me multaron', 'me deben', 'debo', 'firmé',
  ];
  
  const hasPersonalCase = personalCaseSignals.some(s => textLower.includes(s));
  
  if (hasPersonalCase && stats.incoming_count >= 2) {
    return { isLead: true, confidence: 'medium', reason: 'Personal case details with engagement' };
  }
  
  // If we have enough user messages with substantial text, consider it a potential lead
  if (stats.incoming_count >= 3 && userText.length > 200) {
    return { isLead: true, confidence: 'low', reason: 'Substantial engagement detected' };
  }
  
  // Default: not enough signal to be a lead
  return { isLead: false, confidence: 'low', reason: 'No clear intent to hire or engage lawyer' };
}

// Detectar área legal basado en palabras clave
function detectLegalArea(text: string): string | null {
  const cleanText = stripHtml(text);
  const areaKeywords: Record<string, string[]> = {
    "Derecho de Familia": ["divorcio", "custodia", "pensión", "matrimonio", "hijos", "separación", "manutención"],
    "Derecho Laboral": ["despido", "trabajo", "contrato laboral", "finiquito", "empresa", "ERE", "ERTE", "nómina", "desempleo"],
    "Derecho Penal": ["denuncia", "delito", "robo", "estafa", "penal", "juicio", "acusación", "víctima", "detenido", "detenida", "cárcel", "prisión"],
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
  
  const textLower = cleanText.toLowerCase();
  
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
  
  // ==========================================
  // REQUISITO 1.1: LOG DE ENTRADA INMEDIATO
  // Registrar ANTES de cualquier validación
  // ==========================================
  let rawPayload: any = null;
  let eventType: string = "unknown";
  let conversationId: number | null = null;
  let messageId: number | null = null;
  let messageType: number | string | null = null;
  let senderType: string | null = null;
  let senderName: string | null = null;
  let inboxId: number | null = null;
  
  try {
    rawPayload = await req.json();
    eventType = rawPayload.event || "unknown";
    
    // Extract all identifiers for logging
    const conversation = rawPayload.conversation ?? rawPayload;
    conversationId = 
      conversation?.id ?? 
      rawPayload.conversation_id ?? 
      conversation?.conversation_id ?? 
      null;
    
    messageId = rawPayload.id ?? rawPayload.message?.id ?? null;
    messageType = rawPayload.message_type ?? rawPayload.message?.message_type ?? null;
    senderType = rawPayload.sender?.type ?? null;
    senderName = rawPayload.sender?.name ?? null;
    inboxId = rawPayload.inbox?.id ?? conversation?.inbox_id ?? null;
    
  } catch (parseError) {
    console.error(`[WEBHOOK_ENTRY] PARSE_ERROR: Could not parse JSON payload`);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // CRITICAL: Log EVERY webhook received with full context
  console.log(`[WEBHOOK_ENTRY] ${JSON.stringify({
    timestamp: new Date().toISOString(),
    event: eventType,
    conversation_id: conversationId,
    message_id: messageId,
    message_type: messageType,
    sender_type: senderType,
    sender_name: senderName,
    inbox_id: inboxId,
  })}`);

  try {
    // Verificar token de seguridad - read from database
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: chatwootSettings } = await supabase
      .from("chatwoot_settings")
      .select("webhook_token, is_active")
      .limit(1)
      .single();
    
    const expectedToken = chatwootSettings?.webhook_token;
    
    if (!token || !expectedToken || token !== expectedToken) {
      console.log(`[WEBHOOK_ENTRY] REJECTED: Invalid token`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // REQUISITO 1.2: LOG ACCEPTANCE/REJECTION REASON
    // ==========================================
    
    // Extract contact info from payload
    const contact = (rawPayload.sender?.type === "contact") 
      ? rawPayload.sender 
      : rawPayload.conversation?.meta?.sender;
    
    const contactAlias: string | null = contact?.name ?? null;
    const contactEmail: string | null = contact?.email ?? null;
    const contactPhone: string | null = contact?.phone_number ?? contact?.phone ?? null;
    const isAlias = looksLikeAlias(contactAlias);
    
    // Supabase already initialized above (token check)

    // Registrar el webhook recibido (SIEMPRE, incluso si luego se rechaza)
    const { data: logData } = await supabase.from("webhook_logs").insert({
      source: "chatwoot",
      event_type: eventType,
      payload: rawPayload,
      result: "processing",
    }).select().single();

    // ==========================================
    // VALIDAR CONVERSATION_ID
    // ==========================================
    if (!conversationId) {
      const reason = "No conversation ID in payload";
      console.log(`[WEBHOOK_ENTRY] ACCEPTED=false REASON="${reason}"`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "ignored",
          error_message: reason,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "ignored"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WEBHOOK_ENTRY] ACCEPTED=true conversation_id=${conversationId} event=${eventType}`);

    // ==========================================
    // DEDUPLICACIÓN POR TIMESTAMP
    // ==========================================
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, structured_fields, lead_text, last_message_at, last_processed_at, conversation_id, discarded_at, discard_reason")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    // ==========================================
    // FETCH TRANSCRIPT COMPLETO CON PAGINACIÓN
    // ==========================================
    console.log(`[Webhook] Fetching FULL transcript for conversation ${conversationId}`);
    
    const { messages: allMessages, stats: transcriptStats } = await fetchAllMessagesWithPagination(conversationId);
    
    console.log(`[TRANSCRIPT] ${JSON.stringify({
      conversation_id: conversationId,
      transcript_messages_count: transcriptStats.total_messages,
      incoming_count: transcriptStats.incoming_count,
      outgoing_count: transcriptStats.outgoing_count,
      first_message_at: transcriptStats.first_message_at,
      last_message_at: transcriptStats.last_message_at,
      pages_fetched: transcriptStats.pages_fetched,
    })}`);
    
    // Validar que tenemos mensajes
    if (allMessages.length === 0) {
      const reason = "No messages in transcript after full fetch";
      console.log(`[WEBHOOK_ENTRY] ACCEPTED=false REASON="${reason}"`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "skipped",
          error_message: reason,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      return new Response(JSON.stringify({ 
        status: "skipped"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // DEDUPLICACIÓN - Comprobar si ya procesamos este estado
    // ==========================================
    const lastMessageTimestamp = transcriptStats.last_message_at;
    
    if (existingLead && existingLead.last_processed_at && existingLead.last_message_at) {
      const lastProcessedAt = new Date(existingLead.last_processed_at).getTime();
      const lastMsgAt = new Date(existingLead.last_message_at).getTime();
      const currentLastMsgAt = lastMessageTimestamp ? new Date(lastMessageTimestamp).getTime() : 0;
      
      if (currentLastMsgAt <= lastMsgAt && lastMsgAt <= lastProcessedAt) {
        const reason = `Dedupe: no new messages since last processing (last_msg=${existingLead.last_message_at})`;
        console.log(`[WEBHOOK_ENTRY] ACCEPTED=false REASON="${reason}"`);
        
        if (logData?.id) {
          await supabase.from("webhook_logs").update({
            result: "skipped",
            error_message: reason,
            processing_time_ms: Date.now() - startTime,
          }).eq("id", logData.id);
        }
        
        return new Response(JSON.stringify({ 
          status: "skipped"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ==========================================
    // CONSTRUIR TRANSCRIPT COMPLETO
    // ==========================================
    const incomingMessages = allMessages.filter(m => m.message_type === 0 && m.content);
    const allMessageContents = allMessages.filter(m => m.content);
    
    // Transcript completo con HTML stripped
    const fullTranscript = allMessageContents
      .map(m => `[${m.message_type === 0 ? 'USER' : 'AGENT'}]: ${stripHtml(m.content || '')}`)
      .join("\n\n");
    
    // Texto solo de usuario para extracción
    const userText = incomingMessages.map(m => stripHtml(m.content || '')).join("\n\n");
    
    console.log(`[Webhook] Built transcripts: fullTranscript=${fullTranscript.length} chars, userText=${userText.length} chars`);

    // ==========================================
    // EXTRAER DATOS - Priorizar texto del contacto
    // ==========================================
    const extractedFromText = extractContactFromText(userText);
    
    // Detectar área legal
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
    // INTENT FILTERING - Detect non-lead conversations
    // ==========================================
    const intentResult = detectLeadIntent(fullTranscript, userText, transcriptStats);
    
    console.log(`[INTENT_FILTER] ${JSON.stringify({
      conversation_id: conversationId,
      is_lead: intentResult.isLead,
      confidence: intentResult.confidence,
      reason: intentResult.reason,
    })}`);
    
    // If clearly not a lead AND no existing lead, skip entirely
    if (!intentResult.isLead && intentResult.confidence !== 'low' && !existingLead) {
      const reason = `Intent filter: ${intentResult.reason} (confidence=${intentResult.confidence})`;
      console.log(`[WEBHOOK_ENTRY] ACCEPTED=false REASON="${reason}"`);
      
      if (logData?.id) {
        await supabase.from("webhook_logs").update({
          result: "filtered_no_intent",
          error_message: reason,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", logData.id);
      }
      
      await supabase.from("chatwoot_import_logs").insert({
        chatwoot_conversation_id: conversationId,
        event_type: eventType,
        status: "filtered_no_intent",
        payload_json: {
          transcript_stats: transcriptStats,
          intent: intentResult,
          contact_alias: contactAlias,
        },
      });
      
      return new Response(JSON.stringify({ 
        status: "filtered"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // PREPARAR STRUCTURED_FIELDS (regex initial values)
    // ==========================================
    const regexEmail = extractedFromText.email || contactEmail;
    const regexPhone = extractedFromText.phone || contactPhone;
    const regexName = extractedFromText.name;
    
    const structuredFields: Record<string, unknown> = {
      nombre: regexName,
      telefono: regexPhone,
      email: regexEmail,
      area_legal: legalArea,
      _contact_alias: contactAlias,
      _transcript_stats: transcriptStats,
      _pending_ai_validation: true,
      _intent: intentResult,
    };

    // ==========================================
    // CRITICAL FIX: NO Golden Rule aquí - SIEMPRE crear lead primero
    // La validación se hace DESPUÉS de la extracción por IA
    // ==========================================
    const hasRegexContact = !!(regexEmail || regexPhone);
    const now = new Date().toISOString();
    
    console.log(`[Webhook] Regex extraction: email=${regexEmail}, phone=${regexPhone}, name=${regexName}, hasContact=${hasRegexContact}`);
    console.log(`[Webhook] Creating/updating lead BEFORE AI validation for conversation ${conversationId}`);

    // ==========================================
    // UPSERT LEAD
    // ==========================================
    const leadData = {
      conversation_id: conversationId,
      lead_text: fullTranscript,
      structured_fields: existingLead 
        ? { ...(existingLead.structured_fields as Record<string, unknown> || {}), ...structuredFields }
        : structuredFields,
      source_channel: "Web chat",
      status_internal: "Pendiente",
      last_message_at: lastMessageTimestamp,
      last_processed_at: now,
      updated_at: now,
      discarded_at: null,
      discard_reason: null,
    };
    
    console.log(`[Webhook] Upserting lead for conversation ${conversationId}`);

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

    console.log(`[Webhook] Upsert lead OK - lead_id=${upsertedLead.id}, action=${existingLead ? 'updated' : 'created'}`);

    // Registrar en chatwoot_conversations (with regex-extracted data initially)
    await supabase.from("chatwoot_conversations").upsert({
      chatwoot_conversation_id: conversationId,
      chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
      chatwoot_contact_id: contact?.id || null,
      contact_name: regexName || contactAlias,
      contact_phone: regexPhone,
      contact_email: regexEmail,
      conversation_content: fullTranscript.substring(0, 10000),
      messages_count: allMessages.length,
      lead_id: upsertedLead.id,
      processed_at: now,
      status: "processing", // Will be updated after AI
    }, {
      onConflict: "chatwoot_conversation_id",
    });

    // Registrar en import logs (initial entry, will be updated after AI)
    await supabase.from("chatwoot_import_logs").insert({
      chatwoot_conversation_id: conversationId,
      event_type: eventType,
      status: "processing",
      payload_json: {
        transcript_stats: transcriptStats,
        regex_extracted: {
          name: regexName,
          email: regexEmail,
          phone: regexPhone,
          area: legalArea,
        },
      },
    });

    // Actualizar log
    if (logData?.id) {
      await supabase.from("webhook_logs").update({
        result: "success",
        error_message: null,
        processing_time_ms: Date.now() - startTime,
      }).eq("id", logData.id);
    }

    // ==========================================
    // PIPELINE IA: Extract → Golden Rule → Lexcore → Summary
    // CRITICAL: La Golden Rule se aplica DESPUÉS de la IA, no antes
    // ==========================================
    let finalLeadValid = true;
    let postAiEmail: string | null = regexEmail;
    let postAiPhone: string | null = regexPhone;
    
    try {
      // Paso 1: SIEMPRE ejecutar extracción por IA
      console.log(`[Webhook] Step 1: AI extraction for lead ${upsertedLead.id}`);
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
        console.log(`[Webhook] AI extraction completed: ${JSON.stringify(reprocessData.results?.[0]?.changes_made || [])}`);
        
        // Paso 2: GOLDEN RULE POST-IA - Re-verify contact after AI extraction
        const { data: updatedLead } = await supabase
          .from("leads")
          .select("id, structured_fields")
          .eq("id", upsertedLead.id)
          .single();
        
        if (updatedLead) {
          const sf = updatedLead.structured_fields as Record<string, unknown>;
          postAiEmail = (sf?.email as string) || null;
          postAiPhone = (sf?.telefono as string) || null;
          
          const postAiHasContact = !!(
            (postAiEmail && postAiEmail.trim() !== '') || 
            (postAiPhone && postAiPhone.trim() !== '')
          );
          
          console.log(`[Webhook] POST-AI Golden Rule check: email=${postAiEmail}, phone=${postAiPhone}, valid=${postAiHasContact}`);
          
          if (!postAiHasContact) {
            console.log(`[Webhook] GOLDEN RULE POST-AI: Lead ${upsertedLead.id} has no contact after AI - discarding`);
            
            await supabase
              .from("leads")
              .update({
                discarded_at: new Date().toISOString(),
                discard_reason: "missing_contact_post_ai",
                price_final: 0,
                structured_fields: {
                  ...sf,
                  _pending_ai_validation: false,
                  _incomplete: true,
                },
              })
              .eq("id", upsertedLead.id);
            
            // Update logs
            await supabase.from("chatwoot_conversations").upsert({
              chatwoot_conversation_id: conversationId,
              chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
              contact_name: contactAlias,
              conversation_content: fullTranscript.substring(0, 10000),
              messages_count: allMessages.length,
              status: "discarded_no_contact_post_ai",
              processed_at: now,
              lead_id: upsertedLead.id,
            }, {
              onConflict: "chatwoot_conversation_id",
            });
            
            await supabase.from("chatwoot_import_logs").insert({
              chatwoot_conversation_id: conversationId,
              event_type: eventType,
              status: "discarded_no_contact_post_ai",
              payload_json: {
                transcript_stats: transcriptStats,
                reason: "GOLDEN RULE POST-AI: No email AND no phone after AI extraction",
                contact_alias: contactAlias,
                lead_id: upsertedLead.id,
              },
            });
            
            if (logData?.id) {
              await supabase.from("webhook_logs").update({
                result: "discarded",
                error_message: "GOLDEN RULE POST-AI: No email AND no phone",
                processing_time_ms: Date.now() - startTime,
              }).eq("id", logData.id);
            }
            
            finalLeadValid = false;
          } else {
            // Remove pending flag, mark as valid
            await supabase
              .from("leads")
              .update({
                structured_fields: {
                  ...sf,
                  _pending_ai_validation: false,
                  _incomplete: false,
                },
              })
              .eq("id", upsertedLead.id);
          }
        }
      } else {
        console.warn(`[Webhook] AI extraction failed (${reprocessResponse.status}) - will keep lead with regex data only`);
        
        // If AI fails but we have regex contact, proceed; otherwise discard
        if (!hasRegexContact) {
          console.log(`[Webhook] AI failed AND no regex contact - discarding lead ${upsertedLead.id}`);
          
          await supabase
            .from("leads")
            .update({
              discarded_at: new Date().toISOString(),
              discard_reason: "missing_contact_ai_failed",
              price_final: 0,
            })
            .eq("id", upsertedLead.id);
          
          finalLeadValid = false;
        }
      }
      
      if (finalLeadValid) {
        // Paso 3: Calcular Lexcore
        console.log(`[Webhook] Step 3: Lexcore for lead ${upsertedLead.id}`);
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
        console.log(`[Webhook] Lexcore triggered for lead ${upsertedLead.id}`);
        
        // Paso 4: Generar resumen
        console.log(`[Webhook] Step 4: Summary for lead ${upsertedLead.id}`);
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
          console.log(`[Webhook] Summary generated for lead ${upsertedLead.id}`);
        }
        
        // Update chatwoot_conversations with final status after AI
        await supabase.from("chatwoot_conversations").upsert({
          chatwoot_conversation_id: conversationId,
          chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
          contact_name: regexName || contactAlias,
          contact_phone: postAiPhone || regexPhone,
          contact_email: postAiEmail || regexEmail,
          lead_id: upsertedLead.id,
          processed_at: new Date().toISOString(),
          status: "processed_success",
        }, {
          onConflict: "chatwoot_conversation_id",
        });
        
        // Update import logs with success
        await supabase.from("chatwoot_import_logs").insert({
          chatwoot_conversation_id: conversationId,
          event_type: eventType,
          status: "success",
          payload_json: {
            transcript_stats: transcriptStats,
            post_ai_extracted: {
              email: postAiEmail,
              phone: postAiPhone,
            },
          },
        });
        
        if (logData?.id) {
          await supabase.from("webhook_logs").update({
            result: "success",
            error_message: null,
            processing_time_ms: Date.now() - startTime,
          }).eq("id", logData.id);
        }
      }
    } catch (pipelineError) {
      console.warn("[Webhook] Pipeline failed (non-blocking):", pipelineError);
    }

    return new Response(JSON.stringify({ 
      status: finalLeadValid ? "success" : "discarded",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Webhook] Error:", error);
    
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Processing error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
