import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { Menu, Bell, Search, ChevronDown, LogOut } from 'lucide-react';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuth();
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
              <Search className="text-neutral-400 pointer-events-none" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px' }} />
              <input type="text" placeholder="Buscar tickets, usuarios..."
                className="w-full rounded-lg py-2 pr-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none transition-all bg-neutral-50"
                style={{ paddingLeft: '40px' }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* NOTIFICACIONES */}
            <div className="relative">
              <button onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                className="w-9 h-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors relative focus:outline-none">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[8px] font-bold flex items-center justify-center">3</span>
              </button>
              
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-neutral-100 z-50 animate-fade-in origin-top-right" style={{ width: '340px', padding: '16px 0' }}>
                    <div className="border-b border-neutral-100 mb-2" style={{ padding: '0 20px 12px 20px' }}>
                      <h3 className="text-[15px] font-bold text-neutral-900">Notificaciones</h3>
                    </div>
                    <div className="hover:bg-neutral-50 transition-colors cursor-pointer border-l-2 border-primary" style={{ padding: '16px 20px' }}>
                      <p className="text-[13px] text-neutral-800 font-bold mb-1">Nuevo ticket #1024</p>
                      <p className="text-[12px] text-neutral-500 leading-relaxed">Un usuario ha reportado un problema de hardware.</p>
                      <p className="text-[11px] text-neutral-400 mt-2">Hace 5 min</p>
                    </div>
                    <div className="hover:bg-neutral-50 transition-colors cursor-pointer" style={{ padding: '16px 20px' }}>
                      <p className="text-[13px] text-neutral-800 font-bold mb-1">Actualización en ticket #1020</p>
                      <p className="text-[12px] text-neutral-500 leading-relaxed">El técnico Carlos añadió un comentario.</p>
                      <p className="text-[11px] text-neutral-400 mt-2">Hace 2 horas</p>
                    </div>
                    <div className="mt-2 border-t border-neutral-100 text-center" style={{ padding: '12px 20px 0 20px' }}>
                      <a href="#" className="text-[13px] text-primary font-bold hover:underline">Marcar todas como leídas</a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PERFIL */}
            <div className="relative">
              <div 
                className="flex items-center gap-2 pl-2 border-l border-neutral-200 cursor-pointer select-none"
                onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
              >
                <div className="w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user?.nombre?.charAt(0)?.toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-neutral-900 leading-tight">{user?.nombre}</p>
                  <p className="text-[10px] text-neutral-500 capitalize leading-tight">{user?.rol}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 hidden sm:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </div>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-3 bg-white rounded-xl shadow-lg border border-neutral-100 z-50 animate-fade-in origin-top-right" style={{ width: '220px', padding: '12px 0' }}>
                    <div className="border-b border-neutral-100 sm:hidden" style={{ padding: '0 20px 12px 20px', marginBottom: '8px' }}>
                      <p className="text-[13px] font-bold text-neutral-900">{user?.nombre}</p>
                      <p className="text-[11px] text-neutral-500 capitalize">{user?.rol}</p>
                    </div>
                    <button onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full text-left text-danger hover:bg-red-50 transition-colors flex items-center gap-3 font-bold"
                      style={{ padding: '14px 20px', fontSize: '14px' }}>
                      <LogOut className="w-5 h-5" /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
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
