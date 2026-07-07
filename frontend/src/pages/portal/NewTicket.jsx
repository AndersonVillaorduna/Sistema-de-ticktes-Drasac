import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
  AlertCircle, CheckCircle2, Loader2, Upload, Sparkles,
  Bot, Zap, Info,
} from 'lucide-react';

export default function NewTicket() {
  const navigate = useNavigate();
  const location = useLocation();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [sede, setSede] = useState('');
  const [prioridad, setPrioridad] = useState('baja');

  const [categorias, setCategorias] = useState([]);
  const [loadingForm, setLoadingForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [vinoDelAsistente, setVinoDelAsistente] = useState(false);

  // Categorías reales (antes era un array local con ids de mentira como 'hardware')
  useEffect(() => {
    api.get('/categorias')
      .then((res) => setCategorias(res.data))
      .catch(() => setError('No se pudieron cargar las categorías.'))
      .finally(() => setLoadingForm(false));
  }, []);

  // Recibe el contexto que manda AIHelp.jsx por ?contexto=... — antes esto
  // se perdía porque useLocation estaba importado pero nunca se usaba.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const contexto = params.get('contexto');
    if (contexto) {
      setDescripcion(contexto);
      setVinoDelAsistente(true);
    }
  }, [location.search]);

  const validate = () => {
    const errs = {};
    if (!titulo || titulo.length < 5) errs.titulo = 'Mínimo 5 caracteres';
    if (!descripcion || descripcion.length < 10) errs.descripcion = 'Describe el problema';
    if (!categoriaId) errs.categoria = 'Selecciona una categoría';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      // categoria_id ahora es el id numérico real (antes mandaba un string
      // como 'hardware' que no existe en la tabla categorias).
      // sede ahora sí viaja en el payload (antes se capturaba y se perdía).
      const payload = {
        titulo,
        descripcion,
        prioridad,
        categoria_id: parseInt(categoriaId),
        sede,
      };
      const response = await api.post('/tickets', payload);
      setTicketId(response.data.ticket.id);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el ticket.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setTitulo('');
    setDescripcion('');
    setCategoriaId('');
    setSede('');
    setPrioridad('baja');
    setFieldErrors({});
    setVinoDelAsistente(false);
  };

  if (loadingForm) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }

  if (success) {
    return (
      <div className="animate-fade-in">
        <div className="portal-card bg-white border border-neutral-200 rounded-[14px] shadow-card p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success-light mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">¡Ticket enviado!</h2>
          <p className="text-sm text-neutral-500 mb-6">Tu ticket #{ticketId} fue creado exitosamente.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/portal/mis-tickets')}
              className="btn-primary portal-btn w-full sm:w-auto py-2.5 px-6 rounded-lg text-sm font-bold">Ver mis tickets</button>
            <button onClick={resetForm}
              className="portal-btn w-full sm:w-auto py-2.5 px-6 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-bold hover:bg-neutral-50">Crear otro</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full" style={{ maxWidth: '672px', margin: '0 auto' }}>
      <div className="mb-8 text-center">
        <p className="text-[11px] font-bold text-[#1B3C5C] uppercase tracking-widest mb-2">NUEVO TICKET</p>
        <h2 className="text-[28px] sm:text-[32px] font-bold text-neutral-900 tracking-tight leading-tight">¿En qué podemos ayudarte?</h2>
        <p className="text-[15px] text-neutral-500 mt-2">Describe tu problema y lo atenderemos a la brevedad.</p>
      </div>

      {vinoDelAsistente && (
        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-ai-light border-l-[3px] border-ai text-sm text-neutral-700">
          <Info className="w-4 h-4 text-ai shrink-0 mt-0.5" />
          <span>Trajimos la conversación que tuviste con el asistente de IA. Revisa la descripción y completa el resto del formulario.</span>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg bg-danger-light border-l-[3px] border-danger text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-neutral-100 shadow-lg" style={{ borderRadius: '24px', padding: '40px' }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-neutral-700 ml-1">Asunto <span className="text-danger">*</span></label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Mi computadora no enciende"
              className={`w-full text-[15px] border bg-neutral-50 transition-all focus:bg-white focus:outline-none focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 ${fieldErrors.titulo ? 'border-danger bg-red-50' : 'border-neutral-200'}`}
              style={{ borderRadius: '16px', padding: '14px 20px' }} />
            {fieldErrors.titulo && <p className="text-xs text-danger flex items-center gap-1 mt-1.5 ml-1"><AlertCircle className="w-3 h-3" />{fieldErrors.titulo}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-neutral-700 ml-1">Descripción <span className="text-danger">*</span></label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={5}
              placeholder="Describe el problema con el mayor detalle posible..."
              className={`w-full text-[15px] border bg-neutral-50 transition-all focus:bg-white focus:outline-none focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 resize-none ${fieldErrors.descripcion ? 'border-danger bg-red-50' : 'border-neutral-200'}`}
              style={{ borderRadius: '16px', padding: '14px 20px' }} />
            {fieldErrors.descripcion && <p className="text-xs text-danger flex items-center gap-1 mt-1.5 ml-1"><AlertCircle className="w-3 h-3" />{fieldErrors.descripcion}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">Categoría <span className="text-danger">*</span></label>
            <div className="pill-group">
              {categorias.map((cat) => (
                <button key={cat.id} type="button" onClick={() => setCategoriaId(String(cat.id))}
                  className={`pill-option text-sm ${categoriaId === String(cat.id) ? 'selected' : ''}`}>
                  {cat.nombre}
                </button>
              ))}
            </div>
            {fieldErrors.categoria && <p className="text-xs text-danger flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{fieldErrors.categoria}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">Prioridad</label>
            <div className="pill-group">
              {[
                { id: 'baja', label: 'Baja' },
                { id: 'media', label: 'Media' },
                { id: 'alta', label: 'Alta' },
              ].map((p) => (
                <button key={p.id} type="button" onClick={() => setPrioridad(p.id)}
                  className={`pill-option text-sm ${prioridad === p.id ? 'selected' : ''}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-neutral-700 ml-1">Sede</label>
            <select value={sede} onChange={(e) => setSede(e.target.value)}
              className="w-full text-[15px] border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 focus:outline-none transition-all appearance-none cursor-pointer"
              style={{ borderRadius: '16px', padding: '14px 20px' }}>
              <option value="">Seleccionar sede</option>
              <option value="Jockey Plaza">Jockey Plaza</option>
              <option value="Mega Plaza">Mega Plaza</option>
              <option value="Plaza Norte">Plaza Norte</option>
              <option value="Plaza San Miguel">Plaza San Miguel</option>
              <option value="Pureza">Pureza</option>
              <option value="Oficina Central">Oficina Central</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-neutral-700 ml-1">Adjuntar archivos (opcional)</label>
            <div className="border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 text-center hover:border-[#1B3C5C]/50 hover:bg-[#1B3C5C]/5 transition-all cursor-pointer"
              style={{ borderRadius: '20px' }}>
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-[15px] text-neutral-700 font-bold mb-1">Arrastra archivos aquí</p>
              <p className="text-xs text-neutral-400">JPG, PNG, PDF · Máx 10 MB</p>
            </div>
          </div>

          {!vinoDelAsistente && (
            <div className="bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              style={{ borderRadius: '20px', padding: '24px' }}>
              <div className="flex gap-4 items-start sm:items-center">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Asistente IA
                  </p>
                  <p className="text-xs text-indigo-700/80 leading-relaxed">
                    Consulta con nuestra IA antes de enviar el ticket. Quizás obtengas una solución instantánea.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => navigate('/portal/ayuda-ia')}
                className="shrink-0 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                style={{ borderRadius: '9999px', padding: '12px 24px' }}>
                <Zap className="w-4 h-4" /> Consultar IA
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => navigate('/portal/mis-tickets')}
              className="w-full sm:w-auto bg-white border-2 border-neutral-200 text-neutral-600 text-sm font-bold hover:bg-neutral-50 hover:text-neutral-900 transition-all"
              style={{ borderRadius: '9999px', padding: '14px 32px' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto bg-[#1B3C5C] text-white text-sm font-bold hover:bg-[#142E47] shadow-[0_4px_14px_rgba(27,60,92,0.3)] hover:shadow-[0_6px_20px_rgba(27,60,92,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ borderRadius: '9999px', padding: '14px 32px' }}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : 'Enviar ticket →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}