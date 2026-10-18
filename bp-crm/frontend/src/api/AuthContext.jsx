import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, company, permissions, subscription }
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setSession(await api.get('/auth/me')); } catch { setSession(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener('bp:unauthorized', onUnauthorized);
    return () => window.removeEventListener('bp:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => { await api.post('/auth/login', { email, password }); await refresh(); }, [refresh]);
  const register = useCallback(async (input) => { await api.post('/auth/register', input); await refresh(); }, [refresh]);
  const logout = useCallback(async () => { await api.post('/auth/logout'); setSession(null); }, []);

  const value = useMemo(() => ({
    session, loading, login, register, logout, refresh,
    // UX mirror of the server's permission matrix. The server remains the authority.
    can: (perm) => Boolean(session?.permissions?.includes(perm)),
  }), [session, loading, login, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
