// src/components/dashboard/OptimizationWidget.tsx
// Reusable optimization recommendations widget
// Usage:
//   <OptimizationWidget accountId={accountId} />         ← per-account (Overview page)
//   <OptimizationWidget accounts={allAccounts} />        ← multi-account (Dashboard)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown, Zap, CheckCircle, AlertCircle, XCircle,
  ChevronRight, ArrowRight, DollarSign, Filter,
  BarChart3, Clock, Shield, Server, Database,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────
interface Optimization {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  potentialSavings: number;
  currentCost: number;
  savingsPercent: number;
  resources?: string[];
  accountId?: string;
  accountName?: string;
  provider?: string;
}

interface OptimizationWidgetProps {
  /** Single account mode */
  accountId?: string;
  /** Multi-account mode — pass all connected accounts */
  accounts?: { id: string; accountName: string; provider: string }[];
  /** Compact mode for sidebar / right rail */
  compact?: boolean;
}

// ── Demo data generator (mirrors demoDataService pattern) ─────────────────
const generateOptimizations = (accountId: string, accountName?: string, provider?: string): Optimization[] => [
  {
    id: `${accountId}-1`, title: 'Right-size oversized EC2 instances', type: 'Compute',
    description: '12 instances running at <10% CPU utilization for 30+ days.',
    priority: 'High', effort: 'Low', potentialSavings: 1240, currentCost: 3100, savingsPercent: 40,
    resources: ['i-0a1b2c3d', 'i-1b2c3d4e', 'i-2c3d4e5f'],
    accountId, accountName, provider,
  },
  {
    id: `${accountId}-2`, title: 'Purchase Reserved Instances', type: 'Reservations',
    description: 'Convert 8 on-demand EC2 instances to 1-year Reserved Instances.',
    priority: 'High', effort: 'Low', potentialSavings: 980, currentCost: 1960, savingsPercent: 50,
    resources: ['m5.large', 't3.medium', 'r5.xlarge'],
    accountId, accountName, provider,
  },
  {
    id: `${accountId}-3`, title: 'Delete unused EBS volumes', type: 'Storage',
    description: '23 unattached EBS volumes totaling 2.3 TB.',
    priority: 'High', effort: 'Low', potentialSavings: 345, currentCost: 345, savingsPercent: 100,
    resources: ['vol-0a1b2c3d', 'vol-1b2c3d4e'],
    accountId, accountName, provider,
  },
  {
    id: `${accountId}-4`, title: 'Optimize S3 storage classes', type: 'Storage',
    description: 'Move infrequently-accessed objects to S3-IA or Glacier.',
    priority: 'Medium', effort: 'Low', potentialSavings: 210, currentCost: 480, savingsPercent: 44,
    resources: ['prod-user-data', 'backup-archive'],
    accountId, accountName, provider,
  },
  {
    id: `${accountId}-5`, title: 'Set CloudWatch Logs retention', type: 'Monitoring',
    description: '18 log groups with no retention policy set.',
    priority: 'Medium', effort: 'Low', potentialSavings: 89, currentCost: 210, savingsPercent: 42,
    accountId, accountName, provider,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtFull = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PRIORITY_STYLE: Record<string, string> = {
  High:   'text-red-600 bg-red-50 border-red-200',
  Medium: 'text-amber-600 bg-amber-50 border-amber-200',
  Low:    'text-emerald-600 bg-emerald-50 border-emerald-200',
};

const EFFORT_ICON: Record<string, React.FC<any>> = {
  Low:    CheckCircle,
  Medium: AlertCircle,
  High:   XCircle,
};

const EFFORT_COLOR: Record<string, string> = {
  Low:    'text-emerald-500',
  Medium: 'text-amber-500',
  High:   'text-red-500',
};

const TYPE_ICON: Record<string, React.FC<any>> = {
  Compute:      Server,
  Storage:      Database,
  Reservations: DollarSign,
  Monitoring:   BarChart3,
  Security:     Shield,
};

const CHART_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

// ── Sub-components ─────────────────────────────────────────────────────────
const SavingsBadge: React.FC<{ savings: number }> = ({ savings }) => (
  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
    <TrendingDown size={10} />
    {fmt(savings)}/mo
  </span>
);

const QuickWinRow: React.FC<{
  opt: Optimization;
  onApply: (id: string) => void;
  onDetail: (id: string) => void;
  showAccount?: boolean;
}> = ({ opt, onApply, onDetail, showAccount }) => {
  const EffortIcon = EFFORT_ICON[opt.effort];
  const TypeIcon   = TYPE_ICON[opt.type] || Server;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
      {/* Type icon */}
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <TypeIcon size={14} className="text-indigo-600" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{opt.title}</p>
            {showAccount && opt.accountName && (
              <p className="text-[10px] text-gray-400 mt-0.5">{opt.accountName}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{opt.description}</p>
          </div>
          <SavingsBadge savings={opt.potentialSavings} />
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Priority */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[opt.priority]}`}>
            {opt.priority}
          </span>
          {/* Effort */}
          <div className="flex items-center gap-1">
            <EffortIcon size={11} className={EFFORT_COLOR[opt.effort]} />
            <span className="text-[10px] text-gray-400">{opt.effort} effort</span>
          </div>
          {/* Type */}
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{opt.type}</span>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onApply(opt.id)}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors">
              Apply
            </button>
            <button
              onClick={() => onDetail(opt.id)}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors">
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Widget ────────────────────────────────────────────────────────────
const OptimizationWidget: React.FC<OptimizationWidgetProps> = ({
  accountId,
  accounts = [],
  compact = false,
}) => {
  const navigate = useNavigate();
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [activeFilter, setActiveFilter]   = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [appliedIds,   setAppliedIds]     = useState<string[]>([]);
  const [showCharts,   setShowCharts]     = useState(!compact);

  // Load data
  useEffect(() => {
    if (accountId) {
      // Single-account mode
      setOptimizations(generateOptimizations(accountId));
    } else if (accounts.length > 0) {
      // Multi-account mode — aggregate all
      const all = accounts.flatMap(acc =>
        generateOptimizations(acc.id, acc.accountName, acc.provider)
      );
      setOptimizations(all);
    }
  }, [accountId, accounts]);

  // Derived
  const available = optimizations.filter(o => !appliedIds.includes(o.id));
  const filtered  = activeFilter === 'All' ? available : available.filter(o => o.priority === activeFilter);
  const quickWins = available.filter(o => o.effort === 'Low' && o.priority === 'High');
  const totalSavings  = available.reduce((s, o) => s + o.potentialSavings, 0);
  const appliedSavings = appliedIds.reduce((s, id) => {
    const o = optimizations.find(x => x.id === id);
    return s + (o?.potentialSavings || 0);
  }, 0);

  // Chart data
  const byPriority = [
    { name: 'High',   savings: available.filter(o => o.priority === 'High').reduce((s,o) => s+o.potentialSavings,0),   count: available.filter(o => o.priority === 'High').length },
    { name: 'Medium', savings: available.filter(o => o.priority === 'Medium').reduce((s,o) => s+o.potentialSavings,0), count: available.filter(o => o.priority === 'Medium').length },
    { name: 'Low',    savings: available.filter(o => o.priority === 'Low').reduce((s,o) => s+o.potentialSavings,0),     count: available.filter(o => o.priority === 'Low').length },
  ];

  const byType: Record<string, number> = {};
  available.forEach(o => { byType[o.type] = (byType[o.type] || 0) + o.potentialSavings; });
  const typeData = Object.entries(byType).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,savings]) => ({ name, savings }));

  const PIE_COLORS_TYPE = ['#6366f1','#06b6d4','#f59e0b','#10b981','#ec4899'];

  // Handlers
  const handleApply = (id: string) => {
    setAppliedIds(prev => [...prev, id]);
  };

  const handleDetail = (id: string) => {
    if (accountId) {
      navigate(`/account/${accountId}/optimization`);
    } else {
      const opt = optimizations.find(o => o.id === id);
      if (opt?.accountId) navigate(`/account/${opt.accountId}/optimization`);
    }
  };

  const handleViewAll = () => {
    if (accountId) {
      navigate(`/account/${accountId}/optimization`);
    } else if (accounts.length === 1) {
      navigate(`/account/${accounts[0].id}/optimization`);
    } else {
      navigate('/optimization');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-0">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
              <TrendingDown size={12} className="text-white" />
            </div>
            Cost Optimization
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {available.length} recommendations · {fmt(totalSavings)}/mo potential savings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!compact && (
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                showCharts ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
              }`}
              title="Toggle charts">
              <BarChart3 size={14} />
            </button>
          )}
          <button
            onClick={handleViewAll}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="px-5 pt-4 grid grid-cols-3 gap-2">
        {/* Potential savings */}
        <div className="col-span-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Monthly Potential</p>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{fmtFull(totalSavings)}</p>
          {appliedSavings > 0 && (
            <p className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
              <CheckCircle size={9} />
              {fmtFull(appliedSavings)} already applied
            </p>
          )}
        </div>
        {/* Quick wins */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Quick Wins</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Zap size={16} className="text-amber-500" />
            <p className="text-xl font-bold text-amber-700">{quickWins.length}</p>
          </div>
          <p className="text-[10px] text-amber-500">Low effort · High priority</p>
        </div>
      </div>

      {/* ── Charts (collapsible) ── */}
      {showCharts && !compact && (
        <div className="px-5 pt-4 grid grid-cols-2 gap-3">
          {/* Savings by priority bar chart */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">By Priority</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={byPriority} margin={{ top:0, right:0, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="name" stroke="#d1d5db" tick={{ fill:'#9ca3af', fontSize:9 }} axisLine={false} tickLine={false}/>
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor:'#fff', border:'1px solid #f3f4f6', borderRadius:8, fontSize:11 }}
                  formatter={(v: any) => [fmt(v), 'Savings']}
                />
                <Bar dataKey="savings" radius={[4,4,0,0]}>
                  {byPriority.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Savings by type pie */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">By Type</p>
            <div className="flex items-center gap-2">
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="savings" strokeWidth={0}>
                    {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS_TYPE[i]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1 min-w-0">
                {typeData.slice(0,3).map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS_TYPE[i] }}/>
                    <span className="text-[10px] text-gray-500 truncate flex-1">{t.name}</span>
                    <span className="text-[10px] font-bold text-gray-700">{fmt(t.savings)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Pills ── */}
      <div className="px-5 pt-4 flex items-center gap-1.5">
        <Filter size={11} className="text-gray-300" />
        {(['All', 'High', 'Medium', 'Low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
              activeFilter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {f}
            {f !== 'All' && (
              <span className="ml-1 opacity-70">
                ({available.filter(o => o.priority === f).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-300">{filtered.length} shown</span>
      </div>

      {/* ── Quick Wins List ── */}
      <div className="px-2 pt-2 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle size={28} className="text-emerald-300" />
            <p className="text-sm text-gray-400 font-medium">
              {appliedIds.length > 0 ? 'All recommendations applied!' : 'No recommendations found'}
            </p>
            {appliedIds.length > 0 && (
              <p className="text-xs text-emerald-500">{fmtFull(appliedSavings)} saved per month</p>
            )}
          </div>
        ) : (
          <>
            {/* Top 5 quick wins */}
            {filtered
              .sort((a, b) => {
                // Sort: High priority first, then by savings
                const priorityOrder = { High: 0, Medium: 1, Low: 2 };
                const effortOrder = { Low: 0, Medium: 1, High: 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority])
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                if (effortOrder[a.effort] !== effortOrder[b.effort])
                  return effortOrder[a.effort] - effortOrder[b.effort];
                return b.potentialSavings - a.potentialSavings;
              })
              .slice(0, compact ? 3 : 5)
              .map(opt => (
                <QuickWinRow
                  key={opt.id}
                  opt={opt}
                  onApply={handleApply}
                  onDetail={handleDetail}
                  showAccount={!accountId && accounts.length > 1}
                />
              ))
            }
          </>
        )}
      </div>

      {/* ── Footer CTA ── */}
      <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between">
        <p className="text-[10px] text-gray-400">
          {appliedIds.length > 0 && (
            <span className="text-emerald-500 font-semibold mr-2">
              ✓ {appliedIds.length} applied
            </span>
          )}
          {available.length - (compact ? 3 : 5) > 0 && `+${available.length - (compact ? 3 : 5)} more`}
        </p>
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
          View all recommendations
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default OptimizationWidget;
