import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, MapPin, Loader2 } from 'lucide-react';
import { useLawfirms } from '@/hooks/useLawfirms';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onSuccess?: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  leadIds,
  onSuccess,
}: BulkAssignDialogProps) {
  const { data: lawfirms, isLoading } = useLawfirms();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedLawfirmId, setSelectedLawfirmId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const filteredLawfirms = useMemo(() => {
    if (!lawfirms) return [];
    
    return lawfirms.filter(lf => {
      const matchesSearch = !search || 
        lf.name.toLowerCase().includes(search.toLowerCase()) ||
        lf.city?.toLowerCase().includes(search.toLowerCase());
      
      return matchesSearch && lf.is_active;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [lawfirms, search]);

  const handleBulkAssign = async () => {
    if (!selectedLawfirmId) {
      toast.error('Selecciona un despacho');
      return;
    }

    setIsAssigning(true);
    try {
      // Create assignments for all leads
      const assignments = leadIds.map(leadId => ({
        lead_id: leadId,
        lawfirm_id: selectedLawfirmId,
        firm_status: 'received',
        status_delivery: 'pending' as const,
      }));

      const { error: assignError } = await supabase
        .from('lead_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      // Update all leads status to "Enviado"
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status_internal: 'Enviado' })
        .in('id', leadIds);

      if (updateError) throw updateError;

      toast.success(`${leadIds.length} leads asignados correctamente`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Bulk assignment error:', error);
      toast.error('Error al asignar los leads');
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedLawfirm = lawfirms?.find(lf => lf.id === selectedLawfirmId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Asignar {leadIds.length} leads a despacho
          </DialogTitle>
          <DialogDescription>
            Selecciona el despacho al que quieres asignar los leads seleccionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar despacho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[250px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLawfirms.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No se encontraron despachos
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredLawfirms.map((lf) => {
                  const isSelected = selectedLawfirmId === lf.id;
                  
                  return (
                    <button
                      key={lf.id}
                      onClick={() => setSelectedLawfirmId(lf.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{lf.name}</p>
                          <div className="flex items-center gap-2 text-xs mt-0.5 opacity-80">
                            {lf.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lf.city}
                              </span>
                            )}
                            {lf.province && <span>• {lf.province}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedLawfirm && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p><strong>Seleccionado:</strong> {selectedLawfirm.name}</p>
              {selectedLawfirm.contact_email && (
                <p className="text-muted-foreground">{selectedLawfirm.contact_email}</p>
              )}
            </div>
          )}

          <Badge variant="secondary" className="w-full justify-center py-2">
            {leadIds.length} leads serán asignados
          </Badge>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkAssign} 
            disabled={!selectedLawfirmId || isAssigning}
          >
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar asignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
