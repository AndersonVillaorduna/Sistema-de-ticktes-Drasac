import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/admin/AdminLayout';
import PortalLayout from './components/portal/PortalLayout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTickets from './pages/admin/Tickets';
import AdminCreateTicket from './pages/admin/CreateTicket';
import AdminTicketDetailPage from './pages/admin/TicketDetailPage';
import AdminInventory from './pages/admin/Inventory';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import Reports from './pages/admin/Reports';
import MyTickets from './pages/portal/MyTickets';
import NewTicket from './pages/portal/NewTicket';
import AIHelp from './pages/portal/AIHelp';
import PortalTicketDetail from './pages/portal/TicketDetail';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-neutral-500">Cargando...</p>
    </div>
  </div>
);

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    if (user.rol === 'admin' || user.rol === 'tecnico') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/portal/mis-tickets" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  return <PrivateRoute allowedRoles={['admin', 'tecnico']}><AdminLayout>{children}</AdminLayout></PrivateRoute>;
}

function PortalRoute({ children }) {
  return <PrivateRoute><PortalLayout>{children}</PortalLayout></PrivateRoute>;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'admin' || user.rol === 'tecnico') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/portal/mis-tickets" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/tickets" element={<AdminRoute><AdminTickets /></AdminRoute>} />
          <Route path="/admin/tickets/nuevo" element={<AdminRoute><AdminCreateTicket /></AdminRoute>} />
          <Route path="/admin/tickets/:id" element={<AdminRoute><AdminTicketDetailPage /></AdminRoute>} />
          <Route path="/admin/inventario" element={<AdminRoute><AdminInventory /></AdminRoute>} />
          <Route path="/admin/conocimiento" element={<AdminRoute><KnowledgeBase /></AdminRoute>} />
          <Route path="/admin/reportes" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="/admin/configuracion" element={<AdminRoute><div className="text-center py-12 text-neutral-500"><p className="text-lg font-bold">Configuración</p><p className="text-sm">Próximamente</p></div></AdminRoute>} />

          {/* Portal routes */}
          <Route path="/portal/mis-tickets" element={<PortalRoute><MyTickets /></PortalRoute>} />
          <Route path="/portal/mis-tickets/:id" element={<PortalRoute><PortalTicketDetail /></PortalRoute>} />
          <Route path="/portal/nuevo-ticket" element={<PortalRoute><NewTicket /></PortalRoute>} />
          <Route path="/portal/ayuda-ia" element={<PortalRoute><AIHelp /></PortalRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
