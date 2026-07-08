import { createContext, useContext, useState, ReactNode } from 'react';

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

interface ScanState {
  files: UploadedFile[];
  autoOcrFiles: UploadedFile[];
  manualOcrFiles: UploadedFile[];
  selectedFile: UploadedFile | null;
  extractionMode: 'auto' | 'manual-ocr' | 'manual';
  extractedFields: Record<string, string | null> | null;
  ocrText: string;
  manualForm: Record<string, string>;
  manualOcrResults: Record<string, string | null>;
  customFieldLabels: Record<string, string>;
}

interface AppState {
  scan: ScanState;
  setScan: (updater: (prev: ScanState) => ScanState) => void;
}

const defaultScanState: ScanState = {
  files: [],
  autoOcrFiles: [],
  manualOcrFiles: [],
  selectedFile: null,
  extractionMode: 'auto',
  extractedFields: null,
  ocrText: '',
  manualForm: {},
  manualOcrResults: {},
  customFieldLabels: {},
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [scan, setScanState] = useState<ScanState>(defaultScanState);

  const setScan = (updater: (prev: ScanState) => ScanState) => {
    setScanState(updater);
  };

  return (
    <AppContext.Provider value={{ scan, setScan }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
