import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chatwoot-signature',
};

// =============================================================================
// NUEVA ESTRATEGIA: Capturar mensajes en tiempo real y procesar al cerrar
// =============================================================================
// 
// EVENTOS SOPORTADOS:
// 1. message_created - Acumula cada mensaje nuevo
// 2. message_updated - Actualiza mensaje si se edita
// 3. conversation_updated - Captura mensajes adicionales
// 4. conversation_status_changed - Procesa todo cuando status="resolved"
//
// =============================================================================

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let payload: any = null;
  let eventType = 'unknown';
  let conversationId: number | null = null;
  
  try {
    // Parse the payload
    payload = await req.json();
    eventType = payload?.event || 'unknown';
    conversationId = payload?.conversation?.id || payload?.id || null;
    
    console.log(`[CHATWOOT] Event: ${eventType}, Conversation: ${conversationId}`);
    console.log('[CHATWOOT] Full payload:', JSON.stringify(payload, null, 2));
    
    // Route to appropriate handler based on event type
    switch (eventType) {
      case 'message_created':
        await handleMessageCreated(supabase, payload);
        break;
        
      case 'message_updated':
        await handleMessageUpdated(supabase, payload);
        break;
        
      case 'conversation_updated':
        await handleConversationUpdated(supabase, payload);
        break;
        
      case 'conversation_status_changed':
        await handleConversationStatusChanged(supabase, payload);
        break;
        
      default:
        console.log(`[CHATWOOT] Ignoring event type: ${eventType}`);
    }
    
    // Log success
    const processingTime = Date.now() - startTime;
    await logWebhook(supabase, {
      source: 'chatwoot',
      eventType,
      payload,
      result: 'success',
      processingTimeMs: processingTime,
    });
    
    return new Response(JSON.stringify({ success: true, event: eventType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[CHATWOOT] Error:', error);
    
    await logWebhook(supabase, {
      source: 'chatwoot',
      eventType,
      payload,
      result: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime,
    });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 to prevent Chatwoot retries
    });
  }
});

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle message_created event - Store each message as it arrives
 */
async function handleMessageCreated(supabase: any, payload: any) {
  const message = payload;
  const conversationId = message?.conversation?.id;
  const messageId = message?.id;
  
  if (!conversationId || !messageId) {
    console.log('[MESSAGE_CREATED] Missing conversation_id or message_id, skipping');
    return;
  }
  
  // Determine sender type
  let senderType = 'system';
  let senderName = '';
  
  if (message?.sender) {
    if (message.sender.type === 'contact') {
      senderType = 'contact';
      senderName = message.sender.name || '';
    } else if (message.sender.type === 'user') {
      senderType = 'agent';
      senderName = message.sender.name || '';
    }
  }
  
  // If no sender and message_type indicates automation
  if (message?.message_type === 3 || message?.message_type === 2) {
    senderType = 'system';
  }
  
  const content = message?.content || '';
  const messageCreatedAt = message?.created_at ? new Date(message.created_at * 1000).toISOString() : new Date().toISOString();
  
  console.log(`[MESSAGE_CREATED] Conv: ${conversationId}, Msg: ${messageId}, Type: ${senderType}, Name: ${senderName}`);
  console.log(`[MESSAGE_CREATED] Content: ${content.substring(0, 100)}...`);
  
  // Upsert the message (in case of duplicates)
  const { error } = await supabase
    .from('chatwoot_messages')
    .upsert({
      conversation_id: conversationId,
      message_id: messageId,
      sender_type: senderType,
      sender_name: senderName,
      content: content,
      message_created_at: messageCreatedAt,
      received_at: new Date().toISOString(),
      processed: false,
    }, {
      onConflict: 'message_id',
    });
  
  if (error) {
    console.error('[MESSAGE_CREATED] Error storing message:', error);
    throw error;
  }
  
  console.log(`[MESSAGE_CREATED] Successfully stored message ${messageId}`);
}

/**
 * Handle message_updated event - Update message content if edited
 */
