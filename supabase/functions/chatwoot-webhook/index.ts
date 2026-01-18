import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatwootContact {
  id: number;
  name?: string;
  email?: string;
  phone_number?: string;
  identifier?: string;
}

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: string;
  created_at: number;
  sender?: {
    type: string;
    name?: string;
  };
}

// Chatwoot sends payload with conversation data at ROOT level for some events
interface ChatwootWebhookPayload {
  event: string;
  // Root level fields (when conversation data is at root)
  id?: number;
  status?: string;
  meta?: {
    sender?: ChatwootContact;
  };
  messages?: ChatwootMessage[];
  contact_inbox?: {
    id: number;
    contact_id: number;
    source_id?: string;
  };
  changed_attributes?: {
    status?: {
      previous_value?: string;
      current_value?: string;
    };
    [key: string]: any;
  };
  // Nested structure (for some event types)
  account?: { id: number };
  conversation?: {
    id: number;
    account_id: number;
    inbox_id: number;
    status: string;
    messages?: ChatwootMessage[];
    meta?: {
      sender?: ChatwootContact;
    };
    contact?: ChatwootContact;
  };
  contact?: ChatwootContact;
}

// Log to webhook_logs table - captures ALL requests
async function logWebhookRequest(
  supabase: any,
  req: Request,
  eventType: string | null,
  payload: any,
  result: string,
  errorMessage: string | null,
  startTime: number
) {
  try {
    const url = new URL(req.url);
    const processingTime = Date.now() - startTime;
    
    // Extract headers (filter sensitive ones)
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
    
    // Convert query params to object
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      // Mask token for security
      queryParams[key] = key === 'token' ? `${value.substring(0, 8)}...` : value;
    });

    await supabase.from('webhook_logs').insert({
      source: 'chatwoot',
      event_type: eventType,
      method: req.method,
      path: url.pathname,
      query_params: queryParams,
      headers: headers,
      payload: payload,
      result: result,
      error_message: errorMessage,
      processing_time_ms: processingTime,
    });
    
    console.log(`[WEBHOOK_LOG] ${result}: ${eventType || 'unknown'} - ${errorMessage || 'OK'} (${processingTime}ms)`);
  } catch (e) {
    console.error('[WEBHOOK_LOG] Error saving webhook log:', e);
  }
}

// Log to chatwoot_import_logs table - for import tracking
async function logImport(
  supabase: any,
  conversationId: number | null,
  eventType: string,
  status: string,
  errorMessage: string | null,
  payload: any
) {
  try {
    await supabase.from('chatwoot_import_logs').insert({
      chatwoot_conversation_id: conversationId,
      event_type: eventType,
      status,
      error_message: errorMessage,
      payload_json: payload,
    });
  } catch (e) {
    console.error('[IMPORT_LOG] Error logging import:', e);
  }
}

// Extract status from various locations in the payload
function extractStatus(payload: ChatwootWebhookPayload): string | null {
  // Try different locations where status might be
  
  // 1. Root level status (most common for conversation_status_changed)
  if (payload.status) {
    console.log('[EXTRACT_STATUS] Found at root: ', payload.status);
    return payload.status;
  }
  
  // 2. In changed_attributes (for status change events)
  if (payload.changed_attributes?.status?.current_value) {
    console.log('[EXTRACT_STATUS] Found in changed_attributes: ', payload.changed_attributes.status.current_value);
    return payload.changed_attributes.status.current_value;
  }
  
  // 3. Nested in conversation object
  if (payload.conversation?.status) {
    console.log('[EXTRACT_STATUS] Found in conversation: ', payload.conversation.status);
    return payload.conversation.status;
  }
  
  console.log('[EXTRACT_STATUS] Status not found in payload');
  return null;
}

// Extract conversation ID from various locations
function extractConversationId(payload: ChatwootWebhookPayload): number | null {
  // Root level id
  if (payload.id) return payload.id;
  // Nested conversation id
  if (payload.conversation?.id) return payload.conversation.id;
  return null;
}

