import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Server,
  Database,
  HardDrive,
  Activity,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';

const Resources: React.FC = () => {
  const { accountId } = useParams();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (accountId) {
      fetchRealResources();
    }
  }, [accountId]);

  const fetchRealResources = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts/${accountId}/resources`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Real resources:', data);
        setResources(data.resources || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch resources');
      }
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EC2':
        return <Server className="w-5 h-5 text-blue-600" />;
      case 'RDS':
        return <Database className="w-5 h-5 text-green-600" />;
      case 'S3':
        return <HardDrive className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-purple-600" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'running':
      case 'available':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'stopped':
      case 'inactive':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || resource.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const resourceTypes = [...new Set(resources.map(r => r.type))];
  const resourceCounts = {
    total: resources.length,
    running: resources.filter(r => ['running', 'available', 'active'].includes(r.state?.toLowerCase())).length,
    stopped: resources.filter(r => ['stopped', 'inactive'].includes(r.state?.toLowerCase())).length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Resources</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={fetchRealResources}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-600 mt-1">Cloud resources inventory</p>
        </div>
        <button
          onClick={fetchRealResources}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Resources</p>
            <Server className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{resourceCounts.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Running</p>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{resourceCounts.running}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Stopped</p>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{resourceCounts.stopped}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resources List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredResources.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {resources.length === 0 ? 'No resources found' : 'No resources match your filters'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Region</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">State</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource, index) => (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getResourceIcon(resource.type)}
                        <span className="text-sm font-medium text-gray-900">{resource.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{resource.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-mono">{resource.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{resource.region}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(resource.state)}`}>
                        {resource.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;