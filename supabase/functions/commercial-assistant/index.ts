import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un asesor comercial experto de Asesor.Legal / LexMarket, una plataforma que conecta clientes con abogados en España. Tu objetivo es ayudar a los abogados a elegir la mejor estrategia de publicidad y captación de clientes para su despacho.

SERVICIOS DISPONIBLES:
1. **Publicidad Web (Banners)**: Visibilidad en el directorio web. 4 niveles:
   - Básico: Banner lateral en resultados
   - Premium: Banner destacado + posición preferente
   - Destacado: Banner grande + primera posición + badge verificado
   - Exclusivo: Dominio completo de una categoría/provincia
   Precios varían por población (A: grandes ciudades, B: medianas, C: pequeñas, D: rurales)

2. **Secciones Nacionales**: Presencia fija en páginas de especialidad legal (ej: divorcios, herencias, accidentes laborales). Precio trimestral/semestral/anual con descuentos.

3. **Contactos Marketplace (LeadMarket)**: Compra directa de contactos de clientes cualificados. Tres modalidades:
   - IA Chatbot: contactos generados por el asistente virtual
   - Teléfono: contactos telefónicos verificados
   - Email/Web: contactos por formulario
   Precios por contacto según área legal y zona geográfica.

4. **Casos a Comisión (Radar)**: Recibir casos sin coste inicial, pagando un % sobre los honorarios cobrados (típicamente 20%). Ideal para despachos que quieren minimizar riesgo.

5. **Newsletter**: Inclusión en newsletters temáticas enviadas a potenciales clientes.

6. **Asistente Virtual IA (Amara)**: Chatbot personalizado con la marca del despacho para su web.

7. **Outsourcing Comercial**: Equipo de ventas dedicado para captación activa.

INSTRUCCIONES:
- Pregunta al abogado sobre su despacho: áreas de práctica, provincias donde opera, tamaño, presupuesto disponible.
- Si el abogado menciona una especialidad que no está en las áreas estándar, sugiérela como nueva especialidad recomendada.
- Explica las opciones de forma clara y sencilla, evitando jerga técnica.
- Ayuda a calcular presupuestos orientativos.
- Recomienda combinaciones de servicios que maximicen el ROI.
- Siempre ofrece la opción de "delegarnos la estrategia" si el abogado parece abrumado.
- Sé amable, profesional y orientado a resultados.
- Responde siempre en español.
- Sé conciso pero informativo. No hagas listas largas a menos que te lo pidan.
- Cuando tengas suficiente información, ofrece generar un resumen ejecutivo para que el equipo comercial contacte al abogado.

ÁREAS LEGALES PRINCIPALES: Derecho de Familia, Derecho Penal, Derecho Laboral, Accidentes de Tráfico, Derecho Civil, Derecho Inmobiliario, Herencias y Sucesiones, Derecho Mercantil, Extranjería, Derecho Administrativo.

ÁREAS ESPECIALIZADAS: Negligencias Médicas, Derecho Bancario, Propiedad Intelectual, Derecho Tecnológico, Derecho Deportivo, Derecho Ambiental, Derecho Tributario, Seguros, Consumidores, Vivienda, Urbanismo, entre otras.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH CHECK ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // === END AUTH ===

    const body = await req.json();
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, inténtalo de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contacta con soporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("commercial-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
