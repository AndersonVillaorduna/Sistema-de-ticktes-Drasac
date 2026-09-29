import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
let csrfToken = '';
export const clearSession = () => {
  csrfToken = '';
  localStorage.removeItem('drasac_token');
  localStorage.removeItem('drasac_user');
};
// Authentication is persisted by the API in an HttpOnly cookie.
clearSession();
const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
api.interceptors.request.use((config) => {
  if (csrfToken && !config.headers['X-CSRF-TOKEN']) config.headers['X-CSRF-TOKEN'] = csrfToken;
  return config;
});
api.interceptors.response.use((response) => {
  if (response.headers['x-csrf-token']) csrfToken = response.headers['x-csrf-token'];
  return response;
}, (error) => {
  if (error.response?.status === 401 && !error.config?.skipAuthRedirect && error.config?.url !== '/auth/login') {
    const oldCsrf = error.config?.headers?.['X-CSRF-TOKEN'];
    if (csrfToken && oldCsrf && oldCsrf !== csrfToken && !error.config._retriedAfterRotation) {
      error.config._retriedAfterRotation = true;
      error.config.headers['X-CSRF-TOKEN'] = csrfToken;
      return api.request(error.config);
    }
    clearSession();
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }
  return Promise.reject(error);
});
export const fileUrl = (ruta) =>
  ruta ? `${api.defaults.baseURL.replace(/\/api$/, '')}${ruta}` : ruta;
export default api;
