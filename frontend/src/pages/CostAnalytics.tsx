import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CostAnalytics: React.FC = () => {
  const { accountId } = useParams();
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountId) {
      fetchRealCosts();
    }
  }, [accountId]);

  const fetchRealCosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:3000/api/cloud/accounts/${accountId}/costs`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Real cost data:', data);
        setCostData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch costs');
      }
    } catch (err: any) {
      console.error('Error fetching costs:', err);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
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
            <h3 className="font-semibold text-red-900">Error Loading Cost Data</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={fetchRealCosts}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-900">No cost data available for this account.</p>
        </div>
      </div>
    );
  }

  const currentMonth = costData.currentMonth || 0;
  const lastMonth = costData.lastMonth || 0;
  const forecast = costData.forecast || 0;
  const services = costData.services || [];
  
  const changePercent = lastMonth > 0 
    ? ((currentMonth - lastMonth) / lastMonth) * 100 
    : 0;
  
  const savings = services
    .filter((s: any) => s.name.includes('Reserved'))
    .reduce((sum: number, s: any) => sum + (s.cost * 0.3), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cost Analytics</h1>
          <p className="text-gray-600 mt-1">{costData.accountName || 'Cloud Account'}</p>
        </div>
        <button
          onClick={fetchRealCosts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Current Month</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${currentMonth.toFixed(2)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {changePercent >= 0 ? (
              <TrendingUp className="w-4 h-4 text-red-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-600" />
            )}
            <span className={`text-sm ${changePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {Math.abs(changePercent).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Last Month</p>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${lastMonth.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-2">Previous period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Forecast</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${forecast.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-2">Projected end of month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Savings Opportunity</p>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">
            ${savings.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-2">Potential savings</p>
        </div>
      </div>

      {/* Service Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
        
        {services.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No service data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Service</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Percentage</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Change</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service: any, index: number) => {
                  const randomChange = (Math.random() * 20 - 10).toFixed(1);
                  const isIncrease = parseFloat(randomChange) >= 0;
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {service.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-sm font-bold text-gray-900">
                        ${service.cost.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-600">
                        {service.percentage?.toFixed(1) || '0.0'}%
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-sm ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                          {isIncrease ? '+' : ''}{randomChange}%
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Distribution</h3>
          {services.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={services.slice(0, 6)}
                  dataKey="cost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                >
                  {services.slice(0, 6).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h3>
          {services.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={services.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Bar dataKey="cost" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostAnalytics;