import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Megaphone, Plus, Eye, BarChart3, Pause, Play, Loader2, Check } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';

interface Advertisement {
  id: string;
  plan: 'basic' | 'premium' | 'featured';
  areas: string[] | null;
  provinces: string[] | null;
  status: 'pending' | 'active' | 'paused' | 'expired' | 'cancelled';
  starts_at: string;
  ends_at: string;
  price_monthly: number;
  impressions: number;
  clicks: number;
  created_at: string;
}

const PLANS = {
  basic: {
    name: 'Básico',
    price: 49,
    areas: 1,
    provinces: 1,
    features: ['1 área legal', '1 provincia', 'Badge básico'],
  },
  premium: {
    name: 'Premium',
    price: 99,
    areas: 3,
    provinces: 3,
    features: ['3 áreas legales', '3 provincias', 'Badge oro', 'Prioridad en listados'],
  },
  featured: {
    name: 'Destacado',
    price: 199,
    areas: -1, // unlimited
    provinces: -1, // unlimited
    features: ['Todas las áreas', 'Toda España', 'TOP 3 en búsquedas', 'Banner destacado'],
  },
};

export default function LawfirmAnuncios() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'featured'>('basic');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);

  const lawfirmId = user?.profile?.lawfirm_id;

  const { data: ads, isLoading } = useQuery({
    queryKey: ['lawfirm-ads', lawfirmId],
    queryFn: async () => {
      if (!lawfirmId) return [];
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('lawfirm_id', lawfirmId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Advertisement[];
    },
    enabled: !!lawfirmId,
  });

  const createAdMutation = useMutation({
    mutationFn: async () => {
      const plan = PLANS[selectedPlan];
      const startDate = new Date();
      const endDate = addMonths(startDate, 1);

      const { error } = await supabase
        .from('advertisements')
        .insert({
          lawfirm_id: lawfirmId,
          plan: selectedPlan,
          areas: selectedPlan === 'featured' ? null : selectedAreas,
          provinces: selectedPlan === 'featured' ? null : selectedProvinces,
          status: 'pending',
          starts_at: startDate.toISOString().split('T')[0],
          ends_at: endDate.toISOString().split('T')[0],
          price_monthly: plan.price,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitud de anuncio enviada. Te contactaremos para el pago.');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-ads'] });
      setShowNewDialog(false);
      setSelectedAreas([]);
      setSelectedProvinces([]);
    },
    onError: () => {
      toast.error('Error al crear el anuncio');
    },
  });

  const toggleAdStatus = useMutation({
    mutationFn: async ({ adId, newStatus }: { adId: string; newStatus: 'active' | 'paused' }) => {
      const { error } = await supabase
        .from('advertisements')
        .update({ status: newStatus })
        .eq('id', adId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-ads'] });
    },
    onError: () => {
      toast.error('Error al actualizar el anuncio');
    },
  });

  const planConfig = PLANS[selectedPlan];
  const canAddArea = planConfig.areas === -1 || selectedAreas.length < planConfig.areas;
  const canAddProvince = planConfig.provinces === -1 || selectedProvinces.length < planConfig.provinces;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-lawfirm-primary" />
            Mis Anuncios
          </h1>
          <p className="text-muted-foreground">Destaca tu despacho y recibe más leads</p>
        </div>
        
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Anuncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contratar Anuncio</DialogTitle>
              <DialogDescription>
                Selecciona el plan y la configuración de tu anuncio
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Plan Selection */}
              <div className="grid gap-4 sm:grid-cols-3">
                {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedPlan === key 
                        ? 'border-lawfirm-primary ring-2 ring-lawfirm-primary/20' 
                        : 'hover:border-muted-foreground/30'
                    }`}
                    onClick={() => {
                      setSelectedPlan(key);
                      setSelectedAreas([]);
                      setSelectedProvinces([]);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {plan.name}
                        {selectedPlan === key && (
                          <Check className="h-5 w-5 text-lawfirm-primary" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-2xl font-bold text-foreground">
                        {plan.price}€<span className="text-sm font-normal text-muted-foreground">/mes</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-lawfirm-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Area/Province Selection */}
              {selectedPlan !== 'featured' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Áreas legales ({selectedAreas.length}/{planConfig.areas})</Label>
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {LEGAL_AREAS.map(area => (
                        <label key={area} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                          <Checkbox
                            checked={selectedAreas.includes(area)}
                            disabled={!selectedAreas.includes(area) && !canAddArea}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAreas([...selectedAreas, area]);
                              } else {
                                setSelectedAreas(selectedAreas.filter(a => a !== area));
                              }
                            }}
                          />
                          <span className="text-sm">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Provincias ({selectedProvinces.length}/{planConfig.provinces})</Label>
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {PROVINCES.map(prov => (
                        <label key={prov} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                          <Checkbox
                            checked={selectedProvinces.includes(prov)}
                            disabled={!selectedProvinces.includes(prov) && !canAddProvince}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProvinces([...selectedProvinces, prov]);
                              } else {
                                setSelectedProvinces(selectedProvinces.filter(p => p !== prov));
                              }
                            }}
                          />
                          <span className="text-sm">{prov}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createAdMutation.mutate()}
                disabled={
                  createAdMutation.isPending ||
                  (selectedPlan !== 'featured' && (selectedAreas.length === 0 || selectedProvinces.length === 0))
                }
              >
                {createAdMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  `Contratar ${planConfig.price}€/mes`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Ads */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i} className="h-[180px] animate-pulse bg-muted" />
          ))}
        </div>
      ) : ads?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No tienes anuncios activos</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Destaca tu despacho y recibe más leads cualificados
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear mi primer anuncio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ads?.map((ad) => {
            const plan = PLANS[ad.plan];
            const isActive = ad.status === 'active';
            
            return (
              <Card key={ad.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {ad.status === 'pending' && 'Pendiente'}
                      {ad.status === 'active' && 'Activo'}
                      {ad.status === 'paused' && 'Pausado'}
                      {ad.status === 'expired' && 'Expirado'}
                    </Badge>
                    <span className="text-lg font-bold text-lawfirm-primary">
                      {plan.name}
                    </span>
                  </div>
                  <CardDescription>
                    Activo hasta: {format(new Date(ad.ends_at), 'dd/MM/yyyy', { locale: es })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ad.areas && (
                    <div className="flex flex-wrap gap-1">
                      {ad.areas.map(area => (
                        <Badge key={area} variant="outline" className="text-xs">{area}</Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{ad.impressions.toLocaleString()} impresiones</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span>{ad.clicks.toLocaleString()} clics</span>
                    </div>
                  </div>

                  {(ad.status === 'active' || ad.status === 'paused') && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdStatus.mutate({
                          adId: ad.id,
                          newStatus: isActive ? 'paused' : 'active',
                        })}
                      >
                        {isActive ? (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Plans Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Planes Disponibles</CardTitle>
          <CardDescription>Elige el plan que mejor se adapte a tus necesidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
              <div key={key} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{plan.name}</h4>
                <p className="text-2xl font-bold text-lawfirm-primary mt-1">
                  {plan.price}€<span className="text-sm font-normal text-muted-foreground">/mes</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((f, i) => (
                    <li key={i}>✓ {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
