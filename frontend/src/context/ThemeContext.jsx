import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

const leerUltimoTema = () =>
  localStorage.getItem('drasac_theme_last')
  || localStorage.getItem('drasac_theme') // clave antigua, por migración
  || 'dark';

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [theme, setThemeState] = useState(leerUltimoTema);

  // Al cambiar de cuenta, aplicar el tema guardado de ESA cuenta.
  // Las cuentas sin preferencia propia usan el tema por defecto (dark);
  // el último tema usado solo se mantiene en la pantalla de login.
  useEffect(() => {
    const guardado = userId
      ? localStorage.getItem(`drasac_theme_${userId}`)
      : null;
    setThemeState(guardado || (userId ? 'dark' : leerUltimoTema()));
  }, [userId]);

  // Aplicar el tema al documento y persistirlo (global + por cuenta)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('drasac_theme_last', theme);
    if (userId) localStorage.setItem(`drasac_theme_${userId}`, theme);
  }, [theme, userId]);

  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
