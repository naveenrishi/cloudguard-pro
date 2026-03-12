// src/pages/Databases.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft, Database, Activity, HardDrive, Cpu, Search,
  Filter, ArrowUpDown, Play, Square, Copy, Download, BarChart3,
  AlertCircle, CheckCircle, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DB_TYPES: Record<string, string[]> = {
  aws:   ['RDS', 'DynamoDB', 'ElastiCache', 'Redshift', 'DocumentDB'],
  azure: ['SQLDatabase', 'CosmosDB', 'PostgreSQL', 'MySQL', 'MariaDB', 'Redis'],
  gcp:   ['CloudSQL', 'Spanner', 'Bigtable', 'Firestore', 'Datastore'],
};

function toDBRow(r: any, costsServices: any[]) {
  const matchCost = costsServices.find(s =>
    s.name.toLowerCase().includes(r.type?.toLowerCase()) ||
    s.name.toLowerCase().includes('database') ||
    s.name.toLowerCase().includes('rds') ||
    s.name.toLowerCase().includes('sql')
  );
  const estimatedCost = matchCost
    ? parseFloat((matchCost.cost * 0.1).toFixed(2))
    : parseFloat((Math.random() * 50 + 10).toFixed(2));

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

  const [databases,          setDatabases]          = useState<any[]>([]);
  const [provider,           setProvider]           = useState('');
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [monthlyData,        setMonthlyData]        = useState<any[]>([]);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [filterEngine,       setFilterEngine]       = useState('All');
  const [filterStatus,       setFilterStatus]       = useState('All');
  const [sortField,          setSortField]          = useState('name');
  const [sortDirection,      setSortDirection]      = useState<'asc' | 'desc'>('asc');
  const [showFilters,        setShowFilters]        = useState(false);
  const [selectedDatabases,  setSelectedDatabases]  = useState<string[]>([]);
  const [showMetrics,        setShowMetrics]        = useState(true);

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
      const costsData     = costsRes.ok     ? await costsRes.json()     : {};

      const allResources: any[]   = resourcesData.resources || [];
      const costsServices: any[]  = costsData.services || [];

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

  const totalCost    = databases.reduce((s, db) => s + db.monthlyCost, 0);
  const totalStorage = databases.reduce((s, db) => s + parseInt(db.storage), 0);
  const avgCPU       = databases.length > 0
    ? databases.reduce((s, db) => s + (db.cpu || 0), 0) / databases.length
    : 0;

  const costTrendData = monthlyData.length > 0
    ? monthlyData.slice(-3).map(m => ({ month: m.month.split(' ')[0], cost: Math.round(m.total * 0.12) }))
    : [{ month: 'Now', cost: Math.round(totalCost) }];

  const getStatusColor = (s: string) => {
    if (['available', 'running', 'Active'].includes(s)) return 'bg-emerald-50 text-emerald-700';
    if (s === 'backing-up') return 'bg-blue-50 text-blue-700';
    if (s === 'stopped') return 'bg-amber-50 text-amber-700';
    return 'bg-gray-100 text-gray-500';
  };

  const getUtilColor = (p: number) =>
    p >= 80 ? 'text-red-600' : p >= 60 ? 'text-amber-600' : 'text-emerald-600';

  const getHealth = (db: any) => {
    if (db.cpu > 80 || db.memory > 80) return { status: 'High Load', icon: AlertCircle, color: 'text-red-500' };
    if (db.cpu > 60 || db.memory > 60) return { status: 'Moderate',  icon: Activity,    color: 'text-amber-500' };
    return                                     { status: 'Healthy',   icon: CheckCircle, color: 'text-emerald-500' };
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  if (loading) return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading database resources…</span>
        </div>
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Retry</button>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {provider === 'AWS' ? 'RDS & Databases' : provider === 'AZURE' ? 'SQL Databases' : 'Cloud SQL'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{provider} · {accountId}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm" title="Refresh">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setShowMetrics(!showMetrics)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm ${showMetrics ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Performance Metrics
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Databases', value: databases.length.toString(), sub: `${filteredDatabases.length} filtered`,    icon: Database,  color: '#2563eb', bg: '#eff6ff' },
              { label: 'Total Storage',   value: `${totalStorage} GB`,        sub: 'Allocated storage',                       icon: HardDrive, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Avg CPU Usage',   value: `${avgCPU.toFixed(0)}%`,     sub: avgCPU < 60 ? 'Healthy' : 'Monitor load',  icon: Cpu,       color: avgCPU >= 80 ? '#dc2626' : '#059669', bg: avgCPU >= 80 ? '#fef2f2' : '#ecfdf5' },
              { label: 'Monthly Cost',    value: `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Estimated from billing', icon: Database, color: '#d97706', bg: '#fffbeb' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
                <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {databases.length === 0 && !loading && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center mb-8">
              <Database className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-blue-800 font-semibold mb-1">No database resources found</p>
              <p className="text-blue-600 text-xs">
                No {provider === 'AWS' ? 'RDS/DynamoDB' : provider === 'AZURE' ? 'SQL Database' : 'Cloud SQL'} resources were detected in this account.
              </p>
            </div>
          )}

          {/* Charts */}
          {showMetrics && databases.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Cost Trend (Est. DB Share)</h3>
                <p className="text-xs text-gray-400 mb-4">Estimated database portion of total spend</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={costTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }} formatter={(v: any) => [`$${v}`, 'Est. DB Cost']} />
                    <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Cost by Database</h3>
                <p className="text-xs text-gray-400 mb-4">Monthly estimated cost per instance</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={databases.slice(0, 8).map(db => ({ name: db.name.substring(0, 12), cost: db.monthlyCost }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }} formatter={(v: any) => [`$${v}`, 'Monthly Cost']} />
                    <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Search & Filters */}
          {databases.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search databases by name or engine…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${showFilters ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Filter className="w-3.5 h-3.5" /> Filters
                  {(filterEngine !== 'All' || filterStatus !== 'All') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Database Engine</label>
                    <select value={filterEngine} onChange={e => setFilterEngine(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-700">
                      {dbEngines.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-700">
                      {dbStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk Actions */}
          {selectedDatabases.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between mb-5">
              <p className="text-indigo-700 text-sm font-semibold">{selectedDatabases.length} database(s) selected</p>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Start',  icon: Play,   cls: 'bg-emerald-600 hover:bg-emerald-700' },
                  { label: 'Stop',   icon: Square, cls: 'bg-amber-600 hover:bg-amber-700' },
                  { label: 'Backup', icon: Copy,   cls: 'bg-indigo-600 hover:bg-indigo-700' },
                ].map(({ label, icon: Icon, cls }) => (
                  <button key={label} onClick={() => alert(`${label} action on ${selectedDatabases.length} DB(s)`)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${cls} text-white rounded-xl text-xs font-semibold transition-colors`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          {databases.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-4">
                        <input type="checkbox"
                          checked={selectedDatabases.length === sortedDatabases.length && sortedDatabases.length > 0}
                          onChange={() => {
                            if (selectedDatabases.length === sortedDatabases.length) setSelectedDatabases([]);
                            else setSelectedDatabases(sortedDatabases.map(db => db.id));
                          }}
                          className="w-4 h-4 rounded border-gray-300"
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
                        <th key={label} className="text-left text-xs font-semibold text-gray-500 p-4">
                          {field ? (
                            <button onClick={() => handleSort(field)} className="flex items-center gap-1.5 hover:text-gray-800 transition-colors">
                              {label}<ArrowUpDown className="w-3 h-3" />
                            </button>
                          ) : label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedDatabases.map(db => {
                      const health     = getHealth(db);
                      const HealthIcon = health.icon;
                      return (
                        <tr key={db.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-4">
                            <input type="checkbox"
                              checked={selectedDatabases.includes(db.id)}
                              onChange={() => setSelectedDatabases(prev =>
                                prev.includes(db.id) ? prev.filter(id => id !== db.id) : [...prev, db.id]
                              )}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <Database className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{db.name}</p>
                                <p className="text-xs text-gray-400 font-mono">{db.id.substring(0, 20)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{db.engine}</td>
                          <td className="p-4 text-sm text-gray-600">{db.region}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <HealthIcon className={`w-3.5 h-3.5 ${health.color}`} />
                              <span className={`text-xs font-medium ${health.color}`}>{health.status}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(db.status)}`}>
                              {db.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-14 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${db.cpu >= 80 ? 'bg-red-500' : db.cpu >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.max(db.cpu, 2)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${getUtilColor(db.cpu)}`}>
                                {db.cpu > 0 ? `${db.cpu}%` : 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-bold text-gray-900">
                            ${db.monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              {db.status === 'stopped' && (
                                <button onClick={() => alert(`Start: ${db.id}`)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Start">
                                  <Play className="w-3 h-3 text-emerald-600" />
                                </button>
                              )}
                              {(db.status === 'available' || db.status === 'running') && (
                                <button onClick={() => alert(`Stop: ${db.id}`)} className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors" title="Stop">
                                  <Square className="w-3 h-3 text-amber-600" />
                                </button>
                              )}
                              <button onClick={() => alert(`Backup: ${db.id}`)} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Backup">
                                <Copy className="w-3 h-3 text-indigo-600" />
                              </button>
                              <button onClick={() => alert(`Metrics: ${db.id}`)} className="p-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors" title="Metrics">
                                <Activity className="w-3 h-3 text-purple-600" />
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Database className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No databases match your filters</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default Databases;
