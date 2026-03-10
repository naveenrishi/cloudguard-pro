// src/pages/MigrationAdvisor.tsx
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowRight, RefreshCw, DollarSign, Zap, Server,
  TrendingDown, CheckCircle, ChevronRight,
  Cloud, BarChart3, Lightbulb, ArrowLeftRight, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const fmt  = (n: number) => `$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const fmtD = (n: number) => `$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// ── Types ─────────────────────────────────────────────────────────────────────
type MigCategory = 'rightsizing' | 'reserved' | 'modernization' | 'cross-cloud' | 'storage';
type Effort      = 'low' | 'medium' | 'high';
type MigStatus   = 'new' | 'in_review' | 'accepted' | 'dismissed';
type Provider    = 'aws' | 'azure' | 'gcp';

interface MigRec {
  id: string;
  title: string;
  description: string;
  category: MigCategory;
  effort: Effort;
  status: MigStatus;
  account: string;
  provider: Provider;
  currentResource: string;
  targetResource: string;
  monthlySavings: number;
  annualSavings: number;
  implementationSteps: string[];
  risk: 'low' | 'medium' | 'high';
  priority: number;
}

// ── Accounts per provider ─────────────────────────────────────────────────────
const PROVIDER_ACCOUNTS: Record<Provider, string[]> = {
  aws:   ['AWS Prod', 'AWS Dev', 'AWS Staging'],
  azure: ['Azure Dev', 'Azure Prod'],
  gcp:   ['GCP Analytics'],
};

