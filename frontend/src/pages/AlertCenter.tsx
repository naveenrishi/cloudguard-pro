// frontend/src/pages/AlertCenter.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Bell, BellRing, AlertTriangle, AlertCircle, CheckCircle, XCircle,
  RefreshCw, Plus, Settings, Trash2, ExternalLink, Mail, Webhook,
  Ticket, ChevronDown, ChevronUp, Clock, Cpu, DollarSign, Shield,
  Key, Server, TrendingUp, Filter, Search, Eye, EyeOff, Zap,
  Cloud, Globe, Database,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const token = () => localStorage.getItem('accessToken') || localStorage.getItem('token') || '';

// ── Alert type definitions ────────────────────────────────────────────────────
const ALERT_TYPES = [
  { value: 'COST_SPIKE',        label: 'Cost Spike',          icon: DollarSign, color: '#ef4444', desc: 'Triggered when spend increases >X% vs previous period' },
  { value: 'CPU_SPIKE',         label: 'CPU Spike',           icon: Cpu,        color: '#f97316', desc: 'Triggered when CPU utilization exceeds threshold' },
  { value: 'MEMORY_SPIKE',      label: 'Memory Spike',        icon: Server,     color: '#f97316', desc: 'Triggered when memory usage exceeds threshold' },
  { value: 'BUDGET_THRESHOLD',  label: 'Budget Threshold',    icon: TrendingUp, color: '#eab308', desc: 'Triggered when budget utilization exceeds X%' },
  { value: 'IAM_KEY_EXPIRY',    label: 'IAM Key Expiration',  icon: Key,        color: '#8b5cf6', desc: 'Alert X days before access key expires' },
  { value: 'CERT_EXPIRY',       label: 'SSL Cert Expiration', icon: Shield,     color: '#8b5cf6', desc: 'Alert X days before certificate expires' },
  { value: 'IDLE_RESOURCE',     label: 'Idle Resource',       icon: Database,   color: '#6b7280', desc: 'Triggered when resource CPU <5% for X days' },
  { value: 'SECURITY_FINDING',  label: 'Security Finding',    icon: AlertCircle,color: '#ef4444', desc: 'Triggered on new CRITICAL/HIGH security findings' },
  { value: 'ACCOUNT_DISCONNECT',label: 'Account Disconnect',  icon: Cloud,      color: '#6b7280', desc: 'Triggered when a cloud account loses connection' },
  { value: 'NUKE_SCHEDULED',    label: 'Nuke Scheduled',      icon: Zap,        color: '#ef4444', desc: 'Warning before a scheduled nuke run' },
];

