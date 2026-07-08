import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Search,
  History as HistoryIcon,
  X,
  Trash2,
  Save,
  Image,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getForgeryReports, saveForgeryReport, deleteForgeryReport } from '../lib/api';

type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';
type Verdict = 'authentic' | 'suspicious' | 'forged';

interface ForensicsData {
  stage1: {
    label: string;
    score: number;
    plot: string | null;
  };
  stage2: {
    annotated: string | null;
    heatmap: string | null;
    kept_count: number;
  };
  stage3: {
    annotated_original: string | null;
    ghost_map: string | null;
    forged_count: number;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  result?: ForensicsData;
  error?: string;
}

type ViewMode = 'upload' | 'history';

const STORAGE_KEY = 'forgery_session';

interface StoredFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  result?: {
    stage1: { label: string; score: number; plot?: string | null };
    stage2: { annotated?: string | null; heatmap?: string | null; kept_count: number };
    stage3: { annotated_original?: string | null; ghost_map?: string | null; forged_count?: number };
  };
  error?: string;
  hasFile: boolean;
}

export default function ForgeryDetection() {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [savedFileIds, setSavedFileIds] = useState<Set<string>>(new Set());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<string | null>(null);
  const [viewingHistoryDetail, setViewingHistoryDetail] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount (metadata only, no base64 images)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredFile[] = JSON.parse(stored);
        // Only restore if we have valid data
        if (parsed.length > 0) {
          const restoredFiles: UploadedFile[] = parsed.map(sf => ({
            id: sf.id,
            file: { name: sf.name, size: sf.size } as File,
            previewUrl: '', // No preview since we don't store base64
            status: sf.status,
            result: sf.result as ForensicsData, // Cast to full type
            error: sf.error,
          }));
          setFiles(restoredFiles);
          if (restoredFiles.some(f => f.status === 'complete')) {
            setStatus('complete');
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save to localStorage when files change (strip large base64 images)
  useEffect(() => {
    if (files.length > 0) {
      const storable: StoredFile[] = files.map(f => {
        // Strip base64 images from result to save space - keep only metadata
        const strippedResult = f.result ? {
          stage1: { 
            label: f.result.stage1.label, 
            score: f.result.stage1.score 
          },
          stage2: { 
            kept_count: f.result.stage2.kept_count 
          },
          stage3: {}
        } : undefined;
        
        return {
          id: f.id,
          name: f.file.name,
          size: f.file.size,
          status: f.status,
          result: strippedResult,
          error: f.error,
          hasFile: false,
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storable));
      } catch (e) {
        console.warn('Failed to save to localStorage (quota exceeded):', e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [files]);

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    const newFiles: UploadedFile[] = Array.from(fileList).map((file, i) => ({
      id: `file-${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setStatus('idle');
    setSaveMessage(null);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setStatus('idle');
    setSaveMessage(null);
    setViewingDetail(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const runAnalysis = async () => {
    if (files.length === 0 || !token) return;

    setStatus('analyzing');
    setSaveMessage(null);

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const fileData of pendingFiles) {
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'analyzing' } : f
      ));

      const formData = new FormData();
      formData.append('file', fileData.file);

      try {
        const response = await fetch(`${API_URL}/api/forensics/analyze`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Analysis failed');
        }

        const data = await response.json();
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'complete', result: data.results } : f
        ));
      } catch (err) {
        console.error('Forensics error:', err);
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Analysis failed' } : f
        ));
      }
    }

    setStatus('complete');
  };

  const handleSaveToHistory = async () => {
    const completedFiles = files.filter(f => f.status === 'complete' && f.result && !savedFileIds.has(f.id));
    if (completedFiles.length === 0) return;

    setSaveMessage('Saving to history...');
    let savedCount = 0;
    const newlySaved = new Set(savedFileIds);

    try {
      for (const fileData of completedFiles) {
        const verdict = getVerdict(fileData.result!);
        await saveForgeryReport({
          filename: fileData.file.name,
          verdict: verdictConfig[verdict].label,
          score: fileData.result!.stage1.score,
          results_json: JSON.stringify(fileData.result),
        });
        newlySaved.add(fileData.id);
        savedCount++;
      }

      setSavedFileIds(newlySaved);
      setSaveMessage(`Saved ${savedCount} report(s) to history!`);
      await fetchReports();
    } catch (err) {
      console.error('Failed to save reports:', err);
      setSaveMessage('Failed to save some reports to history.');
    }
  };

  const handleHistoryClick = (report: any) => {
    try {
      const results = JSON.parse(report.results_json);
      setViewingHistoryDetail({
        filename: report.filename,
        created_at: report.created_at,
        results,
      });
    } catch (e) {
      console.error('Failed to parse report:', e);
    }
  };

  const getVerdict = (data: ForensicsData): Verdict => {
    const s1 = data.stage1.label.toUpperCase();
    const s2 = data.stage2.kept_count;
    const s3 = data.stage3.forged_count;

    if (s1.includes('DOUBLE') || s2 > 0 || s3 > 0) return 'forged';
    if (s1.includes('SUSPICIOUS')) return 'suspicious';
    return 'authentic';
  };

  const verdictConfig: Record<Verdict, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
    authentic: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2, label: 'Authentic Document' },
    suspicious: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle, label: 'Suspicious - Review Required' },
    forged: { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: XCircle, label: 'Tampering Detected' },
  };

  const [archivedReports, setArchivedReports] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getForgeryReports();
      setArchivedReports(data || []);
    } catch (err) {
      console.error('Failed to fetch forgery reports:', err);
    }
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved analysis? This action cannot be undone.')) {
      return;
    }
    try {
      console.log('Deleting report:', reportId);
      await deleteForgeryReport(reportId);
      console.log('Report deleted successfully');
      setArchivedReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert(`Failed to delete report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-6 lg:p-10 min-h-screen bg-white dark:bg-slate-950">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-rose-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Document Forensics</h1>
          </div>
          <p className="text-slate-800 dark:text-slate-700 max-w-2xl">
            Advanced multi-stage forensic analysis pipeline using DCT spectral decomposition and JPEG ghost mapping to detect document manipulation.
          </p>
        </motion.div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { setViewMode('upload'); setViewingHistoryDetail(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'upload'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Analysis
          </button>
          <button
            onClick={() => { setViewMode('history'); setViewingDetail(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'history'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <HistoryIcon className="w-4 h-4" /> History ({archivedReports.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          {/* UPLOAD VIEW */}
          {viewMode === 'upload' && files.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-16 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-slate-800/50 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-brand-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Upload Documents</h3>
              <p className="text-slate-800 dark:text-slate-700 text-sm max-w-md mx-auto">
                Drop images here or click to browse. Analyze multiple documents for forgery detection.
              </p>
            </div>
          )}

          {/* Unified Files Table */}
          {viewMode === 'upload' && files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {files.length} file{files.length > 1 ? 's' : ''}
                  </span>
                  {files.some(f => f.status === 'complete') && (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                      {files.filter(f => f.status === 'complete').length} analyzed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {files.some(f => f.status === 'pending') && status !== 'analyzing' && (
                    <button
                      onClick={runAnalysis}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition-all"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Analyze {files.filter(f => f.status === 'pending').length} Pending
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-900 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" /> Add
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  <button
                    onClick={clearAll}
                    className="p-2 text-slate-700 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <AnimatePresence>
                {saveMessage && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30"
                  >
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {saveMessage}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-800 uppercase tracking-wider">Document</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {files.map((fileData) => (
                      <tr key={fileData.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {fileData.previewUrl ? (
                                <img src={fileData.previewUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Image className="w-5 h-5 text-slate-700" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">{fileData.file.name}</p>
                              <p className="text-[10px] text-slate-700">{(fileData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {fileData.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 text-[10px] font-medium rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Pending
                            </span>
                          )}
                          {fileData.status === 'analyzing' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-medium rounded-full">
                              <Loader2 className="w-3 h-3 animate-spin" /> Analyzing
                            </span>
                          )}
                          {fileData.status === 'complete' && fileData.result && (
                            (() => {
                              const verdict = getVerdict(fileData.result);
                              const cfg = verdictConfig[verdict];
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${cfg.bg} ${cfg.color} text-[10px] font-bold rounded-full`}>
                                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                                </span>
                              );
                            })()
                          )}
                          {fileData.status === 'error' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-medium rounded-full">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {fileData.status === 'complete' && fileData.result ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fileData.result.stage1.score.toFixed(1)}</p>
                              <p className={`text-[10px] ${fileData.result.stage2.kept_count > 0 ? 'text-rose-500 font-medium' : 'text-slate-700'}`}>
                                {fileData.result.stage2.kept_count} suspicious
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-900">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {fileData.status === 'complete' && fileData.result && (
                              <button
                                onClick={() => setViewingDetail(fileData.id)}
                                className="p-1.5 text-slate-700 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => removeFile(fileData.id)}
                              className="p-1.5 text-slate-700 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions - Only show save button if there are unsaved complete files */}
              {files.some(f => f.status === 'complete' && !savedFileIds.has(f.id)) && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <p className="text-xs text-slate-800">
                    {files.filter(f => f.status === 'complete' && !savedFileIds.has(f.id)).length} unsaved result(s)
                  </p>
                  <button
                    onClick={handleSaveToHistory}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:opacity-90 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Save to History
                  </button>
                </div>
              )}

              {/* Analyzing Progress */}
              {status === 'analyzing' && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Analyzing documents...</span>
                        <span className="text-xs text-slate-800">
                          {files.filter(f => f.status === 'complete').length} of {files.length} done
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-500 rounded-full transition-all duration-300"
                          style={{ width: `${(files.filter(f => f.status === 'complete').length / files.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Detail View Modal */}
          <AnimatePresence>
            {viewingDetail && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setViewingDetail(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                >
                  {(() => {
                    const fileData = files.find(f => f.id === viewingDetail);
                    if (!fileData || !fileData.result) return null;
                    const verdict = getVerdict(fileData.result);
                    const cfg = verdictConfig[verdict];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <div className={`px-8 py-6 ${cfg.bg} border-b border-white/20 flex items-center justify-between`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl ${cfg.bg} border-2 border-white flex items-center justify-center shadow-lg`}>
                              <Icon className={`w-8 h-8 ${cfg.color}`} />
                            </div>
                            <div>
                              <h3 className={`text-xl font-black uppercase tracking-tight ${cfg.color}`}>{cfg.label}</h3>
                              <p className="text-sm text-slate-800 truncate max-w-[300px]">{fileData.file.name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setViewingDetail(null)}
                            className="p-2 rounded-xl bg-white/50 hover:bg-white transition-all"
                          >
                            <X className="w-5 h-5 text-slate-800" />
                          </button>
                        </div>
                        <div className="p-8 space-y-8">
                          {/* Score */}
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div>
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Consistency Score</span>
                              <p className="text-3xl font-black text-slate-900 dark:text-white">{fileData.result.stage1.score.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Suspicious Regions</span>
                              <p className={`text-3xl font-black ${fileData.result.stage2.kept_count > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {fileData.result.stage2.kept_count}
                              </p>
                            </div>
                          </div>

                          {/* Detection Map - DCT Stage 2 */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">DCT Copy-Move Detection</h4>
                            <div className="relative rounded-2xl border-2 border-rose-500/50 overflow-hidden bg-slate-900">
                              {fileData.result.stage2.kept_count > 0 && (
                                <>
                                  <div className="absolute inset-0 border-2 border-rose-500 animate-pulse pointer-events-none z-20" />
                                  <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase rounded z-20">
                                    Suspicious Areas Detected
                                  </div>
                                </>
                              )}
                              {fileData.result.stage2.annotated ? (
                                <img
                                  src={`data:image/png;base64,${fileData.result.stage2.annotated}`}
                                  alt="DCT Detection Map"
                                  className="w-full h-auto object-contain"
                                />
                              ) : (
                                <div className="p-8 text-center">
                                  <p className="text-sm text-slate-700">No suspicious areas detected</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ghost Analysis - Forged Regions on Original */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">GHOST Forgery Analysis</h4>
                            <div className="relative rounded-2xl border-2 border-brand-500/50 overflow-hidden bg-slate-900">
                              {fileData.result.stage3.forged_count > 0 && (
                                <>
                                  <div className="absolute top-2 right-2 px-3 py-1 bg-brand-500 text-white text-[10px] font-black uppercase rounded z-20">
                                    {fileData.result.stage3.forged_count} Forged Region(s)
                                  </div>
                                </>
                              )}
                              {fileData.result.stage3.annotated_original ? (
                                <img
                                  src={`data:image/png;base64,${fileData.result.stage3.annotated_original}`}
                                  alt="GHOST Analysis - Original with Forged Regions"
                                  className="w-full h-auto object-contain"
                                />
                              ) : (
                                <div className="p-8 text-center">
                                  <p className="text-sm text-slate-700">No GHOST artifacts detected</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Double Compression Analysis - Show when no forgeries detected */}
                          {fileData.result.stage2.kept_count === 0 && fileData.result.stage3.forged_count === 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white">JPEG Double Compression Analysis</h4>
                              <div className={`p-6 rounded-2xl border-2 overflow-hidden ${
                                fileData.result.stage1.label.includes('DOUBLE')
                                  ? 'bg-rose-500/10 border-rose-500'
                                  : fileData.result.stage1.label.includes('SUSPICIOUS')
                                  ? 'bg-amber-500/10 border-amber-500'
                                  : 'bg-emerald-500/10 border-emerald-500'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className={`text-lg font-bold ${
                                      fileData.result.stage1.label.includes('DOUBLE')
                                        ? 'text-rose-500'
                                        : fileData.result.stage1.label.includes('SUSPICIOUS')
                                        ? 'text-amber-500'
                                        : 'text-emerald-500'
                                    }`}>
                                      {fileData.result.stage1.label}
                                    </p>
                                    <p className="text-sm text-slate-800 dark:text-slate-700 mt-1">
                                      {fileData.result.stage1.label.includes('DOUBLE')
                                        ? 'Image has been saved and re-compressed multiple times - possible tampering'
                                        : fileData.result.stage1.label.includes('SUSPICIOUS')
                                        ? 'Some compression artifacts detected - further review recommended'
                                        : 'Image shows single compression - consistent with original'
                                      }
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">DCT Score</p>
                                    <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
                                      {fileData.result.stage1.score.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                {fileData.result.stage1.plot && (
                                  <div className="mt-4 rounded-xl overflow-hidden bg-slate-900">
                                    <img
                                      src={`data:image/png;base64,${fileData.result.stage1.plot}`}
                                      alt="DCT FFT Analysis"
                                      className="w-full h-auto object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* HISTORY VIEW */}
          {viewMode === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {!viewingHistoryDetail ? (
                <>
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HistoryIcon className="w-5 h-5 text-brand-500" />
                      Saved Analyses ({archivedReports.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-800 uppercase tracking-wider">Document</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 uppercase tracking-wider">Verdict</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 uppercase tracking-wider">Score</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-800 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {archivedReports.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center">
                              <p className="text-sm text-slate-700">No saved analyses yet</p>
                              <button
                                onClick={() => setViewMode('upload')}
                                className="mt-2 text-xs text-brand-600 hover:text-brand-700 font-medium"
                              >
                                Go to Analysis →
                              </button>
                            </td>
                          </tr>
                        ) : archivedReports.map((report) => {
                          const verdictKey = (report.verdict || 'authentic').toLowerCase().replace(/\s+/g, '') as Verdict;
                          const cfg = verdictConfig[verdictKey] || verdictConfig.authentic;
                          return (
                            <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{report.filename}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${cfg.bg} ${cfg.color} text-[10px] font-bold rounded-full`}>
                                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{report.score?.toFixed?.(1) || '-'}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs text-slate-800">{new Date(report.created_at).toLocaleDateString()}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleHistoryClick(report)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteReport(report.id, e)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                    title="Delete analysis"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setViewingHistoryDetail(null)}
                      className="flex items-center gap-2 text-sm text-slate-800 hover:text-slate-700 transition-colors"
                    >
                      ← Back to History
                    </button>
                    <span className="text-xs text-slate-700">
                      {new Date(viewingHistoryDetail.created_at).toLocaleString()}
                    </span>
                  </div>
                  {(() => {
                    const results = viewingHistoryDetail.results;
                    const verdict = getVerdict(results);
                    const cfg = verdictConfig[verdict];
                    const Icon = cfg.icon;
                    return (
                      <div className="space-y-6">
                        <div className={`p-6 ${cfg.bg} rounded-2xl`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${cfg.bg} border-2 border-white flex items-center justify-center`}>
                              <Icon className={`w-6 h-6 ${cfg.color}`} />
                            </div>
                            <div>
                              <h3 className={`text-lg font-black uppercase ${cfg.color}`}>{cfg.label}</h3>
                              <p className="text-sm text-slate-900 dark:text-slate-700">{viewingHistoryDetail.filename}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-700 uppercase">Consistency Score</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{results.stage1.score.toFixed(2)}</p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-700 uppercase">Suspicious Regions</p>
                            <p className={`text-2xl font-black ${results.stage2.kept_count > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {results.stage2.kept_count}
                            </p>
                          </div>
                        </div>
                        {results.stage2.annotated && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Detection Map</h4>
                            <div className="relative rounded-xl border-2 border-rose-500/30 overflow-hidden bg-slate-900">
                              {verdict === 'forged' && (
                                <div className="absolute inset-0 border-2 border-rose-500 animate-pulse pointer-events-none z-10" />
                              )}
                              <img
                                src={`data:image/png;base64,${results.stage2.annotated}`}
                                alt="Detection"
                                className="w-full h-auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
