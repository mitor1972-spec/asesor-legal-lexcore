import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { Scale, LayoutDashboard, Users, Plus, Settings, X, UserCog, ChevronDown, Key, Cog, Building2, BarChart3, MessageSquare, FileCheck, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ViewSwitcher } from './ViewSwitcher';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Nuevo Lead', href: '/leads/new', icon: Plus },
  { label: 'Informes', href: '/informes/ventas', icon: BarChart3 },
];

const configSubItems = [
  { label: 'API Keys', href: '/settings/api-keys', icon: Key },
  { label: 'Configuración Lexcore', href: '/settings/lexcore', icon: Cog },
  { label: 'Instrucciones IA', href: '/settings/ai-prompts', icon: Bot },
  { label: 'Gestión de Despachos', href: '/settings/lawfirms', icon: Building2 },
  { label: 'Solicitudes Despachos', href: '/settings/solicitudes', icon: FileCheck },
  { label: 'Chatwoot', href: '/settings/chatwoot', icon: MessageSquare },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { isAdmin } = useAuthContext();
  // Always keep config expanded for admins
  const [configOpen, setConfigOpen] = useState(true);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="p-1.5 rounded-lg bg-sidebar-primary">
              <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-display font-bold text-lg">Lexcore</span>
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

            {/* View Switcher */}
            <ViewSwitcher onClose={onClose} />
          </>
        )}
      </nav>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
          <SidebarContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