const SEV_CONFIG: Record<string, any> = {
  CRITICAL: { label: 'Critical', bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#ef4444' },
  HIGH:     { label: 'High',     bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', dot: '#f97316' },
  MEDIUM:   { label: 'Medium',   bg: '#fefce8', color: '#ca8a04', border: '#fde68a', dot: '#eab308' },
  LOW:      { label: 'Low',      bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', dot: '#3b82f6' },
};

const STATUS_CONFIG: Record<string, any> = {
  OPEN:         { label: 'Open',         bg: '#fef2f2', color: '#dc2626' },
  ACKNOWLEDGED: { label: 'Acknowledged', bg: '#fff7ed', color: '#ea580c' },
  RESOLVED:     { label: 'Resolved',     bg: '#f0fdf4', color: '#16a34a' },
};

// ── Mock alert rules (would come from DB in production) ──────────────────────
const DEFAULT_RULES = [
  { id: '1', type: 'COST_SPIKE',       name: 'Daily Cost Spike',     threshold: 20,  unit: '%',   enabled: true,  notify: ['email'], provider: 'ALL' },
  { id: '2', type: 'CPU_SPIKE',        name: 'High CPU Alert',        threshold: 85,  unit: '%',   enabled: true,  notify: ['email'], provider: 'AWS' },
  { id: '3', type: 'BUDGET_THRESHOLD', name: 'Budget 80% Warning',    threshold: 80,  unit: '%',   enabled: true,  notify: ['email', 'servicenow'], provider: 'ALL' },
  { id: '4', type: 'IAM_KEY_EXPIRY',   name: 'IAM Key Expiry',        threshold: 30,  unit: 'days',enabled: true,  notify: ['email'], provider: 'AWS' },
  { id: '5', type: 'SECURITY_FINDING', name: 'Critical Security',     threshold: 0,   unit: '',    enabled: true,  notify: ['email', 'servicenow'], provider: 'ALL' },
  { id: '6', type: 'IDLE_RESOURCE',    name: 'Idle Resource >7 days', threshold: 7,   unit: 'days',enabled: false, notify: ['email'], provider: 'ALL' },
];

export default function AlertCenter() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState<'alerts'|'rules'>('alerts');
  const [alerts, setAlerts]       = useState<any[]>([]);
  const [rules, setRules]         = useState(DEFAULT_RULES);
  const [accounts, setAccounts]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [scanning, setScanning]   = useState(false);
  const [filterSev, setFilterSev] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [snTicketing, setSnTicketing] = useState<string | null>(null);
  const [newRule, setNewRule]     = useState({ type: 'COST_SPIKE', name: '', threshold: 20, unit: '%', provider: 'ALL', notify: ['email'] });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [alertsRes, accountsRes] = await Promise.all([
        fetch(`${API}/api/alerts`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/cloud/accounts`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (accountsRes.ok) {
        const d = await accountsRes.json();
        setAccounts(Array.isArray(d) ? d : d.accounts || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const scanNow = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API}/api/alerts/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) { console.error(e); }
    setScanning(false);
  };

  const updateAlertStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API}/api/alerts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) { console.error(e); }
  };

  const createServiceNowTicket = async (alert: any) => {
    setSnTicketing(alert.id);
    try {
      const res = await fetch(`${API}/api/servicenow/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          title:       `[CloudGuard Alert] ${alert.title}`,
          description: `${alert.message}\n\nAccount: ${alert.accountName || ''}\nProvider: ${alert.provider || ''}\nSeverity: ${alert.severity}\nDetected: ${new Date(alert.createdAt).toLocaleString()}`,
          priority:    alert.severity === 'CRITICAL' ? '1' : alert.severity === 'HIGH' ? '2' : '3',
          category:    'Cloud Infrastructure',
        }),
      });
      if (res.ok) {
        alert && setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, snTicket: 'Created ✓' } : a));
      }
    } catch (e) { console.error(e); }
    setSnTicketing(null);
  };

  const toggleRule = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const deleteRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const addRule = () => {
    const typeDef = ALERT_TYPES.find(t => t.value === newRule.type);
    setRules(prev => [...prev, { ...newRule, id: Date.now().toString(), enabled: true, name: newRule.name || typeDef?.label || newRule.type }]);
    setShowAddRule(false);
    setNewRule({ type: 'COST_SPIKE', name: '', threshold: 20, unit: '%', provider: 'ALL', notify: ['email'] });
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = alerts.filter(a => {
    if (filterSev !== 'ALL' && a.severity !== filterSev) return false;
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterProvider !== 'ALL' && a.provider !== filterProvider) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) && !a.message?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total:    alerts.length,
    open:     alerts.filter(a => a.status === 'OPEN').length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    high:     alerts.filter(a => a.severity === 'HIGH').length,
  };

  // ── Icon for alert type ───────────────────────────────────────────────────────
  const alertIcon = (type: string) => {
    const t = ALERT_TYPES.find(x => x.value === type);
    if (!t) return <Bell size={14} />;
    const Icon = t.icon;
    return <Icon size={14} color={t.color} />;
  };

  const s: Record<string, React.CSSProperties> = {
    page:       { padding: '24px 28px', maxWidth: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" },
    card:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    pill:       { padding: '4px 10px', fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.15s' },
    btn:        { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer' },
    input:      { padding: '6px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#f9fafb' },
  };

  return (
    <MainLayout>
      <div style={s.page}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Alert Center</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
              Monitor cloud resources, costs, and security across all accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchAll} style={{ ...s.btn, background: '#f3f4f6', color: '#374151' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={scanNow} disabled={scanning} style={{ ...s.btn, background: '#6366f1', color: '#fff', opacity: scanning ? 0.7 : 1 }}>
              {scanning ? <RefreshCw size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Zap size={13} />}
              {scanning ? 'Scanning...' : 'Scan Now'}
            </button>
          </div>
        </div>

        {/* Summary stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Alerts',   value: counts.total,    color: '#6366f1', bg: '#eef2ff', icon: Bell       },
            { label: 'Open',           value: counts.open,     color: '#ef4444', bg: '#fef2f2', icon: AlertCircle },
            { label: 'Critical',       value: counts.critical, color: '#dc2626', bg: '#fef2f2', icon: XCircle    },
            { label: 'Active Rules',   value: rules.filter(r=>r.enabled).length, color: '#16a34a', bg: '#f0fdf4', icon: Settings },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {(['alerts', 'rules'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.pill, background: tab === t ? '#6366f1' : '#f3f4f6', color: tab === t ? '#fff' : '#6b7280', padding: '6px 16px', fontSize: 12 }}>
              {t === 'alerts' ? `Alerts (${filtered.length})` : `Alert Rules (${rules.length})`}
            </button>
          ))}
        </div>

        {/* ── ALERTS TAB ──────────────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div style={s.card}>
            {/* Filters */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 10px', flex: 1, minWidth: 180 }}>
                <Search size={12} color="#9ca3af" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts..." style={{ border: 'none', background: 'none', fontSize: 12, outline: 'none', width: '100%' }} />
              </div>
              {/* Severity filter */}
              {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(f => (
                <button key={f} onClick={() => setFilterSev(f)} style={{ ...s.pill, background: filterSev === f ? '#6366f1' : '#f3f4f6', color: filterSev === f ? '#fff' : '#6b7280' }}>
                  {f === 'ALL' ? 'All Sev.' : f.charAt(0)+f.slice(1).toLowerCase()}
                </button>
              ))}
              {/* Status filter */}
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...s.input, fontSize: 11 }}>
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              {/* Provider filter */}
              <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} style={{ ...s.input, fontSize: 11 }}>
                <option value="ALL">All Clouds</option>
                <option value="AWS">AWS</option>
                <option value="AZURE">Azure</option>
                <option value="GCP">GCP</option>
              </select>
            </div>

            {/* Alert list */}
            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                <div style={{ width: 20, height: 20, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
                Loading alerts...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '56px 0', textAlign: 'center' }}>
                <CheckCircle size={32} color="#4ade80" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: 0 }}>
                  {alerts.length === 0 ? 'No alerts yet — click Scan Now to check your resources' : 'No alerts match your filters'}
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {alerts.length === 0 ? 'Alert rules will automatically detect issues across your cloud accounts' : 'Try adjusting severity or status filters'}
                </p>
              </div>
            ) : (
              <div>
                {filtered.map((alert: any) => {
                  const sev = SEV_CONFIG[alert.severity] || SEV_CONFIG['LOW'];
                  const sta = STATUS_CONFIG[alert.status] || STATUS_CONFIG['OPEN'];
                  const open = expanded === alert.id;
                  return (
                    <div key={alert.id} style={{ borderLeft: `3px solid ${sev.dot}`, borderBottom: '1px solid #f9fafb', background: open ? '#fafafa' : '#fff' }}>
                      {/* Row */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10 }}>
                        {/* Icon */}
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {alertIcon(alert.alertType)}
                        </div>
                        {/* Main info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, flexShrink: 0 }}>{alert.severity}</span>
                            <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 99, background: sta.bg, color: sta.color, flexShrink: 0 }}>{sta.label}</span>
                            {alert.provider && <span style={{ fontSize: 10, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>{alert.provider}</span>}
                          </div>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {alert.message} {alert.accountName && `· ${alert.accountName}`}
                          </p>
                        </div>
                        {/* Time */}
                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Just now'}
                        </span>
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {alert.status === 'OPEN' && (
                            <button onClick={() => updateAlertStatus(alert.id, 'ACKNOWLEDGED')} title="Acknowledge" style={{ padding: '4px 8px', fontSize: 11, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 6, cursor: 'pointer' }}>
                              Ack
                            </button>
                          )}
                          {alert.status !== 'RESOLVED' && (
                            <button onClick={() => updateAlertStatus(alert.id, 'RESOLVED')} title="Resolve" style={{ padding: '4px 8px', fontSize: 11, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer' }}>
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => createServiceNowTicket(alert)}
                            disabled={snTicketing === alert.id}
                            title="Create ServiceNow Ticket"
                            style={{ padding: '4px 8px', fontSize: 11, background: alert.snTicket ? '#f0fdf4' : '#f5f3ff', color: alert.snTicket ? '#16a34a' : '#7c3aed', border: `1px solid ${alert.snTicket ? '#bbf7d0' : '#ede9fe'}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                          >
                            <Ticket size={10} /> {alert.snTicket || 'SN'}
                          </button>
                          <button onClick={() => setExpanded(open ? null : alert.id)} style={{ padding: '4px 6px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>
                            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {open && (
                        <div style={{ padding: '0 16px 14px 56px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {alert.resourceId && (
                            <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Resource</p>
                              <code style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace' }}>{alert.resourceId}</code>
                              {alert.resourceType && <span style={{ marginLeft: 8, fontSize: 10, color: '#6b7280' }}>({alert.resourceType})</span>}
                            </div>
                          )}
                          {alert.currentValue !== undefined && (
                            <div style={{ display: 'flex', gap: 10 }}>
                              <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                                <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px' }}>Current Value</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: 0 }}>{alert.currentValue}{alert.unit || ''}</p>
                              </div>
                              {alert.threshold !== undefined && (
                                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px' }}>Threshold</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', margin: 0 }}>{alert.threshold}{alert.unit || ''}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {alert.recommendation && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={10} /> Recommended Action
                              </p>
                              <p style={{ fontSize: 12, color: '#15803d', margin: 0 }}>{alert.recommendation}</p>
                            </div>
                          )}
                          {alert.accountId && (
                            <button
                              onClick={() => navigate(`/account/${alert.accountId}/security`)}
                              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 7, cursor: 'pointer' }}
                            >
                              <ExternalLink size={11} /> View Account
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RULES TAB ───────────────────────────────────────────────────────── */}
        {tab === 'rules' && (
          <div>
            <div style={{ ...s.card, marginBottom: 12 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: 0 }}>Alert Rules</h2>
                <button onClick={() => setShowAddRule(v => !v)} style={{ ...s.btn, background: '#6366f1', color: '#fff' }}>
                  <Plus size={13} /> Add Rule
                </button>
              </div>

              {/* Add rule form */}
              {showAddRule && (
                <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>New Alert Rule</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Alert Type</label>
                      <select value={newRule.type} onChange={e => {
                        const t = ALERT_TYPES.find(x => x.value === e.target.value);
                        setNewRule(r => ({ ...r, type: e.target.value, unit: t?.value.includes('EXPIRY') || t?.value.includes('IDLE') ? 'days' : '%' }));
                      }} style={{ ...s.input, width: '100%' }}>
                        {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Rule Name</label>
                      <input value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="e.g. High CPU Alert" style={{ ...s.input, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Threshold ({newRule.unit})</label>
                      <input type="number" value={newRule.threshold} onChange={e => setNewRule(r => ({ ...r, threshold: Number(e.target.value) }))} style={{ ...s.input, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Cloud Provider</label>
                      <select value={newRule.provider} onChange={e => setNewRule(r => ({ ...r, provider: e.target.value }))} style={{ ...s.input, width: '100%' }}>
                        <option value="ALL">All Clouds</option>
                        <option value="AWS">AWS</option>
                        <option value="AZURE">Azure</option>
                        <option value="GCP">GCP</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notify via</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                        {['email','servicenow','webhook'].map(ch => {
                          const active = newRule.notify.includes(ch);
                          return (
                            <button key={ch} onClick={() => setNewRule(r => ({ ...r, notify: active ? r.notify.filter(n => n !== ch) : [...r.notify, ch] }))}
                              style={{ padding: '3px 8px', fontSize: 10, fontWeight: 500, borderRadius: 6, border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`, background: active ? '#eef2ff' : '#fff', color: active ? '#6366f1' : '#6b7280', cursor: 'pointer' }}>
                              {ch}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Type description */}
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 12px', background: '#f3f4f6', padding: '6px 10px', borderRadius: 6 }}>
                    {ALERT_TYPES.find(t => t.value === newRule.type)?.desc}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addRule} style={{ ...s.btn, background: '#6366f1', color: '#fff' }}>Save Rule</button>
                    <button onClick={() => setShowAddRule(false)} style={{ ...s.btn, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Rules list */}
              {rules.map(rule => {
                const typeDef = ALERT_TYPES.find(t => t.value === rule.type);
                const Icon = typeDef?.icon || Bell;
                return (
                  <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f9fafb', opacity: rule.enabled ? 1 : 0.5 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: rule.enabled ? '#eef2ff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color={rule.enabled ? (typeDef?.color || '#6366f1') : '#9ca3af'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', margin: 0 }}>{rule.name}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                        {typeDef?.label} · Threshold: {rule.threshold}{rule.unit} · {rule.provider} ·
                        Notify: {rule.notify.join(', ')}
                      </p>
                    </div>
                    {/* Toggle */}
                    <button onClick={() => toggleRule(rule.id)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 6, border: `1px solid ${rule.enabled ? '#bbf7d0' : '#e5e7eb'}`, background: rule.enabled ? '#f0fdf4' : '#f9fafb', color: rule.enabled ? '#16a34a' : '#9ca3af', cursor: 'pointer' }}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} style={{ padding: 6, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={12} color="#ef4444" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Notification channels info */}
            <div style={{ ...s.card }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: 0 }}>Notification Channels</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                {[
                  { icon: Mail,    label: 'Email',       desc: 'Alerts sent via SendGrid to configured addresses', status: 'Configured', color: '#16a34a' },
                  { icon: Ticket,  label: 'ServiceNow',  desc: 'Auto-create incidents in your ServiceNow instance', status: 'Configure in Settings', color: '#ea580c' },
                  { icon: Globe,   label: 'Webhook',     desc: 'POST alert payload to Slack, Teams, or PagerDuty', status: 'Coming soon', color: '#9ca3af' },
                ].map(({ icon: Icon, label, desc, status, color }, i) => (
                  <div key={label} style={{ padding: '16px 20px', borderRight: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Icon size={16} color={color} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{label}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>{desc}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, color, background: color + '15', padding: '2px 8px', borderRadius: 99 }}>{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </MainLayout>
  );
}
