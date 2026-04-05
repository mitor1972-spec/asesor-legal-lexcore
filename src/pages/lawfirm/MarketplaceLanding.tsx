import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store, Search, Users, ArrowRight, CheckCircle2,
  Gavel, FileSearch, Eye, Languages, ShieldCheck, Heart,
  Building, Car, Cpu, Megaphone, Headphones, FileText,
  Banknote, GraduationCap, Brain, Network,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Gavel, FileSearch, Eye, Languages, ShieldCheck, Heart,
  Building, Car, Cpu, Megaphone, Headphones, FileText,
  Banknote, GraduationCap, Brain, Network,
};

const steps = [
  { n: '1', title: 'Publica o busca', desc: 'Los proveedores publican sus servicios. Los abogados buscan según su necesidad.' },
  { n: '2', title: 'Encuentra el perfil adecuado', desc: 'Filtrado por especialidad, área jurídica o tipo de servicio.' },
  { n: '3', title: 'Contacta directamente', desc: 'Comunicación rápida y directa, sin intermediarios innecesarios.' },
  { n: '4', title: 'Colabora y resuelve', desc: 'Integra el servicio en tu caso o proyecto.' },
];

const benefits = {
  lawyer: [
    'Accede a peritos y expertos por especialidad',
    'Encuentra colaboradores en cualquier área del derecho',
    'Externaliza tareas y gana eficiencia',
    'Mejora tu operativa sin aumentar estructura',
    'Trabaja con profesionales orientados al sector legal',
  ],
  provider: [
    'Acceso directo a despachos y abogados activos',
    'Generación de oportunidades reales de negocio',
    'Visibilidad en un entorno 100% jurídico',
    'Posicionamiento en tu especialidad',
    'Contactos cualificados de forma recurrente',
  ],
};

const differentials = [
  'Especialización 100% en el sector legal',
  'Enfoque práctico y orientado a casos reales',
  'Integración con captación de clientes',
  'Optimización SEO incluida para anunciantes',
  'Plataforma en constante evolución',
];

export default function MarketplaceLanding() {
  const { data: categories = [] } = useQuery({
    queryKey: ['provider-categories-landing'],
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

  return (
    <div className="space-y-16 pb-12">
      {/* ── HERO ── */}
      <section className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Store className="h-4 w-4" /> Marketplace profesional
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          El marketplace de servicios profesionales<br className="hidden md:block" /> para abogados
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
          Encuentra proveedores especializados para cada fase de tu caso o haz crecer tu negocio ofreciendo tus servicios a despachos de toda España.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="gap-2"><Search className="h-4 w-4" />Soy abogado – Buscar proveedores</Button>
          <Button size="lg" variant="outline" className="gap-2" asChild><Link to="/registro-proveedor"><Users className="h-4 w-4" />Soy proveedor – Ofrecer mis servicios</Link></Button>
        </div>
      </section>

      {/* ── QUÉ ES ── */}
      <section className="px-4 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Todo lo que necesita un despacho, en un solo lugar</h2>
        <p className="text-muted-foreground leading-relaxed">
          El Marketplace de Asesor.Legal es una infraestructura de servicios diseñada para abogados.
          Accede a una red de profesionales y empresas especializadas para resolver casos, obtener prueba técnica,
          externalizar tareas, mejorar tu despacho y captar más clientes.
        </p>
        <p className="text-sm text-muted-foreground mt-3 font-medium">No es un directorio. Es una herramienta de trabajo real para el día a día jurídico.</p>
      </section>

      {/* ── CATEGORÍAS ── */}
      <section className="px-4">
        <h2 className="text-2xl font-bold text-center mb-6">Todo tipo de servicios para el entorno legal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-w-6xl mx-auto">
          {categories.map(cat => {
            const Icon = iconMap[cat.icon ?? ''] ?? Store;
            return (
              <Card key={cat.id} className="hover:border-primary/40 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">{cat.name}</p>
                    {cat.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── PARA ABOGADOS / PROVEEDORES ── */}
      <section className="px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <Badge className="bg-primary/10 text-primary mb-3">Para abogados</Badge>
            <h3 className="text-xl font-bold mb-3">Encuentra, compara y contacta</h3>
            <p className="text-muted-foreground text-sm mb-4">Proveedores especializados para cada necesidad jurídica de tu despacho.</p>
            <ul className="space-y-2">
              {benefits.lawyer.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{b}</li>
              ))}
            </ul>
            <Button className="mt-5 w-full gap-2"><Search className="h-4 w-4" />Explorar proveedores</Button>
          </CardContent>
        </Card>

        <Card className="border-secondary/30">
          <CardContent className="p-6">
            <Badge variant="secondary" className="mb-3">Para empresas</Badge>
            <h3 className="text-xl font-bold mb-3">Accede a una red activa de despachos</h3>
            <p className="text-muted-foreground text-sm mb-4">Publica tu servicio y empieza a recibir solicitudes de abogados.</p>
            <ul className="space-y-2">
              {benefits.provider.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />{b}</li>
              ))}
            </ul>
            <Button variant="outline" className="mt-5 w-full gap-2" asChild><Link to="/registro-proveedor"><Users className="h-4 w-4" />Publicar mi servicio</Link></Button>
          </CardContent>
        </Card>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Cómo funciona</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(s => (
            <div key={s.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">{s.n}</div>
              <h4 className="font-semibold text-sm mb-1">{s.title}</h4>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DIFERENCIAL ── */}
      <section className="px-4 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Mucho más que un marketplace</h2>
        <p className="text-muted-foreground mb-6">Creamos un ecosistema donde abogados y empresas colaboran para mejorar resultados, eficiencia y crecimiento.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {differentials.map((d, i) => (
            <Badge key={i} variant="secondary" className="text-sm py-1.5 px-4">{d}</Badge>
          ))}
        </div>
      </section>

      {/* ── OPORTUNIDAD ── */}
      <section className="px-4 max-w-3xl mx-auto">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-3">Una oportunidad real de crecimiento</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Miles de abogados necesitan servicios especializados cada día. El marketplace te permite posicionarte directamente frente a esa demanda.
            </p>
            <p className="text-sm font-medium text-foreground">
              No compites en un directorio generalista. Estás dentro de un entorno donde los abogados buscan exactamente lo que ofreces.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-4 text-center">
        <h2 className="text-2xl font-bold mb-3">Empieza a trabajar con profesionales del sector legal</h2>
        <p className="text-muted-foreground mb-6">Tanto si necesitas servicios como si quieres ofrecerlos, el Marketplace de Asesor.Legal está diseñado para generar oportunidades reales.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="gap-2"><Search className="h-4 w-4" />Buscar proveedores<ArrowRight className="h-4 w-4" /></Button>
          <Button size="lg" variant="outline" className="gap-2"><Users className="h-4 w-4" />Publicar mi servicio<ArrowRight className="h-4 w-4" /></Button>
        </div>
      </section>
    </div>
  );
}
