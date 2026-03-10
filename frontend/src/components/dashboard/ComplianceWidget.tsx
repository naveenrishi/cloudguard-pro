// src/components/dashboard/ComplianceWidget.tsx — UI REDESIGN ONLY
// ✅ All data values 100% preserved — only layout/styling changed
import React from 'react';
import { CheckSquare, AlertCircle, MoreHorizontal } from 'lucide-react';

const ComplianceWidget: React.FC = () => {
  // ── DATA 100% UNCHANGED ──────────────────────────────────────────────────
  const standards = [
    { name: 'CloudWatch Log Group Encrypted', count: 3325, color: '#8b5cf6', bg: '#f5f3ff', border: '#e9d5ff' },
    { name: 'S3 Bucket SSL Enabled',          count: 2298, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { name: 'S3 Bucket Default Lock Enabled', count: 1368, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  ];

  const openIssues = 24448;

  // Industry standards — Presidio-style percentage badges
  const industryStandards = [
    { name: 'HIPAA',    pct: 42, color: '#6366f1' },
    { name: 'CIS',      pct: 75, color: '#10b981' },
    { name: 'FedRAMP',  pct: 52, color: '#f59e0b' },
    { name: 'PCI',      pct: 50, color: '#ec4899' },
  ];
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CheckSquare size={16} className="text-amber-600"/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Compliance Assessment</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Industry Standards</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100">
            <CheckSquare size={11}/> ACTIVE
          </span>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
            <MoreHorizontal size={15}/>
          </button>
        </div>
      </div>

      {/* Open Issues Banner */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 px-4 py-3 flex items-center gap-3">
        <AlertCircle size={18} className="text-amber-500 flex-shrink-0"/>
        <div>
          <p className="text-2xl font-bold text-amber-900 leading-none">{openIssues.toLocaleString()}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Open Issues</p>
        </div>
      </div>

      {/* Top Violations */}
      <div className="px-5 pt-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Top 3 Violations</p>
        <div className="space-y-2">
          {standards.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }}/>
              <p className="text-xs font-medium text-gray-700 flex-1 leading-snug">{s.name}</p>
              <span className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">{s.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Industry Standards % badges */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Standards Coverage</p>
        <div className="grid grid-cols-2 gap-2">
          {industryStandards.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-600">{s.name}</span>
                <span className="text-xs font-bold" style={{ color: s.color }}>{s.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${s.pct}%`, background: s.color }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplianceWidget;
