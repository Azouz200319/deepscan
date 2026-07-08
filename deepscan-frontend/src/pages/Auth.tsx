import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext'; 
import { LogIn, UserPlus, Loader, ArrowLeft } from 'lucide-react';
import { OwlLogo } from '../components/OwlLogo';

export function Auth() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, token } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-500/10 dark:bg-brand-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-500/10 dark:bg-sky-500/5 blur-[120px] rounded-full pointer-events-none animate-bounce-slow" />

      {/* Back button */}
      <Link to="/" className="absolute top-8 left-8 text-slate-800 dark:text-slate-700 hover:text-brand-600 dark:hover:text-white flex items-center gap-2 transition-colors z-50">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold tracking-tight">Back to Home</span>
      </Link>

      {/* Auth Card */}
      <div className="relative z-10 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.4)] p-8 sm:p-12 max-w-lg w-full space-y-10">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full animate-pulse"></div>
            <OwlLogo className="w-16 h-16 relative z-10 drop-shadow-[0_8px_15px_rgba(20,184,166,0.2)] mx-auto" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">DeepScan</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-0.5 w-4 bg-brand-500 rounded-full" />
              <p className="text-brand-600 dark:text-brand-400 text-[10px] font-black tracking-[0.2em] uppercase">Intelligence Engine</p>
              <div className="h-0.5 w-4 bg-brand-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-950/50 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 px-4 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${isLogin 
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
              : 'text-slate-800 dark:text-slate-700 hover:text-brand-500 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 px-4 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${!isLogin 
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
              : 'text-slate-800 dark:text-slate-700 hover:text-brand-500 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Register
          </button>
        </div>

        {/* Error Message */}
        {(error || localError) && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-600 dark:text-rose-400 text-xs text-center font-bold flex items-center justify-center gap-2">
            <div className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
            {error || localError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">


          <div className="group">
            <label className="block text-[10px] font-black text-slate-800 dark:text-slate-700 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="admin@institution.edu"
            />
          </div>

          <div className="group">
            <label className="block text-[10px] font-black text-slate-800 dark:text-slate-700 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="••••••••"
            />
          </div>


          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-brand-500 hover:bg-brand-600 text-white dark:text-neutral-900 font-black uppercase tracking-tighter text-lg rounded-2xl shadow-[0_15px_30px_rgba(20,184,166,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Access Dashboard' : 'Initialize Account'}</span>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-slate-800 dark:text-slate-800 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
          By accessing the DeepScan engine, you agree to our <br/>
          <a href="#" className="text-brand-500 hover:underline">Terms of Protocol</a> and <a href="#" className="text-brand-500 hover:underline">Security Policy</a>.
        </p>
      </div>
    </div>
  );
}
