import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chatwoot API configuration
const CHATWOOT_ACCOUNT_ID = "138173";
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") || "";

interface ChatwootConversation {
  id: number;
  status: string;
  created_at: number;
  last_activity_at?: number;
  messages_count?: number;
  meta?: {
    sender?: {
      name?: string;
      email?: string;
      phone_number?: string;
    };
  };
}

interface OrphanResult {
  conversation_id: number;
  contact_alias: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  messages_count: number | null;
  last_activity_at: string | null;
  created_at: string | null;
  in_chatwoot_conversations: boolean;
  in_leads: boolean;
  has_last_processed_at: boolean;
}

/**
 * Find conversations that exist in Chatwoot but are missing from DB
 * or have not been processed (no last_processed_at)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      limit = 100,
      status_filter = 'all', // 'all', 'resolved', 'open'
      days_back = 30,
    } = body;

    console.log(`[ORPHAN_CHECK] Starting - limit: ${limit}, status: ${status_filter}, days_back: ${days_back}`);

    const orphans: OrphanResult[] = [];
    const chatwootConversations: ChatwootConversation[] = [];
    
    // Fetch conversations from Chatwoot
    let page = 1;
    const perPage = 25;
    let hasMore = true;
    const statuses = status_filter === 'all' ? ['resolved', 'open'] : [status_filter];
    
    for (const status of statuses) {
      page = 1;
      hasMore = true;
      
      while (hasMore && chatwootConversations.length < limit * 2) {
        const url = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=${status}&page=${page}&per_page=${perPage}`;
        
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "api_access_token": CHATWOOT_API_TOKEN,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok) {
            console.error(`[ORPHAN_CHECK] API Error: ${response.status}`);
            break;
          }
          
          const data = await response.json();
          const conversations = data.data?.payload || [];
          
          console.log(`[ORPHAN_CHECK] Page ${page} (${status}): ${conversations.length} conversations`);
          
          chatwootConversations.push(...conversations);
          
          if (conversations.length < perPage) {
            hasMore = false;
          } else {
            page++;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch (error) {
          console.error(`[ORPHAN_CHECK] Error fetching page ${page}:`, error);
          break;
        }
      }
    }

    console.log(`[ORPHAN_CHECK] Fetched ${chatwootConversations.length} conversations from Chatwoot`);

    // Get all conversation IDs from DB
    const { data: dbConversations } = await supabase
      .from('chatwoot_conversations')
      .select('chatwoot_conversation_id, lead_id');
    
    const { data: dbLeads } = await supabase
      .from('leads')
      .select('id, conversation_id, last_processed_at')
      .not('conversation_id', 'is', null);
    
    const dbConvMap = new Map<number, { lead_id: string | null }>();
    const dbLeadMap = new Map<number, { id: string; last_processed_at: string | null }>();
    
    (dbConversations || []).forEach(c => {
      dbConvMap.set(c.chatwoot_conversation_id, { lead_id: c.lead_id });
    });
    
    (dbLeads || []).forEach(l => {
      if (l.conversation_id) {
        dbLeadMap.set(l.conversation_id, { id: l.id, last_processed_at: l.last_processed_at });
      }
    });

    // Find orphans
    for (const conv of chatwootConversations) {
      const inChatwootConversations = dbConvMap.has(conv.id);
      const leadInfo = dbLeadMap.get(conv.id);
      const inLeads = !!leadInfo;
      const hasLastProcessedAt = !!(leadInfo?.last_processed_at);
      
      // It's an orphan if:
      // 1. Not in chatwoot_conversations table, OR
      // 2. Not in leads table, OR
      // 3. In leads but no last_processed_at (not fully processed)
      const isOrphan = !inChatwootConversations || !inLeads || !hasLastProcessedAt;
      
      if (isOrphan) {
        orphans.push({
          conversation_id: conv.id,
          contact_alias: conv.meta?.sender?.name || null,
          contact_email: conv.meta?.sender?.email || null,
          contact_phone: conv.meta?.sender?.phone_number || null,
          status: conv.status,
          messages_count: conv.messages_count || null,
          last_activity_at: conv.last_activity_at 
            ? new Date(conv.last_activity_at * 1000).toISOString() 
            : null,
          created_at: conv.created_at 
            ? new Date(conv.created_at * 1000).toISOString() 
            : null,
          in_chatwoot_conversations: inChatwootConversations,
          in_leads: inLeads,
          has_last_processed_at: hasLastProcessedAt,
        });
        
        if (orphans.length >= limit) break;
      }
    }

    console.log(`[ORPHAN_CHECK] Found ${orphans.length} orphan conversations`);

    // Summary statistics
    const summary = {
      total_chatwoot_conversations: chatwootConversations.length,
      orphans_found: orphans.length,
      missing_from_chatwoot_conversations: orphans.filter(o => !o.in_chatwoot_conversations).length,
      missing_from_leads: orphans.filter(o => !o.in_leads).length,
      not_processed: orphans.filter(o => o.in_leads && !o.has_last_processed_at).length,
      with_contact: orphans.filter(o => o.contact_email || o.contact_phone).length,
      without_contact: orphans.filter(o => !o.contact_email && !o.contact_phone).length,
    };

    return new Response(JSON.stringify({
      success: true,
      summary,
      orphans: orphans.slice(0, limit),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ORPHAN_CHECK] Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
