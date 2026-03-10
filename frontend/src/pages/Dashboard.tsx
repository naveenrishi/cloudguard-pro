import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingDown, Cloud, DollarSign, ChevronRight,
  LogOut, Settings as SettingsIcon, TrendingUp,
  Target, Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#6b7280','#14b8a6','#f43f5e'];
const PROVIDER_COLOR: Record<string,string> = { AWS:'#f97316', AZURE:'#3b82f6', GCP:'#10b981' };
const PROVIDER_BG:    Record<string,string> = { AWS:'#fff7ed', AZURE:'#eff6ff', GCP:'#f0fdf4' };

// ── types ────────────────────────────────────────────────────────────────────
interface ConnectedAccount {
  id: string; accountName: string; accountId: string;
  provider: 'AWS' | 'AZURE' | 'GCP'; status: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    totalCost: 0, lastMonthCost: 0, currentMonthEstimate: 0,
    currentMonthCost: 0, forecastCost: 0, connectedAccounts: 0,
    costSavings: 0, activeAlerts: 0,
    costTrend: [], serviceBreakdown: [], regionalCost: [], recommendations: [],
  });
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // per-account dashboard data for the accounts table
  const [accountDashboards, setAccountDashboards] = useState<any[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.mfaEnabled) {
      navigate('/setup-mfa', { state: { firstLogin: true, message: 'Please set up 2FA first' } });
      return;
    }
    fetchDashboardData(user.id);
    fetchAccounts(user.id);
  }, [navigate]);

  const fetchAccounts = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res  = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: ConnectedAccount[] = Array.isArray(data) ? data : [];
      setAccounts(list);
      if (list.length > 0) setSelectedAccountId(list[0].id);

      // load per-account dashboards for the accounts table
      const results = await Promise.allSettled(
        list.map(a =>
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/dashboard/${a.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json())
        )
      );
      setAccountDashboards(
        results.filter(r => r.status === 'fulfilled').map((r: any) => r.value)
      );
    } catch (e) {
      console.error('Failed to fetch accounts:', e);
      setAccounts([]);
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res   = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/dashboard/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(await res.json());
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    try { await fetch('${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (_) {}
    navigate('/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="spinner w-12 h-12 mx-auto mb-4" />
        <p className="text-gray-500">Loading your dashboard…</p>
      </div>
    </div>
  );

  // ── data with fallbacks ───────────────────────────────────────────────────
  const costTrendData = dashboardData.costTrend?.length > 0 ? dashboardData.costTrend : [
    { month:'Sep', cost:620 }, { month:'Oct', cost:580 }, { month:'Nov', cost:710 },
    { month:'Dec', cost:760 }, { month:'Jan', cost:793 }, { month:'Feb', cost:72  },
  ];

  const serviceBreakdown = (dashboardData.serviceBreakdown?.length > 0
    ? dashboardData.serviceBreakdown.map((s: any, i: number) => ({ ...s, color: PIE_COLORS[i % 8] }))
    : [
        { name:'EC2', value:4850 }, { name:'S3', value:2340 },
        { name:'RDS', value:1890 }, { name:'Lambda', value:1250 },
        { name:'CloudFront', value:980 }, { name:'Other', value:1148 },
      ].map((s, i) => ({ ...s, color: PIE_COLORS[i] })));

  const recentRecommendations = dashboardData.recommendations?.length > 0
    ? dashboardData.recommendations
    : [
        { title:'Rightsize EC2 Instances',       description:'12 oversized instances detected', savings:'$1,240/mo', priority:'high'   },
        { title:'Delete Unused EBS Volumes',     description:'8 unattached volumes',            savings:'$520/mo',   priority:'medium' },
        { title:'Enable S3 Intelligent-Tiering', description:'145 GB eligible for tiering',     savings:'$380/mo',   priority:'medium' },
      ];

  const regionData = [
    { region:'us-east-1', cost:4500 }, { region:'us-west-2', cost:3200 },
    { region:'eu-west-1', cost:2800 }, { region:'ap-south-1', cost:1958 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container-custom py-4 flex flex-col gap-6">

        {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="stat-card animate-fadeIn" style={{ animationDelay:'0.05s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="stat-icon bg-blue-50"><DollarSign className="w-5 h-5 text-blue-600" /></div>
            </div>
            <p className="stat-label">Last Month</p>
            <p className="stat-value">{fmtMoney(dashboardData.lastMonthCost)}</p>
            <p className="text-xs text-gray-500">Actual cost</p>
          </div>

          <div className="stat-card animate-fadeIn" style={{ animationDelay:'0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="stat-icon bg-purple-50"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            </div>
            <p className="stat-label">This Month Estimate</p>
            <p className="stat-value">{fmtMoney(dashboardData.currentMonthEstimate)}</p>
            <p className="text-xs text-blue-600">
              {fmtMoney(dashboardData.currentMonthCost)} spent + {fmtMoney(dashboardData.forecastCost)} forecast
            </p>
          </div>

          <div className="stat-card animate-fadeIn" style={{ animationDelay:'0.15s' }}
            onClick={() => navigate('/connect-aws')}>
            <div className="flex items-center justify-between mb-3">
              <div className="stat-icon bg-green-50"><Cloud className="w-5 h-5 text-green-600" /></div>
            </div>
            <p className="stat-label">Connected Accounts</p>
            <p className="stat-value">{dashboardData.connectedAccounts || accounts.length}</p>
            <div className="flex gap-1.5 flex-wrap">
              {(['AWS','AZURE','GCP'] as const).map(p => {
                const count = accounts.filter(a => a.provider === p).length;
                if (!count) return null;
                return (
                  <span key={p} className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: PROVIDER_BG[p], color: PROVIDER_COLOR[p] }}>
                    {p} {count}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="stat-card animate-fadeIn" style={{ animationDelay:'0.2s' }}
            onClick={() => navigate('/recommendations')}>
            <div className="flex items-center justify-between mb-3">
              <div className="stat-icon bg-orange-50"><TrendingDown className="w-5 h-5 text-orange-500" /></div>
            </div>
            <p className="stat-label">Potential Savings</p>
            <p className="stat-value text-green-600">{fmtMoney(dashboardData.costSavings)}</p>
            <p className="text-xs text-gray-500">Optimization opportunities</p>
          </div>
        </div>

        {/* ── CONNECTED ACCOUNTS TABLE ─────────────────────────────────────── */}
        {accountDashboards.length > 0 && (
          <div className="section-card animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Connected Accounts</h3>
                <p className="text-xs text-gray-500 mt-0.5">Click a row to open account dashboard</p>
              </div>
              <button onClick={() => navigate('/connect-aws')} className="btn btn-secondary text-xs">
                + Add Account
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    {['Account','Provider','This Month','Last Month','Change','Security Score'].map((h, i) => (
                      <th key={h} className={`text-xs font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accountDashboards.map((d: any) => {
                    const acc = accounts.find(a => a.id === d.id);
                    const provider = (d.provider || acc?.provider || 'AWS').toUpperCase();
                    const ch = d.lastMonthCost > 0 ? ((d.totalCost - d.lastMonthCost) / d.lastMonthCost) * 100 : 0;
                    const sc = d.securityScore >= 70 ? '#10b981' : d.securityScore >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={d.id}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/account/${d.id}/overview`)}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="font-semibold text-gray-900">{d.accountName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: PROVIDER_BG[provider] || '#f1f5f9', color: PROVIDER_COLOR[provider] || '#374151' }}>
                            {provider}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{fmtMoney(d.totalCost)}</td>
                        <td className="py-3 px-3 text-center text-gray-500">{fmtMoney(d.lastMonthCost)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`flex items-center justify-center gap-0.5 text-xs font-semibold ${ch >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {ch >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {Math.abs(ch).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ background: sc, width: `${d.securityScore}%` }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: sc }}>{d.securityScore}</span>
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

        {/* ── CHARTS ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 chart-container animate-fadeIn" style={{ animationDelay:'0.3s' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Cost Trend</h3>
                <p className="text-xs text-gray-500 mt-0.5">Monthly spending history</p>
              </div>
              <select className="input w-auto text-xs">
                <option>Last 6 months</option>
                <option>Last 12 months</option>
                <option>This year</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={costTrendData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize:'11px' }} axisLine={false} tickLine={false}/>
                <YAxis stroke="#94a3b8" style={{ fontSize:'11px' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ background:'white', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12 }}/>
                <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="url(#colorCost)" strokeWidth={2.5}
                  dot={{ fill:'#3b82f6', r:3, strokeWidth:0 }} activeDot={{ r:5 }} name="Cost"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container animate-fadeIn" style={{ animationDelay:'0.4s' }}>
            <h3 className="text-base font-semibold text-gray-900 mb-5">Cost by Service</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {serviceBreakdown.map((e: any, i: number) => <Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ background:'white', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {serviceBreakdown.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }}/>
                  <span className="text-xs text-gray-600 truncate">{s.name.replace('Amazon ','').replace('AWS ','')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── REGION + RECOMMENDATIONS ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="chart-container animate-fadeIn" style={{ animationDelay:'0.5s' }}>
            <h3 className="text-base font-semibold text-gray-900 mb-5">Cost by Region</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="region" stroke="#94a3b8" style={{ fontSize:'10px' }} axisLine={false} tickLine={false}/>
                <YAxis stroke="#94a3b8" style={{ fontSize:'11px' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ background:'white', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12 }}/>
                <Bar dataKey="cost" fill="#3b82f6" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card animate-fadeIn" style={{ animationDelay:'0.6s' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Cost Savings Opportunities</h3>
                <p className="text-xs text-gray-500 mt-0.5">Potential: {fmtMoney(dashboardData.costSavings)}/mo</p>
              </div>
              <button onClick={() => navigate('/recommendations')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
            <div className="space-y-3">
              {recentRecommendations.map((rec: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
                  onClick={() => navigate('/recommendations')}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">{rec.title}</h4>
                        <span className={`badge ${rec.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>{rec.priority}</span>
                      </div>
                      <p className="text-xs text-gray-500">{rec.description}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-base font-bold text-green-600">{rec.savings}</p>
                      <p className="text-xs text-gray-400">potential</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MIGRATION ADVISOR ────────────────────────────────────────────── */}
        {accounts.length > 0 && dashboardData.costSavings > 0 && (
          <div className="animate-fadeIn" style={{ animationDelay:'0.7s' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Migration Advisor</h2>
                <p className="text-gray-500 text-sm mt-0.5">AI-powered migration recommendations</p>
              </div>
              {accounts.length > 1 && (
                <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="input w-auto text-sm">
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.provider} — {a.accountName}</option>
                  ))}
                </select>
              )}
            </div>
            <MigrationAdvisorSection accountId={selectedAccountId} />
          </div>
        )}

      </div>
    </div>
  );
};

// ── MigrationAdvisorSection (your original, unchanged) ───────────────────────
interface MigrationAdvisorSectionProps { accountId: string; }

const MigrationAdvisorSection: React.FC<MigrationAdvisorSectionProps> = ({ accountId }) => {
  const token = localStorage.getItem('accessToken') || '';
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [tcoData,  setTCOData]  = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [showAll,  setShowAll]  = useState(false);

  useEffect(() => { if (accountId) fetchAccountMigrationData(); }, [accountId]);

  const fetchAccountMigrationData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [recRes, tcoRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/migration/recommendations/account/${accountId}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/migration/tco/account/${accountId}`, { headers }),
      ]);
      setRecommendations(recRes.data || []);
      setTCOData(tcoRes.data || null);
    } catch { loadDemoMigrationData(); }
    finally { setLoading(false); }
  };

  const loadDemoMigrationData = () => {
    setRecommendations([
      { id:'1', title:'Migrate to Reserved Instances', description:'Switch steady-state workloads to RIs for 40% savings', savings:420, complexity:'Low',    estimatedTime:'1 week'  },
      { id:'2', title:'Rightsize EC2 instances',       description:'8 instances running at <20% utilization',            savings:280, complexity:'Medium', estimatedTime:'2 weeks' },
      { id:'3', title:'Move to Aurora Serverless',     description:'Convert RDS to Aurora Serverless for variable workloads', savings:340, complexity:'High', estimatedTime:'4 weeks' },
    ]);
    setTCOData({ currentMonthlyCost:2450, optimizedMonthlyCost:1410, monthlySavings:1040, annualSavings:12480, roi:156 });
  };

  const complexityClass = (c: string) =>
    c?.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' :
    c?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  if (loading) return (
    <div className="card flex items-center justify-center py-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"/>
      <p className="text-gray-500 text-sm">Loading migration data…</p>
    </div>
  );

  const shown      = showAll ? recommendations : recommendations.slice(0, 3);
  const totalSaved = recommendations.reduce((s, r) => s + r.savings, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label:'Monthly Savings', value:`$${(tcoData?.monthlySavings||totalSaved).toLocaleString()}`, color:'text-green-600', bg:'bg-green-50' },
          { label:'Annual Savings',  value:`$${(tcoData?.annualSavings||totalSaved*12).toLocaleString()}`, color:'text-blue-600',  bg:'bg-blue-50'  },
          { label:'Opportunities',   value:String(recommendations.length), color:'text-purple-600', bg:'bg-purple-50' },
        ].map((c, i) => (
          <div key={i} className={`stat-card ${c.bg}`}>
            <p className="stat-label">{c.label}</p>
            <p className={`stat-value ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Migration Recommendations</h3>
          {recommendations.length > 3 && (
            <button onClick={() => setShowAll(!showAll)} className="text-blue-600 text-sm font-medium flex items-center gap-1">
              {showAll ? 'Show Less' : `View All (${recommendations.length})`} <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
        <div className="space-y-3">
          {shown.length === 0 ? (
            <div className="text-center py-4">
              <Target className="w-8 h-8 text-gray-300 mx-auto mb-1"/>
              <p className="text-gray-400 text-sm">No recommendations — this account is optimized!</p>
            </div>
          ) : shown.map(rec => (
            <div key={rec.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${complexityClass(rec.complexity)}`}>{rec.complexity} Complexity</span>
                    <span className="text-gray-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> {rec.estimatedTime}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{rec.title}</h4>
                  <p className="text-gray-500 text-xs">{rec.description}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-0.5">Savings</p>
                  <p className="text-xl font-bold text-green-600">${rec.savings}</p>
                  <p className="text-xs text-gray-400">/month</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {tcoData && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-red-50 border-red-100">
            <p className="text-red-700 text-xs font-semibold uppercase mb-2">Current Monthly Cost</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">${tcoData.currentMonthlyCost?.toLocaleString()}</p>
            <p className="text-gray-500 text-sm">Existing infrastructure</p>
          </div>
          <div className="card bg-green-50 border-green-100">
            <p className="text-green-700 text-xs font-semibold uppercase mb-2">Optimized Monthly Cost</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">${tcoData.optimizedMonthlyCost?.toLocaleString()}</p>
            <p className="text-green-600 text-sm font-medium">
              Save ${tcoData.monthlySavings?.toLocaleString()}/mo
              ({Math.round((tcoData.monthlySavings / tcoData.currentMonthlyCost) * 100)}% reduction)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
