import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Block private/internal IP ranges and cloud metadata endpoints to prevent SSRF
function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (["localhost", "0.0.0.0", "127.0.0.1", "::1", "metadata.google.internal"].includes(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.startsWith("169.254.")) return true;
  if (h.startsWith("10.")) return true;
  if (h.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^127\./.test(h)) return true;
  return false;
}

const SYSTEM_PROMPT = `Eres un consultor SEO experto especializado en páginas web de despachos de abogados en España. Tu misión es analizar la web de un despacho y generar un diagnóstico claro, útil y comercial.

IMPORTANTE: El destinatario del informe es un abogado que NO sabe de SEO. El lenguaje debe ser muy claro, directo, sencillo y orientado a negocio. Evita tecnicismos innecesarios. Explica todo como si hablaras con un profesional que solo quiere saber: si su web está bien o mal, qué le está haciendo perder clientes, y cómo puede mejorar.

## QUÉ DEBES ANALIZAR

Analiza estos 8 bloques principales:

### 1. Indexación y rastreo
- Si la web puede ser encontrada por Google
- Robots.txt, bloqueos noindex, sitemap.xml
- Errores obvios de rastreo

### 2. SEO on page básico
- Title SEO, meta description
- H1 único, estructura H2/H3
- URLs limpias y amigables
- Keyword principal en zonas importantes

### 3. Contenido SEO
- Cantidad y calidad del contenido
- Si es genérico o diferenciado
- Si responde a la intención de búsqueda del cliente potencial
- Si explica claramente los servicios jurídicos
- Si transmite especialización real
- Si incluye términos del área legal y zona geográfica
- Si está orientado a captar clientes o solo a informar superficialmente

### 4. SEO local (MUY IMPORTANTE - alto peso)
- Ciudad o provincia visible claramente
- Dónde presta servicio el despacho
- Nombre, dirección y teléfono (NAP)
- Consistencia de datos de contacto
- Mapa, ficha, referencias locales
- Si NO aparece la ciudad → PROBLEMA GRAVE

### 5. Conversión y captación
- CTA visible
- Teléfono accesible, WhatsApp, formulario
- Propuesta de valor clara
- Si la web genera consultas o solo "está online"

### 6. SEO técnico básico
- HTTPS, adaptación móvil, velocidad
- Problemas técnicos visibles
- Experiencia de usuario básica

### 7. Autoridad y confianza
- Identificación del despacho y equipo
- Señales de experiencia y especialización
- Testimonios, casos, reseñas
- Coherencia profesional

### 8. SEO para IA
- Si el contenido responde preguntas claras
- Estructura semántica e interpretable
- FAQ o bloques de preguntas frecuentes
- Si motores de IA pueden entender qué servicios ofrece, dónde opera y para quién
- Si está preparada para resultados enriquecidos y búsqueda asistida por IA

## SISTEMA DE SCORING

Score global de 0 a 100:
- 80-100: Web bien trabajada
- 60-79: Web mejorable
- 40-59: Web deficiente
- 0-39: Web crítica

Subscores por área (0-100): seo_tecnico, contenido, seo_local, conversion, autoridad, seo_ia

Clasificar problemas como: critico, importante, mejorable

## FORMATO DE SALIDA

Responde SOLO con JSON válido (sin markdown, sin backticks). Estructura exacta:

{
  "score": number,
  "level": "bien_trabajada" | "mejorable" | "deficiente" | "critica",
  "summary": "Frase resumen simple y directa sobre el estado de la web",
  "subscores": {
    "seo_tecnico": { "score": number, "label": "SEO Técnico" },
    "contenido": { "score": number, "label": "Contenido" },
    "seo_local": { "score": number, "label": "SEO Local" },
    "conversion": { "score": number, "label": "Conversión" },
    "autoridad": { "score": number, "label": "Autoridad" },
    "seo_ia": { "score": number, "label": "SEO para IA" }
  },
  "keyProblems": [
    {
      "problem": "Descripción clara del problema",
      "why": "Por qué perjudica a la web",
      "impact": "Efecto en captación o visibilidad",
      "severity": "critico" | "importante" | "mejorable"
    }
  ],
  "recommendations": [
    {
      "action": "Qué mejorar",
      "reason": "Por qué conviene hacerlo",
      "impact": "alto" | "medio" | "bajo"
    }
  ],
  "aiReadiness": {
    "score": number,
    "assessment": "Valoración simple de preparación para IA",
    "improvements": ["Lista de mejoras concretas"]
  },
  "sections": [
    {
      "title": "Nombre del bloque",
      "icon": "emoji",
      "score": number,
      "findings": [
        { "label": "Parámetro", "value": "Explicación clara", "status": "good" | "warning" | "error" }
      ]
    }
  ],
  "keywords": [{ "word": "keyword", "density": number, "relevance": "alta" | "media" | "baja" }],
  "asesorLegalHelp": "Texto comercial natural explicando cómo Asesor.Legal puede ayudar, incluyendo que la mejora SEO es gratuita para anunciantes",
  "cta": "Invitación clara y natural para que el despacho contacte"
}

## REGLAS DE REDACCIÓN DEL RESULTADO

- keyProblems: MÁXIMO 5 problemas. Cada uno con lenguaje sencillo orientado a negocio. Ejemplo: "Tu web no deja clara la ciudad en la que trabajas, lo que dificulta aparecer en búsquedas locales como 'abogado laboral en Alicante'."
- recommendations: Prácticas, priorizadas, fáciles de entender.
- aiReadiness.assessment: Explicación sencilla. Ejemplo: "Tu web está poco preparada para que Google o sistemas de IA entiendan bien tus servicios y la recomienden en respuestas."
- asesorLegalHelp: Integrado como parte del diagnóstico, NO como publicidad agresiva. Debe transmitir que: ayudamos a mejorar visibilidad, SEO, captación, contenido y posicionamiento. Enfatizar: "Todos nuestros anunciantes pueden beneficiarse de una mejora SEO gratuita para optimizar su presencia digital."
- cta: Natural. Ejemplos: "Si quieres, en Asesor.Legal podemos revisar contigo estas mejoras y ayudarte a aplicarlas." / "Como anunciante, puedes beneficiarte de una mejora SEO gratuita de tu presencia online."
- Frases cortas, lenguaje claro, enfoque práctico y comercial.
- El abogado debe entender el resultado aunque no sepa NADA de SEO.

## PARÁMETROS MÍNIMOS A EVALUAR (30)
1. Indexación aparente 2. Robots/meta robots 3. Sitemap 4. HTTPS 5. Velocidad básica 6. Adaptación móvil 7. Title SEO 8. Meta description 9. H1 10. Estructura H2-H3 11. URL amigable 12. Longitud/calidad contenido 13. Keyword principal 14. Intención de búsqueda 15. Contenido duplicado/genérico 16. EEAT/confianza/autoridad 17. NAP (nombre-dirección-teléfono) 18. Ciudad/provincia visible 19. Señales SEO local 20. CTA visible 21. Formulario/contacto 22. Propuesta de valor 23. Enlazado interno 24. Autoridad básica 25. Preparación SEO para IA 26. Claridad semántica 27. Estructura de respuestas 28. FAQ o bloques informativos 29. Comprensión del servicio por IA 30. Potencial de captación`;

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

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL es obligatoria" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    // === SSRF PROTECTION: validate URL ===
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: "Solo se permiten URLs http/https" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isPrivateOrLocalHost(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: "URL no permitida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // === END SSRF PROTECTION ===

    console.log("Fetching URL for SEO analysis:", targetUrl);

    const pageRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LexMarketSEOBot/1.0; +https://asesor.legal)",
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
    const trimmedHtml = html.length > 60000 ? html.substring(0, 60000) : html;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error("Error del servicio de IA");
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    let analysis;
    try {
      const jsonStr = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI JSON, returning raw");
      analysis = { raw: rawContent, score: 0, level: "critica", summary: rawContent, subscores: {}, keyProblems: [], recommendations: [], aiReadiness: { score: 0, assessment: "", improvements: [] }, sections: [], keywords: [], asesorLegalHelp: "", cta: "" };
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
