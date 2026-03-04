import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getDefaultRouteForRole } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">A validar acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    if (!role) {
      // User is authenticated but role failed to hydrate (network error, orphan, etc.)
      console.warn('[ProtectedRoute] Authenticated user missing role. Redirecting to login.');
      return <Navigate to="/login" state={{ from: location, error: 'missing_role' }} replace />;
    }

    if (!allowedRoles.includes(role)) {
      return <Navigate to={getDefaultRouteForRole(role)} replace />;
    }
  }

  return <>{children}</>;
}
