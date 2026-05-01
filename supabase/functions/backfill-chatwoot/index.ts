import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

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

interface ChatwootConversation {
  id: number;
  status: string;
  created_at: number;
  last_activity_at?: number;
  meta?: {
    sender?: {
      name?: string;
      email?: string;
      phone_number?: string;
    };
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

interface BackfillResult {
  conversation_id: number;
  contact_alias: string | null;
  status: 'created' | 'updated' | 'rejected' | 'error';
  lead_id?: string;
  reason?: string;
  has_email: boolean;
  has_phone: boolean;
  extracted_name?: string;
}

/**
 * Fetch all conversations from Chatwoot with pagination
 */
async function fetchAllConversations(options: { 
  onlyResolved?: boolean;
  inactivityThresholdHours?: number;
}): Promise<ChatwootConversation[]> {
  const allConversations: ChatwootConversation[] = [];
  let page = 1;
  const perPage = 25;
  let hasMore = true;
  
  console.log(`[BACKFILL] Fetching conversations from Chatwoot...`);
  
  while (hasMore) {
    // Fetch resolved conversations
    const resolvedUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=resolved&page=${page}&per_page=${perPage}`;
    
    try {
      const response = await fetch(resolvedUrl, {
        method: "GET",
        headers: {
          "api_access_token": CHATWOOT_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        console.error(`[BACKFILL] API Error on page ${page}: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const conversations = data.data?.payload || [];
      
      console.log(`[BACKFILL] Page ${page}: received ${conversations.length} resolved conversations`);
      
      allConversations.push(...conversations);
      
      if (conversations.length < perPage) {
        hasMore = false;
      } else {
        page++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      }
      
    } catch (error) {
      console.error(`[BACKFILL] Exception on page ${page}:`, error);
      break;
    }
  }
  
  // Also fetch open conversations with inactivity > threshold
  if (options.inactivityThresholdHours) {
    console.log(`[BACKFILL] Fetching open conversations with inactivity > ${options.inactivityThresholdHours}h...`);
    page = 1;
    hasMore = true;
    const thresholdMs = options.inactivityThresholdHours * 60 * 60 * 1000;
    const nowMs = Date.now();
    
    while (hasMore) {
      const openUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=open&page=${page}&per_page=${perPage}`;
      
      try {
        const response = await fetch(openUrl, {
          method: "GET",
          headers: {
            "api_access_token": CHATWOOT_API_TOKEN,
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) break;
        
        const data = await response.json();
        const conversations = data.data?.payload || [];
        
        // Filter by inactivity
        const inactiveConvs = conversations.filter((conv: ChatwootConversation) => {
          const lastActivity = conv.last_activity_at ? conv.last_activity_at * 1000 : conv.created_at * 1000;
          return (nowMs - lastActivity) > thresholdMs;
        });
        
        console.log(`[BACKFILL] Page ${page}: ${inactiveConvs.length}/${conversations.length} open conversations with inactivity > ${options.inactivityThresholdHours}h`);
        
        allConversations.push(...inactiveConvs);
        
        if (conversations.length < perPage) {
          hasMore = false;
        } else {
          page++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`[BACKFILL] Exception fetching open conversations:`, error);
        break;
      }
    }
  }
  
  console.log(`[BACKFILL] Total conversations to process: ${allConversations.length}`);
  return allConversations;
}

/**
 * Fetch all messages for a conversation with pagination
 */
async function fetchAllMessagesWithPagination(conversationId: number): Promise<{ messages: ChatwootMessage[]; stats: TranscriptStats }> {
  const allMessages: ChatwootMessage[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  let pagesCount = 0;
  
  while (hasMore) {
    const url = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages?page=${page}&per_page=${perPage}`;
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "api_access_token": CHATWOOT_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) break;
      
      const data = await response.json();
      const messages = data.payload || [];
      
      allMessages.push(...messages);
      pagesCount++;
      
      if (messages.length < perPage) {
        hasMore = false;
      } else {
        page++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`[BACKFILL] Error fetching messages for conv ${conversationId}:`, error);
      break;
    }
  }
  
  allMessages.sort((a, b) => a.created_at - b.created_at);
  
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
  
  return { messages: allMessages, stats };
}

/**
 * Extract contact info from messages
 */
function extractContactFromMessages(messages: ChatwootMessage[]): { email: string | null; phone: string | null; name: string | null } {
  let email: string | null = null;
  let phone: string | null = null;
  let name: string | null = null;
  
  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Spanish phone regex
  const phoneRegex = /(?:\+34\s?)?(?:6\d{8}|7[1-4]\d{7}|9\d{8}|\d{3}[\s.-]?\d{3}[\s.-]?\d{3})/g;
  
  for (const msg of messages) {
    if (!msg.content) continue;
    
    // Extract from sender metadata first
    if (msg.sender?.email && !email) {
      email = msg.sender.email;
    }
    if (msg.sender?.phone_number && !phone) {
      phone = msg.sender.phone_number;
    }
    if (msg.sender?.name && !name && msg.sender?.type === 'contact') {
      const senderName = msg.sender.name;
      if (!ALIAS_REGEX.test(senderName)) {
        name = senderName;
      }
    }
    
    // Extract from message content (user messages only - type 0)
    if (msg.message_type === 0) {
      const emailMatches = msg.content.match(emailRegex);
      if (emailMatches && !email) {
        email = emailMatches[0];
      }
      
      const phoneMatches = msg.content.match(phoneRegex);
      if (phoneMatches && !phone) {
        // Clean the phone number
        phone = phoneMatches[0].replace(/[\s.-]/g, '');
      }
    }
  }
  
  return { email, phone, name };
}

