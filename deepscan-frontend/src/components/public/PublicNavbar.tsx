import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { OwlLogo } from '../OwlLogo';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function PublicNavbar() {
  const location = useLocation();
  const { token } = useAuth();

  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/70 dark:bg-[#050505]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <OwlLogo className="w-10 h-10 transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-brand-600 transition-colors">
              DeepScan
            </span>
            <span className="text-[10px] text-brand-500 font-bold tracking-widest uppercase mt-1">
              DeepScan AI
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" current={location.pathname}>Home</NavLink>
          <NavLink to="/demo" current={location.pathname}>Demo</NavLink>
          <NavLink to="/pricing" current={location.pathname}>Pricing</NavLink>
          <NavLink to="/use-cases" current={location.pathname}>Use Cases</NavLink>
        </div>

        {/* Actions CTA */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {token ? (
            <Link
              to="/dashboard"
              className="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline-block text-sm font-semibold text-slate-900 dark:text-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, current, children }: { to: string, current: string, children: React.ReactNode }) {
  const isActive = current === to;
  return (
    <Link
      to={to}
      className={`text-sm font-semibold transition-all hover:scale-105 ${isActive ? 'text-brand-600' : 'text-slate-900 dark:text-slate-700 hover:text-brand-600 dark:hover:text-brand-400'
        }`}
    >
      {children}
    </Link>
  );
}
