// frontend/src/components/DownloadReportButton.tsx
import React, { useState } from 'react';
import {
  Download, FileText, ChevronDown, Loader, CheckCircle,
  AlertCircle, Shield, DollarSign, Server, TrendingUp,
  Bell, Zap, GitMerge, Activity, X,
} from 'lucide-react';

interface DownloadReportButtonProps {
  accountId: string;
  provider: 'aws' | 'azure' | 'gcp';
  accountName?: string;
  /** variant: 'button' = standard button, 'icon' = compact icon-only */
  variant?: 'button' | 'icon';
}

type ReportState = 'idle' | 'generating' | 'done' | 'error';

const SECTIONS = [
  { icon: TrendingUp,  label: 'Executive Summary',            desc: 'KPIs, risk snapshot, spend by provider'          },
  { icon: Server,      label: 'Cloud Accounts Overview',       desc: 'All connected accounts & sync status'            },
  { icon: DollarSign,  label: 'Cost Analytics & Trends',       desc: 'Top services, 90-day spend breakdown'            },
  { icon: AlertCircle, label: 'Cost Anomalies',                desc: 'Spikes, forecast overages, concentration risks'  },
  { icon: DollarSign,  label: 'Budget Utilisation',            desc: 'Configured budgets vs thresholds'                },
  { icon: Shield,      label: 'Security Findings',             desc: 'All active findings by severity'                 },
  { icon: Shield,      label: 'Compliance Summary',            desc: 'CIS, SOC 2, PCI DSS, ISO 27001, GDPR'           },
  { icon: Server,      label: 'Resources Inventory',           desc: 'Top resources by monthly cost'                   },
  { icon: TrendingUp,  label: 'Optimisation Recommendations',  desc: 'AI-driven cost & performance improvements'       },
  { icon: Shield,      label: 'IAM & Access',                  desc: 'Identity findings & credential alerts'           },
  { icon: Bell,        label: 'Alert Center',                  desc: 'Open & acknowledged alerts across all accounts'  },
  { icon: Zap,         label: 'Nuke Automation',               desc: 'Cleanup configs and run history'                 },
  { icon: GitMerge,    label: 'Migration Advisor',             desc: 'Cloud-to-cloud migration recommendations'        },
  { icon: Activity,    label: 'Change Events & Incidents',     desc: 'Infrastructure changes in the last 30 days'      },
];

const STEPS = [
  'Fetching account data…',
  'Analysing cost trends…',
  'Running security scan…',
  'Checking compliance…',
  'Auditing resources…',
  'Loading alert center…',
  'Compiling recommendations…',
  'Building migration report…',
  'Generating PDF…',
  'Finalising…',
];

const PROVIDER_ACCENT: Record<string, string> = {
  aws: '#f59e0b', azure: '#3b82f6', gcp: '#10b981',
};

