import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { X, CheckCircle2, XCircle, Shield, User, GraduationCap, Calendar, School, Tag, Camera } from 'lucide-react';

interface DatabaseRecordData {
  id: string;
  nom_prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
  source: string;
  status: string;
  profile_image?: string | null;
}

interface DatabaseRecordOverlayProps {
  isOpen: boolean;
  record: DatabaseRecordData | null;
  onClose: () => void;
  onImageUpload?: (file: File) => void;
}

export default function DatabaseRecordOverlay({ isOpen, record, onClose, onImageUpload }: DatabaseRecordOverlayProps) {
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!record) return null;

  const getStatusDetails = (status: string) => {
    const s = status?.toLowerCase();
    
    if (s === 'verified') {
      return { 
        label: 'Verified', 
        color: 'text-white',
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'shadow-emerald-500/25',
        icon: CheckCircle2 
      };
    }
    
    if (s === 'flagged') {
      return { 
        label: 'Flagged', 
        color: 'text-white',
        gradient: 'from-rose-500 to-pink-600',
        glow: 'shadow-rose-500/25',
        icon: XCircle 
      };
    }
    
    return { 
      label: 'Recorded', 
      color: 'text-white',
      gradient: 'from-slate-500 to-slate-600',
      glow: 'shadow-slate-500/25',
      icon: Shield 
    };
  };

  const status = getStatusDetails(record.status);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: 0.4
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
        duration: 0.4
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
                  {/* Profile Photo with Upload */}
                  <div 
                    className="relative shrink-0"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    <div 
                      className="w-28 h-32 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/30 border-2 border-white dark:border-slate-700 overflow-hidden relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {record.profile_image ? (
                        <img 
                          src={record.profile_image.startsWith('http') ? record.profile_image : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${record.profile_image}`} 
                          alt={record.nom_prenom || 'Student'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                          <User className="w-14 h-14 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      
                      {/* Upload Overlay */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isHovering ? 1 : 0 }}
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                      >
                        <Camera className="w-6 h-6 text-white" />
                        <span className="text-xs font-semibold text-white">Upload</span>
                      </motion.div>
                      
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {record.nom_prenom || 'Unknown'}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mb-3">
                      ID: {record.id.slice(0, 12)}...
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
                        <Calendar className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Personal</span>
                    </div>
                    <div className="space-y-2">
                      <FieldCard
                        label="Date of Birth"
                        value={record.date_naissance}
                        compact
                      />
                      <FieldCard
                        label="Place of Birth"
                        value={record.lieu_naissance}
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
                        value={record.type_diplome}
                        compact
                      />
                      <FieldCard
                        label="Domain"
                        value={record.domaine}
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
                        value={record.filiere}
                        compact
                      />
                      <FieldCard
                        label="Speciality"
                        value={record.specialite}
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
                      value={record.etablissement}
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
                        {record.source}
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
  compact = false 
}: { 
  label: string, 
  value: string | null,
  compact?: boolean 
}) {
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
