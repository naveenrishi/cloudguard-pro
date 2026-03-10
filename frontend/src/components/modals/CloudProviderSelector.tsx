// src/components/modals/CloudProviderSelector.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { X, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── AWS logo ──────────────────────────────────────────────────────────────────
const AWSLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M14.6 21.4c0 .7.1 1.3.3 1.7.2.4.5.8.9 1.2.1.1.2.3.2.4 0 .2-.1.3-.4.5l-1.2.8c-.2.1-.3.2-.5.2-.2 0-.3-.1-.5-.2-.2-.2-.4-.5-.6-.7-.2-.3-.3-.6-.5-.9-1.2 1.4-2.7 2.1-4.5 2.1-1.3 0-2.3-.4-3.1-1.1-.8-.7-1.1-1.7-1.1-2.9 0-1.3.4-2.3 1.3-3.1.9-.8 2.1-1.2 3.6-1.2.5 0 1 0 1.5.1s1 .2 1.6.3v-1c0-1-.2-1.8-.7-2.2-.5-.4-1.3-.6-2.4-.6-.5 0-1 .1-1.5.2-.5.2-1 .4-1.5.6-.2.1-.4.2-.5.2-.1 0-.2-.1-.3-.3l-.4-1.2c-.1-.2-.1-.4.1-.5.5-.3 1.2-.5 1.9-.7.7-.2 1.5-.3 2.3-.3 1.8 0 3.1.4 3.9 1.2.8.8 1.2 2 1.2 3.6v4.7zm-6.2 2.3c.5 0 1-.1 1.6-.3.5-.2 1-.5 1.4-1 .2-.3.4-.6.5-1 .1-.4.2-.8.2-1.3v-.6c-.4-.1-.8-.2-1.3-.2-.4-.1-.9-.1-1.3-.1-.9 0-1.6.2-2.1.5-.5.4-.7.9-.7 1.6 0 .6.2 1.1.5 1.4.3.4.7.5 1.2.5v.5zm11.5 1.6c-.2 0-.4-.1-.5-.2-.1-.1-.2-.4-.3-.6L16 14.8c-.1-.3-.1-.5 0-.6.1-.1.2-.2.5-.2h1.8c.2 0 .4.1.5.2.1.1.2.3.2.6l2.5 9.8 2.3-9.8c.1-.3.1-.5.3-.6.1-.1.3-.2.5-.2h1.5c.2 0 .4.1.5.2.1.1.2.3.2.6l2.3 9.9 2.5-9.9c.1-.3.2-.5.3-.6.1-.1.3-.2.5-.2h1.7c.2 0 .4.1.5.2.1.1.1.3 0 .6l-3.7 10.7c-.1.3-.2.5-.3.6-.1.1-.3.2-.5.2h-1.6c-.2 0-.4-.1-.5-.2-.1-.1-.2-.4-.3-.6L27 16.1l-2.2 9.5c-.1.3-.2.5-.3.6-.1.1-.3.2-.5.2h-1.7v-.5zm19.9.4c-1 0-1.9-.2-2.7-.5-.8-.3-1.4-.7-1.9-1.2-.1-.1-.2-.2-.2-.4 0-.1.1-.3.2-.4l.9-1.2c.1-.1.2-.2.4-.2.1 0 .3.1.4.2.4.3.9.6 1.4.8.5.2 1.1.3 1.7.3.7 0 1.2-.1 1.6-.4.4-.3.6-.6.6-1.1 0-.3-.1-.6-.3-.8-.2-.2-.6-.4-1.2-.6l-1.7-.5c-.9-.3-1.6-.7-2.1-1.2-.5-.5-.7-1.2-.7-2 0-.6.2-1.1.5-1.6.3-.5.8-.9 1.4-1.2.6-.3 1.3-.4 2-.4.7 0 1.4.1 2 .3.6.2 1.1.5 1.5.9.1.1.2.2.2.4 0 .1-.1.3-.2.4l-.8 1.1c-.1.2-.3.2-.4.2-.1 0-.2 0-.4-.1-.3-.2-.7-.4-1-.5-.4-.1-.7-.2-1.1-.2-.6 0-1 .1-1.4.4-.3.2-.5.6-.5 1 0 .3.1.6.4.8.2.2.6.4 1.2.6l1.7.5c.9.3 1.6.7 2.1 1.2.4.5.7 1.2.7 2.1 0 .6-.2 1.2-.5 1.7-.3.5-.8.9-1.5 1.2-.6.3-1.4.4-2.3.4z" fill="#FF9900"/>
  </svg>
);

