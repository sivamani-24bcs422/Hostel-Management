import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';
import { TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setProfile(null);
  }, []);

  const fetchSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const result = await authService.me();
      setUser(result.data.user);
      setProfile(result.data.profile);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    window.addEventListener('hostelhub:unauthorized', clearSession);
    return () => window.removeEventListener('hostelhub:unauthorized', clearSession);
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const result = await authService.login({ email, password });
    localStorage.setItem(TOKEN_KEY, result.data.token);
    setUser(result.data.user);
    setProfile(result.data.profile);
    return result.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Session is cleared locally regardless of API availability.
    }
    clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const result = await authService.me();
    setUser(result.data.user);
    setProfile(result.data.profile);
    return result.data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      logout,
      refreshProfile,
      isAuthenticated: Boolean(user),
      hasRole: (...roles) => roles.includes(user?.role),
    }),
    [user, profile, loading, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export default AuthContext;
