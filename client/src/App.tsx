import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRole } from './hooks/useRole';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminUsersPage from './pages/AdminUsersPage';
import CampaignsPage from './pages/CampaignsPage';
import NotificationBell from './components/NotificationBell';

function AppShell() {
  const { user, logout } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLink = (to: string, label: string, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive
          ? 'text-white border-b-2 border-blue-400 pb-0.5'
          : 'text-slate-300 hover:text-white transition-colors'
      }
    >
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {user && (
        <header className="bg-slate-900 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <span className="font-bold text-lg tracking-tight">📬 Box Mailing Scheduler</span>

            <nav className="flex items-center gap-6 text-sm font-medium">
              {navLink('/', 'Dashboard', true)}
              {navLink('/calendar', 'Calendar')}
              {navLink('/campaigns', 'Campaigns')}
              {isAdmin && navLink('/admin/users', 'Users')}

              <NotificationBell />

              {/* User menu */}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                <span className="text-slate-300 text-xs">
                  {user.firstName} {user.lastName}
                  {isAdmin && (
                    <span className="ml-1.5 text-purple-400 font-semibold">ADMIN</span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        </header>
      )}

      <main className={`flex-1 ${user ? 'max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route
            path="/"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/calendar"
            element={<ProtectedRoute><CalendarPage /></ProtectedRoute>}
          />
          <Route
            path="/campaigns"
            element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <AppShell />
    </AuthProvider>
  );
}
