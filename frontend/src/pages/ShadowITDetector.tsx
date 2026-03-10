// frontend/src/pages/ShadowITDetector.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Ghost, AlertTriangle, Code2, CheckCircle2, RefreshCw,
  Search, Tag, Clock, DollarSign, Server, Cloud,
  Database, Shield, X, ChevronRight, Download, UserX
} from 'lucide-react';

interface ShadowResource {
  id: string;
  name: string;
  type: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  cost: number;
  age: string;
  owner: string | null;
  team: string | null;
  tags: Record<string, string>;
  missingTags: string[];
  riskScore: number;
  lastActivity: string;
  terraform?: string;
}

const SHADOWS: ShadowResource[] = [
  { id: 's1', name: 'unnamed-ec2-i-0abc123', type: 'EC2 Instance',     provider: 'aws',   region: 'us-east-1',   cost: 340,  age: '47 days',  owner: null,              team: null,        tags: { env: 'unknown' }, missingTags: ['owner','project','team','cost-center'], riskScore: 9, lastActivity: '3 days ago',  terraform: `resource "aws_instance" "unnamed_ec2" {\n  ami           = "ami-0c55b159cbfafe1f0"\n  instance_type = "m5.xlarge"\n  tags = {\n    Name        = "unnamed-ec2-i-0abc123"\n    Owner       = "UNKNOWN"\n    Project     = "UNKNOWN"\n  }\n}` },
  { id: 's2', name: 'gke-pool-unnamed-3',   type: 'GKE Node Pool',    provider: 'gcp',   region: 'europe-west1', cost: 380,  age: '8 hours',  owner: null,              team: null,        tags: {},                missingTags: ['owner','project','env','cost-center'],  riskScore: 8, lastActivity: '1 hour ago',  terraform: `resource "google_container_node_pool" "unnamed" {\n  name       = "gke-pool-unnamed-3"\n  cluster    = "prod-cluster"\n  node_count = 3\n}` },
  { id: 's3', name: 'dev-sql-01-forgotten', type: 'Azure SQL Server',  provider: 'azure', region: 'eastus',       cost: 210,  age: '91 days',  owner: 'ex-employee@co',  team: 'unknown',   tags: { created_by: 'lsmith' }, missingTags: ['project','cost-center'],             riskScore: 7, lastActivity: '2 months ago' },
  { id: 's4', name: 'random-s3-xk291lp',   type: 'S3 Bucket',        provider: 'aws',   region: 'us-west-2',    cost: 48,   age: '12 days',  owner: null,              team: null,        tags: {},                missingTags: ['owner','project','env','cost-center'],  riskScore: 6, lastActivity: '2 days ago' },
  { id: 's5', name: 'test-cluster-3',       type: 'EKS Cluster',      provider: 'aws',   region: 'ap-south-1',   cost: 620,  age: '22 days',  owner: 'devops@co',       team: 'DevOps',    tags: { env: 'test' },   missingTags: ['project','cost-center'],              riskScore: 8, lastActivity: '5 days ago' },
  { id: 's6', name: 'old-storage-account',  type: 'Azure Blob Storage',provider: 'azure', region: 'westeurope',   cost: 32,   age: '180 days', owner: 'ex-employee2@co', team: null,        tags: { created_by: 'jdoe' }, missingTags: ['project','cost-center','env'],       riskScore: 5, lastActivity: '45 days ago' },
  { id: 's7', name: 'scratch-bq-dataset',   type: 'BigQuery Dataset', provider: 'gcp',   region: 'us-central1',  cost: 140,  age: '6 days',   owner: 'analyst@co',      team: 'Analytics', tags: { created_by: 'analyst' }, missingTags: ['project','cost-center'],         riskScore: 4, lastActivity: 'Today' },
];

const PROVIDER_COLORS: Record<string, string> = { aws: '#f59e0b', azure: '#3b82f6', gcp: '#10b981' };
const TYPE_ICONS: Record<string, React.ReactNode> = {
  'EC2 Instance': <Server size={14} />, 'GKE Node Pool': <Cloud size={14} />, 'Azure SQL Server': <Database size={14} />,
  'S3 Bucket': <Cloud size={14} />, 'EKS Cluster': <Server size={14} />, 'Azure Blob Storage': <Cloud size={14} />,
  'BigQuery Dataset': <Database size={14} />,
};