// ── Mock recommendations ──────────────────────────────────────────────────────
const MOCK_RECS: MigRec[] = [
  {
    id:'m1', category:'reserved', effort:'low', status:'new', priority:1, risk:'low',
    account:'AWS Prod', provider:'aws',
    title:'Purchase EC2 Reserved Instances for Web Tier',
    description:'12 c5.2xlarge instances running 24/7 for 6+ months. Switch to 1-year reserved for 40% savings.',
    currentResource:'12× On-Demand c5.2xlarge', targetResource:'12× 1-yr Reserved c5.2xlarge',
    monthlySavings:860, annualSavings:10320,
    implementationSteps:[
      'Review EC2 usage history to confirm sustained 24/7 workloads',
      'Purchase 12× c5.2xlarge 1-yr Reserved Instances (No Upfront or Partial)',
      'Apply reservations to us-east-1 instances via EC2 console',
    ],
  },
  {
    id:'m2', category:'rightsizing', effort:'medium', status:'new', priority:2, risk:'medium',
    account:'AWS Prod', provider:'aws',
    title:'Downsize Underutilized RDS to db.t3.large',
    description:'prod-mysql-01 was recently upgraded to db.r5.large but averages 12% CPU and 2GB RAM usage. Overprovisioned.',
    currentResource:'db.r5.large ($0.24/hr)', targetResource:'db.t3.large ($0.073/hr)',
    monthlySavings:122, annualSavings:1464,
    implementationSteps:[
      'Monitor CPU and memory for 7 days to confirm low utilization',
      'Schedule maintenance window (off-peak)',
      'Modify RDS instance class via console or CLI',
      'Test application performance post-resize',
    ],
  },
  {
    id:'m3', category:'modernization', effort:'high', status:'new', priority:3, risk:'medium',
    account:'AWS Dev', provider:'aws',
    title:'Migrate EC2 batch jobs to AWS Lambda + SQS',
    description:'4 EC2 t3.medium instances run nightly batch processes for 2-3 hours each. Serverless would reduce idle costs.',
    currentResource:'4× t3.medium (24/7)', targetResource:'Lambda + SQS (event-driven)',
    monthlySavings:290, annualSavings:3480,
    implementationSteps:[
      'Profile batch job memory/duration requirements',
      'Refactor job logic into Lambda functions (target <15min per task)',
      'Create SQS queue for job dispatch',
      'Deploy and test in staging',
      'Decommission EC2 instances',
    ],
  },
  {
    id:'m4', category:'storage', effort:'low', status:'new', priority:4, risk:'low',
    account:'AWS Prod', provider:'aws',
    title:'Move S3 Infrequent Data to Glacier',
    description:'prod-logs-archive bucket has 2.4TB untouched for 90+ days. Transition to S3 Glacier via lifecycle policy.',
    currentResource:'2.4TB S3 Standard ($55.20/mo)', targetResource:'2.4TB S3 Glacier ($9.60/mo)',
    monthlySavings:46, annualSavings:552,
    implementationSteps:[
      'Confirm data access patterns (CloudWatch metrics)',
      'Add lifecycle rule: transition to Glacier after 90 days of no access',
      'Set expiry rule for objects older than 7 years',
    ],
  },
  {
    id:'m5', category:'reserved', effort:'low', status:'in_review', priority:5, risk:'low',
    account:'Azure Dev', provider:'azure',
    title:'Azure Reserved VM Instances — VMSS',
    description:'Azure VMSS baseline of 4 VMs runs continuously. 1-year reserved pricing saves 37%.',
    currentResource:'4× D4s_v3 Pay-as-you-go', targetResource:'4× D4s_v3 1-yr Reserved',
    monthlySavings:180, annualSavings:2160,
    implementationSteps:[
      'Review VMSS scaling history to confirm 4-instance baseline',
      'Purchase Azure Reserved VM Instances (1-yr, East US)',
      'Apply reservations in Azure portal',
    ],
  },
  {
    id:'m6', category:'cross-cloud', effort:'high', status:'new', priority:6, risk:'high',
    account:'AWS Prod', provider:'aws',
    title:'Evaluate Azure Cognitive Services vs AWS Rekognition',
    description:'Image recognition workloads currently use AWS Rekognition at $120/mo. Azure Cognitive Vision offers lower per-image pricing.',
    currentResource:'AWS Rekognition (~$120/mo)', targetResource:'Azure Cognitive Vision (~$45/mo)',
    monthlySavings:75, annualSavings:900,
    implementationSteps:[
      'Benchmark Azure Cognitive Vision accuracy on production dataset',
      'Evaluate latency and compliance requirements',
      'Build dual-cloud wrapper service',
      'Gradual traffic migration with feature flags',
      'Decommission Rekognition endpoint',
    ],
  },
  {
    id:'m7', category:'rightsizing', effort:'low', status:'accepted', priority:7, risk:'low',
    account:'AWS Prod', provider:'aws',
    title:'Remove 6 Idle Snapshots',
    description:'6 EBS snapshots from terminated instances, 180+ days old, taking up 480GB. No associated instances.',
    currentResource:'480GB EBS Snapshots ($24/mo)', targetResource:'Deleted',
    monthlySavings:24, annualSavings:288,
    implementationSteps:[
      'Confirm snapshots have no associated AMIs or restore plans',
      'Tag for deletion approval',
      'Delete via AWS CLI: aws ec2 delete-snapshot',
    ],
  },
  {
    id:'m8', category:'modernization', effort:'medium', status:'new', priority:8, risk:'low',
    account:'Azure Prod', provider:'azure',
    title:'Migrate Azure VMs to App Service (PaaS)',
    description:'3 Standard_D2s_v3 VMs running web apps. App Service cuts management overhead and cost significantly.',
    currentResource:'3× Standard_D2s_v3 VMs ($0.19/hr each)', targetResource:'Azure App Service P2v3',
    monthlySavings:210, annualSavings:2520,
    implementationSteps:[
      'Containerize web apps (Docker)',
      'Deploy to App Service staging slot',
      'Run integration tests on staging slot',
      'Swap staging to production',
      'Decommission VMs after 7-day monitoring window',
    ],
  },
  {
    id:'m9', category:'storage', effort:'low', status:'new', priority:9, risk:'low',
    account:'Azure Dev', provider:'azure',
    title:'Enable Azure Blob Lifecycle Management',
    description:'80GB of Dev storage blobs untouched 60+ days. Moving to Cool tier saves ~50%.',
    currentResource:'80GB Blob Hot Tier ($1.60/mo)', targetResource:'80GB Blob Cool Tier ($0.80/mo)',
    monthlySavings:42, annualSavings:504,
    implementationSteps:[
      'Audit blob access patterns in Azure Monitor',
      'Enable lifecycle management policy in Storage account',
      'Configure Hot → Cool transition after 60 days of no access',
      'Monitor storage cost metrics post-policy',
    ],
  },
  {
    id:'m10', category:'reserved', effort:'low', status:'new', priority:10, risk:'low',
    account:'GCP Analytics', provider:'gcp',
    title:'GCP Committed Use Discounts — BigQuery Slots',
    description:'Consistent BigQuery slot usage qualifies for 1-year committed use (25% discount).',
    currentResource:'On-demand BigQuery slots ($340/mo)', targetResource:'1-yr Committed Use ($255/mo)',
    monthlySavings:85, annualSavings:1020,
    implementationSteps:[
      'Review BigQuery slot utilization history (last 90 days)',
      'Purchase 1-year slot commitment in GCP Console',
      'Monitor flex slots for peak workloads',
    ],
  },
  {
    id:'m11', category:'rightsizing', effort:'medium', status:'new', priority:11, risk:'medium',
    account:'GCP Analytics', provider:'gcp',
    title:'Resize Overprovisioned Compute Engine VMs',
    description:'4 n2-standard-8 VMs averaging 18% CPU. Rightsizing to n2-standard-4 halves compute cost.',
    currentResource:'4× n2-standard-8 ($0.38/hr each)', targetResource:'4× n2-standard-4 ($0.19/hr each)',
    monthlySavings:220, annualSavings:2640,
    implementationSteps:[
      'Confirm CPU/memory metrics over 14-day baseline',
      'Schedule resize during low-traffic window',
      'Update instance type in GCP Console',
      'Validate application performance post-resize',
    ],
  },
  {
    id:'m12', category:'cross-cloud', effort:'high', status:'new', priority:12, risk:'medium',
    account:'AWS Staging', provider:'aws',
    title:'Migrate Staging Workloads to GCP Spot VMs',
    description:'AWS Spot Instances for staging cost $180/mo. GCP Spot VMs equivalent is ~$95/mo.',
    currentResource:'AWS Spot t3.xlarge cluster (~$180/mo)', targetResource:'GCP Spot n2-standard-4 (~$95/mo)',
    monthlySavings:85, annualSavings:1020,
    implementationSteps:[
      'Audit staging workload portability',
      'Containerize workloads with Docker',
      'Deploy GCP Spot VM cluster in us-central1',
      'Migrate CI/CD pipelines to GCP',
      'Decommission AWS staging cluster',
    ],
  },
];

