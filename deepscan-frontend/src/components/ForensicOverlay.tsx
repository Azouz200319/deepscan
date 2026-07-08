import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Cpu, BarChart3, Shield, Zap } from 'lucide-react';

interface ForensicOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  results: any;
  filename: string;
}

export default function ForensicOverlay({ isOpen, onClose, results, filename }: ForensicOverlayProps) {
  if (!results) return null;

  const stage2 = results.stage2 || {};
  const verdict = results.stage1?.label?.toUpperCase()?.includes('DOUBLE') || stage2.kept_count > 0 ? 'FORGED' : 'AUTHENTIC';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${verdict === 'FORGED' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight uppercase">Forensic Report</h2>
                  <p className="text-xs text-slate-400 font-mono truncate max-w-[200px] sm:max-w-xs">{filename}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Alert Banner for Forgery */}
              {verdict === 'FORGED' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-950 shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <h3 className="text-base font-bold text-rose-400 tracking-tight uppercase">Forgery Detected</h3>
                    <p className="text-sm text-rose-300/80">Found {stage2.kept_count} suspicious areas</p>
                  </div>
                </motion.div>
              )}

              {/* Main Visualization - Detection Map Only */}
              <div className="max-w-lg mx-auto space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Detection Map
                  </h4>
                  {verdict === 'FORGED' && (
                    <span className="text-[9px] font-bold text-rose-500 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase animate-pulse">Forgery Alert</span>
                  )}
                </div>
                <div className="relative aspect-[4/3] bg-slate-950 rounded-xl border-2 border-rose-500/50 overflow-hidden shadow-2xl shadow-rose-500/10">
                  {/* Animated Red Corner Markers for Forgery */}
                  {verdict === 'FORGED' && (
                    <>
                      {/* Animated border pulse */}
                      <div className="absolute inset-0 border-2 border-rose-500 animate-pulse pointer-events-none z-20" />
                      
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-rose-500 z-20 animate-pulse" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-rose-500 z-20 animate-pulse" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-rose-500 z-20 animate-pulse" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-rose-500 z-20 animate-pulse" />
                      
                      {/* Warning label */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded z-20 shadow-lg animate-bounce">
                        Suspicious Areas Detected
                      </div>
                    </>
                  )}
                  
                  {stage2.annotated && (
                    <img 
                      src={`data:image/png;base64,${stage2.annotated}`} 
                      alt="Detection result"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  {verdict === 'FORGED' ? (
                    <span className="text-rose-400 font-semibold">Red boxes indicate potential forged regions</span>
                  ) : (
                    "No suspicious patterns detected"
                  )}
                </p>
              </div>

              {/* Stage Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Compression</span>
                    </div>
                    <p className="text-xs text-slate-400">{results.stage1?.label || 'N/A'} ({results.stage1?.score?.toFixed(2) || '0.00'})</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Anomalies</span>
                    </div>
                    <p className="text-xs text-slate-400">{stage2.kept_count || 0} suspicious clusters found</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Verdict</span>
                    </div>
                    <p className="text-xs text-slate-400">{stage2.kept_count > 0 ? "Potential forgery" : "Likely authentic"}</p>
                 </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-center">
                 <button 
                  onClick={onClose}
                  className="px-8 py-2.5 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-all shadow-lg text-sm"
                 >
                   Close Report
                 </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
