import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const MAX_FREE_SCANS = 2;

export default function Demo() {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scansUsed, setScansUsed] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    // Load local storage usage
    const usage = localStorage.getItem('deepscan_demo_usage');
    if (usage) {
      setScansUsed(parseInt(usage, 10));
    }
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (scansUsed >= MAX_FREE_SCANS) {
      setShowPaywall(true);
      return;
    }

    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      simulateScan();
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    setResult(null);

    // Mock scanning delay
    setTimeout(() => {
      setIsScanning(false);
      setResult({
        authenticity: 'Suspicious',
        confidence: '89%',
        data: {
          fullName: 'John Doe',
          documentId: 'A12345678',
          dob: '1990-01-01'
        }
      });
      const newUsage = scansUsed + 1;
      setScansUsed(newUsage);
      localStorage.setItem('deepscan_demo_usage', newUsage.toString());
    }, 3000);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pt-12 pb-24 relative px-6">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Live Verification Engine</h1>
          <p className="text-slate-700 text-lg">Upload a document to test our extraction and forgery detection.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-sm">
            <span className={scansUsed >= MAX_FREE_SCANS ? 'text-red-400' : 'text-brand-400'}>
              {MAX_FREE_SCANS - scansUsed} free scans remaining
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT: Uploader */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Input Source</h2>
              <Scan className="text-brand-500 w-5 h-5" />
            </div>

            {!isScanning && !file && (
              <label className="flex-1 border-2 border-dashed border-slate-700 hover:border-brand-500/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/50 hover:bg-slate-900 min-h-[300px]">
                <Upload className="w-10 h-10 text-slate-800 mb-4" />
                <span className="text-slate-300 font-medium mb-1">Click or drag document</span>
                <span className="text-slate-800 text-sm">JPEG, PNG, or PDF up to 10MB</span>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUpload} />
              </label>
            )}

            {isScanning && (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative w-32 h-32 mb-8">
                  <motion.div 
                    className="absolute inset-0 border-4 border-slate-800 rounded-full"
                  />
                  <motion.div 
                    className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <Scan className="w-10 h-10 text-brand-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2 animate-pulse">Running AI Models...</h3>
                <p className="text-slate-700 text-sm">Extracting text & checking for digital tampering</p>
              </div>
            )}

            {!isScanning && file && (
               <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] border-2 border-solid border-slate-800 rounded-xl bg-slate-950">
                  <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-brand-500" />
                  </div>
                  <span className="text-white font-medium">{file.name}</span>
                  <button 
                    onClick={() => setFile(null)} 
                    className="mt-6 text-sm text-slate-700 hover:text-white"
                  >
                    Upload different file
                  </button>
               </div>
            )}
          </div>

          {/* RIGHT: Results */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col relative h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Extraction & Analysis</h2>
              {result && (
                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase flex items-center gap-1 border border-red-500/30">
                  <ShieldAlert className="w-3 h-3" /> Suspicious
                </span>
              )}
            </div>

            {!result && !isScanning ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-800 min-h-[300px] text-center">
                 <Lock className="w-12 h-12 mb-4 opacity-50" />
                 <p>Upload a document to view extraction outputs and forgery scores.</p>
              </div>
            ) : isScanning ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <div className="w-full h-4 bg-slate-800 rounded animate-pulse" />
                <div className="w-3/4 h-4 bg-slate-800 rounded animate-pulse" />
                <div className="w-full h-4 bg-slate-800 rounded animate-pulse" />
                <div className="w-5/6 h-4 bg-slate-800 rounded animate-pulse" />
              </div>
            ) : result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <h3 className="text-red-400 font-semibold mb-1 flex items-center gap-2">
                    Risk Score: {result.confidence}
                  </h3>
                  <p className="text-sm text-slate-300">
                    Warning: Pixel manipulation detected in the portrait region. Document is likely synthetic.
                  </p>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="text-xs text-slate-800 uppercase">Full Name</label>
                    <div className="text-white font-medium">{result.data.fullName}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-800 uppercase">Document ID</label>
                    <div className="text-transparent text-shadow-blur blur-sm select-none">
                      {result.data.documentId}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-800 uppercase">Date of Birth</label>
                    <div className="text-transparent text-shadow-blur blur-sm select-none">
                      {result.data.dob}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-3">
                  <p className="text-xs text-center text-slate-700">
                    Free demo accounts only show partial extraction. Create an account to view full data payloads.
                  </p>
                  <Link 
                    to="/auth" 
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-center hover:opacity-90 transition-opacity"
                  >
                    Unlock Full Results
                  </Link>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>

      {/* Paywall Popup */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-8 shadow-2xl relative text-center"
            >
              <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Daily Limit Reached</h2>
              <p className="text-slate-700 mb-8">
                You've used your free demo scans. Upgrade to unlock unlimited usage, API access, and full data extraction.
              </p>
              <div className="flex flex-col gap-3">
                <Link 
                  to="/pricing" 
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-glow to-brand-300 text-brand-950 font-bold hover:opacity-90"
                >
                  View Pricing Plans
                </Link>
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="w-full py-3 rounded-lg bg-transparent text-slate-700 hover:text-white"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
