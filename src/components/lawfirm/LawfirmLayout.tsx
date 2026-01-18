import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { LawfirmSidebar } from './LawfirmSidebar';
import { LawfirmHeader } from './LawfirmHeader';
import { useState } from 'react';

export function LawfirmLayout() {
  const { user, loading, isLawfirm } = useAuthContext();
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

  // Redirect internal users to main dashboard
  if (!isLawfirm) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background lawfirm-theme">
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
  );
}