async function handleMessageUpdated(supabase: any, payload: any) {
  const message = payload;
  const messageId = message?.id;
  const conversationId = message?.conversation?.id;
  
  if (!messageId) {
    console.log('[MESSAGE_UPDATED] Missing message_id, skipping');
    return;
  }
  
  const content = message?.content || '';
  
  console.log(`[MESSAGE_UPDATED] Updating message ${messageId} with new content`);
  
  // First try to update existing
  const { data, error } = await supabase
    .from('chatwoot_messages')
    .update({ content: content })
    .eq('message_id', messageId)
    .select();
  
  if (error) {
    console.error('[MESSAGE_UPDATED] Error updating message:', error);
    throw error;
  }
  
  // If no rows updated, insert as new
  if (!data || data.length === 0) {
    console.log('[MESSAGE_UPDATED] Message not found, inserting as new');
    await handleMessageCreated(supabase, payload);
  } else {
    console.log(`[MESSAGE_UPDATED] Successfully updated message ${messageId}`);
  }
}

/**
 * Handle conversation_updated event - Check for new messages in payload
 */
async function handleConversationUpdated(supabase: any, payload: any) {
  const conversationId = payload?.id;
  
  if (!conversationId) {
    console.log('[CONVERSATION_UPDATED] Missing conversation_id, skipping');
    return;
  }
  
  console.log(`[CONVERSATION_UPDATED] Processing conversation ${conversationId}`);
  
  // Check if there are messages in the payload
  const messages = payload?.messages || [];
  
  for (const msg of messages) {
    // Simulate message_created for each message
    await handleMessageCreated(supabase, {
      ...msg,
      conversation: { id: conversationId },
    });
  }
  
  console.log(`[CONVERSATION_UPDATED] Processed ${messages.length} messages`);
}

/**
 * Handle conversation_status_changed event - Process and create lead when resolved
 */
