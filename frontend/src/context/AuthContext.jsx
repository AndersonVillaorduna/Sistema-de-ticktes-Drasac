import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('drasac_token');
      if (token) {
        try {
          // Verificar token con backend
          const response = await api.get('/auth/me');
          setUser(response.data);
          localStorage.setItem('drasac_user', JSON.stringify(response.data));
        } catch (error) {
          console.error("Token inválido o expirado al inicializar", error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, usuario } = response.data;
      
      localStorage.setItem('drasac_token', token);
      localStorage.setItem('drasac_user', JSON.stringify(usuario));
      setUser(usuario);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('drasac_token');
    localStorage.removeItem('drasac_user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.rol === 'admin',
    isTecnico: user?.rol === 'tecnico' || user?.rol === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
