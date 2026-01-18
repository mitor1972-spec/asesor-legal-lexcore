import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLawfirmProfile, useUpdateLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { AREAS_LEGALES } from '@/lib/constants';
import { Euro, Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function LawfirmPricing() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const updateProfile = useUpdateLawfirmProfile();
  
  const [maxLeadPrice, setMaxLeadPrice] = useState<number>(50);
  const [pricePerArea, setPricePerArea] = useState<Record<string, number | null>>({});
  
  useEffect(() => {
    if (lawfirm) {
      setMaxLeadPrice(lawfirm.max_lead_price || 50);
      const areaSettings = (lawfirm as any).price_per_area || {};
      setPricePerArea(areaSettings);
    }
  }, [lawfirm]);

  const handleAreaPriceChange = (area: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setPricePerArea(prev => ({
      ...prev,
      [area]: numValue
    }));
  };

  const handleSave = async () => {
    try {
      // Filter out null values for clean storage
      const cleanPricePerArea = Object.fromEntries(
        Object.entries(pricePerArea).filter(([_, v]) => v !== null && v !== undefined)
      );
      
      await updateProfile.mutateAsync({
        max_lead_price: maxLeadPrice,
        settings_json: {
          ...(lawfirm?.settings_json as object || {}),
          price_per_area: cleanPricePerArea
        }
      } as any);
      toast.success('Precios guardados correctamente');
    } catch {
      toast.error('Error al guardar los precios');
    }
  };

  // Get areas the lawfirm works with
  const lawfirmAreas = lawfirm?.areas_accepted || [];
  const areasToShow = lawfirmAreas.length > 0 ? lawfirmAreas : AREAS_LEGALES.slice(0, 10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Euro className="h-6 w-6" />
            Precios por Área Legal
          </h1>
          <p className="text-muted-foreground">Configura el precio máximo que estás dispuesto a pagar por leads de cada área</p>
        </div>
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar precios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💶 Precios Máximos por Área Legal
          </CardTitle>
          <CardDescription>
            Establece precios personalizados para cada área o usa el precio máximo general
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General max price */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="max-price" className="text-base font-medium">Precio máximo general</Label>
                <p className="text-sm text-muted-foreground">
                  Se aplica a todas las áreas que no tengan un precio específico
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="max-price"
                  type="number"
                  value={maxLeadPrice}
                  onChange={e => setMaxLeadPrice(parseInt(e.target.value) || 0)}
                  className="w-24 text-right font-bold text-lg"
                  min={0}
                  max={500}
                />
                <span className="text-lg font-medium">€</span>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">¿Cómo funcionan los precios?</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Si un lead del LeadsMarket tiene un precio superior a tu máximo configurado, no lo verás en tu lista.
                Puedes pagar más por áreas que te interesan mucho, o menos por áreas donde ya tienes suficientes casos.
              </p>
            </div>
          </div>

          {/* Per-area pricing */}
          <div>
            <Label className="text-base font-medium mb-4 block">Personalizar por área (opcional)</Label>
            <div className="border rounded-lg divide-y">
              {areasToShow.map((area) => {
                const customPrice = pricePerArea[area];
                const hasCustomPrice = customPrice !== null && customPrice !== undefined;
                
                return (
                  <div key={area} className="flex items-center justify-between p-3 hover:bg-muted/30">
                    <span className="font-medium">{area}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={hasCustomPrice ? customPrice : ''}
                        onChange={e => handleAreaPriceChange(area, e.target.value)}
                        placeholder={`${maxLeadPrice}`}
                        className="w-20 text-right"
                        min={0}
                        max={500}
                      />
                      <span className="text-sm text-muted-foreground w-4">€</span>
                      {!hasCustomPrice && (
                        <span className="text-xs text-muted-foreground w-24">← precio general</span>
                      )}
                      {hasCustomPrice && customPrice > maxLeadPrice && (
                        <span className="text-xs text-green-600 w-24">← pago más</span>
                      )}
                      {hasCustomPrice && customPrice < maxLeadPrice && (
                        <span className="text-xs text-amber-600 w-24">← pago menos</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
