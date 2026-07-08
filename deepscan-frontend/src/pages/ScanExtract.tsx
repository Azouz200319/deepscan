import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  ScanLine,
  FileText,
  Image,
  X,
  Loader2,
  CheckCircle2,
  Eye,
  Download,
  RotateCcw,
  ZoomIn,
  Camera,
  AlertTriangle,
  Save,
  MousePointer2,
  Trash2,
  Play,
  ShieldCheck,
  Layers,
  Copy,
  Cpu,
  XCircle,
  Archive,
  ListChecks,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import ForensicOverlay from '../components/ForensicOverlay';
import {
  scanDocument,
  saveToStaging,
  manualOcr,
  analyzeForensics,
  verifySingleFields,
  saveAuditSession,
  addToBlacklist,
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { useAppState } from '../lib/AppContext';
import { useStudentOverlay } from '../lib/StudentOverlayContext';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  preview: string;
  rawFile: File;
  status: 'uploading' | 'ready' | 'processing' | 'completed' | 'error';
  progress: number;
}

interface ExtractedFields {
  nom_prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
}

const FIELD_LABELS: { key: keyof ExtractedFields; label: string }[] = [
  { key: 'nom_prenom', label: 'Full Name (Nom & Prénom)' },
  { key: 'date_naissance', label: 'Date of Birth' },
  { key: 'lieu_naissance', label: 'Place of Birth' },
  { key: 'type_diplome', label: 'Diploma Type' },
  { key: 'domaine', label: 'Domain' },
  { key: 'filiere', label: 'Filière' },
  { key: 'specialite', label: 'Spécialité' },
  { key: 'etablissement', label: 'Institution' },
];

const MANUAL_FIELDS = [
  { key: 'nom_prenom', label: 'Full Name (Nom & Prénom)' },
  { key: 'date_naissance', label: 'Date of Birth', isDate: true },
  { key: 'lieu_naissance', label: 'Place of Birth' },
  { key: 'type_diplome', label: 'Diploma Type (Licence / Master)' },
  { key: 'domaine', label: 'Domain' },
  { key: 'filiere', label: 'Filière' },
  { key: 'specialite', label: 'Spécialité' },
  { key: 'etablissement', label: 'Institution' },
];

interface DrawnRegion {
  field: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const FIELD_COLORS: Record<string, string> = {
  nom_prenom: '#9a6237',
  date_naissance: '#ef4444',
  lieu_naissance: '#f59e0b',
  type_diplome: '#8b5a2b',
  domaine: '#8b5cf6',
  filiere: '#ec4899',
  specialite: '#06b6d4',
  etablissement: '#f97316',
};

const FIELD_NAMES: Record<string, string> = {
  nom_prenom: 'Full Name',
  date_naissance: 'Date of Birth',
  lieu_naissance: 'Place of Birth',
  type_diplome: 'Diploma Type',
  domaine: 'Domain',
  filiere: 'Filière',
  specialite: 'Spécialité',
  etablissement: 'Institution',
};

// Removed ScanWorkflow type as only one workflow exists now

interface CachedExtraction {
  extractedFields: ExtractedFields | null;
  ocrText: string;
  warning: string;
}

const emptyFields = (): ExtractedFields => ({
  nom_prenom: null,
  date_naissance: null,
  lieu_naissance: null,
  type_diplome: null,
  domaine: null,
  filiere: null,
  specialite: null,
  etablissement: null,
});

export default function ScanExtract() {
  const { scan, setScan } = useAppState();
  const { selectedFiliere, selectedStudent } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Restore persisted state from context
  const [autoOcrFiles, setAutoOcrFiles] = useState<UploadedFile[]>(() => {
    // If separate states exist, use them
    if (scan.autoOcrFiles && scan.autoOcrFiles.length > 0) {
      return scan.autoOcrFiles as UploadedFile[];
    }
    // Otherwise, migrate old files to auto mode as default
    return [];
  });
  const [manualOcrFiles, setManualOcrFiles] = useState<UploadedFile[]>(() => {
    // If separate states exist, use them
    if (scan.manualOcrFiles && scan.manualOcrFiles.length > 0) {
      return scan.manualOcrFiles as UploadedFile[];
    }
    return [];
  });
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [extractionMode, setExtractionMode] = useState<'auto' | 'manual-ocr' | 'manual'>(scan.extractionMode || 'auto');

  // Helper function to get correct file list based on mode
  const getFiles = () => extractionMode === 'auto' ? autoOcrFiles : manualOcrFiles;
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(scan.extractedFields as ExtractedFields | null);
  const [ocrText, setOcrText] = useState(scan.ocrText);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [showOcrText, setShowOcrText] = useState(false);
  const [manualForm, setManualForm] = useState<Record<string, string>>(scan.manualForm);
  // Workflow is now standardized to verify-diploma (staging)
  const [extractionCache, setExtractionCache] = useState<Record<string, CachedExtraction>>({});
  const [batchExtracting, setBatchExtracting] = useState(false);
  const autoFileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileIdRef = useRef<string | null>(null);
  selectedFileIdRef.current = selectedFile?.id ?? null;

  // Forensic results state (populated by handleFullProcess for Unified Audit Overview)
  const [forgeryResults, setForgeryResults] = useState<Record<string, any>>({});
  const [manualForgeryResults, setManualForgeryResults] = useState<Record<string, any>>({});

  // Verification states
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [batchVerifyResults, setBatchVerifyResults] = useState<Record<string, any>>({});
  const [manualBatchVerifyResults, setManualBatchVerifyResults] = useState<Record<string, any>>({});
  const { openOverlay } = useStudentOverlay();

  // Forensic Overlay State
  const [isForensicOpen, setIsForensicOpen] = useState(false);
  const [selectedForensicResults, setSelectedForensicResults] = useState<any>(null);
  const [selectedForensicFilename, setSelectedForensicFilename] = useState('');

  // Manual OCR state
  const [activeField, setActiveField] = useState<string>('nom_prenom');
  const [regions, setRegions] = useState<DrawnRegion[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Blacklist modal state
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistFormData, setBlacklistFormData] = useState({
    nom_prenom: '',
    date_naissance: '',
    student_id: '',
    email: '',
    reason: 'Identity mismatch',
  });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Manual Entry state
  const [manualVerificationResult, setManualVerificationResult] = useState<any>(null);
  const [manualEntryHistory, setManualEntryHistory] = useState<any[]>([]);
  const [manualEntryView, setManualEntryView] = useState<'form' | 'history'>('form');
  const [manualOcrResults, setManualOcrResults] = useState<Record<string, string | null>>(scan.manualOcrResults);
  const [manualOcrProcessing, setManualOcrProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editable field labels for manual OCR
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>(scan.customFieldLabels);

  // Persist state to context on changes
  useEffect(() => {
    setScan(() => ({
      files: [], // Keep empty for backward compatibility
      autoOcrFiles: autoOcrFiles as never[],
      manualOcrFiles: manualOcrFiles as never[],
      selectedFile: selectedFile as never,
      extractionMode,
      extractedFields: extractedFields as Record<string, string | null> | null,
      ocrText,
      manualForm,
      manualOcrResults,
      customFieldLabels,
    }));
  }, [autoOcrFiles, manualOcrFiles, selectedFile, extractionMode, extractedFields, ocrText, manualForm, manualOcrResults, customFieldLabels]);

  // Clear selected file and related state when switching modes
  useEffect(() => {
    setSelectedFile(null);
    setExtractedFields(null);
    setOcrText('');
    setWarning('');
    setError('');
    setSaveMessage('');
  }, [extractionMode]);


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const uploaded: UploadedFile[] = newFiles.map((f, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
      type: f.type.startsWith('image/') ? 'image' : 'document',
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      rawFile: f,
      status: 'ready' as const,
      progress: 100,
    }));
    if (extractionMode === 'auto') {
      setAutoOcrFiles((prev) => [...prev, ...uploaded]);
    } else {
      setManualOcrFiles((prev) => [...prev, ...uploaded]);
    }
    if (uploaded.length > 0 && !selectedFile) {
      setSelectedFile(uploaded[0]);
      setExtractedFields(null);
      setOcrText('');
      setWarning('');
      setError('');
      setSaveMessage('');
    }
  };

