import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuthContext();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
