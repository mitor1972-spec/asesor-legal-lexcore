import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { LawfirmSidebar } from './LawfirmSidebar';
import { LawfirmHeader } from './LawfirmHeader';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { useState } from 'react';

export function LawfirmLayout() {
  const { user, loading, isLawfirm, isInternal } = useAuthContext();
  const { isImpersonating } = useImpersonation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow access if lawfirm user OR if admin is impersonating
  if (!isLawfirm && !isImpersonating) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background lawfirm-theme">
      {/* Impersonation Banner */}
      <ImpersonationBanner />
      
      <div className="flex-1 flex">
        <LawfirmSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <LawfirmHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
          <footer className="border-t py-3 px-4 text-center text-xs text-muted-foreground">
            Powered by Lexcore™ — © 2025 Asesor.Legal
          </footer>
        </div>
      </div>
    </div>
  );
}
