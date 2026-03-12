// frontend/src/pages/Optimization.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, BarChart2, DollarSign, Zap, TrendingUp,
  CheckCircle2, Filter, Download, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, Cpu, HardDrive, Activity, Shield,
  AlertTriangle, Info, CheckSquare, Square, ChevronRight,
  Layers, Clock, XCircle, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const token = () => localStorage.getItem('token') || '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  currentCost: number;
  savingsPerMonth: number;
  savingsPercent: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  resource?: string;
  region?: string;
  steps?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  HIGH:   { label: 'High',   bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-500'    },
  MEDIUM: { label: 'Medium', bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-500'  },
  LOW:    { label: 'Low',    bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-500'   },
};

const EFFORT_CONFIG = {
  LOW:    { label: 'Low',    bg: 'bg-green-50',  text: 'text-green-700'  },
  MEDIUM: { label: 'Medium', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  HIGH:   { label: 'High',   bg: 'bg-red-50',    text: 'text-red-700'    },
};

const TYPE_COLORS: Record<string, string> = {
  Compute:    '#6366f1',
  Storage:    '#22c55e',
  Database:   '#f59e0b',
  Serverless: '#a855f7',
  Monitoring: '#06b6d4',
  Security:   '#ef4444',
  Network:    '#ec4899',
  Other:      '#94a3b8',
};

const PIE_COLORS = ['#6366f1', '#ef4444', '#f59e0b'];

// ─── Mock data fallback ───────────────────────────────────────────────────────
const MOCK: Recommendation[] = [
  { id: '1', title: 'Right-size over-provisioned EC2 instances', description: 'Several EC2 instances are consistently running at under 20% CPU. Downsize to the next smaller instance type.', type: 'Compute', category: 'COST', priority: 'HIGH', effort: 'LOW', currentCost: 280, savingsPerMonth: 168, savingsPercent: 60, status: 'OPEN', resource: 'i-0abc123, i-0def456', region: 'us-east-1', steps: ['Review CPU/memory metrics', 'Test on smaller instance type in staging', 'Apply during maintenance window'] },
  { id: '2', title: 'Delete unattached EBS volumes', description: '14 EBS volumes (2.3 TB total) are detached and accumulating storage charges.', type: 'Storage', category: 'COST', priority: 'HIGH', effort: 'LOW', currentCost: 25, savingsPerMonth: 23, savingsPercent: 92, status: 'OPEN', resource: 'vol-0abc, vol-0def (14 total)', region: 'us-east-1' },
  { id: '3', title: 'Purchase Reserved Instances for steady workloads', description: '3 EC2 instances have been running 24/7 for 6+ months. Reserved Instance pricing saves ~40%.', type: 'Compute', category: 'COST', priority: 'HIGH', effort: 'MEDIUM', currentCost: 210, savingsPerMonth: 84, savingsPercent: 40, status: 'OPEN', resource: 'm5.xlarge (3x)', region: 'us-east-1' },
  { id: '4', title: 'Enable Lambda memory optimization', description: 'AWS Lambda Power Tuning shows your functions are over-provisioned by ~30%.', type: 'Serverless', category: 'COST', priority: 'MEDIUM', effort: 'LOW', currentCost: 18, savingsPerMonth: 6, savingsPercent: 33, status: 'OPEN', resource: '6 Lambda functions', region: 'us-east-1' },
  { id: '5', title: 'Remove unused CloudWatch dashboards', description: '8 dashboards have had 0 views in 90 days. CloudWatch charges per dashboard.', type: 'Monitoring', category: 'COST', priority: 'LOW', effort: 'LOW', currentCost: 24, savingsPerMonth: 8, savingsPercent: 33, status: 'OPEN', resource: '8 dashboards', region: 'us-east-1' },
  { id: '6', title: 'Enable S3 Intelligent-Tiering', description: 'Large S3 buckets with infrequent access patterns are ideal for Intelligent-Tiering.', type: 'Storage', category: 'COST', priority: 'MEDIUM', effort: 'LOW', currentCost: 45, savingsPerMonth: 18, savingsPercent: 40, status: 'OPEN', resource: 's3://app-data, s3://logs', region: 'global' },
  { id: '7', title: 'Patch public S3 buckets to private', description: '2 S3 buckets are publicly accessible. No business need was found.', type: 'Security', category: 'SECURITY', priority: 'HIGH', effort: 'LOW', currentCost: 0, savingsPerMonth: 0, savingsPercent: 0, status: 'OPEN', resource: 's3://old-assets, s3://dev-uploads', region: 'global' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Optimization() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [provider, setProvider] = useState('AWS');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');
  const [sortField, setSortField] = useState<'savings' | 'priority' | 'effort'>('savings');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { if (accountId) { loadAccount(); loadRecommendations(); } }, [accountId]);

  const loadAccount = async () => {
    try {
      const r = await fetch(`${API}/api/cloud/accounts/${accountId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) { const d = await r.json(); setAccountName(d.accountName || ''); setProvider(d.provider || 'AWS'); }
    } catch {}
  };

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/optimization/${accountId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) {
        const d = await r.json();
        setRecommendations(d.recommendations?.length ? d.recommendations : MOCK);
      } else setRecommendations(MOCK);
    } catch { setRecommendations(MOCK); }
    setLoading(false);
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const active = recommendations.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
  const totalSavings = active.reduce((s, r) => s + r.savingsPerMonth, 0);
  const totalCurrent = active.reduce((s, r) => s + r.currentCost, 0);
  const savingsPct = totalCurrent > 0 ? (totalSavings / totalCurrent) * 100 : 0;
  const quickWins = active.filter(r => r.effort === 'LOW' && r.priority === 'HIGH').length;
  const applied = recommendations.filter(r => r.status === 'COMPLETED').reduce((s, r) => s + r.savingsPerMonth, 0);

  // Chart data
  const byType = Object.entries(
    active.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + r.savingsPerMonth; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const byPriority = [
    { name: 'High',   value: active.filter(r => r.priority === 'HIGH').reduce((s, r) => s + r.savingsPerMonth, 0) },
    { name: 'Medium', value: active.filter(r => r.priority === 'MEDIUM').reduce((s, r) => s + r.savingsPerMonth, 0) },
    { name: 'Low',    value: active.filter(r => r.priority === 'LOW').reduce((s, r) => s + r.savingsPerMonth, 0) },
  ].filter(d => d.value > 0);

  // Filter + sort
  const types = [...new Set(recommendations.map(r => r.type))];
  const filtered = recommendations
    .filter(r => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      if (filterPriority !== 'ALL' && r.priority !== filterPriority) return false;
      if (filterType !== 'ALL' && r.type !== filterType) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const pOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const eOrder = { LOW: 3, MEDIUM: 2, HIGH: 1 };
      if (sortField === 'savings') return sortDir === 'desc' ? b.savingsPerMonth - a.savingsPerMonth : a.savingsPerMonth - b.savingsPerMonth;
      if (sortField === 'priority') return sortDir === 'desc' ? pOrder[b.priority] - pOrder[a.priority] : pOrder[a.priority] - pOrder[b.priority];
      if (sortField === 'effort') return sortDir === 'desc' ? eOrder[b.effort] - eOrder[a.effort] : eOrder[a.effort] - eOrder[b.effort];
      return 0;
    });

  const toggleSort = (f: typeof sortField) => { if (sortField === f) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortField(f); setSortDir('desc'); } };
  const SortIcon = ({ f }: { f: typeof sortField }) => sortField === f ? (sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />) : <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(r => r.id)));

  const applySelected = async () => {
    for (const id of selected) {
      try {
        await fetch(`${API}/api/optimization/${accountId}/recommendations/${id}/apply`, {
          method: 'POST', headers: { Authorization: `Bearer ${token()}` }
        });
      } catch {}
    }
    await loadRecommendations();
    setSelected(new Set());
  };

  const dismiss = async (id: string) => {
    try {
      await fetch(`${API}/api/optimization/${accountId}/recommendations/${id}/dismiss`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }
      });
      await loadRecommendations();
    } catch {}
  };

  const exportCSV = () => {
    const rows = [['Title', 'Type', 'Priority', 'Effort', 'Current Cost', 'Savings/mo', '% Saved', 'Status']];
    filtered.forEach(r => rows.push([r.title, r.type, r.priority, r.effort, `$${r.currentCost}`, `$${r.savingsPerMonth}`, `${r.savingsPercent}%`, r.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'optimization.csv'; a.click();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading recommendations...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Cost Optimization</h1>
            <p className="text-sm text-gray-500 mt-1">{provider} · {accountName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadRecommendations} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              <BarChart2 className="w-4 h-4" /> Analytics
            </button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Savings Opportunity', value: `$${Math.round(totalSavings).toLocaleString()}`, sub: `${savingsPct.toFixed(1)}% potential reduction`, icon: DollarSign, iconBg: 'bg-green-100', iconColor: 'text-green-600', subColor: 'text-green-600' },
            { label: 'Active Recommendations', value: active.length, sub: `${filtered.length} visible`, icon: Activity, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', subColor: 'text-blue-500' },
            { label: 'Quick Wins', value: quickWins, sub: 'Low effort, high priority', icon: Zap, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', subColor: 'text-amber-500' },
            { label: 'Applied Savings', value: `$${Math.round(applied).toLocaleString()}`, sub: `${recommendations.filter(r => r.status === 'COMPLETED').length} implemented`, icon: TrendingUp, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', subColor: applied > 0 ? 'text-purple-500' : 'text-gray-400' },
          ].map((tile, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">{tile.label}</span>
                <div className={`w-9 h-9 ${tile.iconBg} rounded-xl flex items-center justify-center`}>
                  <tile.icon className={`w-4.5 h-4.5 ${tile.iconColor}`} style={{ width: 18, height: 18 }} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{tile.value}</div>
              <div className={`text-sm ${tile.subColor}`}>{tile.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Savings by Type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Savings by Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byType} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(v: any) => [`$${v}/mo`, 'Savings']}
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byType.map((entry, i) => <Cell key={i} fill={TYPE_COLORS[entry.name] || '#6366f1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Savings by Priority */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Savings by Priority</h3>
            {byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byPriority} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {byPriority.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`$${v}/mo`, 'Savings']}
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        {value}: <strong style={{ color: entry.color }}>${entry.payload.value}/mo</strong>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Table toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search optimizations..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
            </div>

            {/* Status pills */}
            <div className="flex gap-1">
              {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'ALL'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {s === 'IN_PROGRESS' ? 'In Progress' : s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Filter className="w-4 h-4" /> Filters
            </button>

            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>

            {selected.size > 0 && (
              <button onClick={applySelected}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <CheckCircle2 className="w-4 h-4" /> Apply {selected.size} selected
              </button>
            )}
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Priority:</span>
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                <button key={p} onClick={() => setFilterPriority(p)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterPriority === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
              <span className="text-xs font-medium text-gray-500 ml-3">Type:</span>
              {['ALL', ...types].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  {t === 'ALL' ? 'All Types' : t}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-10 pl-5 py-3">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 py-3 px-3">Recommendation</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-3 px-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-3 px-3 cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                  <span className="flex items-center gap-1">Priority <SortIcon f="priority" /></span>
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 py-3 px-3 cursor-pointer select-none" onClick={() => toggleSort('effort')}>
                  <span className="flex items-center gap-1">Effort <SortIcon f="effort" /></span>
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 py-3 px-3">Current Cost</th>
                <th className="text-right text-xs font-semibold text-gray-500 py-3 px-3 cursor-pointer select-none" onClick={() => toggleSort('savings')}>
                  <span className="flex items-center gap-1 justify-end">Savings/mo <SortIcon f="savings" /></span>
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 py-3 px-3">% Saved</th>
                <th className="text-left text-xs font-semibold text-gray-500 py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-gray-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No recommendations match your filters
                  </td>
                </tr>
              ) : filtered.map(rec => (
                <>
                  <tr key={rec.id}
                    onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${expanded === rec.id ? 'bg-indigo-50/40' : 'hover:bg-gray-50'} ${rec.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                    <td className="pl-5 py-3.5">
                      <button onClick={e => { e.stopPropagation(); toggleSelect(rec.id); }} className="text-gray-400 hover:text-gray-600">
                        {selected.has(rec.id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-800 leading-snug">{rec.title}</div>
                          {rec.resource && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{rec.resource}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                        <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[rec.type] || '#94a3b8' }} />
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${PRIORITY_CONFIG[rec.priority].bg} ${PRIORITY_CONFIG[rec.priority].text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[rec.priority].dot}`} />
                        {PRIORITY_CONFIG[rec.priority].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${EFFORT_CONFIG[rec.effort].bg} ${EFFORT_CONFIG[rec.effort].text}`}>
                        {EFFORT_CONFIG[rec.effort].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right text-sm text-gray-600">${rec.currentCost.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="text-sm font-semibold text-green-600">${rec.savingsPerMonth.toLocaleString()}</span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {rec.savingsPercent > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(rec.savingsPercent, 100)}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{rec.savingsPercent}%</span>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {rec.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Done</span>
                        ) : (
                          <>
                            <button onClick={() => { toggleSelect(rec.id); }}
                              className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Apply
                            </button>
                            <button onClick={() => dismiss(rec.id)}
                              className="px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
                              Dismiss
                            </button>
                          </>
                        )}
                        <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${expanded === rec.id ? 'rotate-90' : ''}`} />
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expanded === rec.id && (
                    <tr key={`${rec.id}-exp`} className="bg-indigo-50/30">
                      <td colSpan={9} className="px-5 py-4">
                        <div className="grid grid-cols-3 gap-6">
                          <div className="col-span-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">{rec.description}</p>
                            {rec.steps && rec.steps.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Implementation Steps</h4>
                                <ol className="space-y-1.5">
                                  {rec.steps.map((step, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                              {rec.region && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Region</span>
                                  <span className="font-medium text-gray-700">{rec.region}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Current Cost</span>
                                <span className="font-medium text-gray-700">${rec.currentCost}/mo</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Savings</span>
                                <span className="font-semibold text-green-600">-${rec.savingsPerMonth}/mo</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">New Cost</span>
                                <span className="font-medium text-gray-700">${rec.currentCost - rec.savingsPerMonth}/mo</span>
                              </div>
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Annual Savings</span>
                                  <span className="font-bold text-green-600">${(rec.savingsPerMonth * 12).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Table footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-400">
              Showing {filtered.length} of {recommendations.length} recommendations
              {selected.size > 0 && <span className="ml-2 text-indigo-600 font-medium">· {selected.size} selected</span>}
            </span>
            <span className="text-xs text-gray-400">
              Potential: <span className="text-green-600 font-semibold">${Math.round(totalSavings).toLocaleString()}/mo · ${Math.round(totalSavings * 12).toLocaleString()}/yr</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
