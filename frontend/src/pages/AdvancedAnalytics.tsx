import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  BarChart3, TrendingUp, TrendingDown, RefreshCw,
  ArrowUpRight, ArrowDownRight, DollarSign, Cloud, Tag,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API  = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const fmt  = (n: number) => `$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);

// ── Fallback mock data (used only when API fails) ─────────────────────────────
const MOCK_MULTI: any[] = [];
const MOCK_FORECAST: any[] = [];
const MOCK_SERVICES: any[] = [];

export default function AdvancedAnalytics() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [loading,      setLoading]      = useState(false);
  const [activeTab,    setActiveTab]    = useState<'overview'|'services'|'tags'|'forecast'|'comparison'>('overview');
  const [activePeriod, setActivePeriod] = useState<'3m'|'6m'|'12m'>('6m');
  const [multiCloud,   setMultiCloud]   = useState<any[]>(MOCK_MULTI);
  const [forecast,     setForecast]     = useState<any[]>(MOCK_FORECAST);
  const [byService,    setByService]    = useState<any[]>(MOCK_SERVICES);
  const [error,        setError]        = useState<string|null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mcRes, fcRes, svcRes] = await Promise.allSettled([
        fetch(`${API}/api/analytics/multi-cloud?period=${activePeriod}`, { headers: hdrs }),
        fetch(`${API}/api/analytics/forecast`,                           { headers: hdrs }),
        fetch(`${API}/api/analytics/services?period=${activePeriod}`,    { headers: hdrs }),
      ]);

      if (mcRes.status  === 'fulfilled' && mcRes.value.ok)  {
        const d = await mcRes.value.json();
        if (d.data?.length) setMultiCloud(d.data);
      }
      if (fcRes.status  === 'fulfilled' && fcRes.value.ok)  {
        const d = await fcRes.value.json();
        if (d.data?.length) setForecast(d.data);
      }
      if (svcRes.status === 'fulfilled' && svcRes.value.ok) {
        const d = await svcRes.value.json();
        if (d.data?.length) setByService(d.data);
      }
    } catch (e: any) {
      setError('Could not load analytics data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, [activePeriod]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalSpend  = byService.reduce((s,x) => s + (x.cost||0), 0);
  const awsSpend    = byService.filter(x=>x.provider==='AWS').reduce((s,x)=>s+x.cost,0);
  const azureSpend  = byService.filter(x=>x.provider==='AZURE'||x.provider==='Azure').reduce((s,x)=>s+x.cost,0);
  const gcpSpend    = byService.filter(x=>x.provider==='GCP').reduce((s,x)=>s+x.cost,0);

  const lastMC   = multiCloud[multiCloud.length-1];
  const prevMC   = multiCloud[multiCloud.length-2];
  const lastTotal = lastMC  ? (lastMC.AWS||0)+(lastMC.Azure||0)+(lastMC.GCP||0) : 0;
  const prevTotal = prevMC  ? (prevMC.AWS||0)+(prevMC.Azure||0)+(prevMC.GCP||0) : 0;
  const changePct = prevTotal > 0 ? ((lastTotal - prevTotal) / prevTotal) * 100 : 0;

  const forecastNext = forecast.find(f => f.forecast && !f.actual)?.forecast || 0;

  // Budget vs actual for chart — only months with actual data
  const budgetVsActual = forecast.filter(f => f.actual);

  // By tag — derive from services if available, else empty
  const byTag = byService.length > 0 ? [
    { tag: 'AWS Services',   cost: awsSpend,   color: '#ea580c' },
    { tag: 'Azure Services', cost: azureSpend, color: '#2563eb' },
    { tag: 'GCP Services',   cost: gcpSpend,   color: '#059669' },
  ].filter(t => t.cost > 0) : [];

  const TABS = [
    { id:'overview',   label:'Overview'    },
    { id:'services',   label:'By Service'  },
    { id:'tags',       label:'By Provider' },
    { id:'forecast',   label:'Forecast'    },
    { id:'comparison', label:'Multi-Cloud' },
  ];

  const noData = !loading && multiCloud.length === 0 && byService.length === 0;

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Deep-dive cost analysis across all accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {(['3m','6m','12m'] as const).map(p => (
              <button key={p} onClick={() => setActivePeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePeriod===p ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>{p}</button>
            ))}
          </div>
          <button onClick={fetchAnalytics} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
          ⚠️ {error} — showing available data
        </div>
      )}

      {/* No data state */}
      {noData && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center mb-6">
          <BarChart3 size={32} className="text-blue-400 mx-auto mb-3"/>
          <p className="text-blue-700 font-semibold mb-1">No analytics data yet</p>
          <p className="text-blue-500 text-sm">Connect cloud accounts and allow cost data to accumulate for multi-cloud analytics.</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Spend (MTD)',   value: totalSpend  > 0 ? fmt(totalSpend)   : '—', sub: changePct!==0 ? `${changePct>=0?'▲':'▼'} ${Math.abs(changePct).toFixed(1)}% vs last month` : 'Aggregated spend', up: changePct>=0, icon: DollarSign, color:'#6366f1', bg:'#eef2ff', showBadge: changePct!==0 },
          { label:'AWS Spend',           value: awsSpend    > 0 ? fmt(awsSpend)     : '—', sub: totalSpend>0 ? `${((awsSpend/totalSpend)*100).toFixed(0)}% of total` : 'No data',          up: false, icon: Cloud,      color:'#ea580c', bg:'#fff7ed', showBadge: false },
          { label:'Azure Spend',         value: azureSpend  > 0 ? fmt(azureSpend)   : '—', sub: totalSpend>0 ? `${((azureSpend/totalSpend)*100).toFixed(0)}% of total` : 'No data',         up: false, icon: Cloud,      color:'#2563eb', bg:'#eff6ff', showBadge: false },
          { label:'Forecast (Next Mo)',  value: forecastNext > 0 ? fmt(forecastNext) : '—', sub: 'Projected spend',                                                                         up: true,  icon: TrendingUp, color:'#d97706', bg:'#fffbeb', showBadge: false },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:s.bg}}>
                  <Icon size={16} style={{color:s.color}}/>
                </div>
                {s.showBadge && (
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
              activeTab===t.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          {multiCloud.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Total Spend Over Time</h3>
              <p className="text-xs text-gray-400 mb-5">All providers combined</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={multiCloud.map(m=>({...m, total:(m.AWS||0)+(m.Azure||0)+(m.GCP||0)}))}>
                  <defs>
                    <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                  <Tooltip formatter={(v:any)=>[fmt(v),'Total']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#ag1)" dot={false} activeDot={{r:5}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {budgetVsActual.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">Budget vs Actual</h3>
                <p className="text-xs text-gray-400 mb-5">Monthly comparison</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={budgetVsActual} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={48}/>
                    <Tooltip formatter={(v:any,n:any)=>[fmt(v),n==='actual'?'Actual':'Budget']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                    <Legend wrapperStyle={{fontSize:11,color:'#6b7280'}}/>
                    <Bar dataKey="budget" fill="#e0e7ff" radius={[4,4,0,0]} name="Budget"/>
                    <Bar dataKey="actual" fill="#6366f1" radius={[4,4,0,0]} name="Actual"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {byService.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">Cost by Service</h3>
                <p className="text-xs text-gray-400 mb-4">Current month · top 6</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={byService.slice(0,6)} cx="50%" cy="50%" innerRadius={38} outerRadius={65}
                        dataKey="cost" startAngle={90} endAngle={-270} paddingAngle={2} strokeWidth={0}>
                        {byService.slice(0,6).map((e:any,i:number)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {byService.slice(0,6).map((s:any,i:number)=>(
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                        <span className="text-xs text-gray-600 flex-1 truncate">{s.name}</span>
                        <span className="text-xs font-bold text-gray-900">{fmtK(s.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BY SERVICE ── */}
      {activeTab==='services' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Cost Breakdown by Service</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fmt(totalSpend)} total · {byService.length} services</p>
          </div>
          {byService.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No service data available</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {byService.map((s:any,i:number)=>(
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
                      <div className="h-full rounded-full" style={{width:`${s.pct}%`,background:s.color}}/>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0"
                    style={{
                      background: s.provider==='AWS'?'#fff7ed':s.provider==='AZURE'||s.provider==='Azure'?'#eff6ff':'#ecfdf5',
                      color:      s.provider==='AWS'?'#ea580c':s.provider==='AZURE'||s.provider==='Azure'?'#2563eb':'#059669',
                    }}>{s.provider}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BY PROVIDER (Tags tab repurposed) ── */}
      {activeTab==='tags' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Spend by Cloud Provider</h3>
            <p className="text-xs text-gray-400 mb-5">Aggregated across all accounts</p>
            {byTag.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byTag} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                  <XAxis type="number" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                  <YAxis type="category" dataKey="tag" tick={{fill:'#6b7280',fontSize:12}} axisLine={false} tickLine={false} width={120}/>
                  <Tooltip formatter={(v:any)=>[fmt(v),'Spend']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Bar dataKey="cost" radius={[0,6,6,0]}>
                    {byTag.map((e:any,i:number)=><Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">No provider spend data available</div>
            )}
          </div>
        </div>
      )}

      {/* ── FORECAST ── */}
      {activeTab==='forecast' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900">Spend Forecast</h3>
                <p className="text-xs text-gray-400 mt-0.5">Actual spend + 3-month projection</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-indigo-600 rounded inline-block"/>Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-cyan-400 rounded inline-block"/>Forecast</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1 bg-gray-300 rounded inline-block"/>Budget</span>
              </div>
            </div>
            {forecast.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}/>
                  <Tooltip formatter={(v:any,n:any)=>[v?fmt(v):'-',n]} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Line type="monotone" dataKey="budget"   stroke="#d1d5db" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Budget"/>
                  <Line type="monotone" dataKey="actual"   stroke="#6366f1" strokeWidth={2.5} dot={{r:4,fill:'#6366f1',strokeWidth:0}} connectNulls={false} name="Actual"/>
                  <Line type="monotone" dataKey="forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="6 3" dot={{r:4,fill:'#06b6d4',strokeWidth:0}} connectNulls={false} name="Forecast"/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">No forecast data available yet — need at least 2 months of cost history</div>
            )}
          </div>

          {forecast.filter(f=>f.forecast).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {forecast.filter(f=>f.forecast).map((f:any,i:number)=>(
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{f.month} Forecast</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(f.forecast)}</p>
                  <p className="text-xs mt-1 font-medium text-emerald-600">vs {fmt(f.budget)} budget</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MULTI-CLOUD COMPARISON ── */}
      {activeTab==='comparison' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Multi-Cloud Spend Comparison</h3>
            <p className="text-xs text-gray-400 mb-5">AWS vs Azure vs GCP month-by-month</p>
            {multiCloud.length > 0 ? (
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
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">No multi-cloud data available</div>
            )}
          </div>

          {totalSpend > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label:'AWS',   value: awsSpend,   pct: totalSpend>0?((awsSpend/totalSpend)*100).toFixed(0):'0',   color:'#ea580c', bg:'#fff7ed', emoji:'☁️'  },
                { label:'Azure', value: azureSpend, pct: totalSpend>0?((azureSpend/totalSpend)*100).toFixed(0):'0', color:'#2563eb', bg:'#eff6ff', emoji:'🔷' },
                { label:'GCP',   value: gcpSpend,   pct: totalSpend>0?((gcpSpend/totalSpend)*100).toFixed(1):'0',   color:'#059669', bg:'#ecfdf5', emoji:'🌐' },
              ].map((s,i)=>(
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{background:s.bg}}>{s.emoji}</div>
                    <div>
                      <p className="text-sm font-bold" style={{color:s.color}}>{s.label}</p>
                      <p className="text-xs text-gray-400">{s.pct}% of total</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{s.value > 0 ? fmt(s.value) : '—'}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full" style={{width:`${s.pct}%`,background:s.color}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
