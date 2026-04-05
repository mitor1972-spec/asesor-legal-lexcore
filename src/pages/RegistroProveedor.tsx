import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Store, Building2, User, Users, MapPin, Briefcase, CheckCircle, Loader2,
  ArrowLeft, ArrowRight, Globe, Languages, Award, Percent, Star,
  FileSearch, Gavel, Eye, Cpu, Megaphone, Headphones, Heart,
  Building, Car, Banknote, GraduationCap, Brain, Network, FileText, ShieldCheck,
} from 'lucide-react';
import { PROVINCES } from '@/lib/constants';

const iconMap: Record<string, React.ElementType> = {
  Gavel, FileSearch, Eye, Languages, ShieldCheck, Heart,
  Building, Car, Cpu, Megaphone, Headphones, FileText,
  Banknote, GraduationCap, Brain, Network,
};

const MODALITIES = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'ambas', label: 'Online y presencial' },
];

const LANGUAGES_LIST = [
  'Español', 'Inglés', 'Francés', 'Alemán', 'Italiano', 'Portugués',
  'Catalán', 'Euskera', 'Gallego', 'Árabe', 'Chino', 'Ruso', 'Rumano', 'Otro',
];

export default function RegistroProveedor() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['provider-categories-reg'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_categories')
        .select('id, name, slug, description, icon, priority')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['provider-subcategories-reg'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_subcategories')
        .select('id, category_id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: legalAreas = [] } = useQuery({
    queryKey: ['marketplace-legal-areas-reg'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_legal_areas')
        .select('id, name')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    company_name: '',
    cif: '',
    category_id: '',
    subcategory_ids: [] as string[],
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    description: '',
    short_description: '',
    modality: 'ambas',
    provinces_covered: [] as string[],
    all_spain: false,
    languages: [] as string[],
    certifications: '',
    proposed_commission_percent: '15',
    promo_description: '',
    promo_discount_percent: '0',
    legal_area_ids: [] as string[],
    accepts_terms: false,
    accepts_commission_terms: false,
  });

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const toggleArray = (key: string, val: string) => {
    setForm(f => {
      const arr = (f as any)[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const filteredSubs = subcategories.filter(s => s.category_id === form.category_id);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('provider_applications').insert({
        company_name: form.company_name,
        cif: form.cif || null,
        category_id: form.category_id,
        subcategory_ids: form.subcategory_ids,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        website: form.website || null,
        address: form.address || null,
        city: form.city || null,
        province: form.province || null,
        postal_code: form.postal_code || null,
        description: form.description || null,
        short_description: form.short_description || null,
        modality: form.modality,
        provinces_covered: form.all_spain ? ['Toda España'] : form.provinces_covered,
        languages: form.languages,
        certifications: form.certifications ? form.certifications.split(',').map(s => s.trim()) : [],
        proposed_commission_percent: Number(form.proposed_commission_percent),
        promo_description: form.promo_description || null,
        promo_discount_percent: Number(form.promo_discount_percent),
        legal_area_ids: form.legal_area_ids,
        accepts_terms: form.accepts_terms,
        accepts_commission_terms: form.accepts_commission_terms,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: Error) => toast.error('Error al enviar: ' + e.message),
  });

  const canNext = (s: number) => {
    if (s === 1) return !!form.category_id;
    if (s === 2) return !!form.company_name && !!form.contact_name && !!form.contact_email;
    if (s === 3) return true;
    if (s === 4) return form.accepts_terms && form.accepts_commission_terms;
    return false;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">¡Solicitud enviada!</h2>
            <p className="text-muted-foreground">
              Hemos recibido tu solicitud para unirte al Marketplace de Asesor.Legal.
              Nuestro equipo la revisará y te contactará en las próximas 48 horas.
            </p>
            <p className="text-sm text-muted-foreground">
              Te enviaremos un email a <span className="font-medium text-foreground">{form.contact_email}</span> con los próximos pasos.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-bold">Asesor.Legal</span>
            <Badge variant="secondary" className="text-xs">Marketplace</Badge>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Únete al Marketplace de servicios legales</h1>
          <p className="text-muted-foreground text-lg">
            Ofrece tus servicios a miles de despachos de abogados en toda España.
            Publica tu perfil, fija tus precios y empieza a recibir solicitudes.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Categoría', 'Tu empresa', 'Servicios', 'Confirmar'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step > i + 1 ? 'bg-primary text-primary-foreground' :
                step === i + 1 ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
              <span className={`text-sm hidden sm:inline ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
              {i < 3 && <div className="w-8 h-px bg-border hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* Step 1: Category */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />¿En qué sector ofreces tus servicios?</CardTitle>
              <CardDescription>Selecciona la categoría principal que mejor describe tu actividad profesional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map(cat => {
                  const Icon = iconMap[cat.icon ?? ''] ?? Store;
                  const selected = form.category_id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => set('category_id', cat.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{cat.name}</p>
                        {cat.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {form.category_id && filteredSubs.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Subcategorías (selecciona las que apliquen)</Label>
                  <div className="flex flex-wrap gap-2">
                    {filteredSubs.map(sub => {
                      const selected = form.subcategory_ids.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => toggleArray('subcategory_ids', sub.id)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary/30'
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Company info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Datos de tu empresa</CardTitle>
              <CardDescription>Esta información se mostrará en tu perfil público del marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nombre comercial *</Label>
                  <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Ej: Traducciones Legales Madrid S.L." />
                </div>
                <div><Label>CIF / NIF</Label><Input value={form.cif} onChange={e => set('cif', e.target.value)} placeholder="B12345678" /></div>
                <div><Label>Web</Label><Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." /></div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm flex items-center gap-2 mb-3"><User className="h-4 w-4" />Persona de contacto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Nombre y apellidos *</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} /></div>
                  <div><Label>Teléfono</Label><Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm flex items-center gap-2 mb-3"><MapPin className="h-4 w-4" />Dirección</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><Label>Dirección</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
                  <div><Label>Ciudad</Label><Input value={form.city} onChange={e => set('city', e.target.value)} /></div>
                  <div>
                    <Label>Provincia</Label>
                    <Select value={form.province} onValueChange={v => set('province', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Código postal</Label><Input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Descripción corta (para tu tarjeta en el marketplace)</Label>
                <Input value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="Ej: Traductores jurados de inglés, francés y alemán" className="mt-1" maxLength={120} />
                <p className="text-xs text-muted-foreground mt-1">{form.short_description.length}/120 caracteres</p>
              </div>

              <div>
                <Label>Descripción completa</Label>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe tu empresa, experiencia y servicios principales..." />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Services & pricing */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Cobertura y modalidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Modalidad de servicio</Label>
                  <Select value={form.modality} onValueChange={v => set('modality', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MODALITIES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox checked={form.all_spain} onCheckedChange={v => set('all_spain', !!v)} id="all-spain" />
                    <Label htmlFor="all-spain" className="text-sm cursor-pointer">Cobertura en toda España</Label>
                  </div>
                  {!form.all_spain && (
                    <div>
                      <Label className="text-sm mb-2 block">Provincias donde ofreces servicio</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                        {PROVINCES.map(p => (
                          <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5">
                            <Checkbox checked={form.provinces_covered.includes(p)} onCheckedChange={() => toggleArray('provinces_covered', p)} className="h-3.5 w-3.5" />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm mb-2 block flex items-center gap-1"><Languages className="h-4 w-4" />Idiomas</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES_LIST.map(lang => {
                      const selected = form.languages.includes(lang);
                      return (
                        <button key={lang} onClick={() => toggleArray('languages', lang)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'
                          }`}>{lang}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1"><Award className="h-4 w-4" />Certificaciones o acreditaciones</Label>
                  <Input value={form.certifications} onChange={e => set('certifications', e.target.value)} placeholder="Separadas por comas: Ej: MAEC, AENOR, Colegiado" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Condiciones comerciales</CardTitle>
                <CardDescription>Define la comisión y las ofertas especiales para clientes de Asesor.Legal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">¿Cómo funciona la comisión?</h4>
                  <p className="text-xs text-muted-foreground">
                    Asesor.Legal cobra una comisión por cada contratación generada a través del marketplace.
                    Tú fijas tus precios y nosotros aplicamos una comisión sobre el precio final.
                    La comisión estándar es del 15%.
                  </p>
                </div>

                <div>
                  <Label>Comisión propuesta (%)</Label>
                  <Input type="number" min="5" max="50" value={form.proposed_commission_percent} onChange={e => set('proposed_commission_percent', e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Mínimo 5%. Comisión estándar: 15%.</p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-amber-500" />Oferta especial para abogados de Asesor.Legal</h4>
                  <div>
                    <Label>Descuento especial (%)</Label>
                    <Input type="number" min="0" max="50" value={form.promo_discount_percent} onChange={e => set('promo_discount_percent', e.target.value)} />
                  </div>
                  <div className="mt-3">
                    <Label>Descripción de la oferta</Label>
                    <Textarea value={form.promo_description} onChange={e => set('promo_description', e.target.value)} rows={2} placeholder="Ej: 20% descuento en primera traducción. Entrega express gratis para urgencias judiciales." />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Áreas jurídicas relacionadas</CardTitle>
                <CardDescription>Selecciona las áreas del derecho a las que tus servicios son relevantes. Esto ayuda a los abogados a encontrarte.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {legalAreas.map(area => {
                    const selected = form.legal_area_ids.includes(area.id);
                    return (
                      <button key={area.id} onClick={() => toggleArray('legal_area_ids', area.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'
                        }`}>{area.name}</button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" />Revisa y confirma</CardTitle>
              <CardDescription>Verifica tus datos antes de enviar la solicitud.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Empresa:</span>
                  <p className="font-medium">{form.company_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Categoría:</span>
                  <p className="font-medium">{categories.find(c => c.id === form.category_id)?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contacto:</span>
                  <p className="font-medium">{form.contact_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{form.contact_email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalidad:</span>
                  <p className="font-medium capitalize">{form.modality}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Comisión:</span>
                  <p className="font-medium">{form.proposed_commission_percent}%</p>
                </div>
                {form.promo_discount_percent && Number(form.promo_discount_percent) > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Oferta especial:</span>
                    <p className="font-medium">{form.promo_discount_percent}% descuento – {form.promo_description}</p>
                  </div>
                )}
              </div>

              {form.subcategory_ids.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Subcategorías:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.subcategory_ids.map(id => {
                      const sub = subcategories.find(s => s.id === id);
                      return sub ? <Badge key={id} variant="outline" className="text-xs">{sub.name}</Badge> : null;
                    })}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox checked={form.accepts_terms} onCheckedChange={v => set('accepts_terms', !!v)} id="terms" />
                  <Label htmlFor="terms" className="text-sm cursor-pointer leading-tight">
                    Acepto los <span className="text-primary underline">términos y condiciones</span> del Marketplace de Asesor.Legal y la política de privacidad.
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox checked={form.accepts_commission_terms} onCheckedChange={v => set('accepts_commission_terms', !!v)} id="commission" />
                  <Label htmlFor="commission" className="text-sm cursor-pointer leading-tight">
                    Acepto las <span className="text-primary underline">condiciones de comisión</span> del marketplace. Entiendo que Asesor.Legal aplicará una comisión sobre las contrataciones generadas.
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-1" />Anterior
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext(step)}>
              Siguiente<ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => submitMutation.mutate()} disabled={!canNext(4) || submitMutation.isPending}>
              {submitMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Enviando…</> : <>Enviar solicitud<CheckCircle className="h-4 w-4 ml-1" /></>}
            </Button>
          )}
        </div>

        {/* Benefits section */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Users, title: 'Miles de abogados', desc: 'Accede a despachos activos en toda España que necesitan tus servicios.' },
            { icon: Star, title: 'Visibilidad real', desc: 'Posiciónate en un entorno 100% jurídico. No compites en directorios generalistas.' },
            { icon: Percent, title: 'Pago por resultado', desc: 'Solo pagas cuando generas negocio real. Sin cuotas fijas ni permanencias.' },
          ].map((b, i) => (
            <Card key={i} className="text-center">
              <CardContent className="p-4">
                <b.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">{b.title}</h4>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
