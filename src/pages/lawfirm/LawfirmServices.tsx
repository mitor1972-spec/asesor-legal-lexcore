import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ShoppingBag, Plus, Edit, Pause, Play, Star, TrendingUp, Euro, Clock, FileText, MapPin, Trash2, Loader2 } from 'lucide-react';
import { LEGAL_AREAS, PROVINCES } from '@/lib/constants';

interface LegalService {
  id: string;
  name: string;
  legal_area: string;
  short_description: string | null;
  full_description: string | null;
  base_price: number;
  estimated_duration: string | null;
  required_documents: string[];
  geographic_scope: string;
  provinces: string[];
  status: 'active' | 'paused' | 'draft';
  total_orders: number;
  total_revenue: number;
  avg_rating: number | null;
  review_count: number;
}

const SERVICE_SUGGESTIONS = {
  'Derecho de Familia': ['Divorcio express mutuo acuerdo', 'Divorcio contencioso', 'Convenio regulador', 'Modificación de medidas', 'Reclamación pensión alimenticia'],
  'Derecho de Sucesiones': ['Testamento abierto', 'Testamento cerrado', 'Aceptación de herencia', 'Renuncia de herencia', 'Declaración de herederos'],
  'Derecho Laboral': ['Reclamación de cantidad', 'Despido improcedente', 'Cálculo finiquito', 'Acoso laboral'],
  'Derecho Civil': ['Reclamación de cantidad (monitorio)', 'Contrato de arrendamiento', 'Desahucio express'],
  'Derecho de Extranjería': ['NIE inicial', 'Renovación NIE', 'Arraigo social', 'Reagrupación familiar', 'Nacionalidad española'],
  'Derecho Mercantil': ['Constitución SL', 'Alta autónomo', 'Modificación estatutos', 'Disolución sociedad'],
  'Derecho de Tráfico': ['Reclamación accidente', 'Recurso multa'],
};

