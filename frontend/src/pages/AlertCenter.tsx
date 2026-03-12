// frontend/src/pages/AlertCenter.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, RefreshCw,
  Bell, BellOff, ArrowLeft, Filter, ChevronDown, Search,
  Cloud, Shield, DollarSign, Cpu, Activity, X, Check,
  MoreHorizontal, Eye, Trash2, TrendingUp, Zap,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── types ──────────────────────────────────────────────────────────────────
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type Status   = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
type AlertType = 'COST_SPIKE' | 'BUDGET_THRESHOLD' | 'SECURITY_VIOLATION' |
                 'RESOURCE_ANOMALY' | 'ACCOUNT_HEALTH' | 'IDLE_RESOURCE' |
                 'CREDENTIAL_EXPIRY' | 'POLICY_CHANGE';

interface Alert {
  id:              string;
  cloudAccountId?: string;
  provider?:       string;
  type:            AlertType;
  severity:        Severity;
  status:          Status;
  title:           string;
  message:         string;
  resourceName?:   string;
  resourceType?:   string;
  metricValue?:    number;
  thresholdValue?: number;
  changePercent?:  number;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?:     string;
  createdAt:       string;
  cloudAccount?:   { accountName: string; provider: string };
}

interface Summary {
  total: number; critical: number; high: number; medium: number; low: number;
  open: number; acknowledged: number;
  byProvider: { provider: string; count: number }[];
}