// ── Azure logo ────────────────────────────────────────────────────────────────
const AzureLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M17 7l-8 22 12 4L17 7z" fill="#0089D6"/>
    <path d="M17 7l14 7-12 18-11-3 9-22z" fill="#0072C6"/>
    <path d="M31 14L19 25l12 16 10-27H31z" fill="#0089D6"/>
  </svg>
);

// ── Google G logo ─────────────────────────────────────────────────────────────
const GoogleG: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#4285F4" d="M44.5 20H24v8h11.7C34.2 33.6 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.1 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.1-2.7-.5-4z"/>
    <path fill="#EA4335" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.1 5.1 29.3 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z"/>
    <path fill="#FBBC05" d="M24 45c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 36.5 26.9 37 24 37c-5.5 0-10.2-3.4-11.7-8.2l-6.6 5.1C9.4 40.5 16.2 45 24 45z"/>
    <path fill="#34A853" d="M44.5 20H24v8h11.7c-.7 2.1-1.9 3.9-3.5 5.2l6.2 5.2C41.7 35.5 45 30.2 45 24c0-1.3-.1-2.7-.5-4z"/>
  </svg>
);

const PROVIDERS = [
  {
    id:       'aws',
    name:     'Amazon Web Services',
    short:    'AWS',
    logo:     AWSLogo,
    route:    '/connect-aws',
    color:    '#FF9900',
    bg:       '#FF990015',
    border:   '#FF990030',
    auth:     'Access Key + Secret Key',
    features: ['EC2, RDS, S3', 'Cost Explorer', 'IAM Security', 'Trusted Advisor'],
  },
  {
    id:       'azure',
    name:     'Microsoft Azure',
    short:    'Azure',
    logo:     AzureLogo,
    route:    '/connect-azure',
    color:    '#0089D6',
    bg:       '#0089D615',
    border:   '#0089D630',
    auth:     'Service Principal (Tenant + Client + Secret)',
    features: ['Virtual Machines', 'Cost Management', 'Security Center', 'Advisor'],
  },
  {
    id:       'gcp',
    name:     'Google Cloud Platform',
    short:    'GCP',
    logo:     GoogleG,
    route:    '/connect-gcp',
    color:    '#4285F4',
    bg:       '#4285F415',
    border:   '#4285F430',
    auth:     'Service Account JSON Key',
    features: ['Compute Engine', 'Cloud Billing', 'Security Command Center', 'Cloud Storage'],
  },
];

export default function CloudProviderSelector({ isOpen, onClose }: Props) {
  const navigate   = useNavigate();
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const bg     = isDark ? 'rgba(0,0,0,0.7)'  : 'rgba(0,0,0,0.4)';
  const card   = isDark ? '#111827'           : '#ffffff';
  const border = isDark ? '#1f2937'           : '#e5e7eb';
  const text   = isDark ? '#f9fafb'           : '#111827';
  const muted  = isDark ? '#6b7280'           : '#6b7280';
  const subtle = isDark ? '#1f2937'           : '#f9fafb';

  const handleSelect = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: card, borderRadius: 20,
        border: `1px solid ${border}`,
        width: '100%', maxWidth: 680,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.2s ease',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px', borderBottom: `1px solid ${border}`,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: text }}>Connect Cloud Account</div>
            <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>
              Choose your cloud provider to get started
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: subtle, border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: muted,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = border}
            onMouseLeave={e => e.currentTarget.style.background = subtle}
          >
            <X size={16} />
          </button>
        </div>

        {/* Provider cards */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROVIDERS.map((p) => {
            const Logo = p.logo;
            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p.route)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  background: subtle, border: `1px solid ${border}`,
                  borderRadius: 14, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = p.bg;
                  el.style.borderColor = p.border;
                  el.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = subtle;
                  el.style.borderColor = border;
                  el.style.transform = 'translateX(0)';
                }}
              >
                {/* Logo */}
                <div style={{
                  width: 52, height: 52, flexShrink: 0, borderRadius: 12,
                  background: p.bg, border: `1px solid ${p.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Logo size={30} />
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: text }}>{p.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px',
                      background: p.bg, color: p.color, borderRadius: 4,
                      border: `1px solid ${p.border}`,
                    }}>{p.short}</span>
                  </div>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>
                    Auth: <span style={{ color: p.color, fontWeight: 500 }}>{p.auth}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.features.map(f => (
                      <span key={f} style={{
                        fontSize: 10, padding: '2px 7px',
                        background: isDark ? '#1f2937' : '#f3f4f6',
                        color: muted, borderRadius: 4,
                      }}>{f}</span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight size={18} color={muted} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px', borderTop: `1px solid ${border}`,
          background: isDark ? '#0b1120' : '#f9fafb',
          fontSize: 12, color: muted, textAlign: 'center',
        }}>
          🔒 All credentials are encrypted with AES-256 and stored securely on your server
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
