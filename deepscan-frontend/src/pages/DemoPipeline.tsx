import { motion } from 'framer-motion';
import { Presentation, ShieldCheck, Zap } from 'lucide-react';
import PipelineShowcase from '../components/PipelineShowcase';

export default function DemoPipeline() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto py-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl">
              <Presentation className="w-6 h-6 text-brand-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">System Pipeline Demo</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl">
            A visual representation of the end-to-end DeepScan workflow. Use this visualization for stakeholder presentations or to demonstrate the AI decision-making process.
          </p>
        </motion.div>

        <div className="flex items-center gap-4">
           <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Simulation</span>
           </div>
           <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">DeepScan AI V2</span>
           </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PipelineShowcase />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
             <h4 className="font-bold text-slate-800 dark:text-white mb-2">1. Ingestion Layer</h4>
             <p className="text-xs text-slate-500 leading-relaxed">System supports high-concurrency file uploads with automatic format conversion and preprocessing for neural analysis.</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
             <h4 className="font-bold text-slate-800 dark:text-white mb-2">2. Verification Engine</h4>
             <p className="text-xs text-slate-500 leading-relaxed">Cross-references extracted metadata against official university databases to identify identity mismatches instantly.</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
             <h4 className="font-bold text-slate-800 dark:text-white mb-2">3. Forensics Suite</h4>
             <p className="text-xs text-slate-500 leading-relaxed">Multi-stage DCT analysis and JPEG ghost mapping detect pixel-level manipulations often invisible to the human eye.</p>
          </div>
      </div>
    </div>
  );
}
