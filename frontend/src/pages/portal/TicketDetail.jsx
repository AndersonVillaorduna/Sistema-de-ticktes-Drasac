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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
  if (!ticket) return null;

  const timelineItems = [
    {
      icon: Ticket, color: '#2B5C8A', title: 'Ticket creado',
      text: 'Enviado a través del portal de soporte.',
      time: new Date(ticket.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    ...(ticket.clasificado_por_ia ? [{
      icon: Bot, color: '#8B5CF6', title: 'Clasificación IA',
      text: `Categorizado automáticamente como "${ticket.categoria_nombre || 'Sin categoría'}".`,
      time: '',
    }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/portal/mis-tickets"
          className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 transition-all shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-neutral-900">{ticket.titulo}</h2>
            <StatusBadge estado={ticket.estado} size="lg" />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Ticket #{ticket.id} · {ticket.categoria_nombre || 'Sin categoría'}</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] mb-4">Descripción del problema</h3>
        <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50 rounded-xl p-5 border border-neutral-100">
          {ticket.descripcion}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6 pt-5 border-t border-neutral-100">
          {[
            { icon: Calendar, label: 'Creado', value: new Date(ticket.created_at).toLocaleDateString('es-PE') },
            { icon: Layers, label: 'Categoría', value: ticket.categoria_nombre || 'General' },
            { icon: User, label: 'Técnico', value: ticket.tecnico_nombre || 'Pendiente' },
            { icon: Clock, label: 'Estado', value: ticket.estado.charAt(0).toUpperCase() + ticket.estado.slice(1) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-neutral-500" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-xs font-semibold text-neutral-800 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {ticket.estado === 'resuelto por ia - pendiente' && ticket.respuesta_ia && (
        <div className="rounded-2xl border border-purple-200 p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #fff 100%)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> Solución sugerida por IA
              </p>
              <p className="text-xs text-purple-500 mt-0.5">Ollama · LLaMA 3.1</p>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-purple-100 mb-5 text-sm text-neutral-700 leading-relaxed italic bg-white/80">
            &ldquo;{ticket.respuesta_ia}&rdquo;
          </div>

          {ticket.confianza_ia != null && (
            <div className="mb-5">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-neutral-500 font-medium">Confianza de la solución</span>
                <span className="font-bold text-purple-600">{ticket.confianza_ia}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-purple-100 overflow-hidden">
                <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${ticket.confianza_ia}%` }} />
              </div>
            </div>
          )}

          {ticket.articulos_relacionados != null && (
            <div className="mb-5 flex items-center gap-2 text-xs text-neutral-600 bg-purple-50 rounded-xl px-4 py-3 border border-purple-100">
              <BookOpen className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Basado en <strong className="text-purple-600 font-semibold">{ticket.articulos_relacionados} artículo(s) similares</strong> de la base de conocimiento</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => handleIAConfirm(true)} disabled={confirming}
              className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 disabled:opacity-50 transition-all">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Sí, resolvió mi problema
            </button>
            <button onClick={() => handleIAConfirm(false)} disabled={confirming}
              className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 disabled:opacity-50 transition-all">
              <AlertCircle className="w-4 h-4" /> No, necesito ayuda
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-5">
          <MessageSquare className="w-4 h-4" /> Actividad del ticket
        </h4>
        <div className="space-y-0">
          {timelineItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: item.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {idx < timelineItems.length - 1 && <div className="w-px flex-1 bg-neutral-200 mt-2" />}
                </div>
                <div className="pt-1.5">
                  <div className="flex items-center gap-3">
                    <strong className="text-sm text-neutral-800">{item.title}</strong>
                    {item.time && <span className="text-[10px] text-neutral-400">{item.time}</span>}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-5">
          <MessageSquare className="w-4 h-4" /> Comentarios
          <span className="ml-auto text-neutral-300 normal-case tracking-normal">({comentarios.length})</span>
        </h4>

        {comentarios.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1 mb-5">
            {comentarios.map((com, idx) => {
              const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
              return (
                <div key={com.id || idx} className={`flex gap-3 ${isIA ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${isIA ? 'bg-purple-500' : 'bg-[#1B3C5C]'}`}>
                    {isIA ? <Bot className="w-4 h-4" /> : com.usuario_nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 text-sm ${isIA ? 'bg-purple-50 border border-purple-100 rounded-tr-sm' : 'bg-neutral-50 border border-neutral-100 rounded-tl-sm'}`}>
                    <div className="flex justify-between items-center gap-3 mb-1.5">
                      <span className="font-bold text-xs text-neutral-700">{com.usuario_nombre}</span>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{com.mensaje}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-neutral-400">
            <MessageSquare className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
            <p>Aún no hay comentarios.</p>
            <p className="text-xs text-neutral-300 mt-1">Sé el primero en responder.</p>
          </div>
        )}

        {ticket.estado !== 'cerrado' ? (
          <form onSubmit={handleComment} className="flex gap-3 pt-5 border-t border-neutral-100">
            <input type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Agregar comentario..."
              className="flex-1 rounded-xl py-3.5 px-5 text-sm border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all" />
            <button type="submit" disabled={sending || !nuevoComentario.trim()}
              className="w-12 h-12 rounded-xl bg-[#1B3C5C] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#142E47] transition-all shadow-sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <div className="pt-5 border-t border-neutral-100 flex items-center gap-2 text-sm text-neutral-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ticket cerrado.
          </div>
        )}
      </div>
    </div>
  );
}
