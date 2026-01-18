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

interface ChatwootConversation {
  id: number;
  account_id: number;
  inbox_id: number;
  status: string;
  messages?: ChatwootMessage[];
  meta?: {
    sender?: ChatwootContact;
  };
  contact?: ChatwootContact;
}

interface ChatwootWebhookPayload {
  event: string;
  id?: number;
  account?: { id: number };
  conversation?: ChatwootConversation;
  contact?: ChatwootContact;
  messages?: ChatwootMessage[];
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

// Log to chatwoot_import_logs table - for successful imports
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
    console.log('[CHATWOOT_WEBHOOK] Raw body length:', rawBody.length);
    console.log('[CHATWOOT_WEBHOOK] Raw body preview:', rawBody.substring(0, 500));
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[CHATWOOT_WEBHOOK] ERROR: Failed to parse JSON:', parseError);
      await logWebhookRequest(supabase, req, null, { raw: rawBody.substring(0, 1000) }, 'error', `JSON parse error: ${parseError}`, startTime);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CHATWOOT_WEBHOOK] Event type:', payload?.event);
    console.log('[CHATWOOT_WEBHOOK] Payload keys:', Object.keys(payload || {}));
    
    if (payload?.conversation) {
      console.log('[CHATWOOT_WEBHOOK] Conversation ID:', payload.conversation.id);
      console.log('[CHATWOOT_WEBHOOK] Conversation status:', payload.conversation.status);
      console.log('[CHATWOOT_WEBHOOK] Contact info:', JSON.stringify({
        contact: payload.conversation.contact,
        meta_sender: payload.conversation.meta?.sender,
        top_contact: payload.contact,
      }));
    }

    const conversationId = payload?.conversation?.id || payload?.id || null;

    // Handle different event types
    if (payload?.event === 'conversation_status_changed' || payload?.event === 'conversation_resolved') {
      console.log('[CHATWOOT_WEBHOOK] Processing conversation status change...');
      
      // Only process resolved conversations if setting is enabled
      if (settings.only_resolved_conversations && payload.conversation?.status !== 'resolved') {
        console.log(`[CHATWOOT_WEBHOOK] Skipping - not resolved (status: ${payload.conversation?.status})`);
        await logImport(supabase, conversationId, payload.event, 'skipped', 'Not a resolved conversation', { event: payload.event, status: payload.conversation?.status });
        await logWebhookRequest(supabase, req, payload.event, payload, 'ignored', `Not resolved (status: ${payload.conversation?.status})`, startTime);
        return new Response(JSON.stringify({ message: 'Skipped - not resolved' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process the conversation
      const result = await processConversation(supabase, payload, settings);
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
        const result = await processConversation(supabase, payload, settings);
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
    await logWebhookRequest(supabase, req, payload?.event || null, payload || { raw: rawBody?.substring(0, 1000) }, 'error', `Unhandled error: ${error}`, startTime);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processConversation(
  supabase: any,
  payload: ChatwootWebhookPayload,
  settings: any
) {
  console.log('[PROCESS_CONVERSATION] Starting...');
  
  const conversation = payload.conversation;
  if (!conversation) {
    console.log('[PROCESS_CONVERSATION] ERROR: No conversation data in payload');
    await logImport(supabase, null, payload.event, 'error', 'No conversation data', payload);
    return { error: 'No conversation data' };
  }

  const conversationId = conversation.id;
  const accountId = conversation.account_id || payload.account?.id;

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
  const contact = conversation.contact || conversation.meta?.sender || payload.contact;
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
  let conversationContent = '';
  if (conversation.messages && conversation.messages.length > 0) {
    console.log(`[PROCESS_CONVERSATION] Found ${conversation.messages.length} messages`);
    conversationContent = conversation.messages
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

  console.log('[PROCESS_CONVERSATION] Lead text preview:', leadText.substring(0, 200));

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

  // Save conversation record
  const { error: convError } = await supabase.from('chatwoot_conversations').insert({
    chatwoot_conversation_id: conversationId,
    chatwoot_contact_id: contact?.id,
    chatwoot_account_id: accountId,
    lead_id: lead.id,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    status: conversation.status,
    messages_count: conversation.messages?.length || 0,
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
