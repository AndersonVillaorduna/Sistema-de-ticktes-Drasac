import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AlertCircle, CheckCircle2, Loader2, Ticket, Sparkles, SendHorizonal, Zap, Bot } from 'lucide-react';

const TypingDots = () => (
  <div className="flex gap-1 items-center px-3 py-2">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-1.5 h-1.5 rounded-full bg-ai animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
    ))}
  </div>
);

export default function AdminCreateTicket() {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [equiposIds, setEquiposIds] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSugerencia, setIaSugerencia] = useState('');
  const [iaVisible, setIaVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/categorias'), api.get('/inventario')])
      .then(([cats, inv]) => { setCategorias(cats.data); setInventario(inv.data); })
      .catch(() => setError('Error al cargar datos.'))
      .finally(() => setLoadingForm(false));
  }, []);

  useEffect(() => {
    if (!descripcion || descripcion.length < 30) { setIaVisible(false); setIaSugerencia(''); return; }
    const timer = setTimeout(async () => {
      setIaLoading(true); setIaVisible(true); setIaSugerencia('');
      try { const res = await api.post('/tickets/ia-preview', { titulo: titulo || 'Sin título', descripcion }); setIaSugerencia(res.data?.sugerencia || res.data?.respuesta_ia || ''); }
      catch { setIaSugerencia(''); }
      finally { setIaLoading(false); }
    }, 1800);
    return () => clearTimeout(timer);
  }, [descripcion, titulo]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!titulo || !descripcion) { setError('El título y la descripción son obligatorios.'); return; }
    setLoading(true);
    try {
      const payload = { titulo, descripcion, equipos_ids: equiposIds };
      if (categoriaId) payload.categoria_id = parseInt(categoriaId);
      const response = await api.post('/tickets', payload);
      const ticketId = response.data.ticket.id;
      setSuccessMsg('¡Ticket creado exitosamente!');
      setTimeout(() => navigate(`/admin/tickets/${ticketId}`), 1200);
    } catch (err) { setError(err.response?.data?.message || 'Error al crear el ticket.'); }
    finally { setLoading(false); }
  };

  const handleEquiposChange = (e) => {
    const opts = e.target.options;
    const sel = [];
    for (let i = 0; i < opts.length; i++) { if (opts[i].selected) sel.push(parseInt(opts[i].value)); }
    setEquiposIds(sel);
  };

  if (loadingForm) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" /> Crear Nuevo Ticket
        </h2>
        <p className="text-sm text-neutral-500 ml-7">Registra una incidencia en el sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 card p-6 space-y-5">
          {error && <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-danger-light border border-danger/20 text-danger text-sm"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p></div>}
          {successMsg && <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-success-light border border-success/20 text-success text-sm"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><p>{successMsg}</p></div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-neutral-500 font-bold uppercase tracking-widest">Título <span className="text-danger">*</span></label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Impresora no imprime en caja 3"
                className="w-full rounded-lg py-3 px-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none transition-all" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-neutral-500 font-bold uppercase tracking-widest">Descripción <span className="text-danger">*</span></label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={6}
                placeholder="Describe con detalle el problema..."
                className="w-full rounded-lg py-3 px-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none transition-all resize-none" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] text-neutral-500 font-bold uppercase tracking-widest">Categoría</label>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full rounded-lg py-3 px-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none">
                <option value="">Dejar que la IA clasifique</option>
                {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
              </select>
            </div>
            {inventario.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] text-neutral-500 font-bold uppercase tracking-widest">Vincular Equipos</label>
                <select multiple value={equiposIds.map(String)} onChange={handleEquiposChange}
                  className="w-full rounded-lg py-2 px-4 text-sm border border-neutral-200 focus:border-primary focus:outline-none min-h-[100px]">
                  {inventario.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre_equipo} ({eq.tipo})</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/admin/tickets')}
                className="px-5 py-3 rounded-lg border border-neutral-200 text-neutral-600 font-semibold text-sm hover:bg-neutral-50 transition-all">Cancelar</button>
              <button type="submit" disabled={loading}
                className="btn-primary px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><SendHorizonal className="w-4 h-4" /> Crear Ticket</>}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={`card p-4 transition-all duration-500 ${iaVisible ? 'border-ai/30' : ''}`} style={{ background: iaVisible ? 'linear-gradient(135deg, #F1EEFB, #fff)' : '#fff' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-ai-light border border-ai/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-ai" />
                </div>
                <p className="text-xs font-bold text-neutral-700">Asistente IA</p>
              </div>
              {iaLoading && <span className="text-[10px] text-ai font-semibold flex items-center gap-1"><Zap className="w-3 h-3 animate-pulse" /> Analizando...</span>}
            </div>
            <div className="min-h-[100px]">
              {!iaVisible ? (
                <p className="text-xs text-neutral-400 text-center py-6">Escribe al menos 30 caracteres en la descripción para activar el análisis IA.</p>
              ) : iaLoading ? (
                <div className="space-y-2"><div className="skeleton h-3 w-full rounded" /><div className="skeleton h-3 w-5/6 rounded" /><TypingDots /></div>
              ) : iaSugerencia ? (
                <div className="animate-fade-in">
                  <p className="text-[10px] text-ai font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />Sugerencia</p>
                  <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">{iaSugerencia}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic text-center py-4">No se pudo generar sugerencia.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
