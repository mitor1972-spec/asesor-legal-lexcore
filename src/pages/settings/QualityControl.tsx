import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, Clock,
  AlertTriangle, User, Scale, Phone, Mail, Euro, FileText
} from 'lucide-react';

const REASON_LABELS: Record<string, string> = {
  phone_invalid: 'Teléfono inexistente',
  email_invalid: 'Email incorrecto',
  client_denies: 'Cliente niega solicitud',
  client_expected_free: 'Cliente esperaba gratuidad',
  fake_data: 'Datos falsos',
  case_nonexistent: 'Caso inexistente',
  other: 'Otro motivo',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function QualityControl() {
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['lead-claims-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_claims' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lawfirm names for display
  const lawfirmIds = [...new Set(claims.map((c: any) => c.lawfirm_id).filter(Boolean))];
  const { data: lawfirmsMap = {} } = useQuery({
    queryKey: ['claims-lawfirms', lawfirmIds],
    queryFn: async () => {
      if (lawfirmIds.length === 0) return {};
      const { data } = await supabase.from('lawfirms').select('id, name').in('id', lawfirmIds);
      const map: Record<string, string> = {};
      (data || []).forEach((l: any) => { map[l.id] = l.name; });
      return map;
    },
    enabled: lawfirmIds.length > 0,
  });

  // Fetch lead details
  const leadIds = [...new Set(claims.map((c: any) => c.lead_id).filter(Boolean))];
  const { data: leadsMap = {} } = useQuery({
    queryKey: ['claims-leads', leadIds],
    queryFn: async () => {
      if (leadIds.length === 0) return {};
      const { data } = await supabase.from('leads').select('id, structured_fields, score_final, price_final').in('id', leadIds);
      const map: Record<string, any> = {};
      (data || []).forEach((l: any) => { map[l.id] = l; });
      return map;
    },
    enabled: leadIds.length > 0,
  });

  // Anti-fraud: check high rejection rates
  const { data: fraudAlerts = [] } = useQuery({
    queryKey: ['fraud-alerts'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentClaims } = await supabase
        .from('lead_claims' as any)
        .select('lawfirm_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!recentClaims || recentClaims.length === 0) return [];

      // Count claims per lawfirm
      const claimCounts: Record<string, number> = {};
      recentClaims.forEach((c: any) => {
        claimCounts[c.lawfirm_id] = (claimCounts[c.lawfirm_id] || 0) + 1;
      });

      // Count total purchases per lawfirm
      const { data: purchases } = await supabase
        .from('lead_assignments')
        .select('lawfirm_id')
        .gte('assigned_at', thirtyDaysAgo.toISOString())
        .in('lawfirm_id', Object.keys(claimCounts));

      const purchaseCounts: Record<string, number> = {};
      (purchases || []).forEach((p: any) => {
        purchaseCounts[p.lawfirm_id] = (purchaseCounts[p.lawfirm_id] || 0) + 1;
      });

      return Object.entries(claimCounts)
        .filter(([id, count]) => {
          const totalPurchases = purchaseCounts[id] || 1;
          return (count / totalPurchases) > 0.3;
        })
        .map(([id, count]) => ({
          lawfirmId: id,
          lawfirmName: lawfirmsMap[id] || id,
          claimCount: count,
          purchaseCount: purchaseCounts[id] || 0,
          rate: Math.round((count / (purchaseCounts[id] || 1)) * 100),
        }));
    },
    enabled: Object.keys(lawfirmsMap).length > 0,
  });

  const handleOpenReview = (claim: any) => {
    setSelectedClaim(claim);
    setAdminNotes(claim.admin_notes || '');
    setIsApproving(false);
    setReviewDialogOpen(true);
  };

  const handleResolve = async (approve: boolean) => {
    if (!selectedClaim) return;
    setIsApproving(true);

    try {
      // Update claim
      const { error } = await supabase
        .from('lead_claims' as any)
        .update({
          status: approve ? 'approved' : 'rejected',
          admin_notes: adminNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedClaim.id);
      if (error) throw error;

      if (approve) {
        // Refund: check if it was a credit purchase
        const { data: assignment } = await supabase
          .from('lead_assignments')
          .select('lawfirm_id, lead_cost, is_commission')
          .eq('id', selectedClaim.assignment_id)
          .single();

        if (assignment && !assignment.is_commission && assignment.lead_cost) {
          // Refund credit
          const { data: lawfirm } = await supabase
            .from('lawfirms')
            .select('marketplace_balance')
            .eq('id', assignment.lawfirm_id)
            .single();

          const currentBalance = lawfirm?.marketplace_balance || 0;
          const newBalance = currentBalance + assignment.lead_cost;

          await supabase
            .from('lawfirms')
            .update({ marketplace_balance: newBalance })
            .eq('id', assignment.lawfirm_id);

          // Record transaction
          await supabase.from('balance_transactions').insert({
            lawfirm_id: assignment.lawfirm_id,
            amount: assignment.lead_cost,
            type: 'refund',
            description: `Abono por reclamación de calidad aprobada`,
            balance_before: currentBalance,
            balance_after: newBalance,
            reference_id: selectedClaim.lead_id,
          });

          // Update claim with refund details
          await supabase
            .from('lead_claims' as any)
            .update({
              refund_amount: assignment.lead_cost,
              refund_type: 'credit',
            })
            .eq('id', selectedClaim.id);
        }

        if (assignment?.is_commission) {
          // Remove commission obligation
          await supabase
            .from('lead_assignments')
            .update({ 
              firm_status: 'invalidated',
              is_commission: false,
            })
            .eq('id', selectedClaim.assignment_id);
        } else {
          await supabase
            .from('lead_assignments')
            .update({ firm_status: 'invalidated' })
            .eq('id', selectedClaim.assignment_id);
        }
      } else {
        // Rejected - restore case status
        await supabase
          .from('lead_assignments')
          .update({ firm_status: 'received' })
          .eq('id', selectedClaim.assignment_id);
      }

      toast.success(approve ? 'Reclamación aprobada y abono generado' : 'Reclamación rechazada');
      queryClient.invalidateQueries({ queryKey: ['lead-claims-admin'] });
      setReviewDialogOpen(false);
    } catch (err) {
      toast.error('Error al procesar la reclamación');
    } finally {
      setIsApproving(false);
    }
  };

  const pendingClaims = claims.filter((c: any) => c.status === 'pending');
  const resolvedClaims = claims.filter((c: any) => c.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderClaimRow = (claim: any) => {
    const lead = leadsMap[claim.lead_id];
    const fields = lead?.structured_fields as Record<string, unknown> || {};
    const statusCfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.icon;

    return (
      <div
        key={claim.id}
        className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => handleOpenReview(claim)}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="shrink-0">
            <StatusIcon className={`h-5 w-5 ${claim.status === 'pending' ? 'text-amber-500' : claim.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {(fields.nombre as string) || 'Lead'} — {(fields.area_legal as string) || 'Sin área'}
              </span>
              <Badge variant="outline" className={`text-xs shrink-0 ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{REASON_LABELS[claim.claim_reason] || claim.claim_reason}</span>
              <span>•</span>
              <span>{lawfirmsMap[claim.lawfirm_id] || 'Despacho'}</span>
              <span>•</span>
              <span>{format(new Date(claim.created_at), "dd MMM yyyy", { locale: es })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead?.score_final && (
            <Badge variant="secondary" className="text-xs">{lead.score_final}pts</Badge>
          )}
          {claim.refund_amount && (
            <Badge variant="outline" className="text-xs text-emerald-600">+{claim.refund_amount}€</Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Control de Calidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona reclamaciones de leads y garantía de calidad
        </p>
      </div>

      {/* Anti-fraud alerts */}
      {fraudAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Alerta antifraude:</strong>{' '}
            {fraudAlerts.map(a => (
              <span key={a.lawfirmId}>
                {a.lawfirmName} ({a.rate}% reclamaciones — {a.claimCount}/{a.purchaseCount} casos)
              </span>
            )).reduce((prev, curr, i) => <>{prev}{i > 0 ? ', ' : ''}{curr}</>)}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{pendingClaims.length}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{resolvedClaims.filter((c: any) => c.status === 'approved').length}</p>
              <p className="text-xs text-muted-foreground">Aprobadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{resolvedClaims.filter((c: any) => c.status === 'rejected').length}</p>
              <p className="text-xs text-muted-foreground">Rechazadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pendingClaims.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resueltas ({resolvedClaims.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {pendingClaims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay reclamaciones pendientes</p>
                </div>
              ) : (
                pendingClaims.map(renderClaimRow)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardContent className="p-0">
              {resolvedClaims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay reclamaciones resueltas</p>
                </div>
              ) : (
                resolvedClaims.map(renderClaimRow)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Revisar Reclamación
            </DialogTitle>
          </DialogHeader>

          {selectedClaim && (() => {
            const lead = leadsMap[selectedClaim.lead_id];
            const fields = lead?.structured_fields as Record<string, unknown> || {};
            return (
              <div className="space-y-4 py-2">
                {/* Lead info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Despacho</p>
                    <p className="font-medium">{lawfirmsMap[selectedClaim.lawfirm_id] || '—'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Fecha reclamación</p>
                    <p className="font-medium">{format(new Date(selectedClaim.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Lead</p>
                    <p className="font-medium">{(fields.nombre as string) || 'Sin nombre'} — {(fields.area_legal as string) || ''}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Score / Precio</p>
                    <p className="font-medium">{lead?.score_final || 0}pts / {lead?.price_final || 0}€</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</p>
                    <p className="font-medium">{(fields.telefono as string) || '—'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                    <p className="font-medium">{(fields.email as string) || '—'}</p>
                  </div>
                </div>

                {/* Claim details */}
                <div className="border-t pt-3 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Motivo</p>
                    <Badge variant="outline" className="mt-1">{REASON_LABELS[selectedClaim.claim_reason] || selectedClaim.claim_reason}</Badge>
                  </div>
                  {selectedClaim.reason_detail && (
                    <div>
                      <p className="text-xs text-muted-foreground">Detalle</p>
                      <p className="text-sm mt-1 bg-muted/50 rounded p-2">{selectedClaim.reason_detail}</p>
                    </div>
                  )}
                </div>

                {/* Admin notes */}
                {selectedClaim.status === 'pending' && (
                  <div className="border-t pt-3 space-y-1.5">
                    <Label className="text-xs">Notas del administrador</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Notas internas sobre esta reclamación..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}

                {selectedClaim.status !== 'pending' && selectedClaim.admin_notes && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground">Notas admin</p>
                    <p className="text-sm mt-1 bg-muted/50 rounded p-2">{selectedClaim.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            {selectedClaim?.status === 'pending' ? (
              <>
                <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={isApproving}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleResolve(false)}
                  disabled={isApproving}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleResolve(true)}
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Aprobar abono
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cerrar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
