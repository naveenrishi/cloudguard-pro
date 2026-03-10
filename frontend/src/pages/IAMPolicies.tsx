// src/pages/IAMPolicies.tsx
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  Shield, AlertTriangle, CheckCircle, RefreshCw, Search,
  ChevronRight, ChevronDown, User, Eye, Lock, Unlock,
  Copy, MoreHorizontal, X, GitCompare, Lightbulb, Filter,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type PolicyRisk = 'critical' | 'high' | 'medium' | 'low' | 'safe';

interface PolicyViolation {
  rule: string;
  description: string;
  severity: 'critical'|'high'|'medium';
}

interface PolicyRemediation {
  title: string;
  description: string;
  action: string;
}

interface IAMPolicy {
  id: string;
  name: string;
  arn: string;
  account: string;
  provider: 'aws'|'azure';
  attachedTo: { type:'user'|'role'|'group'; name: string }[];
  permissions: string[];
  risk: PolicyRisk;
  violations: PolicyViolation[];
  remediations: PolicyRemediation[];
  lastUsed?: string;
  createdAt: string;
  isManaged: boolean;
  hasWildcard: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_POLICIES: IAMPolicy[] = [
  {
    id:'p1', name:'AdminAccessTemp', arn:'arn:aws:iam::123456789:policy/AdminAccessTemp',
    account:'AWS Prod', provider:'aws', risk:'critical',
    attachedTo:[{type:'user',name:'naveen@company.com'},{type:'user',name:'ci-deploy'},{type:'user',name:'backup-svc'}],
    permissions:['*:*'],
    violations:[
      { rule:'Wildcard Action',      description:'Policy grants *.* — allows ALL actions on ALL resources.',    severity:'critical' },
      { rule:'Admin Escalation Risk',description:'Users with this policy can create/attach new policies.',     severity:'high'     },
      { rule:'Excessive Principals', description:'Policy attached to 3+ users. Admin access should be minimal.', severity:'high'  },
    ],
    remediations:[
      { title:'Replace with scoped policy',  description:'Define only the specific actions needed by each user.',         action:'Create scoped policy' },
      { title:'Enable MFA for policy use',   description:'Require MFA for any action using this policy.',                 action:'Add MFA condition'    },
      { title:'Remove from CI/CD user',      description:'ci-deploy does not need admin access. Use a deployment role.',  action:'Update ci-deploy'     },
    ],
    lastUsed:'2026-03-06 07:45', createdAt:'2025-11-02', isManaged:false, hasWildcard:true,
  },
  {
    id:'p2', name:'S3FullAccess-Prod', arn:'arn:aws:iam::123456789:policy/S3FullAccess-Prod',
    account:'AWS Prod', provider:'aws', risk:'high',
    attachedTo:[{type:'role',name:'app-server-role'},{type:'group',name:'developers'}],
    permissions:['s3:*'],
    violations:[
      { rule:'Wildcard Service Action', description:'s3:* grants all S3 actions including delete and ACL changes.', severity:'high' },
      { rule:'No Resource Restriction', description:'No resource ARN restriction — applies to ALL buckets.',        severity:'medium' },
    ],
    remediations:[
      { title:'Scope to specific buckets',  description:'Replace s3:* with specific bucket ARNs in Resource field.',    action:'Restrict resources'  },
      { title:'Remove s3:DeleteBucket',     description:'Deny delete actions unless specifically required.',             action:'Remove delete perms' },
    ],
    lastUsed:'2026-03-05 14:20', createdAt:'2025-08-15', isManaged:false, hasWildcard:true,
  },
  {
    id:'p3', name:'ReadOnlyAccess', arn:'arn:aws:iam::aws:policy/ReadOnlyAccess',
    account:'AWS Prod', provider:'aws', risk:'safe',
    attachedTo:[{type:'role',name:'monitoring-role'},{type:'user',name:'auditor@company.com'}],
    permissions:['*:List*','*:Describe*','*:Get*'],
    violations:[],
    remediations:[],
    lastUsed:'2026-03-06 09:00', createdAt:'2023-01-01', isManaged:true, hasWildcard:false,
  },
  {
    id:'p4', name:'EC2InstanceConnect', arn:'arn:aws:iam::123456789:policy/EC2InstanceConnect',
    account:'AWS Prod', provider:'aws', risk:'medium',
    attachedTo:[{type:'role',name:'bastion-role'}],
    permissions:['ec2-instance-connect:SendSSHPublicKey','ec2:DescribeInstances'],
    violations:[
      { rule:'No Instance Filter', description:'SendSSHPublicKey applies to all instances, not just bastion hosts.', severity:'medium' },
    ],
    remediations:[
      { title:'Add resource condition', description:'Restrict to specific instance IDs or tags.',  action:'Add instance condition' },
    ],
    lastUsed:'2026-03-04 11:30', createdAt:'2025-06-10', isManaged:false, hasWildcard:false,
  },
  {
    id:'p5', name:'AzureDevContributor', arn:'/subscriptions/dev-sub/roleAssignments/contributor',
    account:'Azure Dev', provider:'azure', risk:'high',
    attachedTo:[{type:'group',name:'dev-team'},{type:'user',name:'james@company.com'}],
    permissions:['Microsoft.*:write','Microsoft.*:delete'],
    violations:[
      { rule:'Contributor Role Too Broad', description:'Contributor allows creation and deletion of all resources.', severity:'high' },
      { rule:'No Management Lock',         description:'Users can delete production resources without a lock.',      severity:'medium' },
    ],
    remediations:[
      { title:'Use scoped custom role',   description:'Define a custom role with only the needed resource types.',  action:'Create custom role' },
      { title:'Apply resource locks',     description:'Add CanNotDelete locks to critical resources.',              action:'Add locks'          },
    ],
    lastUsed:'2026-03-05 16:00', createdAt:'2025-09-20', isManaged:false, hasWildcard:true,
  },
  {
    id:'p6', name:'LambdaBasicExecution', arn:'arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole',
    account:'AWS Prod', provider:'aws', risk:'safe',
    attachedTo:[{type:'role',name:'order-processor-role'},{type:'role',name:'email-sender-role'}],
    permissions:['logs:CreateLogGroup','logs:CreateLogStream','logs:PutLogEvents'],
    violations:[],
    remediations:[],
    lastUsed:'2026-03-06 09:20', createdAt:'2023-01-01', isManaged:true, hasWildcard:false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const riskConfig = (r: PolicyRisk) => {
  if (r === 'critical') return { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', label:'Critical' };
  if (r === 'high')     return { bg:'#fff7ed', color:'#ea580c', border:'#fed7aa', label:'High'     };
  if (r === 'medium')   return { bg:'#fffbeb', color:'#d97706', border:'#fde68a', label:'Medium'   };
  if (r === 'low')      return { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', label:'Low'      };
  return                       { bg:'#f0fdf4', color:'#059669', border:'#a7f3d0', label:'Safe'     };
};

const sevConfig = (s: string) => {
  if (s === 'critical') return { bg:'#fef2f2', color:'#dc2626' };
  if (s === 'high')     return { bg:'#fff7ed', color:'#ea580c' };
  return                       { bg:'#fffbeb', color:'#d97706' };
};

const attachedTypeIcon = (t: string) =>
  t === 'user' ? '👤' : t === 'role' ? '🔑' : '👥';

// ── Component ─────────────────────────────────────────────────────────────────
export default function IAMPolicies() {
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [policies,    setPolicies]    = useState<IAMPolicy[]>(MOCK_POLICIES);
  const [loading,     setLoading]     = useState(false);
  const [expanded,    setExpanded]    = useState<string|null>(null);
  const [activeTab,   setActiveTab]   = useState<'violations'|'remediations'>('violations');
  const [filterRisk,  setFilterRisk]  = useState<'all'|PolicyRisk>('all');
  const [filterAcct,  setFilterAcct]  = useState<string>('all');
  const [search,      setSearch]      = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds,  setCompareIds]  = useState<string[]>([]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const r = await fetch('http://localhost:3000/api/iam/policies', { headers: hdrs });
      if (r.ok) {
        const data = await r.json();
        if (data.policies?.length) setPolicies(data.policies);
      }
    } catch { /* use mock */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const accounts   = ['all', ...Array.from(new Set(policies.map(p => p.account)))];
  const filtered   = policies.filter(p => {
    const matchRisk   = filterRisk === 'all' || p.risk === filterRisk;
    const matchAcct   = filterAcct === 'all' || p.account === filterAcct;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
                               || p.arn.toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchAcct && matchSearch;
  });

  const violations  = policies.filter(p => p.risk === 'critical' || p.risk === 'high').length;
  const wildcards   = policies.filter(p => p.hasWildcard).length;
  const safe        = policies.filter(p => p.risk === 'safe' || p.risk === 'low').length;
  const totalViol   = policies.reduce((s,p) => s + p.violations.length, 0);

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < 2 ? [...prev, id]
      : [prev[1], id]
    );
  };

  const comparePolicies = compareIds.map(id => policies.find(p => p.id === id)).filter(Boolean) as IAMPolicy[];

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IAM Policies</h1>
          <p className="text-sm text-gray-400 mt-0.5">Audit, compare and remediate policies across all accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCompareMode(m => !m); setCompareIds([]); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              compareMode
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}>
            <GitCompare size={13}/> Compare
          </button>
          <button onClick={fetchPolicies} className={`btn btn-secondary text-xs gap-1.5 ${loading?'opacity-50 pointer-events-none':''}`}>
            <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Policies',       value: policies.length, icon:Shield,       color:'#6366f1', bg:'#eef2ff' },
          { label:'High Risk / Critical', value: violations,      icon:AlertTriangle,color:'#dc2626', bg:'#fef2f2' },
          { label:'Wildcard Permissions', value: wildcards,       icon:Unlock,       color:'#d97706', bg:'#fffbeb' },
          { label:'Total Violations',     value: totalViol,       icon:AlertTriangle,color:'#ea580c', bg:'#fff7ed' },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{background:s.bg}}>
                <Icon size={16} style={{color:s.color}}/>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Compare banner */}
      {compareMode && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <GitCompare size={16} className="text-indigo-500 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-800">
              Compare Mode — select 2 policies
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {compareIds.length === 0 && 'Select two policies to compare their permissions side-by-side.'}
              {compareIds.length === 1 && `Selected: "${policies.find(p=>p.id===compareIds[0])?.name}". Select one more.`}
              {compareIds.length === 2 && `Comparing: "${comparePolicies[0]?.name}" vs "${comparePolicies[1]?.name}"`}
            </p>
          </div>
          {compareIds.length === 2 && (
            <button onClick={() => setCompareIds([])} className="text-xs text-indigo-600 font-semibold hover:underline">
              Reset
            </button>
          )}
        </div>
      )}

      {/* Compare view */}
      {compareMode && compareIds.length === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h3 className="font-bold text-gray-900 mb-5">Policy Comparison</h3>
          <div className="grid grid-cols-2 gap-5">
            {comparePolicies.map((p,i) => {
              const rc = riskConfig(p.risk);
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-900">{p.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                      style={{background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`}}>{rc.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Permissions</p>
                  <div className="space-y-1 mb-4">
                    {p.permissions.map((perm,j) => (
                      <div key={j} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono ${
                        perm.includes('*') ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        {perm.includes('*') ? <Unlock size={10}/> : <Lock size={10}/>}
                        {perm}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Attached to</p>
                  <div className="space-y-1">
                    {p.attachedTo.map((a,j) => (
                      <div key={j} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span>{attachedTypeIcon(a.type)}</span>{a.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search policies…"
            className="pl-8 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 w-56"/>
        </div>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value as any)}
          className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="safe">Safe</option>
        </select>
        <select value={filterAcct} onChange={e => setFilterAcct(e.target.value)}
          className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
          {accounts.map(a => <option key={a} value={a}>{a === 'all' ? 'All Accounts' : a}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} policies</span>
      </div>

      {/* Policy list */}
      <div className="space-y-2">
        {filtered.map(policy => {
          const rc  = riskConfig(policy.risk);
          const isExp = expanded === policy.id;

          return (
            <div key={policy.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Row */}
              <div className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                onClick={() => setExpanded(isExp ? null : policy.id)}>

                {compareMode && (
                  <div onClick={e => { e.stopPropagation(); toggleCompare(policy.id); }}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                      compareIds.includes(policy.id)
                        ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'
                    }`}>
                    {compareIds.includes(policy.id) && <CheckCircle size={12} className="text-white"/>}
                  </div>
                )}

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  policy.risk === 'safe' || policy.risk === 'low' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {policy.risk === 'safe' || policy.risk === 'low'
                    ? <Lock size={15} className="text-emerald-600"/>
                    : <Unlock size={15} className="text-red-500"/>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">{policy.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                      style={{background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`}}>{rc.label}</span>
                    {policy.hasWildcard && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
                        Wildcard
                      </span>
                    )}
                    {policy.isManaged && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">
                        AWS Managed
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-400 truncate">{policy.arn}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">{policy.account}</span>
                    <span className="text-xs text-gray-400">
                      {policy.attachedTo.length} attachment{policy.attachedTo.length !== 1 ? 's' : ''}
                    </span>
                    {policy.violations.length > 0 && (
                      <span className="text-xs font-bold text-red-600">
                        {policy.violations.length} violation{policy.violations.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {policy.lastUsed && (
                      <span className="text-xs text-gray-400">Last used: {policy.lastUsed}</span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className={`text-gray-300 flex-shrink-0 mt-1.5 transition-transform ${isExp?'rotate-90':''}`}/>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div className="border-t border-gray-50 px-5 py-5 bg-gray-50/40 space-y-5">
                  {/* Permissions */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {policy.permissions.map((perm,i) => (
                        <span key={i} className={`text-xs font-mono px-2.5 py-1 rounded-lg ${
                          perm.includes('*') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-white text-gray-700 border border-gray-200'
                        }`}>
                          {perm.includes('*') && <Unlock size={9} className="inline mr-1"/>}
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Attached to */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attached to</p>
                    <div className="flex flex-wrap gap-2">
                      {policy.attachedTo.map((a,i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700">
                          {attachedTypeIcon(a.type)} {a.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Violations / Remediations tabs */}
                  {(policy.violations.length > 0 || policy.remediations.length > 0) && (
                    <div>
                      <div className="flex items-center gap-1 mb-3">
                        {['violations','remediations'].map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                              activeTab === tab
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-200'
                            }`}>{tab} {tab==='violations'?`(${policy.violations.length})`:`(${policy.remediations.length})`}</button>
                        ))}
                      </div>

                      {activeTab === 'violations' && (
                        <div className="space-y-2">
                          {policy.violations.map((v,i) => {
                            const sc = sevConfig(v.severity);
                            return (
                              <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 flex items-start gap-3">
                                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{color:sc.color}}/>
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-gray-800">{v.rule}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg" style={{background:sc.bg,color:sc.color}}>
                                      {v.severity.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 leading-relaxed">{v.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activeTab === 'remediations' && (
                        <div className="space-y-2">
                          {policy.remediations.map((r,i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 flex items-start gap-3">
                              <Lightbulb size={13} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-gray-800 mb-0.5">{r.title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
                              </div>
                              <button className="flex-shrink-0 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold transition-colors">
                                {r.action}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {policy.violations.length === 0 && (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                      <CheckCircle size={15}/> No violations detected — this policy follows least-privilege principles.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
