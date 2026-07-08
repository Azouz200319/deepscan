import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpCircle, Database, Loader2, RefreshCw, ShieldCheck, Trash2, Layers, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { deleteStaging, getStaging, promoteStaging } from '../lib/api';

interface StagingRecord {
  id: string;
  nom_prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
  source: string | null;
  created_at: string | null;
  raw_ocr_text: string | null;
}

export default function Staging() {
  const [records, setRecords] = useState<StagingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getStaging();
      setRecords((data.records || []) as StagingRecord[]);
    } catch (err) {
      setRecords([]);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load staging records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const flashMessage = (message: string) => {
    setActionMsg(message);
    window.setTimeout(() => setActionMsg(''), 3000);
  };

  const handlePromote = async (id: string) => {
    try {
      const result = await promoteStaging(id);
      flashMessage(result.message || `Promoted to database as ${result.id}`);
      setRecords((prev) => prev.filter((record) => record.id !== id));
      await loadRecords();
    } catch (err) {
      flashMessage(err instanceof Error ? err.message : 'Promote failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this staged OCR result? It will be moved to history.')) return;
    try {
      const result = await deleteStaging(id);
      flashMessage(result.message || 'Staging record deleted');
      setRecords((prev) => prev.filter((record) => record.id !== id));
      await loadRecords();
    } catch (err) {
      flashMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const total = records.length;
  const authenticated = records.filter((record) => record.nom_prenom || record.type_diplome || record.etablissement).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-brand-500/10 rounded-lg">
              <Layers className="w-5 h-5 text-brand-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Staging</h1>
          </div>
          <p className="text-slate-800 dark:text-slate-700 text-xs font-medium">Review OCR results before promoting them into the main database</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRecords}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-500" /> Refresh
          </button>
          <Link
            to="/dashboard/database"
            className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/10"
          >
            <Database className="w-3.5 h-3.5" /> Open Database
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800">Queued OCR</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800">Ready to Promote</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{authenticated}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800">Workflow</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-300 mt-2">Save OCR here, then promote or delete from this page.</p>
        </div>
      </div>

      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && !loading && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Staged Records</h2>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-700">These OCR results have not been promoted to the database yet.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-700">
            <ShieldCheck className="w-4 h-4 text-brand-500" /> Verification Queue
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-700">Loading staging queue...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Database className="w-8 h-8 text-slate-200 dark:text-slate-700 mb-4" />
            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Staging is empty</p>
            <p className="text-xs text-slate-800 dark:text-slate-700 mt-2 max-w-md">
              Use the Create Database flow to save OCR results here before promoting them into the main records table.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {records.map((record) => {
              const createdAt = record.created_at
                ? new Date(record.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                : 'Unknown';
              const subtitle = [record.type_diplome, record.domaine, record.filiere].filter(Boolean).join(' · ') || 'OCR result';

              return (
                <div key={record.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-slate-50/60 dark:hover:bg-brand-500/[0.02] transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{record.nom_prenom || 'Unnamed OCR result'}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                        {record.source || 'OCR'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-700 truncate mt-1">{subtitle}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-700 dark:text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock3 className="w-3 h-3" /> {createdAt}</span>
                      <span className="truncate">ID: {record.id}</span>
                    </div>
                    {record.raw_ocr_text ? (
                      <details className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-slate-700">View raw OCR</summary>
                        <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-800 dark:text-slate-300">{record.raw_ocr_text}</pre>
                      </details>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePromote(record.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" /> Promote
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}