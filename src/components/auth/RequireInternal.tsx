import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function RequireInternal({ children }: { children: React.ReactNode }) {
  const { isInternal, loading } = useAuthContext();

  if (loading) return null;
  if (!isInternal) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
