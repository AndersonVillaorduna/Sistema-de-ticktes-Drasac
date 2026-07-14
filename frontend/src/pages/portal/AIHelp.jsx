import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Sparkles, Send, Loader2, Bot, Info, MessageCircle } from 'lucide-react';

const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-2 py-1">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 180}ms` }} />
    ))}
  </div>
);

export default function AIHelp() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente de soporte de DRASAC. Describe tu problema y haré todo lo posible por ayudarte a resolverlo antes de que abramos un ticket formal.',
    },
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
        titulo: 'Consulta rápida desde asistente',
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
    <div className="w-full" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="mb-8 px-1">
        <p className="text-[11px] font-bold text-purple-600 uppercase tracking-[0.15em] flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5" /> ASISTENTE DE IA
        </p>
        <h2 className="text-2xl font-bold text-neutral-900 mt-1">¿Cuál es tu problema?</h2>
        <p className="text-[15px] text-neutral-500 mt-2 leading-relaxed">
          Describe lo que te está pasando y el asistente intentará ayudarte a resolverlo antes de abrir un ticket.
        </p>
        <div className="mt-4 flex items-start gap-3 px-5 py-4 rounded-2xl bg-purple-50 border border-purple-100 text-sm text-neutral-700">
          <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
          <span className="leading-relaxed">Este asistente funciona localmente en los servidores de DRASAC. Tu consulta no sale a Internet.</span>
        </div>
      </div>

      <div className="overflow-hidden shadow-xl border border-neutral-200/60" style={{ background: '#fff', borderRadius: '28px' }}>
        <div className="h-[520px] overflow-y-auto px-6 py-6 space-y-5" style={{ scrollBehavior: 'smooth' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="rounded-full bg-purple-100 flex items-center justify-center shrink-0"
                     style={{ width: '36px', height: '36px', marginRight: '12px', marginTop: '4px' }}>
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] leading-relaxed text-sm whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-[#1B3C5C] text-white'
                    : 'bg-purple-50 text-neutral-800 border border-purple-100'
                }`}
                style={{ 
                  padding: '16px 20px', 
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px'
                }}
              >
                {msg.role === 'assistant' && (
                  <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Sparkles className="w-3 h-3" /> Asistente DRASAC
                  </p>
                )}
                <p className="leading-relaxed">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="rounded-full bg-[#1B3C5C] flex items-center justify-center shrink-0"
                     style={{ width: '36px', height: '36px', marginLeft: '12px', marginTop: '4px' }}>
                  <span className="text-white text-xs font-bold">TÚ</span>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-full bg-purple-100 flex items-center justify-center shrink-0"
                   style={{ width: '36px', height: '36px', marginRight: '12px', marginTop: '4px' }}>
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div className="bg-purple-50 border border-purple-100"
                   style={{ padding: '16px 20px', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3" /> Asistente DRASAC
                </p>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="px-6 py-5 border-t border-neutral-100 bg-neutral-50/50">
          <div className="flex gap-3 items-end">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Describe tu problema aquí..."
              rows={1}
              className="flex-1 py-3.5 px-5 text-[15px] border border-neutral-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none resize-none transition-all bg-white rounded-2xl"
              style={{ minHeight: '48px', maxHeight: '120px' }} />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="w-[48px] h-[48px] flex items-center justify-center rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm hover:shadow-md"
              style={{ background: '#8B5CF6', color: '#fff' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {messages.filter((m) => m.role === 'user').length >= 2 && (
        <div className="mt-8 p-6 text-center animate-fade-in bg-white rounded-3xl border border-neutral-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-neutral-400" />
          </div>
          <p className="text-sm font-semibold text-neutral-700 mb-1">¿No se resolvió tu problema?</p>
          <p className="text-xs text-neutral-400 mb-4">Crea un ticket formal y un técnico te atenderá pronto.</p>
          <button onClick={() => navigate(`/portal/nuevo-ticket?contexto=${encodeURIComponent(contextoTicket)}`)}
            className="py-3.5 px-8 text-sm font-bold shadow-md hover:-translate-y-0.5 transition-all rounded-full"
            style={{ background: '#1B3C5C', color: '#fff' }}>
            Crear un ticket con este contexto →
          </button>
        </div>
      )}
    </div>
  );
}
