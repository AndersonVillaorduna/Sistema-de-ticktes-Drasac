import axios from 'axios';

// URL de la API configurable por entorno (en producción: https://tu-dominio/api)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('drasac_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar expiración de token o no autorizado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Si el token expira o no es válido, cerramos sesión
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('drasac_token');
        localStorage.removeItem('drasac_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Convierte rutas de archivos guardadas en la BD (/api/uploads/x.png)
// en URL absoluta del backend para usarlas en <img> o descargas
export const fileUrl = (ruta) =>
  ruta ? `${api.defaults.baseURL.replace(/\/api$/, '')}${ruta}` : ruta;

export default api;
