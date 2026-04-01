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
      setFormData({
        name: existingLawfirm.name || '',
        cif: existingLawfirm.cif || '',
        phone: existingLawfirm.phone || '',
        address: existingLawfirm.address || '',
        city: existingLawfirm.city || '',
        province: existingLawfirm.province || '',
        postal_code: existingLawfirm.postal_code || '',
        website: existingLawfirm.website || '',
        contact_person: existingLawfirm.contact_person || '',
        contact_email: existingLawfirm.contact_email || '',
        contact_phone: existingLawfirm.contact_phone || '',
        email_derivations: existingLawfirm.email_derivations || '',
        monthly_capacity: existingLawfirm.monthly_capacity || 0,
        max_lead_price: existingLawfirm.max_lead_price || 0,
        min_lead_score: existingLawfirm.min_lead_score || 0,
        is_active: existingLawfirm.is_active ?? true,
        commercial_notes: existingLawfirm.commercial_notes || '',
      });
      setAreasAccepted(existingLawfirm.areas_accepted || []);
      setProvincesAccepted(existingLawfirm.provinces_accepted || []);
      setAllSpain(existingLawfirm.provinces_accepted?.length === PROVINCIAS_ESPANA.length);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Datos Básicos</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="areas">Áreas Legales</TabsTrigger>
              <TabsTrigger value="provinces">Provincias</TabsTrigger>
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
