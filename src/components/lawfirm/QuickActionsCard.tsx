import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingCart, Briefcase, Phone, Settings, TrendingUp, Users } from 'lucide-react';

interface QuickActionsCardProps {
  pendingCases: number;
  balance: number;
}

export function QuickActionsCard({ pendingCases, balance }: QuickActionsCardProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link to="/despacho/leadsmarket" className="block">
          <Button variant="outline" className="w-full justify-start gap-2">
            <ShoppingCart className="h-4 w-4 text-lawfirm-primary" />
            <span>LeadsMarket</span>
            <span className="ml-auto text-xs text-muted-foreground">{balance.toFixed(0)}€</span>
          </Button>
        </Link>
        
        <Link to="/despacho/casos?status=received" className="block">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Briefcase className="h-4 w-4 text-amber-500" />
            <span>Pendientes de contactar</span>
            {pendingCases > 0 && (
              <span className="ml-auto bg-amber-500/10 text-amber-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {pendingCases}
              </span>
            )}
          </Button>
        </Link>
        
        <Link to="/despacho/casos?status=in_progress" className="block">
          <Button variant="outline" className="w-full justify-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span>Casos en curso</span>
          </Button>
        </Link>

        <Link to="/despacho/equipo" className="block">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Gestionar equipo</span>
          </Button>
        </Link>
        
        <Link to="/despacho/configuracion" className="block">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Configuración</span>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
