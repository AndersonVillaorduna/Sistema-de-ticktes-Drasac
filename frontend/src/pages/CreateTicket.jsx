import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Ticket, Laptop, HelpCircle, Loader2, AlertCircle,
  Bot, Zap, CheckCircle2, SendHorizonal, Sparkles, X,
} from 'lucide-react';

// ── Typing dots animation ──────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex gap-1 items-center px-3 py-2">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

const CreateTicket = () => {
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

  // IA Assistant state
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSugerencia, setIaSugerencia] = useState('');
  const [iaVisible, setIaVisible] = useState(false);
  const iaDebounceRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, invRes] = await Promise.all([
          api.get('/categorias'),
          api.get('/inventario'),
        ]);
        setCategorias(catsRes.data);
        setInventario(invRes.data);
      } catch {
        setError('Error al cargar categorías o inventario.');
      } finally {
        setLoadingForm(false);
      }
    };
    fetchData();
  }, []);

  // ── IA en tiempo real: debounce al escribir la descripción ──────────────────
  useEffect(() => {
    if (!descripcion || descripcion.length < 30) {
      setIaVisible(false);
      setIaSugerencia('');
      return;
    }

    if (iaDebounceRef.current) clearTimeout(iaDebounceRef.current);

    iaDebounceRef.current = setTimeout(async () => {
      setIaLoading(true);
      setIaVisible(true);
      setIaSugerencia('');
      try {
        const res = await api.post('/tickets/ia-preview', {
          titulo: titulo || 'Sin título',
          descripcion,
        });
        setIaSugerencia(res.data?.sugerencia || res.data?.respuesta_ia || '');
      } catch {
        setIaSugerencia('');
      } finally {
        setIaLoading(false);
      }
    }, 1800);

    return () => clearTimeout(iaDebounceRef.current);
  }, [descripcion, titulo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!titulo || !descripcion) {
      setError('El título y la descripción son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const payload = { titulo, descripcion, equipos_ids: equiposIds };
      if (categoriaId) payload.categoria_id = parseInt(categoriaId);

      const response = await api.post('/tickets', payload);
      const ticketId = response.data.ticket.id;
      setSuccessMsg('¡Ticket creado! Redirigiendo al detalle...');
      setTimeout(() => navigate(`/tickets/${ticketId}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleEquiposChange = (e) => {
    const opts = e.target.options;
    const sel = [];
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].selected) sel.push(parseInt(opts[i].value));
    }
    setEquiposIds(sel);
  };

  if (loadingForm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs text-slate-500">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-blue-400" />
          </div>
          Reportar Nueva Incidencia
        </h2>
        <p className="text-xs text-slate-500 mt-1 ml-10">
          Describe tu problema y la IA sugerirá una solución automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Formulario ── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-white/6 p-6 space-y-5" style={{ background: 'var(--bg-card)' }}>

            {/* Error / Success */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Título */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                  Título del Problema <span className="text-red-400">*</span>
                </label>
                <input
                  id="ticket-titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Impresora no imprime en caja 3"
                  className="input-glow w-full rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 border transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  required
                />
              </div>

              {/* Descripción + IA preview */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  Descripción Detallada <span className="text-red-400">*</span>
                  {descripcion.length >= 30 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold">
                      <Sparkles className="w-2.5 h-2.5" />
                      IA Analizando
                    </span>
                  )}
                </label>
                <textarea
                  id="ticket-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={6}
                  placeholder="Describe con el mayor detalle posible: qué ocurre, cuándo empezó, qué equipo está afectado, qué mensajes de error aparecen..."
                  className="input-glow w-full rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 border transition-all duration-200 resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  required
                />
                <p className="text-[10px] text-slate-600">
                  {descripcion.length < 30
                    ? `Escribe al menos ${30 - descripcion.length} caracteres más para activar el asistente IA`
                    : '✓ El asistente IA está analizando tu descripción'
                  }
                </p>
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  Categoría
                  <HelpCircle className="w-3 h-3 text-slate-600" title="Déjalo vacío para que la IA lo clasifique" />
                  <span className="text-slate-600 normal-case font-normal">(Opcional)</span>
                </label>
                <select
                  id="ticket-categoria"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="input-glow w-full rounded-xl py-3 px-4 text-sm border transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: categoriaId ? '#e2e8f0' : '#475569' }}
                >
                  <option value="" style={{ background: '#0d1428' }}>Dejar que la IA clasifique (Recomendado)</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id} style={{ background: '#0d1428' }}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Equipos */}
              {inventario.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Laptop className="w-3 h-3" />
                    Vincular Equipo
                    <span className="text-slate-600 normal-case font-normal">(Opcional)</span>
                  </label>
                  <select
                    id="ticket-equipos"
                    multiple
                    value={equiposIds.map(String)}
                    onChange={handleEquiposChange}
                    className="input-glow w-full rounded-xl py-2 px-4 text-sm border transition-all duration-200 min-h-[100px]"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                  >
                    {inventario.map((eq) => (
                      <option key={eq.id} value={eq.id} style={{ background: '#0d1428' }}>
                        {eq.nombre_equipo} ({eq.tipo} · {eq.ubicacion_tienda})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600">Ctrl/Cmd + clic para seleccionar múltiples equipos</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-white/8 text-slate-400 font-semibold text-sm hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  id="ticket-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-glow flex-1 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Procesando con IA...</>
                  ) : (
                    <><SendHorizonal className="w-4 h-4" />Enviar Ticket</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Panel Asistente IA ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* IA Response Panel */}
          <div className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
            iaVisible
              ? 'border-indigo-500/30 opacity-100'
              : 'border-white/5 opacity-60'
          }`} style={{ background: iaVisible ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(59,130,246,0.06))' : 'var(--bg-card)' }}>

            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                  iaVisible ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/10'
                }`}>
                  <Bot className={`w-4 h-4 ${iaVisible ? 'text-indigo-400' : 'text-slate-600'}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${iaVisible ? 'text-white' : 'text-slate-500'}`}>Asistente IA</p>
                  <p className="text-[10px] text-slate-600">LLaMA 3.1 · Preview</p>
                </div>
              </div>
              {iaLoading && (
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-semibold">
                  <Zap className="w-3 h-3 animate-pulse" />
                  Analizando...
                </div>
              )}
              {iaSugerencia && !iaLoading && (
                <button onClick={() => { setIaVisible(false); setIaSugerencia(''); }} className="text-slate-600 hover:text-slate-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="p-4 min-h-[120px]">
              {!iaVisible && (
                <div className="text-center py-4">
                  <Bot className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Escribe al menos 30 caracteres en la descripción para que el asistente IA analice tu problema y proponga una solución.
                  </p>
                </div>
              )}
              {iaVisible && iaLoading && (
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-5/6 rounded" />
                  <div className="skeleton h-3 w-4/5 rounded" />
                  <TypingDots />
                </div>
              )}
              {iaVisible && !iaLoading && iaSugerencia && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Solución Sugerida</p>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{iaSugerencia}</p>
                  <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-600">
                    💡 Esta es una sugerencia preliminar. Al enviar el ticket, la IA analizará tu caso en profundidad.
                  </div>
                </div>
              )}
              {iaVisible && !iaLoading && !iaSugerencia && (
                <p className="text-[11px] text-slate-600 italic text-center py-4">
                  No se pudo generar una sugerencia. El ticket será analizado al enviarse.
                </p>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-white/5 p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">💡 Consejos</p>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                Incluye el modelo del equipo afectado
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                Menciona cuándo comenzó el problema
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                Copia cualquier mensaje de error que aparezca
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                Indica si otros equipos presentan el mismo problema
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;
