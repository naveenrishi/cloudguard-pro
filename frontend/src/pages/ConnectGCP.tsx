// src/pages/ConnectGCP.tsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowLeft, Upload, CheckCircle, AlertCircle, Loader2,
  ChevronRight, FileText, Eye, EyeOff, Zap, Shield, BarChart3, Globe,
} from 'lucide-react';

// ── GCP colour palette ────────────────────────────────────────────────────────
const GCP_BLUE   = '#4285F4';
const GCP_RED    = '#EA4335';
const GCP_YELLOW = '#FBBC05';
const GCP_GREEN  = '#34A853';

// ── Tiny Google "G" SVG logo ──────────────────────────────────────────────────
const GoogleG: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill={GCP_BLUE}   d="M44.5 20H24v8h11.7C34.2 33.6 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.1 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.1-2.7-.5-4z"/>
    <path fill={GCP_RED}    d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.1 5.1 29.3 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z"/>
    <path fill={GCP_YELLOW} d="M24 45c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 36.5 26.9 37 24 37c-5.5 0-10.2-3.4-11.7-8.2l-6.6 5.1C9.4 40.5 16.2 45 24 45z"/>
    <path fill={GCP_GREEN}  d="M44.5 20H24v8h11.7c-.7 2.1-1.9 3.9-3.5 5.2l6.2 5.2C41.7 35.5 45 30.2 45 24c0-1.3-.1-2.7-.5-4z"/>
  </svg>
);

// ── Steps sidebar ─────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Create Service Account',   desc: 'In GCP Console' },
  { n: 2, label: 'Assign IAM Roles',         desc: 'Viewer + Billing' },
  { n: 3, label: 'Download JSON Key',        desc: 'From GCP Console' },
  { n: 4, label: 'Paste & Connect',          desc: 'In CloudGuard' },
];

// ── Required IAM roles list ───────────────────────────────────────────────────
const REQUIRED_ROLES = [
  { role: 'roles/viewer',                      why: 'Read all resources' },
  { role: 'roles/billing.viewer',              why: 'Read cost data' },
  { role: 'roles/securitycenter.findingsViewer', why: 'Security findings (optional)' },
  { role: 'roles/storage.objectViewer',        why: 'Cloud Storage buckets' },
];

