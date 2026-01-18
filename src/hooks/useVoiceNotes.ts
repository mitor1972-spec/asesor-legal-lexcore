import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface VoiceNote {
  id: string;
  lead_id: string;
  user_id: string | null;
  lawfirm_id: string | null;
  audio_url: string;
  duration_seconds: number | null;
  transcription: string | null;
  is_internal: boolean | null;
  created_at: string;
  user?: {
    full_name: string | null;
  };
}

export function useVoiceNotes(leadId: string | undefined) {
  return useQuery({
    queryKey: ['voice-notes', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('voice_notes')
        .select(`
          *,
          user:profiles!voice_notes_user_id_fkey(full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VoiceNote[];
    },
    enabled: !!leadId,
  });
}

export function useCreateVoiceNote() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      leadId,
      audioBlob,
      durationSeconds,
    }: {
      leadId: string;
      audioBlob: Blob;
      durationSeconds: number;
    }) => {
      const filename = `${leadId}/${Date.now()}.webm`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(filename, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(uploadData.path);

      // Save to database
      const { error: dbError } = await supabase.from('voice_notes').insert({
        lead_id: leadId,
        user_id: user?.id,
        lawfirm_id: user?.profile?.lawfirm_id || null,
        audio_url: urlData.publicUrl,
        duration_seconds: durationSeconds,
        is_internal: !user?.profile?.lawfirm_id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['voice-notes', leadId] });
    },
  });
}

export function useDeleteVoiceNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leadId, audioUrl }: { id: string; leadId: string; audioUrl: string }) => {
      // Extract path from URL
      const url = new URL(audioUrl);
      const path = url.pathname.split('/voice-notes/')[1];

      if (path) {
        // Delete from storage
        await supabase.storage.from('voice-notes').remove([path]);
      }

      // Delete from database
      const { error } = await supabase.from('voice_notes').delete().eq('id', id);
      if (error) throw error;

      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['voice-notes', leadId] });
    },
  });
}
