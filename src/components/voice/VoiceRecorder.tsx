import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoiceNotes, useCreateVoiceNote, useDeleteVoiceNote } from '@/hooks/useVoiceNotes';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  leadId: string;
}

export function VoiceRecorder({ leadId }: VoiceRecorderProps) {
  const { data: voiceNotes, isLoading } = useVoiceNotes(leadId);
  const createMutation = useCreateVoiceNote();
  const deleteMutation = useDeleteVoiceNote();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        try {
          await createMutation.mutateAsync({
            leadId,
            audioBlob,
            durationSeconds: recordingTime,
          });
          toast.success('Nota de voz guardada');
        } catch (error) {
          toast.error('Error al guardar la nota de voz');
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = (url: string, id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (playingId === id) {
      setPlayingId(null);
      return;
    }

    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setPlayingId(null);
    audioRef.current.play();
    setPlayingId(id);
  };

  const deleteNote = async (id: string, audioUrl: string) => {
    if (!confirm('¿Eliminar esta nota de voz?')) return;
    
    try {
      await deleteMutation.mutateAsync({ id, leadId, audioUrl });
      toast.success('Nota eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mic className="h-3.5 w-3.5" />
          Notas de Voz
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 space-y-3">
        {/* Recording button */}
        <div className="flex items-center gap-3">
          {isRecording ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopRecording}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Detener
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
                <span className="font-mono">{formatDuration(recordingTime)}</span>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startRecording}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              Grabar nota de voz
            </Button>
          )}
        </div>

        {/* Voice notes list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : voiceNotes && voiceNotes.length > 0 ? (
          <div className="space-y-2">
            {voiceNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => playAudio(note.audio_url, note.id)}
                  >
                    {playingId === note.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="text-sm">
                    <p className="font-medium">
                      {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      {note.duration_seconds && (
                        <span className="ml-2 text-muted-foreground">
                          ({formatDuration(note.duration_seconds)})
                        </span>
                      )}
                    </p>
                    {note.user?.full_name && (
                      <p className="text-xs text-muted-foreground">{note.user.full_name}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteNote(note.id, note.audio_url)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Sin notas de voz
          </p>
        )}
      </CardContent>
    </Card>
  );
}
