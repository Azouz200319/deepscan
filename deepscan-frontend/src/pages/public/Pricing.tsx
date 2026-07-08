import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: "Free",
      desc: "For testing and evaluation",
      price: "$0",
      features: [
        "Up to 50 scans / month",
        "Partial data extraction",
        "Basic identity verification",
        "Community support"
      ],
      notIncluded: [
        "API Access",
        "Advanced Forgery Detection",
        "Dedicated Account Manager"
      ],
      cta: "Get Started",
      link: "/auth"
    },
    {
      name: "Pro",
      desc: "For growing verification needs",
      price: isYearly ? "$199" : "$249",
      period: "/month",
      highlight: true,
      features: [
        "Up to 5,000 scans / month",
        "Full structured data extraction",
        "Advanced Forgery Detection UI",
        "Priority Email Support",
        "Dashboard Access"
      ],
      notIncluded: [
        "Unlimited API Access",
        "Dedicated Account Manager"
      ],
      cta: "Start 14-Day Trial",
      link: "/auth"
    },
    {
      name: "Enterprise",
      desc: "Uncapped scaling via API",
      price: "Custom",
      features: [
        "Unlimited scans",
        "99.9% SLA Uptime",
        "On-premise deployment options",
        "Dedicated Account Manager",
        "Full API Access & Webhooks"
      ],
      notIncluded: [],
      cta: "Contact Sales",
      link: "/use-cases"
    }
  ];

  return (
    <div className="pt-24 pb-32 px-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6">Simple, transparent pricing</h1>
          <p className="text-slate-800 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Start free, scale securely. Choose the plan that fits your volume and verification requirements.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full p-1.5 mx-auto">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${!isYearly ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-800 hover:text-slate-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isYearly ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' : 'text-slate-800 hover:text-slate-700'}`}
            >
              Yearly
              {isYearly && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] uppercase tracking-wider">Save 20%</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-white rounded-[32px] p-10 border transition-all hover:shadow-2xl hover:shadow-slate-200/50 ${plan.highlight ? 'border-brand-500 shadow-xl shadow-brand-100 ring-1 ring-brand-100' : 'border-slate-100 shadow-sm'} flex flex-col`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-200">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-3xl font-extrabold text-slate-900 mb-3">{plan.name}</h3>
                <p className="text-slate-800 font-medium">{plan.desc}</p>
              </div>

              <div className="mb-10 flex items-end gap-1">
                <span className="text-6xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                {plan.period && <span className="text-slate-700 font-bold mb-2 ml-1 text-lg">{plan.period}</span>}
              </div>

              <Link
                to={plan.link}
                className={`w-full py-5 rounded-2xl text-center font-bold tracking-tight transition-all mb-10 text-lg ${plan.highlight ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-100 active:scale-95' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'}`}
              >
                {plan.cta}
              </Link>

              <div className="space-y-4 flex-1">
                <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Includes</div>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="bg-brand-50 rounded-full p-1 mt-0.5">
                      <Check className="w-4 h-4 text-brand-500 shrink-0" />
                    </div>
                    <span className="text-slate-900 font-medium">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature, i) => (
                  <div key={i} className="flex items-start gap-4 opacity-50">
                    <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                    <span className="text-slate-700 line-through">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
