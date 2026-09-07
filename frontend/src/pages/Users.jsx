import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  Users as UsersIcon, Search, UserPlus, ShieldCheck, Bot, User,
  RefreshCw, Mail, Building2, Ticket, CheckCircle2, AlertCircle,
} from 'lucide-react';

// ── Rol badge ────────────────────────────────────────────────────────────────
const RolBadge = ({ rol }) => {
  const map = {
    admin:   { label: 'Administrador', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
    tecnico: { label: 'Técnico TI',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    usuario: { label: 'Empleado',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  };
  const info = map[rol] || { label: rol, cls: 'bg-white/5 text-slate-400 border-white/10' };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${info.cls}`}>
      {info.label}
    </span>
  );
};

const RolIcon = ({ rol }) =>
  rol === 'admin' ? ShieldCheck : rol === 'tecnico' ? Bot : User;

// ── Modal: registrar usuario ─────────────────────────────────────────────────
const RegisterModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'usuario', tienda_area: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/auth/register', form);
      onCreated();
    } catch (err) {
      const msgs = err.response?.data?.messages;
      setError(
        err.response?.data?.message ||
        (msgs ? Object.values(msgs).flat().join(' · ') : 'No se pudo registrar el usuario')
      );
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'input-glow w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600';

  return (
    <Modal onClose={onClose} maxW="max-w-md">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-blue)' }}>
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Registrar Usuario</h3>
            <p className="text-[10px] text-slate-500">Crea una nueva cuenta en el sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nombre completo</label>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. María Torres" className={inputCls}
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Correo electrónico</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@drasac.com" className={inputCls}
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Contraseña</label>
              <input required type="password" minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mín. 6 caracteres" className={inputCls}
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className={inputCls}
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <option value="usuario" style={{ background: '#0d1428' }}>Empleado</option>
                <option value="tecnico" style={{ background: '#0d1428' }}>Técnico TI</option>
                <option value="admin" style={{ background: '#0d1428' }}>Administrador</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tienda / Área</label>
            <input value={form.tienda_area} onChange={(e) => setForm({ ...form, tienda_area: e.target.value })}
              placeholder="Ej. Tienda San Miguel" className={inputCls}
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-white/5 border border-white/8 hover:bg-white/8 hover:text-white transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="btn-glow flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE USUARIOS
// ══════════════════════════════════════════════════════════════════════════════
const Users = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const r = await api.get('/auth/usuarios');
      setUsuarios(r.data);
    } catch (err) {
      console.error('Error al cargar usuarios', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q ||
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.tienda_area?.toLowerCase().includes(q);
    const matchRol = !rolFiltro || u.rol === rolFiltro;
    return matchQ && matchRol;
  });

  const countRol = (rol) => usuarios.filter((u) => u.rol === rol).length;

  const statCards = [
    { label: 'Total Usuarios', value: usuarios.length, icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/15' },
    { label: 'Administradores', value: countRol('admin'), icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15' },
    { label: 'Técnicos TI', value: countRol('tecnico'), icon: Bot, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/15' },
    { label: 'Empleados', value: countRol('usuario'), icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
  ];

  const rolChips = [
    { value: '', label: 'Todos' },
    { value: 'admin', label: 'Administradores' },
    { value: 'tecnico', label: 'Técnicos' },
    { value: 'usuario', label: 'Empleados' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Gestión de Usuarios</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsuarios} title="Refrescar"
            className="p-2.5 rounded-xl border border-white/8 bg-white/3 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {user?.rol === 'admin' && (
            <button onClick={() => setShowModal(true)}
              className="btn-glow text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-2xl p-5 border border-white/5 flex items-center justify-between animate-fade-in"
              style={{ background: 'var(--bg-card)', animationDelay: `${i * 70}ms` }}>
              <div>
                <p className="text-3xl font-black text-white">{card.value}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{card.label}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Buscador + filtros por rol */}
      <div className="rounded-2xl border border-white/5 p-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o área…"
              className="input-glow w-full rounded-xl py-2.5 pl-10 pr-4 text-sm border text-white placeholder-slate-600"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {rolChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setRolFiltro(chip.value)}
                className={`text-[11px] font-bold px-3.5 py-2 rounded-xl border transition-all ${
                  rolFiltro === chip.value
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : 'border-white/8 bg-white/3 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3 rounded" />
                  <div className="skeleton h-2.5 w-1/4 rounded" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtrados.length > 0 ? (
          <div className="divide-y divide-white/3">
            {filtrados.map((u) => {
              const RolI = RolIcon(u.rol);
              const initials = u.nombre?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={u.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-blue-500/5 transition-all group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 font-black text-xs ${
                    u.rol === 'admin'
                      ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-400 border-red-500/25'
                      : u.rol === 'tecnico'
                      ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/25'
                      : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/25'
                  }`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200 truncate">{u.nombre}</p>
                      {u.id === user?.id && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/8 text-slate-400 uppercase">Tú</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-slate-600 truncate max-w-full">
                        <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{u.email}</span>
                      </span>
                      {u.tienda_area && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Building2 className="w-3 h-3" />{u.tienda_area}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
                    <Ticket className="w-3.5 h-3.5 text-slate-600" />
                    {u.total_tickets} ticket{u.total_tickets !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RolI className={`w-3.5 h-3.5 ${
                      u.rol === 'admin' ? 'text-red-400' : u.rol === 'tecnico' ? 'text-blue-400' : 'text-slate-500'
                    }`} />
                    <RolBadge rol={u.rol} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <UsersIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-semibold">No se encontraron usuarios</p>
            <p className="text-xs text-slate-600 mt-1">Intenta con otra búsqueda o cambia el filtro de rol.</p>
          </div>
        )}
      </div>

      {showModal && (
        <RegisterModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchUsuarios(); }}
        />
      )}
    </div>
  );
};

export default Users;