// ── Cloud comparison static data ──────────────────────────────────────────────
const CLOUD_META: Record<Provider, {
  label: string; emoji: string; color: string; bg: string; border: string;
  monthlyCost: number; savingsOpp: number;
  resources: { compute: number; storage: number; database: number; network: number };
  maturity: { costOptimization: number; security: number; reliability: number; performance: number; sustainability: number };
  trend: { month: string; cost: number }[];
}> = {
  aws: {
    label:'AWS', emoji:'☁️', color:'#ea580c', bg:'#fff7ed', border:'#fed7aa',
    monthlyCost:4821, savingsOpp:1597,
    resources:{ compute:47, storage:23, database:8, network:12 },
    maturity:{ costOptimization:62, security:78, reliability:85, performance:71, sustainability:45 },
    trend:[
      {month:'Sep',cost:720},{month:'Oct',cost:890},{month:'Nov',cost:1120},
      {month:'Dec',cost:1480},{month:'Jan',cost:1920},{month:'Feb',cost:2280},
    ],
  },
  azure: {
    label:'Azure', emoji:'🔷', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe',
    monthlyCost:1240, savingsOpp:432,
    resources:{ compute:18, storage:11, database:4, network:7 },
    maturity:{ costOptimization:55, security:82, reliability:79, performance:68, sustainability:52 },
    trend:[
      {month:'Sep',cost:180},{month:'Oct',cost:210},{month:'Nov',cost:280},
      {month:'Dec',cost:340},{month:'Jan',cost:420},{month:'Feb',cost:520},
    ],
  },
  gcp: {
    label:'GCP', emoji:'🌐', color:'#059669', bg:'#ecfdf5', border:'#a7f3d0',
    monthlyCost:340, savingsOpp:305,
    resources:{ compute:9, storage:5, database:2, network:3 },
    maturity:{ costOptimization:48, security:74, reliability:80, performance:76, sustainability:68 },
    trend:[
      {month:'Sep',cost:0},{month:'Oct',cost:0},{month:'Nov',cost:0},
      {month:'Dec',cost:0},{month:'Jan',cost:21},{month:'Feb',cost:340},
    ],
  },
};

const TREND_MONTHS = ['Sep','Oct','Nov','Dec','Jan','Feb'];
const TREND_DATA = TREND_MONTHS.map((_,i) => ({
  month: TREND_MONTHS[i],
  AWS:   CLOUD_META.aws.trend[i]?.cost   || 0,
  Azure: CLOUD_META.azure.trend[i]?.cost || 0,
  GCP:   CLOUD_META.gcp.trend[i]?.cost   || 0,
}));

const RADAR_DATA = (['costOptimization','security','reliability','performance','sustainability'] as const).map(key => ({
  metric: key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()),
  AWS:   CLOUD_META.aws.maturity[key],
  Azure: CLOUD_META.azure.maturity[key],
  GCP:   CLOUD_META.gcp.maturity[key],
}));

