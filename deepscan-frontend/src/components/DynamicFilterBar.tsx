import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function DynamicFilterBar() {
  const { universities, domains, filieres, selectedUniversity, selectedDomain, selectedFiliere, setSelectedUniversity, setSelectedDomain, setSelectedFiliere } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`fixed right-0 top-20 z-40 transition-all duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Glassmorphism floating panel */}
      <div className="backdrop-blur-lg bg-gradient-to-br from-brand-50 to-brand-100 dark:bg-slate-900/60 border-2 border-brand-200 dark:border-slate-800 rounded-2xl shadow-2xl m-4 p-6 min-w-[350px] max-w-[400px]">
        {/* Title */}
        <h3 className="text-lg font-bold text-brand-900 dark:text-white mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-400"></div>
          Filter Records
        </h3>

        <div className="space-y-4">
          {/* University Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-900 dark:text-slate-300">University</label>
            <div className="relative group">
              <button
                onClick={() => setSelectedUniversity(selectedUniversity ? null : (universities[0] || null))}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-brand-200 dark:border-slate-700 rounded-lg text-brand-900 dark:text-white text-left flex items-center justify-between hover:bg-brand-50 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <span className="truncate font-medium">{selectedUniversity?.name || 'Select university...'}</span>
                <ChevronDown size={16} className={`transition-transform ${selectedUniversity ? 'rotate-180' : ''}`} />
              </button>

              {selectedUniversity === null && universities.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-purple-300 rounded-lg shadow-xl overflow-hidden z-10 max-h-60 overflow-y-auto">
                  {universities.map((university) => (
                    <button
                      key={university.id}
                      onClick={() => {
                        setSelectedUniversity(university);
                        setIsOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-brand-900 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      {university.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Domain Dropdown */}
          {selectedUniversity && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-sm font-semibold text-blue-900">Domain</label>
              <div className="relative group">
                <button
                  onClick={() => setSelectedDomain(selectedDomain ? null : (domains[0] || null))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-brand-200 dark:border-slate-700 rounded-lg text-brand-900 dark:text-white text-left flex items-center justify-between hover:bg-brand-50 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <span className="truncate font-medium">{selectedDomain?.name || 'Select domain...'}</span>
                  <ChevronDown size={16} className={`transition-transform ${selectedDomain ? 'rotate-180' : ''}`} />
                </button>

                {selectedDomain === null && domains.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-300 rounded-lg shadow-xl overflow-hidden z-10 max-h-60 overflow-y-auto">
                    {domains.map((domain) => (
                      <button
                        key={domain.id}
                        onClick={() => {
                          setSelectedDomain(domain);
                          setIsOpen(true);
                        }}
                        className="w-full px-4 py-2 text-left text-brand-900 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        {domain.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filiere Dropdown */}
          {selectedDomain && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-sm font-semibold text-blue-900">Filiere</label>
              <div className="relative group">
                <button
                  onClick={() => setSelectedFiliere(selectedFiliere ? null : (filieres[0] || null))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-brand-200 dark:border-slate-700 rounded-lg text-brand-900 dark:text-white text-left flex items-center justify-between hover:bg-brand-50 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <span className="truncate font-medium">{selectedFiliere?.name || 'Select filiere...'}</span>
                  <ChevronDown size={16} className={`transition-transform ${selectedFiliere ? 'rotate-180' : ''}`} />
                </button>

                {selectedFiliere === null && filieres.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-cyan-300 rounded-lg shadow-xl overflow-hidden z-10 max-h-60 overflow-y-auto">
                    {filieres.map((filiere) => (
                      <button
                        key={filiere.id}
                        onClick={() => {
                          setSelectedFiliere(filiere);
                          setIsOpen(true);
                        }}
                        className="w-full px-4 py-2 text-left text-brand-900 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        {filiere.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Summary */}
          {(selectedUniversity || selectedDomain || selectedFiliere) && (
            <div className="mt-4 pt-4 border-t-2 border-blue-200 space-y-1 animate-fadeIn">
              {selectedUniversity && <p className="text-sm text-purple-700 font-medium">🏛️ {selectedUniversity.name}</p>}
              {selectedDomain && <p className="text-sm text-blue-700 font-medium">📚 {selectedDomain.name}</p>}
              {selectedFiliere && <p className="text-sm text-cyan-700 font-medium">🎓 {selectedFiliere.name}</p>}
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-10 top-8 w-8 h-8 bg-gradient-to-r from-brand-500 to-brand-400 rounded-lg flex items-center justify-center text-white shadow-lg hover:shadow-brand-500/50 transition-all font-bold"
        >
          {isOpen ? '›' : '‹'}
        </button>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
