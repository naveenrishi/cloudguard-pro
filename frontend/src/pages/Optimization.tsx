import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { 
  ArrowLeft, 
  TrendingDown, 
  DollarSign, 
  Zap, 
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  BarChart3,
  Target,
  TrendingUp,
} from 'lucide-react';
import { demoDataService } from '../services/demoData.service';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const Optimization: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [provider, setProvider] = useState('');
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterEffort, setFilterEffort] = useState('All');
  
  // Sort state
  const [sortField, setSortField] = useState<string>('potentialSavings');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // View state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);
  const [showCharts, setShowCharts] = useState(true);
  const [appliedOptimizations, setAppliedOptimizations] = useState<string[]>([]);

  useEffect(() => {
    if (accountId?.includes('aws')) {
      setProvider('AWS');
      setOptimizations(demoDataService.getAWSOptimizations(accountId));
    } else if (accountId?.includes('azure')) {
      setProvider('Azure');
      setOptimizations(demoDataService.getAWSOptimizations(accountId));
    } else if (accountId?.includes('gcp')) {
      setProvider('GCP');
      setOptimizations(demoDataService.getAWSOptimizations(accountId));
    }
  }, [accountId]);

  // Filter optimizations
  const filteredOptimizations = optimizations.filter(opt => {
    const matchesSearch = opt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || opt.type === filterType;
    const matchesPriority = filterPriority === 'All' || opt.priority === filterPriority;
    const matchesEffort = filterEffort === 'All' || opt.effort === filterEffort;
    const notApplied = !appliedOptimizations.includes(opt.id);
    return matchesSearch && matchesType && matchesPriority && matchesEffort && notApplied;
  });

  // Sort optimizations
  const sortedOptimizations = [...filteredOptimizations].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === 'number') {
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
  const optimizationTypes = ['All', ...new Set(optimizations.map(o => o.type))];
  const priorities = ['All', 'High', 'Medium', 'Low'];
  const efforts = ['All', 'Low', 'Medium', 'High'];

  // Calculate statistics
  const totalSavings = optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0);
  const currentCost = optimizations.reduce((sum, opt) => sum + opt.currentCost, 0);
  const quickWins = optimizations.filter(o => o.effort === 'Low' && o.priority === 'High').length;
  const appliedSavings = appliedOptimizations.reduce((sum, id) => {
    const opt = optimizations.find(o => o.id === id);
    return sum + (opt?.potentialSavings || 0);
  }, 0);

  // Chart data
  const savingsByType = optimizationTypes.slice(1).map(type => ({
    name: type,
    savings: optimizations
      .filter(o => o.type === type)
      .reduce((sum, o) => sum + o.potentialSavings, 0),
  }));

  const savingsByPriority = [
    {
      priority: 'High',
      count: optimizations.filter(o => o.priority === 'High').length,
      savings: optimizations.filter(o => o.priority === 'High').reduce((sum, o) => sum + o.potentialSavings, 0),
    },
    {
      priority: 'Medium',
      count: optimizations.filter(o => o.priority === 'Medium').length,
      savings: optimizations.filter(o => o.priority === 'Medium').reduce((sum, o) => sum + o.potentialSavings, 0),
    },
    {
      priority: 'Low',
      count: optimizations.filter(o => o.priority === 'Low').length,
      savings: optimizations.filter(o => o.priority === 'Low').reduce((sum, o) => sum + o.potentialSavings, 0),
    },
  ];

  const effortVsSavings = optimizations.map(opt => ({
    name: opt.title.substring(0, 20),
    effort: opt.effort === 'Low' ? 1 : opt.effort === 'Medium' ? 2 : 3,
    savings: opt.potentialSavings,
    priority: opt.priority === 'High' ? 3 : opt.priority === 'Medium' ? 2 : 1,
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'Low': return 'text-green-400 bg-green-500/20 border-green-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'Low': return CheckCircle;
      case 'Medium': return AlertCircle;
      case 'High': return XCircle;
      default: return AlertCircle;
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'potentialSavings' ? 'desc' : 'asc');
    }
  };

  const handleApply = (optId: string) => {
    setAppliedOptimizations([...appliedOptimizations, optId]);
    alert(`Optimization applied: ${optimizations.find(o => o.id === optId)?.title}`);
  };

  const handleBulkApply = () => {
    if (selectedOptimizations.length === 0) {
      alert('Please select optimizations first');
      return;
    }
    setAppliedOptimizations([...appliedOptimizations, ...selectedOptimizations]);
    setSelectedOptimizations([]);
    alert(`Applied ${selectedOptimizations.length} optimization(s)`);
  };

  const toggleOptimizationSelection = (optId: string) => {
    setSelectedOptimizations(prev => 
      prev.includes(optId) 
        ? prev.filter(id => id !== optId)
        : [...prev, optId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOptimizations.length === sortedOptimizations.length) {
      setSelectedOptimizations([]);
    } else {
      setSelectedOptimizations(sortedOptimizations.map(o => o.id));
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
              <h1 className="text-2xl font-bold text-white">Cost Optimization</h1>
              <p className="text-slate-400 text-sm mt-1">{provider} Account</p>
            </div>
          </div>

          {/* Charts Toggle */}
          <button
            onClick={() => setShowCharts(!showCharts)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showCharts ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Analytics
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total Savings Opportunity</p>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">${totalSavings.toLocaleString()}</p>
            <p className="text-green-400 text-sm mt-2">
              <TrendingDown className="w-3 h-3 inline mr-1" />
              {((totalSavings / currentCost) * 100).toFixed(1)}% potential reduction
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Active Recommendations</p>
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{optimizations.length}</p>
            <p className="text-blue-400 text-sm mt-2">{filteredOptimizations.length} visible</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Quick Wins</p>
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{quickWins}</p>
            <p className="text-purple-400 text-sm mt-2">Low effort, high priority</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Applied Savings</p>
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-white">${appliedSavings.toLocaleString()}</p>
            <p className="text-orange-400 text-sm mt-2">{appliedOptimizations.length} implemented</p>
          </div>
        </div>

        {/* Analytics Charts */}
        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Savings by Type */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Savings by Type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={savingsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="savings" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Distribution */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={savingsByPriority}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.priority}: $${entry.savings.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="savings"
                  >
                    {savingsByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Effort vs Impact */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Effort vs Impact</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={effortVsSavings.slice(0, 5)}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis dataKey="name" stroke="#9ca3af" />
                  <PolarRadiusAxis stroke="#9ca3af" />
                  <Radar name="Savings" dataKey="savings" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Priority" dataKey="priority" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
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
                placeholder="Search optimizations..."
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
              {(filterType !== 'All' || filterPriority !== 'All' || filterEffort !== 'All') && (
                <span className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Sort */}
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value);
                setSortDirection('desc');
              }}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="potentialSavings">Sort by: Savings</option>
              <option value="priority">Sort by: Priority</option>
              <option value="effort">Sort by: Effort</option>
              <option value="savingsPercent">Sort by: % Savings</option>
            </select>

            {/* Export */}
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {optimizationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Effort</label>
                <select
                  value={filterEffort}
                  onChange={(e) => setFilterEffort(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {efforts.map(effort => (
                    <option key={effort} value={effort}>{effort}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedOptimizations.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-blue-400 font-medium">
              {selectedOptimizations.length} optimization(s) selected - Potential savings: $
              {selectedOptimizations.reduce((sum, id) => {
                const opt = optimizations.find(o => o.id === id);
                return sum + (opt?.potentialSavings || 0);
              }, 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkApply}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Apply Selected
              </button>
              <button
                onClick={() => setSelectedOptimizations([])}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Recommendations Table */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.length === sortedOptimizations.length && sortedOptimizations.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Recommendation</th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('priority')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Priority
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('effort')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Effort
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Current Cost</th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">
                    <button
                      onClick={() => handleSort('potentialSavings')}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Savings
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">% Saved</th>
                  <th className="text-left text-slate-400 text-sm font-semibold p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOptimizations.map((opt) => {
                  const EffortIcon = getEffortIcon(opt.effort);
                  
                  return (
                    <tr key={opt.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedOptimizations.includes(opt.id)}
                          onChange={() => toggleOptimizationSelection(opt.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium mb-1">{opt.title}</p>
                          <p className="text-slate-400 text-sm">{opt.description}</p>
                          {opt.resources && opt.resources.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {opt.resources.slice(0, 3).map((resource: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded font-mono"
                                >
                                  {resource}
                                </span>
                              ))}
                              {opt.resources.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">
                                  +{opt.resources.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(opt.priority)}`}>
                          {opt.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <EffortIcon className={`w-4 h-4 ${getEffortColor(opt.effort)}`} />
                          <span className={`text-sm font-medium ${getEffortColor(opt.effort)}`}>
                            {opt.effort}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-medium">
                        ${opt.currentCost.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="text-green-400 font-bold text-lg">
                          ${opt.potentialSavings.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-green-400 font-semibold">
                          {opt.savingsPercent}%
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApply(opt.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            Apply
                          </button>
                          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium">
                            Details
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
        {sortedOptimizations.length === 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-12 border border-slate-700 text-center">
            <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No optimizations found</p>
            <p className="text-slate-500 text-sm">
              {appliedOptimizations.length > 0 
                ? `Great job! You've applied ${appliedOptimizations.length} optimization(s)`
                : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Optimization;