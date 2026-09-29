import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { clearSession } from '../services/api';

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/auth/me', { signal: controller.signal, skipAuthRedirect: true })
      .then(({ data }) => setUser(data))
      .catch((error) => {
        if (error.response?.status === 401) clearSession();
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.usuario);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al iniciar sesión' };
    }
  };
  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { skipAuthRedirect: true });
    } catch { /* An expired session is already invalid on the server. */ }
    finally { clearSession(); setUser(null); }
  };
  const value = {
    user, loading, login, logout,
    isAdmin: user?.rol === 'admin',
    isTecnico: user?.rol === 'tecnico' || user?.rol === 'admin',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
