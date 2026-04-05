import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL es obligatoria" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    console.log("Fetching URL for SEO analysis:", targetUrl);

    // Fetch the page HTML
    const pageRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LexMarketSEOBot/1.0; +https://lexmarket.es)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      return new Response(
        JSON.stringify({ error: `No se pudo acceder a la URL (${pageRes.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await pageRes.text();

    // Truncate to ~60k chars to fit in context
    const trimmedHtml = html.length > 60000 ? html.substring(0, 60000) : html;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Eres un experto consultor SEO especializado en páginas web de despachos de abogados en España.
Analiza el HTML proporcionado y genera un informe SEO detallado y profesional en español.

El informe debe incluir las siguientes secciones con puntuaciones de 0 a 100:

1. **Puntuación Global SEO** (0-100)

2. **Meta Tags y Encabezados**
   - Title tag (existencia, longitud, keywords)
   - Meta description (existencia, longitud, llamada a la acción)
   - Canonical URL
   - Open Graph tags
   - Estructura de H1, H2, H3 (jerarquía correcta)

3. **Contenido y Palabras Clave**
   - Densidad de palabras clave principales detectadas
   - Temáticas legales identificadas (áreas de práctica)
   - Longitud del contenido
   - Calidad y originalidad estimada del contenido
   - Llamadas a la acción (CTAs)

4. **SEO Técnico**
   - Uso de HTTPS
   - Estructura de URLs
   - Schema markup / datos estructurados (LocalBusiness, Attorney, etc.)
   - Rendimiento estimado (scripts pesados, imágenes sin optimizar)
   - Mobile-friendliness (viewport meta, responsive)

5. **Enlaces**
   - Enlaces internos (cantidad y calidad)
   - Enlaces externos / salientes
   - Presencia de enlace a Google My Business, redes sociales

6. **Accesibilidad y UX**
   - Alt text en imágenes
   - Contraste y legibilidad
   - Formularios de contacto

7. **Oportunidades y Recomendaciones**
   - Top 5 acciones prioritarias para mejorar
   - Keywords sugeridas para el sector legal detectado
   - Estrategia de contenido recomendada

Responde SOLO con un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{
  "score": number,
  "sections": [
    {
      "title": string,
      "score": number,
      "icon": string (emoji),
      "findings": [
        { "label": string, "value": string, "status": "good" | "warning" | "error" }
      ],
      "recommendations": [string]
    }
  ],
  "keywords": [{ "word": string, "density": number, "relevance": "alta" | "media" | "baja" }],
  "topActions": [{ "priority": number, "action": string, "impact": "alto" | "medio" | "bajo" }],
  "summary": string
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analiza el SEO de esta página web de un despacho de abogados.\nURL: ${targetUrl}\n\nHTML:\n${trimmedHtml}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones excedido. Inténtalo de nuevo en unos minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error("Error del servicio de IA");
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    // Try to parse JSON from the response (strip markdown fences if present)
    let analysis;
    try {
      const jsonStr = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI JSON, returning raw");
      analysis = { raw: rawContent, score: 0, sections: [], keywords: [], topActions: [], summary: rawContent };
    }

    return new Response(JSON.stringify({ success: true, analysis, url: targetUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-seo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
