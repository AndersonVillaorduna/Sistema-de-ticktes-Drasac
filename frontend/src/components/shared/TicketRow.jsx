import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from './Badge';
import { ChevronRight, Laptop, Monitor, Printer, Mail, CreditCard, HelpCircle, Wifi } from 'lucide-react';

const catIconMap = {
  'Hardware': Monitor, 'Software': Laptop, 'Redes': Wifi,
  'Correo / Cuenta': Mail, 'Impresoras': Printer, 'POS / Caja': CreditCard,
};

export default function TicketRow({ ticket, basePath = '/admin/tickets', showUser = true }) {
  const CatIcon = catIconMap[ticket.categoria_nombre] || HelpCircle;
  return (
    <Link to={`${basePath}/${ticket.id}`}
      className="group flex items-center gap-4 p-4 border-b border-neutral-100 hover:bg-primary-light/30 transition-all last:border-b-0">
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        <CatIcon className="w-4 h-4 text-neutral-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 group-hover:text-primary transition-colors truncate">{ticket.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-neutral-500">#{ticket.id}</span>
          {showUser && ticket.usuario_nombre && (
            <><span className="text-neutral-300">·</span><span className="text-[11px] text-neutral-500">{ticket.usuario_nombre}</span></>
          )}
          <span className="text-neutral-300">·</span>
          <span className="text-[11px] text-neutral-500">{new Date(ticket.created_at).toLocaleDateString('es-PE')}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <PriorityBadge prioridad={ticket.prioridad} />
        <StatusBadge estado={ticket.estado} />
      </div>
      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}
