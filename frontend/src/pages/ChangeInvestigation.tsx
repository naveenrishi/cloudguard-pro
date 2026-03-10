// src/pages/ChangeInvestigation.tsx
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  Search, Filter, RefreshCw, AlertTriangle, TrendingUp,
  Server, Settings, User, Clock, ChevronDown, ChevronRight,
  ArrowUpRight, Shield, GitBranch, Activity, X,
} from 'lucide-react';

const fmtDiff = (n: number) =>
  `${n >= 0 ? '+' : ''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// ── Types ─────────────────────────────────────────────────────────────────────
type ChangeType = 'cost_spike' | 'resource_created' | 'resource_deleted' | 'resource_modified' | 'config_drift' | 'policy_change';
type Severity   = 'critical' | 'high' | 'medium' | 'low';

interface Change {
  id: string;
  type: ChangeType;
  severity: Severity;
  title: string;
  description: string;
  account: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  user?: string;
  resource?: string;
  service?: string;
  timestamp: string;
  costDiff?: number;
  previousValue?: string;
  newValue?: string;
  relatedChanges?: string[];
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_CHANGES: Change[] = [
  { id:'c1',  type:'cost_spike',        severity:'critical', title:'EC2 Spend +340% Spike',               description:'EC2 costs in us-east-1 jumped from $180/day to $790/day. 47 new instances detected.',   account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'terraform-ci',     service:'EC2',               timestamp:'2026-03-06 08:14', costDiff:  2240 },
  { id:'c2',  type:'resource_created',  severity:'high',     title:'47 EC2 Instances Launched',           description:'Large batch of c5.2xlarge instances launched via Auto Scaling group scale-out event.',    account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'autoscaling-svc',  resource:'asg-prod-web-v3',  timestamp:'2026-03-06 08:12', costDiff:  1840 },
  { id:'c3',  type:'config_drift',      severity:'high',     title:'S3 Bucket Policy Changed',            description:'Bucket policy on prod-assets-bucket modified to allow public read. Security risk.',       account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'naveen@company.com', resource:'prod-assets-bucket', timestamp:'2026-03-05 22:30', previousValue:'Private', newValue:'Public' },
  { id:'c4',  type:'resource_deleted',  severity:'medium',   title:'NAT Gateway Deleted',                 description:'NAT Gateway nat-0abc123 deleted. Dependent resources may lose internet access.',          account:'AWS Prod',   provider:'aws',   region:'us-west-2',    user:'naveen@company.com', resource:'nat-0abc123def456',timestamp:'2026-03-05 18:45' },
  { id:'c5',  type:'cost_spike',        severity:'high',     title:'Azure VM Scale Set Expanded',         description:'Azure VMSS scaled from 2 to 18 instances. Monthly cost impact +$520.',                   account:'Azure Dev',  provider:'azure', region:'East US',      user:'azure-devops',     service:'Virtual Machines',  timestamp:'2026-03-05 14:20', costDiff:   520 },
  { id:'c6',  type:'policy_change',     severity:'high',     title:'IAM Policy Overly Permissive',        description:'Policy AdminAccessTemp attached to 3 users with *.* permissions. Violates least privilege.', account:'AWS Prod', provider:'aws',   region:'global',       user:'naveen@company.com', resource:'AdminAccessTemp',  timestamp:'2026-03-05 11:00' },
  { id:'c7',  type:'resource_modified', severity:'medium',   title:'RDS Instance Upgraded',               description:'RDS db.t3.medium upgraded to db.r5.large. Cost increase ~$180/mo.',                     account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'rds-maintainer',   resource:'prod-mysql-01',    timestamp:'2026-03-04 03:00', costDiff:   180, previousValue:'db.t3.medium', newValue:'db.r5.large' },
  { id:'c8',  type:'config_drift',      severity:'medium',   title:'Security Group Rule Added',           description:'Inbound rule added to allow 0.0.0.0/0 on port 22 (SSH). Production security group.',    account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'unknown',          resource:'sg-prod-bastion',  timestamp:'2026-03-04 01:15' },
  { id:'c9',  type:'resource_created',  severity:'low',      title:'S3 Bucket Created',                   description:'New S3 bucket prod-logs-archive-2026 created with versioning enabled.',                  account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'naveen@company.com', resource:'prod-logs-archive', timestamp:'2026-03-03 16:40' },
  { id:'c10', type:'cost_spike',        severity:'medium',   title:'CloudWatch Logs Storage +120%',       description:'Log ingestion increased significantly. Review log levels in production services.',       account:'AWS Prod',   provider:'aws',   region:'us-east-1',    service:'CloudWatch',        timestamp:'2026-03-03 09:00', costDiff:    94 },
  { id:'c11', type:'resource_modified', severity:'low',      title:'Lambda Timeout Updated',              description:'Lambda function order-processor timeout changed from 30s to 300s.',                     account:'AWS Prod',   provider:'aws',   region:'us-east-1',    user:'ci-deploy',        resource:'order-processor',  timestamp:'2026-03-02 14:22', previousValue:'30s', newValue:'300s' },
  { id:'c12', type:'config_drift',      severity:'high',     title:'Azure NSG Rule: Port 3389 Open',      description:'RDP port 3389 opened to internet (0.0.0.0/0) on production VM network security group.', account:'Azure Dev',  provider:'azure', region:'East US',      user:'azureportal',      resource:'nsg-prod-vms',     timestamp:'2026-03-02 11:10' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const typeConfig = (t: ChangeType) => {
  const map: Record<ChangeType, {icon: any; label: string; color: string; bg: string}> = {
    cost_spike:        { icon: TrendingUp,  label:'Cost Spike',     color:'#dc2626', bg:'#fef2f2' },
    resource_created:  { icon: Server,      label:'Created',        color:'#059669', bg:'#ecfdf5' },
    resource_deleted:  { icon: X,           label:'Deleted',        color:'#d97706', bg:'#fffbeb' },
    resource_modified: { icon: Settings,    label:'Modified',       color:'#2563eb', bg:'#eff6ff' },
    config_drift:      { icon: GitBranch,   label:'Config Drift',   color:'#7c3aed', bg:'#f5f3ff' },
    policy_change:     { icon: Shield,      label:'Policy Change',  color:'#be185d', bg:'#fdf2f8' },
  };
  return map[t];
};

const severityStyle = (s: Severity) => {
  if (s === 'critical') return { bg:'#fef2f2', color:'#dc2626', border:'#fecaca' };
  if (s === 'high')     return { bg:'#fff7ed', color:'#ea580c', border:'#fed7aa' };
  if (s === 'medium')   return { bg:'#fffbeb', color:'#d97706', border:'#fde68a' };
  return                       { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' };
};

const providerEmoji = (p: string) =>
  p === 'aws' ? '☁️' : p === 'azure' ? '🔷' : '🌐';

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(h / 24);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChangeInvestigation() {
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [changes,     setChanges]     = useState<Change[]>(MOCK_CHANGES);
  const [loading,     setLoading]     = useState(false);
  const [expanded,    setExpanded]    = useState<string|null>(null);
  const [filterType,  setFilterType]  = useState<'all'|ChangeType>('all');
  const [filterSev,   setFilterSev]   = useState<'all'|Severity>('all');
  const [search,      setSearch]      = useState('');

  const fetchChanges = async () => {
    setLoading(true);
    try {
      const r = await fetch('${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/changes', { headers: hdrs });
      if (r.ok) {
        const data = await r.json();
        setChanges(data.changes?.length ? data.changes : MOCK_CHANGES);
      }
    } catch { /* use mock */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchChanges(); }, []);

  const filtered = changes.filter(c => {
    const matchType   = filterType === 'all' || c.type === filterType;
    const matchSev    = filterSev  === 'all' || c.severity === filterSev;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase())
                                || c.description.toLowerCase().includes(search.toLowerCase())
                                || (c.user||'').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSev && matchSearch;
  });

  const critCount   = changes.filter(c => c.severity === 'critical').length;
  const highCount   = changes.filter(c => c.severity === 'high').length;
  const costSpikes  = changes.filter(c => c.type === 'cost_spike');
  const totalImpact = costSpikes.reduce((s,c) => s + (c.costDiff||0), 0);
  const driftCount  = changes.filter(c => c.type === 'config_drift').length;

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Investigation</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track what changed, when, who did it, and the cost impact</p>
        </div>
        <button onClick={fetchChanges} className={`btn btn-secondary text-xs gap-1.5 ${loading?'opacity-50 pointer-events-none':''}`}>
          <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Critical Changes', value: critCount,            sub:'Require immediate attention', icon:AlertTriangle, color:'#dc2626', bg:'#fef2f2' },
          { label:'High Severity',    value: highCount,            sub:'Review within 24h',           icon:TrendingUp,   color:'#ea580c', bg:'#fff7ed' },
          { label:'Cost Impact (MTD)', value:`$${totalImpact.toLocaleString()}`, sub:'From all cost spikes', icon:TrendingUp, color:'#6366f1', bg:'#eef2ff' },
          { label:'Config Drifts',    value: driftCount,           sub:'Security policy violations',  icon:GitBranch,    color:'#7c3aed', bg:'#f5f3ff' },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{background:s.bg}}>
                <Icon size={16} style={{color:s.color}}/>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search changes, users, resources…"
            className="pl-8 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors w-64"/>
        </div>

        {/* Type filter */}
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-600">
          <option value="all">All Types</option>
          <option value="cost_spike">Cost Spike</option>
          <option value="resource_created">Created</option>
          <option value="resource_deleted">Deleted</option>
          <option value="resource_modified">Modified</option>
          <option value="config_drift">Config Drift</option>
          <option value="policy_change">Policy Change</option>
        </select>

        {/* Severity filter */}
        <select value={filterSev} onChange={e => setFilterSev(e.target.value as any)}
          className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-600">
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} changes</span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Activity size={32} className="text-gray-200 mx-auto mb-3"/>
            <p className="text-gray-400 font-medium">No changes match your filters</p>
          </div>
        ) : (
          filtered.map(change => {
            const tc  = typeConfig(change.type);
            const ss  = severityStyle(change.severity);
            const Icon = tc.icon;
            const isExp = expanded === change.id;

            return (
              <div key={change.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                {/* Main row */}
                <div
                  className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                  onClick={() => setExpanded(isExp ? null : change.id)}>

                  {/* Type icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{background:tc.bg}}>
                    <Icon size={15} style={{color:tc.color}}/>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Severity badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        style={{background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`}}>
                        {change.severity.toUpperCase()}
                      </span>
                      {/* Type badge */}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">
                        {tc.label}
                      </span>
                      {/* Provider */}
                      <span className="text-sm">{providerEmoji(change.provider)}</span>
                      <span className="text-xs text-gray-400">{change.account}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{change.region}</span>
                    </div>

                    <p className="text-sm font-semibold text-gray-800">{change.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{change.description}</p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {change.user && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <User size={10}/>{change.user}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10}/>{timeAgo(change.timestamp)}
                      </span>
                      {change.costDiff !== undefined && (
                        <span className={`text-xs font-bold flex items-center gap-0.5 ${change.costDiff>0?'text-red-600':'text-emerald-600'}`}>
                          <ArrowUpRight size={11}/>{fmtDiff(change.costDiff)}/mo
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className={`text-gray-300 flex-shrink-0 mt-1.5 transition-transform ${isExp?'rotate-90':''}`}/>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div className="border-t border-gray-50 px-5 py-4 bg-gray-50/40 space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{change.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label:'Account',   value: change.account             },
                        { label:'Region',    value: change.region              },
                        { label:'Timestamp', value: change.timestamp           },
                        { label:'Changed by',value: change.user || 'System'   },
                      ].map((item,i) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                          <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {(change.previousValue || change.newValue) && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-1">Before</p>
                          <p className="text-sm font-mono font-semibold text-red-800">{change.previousValue}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0"/>
                        <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">After</p>
                          <p className="text-sm font-mono font-semibold text-emerald-800">{change.newValue}</p>
                        </div>
                      </div>
                    )}

                    {change.resource && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Server size={11}/> Resource: <span className="font-mono font-semibold text-gray-700">{change.resource}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </MainLayout>
  );
}
