import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Database,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Zap,
  ArrowRight
} from 'lucide-react';

const stages = [
  { id: 'upload', icon: Upload, label: 'Mass Upload', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'verify', icon: Database, label: 'Identity Verification', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'detect', icon: ShieldAlert, label: 'Forensic Detection', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'result', icon: CheckCircle2, label: 'AI Verdict', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export default function PipelineShowcase() {
  const [activeStage, setActiveStage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  return (
    <div className="w-full max-w-6xl mx-auto p-8 aspect-[16/9] bg-slate-900 border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-between">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Dynamic Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] blur-[120px] rounded-full transition-colors duration-1000 opacity-20 ${
        activeStage === 0 ? 'bg-blue-500' :
        activeStage === 1 ? 'bg-indigo-500' :
        activeStage === 2 ? 'bg-rose-500' :
        'bg-emerald-500'
      }`} />

      {/* Header */}
      <div className="relative z-10 text-center space-y-2 mt-4">
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">DeepScan Autonomous Pipeline</h2>
        <div className="flex items-center justify-center gap-4 text-slate-400 font-mono text-xs uppercase tracking-[0.2em]">
          <span className={activeStage === 0 ? 'text-blue-400' : ''}>Ingest</span>
          <ArrowRight className="w-3 h-3 opacity-30" />
          <span className={activeStage === 1 ? 'text-indigo-400' : ''}>Audit</span>
          <ArrowRight className="w-3 h-3 opacity-30" />
          <span className={activeStage === 2 ? 'text-rose-400' : ''}>Forensics</span>
          <ArrowRight className="w-3 h-3 opacity-30" />
          <span className={activeStage === 3 ? 'text-emerald-400' : ''}>Verdict</span>
        </div>
      </div>

      {/* Animated Pipeline Workspace */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Stage 1: UPLOAD */}
          {activeStage === 0 && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="relative flex flex-col items-center gap-12"
            >
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                 {Array.from({ length: 12 }).map((_, i) => (
                   <motion.div
                     key={i}
                     initial={{ y: 200, opacity: 0, rotate: -10 }}
                     animate={{ y: 0, opacity: 1, rotate: 0 }}
                     transition={{ 
                       delay: i * 0.1, 
                       duration: 0.8,
                       type: 'spring',
                       stiffness: 100
                     }}
                     className="w-12 h-16 bg-white/5 border border-white/10 rounded-lg backdrop-blur-xl flex items-center justify-center relative overflow-hidden group shadow-lg"
                   >
                      <FileText className="w-5 h-5 text-blue-400/40 group-hover:text-blue-400 transition-colors" />
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500/30" />
                   </motion.div>
                 ))}
              </div>
              <motion.div 
                animate={{ 
                  scale: [1, 1.15, 1],
                  boxShadow: ['0 0 20px rgba(59,130,246,0.1)', '0 0 50px rgba(59,130,246,0.3)', '0 0 20px rgba(59,130,246,0.1)']
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 rounded-[2.5rem] bg-blue-500/10 border-2 border-dashed border-blue-500/40 flex items-center justify-center shadow-2xl"
              >
                 <Upload className="w-14 h-14 text-blue-500" />
              </motion.div>
              <div className="text-center">
                 <p className="text-2xl font-black text-white uppercase tracking-tighter">High-Throughput Ingestion</p>
                 <p className="text-slate-500 text-sm font-medium">Processing massive document streams concurrently...</p>
              </div>
            </motion.div>
          )}

          {/* Stage 2: VERIFY */}
          {activeStage === 1 && (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex flex-col items-center gap-8"
            >
               <div className="relative w-96 h-56">
                  {/* Database Grid */}
                  <div className="absolute inset-0 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/20 overflow-hidden">
                     <div className="flex flex-wrap gap-1.5 p-4 opacity-30">
                        {Array.from({ length: 80 }).map((_, i) => (
                           <motion.div 
                            key={i}
                            animate={{ 
                              backgroundColor: ['rgba(99,102,241,0.1)', 'rgba(99,102,241,0.6)', 'rgba(99,102,241,0.1)'],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 1.5, delay: Math.random() * 2 }}
                            className="w-5 h-5 bg-indigo-500 rounded-sm" 
                           />
                        ))}
                     </div>
                  </div>
                  {/* Moving Document Icon */}
                  <motion.div 
                    animate={{ rotateY: [0, 180, 180, 360], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-32 bg-slate-900/80 rounded-2xl border-2 border-indigo-400/50 backdrop-blur-3xl flex flex-col items-center justify-center shadow-2xl z-20"
                  >
                    <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
                    <Search className="w-10 h-10 text-indigo-400 relative z-10" />
                    <div className="mt-3 w-16 h-1 bg-indigo-900 rounded-full overflow-hidden relative z-10">
                       <motion.div 
                        animate={{ left: ['-100%', '100%'] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="relative w-full h-full bg-indigo-400 shadow-[0_0_10px_#818cf8]"
                       />
                    </div>
                  </motion.div>
                  {/* Search Waves */}
                  <div className="absolute -inset-12 border-2 border-indigo-500/10 rounded-full animate-ping opacity-20" />
                  <div className="absolute -inset-24 border border-indigo-500/5 rounded-full animate-ping opacity-10" />
               </div>
               <div className="text-center">
                  <p className="text-2xl font-black text-white uppercase tracking-tighter">Global Identity Synchronization</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                     <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                     <p className="text-slate-400 text-xs font-mono tracking-widest font-bold">MATCHING RECORDS IN CENTRAL REGISTRY...</p>
                  </div>
               </div>
            </motion.div>
          )}

          {/* Stage 3: DETECT */}
          {activeStage === 2 && (
            <motion.div 
              key="detect"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="flex flex-col items-center gap-8"
            >
               <div className="relative w-80 h-[28rem] bg-slate-950 rounded-[2.5rem] border-8 border-white/5 overflow-hidden shadow-2xl group">
                  {/* Document Content Simulation */}
                  <div className="p-8 space-y-6">
                     <div className="w-32 h-6 bg-slate-800/80 rounded-lg" />
                     <div className="space-y-3">
                        <div className="w-full h-2.5 bg-slate-800/40 rounded" />
                        <div className="w-full h-2.5 bg-slate-800/40 rounded" />
                        <div className="w-5/6 h-2.5 bg-slate-800/40 rounded" />
                     </div>
                     <div className="pt-12 flex items-start justify-between gap-4">
                        <div className="w-16 h-16 rounded-2xl border-2 border-slate-800 bg-slate-900/50" />
                        <div className="flex-1 space-y-3">
                           <div className="w-full h-3 bg-slate-800/60 rounded" />
                           <div className="w-2/3 h-3 bg-slate-800/60 rounded" />
                        </div>
                     </div>
                     <div className="pt-12 space-y-3">
                        <div className="w-full h-2 bg-slate-800/30 rounded" />
                        <div className="w-3/4 h-2 bg-slate-800/30 rounded" />
                     </div>
                  </div>

                  {/* Red Scanner Line */}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1.5 bg-rose-500 shadow-[0_0_25px_rgba(244,63,94,1),0_0_60px_rgba(244,63,94,0.5)] z-30"
                  />

                  {/* Alert Points (Nodes) */}
                  {[
                    { t: '15%', l: '20%' }, { t: '18%', l: '25%' },
                    { t: '55%', l: '70%' }, { t: '58%', l: '65%' },
                    { t: '80%', l: '40%' }
                  ].map((pos, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: [1, 1.5, 1] }}
                      transition={{ delay: 0.5 + (i * 0.4), repeat: Infinity, duration: 2 }}
                      className="absolute w-4 h-4 z-20"
                      style={{ top: pos.t, left: pos.l }}
                    >
                      <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75" />
                      <div className="relative w-full h-full bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,1)]" />
                    </motion.div>
                  ))}

                  {/* Heatmap Glows */}
                  <motion.div 
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute top-[50%] right-[15%] w-32 h-24 bg-rose-600/30 blur-3xl rounded-full z-10" 
                  />
               </div>
               <div className="text-center">
                  <p className="text-2xl font-black text-rose-500 flex items-center gap-3 tracking-tighter">
                    <Zap className="w-6 h-6 animate-bounce" />
                    FORENSIC SPECTRAL ANALYSIS
                  </p>
                  <p className="text-slate-500 text-xs font-black tracking-widest mt-1 uppercase">ISOLATING ANOMALOUS DCT COEFFICIENTS...</p>
               </div>
            </motion.div>
          )}

          {/* Stage 4: RESULT */}
          {activeStage === 3 && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-16"
            >
               <div className="flex items-center gap-32 relative">
                  {/* Separation Lines */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-px bg-white/5 hidden md:block" />
                  
                  {/* Authentic Result */}
                  <motion.div 
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center gap-6"
                  >
                     <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.4)] border-4 border-white/20">
                        <CheckCircle2 className="w-16 h-16 text-white" />
                     </div>
                     <div className="text-center">
                        <p className="text-emerald-400 font-black tracking-widest text-sm uppercase">Authentic Profile</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">Verified Entity</p>
                     </div>
                  </motion.div>

                  {/* Fraudulent Result */}
                  <motion.div 
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center gap-6"
                  >
                     <div className="w-32 h-32 rounded-[2.5rem] bg-rose-500 flex items-center justify-center shadow-[0_0_60px_rgba(244,63,94,0.4)] border-4 border-white/20">
                        <XCircle className="w-16 h-16 text-white" />
                     </div>
                     <div className="text-center">
                        <p className="text-rose-400 font-black tracking-widest text-sm uppercase">Forged Entity</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">Tampered Record</p>
                     </div>
                  </motion.div>
               </div>

               <div className="max-w-md text-center space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                     <p className="text-slate-400 text-sm italic">
                        "The system has successfully classified the document batch with a 99.8% precision score using ensemble deep learning models."
                     </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline Navigator */}
      <div className="relative z-10 w-full px-12 mb-8">
        <div className="flex justify-between items-center relative">
          {/* Progress Bar Background */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2" />
          {/* Active Progress Bar */}
          <motion.div 
            animate={{ width: `${(activeStage / 3) * 100}%` }}
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 -translate-y-1/2 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
          />
          
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isActive = activeStage === i;
            const isCompleted = activeStage > i;

            return (
              <button
                key={stage.id}
                onClick={() => { setActiveStage(i); setIsAutoPlaying(false); }}
                className="relative group flex flex-col items-center gap-3"
              >
                <div className={`w-12 h-12 rounded-xl transition-all duration-500 flex items-center justify-center z-10 border-2 ${
                  isActive ? `${stage.bg} ${stage.color} border-${stage.color.split('-')[1]}-500/50 scale-125 shadow-lg` :
                  isCompleted ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                  'bg-slate-800 text-slate-500 border-white/5'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {!isActive && (
                   <span className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap uppercase tracking-widest border border-white/10">
                      {stage.label}
                   </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Presentation Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-4">
         <button 
           onClick={() => setIsAutoPlaying(!isAutoPlaying)}
           className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
         >
           {isAutoPlaying ? 'Pause Story' : 'Resume Story'}
         </button>
      </div>

      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-white/10 rounded-tl-[3rem] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-white/10 rounded-br-[3rem] pointer-events-none" />
    </div>
  );
}