// Extract contact info from various locations
function extractContact(payload: ChatwootWebhookPayload): ChatwootContact | null {
  // Try meta.sender first (common location)
  if (payload.meta?.sender) return payload.meta.sender;
  // Try conversation.meta.sender
  if (payload.conversation?.meta?.sender) return payload.conversation.meta.sender;
  // Try conversation.contact
  if (payload.conversation?.contact) return payload.conversation.contact;
  // Try root contact
  if (payload.contact) return payload.contact;
  return null;
}

// Extract messages from various locations
function extractMessages(payload: ChatwootWebhookPayload): ChatwootMessage[] {
  if (payload.messages && payload.messages.length > 0) return payload.messages;
  if (payload.conversation?.messages && payload.conversation.messages.length > 0) return payload.conversation.messages;
  return [];
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  // Create Supabase client early for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('====================================');
  console.log('[CHATWOOT_WEBHOOK] Request received');
  console.log(`[CHATWOOT_WEBHOOK] Method: ${req.method}`);
  console.log(`[CHATWOOT_WEBHOOK] URL: ${req.url}`);
  console.log('====================================');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[CHATWOOT_WEBHOOK] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`[CHATWOOT_WEBHOOK] Method not allowed: ${req.method}`);
    await logWebhookRequest(supabase, req, null, null, 'error', `Method not allowed: ${req.method}`, startTime);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: ChatwootWebhookPayload | null = null;
  let rawBody: string = '';

  try {
    // Get token from query params
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    console.log(`[CHATWOOT_WEBHOOK] Token provided: ${token ? 'yes' : 'no'}`);

    if (!token) {
      console.log('[CHATWOOT_WEBHOOK] ERROR: No token provided');
      await logWebhookRequest(supabase, req, null, null, 'error', 'No token provided', startTime);
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify token against settings
    const { data: settings, error: settingsError } = await supabase
      .from('chatwoot_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('[CHATWOOT_WEBHOOK] ERROR: Could not fetch settings:', settingsError);
      await logWebhookRequest(supabase, req, null, null, 'error', `Settings error: ${settingsError?.message}`, startTime);
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[CHATWOOT_WEBHOOK] Settings loaded - is_active: ${settings.is_active}, only_resolved: ${settings.only_resolved_conversations}`);

    if (settings.webhook_token !== token) {
      console.log('[CHATWOOT_WEBHOOK] ERROR: Invalid token');
      await logWebhookRequest(supabase, req, null, null, 'error', 'Invalid token', startTime);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.is_active) {
      console.log('[CHATWOOT_WEBHOOK] Integration is disabled');
      await logWebhookRequest(supabase, req, null, null, 'ignored', 'Integration disabled', startTime);
      return new Response(JSON.stringify({ message: 'Integration disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse webhook payload
    rawBody = await req.text();
    console.log('[CHATWOOT_WEBHOOK] ========== FULL RAW PAYLOAD ==========');
    console.log(rawBody);
    console.log('[CHATWOOT_WEBHOOK] ======================================');
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[CHATWOOT_WEBHOOK] ERROR: Failed to parse JSON:', parseError);
      await logWebhookRequest(supabase, req, null, { raw: rawBody.substring(0, 2000) }, 'error', `JSON parse error: ${parseError}`, startTime);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log full payload structure
    console.log('[CHATWOOT_WEBHOOK] Event type:', payload?.event);
    console.log('[CHATWOOT_WEBHOOK] Payload keys:', Object.keys(payload || {}));
    console.log('[CHATWOOT_WEBHOOK] Full payload:', JSON.stringify(payload, null, 2));
    
    // Extract key information
    const conversationId = extractConversationId(payload!);
    const status = extractStatus(payload!);
    const contact = extractContact(payload!);
    
    console.log('[CHATWOOT_WEBHOOK] Extracted data:', {
      conversationId,
      status,
      contactName: contact?.name,
      contactEmail: contact?.email,
      contactPhone: contact?.phone_number,
    });

    // Handle different event types
    if (payload?.event === 'conversation_status_changed' || payload?.event === 'conversation_resolved') {
      console.log('[CHATWOOT_WEBHOOK] Processing conversation status change...');
      console.log(`[CHATWOOT_WEBHOOK] Status extracted: "${status}"`);
      
      // Check if status is "resolved" OR if the event specifically says resolved
      const isResolved = status === 'resolved' || payload.event === 'conversation_resolved';
      
      // Only process resolved conversations if setting is enabled
      if (settings.only_resolved_conversations && !isResolved) {
        const msg = `Not resolved (status: ${status}, event: ${payload.event})`;
        console.log(`[CHATWOOT_WEBHOOK] Skipping - ${msg}`);
        await logImport(supabase, conversationId, payload.event, 'skipped', msg, { 
          event: payload.event, 
          status,
          changed_attributes: payload.changed_attributes 
        });
        await logWebhookRequest(supabase, req, payload.event, payload, 'ignored', msg, startTime);
        return new Response(JSON.stringify({ message: 'Skipped - not resolved', status }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[CHATWOOT_WEBHOOK] Status is resolved or setting allows all - processing...');
      
      // Process the conversation
      const result = await processConversation(supabase, payload, settings, conversationId, contact);
      const logResult = result.error ? 'error' : 'success';
      await logWebhookRequest(supabase, req, payload.event, payload, logResult, result.error || null, startTime);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (payload?.event === 'conversation_created') {
      console.log('[CHATWOOT_WEBHOOK] Conversation created event - checking if should process');
      
      // If only_resolved_conversations is false, process new conversations too
      if (!settings.only_resolved_conversations) {
        console.log('[CHATWOOT_WEBHOOK] Processing new conversation (only_resolved disabled)');
        const result = await processConversation(supabase, payload, settings, conversationId, contact);
        const logResult = result.error ? 'error' : 'success';
        await logWebhookRequest(supabase, req, payload.event, payload, logResult, result.error || null, startTime);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await logImport(supabase, conversationId, payload.event, 'logged', null, { event: payload.event });
      await logWebhookRequest(supabase, req, payload.event, payload, 'ignored', 'Waiting for resolution', startTime);
      return new Response(JSON.stringify({ message: 'Conversation created - waiting for resolution' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (payload?.event === 'message_created') {
      console.log('[CHATWOOT_WEBHOOK] Message created event');
      await logImport(supabase, conversationId, payload.event, 'logged', null, { event: payload.event });
      await logWebhookRequest(supabase, req, payload.event, payload, 'ignored', 'Message event logged', startTime);
      return new Response(JSON.stringify({ message: 'Message logged' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log(`[CHATWOOT_WEBHOOK] Unhandled event type: ${payload?.event}`);
      await logImport(supabase, conversationId, payload?.event || 'unknown', 'ignored', 'Unhandled event type', { event: payload?.event });
      await logWebhookRequest(supabase, req, payload?.event || 'unknown', payload, 'ignored', `Unhandled event: ${payload?.event}`, startTime);
      return new Response(JSON.stringify({ message: 'Event type not handled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[CHATWOOT_WEBHOOK] UNHANDLED ERROR:', error);
    await logWebhookRequest(supabase, req, payload?.event || null, payload || { raw: rawBody?.substring(0, 2000) }, 'error', `Unhandled error: ${error}`, startTime);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processConversation(
  supabase: any,
  payload: ChatwootWebhookPayload,
  settings: any,
  conversationId: number | null,
  contact: ChatwootContact | null
) {
  console.log('[PROCESS_CONVERSATION] Starting...');
  
  if (!conversationId) {
    console.log('[PROCESS_CONVERSATION] ERROR: No conversation ID');
    await logImport(supabase, null, payload.event, 'error', 'No conversation ID', payload);
    return { error: 'No conversation ID' };
  }

  console.log(`[PROCESS_CONVERSATION] Conversation ID: ${conversationId}`);

  // Check if already processed
  const { data: existingConv } = await supabase
    .from('chatwoot_conversations')
    .select('id, lead_id')
    .eq('chatwoot_conversation_id', conversationId)
    .single();

  if (existingConv) {
    console.log(`[PROCESS_CONVERSATION] Already processed - lead_id: ${existingConv.lead_id}`);
    await logImport(supabase, conversationId, payload.event, 'skipped', 'Already processed', { lead_id: existingConv.lead_id });
    return { message: 'Already processed', lead_id: existingConv.lead_id };
  }

  // Extract contact info
  const contactName = contact?.name || 'Sin nombre';
  const contactEmail = contact?.email || null;
  const contactPhone = contact?.phone_number || null;

  console.log('[PROCESS_CONVERSATION] Contact extracted:', { name: contactName, email: contactEmail, phone: contactPhone });

  // Check if we have contact info
  if (!contactPhone && !contactEmail) {
    console.log('[PROCESS_CONVERSATION] Skipping - no contact info');
    await logImport(supabase, conversationId, payload.event, 'skipped', 'No contact info (no phone or email)', { contact });
    return { message: 'Skipped - no contact info' };
  }

  // Build conversation content from messages
  const messages = extractMessages(payload);
  let conversationContent = '';
  
  if (messages.length > 0) {
    console.log(`[PROCESS_CONVERSATION] Found ${messages.length} messages`);
    conversationContent = messages
      .filter(m => m.message_type === 'incoming' || m.message_type === 'outgoing')
      .map(m => {
        const sender = m.sender?.type === 'contact' ? contactName : 'Agente';
        return `[${sender}]: ${m.content}`;
      })
      .join('\n');
  }

  // If no messages in payload, use a placeholder
  if (!conversationContent) {
    console.log('[PROCESS_CONVERSATION] No messages in payload, using placeholder');
    conversationContent = `Conversación de Chatwoot #${conversationId} con ${contactName}`;
  }

  // Build lead text
  const leadText = `
Consulta recibida por Web chat (Chatwoot)

Contacto: ${contactName}
${contactPhone ? `Teléfono: ${contactPhone}` : ''}
${contactEmail ? `Email: ${contactEmail}` : ''}

Conversación:
${conversationContent}
  `.trim();

  console.log('[PROCESS_CONVERSATION] Lead text preview:', leadText.substring(0, 300));

  // Build structured fields
  const structuredFields = {
    nombre: contactName,
    telefono: contactPhone,
    email: contactEmail,
    fuente: 'Chatwoot',
    chatwoot_conversation_id: conversationId,
  };

  // Create lead
  console.log('[PROCESS_CONVERSATION] Creating lead...');
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      lead_text: leadText,
      source_channel: settings.default_source_channel || 'Web chat',
      status_internal: 'Pendiente',
      structured_fields: structuredFields,
    })
    .select()
    .single();

  if (leadError) {
    console.error('[PROCESS_CONVERSATION] ERROR creating lead:', leadError);
    await logImport(supabase, conversationId, payload.event, 'error', `Error creating lead: ${leadError.message}`, { error: leadError });
    return { error: 'Error creating lead' };
  }

  console.log(`[PROCESS_CONVERSATION] Lead created: ${lead.id}`);

  // Get account ID from various places
  const accountId = payload.conversation?.account_id || payload.account?.id || null;

  // Save conversation record
  const { error: convError } = await supabase.from('chatwoot_conversations').insert({
    chatwoot_conversation_id: conversationId,
    chatwoot_contact_id: contact?.id,
    chatwoot_account_id: accountId,
    lead_id: lead.id,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    status: extractStatus(payload),
    messages_count: messages.length,
    conversation_content: conversationContent,
  });

  if (convError) {
    console.error('[PROCESS_CONVERSATION] ERROR saving conversation record:', convError);
  }

  // Process with Lexcore if enabled
  if (settings.auto_process_lexcore) {
    console.log('[PROCESS_CONVERSATION] Calling Lexcore...');
    try {
      const lexcoreResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/calculate-lexcore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            lead_id: lead.id,
            lead_text: leadText,
            structured_fields: structuredFields,
            source_channel: settings.default_source_channel || 'Web chat',
          }),
        }
      );

      if (!lexcoreResponse.ok) {
        const errorText = await lexcoreResponse.text();
        console.error('[PROCESS_CONVERSATION] Lexcore failed:', errorText);
      } else {
        console.log('[PROCESS_CONVERSATION] Lexcore processing successful');
      }
    } catch (lexcoreError) {
      console.error('[PROCESS_CONVERSATION] Error calling Lexcore:', lexcoreError);
    }
  }

  await logImport(supabase, conversationId, payload.event, 'success', null, { lead_id: lead.id });

  console.log(`[PROCESS_CONVERSATION] SUCCESS - Lead: ${lead.id}`);
  return { message: 'Lead created', lead_id: lead.id };
}
