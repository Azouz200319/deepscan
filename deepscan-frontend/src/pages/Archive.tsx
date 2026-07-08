import { useState, useEffect } from 'react';
import { 
  Archive, 
  Calendar, 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ShieldCheck,
  Eye,
  Loader2,
  ArrowLeft,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import ForensicOverlay from '../components/ForensicOverlay';
import { getAuditSessions, getAuditSessionDetails, deleteAuditSession } from '../lib/api';
import { useStudentOverlay } from '../lib/StudentOverlayContext';

export default function AuditArchive() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { openOverlay } = useStudentOverlay();

  // Forensic states
  const [isForensicOpen, setIsForensicOpen] = useState(false);
  const [selectedForensicResults, setSelectedForensicResults] = useState<any>(null);
  const [selectedForensicFilename, setSelectedForensicFilename] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getAuditSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this audit session? This action cannot be undone.')) {
      return;
    }
    try {
      console.log('Deleting session:', sessionId);
      await deleteAuditSession(sessionId);
      console.log('Session deleted successfully');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert(`Failed to delete session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const loadSessionDetail = async (id: string) => {
    setSelectedSessionId(id);
    setLoadingDetail(true);
    try {
      const data = await getAuditSessionDetails(id);
      setSessionDetail(data);
    } catch (err) {
      console.error('Failed to load session detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getGroupedSessions = () => {
    const grouped: Record<string, any[]> = {};
    sessions.forEach(session => {
      const date = new Date(session.created_at);
      const dateKey = date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  };

  const groupedSessions = getGroupedSessions();
  const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  if (selectedSessionId) {
    return (
      <div className="space-y-6 pb-20">
        <button 
          onClick={() => { setSelectedSessionId(null); setSessionDetail(null); }}
          className="flex items-center gap-2 text-slate-800 hover:text-brand-600 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archive
        </button>

        {loadingDetail ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-800 mt-4">Retrieving audit results...</p>
          </div>
        ) : sessionDetail && (
          <>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{sessionDetail.session.name}</h1>
                  <p className="text-sm text-slate-800 dark:text-slate-700">Archived on {formatDate(sessionDetail.session.created_at)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Total Items</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{sessionDetail.results.length}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                  <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Authentic</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {sessionDetail.results.filter((r: any) => r.forgery_verdict === 'Authentic').length}
                  </p>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                  <p className="text-xs font-bold text-rose-600/60 uppercase tracking-widest mb-1">Verification Match</p>
                  <p className="text-2xl font-black text-rose-700 dark:text-rose-400">
                    {sessionDetail.results.filter((r: any) => r.verify_status === 'match').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
               <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-slate-800 dark:text-slate-700 uppercase text-[10px] tracking-widest">Document</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-800 dark:text-slate-700 uppercase text-[10px] tracking-widest">Extraction</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-800 dark:text-slate-700 uppercase text-[10px] tracking-widest">Verification</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-800 dark:text-slate-700 uppercase text-[10px] tracking-widest">Forensics</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sessionDetail.results.map((r: any) => {
                      const ext = JSON.parse(r.extracted_json || '{}');
                      const db = JSON.parse(r.verify_db_record || '{}');

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-slate-700 group-hover:text-brand-500 transition-colors" />
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{r.filename}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-800 dark:text-white leading-tight">{ext.nom_prenom || '—'}</p>
                            <p className="text-[10px] text-slate-700 font-mono italic mt-0.5">{(r.id || 'N/A').slice(0, 8)}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                                r.verify_status === 'match' ? 'bg-emerald-50 text-emerald-600' :
                                r.verify_status === 'mismatch' ? 'bg-rose-50 text-rose-600' :
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {r.verify_status === 'match' ? <CheckCircle2 className="w-3 h-3" /> : 
                                 r.verify_status === 'mismatch' ? <XCircle className="w-3 h-3" /> : 
                                 <AlertTriangle className="w-3 h-3" />}
                                {r.verify_status.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                                r.forgery_verdict === 'Authentic' ? 'bg-emerald-50 text-emerald-600' :
                                r.forgery_verdict === 'Suspicious' ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                              }`}>
                                <ShieldCheck className="w-3 h-3" />
                                {r.forgery_verdict}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <div className="flex items-center justify-end gap-1">
                               <button
                                  onClick={() => openOverlay({
                                      id: r.id,
                                      ...(db || ext || {}),
                                      verify_status: r.verify_status,
                                      extracted_fields: ext
                                  } as any)}
                                  className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
                               >
                                  <Eye className="w-5 h-5" />
                               </button>
                               <button
                                  onClick={() => {
                                    const fResult = JSON.parse(r.forgery_details_json || '{}');
                                    setSelectedForensicResults(fResult);
                                    setSelectedForensicFilename(r.filename);
                                    setIsForensicOpen(true);
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                               >
                                  <ShieldAlert className="w-5 h-5" />
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
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Archive</h1>
        <p className="text-slate-800 dark:text-slate-700 mt-1">Review historical batch verification and forgery detection sessions.</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
          <input 
            type="text" 
            placeholder="Search sessions by name..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-20 flex justify-center shadow-sm">
           <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-20 flex flex-col items-center text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
            <Archive className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Audits Found</h3>
          <p className="text-sm text-slate-800 max-w-sm mt-2">
            Archived sessions will appear here after you run a "Full Process" in Scan & Extract and click "Archive Audit Result".
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{date}</h2>
                  <p className="text-xs text-slate-800 dark:text-slate-700">{groupedSessions[date].length} session{groupedSessions[date].length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {groupedSessions[date].map((s) => (
                    <div
                      key={s.id}
                      onClick={() => loadSessionDetail(s.id)}
                      className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-brand-500/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                      {/* Highlight bar */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 group-hover:w-2 transition-all opacity-0 group-hover:opacity-100" />

                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 group-hover:text-brand-500 transition-colors shadow-sm">
                          <Archive className="w-5 h-5" />
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 mb-1">{s.name || 'Untitled Audit'}</h3>
                      <div className="flex items-center gap-2 text-slate-700 text-[10px] font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(s.created_at)}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full uppercase">Audit: {s.id.split('-')[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ForensicOverlay 
        isOpen={isForensicOpen}
        onClose={() => setIsForensicOpen(false)}
        results={selectedForensicResults}
        filename={selectedForensicFilename}
      />
    </div>
  );
}
