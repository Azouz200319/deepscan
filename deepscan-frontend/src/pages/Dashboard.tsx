import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  ShieldCheck,
  FileWarning,
  Database,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getDashboardStats } from '../lib/api';

const chartData = [
  { name: 'Jan', scans: 65, verified: 45, forgeries: 2 },
  { name: 'Feb', scans: 85, verified: 62, forgeries: 3 },
  { name: 'Mar', scans: 120, verified: 98, forgeries: 1 },
  { name: 'Apr', scans: 150, verified: 110, forgeries: 5 },
  { name: 'May', scans: 180, verified: 145, forgeries: 4 },
  { name: 'Jun', scans: 210, verified: 170, forgeries: 3 },
  { name: 'Jul', scans: 195, verified: 160, forgeries: 5 },
];

const pieData = [
  { name: 'Authentic', value: 869, color: '#9a6237' },
  { name: 'Suspicious', value: 45, color: '#f59e0b' },
  { name: 'Forged', value: 23, color: '#ef4444' },
  { name: 'Pending', value: 310, color: '#6366f1' },
];

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  verified: 'bg-orange-100 text-orange-700',
  flagged: 'bg-rose-100 text-rose-700',
};

export default function Dashboard() {
  const [dbStats, setDbStats] = useState({ 
    total_scans: 0, 
    verified: 0, 
    pending: 0, 
    flagged: 0, 
    trend: [] as Array<{day: string, scans: number, verified: number, flagged: number}>,
    recent: [] as Array<{ id: string; nom_prenom: string | null; type_diplome: string | null; status: string; created_at: string; etablissement: string | null }> 
  });

  useEffect(() => {
    getDashboardStats().then(setDbStats).catch(() => { });
  }, []);

  const dynamicChartData = dbStats.trend && dbStats.trend.length > 0
    ? dbStats.trend.map(t => ({
        name: t.day.split('-').slice(1).join('/'), // Show MM/DD
        scans: t.scans,
        verified: t.verified,
        forgeries: t.flagged
      }))
    : chartData; // Fallback to sample if no data yet

  const dynamicPieData = (dbStats.total_scans > 0)
    ? [
        { name: 'Authentic', value: dbStats.verified, color: '#9a6237' },
        { name: 'Flagged', value: dbStats.flagged, color: '#ef4444' },
        { name: 'Pending', value: dbStats.pending, color: '#6366f1' },
      ]
    : pieData;

  const stats = [
    {
      label: 'Total Scans',
      value: String(dbStats.total_scans),
      icon: ScanLine,
      color: 'from-brand-500 to-brand-700',
      bgLight: 'bg-brand-50 dark:bg-brand-500/10',
      textColor: 'text-brand-600 dark:text-brand-400',
    },
    {
      label: 'Verified IDs',
      value: String(dbStats.verified),
      icon: ShieldCheck,
      color: 'from-brand-500 to-brand-600',
      bgLight: 'bg-brand-50',
      textColor: 'text-brand-600',
    },
    {
      label: 'Flagged',
      value: String(dbStats.flagged),
      icon: FileWarning,
      color: 'from-rose-500 to-red-600',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
    },
    {
      label: 'Pending Review',
      value: String(dbStats.pending),
      icon: Database,
      color: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-800 dark:text-slate-700 mt-1">
          Overview of your document intelligence operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-800 dark:text-slate-700 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${stat.textColor} ${stat.bgLight} px-2 py-0.5 rounded-full`}>
                <TrendingUp className="w-3 h-3" />
                Live
              </div>
              <span className="text-xs text-slate-700">from database</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Area Chart */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Activity Trend</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">Live Trend</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-700">Performance and verification volumes over the last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-slate-800 dark:text-slate-700">Scans</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-slate-800 dark:text-slate-700">Verified</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dynamicChartData}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5a2b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5a2b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9a6237" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#9a6237" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  color: '#f8fafc'
                }}
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="#8b5a2b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScans)"
              />
              <Area
                type="monotone"
                dataKey="verified"
                stroke="#9a6237"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVerified)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Database Distribution</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">Database Sync</span>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-700 mb-4">Breakdown of all records by verification status</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dynamicPieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {dynamicPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  color: '#f8fafc'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-4">
            {dynamicPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-900 dark:text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent records</h3>
            <p className="text-sm text-slate-800 dark:text-slate-700">Latest rows in your records database</p>
          </div>
          <Link
            to="/database"
            className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 transition-colors"
          >
            Open database <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(dbStats.recent || []).length === 0 ? (
            <p className="text-sm text-slate-800 py-8 text-center">
              No records yet. Go to <Link to="/scan" className="text-cyan-600 font-medium hover:underline">Scan &amp; Extract</Link> to add data.
            </p>
          ) : (
            (dbStats.recent || []).map((r) => {
              const st = (r.status || 'Pending').toLowerCase();
              const title = r.nom_prenom || r.id;
              const sub = [r.type_diplome, r.etablissement].filter(Boolean).join(' · ') || 'Record';
              const when = r.created_at
                ? new Date(r.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                : '—';
              return (
                <div key={r.id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{title}</p>
                      <p className="text-xs text-slate-800 truncate">{sub}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-700 shrink-0" />
                        <span className="text-xs text-slate-700">{when}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${statusStyles[st] || 'bg-slate-100 text-slate-900'}`}>
                    {st === 'verified' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {r.status || 'Pending'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