async function handleConversationStatusChanged(supabase: any, payload: any) {
  const conversationId = payload?.id;
  const newStatus = payload?.status;
  
  console.log(`[STATUS_CHANGED] Conversation ${conversationId} -> ${newStatus}`);
  
  if (!conversationId) {
    console.log('[STATUS_CHANGED] Missing conversation_id, skipping');
    return;
  }
  
  // Only process when status changes to "resolved"
  if (newStatus !== 'resolved') {
    console.log(`[STATUS_CHANGED] Status is "${newStatus}", not "resolved", skipping lead creation`);
    return;
  }
  
  // 1. Check if already processed
  const { data: existingConv } = await supabase
    .from('chatwoot_conversations')
    .select('id, lead_id')
    .eq('chatwoot_conversation_id', conversationId)
    .maybeSingle();
  
  if (existingConv?.lead_id) {
    console.log(`[STATUS_CHANGED] Conversation ${conversationId} already processed with lead ${existingConv.lead_id}`);
    return;
  }
  
  // 2. Fetch all accumulated messages for this conversation
  const { data: messages, error: msgError } = await supabase
    .from('chatwoot_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('message_created_at', { ascending: true });
  
  if (msgError) {
    console.error('[STATUS_CHANGED] Error fetching messages:', msgError);
    throw msgError;
  }
  
  console.log(`[STATUS_CHANGED] Found ${messages?.length || 0} accumulated messages`);
  
  // If no messages accumulated, try to extract from payload + API
  if (!messages || messages.length === 0) {
    console.log('[STATUS_CHANGED] No accumulated messages, trying to fetch from API...');
    await fetchAndStoreMessagesFromAPI(supabase, conversationId, payload);
    
    // Re-fetch after API call
    const { data: refetchedMessages } = await supabase
      .from('chatwoot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_created_at', { ascending: true });
    
    if (!refetchedMessages || refetchedMessages.length === 0) {
      console.log('[STATUS_CHANGED] Still no messages after API fetch, cannot create lead');
      await logImportResult(supabase, conversationId, 'skipped', 'No messages found for conversation');
      return;
    }
    
    // Use refetched messages
    await processMessagesAndCreateLead(supabase, conversationId, refetchedMessages, payload);
  } else {
    // Process accumulated messages
    await processMessagesAndCreateLead(supabase, conversationId, messages, payload);
  }
}

// =============================================================================
// LEAD CREATION LOGIC
// =============================================================================

async function processMessagesAndCreateLead(supabase: any, conversationId: number, messages: any[], payload: any) {
  console.log(`[PROCESS] Processing ${messages.length} messages for conversation ${conversationId}`);
  
  // Separate messages by sender type
  const contactMessages = messages.filter(m => m.sender_type === 'contact');
  const agentMessages = messages.filter(m => m.sender_type === 'agent');
  const allMessages = messages.filter(m => m.sender_type !== 'system');
  
  console.log(`[PROCESS] Contact messages: ${contactMessages.length}, Agent messages: ${agentMessages.length}`);
  
  // Build conversation text
  const contactText = contactMessages.map(m => m.content).join('\n');
  const fullConversationText = allMessages
    .map(m => `[${m.sender_type === 'contact' ? 'Cliente' : 'Agente'}]: ${m.content}`)
    .join('\n');
  
  // Extract contact data from all text sources
  const extractedData = extractContactData(contactText, agentMessages.map(m => m.content).join('\n'), payload);
  
  console.log('[PROCESS] Extracted data:', JSON.stringify(extractedData, null, 2));
  
  // Validate - must have at least phone OR email
  if (!extractedData.phone && !extractedData.email) {
    console.log('[PROCESS] No phone or email found, skipping lead creation');
    await logImportResult(supabase, conversationId, 'skipped', 'No contact data (phone or email) could be extracted');
    return;
  }
  
  // Check for meaningful content
  if (contactMessages.length === 0 && !hasLegalContent(fullConversationText)) {
    console.log('[PROCESS] No contact messages and no legal content, skipping');
    await logImportResult(supabase, conversationId, 'skipped', 'No client messages and no legal content');
    return;
  }
  
  // Get settings for source channel
  const { data: settings } = await supabase
    .from('chatwoot_settings')
    .select('default_source_channel')
    .limit(1)
    .single();
  
  const sourceChannel = settings?.default_source_channel || 'Web chat';
  
  // Build structured fields
  const structuredFields: any = {};
  if (extractedData.name) structuredFields.contact_name = extractedData.name;
  if (extractedData.phone) structuredFields.contact_phone = extractedData.phone;
  if (extractedData.email) structuredFields.contact_email = extractedData.email;
  if (extractedData.city) structuredFields.city = extractedData.city;
  if (extractedData.province) structuredFields.province = extractedData.province;
  structuredFields.chatwoot_conversation_id = conversationId;
  
  // Create the lead
  const leadText = fullConversationText || contactText || 'Conversación de Chatwoot sin contenido textual';
  
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      lead_text: leadText,
      source_channel: sourceChannel,
      status_internal: 'Pendiente',
      structured_fields: structuredFields,
    })
    .select()
    .single();
  
  if (leadError) {
    console.error('[PROCESS] Error creating lead:', leadError);
    throw leadError;
  }
  
  console.log(`[PROCESS] Created lead ${lead.id}`);
  
  // Save to chatwoot_conversations for tracking
  await supabase.from('chatwoot_conversations').upsert({
    chatwoot_conversation_id: conversationId,
    chatwoot_account_id: payload?.account?.id || null,
    chatwoot_contact_id: payload?.meta?.sender?.id || null,
    contact_name: extractedData.name,
    contact_phone: extractedData.phone,
    contact_email: extractedData.email,
    conversation_content: fullConversationText.substring(0, 10000),
    messages_count: messages.length,
    status: 'resolved',
    lead_id: lead.id,
    processed_at: new Date().toISOString(),
  }, {
    onConflict: 'chatwoot_conversation_id',
  });
  
  // Mark messages as processed
  await supabase
    .from('chatwoot_messages')
    .update({ processed: true, lead_id: lead.id })
    .eq('conversation_id', conversationId);
  
  // Log success
  await logImportResult(supabase, conversationId, 'success', null, lead.id);
  
  // Process with Lexcore
  await processWithLexcore(supabase, lead.id);
  
  console.log(`[PROCESS] Successfully completed processing for conversation ${conversationId}`);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract contact data from conversation text
 */