export default function DownloadReportButton({
  accountId,
  provider,
  accountName = 'Account',
  variant = 'button',
}: DownloadReportButtonProps) {
  const [state,    setState]    = useState<ReportState>('idle');
  const [progress, setProgress] = useState('');
  const [showDrop, setShowDrop] = useState(false);

  const accent = PROVIDER_ACCENT[provider] || '#6366f1';

  const download = async () => {
    setShowDrop(false);
    setState('generating');

    let step = 0;
    setProgress(STEPS[0]);
    const interval = setInterval(() => {
      step = Math.min(step + 1, STEPS.length - 1);
      setProgress(STEPS[step]);
    }, 700);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/reports/generate?accountId=${encodeURIComponent(accountId)}&provider=${provider}&format=pdf`,
        { method: 'POST' },
      );

      clearInterval(interval);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `CloudGuard_FullReport_${provider.toUpperCase()}_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setState('done');
      setTimeout(() => setState('idle'), 3500);
    } catch (err) {
      clearInterval(interval);
      console.error('[DownloadReportButton]', err);
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  // ── Icon-only variant ─────────────────────────────────────
  if (variant === 'icon') {
    return (
      <button
        onClick={() => state === 'idle' && download()}
        disabled={state === 'generating'}
        title="Download Full PDF Report"
        style={{
          width: 34, height: 34, borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: state === 'done' ? '#ecfdf5' : '#fff',
          color: state === 'done' ? '#10b981' : '#6b7280',
          cursor: state === 'generating' ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          opacity: state === 'generating' ? 0.7 : 1,
        }}>
        {state === 'generating'
          ? <Loader size={15} style={{ animation: 'spin 0.9s linear infinite' }} />
          : state === 'done' ? <CheckCircle size={15} />
          : <Download size={15} />}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    );
  }

  // ── Full button variant ───────────────────────────────────
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>

      {/* Main split button */}
      <div style={{
        display: 'flex', borderRadius: 10, overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>

        {/* Primary action */}
        <button
          onClick={() => state === 'idle' && download()}
          disabled={state === 'generating'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px',
            background:
              state === 'done'  ? '#ecfdf5'
            : state === 'error' ? '#fef2f2'
            : state === 'generating' ? '#f8fafc'
            : '#fff',
            border: `1px solid ${
              state === 'done'  ? '#a7f3d0'
            : state === 'error' ? '#fecaca'
            : '#e5e7eb'}`,
            borderRight: 'none',
            color:
              state === 'done'  ? '#059669'
            : state === 'error' ? '#dc2626'
            : '#374151',
            cursor: state === 'generating' ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s',
          }}>

          {state === 'generating'
            ? <Loader size={15} style={{ animation: 'spin 0.9s linear infinite', color: '#9ca3af' }} />
            : state === 'done'
            ? <CheckCircle size={15} />
            : state === 'error'
            ? <AlertCircle size={15} />
            : <FileText size={15} color={accent} />}

          <span>
            {state === 'generating' ? progress
           : state === 'done'       ? 'Downloaded!'
           : state === 'error'      ? 'Failed — retry'
           : 'Download Full Report'}
          </span>

          {state === 'idle' && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: '2px 7px', borderRadius: 99,
              background: `${accent}18`, color: accent,
              textTransform: 'uppercase',
            }}>
              {provider}
            </span>
          )}
        </button>

        {/* Dropdown arrow — only when idle */}
        {state === 'idle' && (
          <button
            onClick={() => setShowDrop(v => !v)}
            style={{
              padding: '8px 9px', background: '#fff',
              border: '1px solid #e5e7eb',
              borderLeft: '1px solid #f3f4f6',
              color: '#9ca3af', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}>
            <ChevronDown size={13} style={{
              transform: showDrop ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
          </button>
        )}
      </div>

      {/* Dropdown — full report preview */}
      {showDrop && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setShowDrop(false)}
          />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.13)',
            width: 380, zIndex: 50, overflow: 'hidden',
          }}>

            {/* Header */}
            <div style={{
              padding: '12px 16px 10px',
              borderBottom: '1px solid #f3f4f6',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
                    Full Cloud Infrastructure Report
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
                    {accountName} · {provider.toUpperCase()} · ~14 sections · PDF
                  </p>
                </div>
                <button onClick={() => setShowDrop(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Section list */}
            <div style={{ padding: '8px 0', maxHeight: 340, overflowY: 'auto' }}>
              {SECTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 16px',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: '#f0f0ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={13} color="#4f46e5" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0 }}>
                        {String(i + 1).padStart(2, '0')}  {s.label}
                      </p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer CTA */}
            <div style={{
              padding: '10px 16px 12px',
              borderTop: '1px solid #f3f4f6',
              background: '#f8fafc',
            }}>
              <button
                onClick={download}
                style={{
                  width: '100%', padding: '9px 0',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  border: 'none', borderRadius: 9, cursor: 'pointer',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                <Download size={14} />
                Generate &amp; Download Full Report
              </button>
              <p style={{ fontSize: 9, color: '#d1d5db', margin: '6px 0 0', textAlign: 'center' }}>
                Includes live data from all 14 sections above
              </p>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
