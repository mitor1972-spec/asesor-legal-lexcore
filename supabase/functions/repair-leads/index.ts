import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuración Chatwoot para recuperar datos
const CHATWOOT_ACCOUNT_ID = "138173";
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") || "2GmoSRCQ9v71JhvgKWvC11Zw";

// Regex para detectar alias automáticos tipo "lively-frog-81"
const ALIAS_REGEX = /^[a-z]+-[a-z]+-\d+$/i;

interface RepairResult {
  total_leads_reviewed: number;
  empty_leads_found: number;
  leads_updated: number;
  leads_deduplicated: number;
  leads_marked_incomplete: number;
  leads_deleted: number;
  details: Array<{
    lead_id: string;
    action: string;
    reason: string;
    conversation_id?: number;
  }>;
}

// Verificar si un nombre es un alias automático
function isEmptyOrAlias(name: string | null | undefined): boolean {
  if (!name) return true;
  if (name === "Sin nombre" || name === "") return true;
  return ALIAS_REGEX.test(name.trim());
}

// Obtener datos del contacto desde Chatwoot
async function getContactFromChatwoot(conversationId: number): Promise<{
  name: string | null;
  email: string | null;
  phone: string | null;
} | null> {
  const url = `https://app.chatwoot.com/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api_access_token": CHATWOOT_API_TOKEN,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.log(`[Repair] Could not fetch conversation ${conversationId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const contact = data?.meta?.sender;
    
    if (!contact) {
      return null;
    }
    
    return {
      name: contact.name || null,
      email: contact.email || null,
      phone: contact.phone_number || null,
    };
  } catch (error) {
    console.error(`[Repair] Error fetching contact for conversation ${conversationId}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticación admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parsear opciones del request
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const deleteEmpty = body.delete_empty === true;
    
    console.log(`[Repair] Starting lead repair (dry_run=${dryRun}, delete_empty=${deleteEmpty})`);

    const result: RepairResult = {
      total_leads_reviewed: 0,
      empty_leads_found: 0,
      leads_updated: 0,
      leads_deduplicated: 0,
      leads_marked_incomplete: 0,
      leads_deleted: 0,
      details: [],
    };

    // ==========================================
    // PASO 1: Obtener todos los leads
    // ==========================================
    const { data: allLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, structured_fields, lead_text, created_at, status_internal")
      .order("created_at", { ascending: true });

    if (leadsError) {
      throw new Error(`Error fetching leads: ${leadsError.message}`);
    }

    result.total_leads_reviewed = allLeads?.length || 0;
    console.log(`[Repair] Found ${result.total_leads_reviewed} leads to review`);

    // Obtener todas las relaciones lead-conversation
    const { data: conversations } = await supabase
      .from("chatwoot_conversations")
      .select("lead_id, chatwoot_conversation_id")
      .not("lead_id", "is", null);

    // Crear mapa de lead_id -> conversation_ids
    const leadToConversations: Map<string, number[]> = new Map();
    const conversationToLead: Map<number, string[]> = new Map();

    if (conversations) {
      for (const conv of conversations) {
        if (conv.lead_id) {
          // Mapa lead -> conversations
          if (!leadToConversations.has(conv.lead_id)) {
            leadToConversations.set(conv.lead_id, []);
          }
          leadToConversations.get(conv.lead_id)!.push(conv.chatwoot_conversation_id);

          // Mapa conversation -> leads (para detectar duplicados)
          if (!conversationToLead.has(conv.chatwoot_conversation_id)) {
            conversationToLead.set(conv.chatwoot_conversation_id, []);
          }
          conversationToLead.get(conv.chatwoot_conversation_id)!.push(conv.lead_id);
        }
      }
    }

    // ==========================================
    // PASO 2: Identificar leads vacíos
    // ==========================================
    const emptyLeads: Array<{
      lead: typeof allLeads[0];
      conversationId: number | null;
    }> = [];

    for (const lead of allLeads || []) {
      const fields = lead.structured_fields as Record<string, unknown> || {};
      const name = fields.contact_name as string || null;
      const email = fields.contact_email as string || null;
      const phone = fields.contact_phone as string || null;

      // Verificar si es un lead vacío
      const isEmptyName = isEmptyOrAlias(name);
      const isEmptyEmail = !email || email === "";
      const isEmptyPhone = !phone || phone === "";

      if (isEmptyName && isEmptyEmail && isEmptyPhone) {
        const convIds = leadToConversations.get(lead.id);
        emptyLeads.push({
          lead,
          conversationId: convIds && convIds.length > 0 ? convIds[0] : null,
        });
      }
    }

    result.empty_leads_found = emptyLeads.length;
    console.log(`[Repair] Found ${emptyLeads.length} empty leads`);

    // ==========================================
    // PASO 3: Procesar leads vacíos
    // ==========================================
    for (const { lead, conversationId } of emptyLeads) {
      console.log(`[Repair] Processing empty lead ${lead.id}, conversation=${conversationId}`);

      if (conversationId) {
        // Intentar recuperar datos de Chatwoot
        const contactData = await getContactFromChatwoot(conversationId);

        if (contactData && (contactData.email || contactData.phone || (contactData.name && !isEmptyOrAlias(contactData.name)))) {
          // Hay datos válidos, actualizar el lead
          const currentFields = lead.structured_fields as Record<string, unknown> || {};
          const newFields = { ...currentFields };

          if (contactData.email && !currentFields.contact_email) {
            newFields.contact_email = contactData.email;
          }
          if (contactData.phone && !currentFields.contact_phone) {
            newFields.contact_phone = contactData.phone;
          }
          if (contactData.name && !isEmptyOrAlias(contactData.name) && isEmptyOrAlias(currentFields.contact_name as string)) {
            newFields.contact_name = contactData.name;
          }

          if (!dryRun) {
            await supabase
              .from("leads")
              .update({
                structured_fields: newFields,
                updated_at: new Date().toISOString(),
              })
              .eq("id", lead.id);

            // Actualizar también chatwoot_conversations
            await supabase
              .from("chatwoot_conversations")
              .update({
                contact_name: newFields.contact_name as string || null,
                contact_email: newFields.contact_email as string || null,
                contact_phone: newFields.contact_phone as string || null,
                processed_at: new Date().toISOString(),
              })
              .eq("chatwoot_conversation_id", conversationId);
          }

          result.leads_updated++;
          result.details.push({
            lead_id: lead.id,
            action: "updated",
            reason: `Recovered data from Chatwoot: ${contactData.email || ""} ${contactData.phone || ""} ${contactData.name || ""}`.trim(),
            conversation_id: conversationId,
          });

        } else {
          // No hay datos en Chatwoot, marcar como incompleto
          if (!dryRun) {
            const currentFields = lead.structured_fields as Record<string, unknown> || {};
            await supabase
              .from("leads")
              .update({
                structured_fields: { ...currentFields, _incomplete: true },
                updated_at: new Date().toISOString(),
              })
              .eq("id", lead.id);
          }

          result.leads_marked_incomplete++;
          result.details.push({
            lead_id: lead.id,
            action: "marked_incomplete",
            reason: "No contact data in Chatwoot",
            conversation_id: conversationId,
          });
        }
      } else {
        // Sin conversation_id
        if (deleteEmpty) {
          if (!dryRun) {
            // Primero eliminar referencias
            await supabase.from("chatwoot_conversations").delete().eq("lead_id", lead.id);
            await supabase.from("lead_assignments").delete().eq("lead_id", lead.id);
            await supabase.from("lead_history").delete().eq("lead_id", lead.id);
            await supabase.from("leads").delete().eq("id", lead.id);
          }

          result.leads_deleted++;
          result.details.push({
            lead_id: lead.id,
            action: "deleted",
            reason: "No conversation_id and no contact data",
          });
        } else {
          if (!dryRun) {
            const currentFields = lead.structured_fields as Record<string, unknown> || {};
            await supabase
              .from("leads")
              .update({
                structured_fields: { ...currentFields, _incomplete: true, _no_conversation: true },
                updated_at: new Date().toISOString(),
              })
              .eq("id", lead.id);
          }

          result.leads_marked_incomplete++;
          result.details.push({
            lead_id: lead.id,
            action: "marked_incomplete",
            reason: "No conversation_id associated",
          });
        }
      }
    }

    // ==========================================
    // PASO 4: Deduplicación - Leads con mismo conversation_id
    // ==========================================
    console.log("[Repair] Checking for duplicates...");

    for (const [conversationId, leadIds] of conversationToLead.entries()) {
      if (leadIds.length > 1) {
        console.log(`[Repair] Found ${leadIds.length} leads for conversation ${conversationId}`);

        // Obtener todos los leads para esta conversación
        const { data: duplicateLeads } = await supabase
          .from("leads")
          .select("id, structured_fields, created_at")
          .in("id", leadIds);

        if (!duplicateLeads || duplicateLeads.length <= 1) continue;

        // Ordenar por "completitud" - el más completo primero
        const scored = duplicateLeads.map(lead => {
          const fields = lead.structured_fields as Record<string, unknown> || {};
          let score = 0;
          if (fields.contact_email) score += 10;
          if (fields.contact_phone) score += 10;
          if (fields.contact_name && !isEmptyOrAlias(fields.contact_name as string)) score += 5;
          if (fields.legal_area) score += 2;
          if (fields.city) score += 2;
          return { ...lead, score };
        }).sort((a, b) => b.score - a.score);

        const keepLead = scored[0];
        const removedLeads = scored.slice(1);

        for (const toRemove of removedLeads) {
          if (!dryRun) {
            // Actualizar referencias a apuntar al lead que conservamos
            await supabase
              .from("chatwoot_conversations")
              .update({ lead_id: keepLead.id })
              .eq("lead_id", toRemove.id);

            await supabase
              .from("lead_assignments")
              .update({ lead_id: keepLead.id })
              .eq("lead_id", toRemove.id);

            // Archivar el duplicado en lugar de eliminar
            await supabase
              .from("leads")
              .update({
                archived_at: new Date().toISOString(),
                structured_fields: {
                  ...(toRemove.structured_fields as Record<string, unknown>),
                  _duplicate_of: keepLead.id,
                  _archived_reason: "duplicate",
                },
              })
              .eq("id", toRemove.id);
          }

          result.leads_deduplicated++;
          result.details.push({
            lead_id: toRemove.id,
            action: "archived_duplicate",
            reason: `Duplicate of ${keepLead.id}`,
            conversation_id: conversationId,
          });
        }
      }
    }

    console.log("[Repair] Completed:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify({
      success: true,
      dry_run: dryRun,
      summary: {
        total_leads_reviewed: result.total_leads_reviewed,
        empty_leads_found: result.empty_leads_found,
        leads_updated: result.leads_updated,
        leads_deduplicated: result.leads_deduplicated,
        leads_marked_incomplete: result.leads_marked_incomplete,
        leads_deleted: result.leads_deleted,
      },
      details: result.details,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Repair] Error:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
