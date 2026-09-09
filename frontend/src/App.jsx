import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketsList from './pages/TicketsList';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Users from './pages/Users';
import KnowledgeBase from './pages/KnowledgeBase';
import Asignacion from './pages/Asignacion';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
        <span className="text-white font-black text-lg">D</span>
      </div>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// ─── Ruta privada (cualquier usuario autenticado) ─────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

// ─── Ruta exclusiva para Admin y Técnico ─────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { user, loading, isTecnico } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isTecnico) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

// ─── Ruta EXCLUSIVA del Administrador (el técnico no entra) ──────────────────
const AdminOnlyRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Ruta Pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas comunes (todos los autenticados) */}
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/tickets" element={<PrivateRoute><TicketsList /></PrivateRoute>} />
            <Route path="/tickets/nuevo" element={<PrivateRoute><CreateTicket /></PrivateRoute>} />
            <Route path="/tickets/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />

            {/* Rutas exclusivas Admin/Técnico */}
            <Route path="/inventario" element={<AdminRoute><Inventory /></AdminRoute>} />

            {/* Rutas EXCLUSIVAS del Administrador */}
            <Route path="/reportes" element={<AdminOnlyRoute><Reports /></AdminOnlyRoute>} />
            <Route path="/usuarios" element={<AdminOnlyRoute><Users /></AdminOnlyRoute>} />
            <Route path="/base-conocimiento" element={<AdminOnlyRoute><KnowledgeBase /></AdminOnlyRoute>} />
            <Route path="/asignacion" element={<AdminOnlyRoute><Asignacion /></AdminOnlyRoute>} />

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
