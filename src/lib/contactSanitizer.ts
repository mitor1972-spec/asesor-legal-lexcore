/**
 * Contact data sanitizer for marketplace views.
 * Ensures no contact info is leaked before purchase.
 */

const CONTACT_FIELDS = ['nombre', 'apellidos', 'name', 'telefono', 'phone', 'email', 'correo', 'contact_name', 'contact_email', 'contact_phone', 'direccion'];

/**
 * Masks a phone number: "*** *** ***"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.trim() === '') return '*** *** ***';
  return '*** *** ***';
}

/**
 * Masks an email: "***@***.***"
 */
export function maskEmail(email: string): string {
  if (!email || email.trim() === '') return '***@***.***';
  return '***@***.***';
}

/**
 * Masks a name
 */
export function maskName(): string {
  return 'No visible hasta la compra';
}

/**
 * Redacts contact information from a text string.
 * Removes names, phone numbers, and email addresses from summaries.
 */
export function redactContactFromText(text: string | null | undefined, fields?: Record<string, unknown>): string {
  if (!text) return '';
  
  let redacted = text;
  
  // Redact email patterns
  redacted = redacted.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, '[email oculto]');
  
  // Redact phone patterns (Spanish format - comprehensive)
  // +34, 0034, 34 prefixes with various separators
  redacted = redacted.replace(/((\+|00)?34[\s.\-/]?)?[6-9]\d{1,2}[\s.\-/]?\d{2,3}[\s.\-/]?\d{2,3}[\s.\-/]?\d{0,2}/g, (match) => {
    // Only redact if it looks like a real phone (8+ digits)
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 9) return '[teléfono oculto]';
    return match;
  });
  
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
      redacted = redacted.replace(new RegExp(escapeRegex(apellidos), 'gi'), '[apellidos oculto]');
    }
    if (phone && phone.length > 4) {
      redacted = redacted.replace(new RegExp(escapeRegex(phone), 'gi'), '[teléfono oculto]');
    }
    if (email && email.length > 4) {
      redacted = redacted.replace(new RegExp(escapeRegex(email), 'gi'), '[email oculto]');
    }
  }
  
  return redacted;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a field key is a contact field that should be hidden
 */
export function isContactField(key: string): boolean {
  return CONTACT_FIELDS.includes(key.toLowerCase());
}

/**
 * Returns the correct Lexcore scoring groups based on actual configuration
 */
export const LEXCORE_SCORING_GROUPS = [
  { key: 'contactability', label: 'Contactabilidad', max: 8 },
  { key: 'intent', label: 'Intención', max: 20 },
  { key: 'urgency', label: 'Urgencia', max: 10 },
  { key: 'case_quality', label: 'Caso definido/accionable', max: 25 },
  { key: 'evidence', label: 'Evidencia/Documentación', max: 10 },
  { key: 'clarity', label: 'Claridad', max: 10 },
] as const;
