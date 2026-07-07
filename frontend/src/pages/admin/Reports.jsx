import { BarChart3, Download, Calendar } from 'lucide-react';

export default function Reports() {
  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Reportes</h2>
          <p className="text-sm text-neutral-500">Estadísticas y métricas del sistema</p>
        </div>
        <button className="btn-primary flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Tickets por período</h3>
              <p className="text-xs text-neutral-500">Selecciona un rango de fechas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-600">Últimos 30 días</span>
          </div>
          <div className="h-48 flex items-center justify-center border border-dashed border-neutral-200 rounded-lg">
            <p className="text-sm text-neutral-400">Gráfico de tickets por período</p>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-ai-light flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-ai" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Resoluciones IA vs Humanas</h3>
              <p className="text-xs text-neutral-500">Efectividad del asistente</p>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center border border-dashed border-neutral-200 rounded-lg">
            <p className="text-sm text-neutral-400">Gráfico de comparación</p>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Tickets por categoría</h3>
              <p className="text-xs text-neutral-500">Distribución de incidencias</p>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center border border-dashed border-neutral-200 rounded-lg">
            <p className="text-sm text-neutral-400">Gráfico de categorías</p>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Tiempo de resolución</h3>
              <p className="text-xs text-neutral-500">Promedio por prioridad</p>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center border border-dashed border-neutral-200 rounded-lg">
            <p className="text-sm text-neutral-400">Gráfico de tiempos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
