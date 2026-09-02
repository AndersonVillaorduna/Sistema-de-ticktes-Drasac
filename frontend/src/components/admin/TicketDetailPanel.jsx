import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge } from '../shared/Badge';
import {
  ArrowLeft, MessageSquare, Bot, AlertTriangle, CheckCircle2,
  Send, Calendar, Layers, Settings, Shield,
  Loader2, Sparkles, Laptop, User, Clock, Hash, Tag, Trash2
} from 'lucide-react';

export default function AdminTicketDetail({ ticketId, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [processingIA, setProcessingIA] = useState(false);
  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tecnicos, setTecnicos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const chatEndRef = useRef(null);

  const loadTicket = async () => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      setTicket(res.data);
      setComentarios(res.data.comentarios || []);
      setEstado(res.data.estado);
      setPrioridad(res.data.prioridad);
      setTecnicoId(res.data.tecnico_id || '');
      setCategoriaId(res.data.categoria_id || '');
    } catch { navigate('/admin/tickets'); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadTicket(),
      api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {}),
      api.get('/auth/tecnicos').then(r => setTecnicos(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comentarios]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/tickets/${ticketId}/comentarios`, { mensaje: nuevoComentario });
      setComentarios((prev) => [...prev, res.data.comentario]);
      setNuevoComentario('');
    } catch {}
    setSendingComment(false);
  };

  const handleIAConfirm = async (confirmado) => {
    setProcessingIA(true);
    try {
      await api.post(`/tickets/${ticketId}/confirmar`, { confirmado });
      await loadTicket();
    } catch {}
    setProcessingIA(false);
  };

  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = { estado, prioridad };
      if (tecnicoId) payload.tecnico_id = parseInt(tecnicoId);
      if (categoriaId) payload.categoria_id = parseInt(categoriaId);
      await api.patch(`/tickets/${ticketId}`, payload);
      await loadTicket();
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch {}
    setSavingSettings(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás absolutamente seguro de que deseas eliminar este ticket? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await api.delete(`/tickets/${ticketId}`);
      onBack();
    } catch (error) {
      alert('Error al eliminar el ticket');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
  if (!ticket) return null;

  return (
    <div className="p-5 md:p-8 lg:px-10 lg:py-12 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 transition-all shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-neutral-900 truncate">{ticket.titulo}</h1>
            <StatusBadge estado={ticket.estado} size="lg" />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
            <Hash className="w-3.5 h-3.5" />
            <span>Ticket #{ticket.id}</span>
            <span className="text-neutral-300">·</span>
            <Tag className="w-3.5 h-3.5" />
            <span>{ticket.categoria_nombre || 'Sin categoría'}</span>
            <span className="text-neutral-300">·</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(ticket.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '24px' }}>
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] mb-4">Descripción del problema</h3>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50 border border-neutral-100" style={{ borderRadius: '12px', padding: '20px' }}>
              {ticket.descripcion}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-100">
              {[
                { icon: Calendar, label: 'Creado', value: new Date(ticket.created_at).toLocaleDateString('es-PE') },
                { icon: Layers, label: 'Categoría', value: ticket.categoria_nombre || 'General' },
                { icon: User, label: 'Reportado por', value: ticket.usuario_nombre },
                { icon: Laptop, label: 'Equipos', value: ticket.equipos?.length > 0 ? `${ticket.equipos.length} vinculado(s)` : 'Ninguno' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-neutral-50 border border-neutral-100" style={{ borderRadius: '12px', padding: '12px' }}>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</p>
                  <p className="text-xs font-semibold text-neutral-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {ticket.estado === 'resuelto por ia - pendiente' && (
            <div className="border border-purple-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #fff 100%)', borderRadius: '16px', padding: '24px' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" /> Solución Automática de IA
                  </h4>
                  <p className="text-xs text-purple-500 mt-0.5">LLaMA 3.1 · Verifica si esto resolvió el problema</p>
                </div>
              </div>
              <div className="p-5 rounded-xl border border-purple-100 mb-5 text-sm text-neutral-700 leading-relaxed italic bg-white/80">
                &ldquo;{ticket.respuesta_ia}&rdquo;
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => handleIAConfirm(true)} disabled={processingIA}
                  className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50">
                  {processingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Sí, problema resuelto
                </button>
                <button onClick={() => handleIAConfirm(false)} disabled={processingIA}
                  className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50">
                  <AlertTriangle className="w-4 h-4" /> No resolvió (escalar)
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '24px' }}>
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-5">
              <MessageSquare className="w-4 h-4" /> Seguimiento
              <span className="ml-auto text-neutral-300 normal-case tracking-normal">{comentarios.length} mensaje{comentarios.length !== 1 ? 's' : ''}</span>
            </h4>
            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2 mb-5">
              {comentarios.length > 0 ? comentarios.map((com, idx) => {
                const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
                const isMe = com.usuario_nombre === user?.nombre;
                return (
                  <div key={com.id || idx} className={`flex gap-2.5 ${isIA || isMe ? 'flex-row-reverse' : ''}`} style={{ marginBottom: '20px' }}>
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${isIA ? 'bg-purple-500' : isMe ? 'bg-primary' : 'bg-[#1B3C5C]'}`}>
                      {isIA ? <Bot className="w-3.5 h-3.5" /> : (isMe ? 'Tú' : com.usuario_nombre?.charAt(0)?.toUpperCase())}
                    </div>
                    <div className={`max-w-[80%] border ${isIA ? 'bg-purple-50 border-purple-100' : isMe ? 'bg-primary/5 border-primary/20' : 'bg-neutral-50 border-neutral-100'}`} style={{ borderRadius: (isIA || isMe) ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding: '8px 14px' }}>
                      <div className="flex justify-between items-center gap-4 mb-1">
                        <strong className={`text-[11px] ${isMe ? 'text-primary' : 'text-neutral-700'}`}>{isMe ? 'Tú' : com.usuario_nombre}</strong>
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                          {new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-neutral-700 leading-relaxed text-[13px] whitespace-pre-wrap">{com.mensaje}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-10 text-center text-sm text-neutral-400">
                  <MessageSquare className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
                  <p>No hay comentarios aún.</p>
                  <p className="text-xs text-neutral-300 mt-1">Sé el primero en responder.</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {ticket.estado !== 'cerrado' ? (
              <form onSubmit={handleCommentSubmit} className="flex gap-3 pt-5 border-t border-neutral-100">
                <input type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  className="flex-1 py-3.5 px-5 text-sm border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all" style={{ borderRadius: '12px' }} />
                <button type="submit" disabled={sendingComment || !nuevoComentario.trim()}
                  className="w-12 h-12 bg-[#1B3C5C] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#142E47] transition-all shadow-sm" style={{ borderRadius: '12px' }}>
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-sm text-neutral-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ticket cerrado. No se pueden añadir comentarios.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-neutral-200 shadow-sm sticky top-5" style={{ borderRadius: '16px', padding: '24px' }}>
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-neutral-100">
              <div className="w-9 h-9 rounded-xl bg-[#1B3C5C]/10 flex items-center justify-center">
                <Shield className="w-4.5 h-4.5 text-[#1B3C5C]" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900">Administrar Ticket</h4>
            </div>
            <div className="text-sm">
              <div style={{ marginBottom: '16px' }}>
                <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1.5">Estado</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)}
                  className="w-full border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all text-sm bg-neutral-50 focus:bg-white" style={{ borderRadius: '12px', padding: '12px 16px' }}>
                  <option value="abierto">Abierto</option>
                  <option value="en proceso">En Proceso</option>
                  <option value="resuelto por ia - pendiente">Solución IA (Pendiente)</option>
                  <option value="resuelto">Resuelto</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1.5">Prioridad</label>
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}
                  className="w-full border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all text-sm bg-neutral-50 focus:bg-white" style={{ borderRadius: '12px', padding: '12px 16px' }}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1.5">Categoría</label>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all text-sm bg-neutral-50 focus:bg-white" style={{ borderRadius: '12px', padding: '12px 16px' }}>
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1.5">Técnico asignado</label>
                <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}
                  className="w-full border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all text-sm bg-neutral-50 focus:bg-white" style={{ borderRadius: '12px', padding: '12px 16px' }}>
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <button onClick={handleUpdateSettings} disabled={savingSettings}
                className={`w-full py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg ${
                  settingsSaved
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-[#1B3C5C] text-white hover:bg-[#142E47]'
                }`} style={{ borderRadius: '12px' }}>
                {savingSettings ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : settingsSaved ? (
                  <><CheckCircle2 className="w-4 h-4" /> ¡Guardado!</>
                ) : (
                  <><Settings className="w-4 h-4" /> Aplicar Cambios</>
                )}
              </button>
            </div>
          </div>

          {ticket.equipos?.length > 0 && (
            <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '24px' }}>
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Laptop className="w-4 h-4 text-neutral-500" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Equipos Vinculados</h4>
              </div>
              <div className="space-y-3">
                {ticket.equipos.map((eq) => (
                  <div key={eq.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                    <p className="text-sm font-bold text-neutral-800">{eq.nombre_equipo}</p>
                    <p className="text-xs text-neutral-500 mt-1">{eq.tipo} · {eq.marca} {eq.modelo}</p>
                    <p className="text-[10px] text-neutral-400 mt-1 font-mono">S/N: {eq.numero_serie}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '24px' }}>
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-neutral-100">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                <User className="w-4 h-4 text-neutral-500" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900">Información del Ticket</h4>
            </div>
            <div className="text-xs">
              <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <span className="text-neutral-400 font-medium">Creado por</span>
                <span className="font-semibold text-neutral-700">{ticket.usuario_nombre}</span>
              </div>
              <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <span className="text-neutral-400 font-medium">Técnico</span>
                <span className="font-semibold text-neutral-700">{ticket.tecnico_nombre || 'Sin asignar'}</span>
              </div>
              <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <span className="text-neutral-400 font-medium">Prioridad</span>
                <span className={`font-bold uppercase ${ticket.prioridad === 'alta' ? 'text-red-500' : ticket.prioridad === 'media' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {ticket.prioridad}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Clasificación IA</span>
                <span className={`font-semibold ${ticket.clasificado_por_ia ? 'text-purple-600' : 'text-neutral-500'}`}>
                  {ticket.clasificado_por_ia ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </div>
          
          {user?.rol === 'admin' && (
            <div className="bg-white border border-red-100 shadow-sm" style={{ borderRadius: '16px', padding: '24px' }}>
              <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Zona de Peligro
              </h4>
              <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
                Al eliminar este ticket, se borrarán de forma permanente todos sus comentarios y datos asociados.
              </p>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar Ticket
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
