import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, BookOpen, BarChart3,
  Package, Settings, LogOut, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const sections = [
  {
    label: 'General',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
    ],
  },
  {
    label: 'Soporte',
    items: [
      { path: '/admin/conocimiento', label: 'Base de conocimiento', icon: BookOpen },
      { path: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Administración',
    items: [
      { path: '/admin/inventario', label: 'Inventario', icon: Package },
      { path: '/admin/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin/dashboard') return location.pathname === path;
    if (path === '/admin/tickets') return location.pathname.startsWith('/admin/tickets') && !location.pathname.includes('/nuevo');
    return location.pathname.startsWith(path);
  };

  const content = (
    <div className="flex flex-col h-full sidebar-dark">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">DR</span>
        </div>
        <div>
          <p className="font-black text-white text-sm leading-none">DRASAC</p>
          <p className="text-[10px] text-blue-300 font-semibold mt-0.5">Admin Panel</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="nav-section">{section.label}</p>
            <div className="px-3 space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={onClose}
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active ? 'active' : ''
                    }`}
                    style={active ? { background: 'rgba(255,255,255,0.12)', color: '#fff', borderLeft: '3px solid #fff', borderRadius: 0, borderTopRightRadius: '8px', borderBottomRightRadius: '8px' } : {}}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-white/15' : 'bg-white/5'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{user?.nombre?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
            <p className="text-[10px] text-blue-300 capitalize">{user?.rol}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 text-blue-300 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all">
          <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-60 shrink-0 flex-col z-30">
        {content}
      </aside>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 flex-col z-50 flex lg:hidden transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-300 hover:text-white z-10">
          <X className="w-4 h-4" />
        </button>
        {content}
      </aside>
    </>
  );
}
