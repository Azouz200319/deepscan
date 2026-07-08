import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-slate-900 dark:text-slate-100 font-sans selection:bg-brand-500/30 transition-colors duration-500">
      <PublicNavbar />
      <main className="pt-20 min-h-screen">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
