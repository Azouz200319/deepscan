import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Fingerprint, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OwlLogo } from './OwlLogo';

export const ForensicVisual: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden min-h-[500px]">
      {/* Background Neural Grid */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
        <svg width="100%" height="100%" className="text-brand-500">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating Document Container Wrapper (for scaling on small screens) */}
      <div className="relative scale-[0.7] sm:scale-90 md:scale-100 flex items-center justify-center w-full max-w-[500px]">
        <motion.div
          animate={{
            rotateY: [-5, 5, -5],
            rotateX: [2, -2, 2],
            y: [-10, 10, -10]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative z-20 w-[300px] sm:w-[320px] h-[400px] sm:h-[420px] bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-5"
          style={{ perspective: '1000px' }}
        >
        {/* Document Header Mockup */}
        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 shadow-inner">
            <FileText className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="h-2.5 w-28 bg-slate-200 dark:bg-slate-700 rounded-full mb-2" />
            <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
          </div>
        </div>

        {/* Document Body Mockup */}
        <div className="space-y-5 py-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-2.5 relative">
              <div className={`h-2.5 rounded-full bg-slate-50 dark:bg-slate-800 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} />
              <div className={`h-2 rounded-full bg-slate-50/50 dark:bg-slate-800/40 ${i % 3 === 0 ? 'w-1/2' : 'w-2/3'}`} />
              
              {/* Highlight for "Analysis" */}
              {i === 3 && (
                <motion.div 
                  className="absolute inset-0 bg-brand-500/10 dark:bg-brand-500/5 border border-brand-500/20 rounded-lg -m-1.5"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
               {i === 5 && (
                <motion.div 
                  className="absolute inset-0 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 rounded-lg -m-1.5"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Forensic Tags */}
        <div className="absolute top-[20%] -right-[20%] z-40">
           <ForensicTag 
            delay={0.5} 
            icon={<CheckCircle2 className="w-4 h-4"/>} 
            label="OCR_CORE: 99.8%" 
            color="text-emerald-500" 
            bgColor="bg-emerald-500/10"
            border="border-emerald-500/20"
          />
        </div>

        <div className="absolute bottom-[35%] -left-[25%] z-40">
           <ForensicTag 
            delay={2} 
            icon={<AlertCircle className="w-4 h-4"/>} 
            label="DCT_TAMPER_DETECTED" 
            color="text-rose-500" 
            bgColor="bg-rose-500/10"
            border="border-rose-500/20"
          />
        </div>

        <div className="absolute top-[55%] -right-[15%] z-40">
           <ForensicTag 
            delay={3.5} 
            icon={<Fingerprint className="w-4 h-4"/>} 
            label="BIOMETRIC_VERIFIED" 
            color="text-brand-500" 
            bgColor="bg-brand-500/10"
            border="border-brand-500/20"
          />
        </div>

        {/* Scanning Beam */}
        <motion.div
          className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-brand-500/20 to-transparent pointer-events-none z-30"
          initial={{ top: '-10%' }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="h-[2px] w-full bg-brand-500 shadow-[0_0_25px_rgba(20,184,166,1)]" />
        </motion.div>
        </motion.div>
      </div>

      {/* Decorative Floating Nodes */}
      <FloatingNode delay={0} x="-220px" y="-150px" size="w-16 h-16" icon={<ShieldCheck className="w-8 h-8"/>}/>
      <FloatingNode delay={2.5} x="240px" y="120px" size="w-14 h-14" icon={<Search className="w-7 h-7"/>}/>
      <FloatingNode delay={5} x="-180px" y="180px" size="w-20 h-20" icon={<FileText className="w-9 h-9"/>}/>

      {/* Branding Overlay */}
      <div className="absolute top-8 left-8 z-50 flex items-center gap-3 opacity-60 dark:opacity-40 select-none pointer-events-none">
        <OwlLogo className="w-6 h-6 text-brand-500" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">DeepScan.AI</span>
      </div>

      {/* Ambient Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-brand-500/30 rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%" 
            }}
            animate={{ 
              y: ["-10%", "110%"],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 5 + Math.random() * 5, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ForensicTag: React.FC<{ delay: number; icon: React.ReactNode; label: string; color: string; bgColor: string; border: string }> = ({ delay, icon, label, color, bgColor, border }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5, x: 20 }}
    whileInView={{ opacity: 1, scale: 1, x: 0 }}
    transition={{ delay, duration: 0.8, type: "spring", stiffness: 100 }}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl ${bgColor} border ${border} ${color} backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)]`}
  >
    {icon}
    <span className="text-[11px] font-black uppercase tracking-[0.1em] whitespace-nowrap">{label}</span>
  </motion.div>
);

const FloatingNode: React.FC<{ delay: number; x: string; y: string; size: string; icon: React.ReactNode }> = ({ delay, x, y, size, icon }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ 
      opacity: [0, 0.6, 0.4, 0.6, 0],
      scale: [0.9, 1.1, 1],
      x: [x, (parseInt(x) + 30) + 'px', x],
      y: [y, (parseInt(y) - 40) + 'px', y],
    }}
    transition={{ delay, duration: 10, repeat: Infinity, ease: "easeInOut" }}
    className={`${size} absolute rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-center text-brand-500 z-10 backdrop-blur-sm bg-opacity-80`}
  >
    {icon}
  </motion.div>
);
