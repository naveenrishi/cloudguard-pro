// frontend/src/pages/FinOpsAnomalyFeed.tsx
// Anomalies are derived from REAL monthly cost trend data.
// Spike = current month > 20% above rolling average.
// Concentration risk = single service > 40% of total spend.
// Forecast overage = forecast > 125% of month-to-date.
// Falls back to 7 rich demo anomalies if API is unreachable.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  X, RefreshCw, Bell, BellOff, Zap, DollarSign, Filter,
  ChevronUp, ChevronDown, Clock, Tag, Play, Eye
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://cloudguard-pro.onrender.com';

interface Anomaly {
  id: string;
  service: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  type: 'spike' | 'drop' | 'idle' | 'new_resource';
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentCost: number;
  expectedCost: number;
  delta: number;
  detectedAt: string;
  status: 'open' | 'acknowledged' | 'resolved';
  description: string;
  resourceId: string;
  tags: string[];
}

// ── Demo fallback data ────────────────────────────────────────────────────
const DEMO_ANOMALIES: Anomaly[] = [
  { id: 'an1', service: 'EC2 — m5.4xlarge fleet',  provider: 'aws',   region: 'us-east-1',    type: 'spike',        severity: 'critical', currentCost: 4820, expectedCost: 1100, delta: 338,  detectedAt: '14 min ago',  status: 'open',         description: '17 new m5.4xlarge instances launched at 02:14 UTC. No matching deployment event found. Possible runaway autoscale.', resourceId: 'asg-prod-api-v2', tags: ['autoscaling','ec2','prod'] },
  { id: 'an2', service: 'Azure SQL Elastic Pool',   provider: 'azure', region: 'eastus',        type: 'spike',        severity: 'high',     currentCost: 2190, expectedCost: 890,  delta: 146,  detectedAt: '1h 2m ago',   status: 'open',         description: 'DTU utilisation hit 100% for 3h. Pool auto-upgraded to Business Critical tier.', resourceId: 'pool-analytics-prod', tags: ['azure','sql','analytics'] },
  { id: 'an3', service: 'GCP BigQuery',             provider: 'gcp',   region: 'us-central1',  type: 'spike',        severity: 'high',     currentCost: 1640, expectedCost: 420,  delta: 290,  detectedAt: '3h ago',      status: 'acknowledged', description: 'Ad-hoc query scanned 18TB in 2h. No partitioning used.', resourceId: 'bq-dataset-events', tags: ['bigquery','data-team'] },
  { id: 'an4', service: 'AWS NAT Gateway',          provider: 'aws',   region: 'eu-west-1',    type: 'spike',        severity: 'medium',   currentCost: 890,  expectedCost: 210,  delta: 324,  detectedAt: '5h ago',      status: 'open',         description: 'Data transfer spike: 4.2TB outbound in 6h. Possible misconfigured service.', resourceId: 'nat-gw-eu-prod', tags: ['networking','nat'] },
  { id: 'an5', service: 'Idle RDS Instances',       provider: 'aws',   region: 'us-west-2',    type: 'idle',         severity: 'medium',   currentCost: 640,  expectedCost: 0,    delta: 100,  detectedAt: '2 days ago',  status: 'open',         description: '3 RDS instances with 0 connections for 14+ days. Likely dev/staging orphans.', resourceId: 'rds-dev-cluster-old', tags: ['rds','dev','orphan'] },
  { id: 'an6', service: 'New GKE Node Pool',        provider: 'gcp',   region: 'europe-west1', type: 'new_resource', severity: 'low',      currentCost: 380,  expectedCost: 0,    delta: 100,  detectedAt: '8h ago',      status: 'open',         description: 'Untagged GKE node pool spun up. No owner or project tag. Cost attribution unknown.', resourceId: 'gke-pool-unnamed-3', tags: ['gke','untagged'] },
  { id: 'an7', service: 'Azure Blob Storage',       provider: 'azure', region: 'westeurope',   type: 'drop',         severity: 'low',      currentCost: 12,   expectedCost: 340,  delta: -96,  detectedAt: '1 day ago',   status: 'resolved',     description: 'Blob storage spend dropped 96% — bucket may have been accidentally deleted.', resourceId: 'sa-backups-prod', tags: ['azure','storage','backup'] },
];

