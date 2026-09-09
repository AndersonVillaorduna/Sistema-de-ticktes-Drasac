import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, Search, RefreshCw, PlusCircle,
  Clock, CheckCircle2, Bot, AlertCircle,
  ChevronRight, Filter, SlidersHorizontal,
} from 'lucide-react';

// ── Status Badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ estado }) => {
  const map = {
    'abierto':                  { cls: 'badge-open',     label: 'Abierto' },
    'en proceso':               { cls: 'badge-progress', label: 'En Proceso' },
    'resuelto por ia - pendiente': { cls: 'badge-ai',   label: 'Solución IA ✦' },
    'cerrado':                  { cls: 'badge-closed',   label: 'Cerrado' },
    'resuelto':                 { cls: 'badge-closed',   label: 'Resuelto' },
  };
  const info = map[estado] || { cls: 'badge-low', label: estado };
  return (
    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${info.cls}`}>
      {info.label}
    </span>
  );
};

const PriorityBadge = ({ prioridad }) => {
  const map = {
    alta:  'badge-high',
    media: 'badge-medium',
    baja:  'badge-low',
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${map[prioridad] || 'badge-low'}`}>
      {prioridad}
    </span>
  );
};

// ── Ticket Card (para vista empleado) ─────────────────────────────────────────
const TicketCard = ({ ticket }) => {
  const iconMap = {
    'abierto':                  { Icon: AlertCircle, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
    'en proceso':               { Icon: Clock,       color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
    'resuelto por ia - pendiente': { Icon: Bot,     color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    'cerrado':                  { Icon: CheckCircle2,color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
    'resuelto':                 { Icon: CheckCircle2,color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  };
  const { Icon, color, bg } = iconMap[ticket.estado] || iconMap['abierto'];

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 truncate transition-colors">
          {ticket.titulo}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-slate-600">#{ticket.id}</span>
          <span className="text-[10px] text-slate-700">·</span>
          <span className="text-[10px] text-slate-600">{new Date(ticket.created_at).toLocaleDateString('es-PE')}</span>
          {ticket.categoria_nombre && (
            <><span className="text-[10px] text-slate-700">·</span>
              <span className="text-[10px] text-slate-600">{ticket.categoria_nombre}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusBadge estado={ticket.estado} />
        <PriorityBadge prioridad={ticket.prioridad} />
      </div>
      <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-blue-400 transition-colors shrink-0" />
    </Link>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TICKETS LIST
// ══════════════════════════════════════════════════════════════════════════════
const TicketsList = () => {
  const { isTecnico } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (estado) params.estado = estado;
      if (prioridad) params.prioridad = prioridad;

      const response = await api.get('/tickets', { params });
      let data = response.data;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        data = data.filter((t) =>
          t.titulo.toLowerCase().includes(q) ||
          t.descripcion?.toLowerCase().includes(q) ||
          t.categoria_nombre?.toLowerCase().includes(q) ||
          t.tecnico_nombre?.toLowerCase().includes(q)
        );
      }
      setTickets(data);
    } catch {
      console.error('Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [estado, prioridad]);

  const handleSearch = (e) => { e.preventDefault(); fetchTickets(); };

  const countByEstado = (est) => tickets.filter((t) => t.estado === est).length;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">
            {isTecnico ? 'Gestión de Tickets' : 'Mis Tickets'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isTecnico
              ? `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} en el sistema`
              : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} registrado${tickets.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
              showFilters
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                : 'border-white/8 bg-white/3 text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Filtros</span>
          </button>
          <button
            onClick={fetchTickets}
            className="p-2.5 rounded-xl border border-white/8 bg-white/3 text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!isTecnico && (
            <Link
              to="/tickets/nuevo"
              id="create-ticket-list-btn"
              className="btn-glow text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Ticket</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mini stats para admin */}
      {isTecnico && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Abiertos',    count: countByEstado('abierto'),     cls: 'badge-open',     icon: AlertCircle },
            { label: 'En Proceso',  count: countByEstado('en proceso'),  cls: 'badge-progress', icon: Clock },
            { label: 'Solución IA', count: countByEstado('resuelto por ia - pendiente'), cls: 'badge-ai', icon: Bot },
            { label: 'Cerrados',    count: countByEstado('cerrado') + countByEstado('resuelto'), cls: 'badge-closed', icon: CheckCircle2 },
          ].map(({ label, count, cls, icon: Icon }) => (
            <div key={label} className="rounded-xl p-3 border border-white/5 flex items-center gap-3"
              style={{ background: 'var(--bg-card)' }}>
              <div className="flex-1">
                <p className="text-xl font-black text-white">{count}</p>
                <p className="text-[10px] text-slate-600">{label}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${cls}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-white/6 p-4 animate-fade-in" style={{ background: 'var(--bg-card)' }}>
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por título, técnico, categoría..."
                  className="input-glow w-full rounded-xl py-2.5 pl-10 pr-4 text-sm border transition-all text-white placeholder-slate-600"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="input-glow w-full rounded-xl py-2.5 px-3 text-sm border transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: estado ? '#e2e8f0' : '#64748b' }}
              >
                <option value="" style={{ background: '#0d1428' }}>Todos los estados</option>
                <option value="abierto" style={{ background: '#0d1428' }}>Abierto</option>
                <option value="en proceso" style={{ background: '#0d1428' }}>En Proceso</option>
                <option value="resuelto por ia - pendiente" style={{ background: '#0d1428' }}>Solución IA (Pendiente)</option>
                <option value="cerrado" style={{ background: '#0d1428' }}>Cerrado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Prioridad</label>
              <div className="flex gap-2">
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="input-glow flex-1 rounded-xl py-2.5 px-3 text-sm border transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: prioridad ? '#e2e8f0' : '#64748b' }}
                >
                  <option value="" style={{ background: '#0d1428' }}>Todas</option>
                  <option value="baja" style={{ background: '#0d1428' }}>Baja</option>
                  <option value="media" style={{ background: '#0d1428' }}>Media</option>
                  <option value="alta" style={{ background: '#0d1428' }}>Alta</option>
                </select>
                <button
                  type="submit"
                  className="btn-glow px-3 py-2.5 rounded-xl text-white text-sm flex items-center justify-center"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Ticket List */}
      <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        {/* Table header (solo para admin en desktop) */}
        {isTecnico && (
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 border-b border-white/5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <div className="col-span-1">Ref</div>
            <div className="col-span-4">Título</div>
            <div className="col-span-2">Categoría</div>
            <div className="col-span-2">Técnico</div>
            <div className="col-span-1">Fecha</div>
            <div className="col-span-1">Prioridad</div>
            <div className="col-span-1 text-right">Estado</div>
          </div>
        )}

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-2.5 w-1/2 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className={isTecnico ? '' : 'p-3 space-y-2'}>
            {tickets.map((ticket) =>
              isTecnico ? (
                /* Admin table row */
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="group hidden md:grid md:grid-cols-12 gap-4 px-5 py-4 border-b border-white/3 hover:bg-blue-500/5 hover:border-b-blue-500/10 transition-all items-center"
                >
                  <div className="col-span-1 text-slate-600 text-xs font-bold">#{ticket.id}</div>
                  <div className="col-span-4 text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors truncate pr-4">{ticket.titulo}</div>
                  <div className="col-span-2 text-xs text-slate-500 truncate">{ticket.categoria_nombre || '—'}</div>
                  <div className="col-span-2 text-xs text-slate-500 truncate">{ticket.tecnico_nombre || 'Sin asignar'}</div>
                  <div className="col-span-1 text-xs text-slate-600">{new Date(ticket.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit' })}</div>
                  <div className="col-span-1"><PriorityBadge prioridad={ticket.prioridad} /></div>
                  <div className="col-span-1 flex justify-end"><StatusBadge estado={ticket.estado} /></div>
                </Link>
              ) : (
                /* Employee card */
                <TicketCard key={ticket.id} ticket={ticket} />
              )
            )}
            {/* Mobile view for admin: card style */}
            <div className="md:hidden">
              {isTecnico && tickets.map((ticket) => (
                <TicketCard key={`mob-${ticket.id}`} ticket={ticket} />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Ticket className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-semibold">No se encontraron tickets</p>
            <p className="text-xs text-slate-600 mt-1">
              {(estado || prioridad || busqueda) ? 'Intenta con otros filtros.' : 'Crea el primero usando el botón de arriba.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsList;
