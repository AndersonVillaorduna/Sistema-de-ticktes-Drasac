import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { StatusBadge } from '../../components/shared/Badge';
import {
  ArrowLeft, MessageSquare, Send, Calendar, Layers,
  Clock, Bot, Loader2, CheckCircle2, AlertCircle,
  User, Sparkles, BookOpen, Ticket,
} from 'lucide-react';

export default function PortalTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const chatEndRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
      setComentarios(res.data.comentarios || []);
    } catch {
      navigate('/portal/mis-tickets');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTicket().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comentarios]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/comentarios`, { mensaje: nuevoComentario });
      setComentarios((prev) => [...prev, res.data.comentario]);
      setNuevoComentario('');
    } catch { }
    setSending(false);
  };

  const handleIAConfirm = async (confirmado) => {
    setConfirming(true);
    try {
      await api.post(`/tickets/${id}/confirmar`, { confirmado });
      await fetchTicket();
    } catch { }
    setConfirming(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  if (!ticket) return null;

  // Línea de tiempo construida solo con datos reales: creación del ticket,
  // y clasificación por IA si realmente ocurrió (ticket.clasificado_por_ia).
  // Antes había 5 eventos con nombres y horas inventadas ("Carlos Ruiz...
  // hace 2 horas") que aparecían igual sin importar qué ticket se abriera.
  const timelineItems = [
    {
      icon: Ticket, color: '#2B5C8A', title: 'Ticket creado',
      text: 'Enviado a través del portal de soporte.',
      time: new Date(ticket.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    ...(ticket.clasificado_por_ia ? [{
      icon: Bot, color: '#6D5BD0', title: 'Clasificación IA',
      text: `Categorizado automáticamente como "${ticket.categoria_nombre || 'Sin categoría'}".`,
      time: '',
    }] : []),
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link to="/portal/mis-tickets"
          className="w-9 h-9 rounded-[10px] border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-all shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-neutral-900">{ticket.titulo}</h2>
            <StatusBadge estado={ticket.estado} size="lg" />
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">Ticket #{ticket.id} · {ticket.categoria_nombre || 'Sin categoría'}</p>
        </div>
      </div>

      {/* Main card */}
      <div className="portal-card bg-white border border-neutral-200 rounded-[14px] shadow-card p-6 md:p-7">
        <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Descripción del problema</h3>
        <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line p-4 rounded-[10px] bg-neutral-50 border border-neutral-100">{ticket.descripcion}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><Calendar className="w-4 h-4 text-neutral-500" /></div>
            <div><p className="text-[10px] text-neutral-500 font-bold uppercase">Creado</p><p className="text-xs font-semibold text-neutral-800">{new Date(ticket.created_at).toLocaleDateString('es-PE')}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><Layers className="w-4 h-4 text-neutral-500" /></div>
            <div><p className="text-[10px] text-neutral-500 font-bold uppercase">Categoría</p><p className="text-xs font-semibold text-neutral-800">{ticket.categoria_nombre || 'General'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><User className="w-4 h-4 text-neutral-500" /></div>
            <div><p className="text-[10px] text-neutral-500 font-bold uppercase">Técnico</p><p className="text-xs font-semibold text-neutral-800">{ticket.tecnico_nombre || 'Pendiente'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><Clock className="w-4 h-4 text-neutral-500" /></div>
            <div><p className="text-[10px] text-neutral-500 font-bold uppercase">Estado</p><StatusBadge estado={ticket.estado} /></div>
          </div>
        </div>
      </div>

      {/* AI Confirmation — solo confianza/artículo si el backend realmente los manda */}
      {ticket.estado === 'resuelto por ia - pendiente' && ticket.respuesta_ia && (
        <div className="ai-card rounded-[14px]">
          <div className="ai-head">
            <div className="w-10 h-10 rounded-lg bg-ai-light border border-ai/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-ai" />
            </div>
            <div>
              <p className="ai-eyebrow"><Sparkles className="w-3 h-3" /> Solución sugerida por IA</p>
              <p className="text-xs text-neutral-500">Ollama · LLaMA 3.1</p>
            </div>
          </div>
          <div className="ai-suggestion-line">"{ticket.respuesta_ia}"</div>

          {ticket.confianza_ia != null && (
            <>
              <div className="confidence-row">
                <span>Confianza de la solución</span>
                <span>{ticket.confianza_ia}%</span>
              </div>
              <div className="confidence-track">
                <div className="confidence-fill" style={{ width: `${ticket.confianza_ia}%` }} />
              </div>
            </>
          )}

          {ticket.articulos_relacionados != null && (
            <div className="ai-kb">
              <BookOpen className="w-4 h-4 text-ai shrink-0" />
              <span className="text-neutral-600">Basado en <strong className="text-ai font-semibold">{ticket.articulos_relacionados} artículo(s) similares</strong> de la base de conocimiento</span>
            </div>
          )}

          <div className="ai-actions mt-4">
            <button onClick={() => handleIAConfirm(true)} disabled={confirming}
              className="bg-success-light border border-success/20 text-success hover:bg-success/20 disabled:opacity-50 rounded-[10px]">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Sí, resolvió mi problema
            </button>
            <button onClick={() => handleIAConfirm(false)} disabled={confirming}
              className="bg-danger-light border border-danger/20 text-danger hover:bg-danger/20 disabled:opacity-50 rounded-[10px]">
              <AlertCircle className="w-4 h-4" /> No, necesito ayuda
            </button>
          </div>
        </div>
      )}

      {/* Timeline — ahora con eventos reales únicamente */}
      <div className="portal-card bg-white border border-neutral-200 rounded-[14px] shadow-card p-6 md:p-7">
        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-5">
          <MessageSquare className="w-4 h-4" /> Actividad del ticket
        </h4>
        <div className="space-y-0">
          {timelineItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="tl-item">
                <div className="tl-dot" style={{ background: item.color }}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="tl-content">
                  <div className="tl-header">
                    <strong>{item.title}</strong>
                    {item.time && <span>{item.time}</span>}
                  </div>
                  <p>{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comentarios */}
      <div className="portal-card bg-white border border-neutral-200 rounded-[14px] shadow-card p-6 md:p-7">
        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4" /> Comentarios ({comentarios.length})
        </h4>

        {comentarios.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
            {comentarios.map((com, idx) => {
              const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
              return (
                <div key={com.id || idx} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${isIA ? 'bg-ai' : 'bg-neutral-300'}`}>
                    {isIA ? <Bot className="w-4 h-4" /> : com.usuario_nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-[12px] px-4 py-3 text-sm bg-neutral-50 border border-neutral-100">
                    <div className="flex justify-between items-center gap-3 mb-1">
                      <span className="font-bold text-xs text-neutral-600">{com.usuario_nombre}</span>
                      <span className="text-[10px] text-neutral-400">{new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{com.mensaje}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-neutral-400">
            <MessageSquare className="w-7 h-7 text-neutral-200 mx-auto mb-2" />
            Aún no hay comentarios.
          </div>
        )}

        {ticket.estado !== 'cerrado' ? (
          <form onSubmit={handleComment} className="flex gap-3 pt-4 border-t border-neutral-100">
            <input type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Agregar comentario..."
              className="flex-1 rounded-[10px] py-3 px-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none transition-all" />
            <button type="submit" disabled={sending || !nuevoComentario.trim()}
              className="w-11 h-11 rounded-[10px] bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-primary-dark transition-all">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-sm text-neutral-500">
            <CheckCircle2 className="w-4 h-4 text-success" /> Ticket cerrado.
          </div>
        )}
      </div>
    </div>
  );
}