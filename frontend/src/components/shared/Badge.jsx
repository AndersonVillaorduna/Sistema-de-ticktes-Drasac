import { AlertCircle, Clock, Bot, CheckCircle2, XCircle } from 'lucide-react';

const estadoConfig = {
  'abierto':                      { cls: 'badge-abierto', label: 'Abierto', icon: AlertCircle },
  'en proceso':                   { cls: 'badge-en-proceso', label: 'En Proceso', icon: Clock },
  'resuelto por ia - pendiente':  { cls: 'badge-resuelto-ia', label: 'Solución IA', icon: Bot },
  'resuelto':                     { cls: 'badge-resuelto', label: 'Resuelto', icon: CheckCircle2 },
  'cerrado':                      { cls: 'badge-cerrado', label: 'Cerrado', icon: XCircle },
};

const prioridadConfig = {
  'baja':  { cls: 'badge-baja', label: 'Baja' },
  'media': { cls: 'badge-media', label: 'Media' },
  'alta':  { cls: 'badge-alta', label: 'Alta' },
};

export function StatusBadge({ estado, size = 'sm' }) {
  const cfg = estadoConfig[estado] || { cls: 'badge-baja', label: estado, icon: AlertCircle };
  const Icon = cfg.icon;
  const px = size === 'lg' ? 'px-3 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full uppercase tracking-wide ${px} ${cfg.cls}`}>
      <Icon className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />{cfg.label}
    </span>
  );
}

export function PriorityBadge({ prioridad }) {
  const cfg = prioridadConfig[prioridad] || { cls: 'badge-baja', label: prioridad };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${cfg.cls}`}>{cfg.label}</span>
  );
}
