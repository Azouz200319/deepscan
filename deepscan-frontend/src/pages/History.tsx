import { useState, useEffect } from 'react';
import {
  ArchiveRestore,
  Loader2,
  CheckCircle2,
  X,
  RotateCcw,
  Eye,
  Filter,
} from 'lucide-react';
import { getHistory, restoreFromHistory } from '../lib/api';
import StudentDocumentOverlay from '../components/StudentDocumentOverlay';

interface HistoryRecord {
  id: string;
  original_id: string;
  nom_prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
  source: string | null;
  status: string | null;
  created_at: string | null;
  deleted_at: string | null;
  origin_table: string | null;
}

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Flagged'>('All');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getHistory({
        status: statusFilter === 'All' ? undefined : statusFilter,
        page: 1, // Reset to page 1 on filter
      });
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, [statusFilter]);

  const handleRestore = async (id: string) => {
    try {
      const result = await restoreFromHistory(id);
      setActionMsg(`Restored as ${result.id}`);
      setSelectedRecord(null);
      loadRecords();
    } catch {
      setActionMsg('Failed to restore');
    }
  };

  const originBadge = (origin: string | null) => {
    if (origin === 'staging') return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">Staging</span>;
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-700">Records</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History / Archive</h1>
        <p className="text-slate-800 dark:text-slate-700 mt-1">
          Review deleted records and restore them if needed. Nothing is permanently lost until you choose.
        </p>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-emerald-500 hover:text-emerald-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-16 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
          <p className="text-sm text-slate-800 dark:text-slate-700">Loading history...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <ArchiveRestore className="w-8 h-8 text-slate-300 dark:text-slate-900" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Deleted Records</h3>
          <p className="text-sm text-slate-700 mt-1 max-w-md">
            When records or staged results are deleted, they appear here so you can restore them later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Records list */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Deleted Records ({records.length})</h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-700" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs border-none bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="All">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Verified">Verified</option>
                  <option value="Flagged">Flagged</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-700 uppercase">Original ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-700 uppercase">Nom & Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-700 uppercase">Origin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-700 uppercase">Deleted At</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-800 dark:text-slate-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((rec) => (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedRecord?.id === rec.id ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}
                      onClick={() => setSelectedRecord(rec)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-700">{rec.original_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{rec.nom_prenom || '-'}</td>
                      <td className="px-4 py-3">{originBadge(rec.origin_table)}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{rec.deleted_at || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="View details"
                            onClick={(e) => { e.stopPropagation(); setSelectedRecord(rec); }}
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestore(rec.id); }}
                            className="p-1.5 rounded-lg text-cyan-500 hover:bg-cyan-50 hover:text-cyan-700"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel - Now uses Radial Overlay */}
          <div>
            <StudentDocumentOverlay
              isOpen={!!selectedRecord}
              student={selectedRecord ? {
                id: selectedRecord.original_id || selectedRecord.id,
                nom_prenom: selectedRecord.nom_prenom || 'Unknown',
                date_naissance: selectedRecord.date_naissance,
                lieu_naissance: selectedRecord.lieu_naissance,
                type_diplome: selectedRecord.type_diplome,
                domaine: selectedRecord.domaine,
                filiere: selectedRecord.filiere,
                specialite: selectedRecord.specialite,
                etablissement: selectedRecord.etablissement,
                source: selectedRecord.source || 'Archive',
                verify_status: selectedRecord.status,
              } : null}
              onClose={() => setSelectedRecord(null)}
              isHistory={true}
            />
            {!selectedRecord && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <ArchiveRestore className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-700">Select a record to view details</p>
                <p className="text-xs text-slate-700 dark:text-slate-800 mt-1">Click on any row to inspect and restore</p>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
