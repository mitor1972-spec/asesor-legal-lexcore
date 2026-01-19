import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function to manually process a Chatwoot conversation
 * that has accumulated messages but wasn't closed as "resolved"
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'conversation_id is required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[MANUAL_PROCESS] Processing conversation ${conversation_id}`);

    // 1. Check if already processed
    const { data: existingConv } = await supabase
      .from('chatwoot_conversations')
      .select('id, lead_id')
      .eq('chatwoot_conversation_id', conversation_id)
      .maybeSingle();

    if (existingConv?.lead_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Conversation already processed with lead ${existingConv.lead_id}`,
        lead_id: existingConv.lead_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Fetch all accumulated messages
    const { data: messages, error: msgError } = await supabase
      .from('chatwoot_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('message_created_at', { ascending: true });

    if (msgError) {
      console.error('[MANUAL_PROCESS] Error fetching messages:', msgError);
      throw msgError;
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No messages found for this conversation' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log(`[MANUAL_PROCESS] Found ${messages.length} messages`);

    // 3. Separate messages by type
    const contactMessages = messages.filter(m => m.sender_type === 'contact');
    const agentMessages = messages.filter(m => m.sender_type === 'agent');
    const allMessages = messages.filter(m => m.sender_type !== 'system');

    // 4. Build conversation text
    const contactText = contactMessages.map(m => m.content).join('\n');
    const agentText = agentMessages.map(m => m.content).join('\n');
    const fullConversationText = allMessages
      .map(m => `[${m.sender_type === 'contact' ? 'Cliente' : 'Agente'}]: ${m.content}`)
      .join('\n');

    // 5. Extract contact data
    const extractedData = extractContactData(contactText, agentText);

    console.log('[MANUAL_PROCESS] Extracted data:', JSON.stringify(extractedData, null, 2));

    // 6. Validate
    if (!extractedData.phone && !extractedData.email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No phone or email could be extracted from the conversation',
        extracted: extractedData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 7. Get settings
    const { data: settings } = await supabase
      .from('chatwoot_settings')
      .select('default_source_channel')
      .limit(1)
      .single();

    const sourceChannel = settings?.default_source_channel || 'Web chat';

    // 8. Build structured fields
    const structuredFields: Record<string, any> = {};
    if (extractedData.name) structuredFields.contact_name = extractedData.name;
    if (extractedData.phone) structuredFields.contact_phone = extractedData.phone;
    if (extractedData.email) structuredFields.contact_email = extractedData.email;
    if (extractedData.city) structuredFields.city = extractedData.city;
    structuredFields.chatwoot_conversation_id = conversation_id;

    // 9. Create the lead
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
      console.error('[MANUAL_PROCESS] Error creating lead:', leadError);
      throw leadError;
    }

    console.log(`[MANUAL_PROCESS] Created lead ${lead.id}`);

    // 10. Save to chatwoot_conversations
    await supabase.from('chatwoot_conversations').upsert({
      chatwoot_conversation_id: conversation_id,
      contact_name: extractedData.name,
      contact_phone: extractedData.phone,
      contact_email: extractedData.email,
      conversation_content: fullConversationText.substring(0, 10000),
      messages_count: messages.length,
      status: 'manually_processed',
      lead_id: lead.id,
      processed_at: new Date().toISOString(),
    }, {
      onConflict: 'chatwoot_conversation_id',
    });

    // 11. Mark messages as processed
    await supabase
      .from('chatwoot_messages')
      .update({ processed: true, lead_id: lead.id })
      .eq('conversation_id', conversation_id);

    // 12. Log import result
    await supabase.from('chatwoot_import_logs').insert({
      chatwoot_conversation_id: conversation_id,
      event_type: 'manual_process',
      status: 'success',
    });

    // 13. Process with Lexcore
    try {
      const lexcoreResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-lexcore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: lead.id }),
      });

      if (lexcoreResponse.ok) {
        console.log(`[MANUAL_PROCESS] Lexcore processed for lead ${lead.id}`);
      } else {
        console.log(`[MANUAL_PROCESS] Lexcore processing returned: ${lexcoreResponse.status}`);
      }
    } catch (lexError) {
      console.error('[MANUAL_PROCESS] Error processing Lexcore:', lexError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      lead_id: lead.id,
      extracted_data: extractedData,
      messages_count: messages.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[MANUAL_PROCESS] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Extract contact data from conversation text
 */
function extractContactData(contactText: string, agentText: string): {
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
} {
  const allText = `${contactText}\n${agentText}`;

  // Extract phone - Spanish mobile/landline patterns
  const phonePatterns = [
    /(?:\+34)?[6789]\d{8}/g,
    /(?:\+34)?\s*\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g,
    /(?:\+34)?\s*\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
  ];

  let phone: string | null = null;
  for (const pattern of phonePatterns) {
    const matches = allText.match(pattern);
    if (matches && matches.length > 0) {
      // Clean and normalize - take the first valid one
      for (const match of matches) {
        const cleaned = match.replace(/[\s.-]/g, '').replace(/^\+34/, '');
        if (cleaned.length >= 9) {
          phone = cleaned;
          break;
        }
      }
      if (phone) break;
    }
  }

  // Extract email
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w{2,}/i);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  // Extract name from various patterns
  let name: string | null = null;

  // From contact text patterns
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

  // From agent messages (they often greet by name)
  if (!name) {
    const agentNamePatterns = [
      /(?:Gracias,|Perfecto,|Entiendo,)\s*([A-ZÀ-ÿ][a-zà-ÿ]+)/,
      /(?:No te preocupes,)\s*([A-ZÀ-ÿ][a-zà-ÿ]+)/,
      /<strong>Nombre:<\/strong>\s*([A-ZÀ-ÿ][a-zà-ÿ]+)/i,
    ];

    for (const pattern of agentNamePatterns) {
      const match = agentText.match(pattern);
      if (match && match[1]) {
        const commonWords = ['señor', 'señora', 'sr', 'sra', 'don', 'doña', 'cliente', 'usuario'];
        if (!commonWords.includes(match[1].toLowerCase())) {
          name = match[1].trim();
          break;
        }
      }
    }
  }

  // Also check if client just responded with their name alone
  if (!name) {
    const lines = contactText.split('\n').filter(l => l.trim().length > 0 && l.trim().length < 30);
    for (const line of lines) {
      // If line is just a name (starts with capital, short)
      const nameOnlyMatch = line.trim().match(/^([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)?)$/);
      if (nameOnlyMatch) {
        const candidate = nameOnlyMatch[1];
        // Validate it's not a common word
        const skipWords = ['hola', 'si', 'no', 'vale', 'ok', 'gracias', 'buenas', 'buenos'];
        if (!skipWords.includes(candidate.toLowerCase())) {
          name = candidate;
          break;
        }
      }
    }
  }

  // Extract city from conversation
  let city: string | null = null;
  const cityPatterns = [
    /(?:estoy en|vivo en|soy de|desde)\s+([A-ZÀ-ÿ][a-zà-ÿ]+)/i,
    /(?:Madrid|Barcelona|Valencia|Sevilla|Zaragoza|Málaga|Murcia|Palma|Bilbao)/i,
  ];

  for (const pattern of cityPatterns) {
    const match = allText.match(pattern);
    if (match) {
      city = match[1] || match[0];
      break;
    }
  }

  return { name, phone, email, city };
}
