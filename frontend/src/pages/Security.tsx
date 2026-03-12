import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, ShieldCheck,
  AlertTriangle, CheckCircle, XCircle,
  RefreshCw, AlertCircle, Clock,
  ChevronDown, ChevronUp, Tag, Info, ArrowLeft,
} from 'lucide-react';

const Security: React.FC = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [securityData, setSecurityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => { if (accountId) fetchRealSecurity(); }, [accountId]);

  const fetchRealSecurity = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cloud/accounts/${accountId}/security`
      );
      if (response.ok) {
        setSecurityData(await response.json());
      } else {
        const e = await response.json();
        setError(e.error || 'Failed to fetch security data');
      }
    } catch {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  // ── Config ───────────────────────────────────────────────────────────────────
  const SEV: Record<string, any> = {
    CRITICAL: { label: 'Critical', leftBorder: 'border-l-red-500',    badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    countColor: 'text-red-500',    subColor: 'text-red-400',    subText: 'Immediate action required', Icon: XCircle,       iconColor: 'text-red-400'    },
    HIGH:     { label: 'High',     leftBorder: 'border-l-orange-400', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', countColor: 'text-orange-500', subColor: 'text-orange-400', subText: 'Address soon',              Icon: AlertTriangle, iconColor: 'text-orange-400' },
    MEDIUM:   { label: 'Medium',   leftBorder: 'border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', countColor: 'text-yellow-500', subColor: 'text-yellow-400', subText: 'Review when possible',      Icon: AlertTriangle, iconColor: 'text-yellow-400' },
    LOW:      { label: 'Low',      leftBorder: 'border-l-blue-400',   badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   countColor: 'text-blue-500',   subColor: 'text-blue-400',   subText: 'Monitor',                  Icon: Info,          iconColor: 'text-blue-400'   },
  };

  const scoreBand = (s: number) => {
    if (s >= 80) return { label: 'Good',    bg: 'bg-green-50',  border: 'border-green-200',  scoreColor: 'text-green-600',  bar: 'bg-green-500',  Icon: ShieldCheck };
    if (s >= 60) return { label: 'Fair',    bg: 'bg-yellow-50', border: 'border-yellow-200', scoreColor: 'text-yellow-600', bar: 'bg-yellow-400', Icon: Shield      };
    if (s >= 40) return { label: 'Poor',    bg: 'bg-orange-50', border: 'border-orange-200', scoreColor: 'text-orange-600', bar: 'bg-orange-400', Icon: ShieldAlert };
    return           { label: 'Critical', bg: 'bg-red-50',    border: 'border-red-200',    scoreColor: 'text-red-600',    bar: 'bg-red-500',    Icon: ShieldAlert };
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-400">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Scanning security posture...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Error Loading Security Data</p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
          <button onClick={fetchRealSecurity} className="mt-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Retry</button>
        </div>
      </div>
    </div>
  );

  if (!securityData) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800">
        No security data available for this account.
      </div>
    </div>
  );

  // ── Derived ──────────────────────────────────────────────────────────────────
  const score    = securityData.score || 0;
  const findings = securityData.findings || [];
  const band     = scoreBand(score);
  const { Icon: BandIcon } = band;

  const counts: Record<string, number> = {
    CRITICAL: findings.filter((f: any) => f.severity === 'CRITICAL').length,
    HIGH:     findings.filter((f: any) => f.severity === 'HIGH').length,
    MEDIUM:   findings.filter((f: any) => f.severity === 'MEDIUM').length,
    LOW:      findings.filter((f: any) => f.severity === 'LOW').length,
  };

  const sevOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const filtered = (filter === 'ALL' ? findings : findings.filter((f: any) => f.severity === filter))
    .sort((a: any, b: any) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4 max-w-5xl">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Security Posture</h1>
          <p className="text-xs text-gray-400 mt-0.5">{securityData.accountName || 'Cloud Account'}</p>
        </div>
        <button
          onClick={fetchRealSecurity}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Score banner ──────────────────────────────────────────────────────── */}
      <div className={`${band.bg} border ${band.border} rounded-2xl px-5 py-4 flex items-center justify-between`}>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Overall Security Score</p>
          <div className="flex items-end gap-2 mb-2.5">
            <span className={`text-4xl font-black leading-none ${band.scoreColor}`}>{score}</span>
            <span className="text-sm text-gray-400 mb-0.5">/100</span>
            <span className={`ml-1 mb-0.5 px-2 py-0.5 text-[11px] font-bold rounded-full border ${band.bg} ${band.scoreColor} ${band.border}`}>
              {band.label}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
            <div className={`h-full ${band.bar} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last scanned: {new Date(securityData.scannedAt).toLocaleString()}
          </p>
        </div>
        <BandIcon className={`w-14 h-14 ${band.scoreColor} opacity-[0.12]`} />
      </div>

      {/* ── Severity tiles ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
          const cfg = SEV[sev];
          const { Icon } = cfg;
          const active = filter === sev;
          return (
            <button
              key={sev}
              onClick={() => setFilter(active ? 'ALL' : sev)}
              className={`bg-white rounded-xl border border-gray-100 border-l-4 ${cfg.leftBorder} shadow-sm text-left p-4 transition-all ${active ? 'ring-2 ring-indigo-400 shadow-md' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
                <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
              </div>
              <div className={`text-2xl font-bold ${cfg.countColor} mb-0.5`}>{counts[sev]}</div>
              <div className={`text-[11px] ${cfg.subColor}`}>{cfg.subText}</div>
            </button>
          );
        })}
      </div>

      {/* ── Findings card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Security Findings
            <span className="ml-1.5 text-xs font-normal text-gray-400">({filtered.length})</span>
          </h2>
          <div className="flex gap-1.5">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ShieldCheck className="w-8 h-8 mx-auto text-green-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {findings.length === 0 ? 'No security findings — your account looks great!' : 'No findings for this filter'}
            </p>
            {findings.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Try a different severity or view all</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((finding: any, index: number) => {
              const cfg = SEV[finding.severity] || SEV['LOW'];
              const open = expanded === index;
              return (
                <div key={index} className={`border-l-[3px] ${cfg.leftBorder} ${open ? 'bg-gray-50/60' : 'hover:bg-gray-50/30'} transition-colors`}>

                  {/* Clickable header row */}
                  <button
                    className="w-full text-left px-5 py-3.5 flex items-start gap-3"
                    onClick={() => setExpanded(open ? null : index)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {finding.severity}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{finding.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{finding.description}</p>
                    </div>
                    {open
                      ? <ChevronUp   className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
                      : <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {open && (
                    <div className="px-5 pb-4 space-y-2.5">
                      {finding.resource && (
                        <div className="bg-gray-100 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Affected Resource</p>
                          <code className="text-xs text-gray-700 font-mono break-all">{finding.resource}</code>
                        </div>
                      )}
                      {finding.remediation && (
                        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Remediation Steps
                          </p>
                          <p className="text-xs text-green-700 leading-relaxed">{finding.remediation}</p>
                        </div>
                      )}
                      {finding.compliance && finding.compliance.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <Tag className="w-3 h-3 text-gray-300" />
                          <span className="text-[10px] text-gray-400">Compliance:</span>
                          {finding.compliance.map((fw: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[11px] font-medium rounded-full border border-violet-100">
                              {fw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {new Date(securityData.scannedAt).toLocaleString()} · {securityData.provider} Account
          </span>
          <span className={`text-xs font-semibold ${band.scoreColor}`}>Score: {score}/100 — {band.label}</span>
        </div>
      </div>

    </div>
  );
};

export default Security;
