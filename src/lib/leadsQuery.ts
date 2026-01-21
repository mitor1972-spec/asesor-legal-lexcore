/**
 * Central lead query configuration to ensure consistency across
 * Dashboard, Leads list, and Marketplace views.
 * 
 * GOLDEN RULE - A lead is VALID only if it has:
 * - email IS NOT NULL OR phone IS NOT NULL (at least one contact method)
 * 
 * VISIBLE LEADS = leads WHERE:
 * - archived_at IS NULL
 * - deleted_at IS NULL (when column exists)
 * - (email IS NOT NULL OR phone IS NOT NULL)
 * - structured_fields->_incomplete IS NULL OR FALSE
 */

import { supabase } from '@/integrations/supabase/client';

export interface VisibleLeadsOptions {
  includeIncomplete?: boolean; // Include leads marked as _incomplete
  includeArchived?: boolean;   // Include archived leads
  includeInvalid?: boolean;    // Include leads without email/phone (for debugging only)
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  channel?: string;
  areaLegal?: string;
  search?: string;
  unassignedOnly?: boolean;    // For LeadMarket: only show unassigned leads
}

/**
 * GOLDEN RULE: Check if lead has valid contact (email OR phone)
 * This is the filter that determines if a lead is "sellable"
 */
export function getValidContactFilter(): string {
  // Lead must have email OR phone in structured_fields
  return 'structured_fields->>email.neq.,structured_fields->>telefono.neq.';
}

/**
 * Applies the standard "visible leads" filters to a query.
 * This ensures Dashboard, Leads list, and Marketplace use the same base criteria.
 * 
 * CRITICAL: All commercial views MUST use this function to ensure consistency.
 */
export function applyVisibleLeadsFilters(
  query: any,
  options: VisibleLeadsOptions = {}
): any {
  // CRITICAL: Always exclude discarded leads from operational views
  // Discarded leads go to Settings > Leads Descartados
  if (!options.includeInvalid) {
    query = query.is('discarded_at', null);
  }

  // Filter archived leads
  if (options.includeArchived) {
    query = query.not('archived_at', 'is', null);
  } else {
    query = query.is('archived_at', null);
  }

  // Filter incomplete leads (unless explicitly included or viewing archived)
  if (!options.includeIncomplete && !options.includeArchived) {
    query = query.or('structured_fields->_incomplete.is.null,structured_fields->_incomplete.eq.false');
  }

  // GOLDEN RULE: Filter out leads without valid contact (email OR phone)
  // Unless explicitly including invalid leads (for debugging/admin purposes)
  if (!options.includeInvalid && !options.includeArchived) {
    // Must have either email or phone that is not null/empty
    query = query.or(
      'structured_fields->>email.neq.,structured_fields->>telefono.neq.'
    );
  }

  // Date filters
  if (options.dateFrom) {
    query = query.gte('created_at', options.dateFrom.toISOString());
  }
  if (options.dateTo) {
    query = query.lte('created_at', options.dateTo.toISOString());
  }

  // Status filter
  if (options.status) {
    query = query.eq('status_internal', options.status);
  }

  // Channel filter
  if (options.channel) {
    query = query.eq('source_channel', options.channel);
  }

  // Area legal filter
  if (options.areaLegal) {
    query = query.contains('structured_fields', { area_legal: options.areaLegal });
  }

  // Search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase();
    query = query.or(
      `lead_text.ilike.%${searchTerm}%,structured_fields->>nombre.ilike.%${searchTerm}%,structured_fields->>apellidos.ilike.%${searchTerm}%,structured_fields->>email.ilike.%${searchTerm}%,structured_fields->>telefono.ilike.%${searchTerm}%,structured_fields->>area_legal.ilike.%${searchTerm}%,structured_fields->>ciudad.ilike.%${searchTerm}%,structured_fields->>provincia.ilike.%${searchTerm}%,structured_fields->>_contact_alias.ilike.%${searchTerm}%`
    );
  }

  return query;
}

/**
 * Creates a base query for visible leads with standard filters applied
 */
export function createVisibleLeadsQuery(options: VisibleLeadsOptions = {}) {
  let query = supabase.from('leads').select('*', { count: 'exact' });
  return applyVisibleLeadsFilters(query, options);
}

/**
 * Checks if a lead has valid contact info (email OR phone)
 * Used for client-side validation
 */
export function hasValidContact(structuredFields: Record<string, unknown> | null): boolean {
  if (!structuredFields) return false;
  
  const email = structuredFields.email as string | null | undefined;
  const phone = structuredFields.telefono as string | null | undefined;
  
  const hasEmail = email && email.trim() !== '' && email !== 'null';
  const hasPhone = phone && phone.trim() !== '' && phone !== 'null';
  
  return hasEmail || hasPhone;
}

/**
 * Returns display-safe value for contact fields
 * Returns empty string if value is null/undefined/"No consta"
 * NEVER returns placeholder text - empty fields should be visually empty
 */
export function getContactValue(value: string | null | undefined): string {
  if (!value || value.trim() === '' || value === 'null' || value === 'No consta' || value === 'Sin nombre') {
    return '';
  }
  return value.trim();
}

/**
 * Logs lead counts for debugging/verification
 */
export async function logLeadCounts(context: string, options: VisibleLeadsOptions = {}) {
  try {
    // Base visible leads count
    let baseQuery = supabase.from('leads').select('id', { count: 'exact', head: true });
    baseQuery = applyVisibleLeadsFilters(baseQuery, options);
    const { count: baseCount } = await baseQuery;

    // Log for debugging
    console.log(`[${context}] Lead counts with filters:`, {
      ...options,
      visibleLeads: baseCount
    });

    return baseCount || 0;
  } catch (error) {
    console.error(`[${context}] Error counting leads:`, error);
    return 0;
  }
}
