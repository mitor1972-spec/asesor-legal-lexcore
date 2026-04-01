import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLawfirm, useCreateLawfirm, useUpdateLawfirm } from '@/hooks/useLawfirms';
import { AREAS_LEGALES, PROVINCIAS_ESPANA } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

interface LawfirmFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawfirmId?: string | null;
}

export function LawfirmFormDialog({ open, onOpenChange, lawfirmId }: LawfirmFormDialogProps) {
  const { data: existingLawfirm, isLoading: isLoadingLawfirm } = useLawfirm(lawfirmId || undefined);
  const createLawfirm = useCreateLawfirm();
  const updateLawfirm = useUpdateLawfirm();
  
  const isEditing = !!lawfirmId;
  
  // Form state
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
    email_derivations: '',
    monthly_capacity: 0,
    max_lead_price: 0,
    min_lead_score: 0,
    is_active: true,
    commercial_notes: '',
    commission_enabled: true,
    commission_global_percent: null as number | null,
    commission_progressive_enabled: false,
    commission_progressive_tiers: [
      { from: 0, to: 20, percent: 20 },
      { from: 21, to: 50, percent: 18 },
      { from: 51, to: 100, percent: 16 },
      { from: 101, to: 999999, percent: 15 },
    ] as { from: number; to: number; percent: number }[],
    commission_weekly_limit: null as number | null,
  });
  
  const [areasAccepted, setAreasAccepted] = useState<string[]>([]);
  const [provincesAccepted, setProvincesAccepted] = useState<string[]>([]);
  const [allSpain, setAllSpain] = useState(false);

  // Load existing data when editing
  useEffect(() => {
    if (existingLawfirm) {
      const lf = existingLawfirm as any;
      const defaultTiers = [
        { from: 0, to: 20, percent: 20 },
        { from: 21, to: 50, percent: 18 },
        { from: 51, to: 100, percent: 16 },
        { from: 101, to: 999999, percent: 15 },
      ];
      setFormData({
        name: lf.name || '',
        cif: lf.cif || '',
        phone: lf.phone || '',
        address: lf.address || '',
        city: lf.city || '',
        province: lf.province || '',
        postal_code: lf.postal_code || '',
        website: lf.website || '',
        contact_person: lf.contact_person || '',
        contact_email: lf.contact_email || '',
        contact_phone: lf.contact_phone || '',
        email_derivations: lf.email_derivations || '',
        monthly_capacity: lf.monthly_capacity || 0,
        max_lead_price: lf.max_lead_price || 0,
        min_lead_score: lf.min_lead_score || 0,
        is_active: lf.is_active ?? true,
        commercial_notes: lf.commercial_notes || '',
        commission_enabled: lf.commission_enabled ?? true,
        commission_global_percent: lf.commission_global_percent ?? null,
        commission_progressive_enabled: lf.commission_progressive_enabled ?? false,
        commission_progressive_tiers: (Array.isArray(lf.commission_progressive_tiers) && lf.commission_progressive_tiers.length > 0) ? lf.commission_progressive_tiers : defaultTiers,
        commission_weekly_limit: lf.commission_weekly_limit ?? null,
      });
      setAreasAccepted(lf.areas_accepted || []);
      setProvincesAccepted(lf.provinces_accepted || []);
      setAllSpain(lf.provinces_accepted?.length === PROVINCIAS_ESPANA.length);
    } else {
      // Reset form for new lawfirm
      setFormData({
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
        email_derivations: '',
        monthly_capacity: 0,
        max_lead_price: 0,
        min_lead_score: 0,
        is_active: true,
        commercial_notes: '',
        commission_enabled: true,
        commission_global_percent: null,
        commission_progressive_enabled: false,
        commission_progressive_tiers: [
          { from: 0, to: 20, percent: 20 },
          { from: 21, to: 50, percent: 18 },
          { from: 51, to: 100, percent: 16 },
          { from: 101, to: 999999, percent: 15 },
        ],
        commission_weekly_limit: null,
      });
      setAreasAccepted([]);
      setProvincesAccepted([]);
      setAllSpain(false);
    }
  }, [existingLawfirm, lawfirmId]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArea = (area: string) => {
    setAreasAccepted(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const toggleProvince = (province: string) => {
    setProvincesAccepted(prev => 
      prev.includes(province) 
        ? prev.filter(p => p !== province)
        : [...prev, province]
    );
  };

  const toggleAllSpain = (checked: boolean) => {
    setAllSpain(checked);
    if (checked) {
      setProvincesAccepted([...PROVINCIAS_ESPANA]);
    } else {
      setProvincesAccepted([]);
    }
  };

  const selectAllAreas = () => setAreasAccepted([...AREAS_LEGALES]);
  const deselectAllAreas = () => setAreasAccepted([]);
  const selectAllProvinces = () => {
    setProvincesAccepted([...PROVINCIAS_ESPANA]);
    setAllSpain(true);
  };
  const deselectAllProvinces = () => {
    setProvincesAccepted([]);
    setAllSpain(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!formData.contact_email.trim()) {
      toast.error('El email de contacto es obligatorio');
      return;
    }

    try {
      const lawfirmData = {
        ...formData,
        areas_accepted: areasAccepted,
        provinces_accepted: provincesAccepted,
        status: formData.is_active ? 'active' as const : 'inactive' as const,
        commission_progressive_tiers: formData.commission_progressive_tiers as any,
      };

      if (isEditing && lawfirmId) {
        await updateLawfirm.mutateAsync({ id: lawfirmId, ...lawfirmData });
        toast.success('Despacho actualizado correctamente');
      } else {
        await createLawfirm.mutateAsync(lawfirmData);
        toast.success('Despacho creado correctamente');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lawfirm:', error);
      toast.error('Error al guardar el despacho');
    }
  };

  const isSubmitting = createLawfirm.isPending || updateLawfirm.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? 'Editar Despacho' : 'Nuevo Despacho'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingLawfirm && lawfirmId ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Datos</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="areas">Áreas</TabsTrigger>
              <TabsTrigger value="provinces">Provincias</TabsTrigger>
              <TabsTrigger value="commission">Comisiones</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[50vh] mt-4">
              <TabsContent value="basic" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del despacho *</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      placeholder="Bufete García & Asociados"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cif">CIF</Label>
                    <Input 
                      id="cif" 
                      value={formData.cif}
                      onChange={e => handleInputChange('cif', e.target.value)}
                      placeholder="B12345678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={e => handleInputChange('phone', e.target.value)}
                      placeholder="912345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Web</Label>
                    <Input 
                      id="website" 
                      value={formData.website}
                      onChange={e => handleInputChange('website', e.target.value)}
                      placeholder="https://www.example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                    placeholder="Calle Mayor, 123"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={e => handleInputChange('city', e.target.value)}
                      placeholder="Madrid"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia</Label>
                    <Select value={formData.province} onValueChange={v => handleInputChange('province', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCIAS_ESPANA.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input 
                      id="postal_code" 
                      value={formData.postal_code}
                      onChange={e => handleInputChange('postal_code', e.target.value)}
                      placeholder="28001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_capacity">Capacidad mensual</Label>
                    <Input 
                      id="monthly_capacity" 
                      type="number"
                      value={formData.monthly_capacity}
                      onChange={e => handleInputChange('monthly_capacity', parseInt(e.target.value) || 0)}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_lead_price">Precio máximo lead (€)</Label>
                    <Input 
                      id="max_lead_price" 
                      type="number"
                      value={formData.max_lead_price}
                      onChange={e => handleInputChange('max_lead_price', parseInt(e.target.value) || 0)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_lead_score">Score mínimo</Label>
                    <Input 
                      id="min_lead_score" 
                      type="number"
                      value={formData.min_lead_score}
                      onChange={e => handleInputChange('min_lead_score', parseInt(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is_active" 
                    checked={formData.is_active}
                    onCheckedChange={c => handleInputChange('is_active', !!c)}
                  />
                  <Label htmlFor="is_active">Despacho activo</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commercial_notes">Notas comerciales</Label>
                  <Textarea 
                    id="commercial_notes" 
                    value={formData.commercial_notes}
                    onChange={e => handleInputChange('commercial_notes', e.target.value)}
                    placeholder="Notas internas sobre el despacho..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Persona de contacto</Label>
                    <Input 
                      id="contact_person" 
                      value={formData.contact_person}
                      onChange={e => handleInputChange('contact_person', e.target.value)}
                      placeholder="Juan García"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email de contacto *</Label>
                    <Input 
                      id="contact_email" 
                      type="email"
                      value={formData.contact_email}
                      onChange={e => handleInputChange('contact_email', e.target.value)}
                      placeholder="contacto@bufete.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Teléfono de contacto</Label>
                    <Input 
                      id="contact_phone" 
                      value={formData.contact_phone}
                      onChange={e => handleInputChange('contact_phone', e.target.value)}
                      placeholder="612345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_derivations">Email para derivaciones</Label>
                    <Input 
                      id="email_derivations" 
                      type="email"
                      value={formData.email_derivations}
                      onChange={e => handleInputChange('email_derivations', e.target.value)}
                      placeholder="leads@bufete.com"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="areas" className="space-y-4 p-1">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {areasAccepted.length} áreas seleccionadas
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllAreas}>
                      Seleccionar todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllAreas}>
                      Deseleccionar todas
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {AREAS_LEGALES.map(area => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`area-${area}`}
                        checked={areasAccepted.includes(area)}
                        onCheckedChange={() => toggleArea(area)}
                      />
                      <Label htmlFor={`area-${area}`} className="text-sm cursor-pointer">
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="provinces" className="space-y-4 p-1">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="all-spain"
                      checked={allSpain}
                      onCheckedChange={c => toggleAllSpain(!!c)}
                    />
                    <Label htmlFor="all-spain" className="font-medium cursor-pointer">
                      Actúa en TODA España
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllProvinces}>
                      Seleccionar todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllProvinces}>
                      Deseleccionar todas
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {provincesAccepted.length} provincias seleccionadas
                </p>
                
                <div className="grid grid-cols-4 gap-2">
                  {PROVINCIAS_ESPANA.map(province => (
                    <div key={province} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`province-${province}`}
                        checked={provincesAccepted.includes(province)}
                        onCheckedChange={() => toggleProvince(province)}
                      />
                      <Label htmlFor={`province-${province}`} className="text-sm cursor-pointer">
                        {province}
                      </Label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="commission" className="space-y-4 p-1">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Modelo comisión habilitado</p>
                    <p className="text-xs text-muted-foreground">Permite adquirir leads a comisión</p>
                  </div>
                  <Switch
                    checked={formData.commission_enabled}
                    onCheckedChange={c => handleInputChange('commission_enabled', c)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Comisión global personalizada (%)</Label>
                  <Input
                    type="number"
                    placeholder="Dejar vacío para usar la del sistema"
                    value={formData.commission_global_percent ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      handleInputChange('commission_global_percent', v === '' ? null : Math.max(15, parseFloat(v) || 0));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 15%. Vacío = usa configuración maestra</p>
                </div>

                <div className="space-y-2">
                  <Label>Límite semanal de casos a comisión</Label>
                  <Input
                    type="number"
                    placeholder="Ilimitado"
                    value={formData.commission_weekly_limit ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      handleInputChange('commission_weekly_limit', v === '' ? null : parseInt(v) || 0);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Vacío = sin límite</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Comisión progresiva por volumen</p>
                    <p className="text-xs text-muted-foreground">Reduce el % según nº de casos acumulados</p>
                  </div>
                  <Switch
                    checked={formData.commission_progressive_enabled}
                    onCheckedChange={c => handleInputChange('commission_progressive_enabled', c)}
                  />
                </div>

                {formData.commission_progressive_enabled && (
                  <div className="space-y-2 border rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">Tramos progresivos</p>
                    {formData.commission_progressive_tiers.map((tier, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 items-center">
                        <div className="flex items-center gap-1 text-xs">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={tier.from}
                            onChange={e => {
                              const tiers = [...formData.commission_progressive_tiers];
                              tiers[i] = { ...tiers[i], from: parseInt(e.target.value) || 0 };
                              setFormData(prev => ({ ...prev, commission_progressive_tiers: tiers }));
                            }}
                          />
                          <span>–</span>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={tier.to >= 999999 ? '' : tier.to}
                            placeholder="∞"
                            onChange={e => {
                              const tiers = [...formData.commission_progressive_tiers];
                              tiers[i] = { ...tiers[i], to: parseInt(e.target.value) || 999999 };
                              setFormData(prev => ({ ...prev, commission_progressive_tiers: tiers }));
                            }}
                          />
                          <span className="whitespace-nowrap">casos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={tier.percent}
                            onChange={e => {
                              const tiers = [...formData.commission_progressive_tiers];
                              tiers[i] = { ...tiers[i], percent: Math.max(15, parseFloat(e.target.value) || 15) };
                              setFormData(prev => ({ ...prev, commission_progressive_tiers: tiers }));
                            }}
                          />
                          <span className="text-xs">%</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive"
                          onClick={() => {
                            const tiers = formData.commission_progressive_tiers.filter((_, j) => j !== i);
                            setFormData(prev => ({ ...prev, commission_progressive_tiers: tiers }));
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const lastTo = formData.commission_progressive_tiers.length > 0
                          ? (formData.commission_progressive_tiers[formData.commission_progressive_tiers.length - 1].to || 0) + 1
                          : 0;
                        setFormData(prev => ({
                          ...prev,
                          commission_progressive_tiers: [...prev.commission_progressive_tiers, { from: lastTo, to: 999999, percent: 15 }],
                        }));
                      }}
                    >
                      + Añadir tramo
                    </Button>
                    <p className="text-xs text-muted-foreground">Mínimo 15% en cualquier tramo</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Crear despacho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