export default function LawfirmServices() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<LegalService | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    legal_area: string;
    short_description: string;
    full_description: string;
    base_price: string;
    estimated_duration: string;
    required_documents: string[];
    geographic_scope: string;
    provinces: string[];
    status: 'active' | 'paused' | 'draft';
  }>({
    name: '',
    legal_area: '',
    short_description: '',
    full_description: '',
    base_price: '',
    estimated_duration: '',
    required_documents: [],
    geographic_scope: 'provinces',
    provinces: [],
    status: 'draft',
  });
  const [newDocument, setNewDocument] = useState('');

  // Fetch services
  const { data: services, isLoading } = useQuery({
    queryKey: ['lawfirm-services', user?.profile?.lawfirm_id],
    queryFn: async () => {
      if (!user?.profile?.lawfirm_id) return [];
      const { data, error } = await supabase
        .from('legal_services')
        .select('*')
        .eq('lawfirm_id', user.profile.lawfirm_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LegalService[];
    },
    enabled: !!user?.profile?.lawfirm_id,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        lawfirm_id: user?.profile?.lawfirm_id,
        name: data.name,
        legal_area: data.legal_area,
        short_description: data.short_description || null,
        full_description: data.full_description || null,
        base_price: parseFloat(data.base_price) || 0,
        estimated_duration: data.estimated_duration || null,
        required_documents: data.required_documents,
        geographic_scope: data.geographic_scope,
        provinces: data.geographic_scope === 'all_spain' ? [] : data.provinces,
        status: data.status,
      };

      if (data.id) {
        const { error } = await supabase
          .from('legal_services')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('legal_services')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingService ? 'Servicio actualizado' : 'Servicio creado');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-services'] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'paused' : 'active';
      const { error } = await supabase
        .from('legal_services')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-services'] });
      toast.success('Estado actualizado');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legal_services')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawfirm-services'] });
      toast.success('Servicio eliminado');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      legal_area: '',
      short_description: '',
      full_description: '',
      base_price: '',
      estimated_duration: '',
      required_documents: [],
      geographic_scope: 'provinces',
      provinces: [],
      status: 'draft',
    });
    setEditingService(null);
    setNewDocument('');
  };

  const openEditDialog = (service: LegalService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      legal_area: service.legal_area,
      short_description: service.short_description || '',
      full_description: service.full_description || '',
      base_price: service.base_price.toString(),
      estimated_duration: service.estimated_duration || '',
      required_documents: service.required_documents || [],
      geographic_scope: service.geographic_scope || 'provinces',
      provinces: service.provinces || [],
      status: service.status,
    });
    setIsDialogOpen(true);
  };

  const addDocument = () => {
    if (newDocument.trim()) {
      setFormData(prev => ({
        ...prev,
        required_documents: [...prev.required_documents, newDocument.trim()]
      }));
      setNewDocument('');
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      required_documents: prev.required_documents.filter((_, i) => i !== index)
    }));
  };

  const toggleProvince = (province: string) => {
    setFormData(prev => ({
      ...prev,
      provinces: prev.provinces.includes(province)
        ? prev.provinces.filter(p => p !== province)
        : [...prev.provinces, province]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Activo</Badge>;
      case 'paused':
        return <Badge variant="secondary">⏸️ Pausado</Badge>;
      default:
        return <Badge variant="outline">📝 Borrador</Badge>;
    }
  };

  const suggestions = formData.legal_area ? SERVICE_SUGGESTIONS[formData.legal_area as keyof typeof SERVICE_SUGGESTIONS] || [] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-lawfirm-primary" />
            Venta de Servicios Jurídicos
          </h1>
          <p className="text-muted-foreground">
            Ofrece tus servicios a precio cerrado. Los usuarios podrán contratarlos directamente desde Asesor.Legal.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Crear servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar servicio' : 'Crear nuevo servicio'}</DialogTitle>
              <DialogDescription>
                Define un servicio jurídico a precio cerrado para tus clientes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Información básica</h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del servicio *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Divorcio Express Mutuo Acuerdo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Área legal *</Label>
                    <Select 
                      value={formData.legal_area} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, legal_area: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona área" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEGAL_AREAS.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {suggestions.length > 0 && !formData.name && (
                    <div className="space-y-2">
                      <Label className="text-xs">Sugerencias:</Label>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => setFormData(prev => ({ ...prev, name: s }))}
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Descripción corta</Label>
                    <Textarea
                      value={formData.short_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                      placeholder="Breve descripción del servicio..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Price & Duration */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Precio y plazos</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio base (€) *</Label>
                    <Input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                      placeholder="350"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plazo estimado</Label>
                    <Input
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                      placeholder="3-4 semanas"
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Documentación requerida</h3>
                
                <div className="flex gap-2">
                  <Input
                    value={newDocument}
                    onChange={(e) => setNewDocument(e.target.value)}
                    placeholder="Ej: DNI de ambos cónyuges"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                  />
                  <Button type="button" variant="outline" onClick={addDocument}>
                    Añadir
                  </Button>
                </div>
                
                {formData.required_documents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.required_documents.map((doc, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {doc}
                        <button onClick={() => removeDocument(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Geographic Scope */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Ámbito geográfico</h3>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.geographic_scope === 'all_spain'}
                      onChange={() => setFormData(prev => ({ ...prev, geographic_scope: 'all_spain', provinces: [] }))}
                      className="w-4 h-4"
                    />
                    <span>Toda España (online)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.geographic_scope === 'provinces'}
                      onChange={() => setFormData(prev => ({ ...prev, geographic_scope: 'provinces' }))}
                      className="w-4 h-4"
                    />
                    <span>Solo provincias específicas</span>
                  </label>
                </div>

                {formData.geographic_scope === 'provinces' && (
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                    {PROVINCES.map(prov => (
                      <label key={prov} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={formData.provinces.includes(prov)}
                          onCheckedChange={() => toggleProvince(prov)}
                        />
                        <span className="truncate">{prov}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Visibilidad</h3>
                
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'active' | 'paused' | 'draft') => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Activo (visible en Asesor.Legal)</SelectItem>
                    <SelectItem value="paused">⏸️ Pausado (no visible, pero guardado)</SelectItem>
                    <SelectItem value="draft">📝 Borrador (en preparación)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button 
                onClick={() => saveMutation.mutate({ ...formData, id: editingService?.id })}
                disabled={!formData.name || !formData.legal_area || !formData.base_price || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  '💾 Guardar servicio'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : services?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No tienes servicios creados</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Crea tu primer servicio para que los clientes puedan contratarlo directamente
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear primer servicio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Tus servicios activos:</h2>
          
          {services?.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{service.name}</span>
                      {getStatusBadge(service.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>⚖️ {service.legal_area}</span>
                      <span>💰 {service.base_price}€</span>
                      {service.estimated_duration && <span>🕐 {service.estimated_duration}</span>}
                    </div>
                    {service.short_description && (
                      <p className="text-sm text-muted-foreground mt-2">{service.short_description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {service.total_orders} contrataciones
                      </span>
                      {service.avg_rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500" />
                          {service.avg_rating.toFixed(1)} ({service.review_count})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleStatusMutation.mutate({ id: service.id, status: service.status })}
                    >
                      {service.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('¿Eliminar este servicio?')) {
                          deleteMutation.mutate(service.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
