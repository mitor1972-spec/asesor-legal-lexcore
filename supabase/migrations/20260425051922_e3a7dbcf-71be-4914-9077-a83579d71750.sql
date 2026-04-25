
-- =========================================
-- FASE 1: Extender ai_prompts
-- =========================================

ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS user_template text,
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'gpt-4o-mini',
  ADD COLUMN IF NOT EXISTS temperature numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS max_tokens integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS response_format text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS ai_prompts_prompt_key_unique ON public.ai_prompts(prompt_key);

-- Trigger: auto-bump version on edit
CREATE OR REPLACE FUNCTION public.bump_ai_prompt_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.system_prompt IS DISTINCT FROM OLD.system_prompt
        OR NEW.user_template IS DISTINCT FROM OLD.user_template
        OR NEW.prompt_text IS DISTINCT FROM OLD.prompt_text
        OR NEW.model IS DISTINCT FROM OLD.model
        OR NEW.temperature IS DISTINCT FROM OLD.temperature
        OR NEW.max_tokens IS DISTINCT FROM OLD.max_tokens
        OR NEW.response_format IS DISTINCT FROM OLD.response_format) THEN
      NEW.version = COALESCE(OLD.version, 1) + 1;
      NEW.updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_ai_prompt_version ON public.ai_prompts;
CREATE TRIGGER trg_bump_ai_prompt_version
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW EXECUTE FUNCTION public.bump_ai_prompt_version();

-- =========================================
-- ai_logs
-- =========================================

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key text NOT NULL,
  prompt_version integer,
  function_name text,
  lead_id uuid,
  model text,
  input jsonb,
  output text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  duration_ms integer,
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_prompt_key ON public.ai_logs(prompt_key);
CREATE INDEX IF NOT EXISTS idx_ai_logs_lead_id ON public.ai_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON public.ai_logs(status);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can view ai_logs" ON public.ai_logs;
CREATE POLICY "Internal users can view ai_logs"
ON public.ai_logs
FOR SELECT
USING (public.is_internal_user(auth.uid()));

-- Inserción la hace el service role desde edge functions; no hace falta policy de INSERT.

-- =========================================
-- FASE 2: Insertar/actualizar prompts oficiales
-- =========================================

INSERT INTO public.ai_prompts (prompt_key, prompt_name, description, prompt_text, system_prompt, user_template, model, temperature, max_tokens, response_format, is_active)
VALUES
('extract_lead',
 'Extracción de datos del lead',
 'Extrae datos estructurados (nombre, contacto, área legal, hechos, urgencia...) desde el texto bruto de la conversación.',
 '',
 'Eres un asistente de extracción de datos legales. Responde SOLO con JSON válido.',
 $tpl$Eres un asistente legal especializado en extraer información de conversaciones con clientes en España.

Analiza el siguiente texto de un lead/consulta legal y extrae la información en formato JSON.

TEXTO DEL LEAD:
"""
{{lead_text}}
"""

Extrae y devuelve SOLO un JSON válido con esta estructura (usa null si no encuentras el dato):

{
  "nombre": "string o null",
  "apellidos": "string o null",
  "telefono": "string o null",
  "email": "string o null",
  "ciudad": "string o null",
  "provincia": "string o null - SIEMPRE incluir aunque debas inferirla",
  "area_legal": "una de la lista o null",
  "subarea": "string o null - la especialidad específica del caso",
  "tipo_caso": "string o null - tipo concreto del asunto",
  "cuantia": "número o null",
  "cuantia_texto": "string original si aparece",
  "urgencia_aplica": true/false,
  "urgencia_nivel": "Alta/Media/Baja o null",
  "urgencia_motivo": "string o null",
  "hechos_clave": "resumen breve de los hechos",
  "pretension_cliente": "qué quiere conseguir el cliente",
  "contraparte": "string o null",
  "documentacion_mencionada": ["lista de docs mencionados"],
  "preferencia_contacto": "Teléfono/Email/WhatsApp o null",
  "franja_horaria": "string o null"
}

ÁREAS LEGALES VÁLIDAS (usa exactamente una de estas):
{{areas_legales}}

REGLAS:
- Si hay teléfono, normalízalo a formato español (9 dígitos)
- Si hay fechas límite, plazos o riesgo inmediato: urgencia_aplica = true
- NO inventes datos que no estén en el texto
- MUY IMPORTANTE: Si el usuario menciona una ciudad pero NO la provincia, infiere la provincia correcta (ej: "Salou" → "Tarragona")
- Siempre devuelve CIUDAD y PROVINCIA como campos separados
- Devuelve SOLO el JSON, sin explicaciones$tpl$,
 'gpt-4o-mini', 0.2, 2000, 'json_object', true),

