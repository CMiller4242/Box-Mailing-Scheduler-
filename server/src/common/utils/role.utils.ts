/** Normalise legacy MEMBER → EMPLOYEE so guards only need to check 3 values. */
export function effectiveRole(role: string): 'ADMIN' | 'MANAGER' | 'EMPLOYEE' {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'MANAGER') return 'MANAGER';
  return 'EMPLOYEE'; // covers EMPLOYEE + legacy MEMBER
}

export function canDeleteTask(role: string): boolean {
  const r = effectiveRole(role);
  return r === 'ADMIN' || r === 'MANAGER';
}

export function canCreateTask(role: string): boolean {
  return canDeleteTask(role);
}

export function canEditFullTask(role: string): boolean {
  return canDeleteTask(role);
}
