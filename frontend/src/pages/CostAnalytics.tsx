// src/pages/CostAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown,
  Calendar, AlertCircle, RefreshCw, ArrowLeft,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#059669', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

const CostAnalytics: React.FC = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [costData, setCostData] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (accountId) fetchRealCosts();
  }, [accountId]);

  const fetchRealCosts = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cloud/accounts/${accountId}/costs`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setCostData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch costs');
      }
    } catch (err: any) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading cost data…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center max-w-md">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-800 mb-2">Error Loading Cost Data</h3>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={fetchRealCosts} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold">Retry</button>
      </div>
    </div>
  );

  if (!costData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
        <p className="text-amber-800 text-sm font-medium">No cost data available for this account.</p>
      </div>
    </div>
  );

  const currentMonth    = costData.currentMonth || 0;
  const lastMonth       = costData.lastMonth    || 0;
  const forecast        = costData.forecast     || 0;
  const services        = costData.services     || [];
  const changePercent   = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;
  const savings         = services
    .filter((s: any) => s.name.includes('Reserved'))
    .reduce((sum: number, s: any) => sum + s.cost * 0.3, 0);

  const momChange    = lastMonth > 0 ? (((currentMonth - lastMonth) / lastMonth) * 100).toFixed(1) : '0.0';
  const momIncrease  = parseFloat(momChange) >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Cost Analytics</h1>
            <p className="text-xs text-gray-400 mt-0.5">{costData.accountName || accountId}</p>
          </div>
          <button
            onClick={fetchRealCosts}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Current Month', value: `$${currentMonth.toFixed(2)}`,
              sub: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% vs last month`,
              icon: DollarSign, color: '#059669', bg: '#ecfdf5',
              subColor: changePercent >= 0 ? 'text-red-500' : 'text-emerald-500',
            },
            {
              label: 'Last Month', value: `$${lastMonth.toFixed(2)}`,
              sub: 'Previous period', icon: Calendar, color: '#2563eb', bg: '#eff6ff', subColor: 'text-gray-400',
            },
            {
              label: 'Forecast', value: `$${forecast.toFixed(2)}`,
              sub: 'Projected end of month', icon: TrendingUp, color: '#7c3aed', bg: '#f5f3ff', subColor: 'text-gray-400',
            },
            {
              label: 'Savings Opportunity', value: `$${savings.toFixed(2)}`,
              sub: 'Potential savings', icon: TrendingDown, color: '#d97706', bg: '#fffbeb', subColor: 'text-amber-500',
            },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
                <p className={`text-xs mt-0.5 ${s.subColor}`}>{s.sub}</p>
              </div>
            );
          })}
        </div>

        {/* 12-Month Trend */}
        {costData.monthlyData && costData.monthlyData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">12-Month Trend</h3>
            <p className="text-xs text-gray-400 mb-5">Monthly cloud spend history</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={costData.monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v.toFixed(0)}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: any) => [`$${v.toFixed(2)}`, 'Cost']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Service Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Service Breakdown</h3>
          <p className="text-xs text-gray-400 mb-5">Cost by cloud service this month</p>
          {services.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No service data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500">Service</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500">Cost</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500">Share</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500">MoM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {services.map((service: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-medium text-gray-800">{service.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-sm font-bold text-gray-900">
                        ${service.cost.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(service.percentage || 0, 100)}%`, backgroundColor: COLORS[index % COLORS.length] }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{service.percentage?.toFixed(1) || '0.0'}%</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-xs font-semibold ${momIncrease ? 'text-red-500' : 'text-emerald-600'}`}>
                          {momIncrease ? '+' : ''}{momChange}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts Row */}
        {services.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Cost Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Share of spend by service</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={services.slice(0, 6)}
                    dataKey="cost"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    label={(entry) => `${entry.name.split(' ')[0]}`}
                    labelLine={false}
                  >
                    {services.slice(0, 6).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Top Services</h3>
              <p className="text-xs text-gray-400 mb-4">Highest cost services this month</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={services.slice(0, 6)} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {services.slice(0, 6).map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CostAnalytics;