  const removeFile = (id: string) => {
    if (extractionMode === 'auto') {
      setAutoOcrFiles((prev) => prev.filter((f) => f.id !== id));
    } else {
      setManualOcrFiles((prev) => prev.filter((f) => f.id !== id));
    }
    setExtractionCache((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedFile?.id === id) {
      setSelectedFile(null);
      setExtractedFields(null);
      setOcrText('');
      setWarning('');
      setError('');
    }
  };

  const runScanForFile = async (file: UploadedFile): Promise<ExtractedFields | null> => {
    setError('');
    setSaveMessage('');

    if (extractionMode === 'auto') {
      setAutoOcrFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: 'processing' as const } : f
        )
      );
    } else {
      setManualOcrFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: 'processing' as const } : f
        )
      );
    }
    setSelectedFile((prev) => (prev?.id === file.id ? { ...prev, status: 'processing' } : prev));

    try {
      const result = await scanDocument(file.rawFile);

      if (!result.success && result.error) {
        setError(result.error);
        if (extractionMode === 'auto') {
          setAutoOcrFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: 'error' as const } : f
            )
          );
        } else {
          setManualOcrFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: 'error' as const } : f
            )
          );
        }
        setSelectedFile((prev) => (prev?.id === file.id ? { ...prev, status: 'error' } : prev));
        setExtractionCache((prev) => ({
          ...prev,
          [file.id]: { extractedFields: null, ocrText: '', warning: '' },
        }));
        return null;
      }

      const nextOcr = result.ocr_text || '';
      const nextWarning = result.warning || '';
      const nextFields = (result.fields as ExtractedFields | null) || null;

      setExtractionCache((prev) => ({
        ...prev,
        [file.id]: {
          extractedFields: nextFields,
          ocrText: nextOcr,
          warning: nextWarning,
        },
      }));

      if (extractionMode === 'auto') {
        setAutoOcrFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'completed' as const } : f
          )
        );
      } else {
        setManualOcrFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'completed' as const } : f
          )
        );
      }
      setSelectedFile((prev) => (prev?.id === file.id ? { ...prev, status: 'completed' } : prev));

      if (selectedFileIdRef.current === file.id) {
        setOcrText(nextOcr);
        setWarning(nextWarning);
        setExtractedFields(nextFields);
      }
      return result.success ? nextFields : null;
    } catch {
      setError('Failed to connect to the backend server. Make sure it is running.');
      if (extractionMode === 'auto') {
        setAutoOcrFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'error' as const } : f
          )
        );
      } else {
        setManualOcrFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: 'error' as const } : f
          )
        );
      }
      setSelectedFile((prev) => (prev?.id === file.id ? { ...prev, status: 'error' } : prev));
      return null;
    }
  };

  const startScan = async () => {
    if (!selectedFile || batchExtracting) return;
    setExtractedFields(null);
    setOcrText('');
    setWarning('');
    await runScanForFile(selectedFile);
  };

  const handleFullProcess = async () => {
    if (getFiles().length === 0) return;
    setIsVerifying(true);
    setSaveMessage('Running verification and forensic analysis on extracted data (including your manual adjustments)...');
    setError('');

    try {
      const verifyResults: Record<string, any> = {};
      const forgeryRes: Record<string, any> = {};
      let count = 0;

      for (const f of getFiles()) {
        // 1. Extraction & Verification
        let fieldsToVerify = null;
        if (f.status === 'ready' || f.status === 'error' || f.status === 'completed') {
          // Always re-run or use cache
          const cached = extractionCache[f.id];
          if (cached?.extractedFields) {
            fieldsToVerify = cached.extractedFields;
          } else {
            setSelectedFile(f);
            const extracted = await runScanForFile(f);
            if (extracted && (!('_empty' in extracted) || !extracted._empty)) fieldsToVerify = extracted as ExtractedFields;
          }
        }

        if (fieldsToVerify) {
          const vRes = await verifySingleFields(fieldsToVerify as unknown as Record<string, string | null>);
          if (vRes.success) {
            verifyResults[f.id] = vRes.result.verify;
          }
        }

        // 2. Forgery Detection (only for images)
        if (f.type === 'image') {
          try {
            const forenRes = await analyzeForensics(f.rawFile);
            if (forenRes.success) {
              forgeryRes[f.id] = forenRes.results;
            }
          } catch (err) {
            console.error(`Forgery analysis failed for ${f.name}:`, err);
          }
        }
        count++;
      }

      setBatchVerifyResults(verifyResults);
      setForgeryResults(forgeryRes);
      setSaveMessage(`Fully processed ${count} item(s). Review combined report below.`);
    } catch {
      setError('An error occurred during mass processing.');
    } finally {
      setIsVerifying(false);
    }
  };

  const archiveUnifiedAudit = async () => {
    if (Object.keys(batchVerifyResults).length === 0 && Object.keys(forgeryResults).length === 0) return;

    setSaveMessage('Saving session to archive...');
    try {
      const resultsToSave = getFiles().map(f => {
        const verify = batchVerifyResults[f.id];
        const forgery = forgeryResults[f.id];
        const extracted = extractionCache[f.id]?.extractedFields;

        return {
          filename: f.name,
          extracted_json: JSON.stringify(extracted || {}),
          verify_status: verify?.status || 'N/A',
          verify_score: verify?.name_score || 0,
          verify_db_record: JSON.stringify(verify?.db_record || {}),
          forgery_verdict: forgery ? getVerdict(forgery).label : 'N/A',
          forgery_score: forgery?.stage1?.score || 0,
          forgery_details_json: JSON.stringify(forgery || {})
        };
      });

      const res = await saveAuditSession({
        name: `Audit Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        results: resultsToSave
      });

      if (res.id) {
        setSaveMessage(`Audit session ${res.id} archived! Diverting to archive...`);
        setTimeout(() => navigate('/dashboard/archive'), 1500);
      }
    } catch (err) {
      console.error('Archive failed:', err);
      setError('Failed to save session to archive.');
    }
  };

  const copyToClipboard = () => {
    if (!extractedFields) return;
    const text = Object.entries(extractedFields)
      .map(([k, v]) => `${k.replace('_', ' ').toUpperCase()}: ${v || 'N/A'}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setSaveMessage('Information copied to clipboard!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const getVerificationLabel = (status: string) => {
    switch (status) {
      case 'match': return 'Match to Database';
      case 'mismatch': return 'Mismatch with Database';
      case 'not_found': return 'Not in Database';
      default: return status.replace('_', ' ');
    }
  };

  const getVerdict = (data: any) => {
    if (!data) return { label: 'Unknown', color: 'text-slate-700', bg: 'bg-slate-500/10' };
    const s1 = data.stage1.label.toUpperCase();
    const s2 = data.stage2.kept_count;

    if (s1.includes('DOUBLE') || s2 > 0) return { label: 'Forged', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (s1.includes('SUSPICIOUS')) return { label: 'Suspicious', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Authentic Document', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  const resolveExtractedFields = (fileId: string): ExtractedFields | null => {
    if (selectedFile?.id === fileId && extractedFields) return extractedFields;
    return extractionCache[fileId]?.extractedFields ?? null;
  };

  const hasExtractedData = (fileId: string) => {
    const fields = resolveExtractedFields(fileId);
    return !!fields && Object.values(fields).some((v) => v);
  };

  const runVerificationForFile = async (file: UploadedFile) => {
    const fields = resolveExtractedFields(file.id);
    if (!fields || !Object.values(fields).some((v) => v)) {
      return { ok: false as const, error: `No extracted data for "${file.name}". Run extraction first.` };
    }
    const result = await verifySingleFields(fields as unknown as Record<string, string | null>);
    if (result.success) {
      return { ok: true as const, verify: result.result.verify };
    }
    return { ok: false as const, error: result.error || 'Verification failed' };
  };

  const handleVerifySelected = async () => {
    if (!selectedFile || isVerifying) return;
    setIsVerifying(true);
    setError('');
    setSaveMessage('Verifying selected document against database...');
    try {
      const res = await runVerificationForFile(selectedFile);
      if (res.ok) {
        setBatchVerifyResults((prev) => ({ ...prev, [selectedFile.id]: res.verify }));
        setVerificationResult(res.verify);
        setSaveMessage(`Verification complete for "${selectedFile.name}".`);
      } else {
        setError(res.error);
        setSaveMessage('');
      }
    } catch {
      setError('Failed to verify. Please check your connection.');
      setSaveMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyAll = async () => {
    if (isVerifying) return;
    const files = getFiles().filter((f) => f.status === 'completed' && hasExtractedData(f.id));
    if (files.length === 0) {
      setSaveMessage('No extracted documents to verify. Run extraction first.');
      return;
    }
    setIsVerifying(true);
    setError('');
    setSaveMessage(`Verifying ${files.length} document(s) against database...`);
    try {
      const verifyResults: Record<string, any> = { ...batchVerifyResults };
      let count = 0;
      for (const f of files) {
        const res = await runVerificationForFile(f);
        if (res.ok) {
          verifyResults[f.id] = res.verify;
          count++;
        }
      }
      setBatchVerifyResults(verifyResults);
      if (selectedFile && verifyResults[selectedFile.id]) {
        setVerificationResult(verifyResults[selectedFile.id]);
      }
      setSaveMessage(`Verified ${count} of ${files.length} document(s) against the database.`);
    } catch {
      setError('An error occurred during verification.');
      setSaveMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyFileById = async (fileId: string) => {
    const file = getFiles().find((f) => f.id === fileId);
    if (!file || isVerifying) return;
    setIsVerifying(true);
    setError('');
    setSaveMessage(`Verifying "${file.name}" against database...`);
    try {
      const res = await runVerificationForFile(file);
      if (res.ok) {
        setBatchVerifyResults((prev) => ({ ...prev, [fileId]: res.verify }));
        if (selectedFile?.id === fileId) setVerificationResult(res.verify);
        setSaveMessage(`Verification complete for "${file.name}".`);
      } else {
        setError(res.error);
        setSaveMessage('');
      }
    } catch {
      setError('Failed to verify. Please check your connection.');
      setSaveMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifySelectedManual = async () => {
    if (!selectedFile || isVerifying) return;
    if (!manualOcrResults || !Object.values(manualOcrResults).some((v) => v)) {
      setSaveMessage('No extracted data to verify. Run OCR on regions first.');
      return;
    }
    setIsVerifying(true);
    setError('');
    setSaveMessage('Verifying extracted data against database...');
    try {
      const result = await verifySingleFields(manualOcrResults);
      if (result.success) {
        setManualBatchVerifyResults((prev) => ({ ...prev, [selectedFile.id]: result.result.verify }));
        setSaveMessage(`Verification complete for "${selectedFile.name}".`);
      } else {
        setError('Verification failed. Please try again.');
        setSaveMessage('');
      }
    } catch {
      setError('Failed to verify. Please check your connection.');
      setSaveMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyAllManual = async () => {
    if (isVerifying || manualOcrFiles.length === 0) return;
    if (!manualOcrResults || !Object.values(manualOcrResults).some((v) => v)) {
      setSaveMessage('No extracted data to verify. Run OCR on regions first.');
      return;
    }
    setIsVerifying(true);
    setError('');
    setSaveMessage(`Verifying ${manualOcrFiles.length} document(s) against database...`);
    try {
      const verifyResults: Record<string, any> = { ...manualBatchVerifyResults };
      let count = 0;
      for (const f of manualOcrFiles) {
        const result = await verifySingleFields(manualOcrResults);
        if (result.success) {
          verifyResults[f.id] = result.result.verify;
          count++;
        }
      }
      setManualBatchVerifyResults(verifyResults);
      setSaveMessage(`Verified ${count} of ${manualOcrFiles.length} document(s) against the database.`);
    } catch {
      setError('An error occurred during verification.');
      setSaveMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyManualFileById = async (fileId: string) => {
    const file = manualOcrFiles.find((f) => f.id === fileId);
    if (!file || isVerifying) return;
    if (!manualOcrResults || !Object.values(manualOcrResults).some((v) => v)) {
      setSaveMessage('No extracted data to verify. Run OCR on regions first.');
      return;
    }
    setIsVerifying(true);
    setError('');
    setSaveMessage(`Verifying "${file.name}" against database...`);
    try {
      const result = await verifySingleFields(manualOcrResults);
      if (result.success) {
        setManualBatchVerifyResults((prev) => ({ ...prev, [fileId]: result.result.verify }));
        setSaveMessage(`Verification complete for "${file.name}".`);
      } else {
        setError('Verification failed. Please try again.');
        setSaveMessage('');
      }
    } catch {
      setError('Failed to verify. Please check your connection.');
      setSaveMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const extractAllFiles = async () => {
    // Reset orphaned "processing" from interrupted runs; only queue files that still need work.
    const normalized = getFiles().map((f) =>
      f.status === 'processing' ? { ...f, status: 'ready' as const } : f
    );
    const targets = normalized.filter((f) => f.status === 'ready' || f.status === 'error');
    if (targets.length === 0) {
      setSaveMessage(
        getFiles().every((f) => f.status === 'completed')
          ? 'All files are already extracted.'
          : 'Nothing new to extract.'
      );
      return;
    }
    if (extractionMode === 'auto') {
      setAutoOcrFiles(normalized);
    } else {
      setManualOcrFiles(normalized);
    }
    setSelectedFile((prev) => {
      if (!prev) return prev;
      const n = normalized.find((x) => x.id === prev.id);
      return n ?? prev;
    });

    setBatchExtracting(true);
    setSaveMessage('');
    let ok = 0;
    try {
      for (const f of targets) {
        setSelectedFile(f);
        setExtractedFields(null);
        setOcrText('');
        setWarning('');
        const success = await runScanForFile(f);
        if (success) ok += 1;
      }
      setSaveMessage(`Finished extracting ${targets.length} file(s) (${ok} succeeded). Select a file to review.`);
    } finally {
      setBatchExtracting(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!extractedFields) return;
    try {
      const result = await saveToStaging(
        extractedFields as unknown as Record<string, string | null>,
        ocrText,
        'OCR',
        { filiereId: selectedFiliere?.id ?? null, studentId: selectedStudent?.id ?? null },
      );
      setSaveMessage(`Sent to staging as ${result.id} — open Identity Verification to compare with the database`);
    } catch {
      setSaveMessage('Failed to save to staging');
    }
  };

  const handleManualVerify = async () => {
    try {
      const fields: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(manualForm)) {
        fields[k] = v || null;
      }
      setSaveMessage('Verifying identity against database...');
      const result = await verifySingleFields(fields);
      if (result.success) {
        setManualVerificationResult(result.result);
        setSaveMessage('Verification complete! Review results below.');
        // Add to history
        setManualEntryHistory(prev => [{
          id: Date.now(),
          timestamp: new Date().toISOString(),
          fields: fields,
          result: result.result
        }, ...prev]);
      } else {
        setManualVerificationResult(null);
        setSaveMessage('Verification failed. Please try again.');
      }
    } catch {
      setManualVerificationResult(null);
      setSaveMessage('Failed to verify identity. Please check your connection.');
    }
  };

  const archiveManualEntry = async () => {
    if (!manualVerificationResult) return;
    try {
      const result = await saveToStaging(manualForm, '', 'MANUAL', { filiereId: selectedFiliere?.id ?? null, studentId: selectedStudent?.id ?? null });
      setSaveMessage(`Archived as ${result.id} — open Identity Verification to compare with the database`);
      setManualForm({});
      setManualVerificationResult(null);
    } catch {
      setSaveMessage('Failed to archive entry');
    }
  };

  const updateField = (key: keyof ExtractedFields, value: string) => {
    if (extractedFields && selectedFile) {
      const next = { ...extractedFields, [key]: value || null };
      setExtractedFields(next);
      setExtractionCache((prev) => ({
        ...prev,
        [selectedFile.id]: {
          extractedFields: next,
          ocrText,
          warning,
        },
      }));
    }
  };

  // --- Manual OCR Canvas Logic ---

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;

    const containerW = container.clientWidth;
    const scale = containerW / img.naturalWidth;
    const displayH = img.naturalHeight * scale;

    canvas.width = containerW;
    canvas.height = displayH;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, containerW, displayH);

    for (const r of regions) {
      const color = FIELD_COLORS[r.field] || '#888';
      const sx = r.x * scale;
      const sy = r.y * scale;
      const sw = r.w * scale;
      const sh = r.h * scale;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = color + '20';
      ctx.fillRect(sx, sy, sw, sh);
      const label = customFieldLabels[r.field] || FIELD_NAMES[r.field] || r.field;
      ctx.font = 'bold 11px sans-serif';
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(sx, sy - 18, textW + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, sx + 4, sy - 5);
    }

    if (isDrawing && drawStart && drawCurrent) {
      const color = FIELD_COLORS[activeField] || '#888';
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = color + '15';
      ctx.fillRect(x, y, w, h);
    }
  }, [regions, isDrawing, drawStart, drawCurrent, activeField]);

  useEffect(() => {
    if (extractionMode === 'manual-ocr' && selectedFile?.preview) {
      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
      img.src = selectedFile.preview;
    }
  }, [selectedFile, extractionMode, drawCanvas]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setDrawStart(coords);
    setDrawCurrent(coords);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setDrawCurrent(getCanvasCoords(e));
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) { setIsDrawing(false); return; }
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) { setIsDrawing(false); return; }

    const scale = canvas.width / img.naturalWidth;
    const x = Math.min(drawStart.x, drawCurrent.x) / scale;
    const y = Math.min(drawStart.y, drawCurrent.y) / scale;
    const w = Math.abs(drawCurrent.x - drawStart.x) / scale;
    const h = Math.abs(drawCurrent.y - drawStart.y) / scale;

    if (w > 5 && h > 5) {
      setRegions((prev) => [
        ...prev.filter((r) => r.field !== activeField),
        { field: activeField, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) },
      ]);
      const allFields = Object.keys(FIELD_COLORS);
      const drawnFields = new Set([...regions.map((r) => r.field), activeField]);
      const nextField = allFields.find((f) => !drawnFields.has(f));
      if (nextField) setActiveField(nextField);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const removeRegion = (field: string) => {
    setRegions((prev) => prev.filter((r) => r.field !== field));
  };

  const runManualOcr = async () => {
    if (!selectedFile || regions.length === 0) return;
    setManualOcrProcessing(true);
    setError('');
    const regionMap: Record<string, number[]> = {};
    for (const r of regions) { regionMap[r.field] = [r.x, r.y, r.w, r.h]; }
    try {
      const result = await manualOcr(selectedFile.rawFile, regionMap);
      if (result.success && result.fields) {
        setManualOcrResults(result.fields);
      } else {
        setError(result.error || 'Manual OCR failed');
      }
    } catch {
      setError('Failed to connect to the backend server.');
    } finally {
      setManualOcrProcessing(false);
    }
  };

  const handleFullProcessManual = async () => {
    if (manualOcrFiles.length === 0) return;
    setIsVerifying(true);
    setSaveMessage('Running verification and forensic analysis on manual OCR extracted data...');
    setError('');

    try {
      const verifyResults: Record<string, any> = {};
      const forgeryRes: Record<string, any> = {};
      let count = 0;

      for (const f of manualOcrFiles) {
        // Use manual OCR results if available
        let fieldsToVerify = manualOcrResults;
        if (!fieldsToVerify || Object.keys(fieldsToVerify).length === 0) {
          setSaveMessage('Please run OCR on regions first before running full process');
          setIsVerifying(false);
          return;
        }

        // Verification
        const vRes = await verifySingleFields(fieldsToVerify);
        if (vRes.success) {
          verifyResults[f.id] = vRes.result.verify;
        }

        // Forgery Detection
        if (f.type === 'image') {
          try {
            const forenRes = await analyzeForensics(f.rawFile);
            if (forenRes.success) {
              forgeryRes[f.id] = forenRes.results;
            }
          } catch (err) {
            console.error(`Forgery analysis failed for ${f.name}:`, err);
          }
        }
        count++;
      }

      setManualBatchVerifyResults(verifyResults);
      setManualForgeryResults(forgeryRes);
      setSaveMessage(`Fully processed ${count} manual OCR item(s). Review combined report below.`);
    } catch {
      setError('An error occurred during mass processing.');
    } finally {
      setIsVerifying(false);
    }
  };

  const archiveUnifiedAuditManual = async () => {
    if (Object.keys(manualBatchVerifyResults).length === 0 && Object.keys(manualForgeryResults).length === 0) return;

    setSaveMessage('Saving manual OCR session to archive...');
    try {
      const resultsToSave = manualOcrFiles.map(f => {
        const verify = manualBatchVerifyResults[f.id];
        const forgery = manualForgeryResults[f.id];

        return {
          filename: f.name,
          extracted_json: JSON.stringify(manualOcrResults || {}),
          verify_status: verify?.status || 'N/A',
          verify_score: verify?.name_score || 0,
          verify_db_record: JSON.stringify(verify?.db_record || {}),
          forgery_verdict: forgery ? getVerdict(forgery).label : 'N/A',
          forgery_score: forgery?.stage1?.score || 0,
          forgery_details_json: JSON.stringify(forgery || {})
        };
      });

      const res = await saveAuditSession({
        name: `Manual OCR Audit Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        results: resultsToSave
      });

      if (res.id) {
        setSaveMessage(`Manual OCR audit session ${res.id} archived! Diverting to archive...`);
        setTimeout(() => navigate('/dashboard/archive'), 1500);
      }
    } catch (err) {
      console.error('Archive failed:', err);
      setError('Failed to save manual OCR session to archive.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scan & Extract</h1>
          <p className="text-slate-800 dark:text-slate-700 mt-1">
            Upload documents and diplomas to extract information using OCR
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-800 dark:text-brand-400 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              Verify diploma information
            </div>
          </div>

        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setExtractionMode('auto')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${extractionMode === 'auto'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            Auto OCR
          </button>
          <button
            onClick={() => setExtractionMode('manual-ocr')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${extractionMode === 'manual-ocr'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            Manual OCR
          </button>
          <button
            onClick={() => setExtractionMode('manual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${extractionMode === 'manual'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {/* AUTO OCR MODE */}
      {extractionMode === 'auto' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => autoFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${isDragOver
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500/30 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <input
                  ref={autoFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(Array.from(e.target.files));
                  }}
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-500/20 dark:to-brand-700/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-800 mt-1.5">
                  Supports JPG, PNG, PDF up to 50MB
                </p>
              </div>

              {getFiles().length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Uploaded Files ({getFiles().length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          extractAllFiles();
                        }}
                        disabled={
                          batchExtracting ||
                          getFiles().length === 0 ||
                          getFiles().every((f) => f.status === 'completed')
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 shadow-sm"
                      >
                        {batchExtracting ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…</>
                        ) : (
                          <><Layers className="w-3.5 h-3.5" /> Extract all files</>
                        )}
                      </button>
                    </div>
                  </div>
                  {getFiles().map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        setSelectedFile(file);
                        setError('');
                        setSaveMessage('');
                        const cached = extractionCache[file.id];
                        if (file.status === 'completed' && cached) {
                          setExtractedFields(cached.extractedFields);
                          setOcrText(cached.ocrText);
                          setWarning(cached.warning);
                        } else if (file.status !== 'completed') {
                          setExtractedFields(null);
                          setOcrText('');
                          setWarning('');
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedFile?.id === file.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {file.type === 'image' ? (
                          <Image className="w-5 h-5 text-slate-800 dark:text-slate-700" />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-800 dark:text-slate-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-700 dark:text-slate-800">{file.size}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'processing' && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
                        {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {file.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-700 hover:text-slate-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="xl:col-span-2">
              {selectedFile ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                      {selectedFile.status === 'completed' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Extracted</span>
                      )}
                      {selectedFile.status === 'processing' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                        </span>
                      )}
                      {selectedFile.status === 'error' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Error</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {verificationResult && (
                        <button
                          onClick={() => setVerificationResult(null)}
                          className="p-1 px-3 text-[10px] font-black uppercase text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-all mr-2"
                        >
                          Back to Edit
                        </button>
                      )}
                      {ocrText && (
                        <button
                          onClick={() => setShowOcrText(!showOcrText)}
                          className={`p-2 rounded-lg transition-colors ${showOcrText ? 'bg-brand-100 text-brand-600' : 'text-slate-700 hover:bg-slate-800 hover:text-slate-200'}`}
                          title="Show raw OCR text"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 rounded-lg text-slate-700 hover:bg-slate-800 hover:text-slate-200"><ZoomIn className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg text-slate-700 hover:bg-slate-800 hover:text-slate-200"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {showOcrText && ocrText && (
                    <div className="px-5 py-3 bg-slate-900 text-slate-200 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {ocrText}
                    </div>
                  )}

                  {verificationResult ? (
                    <>
                      <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Verification Result
                            {(() => {
                              const forg = forgeryResults[selectedFile.id];
                              if (!forg) return null;
                              const verdict = getVerdict(forg);
                              return (
                                <div className={`p-1 rounded ${verdict.bg} text-[8px] flex items-center gap-0.5`} title={`Forgery Verdict: ${verdict.label}`}>
                                  <ShieldCheck className={`w-2.5 h-2.5 ${verdict.color}`} />
                                  <span className={`font-black uppercase ${verdict.color}`}>{verdict.label[0]}</span>
                                </div>
                              );
                            })()}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h5 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest px-1 flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
                                <FileText className="w-3.5 h-3.5 text-white" />
                              </div>
                              Extracted Information
                            </h5>
                            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg space-y-3">
                              {FIELD_LABELS.map(({ key, label }) => (
                                <div key={key} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                  <div className="text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1">{label}</div>
                                  <div className="text-base font-bold text-slate-900 break-words">
                                    {extractedFields?.[key] || '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4 text-center py-12">
                            <div className={`p-6 rounded-2xl inline-block mb-4 ${verificationResult.status === 'match' ? 'bg-emerald-50 text-emerald-500' : verificationResult.status === 'mismatch' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
                              {verificationResult.status === 'match' ? <CheckCircle2 className="w-16 h-16" /> : verificationResult.status === 'mismatch' ? <XCircle className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{getVerificationLabel(verificationResult.status)}</h3>
                            <p className="text-slate-800 max-w-xs mx-auto">
                              {verificationResult.status === 'match' ? 'The extracted information perfectly matches the student record in our database.' : verificationResult.status === 'mismatch' ? 'Differences found between extracted info and database record.' : 'No record found with this identity in our database.'}
                            </p>
                            {verificationResult.status === 'mismatch' && (
                              <>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                  {verificationResult.diff.map((d: string) => (
                                    <span key={d} className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase">{d} Mismatch</span>
                                  ))}
                                </div>
                                <button
                                  onClick={() => {
                                    setBlacklistFormData({
                                      nom_prenom: extractedFields?.nom_prenom || '',
                                      date_naissance: extractedFields?.date_naissance || '',
                                      email: '',
                                      student_id: '',
                                      reason: 'Identity mismatch',
                                    });
                                    setShowBlacklistModal(true);
                                  }}
                                  className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 mx-auto font-medium"
                                >
                                  <UserX className="w-4 h-4" /> Add to Blacklist
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">

                        <div className="p-6 flex items-center justify-center min-h-96 bg-slate-50">
                          {selectedFile.preview ? (
                            <img src={selectedFile.preview} alt="Preview" className="max-w-full max-h-96 rounded-lg shadow-sm" />
                          ) : (
                            <div className="text-center">
                              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                              <p className="text-sm text-slate-700">Document preview</p>
                            </div>
                          )}
                        </div>

                        <div className="p-6">
                          {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          )}
                          {warning && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          )}
                          {saveMessage && (
                            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{saveMessage}</span>
                            </div>
                          )}

                          {selectedFile.status === 'completed' && extractedFields ? (
                            <div className="space-y-3">
                              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                                Extracted Information
                              </h4>
                              {FIELD_LABELS.map(({ key, label }) => (
                                <div key={key}>
                                  <label className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">{label}</label>
                                  <input
                                    type="text"
                                    value={extractedFields[key] || ''}
                                    onChange={(e) => updateField(key, e.target.value)}
                                    className="w-full mt-1 px-4 py-2.5 text-sm font-semibold border-2 border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm bg-white"
                                  />
                                </div>
                              ))}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={copyToClipboard}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-all"
                                >
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const blob = new Blob(
                                      [JSON.stringify({ fields: extractedFields, ocr_text: ocrText }, null, 2)],
                                      { type: 'application/json' }
                                    );
                                    const a = document.createElement('a');
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `${selectedFile?.name.replace(/\.[^.]+$/, '') || 'extraction'}-fields.json`;
                                    a.click();
                                    URL.revokeObjectURL(a.href);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  <Download className="w-4 h-4" /> Export
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={handleVerifySelected}
                                disabled={isVerifying || !hasExtractedData(selectedFile.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-brand-200 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-50 transition-all disabled:opacity-50 disabled:grayscale"
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                Verify with Database
                              </button>

                            </div>
                          ) : selectedFile.status === 'completed' && !extractedFields ? (
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" /> OCR Text Extracted (LLaMA unavailable)
                              </h4>
                              <p className="text-xs text-slate-800">
                                The OCR text was extracted but automatic field extraction is unavailable. You can view the raw text using the eye icon above, or manually fill in the fields below.
                              </p>
                              {FIELD_LABELS.map(({ key, label }) => (
                                <div key={key}>
                                  <label className="text-xs text-slate-700 font-medium uppercase tracking-wider">{label}</label>
                                  <input
                                    type="text"
                                    value={extractedFields?.[key] ?? ''}
                                    placeholder={`Enter ${label.toLowerCase()}`}
                                    onChange={(e) => {
                                      const next = {
                                        ...(extractedFields || emptyFields()),
                                        [key]: e.target.value || null,
                                      };
                                      setExtractedFields(next);
                                      if (selectedFile) {
                                        setExtractionCache((prev) => ({
                                          ...prev,
                                          [selectedFile.id]: { extractedFields: next, ocrText, warning },
                                        }));
                                      }
                                    }}
                                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                  />
                                </div>
                              ))}
                              <button
                                onClick={handleSaveToDb}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm"
                              >
                                <Save className="w-4 h-4" />
                                Send to staging
                              </button>
                            </div>
                          ) : selectedFile.status === 'processing' ? (
                            <div className="flex flex-col items-center justify-center h-full py-16">
                              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900">Processing Document</h4>
                              <p className="text-xs text-slate-700 mt-1">Running OCR extraction with AI model...</p>
                              <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full animate-pulse w-2/3" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full py-16">
                              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <ScanLine className="w-8 h-8 text-slate-700" />
                              </div>
                              <h4 className="text-sm font-semibold text-slate-700">Ready to Scan</h4>
                              <p className="text-xs text-slate-700 mt-1 text-center max-w-xs">
                                Click the button below to start extracting information from this document
                              </p>
                              <button
                                onClick={startScan}
                                disabled={batchExtracting}
                                className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                              >
                                <Camera className="w-4 h-4" /> Start Extraction
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-96">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <ScanLine className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">No Document Selected</h3>
                    <p className="text-sm text-slate-700 mt-1 max-w-sm">
                      Upload a document or diploma to begin scanning and extracting information
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS & RESULTS DOWN BELOW */}
          {getFiles().length > 0 && (
            <div className="mt-8 space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-500" /> Batch Processing
                  </h3>
                  <p className="text-sm text-slate-800 mt-1">Verify against the database only, or run full extraction, verification, and forensic analysis on all items.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleVerifyAll(); }}
                    disabled={isVerifying || batchExtracting || !getFiles().some((f) => f.status === 'completed' && hasExtractedData(f.id))}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl border-2 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:grayscale"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify All
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleFullProcess(); }}
                    disabled={isVerifying || batchExtracting || getFiles().length === 0 || !getFiles().some(f => f.status === 'completed')}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800 transition-all shadow-md disabled:opacity-50 disabled:grayscale"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                    Full Process
                  </button>

                  {(Object.keys(batchVerifyResults).length > 0 || Object.keys(forgeryResults).length > 0) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); archiveUnifiedAudit(); }}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md"
                    >
                      <Archive className="w-4 h-4" />
                      Archive Audit Result
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate('/dashboard/staging'); }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl border-2 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {t('nav.identity')}
                  </button>
                </div>
              </div>

              {(Object.keys(batchVerifyResults).length > 0 || Object.keys(forgeryResults).length > 0) && (
                <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-brand-500" />
                      Unified Audit Overview
                    </h4>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Document</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Identity Extract</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Verification</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Forensics</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {getFiles().map(f => {
                          const vRes = batchVerifyResults[f.id];
                          const fRes = forgeryResults[f.id];
                          const extFields = extractionCache[f.id]?.extractedFields;
                          const verdict = fRes ? getVerdict(fRes) : null;

                          return (
                            <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-10 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                                    {f.preview && <img src={f.preview} alt="" className="w-full h-full object-cover" />}
                                  </div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">{f.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-slate-900 dark:text-white">{extFields?.nom_prenom || '—'}</span>
                                {vRes?.name_score > 0 && (
                                  <p className="text-[10px] text-slate-700 mt-0.5">Database match: {Math.round(vRes.name_score * 100)}%</p>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                {vRes ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${vRes.status === 'match' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                      vRes.status === 'mismatch' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                    }`}>
                                    {vRes.status === 'match' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> :
                                      vRes.status === 'mismatch' ? <XCircle className="w-3 h-3 shrink-0" /> :
                                        <AlertTriangle className="w-3 h-3 shrink-0" />}
                                    {getVerificationLabel(vRes.status)}
                                  </div>
                                ) : <span className="text-slate-300">N/A</span>}
                              </td>
                              <td className="px-5 py-4">
                                {verdict ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${verdict.bg.replace('/10', '/50')} ${verdict.color}`}>
                                    <ShieldCheck className="w-3 h-3 shrink-0" />
                                    {verdict.label}
                                  </div>
                                ) : <span className="text-slate-300">N/A</span>}
                              </td>
                              <td className="px-5 py-4">
                                <button
                                  onClick={() => handleVerifyFileById(f.id)}
                                  disabled={isVerifying || !hasExtractedData(f.id)}
                                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-40"
                                  title="Verify with database"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (vRes) {
                                      openOverlay({
                                        id: f.id,
                                        ...(vRes.db_record || extFields || {}),
                                        verify_status: vRes.status,
                                        verify_diff_json: JSON.stringify(vRes.diff || []),
                                        extracted_fields: extFields
                                      } as any);
                                    } else {
                                      openOverlay({
                                        id: f.id,
                                        ...(extFields || {}),
                                        nom_prenom: extFields?.nom_prenom || f.name,
                                        verify_status: 'Pending',
                                        extracted_fields: extFields
                                      } as any);
                                    }
                                  }}
                                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors ml-1"
                                  title="View audit card"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setIsForensicOpen(true);
                                    setSelectedForensicResults(fRes);
                                    setSelectedForensicFilename(f.name);
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                  title="View forensic report"
                                  disabled={!fRes}
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                                {(verdict?.label === 'Forged' || verdict?.label === 'Suspicious') && (
                                  <button
                                    onClick={() => {
                                      setBlacklistFormData({
                                        nom_prenom: extFields?.nom_prenom || '',
                                        date_naissance: extFields?.date_naissance || '',
                                        student_id: '',
                                        email: '',
                                        reason: verdict?.label === 'Forged' ? 'Forgery detected' : 'Suspicious activity',
                                      });
                                      setShowBlacklistModal(true);
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                    title="Add to blacklist"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MANUAL OCR MODE */}
      {extractionMode === 'manual-ocr' && (
        <div className="space-y-4">
          {!selectedFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => manualFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${isDragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                }`}
            >
              <input
                ref={manualFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                <MousePointer2 className="w-8 h-8 text-brand-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Upload an image to start manual region selection</p>
              <p className="text-xs text-slate-700 mt-1.5">Draw rectangles on the image to select fields for OCR extraction</p>
            </div>
          )}

          {selectedFile && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              {/* Left panel: Field selector + regions list */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4 text-brand-500" /> Select Field
                  </h3>
                  <p className="text-xs text-slate-700 mb-3">Choose a field, then draw a rectangle on the image</p>
                  <div className="space-y-1.5">
                    {Object.entries(FIELD_NAMES).map(([key, label]) => {
                      const hasRegion = regions.some((r) => r.field === key);
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveField(key)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${activeField === key ? 'ring-2 ring-offset-1 shadow-sm' : 'hover:bg-slate-50'
                            } ${hasRegion ? 'opacity-100' : 'opacity-70'}`}
                          style={{
                            borderLeft: `3px solid ${FIELD_COLORS[key]}`,
                            ...(activeField === key ? { backgroundColor: FIELD_COLORS[key] + '10' } : {}),
                          }}
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FIELD_COLORS[key] }} />
                          <span className="flex-1 truncate">{customFieldLabels[key] || label}</span>
                          {hasRegion && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {regions.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Drawn Regions ({regions.length})</h3>
                    <div className="space-y-1.5">
                      {regions.map((r) => (
                        <div key={r.field} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-sm">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FIELD_COLORS[r.field] }} />
                          <span className="flex-1 truncate text-slate-700">{customFieldLabels[r.field] || FIELD_NAMES[r.field]}</span>
                          <button onClick={() => removeRegion(r.field)} className="p-1 rounded hover:bg-red-100 text-slate-700 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={runManualOcr}
                      disabled={manualOcrProcessing}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {manualOcrProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : (
                        <><Play className="w-4 h-4" /> Run OCR on Regions</>
                      )}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setSelectedFile(null); setRegions([]); setManualOcrResults({}); setError(''); setSaveMessage(''); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Change Image
                </button>
              </div>

              {/* Center: Canvas area */}
              <div className="xl:col-span-2">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                    <span className="text-xs text-slate-700">
                      Drawing: <span className="font-medium" style={{ color: FIELD_COLORS[activeField] }}>{customFieldLabels[activeField] || FIELD_NAMES[activeField]}</span>
                    </span>
                  </div>
                  <div ref={containerRef} className="relative bg-slate-100 cursor-crosshair" style={{ minHeight: '400px' }}>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setDrawStart(null); setDrawCurrent(null); } }}
                      className="block w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Results panel */}
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {saveMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveMessage}</span>
                  </div>
                )}

                {Object.keys(manualOcrResults).length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Extraction Results
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(manualOcrResults).map(([field, value]) => (
                        <div key={field}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FIELD_COLORS[field] }} />
                            <input
                              type="text"
                              value={customFieldLabels[field] || FIELD_NAMES[field] || field}
                              onChange={(e) => setCustomFieldLabels((prev) => ({ ...prev, [field]: e.target.value }))}
                              className="text-xs font-medium uppercase tracking-wider bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none px-1 py-0.5"
                              style={{ color: FIELD_COLORS[field] }}
                              title="Click to rename this field label"
                            />
                          </div>
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => setManualOcrResults((prev) => ({ ...prev, [field]: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={handleVerifySelectedManual}
                        disabled={isVerifying || !manualOcrResults || !Object.values(manualOcrResults).some((v) => v)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-brand-200 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-50 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Verify with Database
                      </button>
                      <button
                        onClick={handleFullProcessManual}
                        disabled={isVerifying || !manualOcrResults || Object.keys(manualOcrResults).length === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm disabled:opacity-50 disabled:grayscale"
                      >
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                        Full Process
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                      <ScanLine className="w-6 h-6 text-slate-300" />
                    </div>
                    <h4 className="text-sm font-medium text-slate-700">No Results Yet</h4>
                    <p className="text-xs text-slate-700 mt-1">Draw regions on the image and click &quot;Run OCR&quot; to extract text</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS & RESULTS FOR MANUAL OCR */}
          {manualOcrFiles.length > 0 && (
            <div className="mt-8 space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-500" /> Manual OCR Batch Processing
                  </h3>
                  <p className="text-sm text-slate-800 mt-1">Verify against the database only, or run full verification and forensic analysis on manual OCR extracted data.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleVerifyAllManual(); }}
                    disabled={isVerifying || !manualOcrResults || !Object.values(manualOcrResults).some((v) => v)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl border-2 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:grayscale"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify All
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleFullProcessManual(); }}
                    disabled={isVerifying || !manualOcrResults || Object.keys(manualOcrResults).length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800 transition-all shadow-md disabled:opacity-50 disabled:grayscale"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                    Full Process
                  </button>
                  {(Object.keys(manualBatchVerifyResults).length > 0 || Object.keys(manualForgeryResults).length > 0) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); archiveUnifiedAuditManual(); }}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md"
                    >
                      <Archive className="w-4 h-4" />
                      Archive Audit Result
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate('/dashboard/staging'); }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl border-2 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {t('nav.identity')}
                  </button>
                </div>
              </div>

              {(Object.keys(manualBatchVerifyResults).length > 0 || Object.keys(manualForgeryResults).length > 0) && (
                <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-brand-500" />
                      Manual OCR Audit Overview
                    </h4>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Document</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Identity Extract</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Verification</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Forensics</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {manualOcrFiles.map(f => {
                          const vRes = manualBatchVerifyResults[f.id];
                          const fRes = manualForgeryResults[f.id];
                          const verdict = fRes ? getVerdict(fRes) : null;

                          return (
                            <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-10 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                                    {f.preview && <img src={f.preview} alt="" className="w-full h-full object-cover" />}
                                  </div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">{f.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-slate-900 dark:text-white">{manualOcrResults?.nom_prenom || '—'}</span>
                                {vRes?.name_score > 0 && (
                                  <p className="text-[10px] text-slate-700 mt-0.5">Database match: {Math.round(vRes.name_score * 100)}%</p>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                {vRes ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${vRes.status === 'match' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                      vRes.status === 'mismatch' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                    }`}>
                                    {vRes.status === 'match' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> :
                                      vRes.status === 'mismatch' ? <XCircle className="w-3 h-3 shrink-0" /> :
                                        <AlertTriangle className="w-3 h-3 shrink-0" />}
                                    {getVerificationLabel(vRes.status)}
                                  </div>
                                ) : <span className="text-slate-300">N/A</span>}
                              </td>
                              <td className="px-5 py-4">
                                {verdict ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${verdict.bg.replace('/10', '/50')} ${verdict.color}`}>
                                    <ShieldCheck className="w-3 h-3 shrink-0" />
                                    {verdict.label}
                                  </div>
                                ) : <span className="text-slate-300">N/A</span>}
                              </td>
                              <td className="px-5 py-4">
                                <button
                                  onClick={() => handleVerifyManualFileById(f.id)}
                                  disabled={isVerifying || !manualOcrResults || !Object.values(manualOcrResults).some((v) => v)}
                                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-40"
                                  title="Verify with database"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (vRes) {
                                      openOverlay({
                                        id: f.id,
                                        ...(vRes.db_record || manualOcrResults || {}),
                                        verify_status: vRes.status,
                                        verify_diff_json: JSON.stringify(vRes.diff || []),
                                        extracted_fields: manualOcrResults
                                      } as any);
                                    } else {
                                      openOverlay({
                                        id: f.id,
                                        ...(manualOcrResults || {}),
                                        nom_prenom: manualOcrResults?.nom_prenom || f.name,
                                        verify_status: 'Pending',
                                        extracted_fields: manualOcrResults
                                      } as any);
                                    }
                                  }}
                                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors ml-1"
                                  title="View audit card"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setIsForensicOpen(true);
                                    setSelectedForensicResults(fRes);
                                    setSelectedForensicFilename(f.name);
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                  title="View forensic report"
                                  disabled={!fRes}
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                                {(verdict?.label === 'Forged' || verdict?.label === 'Suspicious') && (
                                  <button
                                    onClick={() => {
                                      setBlacklistFormData({
                                        nom_prenom: manualOcrResults?.nom_prenom || '',
                                        date_naissance: manualOcrResults?.date_naissance || '',
                                        student_id: '',
                                        email: '',
                                        reason: verdict?.label === 'Forged' ? 'Forgery detected' : 'Suspicious activity',
                                      });
                                      setShowBlacklistModal(true);
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                    title="Add to blacklist"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MANUAL ENTRY MODE */}
      {extractionMode === 'manual' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Manual Data Entry</h3>
              <p className="text-sm text-slate-800">Enter diploma or document information to verify identity</p>
            </div>
            <button
              onClick={() => setManualEntryView(manualEntryView === 'form' ? 'history' : 'form')}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              {manualEntryView === 'form' ? `History (${manualEntryHistory.length})` : 'Back to Entry'}
            </button>
          </div>

          {manualEntryView === 'form' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                {saveMessage && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveMessage}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MANUAL_FIELDS.map(({ key, label, isDate }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-800 font-medium mb-1.5 block">{label}</label>
                      <input
                        type={isDate ? 'date' : 'text'}
                        value={manualForm[key] || ''}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={isDate ? 'YYYY-MM-DD' : `Enter ${label.toLowerCase()}`}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-300"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => { setManualForm({}); setSaveMessage(''); setManualVerificationResult(null); }}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Clear Form
                  </button>
                  <button
                    onClick={handleManualVerify}
                    className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm"
                  >
                    Verify Identity
                  </button>
                </div>
              </div>

              {/* Verification Results */}
              {manualVerificationResult && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Verification Result</h3>
                    <button
                      onClick={archiveManualEntry}
                      className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      Archive Entry
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Status</p>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-tighter ${manualVerificationResult.verify.status === 'match' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        manualVerificationResult.verify.status === 'mismatch' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                      {manualVerificationResult.verify.status === 'match' ? <CheckCircle2 className="w-4 h-4" /> :
                        manualVerificationResult.verify.status === 'mismatch' ? <XCircle className="w-4 h-4" /> :
                          <AlertTriangle className="w-4 h-4" />}
                      {manualVerificationResult.verify.status.replace('_', ' ')}
                    </div>
                  </div>
                  {manualVerificationResult.verify.db_record && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900">Field Comparison</h4>
                      <div className="space-y-2">
                        {[
                          { key: 'nom_prenom', label: 'Full Name' },
                          { key: 'date_naissance', label: 'Date of Birth' },
                          { key: 'lieu_naissance', label: 'Place of Birth' },
                          { key: 'type_diplome', label: 'Diploma Type' },
                          { key: 'domaine', label: 'Domain' },
                          { key: 'filiere', label: 'Field' },
                          { key: 'specialite', label: 'Specialty' },
                          { key: 'etablissement', label: 'Institution' },
                        ].map(({ key, label }) => {
                          const userValue = manualForm[key] || '—';
                          const dbValue = manualVerificationResult.verify.db_record[key] || '—';
                          const isMatch = userValue.toLowerCase().trim() === dbValue.toLowerCase().trim();
                          return (
                            <div key={key} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                                {isMatch ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-slate-700 truncate">{userValue}</span>
                                  {!isMatch && (
                                    <>
                                      <span className="text-slate-300">→</span>
                                      <span className="text-sm text-brand-600 font-medium truncate">{dbValue}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {manualEntryView === 'history' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Verification History</h4>
              {manualEntryHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                    <Archive className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-800">No verification history yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {manualEntryHistory.map((entry) => (
                    <div key={entry.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-900">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                        <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${entry.result.verify.status === 'match' ? 'bg-emerald-50 text-emerald-600' :
                            entry.result.verify.status === 'mismatch' ? 'bg-rose-50 text-rose-600' :
                              'bg-amber-50 text-amber-600'
                          }`}>
                          {entry.result.verify.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-2">{entry.fields.nom_prenom || 'No name'}</p>
                      {entry.result.verify.db_record && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Field Comparison</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              { key: 'nom_prenom', label: 'Name' },
                              { key: 'date_naissance', label: 'DOB' },
                              { key: 'lieu_naissance', label: 'POB' },
                              { key: 'type_diplome', label: 'Type' },
                              { key: 'domaine', label: 'Domain' },
                              { key: 'etablissement', label: 'Institution' },
                            ].map(({ key, label }) => {
                              const userValue = entry.fields[key] || '—';
                              const dbValue = entry.result.verify.db_record[key] || '—';
                              const isMatch = userValue.toLowerCase().trim() === dbValue.toLowerCase().trim();
                              return (
                                <div key={key} className="text-xs">
                                  <span className="text-slate-800">{label}:</span>{' '}
                                  <span className={isMatch ? 'text-slate-700' : 'text-rose-600'}>
                                    {userValue}
                                  </span>
                                  {!isMatch && (
                                    <span className="text-slate-700"> → <span className="text-brand-600">{dbValue}</span></span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <ForensicOverlay
        isOpen={isForensicOpen}
        onClose={() => setIsForensicOpen(false)}
        results={selectedForensicResults}
        filename={selectedForensicFilename}
      />

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add to Blacklist</h2>
              <button onClick={() => setShowBlacklistModal(false)} className="text-slate-700 hover:text-slate-900 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await addToBlacklist(blacklistFormData);
                  setSaveMessage('Added to blacklist successfully');
                  setShowBlacklistModal(false);
                } catch (err: any) {
                  setError(err.detail || 'Failed to add to blacklist');
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={blacklistFormData.nom_prenom}
                  onChange={(e) => setBlacklistFormData({ ...blacklistFormData, nom_prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="text"
                  value={blacklistFormData.date_naissance}
                  onChange={(e) => setBlacklistFormData({ ...blacklistFormData, date_naissance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID</label>
                <input
                  type="text"
                  value={blacklistFormData.student_id}
                  onChange={(e) => setBlacklistFormData({ ...blacklistFormData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Student ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason *</label>
                <select
                  required
                  value={blacklistFormData.reason}
                  onChange={(e) => setBlacklistFormData({ ...blacklistFormData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Identity mismatch">Identity mismatch</option>
                  <option value="Forgery detected">Forgery detected</option>
                  <option value="Duplicate submission">Duplicate submission</option>
                  <option value="Suspicious activity">Suspicious activity</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBlacklistModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Add to Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
