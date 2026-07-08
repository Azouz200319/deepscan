import { useState, useEffect } from 'react';
import {
  UserX,
  Loader2,
  CheckCircle2,
  X,
  Search,
  Trash2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { getBlacklist, addToBlacklist, removeFromBlacklist } from '../lib/api';

interface BlacklistEntry {
  id: string;
  university_id: string;
  user_id: string;
  nom_prenom: string;
  date_naissance: string | null;
  email: string | null;
  student_id: string | null;
  reason: string;
  created_at: string;
}

export default function Blacklist() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    nom_prenom: '',
    date_naissance: '',
    student_id: '',
    reason: '',
  });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await getBlacklist({ search: searchTerm || undefined });
      setEntries(data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEntries(); }, [searchTerm]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addToBlacklist(formData);
      setActionMsg('Added to blacklist successfully');
      setShowAddModal(false);
      setFormData({ nom_prenom: '', date_naissance: '', student_id: '', reason: '' });
      loadEntries();
    } catch (err: any) {
      setActionMsg(err.detail || 'Failed to add to blacklist');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFromBlacklist(id);
      setActionMsg('Removed from blacklist successfully');
      loadEntries();
    } catch {
      setActionMsg('Failed to remove from blacklist');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Blacklist</h1>
        <p className="text-slate-800 dark:text-slate-700 mt-1">
          Manage individuals flagged for forgery or identity mismatch. Blacklisted entries will be automatically flagged during verification.
        </p>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" /> Add to Blacklist
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
          <UserX className="w-12 h-12 mx-auto text-slate-700 mb-3" />
          <p className="text-slate-900 dark:text-slate-700">No blacklisted entries found</p>
          <p className="text-sm text-slate-800 dark:text-slate-800 mt-1">Add individuals when forgery or identity mismatch is detected</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-700 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-700 uppercase tracking-wider">Date of Birth</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-700 uppercase tracking-wider">Student ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-700 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-700 uppercase tracking-wider">Added</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-900 dark:text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-slate-900 dark:text-white">{entry.nom_prenom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-700">{entry.date_naissance || '-'}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-700">{entry.student_id || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
                      {entry.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-800">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove from blacklist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add to Blacklist</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-700 hover:text-slate-900 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.nom_prenom}
                  onChange={(e) => setFormData({ ...formData, nom_prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="text"
                  value={formData.date_naissance}
                  onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Student ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason *</label>
                <select
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select reason</option>
                  <option value="Forgery detected">Forgery detected</option>
                  <option value="Identity mismatch">Identity mismatch</option>
                  <option value="Duplicate submission">Duplicate submission</option>
                  <option value="Suspicious activity">Suspicious activity</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
