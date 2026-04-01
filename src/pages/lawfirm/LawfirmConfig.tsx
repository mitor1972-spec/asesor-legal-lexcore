import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLawfirmProfile, useUpdateLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { Settings, Building2, MapPin, Loader2, Save, User, Globe, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function LawfirmConfig() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();
  const updateProfile = useUpdateLawfirmProfile();

  const [formData, setFormData] = useState({
    name: '',
    firm_type: 'unipersonal',
    contact_person: '',
    contact_role: '',
    contact_email: '',
    contact_phone: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    if (lawfirm) {
      setFormData({
        name: lawfirm.name || '',
        firm_type: lawfirm.firm_type || 'unipersonal',
        contact_person: lawfirm.contact_person || '',
        contact_role: lawfirm.contact_role || '',
        contact_email: lawfirm.contact_email || '',
        contact_phone: lawfirm.contact_phone || '',
        phone: lawfirm.phone || '',
        address: lawfirm.address || '',
        city: lawfirm.city || '',
        province: lawfirm.province || '',
        postal_code: lawfirm.postal_code || '',
        website: lawfirm.website || '',
        description: lawfirm.description || '',
      });
    }
  }, [lawfirm]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Datos del despacho guardados');
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Datos del Despacho
          </h1>
          <p className="text-sm text-muted-foreground">Identidad y datos generales del despacho</p>
        </div>
        <Button onClick={handleSave} disabled={updateProfile.isPending} size="sm">
          {updateProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Identity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre comercial</Label>
              <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de despacho</Label>
              <Select value={formData.firm_type} onValueChange={v => handleChange('firm_type', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unipersonal">Unipersonal</SelectItem>
                  <SelectItem value="sociedad">Sociedad / Varios socios</SelectItem>
                  <SelectItem value="corporativo">Corporativo con sucursales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono principal</Label>
                <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Página web</Label>
                <Input value={formData.website} onChange={e => handleChange('website', e.target.value)} className="h-9" placeholder="https://" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción corta</Label>
              <Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Breve descripción del despacho..." />
            </div>
            {/* Logo placeholder */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border">
                {lawfirm?.logo_url ? (
                  <img src={lawfirm.logo_url} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium">Logo del despacho</p>
                <p className="text-xs text-muted-foreground">Funcionalidad de subida próximamente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact person */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Persona Responsable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre completo</Label>
                <Input value={formData.contact_person} onChange={e => handleChange('contact_person', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cargo</Label>
                <Input value={formData.contact_role} onChange={e => handleChange('contact_role', e.target.value)} className="h-9" placeholder="Ej: Socio director" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={formData.contact_email} onChange={e => handleChange('contact_email', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input value={formData.contact_phone} onChange={e => handleChange('contact_phone', e.target.value)} className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Dirección</Label>
                <Input value={formData.address} onChange={e => handleChange('address', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Input value={formData.city} onChange={e => handleChange('city', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Provincia</Label>
                <Input value={formData.province} onChange={e => handleChange('province', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Código Postal</Label>
                <Input value={formData.postal_code} onChange={e => handleChange('postal_code', e.target.value)} className="h-9 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
