import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface CleanupSummary {
  total_leads_reviewed: number;
  empty_leads_found: number;
  leads_updated: number;
  leads_deleted: number;
  leads_marked_incomplete: number;
  leads_deduplicated: number;
}

interface CleanupResult {
  success: boolean;
  dry_run: boolean;
  summary: CleanupSummary;
  details: Array<{
    lead_id: string;
    action: string;
    reason: string;
    conversation_id?: number;
  }>;
}

export function useCleanupLeads() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const queryClient = useQueryClient();

  const runCleanup = async (dryRun: boolean = true, deleteEmpty: boolean = false) => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('repair-leads', {
        body: { dry_run: dryRun, delete_empty: deleteEmpty },
      });

      if (error) throw error;

      setResult(data as CleanupResult);
      
      // Invalidate leads queries to refresh the list
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      }

      return data as CleanupResult;
    } catch (err) {
      console.error('Cleanup error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runCleanup,
    isLoading,
    result,
    clearResult: () => setResult(null),
  };
}