('lexcore_scoring_system',
 'Lexcore — Reglas de scoring',
 'Reglas de scoring Lexcore (grupos, penalizaciones, ajustes). Se usan junto con la configuración de lexcore_configs.',
 '',
 'Eres el motor de scoring Lexcore para leads legales. Responde SOLO con JSON válido.',
 $tpl$Eres el motor de scoring Lexcore™ para leads legales en España.

DATOS DEL LEAD:
"""
{{structured_fields}}
"""

TEXTO ORIGINAL:
"""
{{lead_text}}
"""

CANAL DE ORIGEN: {{source_channel}}

CONFIGURACIÓN DE SCORING:
{{config_json}}

Analiza el lead y calcula el scoring siguiendo estas reglas:

## MODO A vs MODO B
- Si urgencia_aplica = true → usar MODO A (incluye grupo urgencia, pesos en weights_mode_a)
- Si urgencia_aplica = false → usar MODO B (sin grupo urgencia, pesos en weights_mode_b)

## GRUPOS DE SCORING (evalúa cada uno de 0 a su máximo):

### 1. CONTACTABILIDAD (max 8):
- Teléfono válido: +5
- Email válido: +3
- Nombre completo: +1 (cap en 8)

### 2. INTENCIÓN (max 20):
- Solicita abogado explícitamente: 0/6/10
- Acepta que tendrá coste: 0/2/4
- Busca acción (no solo info): 0/2/4
- Disponible para llamada: 0/1/2

### 3. URGENCIA (max 10, solo Modo A):
- Plazo específico: 0/3/5
- Riesgo inmediato: 0/2/3
- Ventana de oportunidad: 0/1/2

### 4. CASO (max 25):
- Área/subárea clara: 0-5
- Hechos y cronología: 0-7
- Petición concreta: 0-5
- Identificadores trazables: 0-3
- Contraparte identificada: 0-2
- Fase procesal definida: 0-3

### 5. EVIDENCIA (max 10):
- 0: Nada / 2: Menciona docs / 4: Describe básicos / 6: Aporta relevantes / 8: Docs clave / 10: Expediente completo

### 6. CLARIDAD (max 10):
- Relato ordenado: 0-4 / Completitud: 0-3 / Coherencia: 0-2 / Tono colaborativo: 0-1

## PENALIZACIONES:
- Caso genérico: -10 a -20 / Faltan datos críticos: -5 a -15 / Falta documentación: -3 a -10
- Contacto incompleto: -3 a -8 / Segunda opinión: -6 / Precedente negativo: -6 / Inconsistencia temporal: -3 a -8

## AJUSTES COMERCIALES:
- Exclusividad: 1 despacho +6 / 2: -6 / 3: -12 / 4+: -18
- Canal: Teléfono +6 / Web +4 / WhatsApp +2 / Email 0
- Cuantía: <1000€ -10 / 1000-4999€ 0 / 5000-19999€ +4 / >20000€ +6

## VJ:
- Solo valores: +10, +6, 0, -6, -10. Justificar en 1 frase.

## GATE NO CONTACTABLE:
Si no hay teléfono válido NI email válido → precio_final = 5€

## SCORE MÁXIMO:
El score_final NUNCA puede superar 95.

## CÁLCULO DEL PRECIO:
Usa los price_steps de la configuración para mapear score_final a precio.

Devuelve SOLO un JSON válido con: mode_used, flags, raw_scores, weighted_scores, subtotal_weighted, penalties, adjustments, vj, score_final, price_before_caps, price_final, conclusion (2-4 líneas resumiendo el lead y el scoring).$tpl$,
 'gpt-4o-mini', 0.3, 3000, 'json_object', true),

