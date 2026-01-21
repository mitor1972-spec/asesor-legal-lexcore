/**
 * Utility functions for handling contact information
 * Separates Chatwoot aliases from real human names
 */

// Regex to detect Chatwoot auto-generated aliases like "billowing-silence-429"
const CHATWOOT_ALIAS_REGEX = /^[a-z]+-[a-z]+-\d+$/i;

/**
 * Check if a name looks like a Chatwoot auto-generated alias
 * Examples: billowing-silence-429, floral-surf-101, weathered-leaf-375
 */
export function isChatwootAlias(name: string | null | undefined): boolean {
  if (!name || name.trim() === '') return false;
  return CHATWOOT_ALIAS_REGEX.test(name.trim());
}

/**
 * Get the real name from structured fields, excluding Chatwoot aliases
 * Returns null if only an alias is present
 */
export function getRealName(structuredFields: Record<string, unknown> | null | undefined): string | null {
  if (!structuredFields) return null;
  
  // Try nombre first (AI-extracted name)
  const nombre = structuredFields.nombre as string | undefined;
  if (nombre && nombre.trim() && !isChatwootAlias(nombre)) {
    return nombre.trim();
  }
  
  // Try contact_name (may be from Chatwoot)
  const contactName = structuredFields.contact_name as string | undefined;
  if (contactName && contactName.trim() && !isChatwootAlias(contactName)) {
    return contactName.trim();
  }
  
  return null;
}

/**
 * Get the full display name including apellidos (surname)
 * Returns "No consta" if no real name is available
 */
export function getDisplayName(structuredFields: Record<string, unknown> | null | undefined): string {
  const nombre = getRealName(structuredFields);
  if (!nombre) return 'No consta';
  
  const apellidos = structuredFields?.apellidos as string | undefined;
  if (apellidos && apellidos.trim()) {
    return `${nombre} ${apellidos.trim()}`;
  }
  
  return nombre;
}

/**
 * Get the Chatwoot alias from structured fields (for display as ID)
 */
export function getChatwootAlias(structuredFields: Record<string, unknown> | null | undefined): string | null {
  if (!structuredFields) return null;
  
  // Check explicit alias field first
  const alias = structuredFields._contact_alias as string | undefined;
  if (alias && alias.trim()) {
    return alias.trim();
  }
  
  // Check if contact_name is an alias
  const contactName = structuredFields.contact_name as string | undefined;
  if (contactName && isChatwootAlias(contactName)) {
    return contactName.trim();
  }
  
  // Check if nombre is an alias (shouldn't be, but for safety)
  const nombre = structuredFields.nombre as string | undefined;
  if (nombre && isChatwootAlias(nombre)) {
    return nombre.trim();
  }
  
  return null;
}

/**
 * Get contact email, trying multiple field names
 */
export function getContactEmail(structuredFields: Record<string, unknown> | null | undefined): string | null {
  if (!structuredFields) return null;
  
  const email = (structuredFields.email as string) || (structuredFields.contact_email as string);
  return email && email.trim() ? email.trim() : null;
}

/**
 * Get contact phone, trying multiple field names
 */
export function getContactPhone(structuredFields: Record<string, unknown> | null | undefined): string | null {
  if (!structuredFields) return null;
  
  const phone = (structuredFields.telefono as string) || (structuredFields.contact_phone as string);
  return phone && phone.trim() ? phone.trim() : null;
}
