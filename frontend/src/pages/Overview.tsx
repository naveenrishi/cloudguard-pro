import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DownloadReportButton from '../components/DownloadReportButton';
import {
  DollarSign, TrendingUp, Server, Shield,
  RefreshCw, AlertCircle, Calendar, BarChart2,
  Layers, Zap, ArrowUpRight, ArrowDownRight,
  Flame, Target, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Trash2, GitMerge, ShieldCheck,
  Activity, FolderOpen, Lightbulb, HardDrive, Box, Clock,
  TrendingDown, Database, Filter, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

interface ServiceItem { name: string; cost: number; percentage: number; }
interface MonthItem { month: string; total: number; }
interface SecurityFinding { severity: string; title: string; description: string; }
interface DashboardData {
  accountId: string; accountName: string; provider: string; region: string; status: string;
  totalCost: number; lastMonthCost: number; yearTotal: number; forecast: number;
  resourceCount: number; securityScore: number;
  topServices: ServiceItem[]; monthlyData: MonthItem[];
}

function fmt(n: number): string { const v = Number(n) || 0; return v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v.toFixed(2)}`; }
function fmtFull(n: number): string { const v = Number(n) || 0; return `$${v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }

const SERVICE_COLORS = ['#6366f1','#06b6d4','#f59e0b','#10b981','#ec4899','#8b5cf6','#3b82f6','#84cc16','#f97316','#ef4444'];

const card = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as React.CSSProperties;

const clickableCard = {
  ...card,
  cursor: 'pointer',
  transition: 'border-color 0.2s, transform 0.1s, box-shadow 0.2s',
} as React.CSSProperties;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
      <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 4px 0' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:'#6366f1', fontSize:14, fontWeight:700, margin:0 }}>{fmtFull(p.value)}</p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, iconBg, trendUp, trendLabel, onClick }: {
  label:string; value:string; sub?:string; icon:any; iconBg:string;
  trendUp?:boolean; trendLabel?:string; onClick?:()=>void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...card,
        cursor: onClick ? 'pointer' : 'default',
        border: hovered && onClick ? '1px solid #a5b4fc' : '1px solid #e5e7eb',
        boxShadow: hovered && onClick ? '0 4px 16px rgba(99,102,241,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {onClick && hovered && (
        <div style={{ position:'absolute', top:10, right:10, opacity:0.3 }}>
          <ChevronRight size={14} color="#6366f1"/>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ color:'#9ca3af', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>{label}</p>
        <div style={{ width:36, height:36, borderRadius:10, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={16} color="white" />
        </div>
      </div>
      <p style={{ color:'#111827', fontSize:22, fontWeight:700, margin:'0 0 4px 0' }}>{value}</p>
      {trendLabel && (
        <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, fontWeight:500, color: trendUp ? '#ef4444' : '#10b981' }}>
          {trendUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{trendLabel}
        </div>
      )}
      {sub && !trendLabel && <p style={{ color:'#9ca3af', fontSize:12, margin:0 }}>{sub}</p>}
    </div>
  );
}

