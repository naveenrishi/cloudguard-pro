import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingDown, 
  Cloud, 
  AlertCircle, 
  DollarSign,
  ChevronRight,
  LogOut,
  User,
  Settings as SettingsIcon
} from 'lucide-react';
import {
  AreaChart,
  Area,
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    totalCost: 0,
    lastMonthCost: 0,
    currentMonthEstimate: 0,
    currentMonthCost: 0,
    forecastCost: 0,
    connectedAccounts: 0,
    costSavings: 0,
    activeAlerts: 0,
    costTrend: [],
    serviceBreakdown: [],
    regionalCost: [],
    recommendations: [],
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.mfaEnabled) {
      navigate('/setup-mfa', { 
        state: { 
          firstLogin: true,
          message: 'Please set up two-factor authentication before accessing your dashboard' 
        } 
      });
      return;
    }

    fetchDashboardData(user.id);
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    console.log('🔍 Fetching dashboard data for userId:', userId);
    
    try {
      const token = localStorage.getItem('accessToken');
      console.log('🔑 Token exists:', !!token);
      
      const url = `http://localhost:3000/api/cloud/dashboard/${userId}`;
      console.log('📡 Fetching from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      console.log('📥 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Dashboard data received:', data);
      
      setDashboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Use real data from API or fallback to dummy data
  const costTrendData = dashboardData.costTrend.length > 0 ? dashboardData.costTrend : [
    { month: 'Jan', cost: 14500 },
    { month: 'Feb', cost: 13800 },
    { month: 'Mar', cost: 15200 },
    { month: 'Apr', cost: 14100 },
    { month: 'May', cost: 13400 },
    { month: 'Jun', cost: 12458 },
  ];

  const serviceBreakdown = dashboardData.serviceBreakdown.length > 0 
    ? dashboardData.serviceBreakdown.map((service: any, index: number) => ({
        name: service.name,
        value: service.value,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#f43f5e'][index % 8],
      }))
    : [
        { name: 'EC2', value: 4850, color: '#3b82f6' },
        { name: 'S3', value: 2340, color: '#10b981' },
        { name: 'RDS', value: 1890, color: '#f59e0b' },
        { name: 'Lambda', value: 1250, color: '#8b5cf6' },
        { name: 'CloudFront', value: 980, color: '#ec4899' },
        { name: 'Other', value: 1148, color: '#6b7280' },
      ];

  const recentRecommendations = dashboardData.recommendations.length > 0
    ? dashboardData.recommendations
    : [
        {
          title: 'Rightsize EC2 Instances',
          description: '12 oversized instances detected',
          savings: '$1,240/mo',
          priority: 'high',
        },
        {
          title: 'Delete Unused EBS Volumes',
          description: '8 unattached volumes',
          savings: '$520/mo',
          priority: 'medium',
        },
        {
          title: 'Enable S3 Intelligent-Tiering',
          description: '145 GB eligible for tiering',
          savings: '$380/mo',
          priority: 'medium',
        },
      ];

  const regionData = [
    { region: 'us-east-1', cost: 4500 },
    { region: 'us-west-2', cost: 3200 },
    { region: 'eu-west-1', cost: 2800 },
    { region: 'ap-south-1', cost: 1958 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor your cloud costs and optimize spending</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/recommendations')}
                className="btn btn-secondary flex items-center gap-2"
              >
                <TrendingDown className="w-5 h-5" />
                Recommendations
              </button>
              <button 
                onClick={() => navigate('/connect-aws')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Cloud className="w-5 h-5" />
                Connect Account
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="btn btn-secondary flex items-center gap-2"
              >
                <SettingsIcon className="w-5 h-5" />
                Settings
              </button>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Last Complete Month */}
          <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon bg-primary-100">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <h3 className="stat-label">Last Month (Jan)</h3>
            <p className="stat-value">${dashboardData.lastMonthCost.toLocaleString()}</p>
            <p className="text-sm text-gray-600 font-medium">Actual cost</p>
          </div>

          {/* Current Month Estimate */}
          <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon bg-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="stat-label">This Month (Feb) Estimate</h3>
            <p className="stat-value">${dashboardData.currentMonthEstimate.toLocaleString()}</p>
            <p className="text-sm text-blue-600 font-medium text-xs">
              ${dashboardData.currentMonthCost.toLocaleString()} spent + ${dashboardData.forecastCost.toLocaleString()} forecast
            </p>
          </div>

          {/* Connected Accounts */}
          <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon bg-green-100">
                <Cloud className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="stat-label">Connected Accounts</h3>
            <p className="stat-value">{dashboardData.connectedAccounts}</p>
            <p className="text-sm text-green-600 font-medium">AWS connected</p>
          </div>

          {/* Cost Savings */}
          <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="stat-icon bg-purple-100">
                <TrendingDown className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="stat-label">Cost Savings</h3>
            <p className="stat-value">${dashboardData.costSavings.toLocaleString()}</p>
            <p className="text-sm text-green-600 font-medium">Potential savings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 chart-container animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cost Trend</h3>
                <p className="text-sm text-gray-600 mt-1">Monthly spending history</p>
              </div>
              <select className="input w-auto">
                <option>Last 6 months</option>
                <option>Last 12 months</option>
                <option>This year</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={costTrendData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="url(#colorCost)" strokeWidth={2} name="Actual Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container animate-fadeIn" style={{ animationDelay: '0.5s' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost by Service</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {serviceBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {serviceBreakdown.slice(0, 8).map((service: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }}></div>
                  <span className="text-xs text-gray-700 truncate">{service.name.replace('Amazon ', '').replace('AWS ', '')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="chart-container animate-fadeIn" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost by Region</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="region" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="cost" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card animate-fadeIn" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cost Savings Opportunities</h3>
                <p className="text-sm text-gray-600 mt-1">Potential savings: ${dashboardData.costSavings.toLocaleString()}/mo</p>
              </div>
              <button 
                onClick={() => navigate('/recommendations')}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {recentRecommendations.map((rec: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer" onClick={() => navigate('/recommendations')}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <span className={`badge ${rec.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-green-600">{rec.savings}</p>
                      <p className="text-xs text-gray-500">potential</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
