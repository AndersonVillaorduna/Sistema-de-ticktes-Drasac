import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Shield, Ticket, Wrench, Building2, User } from 'lucide-react';

const brands = ['Guess', 'Fossil', 'Citizen', 'Michael Kors', 'Tommy Hilfiger', 'Calvin Klein', 'DKNY', 'Lacoste', 'Puma', 'Adidas'];

function useGoogleFont() {
  useEffect(() => {
    if (document.getElementById('drasac-font-link')) return;
    const link = document.createElement('link');
    link.id = 'drasac-font-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;700;800&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

function LoginForm({ loading, setLoading, error, setError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Por favor, complete todos los campos.'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('drasac_user'));
      if (user?.rol === 'admin' || user?.rol === 'tecnico') navigate('/admin/dashboard');
      else navigate('/portal/mis-tickets');
    } else {
      setError(result.message || 'Credenciales incorrectas.');
    }
  };

  const enterDemo = (rol) => {
    const demoUser = {
      id: 999,
      nombre: rol === 'admin' ? 'Admin DRASAC' : 'Carlos Usuario',
      email: rol === 'admin' ? 'admin@drasac.com' : 'usuario@drasac.com',
      rol,
      tienda_area: rol === 'admin' ? 'TI Central' : 'Jockey Plaza',
    };
    localStorage.setItem('drasac_token', 'demo-token-123');
    localStorage.setItem('drasac_user', JSON.stringify(demoUser));
    window.location.href = rol === 'admin' ? '/admin/dashboard' : '/portal/mis-tickets';
  };

  return (
    <div className="w-full">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700 text-sm mb-6 animate-fade-in" style={{ fontFamily: "'Inter', sans-serif" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="mb-6" style={{ marginBottom: '20px' }}>
          <label className="block text-sm font-semibold text-slate-700 mb-2 px-2">Correo electrónico</label>
          <div className="relative flex items-center">
            <div className="absolute left-5 text-slate-400 z-10 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@drasac.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 text-base text-slate-900 focus:bg-white focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 transition-all placeholder:text-slate-400"
              style={{ paddingLeft: '3.5rem', paddingRight: '1.5rem' }}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 px-2">
            <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
            <button type="button" className="text-xs text-[#2B5C8A] font-bold hover:text-[#1B3C5C] transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative flex items-center">
            <div className="absolute left-5 text-slate-400 z-10 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 text-base text-slate-900 focus:bg-white focus:border-[#1B3C5C] focus:ring-4 focus:ring-[#1B3C5C]/10 transition-all placeholder:text-slate-400"
              style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem' }}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 text-slate-400 hover:text-slate-600 z-10 flex items-center justify-center transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[22px] rounded-full text-[19px] font-bold tracking-wide flex items-center justify-center gap-2 text-white bg-gradient-to-r from-[#142E47] to-[#1B3C5C] hover:from-[#1B3C5C] hover:to-[#2B5C8A] shadow-[0_10px_25px_-6px_rgba(27,60,92,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ fontFamily: "'Sora', sans-serif", marginTop: '24px' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Iniciando sesión...
            </>
          ) : (
            <>
              Iniciar sesión <span aria-hidden>→</span>
            </>
          )}
        </button>
      </form>

      <div className="relative" style={{ marginTop: '32px' }}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-4 text-slate-400 font-bold tracking-wider uppercase">Modo Demo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <button
          onClick={() => enterDemo('admin')}
          className="group flex items-center justify-center gap-2.5 py-3.5 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:border-[#1B3C5C] hover:text-[#1B3C5C] hover:bg-slate-50 transition-all"
        >
          <Shield className="w-4 h-4 text-slate-400 group-hover:text-[#1B3C5C] transition-colors" /> 
          Demo Admin
        </button>
        <button
          onClick={() => enterDemo('usuario')}
          className="group flex items-center justify-center gap-2.5 py-3.5 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:border-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all"
        >
          <Wrench className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" /> 
          Demo Usuario
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useGoogleFont();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0B1A2A] relative overflow-hidden">
      
      {/* Background Orbs & Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#1B3C5C] blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/20 blur-[120px] opacity-50" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-[#2B5C8A] blur-[100px] opacity-40" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[500px] flex flex-col items-center">
        
        {/* Header / Logo */}
        <div className="mb-8 flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-[18px] bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] mb-4">
            <span className="text-[#142E47] font-extrabold text-2xl tracking-tighter" style={{ fontFamily: "'Sora', sans-serif" }}>DR</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>DRASAC</h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wide">
              <Building2 className="w-3.5 h-3.5" /> Portal de Soporte TI
            </span>
          </div>
        </div>

        {/* Card Form */}
        <div className="w-full bg-white rounded-[32px] shadow-2xl shadow-black/40 animate-fade-in" style={{ animationDelay: '0.1s', padding: '48px' }}>
          <div className="text-center mb-6" style={{ marginBottom: '32px' }}>
            <h2 className="text-[28px] font-bold text-slate-900 mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>Iniciar sesión</h2>
            <p className="text-[15px] text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>Accede al sistema corporativo y portal de usuarios.</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-inner">
              <User className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
            </div>
          </div>

          <LoginForm loading={loading} setLoading={setLoading} error={error} setError={setError} />
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs text-blue-200/60 flex items-center justify-center gap-1.5 mb-4">
            <Shield className="w-3.5 h-3.5" />
            Plataforma protegida y restringida al personal autorizado
          </p>
          
          <div className="flex items-center justify-center gap-2 text-[10px] text-blue-200/40">
            <span>Marcas soportadas:</span>
            <span>{brands.slice(0, 4).join(', ')}...</span>
          </div>
        </div>

      </div>
    </div>
  );
}