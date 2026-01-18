import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLawfirmProfile, useUpdateLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { Settings, Building2, CreditCard, Users, MapPin, Bell, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function LawfirmConfig() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const updateProfile = useUpdateLawfirmProfile();
  
  const [formData, setFormData] = useState({
    name: '',
    cif: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    website: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    marketplace_alerts_enabled: true,
    alert_frequency: 'daily',
  });

  // Load data when lawfirm loads
  useState(() => {
    if (lawfirm) {
      setFormData({
        name: lawfirm.name || '',
        cif: lawfirm.cif || '',
        phone: lawfirm.phone || '',
        address: lawfirm.address || '',
        city: lawfirm.city || '',
        province: lawfirm.province || '',
        postal_code: lawfirm.postal_code || '',
        website: lawfirm.website || '',
        contact_person: lawfirm.contact_person || '',
        contact_email: lawfirm.contact_email || '',
        contact_phone: lawfirm.contact_phone || '',
        marketplace_alerts_enabled: lawfirm.marketplace_alerts_enabled ?? true,
        alert_frequency: lawfirm.alert_frequency || 'daily',
      });
    }
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

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
            <Settings className="h-6 w-6" />
            Configuración
          </h1>
          <p className="text-muted-foreground">Gestiona los datos y preferencias de tu despacho</p>
        </div>
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar cambios
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4" />
            Datos generales
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos del Despacho</CardTitle>
                <CardDescription>Información básica de tu despacho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del despacho</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cif">CIF</Label>
                    <Input 
                      id="cif" 
                      value={formData.cif}
                      onChange={e => handleInputChange('cif', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={e => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Web</Label>
                  <Input 
                    id="website" 
                    value={formData.website}
                    onChange={e => handleInputChange('website', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={e => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia</Label>
                    <Input 
                      id="province" 
                      value={formData.province}
                      onChange={e => handleInputChange('province', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input 
                    id="postal_code" 
                    value={formData.postal_code}
                    onChange={e => handleInputChange('postal_code', e.target.value)}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Persona de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Nombre</Label>
                    <Input 
                      id="contact_person" 
                      value={formData.contact_person}
                      onChange={e => handleInputChange('contact_person', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email</Label>
                    <Input 
                      id="contact_email" 
                      type="email"
                      value={formData.contact_email}
                      onChange={e => handleInputChange('contact_email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Teléfono</Label>
                    <Input 
                      id="contact_phone" 
                      value={formData.contact_phone}
                      onChange={e => handleInputChange('contact_phone', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datos de Facturación</CardTitle>
              <CardDescription>Información fiscal y métodos de pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input value={formData.name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>CIF</Label>
                  <Input value={formData.cif} disabled />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Método de Pago</h3>
                    <p className="text-sm text-muted-foreground">
                      Configura tu tarjeta para compras en LeadsMarket
                    </p>
                  </div>
                  <Badge variant="secondary">Próximamente</Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-6 text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    La integración con Stripe estará disponible próximamente
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Saldo actual</h3>
                <div className="bg-lawfirm-primary/10 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo en LeadsMarket</span>
                  <span className="text-2xl font-bold text-lawfirm-primary">
                    {lawfirm?.marketplace_balance?.toFixed(2) || '0.00'}€
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura cómo quieres recibir alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de LeadsMarket</p>
                  <p className="text-sm text-muted-foreground">
                    Recibe notificaciones cuando haya nuevos leads disponibles
                  </p>
                </div>
                <Switch 
                  checked={formData.marketplace_alerts_enabled}
                  onCheckedChange={c => handleInputChange('marketplace_alerts_enabled', c)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificaciones de nuevos casos</p>
                  <p className="text-sm text-muted-foreground">
                    Alerta cuando te asignen un nuevo caso
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Resumen diario por email</p>
                  <p className="text-sm text-muted-foreground">
                    Recibe un resumen de actividad cada día
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
