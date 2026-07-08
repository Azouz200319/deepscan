import { useState, useEffect, useCallback, useRef } from 'react';
import CreateDatabaseExtract from './CreateDatabaseExtract';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CheckCircle2,
  Upload,
  X,
  ArrowUpCircle,
  Database,
  ShieldCheck,
  Clock,
  Ban,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { getRecords, deleteRecord, deleteStaging, importJsonFile, getStaging, promoteStaging } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import DatabaseRecordOverlay from '../components/DatabaseRecordOverlay';

interface DbRecord {
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
  created_at: string;
}

interface Stats {
  total: number;
  ocr_count: number;
  manual_count: number;
  institutions: number;
}

const sourceStyles: { [key: string]: string } = {
  OCR: 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20',
  MANUAL: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
};

export default function RecordsDatabase() {
  const { selectedUniversity, selectedDomain, selectedFiliere } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, ocr_count: 0, manual_count: 0, institutions: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [viewRecord, setViewRecord] = useState<DbRecord | null>(null);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [showStagingIngest, setShowStagingIngest] = useState(false);
  const [stagingRecords, setStagingRecords] = useState<DbRecord[]>([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const [showScanExtract, setShowScanExtract] = useState(false);
  const perPage = 10;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords({
        search: searchQuery || undefined,
        university_id: selectedUniversity?.id,
        domain_id: selectedDomain?.id,
        filiere_id: selectedFiliere?.id,
        page,
        per_page: perPage,
      });
      setRecords(data.records);
      setStats(data.stats);
      setTotalPages(data.pages);
      setTotalRecords(data.total);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, [searchQuery, selectedUniversity, selectedDomain, selectedFiliere, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to move this record to history?')) return;
    try {
      await deleteRecord(id);
      setActionMsg(`Record ${id} archived`);
      fetchRecords();
    } catch {
      setActionMsg('Failed to archive record');
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importJsonFile(file);
      setActionMsg(result.message || `Imported ${result.imported} record(s)`);
      setShowJsonUpload(false);
      fetchRecords();
    } catch {
      setActionMsg('JSON import failed');
    } finally {
      if (jsonFileRef.current) jsonFileRef.current.value = '';
    }
    setTimeout(() => setActionMsg(''), 5000);
  };

  const loadStagingRecords = async () => {
    setStagingLoading(true);
    try {
      const data = await getStaging();
      setStagingRecords(data.records || []);
    } catch {
      setStagingRecords([]);
    } finally {
      setStagingLoading(false);
    }
  };

  const handlePromoteStaging = async (id: string) => {
    try {
      const result = await promoteStaging(id);
      setActionMsg(`Promoted to database as ${result.id}`);
      loadStagingRecords();
      fetchRecords();
    } catch {
      setActionMsg('Promote failed');
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleDeleteStaging = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staging record?')) return;
    try {
      await deleteStaging(id);
      setActionMsg('Staging record deleted');
      loadStagingRecords();
    } catch {
      setActionMsg('Delete failed');
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleIngestAllStaging = async () => {
    if (stagingRecords.length === 0) return;
    if (!confirm(`Are you sure you want to ingest all ${stagingRecords.length} records?`)) return;
    
    setStagingLoading(true);
    let successCount = 0;
    try {
      for (const rec of stagingRecords) {
        try {
          await promoteStaging(rec.id);
          successCount++;
        } catch (err) {
          console.error(`Failed to promote ${rec.id}:`, err);
        }
      }
      setActionMsg(`Successfully ingested ${successCount} records`);
      loadStagingRecords();
      fetchRecords();
    } catch {
      setActionMsg('Batch ingestion failed');
    } finally {
      setStagingLoading(false);
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const toggleRecord = (id: string) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map((r) => r.id));
    }
  };

  const handleExportVisiblePage = () => {
    if (records.length === 0) {
      setActionMsg('No records to export');
      setTimeout(() => setActionMsg(''), 3000);
      return;
    }
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `deepscan-export-p${page}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setActionMsg(`Exported ${records.length} records`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-brand-500/10 rounded-lg">
              <Database className="w-5 h-5 text-brand-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Database</h1>
          </div>
          <p className="text-slate-800 dark:text-slate-700 text-xs font-medium">Ingest and manage organization-wide document records</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setShowStagingIngest(true); loadStagingRecords(); }}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-brand-500" /> Staging
          </button>
          <button
            onClick={() => setShowJsonUpload(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" /> Import JSON
          </button>
          <button
            onClick={() => setShowScanExtract(!showScanExtract)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 ${
              showScanExtract 
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-none' 
              : 'bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/10'
            }`}
          >
            {showScanExtract ? (
              <>
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Registry
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Create Database
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showScanExtract ? (
          <motion.div
            key="create-database-extract"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-800"
          >
            <CreateDatabaseExtract
              onSavedToStaging={() => {
                loadStagingRecords();
                setActionMsg('Record saved to staging');
                setTimeout(() => setActionMsg(''), 3000);
              }}
              onClose={() => setShowScanExtract(false)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="database-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Archives', value: stats.total, icon: Database, gradient: 'from-slate-500 to-slate-700' },
                { label: 'OCR Intelligence', value: stats.ocr_count, icon: ShieldCheck, gradient: 'from-brand-500 to-teal-600' },
                { label: 'Manual Entries', value: stats.manual_count, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
                { label: 'Institutions', value: stats.institutions, icon: Ban, gradient: 'from-indigo-500 to-indigo-700' },
              ].map((stat) => (
                <div key={stat.label} className="relative group overflow-hidden bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all hover:shadow-lg">
                  <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.gradient} opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rounded-bl-3xl`} />
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} bg-opacity-10`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Net</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 dark:text-slate-700 uppercase tracking-tight">{stat.label}</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{stat.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {/* Toolbar */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="relative w-full lg:max-w-xs transition-all focus-within:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Search..."
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button
                    onClick={handleExportVisiblePage}
                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:text-brand-500 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-700">Syncing...</p>
                  </div>
                ) : records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Database className="w-8 h-8 text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Empty Registry</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRecords.length === records.length && records.length > 0}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-brand-500 focus:ring-brand-500"
                          />
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Student Info</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Academic Path</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Authority</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {records.map((record, idx) => (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          key={record.id}
                          className={`group hover:bg-slate-50/50 dark:hover:bg-brand-500/[0.02] transition-colors ${selectedRecords.includes(record.id) ? 'bg-brand-500/[0.04]' : ''}`}
                        >
                          <td className="px-6 py-3">
                            <input
                              type="checkbox"
                              checked={selectedRecords.includes(record.id)}
                              onChange={() => toggleRecord(record.id)}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-brand-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">
                                {record.nom_prenom || 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-700 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                  {record.id.slice(0, 8)}
                                </span>
                                <span className="text-[10px] text-slate-800 font-medium italic">
                                  {record.date_naissance || 'Unknown Date'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {record.type_diplome || '—'}
                              </p>
                              <p className="text-[10px] text-slate-800 font-medium mt-0.5">
                                {record.domaine && `${record.domaine} • `}{record.filiere || '—'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-700 truncate max-w-[150px] block">
                              {record.etablissement || 'External'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${sourceStyles[record.source] || 'bg-slate-100 text-slate-900 border-slate-200'}`}>
                              {record.source}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setViewRecord(record)}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 hover:text-brand-500 hover:bg-brand-500/10 transition-all border border-transparent hover:border-brand-500/20"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              <div className="px-6 py-3 bg-slate-50/20 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                  {totalRecords} records total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${p === page
                          ? 'bg-brand-500 text-white'
                          : 'text-slate-800 hover:bg-white border border-transparent hover:border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedRecords.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-3 flex items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3 pl-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-black text-[10px]">
                  {selectedRecords.length}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">Active selection</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/20">
                  Delete All
                </button>
                <button onClick={() => setSelectedRecords([])} className="p-2 text-slate-700 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JSON Upload Modal */}
      <AnimatePresence>
        {showJsonUpload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowJsonUpload(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 max-w-md mx-auto w-full border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Import JSON</h3>
                </div>
                <button onClick={() => setShowJsonUpload(false)} className="p-1 rounded-lg text-slate-700 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-brand-500 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/30"
                onClick={() => jsonFileRef.current?.click()}
              >
                <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={handleJsonUpload} />
                <Upload className="w-8 h-8 text-indigo-500/50 mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-300">Choose Master File</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staging Ingest Modal */}
      <AnimatePresence>
        {showStagingIngest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowStagingIngest(false)} />
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 max-w-xl mx-auto w-full max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-500" />
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Staging</h3>
                </div>
                <div className="flex items-center gap-2">
                  {stagingRecords.length > 0 && (
                    <button
                      onClick={handleIngestAllStaging}
                      disabled={stagingLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" /> Ingest All
                    </button>
                  )}
                  <button onClick={() => setShowStagingIngest(false)} className="p-1 rounded-lg text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {stagingLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
                </div>
              ) : stagingRecords.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl mb-4">
                  <Ban className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                  <p className="text-xs font-bold text-slate-700">Staging is Empty</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="px-3 py-2 text-left text-[9px] font-black text-slate-700 uppercase tracking-widest">Identity</th>
                        <th className="px-3 py-2 text-right text-[9px] font-black text-slate-700 uppercase tracking-widest">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {stagingRecords.map((rec) => (
                        <tr key={rec.id} className="group hover:bg-slate-50 dark:hover:bg-brand-500/5">
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{rec.nom_prenom || 'N/A'}</p>
                            <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest">{rec.source || 'OCR'}</p>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handlePromoteStaging(rec.id)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                title="Ingest Record"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" /> Ingest
                              </button>
                              <button
                                onClick={() => handleDeleteStaging(rec.id)}
                                className="p-1.5 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                title="Delete from Staging"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DatabaseRecordOverlay
        isOpen={!!viewRecord}
        record={viewRecord ? {
          id: viewRecord.id,
          nom_prenom: viewRecord.nom_prenom || 'Unknown',
          date_naissance: viewRecord.date_naissance,
          lieu_naissance: viewRecord.lieu_naissance,
          type_diplome: viewRecord.type_diplome,
          domaine: viewRecord.domaine,
          filiere: viewRecord.filiere,
          specialite: viewRecord.specialite,
          etablissement: viewRecord.etablissement,
          source: viewRecord.source,
          status: viewRecord.status,
          profile_image: (viewRecord as any).profile_image || null,
        } : null}
        onClose={() => setViewRecord(null)}
        onImageUpload={async (file) => {
          if (!viewRecord) return;
          
          try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('record_id', viewRecord.id);
            
            // Get auth token
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            
            // Upload to backend
            const response = await fetch(`${API_URL}/api/records/upload-profile`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error('Failed to upload image');
            }
            
            const data = await response.json();
            
            // Update the local state with the new image URL
            setViewRecord({
              ...viewRecord,
              profile_image: data.image_url
            } as any);
            
            // Refresh the records to get the updated data
            fetchRecords();
          } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image. Please try again.');
          }
        }}
      />
    </div>
  );
}
