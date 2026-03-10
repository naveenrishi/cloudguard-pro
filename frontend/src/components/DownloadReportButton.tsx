import React, { useState } from 'react';
import { Download, FileText, ChevronDown, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface DownloadReportButtonProps {
  accountId: string;
  provider: 'aws' | 'azure' | 'gcp';
  accountName?: string;
  /** variant: 'button' = standard button, 'icon' = compact icon-only */
  variant?: 'button' | 'icon';
}

type ReportState = 'idle' | 'generating' | 'done' | 'error';

export default function DownloadReportButton({
  accountId,
  provider,
  accountName = 'Account',
  variant = 'button',
}: DownloadReportButtonProps) {
  const [state,    setState]    = useState<ReportState>('idle');
  const [progress, setProgress] = useState('');
  const [showDrop, setShowDrop] = useState(false);

  const providerColor: Record<string, string> = {
    aws: '#f59e0b', azure: '#3b82f6', gcp: '#10b981',
  };
  const accent = providerColor[provider] || '#6366f1';

  const steps = [
    'Fetching account data…',
    'Analysing cost trends…',
    'Running security scan…',
    'Building compliance report…',
    'Generating PDF…',
    'Finalising…',
  ];

  const download = async (format: 'pdf') => {
    setShowDrop(false);
    setState('generating');

    // Simulate progress steps while the backend generates
    let step = 0;
    setProgress(steps[0]);
    const interval = setInterval(() => {
      step = Math.min(step + 1, steps.length - 1);
      setProgress(steps[step]);
    }, 900);

    try {
      const res = await fetch(
        `http://localhost:3000/api/reports/generate?accountId=${encodeURIComponent(accountId)}&provider=${provider}&format=${format}`,
        { method: 'POST' }
      );

      clearInterval(interval);

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `CloudGuard_${provider.toUpperCase()}_${accountId}_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      clearInterval(interval);
      console.error('Report generation failed:', err);
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  // ── Icon-only compact variant ─────────────────────────────────────────────
  if (variant === 'icon') {
    return (
      <button
        onClick={() => download('pdf')}
        disabled={state === 'generating'}
        title="Download PDF Report"
        style={{
          width: 34, height: 34,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: state === 'done' ? '#ecfdf5' : '#fff',
          color: state === 'done' ? '#10b981' : '#6b7280',
          cursor: state === 'generating' ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          opacity: state === 'generating' ? 0.7 : 1,
        }}>
        {state === 'generating'
          ? <Loader size={15} style={{ animation: 'spin 0.9s linear infinite' }}/>
          : state === 'done'
          ? <CheckCircle size={15}/>
          : <Download size={15}/>}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    );
  }

  // ── Full button variant ───────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>

      {/* Main button */}
      <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

        {/* Primary action */}
        <button
          onClick={() => state === 'idle' && download('pdf')}
          disabled={state === 'generating'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px',
            background: state === 'done'  ? '#ecfdf5'
                      : state === 'error' ? '#fef2f2'
                      : state === 'generating' ? '#f8fafc'
                      : '#fff',
            border: `1px solid ${
              state === 'done'  ? '#a7f3d0'
            : state === 'error' ? '#fecaca'
            : '#e5e7eb'}`,
            borderRight: 'none',
            color: state === 'done'  ? '#059669'
                 : state === 'error' ? '#dc2626'
                 : '#374151',
            cursor: state === 'generating' ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s',
          }}>

          {/* Icon */}
          {state === 'generating'
            ? <Loader size={15} style={{ animation: 'spin 0.9s linear infinite', color: '#9ca3af' }}/>
            : state === 'done'
            ? <CheckCircle size={15}/>
            : state === 'error'
            ? <AlertCircle size={15}/>
            : <FileText size={15} color={accent}/>}

          {/* Label */}
          <span>
            {state === 'generating' ? progress
           : state === 'done'       ? 'Downloaded!'
           : state === 'error'      ? 'Failed — retry'
           : 'Download Report'}
          </span>

          {/* Provider badge */}
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

        {/* Dropdown arrow */}
        {state === 'idle' && (
          <button
            onClick={() => setShowDrop(v => !v)}
            style={{
              padding: '8px 9px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderLeft: '1px solid #f3f4f6',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}>
            <ChevronDown size={13}
              style={{ transform: showDrop ? 'rotate(180deg)' : 'none',
                       transition: 'transform 0.2s' }}/>
          </button>
        )}
      </div>

      {/* Dropdown menu */}
      {showDrop && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setShowDrop(false)}/>
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            minWidth: 220, zIndex: 50, overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontWeight: 500 }}>
                {accountName} · {provider.toUpperCase()}
              </p>
            </div>

            {[
              { label: 'Full Report (PDF)',         desc: 'All sections — ~12 pages',    format: 'pdf' as const, icon: '📄' },
            ].map(opt => (
              <button key={opt.format}
                onClick={() => download(opt.format)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ fontSize: 16 }}>{opt.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{opt.desc}</p>
                </div>
              </button>
            ))}

            <div style={{ padding: '8px 14px', borderTop: '1px solid #f3f4f6',
                          background: '#f8fafc' }}>
              <p style={{ fontSize: 10, color: '#d1d5db', margin: 0 }}>
                Includes: cost, security, compliance, resources, migrations, config changes
              </p>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
