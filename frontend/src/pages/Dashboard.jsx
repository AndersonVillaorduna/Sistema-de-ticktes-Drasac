import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, Clock, Bot, CheckCircle2, Laptop,
  ArrowUpRight, TrendingUp, Cpu, PlusCircle,
  Zap, Activity, AlertCircle, MessageSquare,
  User, BarChart3,
} from 'lucide-react';

// ── Skeleton card ──────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
    <div className="skeleton h-3 w-24 mb-4 rounded" />
    <div className="skeleton h-8 w-16 mb-2 rounded" />
    <div className="skeleton h-2.5 w-32 rounded" />
  </div>
);

// ── Estado badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ estado }) => {
  const map = {
    'abierto':                  'badge-open',
    'en proceso':               'badge-progress',
    'resuelto por ia - pendiente': 'badge-ai',
    'cerrado':                  'badge-closed',
    'resuelto':                 'badge-closed',
  };
  const label = {
    'resuelto por ia - pendiente': 'Solución IA',
    'abierto': 'Abierto',
    'en proceso': 'En Proceso',
    'cerrado': 'Cerrado',
    'resuelto': 'Resuelto',
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${map[estado] || 'badge-low'}`}>
      {label[estado] || estado}
    </span>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// VISTA PARA EMPLEADO
// ══════════════════════════════════════════════════════════════════════════════
const EmpleadoDashboard = ({ user, stats }) => (
  <div className="space-y-6 animate-fade-in">
    {/* Welcome Hero */}
    <div className="relative overflow-hidden rounded-2xl p-6 border border-white/5"
      style={{ background: 'var(--hero-bg)' }}>
      <div className="absolute right-0 top-0 w-72 h-72 pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle at 80% 20%, #3b82f6, transparent 60%)' }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 60%)' }} />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-1">Bienvenido de vuelta</p>
          <h2 className="text-2xl font-black text-white">¡Hola, {user?.nombre?.split(' ')[0]}!</h2>
          <p className="text-sm text-slate-400 mt-1">{user?.tienda_area || 'Sistema DRASAC 2026'}</p>
        </div>
        <Link
          to="/tickets/nuevo"
          id="create-ticket-hero-btn"
          className="btn-glow text-white text-sm font-bold py-3 px-5 rounded-xl flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Reportar Problema
        </Link>
      </div>
    </div>

    {/* Mini Stats para empleado */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: 'Mis Tickets', value: stats?.mis_tickets?.total || 0, icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/15', desc: 'Total enviados' },
        { label: 'Pendientes', value: (stats?.mis_tickets?.abiertos || 0) + (stats?.mis_tickets?.en_proceso || 0), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15', desc: 'Esperando resolución' },
        { label: 'Resueltos', value: stats?.mis_tickets?.cerrados || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15', desc: 'Problemas solucionados' },
      ].map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="rounded-2xl p-5 border border-white/5 flex items-center justify-between animate-fade-in"
            style={{ background: 'var(--bg-card)', animationDelay: `${i * 80}ms` }}>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{card.label}</p>
              <p className="text-3xl font-black text-white">{card.value}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{card.desc}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.bg}`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Mis tickets recientes */}
      <div className="lg:col-span-3 rounded-2xl border border-white/5 p-5"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mis Tickets Recientes</h3>
          <Link to="/tickets" className="text-[11px] text-blue-400 font-semibold hover:text-blue-300 flex items-center gap-1 transition-colors">
            Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {stats?.tickets_recientes?.length > 0 ? (
            stats.tickets_recientes.slice(0, 4).map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-white/3 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate transition-colors">
                    {ticket.titulo}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">#{ticket.id} · {new Date(ticket.created_at).toLocaleDateString('es-PE')}</p>
                </div>
                <StatusBadge estado={ticket.estado} />
              </Link>
            ))
          ) : (
            <div className="py-10 text-center">
              <Ticket className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600">No tienes tickets registrados aún.</p>
              <Link to="/tickets/nuevo" className="text-xs text-blue-400 hover:underline mt-1 inline-block">
                Crea tu primer ticket →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Panel de IA */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl p-5 border border-indigo-500/20"
          style={{ background: 'var(--panel-ai-bg)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Asistente IA</p>
              <p className="text-[10px] text-indigo-400">LLaMA 3.1 · Activo</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            El asistente analiza tu problema y propone soluciones al instante. Al crear un ticket, recibirás una respuesta automática en segundos.
          </p>
          <Link to="/tickets/nuevo"
            className="mt-3 flex items-center gap-2 text-[11px] text-indigo-300 font-semibold hover:text-indigo-200 transition-colors">
            <Zap className="w-3.5 h-3.5" />
            Consultar al asistente →
          </Link>
        </div>

        <div className="rounded-2xl p-5 border border-white/5"
          style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Pasos para reportar</p>
          {[
            { n: '1', text: 'Haz clic en "Reportar Problema"', color: 'bg-blue-500' },
            { n: '2', text: 'Describe el problema con detalle', color: 'bg-indigo-500' },
            { n: '3', text: 'La IA analiza y propone solución', color: 'bg-violet-500' },
            { n: '4', text: 'Confirma si el problema se resolvió', color: 'bg-emerald-500' },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3 mb-2.5">
              <div className={`w-5 h-5 rounded-full ${step.color} flex items-center justify-center text-[9px] text-white font-black shrink-0 mt-0.5`}>
                {step.n}
              </div>
              <p className="text-[11px] text-slate-400">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// VISTA PARA ADMIN / TÉCNICO
// ══════════════════════════════════════════════════════════════════════════════
const AdminDashboard = ({ user, stats }) => {
  const kpis = [
    { label: 'Total Tickets',       value: stats?.totales?.tickets || 0,          icon: Ticket,      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/15' },
    { label: 'Abiertos / En Proceso', value: (stats?.totales?.abiertos || 0) + (stats?.totales?.en_proceso || 0), icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15' },
    { label: 'Resueltos por IA',    value: stats?.totales?.pendientes_ia || 0,    icon: Bot,         color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/15' },
    { label: 'Cerrados',            value: stats?.totales?.cerrados || 0,          icon: CheckCircle2,color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
    { label: 'Equipos TI',          value: stats?.totales?.inventario_equipos || 0, icon: Laptop,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/15' },
    { label: 'Técnicos',            value: stats?.totales?.tecnicos_activos || 0,  icon: User,       color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/15' },
  ];

  // Datos para el donut de estados
  const estadosData = [
    { key: 'abierto',                     label: 'Abiertos',    color: '#f87171', value: stats?.estados?.abierto || 0 },
    { key: 'en proceso',                  label: 'En Proceso',  color: '#fbbf24', value: stats?.estados?.['en proceso'] || 0 },
    { key: 'resuelto por ia - pendiente', label: 'Solución IA', color: '#818cf8', value: stats?.estados?.['resuelto por ia - pendiente'] || 0 },
    { key: 'cerrados',                    label: 'Cerrados',    color: '#34d399', value: (stats?.estados?.cerrado || 0) + (stats?.estados?.resuelto || 0) },
  ];
  const estadosTotal = estadosData.reduce((s, d) => s + d.value, 0);

  const DonutEstados = () => {
    const R = 46;
    const C = 2 * Math.PI * R;
    let offset = 0;
    return (
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="15" />
          {estadosData.map((d) => {
            const frac = estadosTotal > 0 ? d.value / estadosTotal : 0;
            const dash = frac * C;
            const el = (
              <circle key={d.key} cx="64" cy="64" r={R} fill="none" stroke={d.color} strokeWidth="15"
                strokeLinecap="round" strokeDasharray={`${Math.max(dash - 2, 0)} ${C}`} strokeDashoffset={-offset}
                className="transition-all duration-700" />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-black text-white leading-none">{estadosTotal}</p>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Total</p>
          </div>
        </div>
      </div>
    );
  };

  const iaCount = stats?.resoluciones_ia_vs_humana?.ia || 0;
  const humanaCount = stats?.resoluciones_ia_vs_humana?.humana || 0;
  const resolTotal = iaCount + humanaCount;
  const iaPct = resolTotal > 0 ? Math.round((iaCount / resolTotal) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Resumen del Sistema</h2>
          <p className="text-xs text-slate-500 mt-0.5">Panel de control · {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/reportes" className="flex items-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl border border-white/8 bg-white/3 text-slate-300 hover:text-white hover:bg-white/5 hover:border-blue-500/25 transition-all">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Reportes</span>
          </Link>
          <Link to="/tickets/nuevo" className="btn-glow text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Nuevo Ticket
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-2xl p-4 border border-white/5 animate-fade-in"
              style={{ background: 'var(--bg-card)', animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl xl:text-3xl font-black text-white mb-0.5">{card.value}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Fila: Dona de estados + IA vs Humano */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dona por estado */}
        <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-indigo-400" />
            Estado de Tickets
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <DonutEstados />
            <div className="flex-1 space-y-2.5 min-w-0 w-full">
              {estadosData.map((d) => (
                <div key={d.key} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-slate-400 font-medium flex-1 truncate">{d.label}</span>
                  <span className="text-xs font-bold text-white">{d.value}</span>
                  <span className="text-[10px] text-slate-600 w-9 text-right">
                    {estadosTotal > 0 ? Math.round((d.value / estadosTotal) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barra IA vs Humano */}
        <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Resoluciones: IA vs Técnicos
          </h3>
          <div className="flex items-end gap-6 mb-4">
            <div>
              <p className="text-3xl font-black text-white leading-none">{iaPct}%</p>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Automatizado</p>
            </div>
            <div className="flex gap-5 pb-1">
              <div>
                <p className="text-lg font-black text-indigo-400 leading-none">{iaCount}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Por IA</p>
              </div>
              <div>
                <p className="text-lg font-black text-blue-400 leading-none">{humanaCount}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Humanos</p>
              </div>
            </div>
          </div>
          <div className="h-3 rounded-full bg-blue-500/15 overflow-hidden flex">
            <div className="h-full transition-all duration-700"
              style={{ width: `${iaPct}%`, background: 'var(--accent-blue)' }} />
          </div>
          <p className="text-[10px] text-slate-600 mt-2.5">
            {resolTotal > 0
              ? `De ${resolTotal} tickets resueltos, ${iaPct}% fueron automatizados por el asistente IA.`
              : 'Aún no hay tickets resueltos en el sistema.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tickets Recientes */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 p-5"
          style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Actividad Reciente
            </h3>
            <Link to="/tickets" className="text-[11px] text-blue-400 font-semibold hover:text-blue-300 flex items-center gap-1 transition-colors">
              Ver Todos <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {stats?.tickets_recientes?.length > 0 ? (
              stats.tickets_recientes.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/3 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate transition-colors">
                      {ticket.titulo}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                      <span>#{ticket.id}</span>
                      <span>·</span>
                      <span>{ticket.usuario_nombre}</span>
                      {ticket.categoria_nombre && <><span>·</span><span>{ticket.categoria_nombre}</span></>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge estado={ticket.estado} />
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      ticket.prioridad === 'alta' ? 'badge-high' : ticket.prioridad === 'media' ? 'badge-medium' : 'badge-low'
                    }`}>{ticket.prioridad}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-600">
                No hay tickets registrados en el sistema.
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Categorías */}
          <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Por Categoría
            </h3>
            <div className="space-y-3">
              {stats?.categorias && Object.keys(stats.categorias).length > 0 ? (
                Object.entries(stats.categorias).slice(0, 5).map(([name, count]) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium truncate mr-2">{name}</span>
                      <span className="text-slate-500 shrink-0">{count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((count / (stats?.totales?.tickets || 1)) * 100, 100)}%`,
                          background: 'var(--accent-blue)',
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-600">Sin datos de categorías</p>
              )}
            </div>
          </div>

          {/* Estado del Motor IA */}
          <div className="rounded-2xl p-5 border border-indigo-500/20"
            style={{ background: 'var(--panel-ai-bg)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Motor IA</p>
                <p className="text-[10px] text-indigo-400">Ollama · LLaMA 3.1 8B</p>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const { user, isTecnico } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch((err) => console.error('Error al cargar estadísticas', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <SkeletonCard />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  return isTecnico
    ? <AdminDashboard user={user} stats={stats} />
    : <EmpleadoDashboard user={user} stats={stats} />;
};

export default Dashboard;
