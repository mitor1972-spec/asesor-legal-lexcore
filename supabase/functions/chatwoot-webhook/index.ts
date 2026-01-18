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
    console.error('Error logging import:', e);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get token from query params
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.log('No token provided in webhook request');
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token against settings
    const { data: settings, error: settingsError } = await supabase
      .from('chatwoot_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching chatwoot settings:', settingsError);
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (settings.webhook_token !== token) {
      console.log('Invalid token provided');
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.is_active) {
      console.log('Chatwoot integration is disabled');
      return new Response(JSON.stringify({ message: 'Integration disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse webhook payload
    const payload: ChatwootWebhookPayload = await req.json();
    console.log('Received Chatwoot webhook:', payload.event);

    const conversationId = payload.conversation?.id || payload.id || null;

    // Handle different event types
    if (payload.event === 'conversation_status_changed' || payload.event === 'conversation_resolved') {
      // Only process resolved conversations if setting is enabled
      if (settings.only_resolved_conversations && payload.conversation?.status !== 'resolved') {
        await logImport(supabase, conversationId, payload.event, 'skipped', 'Not a resolved conversation', { event: payload.event, status: payload.conversation?.status });
        return new Response(JSON.stringify({ message: 'Skipped - not resolved' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process the conversation
      const result = await processConversation(supabase, payload, settings);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (payload.event === 'message_created') {
      // For message events, we might want to update existing conversation
      await logImport(supabase, conversationId, payload.event, 'logged', null, { event: payload.event });
      return new Response(JSON.stringify({ message: 'Message logged' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Log other events
      await logImport(supabase, conversationId, payload.event, 'ignored', 'Unhandled event type', { event: payload.event });
      return new Response(JSON.stringify({ message: 'Event type not handled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
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
  const conversation = payload.conversation;
  if (!conversation) {
    await logImport(supabase, null, payload.event, 'error', 'No conversation data', payload);
    return { error: 'No conversation data' };
  }

  const conversationId = conversation.id;
  const accountId = conversation.account_id || payload.account?.id;

  // Check if already processed
  const { data: existingConv } = await supabase
    .from('chatwoot_conversations')
    .select('id, lead_id')
    .eq('chatwoot_conversation_id', conversationId)
    .single();

  if (existingConv) {
    await logImport(supabase, conversationId, payload.event, 'skipped', 'Already processed', { lead_id: existingConv.lead_id });
    return { message: 'Already processed', lead_id: existingConv.lead_id };
  }

  // Extract contact info
  const contact = conversation.contact || conversation.meta?.sender || payload.contact;
  const contactName = contact?.name || 'Sin nombre';
  const contactEmail = contact?.email || null;
  const contactPhone = contact?.phone_number || null;

  // Check if we have contact info
  if (!contactPhone && !contactEmail) {
    await logImport(supabase, conversationId, payload.event, 'skipped', 'No contact info (no phone or email)', { contact });
    console.log('Skipping conversation - no contact info');
    return { message: 'Skipped - no contact info' };
  }

  // Build conversation content from messages
  let conversationContent = '';
  if (conversation.messages && conversation.messages.length > 0) {
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

  // Build structured fields
  const structuredFields = {
    nombre: contactName,
    telefono: contactPhone,
    email: contactEmail,
    fuente: 'Chatwoot',
    chatwoot_conversation_id: conversationId,
  };

  // Create lead
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
    await logImport(supabase, conversationId, payload.event, 'error', `Error creating lead: ${leadError.message}`, { error: leadError });
    console.error('Error creating lead:', leadError);
    return { error: 'Error creating lead' };
  }

  // Save conversation record
  await supabase.from('chatwoot_conversations').insert({
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

  // Process with Lexcore if enabled
  if (settings.auto_process_lexcore) {
    try {
      // Call calculate-lexcore function
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
        console.error('Lexcore processing failed:', await lexcoreResponse.text());
      } else {
        console.log('Lexcore processing successful for lead:', lead.id);
      }
    } catch (lexcoreError) {
      console.error('Error calling Lexcore:', lexcoreError);
    }
  }

  await logImport(supabase, conversationId, payload.event, 'success', null, { lead_id: lead.id });

  console.log('Created lead from Chatwoot conversation:', lead.id);
  return { message: 'Lead created', lead_id: lead.id };
}
