/**
 * Contact data sanitizer for marketplace views.
 * Ensures no contact info is leaked before purchase, and that the legacy
 * "ficha resumen" template (Buenos días, 1) DATOS CLAVE, …) is normalized
 * into clean commercial copy for lawyers.
 */

const CONTACT_FIELDS = [
  'nombre', 'apellidos', 'name', 'telefono', 'phone',
  'email', 'correo', 'contact_name', 'contact_email', 'contact_phone',
  'direccion',
];

// Field labels considered "contact" (used to strip lines like "Email: …" or "Teléfono: …")
const CONTACT_LABEL_RE =
  /^\s*(?:[-•*]\s*)?(?:nombre(?:\s+y\s+apellidos?)?|apellidos?|tel[eé]fono|tel\.?|m[oó]vil|email|correo(?:\s+electr[oó]nico)?|contacto|preferencia\s+de\s+contacto|dni|nif|direcci[oó]n)\s*[:：][^\n]*$/gim;

/** Masks a phone number */
export function maskPhone(phone: string): string {
  if (!phone || phone.trim() === '') return '*** *** ***';
  return '*** *** ***';
}

/** Masks an email */
export function maskEmail(email: string): string {
  if (!email || email.trim() === '') return '***@***.***';
  return '***@***.***';
}

/** Masks a name */
export function maskName(): string {
  return 'No visible hasta la compra';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Redacts contact information from a text string and cleans up the legacy
 * "ficha resumen" template so the result is a clean, commercial summary.
 */
export function redactContactFromText(
  text: string | null | undefined,
  fields?: Record<string, unknown>,
): string {
  if (!text) return '';

  let redacted = text;

  // Redact email patterns
  redacted = redacted.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, '[email oculto]');

  // Redact Spanish phone patterns
  redacted = redacted.replace(
    /((\+|00)?34[\s.\-/]?)?[6-9]\d{1,2}[\s.\-/]?\d{2,3}[\s.\-/]?\d{2,3}[\s.\-/]?\d{0,2}/g,
    (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 9) return '[teléfono oculto]';
      return match;
    },
  );

  // Redact known contact values from structured fields
  if (fields) {
    const name = String(fields.nombre || fields.name || fields.contact_name || '').trim();
    const apellidos = String(fields.apellidos || '').trim();
    const phone = String(fields.telefono || fields.phone || fields.contact_phone || '').trim();
    const email = String(fields.email || fields.correo || fields.contact_email || '').trim();

    if (name && name.length > 2) {
      redacted = redacted.replace(new RegExp(escapeRegex(name), 'gi'), '[nombre oculto]');
    }
    if (apellidos && apellidos.length > 2) {
      redacted = redacted.replace(new RegExp(escapeRegex(apellidos), 'gi'), '[nombre oculto]');
    }
    if (phone && phone.length > 4) {
      redacted = redacted.replace(new RegExp(escapeRegex(phone), 'gi'), '[teléfono oculto]');
    }
    if (email && email.length > 4) {
      redacted = redacted.replace(new RegExp(escapeRegex(email), 'gi'), '[email oculto]');
    }
  }

  // --- Marketplace cleanup: courtesy intros ---
  redacted = redacted.replace(
    /^\s*(buenos?\s+(d[ií]as|tardes|noches)|estimad[oa]s?[^\n]*|hola[^\n]*)[,.\s]*$/gim,
    '',
  );
  redacted = redacted.replace(/^\s*por\s+medio\s+del\s+presente[^\n]*$/gim, '');
  redacted = redacted.replace(
    /^\s*(les?\s+)?(compart[ií]mos|adjuntamos|remit[ií]mos)[^\n]*ficha[^\n]*$/gim,
    '',
  );

  // --- Strip ALL contact-label lines (with or without value) ---
  redacted = redacted.replace(CONTACT_LABEL_RE, '');

  // Bare placeholder lines
  redacted = redacted.replace(
    /^\s*\[(?:nombre|apellidos?|tel[eé]fono|email)\s+oculto\]\s*$/gim,
    '',
  );

  // --- Strip section headers from the legacy template ---
  // **1) DATOS CLAVE**, **2) HECHOS**, etc. (numbered uppercase sections)
  redacted = redacted.replace(/\*\*\s*\d+\)\s*[A-ZÁÉÍÓÚÑ\s]+\*\*\s*/g, '');
  // "1) DATOS CLAVE" without bold
  redacted = redacted.replace(/^\s*\d+\)\s*[A-ZÁÉÍÓÚÑ\s]{4,}\s*$/gm, '');

  // --- Markdown / decorative cleanup ---
  redacted = redacted.replace(/^[\s_\-=*]{3,}$/gm, '');
  redacted = redacted.replace(/_{3,}/g, '');
  redacted = redacted.replace(/\*\*\s*resumen\s*(?:[–\-—:][^*\n]*)?\*\*\s*/gi, '');
  redacted = redacted.replace(/^\s*resumen\s+[–\-—][^\n]*\n/i, '');

  // --- Cleanup empty bullet/label lines that became "• Campo:" with no value ---
  redacted = redacted.replace(/^\s*[-•*]\s*[A-Za-zÁÉÍÓÚÑáéíóúñ\s]{1,40}:\s*$/gm, '');
  // Leftover lone bullets
  redacted = redacted.replace(/^\s*[-•*]\s*$/gm, '');

  // Collapse whitespace
  redacted = redacted.replace(/[ \t]+\n/g, '\n');
  redacted = redacted.replace(/\n{3,}/g, '\n\n').trim();

  return redacted;
}

