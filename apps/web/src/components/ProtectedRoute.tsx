/**
 * ProtectedRoute — route guard component.
 *
 * Checks authentication state and role-based access. Renders an <Outlet /> for
 * child routes when authorized, or redirects otherwise.
 */

import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '@laundry/shared';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  /** Roles allowed to access this route. Admin always has implicit access. */
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = allowedRoles.includes(user.role);
  if (!hasAccess) {
    // User is authenticated but doesn't have the right role
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