const RISK_COLOR = (score: number) =>
  score >= 8 ? '#ef4444' : score >= 6 ? '#f59e0b' : '#6366f1';

export default function ShadowITDetector() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();
  const [shadows, setShadows] = useState<ShadowResource[]>(SHADOWS);
  const [selected, setSelected] = useState<ShadowResource | null>(null);
  const [search, setSearch] = useState('');
  const [tagging, setTagging] = useState<string | null>(null);

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';

  const totalCost   = shadows.reduce((s, r) => s + r.cost, 0);
  const noOwner     = shadows.filter(r => !r.owner).length;
  const highRisk    = shadows.filter(r => r.riskScore >= 8).length;

  const filtered = shadows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase()));

  const dismiss = (id: string) => { setShadows(p => p.filter(r => r.id !== id)); if (selected?.id === id) setSelected(null); };

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>
              <Ghost size={26} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Shadow IT Detector</h1>
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>Account {accountId} · Unmanaged resources found across all clouds</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Re-scan
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Code2 size={14} /> Export Terraform All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Shadow Resources', value: shadows.length, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
            { label: 'Monthly Waste',    value: `$${totalCost.toLocaleString()}`, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'No Owner',         value: noOwner, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { label: 'High Risk',        value: highRisk, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shadow resources..." style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, background: card, border: `1px solid ${border}`, color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 18 }}>

          {/* Resource Table */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: 0, padding: '10px 18px', borderBottom: `1px solid ${border}`, fontSize: 11, color: muted, fontWeight: 600 }}>
              {['RESOURCE', 'TYPE', 'COST/MO', 'AGE', 'RISK', 'ACTIONS'].map(h => <span key={h}>{h}</span>)}
            </div>
            {filtered.map((r, i) => (
              <div key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                  gap: 0, padding: '12px 18px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none',
                  background: selected?.id === r.id ? (isDark ? '#1a2540' : '#eef2ff') : 'transparent',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}>
                {/* Name */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: PROVIDER_COLORS[r.provider] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PROVIDER_COLORS[r.provider], flexShrink: 0 }}>
                      {TYPE_ICONS[r.type]}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{r.name}</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>{r.region}</p>
                    </div>
                  </div>
                </div>
                {/* Type */}
                <span style={{ fontSize: 11, color: muted }}>{r.type}</span>
                {/* Cost */}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>${r.cost}</span>
                {/* Age */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted }}>
                  <Clock size={11} /> {r.age}
                </div>
                {/* Risk Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, maxWidth: 60, background: isDark ? '#1f2937' : '#f3f4f6', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${r.riskScore * 10}%`, height: '100%', background: RISK_COLOR(r.riskScore), borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLOR(r.riskScore) }}>{r.riskScore}/10</span>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {r.terraform && (
                    <button title="Generate Terraform" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Code2 size={12} />
                    </button>
                  )}
                  <button onClick={() => dismiss(r.id)} title="Dismiss" style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Resource Detail</p>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: PROVIDER_COLORS[selected.provider] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PROVIDER_COLORS[selected.provider] }}>
                    {TYPE_ICONS[selected.type]}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{selected.name}</p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>{selected.type} · {selected.region}</p>
                  </div>
                </div>

                {/* Missing Tags */}
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, margin: '0 0 6px' }}>⚠️ Missing {selected.missingTags.length} Required Tags</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {selected.missingTags.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* Owner info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[['Owner', selected.owner || 'Unknown'], ['Team', selected.team || 'Unknown'], ['Monthly Cost', `$${selected.cost}`], ['Last Activity', selected.lastActivity]].map(([k, v]) => (
                    <div key={k} style={{ background: isDark ? '#0d1117' : '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                      <p style={{ fontSize: 10, color: muted, margin: '0 0 2px' }}>{k}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: v === 'Unknown' ? '#f87171' : text }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Terraform */}
                {selected.terraform && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}><Code2 size={12} />Generated Terraform</p>
                    <pre style={{ background: isDark ? '#0d1117' : '#1e293b', color: '#e2e8f0', fontSize: 10.5, padding: 12, borderRadius: 10, overflow: 'auto', margin: 0, lineHeight: 1.6 }}>{selected.terraform}</pre>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button style={{ padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Tag size={12} /> Auto-Tag
                  </button>
                  <button onClick={() => dismiss(selected.id)} style={{ padding: '9px 0', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <X size={12} /> Terminate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