function extractContactData(contactText: string, agentText: string, payload: any): {
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  province: string | null;
} {
  const allText = `${contactText}\n${agentText}`;
  
  // Extract phone - Spanish mobile/landline patterns
  const phonePatterns = [
    /(?:\+34)?[6789]\d{8}/g,                    // Spanish mobiles
    /(?:\+34)?\s*\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g, // With separators
    /(?:\+34)?\s*\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g, // Landlines
  ];
  
  let phone: string | null = null;
  for (const pattern of phonePatterns) {
    const matches = allText.match(pattern);
    if (matches && matches.length > 0) {
      // Clean and normalize
      phone = matches[0].replace(/[\s.-]/g, '').replace(/^\+34/, '');
      if (phone.length >= 9) break;
    }
  }
  
  // Extract email
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w{2,}/i);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  
  // Extract name from various patterns
  let name: string | null = null;
  
  // From payload first (most reliable)
  if (payload?.meta?.sender?.name) {
    name = payload.meta.sender.name;
  }
  
  // From contact text patterns
  if (!name) {
    const namePatterns = [
      /(?:me llamo|soy|mi nombre es)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)?)/i,
      /(?:soy\s+)?([A-ZÀ-ÿ][a-zà-ÿ]+)\s*,?\s*(?:tengo|necesito|quiero)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = contactText.match(pattern);
      if (match && match[1]) {
        name = match[1].trim();
        break;
      }
    }
  }
  
  // From agent messages (they often greet by name)
  if (!name) {
    const agentNamePatterns = [
      /(?:hola|buenos días|buenas tardes|estimado\/a?|querido\/a?),?\s*([A-ZÀ-ÿ][a-zà-ÿ]+)/i,
      /(?:gracias|saludos),?\s*([A-ZÀ-ÿ][a-zà-ÿ]+)/i,
    ];
    
    for (const pattern of agentNamePatterns) {
      const match = agentText.match(pattern);
      if (match && match[1]) {
        // Validate it's not a common word
        const commonWords = ['señor', 'señora', 'sr', 'sra', 'don', 'doña', 'cliente', 'usuario'];
        if (!commonWords.includes(match[1].toLowerCase())) {
          name = match[1].trim();
          break;
        }
      }
    }
  }
  
  // Extract city/province from payload
  const city = payload?.additional_attributes?.city || 
               payload?.meta?.sender?.additional_attributes?.city || 
               null;
               
  const province = payload?.additional_attributes?.province || 
                   payload?.meta?.sender?.additional_attributes?.province || 
                   null;
  
  return { name, phone, email, city, province };
}

/**
 * Check if text contains legal-related content
 */
function hasLegalContent(text: string): boolean {
  const legalKeywords = [
    /(?:abogado|despacho|bufete|letrado|procurador)/i,
    /(?:demanda|denuncia|juicio|sentencia|recurso|apelación)/i,
    /(?:custodia|divorcio|herencia|testamento|pensión)/i,
    /(?:contrato|indemnización|reclamación|despido)/i,
    /(?:accidente|lesiones|daños|perjuicios)/i,
    /(?:deuda|impago|moroso|embargo)/i,
    /(?:arrendamiento|alquiler|desahucio|okupación)/i,
    /(?:seguro|aseguradora|siniestro)/i,
    /(?:caso|consulta|asunto|expediente)/i,
  ];
  
  return legalKeywords.some(pattern => pattern.test(text));
}

/**
 * Fetch messages from Chatwoot API and store them
 */
