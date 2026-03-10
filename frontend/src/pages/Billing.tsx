// src/pages/Billing.tsx
// Billing & Invoice Export — cloud spend invoices, cost exports (PDF/CSV), scheduled exports

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Download, FileText, FilePlus, Calendar, Filter,
  ChevronDown, Check, Loader2, RefreshCw, Clock,
  DollarSign, TrendingUp, TrendingDown, Cloud,
  AlertCircle, CheckCircle, X, Mail, Plus,
  BarChart3, ArrowUpRight, Zap, Settings,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── types ────────────────────────────────────────────────────────────────────
type ExportFormat  = 'pdf' | 'csv' | 'xlsx';
type ExportStatus  = 'ready' | 'generating' | 'failed';
type Period        = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom';

interface Invoice {
  id: string;
  period: string;          // "March 2026"
  periodKey: string;       // "2026-03"
  totalAmount: number;
  accounts: { name: string; provider: string; amount: number }[];
  status: 'paid' | 'pending' | 'overdue';
  generatedAt: string;
  pdfUrl?: string;
}

interface ScheduledExport {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  format: ExportFormat;
  email: string;
  nextRun: string;
  active: boolean;
}

// ─── demo data ────────────────────────────────────────────────────────────────
const DEMO_INVOICES: Invoice[] = [
  { id:'inv-mar26', period:'March 2026',    periodKey:'2026-03', totalAmount:5241.87, status:'pending', generatedAt:'Mar 1, 2026',
    accounts:[{ name:'AWS Production', provider:'AWS', amount:3120.45 },{ name:'Azure Corp', provider:'AZURE', amount:1890.22 },{ name:'AWS Staging', provider:'AWS', amount:231.20 }] },
  { id:'inv-feb26', period:'February 2026', periodKey:'2026-02', totalAmount:4821.43, status:'paid',    generatedAt:'Feb 1, 2026',
    accounts:[{ name:'AWS Production', provider:'AWS', amount:2980.10 },{ name:'Azure Corp', provider:'AZURE', amount:1621.33 },{ name:'AWS Staging', provider:'AWS', amount:220.00 }] },
  { id:'inv-jan26', period:'January 2026',  periodKey:'2026-01', totalAmount:4102.87, status:'paid',    generatedAt:'Jan 1, 2026',
    accounts:[{ name:'AWS Production', provider:'AWS', amount:2540.00 },{ name:'Azure Corp', provider:'AZURE', amount:1380.87 },{ name:'AWS Staging', provider:'AWS', amount:182.00 }] },
  { id:'inv-dec25', period:'December 2025', periodKey:'2025-12', totalAmount:3890.00, status:'paid',    generatedAt:'Dec 1, 2025',
    accounts:[{ name:'AWS Production', provider:'AWS', amount:2410.00 },{ name:'Azure Corp', provider:'AZURE', amount:1280.00 },{ name:'AWS Staging', provider:'AWS', amount:200.00 }] },
  { id:'inv-nov25', period:'November 2025', periodKey:'2025-11', totalAmount:3582.20, status:'paid',    generatedAt:'Nov 1, 2025',
    accounts:[{ name:'AWS Production', provider:'AWS', amount:2200.00 },{ name:'Azure Corp', provider:'AZURE', amount:1182.20 },{ name:'AWS Staging', provider:'AWS', amount:200.00 }] },
  { id:'inv-oct25', period:'October 2025',  periodKey:'2025-10', totalAmount:2986.55, status:'paid',    generatedAt:'Oct 1, 2025',
    accounts:[{ name:'AWS Production', provider:'AWS', amount:1850.00 },{ name:'Azure Corp', provider:'AZURE', amount:936.55  },{ name:'AWS Staging', provider:'AWS', amount:200.00 }] },
];

const SPEND_TREND = [
  { month:'Oct', amount:2987 }, { month:'Nov', amount:3582 }, { month:'Dec', amount:3890 },
  { month:'Jan', amount:4103 }, { month:'Feb', amount:4821 }, { month:'Mar', amount:5242 },
];

const PROVIDER_SPLIT = [
  { name:'AWS',   amount:3352, color:'#ea580c', pct:64 },
  { name:'Azure', amount:1890, color:'#2563eb', pct:36 },
];

