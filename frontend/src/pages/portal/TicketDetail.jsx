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
    <div className="animate-fade-in w-full" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/portal/mis-tickets"
          className="border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-all shrink-0"
          style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center flex-wrap" style={{ gap: '16px' }}>
            <h2 className="font-bold text-neutral-900" style={{ fontSize: '24px' }}>{ticket.titulo}</h2>
            <StatusBadge estado={ticket.estado} size="lg" />
          </div>
          <p className="text-neutral-500 flex items-center" style={{ marginTop: '8px', fontSize: '14px', gap: '8px' }}>
            <Ticket className="w-4 h-4" /> Ticket #{ticket.id}
            <span className="text-neutral-300">·</span>
            <Layers className="w-4 h-4" /> {ticket.categoria_nombre || 'Sin categoría'}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
        
        {/* Left Column (takes more space) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', gridColumn: 'span 2 / span 2' }}>
          
          {/* Descripción Panel */}
          <div className="bg-white border border-neutral-200 shadow-sm flex flex-col" 
               style={{ borderRadius: '24px', padding: '32px', minHeight: '200px' }}>
            
            <h3 className="font-bold text-neutral-400 uppercase tracking-widest flex items-center" 
                style={{ fontSize: '13px', gap: '12px', marginBottom: '24px' }}>
              <BookOpen className="w-5 h-5" /> Descripción del problema
            </h3>
            
            <div className="bg-neutral-50 border border-neutral-100 flex-1 flex items-start" 
                 style={{ borderRadius: '16px', padding: '24px', marginTop: '12px' }}>
              <p className="text-neutral-800 leading-relaxed whitespace-pre-line w-full" 
                 style={{ fontSize: '16px' }}>
                {ticket.descripcion}
              </p>
            </div>
          </div>

          {/* IA Panel */}
          {ticket.estado === 'resuelto por ia - pendiente' && ticket.respuesta_ia && (
            <div className="border border-purple-200 shadow-sm" 
                 style={{ borderRadius: '24px', padding: '40px', background: 'linear-gradient(135deg, #F5F3FF 0%, #fff 100%)' }}>
              <div className="flex items-center" style={{ gap: '16px', marginBottom: '24px' }}>
                <div className="bg-purple-100 border border-purple-200 flex items-center justify-center"
                     style={{ width: '56px', height: '56px', borderRadius: '16px' }}>
                  <Bot className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-neutral-900 flex items-center" style={{ fontSize: '18px', gap: '8px' }}>
                    <Sparkles className="w-5 h-5 text-purple-500" /> Solución sugerida por IA
                  </p>
                  <p className="text-purple-500" style={{ fontSize: '14px', marginTop: '4px' }}>Ollama · LLaMA 3.1</p>
                </div>
              </div>
              <div className="border border-purple-100 text-neutral-800 leading-relaxed italic bg-white/80"
                   style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px', fontSize: '16px' }}>
                &ldquo;{ticket.respuesta_ia}&rdquo;
              </div>

              {ticket.confianza_ia != null && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="flex justify-between" style={{ fontSize: '13px', marginBottom: '8px' }}>
                    <span className="text-neutral-500 font-medium">Confianza de la solución</span>
                    <span className="font-bold text-purple-600">{ticket.confianza_ia}%</span>
                  </div>
                  <div className="w-full bg-purple-100 overflow-hidden" style={{ height: '12px', borderRadius: '99px' }}>
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${ticket.confianza_ia}%`, borderRadius: '99px' }} />
                  </div>
                </div>
              )}

              {ticket.articulos_relacionados != null && (
                <div className="flex items-center text-neutral-600 bg-purple-50 border border-purple-100"
                     style={{ gap: '12px', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px' }}>
                  <BookOpen className="w-5 h-5 text-purple-500 shrink-0" />
                  <span>Basado en <strong className="text-purple-600 font-bold">{ticket.articulos_relacionados} artículo(s) similares</strong> de la base de conocimiento</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
                <button onClick={() => handleIAConfirm(true)} disabled={confirming}
                  className="flex items-center justify-center bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 disabled:opacity-50 transition-all"
                  style={{ gap: '10px', padding: '16px 24px', borderRadius: '12px', fontSize: '15px' }}>
                  {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Sí, resolvió mi problema
                </button>
                <button onClick={() => handleIAConfirm(false)} disabled={confirming}
                  className="flex items-center justify-center bg-red-50 border border-red-200 text-red-600 font-bold hover:bg-red-100 disabled:opacity-50 transition-all"
                  style={{ gap: '10px', padding: '16px 24px', borderRadius: '12px', fontSize: '15px' }}>
                  <AlertCircle className="w-5 h-5" /> No, necesito ayuda
                </button>
              </div>
            </div>
          )}

          {/* Comentarios Panel */}
          <div className="bg-white border border-neutral-200 shadow-sm" 
               style={{ borderRadius: '24px', padding: '24px md:32px' }}>
            
            <h4 className="font-bold text-neutral-400 uppercase tracking-widest flex items-center"
                style={{ fontSize: '13px', gap: '12px', marginBottom: '32px' }}>
              <MessageSquare className="w-5 h-5" /> Comentarios
              <span className="ml-auto text-neutral-300 normal-case tracking-normal">({comentarios.length})</span>
            </h4>

            {comentarios.length > 0 ? (
              <div className="overflow-y-auto" style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingRight: '8px' }}>
                {comentarios.map((com, idx) => {
                  const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
                  return (
                    <div key={com.id || idx} className={`flex ${isIA ? 'flex-row-reverse' : ''}`} style={{ gap: '12px' }}>
                      <div className={`shrink-0 flex items-center justify-center text-white font-bold ${isIA ? 'bg-purple-500' : 'bg-[#1B3C5C]'}`}
                           style={{ width: '36px', height: '36px', borderRadius: '50%', fontSize: '13px' }}>
                        {isIA ? <Bot className="w-5 h-5" /> : com.usuario_nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className={`max-w-[85%] ${isIA ? 'bg-purple-50 border border-purple-100' : 'bg-neutral-50 border border-neutral-100'}`}
                           style={{ padding: '14px 18px', borderRadius: '16px', borderTopLeftRadius: isIA ? '16px' : '4px', borderTopRightRadius: isIA ? '4px' : '16px' }}>
                        <div className="flex justify-between items-center" style={{ gap: '12px', marginBottom: '6px' }}>
                          <span className="font-bold text-neutral-700" style={{ fontSize: '13px' }}>{com.usuario_nombre}</span>
                          <span className="text-neutral-400 whitespace-nowrap" style={{ fontSize: '11px' }}>
                            {new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '13px' }}>{com.mensaje}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <div className="text-center bg-neutral-50 border border-dashed border-neutral-200"
                   style={{ padding: '48px 0', borderRadius: '16px', marginBottom: '32px' }}>
                <MessageSquare className="text-neutral-300 mx-auto" style={{ width: '48px', height: '48px', marginBottom: '16px' }} />
                <p className="font-medium text-neutral-500" style={{ fontSize: '16px' }}>Aún no hay comentarios.</p>
                <p className="text-neutral-400" style={{ fontSize: '14px', marginTop: '8px' }}>Sé el primero en responder al caso.</p>
              </div>
            )}

            {ticket.estado !== 'cerrado' ? (
              <form onSubmit={handleComment} className="flex border-t border-neutral-100" style={{ gap: '12px', paddingTop: '24px' }}>
                <input type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  className="flex-1 border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all"
                  style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }} />
                <button type="submit" disabled={sending || !nuevoComentario.trim()}
                  className="bg-[#1B3C5C] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#142E47] transition-all shadow-sm"
                  style={{ width: '46px', height: '46px', borderRadius: '12px' }}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <div className="border-t border-neutral-100 flex items-center bg-neutral-50 text-neutral-500"
                   style={{ gap: '12px', paddingTop: '24px', padding: '24px', borderRadius: '16px', fontSize: '15px', marginTop: '24px' }}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> El ticket ha sido cerrado. No se pueden agregar más comentarios.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '24px', padding: '40px' }}>
            <h4 className="font-bold text-neutral-400 uppercase tracking-widest flex items-center"
                style={{ fontSize: '13px', gap: '12px', marginBottom: '32px' }}>
              <Layers className="w-5 h-5" /> Información del Ticket
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {[
                { icon: Calendar, label: 'Fecha de Creación', value: new Date(ticket.created_at).toLocaleDateString('es-PE') },
                { icon: Layers, label: 'Categoría Asignada', value: ticket.categoria_nombre || 'General' },
                { icon: User, label: 'Técnico a Cargo', value: ticket.tecnico_nombre || 'Pendiente de asignación' },
                { icon: Clock, label: 'Estado Actual', value: ticket.estado.charAt(0).toUpperCase() + ticket.estado.slice(1) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center" style={{ gap: '20px' }}>
                  <div className="bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0"
                       style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
                    <Icon className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-neutral-400 font-bold uppercase tracking-wider" style={{ fontSize: '11px' }}>{label}</p>
                    <p className="font-bold text-neutral-800" style={{ fontSize: '15px', marginTop: '4px' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '24px', padding: '40px' }}>
            <h4 className="font-bold text-neutral-400 uppercase tracking-widest flex items-center"
                style={{ fontSize: '13px', gap: '12px', marginBottom: '32px' }}>
              <Clock className="w-5 h-5" /> Actividad del ticket
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {timelineItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex" style={{ gap: '24px', paddingBottom: idx === timelineItems.length - 1 ? '0' : '40px' }}>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center text-white shrink-0 shadow-sm" 
                           style={{ background: item.color, width: '44px', height: '44px', borderRadius: '50%' }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {idx < timelineItems.length - 1 && <div className="bg-neutral-200" style={{ width: '2px', flex: '1', marginTop: '12px' }} />}
                    </div>
                    <div style={{ paddingTop: '8px' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center" style={{ gap: '4px', sm: { gap: '12px' } }}>
                        <strong className="text-neutral-800" style={{ fontSize: '16px' }}>{item.title}</strong>
                        {item.time && <span className="text-neutral-400 font-medium" style={{ fontSize: '13px' }}>{item.time}</span>}
                      </div>
                      <p className="text-neutral-500 leading-relaxed" style={{ fontSize: '14px', marginTop: '8px' }}>{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
