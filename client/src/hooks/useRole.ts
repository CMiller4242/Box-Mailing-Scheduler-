import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

function effectiveRole(role: UserRole): 'ADMIN' | 'MANAGER' | 'EMPLOYEE' {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'MANAGER') return 'MANAGER';
  return 'EMPLOYEE';
}

export function useRole() {
  const { user } = useAuth();
  const role = user ? effectiveRole(user.role) : 'EMPLOYEE';

  return {
    role,
    isAdmin: role === 'ADMIN',
    isManager: role === 'MANAGER',
    isEmployee: role === 'EMPLOYEE',
    canCreateTask: role === 'ADMIN' || role === 'MANAGER',
    canDeleteTask: role === 'ADMIN' || role === 'MANAGER',
    canEditFullTask: role === 'ADMIN' || role === 'MANAGER',
    canManageTemplates: role === 'ADMIN' || role === 'MANAGER',
  };
}
