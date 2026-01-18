import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useLawfirmProfile, useUpdateLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { AREAS_LEGALES } from '@/lib/constants';
import { ShoppingCart, Save, Loader2, Bell, Zap, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function LawfirmMarketplaceConfig() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const updateProfile = useUpdateLawfirmProfile();
  
  const [formData, setFormData] = useState({
    leadsmarket_enabled: true,
    marketplace_alerts_enabled: true,
    alert_email_new_leads: true,
    alert_email_daily_summary: true,
    alert_push_enabled: false,
    auto_purchase_enabled: false,
    auto_purchase_min_score: 70,
    auto_purchase_max_price: 40,
    auto_purchase_areas: [] as string[],
  });
  
  useEffect(() => {
    if (lawfirm) {
      const lf = lawfirm as any;
      setFormData({
        leadsmarket_enabled: lf.leadsmarket_enabled ?? true,
        marketplace_alerts_enabled: lf.marketplace_alerts_enabled ?? true,
        alert_email_new_leads: lf.alert_email_new_leads ?? true,
        alert_email_daily_summary: lf.alert_email_daily_summary ?? true,
        alert_push_enabled: lf.alert_push_enabled ?? false,
        auto_purchase_enabled: lf.auto_purchase_enabled ?? false,
        auto_purchase_min_score: lf.auto_purchase_min_score ?? 70,
        auto_purchase_max_price: lf.auto_purchase_max_price ?? 40,
        auto_purchase_areas: lf.auto_purchase_areas ?? [],
      });
    }
  }, [lawfirm]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData as any);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const toggleArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      auto_purchase_areas: prev.auto_purchase_areas.includes(area)
        ? prev.auto_purchase_areas.filter(a => a !== area)
        : [...prev.auto_purchase_areas, area]
    }));
  };

  // Get areas the lawfirm works with
  const lawfirmAreas = lawfirm?.areas_accepted || [];
  const areasToShow = lawfirmAreas.length > 0 ? lawfirmAreas : AREAS_LEGALES.slice(0, 8);

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
            <ShoppingCart className="h-6 w-6" />
            Configuración de LeadsMarket
          </h1>
          <p className="text-muted-foreground">Gestiona cómo compras leads en el marketplace</p>
        </div>
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar configuración
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main toggle */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-lawfirm-primary/10 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-lawfirm-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">Activar compras en LeadsMarket</p>
                  <p className="text-sm text-muted-foreground">
                    Permite ver y comprar leads disponibles en el marketplace
                  </p>
                </div>
              </div>
              <Switch 
                checked={formData.leadsmarket_enabled}
                onCheckedChange={c => setFormData(prev => ({ ...prev, leadsmarket_enabled: c }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de nuevos leads
            </CardTitle>
            <CardDescription>Configura cómo quieres ser notificado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email cuando haya leads de mis áreas</p>
                <p className="text-sm text-muted-foreground">Notificación inmediata por email</p>
              </div>
              <Switch 
                checked={formData.alert_email_new_leads}
                onCheckedChange={c => setFormData(prev => ({ ...prev, alert_email_new_leads: c }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email resumen diario</p>
                <p className="text-sm text-muted-foreground">Envío a las 8:00 y 18:00</p>
              </div>
              <Switch 
                checked={formData.alert_email_daily_summary}
                onCheckedChange={c => setFormData(prev => ({ ...prev, alert_email_daily_summary: c }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="font-medium">Notificación push en el navegador</p>
                <Badge variant="secondary" className="text-xs">Próximamente</Badge>
              </div>
              <Switch 
                checked={formData.alert_push_enabled}
                onCheckedChange={c => setFormData(prev => ({ ...prev, alert_push_enabled: c }))}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-purchase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Compra automática
              <Badge variant="outline" className="ml-2">BETA</Badge>
            </CardTitle>
            <CardDescription>Compra leads automáticamente según tus criterios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Activar compra automática</p>
                <p className="text-sm text-muted-foreground">Compra leads que cumplan los criterios</p>
              </div>
              <Switch 
                checked={formData.auto_purchase_enabled}
                onCheckedChange={c => setFormData(prev => ({ ...prev, auto_purchase_enabled: c }))}
              />
            </div>

            {formData.auto_purchase_enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Score mínimo</Label>
                    <Input
                      type="number"
                      value={formData.auto_purchase_min_score}
                      onChange={e => setFormData(prev => ({ 
                        ...prev, 
                        auto_purchase_min_score: parseInt(e.target.value) || 0 
                      }))}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio máximo (€)</Label>
                    <Input
                      type="number"
                      value={formData.auto_purchase_max_price}
                      onChange={e => setFormData(prev => ({ 
                        ...prev, 
                        auto_purchase_max_price: parseInt(e.target.value) || 0 
                      }))}
                      min={0}
                      max={500}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Solo estas áreas:</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {areasToShow.map(area => (
                      <div key={area} className="flex items-center gap-2">
                        <Checkbox
                          id={`area-${area}`}
                          checked={formData.auto_purchase_areas.includes(area)}
                          onCheckedChange={() => toggleArea(area)}
                        />
                        <label htmlFor={`area-${area}`} className="text-sm cursor-pointer">
                          {area}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
