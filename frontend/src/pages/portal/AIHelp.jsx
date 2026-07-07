import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Sparkles, Send, Loader2, Bot, Info } from 'lucide-react';

const TypingIndicator = () => (
  <div className="flex gap-1 items-center px-1">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-1.5 h-1.5 rounded-full bg-ai animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
    ))}
  </div>
);

export default function AIHelp() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy el asistente de soporte de DRASAC. Describe tu problema y haré todo lo posible por ayudarte a resolverlo antes de que abramos un ticket formal.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/tickets/ia-preview', {
        titulo: 'Consulta ráfaga desde asistente',
        descripcion: userMsg.content,
      });
      const response = res.data?.sugerencia || res.data?.respuesta_ia || 'Lo siento, no pude procesar tu consulta. ¿Podrías intentar describirlo de otra forma?';
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo o crea un ticket directamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const contextoTicket = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content)
    .join('\n');

  return (
    <div className="w-full" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="mb-6">
        <p className="text-[11px] font-bold text-ai uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> ASISTENTE DE IA
        </p>
        <h2 className="text-lg font-bold text-neutral-900 mt-1">¿Cuál es tu problema?</h2>
        <p className="text-sm text-neutral-500">Describe lo que te está pasando y el asistente intentará ayudarte a resolverlo antes de abrir un ticket.</p>
        <div className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-ai-light border-l-[3px] border-ai text-sm text-neutral-700">
          <Info className="w-4 h-4 text-ai shrink-0 mt-0.5" />
          <span>Este asistente funciona localmente en los servidores de DRASAC. Tu consulta no sale a Internet.</span>
        </div>
      </div>

      <div className="overflow-hidden shadow-lg" style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '24px' }}>
        <div className="h-[500px] overflow-y-auto p-4 md:p-5 space-y-4" style={{ scrollBehavior: 'smooth' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3`}
                style={{
                  background: msg.role === 'user' ? '#1B3C5C' : '#F5F3FF',
                  color: msg.role === 'user' ? '#fff' : '#171717',
                  border: msg.role === 'user' ? 'none' : '1px solid #EAE5FF',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                }}>
                {msg.role === 'assistant' && (
                  <p className="text-[11px] font-bold text-ai flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3" /> Asistente DRASAC
                  </p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3" style={{ background: '#F5F3FF', border: '1px solid #EAE5FF', borderRadius: '16px 16px 16px 4px' }}>
                <p className="text-[11px] font-bold text-ai flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3" /> Asistente DRASAC
                </p>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-neutral-100">
          <div className="flex gap-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Describe tu problema aquí..." rows={1}
              className="flex-1 py-3 px-4 text-[15px] border border-neutral-200 focus:border-[#8B5CF6] focus:outline-none resize-none transition-all"
              style={{ borderRadius: '16px', background: '#FAFAFA' }} />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="w-[52px] h-[52px] flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              style={{ background: '#8B5CF6', color: '#fff', borderRadius: '16px' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {messages.filter((m) => m.role === 'user').length >= 2 && (
        <div className="mt-5 p-5 text-center animate-fade-in" style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f0f0f0' }}>
          <p className="text-sm text-neutral-600 mb-3">¿No se resolvió tu problema?</p>
          <button onClick={() => navigate(`/portal/nuevo-ticket?contexto=${encodeURIComponent(contextoTicket)}`)}
            className="py-3 px-6 text-sm font-bold shadow-md hover:-translate-y-0.5 transition-all"
            style={{ background: '#1B3C5C', color: '#fff', borderRadius: '9999px' }}>
            Crear un ticket con este contexto →
          </button>
        </div>
      )}
    </div>
  );
}