async function fetchAndStoreMessagesFromAPI(supabase: any, conversationId: number, payload: any) {
  const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
  const chatwootUrl = Deno.env.get('CHATWOOT_API_URL') || 'https://app.chatwoot.com';
  const accountId = payload?.account?.id;
  
  if (!chatwootToken || !accountId) {
    console.log('[API_FETCH] Missing API token or account ID, skipping API fetch');
    
    // Try to extract from payload at least
    const payloadMessages = extractMessagesFromPayload(payload);
    for (const msg of payloadMessages) {
      await storeMessage(supabase, conversationId, msg);
    }
    return;
  }
  
  try {
    const apiUrl = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    console.log(`[API_FETCH] Fetching from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'api_access_token': chatwootToken,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[API_FETCH] API error: ${response.status} ${response.statusText}`);
      
      // Fall back to payload extraction
      const payloadMessages = extractMessagesFromPayload(payload);
      for (const msg of payloadMessages) {
        await storeMessage(supabase, conversationId, msg);
      }
      return;
    }
    
    const data = await response.json();
    const messages = data?.payload || data?.messages || [];
    
    console.log(`[API_FETCH] Fetched ${messages.length} messages from API`);
    
    for (const msg of messages) {
      await storeMessage(supabase, conversationId, {
        messageId: msg.id,
        senderType: msg.sender?.type === 'contact' ? 'contact' : 
                    msg.sender?.type === 'user' ? 'agent' : 'system',
        senderName: msg.sender?.name || '',
        content: msg.content || '',
        createdAt: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error('[API_FETCH] Error fetching from API:', error);
    
    // Fall back to payload extraction
    const payloadMessages = extractMessagesFromPayload(payload);
    for (const msg of payloadMessages) {
      await storeMessage(supabase, conversationId, msg);
    }
  }
}

/**
 * Extract any messages present in the payload
 */
function extractMessagesFromPayload(payload: any): any[] {
  const messages: any[] = [];
  
  // Check various payload structures
  const payloadMessages = payload?.messages || 
                          payload?.conversation?.messages || 
                          [];
  
  for (const msg of payloadMessages) {
    messages.push({
      messageId: msg.id,
      senderType: msg.sender?.type === 'contact' ? 'contact' : 
                  msg.sender?.type === 'user' ? 'agent' : 'system',
      senderName: msg.sender?.name || '',
      content: msg.content || '',
      createdAt: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
    });
  }
  
  // Also check for last_non_activity_message
  if (payload?.last_non_activity_message) {
    const msg = payload.last_non_activity_message;
    messages.push({
      messageId: msg.id,
      senderType: msg.sender?.type === 'contact' ? 'contact' : 
                  msg.sender?.type === 'user' ? 'agent' : 'system',
      senderName: msg.sender?.name || '',
      content: msg.content || '',
      createdAt: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
    });
  }
  
  return messages;
}

/**
 * Store a single message in the database
 */
async function storeMessage(supabase: any, conversationId: number, msg: {
  messageId: number;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: string;
}) {
  if (!msg.messageId || !msg.content) return;
  
  const { error } = await supabase
    .from('chatwoot_messages')
    .upsert({
      conversation_id: conversationId,
      message_id: msg.messageId,
      sender_type: msg.senderType,
      sender_name: msg.senderName,
      content: msg.content,
      message_created_at: msg.createdAt,
      received_at: new Date().toISOString(),
      processed: false,
    }, {
      onConflict: 'message_id',
    });
  
  if (error) {
    console.error('[STORE_MSG] Error:', error);
  }
}

/**
 * Process lead with Lexcore scoring
 */
async function processWithLexcore(supabase: any, leadId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  try {
    console.log(`[LEXCORE] Processing lead ${leadId}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/calculate-lexcore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead_id: leadId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LEXCORE] Error: ${response.status} - ${errorText}`);
    } else {
      const result = await response.json();
      console.log(`[LEXCORE] Success: Score=${result.score}, Price=${result.price}`);
    }
  } catch (error) {
    console.error('[LEXCORE] Error calling calculate-lexcore:', error);
    // Don't throw - Lexcore processing is not critical for lead creation
  }
}

/**
 * Log import result to chatwoot_import_logs
 */
async function logImportResult(
  supabase: any, 
  conversationId: number, 
  status: 'success' | 'skipped' | 'error', 
  errorMessage?: string | null,
  leadId?: string
) {
  try {
    await supabase.from('chatwoot_import_logs').insert({
      chatwoot_conversation_id: conversationId,
      event_type: 'conversation_status_changed',
      status: status,
      error_message: errorMessage,
      payload_json: leadId ? { lead_id: leadId } : null,
    });
  } catch (error) {
    console.error('[LOG] Error logging import result:', error);
  }
}

/**
 * Log webhook event
 */
async function logWebhook(supabase: any, data: {
  source: string;
  eventType: string;
  payload: any;
  result: string;
  errorMessage?: string;
  processingTimeMs: number;
}) {
  try {
    await supabase.from('webhook_logs').insert({
      source: data.source,
      event_type: data.eventType,
      payload: data.payload,
      result: data.result,
      error_message: data.errorMessage,
      processing_time_ms: data.processingTimeMs,
    });
  } catch (error) {
    console.error('[LOG] Error logging webhook:', error);
  }
}
