import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  ScanLine,
  FileText,
  Image,
  X,
  Loader2,
  CheckCircle2,
  Eye,
  RotateCcw,
  AlertTriangle,
  Save,
  MousePointer2,
  Trash2,
  Play,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';
import {
  scanDocument,
  saveToStaging,
  manualOcr,
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';

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

interface CachedExtraction {
  extractedFields: ExtractedFields | null;
  ocrText: string;
  warning: string;
}

interface CreateDatabaseExtractProps {
  onSavedToStaging?: () => void;
  onClose?: () => void;
}

export default function CreateDatabaseExtract({ onSavedToStaging, onClose }: CreateDatabaseExtractProps) {
  const { selectedFiliere, selectedStudent } = useAuth();
  const [autoOcrFiles, setAutoOcrFiles] = useState<UploadedFile[]>([]);
  const [manualOcrFiles, setManualOcrFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [extractionMode, setExtractionMode] = useState<'auto' | 'manual-ocr' | 'manual'>('auto');
  const getFiles = () => extractionMode === 'auto' ? autoOcrFiles : manualOcrFiles;
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [showOcrText, setShowOcrText] = useState(false);
  const [manualForm, setManualForm] = useState<Record<string, string>>({});
  const [extractionCache, setExtractionCache] = useState<Record<string, CachedExtraction>>({});
  const [batchExtracting, setBatchExtracting] = useState(false);
  const autoFileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileIdRef = useRef<string | null>(null);
  selectedFileIdRef.current = selectedFile?.id ?? null;

  // Manual OCR state
  const [activeField, setActiveField] = useState<string>('nom_prenom');
  const [regions, setRegions] = useState<DrawnRegion[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [manualOcrResults, setManualOcrResults] = useState<Record<string, string | null>>({});
  const [manualOcrProcessing, setManualOcrProcessing] = useState(false);
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear state when switching modes
  useEffect(() => {
    setSelectedFile(null);
    setExtractedFields(null);
    setOcrText('');
    setWarning('');
    setError('');
    setSaveMessage('');
    setRegions([]);
    setManualOcrResults({});
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

  const runScanForFile = async (file: UploadedFile): Promise<boolean> => {
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
        return false;
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
      return true;
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
      return false;
    }
  };

  const startScan = async () => {
    if (!selectedFile || batchExtracting) return;
    setExtractedFields(null);
    setOcrText('');
    setWarning('');
    await runScanForFile(selectedFile);
  };

  const extractAllFiles = async () => {
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

  const handleSaveToStaging = async () => {
    let fieldsToSave: Record<string, string | null> = {};
    let source = 'OCR';

    if (extractionMode === 'manual') {
      // Manual entry form mode
      for (const [k, v] of Object.entries(manualForm)) {
        fieldsToSave[k] = v || null;
      }
      source = 'MANUAL';
    } else if (extractionMode === 'manual-ocr' && Object.keys(manualOcrResults).length > 0) {
      // Manual OCR mode
      fieldsToSave = manualOcrResults;
      source = 'OCR';
    } else if (extractedFields) {
      // Auto OCR mode
      fieldsToSave = extractedFields as unknown as Record<string, string | null>;
      source = 'OCR';
    } else {
      setSaveMessage('No data to save. Please extract or enter data first.');
      return;
    }

    try {
      const result = await saveToStaging(fieldsToSave, ocrText, source, { filiereId: selectedFiliere?.id ?? null, studentId: selectedStudent?.id ?? null });
      setSaveMessage(`Saved to staging as ${result.id}. Ready to ingest into database.`);
      if (onSavedToStaging) {
        onSavedToStaging();
      }
    } catch {
      setSaveMessage('Failed to save to staging');
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
  }, [regions, isDrawing, drawStart, drawCurrent, activeField, customFieldLabels]);

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

  const clearAll = () => {
    setAutoOcrFiles([]);
    setManualOcrFiles([]);
    setSelectedFile(null);
    setExtractedFields(null);
    setOcrText('');
    setWarning('');
    setError('');
    setSaveMessage('');
    setExtractionCache({});
    setRegions([]);
    setManualOcrResults({});
    setManualForm({});
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl">
            <Database className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Database Records</h2>
            <p className="text-sm text-slate-800 dark:text-slate-700">
              Extract information and add to the database via staging
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-900 hover:text-slate-900 transition-colors"
            >
              Back to Registry
            </button>
          )}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setExtractionMode('auto')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${extractionMode === 'auto'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Auto OCR
            </button>
            <button
              onClick={() => setExtractionMode('manual-ocr')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${extractionMode === 'manual-ocr'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Manual OCR
            </button>
            <button
              onClick={() => setExtractionMode('manual')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${extractionMode === 'manual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Manual Entry
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}
      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* AUTO OCR MODE */}
      {extractionMode === 'auto' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => autoFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${isDragOver
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
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-500/20 dark:to-brand-700/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Drop files or click to upload
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-800 mt-1">
                JPG, PNG, PDF up to 50MB
              </p>
            </div>

            {getFiles().length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Files ({getFiles().length})
                  </h3>
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
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting...</>
                    ) : (
                      <><Layers className="w-3.5 h-3.5" /> Extract All</>
                    )}
                  </button>
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
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {file.type === 'image' ? (
                        <Image className="w-4 h-4 text-slate-800 dark:text-slate-700" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-800 dark:text-slate-700" />
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
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                    {selectedFile.status === 'completed' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Extracted</span>
                    )}
                    {selectedFile.status === 'processing' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> ...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {ocrText && (
                      <button
                        onClick={() => setShowOcrText(!showOcrText)}
                        className={`p-1.5 rounded-lg transition-colors ${showOcrText ? 'bg-brand-100 text-brand-600' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Show raw OCR"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {selectedFile.status !== 'processing' && (
                      <button
                        onClick={startScan}
                        disabled={batchExtracting}
                        className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200 hover:text-brand-600"
                        title="Re-scan"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {showOcrText && ocrText && (
                  <div className="px-4 py-3 bg-slate-900 text-slate-200 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {ocrText}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
                  <div className="p-4 flex items-center justify-center min-h-64 bg-slate-50 dark:bg-slate-900">
                    {selectedFile.preview ? (
                      <img src={selectedFile.preview} alt="Preview" className="max-w-full max-h-64 rounded-lg shadow-sm" />
                    ) : (
                      <div className="text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-700">Document preview</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {selectedFile.status === 'completed' && extractedFields ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Extracted Data
                          </h4>
                        </div>
                        {FIELD_LABELS.map(({ key, label }) => (
                          <div key={key}>
                            <label className="text-xs text-slate-700 font-medium uppercase tracking-wider">{label}</label>
                            <input
                              type="text"
                              value={extractedFields[key] || ''}
                              onChange={(e) => updateField(key, e.target.value)}
                              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        ))}
                        <button
                          onClick={handleSaveToStaging}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm"
                        >
                          <Save className="w-4 h-4" /> Save to Staging
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <ScanLine className="w-10 h-10 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-800">
                          {selectedFile.status === 'ready' ? 'Click "Extract All" or select a file to extract' : 'Processing...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-800">Upload files to start extraction</p>
              </div>
            )}
          </div>
        </div>
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
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragOver
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                }`}
            >
              <input
                ref={manualFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                <MousePointer2 className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Upload image for manual OCR</p>
              <p className="text-xs text-slate-700 mt-1">Draw rectangles to select fields</p>
            </div>
          )}

          {selectedFile && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              {/* Left panel: Field selector */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4 text-brand-500" /> Select Field
                  </h3>
                  <p className="text-xs text-slate-700 mb-3">Choose field, then draw on image</p>
                  <div className="space-y-1.5">
                    {Object.entries(FIELD_NAMES).map(([key, label]) => {
                      const hasRegion = regions.some((r) => r.field === key);
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveField(key)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${activeField === key ? 'ring-2 ring-offset-1 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            } ${hasRegion ? 'opacity-100' : 'opacity-70'}`}
                          style={{
                            borderLeft: `3px solid ${FIELD_COLORS[key]}`,
                            ...(activeField === key ? { backgroundColor: FIELD_COLORS[key] + '10' } : {}),
                          }}
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FIELD_COLORS[key] }} />
                          <span className="flex-1 truncate dark:text-slate-200">{customFieldLabels[key] || label}</span>
                          {hasRegion && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {regions.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Regions ({regions.length})</h3>
                    <div className="space-y-1.5">
                      {regions.map((r) => (
                        <div key={r.field} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FIELD_COLORS[r.field] }} />
                          <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{customFieldLabels[r.field] || FIELD_NAMES[r.field]}</span>
                          <button onClick={() => removeRegion(r.field)} className="p-1 rounded hover:bg-red-100 text-slate-700 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={runManualOcr}
                      disabled={manualOcrProcessing}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {manualOcrProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : (
                        <><Play className="w-4 h-4" /> Run OCR</>
                      )}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setSelectedFile(null); setRegions([]); setManualOcrResults({}); setError(''); setSaveMessage(''); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Change Image
                </button>
              </div>

              {/* Center: Canvas */}
              <div className="xl:col-span-2">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                    <span className="text-xs text-slate-700">
                      Drawing: <span className="font-medium" style={{ color: FIELD_COLORS[activeField] }}>{customFieldLabels[activeField] || FIELD_NAMES[activeField]}</span>
                    </span>
                  </div>
                  <div ref={containerRef} className="relative bg-slate-100 dark:bg-slate-800 cursor-crosshair" style={{ minHeight: '300px' }}>
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

              {/* Right: Results */}
              <div className="space-y-4">
                {Object.keys(manualOcrResults).length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Results
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
                              className="text-xs font-medium uppercase tracking-wider bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none px-1 py-0.5 dark:text-slate-300"
                              style={{ color: FIELD_COLORS[field] }}
                            />
                          </div>
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => setManualOcrResults((prev) => ({ ...prev, [field]: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleSaveToStaging}
                      className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm"
                    >
                      <Save className="w-4 h-4" /> Save to Staging
                    </button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <ScanLine className="w-5 h-5 text-slate-300 dark:text-slate-900" />
                    </div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">No Results Yet</h4>
                    <p className="text-xs text-slate-700 mt-1">Draw regions and click "Run OCR"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL ENTRY MODE */}
      {extractionMode === 'manual' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Manual Data Entry</h3>
                <p className="text-sm text-slate-800 dark:text-slate-700">Enter diploma information manually</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MANUAL_FIELDS.map(({ key, label, isDate }) => (
                <div key={key}>
                  <label className="text-xs text-slate-800 dark:text-slate-700 font-medium mb-1.5 block">{label}</label>
                  <input
                    type={isDate ? 'date' : 'text'}
                    value={manualForm[key] || ''}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={isDate ? 'YYYY-MM-DD' : `Enter ${label.toLowerCase()}`}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-300 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setManualForm({}); setSaveMessage(''); }}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleSaveToStaging}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save to Staging
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {(autoOcrFiles.length > 0 || manualOcrFiles.length > 0 || Object.keys(manualForm).length > 0) && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={clearAll}
            className="text-sm text-slate-800 hover:text-red-500 transition-colors"
          >
            Clear all data
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-800">
            <span>Data flows to</span>
            <ArrowRight className="w-4 h-4" />
            <span className="font-medium text-brand-600">Staging</span>
            <ArrowRight className="w-4 h-4" />
            <span className="font-medium text-emerald-600">Database</span>
          </div>
        </div>
      )}
    </div>
  );
}
