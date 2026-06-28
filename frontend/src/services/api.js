import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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

export default api;
