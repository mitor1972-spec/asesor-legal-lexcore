import { createClient } from 'npm:@supabase/supabase-js@2';

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

function stripHtml(input: string): string {
  return (input || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildConversationText(messages: ChatwootMessage[]): string {
  return messages
    .slice()
    .sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
    .map((m) => {
      const isAgent =
        m.message_type === 1 ||
        m.message_type === 'outgoing' ||
        m.message_type === 3 ||
        m.sender?.type === 'User';
      const sender = isAgent ? 'Agente' : 'Cliente';
      return `[${sender}]: ${stripHtml(m.content || '')}`;
    })
    .join('\n');
}

function extractContactFromText(allText: string): { name: string | null; phone: string | null; email: string | null } {
  const text = allText;

  // Name
  let name: string | null = null;
  const namePatterns = [
    /me\s+llamo\s+m?\s*([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?)/i,
    /soy\s+([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?)/i,
    /mi\s+nombre\s+es\s+([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?)/i,
    /^([A-ZÀ-ÿa-z]+(?:\s+[A-ZÀ-ÿa-z]+)?),?\s+(?:necesito|tengo|quiero)/i,
    /hola,?\s+(?:soy|me\s+llamo)\s+([A-ZÀ-ÿa-z]+)/i,
    /de\s+nada,?\s*([A-ZÀ-ÿa-z]+)\b/i,
    /gracias,?\s*([A-ZÀ-ÿa-z]+)\b/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      name = match[1].trim();
      break;
    }
  }

  // Phone
  let phone: string | null = null;
  const phoneMatch = text.match(/\b([6789]\d{8})\b/);
  if (phoneMatch?.[1]) phone = phoneMatch[1];

  // Email
  let email: string | null = null;
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/i);
  if (emailMatch?.[0]) email = emailMatch[0].toLowerCase();

  return { name, phone, email };
}

async function fetchChatwootMessages(accountId: number, conversationId: number) {
  const baseUrl = Deno.env.get('CHATWOOT_BASE_URL');
  const apiToken = Deno.env.get('CHATWOOT_API_TOKEN');

  if (!baseUrl || !apiToken) {
    return {
      ok: false,
      status: 500,
      error: 'Missing CHATWOOT_BASE_URL or CHATWOOT_API_TOKEN',
      messages: [] as ChatwootMessage[],
      raw: null as any,
    };
  }

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const all: ChatwootMessage[] = [];

  // First request EXACTLY like user spec (no page)
  let page: number | null = null;
  for (let i = 0; i < 25; i++) {
    const qs = page ? `?page=${page}` : '';
    const url = `${normalizedBase}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages${qs}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        api_access_token: apiToken,
      },
    });

    const rawText = await resp.text();
    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      // keep rawText
    }

    if (!resp.ok) {
      return {
        ok: false,
        status: resp.status,
        error: typeof json === 'object' ? json : rawText,
        messages: [] as ChatwootMessage[],
        raw: json ?? rawText,
      };
    }

    const payload = (json?.payload ?? json) as any;
    const pageMessages: ChatwootMessage[] = Array.isArray(payload) ? payload : (payload?.messages ?? []);

    all.push(...pageMessages);

    const nextPage = json?.meta?.next_page;
    if (nextPage) {
      page = Number(nextPage);
      if (!Number.isFinite(page) || page < 1) break;
      continue;
    }

    // Heuristic: if no next_page but we got a full page, attempt page 2 once
    if (!page && pageMessages.length >= 25) {
      page = 2;
      continue;
    }

    break;
  }

  return { ok: true, status: 200, error: null as any, messages: all, raw: null as any };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const conversationId = Number(url.searchParams.get('conversation_id'));
  const accountId = Number(url.searchParams.get('account_id'));
  const createLead = url.searchParams.get('create_lead') === 'true';

  if (!token) {
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
    return new Response(JSON.stringify({ error: 'Configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (settings.webhook_token !== token) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Number.isFinite(conversationId) || !Number.isFinite(accountId)) {
    return new Response(JSON.stringify({ error: 'conversation_id and account_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const fetched = await fetchChatwootMessages(accountId, conversationId);
  if (!fetched.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        conversation_id: conversationId,
        account_id: accountId,
        chatwoot_status: fetched.status,
        chatwoot_error: fetched.error,
        hint: 'Revisa CHATWOOT_BASE_URL y CHATWOOT_API_TOKEN',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const messages = fetched.messages;
  const conversationText = buildConversationText(messages);
  const allText = messages.map((m) => stripHtml(m.content || '')).join(' ');
  const extracted = extractContactFromText(allText);

  const clientMessagesCount = messages.filter((m) => m.message_type === 0 || m.message_type === 'incoming').length;

  let createdLeadId: string | null = null;
  let created = false;
  let createReason: string | null = null;

  if (createLead) {
    if (!extracted.phone && !extracted.email) {
      createReason = 'No contact data (phone/email) in conversation text; not creating lead.';
    } else if (!extracted.name) {
      createReason = 'No name could be extracted; not creating lead.';
    } else if (clientMessagesCount === 0) {
      createReason = 'No client messages found; not creating lead.';
    } else {
      // Avoid duplicates
      const { data: existingConv } = await supabase
        .from('chatwoot_conversations')
        .select('id, lead_id')
        .eq('chatwoot_conversation_id', conversationId)
        .maybeSingle();

      if (existingConv?.lead_id) {
        createdLeadId = existingConv.lead_id;
        created = false;
        createReason = 'Already exists (chatwoot_conversations)';
      } else {
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert({
            lead_text: conversationText,
            source_channel: settings.default_source_channel || 'Web chat',
            status_internal: 'Pendiente',
            structured_fields: {
              nombre: extracted.name,
              telefono: extracted.phone,
              email: extracted.email,
              fuente: 'Chatwoot',
              chatwoot_conversation_id: conversationId,
            },
          })
          .select()
          .single();

        if (leadError) {
          createReason = `Error creating lead: ${leadError.message}`;
        } else {
          createdLeadId = lead.id;
          created = true;

          await supabase.from('chatwoot_conversations').insert({
            chatwoot_conversation_id: conversationId,
            chatwoot_account_id: accountId,
            lead_id: lead.id,
            contact_name: extracted.name,
            contact_email: extracted.email,
            contact_phone: extracted.phone,
            status: 'debug_import',
            messages_count: messages.length,
            conversation_content: conversationText,
          });
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      conversation_id: conversationId,
      account_id: accountId,
      messages_count: messages.length,
      client_messages_count: clientMessagesCount,
      extracted_contact: extracted,
      messages: messages.map((m) => ({
        id: m.id,
        message_type: m.message_type,
        sender_name: m.sender?.name ?? null,
        content: stripHtml(m.content || ''),
        created_at: m.created_at,
      })),
      lead_created: created,
      lead_id: createdLeadId,
      lead_create_note: createReason,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
