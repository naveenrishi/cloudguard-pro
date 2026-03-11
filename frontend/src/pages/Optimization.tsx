import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft, TrendingDown, DollarSign, Zap, Search, Filter,
  ArrowUpDown, CheckCircle, XCircle, AlertCircle, Download,
  BarChart3, Target, TrendingUp, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Optimization {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  currentCost: number;
  potentialSavings: number;
  savingsPercent: number;
  resources: string[];
}

// ─── Build optimizations from real cost + resource data ───────────────────────
function buildOptimizations(costs: any, resources: any[]): Optimization[] {
  const opts: Optimization[] = [];

  // 1. Stopped EC2 instances (real resource data)
  const stoppedEC2 = resources.filter(r => r.type === 'EC2' && r.state === 'stopped');
  if (stoppedEC2.length > 0) {
    const monthlyCost = stoppedEC2.length * 25;
    opts.push({
      id: 'stopped-ec2',
      title: `Terminate ${stoppedEC2.length} Stopped EC2 Instances`,
      description: `${stoppedEC2.length} EC2 instances are stopped but still incurring EBS and EIP charges.`,
      type: 'Compute',
      priority: 'High',
      effort: 'Low',
      currentCost: monthlyCost,
      potentialSavings: Math.round(monthlyCost * 0.9),
      savingsPercent: 90,
      resources: stoppedEC2.slice(0, 5).map(r => r.name || r.id),
    });
  }

  // 2. EC2 On-Demand → Reserved Instances (from costs services)
  const ec2Service = costs.services?.find((s: any) =>
    s.name.toLowerCase().includes('ec2') || s.name.toLowerCase().includes('compute')
  );
  if (ec2Service && ec2Service.cost > 50) {
    opts.push({
      id: 'ec2-reserved',
      title: 'Convert EC2 On-Demand to Reserved Instances (1yr)',
      description: 'Stable EC2 workloads qualify for 1-year reserved instance pricing, saving ~40%.',
      type: 'Compute',
      priority: 'High',
      effort: 'Low',
      currentCost: Math.round(ec2Service.cost),
      potentialSavings: Math.round(ec2Service.cost * 0.4),
      savingsPercent: 40,
      resources: ['EC2 On-Demand fleet'],
    });
  }

  // 3. S3 storage optimisation
  const s3Buckets = resources.filter(r => r.type === 'S3' || r.type === 'GCSBucket' || r.type === 'StorageAccount');
  const s3Service = costs.services?.find((s: any) => s.name.toLowerCase().includes('s3') || s.name.toLowerCase().includes('storage'));
  if (s3Buckets.length > 10) {
    const savingAmt = s3Service ? Math.round(s3Service.cost * 0.3) : s3Buckets.length * 0.5;
    opts.push({
      id: 's3-lifecycle',
      title: `Add Lifecycle Policies to ${s3Buckets.length} Storage Buckets`,
      description: 'Move infrequently accessed objects to cheaper storage tiers (Glacier / Cool / Nearline).',
      type: 'Storage',
      priority: 'Medium',
      effort: 'Low',
      currentCost: s3Service ? Math.round(s3Service.cost) : s3Buckets.length,
      potentialSavings: savingAmt,
      savingsPercent: 30,
      resources: s3Buckets.slice(0, 5).map(r => r.name || r.id),
    });
  }

  // 4. RDS optimisation
  const rdsService = costs.services?.find((s: any) =>
    s.name.toLowerCase().includes('rds') || s.name.toLowerCase().includes('database') || s.name.toLowerCase().includes('sql')
  );
  if (rdsService && rdsService.cost > 20) {
    opts.push({
      id: 'rds-reserved',
      title: 'Purchase RDS Reserved Instances',
      description: 'RDS databases running 24/7 are ideal candidates for reserved instance pricing (up to 43% savings).',
      type: 'Database',
      priority: 'High',
      effort: 'Low',
      currentCost: Math.round(rdsService.cost),
      potentialSavings: Math.round(rdsService.cost * 0.43),
      savingsPercent: 43,
      resources: resources.filter(r => r.type === 'RDS').slice(0, 3).map(r => r.name || r.id),
    });
  }

  // 5. NAT Gateway → NAT Instance
  const vpcService = costs.services?.find((s: any) => s.name.toLowerCase().includes('vpc') || s.name.toLowerCase().includes('network'));
  if (vpcService && vpcService.cost > 10) {
    opts.push({
      id: 'nat-gateway',
      title: 'Replace NAT Gateway with NAT Instance',
      description: 'NAT Instances can replace NAT Gateways for dev/staging environments at a fraction of the cost.',
      type: 'Network',
      priority: 'Medium',
      effort: 'Medium',
      currentCost: Math.round(vpcService.cost),
      potentialSavings: Math.round(vpcService.cost * 0.6),
      savingsPercent: 60,
      resources: ['NAT Gateway'],
    });
  }

  // 6. Lambda optimisation
  const lambdaService = costs.services?.find((s: any) => s.name.toLowerCase().includes('lambda'));
  if (lambdaService && lambdaService.cost > 5) {
    opts.push({
      id: 'lambda-memory',
      title: 'Right-size Lambda Memory Allocations',
      description: 'Over-provisioned Lambda memory increases cost. Use Lambda Power Tuning to optimise.',
      type: 'Serverless',
      priority: 'Low',
      effort: 'Low',
      currentCost: Math.round(lambdaService.cost),
      potentialSavings: Math.round(lambdaService.cost * 0.25),
      savingsPercent: 25,
      resources: ['Lambda functions'],
    });
  }

  // 7. Cost Explorer / monitoring overhead
  const ceService = costs.services?.find((s: any) => s.name.toLowerCase().includes('cost explorer'));
  if (ceService && ceService.cost > 10) {
    opts.push({
      id: 'cost-explorer',
      title: 'Reduce Cost Explorer API Call Frequency',
      description: 'Cost Explorer charges per API call. Caching results can significantly cut this cost.',
      type: 'Monitoring',
      priority: 'Medium',
      effort: 'Low',
      currentCost: Math.round(ceService.cost),
      potentialSavings: Math.round(ceService.cost * 0.5),
      savingsPercent: 50,
      resources: ['AWS Cost Explorer'],
    });
  }

  // 8. Security Hub / Inspector (if high cost)
  const secService = costs.services?.find((s: any) => s.name.toLowerCase().includes('security hub') || s.name.toLowerCase().includes('inspector'));
  if (secService && secService.cost > 10) {
    opts.push({
      id: 'security-scope',
      title: 'Narrow Security Hub / Inspector Scope',
      description: 'Review enabled Security Hub standards and disable unused ones to reduce per-finding charges.',
      type: 'Security',
      priority: 'Low',
      effort: 'Medium',
      currentCost: Math.round(secService.cost),
      potentialSavings: Math.round(secService.cost * 0.35),
      savingsPercent: 35,
      resources: ['AWS Security Hub', 'Amazon Inspector'],
    });
  }

  return opts;
}

