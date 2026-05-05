import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  configureAuthApi,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
} from '../services/api';

const AuthContext = createContext(null);

function storageGet(key) {
  return window.localStorage.getItem(key) || '';
}

function storageSet(key, value) {
  if (!value) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => storageGet('accessToken'));
  const [refreshToken, setRefreshToken] = useState(() => storageGet('refreshToken'));
  const [loading, setLoading] = useState(true);

  const clearAuth = () => {
    setUser(null);
    setAccessToken('');
    setRefreshToken('');
    storageSet('accessToken', '');
    storageSet('refreshToken', '');
  };

  useEffect(() => {
    configureAuthApi({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setAccessToken: (nextToken) => {
        setAccessToken(nextToken);
        storageSet('accessToken', nextToken);
      },
      onUnauthorized: clearAuth,
    });
  }, [accessToken, refreshToken]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await getMe();
        setUser(res.data.user);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const signup = async (payload) => {
    const res = await apiSignup(payload);
    return res.data;
  };

  const login = async (payload) => {
    const res = await apiLogin(payload);
    const nextAccess = res.data?.accessToken || '';
    const nextRefresh = res.data?.refreshToken || '';
    setAccessToken(nextAccess);
    setRefreshToken(nextRefresh);
    storageSet('accessToken', nextAccess);
    storageSet('refreshToken', nextRefresh);
    setUser(res.data?.user || null);
    return res.data;
  };

  const logout = async () => {
    try {
      if (refreshToken) await apiLogout(refreshToken);
    } catch {
      // no-op
    } finally {
      clearAuth();
    }
  };

  const value = useMemo(
    () => ({ user, loading, signup, login, logout, isAuthenticated: Boolean(user) }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
