import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Bot, Mail, Check, Star, Crown, Sparkles, Handshake, TrendingUp, Users, Target, Award, BarChart3, ShoppingCart, MapPin, Scale, Layers, Clock, MessageCircle, Info, ChevronDown, ChevronUp, Percent, Zap, ArrowRight } from 'lucide-react';
import { useAdProducts, useAdCategories, calcPrice, type AdProduct } from '@/hooks/useAdProducts';
import { ContractAdDialog } from '@/components/lawfirm/ContractAdDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PROVINCIAS_ESPANA, AREAS_LEGALES } from '@/lib/constants';

/* ────────── Geo tier helper ────────── */
const GEO_SCOPES = [
  { value: 'municipio', label: 'Municipio', icon: MapPin },
  { value: 'provincia', label: 'Provincia', icon: MapPin },
  { value: 'nacional', label: 'Nacional', icon: Globe },
] as const;

const DURATIONS = [
  { value: 'monthly', label: 'Mensual', months: 1, discount: 0 },
  { value: 'quarterly', label: 'Trimestral', months: 3, discount: 10 },
  { value: 'semester', label: 'Semestral', months: 6, discount: 15 },
  { value: 'annual', label: 'Anual', months: 12, discount: 20 },
] as const;

/* ────────── Stats Hero ────────── */
function StatsHero() {
  const stats = [
    { icon: Globe, value: '90.000+', label: 'Visitas / mes', color: 'from-blue-500 to-blue-700' },
    { icon: Bot, value: '1.000+', label: 'Consultas IA / mes', color: 'from-violet-500 to-violet-700' },
    { icon: Target, value: '400+', label: 'Leads filtrados / mes', color: 'from-emerald-500 to-emerald-700' },
    { icon: TrendingUp, value: '+5%', label: 'Crecimiento mensual', color: 'from-amber-500 to-amber-700' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-7 w-7" />
          <h2 className="text-xl font-bold">2º portal jurídico de España</h2>
        </div>
        <p className="text-blue-100 text-sm max-w-2xl">
          Según el último informe de tráfico sectorial, Asesor.Legal es el segundo directorio jurídico más visitado de España. Tu despacho merece estar donde están los clientes.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-md">
            <div className={`bg-gradient-to-br ${s.color} p-3 text-white`}>
              <s.icon className="h-5 w-5 mb-1 opacity-80" />
              <p className="text-2xl font-extrabold leading-tight">{s.value}</p>
              <p className="text-xs opacity-90 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { icon: BarChart3, title: 'Mejora tu SEO y tráfico orgánico', desc: 'Tu perfil en Asesor.Legal genera backlinks de alta autoridad y mejora tu posicionamiento.' },
          { icon: Bot, title: 'Recomendación directa por IA', desc: 'Nuestro asistente identifica área legal, especialidad y provincia y recomienda tu despacho.' },
          { icon: Users, title: 'Oportunidades reales de clientes', desc: 'Miles de usuarios buscan abogados cada mes. Accede a demanda real y cualificada.' },
        ].map((b, i) => (
          <Card key={i} className="bg-muted/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <b.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ────────── Product configurator card ────────── */
function ProductCard({ product }: { product: AdProduct }) {
  const [geoScope, setGeoScope] = useState('municipio');
  const [duration, setDuration] = useState('monthly');
  const [areasCount, setAreasCount] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const pricing = useMemo(() =>
    calcPrice(product, { duration, geoScope, areasCount, keywordsCount: 0 }),
    [product, duration, geoScope, areasCount]
  );

  const tierLabels: Record<string, string> = {
    capital: 'Capital de provincia',
    municipio_grande: 'Municipio grande',
    provincia: 'Toda la provincia',
    resto: 'Resto de municipios',
  };

  const geoTiers = product.geo_pricing?.tiers;
  const hasGeoTiers = geoTiers && typeof geoTiers === 'object';

  return (
    <>
      <Card className={`relative overflow-hidden transition-shadow hover:shadow-lg ${product.is_featured ? 'border-primary shadow-md ring-1 ring-primary/20' : ''}`}>
        {product.badge && (
          <Badge className="absolute -top-0 right-4 rounded-t-none bg-primary text-primary-foreground text-xs px-3 py-1">
            {product.badge}
          </Badge>
        )}

        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {product.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            {product.name}
          </CardTitle>
          {product.description && (
            <CardDescription className="text-xs">{product.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price display */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-extrabold">{pricing.monthlyPrice.toFixed(0)}€</span>
              <span className="text-muted-foreground text-sm">/{product.price_unit}</span>
            </div>
            {pricing.discount > 0 && (
              <Badge variant="secondary" className="mt-1 text-xs">
                <Percent className="h-3 w-3 mr-1" />
                -{pricing.discount}% por {DURATIONS.find(d => d.value === duration)?.label?.toLowerCase()}
              </Badge>
            )}
            {duration !== 'monthly' && (
              <p className="text-xs text-muted-foreground mt-1">
                Total: <span className="font-semibold">{pricing.totalPrice.toFixed(0)}€</span> ({pricing.months} meses)
              </p>
            )}
          </div>

          {/* Configurator */}
          <div className="space-y-3">
            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Duración</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label} {d.discount > 0 && `(-${d.discount}%)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Geo scope */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ámbito geográfico</label>
              <Select value={geoScope} onValueChange={setGeoScope}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEO_SCOPES.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Areas count */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nº áreas legales</label>
              <Select value={String(areasCount)} onValueChange={v => setAreasCount(Number(v))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 15, 20].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} área{n > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pricing.areaMult > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Multiplicador: x{pricing.areaMult}
                </p>
              )}
            </div>
          </div>

          {/* Geo tier prices - collapsible */}
          {hasGeoTiers && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  Ver precios por zona
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Precios según zona (€/mes):</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(geoTiers as Record<string, Record<string, number>>).map(([tier, levels]) => (
                      <div key={tier} className="text-xs">
                        <span className="font-medium">{tierLabels[tier] || tier}:</span>
                        <div className="ml-2 text-muted-foreground">
                          {Object.entries(levels).map(([level, price]) => (
                            <span key={level} className="mr-2">{level.toUpperCase()}: {price}€</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Premium benefits */}
          {product.premium_benefits && product.premium_benefits.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Beneficios Premium
              </p>
              {product.premium_benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* CTA */}
          <Button
            className="w-full"
            variant={product.is_featured ? 'default' : 'outline'}
            onClick={() => setContractOpen(true)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Contratar — {pricing.monthlyPrice.toFixed(0)}€/{product.price_unit}
          </Button>
        </CardContent>
      </Card>

      {contractOpen && (
        <ContractAdDialog
          open={contractOpen}
          onClose={() => setContractOpen(false)}
          productName={product.name}
          basePrice={pricing.monthlyPrice}
          priceUnit={product.price_unit}
          features={product.premium_benefits || [product.description || '']}
          productType={product.product_type}
        />
      )}
    </>
  );
}

/* ────────── Category tab content ────────── */
function CategoryProducts({ products, categoryDescription }: { products: AdProduct[]; categoryDescription?: string }) {
  if (!products.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay productos disponibles en esta categoría.</p>
      </div>
    );
  }

  // Sort: featured first
  const sorted = [...products].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return a.sort_order - b.sort_order;
  });

  return (
    <div className="space-y-4">
      {categoryDescription && (
        <p className="text-sm text-muted-foreground">{categoryDescription}</p>
      )}
      <div className={`grid gap-4 ${sorted.length === 1 ? 'max-w-md' : sorted.length === 2 ? 'md:grid-cols-2 max-w-3xl' : sorted.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {sorted.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

/* ────────── Delegate strategy card ────────── */
function DelegateStrategyCard() {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/30">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-bold text-lg">¿Demasiadas opciones? Dejadnos crear vuestra estrategia</h3>
            <p className="text-sm text-muted-foreground">
              Cuéntanos tu presupuesto, áreas legales y provincias, y nuestro equipo diseñará la campaña óptima para maximizar tu inversión. Incluye publicidad, compra de contactos y/o comisiones.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="text-xs">Publicidad optimizada</Badge>
              <Badge variant="outline" className="text-xs">Compra de contactos</Badge>
              <Badge variant="outline" className="text-xs">Adquisición por comisión %</Badge>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => navigate('/despacho/asesor-comercial')} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Hablar con Asesor IA
              </Button>
              <Button variant="outline" onClick={() => navigate('/despacho/asesor-comercial?tab=delegate')} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Enviar solicitud directa
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Discount info banner ────────── */
function DiscountBanner() {
  return (
    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-sm">Descuentos por duración:</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {DURATIONS.filter(d => d.discount > 0).map(d => (
              <Badge key={d.value} variant="secondary" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs">
                {d.label}: -{d.discount}%
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Layers className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">Multiplicadores por nº de áreas y palabras clave</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Main page ────────── */
export default function LawfirmAdvertising() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'banners-web';
  const { data: categories, isLoading: loadingCats } = useAdCategories();
  const { data: allProducts, isLoading: loadingProducts } = useAdProducts();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Group products by category slug
  const productsByCategory = useMemo(() => {
    if (!allProducts || !categories) return {};
    const map: Record<string, AdProduct[]> = {};
    for (const cat of categories) {
      map[cat.slug] = allProducts.filter(p => p.category_id === cat.id);
    }
    return map;
  }, [allProducts, categories]);

  const isLoading = loadingCats || loadingProducts;

  // Icon map for categories
  const categoryIcons: Record<string, React.ElementType> = {
    'banners-web': Globe,
    'secciones-portada': Crown,
    'contactos-marketplace': ShoppingCart,
    'newsletters': Mail,
    'marketing-legal': Handshake,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          📢 Publicidad y Promoción
        </h1>
        <p className="text-muted-foreground">Elige el tipo de publicidad que mejor se adapte a tu despacho. Configura zona, áreas legales y duración.</p>
      </div>

      <StatsHero />

      <DelegateStrategyCard />

      <DiscountBanner />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full max-w-3xl" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-96" />)}
          </div>
        </div>
      ) : categories && categories.length > 0 ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className={`grid w-full max-w-4xl h-12 bg-card border border-border p-1 gap-1`} style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
            {categories.map(cat => {
              const Icon = categoryIcons[cat.slug] || Globe;
              return (
                <TabsTrigger
                  key={cat.slug}
                  value={cat.slug}
                  className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md font-medium transition-all text-xs sm:text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className="sm:hidden">{cat.name.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.slug} value={cat.slug}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => { const Icon = categoryIcons[cat.slug] || Globe; return <Icon className="h-5 w-5 text-primary" />; })()}
                    {cat.name}
                  </CardTitle>
                  {cat.description && (
                    <CardDescription>{cat.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <CategoryProducts
                    products={productsByCategory[cat.slug] || []}
                    categoryDescription={undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>No hay productos de publicidad configurados todavía.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
