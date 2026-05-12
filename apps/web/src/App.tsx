/**
 * App — top-level routing and providers for the Laundry Dashboard.
 *
 * Wraps everything in AuthProvider for authentication state. Defines public
 * routes (login, tracking) and protected routes with role-based access.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from '@laundry/shared';
import { AuthProvider } from './hooks/useAuth';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { TrackingPage } from './pages/TrackingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveryPage } from './pages/DeliveryPage';

/** Placeholder admin page — to be built out in a future phase. */
function AdminPage(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Admin Panel</h2>
      <p className="text-sm text-slate-500">
        User management, location settings, and system configuration coming soon.
      </p>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/track/:code" element={<TrackingPage />} />

          {/* Protected routes — wrapped in AppShell */}
          <Route element={<AppShell />}>
            {/* Staff + Admin: Dashboard */}
            <Route
              element={
                <ProtectedRoute allowedRoles={[UserRole.Staff, UserRole.Admin]} />
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Delivery + Admin: Delivery view */}
            <Route
              element={
                <ProtectedRoute allowedRoles={[UserRole.Delivery, UserRole.Admin]} />
              }
            >
              <Route path="/delivery" element={<DeliveryPage />} />
            </Route>

            {/* Admin only */}
            <Route
              element={<ProtectedRoute allowedRoles={[UserRole.Admin]} />}
            >
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