export default function ConnectGCP() {
  const navigate   = useNavigate();
  const { isDark } = useTheme();
  const fileRef    = useRef<HTMLInputElement>(null);

  const [accountName, setAccountName]     = useState('');
  const [jsonText, setJsonText]           = useState('');
  const [showJson, setShowJson]           = useState(false);
  const [activeStep, setActiveStep]       = useState(1);
  const [fileName, setFileName]           = useState('');
  const [status, setStatus]               = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]           = useState('');
  const [parsedProject, setParsedProject] = useState('');

  // ── Theme tokens (matching rest of app) ────────────────────────────────────
  const bg      = isDark ? '#0b1120'  : '#f5f7fa';
  const card    = isDark ? '#111827'  : '#ffffff';
  const border  = isDark ? '#1f2937'  : '#e5e7eb';
  const text     = isDark ? '#f9fafb'  : '#111827';
  const muted   = isDark ? '#6b7280'  : '#6b7280';
  const subtle  = isDark ? '#1f2937'  : '#f3f4f6';

  // ── Handle file upload ──────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsonText(content);
      tryParseProject(content);
    };
    reader.readAsText(file);
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith('.json')) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsonText(content);
      tryParseProject(content);
    };
    reader.readAsText(file);
  };

  const tryParseProject = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.project_id) {
        setParsedProject(parsed.project_id);
        if (!accountName) setAccountName(parsed.project_id);
      }
    } catch (_) {}
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    tryParseProject(val);
    setFileName('');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!accountName.trim()) { setErrorMsg('Account name is required'); setStatus('error'); return; }
    if (!jsonText.trim())    { setErrorMsg('Service account JSON is required'); setStatus('error'); return; }
    
    let keyJson: any;
    try {
        keyJson = JSON.parse(jsonText);
      } catch (_) {
        setErrorMsg('Invalid JSON — please check the service account key file');
        setStatus('error');
        return;
      }
    
      if (!keyJson.project_id || !keyJson.client_email || !keyJson.private_key) {
        setErrorMsg('This does not look like a valid GCP service account key.');
        setStatus('error');
        return;
      }
    
      setStatus('loading');
      setErrorMsg('');
    
      try {
        const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
        const token = localStorage.getItem('accessToken');   // ← send JWT
    
        const res = await fetch(`${API}/api/gcp/connect`, {  // ← correct path
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountName: accountName.trim(), serviceAccountKey: keyJson }),
        });
    
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Connection failed');
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 1800);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to connect GCP account');
        setStatus('error');
      }
    };

  const canSubmit = accountName.trim() && jsonText.trim() && status !== 'loading';

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 32px', borderBottom: `1px solid ${border}`,
        background: card,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: muted, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, fontWeight: 500,
            padding: '6px 10px', borderRadius: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = subtle)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>

        <div style={{ flex: 1 }} />

        {/* Google multicolor logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GoogleG size={24} />
          <span style={{ fontSize: 15, fontWeight: 700, color: text }}>
            Connect Google Cloud Platform
          </span>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', gap: 0,
        maxWidth: 1100, margin: '0 auto', width: '100%',
        padding: '40px 24px',
        alignItems: 'flex-start',
      }}>

        {/* ── LEFT: steps guide ──────────────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0, marginRight: 32 }}>

          {/* GCP banner */}
          <div style={{
            background: `linear-gradient(135deg, ${GCP_BLUE}18, ${GCP_GREEN}18)`,
            border: `1px solid ${GCP_BLUE}33`,
            borderRadius: 14, padding: '20px 20px',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <GoogleG size={32} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: text }}>Google Cloud</div>
                <div style={{ fontSize: 11, color: muted }}>Service Account Auth</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { icon: BarChart3, label: 'Cost Data',  color: GCP_BLUE  },
                { icon: Shield,    label: 'Security',   color: GCP_GREEN },
                { icon: Globe,     label: 'Resources',  color: GCP_YELLOW },
                { icon: Zap,       label: 'Real-time',  color: GCP_RED   },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: `${color}22`, borderRadius: 6,
                  padding: '3px 8px', fontSize: 11, color,
                  fontWeight: 600,
                }}>
                  <Icon size={10} /> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-step guide */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: '0.08em', marginBottom: 14, textTransform: 'uppercase' }}>
              Setup Guide
            </div>
            {STEPS.map((s) => (
              <div
                key={s.n}
                onClick={() => setActiveStep(s.n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                  cursor: 'pointer',
                  background: activeStep === s.n ? `${GCP_BLUE}15` : 'transparent',
                  border: `1px solid ${activeStep === s.n ? GCP_BLUE + '33' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  background: activeStep === s.n ? GCP_BLUE : subtle,
                  color: activeStep === s.n ? '#fff' : muted,
                  transition: 'all 0.15s',
                }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeStep === s.n ? text : muted }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: muted }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Step detail panel */}
          <div style={{
            background: subtle, borderRadius: 12,
            padding: '16px', fontSize: 12, color: muted, lineHeight: 1.6,
          }}>
            {activeStep === 1 && <>
              <div style={{ fontWeight: 700, color: text, marginBottom: 8 }}>Create a Service Account</div>
              <ol style={{ paddingLeft: 16, margin: 0 }}>
                <li>Open <strong style={{ color: GCP_BLUE }}>console.cloud.google.com</strong></li>
                <li>Go to <strong>IAM & Admin → Service Accounts</strong></li>
                <li>Click <strong>+ Create Service Account</strong></li>
                <li>Give it a name like <code style={{ background: border, padding: '1px 4px', borderRadius: 4 }}>cloudguard-reader</code></li>
              </ol>
            </>}
            {activeStep === 2 && <>
              <div style={{ fontWeight: 700, color: text, marginBottom: 8 }}>Assign These Roles</div>
              {REQUIRED_ROLES.map(r => (
                <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <code style={{ background: border, padding: '1px 6px', borderRadius: 4, fontSize: 11, color: GCP_BLUE }}>{r.role}</code>
                  <span style={{ fontSize: 11, color: muted }}>{r.why}</span>
                </div>
              ))}
            </>}
            {activeStep === 3 && <>
              <div style={{ fontWeight: 700, color: text, marginBottom: 8 }}>Download JSON Key</div>
              <ol style={{ paddingLeft: 16, margin: 0 }}>
                <li>Click your service account name</li>
                <li>Go to <strong>Keys</strong> tab</li>
                <li>Click <strong>Add Key → Create new key</strong></li>
                <li>Select <strong>JSON</strong> and click <strong>Create</strong></li>
                <li>A <code style={{ background: border, padding: '1px 4px', borderRadius: 4 }}>.json</code> file will download</li>
              </ol>
            </>}
            {activeStep === 4 && <>
              <div style={{ fontWeight: 700, color: text, marginBottom: 8 }}>Paste or Upload</div>
              <p style={{ margin: 0 }}>Drag & drop the downloaded <code style={{ background: border, padding: '1px 4px', borderRadius: 4 }}>.json</code> file into the upload area, or paste its contents directly into the text field.</p>
            </>}
          </div>
        </div>

        {/* ── RIGHT: connect form ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Success state */}
          {status === 'success' ? (
            <div style={{
              background: card, border: `1px solid ${border}`,
              borderRadius: 16, padding: '60px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `${GCP_GREEN}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={32} color={GCP_GREEN} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text }}>GCP Account Connected!</div>
              <div style={{ fontSize: 14, color: muted }}>
                <strong style={{ color: GCP_BLUE }}>{parsedProject}</strong> is now syncing. Redirecting to dashboard…
              </div>
              <div style={{
                display: 'flex', gap: 8, marginTop: 8,
                padding: '8px 16px', background: `${GCP_GREEN}15`,
                borderRadius: 8, fontSize: 13, color: GCP_GREEN,
              }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Loading your cloud data…
              </div>
            </div>
          ) : (
            <div style={{
              background: card, border: `1px solid ${border}`,
              borderRadius: 16, overflow: 'hidden',
            }}>

              {/* Card header */}
              <div style={{
                padding: '24px 28px',
                borderBottom: `1px solid ${border}`,
                background: isDark ? '#0f172a' : '#fafbff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `linear-gradient(135deg, ${GCP_BLUE}20, ${GCP_GREEN}20)`,
                    border: `1px solid ${GCP_BLUE}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GoogleG size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: text }}>
                      Connect GCP Account
                    </div>
                    <div style={{ fontSize: 13, color: muted }}>
                      Uses a Service Account key — read-only access, credentials never leave your server
                    </div>
                  </div>
                </div>
              </div>

              {/* Form body */}
              <div style={{ padding: '28px' }}>

                {/* Account name */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 8 }}>
                    Account Display Name <span style={{ color: GCP_RED }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="e.g. Production GCP, my-project-123"
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: subtle, border: `1px solid ${border}`,
                      borderRadius: 10, color: text, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = GCP_BLUE}
                    onBlur={e => e.target.style.borderColor = border}
                  />
                  {parsedProject && (
                    <div style={{ fontSize: 12, color: GCP_GREEN, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={11} /> Auto-detected project: <strong>{parsedProject}</strong>
                    </div>
                  )}
                </div>

                {/* Drag & drop upload zone */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 8 }}>
                    Service Account Key (JSON) <span style={{ color: GCP_RED }}>*</span>
                  </label>

                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${fileName ? GCP_GREEN : border}`,
                      borderRadius: 12, padding: '20px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      cursor: 'pointer', background: fileName ? `${GCP_GREEN}08` : subtle,
                      transition: 'all 0.2s', marginBottom: 12,
                    }}
                    onMouseEnter={e => { if (!fileName) (e.currentTarget as HTMLDivElement).style.borderColor = GCP_BLUE; }}
                    onMouseLeave={e => { if (!fileName) (e.currentTarget as HTMLDivElement).style.borderColor = border; }}
                  >
                    <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
                    {fileName ? (
                      <>
                        <CheckCircle size={22} color={GCP_GREEN} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: GCP_GREEN }}>{fileName}</div>
                        <div style={{ fontSize: 11, color: muted }}>Click to replace</div>
                      </>
                    ) : (
                      <>
                        <Upload size={22} color={muted} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: text }}>Drop your .json key file here</div>
                        <div style={{ fontSize: 12, color: muted }}>or click to browse</div>
                      </>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: border }} />
                    <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>OR PASTE JSON</span>
                    <div style={{ flex: 1, height: 1, background: border }} />
                  </div>

                  {/* JSON textarea */}
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={showJson ? jsonText : (jsonText ? '•'.repeat(Math.min(jsonText.length, 80)) + '…' : '')}
                      onChange={e => showJson && handleJsonChange(e.target.value)}
                      placeholder={`Paste your service account JSON here:\n{\n  "type": "service_account",\n  "project_id": "your-project",\n  "private_key": "...",\n  ...\n}`}
                      rows={6}
                      style={{
                        width: '100%', padding: '12px 44px 12px 14px',
                        background: subtle, border: `1px solid ${border}`,
                        borderRadius: 10, color: text, fontSize: 12,
                        fontFamily: 'monospace', resize: 'vertical',
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => { e.target.style.borderColor = GCP_BLUE; if (!showJson) setShowJson(true); }}
                      onBlur={e => e.target.style.borderColor = border}
                    />
                    <button
                      onClick={() => setShowJson(v => !v)}
                      style={{
                        position: 'absolute', top: 10, right: 12,
                        background: 'none', border: 'none', cursor: 'pointer', color: muted,
                        padding: 4, borderRadius: 4,
                      }}
                      title={showJson ? 'Hide JSON' : 'Show JSON'}
                    >
                      {showJson ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={10} />
                    The JSON is encrypted with AES-256 before being stored. Your key never leaves your server.
                  </div>
                </div>

                {/* Permissions checklist */}
                <div style={{
                  background: subtle, borderRadius: 10, padding: '14px 16px',
                  marginBottom: 24, border: `1px solid ${border}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10 }}>
                    Required IAM Roles
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                    {REQUIRED_ROLES.map(r => (
                      <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChevronRight size={11} color={GCP_BLUE} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: text, fontFamily: 'monospace' }}>{r.role}</div>
                          <div style={{ fontSize: 10, color: muted }}>{r.why}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {status === 'error' && errorMsg && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: '#ef44441a', border: '1px solid #ef444433',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 20,
                  }}>
                    <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: '#ef4444' }}>{errorMsg}</div>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleConnect}
                  disabled={!canSubmit}
                  style={{
                    width: '100%', padding: '13px',
                    background: canSubmit
                      ? `linear-gradient(135deg, ${GCP_BLUE}, ${GCP_GREEN})`
                      : border,
                    border: 'none', borderRadius: 10,
                    color: canSubmit ? '#fff' : muted,
                    fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity 0.15s, transform 0.1s',
                    opacity: canSubmit ? 1 : 0.5,
                  }}
                  onMouseEnter={e => { if (canSubmit) e.currentTarget.style.opacity = '0.92'; }}
                  onMouseLeave={e => { if (canSubmit) e.currentTarget.style.opacity = '1'; }}
                >
                  {status === 'loading' ? (
                    <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Verifying & Connecting…</>
                  ) : (
                    <><GoogleG size={17} /> Connect GCP Account</>
                  )}
                </button>

                <p style={{ fontSize: 11, color: muted, textAlign: 'center', marginTop: 12 }}>
                  CloudGuard only reads your GCP data — it never modifies or deletes resources
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
