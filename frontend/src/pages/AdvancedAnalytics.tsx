// src/pages/AdvancedAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  BarChart3, TrendingUp, TrendingDown, RefreshCw,
  ChevronRight, ArrowUpRight, ArrowDownRight,
  DollarSign, Cloud, Server, Tag, Filter, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const fmt  = (n: number) => `$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);

// ── Mock / fallback data ──────────────────────────────────────────────────────
const MONTHS = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar(f)','Apr(f)','May(f)'];

const MULTI_CLOUD = [
  { month:'Sep', AWS:720, Azure:180, GCP:0   },
  { month:'Oct', AWS:890, Azure:210, GCP:0   },
  { month:'Nov', AWS:1120,Azure:280, GCP:0   },
  { month:'Dec', AWS:1480,Azure:340, GCP:0   },
  { month:'Jan', AWS:1920,Azure:420, GCP:0   },
  { month:'Feb', AWS:2280,Azure:520, GCP:21  },
];

const FORECAST = [
  { month:'Sep', actual:900,  forecast:null,  budget:1200 },
  { month:'Oct', actual:1100, forecast:null,  budget:1200 },
  { month:'Nov', actual:1400, forecast:null,  budget:1500 },
  { month:'Dec', actual:1820, forecast:null,  budget:2000 },
  { month:'Jan', actual:2340, forecast:null,  budget:2500 },
  { month:'Feb', actual:2821, forecast:null,  budget:3000 },
  { month:'Mar', actual:null, forecast:3120,  budget:3200 },
  { month:'Apr', actual:null, forecast:3380,  budget:3500 },
  { month:'May', actual:null, forecast:3650,  budget:3800 },
];

const BY_SERVICE = [
  { name:'EC2',            cost:1240, pct:26, color:'#6366f1', provider:'AWS'   },
  { name:'RDS',            cost:890,  pct:19, color:'#06b6d4', provider:'AWS'   },
  { name:'S3',             cost:340,  pct:7,  color:'#f59e0b', provider:'AWS'   },
  { name:'Lambda',         cost:180,  pct:4,  color:'#10b981', provider:'AWS'   },
  { name:'Virtual Machines',cost:520, pct:11, color:'#2563eb', provider:'Azure' },
  { name:'App Service',    cost:210,  pct:4,  color:'#0891b2', provider:'Azure' },
  { name:'SQL Database',   cost:180,  pct:4,  color:'#7c3aed', provider:'Azure' },
  { name:'CloudFront',     cost:290,  pct:6,  color:'#ec4899', provider:'AWS'   },
  { name:'Data Transfer',  cost:160,  pct:3,  color:'#f97316', provider:'AWS'   },
  { name:'Other',          cost:812,  pct:16, color:'#94a3b8', provider:'Mixed' },
];

const BY_TAG = [
  { tag:'Environment: Production', cost:2940, color:'#6366f1' },
  { tag:'Environment: Staging',    cost:880,  color:'#06b6d4' },
  { tag:'Environment: Dev',        cost:520,  color:'#10b981' },
  { tag:'Team: Platform',          cost:1200, color:'#f59e0b' },
  { tag:'Team: Data',              cost:780,  color:'#ec4899' },
  { tag:'Untagged',                cost:501,  color:'#94a3b8' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdvancedAnalytics() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [loading,      setLoading]      = useState(false);
  const [activeTab,    setActiveTab]    = useState<'overview'|'services'|'tags'|'forecast'|'comparison'>('overview');
  const [activePeriod, setActivePeriod] = useState<'3m'|'6m'|'12m'>('6m');
  const [multiCloud,   setMultiCloud]   = useState(MULTI_CLOUD);
  const [forecast,     setForecast]     = useState(FORECAST);
  const [byService,    setByService]    = useState(BY_SERVICE);
  const [byTag,        setByTag]        = useState(BY_TAG);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [mcRes, fcRes, svcRes] = await Promise.allSettled([
        fetch(`http://localhost:3000/api/analytics/multi-cloud?period=${activePeriod}`, { headers: hdrs }),
        fetch(`http://localhost:3000/api/analytics/forecast`,                           { headers: hdrs }),
        fetch(`http://localhost:3000/api/analytics/services?period=${activePeriod}`,    { headers: hdrs }),
      ]);
      if (mcRes.status  === 'fulfilled' && mcRes.value.ok)  setMultiCloud((await mcRes.value.json()).data  || MULTI_CLOUD);
      if (fcRes.status  === 'fulfilled' && fcRes.value.ok)  setForecast((await fcRes.value.json()).data    || FORECAST);
      if (svcRes.status === 'fulfilled' && svcRes.value.ok) setByService((await svcRes.value.json()).data  || BY_SERVICE);
    } catch { /* use mock */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalytics(); }, [activePeriod]);

  const totalSpend   = byService.reduce((s,x) => s + x.cost, 0);
  const awsSpend     = byService.filter(x=>x.provider==='AWS').reduce((s,x)=>s+x.cost,0);
  const azureSpend   = byService.filter(x=>x.provider==='Azure').reduce((s,x)=>s+x.cost,0);
  const lastMonth    = MULTI_CLOUD[MULTI_CLOUD.length-1];
  const prevMonth    = MULTI_CLOUD[MULTI_CLOUD.length-2];
  const changePct    = prevMonth ? ((lastMonth.AWS+lastMonth.Azure+lastMonth.GCP - (prevMonth.AWS+prevMonth.Azure+prevMonth.GCP)) / (prevMonth.AWS+prevMonth.Azure+prevMonth.GCP)) * 100 : 0;
  const forecastNext = forecast.find(f => f.forecast && !f.actual)?.forecast || 0;

  const TABS = [
    { id:'overview',    label:'Overview'      },
    { id:'services',    label:'By Service'    },
    { id:'tags',        label:'By Tag'        },
    { id:'forecast',    label:'Forecast'      },
    { id:'comparison',  label:'Multi-Cloud'   },
  ];

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Deep-dive cost analysis across all accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {(['3m','6m','12m'] as const).map(p => (
              <button key={p} onClick={() => setActivePeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePeriod === p ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>{p}</button>
            ))}
          </div>
          <button onClick={fetchAnalytics} className={`btn btn-secondary text-xs gap-1.5 ${loading?'opacity-50 pointer-events-none':''}`}>
            <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Spend (MTD)',  value: fmt(totalSpend), sub: `${changePct>=0?'▲':'▼'} ${Math.abs(changePct).toFixed(1)}% vs last month`, up: changePct>=0, icon: DollarSign, color:'#6366f1', bg:'#eef2ff' },
          { label:'AWS Spend',          value: fmt(awsSpend),   sub: `${((awsSpend/totalSpend)*100).toFixed(0)}% of total`,                         up: false,         icon: Cloud,      color:'#ea580c', bg:'#fff7ed' },
          { label:'Azure Spend',        value: fmt(azureSpend), sub: `${((azureSpend/totalSpend)*100).toFixed(0)}% of total`,                        up: false,         icon: Cloud,      color:'#2563eb', bg:'#eff6ff' },
          { label:'Forecast (Next Mo)', value: fmt(forecastNext),sub:'Projected spend',                                                              up: true,          icon: TrendingUp, color:'#d97706', bg:'#fffbeb' },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:s.bg}}>
                  <Icon size={16} style={{color:s.color}}/>
                </div>
                {i===0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${changePct>=0?'bg-red-50 text-red-600':'bg-emerald-50 text-emerald-600'}`}>
                    {changePct>=0?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{Math.abs(changePct).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-5 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Total Spend Over Time</h3>
            <p className="text-xs text-gray-400 mb-5">All providers combined</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={multiCloud.map(m=>({...m, total:m.AWS+m.Azure+(m.GCP||0)}))}>
                <defs>
                  <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                <Tooltip formatter={(v:any)=>[fmt(v),'Total']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#ag1)" dot={false} activeDot={{r:5,fill:'#6366f1'}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Budget vs Actual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Budget vs Actual</h3>
              <p className="text-xs text-gray-400 mb-5">Monthly comparison</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={FORECAST.filter(f=>f.actual)} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={48}/>
                  <Tooltip formatter={(v:any,n:any)=>[fmt(v), n==='actual'?'Actual':'Budget']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Legend wrapperStyle={{fontSize:11,color:'#6b7280'}}/>
                  <Bar dataKey="budget" fill="#e0e7ff" radius={[4,4,0,0]} name="Budget"/>
                  <Bar dataKey="actual" fill="#6366f1" radius={[4,4,0,0]} name="Actual"/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top services pie */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Cost by Service Type</h3>
              <p className="text-xs text-gray-400 mb-4">Current month</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={byService.slice(0,6)} cx="50%" cy="50%" innerRadius={38} outerRadius={65}
                      dataKey="cost" startAngle={90} endAngle={-270} paddingAngle={2} strokeWidth={0}>
                      {byService.slice(0,6).map((e,i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {byService.slice(0,6).map((s,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                      <span className="text-xs text-gray-600 flex-1 truncate">{s.name}</span>
                      <span className="text-xs font-bold text-gray-900">{fmtK(s.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BY SERVICE TAB ── */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Cost Breakdown by Service</h3>
            <p className="text-xs text-gray-400 mt-0.5">Current month · {fmt(totalSpend)} total</p>
          </div>
          <div className="divide-y divide-gray-50">
            {byService.map((s,i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{background:s.color}}>{s.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{s.pct}%</span>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right">{fmt(s.cost)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{width:`${s.pct}%`,background:s.color}}/>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{
                    background: s.provider==='AWS'?'#fff7ed':s.provider==='Azure'?'#eff6ff':'#ecfdf5',
                    color:      s.provider==='AWS'?'#ea580c':s.provider==='Azure'?'#2563eb':'#059669',
                  }}>{s.provider}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BY TAG TAB ── */}
      {activeTab === 'tags' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Cost by Tag</h3>
            <p className="text-xs text-gray-400 mb-5">Aggregated across all accounts</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byTag} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <YAxis type="category" dataKey="tag" tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} width={160}/>
                <Tooltip formatter={(v:any)=>[fmt(v),'Cost']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                <Bar dataKey="cost" radius={[0,6,6,0]}>
                  {byTag.map((e,i) => <Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <Tag size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold text-amber-800">$501 in untagged resources</p>
              <p className="text-xs text-amber-600 mt-0.5">Apply tags to improve cost allocation. Consider enforcing tagging via SCP or Azure Policy.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── FORECAST TAB ── */}
      {activeTab === 'forecast' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900">Spend Forecast</h3>
                <p className="text-xs text-gray-400 mt-0.5">Actual spend + 3-month projection vs budget</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-indigo-600 rounded inline-block"/>Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-cyan-400 rounded inline-block" style={{border:'1px dashed #06b6d4'}}/>Forecast</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-gray-300 rounded inline-block"/>Budget</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                <Tooltip formatter={(v:any,n:any)=>[v?fmt(v):'-', n]} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                <Line type="monotone" dataKey="budget"   stroke="#d1d5db" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Budget"/>
                <Line type="monotone" dataKey="actual"   stroke="#6366f1" strokeWidth={2.5} dot={{r:4,fill:'#6366f1',strokeWidth:0}} connectNulls={false} name="Actual"/>
                <Line type="monotone" dataKey="forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="6 3" dot={{r:4,fill:'#06b6d4',strokeWidth:0}} connectNulls={false} name="Forecast"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label:'Mar Forecast',  value: fmt(3120), sub:'vs $3,200 budget', ok:true  },
              { label:'Apr Forecast',  value: fmt(3380), sub:'vs $3,500 budget', ok:true  },
              { label:'May Forecast',  value: fmt(3650), sub:'vs $3,800 budget', ok:true  },
            ].map((s,i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className={`text-xs mt-1 font-medium ${s.ok?'text-emerald-600':'text-red-600'}`}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MULTI-CLOUD COMPARISON TAB ── */}
      {activeTab === 'comparison' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Multi-Cloud Spend Comparison</h3>
            <p className="text-xs text-gray-400 mb-5">AWS vs Azure vs GCP month-by-month</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={multiCloud} barCategoryGap="25%" barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                <Tooltip formatter={(v:any,n:any)=>[fmt(v),n]} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                <Legend wrapperStyle={{fontSize:11,color:'#6b7280'}}/>
                <Bar dataKey="AWS"   fill="#ea580c" radius={[3,3,0,0]} name="AWS"/>
                <Bar dataKey="Azure" fill="#2563eb" radius={[3,3,0,0]} name="Azure"/>
                <Bar dataKey="GCP"   fill="#059669" radius={[3,3,0,0]} name="GCP"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label:'AWS',   value: fmt(awsSpend),   pct: ((awsSpend/totalSpend)*100).toFixed(0),   color:'#ea580c', bg:'#fff7ed', emoji:'☁️'  },
              { label:'Azure', value: fmt(azureSpend),  pct: ((azureSpend/totalSpend)*100).toFixed(0), color:'#2563eb', bg:'#eff6ff', emoji:'🔷' },
              { label:'GCP',   value: fmt(21),          pct: ((21/totalSpend)*100).toFixed(1),          color:'#059669', bg:'#ecfdf5', emoji:'🌐' },
            ].map((s,i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{background:s.bg}}>{s.emoji}</div>
                  <div>
                    <p className="text-sm font-bold" style={{color:s.color}}>{s.label}</p>
                    <p className="text-xs text-gray-400">{s.pct}% of total</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full" style={{width:`${s.pct}%`,background:s.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
