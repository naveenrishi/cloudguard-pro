import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle, XCircle, CheckCircle, Search,
  TrendingDown, Shield, Database, Server, Lock, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Map raw finding → violation ────────────────────────────────────────────
function findingToViolation(f: any, idx: number) {
  const severity = (f.severity || 'MEDIUM').toUpperCase();
  const sevLower = severity.toLowerCase();

  // Infer category from title/description
  const text = `${f.title} ${f.description}`.toLowerCase();
  const category =
    text.includes('mfa')       ? 'IAM' :
    text.includes('iam')       ? 'IAM' :
    text.includes('s3')        ? 'S3 Bucket' :
    text.includes('rds')       ? 'Database' :
    text.includes('sg') || text.includes('security group') ? 'Security Group' :
    text.includes('encrypt')   ? 'Encryption' :
    text.includes('cloudtrail')|| text.includes('log')     ? 'Logging' :
    text.includes('vpc') || text.includes('network')       ? 'Network' :
    'Security';

  const detectedAt = new Date(Date.now() - idx * 86400000).toISOString();
  const ageInDays  = idx + 1;

  return {
    id: `viol-${idx}`,
    severity: sevLower,
    category,
    title: f.title,
    description: f.description || f.title,
    resource: f.resource || 'Unknown resource',
    resourceType: f.resourceType || category,
    region: f.region || 'us-east-1',
    account: f.account || 'Cloud Account',
    detectedAt,
    status: severity === 'CRITICAL' || severity === 'HIGH' ? 'open' : 'acknowledged',
    ageInDays,
    impact: f.description || 'Security finding that may expose your environment to risk.',
    remediation: f.remediation || 'Review and remediate this finding according to best practices.',
    complianceFrameworks: f.compliance || [],
  };
}

// ── Component ──────────────────────────────────────────────────────────────
const Violations: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();

  const [violations, setViolations]   = useState<any[]>([]);
  const [securityScore, setScore]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');

  const fetchData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API}/api/cloud/accounts/${accountId}/security`, { headers });
      if (!res.ok) throw new Error(`Security API returned ${res.status}`);
      const data = await res.json();

      setScore(data.score || 0);
      const viols = (data.findings || []).map(findingToViolation);
      setViolations(viols);
    } catch (err: any) {
      setError(err.message || 'Failed to load violations');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const summary = {
    total:    violations.length,
    critical: violations.filter(v => v.severity === 'critical').length,
    high:     violations.filter(v => v.severity === 'high').length,
    medium:   violations.filter(v => v.severity === 'medium').length,
    low:      violations.filter(v => v.severity === 'low').length,
    open:     violations.filter(v => v.status === 'open').length,
  };

  const bySeverity = [
    { name: 'Critical', value: summary.critical, color: '#dc2626' },
    { name: 'High',     value: summary.high,     color: '#ea580c' },
    { name: 'Medium',   value: summary.medium,   color: '#f59e0b' },
    { name: 'Low',      value: summary.low,      color: '#10b981' },
  ].filter(s => s.value > 0);

  // Group by category for bar chart
  const categoryMap: Record<string, { count: number; critical: number }> = {};
  violations.forEach(v => {
    if (!categoryMap[v.category]) categoryMap[v.category] = { count: 0, critical: 0 };
    categoryMap[v.category].count++;
    if (v.severity === 'critical') categoryMap[v.category].critical++;
  });
  const byCategory = Object.entries(categoryMap).map(([category, vals]) => ({ category, ...vals }));

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = violations.filter(v => {
    const matchSev    = filterSeverity === 'all' || v.severity === filterSeverity;
    const matchStatus = filterStatus   === 'all' || v.status   === filterStatus;
    const matchSearch = !searchQuery ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSev && matchStatus && matchSearch;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getSeverityColor = (s: string) => ({
    critical: 'bg-red-100 text-red-700 border-red-300',
    high:     'bg-orange-100 text-orange-700 border-orange-300',
    medium:   'bg-yellow-100 text-yellow-700 border-yellow-300',
    low:      'bg-green-100 text-green-700 border-green-300',
  }[s] || 'bg-gray-100 text-gray-700 border-gray-300');

  const getStatusColor = (s: string) => ({
    open:         'bg-red-100 text-red-700',
    acknowledged: 'bg-yellow-100 text-yellow-700',
    resolved:     'bg-green-100 text-green-700',
  }[s] || 'bg-gray-100 text-gray-700');

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('security group') || c.includes('network')) return <Shield className="w-5 h-5" />;
    if (c.includes('database') || c.includes('s3'))             return <Database className="w-5 h-5" />;
    if (c.includes('iam') || c.includes('encrypt'))             return <Lock className="w-5 h-5" />;
    return <Server className="w-5 h-5" />;
  };

  const handleAcknowledge = (id: string) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, status: 'acknowledged' } : v));
  };

  const handleResolve = (id: string) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, status: 'resolved' } : v));
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      <span className="ml-3 text-gray-500">Loading security violations...</span>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Violations</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Retry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Violations</h1>
          <p className="text-gray-600 mt-1">
            Live findings from {accountId} · Security score: <span className={`font-bold ${securityScore >= 70 ? 'text-green-600' : securityScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{securityScore}/100</span>
          </p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Violations</p>
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">{summary.total - summary.open} acknowledged/resolved</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Critical</p>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{summary.critical}</p>
          <p className="text-sm text-gray-600 mt-2">Immediate action required</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">High Severity</p>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{summary.high}</p>
          <p className="text-sm text-gray-600 mt-2">High priority items</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Open</p>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{summary.open}</p>
          <p className="text-sm text-gray-600 mt-2">Awaiting remediation</p>
        </div>
      </div>

      {/* Charts */}
      {violations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations by Severity</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={bySeverity}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {bySeverity.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {byCategory.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count"    fill="#3b82f6" name="Total"    radius={[4,4,0,0]} />
                  <Bar dataKey="critical" fill="#dc2626" name="Critical" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search violations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <span className="text-sm text-gray-500">{filtered.length} of {violations.length} shown</span>
        </div>
      </div>

      {/* Violations List */}
      <div className="space-y-4">
        {filtered.map(v => (
          <div key={v.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
                {getCategoryIcon(v.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(v.severity)}`}>
                    {v.severity.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(v.status)}`}>
                    {v.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{v.category}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{v.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{v.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Resource</p>
                    <p className="font-mono text-gray-900 truncate text-xs">{v.resource}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Region</p>
                    <p className="text-gray-900">{v.region}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Detected</p>
                    <p className="text-gray-900">{v.ageInDays}d ago</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account</p>
                    <p className="text-gray-900 truncate">{v.account}</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Remediation:</p>
                  <p className="text-sm text-blue-800">{v.remediation}</p>
                </div>

                {v.complianceFrameworks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <p className="text-sm text-gray-600 self-center">Compliance:</p>
                    {v.complianceFrameworks.map((fw: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">{fw}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  {v.status !== 'resolved' && (
                    <button onClick={() => handleResolve(v.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                      Mark Resolved
                    </button>
                  )}
                  {v.status === 'open' && (
                    <button onClick={() => handleAcknowledge(v.id)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm">
                      Acknowledge
                    </button>
                  )}
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    Create Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty states */}
      {violations.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Violations Found</h3>
          <p className="text-gray-600">No security findings were returned for this account.</p>
        </div>
      )}

      {violations.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Matching Violations</h3>
          <p className="text-gray-600">Try adjusting your filters or search query.</p>
        </div>
      )}

    </div>
  );
};

export default Violations;
