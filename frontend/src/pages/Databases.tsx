import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { 
  ArrowLeft, 
  Database, 
  Activity, 
  HardDrive, 
  Cpu, 
  Wifi, 
  Search,
  Filter,
  ArrowUpDown,
  Play,
  Square,
  RotateCw,
  Trash2,
  Copy,
  Download,
  BarChart3,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { demoDataService } from '../services/demoData.service';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const Databases: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [databases, setDatabases] = useState<any[]>([]);
  const [provider, setProvider] = useState('');
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEngine, setFilterEngine] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Sort state
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // View state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(true);

  useEffect(() => {
    if (accountId?.includes('aws')) {
      setProvider('AWS');
      setDatabases(demoDataService.getAWSRDSDatabases(accountId));
    } else if (accountId?.includes('azure')) {
      setProvider('Azure');
      setDatabases(demoDataService.getAWSRDSDatabases(accountId));
    } else if (accountId?.includes('gcp')) {
      setProvider('GCP');
      setDatabases(demoDataService.getAWSRDSDatabases(accountId));
    }
  }, [accountId]);

  // Filter databases
  const filteredDatabases = databases.filter(db => {
    const matchesSearch = db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         db.engine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEngine = filterEngine === 'All' || db.engine.includes(filterEngine);
    const matchesStatus = filterStatus === 'All' || db.status === filterStatus;
    return matchesSearch && matchesEngine && matchesStatus;
  });

  // Sort databases
  const sortedDatabases = [...filteredDatabases].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'monthlyCost' || sortField === 'connections' || sortField === 'cpu' || sortField === 'memory') {
      aValue = aValue || 0;
      bValue = bValue || 0;
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  // Get unique values for filters
  const dbEngines = ['All', ...new Set(databases.map(db => db.engine.split(' ')[0]))];
  const dbStatuses = ['All', ...new Set(databases.map(db => db.status))];

  // Calculate statistics
  const totalCost = databases.reduce((sum, db) => sum + db.monthlyCost, 0);
  const totalStorage = databases.reduce((sum, db) => sum + parseInt(db.storage), 0);
  const avgCPU = databases.reduce((sum, db) => sum + (db.cpu || 0), 0) / databases.length;
  const avgMemory = databases.reduce((sum, db) => sum + (db.memory || 0), 0) / databases.length;

  // Performance metrics data
  const performanceData = databases.map(db => ({
    name: db.name.substring(0, 10),
    cpu: db.cpu || 0,
    memory: db.memory || 0,
    connections: (db.connections || 0) * 2, // Scale for visibility
  }));

  // Cost trend data
  const costTrendData = [
    { month: 'Jan', cost: totalCost * 0.88 },
    { month: 'Feb', cost: totalCost * 0.94 },
    { month: 'Mar', cost: totalCost },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'text-green-400 bg-green-500/20';
      case 'backing-up': return 'text-blue-400 bg-blue-500/20';
      case 'stopped': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getHealthStatus = (db: any) => {
    if (db.cpu > 80 || db.memory > 80) {
      return { status: 'High Load', icon: AlertCircle, color: 'text-red-400' };
    } else if (db.cpu > 60 || db.memory > 60) {
      return { status: 'Moderate', icon: Activity, color: 'text-yellow-400' };
    }
    return { status: 'Healthy', icon: CheckCircle, color: 'text-green-400' };
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleQuickAction = (action: string, dbId: string) => {
    alert(`${action} action triggered for database: ${dbId}`);
  };

  const handleBulkAction = (action: string) => {
    if (selectedDatabases.length === 0) {
      alert('Please select databases first');
      return;
    }
    alert(`${action} action triggered for ${selectedDatabases.length} database(s)`);
  };

  const toggleDatabaseSelection = (dbId: string) => {
    setSelectedDatabases(prev => 
      prev.includes(dbId) 
        ? prev.filter(id => id !== dbId)
        : [...prev, dbId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDatabases.length === sortedDatabases.length) {
      setSelectedDatabases([]);
    } else {
      setSelectedDatabases(sortedDatabases.map(db => db.id));
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {provider === 'AWS' ? 'RDS Databases' : provider === 'Azure' ? 'SQL Databases' : 'Cloud SQL'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{provider} Account</p>
            </div>
          </div>

          {/* Metrics Toggle */}
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showMetrics ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Performance Metrics
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total Databases</p>
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-white">{databases.length}</p>
            <p className="text-slate-500 text-sm mt-2">{filteredDatabases.length} filtered</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total Storage</p>
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-4xl font-bold text-white">{totalStorage} GB</p>
            <p className="text-purple-400 text-sm mt-2">Allocated storage</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Avg CPU Usage</p>
              <Cpu className="w-5 h-5 text-green-400" />
            </div>
            <p className={`text-4xl font-bold ${getUtilizationColor(avgCPU)}`}>
              {avgCPU.toFixed(0)}%
            </p>
            <p className="text-green-400 text-sm mt-2">
              <TrendingDown className="w-3 h-3 inline mr-1" />
              Healthy
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Monthly Cost</p>
              <Database className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-4xl font-bold text-white">${totalCost.toLocaleString()}</p>
            <p className="text-orange-400 text-sm mt-2">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +6% from last month
            </p>
          </div>
        </div>

        {/* Performance Charts */}
        {showMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Trend */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Cost Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Metrics Radar */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Resource Utilization</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={performanceData}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis dataKey="name" stroke="#9ca3af" />
                  <PolarRadiusAxis stroke="#9ca3af" />
                  <Radar name="CPU" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Memory" dataKey="memory" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search databases by name or engine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterEngine !== 'All' || filterStatus !== 'All') && (
                <span className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Export */}
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Database Engine</label>
                <select
                  value={filterEngine}
                  onChange={(e) => setFilterEngine(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {dbEngines.map(engine => (
                    <option key={engine} value={engine}>{engine}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {dbStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedDatabases.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-blue-400 font-medium">
              {selectedDatabases.length} database(s) selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('Start')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
              <button
                onClick={() => handleBulkAction('Stop')}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
              <button
                onClick={() => handleBulkAction('Backup')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Backup
              </button>
            </div>
          </div>
        )}

        {/* Database Table */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedDatabases.length === sortedDatabases.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Database
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('engine')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Engine
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Instance</th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Health</th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('connections')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Connections
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('cpu')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      CPU
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Status</th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('monthlyCost')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Cost
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDatabases.map((db) => {
                  const health = getHealthStatus(db);
                  const HealthIcon = health.icon;
                  
                  return (
                    <tr key={db.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedDatabases.includes(db.id)}
                          onChange={() => toggleDatabaseSelection(db.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Database className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{db.name}</p>
                            <p className="text-slate-400 text-xs">{db.region}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">{db.engine}</td>
                      <td className="p-4 text-slate-300 text-sm">{db.instanceClass}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <HealthIcon className={`w-4 h-4 ${health.color}`} />
                          <span className={`text-sm ${health.color}`}>{health.status}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium">{db.connections || 0}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                db.cpu >= 80 ? 'bg-red-500' :
                                db.cpu >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${db.cpu}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getUtilizationColor(db.cpu)}`}>
                            {db.cpu}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(db.status)}`}>
                          {db.status}
                        </span>
                      </td>
                      <td className="p-4 text-white font-semibold">
                        ${db.monthlyCost.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {db.status === 'stopped' && (
                            <button
                              onClick={() => handleQuickAction('Start', db.id)}
                              className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                              title="Start"
                            >
                              <Play className="w-3 h-3 text-white" />
                            </button>
                          )}
                          {db.status === 'available' && (
                            <button
                              onClick={() => handleQuickAction('Stop', db.id)}
                              className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                              title="Stop"
                            >
                              <Square className="w-3 h-3 text-white" />
                            </button>
                          )}
                          <button
                            onClick={() => handleQuickAction('Backup', db.id)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            title="Create Backup"
                          >
                            <Copy className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={() => handleQuickAction('Metrics', db.id)}
                            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            title="View Metrics"
                          >
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

        {/* No Results */}
        {sortedDatabases.length === 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-12 border border-slate-700 text-center">
            <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No databases found</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search term</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Databases;