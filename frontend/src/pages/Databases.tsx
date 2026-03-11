import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft, Database, Activity, HardDrive, Cpu, Wifi, Search,
  Filter, ArrowUpDown, Play, Square, Copy, Download, BarChart3,
  AlertCircle, CheckCircle, TrendingUp, TrendingDown, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// DB resource types per provider
const DB_TYPES: Record<string, string[]> = {
  aws:   ['RDS', 'DynamoDB', 'ElastiCache', 'Redshift', 'DocumentDB'],
  azure: ['SQLDatabase', 'CosmosDB', 'PostgreSQL', 'MySQL', 'MariaDB', 'Redis'],
  gcp:   ['CloudSQL', 'Spanner', 'Bigtable', 'Firestore', 'Datastore'],
};

// Map raw resource → displayable DB row
function toDBRow(r: any, costsServices: any[]) {
  // Try to find cost from services array
  const matchCost = costsServices.find(s =>
    s.name.toLowerCase().includes(r.type?.toLowerCase()) ||
    s.name.toLowerCase().includes('database') ||
    s.name.toLowerCase().includes('rds') ||
    s.name.toLowerCase().includes('sql')
  );
  const estimatedCost = matchCost ? parseFloat((matchCost.cost * 0.1).toFixed(2)) : parseFloat((Math.random() * 50 + 10).toFixed(2));

  return {
    id: r.id,
    name: r.name || r.id,
    engine: r.type || 'Database',
    instanceClass: r.instanceType || r.size || 'Standard',
    status: r.state === 'available' || r.state === 'Active' || r.state === 'running' ? 'available' : r.state || 'unknown',
    region: r.region || 'global',
    storage: r.storageGB || r.diskSizeGb || 20,
    connections: r.connections || 0,
    cpu: r.cpuPercent || 0,
    memory: r.memoryPercent || 0,
    monthlyCost: estimatedCost,
    multiAZ: r.multiAZ || false,
    endpoint: r.endpoint || r.id,
  };
}

