import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { StatusBadge } from '../../components/shared/Badge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  Search, RefreshCw, Ticket, Bot,
  AlertCircle, MessageSquare, Send, Cpu, Sparkles, BookOpen, X, Inbox,
} from 'lucide-react';

const filterTabs = [
  { key: 'todos', label: 'Todos' },
  { key: 'abierto', label: 'Abiertos' },
  { key: 'en proceso', label: 'En Proceso' },
  { key: 'resuelto por ia - pendiente', label: 'Solución IA' },
  { key: 'cerrado', label: 'Cerrados' },
];

export default function AdminTickets() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [comentario, setComentario] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'todos') params.estado = filter;
      const res = await api.get('/tickets', { params });
      let data = res.data;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        data = data.filter((t) =>
          t.titulo.toLowerCase().includes(q) ||
          t.usuario_nombre?.toLowerCase().includes(q) ||
          t.categoria_nombre?.toLowerCase().includes(q)
        );
      }
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchTickets(); };

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
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Gestión de Tickets</h2>
          <p className="text-sm text-neutral-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} en el sistema</p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="rounded-lg py-2 pl-9 pr-3 text-sm border border-neutral-200 focus:border-primary focus:outline-none w-44" />
          </div>
          <button type="submit" className="p-2.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-all sm:hidden">
            <Search className="w-4 h-4" />
          </button>
          <button type="button" onClick={fetchTickets} className="p-2.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      <div className="filters overflow-x-auto">
        {filterTabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`tab ${filter === tab.key ? 'active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
        {/* Ticket List */}
        <div className="card overflow-hidden">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 border-b border-neutral-100 text-[10px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50">
            <div className="col-span-1">ID</div>
            <div className="col-span-6">Título</div>
            <div className="col-span-2">Categoría</div>
            <div className="col-span-3 text-right">Estado</div>
          </div>
          {loading ? <LoadingSpinner />
            : tickets.length > 0 ? tickets.map((ticket) => (
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
                    <span>#{ticket.id}</span>
                    <span>·</span>
                    <span className="hidden xs:inline">{ticket.usuario_nombre}</span>
                    <span>·</span>
                    <span className="hidden sm:inline">{ticket.categoria_nombre || 'Sin categoría'}</span>
                    <span>·</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
                <div className="t-tags">
                  <StatusBadge estado={ticket.estado} />
                </div>
              </div>
            ))
              : (
                <div className="py-12 text-center text-neutral-400">
                  <Inbox className="w-9 h-9 mx-auto mb-2 text-neutral-200" />
                  <p className="text-sm">No se encontraron tickets.</p>
                </div>
              )
          }
        </div>

        {/* Detail Panel */}
        <div className={`${detailOpen ? 'fixed inset-0 z-50 bg-black/40 lg:static lg:bg-transparent lg:z-auto' : 'hidden lg:block'} lg:block`}>
          <div className={`${detailOpen ? 'absolute right-0 top-0 h-full w-full max-w-md bg-neutral-50 shadow-elevated lg:shadow-none lg:static lg:h-auto' : ''} overflow-y-auto`}>
            <div className={`${detailOpen ? 'p-4' : ''} space-y-4`}>
              {detailOpen && (
                <div className="flex items-center justify-between lg:hidden mb-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Detalle</span>
                  <button onClick={() => setDetailOpen(false)} className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!selectedTicket ? (
                <div className="card p-8 text-center text-neutral-400">
                  <Ticket className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm">Selecciona un ticket</p>
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
                  <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
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
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Prioridad</span>
                        <span className="font-bold capitalize text-neutral-800">{ticketDetail.prioridad}</span>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Usuario</span>
                        <span className="font-bold text-neutral-800">{ticketDetail.usuario_nombre}</span>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Creado</span>
                        <span className="font-bold text-neutral-800">{new Date(ticketDetail.created_at).toLocaleDateString('es-PE')}</span>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Técnico</span>
                        <span className="font-bold text-neutral-800">{ticketDetail.tecnico_nombre || 'Sin asignar'}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/admin/tickets/${ticketDetail.id}`)}
                      className="mt-5 w-full py-3 rounded-xl bg-[#1B3C5C]/5 border border-[#1B3C5C]/15 text-[#1B3C5C] text-xs font-bold hover:bg-[#1B3C5C]/10 transition-all">
                      Ver detalle completo →
                    </button>
                  </div>

                  {ticketDetail.respuesta_ia && (
                    <div className="rounded-2xl border border-purple-200 p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #fff 100%)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                          <Cpu className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Clasificación IA
                          </p>
                          <p className="text-[11px] text-purple-400 mt-0.5">Sugerencia automática</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-purple-100 text-sm text-neutral-700 leading-relaxed italic bg-white/80">
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
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
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
                          return (
                            <div key={com.id || idx} className={`flex gap-2.5 ${isIA ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${isIA ? 'bg-purple-500' : 'bg-[#1B3C5C]'}`}>
                                {isIA ? <Bot className="w-3.5 h-3.5" /> : com.usuario_nombre?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isIA ? 'bg-purple-50 border border-purple-100 rounded-tr-sm' : 'bg-neutral-50 border border-neutral-100 rounded-tl-sm'}`}>
                                <div className="flex justify-between items-center gap-2 mb-1">
                                  <strong className="text-[11px] text-neutral-700">{com.usuario_nombre}</strong>
                                  <span className="text-[10px] text-neutral-400 whitespace-nowrap">{new Date(com.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-neutral-700 leading-relaxed text-xs">{com.mensaje}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {ticketDetail.estado !== 'cerrado' && (
                    <form onSubmit={handleComment} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
                      <div className="flex gap-3">
                        <input type="text" value={comentario} onChange={(e) => setComentario(e.target.value)}
                          placeholder="Escribe una respuesta..."
                          className="flex-1 rounded-xl py-3 px-4 text-sm border border-neutral-200 focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/5 outline-none transition-all" />
                        <button type="submit" className="send-btn w-11 h-11 rounded-xl bg-[#1B3C5C] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#142E47] transition-all" disabled={sendingComment || !comentario.trim()}>
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