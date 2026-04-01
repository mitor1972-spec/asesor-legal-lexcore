import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Euro, TrendingUp, Receipt, AlertCircle } from 'lucide-react';

interface CaseEconomicSummaryProps {
  leadCost: number | null;
  clientFee: number | null;
  successPercentage: number | null;
  claimedAmount: number | null;
  wonAmount: number | null;
  wonPercentage: number | null;
  feeAcceptedAt: string | null;
  firmStatus: string;
  isCommission: boolean;
  commissionPercent: number | null;
}

export function CaseEconomicSummary({
  leadCost, clientFee, successPercentage, claimedAmount,
  wonAmount, wonPercentage, feeAcceptedAt, firmStatus,
  isCommission, commissionPercent,
}: CaseEconomicSummaryProps) {
  const isWon = firmStatus === 'won';
  const isClosed = ['won', 'lost', 'rejected', 'archived', 'invalidated'].includes(firmStatus);

  const formatCurrency = (v: number | null) => {
    if (v === null || v === undefined) return '—';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);
  };

  const totalInvoiced = (clientFee || 0) + (leadCost || 0);
  const successFee = wonAmount && (wonPercentage || successPercentage)
    ? wonAmount * (wonPercentage || successPercentage || 0) / 100
    : 0;
  const totalCollected = isWon ? (clientFee || 0) + successFee : 0;
  const commissionGenerated = isCommission && commissionPercent && totalCollected > 0
    ? totalCollected * commissionPercent / 100
    : 0;
  const commissionPending = isCommission && !isClosed ? commissionGenerated : 0;
  const commissionSettled = isCommission && isClosed && isWon ? commissionGenerated : 0;

  return (
    <Card className="shadow-soft">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Resumen Económico
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total facturado</p>
            <p className="text-lg font-bold">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total cobrado</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalCollected)}</p>
          </div>
          {isCommission && (
            <>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Comisión generada</p>
                <p className="text-lg font-bold">{formatCurrency(commissionGenerated)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <p className="text-xs text-muted-foreground">Comisión pendiente</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(commissionPending)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground">Comisión liquidada</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(commissionSettled)}</p>
              </div>
            </>
          )}
        </div>

        {feeAcceptedAt && (
          <div className="mt-2">
            <Badge variant="outline" className="text-green-600 text-xs">✓ Minuta aceptada</Badge>
          </div>
        )}

        {isCommission && firmStatus === 'won' && !(clientFee && wonAmount) && (
          <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            Complete minuta e importe cobrado para calcular la comisión final.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
