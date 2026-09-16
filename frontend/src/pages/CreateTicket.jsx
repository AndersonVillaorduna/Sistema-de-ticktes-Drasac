import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  AlertCircle, Loader2, Ticket, Send,
  Bot, Zap, Sparkles, Wifi, Printer, Laptop, KeyRound, MonitorPlay, Lightbulb,
} from 'lucide-react';

const inputCls = 'input-glow w-full rounded-xl py-2.5 px-3.5 text-sm border text-white placeholder-slate-600 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' };
const optStyle = { background: '#0d1428' };

// Ejemplos que rellenan el formulario con un clic
const EJEMPLOS = [
  { icon: Wifi, titulo: 'No tengo internet', desc: 'No hay conexión a internet en mi área de trabajo desde hace una hora, ya intenté reiniciar mi equipo.' },
  { icon: Printer, titulo: 'La impresora no imprime', desc: 'La impresora no responde al enviar los documentos y no veo ningún error en pantalla.' },
  { icon: Laptop, titulo: 'Mi laptop no enciende', desc: 'Presiono el botón de encendido y no ocurre nada, ya probé con otro enchufe.' },
  { icon: KeyRound, titulo: 'Olvidé mi contraseña', desc: 'No puedo ingresar a mi correo corporativo, necesito restablecer la clave.' },
  { icon: MonitorPlay, titulo: 'El sistema de ventas se cierra solo', desc: 'La aplicación de ventas se cierra sola al usar el módulo de facturación.' },
];

const COMO_FUNCIONA = [
  { n: 1, texto: 'Describe tu problema con detalle' },
  { n: 2, texto: 'La IA lo analiza al instante' },
  { n: 3, texto: 'Si hay una solución conocida, la ves al momento con imágenes' },
  { n: 4, texto: 'Si no, se asigna automáticamente al técnico del tema' },
];

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

  const aplicarEjemplo = (ej) => {
    setTitulo(ej.titulo);
    setDescripcion(ej.desc);
  };

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
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Reportar Incidencia</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Describe tu problema: la IA lo analizará y podrá darte una solución al instante.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna principal: formulario ── */}
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-600 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Con 30 caracteres o más, la IA empezará a analizar tu caso en vivo.
                </p>
                <span className={`text-[10px] font-bold ${descripcion.length >= 30 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {descripcion.length}/30
                </span>
              </div>
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
        </div>

        {/* ── Columna lateral: guía ── */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Problemas comunes */}
          <div className="rounded-2xl border border-white/5 p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Problemas comunes
            </p>
            <p className="text-[10px] text-slate-600 mb-3">Haz clic en uno y completa los detalles:</p>
            <div className="space-y-2">
              {EJEMPLOS.map((ej) => {
                const Icon = ej.icon;
                return (
                  <button
                    key={ej.titulo}
                    type="button"
                    onClick={() => aplicarEjemplo(ej)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/5 bg-white/3 text-left hover:border-blue-500/25 hover:bg-blue-500/5 transition-all group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-blue-500/15 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </span>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors truncate">
                      {ej.titulo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ¿Cómo funciona? */}
          <div className="rounded-2xl border border-indigo-500/20 p-4" style={{ background: 'var(--panel-ai-bg)' }}>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ¿Cómo funciona?
            </p>
            <div className="space-y-3">
              {COMO_FUNCIONA.map((paso) => (
                <div key={paso.n} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] font-black flex items-center justify-center shrink-0">
                    {paso.n}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{paso.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de la IA */}
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex items-center gap-3">
            <span className="relative w-2.5 h-2.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </span>
            <div>
              <p className="text-xs font-bold text-white">IA activa · Qwen 2.5</p>
              <p className="text-[10px] text-slate-500">Responde en segundos, 24/7</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-600 text-center px-2 flex items-center justify-center gap-1.5">
            <Ticket className="w-3 h-3 shrink-0" />
            Al crear el ticket, la IA lo clasifica y lo asigna al técnico correcto automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;