// ── Anomaly derivation from real cost data ────────────────────────────────
function deriveAnomalies(
  costData: any,
  accountName: string,
  provider: string,
  accountId: string
): Anomaly[] {
  const results: Anomaly[]  = [];
  const monthly: any[]      = costData?.monthlyData || [];
  const services: any[]     = costData?.services    || [];
  const prov = provider.toLowerCase() as Anomaly['provider'];

  // 1. Monthly spend spike / drop (>20% deviation from rolling average)
  if (monthly.length >= 3) {
    const history = monthly.slice(0, -1);
    const avg     = history.reduce((s: number, m: any) => s + (m.total || 0), 0) / history.length;
    const last    = monthly[monthly.length - 1];
    const pct     = avg > 0 ? Math.round(((last.total - avg) / avg) * 100) : 0;

    if (Math.abs(pct) > 20) {
      const isSpike = pct > 0;
      results.push({
        id:           `anomaly-monthly-${accountId}`,
        service:      `${accountName} — Total Spend`,
        provider:     prov,
        region:       costData?.region || 'multi-region',
        type:         isSpike ? 'spike' : 'drop',
        severity:     Math.abs(pct) > 60 ? 'critical' : Math.abs(pct) > 35 ? 'high' : 'medium',
        currentCost:  Math.round(last.total),
        expectedCost: Math.round(avg),
        delta:        pct,
        detectedAt:   `${last.month || 'This month'}`,
        status:       'open',
        description:  isSpike
          ? `Total spend is $${Math.round(last.total).toLocaleString()}, which is ${pct}% above the ${history.length}-month rolling average of $${Math.round(avg).toLocaleString()}.`
          : `Total spend dropped ${Math.abs(pct)}% below average — possible resource deprovisioning or billing gap.`,
        resourceId:   accountId,
        tags:         [prov, accountName.toLowerCase().replace(/\s+/g, '-')],
      });
    }
  }

  // 2. Per-service concentration risk (>40% of total)
  const totalCost = services.reduce((s: number, sv: any) => s + sv.cost, 0);
  services.forEach((svc: any) => {
    const pct = totalCost > 0 ? Math.round((svc.cost / totalCost) * 100) : 0;
    if (pct > 40 && svc.cost > 80) {
      results.push({
        id:           `anomaly-svc-${accountId}-${svc.name}`,
        service:      `${svc.name} — Concentration Risk`,
        provider:     prov,
        region:       svc.region || 'us-east-1',
        type:         'spike',
        severity:     pct > 60 ? 'high' : 'medium',
        currentCost:  Math.round(svc.cost),
        expectedCost: Math.round(totalCost * 0.3),
        delta:        pct,
        detectedAt:   'This month',
        status:       'open',
        description:  `${svc.name} accounts for ${pct}% of total account spend ($${Math.round(svc.cost).toLocaleString()}). Single-service concentration increases cost volatility risk.`,
        resourceId:   svc.name,
        tags:         [prov, svc.name.toLowerCase().replace(/\s+/g, '-'), 'concentration'],
      });
    }
  });

  // 3. Forecast overage (forecast > 125% of MTD)
  const forecast     = costData?.forecast             || 0;
  const currentMonth = costData?.currentMonthTotal    || 0;
  if (forecast > currentMonth * 1.25 && forecast > 150) {
    const pct = Math.round(((forecast - currentMonth) / currentMonth) * 100);
    results.push({
      id:           `anomaly-forecast-${accountId}`,
      service:      `${accountName} — Forecast Overage`,
      provider:     prov,
      region:       'multi-region',
      type:         'spike',
      severity:     forecast > currentMonth * 1.5 ? 'high' : 'medium',
      currentCost:  Math.round(forecast),
      expectedCost: Math.round(currentMonth),
      delta:        pct,
      detectedAt:   'Forecast',
      status:       'open',
      description:  `Month-end forecast is $${Math.round(forecast).toLocaleString()}, ${pct}% above current MTD of $${Math.round(currentMonth).toLocaleString()}.`,
      resourceId:   accountId,
      tags:         [prov, 'forecast', 'overage'],
    });
  }

  return results;
}

