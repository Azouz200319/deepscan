import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  FileWarning,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ArchiveRestore,
  LayoutList,
  LogOut,
  Presentation,
  UserX,
} from 'lucide-react';
import { OwlLogo } from './OwlLogo';
import { useAuth } from '../lib/AuthContext';

import { useLanguage } from '../lib/LanguageContext';

const navGroups = [
  {
    titleKey: 'nav.group.main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { to: '/dashboard/presentation', icon: Presentation, labelKey: 'nav.demoPipeline' },
    ]
  },
  {
    titleKey: 'nav.group.analysis',
    items: [
      { to: '/dashboard/scan', icon: ScanLine, labelKey: 'nav.scan' },
      { to: '/dashboard/forgery', icon: FileWarning, labelKey: 'nav.forgery' },
      { to: '/dashboard/staging', icon: ClipboardList, labelKey: 'nav.identity' },
    ]
  },
  {
    titleKey: 'nav.group.records',
    items: [
      { to: '/dashboard/database', icon: Database, labelKey: 'nav.database' },
      { to: '/dashboard/archive', icon: LayoutList, labelKey: 'nav.auditArchive' },
      { to: '/dashboard/history', icon: ArchiveRestore, labelKey: 'nav.history' },
      { to: '/dashboard/blacklist', icon: UserX, labelKey: 'nav.blacklist' },
    ]
  },
  {
    titleKey: 'nav.group.system',
    items: [
      { to: '/dashboard/settings', icon: Settings, labelKey: 'nav.settings' },
    ]
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-slate-950 text-slate-100 flex flex-col transition-all duration-300 z-50 border-r border-white/5 ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
        <OwlLogo className="w-8 h-8 flex-shrink-0 text-brand-500 drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]" />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-xl font-bold tracking-tight text-white">DeepScan</h1>
            <p className="text-[10px] font-bold text-brand-500 tracking-widest uppercase">DeepScan AI</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.titleKey} className="space-y-1">
            {!collapsed && (
              <h2 className="px-3 text-[10px] font-bold text-slate-800 tracking-[0.2em] uppercase mb-2">
                {t(group.titleKey)}
              </h2>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all group ${isActive
                    ? 'bg-brand-500/10 text-brand-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                    : 'text-slate-700 hover:bg-white/5 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${collapsed ? '' : 'group-hover:scale-110'}`} />
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </NavLink>
            ))}
            {collapsed && <div className="h-px bg-white/5 mx-4 my-2 last:hidden" />}
          </div>
        ))}
      </nav>

      {/* Actions (Logout + Collapse) */}
      <div className="px-3 py-4 border-t border-white/5 space-y-2">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-slate-800 hover:bg-rose-500/10 hover:text-rose-400 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title="Log out"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        <button
          onClick={onToggle}
          className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-slate-800 hover:bg-white/5 hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
