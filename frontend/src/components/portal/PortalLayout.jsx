import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Ticket, PlusCircle, LogOut, Menu, X, ChevronDown } from 'lucide-react';

const navLinks = [
  { path: '/portal/mis-tickets', label: 'Mis tickets', icon: Ticket },
  { path: '/portal/nuevo-ticket', label: 'Nuevo ticket', icon: PlusCircle },
];

export default function PortalLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Topbar */}
      <header className="h-16 bg-[#142E47] shrink-0 shadow-sm">
        <div className="w-full px-6 md:px-12 flex items-center justify-between" style={{ maxWidth: '1600px', margin: '0 auto', height: '100%' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-200">
              {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <Link to="/portal/mis-tickets" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <span className="text-white font-black text-sm">DR</span>
              </div>
              <div>
                <p className="text-white font-black text-[15px] leading-none">DRASAC</p>
                <p className="text-[10px] text-blue-300 font-semibold leading-tight">Portal de Soporte</p>
              </div>
            </Link>
          </div>

          {/* Desktop nav pills */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link key={link.path} to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    active
                      ? 'bg-white/15 text-white font-bold shadow-sm'
                      : 'text-blue-300 hover:text-white hover:bg-white/10'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User chip */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            <div className="hidden sm:flex items-center rounded-full bg-white/10" style={{ gap: '8px', padding: '6px 16px' }}>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                {user?.nombre?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-sm text-white font-medium" style={{ marginRight: '4px' }}>{user?.nombre}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-blue-300 hover:bg-white/20 hover:text-white transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden bg-primary-dark border-t border-white/10 px-4 py-3 animate-fade-in">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link key={link.path} to={link.path} onClick={() => setMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    active ? 'bg-white/15 text-white font-bold' : 'text-blue-300 hover:text-white hover:bg-white/10'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition-all">
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 w-full px-6 md:px-12 py-8 animate-fade-in" style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 shrink-0">
        <div className="w-full px-6 md:px-12 py-6 flex items-center justify-between" style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-dark flex items-center justify-center">
              <span className="text-white font-black text-[8px]">DR</span>
            </div>
            <p className="text-xs text-neutral-500">DRASAC · Soporte TI</p>
          </div>
          <p className="text-[11px] text-neutral-400">© 2026 DRASAC · Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}
