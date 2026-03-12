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
    CRITICAL: { label: 'Critical', leftBorder: '#ef4444', badge: { bg: '#fef2f2', color: '#b91c1c' }, dot: '#ef4444', countColor: '#ef4444', subText: 'Immediate action required', Icon: XCircle,       iconColor: '#fca5a5' },
    HIGH:     { label: 'High',     leftBorder: '#f97316', badge: { bg: '#fff7ed', color: '#c2410c' }, dot: '#f97316', countColor: '#f97316', subText: 'Address soon',              Icon: AlertTriangle, iconColor: '#fdba74' },
    MEDIUM:   { label: 'Medium',   leftBorder: '#eab308', badge: { bg: '#fefce8', color: '#a16207' }, dot: '#eab308', countColor: '#ca8a04', subText: 'Review when possible',      Icon: AlertTriangle, iconColor: '#fde047' },
    LOW:      { label: 'Low',      leftBorder: '#3b82f6', badge: { bg: '#eff6ff', color: '#1d4ed8' }, dot: '#3b82f6', countColor: '#3b82f6', subText: 'Monitor',                  Icon: Info,          iconColor: '#93c5fd' },
  };

  const scoreBand = (s: number) => {
    if (s >= 80) return { label: 'Good',    bg: '#f0fdf4', border: '#bbf7d0', scoreColor: '#16a34a', bar: '#22c55e', Icon: ShieldCheck, iconColor: '#86efac' };
    if (s >= 60) return { label: 'Fair',    bg: '#fefce8', border: '#fde68a', scoreColor: '#ca8a04', bar: '#eab308', Icon: Shield,      iconColor: '#fde047' };
    if (s >= 40) return { label: 'Poor',    bg: '#fff7ed', border: '#fed7aa', scoreColor: '#ea580c', bar: '#f97316', Icon: ShieldAlert, iconColor: '#fdba74' };
    return           { label: 'Critical', bg: '#fef2f2', border: '#fecaca', scoreColor: '#dc2626', bar: '#ef4444', Icon: ShieldAlert, iconColor: '#fca5a5' };
  };

  if (loading) return (
    <MainLayout>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af' }}>
          <div style={{ width: 16, height: 16, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Scanning security posture...</span>
        </div>
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', margin: 0 }}>Error Loading Security Data</p>
            <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{error}</p>
            <button onClick={fetchRealSecurity} style={{ marginTop: 10, padding: '6px 14px', background: '#dc2626', color: '#fff', fontSize: 12, border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
          </div>
        </div>
      </div>
    </MainLayout>
  );

  if (!securityData) return (
    <MainLayout>
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, padding: 16, fontSize: 13, color: '#92400e' }}>
          No security data available for this account.
        </div>
      </div>
    </MainLayout>
  );

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

  return (
    <MainLayout>
      <div style={{ padding: '24px 28px', maxWidth: 900, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <button
              onClick={() => navigate(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Security Posture</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0' }}>{securityData.accountName || 'Cloud Account'}</p>
          </div>
          <button
            onClick={fetchRealSecurity}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Score banner — compact 2-column */}
        <div style={{ background: band.bg, border: `1px solid ${band.border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Score */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', margin: '0 0 4px' }}>Security Score</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: band.scoreColor }}>{score}</span>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>/100</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: band.bg, color: band.scoreColor, border: `1px solid ${band.border}` }}>
                  {band.label}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ width: 160, height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${score}%`, background: band.bar, borderRadius: 99, transition: 'width 0.7s ease' }} />
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: 1, height: 50, background: band.border }} />
            {/* Last scan */}
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Last scanned
              </p>
              <p style={{ fontSize: 12, color: '#374151', fontWeight: 500, margin: '3px 0 0' }}>
                {new Date(securityData.scannedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <BandIcon size={48} color={band.iconColor} style={{ opacity: 0.5, flexShrink: 0 }} />
        </div>

        {/* Severity tiles — compact row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
            const cfg = SEV[sev];
            const { Icon } = cfg;
            const active = filter === sev;
            return (
              <button
                key={sev}
                onClick={() => setFilter(active ? 'ALL' : sev)}
                style={{
                  background: active ? cfg.badge.bg : '#fff',
                  border: `1px solid ${active ? cfg.leftBorder + '55' : '#e5e7eb'}`,
                  borderLeft: `3px solid ${cfg.leftBorder}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? `0 0 0 2px ${cfg.leftBorder}33` : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>{cfg.label}</span>
                  <Icon size={14} color={cfg.iconColor} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: cfg.countColor, lineHeight: 1 }}>{counts[sev]}</div>
                <div style={{ fontSize: 10, color: cfg.countColor, opacity: 0.7, marginTop: 3 }}>{cfg.subText}</div>
              </button>
            );
          })}
        </div>

        {/* Findings card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: 0 }}>
              Security Findings <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>({filtered.length})</span>
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8,
                    background: filter === f ? '#6366f1' : '#f3f4f6',
                    color: filter === f ? '#fff' : '#6b7280',
                    transition: 'all 0.15s',
                  }}
                >
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <ShieldCheck size={28} color="#4ade80" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>
                {findings.length === 0 ? 'No security findings — your account looks great!' : 'No findings for this filter'}
              </p>
              {findings.length > 0 && <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>Try a different severity</p>}
            </div>
          ) : (
            <div>
              {filtered.map((finding: any, index: number) => {
                const cfg = SEV[finding.severity] || SEV['LOW'];
                const { Icon } = cfg;
                const open = expanded === index;
                return (
                  <div
                    key={index}
                    style={{ borderLeft: `3px solid ${cfg.leftBorder}`, borderBottom: '1px solid #f9fafb', background: open ? '#fafafa' : '#fff', transition: 'background 0.15s' }}
                  >
                    <button
                      onClick={() => setExpanded(open ? null : index)}
                      style={{ width: '100%', textAlign: 'left', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', background: cfg.badge.bg, color: cfg.badge.color, flexShrink: 0 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                        {finding.severity}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>
                        {finding.title}
                      </span>
                      {!open && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, flexShrink: 0, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finding.description}</p>}
                      {open ? <ChevronUp size={13} color="#d1d5db" style={{ flexShrink: 0 }} /> : <ChevronDown size={13} color="#d1d5db" style={{ flexShrink: 0 }} />}
                    </button>

                    {open && (
                      <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {finding.description && (
                          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{finding.description}</p>
                        )}
                        {finding.resource && (
                          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Affected Resource</p>
                            <code style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>{finding.resource}</code>
                          </div>
                        )}
                        {finding.remediation && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={10} /> Remediation
                            </p>
                            <p style={{ fontSize: 12, color: '#15803d', margin: 0, lineHeight: 1.5 }}>{finding.remediation}</p>
                          </div>
                        )}
                        {finding.compliance && finding.compliance.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Tag size={11} color="#d1d5db" />
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>Compliance:</span>
                            {finding.compliance.map((fw: string, idx: number) => (
                              <span key={idx} style={{ padding: '2px 8px', background: '#f5f3ff', color: '#6d28d9', fontSize: 11, fontWeight: 500, borderRadius: 99, border: '1px solid #ede9fe' }}>
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
          <div style={{ padding: '10px 18px', borderTop: '1px solid #f3f4f6', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} />
              {new Date(securityData.scannedAt).toLocaleString()} · {securityData.provider} Account
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: band.scoreColor }}>Score: {score}/100 — {band.label}</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Security;
