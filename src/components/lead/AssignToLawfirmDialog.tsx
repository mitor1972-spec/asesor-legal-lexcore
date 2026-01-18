import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, MapPin, Scale, Loader2 } from 'lucide-react';
import { useLawfirms } from '@/hooks/useLawfirms';
import { useUpdateLead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { useGenerateLegalHelp } from '@/hooks/useLegalHelp';
import { toast } from 'sonner';

interface AssignToLawfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadArea?: string;
  leadProvince?: string;
  onSuccess?: () => void;
}

export function AssignToLawfirmDialog({
  open,
  onOpenChange,
  leadId,
  leadArea,
  leadProvince,
  onSuccess,
}: AssignToLawfirmDialogProps) {
  const { data: lawfirms, isLoading } = useLawfirms();
  const updateLead = useUpdateLead();
  const generateLegalHelp = useGenerateLegalHelp();

  const [search, setSearch] = useState('');
  const [selectedLawfirmId, setSelectedLawfirmId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [generateHelp, setGenerateHelp] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter lawfirms by search and optionally by area/province
  const filteredLawfirms = useMemo(() => {
    if (!lawfirms) return [];
    
    return lawfirms.filter(lf => {
      // Search filter
      const matchesSearch = !search || 
        lf.name.toLowerCase().includes(search.toLowerCase()) ||
        lf.city?.toLowerCase().includes(search.toLowerCase());
      
      // Area filter (optional - show all but highlight matches)
      const matchesArea = !leadArea || 
        !lf.areas_accepted?.length ||
        lf.areas_accepted.includes(leadArea);
      
      // Province filter (optional)
      const matchesProvince = !leadProvince ||
        !lf.provinces_accepted?.length ||
        lf.provinces_accepted.includes(leadProvince);
      
      return matchesSearch && lf.is_active;
    }).sort((a, b) => {
      // Sort by relevance (area match first)
      const aMatchesArea = leadArea && a.areas_accepted?.includes(leadArea);
      const bMatchesArea = leadArea && b.areas_accepted?.includes(leadArea);
      if (aMatchesArea && !bMatchesArea) return -1;
      if (!aMatchesArea && bMatchesArea) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [lawfirms, search, leadArea, leadProvince]);

  const handleAssign = async () => {
    if (!selectedLawfirmId) {
      toast.error('Selecciona un despacho');
      return;
    }

    setIsAssigning(true);
    try {
      // 1. Create the assignment
      const { error: assignError } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: leadId,
          lawfirm_id: selectedLawfirmId,
          firm_status: 'received',
          status_delivery: 'pending',
        });

      if (assignError) throw assignError;

      // 2. Update lead status to "Enviado"
      await updateLead.mutateAsync({
        id: leadId,
        status_internal: 'Enviado',
      });

      // 3. Generate legal help if checked
      if (generateHelp) {
        try {
          await generateLegalHelp.mutateAsync({ leadId });
        } catch (e) {
          console.warn('Could not generate legal help:', e);
        }
      }

      // 4. TODO: Send email notification if checked
      if (sendEmail) {
        // Email sending logic would go here
        console.log('Would send email notification to lawfirm');
      }

      toast.success('Lead asignado correctamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Error al asignar el lead');
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
            Asignar a despacho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar despacho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lawfirm list */}
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
                  const matchesArea = leadArea && lf.areas_accepted?.includes(leadArea);
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
                          </div>
                        </div>
                        {matchesArea && (
                          <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
                            <Scale className="h-3 w-3 mr-1" />
                            Acepta área
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected lawfirm summary */}
          {selectedLawfirm && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p><strong>Seleccionado:</strong> {selectedLawfirm.name}</p>
              {selectedLawfirm.contact_email && (
                <p className="text-muted-foreground">{selectedLawfirm.contact_email}</p>
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="send-email" 
                checked={sendEmail} 
                onCheckedChange={(c) => setSendEmail(!!c)} 
              />
              <Label htmlFor="send-email" className="text-sm">
                Enviar email de notificación al despacho
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="generate-help" 
                checked={generateHelp} 
                onCheckedChange={(c) => setGenerateHelp(!!c)} 
              />
              <Label htmlFor="generate-help" className="text-sm">
                Generar ayuda legal automáticamente
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAssign} 
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