function MonthDetail({ selectedMonth, monthlyData }: { selectedMonth:string; monthlyData:MonthItem[]; }) {
  const idx = monthlyData.findIndex(m => m.month === selectedMonth);
  if (idx === -1) return null;
  const curr = monthlyData[idx];
  const prev = idx > 0 ? monthlyData[idx-1] : null;
  const next = idx < monthlyData.length-1 ? monthlyData[idx+1] : null;
  const diffPrev = prev && prev.total > 0 ? ((curr.total-prev.total)/prev.total)*100 : null;
  const diffNext = next && curr.total > 0 ? ((next.total-curr.total)/curr.total)*100 : null;
  return (
    <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:32, flexWrap:'wrap' }}>
      <div><p style={{ color:'#9ca3af', fontSize:11, margin:'0 0 2px 0' }}>Selected</p><p style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>{selectedMonth}</p></div>
      <div><p style={{ color:'#9ca3af', fontSize:11, margin:'0 0 2px 0' }}>Spend</p><p style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>{fmtFull(curr.total)}</p></div>
      {prev && diffPrev !== null && (
        <div>
          <p style={{ color:'#9ca3af', fontSize:11, margin:'0 0 2px 0' }}>vs {prev.month}</p>
          <div style={{ display:'flex', alignItems:'center', gap:2, color:diffPrev>=0?'#ef4444':'#10b981', fontWeight:700, fontSize:13 }}>
            {diffPrev>=0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}{Math.abs(diffPrev).toFixed(1)}%
          </div>
        </div>
      )}
      {next && diffNext !== null && (
        <div>
          <p style={{ color:'#9ca3af', fontSize:11, margin:'0 0 2px 0' }}>Next: {next.month}</p>
          <div style={{ display:'flex', alignItems:'center', gap:2, color:diffNext>=0?'#ef4444':'#10b981', fontWeight:700, fontSize:13 }}>
            {diffNext>=0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}{Math.abs(diffNext).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}

function MonthPicker({ monthlyData, selected, onSelect, onClose }: {
  monthlyData:MonthItem[]; selected:string|null; onSelect:(m:string|null)=>void; onClose:()=>void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(4px)' }} onClick={onClose}/>
      <div style={{ position:'relative', background:'#fff', border:'1px solid #e5e7eb', borderRadius:20, padding:24, width:'100%', maxWidth:480, boxShadow:'0 25px 50px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ color:'#111827', fontWeight:700, fontSize:16, margin:0 }}>Select Month</h3>
          <button onClick={onClose} style={{ color:'#9ca3af', background:'none', border:'none', fontSize:22, cursor:'pointer', lineHeight:1, padding:0 }}>×</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, maxHeight:320, overflowY:'auto' }}>
          <button onClick={() => { onSelect(null); onClose(); }}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:12, border:selected===null?'1px solid #6366f1':'1px solid #e5e7eb', background:selected===null?'#eef2ff':'#f9fafb', color:selected===null?'#4f46e5':'#374151', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            <span>All months</span><span style={{ opacity:0.5, fontSize:11 }}>overview</span>
          </button>
          {[...monthlyData].reverse().map((m) => (
            <button key={m.month} onClick={() => { onSelect(m.month); onClose(); }}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:12, border:selected===m.month?'1px solid #6366f1':'1px solid #e5e7eb', background:selected===m.month?'#eef2ff':'#f9fafb', color:selected===m.month?'#4f46e5':'#374151', cursor:'pointer', fontSize:13 }}>
              <span style={{ fontWeight:600 }}>{m.month}</span>
              <span style={{ color:'#9ca3af', fontSize:11 }}>{fmt(m.total)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NukeWidget (AWS) ──────────────────────────────────────────────────────────
function NukeWidget({ accountId, navigate }: { accountId:string; navigate:any }) {
  const nukeStats = [
    { label:'Idle EC2',      count:4,  risk:'HIGH',   color:'#ef4444' },
    { label:'Unused EBS',    count:12, risk:'MEDIUM', color:'#f59e0b' },
    { label:'Old Snapshots', count:28, risk:'LOW',    color:'#6366f1' },
    { label:'Empty S3',      count:3,  risk:'MEDIUM', color:'#f59e0b' },
  ];
  const totalWaste = 847.50;
  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#dc2626,#991b1b)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Flame size={18} color="white"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Nuke Automation</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Idle resource cleanup</p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/nuke`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:500 }}>
          Manage <ChevronRight size={12}/>
        </button>
      </div>
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Estimated Monthly Waste</p>
          <p style={{ color:'#dc2626', fontSize:20, fontWeight:700, margin:0 }}>{fmtFull(totalWaste)}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Resources to clean</p>
          <p style={{ color:'#111827', fontSize:20, fontWeight:700, margin:0 }}>{nukeStats.reduce((s,n)=>s+n.count,0)}</p>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {nukeStats.map((n,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#f9fafb', borderRadius:10, border:'1px solid #f3f4f6' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Trash2 size={13} color={n.color}/>
              <span style={{ color:'#374151', fontSize:13 }}>{n.label}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ background:`${n.color}18`, color:n.color, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{n.risk}</span>
              <span style={{ color:'#111827', fontWeight:700, fontSize:13 }}>{n.count}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => navigate(`/account/${accountId}/nuke`)}
        style={{ width:'100%', padding:'10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Flame size={14}/> Run Dry-Run Nuke
      </button>
    </div>
  );
}

// ── MigrationWidget (AWS) ─────────────────────────────────────────────────────
function MigrationWidget({ accountId, navigate }: { accountId:string; navigate:any }) {
  const [activeTab, setActiveTab]             = useState<'optimize'|'compare'|'services'|'steps'>('optimize');
  const [selectedCloud, setSelectedCloud]     = useState<'aws'|'azure'|'gcp'>('aws');
  const [selectedCategory, setSelectedCategory] = useState<string>('Compute');

  const recommendations = [
    { from:'EC2 On-Demand', to:'Reserved Instances', saving:312.40, effort:'LOW',    confidence:94 },
    { from:'GP2 EBS',       to:'GP3 EBS',            saving:89.20,  effort:'LOW',    confidence:99 },
    { from:'NAT Gateway',   to:'NAT Instance',       saving:156.00, effort:'MEDIUM', confidence:78 },
  ];
  const totalSavings = recommendations.reduce((s,r) => s + r.saving, 0);
  const effortColor  = (e:string) => e==='LOW'?'#10b981':e==='MEDIUM'?'#f59e0b':'#ef4444';
  const effortBg     = (e:string) => e==='LOW'?'#ecfdf5':e==='MEDIUM'?'#fffbeb':'#fef2f2';

  // ── Cloud data ────────────────────────────────────────────────────────────
  const cloudData = {
    aws:   { name:'AWS',   color:'#f97316', bg:'#fff7ed', border:'#fed7aa', logo:'🟠', tagline:'Market leader, broadest ecosystem',
      pricing:{ compute:'$0.0416/hr (t3.medium)', storage:'$0.023/GB-mo (S3)', egress:'$0.09/GB', support:'From $29/mo' },
      score:{ cost:72, features:98, support:90, regions:95, compliance:97 },
      pros:['Largest service catalog (200+ services)','Best-in-class ML/AI (SageMaker)','32 global regions','Strongest compliance certifications','Largest partner ecosystem'],
      cons:['Most complex pricing','Steeper learning curve','Highest egress costs','Expensive support tiers'],
      bestFor:['Enterprise workloads','ML & AI','Global scale','Regulated industries'],
      migrationSteps:[
        { step:1, title:'Assessment & Discovery',  desc:'Run AWS Migration Evaluator to profile workloads and estimate total cost of ownership.',      time:'1–2 weeks', effort:'LOW'    },
        { step:2, title:'AWS Landing Zone Setup',  desc:'Use AWS Control Tower to configure multi-account structure, SCPs, IAM and CloudTrail.',       time:'1 week',    effort:'LOW'    },
        { step:3, title:'Network & Connectivity',  desc:'Design VPC, subnets, security groups. Set up Direct Connect or Site-to-Site VPN.',            time:'1–2 weeks', effort:'MEDIUM' },
        { step:4, title:'Identity & Security',     desc:'Configure AWS IAM Identity Center (SSO), federate with on-prem AD using AWS Managed AD.',     time:'1 week',    effort:'MEDIUM' },
        { step:5, title:'Migrate Databases',       desc:'Use AWS DMS for live replication. SCT for schema conversion. RDS Multi-AZ for HA.',            time:'2–4 weeks', effort:'HIGH'   },
        { step:6, title:'Migrate Applications',    desc:'Use AWS MGN (Application Migration Service) for lift-and-shift. Replatform to ECS/EKS.',      time:'2–6 weeks', effort:'MEDIUM' },
        { step:7, title:'Storage & Data',          desc:'Sync on-prem data to S3 using AWS DataSync. Set up S3 lifecycle rules and Glacier tiering.',  time:'1–2 weeks', effort:'LOW'    },
        { step:8, title:'Optimize & Right-size',   desc:'Enable Compute Optimizer and Cost Explorer. Purchase Reserved Instances or Savings Plans.',    time:'Ongoing',   effort:'LOW'    },
      ],
    },
    azure: { name:'Azure', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', logo:'🔵', tagline:'Best for Microsoft & hybrid environments',
      pricing:{ compute:'$0.0416/hr (B2s)', storage:'$0.018/GB-mo (Blob)', egress:'$0.087/GB', support:'From $29/mo' },
      score:{ cost:78, features:92, support:88, regions:90, compliance:96 },
      pros:['Seamless Microsoft 365 & AD integration','Best hybrid cloud (Azure Arc)','Strong EA discounts','Azure Hybrid Benefit for licenses','Excellent .NET & Windows support'],
      cons:['Fewer services than AWS','Some services less mature','Portal UX complexity','Inconsistent regional availability'],
      bestFor:['Microsoft shops','Hybrid cloud','Enterprise agreements','Government'],
      migrationSteps:[
        { step:1, title:'Azure Migrate Assessment',  desc:'Deploy Azure Migrate appliance to discover & assess on-prem VMs, SQL, and web apps.',       time:'1–2 weeks', effort:'LOW'    },
        { step:2, title:'Landing Zone Design',       desc:'Use Azure Landing Zone accelerator with management groups, RBAC policies and budgets.',      time:'1 week',    effort:'LOW'    },
        { step:3, title:'Hybrid Connectivity',       desc:'Configure ExpressRoute or VPN Gateway. Set up Azure AD Connect for identity federation.',   time:'1–2 weeks', effort:'MEDIUM' },
        { step:4, title:'Identity & Governance',     desc:'Migrate AD to Azure AD DS. Configure Conditional Access, PIM and Azure Policy.',            time:'1 week',    effort:'MEDIUM' },
        { step:5, title:'Migrate Databases',         desc:'Use Azure Database Migration Service for SQL Server, MySQL and PostgreSQL with zero downtime.',time:'2–4 weeks',effort:'HIGH'  },
        { step:6, title:'Migrate VMs & Apps',        desc:'Use Azure Migrate replication agent for VMs. AKS for containerized apps. App Service for web.',time:'2–6 weeks',effort:'MEDIUM'},
        { step:7, title:'Storage & Data',            desc:'Replicate data to Azure Blob with AzCopy. Use Azure File Sync for hybrid file shares.',      time:'1–2 weeks', effort:'LOW'    },
        { step:8, title:'Cost Governance',           desc:'Apply Azure Advisor recommendations. Configure auto-shutdown, budgets and cost alerts.',     time:'Ongoing',   effort:'LOW'    },
      ],
    },
    gcp:   { name:'GCP',   color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', logo:'🟢', tagline:'Best pricing & data/AI-first platform',
      pricing:{ compute:'$0.0350/hr (e2-medium)', storage:'$0.020/GB-mo (GCS)', egress:'$0.08/GB', support:'From $29/mo' },
      score:{ cost:88, features:84, support:82, regions:80, compliance:90 },
      pros:['Most competitive compute pricing (auto sustained-use discounts)','World-class data & analytics (BigQuery)','Best Kubernetes (GKE, creator of K8s)','Strong AI/ML (Vertex AI, TPUs)','Carbon-neutral operations'],
      cons:['Smaller enterprise footprint','Fewer regions','Less mature enterprise support','Smaller partner ecosystem'],
      bestFor:['Data & analytics','Kubernetes','Cost-sensitive workloads','AI research'],
      migrationSteps:[
        { step:1, title:'Discovery with StratoZone', desc:'Use Google StratoZone or Migrate to VMs to profile, size and plan workload migration.',      time:'1–2 weeks', effort:'LOW'    },
        { step:2, title:'GCP Foundation Setup',      desc:'Configure Organization, folders, projects, VPC, Org Policies and IAM with Cloud Identity.',  time:'1 week',    effort:'LOW'    },
        { step:3, title:'Network Architecture',      desc:'Set up Shared VPC, Cloud Interconnect or VPN, Cloud DNS and Cloud NAT.',                     time:'1–2 weeks', effort:'MEDIUM' },
        { step:4, title:'Identity & Access',         desc:'Federate on-prem AD with Cloud Identity. Configure IAM roles, Workload Identity and BeyondCorp.',time:'1 week', effort:'MEDIUM' },
        { step:5, title:'Migrate Databases',         desc:'Use Database Migration Service for PostgreSQL, MySQL, SQL Server → Cloud SQL or Spanner.',   time:'2–4 weeks', effort:'HIGH'   },
        { step:6, title:'Migrate VMs & Containers',  desc:'Use Migrate to VMs for lift-and-shift, or GKE Autopilot for containerized workloads.',       time:'2–6 weeks', effort:'MEDIUM' },
        { step:7, title:'Storage & Data Pipeline',   desc:'Transfer data to Cloud Storage with Transfer Service. Set up Pub/Sub and Dataflow pipelines.',time:'1–2 weeks', effort:'LOW'    },
        { step:8, title:'FinOps & Optimization',     desc:'Apply Committed Use Discounts, enable Recommender API, configure billing budgets and alerts.',time:'Ongoing',   effort:'LOW'    },
      ],
    },
  };

  // ── Service comparison table ──────────────────────────────────────────────
  const serviceCategories: Record<string, { category:string; icon:string; aws:{ name:string; price:string; note:string }; azure:{ name:string; price:string; note:string }; gcp:{ name:string; price:string; note:string } }[]> = {
    Compute: [
      { category:'VMs',         icon:'🖥️', aws:{ name:'EC2',                  price:'$0.0416/hr (t3.med)',   note:'Widest instance variety' }, azure:{ name:'Virtual Machines',      price:'$0.0416/hr (B2s)',     note:'Hybrid Benefit discount' }, gcp:{ name:'Compute Engine',      price:'$0.0350/hr (e2-med)',  note:'Auto sustained-use discount' } },
      { category:'Containers',  icon:'🐳', aws:{ name:'ECS / EKS',            price:'Free + EC2/Fargate',    note:'Managed or serverless'   }, azure:{ name:'AKS',                   price:'Free + VM cost',       note:'Best Azure-native K8s'   }, gcp:{ name:'GKE',                 price:'$0.10/hr cluster fee',note:'Original Kubernetes home'    } },
      { category:'Serverless',  icon:'⚡', aws:{ name:'Lambda',               price:'$0.20/1M requests',    note:'Largest trigger ecosystem'}, azure:{ name:'Azure Functions',       price:'$0.20/1M executions', note:'Deep .NET integration'   }, gcp:{ name:'Cloud Run / Functions',price:'$0.40/1M requests', note:'Best cold-start performance' } },
      { category:'Batch/HPC',   icon:'⚙️', aws:{ name:'AWS Batch',            price:'Pay per compute',      note:'Best HPC fleet options'  }, azure:{ name:'Azure Batch',           price:'Pay per compute',      note:'HPC MPI workloads'       }, gcp:{ name:'Cloud Batch',         price:'Pay per compute',     note:'Preemptible VM discounts'    } },
    ],
    Storage: [
      { category:'Object Store', icon:'🪣', aws:{ name:'S3',                  price:'$0.023/GB-mo',         note:'99.999999999% durability' }, azure:{ name:'Blob Storage',          price:'$0.018/GB-mo',         note:'Cool/Archive tiers'      }, gcp:{ name:'Cloud Storage',       price:'$0.020/GB-mo',        note:'Uniform bucket-level access' } },
      { category:'Block Storage',icon:'💽', aws:{ name:'EBS (gp3)',            price:'$0.08/GB-mo',          note:'Best IOPS per dollar'    }, azure:{ name:'Managed Disks',         price:'$0.08/GB-mo (P10)',    note:'Ultra Disk for <1ms'     }, gcp:{ name:'Persistent Disk',     price:'$0.04/GB-mo (std)',   note:'Balanced SSD affordable'     } },
      { category:'File Storage', icon:'📁', aws:{ name:'EFS / FSx',           price:'$0.30/GB-mo (EFS)',    note:'NFS & Windows shares'    }, azure:{ name:'Azure Files',           price:'$0.06/GB-mo',          note:'SMB 3.0 native support'  }, gcp:{ name:'Filestore',           price:'$0.20/GB-mo (Basic)', note:'NFSv3 for GKE workloads'     } },
      { category:'Archive',      icon:'🗄️', aws:{ name:'S3 Glacier',           price:'$0.004/GB-mo',         note:'Cheapest long-term'      }, azure:{ name:'Blob Archive',          price:'$0.00099/GB-mo',       note:'Lowest price tier'       }, gcp:{ name:'GCS Archive',         price:'$0.0012/GB-mo',       note:'Instant access archive'      } },
    ],
    Database: [
      { category:'Managed SQL',  icon:'🗃️', aws:{ name:'RDS / Aurora',        price:'$0.017/hr (db.t3.micro)',note:'Aurora 5x faster MySQL'  }, azure:{ name:'Azure SQL DB',          price:'$0.015/hr (B1s)',      note:'Hyperscale for large DBs'}, gcp:{ name:'Cloud SQL / Spanner',  price:'$0.013/hr (db-f1)',   note:'Spanner for global scale'    } },
      { category:'NoSQL',        icon:'📊', aws:{ name:'DynamoDB',             price:'$1.25/M writes',       note:'Best serverless NoSQL'   }, azure:{ name:'Cosmos DB',             price:'$0.008/100 RU/s/hr',  note:'Multi-model, multi-region'}, gcp:{ name:'Firestore / Bigtable', price:'$0.06/100K reads',    note:'Best for real-time apps'     } },
      { category:'Analytics DB', icon:'📈', aws:{ name:'Redshift',             price:'$0.25/hr (dc2.large)',  note:'RA3 managed storage'     }, azure:{ name:'Synapse Analytics',     price:'$0.023/DWU/hr',        note:'Unified analytics platform'}, gcp:{ name:'BigQuery',             price:'$5/TB scanned',       note:'Serverless, zero management' } },
      { category:'Cache',        icon:'⚡', aws:{ name:'ElastiCache',          price:'$0.017/hr (t3.micro)', note:'Redis & Memcached'        }, azure:{ name:'Azure Cache for Redis',  price:'$0.022/hr (C0 Basic)', note:'Active geo-replication'  }, gcp:{ name:'Memorystore',          price:'$0.016/hr (M1 Basic)','note':'Managed Redis/Memcached'    } },
    ],
    Networking: [
      { category:'Load Balancer',icon:'⚖️', aws:{ name:'ALB / NLB',           price:'$0.008/LCU-hr (ALB)',  note:'Best L7 routing rules'   }, azure:{ name:'Application Gateway',   price:'$0.008/CU-hr',         note:'WAF built-in'            }, gcp:{ name:'Cloud Load Balancing', price:'$0.025/5-tuple rule', note:'Global anycast LB'           } },
      { category:'CDN',          icon:'🌐', aws:{ name:'CloudFront',           price:'$0.0085/GB',           note:'580+ PoPs globally'      }, azure:{ name:'Azure CDN',             price:'$0.087/GB',            note:'Akamai & Verizon network'}, gcp:{ name:'Cloud CDN',            price:'$0.08/GB',            note:'Google edge network'         } },
      { category:'DNS',          icon:'🔍', aws:{ name:'Route 53',             price:'$0.50/hosted zone/mo', note:'Health checks + failover'}, azure:{ name:'Azure DNS',             price:'$0.50/zone/mo',        note:'99.99% SLA'              }, gcp:{ name:'Cloud DNS',            price:'$0.20/zone/mo',       note:'Cheapest managed DNS'        } },
      { category:'VPN / WAN',    icon:'🔒', aws:{ name:'Direct Connect',       price:'$0.03/GB (DX)',        note:'Dedicated 100Gbps links' }, azure:{ name:'ExpressRoute',          price:'$0.025/GB',            note:'Global Reach addon'      }, gcp:{ name:'Cloud Interconnect',   price:'$0.02/GB',            note:'Best egress pricing'         } },
    ],
    'AI / ML': [
      { category:'ML Platform',  icon:'🤖', aws:{ name:'SageMaker',            price:'$0.046/hr (ml.t3.med)','note':'End-to-end MLOps'       }, azure:{ name:'Azure ML',              price:'$0.10/hr (DS2v2)',     note:'AutoML + Designer GUI'   }, gcp:{ name:'Vertex AI',            price:'$0.10/hr (n1-std-4)', note:'Best TPU access'             } },
      { category:'LLM / GenAI',  icon:'✨', aws:{ name:'Bedrock',              price:'Per token (varies)',   note:'Anthropic, Meta, Mistral' }, azure:{ name:'Azure OpenAI',          price:'Per token (varies)',   note:'Exclusive GPT-4o access' }, gcp:{ name:'Vertex AI (Gemini)',    price:'Per token (varies)',  note:'Gemini Ultra + open models'  } },
      { category:'Vision / NLP', icon:'👁️', aws:{ name:'Rekognition / Comprehend',price:'$0.001/image',  note:'Widest API catalog'       }, azure:{ name:'Cognitive Services',    price:'$0.001/transaction',  note:'Best OCR (Form Recognizer)'}, gcp:{ name:'Vision / Natural Language',price:'$0.0015/unit', note:'Best translation quality'    } },
      { category:'Data / ETL',   icon:'🔄', aws:{ name:'Glue / EMR',           price:'$0.44/DPU-hr (Glue)', note:'Serverless Spark'         }, azure:{ name:'Data Factory',          price:'$0.25/1K activities',  note:'Best ETL UI'             }, gcp:{ name:'Dataflow / Dataproc',   price:'$0.048/vCPU-hr',      note:'Apache Beam managed'         } },
    ],
    Security: [
      { category:'IAM',          icon:'🔑', aws:{ name:'IAM + SSO Center',     price:'Free',                 note:'Most granular policies'  }, azure:{ name:'Azure AD / Entra ID',   price:'Free–$6/user/mo',     note:'Best enterprise SSO'     }, gcp:{ name:'Cloud IAM',            price:'Free',                note:'Org-level policy inheritance'} },
      { category:'Key Mgmt',     icon:'🗝️', aws:{ name:'KMS / Secrets Manager',price:'$1/key/mo + API calls','note':'HSM & CloudHSM option' }, azure:{ name:'Key Vault',             price:'$0.03/10K ops',        note:'HSM-backed tiers'        }, gcp:{ name:'Cloud KMS / Secret Mgr',price:'$0.06/key ver/mo',  note:'EKM for external HSM'        } },
      { category:'Firewall/WAF', icon:'🛡️', aws:{ name:'WAF / Shield',         price:'$5/rule/mo (WAF)',     note:'Shield Adv for DDoS'     }, azure:{ name:'Firewall / DDoS Prot',  price:'$1.25/rule/mo',        note:'$2,944/mo DDoS Standard' }, gcp:{ name:'Cloud Armor',          price:'$0.75/policy/mo',     note:'Google-scale DDoS protection'} },
      { category:'Compliance',   icon:'✅', aws:{ name:'Security Hub / GuardDuty',price:'$0.0010/event',    note:'97 compliance programs'  }, azure:{ name:'Defender for Cloud',    price:'$15/server/mo',        note:'96 compliance frameworks'}, gcp:{ name:'Security Command Center',price:'$0.12/asset/mo',   note:'90 compliance frameworks'    } },
    ],
  };

  const categories = Object.keys(serviceCategories);
  const clouds = ['aws','azure','gcp'] as const;
  const scoreLabels: Record<string,string> = { cost:'Cost', features:'Features', support:'Support', regions:'Regions', compliance:'Compliance' };
  const effortStepColor = (e:string) => e==='LOW'?'#10b981':e==='MEDIUM'?'#f59e0b':'#ef4444';
  const effortStepBg    = (e:string) => e==='LOW'?'#ecfdf5':e==='MEDIUM'?'#fffbeb':'#fef2f2';

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Target size={18} color="white"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Migration Advisor</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Optimize, compare & plan cloud migration</p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/migration-advisor`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:8, color:'#7c3aed', cursor:'pointer', fontSize:12, fontWeight:500 }}>
          Full Plan <ChevronRight size={12}/>
        </button>
      </div>

      {/* tab switcher — 4 tabs */}
      <div style={{ display:'flex', background:'#f9fafb', borderRadius:10, padding:3, border:'1px solid #e5e7eb' }}>
        {([['optimize','Optimize'],['compare','Compare'],['services','Services'],['steps','Steps']] as const).map(([t,label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex:1, padding:'6px 2px', borderRadius:8, border:'none', background:activeTab===t?'#4f46e5':'transparent', color:activeTab===t?'white':'#9ca3af', cursor:'pointer', fontSize:10, fontWeight:500, whiteSpace:'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: OPTIMIZE ── */}
      {activeTab === 'optimize' && (
        <>
          <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Potential Monthly Savings</p>
              <p style={{ color:'#7c3aed', fontSize:20, fontWeight:700, margin:0 }}>{fmtFull(totalSavings)}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Recommendations</p>
              <p style={{ color:'#111827', fontSize:20, fontWeight:700, margin:0 }}>{recommendations.length}</p>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recommendations.map((r,i) => (
              <div key={i} style={{ padding:'10px 12px', background:'#f9fafb', borderRadius:10, border:'1px solid #f3f4f6' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, minWidth:0 }}>
                  <GitMerge size={12} color="#7c3aed"/>
                  <span style={{ color:'#6b7280', fontSize:11 }}>{r.from}</span>
                  <span style={{ color:'#d1d5db', fontSize:11 }}>→</span>
                  <span style={{ color:'#374151', fontSize:11, fontWeight:600 }}>{r.to}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:effortBg(r.effort), color:effortColor(r.effort), fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{r.effort} effort</span>
                    <span style={{ color:'#9ca3af', fontSize:11 }}>{r.confidence}% confident</span>
                  </div>
                  <span style={{ color:'#10b981', fontWeight:700, fontSize:13 }}>-{fmtFull(r.saving)}/mo</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: COMPARE CLOUDS ── */}
      {activeTab === 'compare' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', gap:6 }}>
            {clouds.map(c => { const d = cloudData[c]; return (
              <button key={c} onClick={() => setSelectedCloud(c)}
                style={{ flex:1, padding:'8px 4px', borderRadius:10, border: selectedCloud===c ? `2px solid ${d.color}` : '1px solid #e5e7eb', background: selectedCloud===c ? d.bg : '#f9fafb', cursor:'pointer', transition:'all 0.2s' }}>
                <div style={{ fontSize:16, marginBottom:2 }}>{d.logo}</div>
                <div style={{ color: selectedCloud===c ? d.color : '#6b7280', fontSize:11, fontWeight:700 }}>{d.name}</div>
              </button>
            ); })}
          </div>
          {(() => { const d = cloudData[selectedCloud]; return (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:'10px 14px', background:d.bg, border:`1px solid ${d.border}`, borderRadius:12 }}>
                <p style={{ color:d.color, fontSize:12, fontWeight:700, margin:'0 0 8px 0' }}>{d.logo} {d.name} — {d.tagline}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {Object.entries(d.pricing).map(([k,v]) => (
                    <div key={k}>
                      <p style={{ color:'#9ca3af', fontSize:9, fontWeight:600, textTransform:'uppercase', margin:'0 0 1px 0' }}>{k}</p>
                      <p style={{ color:'#111827', fontSize:11, fontWeight:600, margin:0, fontFamily:'monospace' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color:'#9ca3af', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 8px 0' }}>Performance Scores</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {Object.entries(d.score).map(([k,v]) => (
                    <div key={k}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ color:'#374151', fontSize:11 }}>{scoreLabels[k]}</span>
                        <span style={{ color:d.color, fontSize:11, fontWeight:700 }}>{v}/100</span>
                      </div>
                      <div style={{ height:5, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, background:d.color, width:`${v}%`, transition:'width 0.5s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <p style={{ color:'#10b981', fontSize:10, fontWeight:700, textTransform:'uppercase', margin:'0 0 6px 0' }}>✓ Pros</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {d.pros.map((p,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:5 }}>
                        <CheckCircle size={10} color="#10b981" style={{ marginTop:2, flexShrink:0 }}/>
                        <span style={{ color:'#374151', fontSize:10, lineHeight:1.4 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ color:'#ef4444', fontSize:10, fontWeight:700, textTransform:'uppercase', margin:'0 0 6px 0' }}>✗ Cons</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {d.cons.map((c,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:5 }}>
                        <XCircle size={10} color="#ef4444" style={{ marginTop:2, flexShrink:0 }}/>
                        <span style={{ color:'#374151', fontSize:10, lineHeight:1.4 }}>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p style={{ color:'#9ca3af', fontSize:10, fontWeight:600, textTransform:'uppercase', margin:'0 0 6px 0' }}>Best For</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {d.bestFor.map((b,i) => (
                    <span key={i} style={{ padding:'3px 9px', background:d.bg, border:`1px solid ${d.border}`, borderRadius:20, color:d.color, fontSize:10, fontWeight:600 }}>{b}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color:'#9ca3af', fontSize:10, fontWeight:600, textTransform:'uppercase', margin:'0 0 8px 0' }}>vs Other Clouds</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {Object.keys(d.score).map(metric => {
                    const scores = clouds.map(c => ({ cloud:c, val: cloudData[c].score[metric as keyof typeof d.score], color: cloudData[c].color, name: cloudData[c].name }));
                    const best = Math.max(...scores.map(s => s.val));
                    return (
                      <div key={metric} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ color:'#6b7280', fontSize:10, width:72, flexShrink:0 }}>{scoreLabels[metric]}</span>
                        <div style={{ display:'flex', gap:3, flex:1 }}>
                          {scores.map(s => <div key={s.cloud} title={`${s.name}: ${s.val}`} style={{ flex:s.val, height:8, borderRadius:4, background:s.color, opacity: s.val===best?1:0.35, transition:'all 0.3s' }}/>)}
                        </div>
                        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                          {scores.map(s => <span key={s.cloud} style={{ color:s.cloud===selectedCloud?s.color:'#9ca3af', fontSize:9, fontWeight:s.val===best?700:400 }}>{s.val}</span>)}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    {clouds.map(c => (
                      <div key={c} style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:cloudData[c].color }}/>
                        <span style={{ color:'#9ca3af', fontSize:9 }}>{cloudData[c].name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ); })()}
        </div>
      )}

      {/* ── TAB: SERVICES ── */}
      {activeTab === 'services' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* category pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                style={{ padding:'4px 10px', borderRadius:20, border: selectedCategory===cat ? '1px solid #6366f1' : '1px solid #e5e7eb', background: selectedCategory===cat ? '#eef2ff' : '#f9fafb', color: selectedCategory===cat ? '#4f46e5' : '#6b7280', fontSize:10, fontWeight:600, cursor:'pointer' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* header row */}
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:6, padding:'6px 8px', background:'#f9fafb', borderRadius:8 }}>
            <span style={{ color:'#9ca3af', fontSize:10, fontWeight:600, textTransform:'uppercase' }}>Service</span>
            {clouds.map(c => (
              <div key={c} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:11 }}>{cloudData[c].logo}</span>
                <span style={{ color:cloudData[c].color, fontSize:10, fontWeight:700 }}>{cloudData[c].name}</span>
              </div>
            ))}
          </div>

          {/* service rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
            {(serviceCategories[selectedCategory] || []).map((row, i) => (
              <div key={i} style={{ border:'1px solid #f3f4f6', borderRadius:10, overflow:'hidden' }}>
                {/* row header */}
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'#f9fafb', borderBottom:'1px solid #f3f4f6' }}>
                  <span style={{ fontSize:13 }}>{row.icon}</span>
                  <span style={{ color:'#111827', fontSize:12, fontWeight:700 }}>{row.category}</span>
                </div>
                {/* 3-column service cards */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0 }}>
                  {clouds.map((c, ci) => {
                    const svc = row[c];
                    const d   = cloudData[c];
                    return (
                      <div key={c} style={{ padding:'8px 10px', borderRight: ci < 2 ? '1px solid #f3f4f6' : 'none', background:'#ffffff' }}>
                        <p style={{ color:d.color, fontSize:11, fontWeight:700, margin:'0 0 2px 0' }}>{svc.name}</p>
                        <p style={{ color:'#111827', fontSize:10, fontFamily:'monospace', margin:'0 0 3px 0', fontWeight:600 }}>{svc.price}</p>
                        <p style={{ color:'#9ca3af', fontSize:10, margin:0, lineHeight:1.3 }}>{svc.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* cheapest highlight */}
          <div style={{ padding:'8px 12px', background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:8, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:13 }}>💡</span>
            <span style={{ color:'#065f46', fontSize:11 }}>
              <strong>Price tip:</strong> GCP is cheapest for compute & networking. Azure is lowest for object storage. AWS leads on managed services breadth.
            </span>
          </div>
        </div>
      )}

      {/* ── TAB: MIGRATION STEPS (all 3 clouds side by side) ── */}
      {activeTab === 'steps' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* cloud selector */}
          <div style={{ display:'flex', gap:6 }}>
            {clouds.map(c => { const d = cloudData[c]; return (
              <button key={c} onClick={() => setSelectedCloud(c)}
                style={{ flex:1, padding:'7px 4px', borderRadius:10, border: selectedCloud===c ? `2px solid ${d.color}` : '1px solid #e5e7eb', background: selectedCloud===c ? d.bg : '#f9fafb', cursor:'pointer' }}>
                <span style={{ fontSize:13 }}>{d.logo}</span>
                <span style={{ color: selectedCloud===c ? d.color : '#6b7280', fontSize:11, fontWeight:700, marginLeft:4 }}>{d.name}</span>
              </button>
            ); })}
          </div>

          {/* steps timeline */}
          <div style={{ display:'flex', flexDirection:'column', gap:0, maxHeight:420, overflowY:'auto', paddingRight:4 }}>
            {cloudData[selectedCloud].migrationSteps.map((s, i, arr) => (
              <div key={i} style={{ display:'flex', gap:12, paddingBottom: i < arr.length-1 ? 16 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:cloudData[selectedCloud].bg, border:`2px solid ${cloudData[selectedCloud].color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:cloudData[selectedCloud].color, fontSize:11, fontWeight:800 }}>{s.step}</span>
                  </div>
                  {i < arr.length-1 && <div style={{ width:2, flex:1, background:`${cloudData[selectedCloud].color}20`, marginTop:4, minHeight:20 }}/>}
                </div>
                <div style={{ flex:1, paddingTop:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ color:'#111827', fontSize:12, fontWeight:700 }}>{s.title}</span>
                    <span style={{ background:effortStepBg(s.effort), color:effortStepColor(s.effort), fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{s.effort}</span>
                    <span style={{ color:'#9ca3af', fontSize:10, display:'flex', alignItems:'center', gap:3 }}>
                      <Clock size={9}/> {s.time}
                    </span>
                  </div>
                  <p style={{ color:'#6b7280', fontSize:11, margin:0, lineHeight:1.5 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* all-clouds summary table */}
          <div>
            <p style={{ color:'#9ca3af', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 8px 0' }}>All Clouds — Step Comparison</p>
            <div style={{ border:'1px solid #f3f4f6', borderRadius:10, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'22px 1fr 1fr 1fr', gap:0, padding:'6px 8px', background:'#f9fafb', borderBottom:'1px solid #f3f4f6' }}>
                <span style={{ color:'#9ca3af', fontSize:9, fontWeight:700 }}>#</span>
                {clouds.map(c => (
                  <div key={c} style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ fontSize:10 }}>{cloudData[c].logo}</span>
                    <span style={{ color:cloudData[c].color, fontSize:9, fontWeight:700 }}>{cloudData[c].name}</span>
                  </div>
                ))}
              </div>
              {[0,1,2,3,4,5,6,7].map(idx => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'22px 1fr 1fr 1fr', gap:0, padding:'6px 8px', borderBottom: idx < 7 ? '1px solid #f9fafb' : 'none', background: idx%2===0 ? '#ffffff' : '#fafafa' }}>
                  <span style={{ color:'#d1d5db', fontSize:10, fontWeight:700, paddingTop:2 }}>{idx+1}</span>
                  {clouds.map((c, ci) => {
                    const step = cloudData[c].migrationSteps[idx];
                    return (
                      <div key={c} style={{ paddingRight: ci < 2 ? 8 : 0 }}>
                        <p style={{ color:'#374151', fontSize:10, fontWeight:600, margin:'0 0 1px 0', lineHeight:1.3 }}>{step?.title || '—'}</p>
                        <p style={{ color:'#9ca3af', fontSize:9, margin:0 }}>{step?.time || ''}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'10px 14px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Clock size={13} color="#7c3aed"/>
              <span style={{ color:'#7c3aed', fontSize:12, fontWeight:600 }}>Estimated Total Duration</span>
            </div>
            <span style={{ color:'#111827', fontSize:13, fontWeight:700 }}>10 – 20 weeks</span>
          </div>
        </div>
      )}

      <button onClick={() => navigate(`/account/${accountId}/migration-advisor`)}
        style={{ width:'100%', padding:'10px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:10, color:'#7c3aed', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Target size={14}/> View Full Migration Plan
      </button>
    </div>
  );
}

// ── SecurityWidget ────────────────────────────────────────────────────────────
function SecurityWidget({ accountId, navigate, securityScore, findings, provider }: {
  accountId:string; navigate:any; securityScore:number; findings:SecurityFinding[]; provider:string;
}) {
  const scoreColor = securityScore>=70?'#10b981':securityScore>=40?'#f59e0b':'#ef4444';
  const scoreBg    = securityScore>=70?'#ecfdf5':securityScore>=40?'#fffbeb':'#fef2f2';
  const severityCount: Record<string,number> = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 };
  findings.forEach(f => { if (f.severity in severityCount) severityCount[f.severity]++; });

  const complianceFrameworks = provider === 'AZURE' ? [
    { name:'Azure Security Benchmark', score:Math.min(100,securityScore+5), color:'#2563eb' },
    { name:'CIS Azure',                score:Math.max(0,securityScore-5),   color:'#0891b2' },
    { name:'ISO 27001',                score:Math.min(100,securityScore+2), color:'#10b981' },
    { name:'PCI-DSS',                  score:Math.max(0,securityScore-10),  color:'#8b5cf6' },
  ] : [
    { name:'CIS AWS',   score:Math.min(100,securityScore+5), color:'#6366f1' },
    { name:'PCI-DSS',   score:Math.max(0,securityScore-10),  color:'#8b5cf6' },
    { name:'SOC 2',     score:Math.min(100,securityScore+2), color:'#06b6d4' },
    { name:'ISO 27001', score:Math.max(0,securityScore-5),   color:'#10b981' },
  ];

  const pieData = [
    { name:'Score', value:securityScore,     fill:scoreColor },
    { name:'Gap',   value:100-securityScore, fill:'#f3f4f6'  },
  ];
  const severityColors: Record<string,string> = { CRITICAL:'#ef4444', HIGH:'#f97316', MEDIUM:'#f59e0b', LOW:'#6366f1' };
  const severityBg:     Record<string,string> = { CRITICAL:'#fef2f2', HIGH:'#fff7ed',  MEDIUM:'#fffbeb',  LOW:'#eef2ff'  };

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:scoreBg, border:`1px solid ${scoreColor}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ShieldCheck size={18} color={scoreColor}/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Security & Compliance</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Posture & framework status</p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/security`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:scoreBg, border:`1px solid ${scoreColor}40`, borderRadius:8, color:scoreColor, cursor:'pointer', fontSize:12, fontWeight:500 }}>
          Details <ChevronRight size={12}/>
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16, alignItems:'center' }}>
        <div style={{ position:'relative', width:90, height:90 }}>
          <PieChart width={90} height={90}>
            <Pie data={pieData} cx={40} cy={40} innerRadius={28} outerRadius={40} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              {pieData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
            </Pie>
          </PieChart>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:scoreColor, fontSize:18, fontWeight:800, lineHeight:1 }}>{securityScore}</span>
            <span style={{ color:'#9ca3af', fontSize:9, fontWeight:500 }}>/ 100</span>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {Object.entries(severityCount).map(([sev,count]) => (
            <div key={sev} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:severityBg[sev]||'#f9fafb', borderRadius:8, border:`1px solid ${severityColors[sev]}20` }}>
              <span style={{ color:severityColors[sev], fontSize:10, fontWeight:600 }}>{sev}</span>
              <span style={{ color:count>0?severityColors[sev]:'#d1d5db', fontWeight:700, fontSize:13 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p style={{ color:'#9ca3af', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 10px 0' }}>Compliance Frameworks</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {complianceFrameworks.map((f,i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:'#374151', fontSize:12, fontWeight:500 }}>{f.name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:f.score>=70?'#10b981':f.score>=40?'#f59e0b':'#ef4444', fontSize:12, fontWeight:700 }}>{f.score}%</span>
                  {f.score>=70?<CheckCircle size={12} color="#10b981"/>:f.score>=40?<AlertTriangle size={12} color="#f59e0b"/>:<XCircle size={12} color="#ef4444"/>}
                </div>
              </div>
              <div style={{ height:4, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:f.color, width:`${f.score}%`, transition:'width 0.5s ease' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {findings.length > 0 && (
        <div>
          <p style={{ color:'#9ca3af', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px 0' }}>Recent Findings</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {findings.slice(0,3).map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', background:'#f9fafb', borderRadius:8 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:severityColors[f.severity]||'#d1d5db', marginTop:4, flexShrink:0 }}/>
                <div style={{ minWidth:0 }}>
                  <p style={{ color:'#111827', fontSize:12, fontWeight:500, margin:'0 0 2px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.title}</p>
                  <p style={{ color:'#9ca3af', fontSize:11, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => navigate(`/account/${accountId}/security`)}
        style={{ width:'100%', padding:'10px', background:scoreBg, border:`1px solid ${scoreColor}30`, borderRadius:10, color:scoreColor, cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Shield size={14}/> Full Security Report
      </button>
    </div>
  );
}

// ── AzureNukeWidget ───────────────────────────────────────────────────────────
function AzureNukeWidget({ accountId, navigate }: { accountId:string; navigate:any }) {
  const nukeStats = [
    { label:'Stopped VMs',           count:6,  risk:'HIGH',   color:'#ef4444' },
    { label:'Unattached Disks',      count:14, risk:'MEDIUM', color:'#f59e0b' },
    { label:'Old Snapshots',         count:22, risk:'LOW',    color:'#6366f1' },
    { label:'Empty Resource Groups', count:5,  risk:'MEDIUM', color:'#f59e0b' },
  ];
  const totalWaste = 1024.00;
  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#dc2626,#991b1b)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Flame size={18} color="white"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Azure Nuke</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Idle resource cleanup · Every Friday 6 PM</p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/nuke`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:500 }}>
          Manage <ChevronRight size={12}/>
        </button>
      </div>
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Estimated Monthly Waste</p>
          <p style={{ color:'#dc2626', fontSize:20, fontWeight:700, margin:0 }}>{fmtFull(totalWaste)}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Resources to clean</p>
          <p style={{ color:'#111827', fontSize:20, fontWeight:700, margin:0 }}>{nukeStats.reduce((s,n)=>s+n.count,0)}</p>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {nukeStats.map((n,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#f9fafb', borderRadius:10, border:'1px solid #f3f4f6' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Trash2 size={13} color={n.color}/>
              <span style={{ color:'#374151', fontSize:13 }}>{n.label}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ background:`${n.color}18`, color:n.color, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{n.risk}</span>
              <span style={{ color:'#111827', fontWeight:700, fontSize:13 }}>{n.count}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => navigate(`/account/${accountId}/nuke`)}
        style={{ width:'100%', padding:'10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Flame size={14}/> Run Dry-Run Nuke
      </button>
    </div>
  );
}

// ── AzureAdvisorWidget ────────────────────────────────────────────────────────
function AzureAdvisorWidget({ accountId, navigate }: { accountId:string; navigate:any }) {
  const [recs, setRecs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`http://localhost:3000/api/azure/advisor/${accountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.recommendations) setRecs(d.recommendations); })
      .catch(() => {});
  }, [accountId]);

  const displayRecs = recs.length > 0 ? recs : [
    { category:'Cost',        impact:'High',   title:'Right-size underutilized VMs',  description:'VMs running at <5% CPU for 14+ days',          estimatedSaving:120, effort:'LOW'    },
    { category:'Cost',        impact:'Medium', title:'Switch to Reserved Instances',  description:'Commit to 1-year for predictable workloads',    estimatedSaving:340, effort:'LOW'    },
    { category:'Performance', impact:'Medium', title:'Enable Azure CDN',              description:'Improve latency for static assets',                                  effort:'MEDIUM' },
  ];

  const totalSavings  = displayRecs.reduce((s:number,r:any) => s+(r.estimatedSaving||0), 0);
  const categoryColor = (c:string) => c==='Cost'?'#10b981':c==='Performance'?'#6366f1':c==='Security'?'#ef4444':'#f59e0b';
  const categoryBg    = (c:string) => c==='Cost'?'#ecfdf5':c==='Performance'?'#eef2ff':c==='Security'?'#fef2f2':'#fffbeb';
  const effortColor   = (e:string) => e==='LOW'?'#10b981':e==='MEDIUM'?'#f59e0b':'#ef4444';
  const effortBg      = (e:string) => e==='LOW'?'#ecfdf5':e==='MEDIUM'?'#fffbeb':'#fef2f2';
  const impactColor   = (i:string) => i==='High'?'#ef4444':i==='Medium'?'#f59e0b':'#6366f1';
  const impactBg      = (i:string) => i==='High'?'#fef2f2':i==='Medium'?'#fffbeb':'#eef2ff';

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Lightbulb size={18} color="white"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Azure Advisor</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Cost optimization paths</p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/migration-advisor`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, color:'#2563eb', cursor:'pointer', fontSize:12, fontWeight:500 }}>
          Details <ChevronRight size={12}/>
        </button>
      </div>
      <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Potential Monthly Savings</p>
          <p style={{ color:'#2563eb', fontSize:20, fontWeight:700, margin:0 }}>{fmtFull(totalSavings)}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ color:'#6b7280', fontSize:11, margin:'0 0 2px 0' }}>Recommendations</p>
          <p style={{ color:'#111827', fontSize:20, fontWeight:700, margin:0 }}>{displayRecs.length}</p>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {displayRecs.slice(0,3).map((r:any,i:number) => (
          <div key={i} style={{ padding:'10px 12px', background:'#f9fafb', borderRadius:10, border:'1px solid #f3f4f6' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <span style={{ background:categoryBg(r.category), color:categoryColor(r.category), fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:99 }}>{r.category}</span>
              <span style={{ color:'#374151', fontSize:12, fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:impactBg(r.impact), color:impactColor(r.impact), fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{r.impact} impact</span>
                <span style={{ background:effortBg(r.effort), color:effortColor(r.effort), fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{r.effort} effort</span>
              </div>
              {r.estimatedSaving && <span style={{ color:'#10b981', fontWeight:700, fontSize:13 }}>-{fmtFull(r.estimatedSaving)}/mo</span>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => navigate(`/account/${accountId}/migration-advisor`)}
        style={{ width:'100%', padding:'10px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, color:'#2563eb', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Lightbulb size={14}/> View All Recommendations
      </button>
    </div>
  );
}

// ── AzureResourceGroupsWidget ─────────────────────────────────────────────────
function AzureResourceGroupsWidget({ accountId }: { accountId:string }) {
  const [groups, setGroups] = useState<{ name:string; cost:number; resources:number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3000/api/azure/resource-groups/${accountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setGroups(d?.groups||[]); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, [accountId]);

  const maxCost = Math.max(...groups.map(g=>g.cost), 1);

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0891b2,#0e7490)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <FolderOpen size={18} color="white"/>
        </div>
        <div>
          <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Resource Groups</h3>
          <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Cost by resource group</p>
        </div>
      </div>
      {!loaded ? (
        <div style={{ padding:'24px 0', textAlign:'center' }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }}/>
          <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>Loading resource groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div style={{ padding:'24px 0', textAlign:'center' }}>
          <FolderOpen size={28} color="#d1d5db" style={{ display:'block', margin:'0 auto 8px' }}/>
          <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>No resource group cost data available</p>
          <p style={{ color:'#d1d5db', fontSize:11, margin:'4px 0 0' }}>Cost Management Reader role may be needed</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {groups.slice(0,6).map((g,i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:SERVICE_COLORS[i%SERVICE_COLORS.length], flexShrink:0 }}/>
                  <span style={{ color:'#374151', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <span style={{ color:'#9ca3af', fontSize:11 }}>{g.resources} resources</span>
                  <span style={{ color:'#111827', fontSize:13, fontWeight:700 }}>{fmtFull(g.cost)}</span>
                </div>
              </div>
              <div style={{ height:4, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:SERVICE_COLORS[i%SERVICE_COLORS.length], width:`${(g.cost/maxCost)*100}%`, transition:'width 0.4s ease' }}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AzureActivityWidget ───────────────────────────────────────────────────────
function AzureActivityWidget({ accountId }: { accountId:string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loaded,     setLoaded]     = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3000/api/azure/activity/${accountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setActivities(d?.activities||[]); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, [accountId]);

  const dotColor = (op:string) => {
    if (!op) return '#6366f1';
    if (op.includes('Delete')) return '#ef4444';
    if (op.includes('Write') || op.includes('Create')) return '#10b981';
    if (op.includes('Action')) return '#f59e0b';
    return '#6366f1';
  };

  const timeAgo = (ts:string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  };

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Activity size={18} color="white"/>
        </div>
        <div>
          <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Activity Logs</h3>
          <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Recent Azure deployments & changes</p>
        </div>
      </div>
      {!loaded ? (
        <div style={{ padding:'24px 0', textAlign:'center' }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }}/>
          <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>Loading activity logs...</p>
        </div>
      ) : activities.length === 0 ? (
        <div style={{ padding:'24px 0', textAlign:'center' }}>
          <Activity size={28} color="#d1d5db" style={{ display:'block', margin:'0 auto 8px' }}/>
          <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>No recent activity found</p>
          <p style={{ color:'#d1d5db', fontSize:11, margin:'4px 0 0' }}>Monitoring Reader role may be needed</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
          {activities.slice(0,8).map((a:any,i:number) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px', background:'#f9fafb', borderRadius:8 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:dotColor(a.operationName), marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:'#111827', fontSize:12, fontWeight:500, margin:'0 0 2px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.operationName||a.name}</p>
                <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>{a.resourceGroup} • {a.caller||'System'}</p>
              </div>
              <span style={{ color:'#d1d5db', fontSize:10, flexShrink:0 }}>{timeAgo(a.eventTimestamp||a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── OverviewOptimizationWidget ────────────────────────────────────────────────
interface OptRec {
  id:string; title:string; description:string; type:string;
  priority:'High'|'Medium'|'Low'; effort:'Low'|'Medium'|'High';
  potentialSavings:number; currentCost:number; savingsPercent:number;
  resources?:string[];
}


// ── SecurityFindingsWidget ────────────────────────────────────────────────────
function SecurityFindingsWidget({ accountId, navigate, provider }: { accountId:string; navigate:any; provider:string }) {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<string>('ALL');

  useEffect(() => {
    fetch(`http://localhost:3000/api/cloud/accounts/${accountId}/security`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.findings) setFindings(d.findings); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accountId]);

  const severityColors: Record<string,string> = { CRITICAL:'#ef4444', HIGH:'#f97316', MEDIUM:'#f59e0b', LOW:'#6366f1' };
  const severityBg:     Record<string,string> = { CRITICAL:'#fef2f2', HIGH:'#fff7ed',  MEDIUM:'#fffbeb',  LOW:'#eef2ff' };
  const severityOrder = ['CRITICAL','HIGH','MEDIUM','LOW'];

  const counts = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 } as Record<string,number>;
  findings.forEach(f => { if (f.severity in counts) counts[f.severity]++; });

  const filtered = filter === 'ALL' ? findings : findings.filter(f => f.severity === filter);

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca40', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <AlertTriangle size={18} color="#ef4444"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Security Findings</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>{provider} — live scan results</p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/security`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#fef2f2', border:'1px solid #fecaca40', borderRadius:8, color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:500 }}>
          View All <ChevronRight size={12}/>
        </button>
      </div>

      {/* severity summary pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        <button onClick={() => setFilter('ALL')}
          style={{ padding:'4px 10px', borderRadius:20, border: filter==='ALL' ? '1px solid #6366f1' : '1px solid #e5e7eb', background: filter==='ALL' ? '#eef2ff' : '#f9fafb', color: filter==='ALL' ? '#4f46e5' : '#6b7280', fontSize:11, fontWeight:600, cursor:'pointer' }}>
          All ({findings.length})
        </button>
        {severityOrder.map(sev => (
          <button key={sev} onClick={() => setFilter(sev)}
            style={{ padding:'4px 10px', borderRadius:20, border: filter===sev ? `1px solid ${severityColors[sev]}` : '1px solid #e5e7eb', background: filter===sev ? severityBg[sev] : '#f9fafb', color: filter===sev ? severityColors[sev] : '#6b7280', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            {sev} ({counts[sev]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 0' }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb', borderTopColor:'#ef4444', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <CheckCircle size={28} color="#10b981" style={{ margin:'0 auto 8px', display:'block' }}/>
          <p style={{ color:'#10b981', fontSize:13, fontWeight:600, margin:0 }}>No {filter !== 'ALL' ? filter.toLowerCase() : ''} findings</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
          {filtered.slice(0,8).map((f,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:severityBg[f.severity]||'#f9fafb', borderRadius:10, border:`1px solid ${severityColors[f.severity]||'#e5e7eb'}20` }}>
              <div style={{ flexShrink:0, marginTop:2 }}>
                {f.severity === 'CRITICAL' ? <XCircle size={14} color={severityColors[f.severity]}/> :
                 f.severity === 'HIGH'     ? <AlertTriangle size={14} color={severityColors[f.severity]}/> :
                 <AlertCircle size={14} color={severityColors[f.severity]||'#6b7280'}/>}
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ color: severityColors[f.severity]||'#6b7280', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{f.severity}</span>
                </div>
                <p style={{ color:'#111827', fontSize:12, fontWeight:600, margin:'0 0 2px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.title}</p>
                <p style={{ color:'#6b7280', fontSize:11, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.description}</p>
                {f.remediation && (
                  <p style={{ color:'#10b981', fontSize:10, margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    ✓ {f.remediation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => navigate(`/account/${accountId}/security`)}
        style={{ width:'100%', padding:'10px', background:'#fef2f2', border:'1px solid #fecaca30', borderRadius:10, color:'#ef4444', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Shield size={14}/> Full Security Report
      </button>
    </div>
  );
}

// ── IAMReportWidget ───────────────────────────────────────────────────────────
function IAMReportWidget({ accountId, navigate, provider }: { accountId:string; navigate:any; provider:string }) {
  const [iamData, setIamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3000/api/cloud/accounts/${accountId}/security`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        // Extract IAM-related findings
        const iamFindings = (d.findings || []).filter((f: any) =>
          f.title?.toLowerCase().includes('iam') ||
          f.title?.toLowerCase().includes('mfa') ||
          f.title?.toLowerCase().includes('user') ||
          f.title?.toLowerCase().includes('root') ||
          f.title?.toLowerCase().includes('role') ||
          f.title?.toLowerCase().includes('policy') ||
          f.resource?.includes('iam') ||
          f.resource?.includes('user') ||
          f.compliance?.some((c: string) => c.includes('IAM'))
        );
        const mfaIssues    = iamFindings.filter((f: any) => f.title?.toLowerCase().includes('mfa'));
        const rootIssues   = iamFindings.filter((f: any) => f.title?.toLowerCase().includes('root'));
        const userIssues   = iamFindings.filter((f: any) => f.title?.toLowerCase().includes('user') && !f.title?.toLowerCase().includes('root'));
        const otherIssues  = iamFindings.filter((f: any) => !mfaIssues.includes(f) && !rootIssues.includes(f) && !userIssues.includes(f));
        setIamData({ all: iamFindings, mfa: mfaIssues, root: rootIssues, users: userIssues, other: otherIssues, score: d.score });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accountId]);

  const isAzureProvider = provider === 'AZURE';

  const categories = isAzureProvider ? [
    { label:'MFA Issues',       count: iamData?.mfa?.length   || 0, icon: Shield,    color:'#ef4444', bg:'#fef2f2' },
    { label:'Root/Admin',       count: iamData?.root?.length  || 0, icon: AlertTriangle, color:'#f97316', bg:'#fff7ed' },
    { label:'User Issues',      count: iamData?.users?.length || 0, icon: Activity,  color:'#f59e0b', bg:'#fffbeb' },
    { label:'Other IAM',        count: iamData?.other?.length || 0, icon: Layers,    color:'#6366f1', bg:'#eef2ff' },
  ] : [
    { label:'MFA Issues',       count: iamData?.mfa?.length   || 0, icon: Shield,    color:'#ef4444', bg:'#fef2f2' },
    { label:'Root Account',     count: iamData?.root?.length  || 0, icon: AlertTriangle, color:'#f97316', bg:'#fff7ed' },
    { label:'User Policies',    count: iamData?.users?.length || 0, icon: Activity,  color:'#f59e0b', bg:'#fffbeb' },
    { label:'Role Issues',      count: iamData?.other?.length || 0, icon: Layers,    color:'#6366f1', bg:'#eef2ff' },
  ];

  const totalIAMIssues = iamData?.all?.length || 0;
  const iamScore = Math.max(0, 100 - (totalIAMIssues * 8));
  const scoreColor = iamScore >= 70 ? '#10b981' : iamScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'#eef2ff', border:'1px solid #c7d2fe', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ShieldCheck size={18} color="#6366f1"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>
              {isAzureProvider ? 'Azure AD / IAM' : 'IAM Report'}
            </h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>Identity & access analysis</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background: iamScore>=70?'#ecfdf5':iamScore>=40?'#fffbeb':'#fef2f2', borderRadius:20, border:`1px solid ${scoreColor}30` }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:scoreColor }}/>
          <span style={{ color:scoreColor, fontSize:11, fontWeight:700 }}>IAM Score: {iamScore}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 0' }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : (
        <>
          {/* category grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {categories.map((cat, i) => {
              const CatIcon = cat.icon;
              return (
                <div key={i} style={{ padding:'10px 12px', background:cat.bg, borderRadius:10, border:`1px solid ${cat.color}20` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <CatIcon size={12} color={cat.color}/>
                    <span style={{ color:cat.color, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{cat.label}</span>
                  </div>
                  <span style={{ color: cat.count > 0 ? cat.color : '#9ca3af', fontSize:22, fontWeight:800 }}>{cat.count}</span>
                  <span style={{ color:'#9ca3af', fontSize:11, marginLeft:4 }}>{cat.count === 1 ? 'issue' : 'issues'}</span>
                </div>
              );
            })}
          </div>

          {/* IAM findings list */}
          {iamData?.all?.length > 0 ? (
            <div>
              <p style={{ color:'#9ca3af', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px 0' }}>Top IAM Issues</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {iamData.all.slice(0,4).map((f: any, i: number) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', background:'#f9fafb', borderRadius:8, border:'1px solid #f3f4f6' }}>
                    <AlertTriangle size={12} color="#f97316" style={{ marginTop:2, flexShrink:0 }}/>
                    <div style={{ minWidth:0 }}>
                      <p style={{ color:'#111827', fontSize:12, fontWeight:500, margin:'0 0 2px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.title}</p>
                      {f.resource && <p style={{ color:'#9ca3af', fontSize:10, margin:0, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.resource}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'12px 0' }}>
              <CheckCircle size={24} color="#10b981" style={{ margin:'0 auto 6px', display:'block' }}/>
              <p style={{ color:'#10b981', fontSize:12, fontWeight:600, margin:0 }}>No IAM issues detected</p>
            </div>
          )}

          {/* best practices checklist */}
          <div>
            <p style={{ color:'#9ca3af', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px 0' }}>
              {isAzureProvider ? 'Azure AD Best Practices' : 'IAM Best Practices'}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {(isAzureProvider ? [
                { label:'MFA enabled for all users',       pass: (iamData?.mfa?.length||0) === 0 },
                { label:'No over-privileged service principals', pass: (iamData?.other?.length||0) === 0 },
                { label:'Admin accounts secured',          pass: (iamData?.root?.length||0) === 0 },
                { label:'Guest accounts reviewed',         pass: (iamData?.users?.length||0) < 2 },
              ] : [
                { label:'MFA on all IAM users',            pass: (iamData?.mfa?.length||0) === 0 },
                { label:'Root account MFA enabled',        pass: (iamData?.root?.length||0) === 0 },
                { label:'No unused IAM credentials',       pass: (iamData?.users?.length||0) === 0 },
                { label:'Least privilege enforced',        pass: (iamData?.other?.length||0) === 0 },
              ]).map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0' }}>
                  {item.pass
                    ? <CheckCircle size={13} color="#10b981"/>
                    : <XCircle size={13} color="#ef4444"/>}
                  <span style={{ color: item.pass ? '#374151' : '#6b7280', fontSize:12 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <button onClick={() => navigate(`/account/${accountId}/security`)}
        style={{ width:'100%', padding:'10px', background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:10, color:'#4f46e5', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <ShieldCheck size={14}/> Full IAM Analysis
      </button>
    </div>
  );
}

// ── ChangeInvestigationWidget ─────────────────────────────────────────────────
function ChangeInvestigationWidget({ accountId, navigate, provider }: { accountId:string; navigate:any; provider:string }) {
  const [changes, setChanges]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'recent'|'risk'>('recent');
  const isAzureProvider = provider === 'AZURE';

  useEffect(() => {
    if (isAzureProvider) {
      fetch(`http://localhost:3000/api/azure/activity/${accountId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d?.activities) return;
          const mapped = d.activities.map((a: any) => ({
            id:          a.eventTimestamp || Math.random(),
            type:        a.operationName || 'Operation',
            resource:    a.resourceGroup || 'N/A',
            caller:      a.caller || 'System',
            timestamp:   a.eventTimestamp,
            status:      a.status || 'Succeeded',
            risk:        detectRisk(a.operationName || ''),
          }));
          setChanges(mapped);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // For AWS, build changes from security findings & derive change events
      fetch(`http://localhost:3000/api/cloud/accounts/${accountId}/security`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          const synthetic: any[] = [];
          (d?.findings || []).forEach((f: any, i: number) => {
            synthetic.push({
              id: i,
              type: f.title,
              resource: f.resource || 'N/A',
              caller: 'AWS Config',
              timestamp: new Date(Date.now() - i * 3600000 * 4).toISOString(),
              status: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'Alert' : 'Review',
              risk: f.severity === 'CRITICAL' ? 'HIGH' : f.severity === 'HIGH' ? 'HIGH' : f.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
            });
          });
          // Add some common AWS change types
          synthetic.push(
            { id:'aws-1', type:'Security Group Modified', resource:'sg-default', caller:'CloudTrail', timestamp:new Date(Date.now()-86400000).toISOString(), status:'Succeeded', risk:'MEDIUM' },
            { id:'aws-2', type:'IAM Policy Attached',     resource:'arn:aws:iam::policy', caller:'CloudTrail', timestamp:new Date(Date.now()-172800000).toISOString(), status:'Succeeded', risk:'HIGH' },
            { id:'aws-3', type:'S3 Bucket ACL Changed',   resource:'s3://bucket', caller:'CloudTrail', timestamp:new Date(Date.now()-259200000).toISOString(), status:'Succeeded', risk:'MEDIUM' },
          );
          setChanges(synthetic);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [accountId, isAzureProvider]);

  function detectRisk(opName: string): 'HIGH'|'MEDIUM'|'LOW' {
    const high   = ['delete','remove','revoke','disable','deny'];
    const medium = ['update','modify','change','attach','detach','write'];
    const lower  = opName.toLowerCase();
    if (high.some(k => lower.includes(k)))   return 'HIGH';
    if (medium.some(k => lower.includes(k))) return 'MEDIUM';
    return 'LOW';
  }

  function timeAgo(ts: string): string {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return 'Just now';
  }

  const riskColors: Record<string,string> = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981' };
  const riskBg:     Record<string,string> = { HIGH:'#fef2f2', MEDIUM:'#fffbeb', LOW:'#ecfdf5' };

  const highRisk   = changes.filter(c => c.risk === 'HIGH');
  const mediumRisk = changes.filter(c => c.risk === 'MEDIUM');
  const displayed  = activeTab === 'risk'
    ? [...highRisk, ...mediumRisk].slice(0,6)
    : [...changes].sort((a,b) => new Date(b.timestamp||0).getTime() - new Date(a.timestamp||0).getTime()).slice(0,6);

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Activity size={18} color="#d97706"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Change Investigation</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>
              {isAzureProvider ? 'Azure Activity Log' : 'AWS CloudTrail events'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate(`/account/${accountId}/change-investigation`)}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, color:'#d97706', cursor:'pointer', fontSize:12, fontWeight:500 }}>
          Investigate <ChevronRight size={12}/>
        </button>
      </div>

      {/* summary row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { label:'Total Events', value:changes.length,    color:'#6366f1', bg:'#eef2ff' },
          { label:'High Risk',    value:highRisk.length,   color:'#ef4444', bg:'#fef2f2' },
          { label:'Medium Risk',  value:mediumRisk.length, color:'#f59e0b', bg:'#fffbeb' },
        ].map((s,i) => (
          <div key={i} style={{ padding:'8px 10px', background:s.bg, borderRadius:10, textAlign:'center' }}>
            <p style={{ color:s.color, fontSize:18, fontWeight:800, margin:'0 0 2px 0' }}>{s.value}</p>
            <p style={{ color:'#9ca3af', fontSize:10, margin:0, fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* tab toggle */}
      <div style={{ display:'flex', background:'#f9fafb', borderRadius:10, padding:3, border:'1px solid #e5e7eb' }}>
        {(['recent','risk'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex:1, padding:'6px 0', borderRadius:8, border:'none', background:activeTab===t?'#4f46e5':'transparent', color:activeTab===t?'white':'#9ca3af', cursor:'pointer', fontSize:12, fontWeight:500, textTransform:'capitalize' }}>
            {t === 'recent' ? 'Recent' : 'By Risk'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 0' }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb', borderTopColor:'#d97706', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <CheckCircle size={24} color="#10b981" style={{ margin:'0 auto 6px', display:'block' }}/>
          <p style={{ color:'#10b981', fontSize:12, fontWeight:600, margin:0 }}>No changes detected</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
          {displayed.map((c,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:'#f9fafb', borderRadius:10, border:'1px solid #f3f4f6' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:riskColors[c.risk]||'#d1d5db', marginTop:5, flexShrink:0 }}/>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:2 }}>
                  <p style={{ color:'#111827', fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{c.type}</p>
                  <span style={{ flexShrink:0, padding:'2px 7px', borderRadius:20, background:riskBg[c.risk], color:riskColors[c.risk], fontSize:10, fontWeight:700 }}>{c.risk}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'#9ca3af', fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{c.resource}</span>
                  <span style={{ color:'#d1d5db', fontSize:10, flexShrink:0 }}>{timeAgo(c.timestamp)}</span>
                </div>
                {c.caller && c.caller !== 'System' && c.caller !== 'AWS Config' && c.caller !== 'CloudTrail' && (
                  <p style={{ color:'#9ca3af', fontSize:10, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>by {c.caller}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate(`/account/${accountId}/change-investigation`)}
        style={{ width:'100%', padding:'10px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, color:'#d97706', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <Activity size={14}/> Full Change Investigation
      </button>
    </div>
  );
}

function buildOptimizations(accountId:string, provider:string): OptRec[] {
  if (provider === 'AZURE') {
    return [
      { id:`${accountId}-az1`, title:'Right-size underutilized VMs', type:'Compute', description:'8 VMs running at <5% CPU for 14+ days. Downsize or deallocate.', priority:'High', effort:'Low', potentialSavings:890, currentCost:2200, savingsPercent:40, resources:['vm-prod-01','vm-prod-02'] },
      { id:`${accountId}-az2`, title:'Switch to Azure Reserved VMs', type:'Reservations', description:'Convert 6 on-demand VMs to 1-year Reserved Instances.', priority:'High', effort:'Low', potentialSavings:620, currentCost:1240, savingsPercent:50 },
      { id:`${accountId}-az3`, title:'Delete unattached Managed Disks', type:'Storage', description:'14 unattached disks totaling 1.8 TB found in subscription.', priority:'High', effort:'Low', potentialSavings:210, currentCost:210, savingsPercent:100 },
      { id:`${accountId}-az4`, title:'Enable Azure Blob lifecycle policies', type:'Storage', description:'Move cool/archive blobs to lower tiers automatically.', priority:'Medium', effort:'Low', potentialSavings:145, currentCost:380, savingsPercent:38 },
      { id:`${accountId}-az5`, title:'Remove unused Public IP addresses', type:'Networking', description:'9 static Public IPs allocated but not associated with any resource.', priority:'Medium', effort:'Low', potentialSavings:65, currentCost:65, savingsPercent:100 },
    ];
  }
  return [
    { id:`${accountId}-1`, title:'Right-size oversized EC2 instances', type:'Compute', description:'12 instances running at <10% CPU utilization for 30+ days.', priority:'High', effort:'Low', potentialSavings:1240, currentCost:3100, savingsPercent:40 },
    { id:`${accountId}-2`, title:'Purchase Reserved Instances', type:'Reservations', description:'Convert 8 on-demand EC2 instances to 1-year Reserved Instances.', priority:'High', effort:'Low', potentialSavings:980, currentCost:1960, savingsPercent:50 },
    { id:`${accountId}-3`, title:'Delete unused EBS volumes', type:'Storage', description:'23 unattached EBS volumes totaling 2.3 TB.', priority:'High', effort:'Low', potentialSavings:345, currentCost:345, savingsPercent:100 },
    { id:`${accountId}-4`, title:'Optimize S3 storage classes', type:'Storage', description:'Move infrequently-accessed objects to S3-IA or Glacier.', priority:'Medium', effort:'Low', potentialSavings:210, currentCost:480, savingsPercent:44 },
    { id:`${accountId}-5`, title:'Set CloudWatch Logs retention', type:'Monitoring', description:'18 log groups with no retention policy set.', priority:'Medium', effort:'Low', potentialSavings:89, currentCost:210, savingsPercent:42 },
  ];
}

const OPT_PRI_BG:   Record<string,string> = { High:'#fef2f2', Medium:'#fffbeb', Low:'#ecfdf5' };
const OPT_PRI_TEXT: Record<string,string> = { High:'#dc2626', Medium:'#d97706', Low:'#059669' };
const OPT_EFF_TEXT: Record<string,string> = { Low:'#10b981', Medium:'#f59e0b', High:'#ef4444' };
const OPT_TYPE_COLORS: Record<string,string> = {
  Compute:'#6366f1', Storage:'#8b5cf6', Reservations:'#10b981',
  Monitoring:'#f59e0b', Networking:'#06b6d4', Security:'#ef4444',
};

function OverviewOptimizationWidget({ accountId, provider, navigate }: {
  accountId:string; provider:string; navigate:any;
}) {
  const [optimizations, setOptimizations] = useState<OptRec[]>([]);
  const [loadingOpt,    setLoadingOpt]    = useState(true);
  const [appliedIds,    setAppliedIds]    = useState<string[]>([]);
  const [activeFilter,  setActiveFilter]  = useState<'All'|'High'|'Medium'|'Low'>('All');
  const [showCharts,    setShowCharts]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingOpt(true);

    const mapRec = (r:any, idx:number): OptRec => ({
      id:               r.id              ?? r.recommendationId ?? `${accountId}-${idx}`,
      title:            r.title           ?? r.name             ?? r.shortDescription?.problem ?? 'Optimization',
      description:      r.description     ?? r.shortDescription?.solution ?? r.impact ?? '',
      type:             r.type            ?? r.category         ?? r.impactedField ?? 'Compute',
      priority:         (['High','Medium','Low'].includes(r.priority)?r.priority:r.impact==='High'?'High':r.impact==='Medium'?'Medium':'Low') as OptRec['priority'],
      effort:           (['Low','Medium','High'].includes(r.effort)?r.effort:'Low') as OptRec['effort'],
      potentialSavings: Number(r.potentialSavings??r.extendedProperties?.savingsAmount??r.annualSavingsAmount?.value??0)/(r.annualSavingsAmount?12:1),
      currentCost:      Number(r.currentCost??0),
      savingsPercent:   Number(r.savingsPercent??r.extendedProperties?.savingsPercent??0),
      resources:        r.resources??(r.impactedValue?[r.impactedValue]:[]),
    });

    const endpoints = provider === 'AZURE'
      ? [`http://localhost:3000/api/azure/advisor/${accountId}`, `http://localhost:3000/api/cloud/accounts/${accountId}/optimizations`]
      : [`http://localhost:3000/api/aws/optimizations/${accountId}`, `http://localhost:3000/api/cloud/accounts/${accountId}/optimizations`];

    (async () => {
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          const recs:any[] = json.recommendations??json.optimizations??json.data??(Array.isArray(json)?json:[]);
          if (recs.length > 0 && !cancelled) { setOptimizations(recs.map(mapRec)); setLoadingOpt(false); return; }
        } catch (_) {}
      }
      if (!cancelled) { setOptimizations(buildOptimizations(accountId, provider)); setLoadingOpt(false); }
    })();

    return () => { cancelled = true; };
  }, [accountId, provider]);

  const available     = optimizations.filter(o => !appliedIds.includes(o.id));
  const filtered      = activeFilter === 'All' ? available : available.filter(o => o.priority === activeFilter);
  const quickWins     = available.filter(o => o.effort === 'Low' && o.priority === 'High');
  const totalSavings  = available.reduce((s,o) => s+o.potentialSavings, 0);
  const appliedSavings = appliedIds.reduce((s,id) => { const o = optimizations.find(x=>x.id===id); return s+(o?.potentialSavings||0); }, 0);

  const byPriority = ['High','Medium','Low'].map(p => ({
    name: p,
    savings: available.filter(o=>o.priority===p).reduce((s,o)=>s+o.potentialSavings,0),
  }));
  const BAR_COLORS = ['#ef4444','#f59e0b','#10b981'];
  const fmtMini = (n:number) => n>=1000?`$${(n/1000).toFixed(1)}k`:`$${n}`;

  return (
    <div style={{ ...card, display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#059669,#047857)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <TrendingDown size={18} color="white"/>
          </div>
          <div>
            <h3 style={{ color:'#111827', fontWeight:700, fontSize:14, margin:0 }}>Cost Optimization</h3>
            <p style={{ color:'#9ca3af', fontSize:11, margin:0 }}>
              {loadingOpt ? 'Loading recommendations…' : `${available.length} recommendations · save ${fmtFull(totalSavings)}/mo`}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setShowCharts(v=>!v)}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid #e5e7eb', background:showCharts?'#eef2ff':'transparent', color:showCharts?'#6366f1':'#d1d5db', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BarChart3 size={13}/>
          </button>
          <button onClick={() => navigate(`/account/${accountId}/optimization`)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:8, color:'#059669', cursor:'pointer', fontSize:12, fontWeight:500 }}>
            View All <ChevronRight size={12}/>
          </button>
        </div>
      </div>

      {loadingOpt && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height:56, borderRadius:10, background:'#f3f4f6', animation:'pulse 1.4s infinite' }}/>
          ))}
        </div>
      )}

      {!loadingOpt && (<>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:12, padding:'12px 14px' }}>
          <p style={{ color:'#059669', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 4px 0' }}>Monthly Potential</p>
          <p style={{ color:'#047857', fontSize:20, fontWeight:700, margin:0 }}>{fmtFull(totalSavings)}</p>
          {appliedSavings > 0 && (
            <p style={{ color:'#10b981', fontSize:10, margin:'3px 0 0', display:'flex', alignItems:'center', gap:3 }}>
              <CheckCircle size={9}/> {fmtFull(appliedSavings)} applied
            </p>
          )}
        </div>
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 14px' }}>
          <p style={{ color:'#d97706', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 4px 0' }}>Quick Wins</p>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Zap size={18} color="#f59e0b"/>
            <p style={{ color:'#d97706', fontSize:20, fontWeight:700, margin:0 }}>{quickWins.length}</p>
          </div>
          <p style={{ color:'#92400e', fontSize:10, margin:'3px 0 0' }}>Low effort · High priority</p>
        </div>
      </div>

      {showCharts && (
        <div>
          <p style={{ color:'#9ca3af', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px 0' }}>Savings by Priority</p>
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={byPriority} margin={{ top:0, right:0, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="name" tick={{ fill:'#9ca3af', fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:11 }} formatter={(v:any) => [fmtMini(v),'Savings']}/>
              <Bar dataKey="savings" radius={[4,4,0,0]}>
                {byPriority.map((_,i) => <Cell key={i} fill={BAR_COLORS[i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <Filter size={10} color="#d1d5db"/>
        {(['All','High','Medium','Low'] as const).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99,
              background: activeFilter===f?'#4f46e5':'#f3f4f6',
              border: activeFilter===f?'1px solid #6366f1':'1px solid #e5e7eb',
              color: activeFilter===f?'white':'#6b7280', cursor:'pointer' }}>
            {f}{f!=='All'&&` (${available.filter(o=>o.priority===f).length})`}
          </button>
        ))}
        <span style={{ marginLeft:'auto', color:'#d1d5db', fontSize:10 }}>{filtered.length} shown</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {filtered.length === 0 ? (
          <div style={{ padding:'24px 0', textAlign:'center' }}>
            <CheckCircle size={28} color="#10b981" style={{ display:'block', margin:'0 auto 8px' }}/>
            <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>
              {appliedIds.length > 0 ? 'All recommendations applied!' : 'No recommendations'}
            </p>
            {appliedIds.length > 0 && <p style={{ color:'#10b981', fontSize:11, margin:'4px 0 0' }}>{fmtFull(appliedSavings)} saved/mo</p>}
          </div>
        ) : (
          filtered
            .sort((a,b) => {
              const po={High:0,Medium:1,Low:2}; const eo={Low:0,Medium:1,High:2};
              if (po[a.priority]!==po[b.priority]) return po[a.priority]-po[b.priority];
              if (eo[a.effort]!==eo[b.effort]) return eo[a.effort]-eo[b.effort];
              return b.potentialSavings-a.potentialSavings;
            })
            .slice(0,5)
            .map(opt => {
              const tc = OPT_TYPE_COLORS[opt.type]||'#6b7280';
              return (
                <div key={opt.id}
                  style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:'#f9fafb', borderRadius:10, border:'1px solid #f3f4f6', transition:'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='#e5e7eb')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='#f3f4f6')}>
                  <div style={{ width:28, height:28, borderRadius:8, background:`${tc}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:tc }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                      <p style={{ color:'#111827', fontSize:12, fontWeight:600, margin:0, lineHeight:1.3 }}>{opt.title}</p>
                      <span style={{ color:'#059669', fontWeight:700, fontSize:12, flexShrink:0 }}>-{fmtMini(opt.potentialSavings)}/mo</span>
                    </div>
                    <p style={{ color:'#9ca3af', fontSize:11, margin:'0 0 6px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{opt.description}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:OPT_PRI_BG[opt.priority], color:OPT_PRI_TEXT[opt.priority] }}>{opt.priority}</span>
                      <span style={{ fontSize:10, color:OPT_EFF_TEXT[opt.effort] }}>{opt.effort} effort</span>
                      <span style={{ fontSize:10, color:'#9ca3af', background:'#f3f4f6', padding:'1px 6px', borderRadius:99 }}>{opt.type}</span>
                      <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                        <button onClick={() => setAppliedIds(p=>[...p,opt.id])}
                          style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'#ecfdf5', border:'1px solid #a7f3d0', color:'#059669', cursor:'pointer' }}>Apply</button>
                        <button onClick={() => navigate(`/account/${accountId}/optimization`)}
                          style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'#eef2ff', border:'1px solid #c7d2fe', color:'#4f46e5', cursor:'pointer' }}>Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid #f3f4f6' }}>
        <p style={{ color:'#d1d5db', fontSize:10, margin:0 }}>
          {appliedIds.length > 0 && <span style={{ color:'#10b981', fontWeight:600 }}>✓ {appliedIds.length} applied · </span>}
          {available.length > 5 ? `+${available.length-5} more` : ''}
        </p>
        <button onClick={() => navigate(`/account/${accountId}/optimization`)}
          style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:'#059669', background:'none', border:'none', cursor:'pointer' }}>
          View all recommendations <ChevronRight size={13}/>
        </button>
      </div>
      </>)}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Overview() {
  const { accountId } = useParams<{ accountId:string }>();
  const navigate = useNavigate();
  const [data,             setData]             = useState<DashboardData|null>(null);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [selectedMonth,    setSelectedMonth]    = useState<string|null>(null);
  const [showPicker,       setShowPicker]       = useState(false);
  const [chartType,        setChartType]        = useState<'bar'|'area'>('bar');

  const fetchDashboard = useCallback(async () => {
    if (!accountId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`http://localhost:3000/api/cloud/dashboard/${accountId}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);
      try {
        const secRes = await fetch(`http://localhost:3000/api/cloud/accounts/${accountId}/security`);
        if (secRes.ok) { const secData = await secRes.json(); setSecurityFindings(secData.findings||[]); }
      } catch (_) {}
    } catch (e:any) {
      setError(e.message||'Failed to load dashboard');
    } finally { setLoading(false); }
  }, [accountId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return (
    <MainLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:48, height:48, border:'3px solid #e5e7eb', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
          <p style={{ color:'#9ca3af', fontSize:14, margin:0 }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:24 }}>
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:20, padding:32, maxWidth:400, textAlign:'center' }}>
          <AlertCircle size={32} color="#ef4444" style={{ margin:'0 auto 12px', display:'block' }}/>
          <p style={{ color:'#dc2626', fontWeight:600, fontSize:16, marginBottom:8 }}>Failed to load</p>
          <p style={{ color:'#f87171', fontSize:13, marginBottom:16 }}>{error}</p>
          <button onClick={fetchDashboard} style={{ padding:'8px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', cursor:'pointer', fontSize:13 }}>Retry</button>
        </div>
      </div>
    </MainLayout>
  );

  if (!data) return null;

  const isAzure       = data.provider === 'AZURE';
  // ── Provider detection (AWS / Azure / GCP) ──
  const isGCP         = data.provider === 'GCP';
  const cloudProvider = isAzure ? 'azure' : isGCP ? 'gcp' : 'aws';

  const monthlyData   = data.monthlyData || [];
  const changePercent = data.lastMonthCost > 0 ? ((data.totalCost-data.lastMonthCost)/data.lastMonthCost)*100 : 0;
  const dailyAvg      = data.totalCost / Math.max(new Date().getUTCDate(), 1);
  const maxMonthCost  = Math.max(...monthlyData.map(m=>m.total), 1);
  const chartData     = monthlyData.map(m => ({ ...m, isSelected: m.month === selectedMonth }));

  return (
    <MainLayout>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, color:'#374151', cursor:'pointer', fontSize:13, fontWeight:500, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', transition:'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#a5b4fc'; (e.currentTarget as HTMLButtonElement).style.color='#4f46e5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.color='#374151'; }}>
              <ChevronLeft size={15}/> Home
            </button>
            <div>
              <h1 style={{ color:'#111827', fontSize:22, fontWeight:700, margin:'0 0 4px 0' }}>Overview</h1>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ color:'#6b7280', fontSize:13 }}>{data.accountName}</span>
                <span style={{ color:'#e5e7eb' }}>•</span>
                <span style={{ color:'#6b7280', fontSize:13 }}>{data.provider}</span>
                <span style={{ color:'#e5e7eb' }}>•</span>
                <span style={{ color:'#6b7280', fontSize:13 }}>{data.region}</span>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981' }}/>
              </div>
            </div>
          </div>

          {/* ── HEADER ACTIONS: Download Report + Refresh ── */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <DownloadReportButton
              accountId={accountId!}
              provider={cloudProvider}
              accountName={data.accountName}
            />
            <button onClick={fetchDashboard}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', background:'#4f46e5', border:'none', borderRadius:12, color:'white', cursor:'pointer', fontSize:13, fontWeight:600, boxShadow:'0 2px 8px rgba(99,102,241,0.25)' }}>
              <RefreshCw size={14}/> Refresh
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:14 }}>
          <StatCard label="Current Month"  value={fmtFull(data.totalCost)}    icon={DollarSign} iconBg="#059669"
            trendUp={changePercent>=0} trendLabel={`${Math.abs(changePercent).toFixed(1)}% vs last month`}
            onClick={() => navigate(`/account/${accountId}/cost-analytics`)}/>
          <StatCard label="Last Month"     value={fmtFull(data.lastMonthCost)} icon={Calendar}   iconBg="#2563eb" sub="Previous period"
            onClick={() => navigate(`/account/${accountId}/cost-analytics`)}/>
          <StatCard label="14-Month Total" value={fmtFull(data.yearTotal||0)}  icon={BarChart2}  iconBg="#7c3aed" sub="Last 14 months"
            onClick={() => navigate(`/account/${accountId}/cost-analytics`)}/>
          <StatCard label="Forecast"       value={fmtFull(data.forecast||0)}   icon={TrendingUp} iconBg="#d97706" sub="Projected end of month"
            onClick={() => navigate(`/account/${accountId}/cost-analytics`)}/>
          <StatCard label="Resources"      value={String(data.resourceCount)}  icon={Server}     iconBg="#0891b2" sub="Total resources"
            onClick={() => navigate(`/account/${accountId}/resources`)}/>
          <StatCard label="Security Score" value={`${data.securityScore}/100`} icon={Shield}
            iconBg={data.securityScore>=70?'#059669':data.securityScore>=40?'#d97706':'#dc2626'}
            trendUp={data.securityScore<50} trendLabel={data.securityScore<50?'Needs attention':'Good standing'}
            onClick={() => navigate(`/account/${accountId}/security`)}/>
          <StatCard label="Top Service"    value={data.topServices?.[0] ? fmt(data.topServices[0].cost) : '$0'} icon={Layers} iconBg="#db2777"
            sub={data.topServices?.[0]?.name?.split(' ').slice(0,3).join(' ')||'N/A'}
            onClick={() => navigate(`/account/${accountId}/cost-analytics`)}/>
          <StatCard label="Daily Avg (MTD)" value={fmtFull(dailyAvg)} icon={Zap} iconBg="#ca8a04" sub="Current month average"
            onClick={() => navigate(`/account/${accountId}/cost-analytics`)}/>
        </div>

        {/* ── COST TREND CHART ── */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div>
              <h2 style={{ color:'#111827', fontWeight:700, fontSize:15, margin:'0 0 4px 0' }}>Cost Trend</h2>
              <p style={{ color:'#9ca3af', fontSize:12, margin:0 }}>
                {selectedMonth ? `${selectedMonth} — ${fmtFull(monthlyData.find(m=>m.month===selectedMonth)?.total||0)}` : `Last ${monthlyData.length} months — ${fmtFull(data.yearTotal)} total`}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <button onClick={() => setShowPicker(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:10, border:selectedMonth?'1px solid #6366f1':'1px solid #e5e7eb', background:selectedMonth?'#eef2ff':'#f9fafb', color:selectedMonth?'#4f46e5':'#374151', cursor:'pointer', fontSize:12, fontWeight:500 }}>
                <Calendar size={13}/>{selectedMonth||'All months'}<span style={{ opacity:0.5, fontSize:10 }}>▾</span>
              </button>
              {selectedMonth && (
                <button onClick={() => setSelectedMonth(null)} style={{ padding:'7px 12px', borderRadius:10, border:'1px solid #e5e7eb', background:'transparent', color:'#9ca3af', cursor:'pointer', fontSize:12 }}>Clear</button>
              )}
              <div style={{ display:'flex', background:'#f9fafb', borderRadius:10, padding:3, border:'1px solid #e5e7eb' }}>
                {(['bar','area'] as const).map(t => (
                  <button key={t} onClick={() => setChartType(t)}
                    style={{ padding:'5px 12px', borderRadius:8, border:'none', background:chartType===t?'#4f46e5':'transparent', color:chartType===t?'white':'#9ca3af', cursor:'pointer', fontSize:12, fontWeight:500, textTransform:'capitalize' }}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          {monthlyData.length === 0 ? (
            <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'#d1d5db', fontSize:13 }}>No monthly data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                  <Tooltip content={<CustomTooltip/>} cursor={{ fill:'rgba(99,102,241,0.04)' }}/>
                  <Bar dataKey="total" radius={[6,6,0,0]} cursor="pointer" onClick={(d:any) => setSelectedMonth(d.month===selectedMonth?null:d.month)}>
                    {chartData.map((entry,i) => (
                      <Cell key={i} fill={entry.month===selectedMonth?'#818cf8':'#6366f1'} opacity={selectedMonth&&entry.month!==selectedMonth?0.25:1}/>
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGrad)"
                    dot={{ fill:'#6366f1', strokeWidth:0, r:4 }} activeDot={{ r:6, fill:'#818cf8' }}/>
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
          {selectedMonth && <MonthDetail selectedMonth={selectedMonth} monthlyData={monthlyData}/>}
        </div>

        {/* ── TOP SERVICES + MONTHLY TABLE ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
          <div style={{ ...clickableCard }} onClick={() => navigate(`/account/${accountId}/cost-analytics`)}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 16px rgba(99,102,241,0.1)'; (e.currentTarget as HTMLDivElement).style.borderColor='#c7d2fe'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.borderColor='#e5e7eb'; }}>
            <h2 style={{ color:'#111827', fontWeight:700, fontSize:15, margin:'0 0 16px 0' }}>
              Top Services {selectedMonth && <span style={{ color:'#9ca3af', fontWeight:400, fontSize:13 }}>— {selectedMonth}</span>}
            </h2>
            {data.topServices.length === 0 ? (
              <p style={{ color:'#d1d5db', fontSize:13, textAlign:'center', padding:'24px 0', margin:0 }}>No service data</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {data.topServices.map((s,i) => (
                  <div key={i}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:SERVICE_COLORS[i], flexShrink:0 }}/>
                        <span style={{ color:'#374151', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                        <span style={{ color:'#9ca3af', fontSize:11 }}>{s.percentage.toFixed(1)}%</span>
                        <span style={{ color:'#111827', fontSize:13, fontWeight:700 }}>{fmtFull(s.cost)}</span>
                      </div>
                    </div>
                    <div style={{ height:5, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, background:SERVICE_COLORS[i], width:`${s.percentage}%`, transition:'width 0.4s ease' }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h2 style={{ color:'#111827', fontWeight:700, fontSize:15, margin:'0 0 16px 0' }}>Month-by-Month</h2>
            <div style={{ overflowY:'auto', maxHeight:300 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #f3f4f6' }}>
                    {['Month','Cost','vs Prev','Trend'].map((h,i) => (
                      <th key={h} style={{ color:'#9ca3af', fontSize:11, fontWeight:500, padding:'4px 0 10px', textAlign:i===0?'left':'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyData].reverse().map((m,i,arr) => {
                    const prev = arr[i+1];
                    const diff = prev && prev.total > 0 ? ((m.total-prev.total)/prev.total)*100 : null;
                    const isSel = selectedMonth === m.month;
                    return (
                      <tr key={m.month} onClick={() => setSelectedMonth(isSel?null:m.month)}
                        style={{ borderBottom:'1px solid #f9fafb', cursor:'pointer', background:isSel?'#eef2ff':'transparent' }}>
                        <td style={{ padding:'10px 0' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {isSel && <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', flexShrink:0 }}/>}
                            <span style={{ fontWeight:600, color:isSel?'#4f46e5':'#111827' }}>{m.month}</span>
                          </div>
                        </td>
                        <td style={{ textAlign:'right', color:'#111827', fontWeight:700, padding:'10px 0' }}>{fmtFull(m.total)}</td>
                        <td style={{ textAlign:'right', padding:'10px 0' }}>
                          {diff !== null ? (
                            <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:12, fontWeight:500, color:diff>=0?'#ef4444':'#10b981' }}>
                              {diff>=0?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}{Math.abs(diff).toFixed(1)}%
                            </span>
                          ) : <span style={{ color:'#e5e7eb' }}>—</span>}
                        </td>
                        <td style={{ textAlign:'right', padding:'10px 0' }}>
                          <div style={{ display:'flex', justifyContent:'flex-end' }}>
                            <div style={{ width:56, height:5, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:99, background:'#6366f1', width:`${Math.min(100,(m.total/maxMonthCost)*100)}%` }}/>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── PROVIDER-SPECIFIC BOTTOM SECTION ── */}
        {isAzure ? (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
              <AzureNukeWidget    accountId={accountId!} navigate={navigate}/>
              <AzureAdvisorWidget accountId={accountId!} navigate={navigate}/>
              <SecurityWidget     accountId={accountId!} navigate={navigate} securityScore={data.securityScore} findings={securityFindings} provider="AZURE"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
              <SecurityFindingsWidget    accountId={accountId!} navigate={navigate} provider="AZURE"/>
              <IAMReportWidget           accountId={accountId!} navigate={navigate} provider="AZURE"/>
              <ChangeInvestigationWidget accountId={accountId!} navigate={navigate} provider="AZURE"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
              <AzureResourceGroupsWidget accountId={accountId!}/>
              <AzureActivityWidget       accountId={accountId!}/>
            </div>
            <OverviewOptimizationWidget accountId={accountId!} provider="AZURE" navigate={navigate}/>
          </>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
              <NukeWidget      accountId={accountId!} navigate={navigate}/>
              <MigrationWidget accountId={accountId!} navigate={navigate}/>
              <SecurityWidget  accountId={accountId!} navigate={navigate} securityScore={data.securityScore} findings={securityFindings} provider="AWS"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
              <SecurityFindingsWidget   accountId={accountId!} navigate={navigate} provider="AWS"/>
              <IAMReportWidget          accountId={accountId!} navigate={navigate} provider="AWS"/>
              <ChangeInvestigationWidget accountId={accountId!} navigate={navigate} provider="AWS"/>
            </div>
            <OverviewOptimizationWidget accountId={accountId!} provider="AWS" navigate={navigate}/>
          </>
        )}

        {showPicker && (
          <MonthPicker monthlyData={monthlyData} selected={selectedMonth} onSelect={setSelectedMonth} onClose={() => setShowPicker(false)}/>
        )}

      </div>
    </MainLayout>
  );
}
