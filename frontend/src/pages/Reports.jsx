import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  BarChart3, TrendingUp, Users, AlertCircle, CheckCircle2,
  Bot, Clock, ArrowUpRight, CalendarDays, Gauge, Flame,
} from 'lucide-react';

// ── Utilidades de agregación ─────────────────────────────────────────────────
const ESTADOS = [
  { key: 'abierto',                     label: 'Abiertos',    color: '#f87171' },
  { key: 'en proceso',                  label: 'En Proceso',  color: '#fbbf24' },
  { key: 'resuelto por ia - pendiente', label: 'Solución IA', color: '#818cf8' },
  { key: 'cerrado',                     label: 'Cerrados',    color: '#34d399' },
  { key: 'resuelto',                    label: 'Resueltos',   color: '#10b981' },
];

// ── Donut Chart (SVG puro) ────────────────────────────────────────────────────
const DonutChart = ({ data, total }) => {
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
          {data.map((d) => {
            const frac = total > 0 ? d.value / total : 0;
            const dash = frac * C;
            const el = (
              <circle
                key={d.key}
                cx="64" cy="64" r={R} fill="none"
                stroke={d.color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(dash - 2, 0)} ${C}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white leading-none">{total}</span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Tickets</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 min-w-0 w-full">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-[11px] text-slate-400 font-medium flex-1 truncate">{d.label}</span>
            <span className="text-xs font-bold text-white">{d.value}</span>
            <span className="text-[10px] text-slate-600 w-9 text-right">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Area Chart: tickets por día (SVG puro) ───────────────────────────────────
const AreaChart = ({ data }) => {
  const W = 560, H = 160, PAD = 8;
  const max = Math.max(...data.map((d) => d.count), 1);
  const step = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => [
    PAD + i * step,
    H - PAD - (d.count / max) * (H - PAD * 2 - 20),
  ]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`;
  const today = new Date();

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        <polygon points={area} fill="url(#areaGrad)" />
        <polyline points={line} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0d1428" stroke="#60a5fa" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-1.5">
        {data.map((d, i) => {
          const isToday = isSameDay(d.date, today);
          // En móvil solo cada 3ra etiqueta (y hoy) para que no se amontonen
          return (
            <span key={i} className={`text-[9px] ${i % 3 !== 0 && !isToday ? 'hidden sm:inline' : ''} ${isToday ? 'text-blue-400 font-bold' : 'text-slate-600'}`}>
              {d.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// ── Barra horizontal con gradiente ────────────────────────────────────────────
const GradientBar = ({ count, total, from, to }) => (
  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{
        width: `${total > 0 ? Math.max((count / total) * 100, 2) : 0}%`,
        background: `linear-gradient(90deg, ${from}, ${to})`,
      }}
    />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE REPORTES
// ══════════════════════════════════════════════════════════════════════════════
const Reports = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tickets')
      .then((r) => setTickets(r.data))
      .catch((err) => console.error('Error al cargar reportes', err))
      .finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(() => {
    const total = tickets.length;
    const byEstado = ESTADOS.map((e) => ({ ...e, value: tickets.filter((t) => t.estado === e.key).length }));

    // Últimos 14 días
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d,
        label: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        count: tickets.filter((t) => isSameDay(new Date(t.created_at), d)).length,
      });
    }

    // Categorías
    const catMap = {};
    tickets.forEach((t) => {
      const c = t.categoria_nombre || 'Sin categoría';
      catMap[c] = (catMap[c] || 0) + 1;
    });
    const byCategoria = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Top solicitantes
    const userMap = {};
    tickets.forEach((t) => {
      const u = t.usuario_nombre || 'Desconocido';
      if (!userMap[u]) userMap[u] = { total: 0, abiertos: 0 };
      userMap[u].total += 1;
      if (['abierto', 'en proceso'].includes(t.estado)) userMap[u].abiertos += 1;
    });
    const topUsers = Object.entries(userMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    const resueltos = tickets.filter((t) => ['cerrado', 'resuelto'].includes(t.estado)).length;
    const alta = tickets.filter((t) => t.prioridad === 'alta').length;
    const iaPend = tickets.filter((t) => t.estado === 'resuelto por ia - pendiente').length;
    const resolucionRate = total > 0 ? Math.round((resueltos / total) * 100) : 0;

    // Semana actual vs anterior
    const countLast = (n) => {
      const since = new Date(); since.setDate(since.getDate() - (n * 7));
      const from = new Date(); from.setDate(from.getDate() - ((n - 1) * 7) - 1);
      return tickets.filter((t) => {
        const d = new Date(t.created_at);
        return d > since && d <= from;
      }).length;
    };
    const thisWeek = countLast(0);
    const lastWeek = countLast(1);
    const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;

    return { total, byEstado, days, byCategoria, topUsers, resueltos, alta, iaPend, resolucionRate, thisWeek, lastWeek, trend };
  }, [tickets]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
              <div className="skeleton h-3 w-20 mb-3 rounded" />
              <div className="skeleton h-8 w-14 rounded" />
            </div>
          ))}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Tickets', value: analytics.total, sub: `${analytics.thisWeek} esta semana`, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/15' },
    { label: 'Tasa de Resolución', value: `${analytics.resolucionRate}%`, sub: `${analytics.resueltos} resueltos`, icon: Gauge, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
    { label: 'Prioridad Alta', value: analytics.alta, sub: 'Requieren atención', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15' },
    { label: 'Pendientes IA', value: analytics.iaPend, sub: 'Esperando confirmación', icon: Bot, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/15' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Reportes y Analítica</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de los últimos 14 días · actualizado {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
          analytics.trend > 0
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          <TrendingUp className={`w-3.5 h-3.5 ${analytics.trend > 0 ? 'rotate-0' : 'rotate-180'}`} />
          {analytics.trend > 0 ? '+' : ''}{analytics.trend}% vs semana anterior
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-2xl p-5 border border-white/5 animate-fade-in"
              style={{ background: 'var(--bg-card)', animationDelay: `${i * 70}ms` }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-3xl font-black text-white mb-0.5">{card.value}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{card.label}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Tendencia diaria */}
        <div className="lg:col-span-3 rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              Tickets Creados por Día
            </h3>
            <span className="text-[10px] text-slate-600">Últimos 14 días</span>
          </div>
          <AreaChart data={analytics.days} />
        </div>

        {/* Dona por estado */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            Distribución por Estado
          </h3>
          <DonutChart data={analytics.byEstado} total={analytics.total} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Por categoría */}
        <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Incidencias por Categoría
          </h3>
          <div className="space-y-3.5">
            {analytics.byCategoria.length > 0 ? (
              analytics.byCategoria.map(([name, count], i) => (
                <div key={name} className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-medium truncate mr-2">{name}</span>
                    <span className="text-slate-500 shrink-0">{count}</span>
                  </div>
                  <GradientBar count={count} total={analytics.total}
                    from={['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][i % 6]}
                    to={['#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399'][i % 6]} />
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-600">Sin datos de categorías.</p>
            )}
          </div>
        </div>

        {/* Top solicitantes */}
        <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Top Solicitantes
            </h3>
            <Link to="/tickets" className="text-[11px] text-blue-400 font-semibold hover:text-blue-300 flex items-center gap-1 transition-colors">
              Ver tickets <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {analytics.topUsers.length > 0 ? (
              analytics.topUsers.map(([name, info], i) => {
                const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div key={name} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/3 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border ${
                      i === 0
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/25'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{name}</p>
                      <p className="text-[10px] text-slate-600">{info.abiertos > 0 ? `${info.abiertos} activos` : 'Sin tickets activos'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {info.abiertos > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" />{info.abiertos}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />{info.total}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] text-slate-600">Aún no hay tickets registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
