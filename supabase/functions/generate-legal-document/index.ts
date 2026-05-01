import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_TYPES = ["engagement_letter", "burofax", "demanda", "escrito_admin", "email_cliente"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { lead_id, document_type, extra_instructions } = await req.json();
    if (!lead_id || !document_type) return json({ error: "lead_id and document_type required" }, 400);
    if (!VALID_TYPES.includes(document_type)) return json({ error: "Invalid document_type" }, 400);

    const { data: lead, error: le } = await admin
      .from("leads")
      .select("structured_fields, case_summary, lead_text")
      .eq("id", lead_id)
      .maybeSingle();
    if (le || !lead) return json({ error: "Lead not found" }, 404);

    const { data: assignment } = await admin
      .from("lead_assignments")
      .select("lawfirm_id")
      .eq("lead_id", lead_id)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lawfirmId = assignment?.lawfirm_id ?? null;

    const fields = (lead.structured_fields as Record<string, unknown>) || {};

    let firmName = "[REVISAR: nombre del despacho]";
    let firmAddress = "[REVISAR: dirección del despacho]";
    if (lawfirmId) {
      const { data: firm } = await admin
        .from("lawfirms")
        .select("name, address")
        .eq("id", lawfirmId)
        .maybeSingle();
      if (firm) {
        firmName = firm.name || firmName;
        firmAddress = (firm.address as string) || firmAddress;
      }
    }

    const clientName = (fields.nombre_completo as string) ||
      [fields.nombre, fields.apellidos].filter(Boolean).join(" ").trim() ||
      "[REVISAR: nombre del cliente]";

    const result = await callAI({
      prompt_key: "generate_legal_document",
      function_name: "generate-legal-document",
      lead_id,
      variables: {
        document_type,
        client_name: clientName,
        client_dni: (fields.dni as string) || "[REVISAR: DNI/NIE]",
        client_address: (fields.direccion as string) || "[REVISAR: dirección]",
        client_phone: (fields.telefono as string) || "[REVISAR: teléfono]",
        client_email: (fields.email as string) || "[REVISAR: email]",
        area_legal: (fields.area_legal as string) || "no especificada",
        cuantia: (fields.cuantia as string) || "[REVISAR: cuantía]",
        firm_name: firmName,
        firm_address: firmAddress,
        case_summary: lead.case_summary || lead.lead_text || "(sin resumen)",
        extra_instructions: extra_instructions || "",
      },
    });

    if (lawfirmId) {
      await admin.from("case_timeline_events").insert({
        lead_id,
        lawfirm_id: lawfirmId,
        event_type: "legal_document_generated",
        title: `Documento generado: ${document_type}`,
        description: "Borrador IA creado. Pendiente de revisión por el letrado.",
        metadata: { document_type, model: result.model, prompt_version: result.prompt_version },
      });
    }

    return json({ success: true, document: result.text, document_type, model: result.model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[generate-legal-document]", msg);
    return json({ error: msg }, 500);
  }
});