('case_summary',
 'Resumen interno del caso',
 'Genera la ficha estructurada del caso para el despacho (con datos personales). Uso interno.',
 '',
 'Eres un asistente legal experto que genera resúmenes estructurados de casos. Responde solo con el resumen siguiendo la plantilla, sin explicaciones añadidas.',
 $tpl$Genera el resumen estructurado para esta conversación de cliente.

DATOS YA EXTRAÍDOS:
- Nombre: {{nombre}}
- Apellidos: {{apellidos}}
- Teléfono: {{telefono}}
- Email: {{email}}
- Ciudad: {{ciudad}}
- Provincia: {{provincia}}
- Área legal: {{area_legal}}
- Subárea: {{subarea}}
- Cuantía: {{cuantia}}
- Urgencia: {{urgencia}}
- Canal: {{source_channel}}

DATOS DE SCORING:
- Score final: {{score_final}}
- Precio: {{price_lexcore}}
- VJ: {{vj_score}}
- Conclusión VJ: {{vj_conclusion}}

---CONVERSACIÓN---
{{lead_text}}
---FIN CONVERSACIÓN---

REGLAS ESTRICTAS:
1. Si un dato no aparece, DEJA EL CAMPO EN BLANCO (no escribas "No consta", "N/A", etc.)
2. NO inventes información
3. Usa bullets con "•"
4. Fechas en formato dd/mm/aaaa
5. Mantén títulos en negrita con **
6. OMITE líneas sin información

PLANTILLA A SEGUIR:
{{summary_template}}

Genera el resumen completo:$tpl$,
 'gpt-4o-mini', 0.3, 3000, 'text', true),

('marketplace_summary',
 'Resumen público marketplace',
 'Resumen público del caso para abogados en el marketplace. SIN datos personales (sin nombre, teléfono, email).',
 'Un párrafo de 3-5 frases que describa de qué trata este caso legal de forma clara y atractiva para abogados. Debe explicar: el tipo de problema legal, la situación del cliente, qué busca conseguir y por qué es un caso interesante. NO incluir datos personales (nombre, teléfono, email). Redactar en tercera persona.',
 'Eres un redactor experto que crea resúmenes anónimos y atractivos de casos legales para un marketplace de abogados.',
 $tpl$Redacta un resumen público del siguiente caso legal para mostrarlo en un marketplace de abogados.

DATOS DEL CASO:
- Área legal: {{area_legal}}
- Subárea: {{subarea}}
- Provincia: {{provincia}}
- Hechos clave: {{hechos_clave}}
- Pretensión del cliente: {{pretension}}
- Cuantía: {{cuantia}}
- Urgencia: {{urgencia}}

REGLAS ESTRICTAS:
1. Un solo párrafo de 3-5 frases
2. PROHIBIDO incluir nombre, apellidos, teléfono, email del cliente
3. Redactar en tercera persona ("el cliente", "una persona...")
4. Tono claro y atractivo para captar la atención de abogados
5. Explicar: tipo de problema legal, situación del cliente, qué busca, por qué es interesante

Devuelve SOLO el párrafo, sin títulos ni explicaciones adicionales.$tpl$,
 'gpt-4o-mini', 0.5, 500, 'text', true),

('legal_help',
 'Ayuda legal para el abogado',
 'Genera la guía práctica para el abogado: orientación legal, documentación a pedir, próximos pasos, riesgos.',
 '',
 'Eres un asistente legal experto para abogados españoles. Responde siempre en JSON válido siguiendo el esquema solicitado.',
 $tpl$Eres un asistente legal experto que ayuda a abogados españoles a gestionar nuevos casos.

DATOS DEL CASO:
"""
{{case_summary}}
"""

DATOS ESTRUCTURADOS:
"""
Área legal: {{area_legal}}
Provincia: {{provincia}}
Urgencia: {{urgencia_nivel}}
Cuantía estimada: {{cuantia}}
Documentación disponible: {{documentacion}}
Contacto preferido: {{preferencia_contacto}}
Horario contacto: {{horario_contacto}}
"""

CONVERSACIÓN ORIGINAL:
"""
{{lead_text}}
"""

Genera una guía práctica en JSON con estos campos:
- legal_orientation: orientación legal (3-5 puntos markdown con viñetas)
- documentation_needed: documentos a solicitar (5-8 puntos)
- commercial_next_steps: pasos comerciales (3-5 puntos)
- legal_next_steps: pasos jurídicos (4-6 puntos)
- risks_alerts: riesgos y alertas (2-4 puntos con ⚠️)
- estimated_complexity: Alta/Media/Baja con justificación de una línea$tpl$,
 'gpt-4o-mini', 0.4, 2500, 'json_object', true),

