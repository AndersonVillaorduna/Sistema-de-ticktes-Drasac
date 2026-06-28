import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, Mail, AlertTriangle, Loader2, Zap, Bot, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Credenciales incorrectas. Intente de nuevo.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-spin-slow"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 60%)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Card */}
      <div className={`relative w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="rounded-2xl border border-white/8 p-8 shadow-2xl"
          style={{ background: 'rgba(10, 16, 32, 0.85)', backdropFilter: 'blur(24px)' }}>

          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/40 animate-float">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0a1020]">
                <Shield className="w-3 h-3 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-wider mb-1">DRASAC</h1>
            <p className="text-xs text-slate-500 font-medium">Sistema Automatizado de Soporte TI · 2026</p>

            {/* Divider badges */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-400 font-semibold">
                <Bot className="w-3 h-3" />
                IA Integrada
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400 font-semibold">
                <Lock className="w-3 h-3" />
                SSL Seguro
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@drasac.com"
                  className="input-glow w-full rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 border transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="input-glow w-full rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 border transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-glow w-full text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando credenciales...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Iniciar Sesión
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600">
              © 2026 DRASAC · Acceso restringido a personal autorizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
