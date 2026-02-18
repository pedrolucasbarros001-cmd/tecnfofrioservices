import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getDefaultRouteForRole } from '@/contexts/AuthContext';

export function useRoleRedirect() {
    const { role, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && isAuthenticated && role) {
            // Only redirect if we are at root or login, or if we want to enforce role pages
            // For now, let's just provide the capability to redirect to default dashboard
            if (location.pathname === '/login' || location.pathname === '/') {
                const path = getDefaultRouteForRole(role);
                navigate(path, { replace: true });
            }
        }
    }, [role, isAuthenticated, loading, navigate, location]);
}