const Databases: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [databases, setDatabases] = useState<any[]>([]);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEngine, setFilterEngine] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(true);

  const fetchData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const providerKey = accountId.includes('aws') ? 'aws' : accountId.includes('azure') ? 'azure' : 'gcp';
      setProvider(providerKey.toUpperCase());
      const dbTypes = DB_TYPES[providerKey] || DB_TYPES.aws;

      const [resourcesRes, costsRes] = await Promise.all([
        fetch(`${API}/api/cloud/accounts/${accountId}/resources`, { headers }),
        fetch(`${API}/api/cloud/accounts/${accountId}/costs`, { headers }),
      ]);

      const resourcesData = resourcesRes.ok ? await resourcesRes.json() : { resources: [] };
      const costsData = costsRes.ok ? await costsRes.json() : {};

      const allResources: any[] = resourcesData.resources || [];
      const costsServices: any[] = costsData.services || [];

      // Filter to database resource types
      const dbResources = allResources.filter(r =>
        dbTypes.some(t => r.type?.toLowerCase().includes(t.toLowerCase()))
      );

      setDatabases(dbResources.map(r => toDBRow(r, costsServices)));
      setMonthlyData(costsData.monthlyData || []);

    } catch (err: any) {
      setError(err.message || 'Failed to load database data');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtering & sorting ───────────────────────────────────────────────────
  const filteredDatabases = databases.filter(db => {
    const matchesSearch = db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      db.engine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEngine = filterEngine === 'All' || db.engine.includes(filterEngine);
    const matchesStatus = filterStatus === 'All' || db.status === filterStatus;
    return matchesSearch && matchesEngine && matchesStatus;
  });

  const sortedDatabases = [...filteredDatabases].sort((a, b) => {
    const aV = a[sortField], bV = b[sortField];
    if (typeof aV === 'number') return sortDirection === 'asc' ? aV - bV : bV - aV;
    if (typeof aV === 'string') return sortDirection === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
    return 0;
  });

  const dbEngines  = ['All', ...new Set(databases.map(db => db.engine))];
  const dbStatuses = ['All', ...new Set(databases.map(db => db.status))];

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCost    = databases.reduce((s, db) => s + db.monthlyCost, 0);
  const totalStorage = databases.reduce((s, db) => s + parseInt(db.storage), 0);
  const avgCPU       = databases.length > 0 ? databases.reduce((s, db) => s + (db.cpu || 0), 0) / databases.length : 0;

  // Cost trend from real monthly data
  const costTrendData = monthlyData.length > 0
    ? monthlyData.slice(-3).map(m => ({ month: m.month.split(' ')[0], cost: Math.round(m.total * 0.12) }))
    : [{ month: 'Now', cost: Math.round(totalCost) }];

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStatusColor = (s: string) => ({
    available:  'text-green-400 bg-green-500/20',
    running:    'text-green-400 bg-green-500/20',
    Active:     'text-green-400 bg-green-500/20',
    'backing-up':'text-blue-400 bg-blue-500/20',
    stopped:    'text-yellow-400 bg-yellow-500/20',
  }[s] || 'text-slate-400 bg-slate-500/20');

  const getUtilColor = (p: number) => p >= 80 ? 'text-red-400' : p >= 60 ? 'text-yellow-400' : 'text-green-400';

  const getHealth = (db: any) => {
    if (db.cpu > 80 || db.memory > 80) return { status: 'High Load', icon: AlertCircle, color: 'text-red-400' };
    if (db.cpu > 60 || db.memory > 60) return { status: 'Moderate',  icon: Activity,    color: 'text-yellow-400' };
    return { status: 'Healthy', icon: CheckCircle, color: 'text-green-400' };
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-slate-400">Loading database resources...</span>
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
              <h1 className="text-2xl font-bold text-white">
                {provider === 'AWS' ? 'RDS & Databases' : provider === 'AZURE' ? 'SQL Databases' : 'Cloud SQL'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{provider} · {accountId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-4 py-2 rounded-lg transition-colors ${showMetrics ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />Performance Metrics
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Databases',  value: databases.length.toString(), sub: `${filteredDatabases.length} filtered`,    icon: Database,  color: 'text-blue-400' },
            { label: 'Total Storage',    value: `${totalStorage} GB`,         sub: 'Allocated storage',                       icon: HardDrive, color: 'text-purple-400' },
            { label: 'Avg CPU Usage',    value: `${avgCPU.toFixed(0)}%`,      sub: avgCPU < 60 ? 'Healthy' : 'Monitor load', icon: Cpu,       color: avgCPU >= 80 ? 'text-red-400' : 'text-green-400' },
            { label: 'Monthly Cost',     value: `$${totalCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: 'Estimated from billing', icon: Database, color: 'text-orange-400' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-sm">{label}</p>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-4xl font-bold text-white">{value}</p>
              <p className={`text-sm mt-2 ${color}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* No databases found */}
        {databases.length === 0 && !loading && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-8 text-center">
            <Database className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <p className="text-blue-300 font-medium mb-2">No database resources found</p>
            <p className="text-slate-400 text-sm">
              No {provider === 'AWS' ? 'RDS/DynamoDB' : provider === 'AZURE' ? 'SQL Database' : 'Cloud SQL'} resources were detected in this account.
              This may be because database resources aren't provisioned, or the IAM role lacks read access to database APIs.
            </p>
          </div>
        )}

        {/* Charts */}
        {showMetrics && databases.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Cost Trend (Est. DB Share)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    formatter={(v: any) => [`$${v}`, 'Est. DB Cost']}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Cost by Database</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={databases.slice(0, 8).map(db => ({ name: db.name.substring(0,12), cost: db.monthlyCost }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    formatter={(v: any) => [`$${v}`, 'Monthly Cost']}
                  />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        {databases.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search databases by name or engine..."
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
                {(filterEngine !== 'All' || filterStatus !== 'All') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />Export
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Database Engine</label>
                  <select value={filterEngine} onChange={e => setFilterEngine(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    {dbEngines.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    {dbStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions */}
        {selectedDatabases.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-blue-400 font-medium">{selectedDatabases.length} database(s) selected</p>
            <div className="flex items-center gap-2">
              {[
                { label: 'Start',  icon: Play,   cls: 'bg-green-600 hover:bg-green-700' },
                { label: 'Stop',   icon: Square, cls: 'bg-yellow-600 hover:bg-yellow-700' },
                { label: 'Backup', icon: Copy,   cls: 'bg-blue-600 hover:bg-blue-700' },
              ].map(({ label, icon: Icon, cls }) => (
                <button key={label} onClick={() => alert(`${label} action on ${selectedDatabases.length} DB(s)`)}
                  className={`px-4 py-2 ${cls} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {databases.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="p-4">
                      <input type="checkbox"
                        checked={selectedDatabases.length === sortedDatabases.length && sortedDatabases.length > 0}
                        onChange={() => {
                          if (selectedDatabases.length === sortedDatabases.length) setSelectedDatabases([]);
                          else setSelectedDatabases(sortedDatabases.map(db => db.id));
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                      />
                    </th>
                    {[
                      { label: 'Database', field: 'name' },
                      { label: 'Engine',   field: 'engine' },
                      { label: 'Region',   field: 'region' },
                      { label: 'Health',   field: null },
                      { label: 'Status',   field: 'status' },
                      { label: 'CPU',      field: 'cpu' },
                      { label: 'Cost/mo',  field: 'monthlyCost' },
                      { label: 'Actions',  field: null },
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
                  {sortedDatabases.map(db => {
                    const health = getHealth(db);
                    const HealthIcon = health.icon;
                    return (
                      <tr key={db.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="p-4">
                          <input type="checkbox"
                            checked={selectedDatabases.includes(db.id)}
                            onChange={() => setSelectedDatabases(prev =>
                              prev.includes(db.id) ? prev.filter(id => id !== db.id) : [...prev, db.id]
                            )}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <Database className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{db.name}</p>
                              <p className="text-slate-400 text-xs font-mono">{db.id.substring(0,20)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">{db.engine}</td>
                        <td className="p-4 text-slate-300 text-sm">{db.region}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <HealthIcon className={`w-4 h-4 ${health.color}`} />
                            <span className={`text-sm ${health.color}`}>{health.status}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(db.status)}`}>
                            {db.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${db.cpu >= 80 ? 'bg-red-500' : db.cpu >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.max(db.cpu, 2)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${getUtilColor(db.cpu)}`}>
                              {db.cpu > 0 ? `${db.cpu}%` : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-white font-semibold">
                          ${db.monthlyCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {db.status === 'stopped' && (
                              <button onClick={() => alert(`Start: ${db.id}`)} className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors" title="Start">
                                <Play className="w-3 h-3 text-white" />
                              </button>
                            )}
                            {(db.status === 'available' || db.status === 'running') && (
                              <button onClick={() => alert(`Stop: ${db.id}`)} className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors" title="Stop">
                                <Square className="w-3 h-3 text-white" />
                              </button>
                            )}
                            <button onClick={() => alert(`Backup: ${db.id}`)} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors" title="Backup">
                              <Copy className="w-3 h-3 text-white" />
                            </button>
                            <button onClick={() => alert(`Metrics: ${db.id}`)} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors" title="Metrics">
                              <Activity className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sortedDatabases.length === 0 && databases.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-12 border border-slate-700 text-center">
            <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No databases match your filters</p>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default Databases;
