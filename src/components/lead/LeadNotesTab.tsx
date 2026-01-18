import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2, Save, Trash2, MessageSquare } from 'lucide-react';

interface LeadNote {
  id: string;
  action: string;
  details: {
    note?: string;
    author_name?: string;
  };
  created_at: string;
  user_id: string | null;
}

interface LeadNotesTabProps {
  leadId: string;
}

export function LeadNotesTab({ leadId }: LeadNotesTabProps) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');

  // Fetch notes from lead_history where action = 'note_added'
  const { data: notes, isLoading } = useQuery({
    queryKey: ['lead-notes', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', leadId)
        .eq('action', 'note_added')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadNote[];
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('lead_history')
        .insert({
          lead_id: leadId,
          user_id: user?.id,
          action: 'note_added',
          details: {
            note: noteText,
            author_name: user?.profile?.full_name || user?.email || 'Usuario',
          },
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', leadId] });
      setNewNote('');
      toast.success('Nota guardada');
    },
    onError: () => {
      toast.error('Error al guardar la nota');
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('lead_history')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', leadId] });
      toast.success('Nota eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar la nota');
    },
  });

  const handleSaveNote = () => {
    if (!newNote.trim()) {
      toast.error('Escribe una nota primero');
      return;
    }
    addNoteMutation.mutate(newNote.trim());
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-3.5 w-3.5" />
          Notas internas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-2 px-3">
        {/* New note input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escribe una nota..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button 
            size="sm" 
            onClick={handleSaveNote}
            disabled={addNoteMutation.isPending || !newNote.trim()}
          >
            {addNoteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar nota
          </Button>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes?.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            Sin notas
          </p>
        ) : (
          <div className="space-y-3">
            {notes?.map((note) => (
              <div 
                key={note.id} 
                className="border rounded-lg p-3 bg-muted/30 group relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      📝 {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: es })} — {note.details?.author_name || 'Usuario'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      "{note.details?.note}"
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
