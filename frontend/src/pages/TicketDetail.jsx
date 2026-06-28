import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, MessageSquare, Bot, AlertTriangle, CheckCircle2,
  Send, User, Settings, Calendar, Layers, Laptop,
  ArrowLeft, Sparkles, Shield, Clock, Loader2,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
const StatusBadge = ({ estado }) => {
  const map = {
    'abierto':                     { cls: 'badge-open',     label: 'Abierto' },
    'en proceso':                  { cls: 'badge-progress', label: 'En Proceso' },
    'resuelto por ia - pendiente': { cls: 'badge-ai',       label: 'Solución IA ✦' },
    'cerrado':                     { cls: 'badge-closed',   label: 'Cerrado' },
    'resuelto':                    { cls: 'badge-closed',   label: 'Resuelto' },
  };
  const { cls, label } = map[estado] || { cls: 'badge-low', label: estado };
  return (
    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${cls}`}>{label}</span>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div>
      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold text-slate-200 mt-0.5">{value}</p>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isTecnico } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const chatEndRef = useRef(null);

  // Admin controls
  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tecnicos, setTecnicos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [processingIA, setProcessingIA] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
      setComentarios(res.data.comentarios || []);
      setEstado(res.data.estado);
      setPrioridad(res.data.prioridad);
      setTecnicoId(res.data.tecnico_id || '');
      setCategoriaId(res.data.categoria_id || '');
    } catch {
      navigate('/tickets');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await fetchTicket();
      if (isTecnico) {
        try {
          const [catsRes, techsRes] = await Promise.all([
            api.get('/categorias'),
            api.get('/auth/tecnicos'),
          ]);
          setCategorias(catsRes.data);
          setTecnicos(techsRes.data);
        } catch {}
      }
      setLoading(false);
    };
    loadAll();
  }, [id]);

  // Auto-scroll to last comment
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/tickets/${id}/comentarios`, { mensaje: nuevoComentario });
      setComentarios((prev) => [...prev, res.data.comentario]);
      setNuevoComentario('');
      if (ticket.estado === 'resuelto por ia - pendiente') {
        setTicket((t) => ({ ...t, estado: 'en proceso' }));
      }
    } catch {}
    setSendingComment(false);
  };

  const handleIAConfirm = async (confirmado) => {
    setProcessingIA(true);
    try {
      const res = await api.post(`/tickets/${id}/confirmar`, { confirmado });
      setTicket(res.data.ticket);
      await fetchTicket();
    } catch {}
    setProcessingIA(false);
  };

  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = { estado, prioridad };
      if (tecnicoId) payload.tecnico_id = parseInt(tecnicoId);
      if (categoriaId) payload.categoria_id = parseInt(categoriaId);
      const res = await api.patch(`/tickets/${id}`, payload);
      setTicket(res.data.ticket);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch {}
    setSavingSettings(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs text-slate-500">Cargando ticket...</p>
      </div>
    );
  }
  if (!ticket) return null;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/tickets"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-white truncate">{ticket.titulo}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-600">Ticket #{ticket.id}</span>
            <StatusBadge estado={ticket.estado} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Columna Principal ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Descripción */}
          <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Descripción del Problema</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-white/3 border border-white/5">
              {ticket.descripcion}
            </p>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <InfoRow icon={Calendar} label="Fecha" value={new Date(ticket.created_at).toLocaleDateString('es-PE')} />
              <InfoRow icon={Layers} label="Categoría" value={ticket.categoria_nombre || 'General'} />
              <InfoRow icon={User} label="Reportado por" value={ticket.usuario_nombre} />
              <InfoRow icon={Laptop} label="Equipos" value={ticket.equipos?.length > 0 ? `${ticket.equipos.length} equipo(s)` : 'Ninguno'} />
            </div>
          </div>

          {/* ── Banner IA (solo si hay solución IA pendiente) ── */}
          {ticket.estado === 'resuelto por ia - pendiente' && (
            <div className="rounded-2xl border border-indigo-500/25 p-5 animate-fade-in"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(59,130,246,0.07))' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center animate-glow">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Solución Automática de IA
                  </h4>
                  <p className="text-[10px] text-indigo-400">LLaMA 3.1 · Verifica si esto resolvió tu problema</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/15 mb-4 text-sm text-slate-200 leading-relaxed italic"
                style={{ background: 'rgba(99,102,241,0.06)' }}>
                "{ticket.respuesta_ia}"
              </div>

              {(ticket.usuario_id === user.id || user.rol === 'admin') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleIAConfirm(true)}
                    disabled={processingIA}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold text-sm hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                  >
                    {processingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Sí, problema resuelto ✓
                  </button>
                  <button
                    onClick={() => handleIAConfirm(false)}
                    disabled={processingIA}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/15 transition-all disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    No resolvió (escalar)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Chat / Comentarios ── */}
          <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4" />
              Seguimiento ({comentarios.length} mensajes)
            </h4>

            {/* Messages */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
              {comentarios.length > 0 ? (
                comentarios.map((com, idx) => {
                  const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
                  const isMe = com.usuario_id === user.id;

                  return (
                    <div key={com.id || idx} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold border ${
                        isIA
                          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 border-indigo-500/30'
                          : isMe
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/30'
                          : 'bg-slate-700 border-white/10'
                      }`}>
                        {isIA ? <Bot className="w-4 h-4" /> : com.usuario_nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs space-y-1 ${
                        isMe
                          ? 'bg-blue-600/20 border border-blue-500/20 rounded-tr-sm'
                          : isIA
                          ? 'bg-indigo-500/10 border border-indigo-500/15 rounded-tl-sm'
                          : 'bg-white/4 border border-white/8 rounded-tl-sm'
                      }`}>
                        <div className="flex justify-between items-center gap-3 mb-1">
                          <span className="font-bold text-[10px] text-slate-400">{com.usuario_nombre}</span>
                          <span className="text-[9px] text-slate-600">
                            {new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{com.mensaje}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-600">
                  <MessageSquare className="w-7 h-7 text-slate-800 mx-auto mb-2" />
                  No hay mensajes aún. Sé el primero en escribir.
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Comment input */}
            {ticket.estado !== 'cerrado' && (
              <form onSubmit={handleCommentSubmit} className="flex gap-3 pt-4 border-t border-white/5">
                <input
                  id="comment-input"
                  type="text"
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder={isTecnico ? 'Escribe una respuesta o actualización...' : 'Añadir un comentario o respuesta...'}
                  className="input-glow flex-1 rounded-xl py-3 px-4 text-sm border text-white placeholder-slate-600 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                />
                <button
                  id="comment-submit-btn"
                  type="submit"
                  disabled={sendingComment || !nuevoComentario.trim()}
                  className="btn-glow w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            )}

            {ticket.estado === 'cerrado' && (
              <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Este ticket está cerrado. No se pueden añadir más comentarios.
              </div>
            )}
          </div>
        </div>

        {/* ── Columna Lateral ── */}
        <div className="space-y-4">

          {/* Panel de Admin */}
          {isTecnico ? (
            <div className="rounded-2xl border border-white/5 p-5 sticky top-5" style={{ background: 'var(--bg-card)' }}>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-blue-400" />
                Administrar Ticket
              </h4>

              <div className="space-y-3 text-xs">
                {/* Estado */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-600 font-bold uppercase tracking-wider">Estado</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)}
                    className="input-glow w-full rounded-xl py-2.5 px-3 text-sm border transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                    <option value="abierto" style={{ background: '#0d1428' }}>Abierto</option>
                    <option value="en proceso" style={{ background: '#0d1428' }}>En Proceso</option>
                    <option value="resuelto por ia - pendiente" style={{ background: '#0d1428' }}>Resuelto por IA (Pendiente)</option>
                    <option value="resuelto" style={{ background: '#0d1428' }}>Resuelto</option>
                    <option value="cerrado" style={{ background: '#0d1428' }}>Cerrado</option>
                  </select>
                </div>

                {/* Prioridad */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-600 font-bold uppercase tracking-wider">Prioridad</label>
                  <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}
                    className="input-glow w-full rounded-xl py-2.5 px-3 text-sm border transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                    <option value="baja" style={{ background: '#0d1428' }}>Baja</option>
                    <option value="media" style={{ background: '#0d1428' }}>Media</option>
                    <option value="alta" style={{ background: '#0d1428' }}>Alta</option>
                  </select>
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-600 font-bold uppercase tracking-wider">Categoría</label>
                  <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                    className="input-glow w-full rounded-xl py-2.5 px-3 text-sm border transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                    <option value="" style={{ background: '#0d1428' }}>Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#0d1428' }}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Técnico */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-600 font-bold uppercase tracking-wider">Técnico Responsable</label>
                  <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}
                    className="input-glow w-full rounded-xl py-2.5 px-3 text-sm border transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                    <option value="" style={{ background: '#0d1428' }}>Sin asignar</option>
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id} style={{ background: '#0d1428' }}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUpdateSettings}
                  disabled={savingSettings}
                  className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all mt-1 ${
                    settingsSaved
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : 'btn-glow text-white'
                  }`}
                >
                  {savingSettings ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                  ) : settingsSaved ? (
                    <><CheckCircle2 className="w-4 h-4" />¡Guardado!</>
                  ) : (
                    <><Settings className="w-4 h-4" />Aplicar Cambios</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Vista info para empleado */
            <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-blue-400" />
                Estado del Soporte
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                  <span className="text-slate-600">Estado actual</span>
                  <StatusBadge estado={ticket.estado} />
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                  <span className="text-slate-600">Técnico asignado</span>
                  <span className="font-semibold text-slate-300">{ticket.tecnico_nombre || 'Pendiente'}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                  <span className="text-slate-600">Prioridad</span>
                  <span className={`text-xs font-bold uppercase ${
                    ticket.prioridad === 'alta' ? 'text-red-400' :
                    ticket.prioridad === 'media' ? 'text-amber-400' : 'text-slate-400'
                  }`}>{ticket.prioridad}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2">
                  <span className="text-slate-600">Clasificación</span>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${ticket.clasificado_por_ia ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {ticket.clasificado_por_ia ? <><Bot className="w-3 h-3" />IA Automática</> : 'Manual'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Equipos vinculados */}
          {ticket.equipos?.length > 0 && (
            <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                <Laptop className="w-4 h-4" />
                Equipos Vinculados
              </h4>
              <div className="space-y-2">
                {ticket.equipos.map((eq) => (
                  <div key={eq.id} className="p-3 rounded-xl bg-white/3 border border-white/6 space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">{eq.nombre_equipo}</p>
                    <p className="text-[10px] text-slate-600">{eq.tipo} · S/N: {eq.numero_serie}</p>
                    <p className="text-[10px] text-slate-600">{eq.ubicacion_tienda}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