// ── Styles ────────────────────────────────────────────────────────────────
const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  medium:   { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  low:      { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
};
const PROVIDER_COLORS: Record<string, string> = { aws: '#f59e0b', azure: '#3b82f6', gcp: '#10b981' };
const PROVIDER_BADGE:  Record<string, string> = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

// ─────────────────────────────────────────────────────────────────────────
export default function FinOpsAnomalyFeed() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();

  const [anomalies, setAnomalies]     = useState<Anomaly[]>(DEMO_ANOMALIES);
  const [isLive, setIsLive]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Anomaly | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [refreshing, setRefreshing]   = useState(false);

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';
  const token  = localStorage.getItem('token');

  const loadData = async () => {
    setLoading(true);
    try {
      // Get account info for name / provider
      const [costRes, accRes] = await Promise.all([
        fetch(`${API}/api/cloud/accounts/${accountId}/costs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/cloud/accounts`,                    { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!costRes.ok) throw new Error('costs failed');

      const costData: any = await costRes.json();
      const accData:  any = accRes.ok ? await accRes.json() : {};
      const accounts: any[] = accData.accounts || accData || [];
      const account = accounts.find((a: any) => a.id === accountId) || { accountName: 'Cloud Account', provider: 'AWS' };

      const derived = deriveAnomalies(costData, account.accountName, account.provider || 'AWS', accountId || '');
      if (!derived.length) throw new Error('nothing derived');

      setAnomalies(derived);
      setIsLive(true);
    } catch {
      setAnomalies(DEMO_ANOMALIES);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [accountId]);

  const refresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const acknowledge = (id: string) => setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
  const resolve     = (id: string) => setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
  const kill        = (id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved', currentCost: a.expectedCost } : a));
    if (selected?.id === id) setSelected(null);
  };

  const totalExcessCost = anomalies.filter(a => a.delta > 0).reduce((s, a) => s + Math.max(0, a.currentCost - a.expectedCost), 0);
  const openCount       = anomalies.filter(a => a.status === 'open').length;
  const criticalCount   = anomalies.filter(a => a.severity === 'critical').length;

  const filtered = anomalies.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (providerFilter !== 'all' && a.provider !== providerFilter) return false;
    return true;
  });

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
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>
                {loading ? 'Analysing spend patterns…' : isLive
                  ? `${anomalies.length} real anomalies detected from cost trend data`
                  : 'Demo data · connect account for live anomaly detection'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLive && !loading && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', alignSelf: 'center' }}>Demo mode</span>
            )}
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
            { label: 'Open Anomalies',            value: `${openCount}`,                         icon: <AlertTriangle size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { label: 'Critical Alerts',           value: `${criticalCount}`,                    icon: <Zap size={18} />,          color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Resolved Today',            value: `${anomalies.filter(a => a.status === 'resolved').length}`, icon: <CheckCircle2 size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
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
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, background: card, borderRadius: 16, border: `1px solid ${border}` }}>
                <CheckCircle2 size={28} color="#10b981" style={{ marginBottom: 10 }} />
                <p style={{ color: text, fontWeight: 600, margin: '0 0 4px' }}>No anomalies matching filter</p>
                <p style={{ color: muted, fontSize: 13, margin: 0 }}>Try adjusting severity or provider filters.</p>
              </div>
            )}
            {filtered.map(a => {
              const sev        = SEVERITY_STYLES[a.severity];
              const isPositive = a.delta > 0;
              const pCol       = PROVIDER_COLORS[a.provider] || '#6366f1';
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
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: pCol + '22', color: pCol, fontWeight: 600 }}>{PROVIDER_BADGE[a.provider]}</span>
                        <span style={{ fontSize: 11, color: muted }}>{a.region}</span>
                        <span style={{ fontSize: 11, color: muted, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{a.detectedAt}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{a.service}</p>
                      <p style={{ fontSize: 12, color: muted, margin: 0 }}>{a.description.substring(0, 100)}{a.description.length > 100 ? '…' : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: 18, fontWeight: 700, color: isPositive ? '#ef4444' : '#10b981' }}>
                        {isPositive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isPositive ? '+' : ''}{a.delta}%
                      </div>
                      <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>${a.currentCost.toLocaleString()}/mo</p>
                      {a.status !== 'resolved' && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button onClick={e => { e.stopPropagation(); kill(a.id); }} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Kill it</button>
                          {a.status === 'open' && (
                            <button onClick={e => { e.stopPropagation(); acknowledge(a.id); }} style={{ padding: '4px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 11, cursor: 'pointer' }}>Ack</button>
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
