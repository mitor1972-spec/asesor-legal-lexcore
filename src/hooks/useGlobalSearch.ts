import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  type: 'lead' | 'lawfirm';
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchTerm = `%${query}%`;

      // Search leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, created_at, structured_fields, score_final')
        .or(`lead_text.ilike.${searchTerm}`)
        .limit(5);

      // Search lawfirms
      const { data: lawfirms } = await supabase
        .from('lawfirms')
        .select('id, name, city, province')
        .or(`name.ilike.${searchTerm},city.ilike.${searchTerm}`)
        .limit(5);

      const leadResults: SearchResult[] = (leads || []).map((lead) => {
        const f = lead.structured_fields as Record<string, unknown> | null;
        const nombre = (f?.nombre as string) || '';
        const apellidos = (f?.apellidos as string) || '';
        const area = (f?.area_legal as string) || 'Sin área';

        return {
          type: 'lead' as const,
          id: lead.id,
          title: `${nombre} ${apellidos}`.trim() || `Lead #${lead.id.slice(0, 8)}`,
          subtitle: `${area} - Score: ${lead.score_final || 'N/A'}`,
          link: `/leads/${lead.id}`,
        };
      });

      const lawfirmResults: SearchResult[] = (lawfirms || []).map((lawfirm) => ({
        type: 'lawfirm' as const,
        id: lawfirm.id,
        title: lawfirm.name,
        subtitle: [lawfirm.city, lawfirm.province].filter(Boolean).join(', ') || 'Sin ubicación',
        link: `/settings/lawfirms/${lawfirm.id}`,
      }));

      setResults([...leadResults, ...lawfirmResults]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { search, results, isSearching };
}
