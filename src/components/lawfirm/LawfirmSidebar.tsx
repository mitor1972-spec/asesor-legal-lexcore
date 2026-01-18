import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Briefcase,
  ShoppingCart,
  Users,
  Settings,
  Scale,
  X,
  Megaphone,
} from 'lucide-react';

interface LawfirmSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/despacho/dashboard', icon: LayoutDashboard },
  { name: 'Mis Casos', href: '/despacho/casos', icon: Briefcase },
  { name: 'LeadsMarket', href: '/despacho/leadsmarket', icon: ShoppingCart, hasBadge: true },
];

const adminNavigation = [
  { name: 'Equipo', href: '/despacho/equipo', icon: Users },
  { name: 'Anuncios', href: '/despacho/anuncios', icon: Megaphone },
  { name: 'Configuración', href: '/despacho/configuracion', icon: Settings },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user } = useAuthContext();
  
  const isLawfirmAdmin = user?.role === 'lawfirm_admin';

  // Fetch marketplace leads count for badge
  const { data: marketplaceCount } = useQuery({
    queryKey: ['marketplace-leads-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('is_in_marketplace', true);
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/despacho/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-lawfirm-primary">
            <Scale className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg">Portal</span>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                           (item.href !== '/despacho/dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-lawfirm-primary text-white'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {item.hasBadge && marketplaceCount && marketplaceCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {marketplaceCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Navigation */}
        {isLawfirmAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <div className="px-3 mb-2">
              <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Administración
              </span>
            </div>
            <nav className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-lawfirm-primary text-white'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/50 text-center">
          Powered by Lexcore™
        </div>
      </div>
    </div>
  );
}

export function LawfirmSidebar({ open, onClose }: LawfirmSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 border-0">
          <SidebarContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
