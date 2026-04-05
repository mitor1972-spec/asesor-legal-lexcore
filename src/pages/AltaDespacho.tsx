import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Scale, Building2, User, MapPin, Briefcase, CheckCircle, Loader2,
  ArrowRight, ArrowLeft, Mail, Lock, Eye, EyeOff, ShoppingCart,
  Megaphone, Package, Shield, Sparkles, Gavel, Globe, Phone
} from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';

const COLEGIOS_ABOGADOS = [
  "ICAM - Madrid", "ICAB - Barcelona", "ICA Valencia", "ICA Sevilla",
  "ICA Málaga", "ICA Bilbao", "ICA Zaragoza", "ICA Alicante",
  "ICA Granada", "ICA Murcia", "ICA Palma de Mallorca", "ICA Las Palmas",
  "ICA Santa Cruz de Tenerife", "ICA Córdoba", "ICA Valladolid",
  "ICA A Coruña", "ICA Oviedo", "ICA Santander", "ICA Pamplona",
  "ICA San Sebastián", "ICA Vitoria", "ICA Cádiz", "Otro"
];

const REFERRAL_SOURCES = [
  'Google / Búsqueda web', 'Email de Asesor.Legal', 'Recomendación de colega',
  'Redes sociales', 'Publicidad online', 'Evento / Conferencia', 'Directorio profesional', 'Otro',
];

type RegistrationType = 'quick' | 'full';

