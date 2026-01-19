/**
 * Central lead query configuration to ensure consistency across
 * Dashboard, Leads list, and Marketplace views.
 * 
 * VISIBLE LEADS = leads WHERE:
 * - archived_at IS NULL
 * - structured_fields->_incomplete IS NULL OR FALSE
 */

import { supabase } from '@/integrations/supabase/client';

export interface VisibleLeadsOptions {
  includeIncomplete?: boolean; // Include leads marked as _incomplete
  includeArchived?: boolean;   // Include archived leads
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  channel?: string;
  areaLegal?: string;
  search?: string;
}

/**
 * Applies the standard "visible leads" filters to a query.
 * This ensures Dashboard, Leads list, and Marketplace use the same base criteria.
 */
export function applyVisibleLeadsFilters(
  query: any,
  options: VisibleLeadsOptions = {}
): any {
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
      `lead_text.ilike.%${searchTerm}%,structured_fields->>nombre.ilike.%${searchTerm}%,structured_fields->>apellidos.ilike.%${searchTerm}%,structured_fields->>email.ilike.%${searchTerm}%,structured_fields->>telefono.ilike.%${searchTerm}%,structured_fields->>area_legal.ilike.%${searchTerm}%,structured_fields->>ciudad.ilike.%${searchTerm}%,structured_fields->>provincia.ilike.%${searchTerm}%`
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
