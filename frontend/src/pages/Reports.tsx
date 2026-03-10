// src/pages/Reports.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  FileText, Download, Mail, Calendar, Filter, RefreshCw,
  TrendingDown, Shield, ChevronRight, Clock, CheckCircle,
  AlertTriangle, MoreHorizontal, Plus, X, BarChart3,
  DollarSign, Cloud, Search,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const fmt = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Report {
  id: string;
  name: string;
  type: 'cost' | 'security' | 'compliance';
  period: string;
  status: 'ready' | 'generating' | 'scheduled';
  generatedAt?: string;
  scheduledFor?: string;
  size?: string;
  accounts: string[];
  totalCost?: number;
  findings?: number;
}

interface ScheduleForm {
  name: string;
  type: 'cost' | 'security' | 'compliance';
  frequency: 'daily' | 'weekly' | 'monthly';
  email: string;
  accounts: string;
  format: 'pdf' | 'csv';
}

// ── Mock data helpers ─────────────────────────────────────────────────────────
const MOCK_REPORTS: Report[] = [
  { id:'r1', name:'Monthly Cost Summary — Feb 2026',     type:'cost',       period:'Feb 2026',      status:'ready',     generatedAt:'2026-03-01 09:00', size:'2.4 MB', accounts:['AWS Prod','Azure Dev'], totalCost:4821.43 },
  { id:'r2', name:'Monthly Cost Summary — Jan 2026',     type:'cost',       period:'Jan 2026',      status:'ready',     generatedAt:'2026-02-01 09:00', size:'2.1 MB', accounts:['AWS Prod','Azure Dev'], totalCost:4102.87 },
  { id:'r3', name:'Q4 2025 Cost Report',                 type:'cost',       period:'Q4 2025',       status:'ready',     generatedAt:'2026-01-05 10:00', size:'5.8 MB', accounts:['All accounts'],         totalCost:12450.00 },
  { id:'r4', name:'Security Posture Report — Feb 2026',  type:'security',   period:'Feb 2026',      status:'ready',     generatedAt:'2026-03-01 09:30', size:'1.8 MB', accounts:['All accounts'],         findings:14074 },
  { id:'r5', name:'Compliance Assessment — Feb 2026',    type:'compliance', period:'Feb 2026',      status:'ready',     generatedAt:'2026-03-01 09:45', size:'3.2 MB', accounts:['All accounts'],         findings:24448 },
  { id:'r6', name:'Annual Cost Report 2025',             type:'cost',       period:'FY 2025',       status:'ready',     generatedAt:'2026-01-10 08:00', size:'12.4 MB',accounts:['All accounts'],         totalCost:54320.00 },
  { id:'r7', name:'Monthly Cost Summary — Mar 2026',     type:'cost',       period:'Mar 2026',      status:'scheduled', scheduledFor:'2026-04-01 09:00', accounts:['All accounts'] },
  { id:'r8', name:'Weekly Security Digest',              type:'security',   period:'Week 9, 2026',  status:'generating',accounts:['All accounts'] },
];

const MONTHLY_TREND = [
  { month:'Aug', cost:856 },{ month:'Sep',cost:1270 },{ month:'Oct',cost:2286 },
  { month:'Nov',cost:2835 },{ month:'Dec',cost:3582 },{ month:'Jan',cost:4102 },{ month:'Feb',cost:4821 },
];