// ── helpers ────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-500'    },
  HIGH:     { label: 'High',     color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200', dot: 'bg-yellow-500' },
  LOW:      { label: 'Low',      color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400'   },
  INFO:     { label: 'Info',     color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-200',   dot: 'bg-gray-400'   },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  OPEN:         { label: 'Open',         color: 'text-red-600',    bg: 'bg-red-50'    },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'text-blue-600',   bg: 'bg-blue-50'   },
  RESOLVED:     { label: 'Resolved',     color: 'text-green-600',  bg: 'bg-green-50'  },
  DISMISSED:    { label: 'Dismissed',    color: 'text-gray-400',   bg: 'bg-gray-50'   },
};

const TYPE_CONFIG: Record<AlertType, { label: string; icon: React.FC<any> }> = {
  COST_SPIKE:          { label: 'Cost Spike',          icon: TrendingUp   },
  BUDGET_THRESHOLD:    { label: 'Budget Threshold',    icon: DollarSign   },
  SECURITY_VIOLATION:  { label: 'Security Violation',  icon: Shield       },
  RESOURCE_ANOMALY:    { label: 'Resource Anomaly',     icon: Cpu          },
  ACCOUNT_HEALTH:      { label: 'Account Health',      icon: Activity     },
  IDLE_RESOURCE:       { label: 'Idle Resource',        icon: Zap          },
  CREDENTIAL_EXPIRY:   { label: 'Credential Expiry',   icon: AlertCircle  },
  POLICY_CHANGE:       { label: 'Policy Change',        icon: Shield       },
};

const PROVIDER_COLORS: Record<string, { color: string; bg: string }> = {
  AWS:   { color: 'text-orange-600', bg: 'bg-orange-50' },
  AZURE: { color: 'text-blue-600',   bg: 'bg-blue-50'   },
  GCP:   { color: 'text-green-600',  bg: 'bg-green-50'  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

// ── main component ─────────────────────────────────────────────────────────
export default function AlertCenter() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  const hdrs     = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [alerts,      setAlerts]      = useState<Alert[]>([]);
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [activeTab,   setActiveTab]   = useState<'all' | 'account' | 'cloud'>('all');
  const [statusFilter,setStatusFilter]= useState<string>('OPEN');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter)   params.set('status',   statusFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (providerFilter) params.set('provider', providerFilter);
      params.set('limit', '100');

      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/alerts?${params}`,      { headers: hdrs }),
        fetch(`${API}/api/alerts/summary`,         { headers: hdrs }),
      ]);

      if (alertsRes.ok) {
        const d = await alertsRes.json();
        setAlerts(d.alerts || []);
      }
      if (summaryRes.ok) {
        const d = await summaryRes.json();
        setSummary(d.data);
      }
    } catch (e) {
      console.error('[AlertCenter]', e);
    }
    setLoading(false);
  }, [statusFilter, severityFilter, providerFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch(`${API}/api/alerts/scan`, { method: 'POST', headers: hdrs });
      await fetchAlerts();
    } catch (_) {}
    setScanning(false);
  };

  const updateStatus = async (id: string, status: Status) => {
    try {
      await fetch(`${API}/api/alerts/${id}`, {
        method: 'PATCH', headers: hdrs,
        body: JSON.stringify({ status }),
      });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (statusFilter && status !== statusFilter) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch (_) {}
  };

  const bulkUpdate = async (status: Status) => {
    if (!selected.size) return;
    try {
      await fetch(`${API}/api/alerts/bulk`, {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ alertIds: Array.from(selected), status }),
      });
      setAlerts(prev => prev.filter(a => !selected.has(a.id)));
      setSelected(new Set());
    } catch (_) {}
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  // ── filter + search ──
  const filtered = alerts.filter(a => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) &&
          !a.message.toLowerCase().includes(q) &&
          !(a.resourceName || '').toLowerCase().includes(q)) return false;
    }
    if (activeTab === 'cloud' && providerFilter && a.provider !== providerFilter) return false;
    return true;
  });

  // Group by account for "By Account" tab
  const byAccount = filtered.reduce((acc, alert) => {
    const key = alert.cloudAccount?.accountName || alert.cloudAccountId || 'Unknown Account';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  // Group by provider for "By Cloud" tab
  const byCloud = filtered.reduce((acc, alert) => {
    const key = alert.provider || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  // ── stat cards ──
  const stats = [
    { label: 'Critical',     value: summary?.critical || 0,     color: '#ef4444', bg: '#fef2f2', icon: AlertCircle  },
    { label: 'High',         value: summary?.high     || 0,     color: '#f97316', bg: '#fff7ed', icon: AlertTriangle },
    { label: 'Medium',       value: summary?.medium   || 0,     color: '#eab308', bg: '#fefce8', icon: Info          },
    { label: 'Open Alerts',  value: summary?.open     || 0,     color: '#6366f1', bg: '#eef2ff', icon: Bell          },
  ];

  return (
    <MainLayout>
      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
        <ArrowLeft size={13} /> Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Center</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {summary?.open || 0} open alerts across all cloud accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors">
            <Zap size={12} className={scanning ? 'animate-pulse' : ''} />
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
          <button onClick={fetchAlerts} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon size={16} style={{ color: s.color }} />
                </div>
                {s.label === 'Critical' && s.value > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-5 w-fit">
        {([
          { id: 'all',     label: 'All Alerts'  },
          { id: 'account', label: 'By Account'  },
          { id: 'cloud',   label: 'By Cloud'    },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search alerts…"
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}><X size={12} className="text-gray-400" /></button>
            )}
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 outline-none cursor-pointer">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          {/* Severity filter */}
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 outline-none cursor-pointer">
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Provider filter */}
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
            className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 outline-none cursor-pointer">
            <option value="">All Providers</option>
            <option value="AWS">AWS</option>
            <option value="AZURE">Azure</option>
            <option value="GCP">GCP</option>
          </select>

          <span className="text-xs text-gray-400 ml-auto">{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            <button onClick={() => bulkUpdate('ACKNOWLEDGED')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
              <Eye size={11} /> Acknowledge
            </button>
            <button onClick={() => bulkUpdate('RESOLVED')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors">
              <Check size={11} /> Resolve
            </button>
            <button onClick={() => bulkUpdate('DISMISSED')}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors">
              <Trash2 size={11} /> Dismiss
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600">
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* ── ALL ALERTS tab ── */}
      {activeTab === 'all' && (
        <AlertList
          alerts={filtered}
          loading={loading}
          selected={selected}
          expanded={expanded}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onExpand={setExpanded}
          onUpdateStatus={updateStatus}
        />
      )}

      {/* ── BY ACCOUNT tab ── */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          {Object.entries(byAccount).length === 0 ? (
            <EmptyState loading={loading} />
          ) : (
            Object.entries(byAccount).map(([accountName, accountAlerts]) => (
              <div key={accountName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Cloud size={14} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-800">{accountName}</span>
                    <span className="text-xs text-gray-400">{accountAlerts.length} alert{accountAlerts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['CRITICAL', 'HIGH', 'MEDIUM'] as Severity[]).map(sev => {
                      const count = accountAlerts.filter(a => a.severity === sev).length;
                      if (!count) return null;
                      const cfg = SEVERITY_CONFIG[sev];
                      return (
                        <span key={sev} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {count} {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {accountAlerts.map(alert => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      selected={selected.has(alert.id)}
                      expanded={expanded === alert.id}
                      onToggleSelect={() => toggleSelect(alert.id)}
                      onExpand={() => setExpanded(expanded === alert.id ? null : alert.id)}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── BY CLOUD tab ── */}
      {activeTab === 'cloud' && (
        <div className="space-y-4">
          {/* Provider summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {['AWS', 'AZURE', 'GCP'].map(provider => {
              const pAlerts = filtered.filter(a => a.provider === provider);
              const cfg     = PROVIDER_COLORS[provider] || { color: 'text-gray-600', bg: 'bg-gray-50' };
              const critical = pAlerts.filter(a => a.severity === 'CRITICAL').length;
              const high     = pAlerts.filter(a => a.severity === 'HIGH').length;
              return (
                <button key={provider}
                  onClick={() => setProviderFilter(providerFilter === provider ? '' : provider)}
                  className={`bg-white rounded-2xl border shadow-sm p-5 text-left transition-all hover:shadow-md ${
                    providerFilter === provider ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100'
                  }`}>
                  <div className={`text-xs font-bold px-2 py-1 rounded-lg w-fit mb-3 ${cfg.bg} ${cfg.color}`}>
                    {provider}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{pAlerts.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">total alerts</p>
                  {(critical > 0 || high > 0) && (
                    <div className="flex items-center gap-2 mt-2">
                      {critical > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{critical} Critical</span>}
                      {high     > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{high} High</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Alert list filtered by selected provider */}
          <AlertList
            alerts={filtered}
            loading={loading}
            selected={selected}
            expanded={expanded}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onExpand={setExpanded}
            onUpdateStatus={updateStatus}
          />
        </div>
      )}
    </MainLayout>
  );
}

// ── AlertList component ────────────────────────────────────────────────────
function AlertList({ alerts, loading, selected, expanded, onToggleSelect, onSelectAll, onExpand, onUpdateStatus }: {
  alerts: Alert[];
  loading: boolean;
  selected: Set<string>;
  expanded: string | null;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onExpand: (id: string | null) => void;
  onUpdateStatus: (id: string, status: Status) => void;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <RefreshCw size={20} className="animate-spin text-indigo-400 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading alerts…</p>
      </div>
    );
  }

  if (alerts.length === 0) return <EmptyState loading={false} />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
        <input type="checkbox"
          checked={selected.size === alerts.length && alerts.length > 0}
          onChange={onSelectAll}
          className="rounded border-gray-300 text-indigo-600 cursor-pointer"
        />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Alert</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-24 text-center hidden md:block">Severity</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 text-center hidden lg:block">Status</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 text-right hidden lg:block">Time</span>
        <span className="w-20" />
      </div>

      <div className="divide-y divide-gray-50">
        {alerts.map(alert => (
          <AlertRow
            key={alert.id}
            alert={alert}
            selected={selected.has(alert.id)}
            expanded={expanded === alert.id}
            onToggleSelect={() => onToggleSelect(alert.id)}
            onExpand={() => onExpand(expanded === alert.id ? null : alert.id)}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>
    </div>
  );
}

// ── AlertRow component ─────────────────────────────────────────────────────
function AlertRow({ alert, selected, expanded, onToggleSelect, onExpand, onUpdateStatus }: {
  alert: Alert;
  selected: boolean;
  expanded: boolean;
  onToggleSelect: () => void;
  onExpand: () => void;
  onUpdateStatus: (id: string, status: Status) => void;
}) {
  const sev     = SEVERITY_CONFIG[alert.severity];
  const sta     = STATUS_CONFIG[alert.status];
  const typeCfg = TYPE_CONFIG[alert.type];
  const TypeIcon = typeCfg?.icon || AlertCircle;
  const provCfg  = PROVIDER_COLORS[alert.provider || ''] || { color: 'text-gray-500', bg: 'bg-gray-50' };

  return (
    <>
      <div className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer ${selected ? 'bg-indigo-50/30' : ''}`}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect}
          onClick={e => e.stopPropagation()}
          className="rounded border-gray-300 text-indigo-600 cursor-pointer flex-shrink-0"
        />

        {/* Severity dot + icon */}
        <div className="flex items-center gap-2.5 flex-shrink-0" onClick={onExpand}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot} ${alert.status === 'OPEN' && alert.severity === 'CRITICAL' ? 'animate-pulse' : ''}`} />
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sev.bg}`}>
            <TypeIcon size={14} style={{ color: sev.color.replace('text-', '').includes('-') ? undefined : sev.color }} className={sev.color} />
          </div>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0" onClick={onExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${alert.status === 'RESOLVED' || alert.status === 'DISMISSED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {alert.title}
            </span>
            {alert.provider && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${provCfg.bg} ${provCfg.color}`}>
                {alert.provider}
              </span>
            )}
            {alert.cloudAccount?.accountName && (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                {alert.cloudAccount.accountName}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{typeCfg?.label} · {alert.resourceName || alert.resourceType || ''}</p>
        </div>

        {/* Severity badge */}
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 w-24 text-center hidden md:block ${sev.bg} ${sev.color}`}>
          {sev.label}
        </span>

        {/* Status badge */}
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 w-28 text-center hidden lg:block ${sta.bg} ${sta.color}`}>
          {sta.label}
        </span>

        {/* Time */}
        <span className="text-xs text-gray-400 flex-shrink-0 w-20 text-right hidden lg:block">
          {timeAgo(alert.createdAt)}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 w-20 justify-end" onClick={e => e.stopPropagation()}>
          {alert.status === 'OPEN' && (
            <button onClick={() => onUpdateStatus(alert.id, 'ACKNOWLEDGED')}
              title="Acknowledge"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <Eye size={12} />
            </button>
          )}
          {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
            <button onClick={() => onUpdateStatus(alert.id, 'RESOLVED')}
              title="Resolve"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
              <Check size={12} />
            </button>
          )}
          {alert.status !== 'DISMISSED' && (
            <button onClick={() => onUpdateStatus(alert.id, 'DISMISSED')}
              title="Dismiss"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className={`px-16 pb-5 pt-2 border-b border-gray-50 ${sev.bg}`}>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{alert.message}</p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {alert.metricValue    != null && <span>Current: <strong className="text-gray-800">${alert.metricValue.toLocaleString()}</strong></span>}
            {alert.thresholdValue != null && <span>Threshold: <strong className="text-gray-800">${alert.thresholdValue.toLocaleString()}</strong></span>}
            {alert.changePercent  != null && (
              <span>Change: <strong className={alert.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                {alert.changePercent >= 0 ? '+' : ''}{alert.changePercent.toFixed(1)}%
              </strong></span>
            )}
            {alert.acknowledgedBy && <span>Acknowledged by: <strong className="text-gray-800">{alert.acknowledgedBy}</strong></span>}
            <span>Created: <strong className="text-gray-800">{new Date(alert.createdAt).toLocaleString()}</strong></span>
          </div>
        </div>
      )}
    </>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ loading }: { loading: boolean }) {
  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <RefreshCw size={20} className="animate-spin text-indigo-400 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">Loading alerts…</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={24} className="text-green-500" />
      </div>
      <p className="font-semibold text-gray-700 mb-1">All clear!</p>
      <p className="text-sm text-gray-400">No alerts match your current filters. Click <strong>Scan Now</strong> to check for new alerts.</p>
    </div>
  );
}
