import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Laptop,
  LogOut,
  User,
  Menu,
  X,
  Bot,
  ShieldCheck,
  BarChart3,
  Users as UsersIcon,
  UserCog,
  BookOpen,
  Zap,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isTecnico, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navegación según rol
  const empleadoNav = [
    { path: '/',              label: 'Mi Panel',         icon: LayoutDashboard, desc: 'Resumen de mis tickets' },
    { path: '/tickets',       label: 'Mis Tickets',      icon: Ticket,           desc: 'Ver mi historial' },
    { path: '/tickets/nuevo', label: 'Reportar Problema',icon: PlusCircle,       desc: 'Crear nuevo ticket' },
  ];

  // Técnico: solo atención de tickets e inventario
  const tecnicoNav = [
    { path: '/',              label: 'Mi Panel',         icon: LayoutDashboard, desc: 'Resumen de mis tickets' },
    { path: '/tickets',       label: 'Gestión de Tickets', icon: Ticket,         desc: 'Tickets de mis categorías' },
    { path: '/inventario',    label: 'Inventario TI',      icon: Laptop,         desc: 'Equipos y activos' },
  ];

  const adminNav = [
    { path: '/',              label: 'Dashboard',          icon: LayoutDashboard, desc: 'Vista general del sistema' },
    { path: '/tickets',       label: 'Gestión de Tickets', icon: Ticket,           desc: 'Todos los tickets' },
    { path: '/inventario',    label: 'Inventario TI',      icon: Laptop,           desc: 'Equipos y activos' },
    { path: '/usuarios',      label: 'Usuarios',           icon: UsersIcon,        desc: 'Cuentas registradas' },
    { path: '/base-conocimiento', label: 'Artículos IA',   icon: BookOpen,         desc: 'Casos que resuelve la IA' },
    { path: '/asignacion',    label: 'Asignación',         icon: UserCog,          desc: 'Técnico por categoría' },
    { path: '/reportes',      label: 'Reportes',           icon: BarChart3,        desc: 'Métricas y analítica' },
  ];

  const navItems = isAdmin ? adminNav : isTecnico ? tecnicoNav : empleadoNav;

  // Solo el ítem con la ruta más específica (prefijo más largo) se marca activo,
  // así "/tickets/nuevo" no resalta también "Mis Tickets"
  const rutaActiva = (() => {
    const coincidencias = navItems.filter(
      (item) =>
        (item.path === '/' && location.pathname === '/') ||
        (item.path !== '/' && (location.pathname === item.path || location.pathname.startsWith(item.path + '/')))
    );
    coincidencias.sort((a, b) => b.path.length - a.path.length);
    return coincidencias[0]?.path || null;
  })();

  const rolLabel = user?.rol === 'admin' ? 'Administrador' : user?.rol === 'tecnico' ? 'Técnico TI' : 'Empleado';
  const rolColor = user?.rol === 'admin'
    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
    : user?.rol === 'tecnico'
    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';

  const pageTitle = {
    '/': isAdmin ? 'Dashboard General' : isTecnico ? 'Mi Panel' : 'Mi Panel',
    '/tickets': isTecnico ? 'Gestión de Tickets' : 'Mis Tickets',
    '/tickets/nuevo': 'Reportar Incidencia',
    '/inventario': 'Inventario TI',
    '/usuarios': 'Gestión de Usuarios',
    '/base-conocimiento': 'Artículos de la IA',
    '/asignacion': 'Asignación de Técnicos',
    '/reportes': 'Reportes y Analítica',
  }[location.pathname] || 'Detalle de Ticket';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-white text-base tracking-widest leading-none">DRASAC</h1>
            <p className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase mt-0.5">
              {isAdmin ? 'Panel Admin' : isTecnico ? 'Soporte Técnico' : 'Soporte TI'}
            </p>
          </div>
        </div>
      </div>

      {/* Portal Label */}
      <div className="mx-4 mt-5 mb-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5 flex items-center gap-2">
        {isTecnico
          ? <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          : <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
        }
        <span className="text-[11px] font-semibold text-slate-400">
          {isAdmin ? 'Portal Administrador' : isTecnico ? 'Portal Técnico' : 'Portal Empleado'}
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = rutaActiva === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-blue-300 border border-blue-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate leading-none">{item.label}</p>
                <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-blue-400/70' : 'text-slate-600'}`}>
                  {item.desc}
                </p>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10 shrink-0">
            <User className="w-4 h-4 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${rolColor}`}>
              {rolLabel}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-xs font-semibold transition-all duration-200 border border-white/5 hover:border-red-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Desktop (always visible) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 z-30"
        style={{ background: 'var(--bg-secondary)' }}>
        <SidebarContent />
      </aside>

      {/* Sidebar — Mobile (slide-in drawer) */}
      <aside className={`fixed top-0 left-0 h-full w-72 flex-col border-r border-white/5 z-50 flex lg:hidden transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ background: 'var(--bg-secondary)' }}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0"
          style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white">{pageTitle}</h2>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                {isAdmin ? 'Panel de control administrativo' : isTecnico ? 'Panel de soporte técnico' : 'Portal de soporte para empleados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* AI Status indicator */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IA Activa
            </div>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* User avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--accent-blue)' }}
            >
              {user?.nombre?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
