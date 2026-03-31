import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  ShoppingCart,
  ShoppingBag,
  Users,
  Settings,
  Scale,
  X,
  Megaphone,
  HelpCircle,
  Building,
  ChevronDown,
  Euro,
  CreditCard,
  Brain,
  Globe,
  Bot,
  Mail,
  BarChart3,
  Handshake,
  Percent,
} from 'lucide-react';

interface LawfirmSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/despacho/dashboard', icon: LayoutDashboard },
  { name: 'Mis Casos', href: '/despacho/casos', icon: Briefcase },
  { name: 'LeadsMarket', href: '/despacho/leadsmarket', icon: ShoppingCart, hasBadge: true },
  { name: 'Casos a Comisión', href: '/despacho/comision', icon: Percent },
  { name: 'Venta de Servicios', href: '/despacho/servicios', icon: ShoppingBag },
  { name: 'Informes', href: '/despacho/informes', icon: BarChart3 },
];

const marketingNavigation = [
  { name: 'Web', href: '/despacho/publicidad', icon: Globe },
  { name: 'Asistente Amara', href: '/despacho/publicidad?tab=amara', icon: Bot },
  { name: 'Newsletters', href: '/despacho/publicidad?tab=newsletter', icon: Mail },
];

const adminNavigation = [
  { name: 'Equipo', href: '/despacho/equipo', icon: Users },
  { name: 'Sucursales', href: '/despacho/sucursales', icon: Building },
];

const configNavigation = [
  { name: 'Datos del despacho', href: '/despacho/configuracion', icon: Settings },
  { name: 'Datos fiscales', href: '/despacho/facturacion', icon: CreditCard },
  { name: 'Precios por área', href: '/despacho/precios', icon: Euro },
  { name: 'LeadsMarket', href: '/despacho/configuracion-marketplace', icon: ShoppingCart },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user } = useAuthContext();
  
  // Keep menus expanded by default - read from localStorage for persistence
  const [configOpen, setConfigOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_config_open');
    return stored !== null ? stored === 'true' : true; // Default to true (expanded)
  });
  const [adsOpen, setAdsOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_ads_open');
    return stored !== null ? stored === 'true' : true; // Default to true (expanded)
  });

  // Persist menu state to localStorage
  const handleConfigToggle = (open: boolean) => {
    setConfigOpen(open);
    localStorage.setItem('sidebar_config_open', String(open));
  };

  const handleAdsToggle = (open: boolean) => {
    setAdsOpen(open);
    localStorage.setItem('sidebar_ads_open', String(open));
  };
  
  // Show admin sections to all lawfirm roles
  const isLawfirmUser = user?.role?.startsWith('lawfirm_') || true;

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

  const isActive = (href: string) => {
    if (href.includes('?')) {
      return location.pathname + location.search === href;
    }
    return location.pathname === href || 
           (href !== '/despacho/dashboard' && location.pathname.startsWith(href) && !location.pathname.startsWith(href + '-'));
  };

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
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
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
        {isLawfirmUser && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <div className="px-3 mb-2">
              <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Administración
              </span>
            </div>
            <nav className="space-y-1">
              {adminNavigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-lawfirm-primary text-white'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Configuration Collapsible */}
              <Collapsible open={configOpen} onOpenChange={handleConfigToggle}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5" />
                      Configuración
                    </div>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', configOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {configNavigation.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-lawfirm-primary/20 text-lawfirm-primary'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>

              {/* Marketing Collapsible */}
              <Collapsible open={adsOpen} onOpenChange={handleAdsToggle}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Megaphone className="h-5 w-5" />
                      Marketing
                    </div>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', adsOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {marketingNavigation.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-lawfirm-primary/20 text-lawfirm-primary'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>

              {/* IA for Law Firms */}
              <Link
                to="/despacho/ia-servicios"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive('/despacho/ia-servicios')
                    ? 'bg-lawfirm-primary text-white'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Brain className="h-5 w-5" />
                IA para Despachos
              </Link>

              {/* Outsourcing Comercial */}
              <Link
                to="/despacho/outsourcing"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive('/despacho/outsourcing')
                    ? 'bg-lawfirm-primary text-white'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Handshake className="h-5 w-5" />
                Outsourcing Comercial
              </Link>
            </nav>
          </>
        )}

        {/* Help link */}
        <div className="my-4 border-t border-sidebar-border" />
        <nav className="space-y-1">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); /* TODO: Open help modal */ }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <HelpCircle className="h-5 w-5" />
            Ayuda
          </a>
        </nav>
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
