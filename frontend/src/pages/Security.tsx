import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
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
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cloud/accounts/${accountId}/security`,
        { headers: { Authorization: `Bearer ${token}` } }
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

  const SEV: Record<string, any> = {
    CRITICAL: {
      label: 'Critical', leftBorder: '#ef4444',
      badge: { bg: '#fef2f2', color: '#b91c1c' },
      tileBg: '#fff5f5', tileActiveBg: '#fef2f2', tileActiveBorder: '#fca5a5',
      dot: '#ef4444', countColor: '#dc2626', subText: 'Immediate action required',
      Icon: XCircle, iconColor: '#ef4444',
    },
    HIGH: {
      label: 'High', leftBorder: '#f97316',
      badge: { bg: '#fff7ed', color: '#c2410c' },
      tileBg: '#fffbf5', tileActiveBg: '#fff7ed', tileActiveBorder: '#fdba74',
      dot: '#f97316', countColor: '#ea580c', subText: 'Address soon',
      Icon: AlertTriangle, iconColor: '#f97316',
    },
    MEDIUM: {
      label: 'Medium', leftBorder: '#eab308',
      badge: { bg: '#fefce8', color: '#a16207' },
      tileBg: '#fffef5', tileActiveBg: '#fefce8', tileActiveBorder: '#fde047',
      dot: '#eab308', countColor: '#ca8a04', subText: 'Review when possible',
      Icon: AlertTriangle, iconColor: '#eab308',
    },
    LOW: {
      label: 'Low', leftBorder: '#3b82f6',
      badge: { bg: '#eff6ff', color: '#1d4ed8' },
      tileBg: '#f5f9ff', tileActiveBg: '#eff6ff', tileActiveBorder: '#93c5fd',
      dot: '#3b82f6', countColor: '#2563eb', subText: 'Monitor',
      Icon: Info, iconColor: '#3b82f6',
    },
  };

  const scoreBand = (s: number) => {
    if (s >= 80) return { label: 'Good',     bg: '#f0fdf4', border: '#86efac', scoreColor: '#15803d', bar: '#22c55e', barBg: '#dcfce7', Icon: ShieldCheck, iconColor: '#16a34a' };
    if (s >= 60) return { label: 'Fair',     bg: '#fefce8', border: '#fde047', scoreColor: '#a16207', bar: '#eab308', barBg: '#fef9c3', Icon: Shield,      iconColor: '#ca8a04' };
    if (s >= 40) return { label: 'Poor',     bg: '#fff7ed', border: '#fdba74', scoreColor: '#c2410c', bar: '#f97316', barBg: '#ffedd5', Icon: ShieldAlert, iconColor: '#ea580c' };
    return           { label: 'Critical',  bg: '#fef2f2', border: '#fca5a5', scoreColor: '#b91c1c', bar: '#ef4444', barBg: '#fee2e2', Icon: ShieldAlert, iconColor: '#dc2626' };
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <MainLayout>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#9ca3af', letterSpacing: '0.01em' }}>Scanning security posture…</span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </MainLayout>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <MainLayout>
      <div style={{ padding: '28px 32px' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 12 }}>
          <AlertCircle size={18} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#991b1b', margin: 0 }}>Error Loading Security Data</p>
            <p style={{ fontSize: 13, color: '#dc2626', margin: '6px 0 0' }}>{error}</p>
            <button onClick={fetchRealSecurity} style={{ marginTop: 12, padding: '7px 16px', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
          </div>
        </div>
      </div>
    </MainLayout>
  );

  if (!securityData) return (
    <MainLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: 16, fontSize: 13, color: '#92400e' }}>
          No security data available for this account.
        </div>
      </div>
    </MainLayout>
  );

  const score    = securityData.score || 0;
  const findings = securityData.findings || [];
  const band     = scoreBand(score);
  const BandIcon = band.Icon;

  // ── Pretty account name — never show raw ID ──────────────────────────────────
  const rawName: string = securityData.accountName || securityData.name || '';
  const accountName = rawName
    || (accountId
      ? accountId
          .replace(/^aws-\d+$/, 'AWS Account')
          .replace(/^azure-\d+$/, 'Azure Account')
          .replace(/^gcp-\d+$/, 'GCP Account')
      : 'Cloud Account');

  const counts: Record<string, number> = {
    CRITICAL: findings.filter((f: any) => f.severity === 'CRITICAL').length,
    HIGH:     findings.filter((f: any) => f.severity === 'HIGH').length,
    MEDIUM:   findings.filter((f: any) => f.severity === 'MEDIUM').length,
    LOW:      findings.filter((f: any) => f.severity === 'LOW').length,
  };

  const sevOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const filtered = (filter === 'ALL' ? findings : findings.filter((f: any) => f.severity === filter))
    .sort((a: any, b: any) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

  const totalFindings = counts.CRITICAL + counts.HIGH + counts.MEDIUM + counts.LOW;

  return (
    <MainLayout>
      <div style={{ padding: '28px 32px', maxWidth: 1080, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <button
              onClick={() => navigate(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#4f46e5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>
              Security Posture
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{accountName}</p>
          </div>

          <button
            onClick={fetchRealSecurity}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.28)', transition: 'all 0.15s', marginTop: 28 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4f46e5'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.38)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366f1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.28)'; }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Score banner ── */}
        <div style={{
          background: band.bg,
          border: `1.5px solid ${band.border}`,
          borderRadius: 18,
          padding: '20px 24px',
          marginBottom: 14,
          display: 'grid',
          gridTemplateColumns: 'auto 1px auto 1px 1fr auto',
          alignItems: 'center',
          gap: '0 24px',
        }}>
          {/* Score */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              Security Score
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: band.scoreColor, letterSpacing: '-2px' }}>
                {score}
              </span>
              <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 500 }}>/100</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: '#fff', color: band.scoreColor,
                border: `1.5px solid ${band.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                {band.label}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ width: 180, height: 6, background: band.barBg, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score}%`, background: band.bar, borderRadius: 99, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 56, background: band.border }} />

          {/* Findings summary */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              Total Findings
            </p>
            <p style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>{totalFindings}</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '5px 0 0' }}>
              {counts.CRITICAL > 0
                ? `${counts.CRITICAL} critical · ${counts.HIGH} high`
                : counts.HIGH > 0
                  ? `${counts.HIGH} high severity`
                  : 'No critical issues'}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 56, background: band.border }} />

          {/* Last scanned */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              Last Scanned
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} color="#94a3b8" />
              {new Date(securityData.scannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
              {new Date(securityData.scannedAt).toLocaleTimeString()} · {securityData.provider}
            </p>
          </div>

          {/* Shield icon — solid, not ghost */}
          <div style={{
            width: 68, height: 68, borderRadius: 18,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 2px ${band.border}, 0 4px 12px rgba(0,0,0,0.06)`,
            flexShrink: 0,
          }}>
            <BandIcon size={34} color={band.iconColor} strokeWidth={1.8} />
          </div>
        </div>

        {/* ── Severity tiles ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
            const cfg = SEV[sev];
            const SevIcon = cfg.Icon;
            const active = filter === sev;
            const count  = counts[sev];
            return (
              <button
                key={sev}
                onClick={() => setFilter(active ? 'ALL' : sev)}
                style={{
                  background: active ? cfg.tileActiveBg : '#fff',
                  border: `1.5px solid ${active ? cfg.tileActiveBorder : '#e2e8f0'}`,
                  borderRadius: 14,
                  padding: '14px 16px 14px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? `0 0 0 3px ${cfg.leftBorder}18` : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = cfg.tileActiveBorder;
                    (e.currentTarget as HTMLElement).style.background = cfg.tileBg;
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                  }
                }}
              >
                {/* Left accent stripe */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: cfg.leftBorder, borderRadius: '14px 0 0 14px' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{cfg.label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.badge.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SevIcon size={14} color={cfg.iconColor} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: count > 0 ? cfg.countColor : '#cbd5e1', lineHeight: 1, letterSpacing: '-0.5px' }}>
                    {count}
                  </span>
                  {active && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: cfg.countColor, opacity: 0.7 }}>filtered</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: count > 0 ? cfg.countColor : '#94a3b8', marginTop: 4, opacity: count > 0 ? 0.8 : 0.6 }}>
                  {cfg.subText}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Findings card ── */}
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>

          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 18px', borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(to bottom, #fafbfc, #f8fafc)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Security Findings</h2>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                background: '#f1f5f9', color: '#475569',
              }}>
                {filter === 'ALL' ? totalFindings : counts[filter]} {filter !== 'ALL' ? filter.toLowerCase() : 'total'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => {
                const active = filter === f;
                const cfg = f !== 'ALL' ? SEV[f] : null;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '5px 12px', fontSize: 11, fontWeight: 600,
                      border: active ? 'none' : '1px solid #e2e8f0',
                      cursor: 'pointer', borderRadius: 8,
                      background: active ? '#6366f1' : '#fff',
                      color: active ? '#fff' : '#64748b',
                      transition: 'all 0.12s',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                    {f !== 'ALL' && counts[f] > 0 && (
                      <span style={{
                        background: active ? 'rgba(255,255,255,0.22)' : cfg!.badge.bg,
                        color: active ? '#fff' : cfg!.badge.color,
                        borderRadius: 99, padding: '0 5px', fontSize: 10, fontWeight: 700,
                        minWidth: 16, textAlign: 'center',
                      }}>
                        {counts[f]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Findings list */}
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={28} color="#22c55e" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {findings.length === 0 ? 'All clear — no security findings!' : 'No findings match this filter'}
              </p>
              {findings.length > 0 && (
                <button onClick={() => setFilter('ALL')} style={{ marginTop: 10, fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Show all findings
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((finding: any, index: number) => {
                const cfg = SEV[finding.severity] || SEV['LOW'];
                const FindingIcon = cfg.Icon;
                const open = expanded === index;
                return (
                  <div
                    key={index}
                    style={{
                      borderLeft: `4px solid ${cfg.leftBorder}`,
                      borderBottom: index < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: open ? '#fafbfd' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* Row */}
                    <button
                      onClick={() => setExpanded(open ? null : index)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '12px 18px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {/* Severity pill */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 8,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        background: cfg.badge.bg, color: cfg.badge.color,
                        border: `1px solid ${cfg.leftBorder}28`,
                        flexShrink: 0, minWidth: 76, justifyContent: 'center',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.leftBorder, flexShrink: 0 }} />
                        {finding.severity}
                      </span>

                      {/* Title */}
                      <span style={{
                        flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: open ? 'normal' : 'nowrap',
                        minWidth: 0,
                      }}>
                        {finding.title}
                      </span>

                      {/* Description preview — visible when collapsed */}
                      {!open && finding.description && (
                        <span style={{
                          fontSize: 12, color: '#94a3b8',
                          flexShrink: 0, maxWidth: 300,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {finding.description}
                        </span>
                      )}

                      {/* Expand toggle */}
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: open ? '#e0e7ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {open
                          ? <ChevronUp size={13} color="#6366f1" />
                          : <ChevronDown size={13} color="#64748b" />
                        }
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {open && (
                      <div style={{ padding: '0 18px 16px 46px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {finding.description && (
                          <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.65 }}>
                            {finding.description}
                          </p>
                        )}

                        {finding.resource && (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Affected Resource</p>
                            <code style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", wordBreak: 'break-all' }}>{finding.resource}</code>
                          </div>
                        )}

                        {finding.remediation && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={10} /> Remediation
                            </p>
                            <p style={{ fontSize: 13, color: '#166534', margin: 0, lineHeight: 1.6 }}>{finding.remediation}</p>
                          </div>
                        )}

                        {finding.compliance && finding.compliance.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Tag size={11} color="#94a3b8" />
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Compliance:</span>
                            {finding.compliance.map((fw: string, idx: number) => (
                              <span key={idx} style={{ padding: '3px 10px', background: '#f5f3ff', color: '#6d28d9', fontSize: 11, fontWeight: 600, borderRadius: 99, border: '1px solid #ede9fe' }}>
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

          {/* Card footer */}
          <div style={{
            padding: '10px 18px', borderTop: '1px solid #f1f5f9',
            background: '#fafbfc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} />
              Last scanned {new Date(securityData.scannedAt).toLocaleString()} · {securityData.provider}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: band.scoreColor, display: 'flex', alignItems: 'center', gap: 5 }}>
              <BandIcon size={12} />
              Score {score}/100 — {band.label}
            </span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </MainLayout>
  );
};

export default Security;
