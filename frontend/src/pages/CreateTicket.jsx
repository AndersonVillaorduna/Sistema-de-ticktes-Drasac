import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  AlertCircle, Loader2, Ticket, Send,
  Bot, Zap,
} from 'lucide-react';

const inputCls = 'input-glow w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' };
const optStyle = { background: '#0d1428' };

const CreateTicket = () => {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);
  const [error, setError] = useState('');
  const [iaSugerencia, setIaSugerencia] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaVisible, setIaVisible] = useState(false);
  const debounceRef = useRef(null);
  const previewAbortRef = useRef(null);

  useEffect(() => {
    api.get('/categorias')
      .then((res) => setCategorias(res.data))
      .catch(() => setError('Error al cargar los datos del formulario.'))
      .finally(() => setLoadingForm(false));
  }, []);

  // Vista previa de la IA: se consulta mientras el usuario escribe (mín. 30 caracteres).
  // Debounce largo + cancelación de la petición anterior para no saturar la CPU
  // con generaciones simultáneas de Ollama.
  useEffect(() => {
    if (!descripcion || descripcion.length < 30) {
      setIaVisible(false);
      setIaSugerencia('');
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      previewAbortRef.current?.abort();
      const controller = new AbortController();
      previewAbortRef.current = controller;
      setIaLoading(true);
      setIaVisible(true);
      try {
        const res = await api.post('/tickets/ia-preview', { titulo, descripcion }, { signal: controller.signal });
        setIaSugerencia(res.data.sugerencia || res.data.respuesta_ia || '');
      } catch (err) {
        if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') {
          setIaSugerencia('');
        }
      } finally {
        if (previewAbortRef.current === controller) {
          setIaLoading(false);
          previewAbortRef.current = null;
        }
      }
    }, 1500);
    return () => clearTimeout(debounceRef.current);
  }, [titulo, descripcion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!titulo.trim() || !descripcion.trim()) {
      setError('El título y la descripción son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
      };
      if (categoriaId) payload.categoria_id = Number(categoriaId);

      const res = await api.post('/tickets', payload);
      navigate(`/tickets/${res.data.ticket.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white">Reportar Incidencia</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Describe tu problema: la IA lo analizará y podrá darte una solución al instante.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/5 p-4 md:p-6 space-y-5"
        style={{ background: 'var(--bg-card)' }}>

        {/* Título */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Título del problema</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Mi computadora no enciende"
            className={inputCls}
            style={inputStyle}
            required
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Descripción detallada</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={5}
            placeholder="Describe qué pasó, desde cuándo ocurre y qué has intentado..."
            className={`${inputCls} resize-y leading-relaxed`}
            style={inputStyle}
            required
          />
          <p className="text-[10px] text-slate-600 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            Con 30 caracteres o más, la IA empezará a analizar tu caso en vivo.
          </p>
        </div>

        {/* Panel de sugerencia de la IA */}
        <div
          className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
            iaVisible ? 'border-indigo-500/30 opacity-100' : 'border-white/5 opacity-60'
          }`} style={{ background: iaVisible ? 'var(--panel-ai-bg)' : 'var(--bg-card)' }}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-white">Asistente IA</span>
            </div>
            {iaLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
          </div>
          <div className="p-4">
            {iaVisible ? (
              iaLoading ? (
                <p className="text-xs text-slate-400">Analizando tu problema…</p>
              ) : iaSugerencia ? (
                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{iaSugerencia}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sigue escribiendo para obtener una sugerencia más precisa.</p>
              )
            ) : (
              <p className="text-xs text-slate-500">
                Escribe la descripción de tu problema y la IA te sugerirá una solución aquí.
              </p>
            )}
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Categoría <span className="normal-case text-slate-600">(opcional, la IA la detecta)</span>
          </label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className={inputCls}
            style={{ ...inputStyle, color: categoriaId ? '#e2e8f0' : '#64748b' }}
          >
            <option value="" style={optStyle}>Dejar que la IA clasifique (Recomendado)</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id} style={optStyle}>{cat.nombre}</option>
            ))}
          </select>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-4 py-2.5 border border-white/8 text-slate-400 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-glow px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Creando ticket…' : 'Crear Ticket'}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 text-[10px] text-slate-600 justify-center">
        <Ticket className="w-3 h-3" />
        Al crear el ticket, la IA lo clasificará y lo asignará al técnico correcto automáticamente.
      </div>
    </div>
  );
};

export default CreateTicket;
