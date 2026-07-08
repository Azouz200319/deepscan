import { OwlLogo } from '../OwlLogo';
import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8 text-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <OwlLogo className="w-8 h-8 text-brand-600" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">DeepScan</span>
          </Link>
          <p className="mb-6 max-w-xs text-slate-700">
            Detect fraud, verify documents, and instantly analyze data with our advanced AI infrastructure.
          </p>
        </div>

        <div>
          <h4 className="text-slate-900 font-bold mb-4 uppercase text-xs tracking-widest">Product</h4>
          <ul className="space-y-3 font-medium">
            <li><Link to="/demo" className="hover:text-brand-600 transition-colors">Demo</Link></li>
            <li><Link to="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link></li>
            <li><Link to="/use-cases" className="hover:text-brand-600 transition-colors">Use Cases</Link></li>
            <li><Link to="/api" className="hover:text-brand-600 transition-colors">API Docs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-900 font-bold mb-4 uppercase text-xs tracking-widest">Company</h4>
          <ul className="space-y-3 font-medium">
            <li><a href="#" className="hover:text-brand-600 transition-colors">About</a></li>
            <li><a href="#" className="hover:text-brand-600 transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-brand-600 transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-brand-600 transition-colors">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-900 font-bold mb-4 uppercase text-xs tracking-widest">Legal</h4>
          <ul className="space-y-3 font-medium">
            <li><a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-brand-600 transition-colors">Security</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p>© 2026 DeepScan AI. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors text-slate-700">𝕏</div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors text-slate-700">in</div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors text-slate-700">gh</div>
        </div>
      </div>
    </footer>
  );
}
