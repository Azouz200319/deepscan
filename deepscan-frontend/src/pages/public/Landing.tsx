import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Scan, ArrowRight } from 'lucide-react';
import { ForensicVisual } from '../../components/ForensicVisual';

export default function Landing() {
  return (
    <div className="flex flex-col items-center">

      {/* HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-32 pb-24 lg:pt-48 lg:pb-32 flex flex-col items-center text-center">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-semibold mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            DeepScan AI 2.0 is now live
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8">
            Detect Fraud.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-400 to-brand-700">
              Verify Documents. Instantly.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-700 dark:text-slate-800 mb-10 max-w-3xl mx-auto leading-relaxed">
            Algeria's first AI platform to automate document verification and forensic extraction,
            powering the <span className="text-brand-500 font-bold">4th Generation of Universities</span> for a secure digital future.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="px-8 py-4 rounded-full text-white font-bold bg-brand-500 hover:bg-brand-600 shadow-[0_20px_40px_rgba(59,130,246,0.25)] transition-all hover:scale-105 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Try Free Demo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/auth"
              className="px-8 py-4 rounded-full text-slate-700 dark:text-slate-200 font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all shadow-sm w-full sm:w-auto justify-center flex"
            >
              Get Started
            </Link>
          </div>
        </motion.div>

        {/* 3D Visual Element */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative mt-20 z-10 w-full max-w-5xl"
        >
          <div className="relative rounded-[48px] border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] flex items-center justify-center min-h-[600px]">
            <ForensicVisual />
          </div>
        </motion.div>
      </section>

      {/* TRUST SECTION */}
      <section className="w-full border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-800 uppercase tracking-[0.2em] mb-10">
            Trusted by modern teams for secure verification
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-extrabold text-slate-900 dark:text-white mb-2">100K+</span>
              <span className="text-sm font-semibold text-slate-800">Documents Analyzed</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-extrabold text-brand-500 mb-2">99.9%</span>
              <span className="text-sm font-semibold text-slate-800">Accuracy Rate</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-extrabold text-slate-900 mb-2">&lt;5s</span>
              <span className="text-sm font-semibold text-slate-800">Processing Time</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-extrabold text-brand-500 mb-2">10K+</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-700">Fraud Prevented</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">Built for ultimate security</h2>
          <p className="text-slate-800 max-w-2xl mx-auto text-lg leading-relaxed">
            Our proprietary AI pipeline extracts, verifies, and cross-references data faster than humanly possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Scan,
              title: "OCR Data Extraction",
              description: "Instantly turn images and PDFs into clean, structured JSON data with perfect accuracy."
            },
            {
              icon: ShieldCheck,
              title: "Identity Verification",
              description: "Match faces, verify holograms, and validate IDs against global databases in real-time."
            },
            {
              icon: Zap,
              title: "Forgery Detection",
              description: "Our core AI detects pixel manipulation, digital tampering, and synthetic documents instantly."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -10 }}
              className="p-10 rounded-[32px] bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(20,184,166,0.1)] transition-all group relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-8 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h3>
              <p className="text-slate-800 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full py-32 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">How it works</h2>
            <p className="text-slate-800 max-w-2xl mx-auto text-lg leading-relaxed">
              Integration is fully frictionless. Three steps to complete security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-1 bg-slate-200 rounded-full" />

            {[
              { step: "01", title: "Upload Image", desc: "Submit the document via Demo, Dashboard, or API endpoint." },
              { step: "02", title: "AI Analyzes", desc: "Our models perform OCR, verification, and tamper analysis in < 2s." },
              { step: "03", title: "Get Results", desc: "Receive structured data and an authenticity score immediately." }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center relative z-10">
                <div className="w-20 h-20 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-brand-600 text-2xl font-bold mb-8 shadow-sm">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{item.title}</h3>
                <p className="text-slate-800 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="w-full max-w-5xl mx-auto px-6 py-40 text-center">
        <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-8">Ready to secure your workflow?</h2>
        <p className="text-xl text-slate-800 mb-12 max-w-2xl mx-auto leading-relaxed">Join leading companies using DeepScan to eliminate document fraud and automate data entry.</p>
      </section>

    </div>
  );
}
