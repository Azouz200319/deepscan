import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertTriangle, User, GraduationCap, School, Tag, ShieldCheck, AlertOctagon, Fingerprint } from 'lucide-react';

interface VerificationData {
  id: string;
  nom_prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
  source?: string | null;
  verify_status?: string | null;
  verify_diff_json?: string | null;
  extracted_fields?: Record<string, string | null> | null;
  verify_name_score?: number;
}

interface VerificationOverlayProps {
  isOpen: boolean;
  student: VerificationData | null;
  onClose: () => void;
}

export default function VerificationOverlay({ isOpen, student, onClose }: VerificationOverlayProps) {
  if (!student) return null;

  const getStatusDetails = (status?: string | null) => {
    const s = status?.toLowerCase();
    
    if (s === 'verified' || s === 'match') {
      return { 
        label: 'Verified', 
        color: 'text-white',
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'shadow-emerald-500/25',
        icon: CheckCircle2 
      };
    }
    
    if (s === 'flagged' || s === 'mismatch') {
      return { 
        label: 'Mismatch', 
        color: 'text-white',
        gradient: 'from-rose-500 to-pink-600',
        glow: 'shadow-rose-500/25',
        icon: XCircle 
      };
    }
    
    if (s === 'not_found') {
      return { 
        label: 'Not Found', 
        color: 'text-white',
        gradient: 'from-amber-500 to-orange-600',
        glow: 'shadow-amber-500/25',
        icon: AlertTriangle 
      };
    }

    return { 
      label: 'Pending', 
      color: 'text-white',
      gradient: 'from-slate-500 to-slate-600',
      glow: 'shadow-slate-500/25',
      icon: ShieldCheck 
    };
  };

  const status = getStatusDetails(student.verify_status);
  const diffFields = Array.isArray(student.verify_diff_json)
    ? student.verify_diff_json
    : typeof student.verify_diff_json === 'string'
      ? JSON.parse(student.verify_diff_json)
      : [];

  const isFieldMismatched = (key: string) => diffFields.includes(key);

  const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.3 }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  })
};

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop with gradient overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60]"
          >
            {/* Floating gradient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </motion.div>

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-[680px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/10 dark:shadow-black/50 overflow-hidden pointer-events-auto border border-white/20 dark:border-slate-700/50"
            >
              {/* Glass overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-slate-800/50 to-transparent pointer-events-none" />

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onClose}
                className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
              >
                <X className="w-4 h-4" />
              </motion.button>

              {/* Main Content */}
              <div className="relative z-10 p-6">
                {/* Profile Header */}
                <motion.div
                  custom={0}
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex items-start gap-5 mb-6"
                >
                  {/* Profile Photo */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-28 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/30 border-2 border-white dark:border-slate-700 overflow-hidden relative group">
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                        <User className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      </div>
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {student.nom_prenom || 'Unknown'}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mb-3">
                      ID: {student.id.slice(0, 12)}...
                    </p>
                    
                    {/* Status Badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${status.gradient} ${status.glow} shadow-lg ${status.color} font-semibold text-xs`}
                    >
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </motion.div>

                    {/* Match Score */}
                    {student.verify_name_score !== undefined && student.verify_name_score > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="inline-flex items-center gap-2 ml-3 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Match</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {Math.round(student.verify_name_score * 100)}%
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Personal Information */}
                  <motion.div
                    custom={1}
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    className="col-span-2 md:col-span-1"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
                        <Fingerprint className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Personal</span>
                    </div>
                    <div className="space-y-2">
                      <FieldCard
                        label="Date of Birth"
                        value={student.date_naissance}
                        extractedValue={student.extracted_fields?.date_naissance}
                        isMismatched={isFieldMismatched('date_naissance')}
                        compact
                      />
                      <FieldCard
                        label="Place of Birth"
                        value={student.lieu_naissance}
                        extractedValue={student.extracted_fields?.lieu_naissance}
                        isMismatched={isFieldMismatched('lieu_naissance')}
                        compact
                      />
                    </div>
                  </motion.div>

                  {/* Academic Information */}
                  <motion.div
                    custom={2}
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    className="col-span-2 md:col-span-1"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                        <GraduationCap className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Academic</span>
                    </div>
                    <div className="space-y-2">
                      <FieldCard
                        label="Diploma Type"
                        value={student.type_diplome}
                        extractedValue={student.extracted_fields?.type_diplome}
                        isMismatched={isFieldMismatched('type_diplome')}
                        compact
                      />
                      <FieldCard
                        label="Domain"
                        value={student.domaine}
                        extractedValue={student.extracted_fields?.domaine}
                        isMismatched={isFieldMismatched('domaine')}
                        compact
                      />
                    </div>
                  </motion.div>

                  {/* Field of Study & Speciality */}
                  <motion.div
                    custom={3}
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    className="col-span-2 md:col-span-1"
                  >
                    <div className="space-y-2">
                      <FieldCard
                        label="Field of Study"
                        value={student.filiere}
                        extractedValue={student.extracted_fields?.filiere}
                        isMismatched={isFieldMismatched('filiere')}
                        compact
                      />
                      <FieldCard
                        label="Speciality"
                        value={student.specialite}
                        extractedValue={student.extracted_fields?.specialite}
                        isMismatched={isFieldMismatched('specialite')}
                        compact
                      />
                    </div>
                  </motion.div>

                  {/* Institution */}
                  <motion.div
                    custom={4}
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    className="col-span-2 md:col-span-1"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                        <School className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Institution</span>
                    </div>
                    <FieldCard
                      label="Institution Name"
                      value={student.etablissement}
                      extractedValue={student.extracted_fields?.etablissement}
                      isMismatched={isFieldMismatched('etablissement')}
                      compact
                    />
                  </motion.div>

                  {/* Source Badge */}
                  <motion.div
                    custom={5}
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    className="col-span-2"
                  >
                    <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Source</span>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        {student.source || 'Extracted'}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function FieldCard({ 
  label, 
  value, 
  extractedValue, 
  isMismatched,
  compact = false 
}: { 
  label: string, 
  value: string | null, 
  extractedValue?: string | null,
  isMismatched?: boolean,
  compact?: boolean 
}) {
  if (isMismatched) {
    return (
      <div className="space-y-2">
        <p className={`font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Database Value */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className={`bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-600/10 rounded-xl border border-emerald-200 dark:border-emerald-500/30 shadow-sm hover:shadow-md transition-all ${compact ? 'p-2.5' : 'p-4'}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-emerald-600 dark:text-emerald-400`} />
              <span className={`font-bold text-emerald-700 dark:text-emerald-300 uppercase ${compact ? 'text-[8px]' : 'text-[10px]'}`}>Database</span>
            </div>
            <p className={`font-semibold text-emerald-900 dark:text-emerald-100 break-words ${compact ? 'text-xs' : 'text-sm'}`}>
              {value || '—'}
            </p>
          </motion.div>
          
          {/* Extracted Value */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className={`bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-500/10 dark:to-rose-600/10 rounded-xl border border-rose-200 dark:border-rose-500/30 shadow-sm hover:shadow-md transition-all ${compact ? 'p-2.5' : 'p-4'}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <AlertOctagon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-rose-600 dark:text-rose-400`} />
              <span className={`font-bold text-rose-700 dark:text-rose-300 uppercase ${compact ? 'text-[8px]' : 'text-[10px]'}`}>Document</span>
            </div>
            <p className={`font-semibold text-rose-900 dark:text-rose-100 break-words ${compact ? 'text-xs' : 'text-sm'}`}>
              {extractedValue || 'N/A'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -1 }}
      className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all ${compact ? 'p-2.5' : 'p-4'}`}
    >
      <p className={`font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</p>
      <p className={`font-semibold text-slate-900 dark:text-white break-words ${compact ? 'text-xs' : 'text-base'}`}>
        {value || '—'}
      </p>
    </motion.div>
  );
}
