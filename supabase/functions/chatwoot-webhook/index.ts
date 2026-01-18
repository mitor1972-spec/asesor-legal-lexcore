import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number | string;
  created_at: number;
  sender?: {
    type: string;
    name?: string;
  };
}

interface ChatwootWebhookPayload {
  event: string;
  id?: number;
  status?: string;
  meta?: {
    sender?: {
      id: number;
      name?: string;
      email?: string;
      phone_number?: string;
    };
  };
  messages?: ChatwootMessage[];
  changed_attributes?: {
    status?: {
      previous_value?: string;
      current_value?: string;
    };
    [key: string]: any;
  };
  account?: { id: number };
  conversation?: {
    id: number;
    account_id: number;
    inbox_id: number;
    status: string;
    messages?: ChatwootMessage[];
  };
}

// Log to webhook_logs table
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
    
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
    
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
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

// Log to chatwoot_import_logs table
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

function extractStatus(payload: ChatwootWebhookPayload): string | null {
  if (payload.status) return payload.status;
  if (payload.changed_attributes?.status?.current_value) return payload.changed_attributes.status.current_value;
  if (payload.conversation?.status) return payload.conversation.status;
  return null;
}

function extractConversationId(payload: ChatwootWebhookPayload): number | null {
  if (payload.id) return payload.id;
  if (payload.conversation?.id) return payload.conversation.id;
  return null;
}

function extractAccountId(payload: ChatwootWebhookPayload): number | null {
  if (payload.conversation?.account_id) return payload.conversation.account_id;
  if (payload.account?.id) return payload.account.id;
  return null;
}

