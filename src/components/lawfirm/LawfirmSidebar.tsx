import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Users,
  Settings,
  Scale,
  X,
  Megaphone,
  HelpCircle,
  Building,
  ChevronDown,
  CreditCard,
  Brain,
  Globe,
  Bot,
  Mail,
  BarChart3,
  Handshake,
  Percent,
  Radar,
  ShoppingBag,
  LogOut,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

interface LawfirmSidebarProps {
  open: boolean;
  onClose: () => void;
}

const mainNavigation = [
  { name: 'Dashboard', href: '/despacho/dashboard', icon: LayoutDashboard },
  { name: 'LeadMarket', href: '/despacho/leadsmarket', icon: ShoppingCart, hasBadge: true },
  { name: 'Casos a Comisión', href: '/despacho/comision', icon: Percent },
  { name: 'Radar', href: '/despacho/radar', icon: Radar },
  { name: 'Mis Casos', href: '/despacho/casos', icon: Briefcase },
  { name: 'Venta de Servicios', href: '/despacho/servicios', icon: ShoppingBag },
  { name: 'Informes', href: '/despacho/informes', icon: BarChart3 },
];

const adminNavigation = [
  { name: 'Datos del despacho', href: '/despacho/configuracion', icon: Settings },
  { name: 'Equipo', href: '/despacho/equipo', icon: Users },
  { name: 'Sucursales', href: '/despacho/sucursales', icon: Building },
  { name: 'Facturación y Pagos', href: '/despacho/facturacion', icon: CreditCard },
];

const marketingNavigation = [
  { name: 'Publicidad Web', href: '/despacho/publicidad?tab=web', icon: Globe },
  { name: 'Asistente Virtual', href: '/despacho/publicidad?tab=asistente', icon: Bot },
  { name: 'Newsletters', href: '/despacho/publicidad?tab=newsletter', icon: Mail },
  { name: 'Outsourcing Comercial', href: '/despacho/outsourcing', icon: Handshake },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  
  const [adminOpen, setAdminOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_admin_open');
    return stored !== null ? stored === 'true' : true;
  });
  const [marketingOpen, setMarketingOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_marketing_open');
    return stored !== null ? stored === 'true' : true;
  });

  const handleAdminToggle = (open: boolean) => {
    setAdminOpen(open);
    localStorage.setItem('sidebar_admin_open', String(open));
  };
  const handleMarketingToggle = (open: boolean) => {
    setMarketingOpen(open);
    localStorage.setItem('sidebar_marketing_open', String(open));
  };

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
    refetchInterval: 60000,
  });

  const isActive = (href: string) => {
    if (href.includes('?')) {
      return location.pathname + location.search === href;
    }
    return location.pathname === href || 
           (href !== '/despacho/dashboard' && location.pathname.startsWith(href) && !location.pathname.startsWith(href + '-'));
  };

  const navLinkClass = (href: string) => cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    isActive(href)
      ? 'bg-lawfirm-primary text-white'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
  );

  const subLinkClass = (href: string) => cn(
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive(href)
      ? 'bg-lawfirm-primary/20 text-lawfirm-primary'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/despacho/portada" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-lawfirm-primary">
            <Scale className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-lg">LexMarket</span>
            <span className="text-[10px] text-sidebar-foreground/50">Portal del Despacho</span>
          </div>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* MENÚ PRINCIPAL */}
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Menú Principal</span>
        </div>
        <nav className="space-y-1">
          {mainNavigation.map((item) => (
            <Link key={item.name} to={item.href} onClick={onClose} className={navLinkClass(item.href)}>
              <item.icon className="h-5 w-5" />
              {item.name}
              {item.hasBadge && (marketplaceCount ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{marketplaceCount}</Badge>
              )}
            </Link>
          ))}
        </nav>

        {/* CONFIGURACIÓN MARKETPLACE */}
        <div className="my-4 border-t border-sidebar-border" />
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Config. Marketplace</span>
        </div>
        <nav className="space-y-1">
          <Link to="/despacho/configuracion-marketplace" onClick={onClose} className={navLinkClass('/despacho/configuracion-marketplace')}>
            <SlidersHorizontal className="h-5 w-5" />
            Configuración Marketplace
          </Link>
        </nav>

        {/* ADMINISTRACIÓN */}
        <div className="my-4 border-t border-sidebar-border" />
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Administración</span>
        </div>
        <nav className="space-y-1">
          {adminNavigation.map((item) => (
            <Link key={item.name} to={item.href} onClick={onClose} className={navLinkClass(item.href)}>
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* MARKETING */}
        <div className="my-4 border-t border-sidebar-border" />
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Marketing - Potencia tu despacho</span>
        </div>
        <nav className="space-y-1">
          {marketingNavigation.map((item) => (
            <Link key={item.name} to={item.href} onClick={onClose} className={navLinkClass(item.href)}>
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* IA PARA DESPACHOS */}
        <div className="my-4 border-t border-sidebar-border" />
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">IA para Despachos</span>
        </div>
        <nav className="space-y-1">
          <Link to="/despacho/ia-servicios" onClick={onClose} className={navLinkClass('/despacho/ia-servicios')}>
            <Brain className="h-5 w-5" />
            IA para Despachos
          </Link>
        </nav>


        {/* AYUDA + LOGOUT */}
        <div className="my-4 border-t border-sidebar-border" />
        <nav className="space-y-1">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <HelpCircle className="h-5 w-5" />
            Ayuda
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground w-full text-left"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/50 text-center">Powered by LexMarket™</div>
      </div>
    </div>
  );
}

export function LawfirmSidebar({ open, onClose }: LawfirmSidebarProps) {
  return (
    <>
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 border-0">
          <SidebarContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