export default function AltaDespacho() {
  const navigate = useNavigate();
  const { signUp } = useAuthContext();
  const [step, setStep] = useState(0); // 0=choose type, 1=account, 2=firm, 3=areas, 4=preferences, 5=done
  const [regType, setRegType] = useState<RegistrationType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Account data
  const [account, setAccount] = useState({
    name: '', email: '', password: '',
    bar_number: '', bar_association: '',
  });

  // Firm data
  const [firm, setFirm] = useState({
    firm_name: '', cif: '', phone: '', firm_email: '',
    website: '', address: '', city: '', province: '', postal_code: '',
    firm_type: 'unipersonal', description: '', num_lawyers: '',
  });

  // Areas & preferences
  const [areas, setAreas] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [allSpain, setAllSpain] = useState(false);
  const [preferences, setPreferences] = useState({
    monthly_capacity: 20, max_price: 40, min_score: 40,
    interested_in_advertising: false,
    interested_in_services_sales: false,
    interested_in_commission: true,
    referral_source: '',
    accepts_terms: false, accepts_privacy: false, accepts_marketing: false,
    comments: '',
  });

  const toggleArea = (area: string) => {
    setAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };
  const toggleProvince = (prov: string) => {
    setProvinces(prev => prev.includes(prov) ? prev.filter(p => p !== prov) : [...prev, prov]);
  };

  const totalSteps = regType === 'quick' ? 3 : 5;

  const handleChooseType = (type: RegistrationType) => {
    setRegType(type);
    setStep(1);
  };

  const canProceedStep1 = account.email && account.password.length >= 6 && account.name;
  const canProceedStep2 = firm.firm_name && firm.cif && firm.phone && firm.province;
  const canProceedStep3 = areas.length > 0 && (allSpain || provinces.length > 0);

  const handleSubmit = async () => {
    if (!preferences.accepts_terms || !preferences.accepts_privacy) {
      toast.error('Debes aceptar los términos y la política de privacidad');
      return;
    }

    setLoading(true);
    try {
      // 1. Create account
      const { error: signUpError } = await signUp(account.email, account.password, account.name);
      if (signUpError) throw signUpError;

      // 2. Wait for session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Email confirmation might be required
        toast.success('¡Cuenta creada! Revisa tu email para confirmar el registro.');
        setStep(regType === 'quick' ? 3 : 5);
        setLoading(false);
        return;
      }

      // 3. Update profile with bar info
      if (account.bar_number || account.bar_association) {
        await supabase.from('profiles').update({
          bar_number: account.bar_number || null,
          bar_association: account.bar_association || null,
        } as any).eq('id', session.user.id);
      }

      // 4. Get lawfirm ID from profile
      const { data: profile } = await supabase.from('profiles')
        .select('lawfirm_id').eq('id', session.user.id).single();

      if (profile?.lawfirm_id) {
        // 5. Update lawfirm with all collected data
        const lawfirmUpdate: Record<string, unknown> = {
          registration_type: regType,
          onboarding_completed: true,
        };

        if (regType === 'full') {
          Object.assign(lawfirmUpdate, {
            name: firm.firm_name,
            cif: firm.cif,
            phone: firm.phone,
            contact_email: firm.firm_email || account.email,
            website: firm.website || null,
            address: firm.address || null,
            city: firm.city || null,
            province: firm.province || null,
            postal_code: firm.postal_code || null,
            firm_type: firm.firm_type,
            description: firm.description || null,
            num_lawyers: firm.num_lawyers || null,
            contact_person: account.name,
            areas_accepted: areas,
            provinces_accepted: allSpain ? PROVINCES.map(p => p) : provinces,
            monthly_capacity: preferences.monthly_capacity,
            max_lead_price: preferences.max_price,
            min_lead_score: preferences.min_score,
            interested_in_advertising: preferences.interested_in_advertising,
            interested_in_services_sales: preferences.interested_in_services_sales,
            commission_enabled: preferences.interested_in_commission,
            referral_source: preferences.referral_source || null,
          });
        }

        await supabase.from('lawfirms').update(lawfirmUpdate as any).eq('id', profile.lawfirm_id);
      }

      toast.success('¡Registro completado! Bienvenido a Asesor.Legal');
      setStep(regType === 'quick' ? 3 : 5);
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  // Quick registration submit
  const handleQuickSubmit = async () => {
    if (!preferences.accepts_terms || !preferences.accepts_privacy) {
      toast.error('Debes aceptar los términos y la política de privacidad');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await signUp(account.email, account.password, account.name);
      if (signUpError) throw signUpError;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.success('¡Cuenta creada! Revisa tu email para confirmar el registro.');
        setStep(3);
        setLoading(false);
        return;
      }

      if (account.bar_number || account.bar_association) {
        await supabase.from('profiles').update({
          bar_number: account.bar_number || null,
          bar_association: account.bar_association || null,
        } as any).eq('id', session.user.id);
      }

      const { data: profile } = await supabase.from('profiles')
        .select('lawfirm_id').eq('id', session.user.id).single();
      if (profile?.lawfirm_id) {
        await supabase.from('lawfirms').update({
          registration_type: 'quick',
          onboarding_completed: false,
        } as any).eq('id', profile.lawfirm_id);
      }

      toast.success('¡Registro rápido completado!');
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  // Step 0: Choose registration type
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg">
                <Scale className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Alta en Asesor.Legal
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Accede al mayor marketplace de casos jurídicos de España. Elige cómo quieres empezar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Quick Registration */}
            <Card className="group cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              onClick={() => handleChooseType('quick')}>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Acceso Rápido al Market</h3>
                <p className="text-muted-foreground text-sm">
                  Crea tu cuenta en 1 minuto y empieza a ver y comprar casos del marketplace inmediatamente.
                </p>
                <ul className="text-left text-sm space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Acceso inmediato al LeadMarket</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Ver casos disponibles y precios</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Completa tu perfil cuando quieras</li>
                </ul>
                <Button className="w-full mt-4 group-hover:bg-primary" variant="outline">
                  Registro rápido <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Full Registration */}
            <Card className="group cursor-pointer border-2 border-primary/30 hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
              onClick={() => handleChooseType('full')}>
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary text-primary-foreground text-xs">Recomendado</Badge>
              </div>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Alta Completa de Despacho</h3>
                <p className="text-muted-foreground text-sm">
                  Configura tu despacho por completo: áreas, provincias, preferencias y servicios.
                </p>
                <ul className="text-left text-sm space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Marketplace + CRM completo</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Alertas personalizadas de casos</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Publicidad y venta de servicios</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Casos a comisión disponibles</li>
                </ul>
                <Button className="w-full mt-4 gradient-brand text-white">
                  Alta completa <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Already have account */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">
                Inicia sesión aquí
              </button>
            </p>
          </div>

          {/* Value propositions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-3xl mx-auto">
            {[
              { icon: Sparkles, label: 'IA Lexcore™', desc: 'Scoring inteligente' },
              { icon: Shield, label: 'Garantía', desc: 'Control de calidad' },
              { icon: Package, label: '+20 casos/día', desc: 'Flujo constante' },
              { icon: Gavel, label: '43 áreas', desc: 'Cobertura total' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/50 border">
                <item.icon className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Account creation
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <StepIndicator current={1} total={totalSteps} regType={regType!} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Crea tu cuenta
              </CardTitle>
              <CardDescription>
                {regType === 'quick' ? 'Datos mínimos para acceder al marketplace' : 'Tus datos profesionales de acceso'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Nombre y apellidos" value={account.name}
                    onChange={e => setAccount(p => ({ ...p, name: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email profesional *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" type="email" placeholder="tu@despacho.com" value={account.email}
                    onChange={e => setAccount(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 pr-10" type={showPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                    value={account.password} onChange={e => setAccount(p => ({ ...p, password: e.target.value }))} required />
                  <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nº Colegiado</Label>
                  <Input placeholder="Ej: 12345" value={account.bar_number}
                    onChange={e => setAccount(p => ({ ...p, bar_number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Colegio de Abogados</Label>
                  <Select value={account.bar_association} onValueChange={v => setAccount(p => ({ ...p, bar_association: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {COLEGIOS_ABOGADOS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                {regType === 'quick' ? (
                  <Button className="flex-1" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                    Continuar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button className="flex-1 gradient-brand text-white" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                    Continuar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2 for Quick: Terms + submit | Step 2 for Full: Firm data
  if (step === 2 && regType === 'quick') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <StepIndicator current={2} total={totalSteps} regType={regType} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Términos y condiciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Con el registro rápido tendrás acceso a:</p>
                <ul className="text-sm space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Ver todos los casos del marketplace</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Comprar casos con crédito prepago</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Dashboard básico y gestión de casos</li>
                </ul>
                <p className="text-xs text-muted-foreground italic">
                  Podrás completar tu perfil de despacho en cualquier momento desde Configuración.
                </p>
              </div>

              <TermsCheckboxes preferences={preferences} setPreferences={setPreferences} />

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                <Button className="flex-1 gradient-brand text-white" onClick={handleQuickSubmit}
                  disabled={loading || !preferences.accepts_terms || !preferences.accepts_privacy}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Crear cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Quick done
  if (step === 3 && regType === 'quick') {
    return <SuccessScreen navigate={navigate} regType="quick" />;
  }

  // Full Step 2: Firm Data
  if (step === 2 && regType === 'full') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <StepIndicator current={2} total={totalSteps} regType={regType} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos del Despacho
              </CardTitle>
              <CardDescription>Información de tu despacho de abogados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Nombre del despacho *</Label>
                  <Input placeholder="Ej: García & Asociados Abogados" value={firm.firm_name}
                    onChange={e => setFirm(p => ({ ...p, firm_name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>CIF / NIF *</Label>
                  <Input placeholder="B12345678" value={firm.cif}
                    onChange={e => setFirm(p => ({ ...p, cif: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de despacho</Label>
                  <Select value={firm.firm_type} onValueChange={v => setFirm(p => ({ ...p, firm_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unipersonal">Unipersonal</SelectItem>
                      <SelectItem value="sociedad">Sociedad / Varios socios</SelectItem>
                      <SelectItem value="corporativo">Corporativo con sucursales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={firm.phone}
                      onChange={e => setFirm(p => ({ ...p, phone: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email del despacho</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" type="email" value={firm.firm_email}
                      onChange={e => setFirm(p => ({ ...p, firm_email: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Web</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" placeholder="https://" value={firm.website}
                      onChange={e => setFirm(p => ({ ...p, website: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nº de abogados</Label>
                  <RadioGroup value={firm.num_lawyers} onValueChange={v => setFirm(p => ({ ...p, num_lawyers: v }))}
                    className="flex flex-wrap gap-3 mt-1">
                    {['1', '2-5', '6-15', '15+'].map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                        <RadioGroupItem value={opt} />
                        <span className="text-sm">{opt === '1' ? 'Individual' : opt}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Dirección</Label>
                  <Input value={firm.address} onChange={e => setFirm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input value={firm.city} onChange={e => setFirm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Provincia *</Label>
                  <Select value={firm.province} onValueChange={v => setFirm(p => ({ ...p, province: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map(prov => (
                        <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código postal</Label>
                  <Input value={firm.postal_code} onChange={e => setFirm(p => ({ ...p, postal_code: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Breve descripción del despacho</Label>
                <Textarea placeholder="Años de experiencia, especialización, valores..." value={firm.description}
                  onChange={e => setFirm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                <Button className="flex-1 gradient-brand text-white" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                  Continuar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full Step 3: Areas + Provinces
  if (step === 3 && regType === 'full') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <StepIndicator current={3} total={totalSteps} regType={regType} />

          {/* Areas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Áreas de Especialización
              </CardTitle>
              <CardDescription>
                Selecciona las áreas legales en las que ofreces servicios ({areas.length} seleccionadas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 max-h-[300px] overflow-y-auto pr-2">
                {LEGAL_AREAS.map(area => (
                  <label key={area} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                    ${areas.includes(area) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}>
                    <Checkbox checked={areas.includes(area)} onCheckedChange={() => toggleArea(area)} />
                    <span className="text-sm">{area}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Provinces */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ámbito geográfico
              </CardTitle>
              <CardDescription>¿Dónde ofreces tus servicios?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted">
                <Checkbox checked={allSpain} onCheckedChange={c => setAllSpain(!!c)} />
                <span className="font-medium">Toda España</span>
              </label>
              {!allSpain && (
                <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4 max-h-[250px] overflow-y-auto pr-2">
                  {PROVINCES.map(prov => (
                    <label key={prov} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                      ${provinces.includes(prov) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}>
                      <Checkbox checked={provinces.includes(prov)} onCheckedChange={() => toggleProvince(prov)} />
                      <span className="text-sm">{prov}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                <Button className="flex-1 gradient-brand text-white" onClick={() => setStep(4)} disabled={!canProceedStep3}>
                  Continuar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full Step 4: Preferences + Services + Terms
  if (step === 4 && regType === 'full') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <StepIndicator current={4} total={totalSteps} regType={regType} />

          {/* Lead preferences */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Preferencias de Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Leads/mes máximos</Label>
                <Input type="number" value={preferences.monthly_capacity}
                  onChange={e => setPreferences(p => ({ ...p, monthly_capacity: +e.target.value || 0 }))} min={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Precio máx. por lead (€)</Label>
                <Input type="number" value={preferences.max_price}
                  onChange={e => setPreferences(p => ({ ...p, max_price: +e.target.value || 0 }))} min={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Score mínimo (0-100)</Label>
                <Input type="number" value={preferences.min_score}
                  onChange={e => setPreferences(p => ({ ...p, min_score: +e.target.value || 0 }))} min={0} max={100} />
              </div>
            </CardContent>
          </Card>

          {/* Extra services interest */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Servicios adicionales
              </CardTitle>
              <CardDescription>Indica tu interés (sin compromiso)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                <Checkbox checked={preferences.interested_in_commission}
                  onCheckedChange={c => setPreferences(p => ({ ...p, interested_in_commission: !!c }))} className="mt-0.5" />
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-primary" /> Casos a comisión
                  </p>
                  <p className="text-xs text-muted-foreground">Recibe casos sin coste inicial. Pagas un porcentaje solo si ganas el caso.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                <Checkbox checked={preferences.interested_in_services_sales}
                  onCheckedChange={c => setPreferences(p => ({ ...p, interested_in_services_sales: !!c }))} className="mt-0.5" />
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" /> Venta de servicios legales
                  </p>
                  <p className="text-xs text-muted-foreground">Publica tus servicios a precio fijo en nuestro directorio de servicios legales.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                <Checkbox checked={preferences.interested_in_advertising}
                  onCheckedChange={c => setPreferences(p => ({ ...p, interested_in_advertising: !!c }))} className="mt-0.5" />
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-amber-500" /> Publicidad y visibilidad
                  </p>
                  <p className="text-xs text-muted-foreground">Planes de visibilidad en el portal, asistente virtual y boletines.</p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Referral + comments */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Información adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>¿Cómo nos conociste?</Label>
                <Select value={preferences.referral_source} onValueChange={v => setPreferences(p => ({ ...p, referral_source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Comentarios (opcional)</Label>
                <Textarea placeholder="¿Algo que quieras contarnos?" value={preferences.comments}
                  onChange={e => setPreferences(p => ({ ...p, comments: e.target.value }))} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Términos y finalización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TermsCheckboxes preferences={preferences} setPreferences={setPreferences} />

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                <Button className="flex-1 gradient-brand text-white" onClick={handleSubmit}
                  disabled={loading || !preferences.accepts_terms || !preferences.accepts_privacy}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Completar registro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full done
  if (step === 5 && regType === 'full') {
    return <SuccessScreen navigate={navigate} regType="full" />;
  }

  return null;
}

// ─── Sub-components ───

function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <span className="text-lg font-display font-bold">Asesor.Legal</span>
        </div>
        <Badge variant="outline" className="text-xs">Alta de despacho</Badge>
      </div>
    </header>
  );
}

function StepIndicator({ current, total, regType }: { current: number; total: number; regType: RegistrationType }) {
  const quickLabels = ['Cuenta', 'Términos', 'Listo'];
  const fullLabels = ['Cuenta', 'Despacho', 'Áreas', 'Preferencias', 'Listo'];
  const labels = regType === 'quick' ? quickLabels : fullLabels;

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {labels.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${isDone ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'}`}>
              {isDone ? <CheckCircle className="h-4 w-4" /> : stepNum}
            </div>
            <span className={`text-xs hidden sm:inline ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
            {i < labels.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function TermsCheckboxes({ preferences, setPreferences }: {
  preferences: { accepts_terms: boolean; accepts_privacy: boolean; accepts_marketing: boolean };
  setPreferences: React.Dispatch<React.SetStateAction<any>>;
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox checked={preferences.accepts_terms}
          onCheckedChange={c => setPreferences((p: any) => ({ ...p, accepts_terms: !!c }))} className="mt-0.5" />
        <span className="text-sm">Acepto los <a href="#" className="text-primary underline">Términos y Condiciones</a> del servicio *</span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox checked={preferences.accepts_privacy}
          onCheckedChange={c => setPreferences((p: any) => ({ ...p, accepts_privacy: !!c }))} className="mt-0.5" />
        <span className="text-sm">Acepto la <a href="#" className="text-primary underline">Política de Privacidad</a> *</span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox checked={preferences.accepts_marketing}
          onCheckedChange={c => setPreferences((p: any) => ({ ...p, accepts_marketing: !!c }))} className="mt-0.5" />
        <span className="text-sm">Deseo recibir comunicaciones comerciales y novedades de Asesor.Legal</span>
      </label>
    </div>
  );
}

function SuccessScreen({ navigate, regType }: { navigate: (path: string) => void; regType: RegistrationType }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-5">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {regType === 'quick' ? '¡Cuenta creada!' : '¡Registro completado!'}
          </h2>
          <p className="text-muted-foreground">
            {regType === 'quick'
              ? 'Tu cuenta está lista. Revisa tu email para confirmar el registro y acceder al marketplace.'
              : 'Tu despacho está dado de alta en Asesor.Legal. Revisa tu email para confirmar y empezar a recibir casos.'}
          </p>
          {regType === 'full' && (
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <p className="text-sm font-medium mb-2">Tu perfil incluye:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Datos del despacho configurados</li>
                <li>✓ Áreas y provincias seleccionadas</li>
                <li>✓ Preferencias de leads guardadas</li>
                <li>✓ Acceso completo a la plataforma</li>
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button className="w-full gradient-brand text-white" onClick={() => navigate('/login')}>
              Iniciar sesión
            </Button>
            {regType === 'quick' && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                Completar perfil más tarde
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