/**
 * Extract a named section from the legacy structured "ficha resumen".
 * Supports patterns like "**3) HECHOS**", "Hechos clave:", "• Pretensión: …".
 */
export function extractSection(
  summary: string | null | undefined,
  sectionNames: string[],
): string | null {
  if (!summary) return null;

  for (const name of sectionNames) {
    const escaped = escapeRegex(name);

    // Pattern A: **N) NAME** ... up to next **N) or end
    const reBold = new RegExp(
      `\\*\\*\\s*\\d+\\)\\s*${escaped}[^*]*\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*\\s*\\d+\\)|$)`,
      'i',
    );
    const mBold = summary.match(reBold);
    if (mBold && mBold[1]) {
      const cleaned = mBold[1].trim();
      if (cleaned.length > 5) return cleaned;
    }

    // Pattern B: "Name:" inline single line (or bullet "• Name: …")
    const reInline = new RegExp(`(?:^|\\n)\\s*(?:[-•*]\\s*)?${escaped}\\s*:\\s*([^\\n]+)`, 'i');
    const mInline = summary.match(reInline);
    if (mInline && mInline[1]) {
      const cleaned = mInline[1].trim();
      if (cleaned.length > 3) return cleaned;
    }
  }
  return null;
}

/**
 * Pulls a short commercial excerpt from a (possibly legacy) summary, suitable
 * for marketplace cards. Tries semantic sections first, then falls back to the
 * first useful redacted lines.
 */
export function extractCommercialExcerpt(
  rawSummary: string | null | undefined,
  fields?: Record<string, unknown>,
  maxLen = 220,
): string {
  if (!rawSummary) return '';

  // Try meaningful sections in order of commercial value
  const candidates =
    extractSection(rawSummary, ['Breve resumen', 'Resumen del caso', 'Resumen']) ||
    extractSection(rawSummary, ['Pretensión del cliente', 'Pretensión', 'Objetivo del cliente']) ||
    extractSection(rawSummary, ['Hechos clave', 'Hechos', 'Hechos relevantes']) ||
    extractSection(rawSummary, ['Tipo de caso', 'Consulta del cliente']);

  let text = candidates ? candidates : redactContactFromText(rawSummary, fields);
  if (candidates) {
    // Still redact any contact info that may slip into the section
    text = redactContactFromText(text, fields);
  }

  // Flatten newlines into spaces for the card excerpt
  text = text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text;
}

/** Checks if a field key is a contact field that should be hidden */
export function isContactField(key: string): boolean {
  return CONTACT_FIELDS.includes(key.toLowerCase());
}

/**
 * Lexcore scoring groups (display config). Aliases handle backend variations
 * where the same concept has been stored under different keys over time.
 */
export const LEXCORE_SCORING_GROUPS = [
  { key: 'contactability', label: 'Contactabilidad', max: 8, aliases: ['contactabilidad'] },
  { key: 'intent', label: 'Intención', max: 20, aliases: ['intention', 'intencion'] },
  { key: 'urgency', label: 'Urgencia', max: 10, aliases: ['urgencia'] },
  { key: 'case_quality', label: 'Caso definido/accionable', max: 25, aliases: ['case', 'caso'] },
  { key: 'evidence', label: 'Evidencia/Documentación', max: 10, aliases: ['evidencia'] },
  { key: 'clarity', label: 'Claridad', max: 10, aliases: ['claridad'] },
] as const;

export type LexcoreGroup = (typeof LEXCORE_SCORING_GROUPS)[number];

/**
 * Resolves a group score from a `raw_scores` payload that may use:
 *  - flat numbers:  { case: 18, intent: 0 }
 *  - objects:       { case_quality: { score: 18, max: 25, breakdown: '…' } }
 *  - alias keys:    case vs case_quality, intent vs intention, etc.
 */
export function getGroupScore(
  rawScores: Record<string, unknown> | null | undefined,
  group: LexcoreGroup,
): { score: number; max: number; breakdown?: string } | null {
  if (!rawScores) return null;
  const candidates = [group.key, ...group.aliases];
  for (const k of candidates) {
    const v = rawScores[k];
    if (v == null) continue;
    if (typeof v === 'number') {
      return { score: v, max: group.max };
    }
    if (typeof v === 'object') {
      const obj = v as { score?: number; max?: number; breakdown?: string };
      if (typeof obj.score === 'number') {
        return {
          score: obj.score,
          max: typeof obj.max === 'number' ? obj.max : group.max,
          breakdown: obj.breakdown,
        };
      }
    }
  }
  return null;
}

/** True when at least one group has a numeric score (>0 or 0 with explicit data). */
export function hasAnyScoring(rawScores: Record<string, unknown> | null | undefined): boolean {
  if (!rawScores || typeof rawScores !== 'object') return false;
  return LEXCORE_SCORING_GROUPS.some((g) => getGroupScore(rawScores, g) !== null);
}
