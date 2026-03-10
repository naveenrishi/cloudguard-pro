// frontend/src/pages/FinOpsAnomalyFeed.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  X, RefreshCw, Bell, BellOff, Zap, DollarSign, Filter,
  ChevronUp, ChevronDown, Clock, Tag, Play, Eye
} from 'lucide-react';

interface Anomaly {
  id: string;
  service: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  type: 'spike' | 'drop' | 'idle' | 'new_resource';
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentCost: number;
  expectedCost: number;
  delta: number;      // percent
  detectedAt: string;
  status: 'open' | 'acknowledged' | 'resolved';
  description: string;
  resourceId: string;
  tags: string[];
}

const ANOMALIES: Anomaly[] = [
  { id: 'an1', service: 'EC2 - m5.4xlarge fleet', provider: 'aws',   region: 'us-east-1',     type: 'spike',        severity: 'critical', currentCost: 4820, expectedCost: 1100, delta: 338,  detectedAt: '14 min ago', status: 'open',         description: '17 new m5.4xlarge instances launched at 02:14 UTC. No matching deployment event found. Possible runaway autoscale.', resourceId: 'asg-prod-api-v2', tags: ['autoscaling','ec2','prod'] },
  { id: 'an2', service: 'Azure SQL Elastic Pool', provider: 'azure', region: 'eastus',         type: 'spike',        severity: 'high',     currentCost: 2190, expectedCost: 890,  delta: 146,  detectedAt: '1h 2m ago',  status: 'open',         description: 'DTU utilisation hit 100% for 3h. Pool auto-upgraded to Business Critical tier.', resourceId: 'pool-analytics-prod', tags: ['azure','sql','analytics'] },
  { id: 'an3', service: 'GCP BigQuery',           provider: 'gcp',   region: 'us-central1',   type: 'spike',        severity: 'high',     currentCost: 1640, expectedCost: 420,  delta: 290,  detectedAt: '3h ago',     status: 'acknowledged', description: 'Ad-hoc query by user data-team@co scanned 18TB in 2h. No partitioning used.', resourceId: 'bq-dataset-events', tags: ['bigquery','data-team'] },
  { id: 'an4', service: 'AWS NAT Gateway',        provider: 'aws',   region: 'eu-west-1',     type: 'spike',        severity: 'medium',   currentCost: 890,  expectedCost: 210,  delta: 324,  detectedAt: '5h ago',     status: 'open',         description: 'Data transfer spike: 4.2TB outbound in 6h. Possible misconfigured service sending traffic outside VPC.', resourceId: 'nat-gw-eu-prod', tags: ['networking','nat'] },
  { id: 'an5', service: 'Idle RDS Instances',     provider: 'aws',   region: 'us-west-2',     type: 'idle',         severity: 'medium',   currentCost: 640,  expectedCost: 0,    delta: 100,  detectedAt: '2 days ago', status: 'open',         description: '3 RDS instances with 0 connections for 14+ days. Likely dev/staging orphans.', resourceId: 'rds-dev-cluster-old', tags: ['rds','dev','orphan'] },
  { id: 'an6', service: 'New GKE Node Pool',      provider: 'gcp',   region: 'europe-west1',  type: 'new_resource', severity: 'low',      currentCost: 380,  expectedCost: 0,    delta: 100,  detectedAt: '8h ago',     status: 'open',         description: 'Untagged GKE node pool spun up. No owner or project tag. Cost attribution unknown.', resourceId: 'gke-pool-unnamed-3', tags: ['gke','untagged'] },
  { id: 'an7', service: 'Azure Blob Storage',     provider: 'azure', region: 'westeurope',    type: 'drop',         severity: 'low',      currentCost: 12,   expectedCost: 340,  delta: -96,  detectedAt: '1 day ago',  status: 'resolved',     description: 'Blob storage spend dropped 96% — bucket may have been accidentally deleted or lifecycle policy applied.', resourceId: 'sa-backups-prod', tags: ['azure','storage','backup'] },
];

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  medium:   { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  low:      { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
};

const PROVIDER_COLORS: Record<string, string> = {
  aws:   '#f59e0b',
  azure: '#3b82f6',
  gcp:   '#10b981',
};

const PROVIDER_BADGE: Record<string, string> = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

export default function FinOpsAnomalyFeed() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();
  const [anomalies, setAnomalies] = useState<Anomaly[]>(ANOMALIES);
  const [selected, setSelected] = useState<Anomaly | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';

  const totalExcessCost = anomalies.filter(a => a.delta > 0).reduce((s, a) => s + (a.currentCost - a.expectedCost), 0);
  const openCount = anomalies.filter(a => a.status === 'open').length;
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;

  const filtered = anomalies.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (providerFilter !== 'all' && a.provider !== providerFilter) return false;
    return true;
  });

  const acknowledge = (id: string) => setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
  const resolve     = (id: string) => setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
  const kill        = (id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved', currentCost: a.expectedCost } : a));
    if (selected?.id === id) setSelected(null);
  };

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(245,158,11,0.4)' }}>
              <Activity size={26} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>FinOps Anomaly Feed</h1>
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>Account {accountId} · Real-time spend monitoring across AWS, Azure, GCP</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Bell size={14} /> Configure Alerts
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Excess Spend (This Month)', value: `$${totalExcessCost.toLocaleString()}`, icon: <DollarSign size={18} />, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Open Anomalies',            value: `${openCount}`,                          icon: <AlertTriangle size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { label: 'Critical Alerts',           value: `${criticalCount}`,                     icon: <Zap size={18} />,          color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Resolved Today',            value: '3',                                    icon: <CheckCircle2 size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all','critical','high','medium','low'].map(f => (
              <button key={f} onClick={() => setSeverityFilter(f)} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: `1px solid ${severityFilter === f ? '#f59e0b' : border}`, background: severityFilter === f ? 'rgba(245,158,11,0.15)' : 'transparent', color: severityFilter === f ? '#fbbf24' : muted, transition: 'all 0.15s' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ width: 1, background: border }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['all','aws','azure','gcp'].map(f => (
              <button key={f} onClick={() => setProviderFilter(f)} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: `1px solid ${providerFilter === f ? PROVIDER_COLORS[f] || '#6366f1' : border}`, background: providerFilter === f ? (PROVIDER_COLORS[f] || '#6366f1') + '22' : 'transparent', color: providerFilter === f ? (PROVIDER_COLORS[f] || '#818cf8') : muted, transition: 'all 0.15s' }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 18 }}>

          {/* Anomaly Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(a => {
              const sev = SEVERITY_STYLES[a.severity];
              const isPositive = a.delta > 0;
              return (
                <div key={a.id}
                  onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  style={{
                    background: a.status === 'resolved' ? (isDark ? '#0d111a' : '#f9fafb') : card,
                    border: `1px solid ${selected?.id === a.id ? '#f59e0b' : border}`,
                    borderLeft: `3px solid ${sev.text}`,
                    borderRadius: 14, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s',
                    opacity: a.status === 'resolved' ? 0.65 : 1,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`, fontWeight: 600 }}>{a.severity.toUpperCase()}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: PROVIDER_COLORS[a.provider] + '22', color: PROVIDER_COLORS[a.provider], fontWeight: 600 }}>{PROVIDER_BADGE[a.provider]}</span>
                        <span style={{ fontSize: 11, color: muted }}>{a.region}</span>
                        <span style={{ fontSize: 11, color: muted, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{a.detectedAt}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{a.service}</p>
                      <p style={{ fontSize: 12, color: muted, margin: 0 }}>{a.description.substring(0, 100)}...</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: 18, fontWeight: 700, color: isPositive ? '#ef4444' : '#10b981' }}>
                        {isPositive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isPositive ? '+' : ''}{a.delta}%
                      </div>
                      <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>${a.currentCost.toLocaleString()}/mo</p>
                      {a.status !== 'resolved' && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button onClick={e => { e.stopPropagation(); kill(a.id); }} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Kill it
                          </button>
                          {a.status === 'open' && (
                            <button onClick={e => { e.stopPropagation(); acknowledge(a.id); }} style={{ padding: '4px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 11, cursor: 'pointer' }}>
                              Ack
                            </button>
                          )}
                        </div>
                      )}
                      {a.status === 'resolved' && <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}><CheckCircle2 size={11} />Resolved</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Anomaly Detail</p>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}><X size={16} /></button>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{selected.service}</p>
                <p style={{ fontSize: 12, color: muted, marginBottom: 14, lineHeight: 1.6 }}>{selected.description}</p>

                {/* Cost comparison */}
                <div style={{ background: isDark ? '#0d1117' : '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>Expected</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981', margin: 0 }}>${selected.expectedCost.toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>Actual</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', margin: 0 }}>${selected.currentCost.toLocaleString()}</p>
                    </div>
                  </div>
                  <div style={{ background: border, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #10b981, #ef4444)', width: `${Math.min(100, (selected.currentCost / (selected.currentCost + 200)) * 100)}%` }} />
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {selected.tags.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: isDark ? '#1f2937' : '#f3f4f6', color: muted, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag size={9} />{t}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => kill(selected.id)} style={{ padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Zap size={13} /> Kill Resource
                  </button>
                  <button onClick={() => resolve(selected.id)} style={{ padding: '9px 0', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
                    Mark Resolved
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
