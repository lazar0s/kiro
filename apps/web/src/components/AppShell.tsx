/**
 * AppShell — authenticated layout wrapper.
 *
 * Renders the top navigation bar with role-based links, user info, and logout
 * button. Connects to Socket.IO using the current access token. Renders child
 * routes via <Outlet />.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { UserRole } from '@laundry/shared';
import { useAuth } from '../hooks/useAuth';
import { useSocketConnection } from '../hooks/useSocket';
import { getAccessToken } from '../lib/api';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Admin',
  [UserRole.Staff]: 'Staff',
  [UserRole.Delivery]: 'Driver',
};

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.Admin]: 'bg-rose-100 text-rose-800',
  [UserRole.Staff]: 'bg-sky-100 text-sky-800',
  [UserRole.Delivery]: 'bg-purple-100 text-purple-800',
};

export function AppShell(): JSX.Element {
  const { user, logout } = useAuth();

  // Connect socket with current access token
  useSocketConnection(getAccessToken());

  const handleLogout = async (): Promise<void> => {
    await logout();
    // Navigation to /login handled by route guard after user becomes null
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: brand + nav */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-brand-500 flex items-center justify-center font-bold text-sm">
                L
              </div>
              <span className="text-lg font-semibold hidden sm:inline">Laundry</span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {user && (user.role === UserRole.Admin || user.role === UserRole.Staff) && (
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
              )}
              {user && (user.role === UserRole.Admin || user.role === UserRole.Delivery) && (
                <NavLink
                  to="/delivery"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  Deliveries
                </NavLink>
              )}
              {user && user.role === UserRole.Admin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          {/* Right: user info + logout */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-slate-300">{user.name}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[user.role]}`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
