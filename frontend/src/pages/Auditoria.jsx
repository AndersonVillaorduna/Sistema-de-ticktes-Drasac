import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ScrollText, Loader2, AlertCircle, Trash2, Wrench, Lock, Unlock,
  UserPlus, FolderMinus, FolderPlus, BookX, ListChecks, Clock,
} from 'lucide-react';

const ACCIONES = {
  ticket_resuelto:          { label: 'Resolvió y cerró ticket',  cls: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', Icon: CheckCircleSafe },
  ticket_resuelto_ia:       { label: 'Confirmó solución de IA',  cls: 'bg-indigo-500/12 text-indigo-400 border-indigo-500/25',   Icon: CheckCircleSafe },
  ticket_cerrado:           { label: 'Cerró sin resolver',        cls: 'bg-amber-500/12 text-amber-400 border-amber-500/25',      Icon: Lock },
  ticket_reabierto:         { label: 'Reabrió ticket',            cls: 'bg-blue-500/12 text-blue-400 border-blue-500/25',         Icon: Unlock },
  ticket_reasignado:        { label: 'Reasignó técnico',          cls: 'bg-cyan-500/12 text-cyan-400 border-cyan-500/25',         Icon: Wrench },
  ticket_eliminado:         { label: 'Eliminó ticket',            cls: 'bg-red-500/12 text-red-400 border-red-500/25',            Icon: Trash2 },
  asignaciones_actualizadas:{ label: 'Cambió asignaciones',       cls: 'bg-cyan-500/12 text-cyan-400 border-cyan-500/25',         Icon: ListChecks },
  categoria_creada:         { label: 'Creó categoría',            cls: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', Icon: FolderPlus },
  categoria_renombrada:     { label: 'Renombró categoría',        cls: 'bg-amber-500/12 text-amber-400 border-amber-500/25',      Icon: FolderPlus },
  categoria_eliminada:      { label: 'Eliminó categoría',         cls: 'bg-red-500/12 text-red-400 border-red-500/25',            Icon: FolderMinus },
  equipo_eliminado:         { label: 'Eliminó equipo',            cls: 'bg-red-500/12 text-red-400 border-red-500/25',            Icon: Trash2 },
  articulo_eliminado:       { label: 'Eliminó artículo',          cls: 'bg-red-500/12 text-red-400 border-red-500/25',            Icon: BookX },
  usuario_creado:           { label: 'Creó usuario',              cls: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', Icon: UserPlus },
};

// Fallback visual para acciones no mapeadas (evita crash del render)
function CheckCircleSafe(props) {
  return <span className="inline-block w-3.5 h-3.5 rounded-full border border-current" />;
}

const fechaFmt = (iso) => new Date(iso).toLocaleString('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const Auditoria = () => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auditoria')
      .then((r) => setRegistros(r.data))
      .catch(() => setError('No se pudo cargar el registro de auditoría.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Auditoría de Acciones</h3>
            <p className="text-xs text-slate-500">
              Registro inmutable de quién realizó cada acción administrativa (últimos 200 eventos).
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Lista de eventos */}
      <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        {registros.length === 0 ? (
          <p className="p-10 text-center text-xs text-slate-500">
            Aún no hay acciones registradas. Cada acción administrativa (cierre de tickets,
            eliminaciones, cambios de asignación, etc.) aparecerá aquí automáticamente.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {registros.map((r) => {
              const info = ACCIONES[r.accion] || { label: r.accion, cls: 'bg-white/5 text-slate-400 border-white/10', Icon: ScrollText };
              const Icon = info.Icon;
              return (
                <div key={r.id} className="p-4 flex items-start gap-3 hover:bg-white/2 transition-colors">
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${info.cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200">
                      {info.label}
                      {r.ticket_id && (
                        <button
                          onClick={() => window.location.assign(`/tickets/${r.ticket_id}`)}
                          className="ml-2 text-[10px] text-blue-400 font-semibold hover:underline"
                        >
                          ver ticket #{r.ticket_id}
                        </button>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{r.detalle}</p>
                    <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {fechaFmt(r.created_at)} · por <span className="text-slate-400 font-semibold">{r.usuario_nombre}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-white/5 border border-white/10">{r.usuario_rol}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auditoria;
