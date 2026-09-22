import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
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
  Bell,
  MessageSquare,
  Compass,
  KeyRound,
} from 'lucide-react';

const ICONO_NOTIF = {
  nuevo_ticket: { icon: Ticket, cls: 'text-blue-400 bg-blue-500/10' },
  respuesta: { icon: MessageSquare, cls: 'text-emerald-400 bg-emerald-500/10' },
  paso: { icon: Compass, cls: 'text-indigo-400 bg-indigo-500/10' },
  info: { icon: Bell, cls: 'text-slate-400 bg-white/5' },
};

const tiempoRelativo = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
};

const Layout = ({ children }) => {
  const { user, logout, isTecnico, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [toasts, setToasts] = useState([]);
  const vistosRef = useRef(null);   // IDs de notificaciones ya conocidas
  const audioCtxRef = useRef(null); // Contexto de audio para el "ding"

  // Cambio de contraseña
  const [pwOpen, setPwOpen] = useState(false);
  const [pwActual, setPwActual] = useState('');
  const [pwNueva, setPwNueva] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwOk(false);
    if (pwNueva.length < 8 || !/[A-Za-z]/.test(pwNueva) || !/\d/.test(pwNueva)) {
      setPwError('La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
      return;
    }
    if (pwNueva !== pwConfirm) {
      setPwError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/auth/cambiar-password', {
        password_actual: pwActual,
        password_nueva: pwNueva,
      });
      setPwOk(true);
      setPwActual(''); setPwNueva(''); setPwConfirm('');
      setTimeout(() => setPwOpen(false), 1500);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Error al cambiar la contraseña.');
    } finally {
      setPwLoading(false);
    }
  };

  const reproducirSonido = () => {
    try {
      audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.13);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch { /* el audio es opcional */ }
  };

  const fetchNotifs = () => {
    api.get('/notificaciones')
      .then((r) => {
        const nuevas = r.data.notificaciones || [];
        setNotifs(nuevas);
        setNoLeidas(r.data.no_leidas || 0);

        const ids = new Set(nuevas.map((n) => n.id));
        if (vistosRef.current === null) {
          // Primera carga: solo registrar, sin toasts
          vistosRef.current = ids;
        } else {
          const frescas = nuevas.filter((n) => !vistosRef.current.has(n.id)).slice(0, 3);
          if (frescas.length) {
            vistosRef.current = new Set([...(vistosRef.current || []), ...ids]);
            const nuevosToasts = frescas.map((n) => ({ ...n, toastId: `${n.id}-${Date.now()}` }));
            setToasts((prev) => [...nuevosToasts, ...prev].slice(0, 4));
            reproducirSonido();
            nuevosToasts.forEach((t) => {
              setTimeout(() => setToasts((prev) => prev.filter((x) => x.toastId !== t.toastId)), 7000);
            });
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 15000);
    return () => clearInterval(t);
  }, []);

  const cerrarToast = (toastId) => setToasts((prev) => prev.filter((x) => x.toastId !== toastId));

  const abrirNotificaciones = () => {
    const abrir = !notifOpen;
    setNotifOpen(abrir);
    if (abrir && noLeidas > 0) {
      api.post('/notificaciones/leer').then(fetchNotifs).catch(() => {});
    }
  };

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
          onClick={() => { setPwOpen(true); setPwError(''); setPwOk(false); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-blue-500/10 hover:text-blue-400 text-slate-400 text-xs font-semibold transition-all duration-200 border border-white/5"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Cambiar contraseña
        </button>

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

      {/* Toasts de notificaciones (lado derecho) */}
      <div className="fixed top-20 right-4 z-[70] space-y-2.5 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const info = ICONO_NOTIF[t.tipo] || ICONO_NOTIF.info;
          const IconoT = info.icon;
          return (
            <button
              key={t.toastId}
              onClick={() => {
                cerrarToast(t.toastId);
                if (t.ticket_id) navigate(`/tickets/${t.ticket_id}`);
              }}
              className="pointer-events-auto w-full text-left rounded-2xl border border-white/10 shadow-2xl p-3.5 flex items-start gap-3 animate-slide-in-right hover:border-blue-500/30 transition-colors"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${info.cls}`}>
                <IconoT className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                  {t.tipo === 'nuevo_ticket' ? 'Nuevo ticket' : t.tipo === 'respuesta' ? 'Nueva respuesta' : t.tipo === 'paso' ? 'Nuevo paso' : 'Notificación'}
                </span>
                <span className="block text-[11px] text-slate-200 leading-snug">{t.mensaje}</span>
              </span>
              <span
                className="text-slate-600 hover:text-white transition-colors shrink-0"
                onClick={(e) => { e.stopPropagation(); cerrarToast(t.toastId); }}
              >
                <X className="w-3.5 h-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Modal cambiar contraseña */}
      {pwOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPwOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-5 animate-fade-in"
            style={{ background: 'var(--bg-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cambiar contraseña</h3>
                <p className="text-[10px] text-slate-500">Mínimo 8 caracteres, con letras y números</p>
              </div>
            </div>

            {pwError && (
              <p className="mb-3 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{pwError}</p>
            )}
            {pwOk && (
              <p className="mb-3 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                Contraseña actualizada correctamente.
              </p>
            )}

            <form onSubmit={handleCambiarPassword} className="space-y-3">
              <input
                type="password"
                value={pwActual}
                onChange={(e) => setPwActual(e.target.value)}
                placeholder="Contraseña actual"
                required
                className="w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
              <input
                type="password"
                value={pwNueva}
                onChange={(e) => setPwNueva(e.target.value)}
                placeholder="Nueva contraseña"
                required
                className="w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                required
                className="w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPwOpen(false)}
                  className="px-4 py-2 border border-white/8 text-slate-400 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="btn-glow px-4 py-2 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {pwLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            {/* Campana de notificaciones */}
            <div className="relative">
              <button
                onClick={abrirNotificaciones}
                title="Notificaciones"
                className="relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <Bell className={`w-4 h-4 ${notifOpen ? 'text-blue-400' : ''}`} />
                {noLeidas > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 max-w-[85vw] rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <p className="text-xs font-bold text-white">Notificaciones</p>
                      {noLeidas > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">{noLeidas} nueva(s)</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[11px] text-slate-500">Sin notificaciones todavía.</p>
                      ) : (
                        notifs.map((n) => {
                          const info = ICONO_NOTIF[n.tipo] || ICONO_NOTIF.info;
                          const IconoN = info.icon;
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                setNotifOpen(false);
                                if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
                              }}
                              className="w-full text-left px-4 py-3 flex items-start gap-2.5 hover:bg-white/5 transition-colors border-b border-white/3 last:border-0"
                            >
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${info.cls}`}>
                                <IconoN className="w-3.5 h-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11px] text-slate-200 leading-snug">{n.mensaje}</span>
                                <span className="block text-[9px] text-slate-600 mt-0.5">{tiempoRelativo(n.created_at)}</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
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
