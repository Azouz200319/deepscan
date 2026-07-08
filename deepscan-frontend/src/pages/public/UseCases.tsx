import { Building2, GraduationCap, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function UseCases() {
  const cases = [
    {
      title: "Financial Services",
      icon: Building2,
      desc: "Banks and fintechs use DeepScan to satisfy KYC requirements automatically.",
      features: [
        "ID & Passport Verification",
        "Utility Bill OCR Extraction",
        "Watchlist Cross-referencing"
      ],
      image: "bg-gradient-to-br from-brand-900 to-slate-900"
    },
    {
      title: "Academic Institutions",
      icon: GraduationCap,
      desc: "Universities verify international student diplomas and stop credential fraud.",
      features: [
        "Transcript Tamper Detection",
        "Translation OCR Verification",
        "Automated Admission Checks"
      ],
      image: "bg-gradient-to-br from-slate-900 to-brand-900"
    },
    {
      title: "Gig Economy & Marketplaces",
      icon: ShieldAlert,
      desc: "Marketplaces trust our AI to vet users before they interact with their platform.",
      features: [
        "Driver's License Extraction",
        "Real-time Selfie Matching (Coming Soon)",
        "Fraud Network Detection"
      ],
      image: "bg-gradient-to-tr from-brand-950 to-brand-800"
    }
  ];

  return (
    <div className="pt-24 pb-32 px-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6">Built for scale. Designed for security.</h1>
          <p className="text-slate-800 text-lg max-w-2xl mx-auto leading-relaxed">
            From emerging startups to fortune 500 banks, DeepScan secures user onboarding and compliance worldwide.
          </p>
        </div>

        <div className="space-y-32">
          {cases.map((useCase, idx) => (
            <div key={idx} className={`flex flex-col md:flex-row gap-16 items-center ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1 space-y-8">
                <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
                  <useCase.icon className="w-8 h-8" />
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{useCase.title}</h2>
                <p className="text-slate-800 text-lg leading-relaxed">{useCase.desc}</p>
                <ul className="space-y-5 pt-4">
                  {useCase.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-4">
                      <div className="bg-emerald-50 rounded-full p-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-slate-700 font-semibold">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className={`aspect-video rounded-[40px] bg-slate-50 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative group p-8`}>
                   <div className="w-full h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
                     <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                     </div>
                     <div className="p-6 space-y-4">
                       <div className="w-full h-12 bg-slate-50 rounded-xl animate-pulse"></div>
                       <div className="w-3/4 h-6 bg-slate-50 rounded-lg"></div>
                       <div className="w-1/2 h-6 bg-slate-50 rounded-lg"></div>
                       <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="w-full h-24 bg-brand-50/50 rounded-2xl border border-brand-100"></div>
                        <div className="w-full h-24 bg-slate-50 rounded-2xl border border-slate-100"></div>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