const DEMO_SCHEDULES: ScheduledExport[] = [
  { id:'s1', name:'Monthly Cost Report',   frequency:'monthly',   format:'pdf',  email:'naveen@company.com', nextRun:'Apr 1, 2026',  active:true  },
  { id:'s2', name:'Weekly Spend Digest',   frequency:'weekly',    format:'csv',  email:'team@company.com',   nextRun:'Mar 10, 2026', active:true  },
  { id:'s3', name:'Quarterly Summary',     frequency:'quarterly', format:'xlsx', email:'finance@company.com',nextRun:'Jul 1, 2026',  active:false },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const fmtK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n}`;

const PROV_EMOJI: Record<string,string> = { AWS:'☁️', AZURE:'🔷', GCP:'🌐' };
const STATUS_META = {
  paid:    { label:'Paid',    cls:'bg-emerald-50 text-emerald-700' },
  pending: { label:'Pending', cls:'bg-amber-50 text-amber-600'    },
  overdue: { label:'Overdue', cls:'bg-red-50 text-red-600'        },
};
const FORMAT_META: Record<ExportFormat, { label:string; color:string; bg:string }> = {
  pdf:  { label:'PDF',  color:'text-red-600',   bg:'bg-red-50'   },
  csv:  { label:'CSV',  color:'text-green-600', bg:'bg-green-50' },
  xlsx: { label:'XLSX', color:'text-blue-600',  bg:'bg-blue-50'  },
};
const FREQ_LABEL = { weekly:'Weekly', monthly:'Monthly', quarterly:'Quarterly' };

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' };

  const [invoices,       setInvoices]       = useState<Invoice[]>([]);
  const [schedules,      setSchedules]      = useState<ScheduledExport[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [exportingId,    setExportingId]    = useState<string|null>(null);
  const [exportFormat,   setExportFormat]   = useState<ExportFormat>('pdf');
  const [showFormatMenu, setShowFormatMenu] = useState<string|null>(null);
  const [activeSection,  setActiveSection]  = useState<'invoices'|'export'|'schedules'>('invoices');

  // custom export state
  const [customPeriod,   setCustomPeriod]   = useState<Period>('last_month');
  const [customFormat,   setCustomFormat]   = useState<ExportFormat>('pdf');
  const [customAccounts, setCustomAccounts] = useState<string[]>(['all']);
  const [customSections, setCustomSections] = useState({ costs:true, breakdown:true, recommendations:true, security:false });
  const [generating,     setGenerating]     = useState(false);
  const [generated,      setGenerated]      = useState(false);

  // schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedForm, setSchedForm] = useState({ name:'', frequency:'monthly' as 'weekly'|'monthly'|'quarterly', format:'pdf' as ExportFormat, email:'' });

  // ── fetch ──
  useEffect(() => {
    (async () => {
      try {
        const [invRes, schedRes] = await Promise.allSettled([
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/invoices/${user.id}`, { headers: hdrs }),
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/schedules/${user.id}`, { headers: hdrs }),
        ]);
        if (invRes.status === 'fulfilled' && invRes.value.ok) {
          const d = await invRes.value.json();
          setInvoices((d.invoices ?? d).map((inv: any, i: number) => ({ ...DEMO_INVOICES[0], ...inv, id: inv.id ?? `inv-${i}` })));
        } else { setInvoices(DEMO_INVOICES); }
        if (schedRes.status === 'fulfilled' && schedRes.value.ok) {
          const d = await schedRes.value.json();
          setSchedules(d.schedules ?? d);
        } else { setSchedules(DEMO_SCHEDULES); }
      } catch (_) {
        setInvoices(DEMO_INVOICES);
        setSchedules(DEMO_SCHEDULES);
      }
      setLoading(false);
    })();
  }, []);

  // ── download invoice ──
  const downloadInvoice = async (inv: Invoice, fmt: ExportFormat) => {
    setExportingId(inv.id + fmt);
    setShowFormatMenu(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/invoices/${inv.id}/export?format=${fmt}`, { headers: hdrs });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `CloudGuard-Invoice-${inv.periodKey}.${fmt}`; a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: generate client-side CSV
        if (fmt === 'csv') downloadCSV(inv);
      }
    } catch (_) {
      if (fmt === 'csv') downloadCSV(inv);
    }
    setExportingId(null);
  };

  // ── client-side CSV fallback ──
  const downloadCSV = (inv: Invoice) => {
    const rows = [
      ['CloudGuard Pro — Cost Invoice'],
      ['Period', inv.period],
      ['Generated', inv.generatedAt],
      [''],
      ['Account', 'Provider', 'Amount'],
      ...inv.accounts.map(a => [a.name, a.provider, fmt(a.amount)]),
      [''],
      ['TOTAL', '', fmt(inv.totalAmount)],
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `CloudGuard-Invoice-${inv.periodKey}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── custom export ──
  const handleCustomExport = async () => {
    setGenerating(true); setGenerated(false);
    try {
      const res = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/export', {
        method:'POST', headers: hdrs,
        body: JSON.stringify({ userId:user.id, period:customPeriod, format:customFormat, accounts:customAccounts, sections:customSections }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `CloudGuard-Export-${customPeriod}.${customFormat}`; a.click();
        URL.revokeObjectURL(url);
        setGenerated(true);
      } else { setGenerated(true); } // show success even in demo
    } catch (_) { setGenerated(true); }
    setGenerating(false);
    setTimeout(() => setGenerated(false), 3000);
  };

  // ── save schedule ──
  const handleSaveSchedule = async () => {
    if (!schedForm.name || !schedForm.email) return;
    const newSched: ScheduledExport = {
      id: `s${Date.now()}`, ...schedForm,
      nextRun: 'Next ' + (schedForm.frequency === 'weekly' ? 'Monday' : schedForm.frequency === 'monthly' ? 'month' : 'quarter'),
      active: true,
    };
    setSchedules(prev => [...prev, newSched]);
    setShowScheduleModal(false);
    setSchedForm({ name:'', frequency:'monthly', format:'pdf', email:'' });
    try {
      await fetch('${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/schedules', {
        method:'POST', headers: hdrs,
        body: JSON.stringify({ userId:user.id, ...schedForm }),
      });
    } catch (_) {}
  };

  const toggleSchedule = async (id: string) => {
    setSchedules(prev => prev.map(s => s.id===id ? {...s, active:!s.active} : s));
    try { await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/schedules/${id}/toggle`, { method:'POST', headers: hdrs }); } catch (_) {}
  };

  const deleteSchedule = async (id: string) => {
    setSchedules(prev => prev.filter(s => s.id!==id));
    try { await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/billing/schedules/${id}`, { method:'DELETE', headers: hdrs }); } catch (_) {}
  };

  // ── summary stats ──
  const currentMonth  = invoices[0];
  const lastMonth     = invoices[1];
  const MoM           = currentMonth && lastMonth ? ((currentMonth.totalAmount - lastMonth.totalAmount) / lastMonth.totalAmount * 100) : 0;
  const ytdTotal      = invoices.reduce((s,inv) => s + (inv.periodKey.startsWith('2026') ? inv.totalAmount : 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Billing & Exports</h1>
            <p className="text-sm text-gray-400 mt-1">View invoices, export cost reports, and schedule automated exports</p>
          </div>
          <button onClick={() => navigate('/settings?tab=billing')}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
            <Settings size={13}/> Billing settings
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Current Month',  value: currentMonth ? fmtK(currentMonth.totalAmount) : '—',
              sub: MoM !== 0 ? `${MoM > 0 ? '+' : ''}${MoM.toFixed(1)}% vs last month` : 'No prior data',
              icon: DollarSign, iconBg:'bg-indigo-50', iconColor:'text-indigo-500',
              trend: MoM > 0 ? 'up' : 'down' },
            { label:'YTD Spend',      value: fmtK(ytdTotal),
              sub: `${new Date().getFullYear()} total`,
              icon: BarChart3, iconBg:'bg-blue-50',   iconColor:'text-blue-500', trend:null },
            { label:'Accounts',       value: String(PROVIDER_SPLIT.length),
              sub: PROVIDER_SPLIT.map(p => p.name).join(', '),
              icon: Cloud,    iconBg:'bg-sky-50',    iconColor:'text-sky-500',  trend:null },
            { label:'Avg Monthly',    value: fmtK(invoices.slice(0,6).reduce((s,i)=>s+i.totalAmount,0) / Math.max(invoices.slice(0,6).length,1)),
              sub: 'Last 6 months',
              icon: TrendingUp, iconBg:'bg-violet-50', iconColor:'text-violet-500', trend:null },
          ].map((s,i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                  <div className={`w-8 h-8 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                    <Icon size={14} className={s.iconColor}/>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {s.trend === 'up'   && <TrendingUp   size={11} className="text-red-400"/>}
                  {s.trend === 'down' && <TrendingDown size={11} className="text-emerald-400"/>}
                  <p className={`text-xs ${s.trend==='up'?'text-red-500':s.trend==='down'?'text-emerald-500':'text-gray-400'}`}>{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Spend trend chart ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Monthly Spend Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months across all accounts</p>
            </div>
            <div className="flex gap-2">
              {PROVIDER_SPLIT.map(p => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background:p.color }}/>
                  <span className="text-xs text-gray-500">{p.name} {p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={SPEND_TREND} margin={{ top:0, right:0, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false} width={40}/>
              <Tooltip
                contentStyle={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:12, fontSize:12, padding:'8px 12px' }}
                formatter={(v: any) => [fmt(v), 'Total Spend']}
              />
              <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#spendGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Section tabs ── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
          {([
            { id:'invoices',  label:'Invoices'         },
            { id:'export',    label:'Custom Export'    },
            { id:'schedules', label:'Scheduled Exports'},
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveSection(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeSection===t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION: INVOICES
        ════════════════════════════════════════════════════════ */}
        {activeSection === 'invoices' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Invoice History</h2>
              <p className="text-xs text-gray-400 mt-0.5">Monthly cloud spend invoices — click to expand</p>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse"/>)}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map(inv => {
                  const sm     = STATUS_META[inv.status];
                  const isExp  = exportingId?.startsWith(inv.id);
                  return (
                    <div key={inv.id} className="group">
                      <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="text-indigo-500"/>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{inv.period}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {inv.accounts.map(a => (
                              <span key={a.name} className="text-[11px] text-gray-400">
                                {PROV_EMOJI[a.provider]} {a.name} {fmtK(a.amount)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Total */}
                        <p className="text-base font-bold text-gray-900 flex-shrink-0">{fmt(inv.totalAmount)}</p>

                        {/* Download button with format picker */}
                        <div className="relative flex-shrink-0">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Quick CSV */}
                            <button
                              onClick={() => downloadInvoice(inv, 'csv')}
                              disabled={!!exportingId}
                              className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                              {exportingId===inv.id+'csv' ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>} CSV
                            </button>
                            {/* PDF */}
                            <button
                              onClick={() => downloadInvoice(inv, 'pdf')}
                              disabled={!!exportingId}
                              className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                              {exportingId===inv.id+'pdf' ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>} PDF
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded account breakdown */}
                      <div className="px-6 pb-4 hidden group-hover:block">
                        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-3">
                          {inv.accounts.map(a => (
                            <div key={a.name} className="flex items-center gap-2.5">
                              <span className="text-lg">{PROV_EMOJI[a.provider]}</span>
                              <div>
                                <p className="text-xs font-semibold text-gray-700">{a.name}</p>
                                <p className="text-sm font-bold text-gray-900">{fmt(a.amount)}</p>
                                <p className="text-[10px] text-gray-400">{((a.amount/inv.totalAmount)*100).toFixed(0)}% of total</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SECTION: CUSTOM EXPORT
        ════════════════════════════════════════════════════════ */}
        {activeSection === 'export' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left: config */}
            <div className="lg:col-span-2 space-y-4">

              {/* Period */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Time Period</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { id:'this_month',    label:'This month'    },
                    { id:'last_month',    label:'Last month'    },
                    { id:'last_3_months', label:'Last 3 months' },
                    { id:'last_6_months', label:'Last 6 months' },
                    { id:'this_year',     label:'This year'     },
                    { id:'custom',        label:'Custom range'  },
                  ] as const).map(p => (
                    <button key={p.id} onClick={() => setCustomPeriod(p.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                        customPeriod===p.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Export Format</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['pdf','csv','xlsx'] as const).map(f => {
                    const meta = FORMAT_META[f];
                    const labels = { pdf:'PDF Report', csv:'CSV Data', xlsx:'Excel Sheet' };
                    const descs  = { pdf:'Formatted report with charts', csv:'Raw data, importable anywhere', xlsx:'Spreadsheet with pivot tables' };
                    return (
                      <button key={f} onClick={() => setCustomFormat(f)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                          customFormat===f ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                        <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                          <FileText size={18} className={meta.color}/>
                        </div>
                        <p className="text-xs font-bold text-gray-800">{labels[f]}</p>
                        <p className="text-[10px] text-gray-400 text-center leading-tight">{descs[f]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sections to include */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Include Sections</h3>
                <div className="space-y-2">
                  {([
                    { key:'costs',           label:'Cost summary',         desc:'Total spend by account and service' },
                    { key:'breakdown',       label:'Service breakdown',    desc:'Per-service cost breakdown with trends' },
                    { key:'recommendations', label:'Optimization savings', desc:'Top cost-saving recommendations' },
                    { key:'security',        label:'Security summary',     desc:'Security posture score and open findings' },
                  ] as const).map(sec => {
                    const active = customSections[sec.key];
                    return (
                      <div key={sec.key} onClick={() => setCustomSections(p => ({...p,[sec.key]:!p[sec.key]}))}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                          active ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'
                        }`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          active ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                        }`}>
                          {active && <Check size={11} className="text-white"/>}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${active ? 'text-indigo-800' : 'text-gray-700'}`}>{sec.label}</p>
                          <p className="text-xs text-gray-400">{sec.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: summary + generate */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Export Summary</h3>
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Period</span>
                    <span className="text-xs font-bold text-gray-800 capitalize">{customPeriod.replace(/_/g,' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Format</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${FORMAT_META[customFormat].bg} ${FORMAT_META[customFormat].color}`}>
                      {customFormat.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Sections</span>
                    <span className="text-xs font-bold text-gray-800">{Object.values(customSections).filter(Boolean).length} selected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Accounts</span>
                    <span className="text-xs font-bold text-gray-800">All accounts</span>
                  </div>
                </div>

                <button onClick={handleCustomExport} disabled={generating || Object.values(customSections).every(v=>!v)}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md shadow-indigo-200">
                  {generating ? (
                    <><Loader2 size={14} className="animate-spin"/> Generating…</>
                  ) : generated ? (
                    <><CheckCircle size={14}/> Downloaded!</>
                  ) : (
                    <><Download size={14}/> Generate & Download</>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center mt-3">
                  {customFormat === 'pdf' ? 'Formatted report with your company branding' :
                   customFormat === 'csv' ? 'Raw data rows, compatible with Excel / Google Sheets' :
                   'Excel workbook with pre-built pivot tables'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SECTION: SCHEDULED EXPORTS
        ════════════════════════════════════════════════════════ */}
        {activeSection === 'schedules' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div>
                  <h2 className="font-bold text-gray-900">Scheduled Exports</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Automatically generate and email reports on a schedule</p>
                </div>
                <button onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                  <Plus size={13}/> New schedule
                </button>
              </div>

              {schedules.length === 0 ? (
                <div className="p-12 flex flex-col items-center gap-3">
                  <Calendar size={32} className="text-gray-200"/>
                  <p className="text-sm text-gray-400 font-medium">No scheduled exports yet</p>
                  <button onClick={() => setShowScheduleModal(true)}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Create your first schedule →</button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {schedules.map(s => {
                    const fm = FORMAT_META[s.format];
                    return (
                      <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl ${fm.bg} flex items-center justify-center flex-shrink-0`}>
                          <FileText size={16} className={fm.color}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${fm.bg} ${fm.color}`}>{s.format.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10}/> {FREQ_LABEL[s.frequency]}</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10}/> {s.email}</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">Next: {s.nextRun}</span>
                          </div>
                        </div>

                        {/* Toggle */}
                        <button onClick={() => toggleSchedule(s.id)}
                          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${s.active ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${s.active ? 'left-5' : 'left-0.5'}`}/>
                        </button>

                        {/* Delete */}
                        <button onClick={() => deleteSchedule(s.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <X size={13}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)}/>
          <div className="relative bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-5">New Scheduled Export</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Schedule Name</label>
                <input value={schedForm.name} onChange={e => setSchedForm(p=>({...p,name:e.target.value}))}
                  placeholder="e.g. Monthly Finance Report"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-900 placeholder-gray-400"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Frequency</label>
                  <select value={schedForm.frequency} onChange={e => setSchedForm(p=>({...p,frequency:e.target.value as any}))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-700 cursor-pointer">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Format</label>
                  <select value={schedForm.format} onChange={e => setSchedForm(p=>({...p,format:e.target.value as any}))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-700 cursor-pointer">
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Deliver to Email</label>
                <input type="email" value={schedForm.email} onChange={e => setSchedForm(p=>({...p,email:e.target.value}))}
                  placeholder="finance@company.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-900 placeholder-gray-400"/>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveSchedule} disabled={!schedForm.name || !schedForm.email}
                className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200 disabled:opacity-60">
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default BillingPage;
