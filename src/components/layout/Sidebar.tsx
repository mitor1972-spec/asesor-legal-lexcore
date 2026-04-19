import { forwardRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { Scale, LayoutDashboard, Users, Plus, Settings, X, UserCog, ChevronDown, Key, Cog, Building2, BarChart3, MessageSquare, FileCheck, Bot, AlertTriangle, Crown, ShieldCheck, ClipboardList, Megaphone, Search, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ViewSwitcher } from './ViewSwitcher';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Nuevo Lead', href: '/leads/new', icon: Plus },
  { label: 'Informes', href: '/informes/ventas', icon: BarChart3 },
  { label: 'Alta Despacho (vista)', href: '/alta-despacho', icon: ClipboardList },
];

const configSubItems = [
  { label: 'Config. Maestra', href: '/settings/master-config', icon: Crown },
  { label: 'API Keys', href: '/settings/api-keys', icon: Key },
  { label: 'Configuración Lexcore', href: '/settings/lexcore', icon: Cog },
  { label: 'Instrucciones IA', href: '/settings/ai-prompts', icon: Bot },
  { label: 'Gestión de Despachos', href: '/settings/lawfirms', icon: Building2 },
  { label: 'Solicitudes Despachos', href: '/settings/solicitudes', icon: FileCheck },
  { label: 'Chatwoot', href: '/settings/chatwoot', icon: MessageSquare },
  { label: 'Control de Calidad', href: '/settings/quality-control', icon: ShieldCheck },
  { label: 'Productos Publicidad', href: '/settings/ad-products', icon: Megaphone },
  { label: 'Leads Descartados', href: '/settings/discarded-leads', icon: AlertTriangle },
  { label: 'Verificación SEO', href: '/settings/seo-analyzer', icon: Search },
  { label: 'Marketplace Proveedores', href: '/settings/provider-marketplace', icon: Store },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const SidebarContent = forwardRef<HTMLDivElement, { onClose?: () => void }>(({ onClose }, ref) => {
  const location = useLocation();
  const { isAdmin } = useAuthContext();
  const [configOpen, setConfigOpen] = useState(true);

  return (
    <div ref={ref} className="flex flex-col h-full w-full min-w-0 bg-sidebar text-sidebar-foreground overflow-hidden">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="p-1.5 rounded-lg bg-sidebar-primary">
              <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-display font-bold text-lg">LexMarket</span>
              <span className="text-sidebar-primary">™</span>
            </div>
          </Link>
          {onClose && (
            <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/leads/new' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />

            <Link
              to="/users"
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/users'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <UserCog className="h-4 w-4" />
              Usuarios
            </Link>

            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname.startsWith('/settings')
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    Configuración
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', configOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 ml-4 space-y-1">
                {configSubItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>

            <ViewSwitcher onClose={onClose} />
          </>
        )}
      </nav>
    </div>
  );
});

SidebarContent.displayName = 'SidebarContent';

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden md:flex md:flex-col w-64 flex-shrink-0 overflow-hidden">
        <SidebarContent />
      </aside>

      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Menú principal</SheetTitle>
          <SheetDescription className="sr-only">
            Navegación principal del panel de administración.
          </SheetDescription>
          <SidebarContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
