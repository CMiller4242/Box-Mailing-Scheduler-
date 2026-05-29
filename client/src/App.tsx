import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">📬 Box Mailing Scheduler</span>
          <nav className="flex gap-6 text-sm font-medium">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive
                  ? 'text-white border-b-2 border-blue-400 pb-0.5'
                  : 'text-slate-300 hover:text-white transition-colors'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                isActive
                  ? 'text-white border-b-2 border-blue-400 pb-0.5'
                  : 'text-slate-300 hover:text-white transition-colors'
              }
            >
              Calendar
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </main>
    </div>
  );
}
