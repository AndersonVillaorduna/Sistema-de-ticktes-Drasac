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
    <div className="animate-fade-in w-full" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="mb-10 text-center">
        <p className="text-[11px] font-bold text-[#1B3C5C] uppercase tracking-widest mb-3">NUEVO TICKET</p>
        <h2 className="text-[32px] sm:text-[40px] font-bold text-neutral-900 tracking-tight leading-tight">¿En qué podemos ayudarte?</h2>
        <p className="text-[16px] text-neutral-500 mt-3">Describe tu problema y lo atenderemos a la brevedad.</p>
      </div>

      {vinoDelAsistente && (
        <div className="mb-8 flex items-start gap-3 px-6 py-5 rounded-2xl bg-ai-light border border-ai/20 shadow-sm text-[15px] text-neutral-800">
          <Info className="w-5 h-5 text-ai shrink-0 mt-0.5" />
          <span className="leading-relaxed">Trajimos la conversación que tuviste con el asistente de IA. Revisa la descripción y completa el resto del formulario.</span>
        </div>
      )}

      {error && (
        <div className="mb-8 flex items-start gap-3 px-6 py-5 rounded-2xl bg-danger-light border border-danger/20 text-danger text-[15px] shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        
        {/* Columna Izquierda: Formulario */}
        <div className="lg:col-span-2 bg-white border border-neutral-100 shadow-xl" style={{ borderRadius: '24px', padding: '48px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="text-[15px] font-bold text-neutral-700 ml-1">Asunto <span className="text-danger">*</span></label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Mi computadora no enciende"
                className={`w-full text-[15px] border bg-neutral-50 transition-all focus:bg-white focus:outline-none focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 ${fieldErrors.titulo ? 'border-danger bg-red-50' : 'border-neutral-200'}`}
                style={{ borderRadius: '16px', padding: '16px 20px' }} />
              {fieldErrors.titulo && <p className="text-[13px] text-danger flex items-center gap-1 mt-1 ml-1"><AlertCircle className="w-3.5 h-3.5" />{fieldErrors.titulo}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="text-[15px] font-bold text-neutral-700 ml-1">Descripción <span className="text-danger">*</span></label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={6}
                placeholder="Describe el problema con el mayor detalle posible..."
                className={`w-full text-[15px] border bg-neutral-50 transition-all focus:bg-white focus:outline-none focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 resize-none ${fieldErrors.descripcion ? 'border-danger bg-red-50' : 'border-neutral-200'}`}
                style={{ borderRadius: '16px', padding: '16px 20px' }} />
              {fieldErrors.descripcion && <p className="text-[13px] text-danger flex items-center gap-1 mt-1 ml-1"><AlertCircle className="w-3.5 h-3.5" />{fieldErrors.descripcion}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="border border-neutral-200 bg-neutral-50/30" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', borderRadius: '16px' }}>
                <label className="text-[13px] font-bold uppercase tracking-wide text-neutral-500">Categoría <span className="text-danger">*</span></label>
                <div className="pill-group">
                  {categorias.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setCategoriaId(String(cat.id))}
                      className={`pill-option text-sm ${categoriaId === String(cat.id) ? 'selected' : ''}`}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
                {fieldErrors.categoria && <p className="text-[13px] text-danger flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" />{fieldErrors.categoria}</p>}
              </div>

              <div className="border border-neutral-200 bg-neutral-50/30" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', borderRadius: '16px' }}>
                <label className="text-[13px] font-bold uppercase tracking-wide text-neutral-500">Prioridad</label>
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="text-[15px] font-bold text-neutral-700 ml-1">Sede</label>
              <select value={sede} onChange={(e) => setSede(e.target.value)}
                className="w-full text-[15px] border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 focus:outline-none transition-all appearance-none cursor-pointer"
                style={{ borderRadius: '16px', padding: '16px 20px' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="text-[15px] font-bold text-neutral-700 ml-1">Adjuntar archivos (opcional)</label>
              <div className="border-2 border-dashed border-neutral-300 bg-neutral-50 p-10 text-center hover:border-[#1B3C5C]/50 hover:bg-[#1B3C5C]/5 transition-all cursor-pointer"
                style={{ borderRadius: '20px' }}>
                <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-neutral-400" />
                </div>
                <p className="text-[16px] text-neutral-700 font-bold mb-2">Arrastra archivos aquí</p>
                <p className="text-[13px] text-neutral-400">JPG, PNG, PDF · Máx 10 MB</p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-8 border-t border-neutral-100">
              <button type="button" onClick={() => navigate('/portal/mis-tickets')}
                className="w-full sm:w-auto bg-white border-2 border-neutral-200 text-neutral-600 text-[15px] font-bold hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                style={{ borderRadius: '9999px', padding: '16px 36px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="w-full sm:w-auto bg-[#1B3C5C] text-white text-[15px] font-bold hover:bg-[#142E47] shadow-[0_4px_14px_rgba(27,60,92,0.3)] hover:shadow-[0_6px_20px_rgba(27,60,92,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0"
                style={{ borderRadius: '9999px', padding: '16px 36px' }}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : 'Enviar ticket →'}
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Sidebar (IA & Tips) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {!vinoDelAsistente && (
            <div className="bg-indigo-50 border border-indigo-100 flex flex-col items-center text-center shadow-md"
              style={{ borderRadius: '24px', padding: '40px 32px' }}>
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-900 mb-3 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Asistente de IA
              </h3>
              <p className="text-[14.5px] text-indigo-700/80 leading-relaxed mb-8">
                Consulta con nuestra Inteligencia Artificial antes de enviar el ticket. Podrías obtener una solución inmediata a tu problema.
              </p>
              <button type="button" onClick={() => navigate('/portal/ayuda-ia')}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white text-[15px] font-bold hover:bg-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all w-full"
                style={{ borderRadius: '16px', padding: '16px 24px' }}>
                <Zap className="w-5 h-5" /> Consultar ahora
              </button>
            </div>
          )}

          <div className="bg-white border border-neutral-200 shadow-sm"
               style={{ borderRadius: '24px', padding: '32px' }}>
            <h4 className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Info className="w-4 h-4" /> Consejos
            </h4>
            <ul className="space-y-4">
              <li className="flex gap-3 text-[14.5px] text-neutral-600 leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0" />
                Sé lo más descriptivo posible en el asunto y la descripción del problema.
              </li>
              <li className="flex gap-3 text-[14.5px] text-neutral-600 leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0" />
                Adjunta capturas de pantalla si hay un mensaje de error visible.
              </li>
              <li className="flex gap-3 text-[14.5px] text-neutral-600 leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0" />
                Verifica la categoría para que el ticket llegue al área correcta rápidamente.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}