const TYPE_BREAKDOWN = [
  { name:'Compute',  value:1820, color:'#6366f1' },
  { name:'Storage',  value:890,  color:'#06b6d4' },
  { name:'Network',  value:640,  color:'#f59e0b' },
  { name:'Database', value:980,  color:'#10b981' },
  { name:'Other',    value:491,  color:'#ec4899' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Reports() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [reports,       setReports]       = useState<Report[]>(MOCK_REPORTS);
  const [loading,       setLoading]       = useState(false);
  const [activeType,    setActiveType]    = useState<'all'|'cost'|'security'|'compliance'>('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [generating,    setGenerating]    = useState<string|null>(null);
  const [scheduleForm,  setScheduleForm]  = useState<ScheduleForm>({
    name:'', type:'cost', frequency:'monthly', email:'', accounts:'all', format:'pdf',
  });

  // Real API — fetch reports list
  const fetchReports = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/reports', { headers: hdrs });
      if (r.ok) {
        const data = await r.json();
        setReports(data.reports?.length ? data.reports : MOCK_REPORTS);
      }
    } catch { /* use mock */ }
    finally { setLoading(false); }
  };

  // Real API — generate report
  const handleGenerate = async (type: 'cost'|'security'|'compliance', period: string) => {
    const id = `gen-${Date.now()}`;
    setGenerating(id);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/reports/generate', {
        method: 'POST',
        headers: { ...hdrs, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period }),
      });
      if (r.ok) await fetchReports();
    } catch { /* silent */ }
    finally { setGenerating(null); }
  };

  // Real API — download report
  const handleDownload = async (report: Report, format: 'pdf'|'csv') => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/reports/${report.id}/download?format=${format}`, { headers: hdrs });
      if (r.ok) {
        const blob = await r.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${report.name}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* silent */ }
  };

  // Real API — schedule report
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/reports/schedule', {
        method: 'POST',
        headers: { ...hdrs, 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      });
      setShowSchedule(false);
      await fetchReports();
    } catch { /* silent */ }
  };

  useEffect(() => { fetchReports(); }, []);

  const filtered = reports.filter(r => {
    const matchType   = activeType === 'all' || r.type === activeType;
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const ready     = filtered.filter(r => r.status === 'ready');
  const scheduled = filtered.filter(r => r.status === 'scheduled' || r.status === 'generating');

  const typeStyle = (t: string) => {
    if (t === 'cost')       return { bg:'#eef2ff', color:'#4f46e5', dot:'#6366f1',  icon: DollarSign };
    if (t === 'security')   return { bg:'#fef2f2', color:'#dc2626', dot:'#ef4444',  icon: Shield     };
    return                         { bg:'#fefce8', color:'#ca8a04', dot:'#eab308',  icon: CheckCircle };
  };

  const statusBadge = (s: string) => {
    if (s === 'ready')      return { bg:'#ecfdf5', color:'#059669', label:'Ready'      };
    if (s === 'generating') return { bg:'#eff6ff', color:'#2563eb', label:'Generating' };
    return                         { bg:'#fafafa', color:'#6b7280', label:'Scheduled'  };
  };

  return (
    <MainLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate, schedule and export cloud reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchReports()}
            className={`btn btn-secondary text-xs gap-1.5 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
          <button onClick={() => setShowSchedule(true)}
            className="btn btn-primary text-sm gap-1.5 shadow-sm shadow-indigo-200">
            <Plus size={14}/> Schedule Report
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Reports',    value: reports.length,                              icon: FileText,   color:'#6366f1', bg:'#eef2ff' },
          { label:'Cost Reports',     value: reports.filter(r=>r.type==='cost').length,   icon: DollarSign, color:'#059669', bg:'#ecfdf5' },
          { label:'Security Reports', value: reports.filter(r=>r.type==='security').length,icon: Shield,   color:'#dc2626', bg:'#fef2f2' },
          { label:'Scheduled',        value: reports.filter(r=>r.status==='scheduled').length,icon: Clock, color:'#d97706', bg:'#fffbeb' },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon size={16} style={{ color: s.color }}/>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Monthly cost trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Monthly Cost Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 months across all accounts</p>
            </div>
            <button onClick={() => handleGenerate('cost', 'current-month')}
              disabled={!!generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
              {generating ? <RefreshCw size={11} className="animate-spin"/> : <Plus size={11}/>}
              Generate
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_TREND} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.12}/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} width={48}/>
              <Tooltip formatter={(v: any) => [fmt(v), 'Total Cost']} contentStyle={{ borderRadius:12, border:'1px solid #f3f4f6', fontSize:12 }}/>
              <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2.5} fill="url(#rg1)" dot={false} activeDot={{ r:4, fill:'#6366f1' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Service breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-1">Cost by Service</h3>
          <p className="text-xs text-gray-400 mb-5">Feb 2026 breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={TYPE_BREAKDOWN} layout="vertical" margin={{ top:0, right:0, bottom:0, left:0 }}>
              <XAxis type="number" tick={{ fill:'#9ca3af', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
              <YAxis type="category" dataKey="name" tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} width={60}/>
              <Tooltip formatter={(v: any) => [fmt(v), 'Cost']} contentStyle={{ borderRadius:12, border:'1px solid #f3f4f6', fontSize:12 }}/>
              <Bar dataKey="value" radius={[0,6,6,0]}>
                {TYPE_BREAKDOWN.map((e,i) => <Cell key={i} fill={e.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {(['all','cost','security','compliance'] as const).map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                activeType === t
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {t === 'all' ? 'All Reports' : t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search reports…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors"/>
        </div>
      </div>

      {/* Ready reports */}
      {ready.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Available Reports</h3>
            <span className="text-xs text-gray-400">{ready.length} reports</span>
          </div>
          <div className="divide-y divide-gray-50">
            {ready.map(report => {
              const ts = typeStyle(report.type);
              const sb = statusBadge(report.status);
              const Icon = ts.icon;
              return (
                <div key={report.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ts.bg }}>
                    <Icon size={16} style={{ color: ts.color }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{report.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">{report.period}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{report.accounts.join(', ')}</span>
                      {report.size && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{report.size}</span></>}
                      {report.totalCost !== undefined && (
                        <span className="text-xs font-semibold text-indigo-600">{fmt(report.totalCost)}</span>
                      )}
                      {report.findings !== undefined && (
                        <span className="text-xs font-semibold text-red-600">{report.findings.toLocaleString()} findings</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl"
                      style={{ background: sb.bg, color: sb.color }}>{sb.label}</span>
                    {report.generatedAt && (
                      <span className="text-xs text-gray-400 hidden lg:block">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownload(report, 'pdf')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition-colors">
                        <Download size={11}/> PDF
                      </button>
                      <button onClick={() => handleDownload(report, 'csv')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-colors">
                        <Download size={11}/> CSV
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled / generating */}
      {scheduled.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Scheduled & In Progress</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {scheduled.map(report => {
              const ts = typeStyle(report.type);
              const sb = statusBadge(report.status);
              const Icon = ts.icon;
              return (
                <div key={report.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ts.bg }}>
                    {report.status === 'generating'
                      ? <RefreshCw size={16} className="animate-spin" style={{ color: ts.color }}/>
                      : <Icon size={16} style={{ color: ts.color }}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{report.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{report.period}</span>
                      {report.scheduledFor && (
                        <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                          <Clock size={10}/> {report.scheduledFor}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl"
                    style={{ background: sb.bg, color: sb.color }}>{sb.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick generate buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-1">Generate New Report</h3>
        <p className="text-xs text-gray-400 mb-5">Instantly create a report for any time period</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label:'This Month Cost Report',     type:'cost'        as const, period:'current-month', icon: DollarSign, color:'#6366f1', bg:'#eef2ff' },
            { label:'Security Posture Report',    type:'security'   as const, period:'current-month', icon: Shield,     color:'#dc2626', bg:'#fef2f2' },
            { label:'Compliance Assessment',      type:'compliance' as const, period:'current-month', icon: CheckCircle,color:'#d97706', bg:'#fffbeb' },
          ].map((g,i) => {
            const Icon = g.icon;
            return (
              <button key={i} onClick={() => handleGenerate(g.type, g.period)}
                disabled={!!generating}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left group disabled:opacity-50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: g.bg }}>
                  <Icon size={18} style={{ color: g.color }}/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{g.label}</p>
                  <p className="text-xs text-gray-400">Current month</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Schedule Report Delivery</h2>
                <p className="text-xs text-gray-400 mt-0.5">Automatically generate and email reports</p>
              </div>
              <button onClick={() => setShowSchedule(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Report Name</label>
                <input type="text" required value={scheduleForm.name}
                  onChange={e => setScheduleForm({...scheduleForm, name: e.target.value})}
                  placeholder="e.g., Monthly AWS Cost Summary"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Report Type</label>
                  <select value={scheduleForm.type}
                    onChange={e => setScheduleForm({...scheduleForm, type: e.target.value as any})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors">
                    <option value="cost">Cost</option>
                    <option value="security">Security</option>
                    <option value="compliance">Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency</label>
                  <select value={scheduleForm.frequency}
                    onChange={e => setScheduleForm({...scheduleForm, frequency: e.target.value as any})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Format</label>
                  <select value={scheduleForm.format}
                    onChange={e => setScheduleForm({...scheduleForm, format: e.target.value as any})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors">
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accounts</label>
                  <select value={scheduleForm.accounts}
                    onChange={e => setScheduleForm({...scheduleForm, accounts: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors">
                    <option value="all">All Accounts</option>
                    <option value="aws">AWS Only</option>
                    <option value="azure">Azure Only</option>
                    <option value="gcp">GCP Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  <Mail size={11} className="inline mr-1"/> Delivery Email
                </label>
                <input type="email" required value={scheduleForm.email}
                  onChange={e => setScheduleForm({...scheduleForm, email: e.target.value})}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowSchedule(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white transition-colors">
                  Schedule Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
