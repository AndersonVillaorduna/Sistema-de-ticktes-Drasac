import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, AlertCircle, Loader2, Send, MessageSquare,
  Bot, CheckCircle2, Clock, Wrench, User as UserIcon, Zap,
} from 'lucide-react';

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
  const map = { alta: 'badge-high', media: 'badge-medium', baja: 'badge-low' };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${map[prioridad] || 'badge-low'}`}>
      {prioridad}
    </span>
  );
};

const TicketDetail = () => {
  const { id } = useParams();
  const { user, isAdmin, isTecnico } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const chatEndRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    if (isTecnico) {
      api.get('/auth/tecnicos').then((r) => setTecnicos(r.data)).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.comentarios?.length]);

  const handleComentario = async (e) => {
    e.preventDefault();
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/tickets/${id}/comentarios`, { mensaje: comentario.trim() });
      setComentario('');
      await fetchTicket();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar el comentario.');
    } finally {
      setEnviando(false);
    }
  };

  const handlePatch = async (campo, valor) => {
    try {
      await api.patch(`/tickets/${id}`, { [campo]: valor });
      await fetchTicket();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar el ticket.');
    }
  };

  const handleConfirmar = async (confirmado) => {
    try {
      await api.post(`/tickets/${id}/confirmar`, { confirmado });
      await fetchTicket();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al registrar la respuesta.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-400">{error || 'Ticket no encontrado'}</p>
        <Link to="/tickets" className="text-xs text-blue-400 hover:underline mt-3 inline-block">
          ← Volver a mis tickets
        </Link>
      </div>
    );
  }

  const esPropietario = ticket.usuario_id === user?.id;
  const puedeConfirmar = esPropietario && ticket.estado === 'resuelto por ia - pendiente';

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <Link to="/tickets" className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1.5 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a la lista
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] text-slate-600 font-bold">TICKET #{ticket.id}</p>
            <h2 className="text-xl font-black text-white mt-1">{ticket.titulo}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge estado={ticket.estado} />
            <PriorityBadge prioridad={ticket.prioridad} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{ticket.usuario_nombre || '—'}</span>
          {ticket.categoria_nombre && (
            <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />{ticket.categoria_nombre}</span>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />
            {new Date(ticket.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {ticket.tecnico_nombre && (
            <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Técnico: {ticket.tecnico_nombre}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Columna izquierda: descripción + conversación */}
        <div className="lg:col-span-2 space-y-5 min-w-0">

          {/* Descripción */}
          <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción del problema</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{ticket.descripcion}</p>
          </div>

          {/* Conversación */}
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="p-4 border-b border-white/5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Conversación ({ticket.comentarios?.length || 0})
              </h3>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {ticket.comentarios?.length > 0 ? (
                ticket.comentarios.map((com) => {
                  const esMio = com.usuario_id === user?.id;
                  const esIA = com.usuario_rol === 'sistema' || com.usuario_nombre === 'Inteligencia Artificial Drasac';
                  return (
                    <div key={com.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
                        esIA
                          ? 'bg-indigo-500/10 border-indigo-500/20'
                          : esMio
                          ? 'bg-blue-500/10 border-blue-500/20'
                          : 'bg-white/3 border-white/5'
                      }`}>
                        <p className={`text-[10px] font-bold mb-1 ${esIA ? 'text-indigo-400' : esMio ? 'text-blue-400' : 'text-slate-500'}`}>
                          {com.usuario_nombre} {esMio && '(tú)'}
                        </p>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-xs">{com.mensaje}</p>
                        <p className="text-[9px] text-slate-600 mt-1.5">
                          {new Date(com.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-600">
                  <MessageSquare className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                  No hay mensajes aún. Sé el primero en escribir.
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleComentario} className="p-4 border-t border-white/5 flex gap-3">
              <input
                type="text"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe un mensaje…"
                className="input-glow flex-1 rounded-xl py-2.5 px-4 text-sm border text-white placeholder-slate-600"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
              <button
                type="submit"
                disabled={enviando || !comentario.trim()}
                className="btn-glow px-4 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        {/* Columna derecha: solución IA + gestión */}
        <div className="space-y-5 lg:sticky lg:top-6 min-w-0">

          {/* Respuesta de la IA */}
          {ticket.respuesta_ia && (
            <div className="rounded-2xl border border-indigo-500/20 p-5" style={{ background: 'var(--panel-ai-bg)' }}>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Solución propuesta por la IA
              </p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{ticket.respuesta_ia}</p>

              {puedeConfirmar && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    ¿Esta solución resolvió tu problema?
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleConfirmar(true)}
                      className="btn-glow text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Sí, quedó resuelto
                    </button>
                    <button
                      onClick={() => handleConfirmar(false)}
                      className="px-4 py-2.5 border border-white/8 text-slate-400 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all text-xs"
                    >
                      No, escalar a un técnico
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel técnico (solo admin/técnico) */}
          {isTecnico && (
            <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Gestión del ticket</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Estado</label>
                  <select
                    value={ticket.estado}
                    onChange={(e) => handlePatch('estado', e.target.value)}
                    className="input-glow w-full rounded-xl py-2 px-3 text-xs border text-white"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <option value="abierto" style={{ background: '#0d1428' }}>Abierto</option>
                    <option value="en proceso" style={{ background: '#0d1428' }}>En Proceso</option>
                    <option value="resuelto por ia - pendiente" style={{ background: '#0d1428' }}>Solución IA (Pendiente)</option>
                    <option value="resuelto" style={{ background: '#0d1428' }}>Resuelto</option>
                    <option value="cerrado" style={{ background: '#0d1428' }}>Cerrado</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Prioridad</label>
                  <select
                    value={ticket.prioridad || 'media'}
                    onChange={(e) => handlePatch('prioridad', e.target.value)}
                    className="input-glow w-full rounded-xl py-2 px-3 text-xs border text-white"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <option value="baja" style={{ background: '#0d1428' }}>Baja</option>
                    <option value="media" style={{ background: '#0d1428' }}>Media</option>
                    <option value="alta" style={{ background: '#0d1428' }}>Alta</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Técnico asignado</label>
                  <select
                    value={ticket.tecnico_id || ''}
                    onChange={(e) => handlePatch('tecnico_id', e.target.value)}
                    className="input-glow w-full rounded-xl py-2 px-3 text-xs border text-white"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: ticket.tecnico_id ? '#e2e8f0' : '#64748b' }}
                  >
                    <option value="" style={{ background: '#0d1428' }}>Sin asignar</option>
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id} style={{ background: '#0d1428' }}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
