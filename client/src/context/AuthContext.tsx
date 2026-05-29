import { createContext, useCallback, useContext, useState } from 'react';
import type { AuthUser } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** Read from localStorage first (rememberMe), then sessionStorage (tab session). */
function readStored(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (token && raw) return { token, user: JSON.parse(raw) as AuthUser };
  } catch {
    // corrupted storage — ignore
  }
  return { user: null, token: null };
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** persist=true → localStorage (rememberMe), persist=false → sessionStorage */
  setAuth: (user: AuthUser, token: string, persist: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = readStored();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);

  const setAuth = useCallback((newUser: AuthUser, newToken: string, persist: boolean) => {
    const store = persist ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, newToken);
    store.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