/**
 * Main backfill handler
 */
serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      limit = 100,  // Max conversations to process
      offset = 0,   // Starting offset
      specific_aliases = [], // Process specific aliases (priority list)
      inactivity_hours = 24,
    } = body;

    console.log(`[BACKFILL] Starting backfill - limit: ${limit}, offset: ${offset}, inactivity: ${inactivity_hours}h`);

    const results: BackfillResult[] = [];
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;
    let errorCount = 0;

    // Priority list of aliases to process (from user requirements)
    const priorityAliases = specific_aliases.length > 0 ? specific_aliases : [
      "floral-surf-101",
      "fragrant-butterfly-398",
      "billowing-mountain-320",
      "dry-forest-190",
      "wandering-field-825",
      "weathered-sun-157",
      "young-meadow-134",
      "bold-surf-33",
      "restless-lake-575",
      "winter-star-282"
    ];

    // First, process priority aliases by searching for them
    console.log(`[BACKFILL] Processing ${priorityAliases.length} priority aliases...`);
    
    for (const alias of priorityAliases) {
      try {
        // Search for contact by alias
        const searchUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${encodeURIComponent(alias)}`;
        const searchResponse = await fetch(searchUrl, {
          method: "GET",
          headers: {
            "api_access_token": CHATWOOT_API_TOKEN,
            "Content-Type": "application/json",
          },
        });
        
        if (!searchResponse.ok) continue;
        
        const searchData = await searchResponse.json();
        const contacts = searchData.payload || [];
        
        const matchingContact = contacts.find((c: any) => 
          c.name === alias || c.name?.toLowerCase() === alias.toLowerCase()
        );
        
        if (!matchingContact) {
          console.log(`[BACKFILL] Alias ${alias} not found in Chatwoot`);
          continue;
        }
        
        // Get conversations for this contact
        const convUrl = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${matchingContact.id}/conversations`;
        const convResponse = await fetch(convUrl, {
          method: "GET",
          headers: {
            "api_access_token": CHATWOOT_API_TOKEN,
            "Content-Type": "application/json",
          },
        });
        
        if (!convResponse.ok) continue;
        
        const convData = await convResponse.json();
        const conversations = convData.payload || [];
        
        for (const conv of conversations) {
          const result = await processConversation(supabase, supabaseUrl, supabaseServiceKey, conv.id, alias);
          results.push(result);
          processedCount++;
          
          if (result.status === 'created') createdCount++;
          else if (result.status === 'updated') updatedCount++;
          else if (result.status === 'rejected') rejectedCount++;
          else if (result.status === 'error') errorCount++;
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
        
      } catch (error) {
        console.error(`[BACKFILL] Error processing alias ${alias}:`, error);
      }
    }

    // Then fetch all other conversations
    console.log(`[BACKFILL] Fetching remaining conversations...`);
    const allConversations = await fetchAllConversations({ 
      onlyResolved: false,
      inactivityThresholdHours: inactivity_hours 
    });

    // Process remaining conversations (up to limit)
    const remainingLimit = Math.max(0, limit - processedCount);
    const conversationsToProcess = allConversations.slice(offset, offset + remainingLimit);
    
    console.log(`[BACKFILL] Processing ${conversationsToProcess.length} additional conversations...`);
    
    for (const conv of conversationsToProcess) {
      const contactAlias = conv.meta?.sender?.name || null;
      
      // Skip if already processed as priority alias
      if (priorityAliases.includes(contactAlias || '')) {
        continue;
      }
      
      const result = await processConversation(supabase, supabaseUrl, supabaseServiceKey, conv.id, contactAlias);
      results.push(result);
      processedCount++;
      
      if (result.status === 'created') createdCount++;
      else if (result.status === 'updated') updatedCount++;
      else if (result.status === 'rejected') rejectedCount++;
      else if (result.status === 'error') errorCount++;
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    }

    // Log the backfill run
    await supabase.from('chatwoot_import_logs').insert({
      chatwoot_conversation_id: null,
      event_type: 'backfill',
      status: 'completed',
      payload_json: {
        total_processed: processedCount,
        created: createdCount,
        updated: updatedCount,
        rejected: rejectedCount,
        errors: errorCount,
        priority_aliases_processed: priorityAliases.length,
      },
    });

    console.log(`[BACKFILL] Complete! Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}, Rejected: ${rejectedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_processed: processedCount,
        created: createdCount,
        updated: updatedCount,
        rejected: rejectedCount,
        errors: errorCount,
      },
      results: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[BACKFILL] Fatal error:', error);
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
 * Process a single conversation through the full pipeline
 */
async function processConversation(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  conversationId: number,
  contactAlias: string | null
): Promise<BackfillResult> {
  try {
    console.log(`[BACKFILL] Processing conversation ${conversationId} (${contactAlias || 'unknown'})`);
    
    // Fetch all messages
    const { messages, stats } = await fetchAllMessagesWithPagination(conversationId);
    
    if (messages.length === 0) {
      return {
        conversation_id: conversationId,
        contact_alias: contactAlias,
        status: 'rejected',
        reason: 'No messages in conversation',
        has_email: false,
        has_phone: false,
      };
    }
    
    // Build full transcript
    const fullTranscript = messages
      .filter(m => m.content)
      .map(m => `[${m.message_type === 0 ? 'USER' : 'AGENT'}]: ${m.content}`)
      .join("\n\n");
    
    // Extract contact info from messages
    const extracted = extractContactFromMessages(messages);
    
    // GOLDEN RULE: Must have email OR phone
    const hasValidContact = !!(extracted.email || extracted.phone);
    
    if (!hasValidContact) {
      console.log(`[BACKFILL] REJECTED ${conversationId}: No email AND no phone`);
      
      // Still log the conversation for debugging
      await supabase.from("chatwoot_conversations").upsert({
        chatwoot_conversation_id: conversationId,
        chatwoot_account_id: parseInt(CHATWOOT_ACCOUNT_ID),
        contact_name: contactAlias,
        conversation_content: fullTranscript.substring(0, 10000),
        messages_count: messages.length,
        status: "incomplete_no_contact",
        processed_at: new Date().toISOString(),
      }, {
        onConflict: "chatwoot_conversation_id",
      });
      
      return {
        conversation_id: conversationId,
        contact_alias: contactAlias,
        status: 'rejected',
        reason: 'GOLDEN RULE: No email AND no phone',
        has_email: false,
        has_phone: false,
      };
    }
    
    const now = new Date().toISOString();
    
    // Check if lead exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, structured_fields')
      .eq('conversation_id', conversationId)
      .maybeSingle();
    
    // Prepare structured fields - DO NOT use alias as name
    const structuredFields: Record<string, any> = {
      ...(existingLead?.structured_fields || {}),
      email: extracted.email || (existingLead?.structured_fields as any)?.email || null,
      telefono: extracted.phone || (existingLead?.structured_fields as any)?.telefono || null,
      _chatwoot_alias: contactAlias,
      _transcript_stats: stats,
      _backfill_processed: true,
      _backfill_at: now,
    };
    
    // Only set name if we have a real name (not alias)
    if (extracted.name && !ALIAS_REGEX.test(extracted.name)) {
      structuredFields.nombre = extracted.name;
    }
    
    let leadId: string;
    let action: 'created' | 'updated';
    
    if (existingLead) {
      // Update existing lead
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          lead_text: fullTranscript,
          last_message_at: stats.last_message_at,
          last_processed_at: now,
          updated_at: now,
          structured_fields: structuredFields,
        })
        .eq('id', existingLead.id);
      
      if (updateError) throw updateError;
      leadId = existingLead.id;
      action = 'updated';
    } else {
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          conversation_id: conversationId,
          lead_text: fullTranscript,
          source_channel: 'Web chat',
          status_internal: 'Pendiente',
          last_message_at: stats.last_message_at,
          last_processed_at: now,
          structured_fields: structuredFields,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      leadId = newLead.id;
      action = 'created';
    }
    
    console.log(`[BACKFILL] Lead ${action}: ${leadId}`);
    
    // Run full pipeline: reprocess → lexcore → summary
    try {
      // Step 1: AI Extraction
      await fetch(`${supabaseUrl}/functions/v1/reprocess-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
      
      // Step 2: Lexcore
      await fetch(`${supabaseUrl}/functions/v1/calculate-lexcore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
      
      // Step 3: Summary
      await fetch(`${supabaseUrl}/functions/v1/generate-case-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
      
    } catch (pipelineError) {
      console.warn(`[BACKFILL] Pipeline error for ${leadId}:`, pipelineError);
    }
    
    // Update chatwoot_conversations
    await supabase.from('chatwoot_conversations').upsert({
      chatwoot_conversation_id: conversationId,
      contact_name: contactAlias,
      contact_email: extracted.email,
      contact_phone: extracted.phone,
      conversation_content: fullTranscript.substring(0, 10000),
      messages_count: messages.length,
      status: 'backfill_processed',
      lead_id: leadId,
      processed_at: now,
    }, {
      onConflict: 'chatwoot_conversation_id',
    });
    
    return {
      conversation_id: conversationId,
      contact_alias: contactAlias,
      status: action,
      lead_id: leadId,
      has_email: !!extracted.email,
      has_phone: !!extracted.phone,
      extracted_name: extracted.name || undefined,
    };
    
  } catch (error) {
    console.error(`[BACKFILL] Error processing ${conversationId}:`, error);
    return {
      conversation_id: conversationId,
      contact_alias: contactAlias,
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown error',
      has_email: false,
      has_phone: false,
    };
  }
}
