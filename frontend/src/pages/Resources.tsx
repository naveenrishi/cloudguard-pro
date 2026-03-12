// src/pages/Resources.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Server, Database, HardDrive, Activity,
  AlertCircle, Search, Filter, RefreshCw, ArrowLeft,
  Cpu, Globe, Box, Zap,
} from 'lucide-react';

const Resources: React.FC = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [resources,   setResources]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [filterType,  setFilterType]  = useState('all');

  useEffect(() => {
    if (accountId) fetchRealResources();
  }, [accountId]);

  const fetchRealResources = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cloud/accounts/${accountId}/resources`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch resources');
      }
    } catch (err: any) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'EC2' || t.includes('VM') || t.includes('COMPUTE'))    return { icon: Server,   color: '#2563eb', bg: '#eff6ff' };
    if (t === 'RDS' || t.includes('SQL') || t.includes('DATABASE'))  return { icon: Database, color: '#7c3aed', bg: '#f5f3ff' };
    if (t === 'S3'  || t.includes('STORAGE') || t.includes('BLOB'))  return { icon: HardDrive, color: '#d97706', bg: '#fffbeb' };
    if (t.includes('LAMBDA') || t.includes('FUNCTION'))              return { icon: Zap,      color: '#f59e0b', bg: '#fffbeb' };
    if (t.includes('EKS') || t.includes('AKS') || t.includes('GKE')) return { icon: Box,      color: '#059669', bg: '#ecfdf5' };
    if (t.includes('NETWORK') || t.includes('VPC') || t.includes('CDN')) return { icon: Globe, color: '#0891b2', bg: '#ecfeff' };
    if (t.includes('CPU') || t.includes('INSTANCE'))                 return { icon: Cpu,      color: '#6366f1', bg: '#eef2ff' };
    return { icon: Activity, color: '#6b7280', bg: '#f9fafb' };
  };

  const getStateStyle = (state: string) => {
    const s = state?.toLowerCase();
    if (['running', 'available', 'active', 'succeeded'].includes(s))  return { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500' };
    if (['stopped', 'inactive', 'deallocated'].includes(s))           return { bg: 'bg-red-50',     color: 'text-red-700',     dot: 'bg-red-500' };
    if (['pending', 'starting', 'stopping'].includes(s))              return { bg: 'bg-amber-50',   color: 'text-amber-700',   dot: 'bg-amber-500' };
    return { bg: 'bg-gray-100', color: 'text-gray-600', dot: 'bg-gray-400' };
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch =
      (resource.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resource.id   || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || resource.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const resourceTypes = [...new Set(resources.map(r => r.type))];
  const runningCount  = resources.filter(r => ['running', 'available', 'active'].includes(r.state?.toLowerCase())).length;
  const stoppedCount  = resources.filter(r => ['stopped', 'inactive'].includes(r.state?.toLowerCase())).length;
  const pendingCount  = resources.filter(r => ['pending', 'starting', 'stopping'].includes(r.state?.toLowerCase())).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading resources…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center max-w-md">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-800 mb-2">Error Loading Resources</h3>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={fetchRealResources} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Resources</h1>
            <p className="text-xs text-gray-400 mt-0.5">Cloud resources inventory · {accountId}</p>
          </div>
          <button
            onClick={fetchRealResources}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Resources', value: resources.length, sub: `${resourceTypes.length} types`,   icon: Server,   color: '#2563eb', bg: '#eff6ff' },
            { label: 'Running',         value: runningCount,     sub: 'Healthy & active',                icon: Activity, color: '#059669', bg: '#ecfdf5' },
            { label: 'Stopped',         value: stoppedCount,     sub: 'Inactive resources',              icon: AlertCircle, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Pending',         value: pendingCount,     sub: 'State transition',                icon: RefreshCw, color: '#d97706', bg: '#fffbeb' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-600"
              >
                <option value="all">All Types</option>
                {resourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-gray-400 self-center ml-auto">
              {filteredResources.length} of {resources.length} resources
            </span>
          </div>
        </div>

        {/* Resources Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filteredResources.length === 0 ? (
            <div className="p-12 text-center">
              <Server className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                {resources.length === 0 ? 'No resources found' : 'No resources match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Region</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredResources.map((resource, index) => {
                    const { icon: Icon, color, bg } = getResourceIcon(resource.type || '');
                    const stateStyle = getStateStyle(resource.state || '');
                    return (
                      <tr key={index} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                              <Icon className="w-3.5 h-3.5" style={{ color }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{resource.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">{resource.name}</td>
                        <td className="py-3 px-4 text-xs text-gray-400 font-mono">{resource.id}</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{resource.region}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stateStyle.bg} ${stateStyle.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stateStyle.dot}`} />
                            {resource.state}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Resources;
