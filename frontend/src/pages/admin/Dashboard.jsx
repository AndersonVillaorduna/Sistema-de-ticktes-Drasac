import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/shared/StatCard';
import { StatusBadge } from '../../components/shared/Badge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  Ticket, AlertCircle, Bot, CheckCircle2,
  Activity, Cpu, Sparkles, BookOpen,
  ArrowUpRight, MessageSquare, Send, X, Inbox,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [comentario, setComentario] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Cargando dashboard..." />;

  // Sin "|| 47" / "|| 219" de relleno: si el valor real es 0, se muestra 0.
  const kpis = [
    { label: 'Total Tickets', value: stats?.totales?.tickets || 0, icon: Ticket, color: 'primary' },
    { label: 'Abiertos / En Proceso', value: (stats?.totales?.abiertos || 0) + (stats?.totales?.en_proceso || 0), icon: AlertCircle, color: 'warning' },
    { label: 'Resueltos por IA', value: stats?.totales?.pendientes_ia || 0, icon: Bot, color: 'violet' },
    { label: 'Cerrados', value: stats?.totales?.cerrados || 0, icon: CheckCircle2, color: 'success' },
  ];

  const ticketsRecientes = stats?.tickets_recientes || [];

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
    setTicketDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      setTicketDetail(res.data);
    } catch {
      setTicketDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comentario.trim() || !selectedTicket) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/comentarios`, { mensaje: comentario });
      setTicketDetail((prev) => prev ? { ...prev, comentarios: [...(prev.comentarios || []), res.data.comentario] } : prev);
      setComentario('');
    } catch { }
    setSendingComment(false);
  };

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <p className="capitalize text-neutral-600 font-medium" style={{ fontSize: '18px' }}>{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {kpis.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8" style={{ marginTop: '32px' }}>
        {/* Ticket List */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-neutral-100">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Tickets Recientes
            </h3>
            <a href="/admin/tickets" className="text-xs text-primary font-semibold hover:text-primary-dark flex items-center gap-1">
              Ver Todos <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {ticketsRecientes.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <Inbox className="w-9 h-9 mx-auto mb-2 text-neutral-200" />
              <p className="text-sm">No hay tickets recientes.</p>
            </div>
          ) : (
            <div>
              {ticketsRecientes.map((ticket) => (
                <div key={ticket.id}
                  className={`ticket-row ${selectedTicket?.id === ticket.id && detailOpen ? 'selected' : ''}`}
                  onClick={() => handleSelectTicket(ticket)}>
                  <span className="t-id hidden sm:inline">#{ticket.id}</span>
                  <div className="t-avatar" style={{ background: ticket.estado === 'abierto' ? '#C9483D' : ticket.estado === 'en proceso' ? '#C97A1F' : '#667085' }}>
                    {ticket.usuario_nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="t-main">
                    <p className="t-title">{ticket.titulo}</p>
                    <div className="t-meta">
                      <span className="hidden xs:inline">{ticket.usuario_nombre}</span>
                      <span className="hidden xs:inline">·</span>
                      <span className="hidden sm:inline">{ticket.categoria_nombre || 'Sin categoría'}</span>
                      <span className="hidden sm:inline">·</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString('es-PE')}</span>
                    </div>
                  </div>
                  <div className="t-tags">
                    <StatusBadge estado={ticket.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel — desktop: siempre visible, mobile: overlay */}
        <div className={`${detailOpen ? 'fixed inset-0 z-50 bg-black/40 lg:static lg:bg-transparent lg:z-auto' : 'hidden lg:block'} lg:block`}>
          <div className={`${detailOpen ? 'absolute right-0 top-0 h-full w-full max-w-md bg-neutral-50 shadow-elevated lg:shadow-none lg:static lg:h-auto' : ''} overflow-y-auto`}>
            <div className={`${detailOpen ? 'p-4' : ''} space-y-4`}>
              {detailOpen && (
                <div className="flex items-center justify-between lg:hidden mb-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Detalle del ticket</span>
                  <button onClick={() => setDetailOpen(false)} className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!selectedTicket ? (
                <div className="card p-8 text-center text-neutral-400">
                  <Ticket className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm">Selecciona un ticket para ver el detalle.</p>
                </div>
              ) : detailLoading ? (
                <LoadingSpinner text="Cargando ticket..." />
              ) : !ticketDetail ? (
                <div className="card p-8 text-center text-neutral-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-neutral-200" />
                  <p className="text-sm">No se pudo cargar el detalle.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '24px' }}>
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-100">
                      <div className="w-11 h-11 rounded-xl bg-[#1B3C5C]/10 flex items-center justify-center shrink-0">
                        <Ticket className="w-5 h-5 text-[#1B3C5C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">{ticketDetail.titulo}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">#{ticketDetail.id} · {ticketDetail.categoria_nombre || 'Sin categoría'}</p>
                      </div>
                      <StatusBadge estado={ticketDetail.estado} />
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 border border-neutral-100" style={{ borderRadius: '12px', padding: '16px' }}>
                      {ticketDetail.descripcion}
                    </p>
                    <a href={`/admin/tickets/${ticketDetail.id}`}
                      className="mt-5 block text-center w-full py-3 bg-[#1B3C5C] text-white text-[13px] font-bold hover:bg-[#142E47] transition-all shadow-md hover:shadow-lg"
                      style={{ borderRadius: '12px' }}>
                      Ver detalle completo →
                    </a>
                  </div>

                  {ticketDetail.respuesta_ia && (
                    <div className="border border-purple-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #fff 100%)', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                          <Cpu className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Asistente IA
                          </p>
                          <p className="text-[11px] text-purple-400 mt-0.5">Sugerencia automática</p>
                        </div>
                      </div>
                      <div className="border border-purple-100 text-sm text-neutral-700 leading-relaxed italic bg-white/80" style={{ borderRadius: '12px', padding: '16px' }}>
                        &ldquo;{ticketDetail.respuesta_ia}&rdquo;
                      </div>
                      {ticketDetail.confianza_ia != null && (
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] mb-1.5">
                            <span className="text-neutral-500 font-medium">Confianza</span>
                            <span className="font-bold text-purple-600">{ticketDetail.confianza_ia}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-purple-100 overflow-hidden">
                            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${ticketDetail.confianza_ia}%` }} />
                          </div>
                        </div>
                      )}
                      {ticketDetail.articulo_kb && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-600 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                          <BookOpen className="w-4 h-4 text-purple-500 shrink-0" />
                          <span>Artículo: <strong className="text-purple-600 font-semibold">{ticketDetail.articulo_kb}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-5">
                      <MessageSquare className="w-4 h-4" /> Comentarios
                      <span className="ml-auto text-neutral-300 normal-case tracking-normal">({(ticketDetail.comentarios || []).length})</span>
                    </h4>
                    {(ticketDetail.comentarios || []).length === 0 ? (
                      <div className="py-8 text-center text-neutral-400">
                        <MessageSquare className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                        <p className="text-xs">Sin comentarios todavía.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                        {ticketDetail.comentarios.map((com, idx) => {
                          const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
                          const isMe = com.usuario_nombre === user?.nombre;
                          
                          return (
                            <div key={com.id || idx} className={`flex gap-2.5 ${isIA || isMe ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${isIA ? 'bg-purple-500' : isMe ? 'bg-primary' : 'bg-[#1B3C5C]'}`}>
                                {isIA ? <Bot className="w-3.5 h-3.5" /> : (isMe ? 'Tú' : com.usuario_nombre?.charAt(0)?.toUpperCase())}
                              </div>
                              <div className={`max-w-[80%] border ${isIA ? 'bg-purple-50 border-purple-100' : isMe ? 'bg-primary/5 border-primary/20' : 'bg-neutral-50 border-neutral-100'}`} style={{ borderRadius: (isIA || isMe) ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding: '12px 16px' }}>
                                <div className="flex justify-between items-center gap-2 mb-1">
                                  <strong className={`text-[11px] ${isMe ? 'text-primary' : 'text-neutral-700'}`}>{isMe ? 'Tú' : com.usuario_nombre}</strong>
                                  <span className="text-[10px] text-neutral-400 whitespace-nowrap">{new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-neutral-700 leading-relaxed text-[13px]">{com.mensaje}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {ticketDetail.estado !== 'cerrado' && (
                    <form onSubmit={handleComment} className="bg-white border border-neutral-200 shadow-sm" style={{ borderRadius: '16px', padding: '16px', marginTop: '24px' }}>
                      <div className="flex gap-3">
                        <input type="text" value={comentario} onChange={(e) => setComentario(e.target.value)}
                          placeholder="Escribe una respuesta..."
                          className="flex-1 py-3 px-4 text-sm border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all" style={{ borderRadius: '12px' }} />
                        <button type="submit" className="send-btn w-11 h-11 bg-[#1B3C5C] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#142E47] transition-all" style={{ borderRadius: '12px' }} disabled={sendingComment || !comentario.trim()}>
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}