import { useState, useEffect } from 'react';
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
          <h2 className="text-lg font-bold text-neutral-900">Dashboard</h2>
          <p className="text-sm text-neutral-500">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {kpis.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
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
                  <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">{ticketDetail.titulo}</p>
                        <p className="text-xs text-neutral-500">#{ticketDetail.id} · {ticketDetail.categoria_nombre || 'Sin categoría'}</p>
                      </div>
                      <StatusBadge estado={ticketDetail.estado} />
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                      {ticketDetail.descripcion}
                    </p>
                    <a href={`/admin/tickets/${ticketDetail.id}`} className="mt-4 block text-center w-full py-2.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                      Ver detalle completo →
                    </a>
                  </div>

                  {/* Tarjeta de IA: solo si hay una sugerencia real */}
                  {ticketDetail.respuesta_ia && (
                    <div className="ai-card">
                      <div className="ai-head">
                        <div className="w-10 h-10 rounded-lg bg-ai-light border border-ai/20 flex items-center justify-center">
                          <Cpu className="w-5 h-5 text-ai" />
                        </div>
                        <div>
                          <p className="ai-eyebrow"><Sparkles className="w-3 h-3" /> Asistente IA</p>
                          <p className="text-xs text-neutral-500">Sugerencia automática</p>
                        </div>
                      </div>
                      <div className="ai-suggestion-line">"{ticketDetail.respuesta_ia}"</div>
                      {ticketDetail.confianza_ia != null && (
                        <>
                          <div className="confidence-row">
                            <span>Confianza</span>
                            <span>{ticketDetail.confianza_ia}%</span>
                          </div>
                          <div className="confidence-track">
                            <div className="confidence-fill" style={{ width: `${ticketDetail.confianza_ia}%` }} />
                          </div>
                        </>
                      )}
                      {ticketDetail.articulo_kb && (
                        <div className="ai-kb">
                          <BookOpen className="w-4 h-4 text-ai shrink-0" />
                          <span className="text-neutral-600">Artículo: <strong className="text-ai font-semibold">{ticketDetail.articulo_kb}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card p-5">
                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <MessageSquare className="w-4 h-4" /> Comentarios ({(ticketDetail.comentarios || []).length})
                    </h4>
                    {(ticketDetail.comentarios || []).length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-4">Sin comentarios todavía.</p>
                    ) : (
                      <div className="space-y-0 max-h-64 overflow-y-auto">
                        {ticketDetail.comentarios.map((com, idx) => {
                          const isIA = com.usuario_nombre?.includes('Inteligencia Artificial');
                          return (
                            <div key={com.id || idx} className="tl-item">
                              <div className="tl-dot" style={{ background: isIA ? '#6D5BD0' : '#2B5C8A' }}>
                                {isIA ? <Bot className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                              </div>
                              <div className="tl-content">
                                <div className="tl-header">
                                  <strong>{com.usuario_nombre}</strong>
                                  <span>{new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p>{com.mensaje}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {ticketDetail.estado !== 'cerrado' && (
                    <form onSubmit={handleComment} className="reply-box">
                      <input type="text" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Escribe una respuesta..." />
                      <button type="submit" className="send-btn" disabled={sendingComment || !comentario.trim()}>
                        <Send className="w-4 h-4" />
                      </button>
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