const CROSS_CLOUD_OPPS = [
  { from:'aws'  as Provider, to:'azure' as Provider, service:'Image Recognition',  fromCost:120, toCost:45,  saving:75, effort:'High',   recId:'m6'  },
  { from:'aws'  as Provider, to:'gcp'   as Provider, service:'Staging Compute',    fromCost:180, toCost:95,  saving:85, effort:'High',   recId:'m12' },
  { from:'azure'as Provider, to:'aws'   as Provider, service:'CDN Distribution',   fromCost:95,  toCost:42,  saving:53, effort:'Medium', recId:null  },
  { from:'aws'  as Provider, to:'gcp'   as Provider, service:'Analytics Pipeline', fromCost:280, toCost:195, saving:85, effort:'High',   recId:null  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const categoryConfig = (c: MigCategory) => {
  if (c === 'rightsizing')   return { color:'#6366f1', bg:'#eef2ff', label:'Rightsizing',   icon: Server     };
  if (c === 'reserved')      return { color:'#059669', bg:'#ecfdf5', label:'Reserved',      icon: DollarSign };
  if (c === 'modernization') return { color:'#2563eb', bg:'#eff6ff', label:'Modernization', icon: Zap        };
  if (c === 'cross-cloud')   return { color:'#7c3aed', bg:'#f5f3ff', label:'Cross-Cloud',   icon: Cloud      };
  return                            { color:'#d97706', bg:'#fffbeb', label:'Storage',       icon: BarChart3  };
};

const effortStyle = (e: Effort) => {
  if (e === 'low')    return { bg:'#ecfdf5', color:'#059669', label:'Low Effort'  };
  if (e === 'medium') return { bg:'#fffbeb', color:'#d97706', label:'Med Effort'  };
  return                     { bg:'#fef2f2', color:'#dc2626', label:'High Effort' };
};

const statusStyle = (s: MigStatus) => {
  if (s === 'new')       return { bg:'#eff6ff', color:'#2563eb', label:'New'       };
  if (s === 'in_review') return { bg:'#fffbeb', color:'#d97706', label:'In Review' };
  if (s === 'accepted')  return { bg:'#ecfdf5', color:'#059669', label:'Accepted'  };
  return                        { bg:'#f9fafb', color:'#6b7280', label:'Dismissed' };
};

const PROVIDERS = (['aws','azure','gcp'] as Provider[]);

// ── Component ─────────────────────────────────────────────────────────────────
export default function MigrationAdvisor() {
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [recs,             setRecs]             = useState<MigRec[]>(MOCK_RECS);
  const [loading,          setLoading]          = useState(false);
  const [expanded,         setExpanded]         = useState<string|null>(null);
  const [activeTab,        setActiveTab]        = useState<'recommendations'|'comparison'>('recommendations');

  // ── Filter state ────────────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState<'all'|Provider>('all');
  const [selectedAccount,  setSelectedAccount]  = useState<string>('all');
  const [filterCat,        setFilterCat]        = useState<'all'|MigCategory>('all');
  const [filterEffort,     setFilterEffort]     = useState<'all'|Effort>('all');
  const [filterStatus,     setFilterStatus]     = useState<'all'|MigStatus>('all');

  // Reset account when provider changes
  useEffect(() => { setSelectedAccount('all'); }, [selectedProvider]);

  // ── API calls ───────────────────────────────────────────────────────────────
  const fetchRecs = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/migration/recommendations?scope=all-accounts', { headers: hdrs });
      if (r.ok) {
        const data = await r.json();
        if (data.recommendations?.length) setRecs(data.recommendations);
      }
    } catch { /* use mock */ }
    finally { setLoading(false); }
  };

  const handleAccept = async (id: string) => {
    try { await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/migration/recommendations/${id}/accept`, { method:'POST', headers:hdrs }); } catch {}
    setRecs(prev => prev.map(r => r.id === id ? {...r, status:'accepted'} : r));
  };

  const handleDismiss = async (id: string) => {
    try { await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/migration/recommendations/${id}/dismiss`, { method:'POST', headers:hdrs }); } catch {}
    setRecs(prev => prev.map(r => r.id === id ? {...r, status:'dismissed'} : r));
  };

  useEffect(() => { fetchRecs(); }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  // accounts list for dropdown — depends on selected provider
  const availableAccounts: string[] = selectedProvider === 'all'
    ? ['all', ...Object.values(PROVIDER_ACCOUNTS).flat()]
    : ['all', ...PROVIDER_ACCOUNTS[selectedProvider]];

  const filtered = recs.filter(r => {
    const matchProv   = selectedProvider === 'all' || r.provider === selectedProvider;
    const matchAcct   = selectedAccount  === 'all' || r.account  === selectedAccount;
    const matchCat    = filterCat    === 'all' || r.category === filterCat;
    const matchEffort = filterEffort === 'all' || r.effort   === filterEffort;
    const matchStatus = filterStatus === 'all' || r.status   === filterStatus;
    return matchProv && matchAcct && matchCat && matchEffort && matchStatus;
  }).sort((a,b) => a.priority - b.priority);

  const totalMonthly = recs.filter(r=>r.status!=='dismissed').reduce((s,r)=>s+r.monthlySavings,0);
  const totalAnnual  = recs.filter(r=>r.status!=='dismissed').reduce((s,r)=>s+r.annualSavings,0);
  const accepted     = recs.filter(r=>r.status==='accepted').reduce((s,r)=>s+r.monthlySavings,0);
  const pendingCount = recs.filter(r=>r.status==='new').length;

  const byCat = (['rightsizing','reserved','modernization','cross-cloud','storage'] as MigCategory[]).map(cat => ({
    name:    categoryConfig(cat).label,
    savings: recs.filter(r=>r.category===cat&&r.status!=='dismissed').reduce((s,r)=>s+r.annualSavings,0),
    color:   categoryConfig(cat).color,
  })).filter(d=>d.savings>0);

  const allAccounts = Array.from(new Set(recs.map(r=>r.account)));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Migration Advisor</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Aggregated optimization recommendations across all {allAccounts.length} connected accounts
          </p>
        </div>
        <button onClick={fetchRecs}
          className={`btn btn-secondary text-xs gap-1.5 ${loading?'opacity-50 pointer-events-none':''}`}>
          <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {/* ── Cloud provider + account selector ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">

          {/* Provider pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Provider</span>

            {/* All pill */}
            <button onClick={() => setSelectedProvider('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedProvider === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}>All</button>

            {PROVIDERS.map(pid => {
              const m = CLOUD_META[pid];
              const active = selectedProvider === pid;
              const recsForProvider = recs.filter(r=>r.provider===pid&&r.status!=='dismissed');
              const savings = recsForProvider.reduce((s,r)=>s+r.monthlySavings,0);
              return (
                <button key={pid} onClick={() => setSelectedProvider(active ? 'all' : pid)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    active ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={active ? { background:m.color, borderColor:m.color } : {}}>
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                  {savings > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${active?'bg-white/20':'bg-gray-100'}`}
                      style={active?{}:{color:m.color}}>
                      {fmt(savings)}/mo
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-7 bg-gray-200"/>

          {/* Account dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</span>
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-700 min-w-[170px]">
              <option value="all">All Accounts</option>
              {availableAccounts.filter(a=>a!=='all').map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Active filter badge + clear */}
          {(selectedProvider !== 'all' || selectedAccount !== 'all') && (
            <div className="ml-auto flex items-center gap-2">
              {selectedProvider !== 'all' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                  style={{background:CLOUD_META[selectedProvider].bg, color:CLOUD_META[selectedProvider].color}}>
                  {CLOUD_META[selectedProvider].emoji} {CLOUD_META[selectedProvider].label}
                </span>
              )}
              {selectedAccount !== 'all' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
                  {selectedAccount}
                </span>
              )}
              <button onClick={() => { setSelectedProvider('all'); setSelectedAccount('all'); }}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold underline underline-offset-2">
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Monthly Savings', value: fmt(totalMonthly), sub:'Potential across all accounts', icon:DollarSign,   color:'#059669', bg:'#ecfdf5' },
          { label:'Annual Opportunity',    value: fmt(totalAnnual),  sub:'If all accepted',               icon:TrendingDown, color:'#6366f1', bg:'#eef2ff' },
          { label:'Accepted Savings',      value: fmt(accepted),     sub:'Per month already locked in',   icon:CheckCircle,  color:'#2563eb', bg:'#eff6ff' },
          { label:'Pending Review',        value: pendingCount,      sub:'Recommendations to review',     icon:Lightbulb,    color:'#d97706', bg:'#fffbeb' },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{background:s.bg}}>
                <Icon size={16} style={{color:s.color}}/>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Tab nav ── */}
      <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-5 w-fit">
        {[
          { id:'recommendations', label:'Recommendations' },
          { id:'comparison',      label:'☁️ Cloud Comparison' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          RECOMMENDATIONS TAB
      ════════════════════════════════════════════════════ */}
      {activeTab === 'recommendations' && (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

            {/* Savings by category */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Annual Savings by Category</h3>
              <p className="text-xs text-gray-400 mb-5">Potential across all accounts</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byCat} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} width={52}/>
                  <Tooltip formatter={(v:any)=>[fmt(v),'Annual Savings']} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Bar dataKey="savings" radius={[6,6,0,0]}>
                    {byCat.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By account */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">By Account</h3>
              <p className="text-xs text-gray-400 mb-4">Monthly savings potential</p>
              <div className="space-y-3">
                {allAccounts.map((acct,i) => {
                  const savings = recs.filter(r=>r.account===acct&&r.status!=='dismissed').reduce((s,r)=>s+r.monthlySavings,0);
                  if (!savings) return null;
                  const maxSav = Math.max(...allAccounts.map(a=>recs.filter(r=>r.account===a&&r.status!=='dismissed').reduce((s,r)=>s+r.monthlySavings,0)));
                  const prov   = recs.find(r=>r.account===acct)?.provider;
                  const color  = prov ? CLOUD_META[prov].color : '#6366f1';
                  const emoji  = prov ? CLOUD_META[prov].emoji : '☁️';
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{emoji}</span>
                          <span className="text-xs font-semibold text-gray-700">{acct}</span>
                        </div>
                        <span className="text-xs font-bold" style={{color}}>{fmt(savings)}/mo</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${maxSav>0?(savings/maxSav)*100:0}%`, background:color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rec filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
              <option value="all">All Categories</option>
              <option value="rightsizing">Rightsizing</option>
              <option value="reserved">Reserved Instances</option>
              <option value="modernization">Modernization</option>
              <option value="cross-cloud">Cross-Cloud</option>
              <option value="storage">Storage</option>
            </select>
            <select value={filterEffort} onChange={e => setFilterEffort(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
              <option value="all">All Effort Levels</option>
              <option value="low">Low Effort</option>
              <option value="medium">Medium Effort</option>
              <option value="high">High Effort</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="in_review">In Review</option>
              <option value="accepted">Accepted</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} recommendations · {fmt(filtered.reduce((s,r)=>s+r.monthlySavings,0))}/mo potential
            </span>
          </div>

          {/* Recommendations list */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <CheckCircle size={32} className="text-gray-200 mx-auto mb-3"/>
                <p className="text-gray-400 font-medium">No recommendations match your filters</p>
              </div>
            )}

            {filtered.map(rec => {
              const cc    = categoryConfig(rec.category);
              const es    = effortStyle(rec.effort);
              const ss    = statusStyle(rec.status);
              const CIcon = cc.icon;
              const isExp = expanded === rec.id;
              const pm    = CLOUD_META[rec.provider];

              return (
                <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                    onClick={() => setExpanded(isExp ? null : rec.id)}>

                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-[10px] font-black text-indigo-600">#{rec.priority}</span>
                    </div>

                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:cc.bg}}>
                      <CIcon size={15} style={{color:cc.color}}/>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{background:cc.bg,color:cc.color}}>{cc.label}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{background:es.bg,color:es.color}}>{es.label}</span>
                        {/* Provider badge */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                          style={{background:pm.bg, color:pm.color}}>
                          {pm.emoji} {pm.label}
                        </span>
                        <span className="text-xs text-gray-400">{rec.account}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{rec.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rec.description}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-emerald-600">{fmt(rec.monthlySavings)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                        <p className="text-[10px] text-gray-400">{fmt(rec.annualSavings)}/yr</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-xl" style={{background:ss.bg,color:ss.color}}>{ss.label}</span>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${isExp?'rotate-90':''}`}/>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div className="border-t border-gray-50 px-5 py-5 bg-gray-50/40 space-y-5">
                      <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Current</p>
                          <p className="text-sm font-mono font-semibold text-gray-800">{rec.currentResource}</p>
                        </div>
                        <ArrowRight size={16} className="text-gray-300 flex-shrink-0"/>
                        <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1">Target</p>
                          <p className="text-sm font-mono font-semibold text-emerald-800">{rec.targetResource}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label:'Monthly Savings', value:fmtD(rec.monthlySavings), color:'#059669' },
                          { label:'Annual Savings',  value:fmt(rec.annualSavings),   color:'#6366f1' },
                          { label:'Risk Level',      value:rec.risk.charAt(0).toUpperCase()+rec.risk.slice(1),
                            color: rec.risk==='low'?'#059669':rec.risk==='medium'?'#d97706':'#dc2626' },
                        ].map((s,i) => (
                          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{s.label}</p>
                            <p className="text-sm font-bold mt-0.5" style={{color:s.color}}>{s.value}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Implementation Steps</p>
                        <div className="space-y-2">
                          {rec.implementationSteps.map((step,i) => (
                            <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                              <p className="text-xs text-gray-600 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {rec.status !== 'accepted' && rec.status !== 'dismissed' && (
                        <div className="flex gap-3">
                          <button onClick={() => handleAccept(rec.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-100">
                            <CheckCircle size={12}/> Accept
                          </button>
                          <button onClick={() => handleDismiss(rec.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-semibold">
                            Dismiss
                          </button>
                        </div>
                      )}
                      {rec.status === 'accepted' && (
                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                          <CheckCircle size={15}/> Accepted — this recommendation is in your implementation queue.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          CLOUD COMPARISON TAB
      ════════════════════════════════════════════════════ */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">

          {/* 3-column cloud cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {PROVIDERS.map(pid => {
              const m         = CLOUD_META[pid];
              const isActive  = selectedProvider === pid;
              const provRecs  = recs.filter(r=>r.provider===pid&&r.status!=='dismissed');
              const savingsOpp= provRecs.reduce((s,r)=>s+r.monthlySavings,0);

              return (
                <div key={pid}
                  onClick={() => { setSelectedProvider(isActive ? 'all' : pid); setSelectedAccount('all'); }}
                  className={`bg-white rounded-2xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md border-2 ${
                    isActive ? '' : 'border-gray-100'
                  }`}
                  style={isActive ? { borderColor:m.color } : {}}>

                  {/* Cloud header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{background:m.bg}}>
                        {m.emoji}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.resources.compute + m.resources.storage + m.resources.database + m.resources.network} resources</p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-white" style={{background:m.color}}>
                        Filtered
                      </span>
                    )}
                  </div>

                  {/* Spend + savings */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Monthly Spend</p>
                      <p className="text-xl font-black text-gray-900 mt-1">{fmt(m.monthlyCost)}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{background:m.bg}}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{color:m.color}}>Savings Opp.</p>
                      <p className="text-xl font-black mt-1" style={{color:m.color}}>{fmt(savingsOpp || m.savingsOpp)}</p>
                    </div>
                  </div>

                  {/* Resource breakdown */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 mb-4 text-xs">
                    {[
                      { label:'Compute',  count:m.resources.compute,  icon:'⚙️' },
                      { label:'Storage',  count:m.resources.storage,  icon:'💾' },
                      { label:'Database', count:m.resources.database, icon:'🗄️' },
                      { label:'Network',  count:m.resources.network,  icon:'🔗' },
                    ].map((r,i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span>{r.icon}</span>
                        <span className="text-gray-500">{r.label}</span>
                        <span className="font-bold text-gray-800 ml-auto">{r.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Accounts — click to filter */}
                  <div className="pt-3 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Accounts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.label === 'AWS'   && PROVIDER_ACCOUNTS.aws.map((a,i)   => (
                        <button key={i} onClick={e => { e.stopPropagation(); setSelectedProvider(pid); setSelectedAccount(a); setActiveTab('recommendations'); }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border hover:opacity-80 transition-opacity"
                          style={{background:m.bg, color:m.color, borderColor:m.border}}>{a}</button>
                      ))}
                      {m.label === 'Azure' && PROVIDER_ACCOUNTS.azure.map((a,i) => (
                        <button key={i} onClick={e => { e.stopPropagation(); setSelectedProvider(pid); setSelectedAccount(a); setActiveTab('recommendations'); }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border hover:opacity-80 transition-opacity"
                          style={{background:m.bg, color:m.color, borderColor:m.border}}>{a}</button>
                      ))}
                      {m.label === 'GCP'   && PROVIDER_ACCOUNTS.gcp.map((a,i)   => (
                        <button key={i} onClick={e => { e.stopPropagation(); setSelectedProvider(pid); setSelectedAccount(a); setActiveTab('recommendations'); }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border hover:opacity-80 transition-opacity"
                          style={{background:m.bg, color:m.color, borderColor:m.border}}>{a}</button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spend trend — all 3 clouds */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Monthly Spend — All Clouds</h3>
            <p className="text-xs text-gray-400 mb-5">AWS vs Azure vs GCP over 6 months</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} width={52}/>
                <Tooltip formatter={(v:any,n:any)=>[fmt(v),n]} contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="AWS"   stroke="#ea580c" strokeWidth={2.5} dot={{r:3,fill:'#ea580c',strokeWidth:0}} name="AWS"  />
                <Line type="monotone" dataKey="Azure" stroke="#2563eb" strokeWidth={2.5} dot={{r:3,fill:'#2563eb',strokeWidth:0}} name="Azure"/>
                <Line type="monotone" dataKey="GCP"   stroke="#059669" strokeWidth={2.5} dot={{r:3,fill:'#059669',strokeWidth:0}} name="GCP"  />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Radar + Savings bar side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Cloud maturity radar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Cloud Maturity Score</h3>
              <p className="text-xs text-gray-400 mb-4">Across 5 Well-Architected pillars (0–100)</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="#f3f4f6"/>
                  <PolarAngleAxis dataKey="metric" tick={{fill:'#6b7280',fontSize:10}}/>
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:'#9ca3af',fontSize:9}} tickCount={4}/>
                  <Radar name="AWS"   dataKey="AWS"   stroke="#ea580c" fill="#ea580c" fillOpacity={0.1} strokeWidth={2}/>
                  <Radar name="Azure" dataKey="Azure" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2}/>
                  <Radar name="GCP"   dataKey="GCP"   stroke="#059669" fill="#059669" fillOpacity={0.1} strokeWidth={2}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Savings opportunity % bars */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Savings Opportunity by Provider</h3>
              <p className="text-xs text-gray-400 mb-6">Monthly savings as % of current spend</p>
              <div className="space-y-6">
                {PROVIDERS.map(pid => {
                  const m    = CLOUD_META[pid];
                  const pct  = Math.round((m.savingsOpp / m.monthlyCost) * 100);
                  return (
                    <div key={pid}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{m.emoji}</span>
                          <span className="text-sm font-bold text-gray-800">{m.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black" style={{color:m.color}}>{fmt(m.savingsOpp)}</span>
                          <span className="text-xs text-gray-400 ml-1">/ {fmt(m.monthlyCost)}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`, background:m.color, transition:'width 0.7s'}}/>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pct}% of current spend recoverable</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cross-cloud migration opportunities */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Cross-Cloud Migration Opportunities</h3>
                <p className="text-xs text-gray-400 mt-0.5">Services that may be cheaper on a different provider</p>
              </div>
              <ArrowLeftRight size={15} className="text-gray-300"/>
            </div>
            <div className="divide-y divide-gray-50">
              {CROSS_CLOUD_OPPS.map((opp,i) => {
                const fm  = CLOUD_META[opp.from];
                const tm  = CLOUD_META[opp.to];
                const pct = Math.round((opp.saving / opp.fromCost) * 100);
                return (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors flex-wrap">
                    {/* From → To */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl" style={{background:fm.bg, color:fm.color}}>
                        {fm.emoji} {fm.label}
                      </span>
                      <ArrowRight size={13} className="text-gray-300 flex-shrink-0"/>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl" style={{background:tm.bg, color:tm.color}}>
                        {tm.emoji} {tm.label}
                      </span>
                    </div>

                    <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-semibold text-gray-800">{opp.service}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs">
                        <span className="text-gray-400">{fmt(opp.fromCost)}/mo → {fmt(opp.toCost)}/mo</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-lg ${
                          opp.effort === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>{opp.effort} Effort</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-emerald-600 flex items-center gap-1 justify-end">
                        <ArrowUpRight size={13}/> {fmt(opp.saving)}/mo
                      </p>
                      <p className="text-xs text-gray-400">{pct}% savings</p>
                    </div>

                    {opp.recId && (
                      <button
                        onClick={() => { setActiveTab('recommendations'); setExpanded(opp.recId!); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold flex-shrink-0">
                        <ChevronRight size={11}/> View Rec
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Maturity score table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="font-bold text-gray-900">Maturity Score Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">Per-pillar scores — higher is better</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-48">Pillar</th>
                    {PROVIDERS.map(pid => (
                      <th key={pid} className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-center"
                        style={{color:CLOUD_META[pid].color}}>
                        {CLOUD_META[pid].emoji} {CLOUD_META[pid].label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Leader</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(Object.keys(CLOUD_META.aws.maturity) as (keyof typeof CLOUD_META.aws.maturity)[]).map((key,i) => {
                    const scores = { aws: CLOUD_META.aws.maturity[key], azure: CLOUD_META.azure.maturity[key], gcp: CLOUD_META.gcp.maturity[key] };
                    const maxVal = Math.max(...Object.values(scores));
                    const leader = PROVIDERS.find(p => scores[p] === maxVal)!;
                    const pillar = key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
                    return (
                      <tr key={i} className="hover:bg-gray-50/40">
                        <td className="px-6 py-3.5 text-sm font-semibold text-gray-700">{pillar}</td>
                        {PROVIDERS.map(pid => {
                          const score = scores[pid];
                          const isMax = score === maxVal;
                          const m     = CLOUD_META[pid];
                          return (
                            <td key={pid} className="px-6 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{width:`${score}%`, background:m.color}}/>
                                </div>
                                <span className={`text-xs font-bold ${isMax?'':'text-gray-400'}`}
                                  style={isMax?{color:m.color}:{}}>{score}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-xl"
                            style={{background:CLOUD_META[leader].bg, color:CLOUD_META[leader].color}}>
                            {CLOUD_META[leader].emoji} {CLOUD_META[leader].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </MainLayout>
  );
}