// ─── Component ────────────────────────────────────────────────────────────────
const Optimization: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costs, setCosts] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterEffort, setFilterEffort] = useState('All');
  const [sortField, setSortField] = useState<string>('potentialSavings');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);
  const [showCharts, setShowCharts] = useState(true);
  const [appliedOptimizations, setAppliedOptimizations] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [costsRes, resourcesRes] = await Promise.all([
        fetch(`${API}/api/cloud/accounts/${accountId}/costs`, { headers }),
        fetch(`${API}/api/cloud/accounts/${accountId}/resources`, { headers }),
      ]);

      const costsData = costsRes.ok ? await costsRes.json() : {};
      const resourcesData = resourcesRes.ok ? await resourcesRes.json() : { resources: [] };

      setCosts(costsData);

      if (accountId.includes('aws')) setProvider('AWS');
      else if (accountId.includes('azure')) setProvider('Azure');
      else if (accountId.includes('gcp')) setProvider('GCP');

      const opts = buildOptimizations(costsData, resourcesData.resources || []);
      setOptimizations(opts);
    } catch (err: any) {
      setError(err.message || 'Failed to load optimization data');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtering & sorting ───────────────────────────────────────────────────
  const filteredOptimizations = optimizations.filter(opt => {
    const matchesSearch = opt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || opt.type === filterType;
    const matchesPriority = filterPriority === 'All' || opt.priority === filterPriority;
    const matchesEffort = filterEffort === 'All' || opt.effort === filterEffort;
    const notApplied = !appliedOptimizations.includes(opt.id);
    return matchesSearch && matchesType && matchesPriority && matchesEffort && notApplied;
  });

  const sortedOptimizations = [...filteredOptimizations].sort((a, b) => {
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (typeof aVal === 'number') return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    if (typeof aVal === 'string') return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return 0;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSavings = optimizations.reduce((s, o) => s + o.potentialSavings, 0);
  const currentCost  = optimizations.reduce((s, o) => s + o.currentCost, 0);
  const quickWins    = optimizations.filter(o => o.effort === 'Low' && o.priority === 'High').length;
  const appliedSavings = appliedOptimizations.reduce((s, id) => {
    const o = optimizations.find(x => x.id === id);
    return s + (o?.potentialSavings || 0);
  }, 0);

  const optimizationTypes = ['All', ...new Set(optimizations.map(o => o.type))];

  // ── Chart data ────────────────────────────────────────────────────────────
  const savingsByType = optimizationTypes.slice(1).map(type => ({
    name: type,
    savings: optimizations.filter(o => o.type === type).reduce((s, o) => s + o.potentialSavings, 0),
  }));

  const savingsByPriority = ['High', 'Medium', 'Low'].map(p => ({
    priority: p,
    savings: optimizations.filter(o => o.priority === p).reduce((s, o) => s + o.potentialSavings, 0),
    count: optimizations.filter(o => o.priority === p).length,
  }));

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getPriorityColor = (p: string) => ({
    High:   'text-red-400 bg-red-500/20 border-red-500/50',
    Medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    Low:    'text-green-400 bg-green-500/20 border-green-500/50',
  }[p] || 'text-slate-400 bg-slate-500/20 border-slate-500/50');

  const getEffortColor = (e: string) => ({
    Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-red-400',
  }[e] || 'text-slate-400');

  const getEffortIcon = (e: string) => ({ Low: CheckCircle, Medium: AlertCircle, High: XCircle }[e] || AlertCircle);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const handleApply = (id: string) => {
    setAppliedOptimizations(prev => [...prev, id]);
  };

  const handleBulkApply = () => {
    setAppliedOptimizations(prev => [...prev, ...selectedOptimizations]);
    setSelectedOptimizations([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-slate-400">Loading optimization data...</span>
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Retry</button>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Cost Optimization</h1>
              <p className="text-slate-400 text-sm mt-1">{provider} · {accountId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`px-4 py-2 rounded-lg transition-colors ${showCharts ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />Analytics
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Savings Opportunity', value: `$${totalSavings.toLocaleString()}`, sub: `${currentCost > 0 ? ((totalSavings/currentCost)*100).toFixed(1) : 0}% potential reduction`, icon: DollarSign, color: 'text-green-400' },
            { label: 'Active Recommendations',   value: optimizations.length.toString(),     sub: `${filteredOptimizations.length} visible`,                                                   icon: Target,     color: 'text-blue-400' },
            { label: 'Quick Wins',               value: quickWins.toString(),                sub: 'Low effort, high priority',                                                                  icon: Zap,        color: 'text-purple-400' },
            { label: 'Applied Savings',          value: `$${appliedSavings.toLocaleString()}`, sub: `${appliedOptimizations.length} implemented`,                                             icon: TrendingUp,  color: 'text-orange-400' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-sm">{label}</p>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className={`text-sm mt-2 ${color}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        {showCharts && optimizations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Savings by Type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={savingsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    formatter={(v: any) => [`$${v.toLocaleString()}`, 'Savings']}
                  />
                  <Bar dataKey="savings" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Savings by Priority</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={savingsByPriority}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    dataKey="savings"
                    label={({ priority, savings }) => `${priority}: $${savings.toLocaleString()}`}
                    labelLine={false}
                  >
                    {savingsByPriority.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    formatter={(v: any) => [`$${v.toLocaleString()}`, 'Savings']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search optimizations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              <Filter className="w-4 h-4" />Filters
              {(filterType !== 'All' || filterPriority !== 'All' || filterEffort !== 'All') && (
                <span className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <select
              value={sortField}
              onChange={e => { setSortField(e.target.value); setSortDirection('desc'); }}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="potentialSavings">Sort by: Savings</option>
              <option value="priority">Sort by: Priority</option>
              <option value="effort">Sort by: Effort</option>
              <option value="savingsPercent">Sort by: % Savings</option>
            </select>
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />Export
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
              {[
                { label: 'Type', value: filterType, setter: setFilterType, options: optimizationTypes },
                { label: 'Priority', value: filterPriority, setter: setFilterPriority, options: ['All','High','Medium','Low'] },
                { label: 'Effort', value: filterEffort, setter: setFilterEffort, options: ['All','Low','Medium','High'] },
              ].map(({ label, value, setter, options }) => (
                <div key={label}>
                  <label className="text-slate-400 text-sm mb-2 block">{label}</label>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedOptimizations.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-blue-400 font-medium">
              {selectedOptimizations.length} selected — $
              {selectedOptimizations.reduce((s, id) => s + (optimizations.find(o => o.id === id)?.potentialSavings || 0), 0).toLocaleString()} potential savings
            </p>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkApply} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />Apply Selected
              </button>
              <button onClick={() => setSelectedOptimizations([])} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4">
                    <input type="checkbox"
                      checked={selectedOptimizations.length === sortedOptimizations.length && sortedOptimizations.length > 0}
                      onChange={() => {
                        if (selectedOptimizations.length === sortedOptimizations.length) setSelectedOptimizations([]);
                        else setSelectedOptimizations(sortedOptimizations.map(o => o.id));
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                    />
                  </th>
                  {[
                    { label: 'Recommendation', field: null },
                    { label: 'Type', field: 'type' },
                    { label: 'Priority', field: 'priority' },
                    { label: 'Effort', field: 'effort' },
                    { label: 'Current Cost', field: 'currentCost' },
                    { label: 'Savings/mo', field: 'potentialSavings' },
                    { label: '% Saved', field: 'savingsPercent' },
                    { label: 'Actions', field: null },
                  ].map(({ label, field }) => (
                    <th key={label} className="text-left text-slate-400 text-sm font-semibold p-4">
                      {field ? (
                        <button onClick={() => handleSort(field)} className="flex items-center gap-2 hover:text-white transition-colors">
                          {label}<ArrowUpDown className="w-4 h-4" />
                        </button>
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedOptimizations.map(opt => {
                  const EffortIcon = getEffortIcon(opt.effort);
                  return (
                    <tr key={opt.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <input type="checkbox"
                          checked={selectedOptimizations.includes(opt.id)}
                          onChange={() => setSelectedOptimizations(prev =>
                            prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                          )}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                        />
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-white font-medium mb-1">{opt.title}</p>
                        <p className="text-slate-400 text-sm">{opt.description}</p>
                        {opt.resources.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {opt.resources.slice(0, 3).map((r, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded font-mono">{r}</span>
                            ))}
                            {opt.resources.length > 3 && (
                              <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">+{opt.resources.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">{opt.type}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(opt.priority)}`}>{opt.priority}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <EffortIcon className={`w-4 h-4 ${getEffortColor(opt.effort)}`} />
                          <span className={`text-sm font-medium ${getEffortColor(opt.effort)}`}>{opt.effort}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-medium">${opt.currentCost.toLocaleString()}</td>
                      <td className="p-4">
                        <span className="text-green-400 font-bold text-lg">${opt.potentialSavings.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-green-400 font-semibold">{opt.savingsPercent}%</span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => handleApply(opt.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium">
                          Apply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {sortedOptimizations.length === 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-12 border border-slate-700 text-center">
            <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">
              {appliedOptimizations.length > 0 ? `Great job! You've applied ${appliedOptimizations.length} optimization(s)` : 'No optimizations found'}
            </p>
            <p className="text-slate-500 text-sm">Try adjusting your filters</p>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default Optimization;
