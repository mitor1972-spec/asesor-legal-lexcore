import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Scale, Building2, User, MapPin, Briefcase, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';

const REFERRAL_SOURCES = [
  'Google',
  'Recomendación de otro despacho',
  'Redes sociales',
  'Publicidad',
  'Evento o conferencia',
  'Otro',
];

export default function RegistroDespacho() {
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cif: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    contact_name: '',
    contact_role: '',
    contact_email: '',
    contact_phone: '',
    areas_selected: [] as string[],
    provinces_selected: [] as string[],
    all_spain: false,
    monthly_capacity: 20,
    max_price_per_lead: 40,
    min_score: 40,
    num_lawyers: '',
    has_multiple_offices: false,
    referral_source: '',
    comments: '',
    accepts_terms: false,
    accepts_privacy: false,
    accepts_marketing: false,
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'areas_selected' | 'provinces_selected', item: string) => {
    setFormData(prev => {
      const current = prev[field];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('lawfirm_applications')
        .insert({
          name: formData.name,
          cif: formData.cif,
          phone: formData.phone,
          email: formData.email,
          website: formData.website || null,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
          contact_name: formData.contact_name,
          contact_role: formData.contact_role || null,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          areas_selected: formData.areas_selected,
          provinces_selected: formData.all_spain ? [] : formData.provinces_selected,
          all_spain: formData.all_spain,
          monthly_capacity: formData.monthly_capacity,
          max_price_per_lead: formData.max_price_per_lead,
          min_score: formData.min_score,
          num_lawyers: formData.num_lawyers,
          has_multiple_offices: formData.has_multiple_offices,
          referral_source: formData.referral_source || null,
          comments: formData.comments || null,
          accepts_terms: formData.accepts_terms,
          accepts_privacy: formData.accepts_privacy,
          accepts_marketing: formData.accepts_marketing,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Solicitud enviada correctamente');
    },
    onError: (error: Error) => {
      console.error('Error submitting application:', error);
      toast.error('Error al enviar la solicitud. Inténtalo de nuevo.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.accepts_terms || !formData.accepts_privacy) {
      toast.error('Debes aceptar los términos y la política de privacidad');
      return;
    }
    if (formData.areas_selected.length === 0) {
      toast.error('Selecciona al menos un área legal');
      return;
    }
    if (!formData.all_spain && formData.provinces_selected.length === 0) {
      toast.error('Selecciona al menos una provincia o marca "Toda España"');
      return;
    }
    
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold">¡Solicitud enviada!</h2>
            <p className="text-muted-foreground">
              Hemos recibido tu solicitud de alta. Nuestro equipo la revisará y te contactará en las próximas 24-48 horas.
            </p>
            <p className="text-sm text-muted-foreground">
              Recibirás un email de confirmación en {formData.contact_email}
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-10 w-10 text-primary" />
            <span className="text-2xl font-display font-bold">Asesor.Legal</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Únete a la Red de Abogados
          </h1>
          <p className="text-muted-foreground text-lg">
            Recibe casos cualificados de clientes que buscan tus servicios
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del despacho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos del Despacho
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nombre del despacho *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cif">CIF *</Label>
                <Input
                  id="cif"
                  value={formData.cif}
                  onChange={(e) => updateField('cif', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="website">Web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="province">Provincia *</Label>
                <Select value={formData.province} onValueChange={(v) => updateField('province', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map(prov => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="postal_code">Código postal *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Persona de contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Persona de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact_name">Nombre completo *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => updateField('contact_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_role">Cargo</Label>
                <Input
                  id="contact_role"
                  value={formData.contact_role}
                  onChange={(e) => updateField('contact_role', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Email directo *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Teléfono directo</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Áreas de especialización */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Áreas de Especialización
              </CardTitle>
              <CardDescription>
                Selecciona las áreas legales que trabajas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {LEGAL_AREAS.map(area => (
                  <label key={area} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={formData.areas_selected.includes(area)}
                      onCheckedChange={() => toggleArrayItem('areas_selected', area)}
                    />
                    <span className="text-sm">{area}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ámbito de actuación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ámbito de Actuación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted">
                <Checkbox
                  checked={formData.all_spain}
                  onCheckedChange={(checked) => updateField('all_spain', checked)}
                />
                <span className="font-medium">Actuamos en toda España</span>
              </label>
              
              {!formData.all_spain && (
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {PROVINCES.map(prov => (
                    <label key={prov} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={formData.provinces_selected.includes(prov)}
                        onCheckedChange={() => toggleArrayItem('provinces_selected', prov)}
                      />
                      <span className="text-sm">{prov}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferencias de leads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Preferencias de Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="monthly_capacity">Leads/mes que puedes gestionar</Label>
                <Input
                  id="monthly_capacity"
                  type="number"
                  value={formData.monthly_capacity}
                  onChange={(e) => updateField('monthly_capacity', parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="max_price">Precio máximo por lead (€)</Label>
                <Input
                  id="max_price"
                  type="number"
                  value={formData.max_price_per_lead}
                  onChange={(e) => updateField('max_price_per_lead', parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="min_score">Score mínimo (0-100)</Label>
                <Input
                  id="min_score"
                  type="number"
                  value={formData.min_score}
                  onChange={(e) => updateField('min_score', parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info adicional */}
          <Card>
            <CardHeader>
              <CardTitle>Sobre tu Despacho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Número de abogados</Label>
                <RadioGroup
                  value={formData.num_lawyers}
                  onValueChange={(v) => updateField('num_lawyers', v)}
                  className="flex flex-wrap gap-4 mt-2"
                >
                  {['1', '2-5', '6-15', '15+'].map(option => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={option} />
                      <span>{option === '1' ? 'Individual' : option}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.has_multiple_offices}
                  onCheckedChange={(checked) => updateField('has_multiple_offices', !!checked)}
                />
                <span>Tenemos varias sedes</span>
              </label>

              <div>
                <Label htmlFor="referral">¿Cómo nos conociste?</Label>
                <Select value={formData.referral_source} onValueChange={(v) => updateField('referral_source', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCES.map(src => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="comments">Comentarios adicionales</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => updateField('comments', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.accepts_terms}
                  onCheckedChange={(checked) => updateField('accepts_terms', !!checked)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  He leído y acepto los <a href="/terminos" className="text-primary underline">Términos y Condiciones</a> *
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.accepts_privacy}
                  onCheckedChange={(checked) => updateField('accepts_privacy', !!checked)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  He leído y acepto la <a href="/privacidad" className="text-primary underline">Política de Privacidad</a> *
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.accepts_marketing}
                  onCheckedChange={(checked) => updateField('accepts_marketing', !!checked)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  Deseo recibir comunicaciones comerciales de Asesor.Legal
                </span>
              </label>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              '🚀 Enviar Solicitud de Alta'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/login" className="text-primary underline">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
