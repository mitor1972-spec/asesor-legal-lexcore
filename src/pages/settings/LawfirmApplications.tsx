import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, CheckCircle, XCircle, Clock, Eye, Building2, MapPin, Scale, Loader2 } from 'lucide-react';

type ApplicationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

interface Application {
  id: string;
  name: string;
  cif: string;
  phone: string;
  email: string;
  website: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  contact_name: string;
  contact_role: string | null;
  contact_email: string;
  contact_phone: string | null;
  areas_selected: string[] | null;
  provinces_selected: string[] | null;
  all_spain: boolean;
  monthly_capacity: number | null;
  max_price_per_lead: number | null;
  min_score: number | null;
  num_lawyers: string | null;
  has_multiple_offices: boolean;
  referral_source: string | null;
  comments: string | null;
  status: ApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Clock },
  reviewing: { label: 'En revisión', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Eye },
  approved: { label: 'Aprobada', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
};

export default function LawfirmApplications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('pending');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['lawfirm-applications', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('lawfirm_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Application[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (application: Application) => {
      const { data, error } = await supabase.functions.invoke('approve-application', {
        body: { application_id: application.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Solicitud aprobada. El despacho ha sido creado.');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-applications'] });
      setShowDetailDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al aprobar la solicitud');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from('lawfirm_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      queryClient.invalidateQueries({ queryKey: ['lawfirm-applications'] });
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setRejectionReason('');
    },
    onError: () => {
      toast.error('Error al rechazar la solicitud');
    },
  });

  const handleApprove = () => {
    if (selectedApp) {
      approveMutation.mutate(selectedApp);
    }
  };

  const handleReject = () => {
    if (selectedApp && rejectionReason.trim()) {
      rejectMutation.mutate({ applicationId: selectedApp.id, reason: rejectionReason });
    }
  };

  const pendingCount = applications?.filter(a => a.status === 'pending').length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Solicitudes de Alta
        </h1>
        <p className="text-muted-foreground">Gestiona las solicitudes de nuevos despachos</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ApplicationStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pendientes
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewing">En revisión</TabsTrigger>
          <TabsTrigger value="approved">Aprobadas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-[150px]" />
              ))}
            </div>
          ) : applications?.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No hay solicitudes</h3>
                <p className="text-muted-foreground mt-1">
                  No hay solicitudes en este estado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications?.map((app) => {
                const statusConfig = STATUS_CONFIG[app.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={app.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(app.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {app.name}
                          </h3>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {app.city}, {app.province}
                            </span>
                            <span>
                              {app.num_lawyers || '?'} abogados
                            </span>
                            <span className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {app.areas_selected?.slice(0, 3).join(', ')}
                              {(app.areas_selected?.length || 0) > 3 && '...'}
                            </span>
                          </div>
                          
                          <p className="text-sm">
                            <span className="text-muted-foreground">Contacto:</span>{' '}
                            {app.contact_name} • {app.contact_email}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedApp(app);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button 
                                variant="default"
                                onClick={() => {
                                  setSelectedApp(app);
                                  approveMutation.mutate(app);
                                }}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                              <Button 
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
            <DialogDescription>
              {selectedApp?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="font-medium">{selectedApp.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CIF</Label>
                  <p className="font-medium">{selectedApp.cif}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedApp.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <p className="font-medium">{selectedApp.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground">Dirección</Label>
                  <p className="font-medium">
                    {selectedApp.address}, {selectedApp.postal_code} {selectedApp.city}, {selectedApp.province}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Persona de contacto</Label>
                <p className="font-medium">{selectedApp.contact_name}</p>
                <p className="text-sm text-muted-foreground">{selectedApp.contact_email}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Áreas legales</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedApp.areas_selected?.map(area => (
                    <Badge key={area} variant="secondary">{area}</Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Ámbito de actuación</Label>
                <p className="font-medium">
                  {selectedApp.all_spain 
                    ? 'Toda España' 
                    : selectedApp.provinces_selected?.join(', ') || 'No especificado'
                  }
                </p>
              </div>

              <div className="border-t pt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Capacidad mensual</Label>
                  <p className="font-medium">{selectedApp.monthly_capacity || '-'} leads</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Precio máx.</Label>
                  <p className="font-medium">{selectedApp.max_price_per_lead || '-'}€</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Score mín.</Label>
                  <p className="font-medium">{selectedApp.min_score || '-'}</p>
                </div>
              </div>

              {selectedApp.comments && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Comentarios</Label>
                  <p className="text-sm">{selectedApp.comments}</p>
                </div>
              )}

              {selectedApp.rejection_reason && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-destructive">Motivo de rechazo</Label>
                  <p className="text-sm text-destructive">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Cerrar
            </Button>
            {selectedApp?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  Rechazar
                </Button>
                <Button 
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aprobando...
                    </>
                  ) : (
                    'Aprobar solicitud'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo. Se enviará al solicitante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Documentación incompleta, CIF no válido..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                'Confirmar rechazo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
