import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StatCard from '../components/dashboard/StatCard';
import SecurityPosture from '../components/dashboard/SecurityPosture';
import ComplianceWidget from '../components/dashboard/ComplianceWidget';
import CloudProviderSelector from '../components/modals/CloudProviderSelector';
import CloudFootprintMap from '../components/dashboard/CloudFootprintMap';
import CloudStatusBanner from '../components/dashboard/CloudStatusBanner';
import VersionUpdatesWidget from '../components/dashboard/VersionUpdatesWidget';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Cloud,
  Server,
  Database,
  Zap,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const NewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeProvider, setActiveProvider] = useState<'all' | 'aws' | 'azure' | 'gcp'>('all');
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    totalCost: 0,
    lastMonthCost: 0,
    currentMonthEstimate: 0,
    connectedAccounts: 0,
    accountsByProvider: { aws: 0, azure: 0, gcp: 0 },
    costSavings: 0,
    costTrend: [],
    serviceBreakdown: [],
  });

  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [versionUpdates, setVersionUpdates] = useState<any>({ aws: [], azure: [], gcp: [] });
  
  const [cloudStatus, setCloudStatus] = useState<any>({
    allHealthy: true,
    totalIssues: 0,
    providers: {
      aws: { provider: 'aws', healthy: true, message: 'Checking...', activeIssues: 0, lastChecked: new Date() },
      azure: { provider: 'azure', healthy: true, message: 'Checking...', activeIssues: 0, lastChecked: new Date() },
      gcp: { provider: 'gcp', healthy: true, message: 'Checking...', activeIssues: 0, lastChecked: new Date() },
    },
    lastChecked: new Date(),
  });

  const fetchDashboardData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`http://localhost:3000/api/cloud/dashboard/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`http://localhost:3000/api/cloud/accounts/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const data = await response.json();
      setConnectedAccounts(data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchCloudStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('http://localhost:3000/api/health/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const data = await response.json();
      setCloudStatus(data);
    } catch (error) {
      console.error('Failed to fetch cloud status:', error);
    }
  };
  
  const fetchVersionUpdates = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('http://localhost:3000/api/health/version-updates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch version updates');
      }
      
      const data = await response.json();
      setVersionUpdates(data || { aws: [], azure: [], gcp: [] });
    } catch (error) {
      console.error('Failed to fetch version updates:', error);
      setVersionUpdates({ aws: [], azure: [], gcp: [] });
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchConnectedAccounts();
    fetchCloudStatus();
    fetchVersionUpdates();
  
    // Poll for cloud status every 2 minutes
    const statusInterval = setInterval(fetchCloudStatus, 120000);
    
    // Poll for version updates every 5 minutes
    const versionInterval = setInterval(fetchVersionUpdates, 300000);
  
    return () => {
      clearInterval(statusInterval);
      clearInterval(versionInterval);
    };
  }, []);

  const costTrendData = dashboardData.costTrend.length > 0 
    ? dashboardData.costTrend 
    : [
        { month: 'Aug', cost: 56 },
        { month: 'Sep', cost: 270 },
        { month: 'Oct', cost: 286 },
        { month: 'Nov', cost: 335 },
        { month: 'Dec', cost: 582 },
        { month: 'Jan', cost: 778 },
        { month: 'Feb', cost: 707 },
      ];

  const serviceBreakdown = dashboardData.serviceBreakdown.length > 0
    ? dashboardData.serviceBreakdown.map((service: any, index: number) => ({
        name: service.name.replace('Amazon ', '').replace('AWS ', '').replace('Microsoft.', ''),
        value: service.value,
        provider: service.provider || 'aws',
        color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'][index % 6],
      }))
    : [];

  const topServices = [
    { name: 'EC2', cost: 13087, icon: Server, color: 'blue' },
    { name: 'Azure VMs', cost: 8453, icon: Cloud, color: 'green' },
    { name: 'RDS', cost: 5861, icon: Database, color: 'purple' },
  ];

  const topResources = [
    { name: 'IAM Role', count: 4881, icon: Zap },
    { name: 'Lambda', count: 1320, icon: Zap },
    { name: 'IAM Policy', count: 1306, icon: Server },
    { name: 'CloudWatch Event Rule', count: 1197, icon: AlertTriangle },
  ];

  const providerTabs = [
    { id: 'all', name: 'All Clouds', count: dashboardData.connectedAccounts },
    { id: 'aws', name: 'AWS', count: dashboardData.accountsByProvider?.aws || 0, logo: '☁️' },
    { id: 'azure', name: 'Azure', count: dashboardData.accountsByProvider?.azure || 0, logo: '🔷' },
    { id: 'gcp', name: 'GCP', count: dashboardData.accountsByProvider?.gcp || 0, logo: '🌐' },
  ];

  return (
    <MainLayout>
      <CloudProviderSelector 
        isOpen={showProviderModal} 
        onClose={() => setShowProviderModal(false)} 
      />

      <CloudStatusBanner 
        allHealthy={cloudStatus.allHealthy}
        totalIssues={cloudStatus.totalIssues}
        providers={cloudStatus.providers}
        lastChecked={cloudStatus.lastChecked}
        onRefresh={fetchCloudStatus}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-slate-700">
          {providerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveProvider(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeProvider === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.logo && <span className="text-lg">{tab.logo}</span>}
              <span>{tab.name}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeProvider === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowProviderModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Connect Account
        </button>
      </div>

      {versionUpdates && (versionUpdates.aws?.length > 0 || versionUpdates.azure?.length > 0 || versionUpdates.gcp?.length > 0) && (
        <div className="mb-6">
          <VersionUpdatesWidget updates={versionUpdates} />
        </div>
      )}

      {connectedAccounts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Connected Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedAccounts
              .filter(acc => activeProvider === 'all' || acc.provider === activeProvider)
              .map((account) => (
              <div
                key={account.id}
                className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    account.provider === 'aws' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    account.provider === 'azure' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {account.provider === 'aws' ? '☁️' : account.provider === 'azure' ? '🔷' : '🌐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {account.accountName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {account.provider.toUpperCase()} • {account.accountId.substring(0, 12)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Monthly Spend"
          value={`$${dashboardData.totalCost.toLocaleString()}`}
          subtitle="Total Spend"
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Open Ops Issues"
          value="38522"
          subtitle="By DAY2"
          icon={AlertTriangle}
          trend={{ value: '0', positive: true }}
          color="orange"
        />
        <StatCard
          title="Remediations"
          value="4428"
          subtitle="Security"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Recommendations"
          value="4645"
          subtitle="Compliance"
          icon={TrendingDown}
          trend={{ value: '18.2%', positive: true }}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cost Trend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeProvider === 'all' ? 'All providers' : activeProvider.toUpperCase()} • Monthly spending history
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${(dashboardData.lastMonthCost + dashboardData.currentMonthEstimate).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total Spend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={costTrendData}>
              <defs>
                <linearGradient id="colorCost2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="url(#colorCost2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Cost by Service</h3>
          {serviceBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {serviceBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {serviceBreakdown.slice(0, 6).map((service: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }}></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{service.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              No service data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SecurityPosture />
        <ComplianceWidget />
      </div>

      <div className="mb-6">
        <CloudFootprintMap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Services</h3>
          <div className="space-y-4">
            {topServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br from-${service.color}-500 to-${service.color}-600 rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{service.name}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">${service.cost.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Resources</h3>
          <div className="space-y-4">
            {topResources.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{resource.name}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{resource.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewDashboard;