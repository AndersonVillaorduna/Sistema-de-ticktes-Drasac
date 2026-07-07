import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { StatusBadge } from '../shared/Badge';
import {
  ArrowLeft, MessageSquare, Bot, AlertTriangle, CheckCircle2,
  Send, Calendar, Layers, Settings, Shield,
  Loader2, Sparkles, Laptop,
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
      const res = await api.post(`/tickets/${ticketId}/confirmar`, { confirmado });
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

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  if (!ticket) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">{ticket.titulo}</h2>
              <StatusBadge estado={ticket.estado} size="lg" />
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Ticket #{ticket.id} · {ticket.categoria_nombre || 'Sin categoría'}</p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Descripción</h3>
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line p-4 rounded-lg bg-neutral-50 border border-neutral-100">{ticket.descripcion}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            {[
              { icon: Calendar, label: 'Fecha', value: new Date(ticket.created_at).toLocaleDateString('es-PE') },
              { icon: Layers, label: 'Categoría', value: ticket.categoria_nombre || 'General' },
              { icon: User, label: 'Reportado por', value: ticket.usuario_nombre },
              { icon: Laptop, label: 'Equipos', value: ticket.equipos?.length > 0 ? `${ticket.equipos.length} equipo(s)` : 'Ninguno' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-neutral-500" /></div>
                <div><p className="text-[10px] text-neutral-500 font-bold uppercase">{label}</p><p className="text-xs font-semibold text-neutral-800">{value}</p></div>
              </div>
            ))}
          </div>
        </div>

        {ticket.estado === 'resuelto por ia - pendiente' && (
          <div className="card p-5 border-ai/20" style={{ background: 'linear-gradient(135deg, #F1EEFB, #fff)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-ai-light border border-ai/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-ai" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-ai" /> Solución Automática de IA</h4>
                <p className="text-xs text-ai">LLaMA 3.1 · Verifica si esto resolvió el problema</p>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-ai/15 mb-4 text-sm text-neutral-700 leading-relaxed italic bg-ai-light/50">"{ticket.respuesta_ia}"</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => handleIAConfirm(true)} disabled={processingIA}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-success-light border border-success/20 text-success font-bold text-sm hover:bg-success/20 transition-all disabled:opacity-50">
                {processingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Sí, problema resuelto
              </button>
              <button onClick={() => handleIAConfirm(false)} disabled={processingIA}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-danger-light border border-danger/20 text-danger font-bold text-sm hover:bg-danger/20 transition-all disabled:opacity-50">
                <AlertTriangle className="w-4 h-4" /> No resolvió (escalar)
              </button>
            </div>
          </div>
        )}

        <div className="card p-5">
          <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4" /> Seguimiento ({comentarios.length} mensajes)
          </h4>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
            {comentarios.length > 0 ? comentarios.map((com, idx) => {
              const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
              return (
                <div key={com.id || idx} className="flex gap-2.5">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${isIA ? 'bg-ai' : 'bg-primary'}`}>
                    {isIA ? <Bot className="w-4 h-4" /> : com.usuario_nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="max-w-[78%] rounded-lg px-4 py-3 text-sm bg-neutral-50 border border-neutral-100">
                    <div className="flex justify-between items-center gap-3 mb-1">
                      <span className="font-bold text-xs text-neutral-600">{com.usuario_nombre}</span>
                      <span className="text-[10px] text-neutral-400">{new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{com.mensaje}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="py-8 text-center text-sm text-neutral-400"><MessageSquare className="w-7 h-7 text-neutral-200 mx-auto mb-2" />No hay mensajes aún.</div>
            )}
            <div ref={chatEndRef} />
          </div>
          {ticket.estado !== 'cerrado' ? (
            <form onSubmit={handleCommentSubmit} className="flex gap-3 pt-4 border-t border-neutral-100">
              <input type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
                placeholder="Escribe una respuesta..."
                className="flex-1 rounded-lg py-3 px-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none transition-all" />
              <button type="submit" disabled={sendingComment || !nuevoComentario.trim()}
                className="btn-primary w-11 h-11 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50">
                {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-sm text-neutral-500">
              <CheckCircle2 className="w-4 h-4 text-success" /> Ticket cerrado. No se pueden añadir comentarios.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5 sticky top-5">
          <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" /> Administrar Ticket
          </h4>
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-500 font-bold uppercase">Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none">
                <option value="abierto">Abierto</option>
                <option value="en proceso">En Proceso</option>
                <option value="resuelto por ia - pendiente">Solución IA (Pendiente)</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-500 font-bold uppercase">Prioridad</label>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none">
                <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-500 font-bold uppercase">Categoría</label>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none">
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-500 font-bold uppercase">Técnico</label>
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="w-full rounded-lg py-2.5 px-3 border border-neutral-200 focus:border-primary focus:outline-none">
                <option value="">Sin asignar</option>
                {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <button onClick={handleUpdateSettings} disabled={savingSettings}
              className={`w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                settingsSaved ? 'bg-success-light border border-success/20 text-success' : 'btn-primary'
              }`}>
              {savingSettings ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                : settingsSaved ? <><CheckCircle2 className="w-4 h-4" />¡Guardado!</>
                : <><Settings className="w-4 h-4" />Aplicar Cambios</>}
            </button>
          </div>
        </div>

        {ticket.equipos?.length > 0 && (
          <div className="card p-5">
            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Laptop className="w-4 h-4" /> Equipos Vinculados
            </h4>
            {ticket.equipos.map((eq) => (
              <div key={eq.id} className="p-3 rounded-lg bg-neutral-50 border border-neutral-100 space-y-0.5 mb-2">
                <p className="text-sm font-bold text-neutral-800">{eq.nombre_equipo}</p>
                <p className="text-xs text-neutral-500">{eq.tipo} · S/N: {eq.numero_serie}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
