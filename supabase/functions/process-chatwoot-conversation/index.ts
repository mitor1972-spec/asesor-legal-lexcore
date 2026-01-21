import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chatwoot API configuration
const CHATWOOT_ACCOUNT_ID = "138173";
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") || "";

// Regex para detectar alias automáticos tipo "lively-frog-81"
const ALIAS_REGEX = /^[a-z]+-[a-z]+-\d+$/i;

/**
 * Edge function to manually process a Chatwoot conversation.
 * Accepts either:
 * - conversation_id (number): Direct conversation ID
 * - contact_alias (string): Chatwoot contact alias like "billowing-mountain-320"
 * 
 * Always runs AI extraction pipeline to extract structured data from text.
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
      
      // Search for contact in Chatwoot by name (alias)
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
          
          // Find contact with matching name
          const matchingContact = contacts.find((c: any) => 
            c.name === contact_alias || 
            c.name?.toLowerCase() === contact_alias?.toLowerCase()
          );
          
          if (matchingContact) {
            // Get conversations for this contact
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
                // Get most recent conversation
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
        hint: 'If using alias, make sure it matches exactly the Chatwoot contact name (e.g., "billowing-mountain-320")'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[MANUAL_PROCESS] Processing conversation ${conversation_id}`);

    // ==========================================
    // CHECK IF LEAD EXISTS
    // ==========================================
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, structured_fields, lead_text, case_summary')
      .eq('conversation_id', conversation_id)
      .maybeSingle();

    if (existingLead) {
      console.log(`[MANUAL_PROCESS] Lead exists: ${existingLead.id} - will reprocess with AI`);
      
      // Reprocess existing lead with AI
      const reprocessUrl = `${supabaseUrl}/functions/v1/reprocess-lead`;
      const reprocessResponse = await fetch(reprocessUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: existingLead.id }),
      });

      let reprocessResult = null;
      if (reprocessResponse.ok) {
        reprocessResult = await reprocessResponse.json();
        console.log(`[MANUAL_PROCESS] AI reprocess completed:`, JSON.stringify(reprocessResult.results?.[0]?.changes_made || []));
      }

      // Recalculate Lexcore
      const lexcoreResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-lexcore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: existingLead.id }),
      });

      // Generate summary if missing
      if (!existingLead.case_summary) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/generate-case-summary`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lead_id: existingLead.id }),
          });
          console.log(`[MANUAL_PROCESS] Summary generated for lead ${existingLead.id}`);
        } catch (summaryError) {
          console.warn("[MANUAL_PROCESS] Summary generation failed:", summaryError);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        action: 'reprocessed',
        lead_id: existingLead.id,
        conversation_id: conversation_id,
        changes: reprocessResult?.results?.[0]?.changes_made || [],
        message: 'Lead existente reprocesado con IA'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ==========================================
    // FETCH MESSAGES FROM CHATWOOT API
    // ==========================================
    const messagesUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}/messages`;
    console.log(`[MANUAL_PROCESS] Fetching messages from Chatwoot API`);

    const messagesResponse = await fetch(messagesUrl, {
      method: "GET",
      headers: {
        "api_access_token": CHATWOOT_API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error(`[MANUAL_PROCESS] Chatwoot API error: ${messagesResponse.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to fetch messages from Chatwoot: ${messagesResponse.status}`,
        hint: 'Make sure the conversation_id exists in Chatwoot'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.payload || [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No messages found in this conversation' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log(`[MANUAL_PROCESS] Found ${messages.length} messages from Chatwoot API`);

    // Filter user messages (message_type = 0)
    const userMessages = messages
      .filter((m: any) => m.message_type === 0 && m.content)
      .sort((a: any, b: any) => a.created_at - b.created_at);

    // Build lead text
    const leadText = userMessages.map((m: any) => m.content).join('\n\n');

    if (!leadText.trim()) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No user messages with content found in this conversation' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get contact info from conversation metadata
    const convUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}`;
    const convResponse = await fetch(convUrl, {
      method: "GET",
      headers: {
        "api_access_token": CHATWOOT_API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    let contactAlias = null;
    if (convResponse.ok) {
      const convData = await convResponse.json();
      contactAlias = convData.meta?.sender?.name || null;
    }

    // ==========================================
    // CREATE LEAD
    // ==========================================
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        conversation_id: conversation_id,
        lead_text: leadText,
        source_channel: 'Web chat',
        status_internal: 'Pendiente',
        structured_fields: {
          _contact_alias: contactAlias,
          _manual_import: true,
          _messages_count: messages.length,
        },
      })
      .select()
      .single();

    if (leadError) {
      console.error('[MANUAL_PROCESS] Error creating lead:', leadError);
      throw leadError;
    }

    console.log(`[MANUAL_PROCESS] Created lead ${newLead.id}`);

    // ==========================================
    // PIPELINE IA: Extract + Lexcore + Summary
    // ==========================================
    
    // Step 1: AI Extraction
    let extractionResult = null;
    try {
      const reprocessResponse = await fetch(`${supabaseUrl}/functions/v1/reprocess-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: newLead.id }),
      });

      if (reprocessResponse.ok) {
        extractionResult = await reprocessResponse.json();
        console.log(`[MANUAL_PROCESS] AI extraction completed:`, JSON.stringify(extractionResult.results?.[0]?.changes_made || []));
      }
    } catch (extractError) {
      console.warn('[MANUAL_PROCESS] AI extraction failed:', extractError);
    }

    // Step 2: Lexcore
    try {
      await fetch(`${supabaseUrl}/functions/v1/calculate-lexcore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: newLead.id }),
      });
      console.log(`[MANUAL_PROCESS] Lexcore calculated for lead ${newLead.id}`);
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
        body: JSON.stringify({ lead_id: newLead.id }),
      });
      console.log(`[MANUAL_PROCESS] Summary generated for lead ${newLead.id}`);
    } catch (summaryError) {
      console.warn('[MANUAL_PROCESS] Summary generation failed:', summaryError);
    }

    // Save to chatwoot_conversations
    await supabase.from('chatwoot_conversations').upsert({
      chatwoot_conversation_id: conversation_id,
      contact_name: contactAlias,
      conversation_content: leadText.substring(0, 10000),
      messages_count: messages.length,
      status: 'manually_processed',
      lead_id: newLead.id,
      processed_at: new Date().toISOString(),
    }, {
      onConflict: 'chatwoot_conversation_id',
    });

    // Log import
    await supabase.from('chatwoot_import_logs').insert({
      chatwoot_conversation_id: conversation_id,
      event_type: 'manual_process',
      status: 'success',
      payload_json: {
        messages_count: messages.length,
        user_messages_count: userMessages.length,
        extracted_changes: extractionResult?.results?.[0]?.changes_made || [],
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      action: 'created',
      lead_id: newLead.id,
      conversation_id: conversation_id,
      contact_alias: contactAlias,
      messages_count: messages.length,
      extracted_data: extractionResult?.results?.[0]?.extracted_data || null,
      changes: extractionResult?.results?.[0]?.changes_made || [],
      message: 'Lead creado y procesado con IA'
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