// Fetch ALL messages from Chatwoot API
async function fetchAllMessages(conversationId: number, accountId: number): Promise<ChatwootMessage[]> {
  const baseUrl = Deno.env.get('CHATWOOT_BASE_URL');
  const apiToken = Deno.env.get('CHATWOOT_API_TOKEN');
  
  if (!baseUrl || !apiToken) {
    console.error('[CHATWOOT_API] Missing CHATWOOT_BASE_URL or CHATWOOT_API_TOKEN');
    return [];
  }
  
  try {
    const url = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    console.log(`[CHATWOOT_API] Fetching messages from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'api_access_token': apiToken,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CHATWOOT_API] Error ${response.status}: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`[CHATWOOT_API] Fetched ${data.payload?.length || 0} messages`);
    
    // Chatwoot returns { payload: [...messages...] }
    return data.payload || data || [];
  } catch (error) {
    console.error('[CHATWOOT_API] Error fetching messages:', error);
    return [];
  }
}

// Extract contact data from message content
interface ExtractedContactData {
  name: string | null;
  phone: string | null;
  email: string | null;
}

function extractContactFromMessages(messages: ChatwootMessage[]): ExtractedContactData {
  // Get all text from incoming messages (from client, not agent)
  const clientMessages = messages
    .filter(m => m.message_type === 0 || m.message_type === 'incoming')
    .map(m => m.content || '')
    .join(' ');
  
  const allText = clientMessages;
  
  // Extract name patterns
  let name: string | null = null;
  const namePatterns = [
    /me\s+llamo\s+m?\s*([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?)/i,
    /soy\s+([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?)/i,
    /mi\s+nombre\s+es\s+([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?)/i,
    /^([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?),?\s+(?:necesito|tengo|quiero)/i,
    /hola,?\s+(?:soy|me llamo)\s+([A-ZÀ-ÿa-z]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  // Extract Spanish phone number: 6XXXXXXXX, 7XXXXXXXX, 8XXXXXXXX, 9XXXXXXXX
  let phone: string | null = null;
  const phoneMatch = allText.match(/\b([6789]\d{8})\b/);
  if (phoneMatch) {
    phone = phoneMatch[1];
  }
  
  // Extract email
  let email: string | null = null;
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    email = emailMatch[0].toLowerCase();
  }
  
  return { name, phone, email };
}

// Build full conversation text from messages
function buildConversationText(messages: ChatwootMessage[]): string {
  return messages
    .sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
    .map(m => {
      const isAgent = m.message_type === 1 || m.message_type === 'outgoing' || 
                      m.message_type === 3 || // System message
                      m.sender?.type === 'User';
      const sender = isAgent ? 'Agente' : 'Cliente';
      return `[${sender}]: ${m.content || ''}`;
    })
    .join('\n');
}

// Call Lexcore with service role key (no user auth needed for webhook)
async function callLexcore(
  supabaseUrl: string,
  serviceRoleKey: string,
  leadId: string,
  leadText: string,
  structuredFields: any,
  sourceChannel: string
): Promise<{ success: boolean; error?: string; result?: any }> {
  try {
    console.log('[LEXCORE] Calling calculate-lexcore for lead:', leadId);
    
    // Create admin client to call Lexcore
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get active Lexcore config
    const { data: config, error: configError } = await adminClient
      .from('lexcore_configs')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !config) {
      console.error('[LEXCORE] No active config:', configError);
      return { success: false, error: 'No active Lexcore config' };
    }

    // Get OpenAI API key
    const { data: apiSetting } = await adminClient
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'OPENAI_API_KEY')
      .eq('is_active', true)
      .maybeSingle();

    if (!apiSetting) {
      console.error('[LEXCORE] No OpenAI API key configured');
      return { success: false, error: 'No OpenAI API key' };
    }

    const openAIKey = apiSetting.key_value;
    const configJson = config.config_json;

    // Build scoring prompt
    const scoringPrompt = `Eres el motor de scoring Lexcore™ para leads legales en España.

DATOS DEL LEAD:
"""
${JSON.stringify(structuredFields || {}, null, 2)}
"""

TEXTO ORIGINAL:
"""
${leadText}
"""

CANAL DE ORIGEN: ${sourceChannel}

CONFIGURACIÓN DE SCORING:
${JSON.stringify(configJson, null, 2)}

Analiza el lead y calcula el scoring. Además, EXTRAE estos datos del texto si están presentes:
- nombre: nombre del cliente
- apellidos: apellidos del cliente
- telefono: número de teléfono (9 dígitos españoles)
- email: correo electrónico
- ciudad: ciudad
- provincia: provincia española
- area_legal: área legal del caso (ej: Derecho de Familia, Derecho Laboral, etc.)
- urgencia_aplica: true/false si hay urgencia
- urgencia_motivo: razón de la urgencia

Devuelve SOLO un JSON válido:

{
  "extracted_data": {
    "nombre": "string o null",
    "apellidos": "string o null",
    "telefono": "string o null",
    "email": "string o null",
    "ciudad": "string o null",
    "provincia": "string o null",
    "area_legal": "string o null",
    "urgencia_aplica": boolean,
    "urgencia_motivo": "string o null",
    "preferencia_contacto": "Teléfono/Email/WhatsApp o null",
    "franja_horaria": "string o null"
  },
  "mode_used": "A" o "B",
  "flags": {
    "no_contactable": boolean,
    "urgency_applies": boolean,
    "patrimonial_cap_applies": boolean,
    "amount_present": boolean
  },
  "raw_scores": {
    "contactability": {"score": X, "max": 8, "breakdown": "explicación breve"},
    "intent": {"score": X, "max": 20, "breakdown": "..."},
    "urgency": {"score": X, "max": 10, "breakdown": "..."}, 
    "case_quality": {"score": X, "max": 25, "breakdown": "..."},
    "evidence": {"score": X, "max": 10, "breakdown": "..."},
    "clarity": {"score": X, "max": 10, "breakdown": "..."}
  },
  "weighted_scores": {...},
  "subtotal_weighted": X,
  "penalties": [{"name": "nombre", "value": -X, "reason": "..."}],
  "adjustments": [{"name": "...", "value": X, "reason": "..."}],
  "vj": {"value": X, "reason": "1 frase"},
  "score_final": X (0-100),
  "price_before_caps": X,
  "price_final": X,
  "conclusion": "2-4 líneas resumiendo"
}`;

    console.log('[LEXCORE] Calling OpenAI...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres el motor de scoring Lexcore para leads legales. Responde SOLO con JSON válido.' },
          { role: 'user', content: scoringPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('[LEXCORE] OpenAI error:', openAIResponse.status, errorText);
      return { success: false, error: `OpenAI error: ${openAIResponse.status}` };
    }

    const openAIData = await openAIResponse.json();
    const content = openAIData.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No response from OpenAI' };
    }

    // Parse JSON from response
    let scoringResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoringResult = JSON.parse(jsonMatch[0]);
      } else {
        scoringResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[LEXCORE] JSON parse error:', parseError);
      return { success: false, error: 'Failed to parse AI response' };
    }

    console.log('[LEXCORE] Scoring result:', JSON.stringify(scoringResult).substring(0, 500));

    // Merge extracted data with existing structured fields
    const extractedData = scoringResult.extracted_data || {};
    const mergedFields = {
      ...structuredFields,
      nombre: extractedData.nombre || structuredFields.nombre,
      apellidos: extractedData.apellidos || structuredFields.apellidos,
      telefono: extractedData.telefono || structuredFields.telefono,
      email: extractedData.email || structuredFields.email,
      ciudad: extractedData.ciudad || structuredFields.ciudad,
      provincia: extractedData.provincia || structuredFields.provincia,
      area_legal: extractedData.area_legal || structuredFields.area_legal,
      urgencia_aplica: extractedData.urgencia_aplica ?? structuredFields.urgencia_aplica,
      urgencia_motivo: extractedData.urgencia_motivo || structuredFields.urgencia_motivo,
      preferencia_contacto: extractedData.preferencia_contacto || structuredFields.preferencia_contacto,
      franja_horaria: extractedData.franja_horaria || structuredFields.franja_horaria,
    };

    // Save the run to lexcore_runs
    const { data: runData, error: runError } = await adminClient
      .from('lexcore_runs')
      .insert({
        lead_id: leadId,
        config_id: config.id,
        mode_used: scoringResult.mode_used,
        flags_json: scoringResult.flags,
        raw_scores_json: scoringResult.raw_scores,
        weighted_scores_json: scoringResult.weighted_scores,
        penalties_json: scoringResult.penalties,
        adjustments_json: scoringResult.adjustments,
        vj_json: scoringResult.vj,
        score_final: Math.max(0, Math.min(100, scoringResult.score_final || 0)),
        price_lexcore: scoringResult.price_final || 5,
        price_after_caps: scoringResult.price_final || 5,
        conclusion_text: scoringResult.conclusion,
        llm_response_json: scoringResult,
      })
      .select()
      .single();

    if (runError) {
      console.error('[LEXCORE] Error saving run:', runError);
    }

    // Update the lead with score, price, and extracted data
    const { error: updateError } = await adminClient
      .from('leads')
      .update({
        score_final: scoringResult.score_final,
        price_final: scoringResult.price_final,
        structured_fields: mergedFields,
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('[LEXCORE] Error updating lead:', updateError);
    }

    console.log('[LEXCORE] Success! Score:', scoringResult.score_final, 'Price:', scoringResult.price_final);
    return { success: true, result: scoringResult };
  } catch (error) {
    console.error('[LEXCORE] Error:', error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('====================================');
  console.log('[CHATWOOT_WEBHOOK] Request received');
  console.log('====================================');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    await logWebhookRequest(supabase, req, null, null, 'error', `Method not allowed: ${req.method}`, startTime);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: ChatwootWebhookPayload | null = null;
  let rawBody: string = '';

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      await logWebhookRequest(supabase, req, null, null, 'error', 'No token provided', startTime);
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings, error: settingsError } = await supabase
      .from('chatwoot_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      await logWebhookRequest(supabase, req, null, null, 'error', `Settings error: ${settingsError?.message}`, startTime);
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (settings.webhook_token !== token) {
      await logWebhookRequest(supabase, req, null, null, 'error', 'Invalid token', startTime);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.is_active) {
      await logWebhookRequest(supabase, req, null, null, 'ignored', 'Integration disabled', startTime);
      return new Response(JSON.stringify({ message: 'Integration disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    rawBody = await req.text();
    console.log('[CHATWOOT_WEBHOOK] Raw payload received');
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      await logWebhookRequest(supabase, req, null, { raw: rawBody.substring(0, 2000) }, 'error', `JSON parse error`, startTime);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CHATWOOT_WEBHOOK] Event:', payload?.event);
    
    const conversationId = extractConversationId(payload!);
    const accountId = extractAccountId(payload!) || 138173; // Default to known account
    const status = extractStatus(payload!);
    
    console.log('[CHATWOOT_WEBHOOK] ConversationId:', conversationId, 'Status:', status, 'AccountId:', accountId);

    // Handle conversation status change
    if (payload?.event === 'conversation_status_changed' || payload?.event === 'conversation_resolved') {
      const isResolved = status === 'resolved' || payload.event === 'conversation_resolved';
      
      if (settings.only_resolved_conversations && !isResolved) {
        const msg = `Not resolved (status: ${status})`;
        await logImport(supabase, conversationId, payload.event, 'skipped', msg, { status });
        await logWebhookRequest(supabase, req, payload.event, payload, 'ignored', msg, startTime);
        return new Response(JSON.stringify({ message: 'Skipped - not resolved', status }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process the conversation
      const result = await processConversation(supabase, supabaseUrl, supabaseServiceKey, payload, settings, conversationId!, accountId);
      const logResult = result.error ? 'error' : 'success';
      await logWebhookRequest(supabase, req, payload.event, payload, logResult, result.error || null, startTime);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (payload?.event === 'conversation_created') {
      if (!settings.only_resolved_conversations) {
        const result = await processConversation(supabase, supabaseUrl, supabaseServiceKey, payload, settings, conversationId!, accountId);
        const logResult = result.error ? 'error' : 'success';
        await logWebhookRequest(supabase, req, payload.event, payload, logResult, result.error || null, startTime);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await logImport(supabase, conversationId, payload.event, 'logged', null, { event: payload.event });
      await logWebhookRequest(supabase, req, payload.event, payload, 'ignored', 'Waiting for resolution', startTime);
      return new Response(JSON.stringify({ message: 'Waiting for resolution' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
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

// Check if conversation has valid content worth creating a lead
function isConversationValid(messages: ChatwootMessage[], extractedContact: ExtractedContactData): { valid: boolean; reason: string } {
  // Filter messages from the client (not bot/agent)
  const clientMessages = messages.filter(m => 
    m.message_type === 0 || 
    m.message_type === 'incoming'
  );
  
  // Check 1: Must have at least one client message
  if (clientMessages.length === 0) {
    return { valid: false, reason: 'No client messages - only bot/agent messages' };
  }
  
  // Check 2: Messages must not be only automated/empty content
  const automatedPhrases = [
    'hemos cerrado la conversación',
    'periodo de inactividad',
    'conversation closed',
    'cerrada por inactividad',
    'ha sido cerrada',
    'auto-closed',
  ];
  
  const meaningfulMessages = clientMessages.filter(m => {
    const content = (m.content || '').toLowerCase().trim();
    if (!content || content.length < 3) return false;
    
    // Check if it's an automated message
    for (const phrase of automatedPhrases) {
      if (content.includes(phrase)) return false;
    }
    
    return true;
  });
  
  if (meaningfulMessages.length === 0) {
    return { valid: false, reason: 'Only automated/empty messages from client' };
  }
  
  // Check 3: Must have at least phone OR email extracted
  if (!extractedContact.phone && !extractedContact.email) {
    return { valid: false, reason: 'No contact data (phone or email) could be extracted' };
  }
  
  return { valid: true, reason: 'Valid conversation' };
}

// Process conversation - fetch ALL messages from API, extract data, create lead, call Lexcore
async function processConversation(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: ChatwootWebhookPayload,
  settings: any,
  conversationId: number,
  accountId: number
) {
  console.log('[PROCESS] Starting for conversation:', conversationId);
  
  // Check if already processed
  const { data: existingConv } = await supabase
    .from('chatwoot_conversations')
    .select('id, lead_id')
    .eq('chatwoot_conversation_id', conversationId)
    .single();

  if (existingConv) {
    console.log('[PROCESS] Already processed - lead_id:', existingConv.lead_id);
    await logImport(supabase, conversationId, payload.event, 'skipped', 'Already processed', { lead_id: existingConv.lead_id });
    return { message: 'Already processed', lead_id: existingConv.lead_id };
  }

  // Fetch ALL messages from Chatwoot API
  console.log('[PROCESS] Fetching all messages from Chatwoot API...');
  let messages = await fetchAllMessages(conversationId, accountId);
  
  // Fallback to payload messages if API fails
  if (messages.length === 0) {
    console.log('[PROCESS] API returned no messages, using payload messages');
    messages = payload.messages || payload.conversation?.messages || [];
  }

  console.log(`[PROCESS] Total messages: ${messages.length}`);

  if (messages.length === 0) {
    await logImport(supabase, conversationId, payload.event, 'skipped', 'No messages', { payload_keys: Object.keys(payload) });
    return { message: 'Skipped - no messages' };
  }

  // Build full conversation text
  const conversationContent = buildConversationText(messages);
  console.log('[PROCESS] Conversation preview:', conversationContent.substring(0, 300));

  // Extract contact data from messages
  const extractedContact = extractContactFromMessages(messages);
  console.log('[PROCESS] Extracted contact:', extractedContact);

  // VALIDATION: Check if conversation is worth creating a lead
  const validation = isConversationValid(messages, extractedContact);
  if (!validation.valid) {
    console.log('[PROCESS] SKIPPED - Invalid conversation:', validation.reason);
    await logImport(supabase, conversationId, payload.event, 'skipped', validation.reason, { 
      messages_count: messages.length,
      client_messages_count: messages.filter(m => m.message_type === 0 || m.message_type === 'incoming').length,
      extracted_contact: extractedContact,
      preview: conversationContent.substring(0, 200)
    });
    return { message: `Skipped - ${validation.reason}`, skipped: true };
  }

  // Build structured fields
  const structuredFields = {
    nombre: extractedContact.name,
    telefono: extractedContact.phone,
    email: extractedContact.email,
    fuente: 'Chatwoot',
    chatwoot_conversation_id: conversationId,
  };

  // Create lead
  console.log('[PROCESS] Creating lead...');
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      lead_text: conversationContent,
      source_channel: settings.default_source_channel || 'Web chat',
      status_internal: 'Pendiente',
      structured_fields: structuredFields,
    })
    .select()
    .single();

  if (leadError) {
    console.error('[PROCESS] Error creating lead:', leadError);
    await logImport(supabase, conversationId, payload.event, 'error', `Error creating lead: ${leadError.message}`, { error: leadError });
    return { error: 'Error creating lead' };
  }

  console.log('[PROCESS] Lead created:', lead.id);

  // Save conversation record
  await supabase.from('chatwoot_conversations').insert({
    chatwoot_conversation_id: conversationId,
    chatwoot_account_id: accountId,
    lead_id: lead.id,
    contact_name: extractedContact.name,
    contact_email: extractedContact.email,
    contact_phone: extractedContact.phone,
    status: extractStatus(payload),
    messages_count: messages.length,
    conversation_content: conversationContent,
  });

  // Call Lexcore to extract data and calculate scoring
  if (settings.auto_process_lexcore) {
    console.log('[PROCESS] Calling Lexcore...');
    const lexcoreResult = await callLexcore(
      supabaseUrl,
      supabaseServiceKey,
      lead.id,
      conversationContent,
      structuredFields,
      settings.default_source_channel || 'Web chat'
    );
    
    if (lexcoreResult.success) {
      console.log('[PROCESS] Lexcore completed successfully');
    } else {
      console.error('[PROCESS] Lexcore failed:', lexcoreResult.error);
    }
  }

  await logImport(supabase, conversationId, payload.event, 'success', null, { 
    lead_id: lead.id,
    messages_count: messages.length,
    extracted_contact: extractedContact 
  });

  console.log('[PROCESS] SUCCESS - Lead:', lead.id);
  return { 
    message: 'Lead created and processed', 
    lead_id: lead.id,
    messages_count: messages.length,
    extracted_contact: extractedContact
  };
}
