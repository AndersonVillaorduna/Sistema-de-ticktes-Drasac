import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { StatusBadge } from '../../components/shared/Badge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Ticket, PlusCircle, AlertCircle, Clock, CheckCircle2, ChevronRight, HelpCircle, Monitor, Wifi, Printer, Mail, CreditCard, Laptop, Inbox } from 'lucide-react';

const catIcons = {
  'Hardware': Monitor, 'Software': Laptop, 'Redes': Wifi,
  'Correo / Cuenta': Mail, 'Impresoras': Printer, 'POS / Caja': CreditCard,
};

const statusIcons = {
  'abierto': AlertCircle,
  'en proceso': Clock,
  'resuelto por ia - pendiente': CheckCircle2,
  'resuelto': CheckCircle2,
  'cerrado': AlertCircle,
};

const statusColors = {
  'abierto': 'bg-danger-light text-danger border-danger/20',
  'en proceso': 'bg-warning-light text-warning border-warning/20',
  'resuelto por ia - pendiente': 'bg-ai-light text-ai border-ai/20',
  'resuelto': 'bg-success-light text-success border-success/20',
  'cerrado': 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

const filterTabs = [
  { key: 'todos', label: 'Todos' },
  { key: 'abierto', label: 'Abiertos' },
  { key: 'en proceso', label: 'En Proceso' },
  { key: 'resuelto', label: 'Resueltos' },
  { key: 'cerrado', label: 'Cerrados' },
];

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');

  // El backend ya debe filtrar por el usuario autenticado (solo sus propios
  // tickets) según el rol que venga en el JWT — este componente no filtra
  // por usuario en el cliente, confía en que /tickets ya viene acotado.
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'todos') params.estado = filter;
      const res = await api.get('/tickets', { params });
      setTickets(res.data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const abiertos = tickets.filter((t) => t.estado === 'abierto').length;
  const enProgreso = tickets.filter((t) => t.estado === 'en proceso' || t.estado === 'resuelto por ia - pendiente').length;
  const resueltos = tickets.filter((t) => t.estado === 'resuelto' || t.estado === 'cerrado').length;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Mis tickets</h2>
          <p className="text-sm text-neutral-500 mt-1">Gestiona y haz seguimiento a tus solicitudes de soporte</p>
        </div>
        <Link to="/portal/nuevo-ticket"
          className="flex items-center justify-center gap-2 bg-[#1B3C5C] hover:bg-[#142E47] text-white py-3 px-6 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all"
          style={{ whiteSpace: 'nowrap' }}>
          <PlusCircle className="w-5 h-5" /> <span>Nuevo ticket</span>
        </Link>
      </div>

      {/* Chip Row — fila única con scroll horizontal en mobile, sin envolver línea */}
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ flexWrap: 'nowrap' }}>
        <div className="chip primary shrink-0">
          <AlertCircle className="w-4 h-4" />
          <span>{abiertos} Abiertos</span>
        </div>
        <div className="chip warning shrink-0">
          <Clock className="w-4 h-4" />
          <span>{enProgreso} En Progreso</span>
        </div>
        <div className="chip success shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resueltos} Resueltos</span>
        </div>
      </div>

      {/* Filter Tabs — scrollable en mobile */}
      <div className="filters overflow-x-auto">
        {filterTabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`tab shrink-0 ${filter === tab.key ? 'active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ticket Cards */}
      <div className="space-y-3">
        {loading ? <LoadingSpinner />
          : tickets.length > 0 ? tickets.map((ticket) => {
            const Icon = catIcons[ticket.categoria_nombre] || HelpCircle;
            const StatusIcon = statusIcons[ticket.estado] || AlertCircle;
            const sc = statusColors[ticket.estado] || 'bg-neutral-100 text-neutral-500';
            return (
              <Link key={ticket.id} to={`/portal/mis-tickets/${ticket.id}`}
                className="ticket-card group">
                <div className="tc-icon bg-primary-light text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="tc-body">
                  <p className="tc-title group-hover:text-primary transition-colors">{ticket.titulo}</p>
                  <div className="tc-meta flex-wrap">
                    <span>#{ticket.id}</span>
                    <span>·</span>
                    <span>{ticket.categoria_nombre || 'Sin categoría'}</span>
                    <span>·</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${sc} hidden sm:flex`}>
                    <StatusIcon className="w-3 h-3" />
                    {ticket.estado === 'resuelto por ia - pendiente' ? 'Solución IA' : ticket.estado.charAt(0).toUpperCase() + ticket.estado.slice(1)}
                  </span>
                  <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            );
          })
            : (
              <div className="portal-card bg-white border border-neutral-100 rounded-3xl shadow-sm p-10 md:p-16 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center mb-6">
                  <Inbox className="w-10 h-10 text-neutral-300" />
                </div>
                <h3 className="text-xl font-bold text-neutral-800 mb-2">No hay tickets activos</h3>
                <p className="text-sm text-neutral-500 mb-8 max-w-md mx-auto">No se encontraron solicitudes de soporte bajo este filtro. Si necesitas ayuda, no dudes en crear uno nuevo.</p>
                <Link to="/portal/nuevo-ticket" 
                  className="flex items-center justify-center gap-2 bg-[#1B3C5C] hover:bg-[#142E47] text-white py-3.5 px-8 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all">
                  <PlusCircle className="w-5 h-5" /> Crear nuevo ticket
                </Link>
              </div>
            )
        }
      </div>
    </div>
  );
}