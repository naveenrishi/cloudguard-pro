// src/components/dashboard/SecurityPosture.tsx — UI REDESIGN ONLY
// ✅ All data values 100% preserved — only layout/styling changed
import React from 'react';
import { Shield, CheckCircle, AlertTriangle, MoreHorizontal } from 'lucide-react';

const SecurityPosture: React.FC = () => {
  // ── DATA 100% UNCHANGED ──────────────────────────────────────────────────
  const violations = [
    { title: 'IAM Policies Too Permissive',      count: 1191, severity: 'high'   },
    { title: 'Lambda in VPC Without Isolation',  count: 1183, severity: 'medium' },
    { title: 'Unused Lambda Functions',          count: 1112, severity: 'low'    },
  ];

  const openIssues = 14074;
  const lastRun    = '26 Feb 2026 21:44 PM';

  const severityStyle = (s: string) => {
    if (s === 'high')   return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH'   };
    if (s === 'medium') return { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'MED'    };
    return               { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'LOW'    };
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-orange-600"/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Security Posture</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Last Run: {lastRun}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100">
            <CheckCircle size={11}/> ACTIVE
          </span>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
            <MoreHorizontal size={15}/>
          </button>
        </div>
      </div>

      {/* Open Issues Banner */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 px-4 py-3 flex items-center gap-3">
        <AlertTriangle size={18} className="text-orange-500 flex-shrink-0"/>
        <div>
          <p className="text-2xl font-bold text-orange-900 leading-none">{openIssues.toLocaleString()}</p>
          <p className="text-[11px] text-orange-600 font-semibold mt-0.5">Open Issues</p>
        </div>
      </div>

      {/* Violations */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Top 3 Violations</p>
        <div className="space-y-2">
          {violations.map((v, i) => {
            const style = severityStyle(v.severity);
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                  {style.label}
                </span>
                <p className="text-xs font-medium text-gray-700 flex-1 leading-snug">{v.title}</p>
                <span className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">{v.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SecurityPosture;
