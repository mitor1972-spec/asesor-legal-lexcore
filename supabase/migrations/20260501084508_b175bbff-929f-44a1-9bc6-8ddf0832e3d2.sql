
-- 1. Add client_note column to case_documents
ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS client_note text;

-- 2. Insert AI prompts (idempotent via ON CONFLICT)
INSERT INTO public.ai_prompts (prompt_key, prompt_name, description, model, temperature, max_tokens, response_format, system_prompt, user_template, prompt_text, is_active)
VALUES
(
  'analyze_case_deep',
  'Análisis jurídico profundo del caso',
  'Genera un informe estructurado con viabilidad, puntos fuertes/débiles, riesgos, estrategia y próximos pasos.',
  'gpt-4o-mini',
  0.3,
  3500,
  'text',
  'Eres un abogado senior español con experiencia en todas las ramas del derecho. Analizas casos con rigor jurídico, criterio práctico y orientación a resultados. Respondes siempre en español, con estructura clara, marcando claramente cada sección.',
  'Analiza el siguiente caso y proporciona un INFORME JURÍDICO PROFESIONAL.

DATOS ESTRUCTURADOS DEL CASO:
{{structured_fields}}

RESUMEN / NARRATIVA:
{{case_summary}}

DOCUMENTOS DISPONIBLES:
{{documents_list}}

PROPORCIONA OBLIGATORIAMENTE las siguientes secciones, separadas por encabezados en MAYÚSCULAS:

1. RESUMEN JURÍDICO (2-3 párrafos)
2. VIABILIDAD (alta/media/baja con justificación)
3. PUNTOS FUERTES (lista numerada)
4. PUNTOS DÉBILES (lista numerada)
5. RIESGOS (cada riesgo con probabilidad e impacto)
6. DOCUMENTACIÓN PENDIENTE (qué falta para reforzar el caso)
7. ESTRATEGIA RECOMENDADA (judicial, extrajudicial, negociación...)
8. PLAZOS RELEVANTES (prescripción, caducidad, plazos procesales)
9. CUANTÍA ESTIMADA (si procede)
10. PRÓXIMOS PASOS INMEDIATOS (3-5 acciones concretas)
11. CHECKLIST OPERATIVO PARA EL ABOGADO
12. POSIBLES ARGUMENTOS JURÍDICOS
13. JURISPRUDENCIA ORIENTATIVA (si conoces casos similares relevantes)

Sé específico, profesional y práctico.',
  '',
  true
),
(
  'validate_case_documents',
  'Validación documental del caso',
  'Revisa la documentación aportada en un caso y detecta qué falta, qué está validado y qué tiene incidencias.',
  'gpt-4o-mini',
  0.2,
  2500,
  'json_object',
  'Eres un abogado experto en gestión documental de casos legales en España. Tu tarea es revisar la documentación aportada en un expediente y determinar qué documentos están completos, cuáles faltan típicamente para ese tipo de caso, y cuáles presentan problemas. Respondes siempre en JSON estricto.',
  'Revisa la documentación de este caso:

ÁREA LEGAL: {{area_legal}}
SUBÁREA: {{subarea}}
RESUMEN DEL CASO: {{case_summary}}

DOCUMENTOS APORTADOS:
{{documents_list}}

Devuelve un JSON con esta estructura exacta:
{
  "validated": [{"file_name": "...", "reason": "por qué es válido y útil"}],
  "issues": [{"file_name": "...", "issue": "descripción del problema"}],
  "missing": ["lista de tipos de documento típicamente necesarios para este tipo de caso que NO están aportados"],
  "completeness_score": 0-100,
  "recommendation": "recomendación final del experto en 2-3 frases"
}',
  '',
  true
),
(
  'generate_legal_document',
  'Generación de documentos legales',
  'Genera borradores profesionales de documentos jurídicos: hoja de encargo, burofax, demanda, escritos administrativos y emails al cliente.',
  'gpt-4o-mini',
  0.4,
  3500,
  'text',
  'Eres un abogado español con amplia experiencia redactando documentos jurídicos. Generas borradores profesionales, formales y técnicamente correctos siguiendo los usos forenses españoles. Tus borradores siempre llevan la advertencia [REVISAR Y COMPLETAR POR EL LETRADO] en los datos que faltan.',
  'Genera un borrador del siguiente documento legal:

TIPO DE DOCUMENTO: {{document_type}}

DATOS DEL CASO:
- Cliente: {{client_name}}
- Documento identidad: {{client_dni}}
- Dirección: {{client_address}}
- Teléfono: {{client_phone}}
- Email: {{client_email}}
- Área legal: {{area_legal}}
- Cuantía: {{cuantia}}

DESPACHO:
- Nombre: {{firm_name}}
- Dirección: {{firm_address}}

RESUMEN DEL CASO:
{{case_summary}}

INSTRUCCIONES POR TIPO:
- engagement_letter (Hoja de encargo): incluye objeto, honorarios, provisión de fondos, deberes de las partes, desistimiento, RGPD, jurisdicción.
- burofax: formato burofax con texto a comunicar, formal, contundente, con plazo de respuesta.
- demanda: estructura procesal española (encabezamiento, hechos numerados, fundamentos de derecho, súplica, otrosíes, fecha y firma).
- escrito_admin: escrito a administración pública con encabezamiento, exposición numerada, solicito, fecha y firma.
- email_cliente: email profesional al cliente, formal pero cercano.

Sustituye datos faltantes por [REVISAR: campo]. Devuelve solo el texto del documento, sin comentarios adicionales.',
  '',
  true
)
ON CONFLICT (prompt_key) DO NOTHING;
