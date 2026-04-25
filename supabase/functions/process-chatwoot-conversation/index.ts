import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chatwoot API configuration
const CHATWOOT_ACCOUNT_ID = "138173";
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") || "";

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
  };
}

interface TranscriptStats {
  total_messages: number;
  incoming_count: number;
  outgoing_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  pages_fetched: number;
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
    
    console.log(`[FETCH] Requesting page ${page}`);
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "api_access_token": CHATWOOT_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FETCH] API Error on page ${page}: ${response.status} - ${errorText}`);
        break;
      }
      
      const data = await response.json();
      const messages = data.payload || [];
      
      console.log(`[FETCH] Page ${page}: received ${messages.length} messages`);
      
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
    pages_fetched: pagesCount,
  };
  
  console.log(`[FETCH] Complete transcript stats: ${JSON.stringify(stats)}`);
  
  return { messages: allMessages, stats };
}

/**
 * Edge function to manually process a Chatwoot conversation.
 * Accepts either:
 * - conversation_id (number): Direct conversation ID
 * - contact_alias (string): Chatwoot contact alias like "billowing-mountain-320"
 * 
 * ALWAYS does full transcript fetch with pagination and runs AI extraction pipeline.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    let { conversation_id, contact_alias } = body;

    console.log(`[MANUAL_PROCESS] Input: conversation_id=${conversation_id}, contact_alias=${contact_alias}`);

    // ==========================================
    // RESOLVER ALIAS A CONVERSATION_ID
    // ==========================================
    if (!conversation_id && contact_alias) {
      console.log(`[MANUAL_PROCESS] Resolving alias: ${contact_alias}`);
      
      const searchUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${encodeURIComponent(contact_alias)}`;
      
      try {
        const searchResponse = await fetch(searchUrl, {
          method: "GET",
          headers: {
            "api_access_token": CHATWOOT_API_TOKEN,
            "Content-Type": "application/json",
          },
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const contacts = searchData.payload || [];
          
          console.log(`[MANUAL_PROCESS] Found ${contacts.length} contacts matching alias`);
          
          const matchingContact = contacts.find((c: any) => 
            c.name === contact_alias || 
            c.name?.toLowerCase() === contact_alias?.toLowerCase()
          );
          
          if (matchingContact) {
            const convUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${matchingContact.id}/conversations`;
            const convResponse = await fetch(convUrl, {
              method: "GET",
              headers: {
                "api_access_token": CHATWOOT_API_TOKEN,
                "Content-Type": "application/json",
              },
            });
            
            if (convResponse.ok) {
              const convData = await convResponse.json();
              const conversations = convData.payload || [];
              
              if (conversations.length > 0) {
                conversation_id = conversations[0].id;
                console.log(`[MANUAL_PROCESS] Resolved alias ${contact_alias} to conversation_id ${conversation_id}`);
              }
            }
          }
        }
      } catch (searchError) {
        console.error("[MANUAL_PROCESS] Error searching for alias:", searchError);
      }
    }

    // Validate we have a conversation_id
    if (!conversation_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'conversation_id is required (or provide a valid contact_alias)',
        hint: 'If using alias, make sure it matches exactly the Chatwoot contact name'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[MANUAL_PROCESS] Processing conversation ${conversation_id} with FULL TRANSCRIPT FETCH`);

    // ==========================================
    // FETCH TRANSCRIPT COMPLETO CON PAGINACIÓN
    // ==========================================
    const { messages: allMessages, stats: transcriptStats } = await fetchAllMessagesWithPagination(conversation_id);
    
    console.log(`[MANUAL_PROCESS] Transcript fetched: ${JSON.stringify(transcriptStats)}`);

    if (allMessages.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No messages found in this conversation',
        conversation_id: conversation_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // ==========================================
    // CONSTRUIR TRANSCRIPT COMPLETO
    // ==========================================
    const allMessageContents = allMessages.filter(m => m.content);
    const fullTranscript = allMessageContents
      .map(m => `[${m.message_type === 0 ? 'USER' : 'AGENT'}]: ${m.content}`)
      .join("\n\n");
    
    // Get contact info
    let contactAlias: string | null = null;
    try {
      const convUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}`;
      const convResponse = await fetch(convUrl, {
        method: "GET",
        headers: {
          "api_access_token": CHATWOOT_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      if (convResponse.ok) {
        const convData = await convResponse.json();
        contactAlias = convData.meta?.sender?.name || null;
      }
    } catch (e) {
      console.warn("[MANUAL_PROCESS] Could not get conversation metadata:", e);
    }

    // ==========================================
    // CHECK IF LEAD EXISTS
    // ==========================================
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, structured_fields, lead_text, case_summary')
      .eq('conversation_id', conversation_id)
      .maybeSingle();

    const now = new Date().toISOString();
    let leadId: string;
    let action: string;

    if (existingLead) {
      console.log(`[MANUAL_PROCESS] Lead exists: ${existingLead.id} - updating with full transcript`);
      
      // Update existing lead with full transcript
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          lead_text: fullTranscript,
          last_message_at: transcriptStats.last_message_at,
          last_processed_at: now,
          updated_at: now,
          structured_fields: {
            ...(existingLead.structured_fields as Record<string, unknown> || {}),
            _contact_alias: contactAlias,
            _transcript_stats: transcriptStats,
            _manual_reprocess: true,
          },
        })
        .eq('id', existingLead.id);

      if (updateError) {
        throw updateError;
      }

      leadId = existingLead.id;
      action = 'updated';
    } else {
      console.log(`[MANUAL_PROCESS] Creating new lead from full transcript`);
      
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          conversation_id: conversation_id,
          lead_text: fullTranscript,
          source_channel: 'Web chat',
          status_internal: 'Pendiente',
          last_message_at: transcriptStats.last_message_at,
          last_processed_at: now,
          structured_fields: {
            _contact_alias: contactAlias,
            _transcript_stats: transcriptStats,
            _manual_import: true,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      leadId = newLead.id;
      action = 'created';
    }

    console.log(`[MANUAL_PROCESS] Lead ${action}: ${leadId}`);

    // ==========================================
    // PIPELINE IA: Extract + Lexcore + Summary
    // ==========================================
    let extractionResult = null;
    
    // Step 1: AI Extraction
    try {
      const reprocessResponse = await fetch(`${supabaseUrl}/functions/v1/reprocess-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (reprocessResponse.ok) {
        extractionResult = await reprocessResponse.json();
        console.log(`[MANUAL_PROCESS] AI extraction completed:`, JSON.stringify(extractionResult.results?.[0]?.changes_made || []));
      } else {
        console.warn(`[MANUAL_PROCESS] AI extraction failed: ${reprocessResponse.status}`);
      }
    } catch (extractError) {
      console.warn('[MANUAL_PROCESS] AI extraction exception:', extractError);
    }

    // Step 2: Lexcore
    try {
      await fetch(`${supabaseUrl}/functions/v1/calculate-lexcore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
      console.log(`[MANUAL_PROCESS] Lexcore calculated for lead ${leadId}`);
    } catch (lexError) {
      console.warn('[MANUAL_PROCESS] Lexcore calculation failed:', lexError);
    }

    // Step 3: Summary
    try {
      await fetch(`${supabaseUrl}/functions/v1/generate-case-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
      console.log(`[MANUAL_PROCESS] Summary generated for lead ${leadId}`);
    } catch (summaryError) {
      console.warn('[MANUAL_PROCESS] Summary generation failed:', summaryError);
    }

    // Save to chatwoot_conversations
    await supabase.from('chatwoot_conversations').upsert({
      chatwoot_conversation_id: conversation_id,
      contact_name: contactAlias,
      conversation_content: fullTranscript.substring(0, 10000),
      messages_count: allMessages.length,
      status: 'manually_processed',
      lead_id: leadId,
      processed_at: now,
    }, {
      onConflict: 'chatwoot_conversation_id',
    });

    // Log import
    await supabase.from('chatwoot_import_logs').insert({
      chatwoot_conversation_id: conversation_id,
      event_type: 'manual_process',
      status: 'success',
      payload_json: {
        transcript_stats: transcriptStats,
        extracted_changes: extractionResult?.results?.[0]?.changes_made || [],
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      action: action,
      lead_id: leadId,
      conversation_id: conversation_id,
      contact_alias: contactAlias,
      transcript_stats: transcriptStats,
      extracted_data: extractionResult?.results?.[0]?.extracted_data || null,
      changes: extractionResult?.results?.[0]?.changes_made || [],
      message: `Lead ${action} con transcript completo (${transcriptStats.total_messages} mensajes, ${transcriptStats.pages_fetched} páginas)`
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