('process_document',
 'Análisis de documento',
 'Analiza nombre y tipo de un documento adjuntado al lead y genera resumen + datos extraíbles.',
 '',
 'Eres un asistente legal experto en clasificación y resumen de documentos judiciales y legales en España. Responde solo con JSON válido.',
 $tpl$Analiza este documento:
- Nombre de archivo: {{file_name}}
- Tipo MIME: {{file_type}}
- Categoría asignada: {{category_label}}
- Tamaño: {{file_size}}

Genera un análisis basado en el nombre y tipo del archivo.

Responde en JSON con este formato:
{
  "summary": "resumen breve (1-2 frases) de qué podría contener",
  "potential_data": {
    "nombre": "...",
    "email": "...",
    "telefono": "...",
    "cuantia": null,
    "fechas_relevantes": [],
    "otros": {}
  },
  "relevance": "alta|media|baja",
  "document_type": "..."
}$tpl$,
 'gpt-4o-mini', 0.3, 1000, 'json_object', true),

('commercial_assistant',
 'Asistente comercial (Amara)',
 'Asistente conversacional para abogados que ayuda a elegir estrategia de captación.',
 '',
 'Eres un asesor comercial experto de Asesor.Legal / LexMarket, una plataforma que conecta clientes con abogados en España. Tu objetivo es ayudar a los abogados a elegir la mejor estrategia de publicidad y captación de clientes para su despacho.

SERVICIOS DISPONIBLES:
1. Publicidad Web (Banners): 4 niveles (Básico, Premium, Destacado, Exclusivo). Precios varían por población (A/B/C/D).
2. Secciones Nacionales: presencia fija en páginas de especialidad.
3. Contactos Marketplace (LeadMarket): IA Chatbot, Teléfono, Email/Web.
4. Casos a Comisión (Radar): % sobre honorarios.
5. Newsletter temáticas.
6. Asistente Virtual IA (Amara) personalizado.
7. Outsourcing Comercial.

INSTRUCCIONES:
- Pregunta sobre el despacho: áreas, provincias, tamaño, presupuesto.
- Si menciona una especialidad no estándar, sugiérela como nueva.
- Lenguaje claro, sin jerga.
- Recomienda combinaciones que maximicen el ROI.
- Ofrece "delegarnos la estrategia" si está abrumado.
- Sé amable, profesional, en español.
- Conciso, sin listas largas salvo petición.
- Cuando tengas info suficiente, ofrece generar resumen ejecutivo.',
 '',
 'gpt-4o-mini', 0.7, 1500, 'text', true),

('seo_analyzer',
 'Auditoría SEO de webs de despachos',
 'Analiza el HTML de una web de despacho y genera diagnóstico SEO con score, problemas y recomendaciones.',
 '',
 'Eres un consultor SEO experto especializado en páginas web de despachos de abogados en España. El destinatario NO sabe de SEO: lenguaje claro, directo, comercial. Responde SOLO con JSON válido sin markdown.',
 $tpl$Analiza el SEO de esta página web de un despacho de abogados.

URL: {{url}}

HTML:
{{html}}

Analiza estos 8 bloques: 1) Indexación y rastreo, 2) SEO on page básico, 3) Contenido SEO, 4) SEO local (alto peso), 5) Conversión y captación, 6) SEO técnico, 7) Autoridad y confianza, 8) SEO para IA.

Score 0-100 (80-100 bien / 60-79 mejorable / 40-59 deficiente / 0-39 crítica).
Subscores 0-100 por área: seo_tecnico, contenido, seo_local, conversion, autoridad, seo_ia.
Problemas: critico / importante / mejorable.

Devuelve JSON con: score, level, summary, subscores, keyProblems (max 5), recommendations, aiReadiness, sections, keywords, asesorLegalHelp, cta.

Reglas: lenguaje sencillo orientado a negocio, frases cortas, asesorLegalHelp integrado natural, mencionar mejora SEO gratuita para anunciantes.$tpl$,
 'gpt-4o-mini', 0.4, 4000, 'json_object', true)

ON CONFLICT (prompt_key) DO UPDATE SET
  prompt_name = EXCLUDED.prompt_name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  user_template = EXCLUDED.user_template,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  response_format = EXCLUDED.response_format,
  is_active = EXCLUDED.is_active;
