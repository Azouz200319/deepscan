import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertTriangle, Badge, User, GraduationCap, MapPin, Calendar, BookOpen, School, Tag } from 'lucide-react';

interface StudentData {
  id: string;
  nom_prenom: string;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
  source?: string;
  verify_status?: string | null;
  verify_diff_json?: string | null;
  extracted_fields?: Record<string, string | null> | null;
}

interface StudentDocumentOverlayProps {
  isOpen: boolean;
  student: StudentData | null;
  onClose: () => void;
  isHistory?: boolean;
}

export default function StudentDocumentOverlay({ isOpen, student, onClose, isHistory = false }: StudentDocumentOverlayProps) {
  if (!student) return null;

  const getStatusDetails = (status?: string | null) => {
    const s = status?.toLowerCase();
    
    if (s === 'verified' || s === 'match') {
      return { 
        label: 'MATCHED', 
        color: 'text-emerald-600 dark:text-emerald-400', 
        bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', 
        borderColor: 'border-emerald-200 dark:border-emerald-500/30',
        StampIcon: CheckCircle2 
      };
    }
    
    if (s === 'flagged' || s === 'mismatch') {
      return { 
        label: 'MISMATCHED', 
        color: 'text-rose-600 dark:text-rose-400', 
        bgColor: 'bg-rose-50 dark:bg-rose-500/10', 
        borderColor: 'border-rose-200 dark:border-rose-500/30',
        StampIcon: XCircle 
      };
    }
    
    if (s === 'not_found') {
      return { 
        label: 'NOT FOUND', 
        color: 'text-amber-600 dark:text-amber-400', 
        bgColor: 'bg-amber-50 dark:bg-amber-500/10', 
        borderColor: 'border-amber-200 dark:border-amber-500/30',
        StampIcon: AlertTriangle 
      };
    }

    // Default Fallbacks
    if (s === 'pending') {
       return {
          label: isHistory ? 'PENDING' : 'RECORDED',
          color: isHistory ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-700',
          bgColor: isHistory ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-slate-800/50',
          borderColor: isHistory ? 'border-amber-200 dark:border-amber-500/30' : 'border-slate-200 dark:border-slate-700',
          StampIcon: isHistory ? AlertTriangle : Badge
       };
    }

    return { 
      label: 'RECORDED', 
      color: 'text-slate-900 dark:text-slate-700', 
      bgColor: 'bg-slate-50 dark:bg-slate-800/50', 
      borderColor: 'border-slate-200 dark:border-slate-700',
      StampIcon: Badge 
    };
  };

  const status = getStatusDetails(student.verify_status);
  const diffFields = Array.isArray(student.verify_diff_json)
    ? student.verify_diff_json
    : typeof student.verify_diff_json === 'string'
      ? JSON.parse(student.verify_diff_json)
      : [];

  const isFieldMismatched = (key: string) => diffFields.includes(key);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
          />

          {/* Document Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20, rotate: 2 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#fdfbf7] dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-none rounded-sm overflow-hidden pointer-events-auto flex flex-col md:flex-row border border-transparent dark:border-slate-800"
              style={{
                backgroundImage: 'radial-gradient(#e5e7eb 0.5px, transparent 0.5px)',
                backgroundSize: '20px 20px',
              }}
            >
              {/* Paper Texture Overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-slate-700 hover:text-slate-900 transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Sidebar - Profile & Status */}
              <div className="w-full md:w-40 bg-slate-50/50 dark:bg-slate-800/30 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center gap-3">
                {/* Profile Image Placeholder */}
                <div className="relative group">
                  <div className="w-20 h-24 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-1 shadow-sm rotate-1 group-hover:rotate-0 transition-transform duration-300">
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                      <User className="w-8 h-8 text-slate-300 dark:text-slate-900" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-200/50 dark:from-slate-900/50 to-transparent" />
                    </div>
                  </div>
                  {/* Photo Corner Tags (Visual detail) */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-slate-300 dark:border-slate-600" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-slate-300 dark:border-slate-600" />
                </div>

                <div className="text-center">
                  <h3 className={`text-sm font-bold leading-tight ${isFieldMismatched('nom_prenom') ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                    {student.nom_prenom}
                  </h3>
                  {isFieldMismatched('nom_prenom') && student.extracted_fields?.nom_prenom && (
                    <div className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded mt-0.5">
                       Extracted: {student.extracted_fields.nom_prenom}
                    </div>
                  )}
                  <p className="text-[9px] text-slate-800 dark:text-slate-700 font-medium font-mono uppercase tracking-tighter mt-0.5">Student Record</p>
                </div>

                {/* Status Stamp */}
                <motion.div
                  initial={{ scale: 1.5, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: -12 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className={`mt-2 px-3 py-1.5 border-2 ${status.borderColor} ${status.color} ${status.bgColor} font-black text-sm tracking-tighter rounded flex items-center gap-1.5 opacity-80 select-none shadow-sm`}
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.05)' }}
                >
                  <status.StampIcon className="w-4 h-4" />
                  {status.label}
                </motion.div>
              </div>

              {/* Right Side - Information Content */}
              <div className="flex-1 p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-900 dark:text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Academic Information</h2>
                    <p className="text-[9px] text-slate-800 dark:text-slate-700">Official extraction</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  {/* Identity Section */}
                  <div className="space-y-3">
                    <InfoField 
                      icon={Calendar} 
                      label="Date of Birth" 
                      value={student.date_naissance} 
                      extractedValue={student.extracted_fields?.date_naissance}
                      isMismatched={isFieldMismatched('date_naissance')}
                    />
                    <InfoField 
                      icon={MapPin} 
                      label="Place of Birth" 
                      value={student.lieu_naissance} 
                      extractedValue={student.extracted_fields?.lieu_naissance}
                      isMismatched={isFieldMismatched('lieu_naissance')}
                    />
                    <InfoField icon={Tag} label="Record ID" value={student.id} isMono />
                  </div>

                  {/* Academic Section */}
                  <div className="space-y-3">
                    <InfoField 
                      icon={Tag} 
                      label="Domain" 
                      value={student.domaine} 
                      extractedValue={student.extracted_fields?.domaine}
                      isMismatched={isFieldMismatched('domaine')}
                    />
                    <InfoField 
                      icon={GraduationCap} 
                      label="Diploma Type" 
                      value={student.type_diplome} 
                      extractedValue={student.extracted_fields?.type_diplome}
                      isMismatched={isFieldMismatched('type_diplome')}
                    />
                    <InfoField 
                      icon={BookOpen} 
                      label="Field of Study" 
                      value={student.filiere} 
                      extractedValue={student.extracted_fields?.filiere}
                      isMismatched={isFieldMismatched('filiere')}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-slate-100">
                    <InfoField 
                      icon={School} 
                      label="Institution" 
                      value={student.etablissement} 
                      extractedValue={student.extracted_fields?.etablissement}
                      isMismatched={isFieldMismatched('etablissement')}
                    />
                    <InfoField 
                      icon={Badge} 
                      label="Speciality" 
                      value={student.specialite} 
                      extractedValue={student.extracted_fields?.specialite}
                      isMismatched={isFieldMismatched('specialite')}
                    />
                  </div>
                  
                  <div className="md:col-span-2 pt-2">
                     <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm">
                        <div className="flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                           <span className="text-[9px] font-bold text-slate-800 dark:text-slate-700 uppercase tracking-wider">Source</span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-900 dark:text-slate-300 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {student.source || 'Database'}
                        </span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Decorative Corner Fold */}
              <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
                <div className="absolute bottom-0 right-0 w-[141%] h-[141%] bg-slate-100/50 origin-bottom-right rotate-45 border-l border-t border-slate-200 shadow-sm" />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoField({ 
  icon: Icon, 
  label, 
  value, 
  extractedValue, 
  isMismatched, 
  isMono = false 
}: { 
  icon: any, 
  label: string, 
  value: string | null, 
  extractedValue?: string | null,
  isMismatched?: boolean,
  isMono?: boolean 
}) {
  return (
    <div className="group">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={`w-2.5 h-2.5 ${isMismatched ? 'text-rose-500' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`} />
        <span className={`text-[8px] font-black uppercase tracking-widest ${isMismatched ? 'text-rose-600' : 'text-slate-700'}`}>{label}</span>
      </div>
      <div className="space-y-0.5">
        <div className={`text-xs ${isMono ? 'font-mono' : 'font-semibold'} ${isMismatched ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'} break-words`}>
          {value || '—'}
          {isMismatched && <span className="ml-1 text-[7px] font-bold text-emerald-600/60 uppercase">(DB)</span>}
        </div>
        {isMismatched && (
          <div className="text-[9px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-1 py-0.5 rounded inline-block">
             {extractedValue || 'N/A'}
             <span className="ml-1 text-[7px] font-bold text-rose-600/60 uppercase">(Doc)</span>
          </div>
        )}
      </div>
    </div>
  );
}
