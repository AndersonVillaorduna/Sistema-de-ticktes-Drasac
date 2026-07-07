import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { Menu, Bell, Search, ChevronDown } from 'lucide-react';

const pageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/tickets': 'Tickets',
  '/admin/tickets/nuevo': 'Nuevo Ticket',
  '/admin/conocimiento': 'Base de Conocimiento',
  '/admin/reportes': 'Reportes',
  '/admin/inventario': 'Inventario',
  '/admin/configuracion': 'Configuración',
};

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const basePath = '/' + location.pathname.split('/').slice(1, 3).join('/');
  const title = pageTitles[location.pathname] || pageTitles[basePath] || 'DRASAC';

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors">
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-bold text-neutral-900">{title}</h1>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input type="text" placeholder="Buscar tickets, usuarios..."
                className="w-full rounded-lg py-2 pl-11 pr-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none transition-all bg-neutral-50" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="w-9 h-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[8px] font-bold flex items-center justify-center">3</span>
              </button>
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
              <div className="w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center text-white text-xs font-bold">
                {user?.nombre?.charAt(0)?.toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-neutral-900 leading-tight">{user?.nombre}</p>
                <p className="text-[10px] text-neutral-500 capitalize leading-tight">{user?.rol}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
