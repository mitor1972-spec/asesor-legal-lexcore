import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Euro, 
  Calculator, 
  TrendingUp, 
  CheckCircle2, 
  Edit2,
  Save,
  X,
  Receipt,
  Percent,
  Coins
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface CaseEconomics {
  lead_cost: number | null;
  client_fee: number | null;
  success_percentage: number | null;
  claimed_amount: number | null;
  fee_accepted_at: string | null;
  won_amount: number | null;
  won_percentage: number | null;
}

interface CaseEconomicsSectionProps {
  assignmentId: string;
  leadPrice: number | null;
  firmStatus: string;
  initialData?: Partial<CaseEconomics>;
}

export function CaseEconomicsSection({ 
  assignmentId, 
  leadPrice, 
  firmStatus,
  initialData 
}: CaseEconomicsSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [economics, setEconomics] = useState<CaseEconomics>({
    lead_cost: initialData?.lead_cost ?? leadPrice ?? null,
    client_fee: initialData?.client_fee ?? null,
    success_percentage: initialData?.success_percentage ?? null,
    claimed_amount: initialData?.claimed_amount ?? null,
    fee_accepted_at: initialData?.fee_accepted_at ?? null,
    won_amount: initialData?.won_amount ?? null,
    won_percentage: initialData?.won_percentage ?? null,
  });

  const isWon = firmStatus === 'won';
  const isAccepted = !!economics.fee_accepted_at;

  // Calculate totals
  const totalOwed = (economics.lead_cost || 0) + (economics.client_fee || 0);
  const successFeeAmount = economics.won_amount && economics.success_percentage 
    ? (economics.won_amount * economics.success_percentage / 100) 
    : 0;
  const totalEarned = isWon ? (economics.client_fee || 0) + successFeeAmount : 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('lead_assignments')
        .update({
          lead_cost: economics.lead_cost,
          client_fee: economics.client_fee,
          success_percentage: economics.success_percentage,
          claimed_amount: economics.claimed_amount,
          fee_accepted_at: economics.fee_accepted_at,
          won_amount: economics.won_amount,
          won_percentage: economics.won_percentage,
        })
        .eq('id', assignmentId);

      if (error) throw error;
      
      toast.success('Datos económicos guardados');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['lawfirm-cases'] });
    } catch (error) {
      console.error('Error saving economics:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptFee = async () => {
    const now = new Date().toISOString();
    setEconomics(prev => ({ ...prev, fee_accepted_at: now }));
    
    try {
      const { error } = await supabase
        .from('lead_assignments')
        .update({ 
          fee_accepted_at: now,
          client_fee: economics.client_fee,
        })
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Minuta aceptada por el cliente');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-case', assignmentId] });
    } catch (error) {
      console.error('Error accepting fee:', error);
      toast.error('Error al registrar aceptación');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Euro className="h-5 w-5 text-primary" />
          Economía del Caso
        </CardTitle>
        
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Costs Section */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Coste del Lead (Lexcore)
            </Label>
            {isEditing ? (
              <Input
                type="number"
                value={economics.lead_cost || ''}
                onChange={(e) => setEconomics(prev => ({ 
                  ...prev, 
                  lead_cost: e.target.value ? parseFloat(e.target.value) : null 
                }))}
                placeholder="0"
                className="mt-1"
              />
            ) : (
              <p className="text-lg font-semibold mt-1">{formatCurrency(economics.lead_cost)}</p>
            )}
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Minuta al Cliente
            </Label>
            {isEditing ? (
              <Input
                type="number"
                value={economics.client_fee || ''}
                onChange={(e) => setEconomics(prev => ({ 
                  ...prev, 
                  client_fee: e.target.value ? parseFloat(e.target.value) : null 
                }))}
                placeholder="0"
                className="mt-1"
              />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-semibold">{formatCurrency(economics.client_fee)}</p>
                {isAccepted && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aceptada
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              % a Éxito
            </Label>
            {isEditing ? (
              <Input
                type="number"
                min={0}
                max={100}
                value={economics.success_percentage || ''}
                onChange={(e) => setEconomics(prev => ({ 
                  ...prev, 
                  success_percentage: e.target.value ? parseFloat(e.target.value) : null 
                }))}
                placeholder="0"
                className="mt-1"
              />
            ) : (
              <p className="text-lg font-semibold mt-1">
                {economics.success_percentage !== null ? `${economics.success_percentage}%` : '—'}
              </p>
            )}
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              Cantidad Reclamada
            </Label>
            {isEditing ? (
              <Input
                type="number"
                value={economics.claimed_amount || ''}
                onChange={(e) => setEconomics(prev => ({ 
                  ...prev, 
                  claimed_amount: e.target.value ? parseFloat(e.target.value) : null 
                }))}
                placeholder="0"
                className="mt-1"
              />
            ) : (
              <p className="text-lg font-semibold mt-1">{formatCurrency(economics.claimed_amount)}</p>
            )}
          </div>
        </div>

        {/* Accept Fee Button */}
        {economics.client_fee && !isAccepted && !isEditing && (
          <Button 
            variant="outline" 
            className="w-full border-green-500 text-green-600 hover:bg-green-50"
            onClick={handleAcceptFee}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Marcar Minuta como Aceptada por Cliente
          </Button>
        )}

        <Separator />

        {/* Won Case Section */}
        {isWon && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Resultado Judicial
            </h4>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm text-muted-foreground">Cantidad Obtenida</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={economics.won_amount || ''}
                    onChange={(e) => setEconomics(prev => ({ 
                      ...prev, 
                      won_amount: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    placeholder="0"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold text-green-600 mt-1">
                    {formatCurrency(economics.won_amount)}
                  </p>
                )}
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">% Éxito Cobrado</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={economics.won_percentage || economics.success_percentage || ''}
                    onChange={(e) => setEconomics(prev => ({ 
                      ...prev, 
                      won_percentage: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    placeholder="0"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold mt-1">
                    {economics.won_percentage !== null ? `${economics.won_percentage}%` : '—'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total a cobrar del caso:</span>
            <span className="font-medium">{formatCurrency(totalOwed)}</span>
          </div>
          
          {isAccepted && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minuta aceptada:</span>
              <Badge variant="outline" className="text-green-600">Confirmada</Badge>
            </div>
          )}
          
          {isWon && (
            <>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee por éxito:</span>
                <span className="font-medium text-green-600">+{formatCurrency(successFeeAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total ganado:</span>
                <span className="text-green-600">{formatCurrency(totalEarned)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
