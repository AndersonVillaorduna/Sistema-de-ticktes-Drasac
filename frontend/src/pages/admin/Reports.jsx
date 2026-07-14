import { useState, useEffect } from 'react';
import { BarChart3, Download, Loader2, Calendar } from 'lucide-react';
import api from '../../services/api';

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('Error fetching stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  if (!stats) return <div className="p-10 text-center text-neutral-500">Error al cargar reportes.</div>;

  // Helpers to get percentages
  const getTotal = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

  const renderBars = (dataObj, colorClass) => {
    const total = getTotal(dataObj);
    if (total === 0) return <p className="text-sm text-neutral-400 py-4 text-center">No hay datos suficientes.</p>;
    
    return (
      <div className="space-y-4 w-full mt-4">
        {Object.entries(dataObj).sort((a,b) => b[1] - a[1]).map(([key, value]) => {
          const percent = Math.round((value / total) * 100);
          return (
            <div key={key}>
              <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1">
                <span className="capitalize">{key}</span>
                <span>{value} ({percent}%)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const iaTotal = (stats.resoluciones_ia_vs_humana?.ia || 0) + (stats.resoluciones_ia_vs_humana?.humana || 0);
  const iaPercent = iaTotal > 0 ? Math.round(((stats.resoluciones_ia_vs_humana?.ia || 0) / iaTotal) * 100) : 0;
  const humanPercent = iaTotal > 0 ? 100 - iaPercent : 0;

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Reportes</h2>
          <p className="text-sm text-neutral-500">Estadísticas y métricas del sistema</p>
        </div>
        <button className="btn-primary flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold">
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Resoluciones */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Resoluciones IA vs Humanas</h3>
              <p className="text-xs text-neutral-500">Efectividad del asistente virtual</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center py-6">
            {iaTotal === 0 ? (
              <p className="text-sm text-neutral-400 text-center">No hay resoluciones registradas.</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-bold text-purple-700 mb-1">
                    <span>Inteligencia Artificial</span>
                    <span>{stats.resoluciones_ia_vs_humana.ia} ({iaPercent}%)</span>
                  </div>
                  <div className="w-full bg-purple-50 rounded-full h-3 overflow-hidden border border-purple-100">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${iaPercent}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-bold text-blue-700 mb-1">
                    <span>Técnicos Humanos</span>
                    <span>{stats.resoluciones_ia_vs_humana.humana} ({humanPercent}%)</span>
                  </div>
                  <div className="w-full bg-blue-50 rounded-full h-3 overflow-hidden border border-blue-100">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${humanPercent}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Estados */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Distribución por Estado</h3>
              <p className="text-xs text-neutral-500">Volumen actual de tickets</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {renderBars(stats.estados || {}, "bg-orange-500")}
          </div>
        </div>

        {/* Gráfico 3: Categorías */}
        <div className="card p-6 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Tickets por Categoría</h3>
              <p className="text-xs text-neutral-500">Distribución histórica por tipo de problema</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-10">
             {/* Splitting the categories array into two columns just visually if possible, or letting renderBars take full width */}
            <div className="md:col-span-2">
              {renderBars(stats.categorias || {}, "bg-emerald-500")}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
