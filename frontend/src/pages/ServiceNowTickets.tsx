// src/pages/ServiceNowTickets.tsx
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  Ticket, Plus, RefreshCw, Search, ExternalLink,
  AlertTriangle, Shield, DollarSign, CheckCircle, Clock,
  User, X, Link2, Settings, Scan,
  PlayCircle, Pause, XCircle, AlertCircle, MessageSquare,
  FileText, Send, Download, Link as LinkIcon,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────
type TicketStatus   = 'Open' | 'In Progress' | 'Client Action Required' | 'On Hold' | 'Resolved' | 'Canceled';
type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
type FindingType    = 'security' | 'compliance' | 'cost' | 'drift';
type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

interface Comment { createdBy: string; createdAt: string; text: string; }

interface SNTicket {
  id: string; number: string; shortDescription: string; description: string;
  priority: TicketPriority; status: TicketStatus; category: string; subcategory?: string;
  assignedTo: string; assignedGroup: string; requester: string;
  createdAt: string; updatedAt: string; resolvedAt?: string | null; closedAt?: string | null;
  resourceType: string; resourceId: string; resourceRegion: string; provider: string;
  severity: string; impact: string; urgency: string;
  comments: Comment[]; workNotes: Comment[];
  sla: { breached: boolean; timeRemaining: string | null; responseTime: string; resolutionTime: string; };
  costImpact?: number;
}

interface Finding {
  id: string; type: FindingType; title: string; description: string;
  severity: FindingSeverity; account: string; resource?: string; costImpact?: number; hasTicket: boolean;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_TICKETS: SNTicket[] = [
  { id:'t1', number:'INC0010001', shortDescription:'S3 Bucket Publicly Accessible - prod-user-data',
    description:'Security violation: S3 bucket "prod-user-data" has public read access enabled, exposing sensitive user data.',
    priority:'P1', status:'In Progress', category:'Security', subcategory:'Access Control',
    assignedTo:'Security Team', assignedGroup:'Cloud Security', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-03-02T08:00:00Z', updatedAt:'2026-03-02T09:30:00Z', resolvedAt:null, closedAt:null,
    resourceType:'S3 Bucket', resourceId:'prod-user-data', resourceRegion:'us-west-2',
    provider:'AWS', severity:'Critical', impact:'High', urgency:'High',
    comments:[
      { createdBy:'John Security', createdAt:'2026-03-02T09:00:00Z', text:'Investigating bucket permissions. Will restrict access immediately.' },
      { createdBy:'CloudGuard Pro', createdAt:'2026-03-02T09:30:00Z', text:'Recommended: Remove public access and use pre-signed URLs or CloudFront.' },
    ],
    workNotes:[{ createdBy:'John Security', createdAt:'2026-03-02T09:15:00Z', text:'Contacted bucket owner. Preparing ACL changes.' }],
    sla:{ breached:false, timeRemaining:'4h 30m', responseTime:'1h', resolutionTime:'8h' } },

  { id:'t2', number:'INC0010002', shortDescription:'Over-privileged IAM User - admin-alice',
    description:'IAM user "admin-alice" has AdministratorAccess policy attached with full permissions across all services.',
    priority:'P2', status:'Client Action Required', category:'Security', subcategory:'IAM',
    assignedTo:'IAM Team', assignedGroup:'Identity & Access', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-03-01T14:00:00Z', updatedAt:'2026-03-02T10:00:00Z', resolvedAt:null, closedAt:null,
    resourceType:'IAM User', resourceId:'admin-alice', resourceRegion:'global',
    provider:'AWS', severity:'High', impact:'Medium', urgency:'Medium',
    comments:[{ createdBy:'Sarah IAM', createdAt:'2026-03-01T15:00:00Z', text:'Requested user manager to review required permissions.' }],
    workNotes:[], sla:{ breached:false, timeRemaining:'18h 30m', responseTime:'4h', resolutionTime:'24h' } },

  { id:'t3', number:'INC0010003', shortDescription:'Database Not Encrypted - staging-postgres',
    description:'RDS database "staging-postgres" does not have encryption at rest enabled, violating compliance requirements.',
    priority:'P2', status:'On Hold', category:'Compliance', subcategory:'Encryption',
    assignedTo:'Database Team', assignedGroup:'Cloud DBA', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-02-28T11:00:00Z', updatedAt:'2026-03-01T16:00:00Z', resolvedAt:null, closedAt:null,
    resourceType:'RDS Instance', resourceId:'staging-postgres', resourceRegion:'us-east-1',
    provider:'AWS', severity:'High', impact:'Medium', urgency:'Low',
    comments:[{ createdBy:'Mike DBA', createdAt:'2026-03-01T16:00:00Z', text:'On hold pending maintenance window approval. Scheduled for next Saturday.' }],
    workNotes:[{ createdBy:'Mike DBA', createdAt:'2026-03-01T14:00:00Z', text:'Preparing snapshot and encryption migration plan.' }],
    sla:{ breached:false, timeRemaining:'48h 15m', responseTime:'4h', resolutionTime:'72h' } },

  { id:'t4', number:'INC0010004', shortDescription:'EC2 Cost Spike - web-server-1 Underutilized',
    description:'EC2 instance "web-server-1" (t3.xlarge) has CPU below 15% for past 7 days. Cost optimization opportunity.',
    priority:'P3', status:'In Progress', category:'Cost Optimization', subcategory:'Compute',
    assignedTo:'DevOps Team', assignedGroup:'Cloud Operations', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-02-27T09:00:00Z', updatedAt:'2026-03-02T08:00:00Z', resolvedAt:null, closedAt:null,
    resourceType:'EC2 Instance', resourceId:'i-0abc123def456', resourceRegion:'us-east-1',
    provider:'AWS', severity:'Medium', impact:'Low', urgency:'Low', costImpact:2240,
    comments:[{ createdBy:'Dave DevOps', createdAt:'2026-03-02T08:00:00Z', text:'Analyzing workload. Will resize to t3.large to save $30/month.' }],
    workNotes:[], sla:{ breached:false, timeRemaining:'120h', responseTime:'8h', resolutionTime:'168h' } },

  { id:'t5', number:'INC0009921', shortDescription:'HIPAA Compliance Gap — RDS Encryption',
    description:'3 RDS instances missing at-rest encryption. HIPAA §164.312(a) violation.',
    priority:'P2', status:'On Hold', category:'Compliance', subcategory:'Encryption',
    assignedTo:'Sarah Chen', assignedGroup:'Cloud Security', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-02-28T09:15:00Z', updatedAt:'2026-03-04T14:00:00Z', resolvedAt:null, closedAt:null,
    resourceType:'RDS Instance', resourceId:'rds-patient-data', resourceRegion:'us-east-1',
    provider:'AWS', severity:'High', impact:'High', urgency:'Medium',
    comments:[], workNotes:[], sla:{ breached:false, timeRemaining:'48h', responseTime:'4h', resolutionTime:'72h' } },

  { id:'t6', number:'INC0009780', shortDescription:'Unattached EBS Volume - vol-0abc123',
    description:'EBS volume "vol-0abc123" (100 GB) not attached to any instance. Unnecessary $10/month cost.',
    priority:'P4', status:'Resolved', category:'Cost Optimization', subcategory:'Storage',
    assignedTo:'Storage Team', assignedGroup:'Cloud Operations', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-02-25T10:00:00Z', updatedAt:'2026-03-01T15:00:00Z',
    resolvedAt:'2026-03-01T15:00:00Z', closedAt:'2026-03-01T15:30:00Z',
    resourceType:'EBS Volume', resourceId:'vol-0abc123', resourceRegion:'us-east-1',
    provider:'AWS', severity:'Low', impact:'Low', urgency:'Low', costImpact:501,
    comments:[{ createdBy:'Storage Admin', createdAt:'2026-03-01T14:00:00Z', text:'Created snapshot and deleted unattached volume.' }],
    workNotes:[], sla:{ breached:false, timeRemaining:null, responseTime:'24h', resolutionTime:'240h' } },

  { id:'t7', number:'INC0009654', shortDescription:'CloudTrail Not Enabled - ap-southeast-1',
    description:'CloudTrail logging not enabled in ap-southeast-1, creating audit trail gaps.',
    priority:'P2', status:'Canceled', category:'Compliance', subcategory:'Logging',
    assignedTo:'Compliance Team', assignedGroup:'Cloud Governance', requester:'CloudGuard Pro (Automated)',
    createdAt:'2026-02-24T11:00:00Z', updatedAt:'2026-02-25T14:00:00Z', resolvedAt:null, closedAt:'2026-02-25T14:00:00Z',
    resourceType:'Region', resourceId:'ap-southeast-1', resourceRegion:'ap-southeast-1',
    provider:'AWS', severity:'High', impact:'Medium', urgency:'Medium',
    comments:[{ createdBy:'Compliance Team', createdAt:'2026-02-25T14:00:00Z', text:'Region being decommissioned. Canceling ticket.' }],
    workNotes:[], sla:{ breached:false, timeRemaining:null, responseTime:'4h', resolutionTime:'24h' } },
];

const MOCK_FINDINGS: Finding[] = [
  { id:'f1', type:'security',   title:'CloudFront Distribution Missing WAF',        description:'Production CDN has no WAF. Vulnerable to OWASP top 10.',              severity:'high',    account:'AWS Prod', hasTicket:false },
  { id:'f2', type:'compliance', title:'PCI DSS — MFA Not Enforced on Root Account', description:'AWS root account does not have MFA. PCI DSS requirement 8.3.',        severity:'critical',account:'AWS Prod', hasTicket:false },
  { id:'f3', type:'cost',       title:'CloudWatch Logs Retention Unset',            description:'23 log groups have no retention policy. Costs accumulating.',          severity:'medium',  account:'AWS Prod', costImpact:94,  hasTicket:false },
  { id:'f4', type:'drift',      title:'Lambda Concurrency Limit Removed',           description:'Reserved concurrency removed from order-processor. Runaway cost risk.',severity:'medium',  account:'AWS Prod', hasTicket:false },
  { id:'f5', type:'security',   title:'Azure Storage Account Key Rotation Overdue', description:'Storage key last rotated 180+ days ago. Exceeds policy.',              severity:'high',    account:'Azure Dev',hasTicket:false },
];

const CHART_DATA = {
  byStatus: [
    { status:'Open', count:34, color:'#3b82f6' }, { status:'In Progress', count:18, color:'#f59e0b' },
    { status:'Client Action', count:12, color:'#8b5cf6' }, { status:'On Hold', count:8, color:'#6b7280' },
    { status:'Resolved', count:45, color:'#10b981' },
  ],
  byPriority: [
    { priority:'P1', count:3, color:'#dc2626' }, { priority:'P2', count:12, color:'#ea580c' },
    { priority:'P3', count:28, color:'#f59e0b' }, { priority:'P4', count:44, color:'#10b981' },
  ],
  byCategory: [
    { category:'Security', count:34 }, { category:'Cost', count:22 },
    { category:'Compliance', count:18 }, { category:'Performance', count:13 },
  ],
  trend: [
    { month:'Sep', created:23, resolved:18 }, { month:'Oct', created:28, resolved:22 },
    { month:'Nov', created:31, resolved:26 }, { month:'Dec', created:29, resolved:24 },
    { month:'Jan', created:34, resolved:28 }, { month:'Feb', created:38, resolved:32 },
  ],
};

// ── Style helpers ─────────────────────────────────────────────────────────────
const statusStyle = (s: string) => {
  const m: Record<string, { bg:string; color:string; border:string }> = {
    'Open':                   { bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
    'In Progress':            { bg:'#fefce8', color:'#ca8a04', border:'#fde68a' },
    'Client Action Required': { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
    'On Hold':                { bg:'#f9fafb', color:'#6b7280', border:'#e5e7eb' },
    'Resolved':               { bg:'#ecfdf5', color:'#059669', border:'#a7f3d0' },
    'Canceled':               { bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
  };
  return m[s] || { bg:'#f9fafb', color:'#6b7280', border:'#e5e7eb' };
};

const priorityStyle = (p: string) => {
  if (p === 'P1') return { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', label:'P1 Critical' };
  if (p === 'P2') return { bg:'#fff7ed', color:'#ea580c', border:'#fed7aa', label:'P2 High'     };
  if (p === 'P3') return { bg:'#fffbeb', color:'#d97706', border:'#fde68a', label:'P3 Medium'   };
  return                 { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', label:'P4 Low'      };
};

const severityStyle = (s: string) => {
  const l = s.toLowerCase();
  if (l === 'critical') return { bg:'#fef2f2', color:'#dc2626' };
  if (l === 'high')     return { bg:'#fff7ed', color:'#ea580c' };
  if (l === 'medium')   return { bg:'#fffbeb', color:'#d97706' };
  return                       { bg:'#f0fdf4', color:'#16a34a' };
};

const findingTypeConfig = (t: FindingType) => {
  if (t === 'security')   return { icon: Shield,        color:'#dc2626', bg:'#fef2f2', label:'Security'    };
  if (t === 'compliance') return { icon: CheckCircle,   color:'#7c3aed', bg:'#f5f3ff', label:'Compliance'  };
  if (t === 'cost')       return { icon: DollarSign,    color:'#6366f1', bg:'#eef2ff', label:'Cost'        };
  return                         { icon: AlertTriangle, color:'#d97706', bg:'#fffbeb', label:'Config Drift' };
};

const getStatusIcon = (s: string) => {
  if (s === 'Open')                   return <AlertCircle size={15} className="text-blue-600"/>;
  if (s === 'In Progress')            return <PlayCircle  size={15} className="text-yellow-600"/>;
  if (s === 'Client Action Required') return <User        size={15} className="text-purple-600"/>;
  if (s === 'On Hold')                return <Pause       size={15} className="text-gray-500"/>;
  if (s === 'Resolved')               return <CheckCircle size={15} className="text-emerald-600"/>;
  if (s === 'Canceled')               return <XCircle    size={15} className="text-red-500"/>;
  return                                     <Clock      size={15} className="text-gray-400"/>;
};

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff/3600000), d = Math.floor(h/24);
  if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`; return `${d}d ago`;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ServiceNowTickets() {
  const API_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || "http://localhost:3000"}';
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const userId  = user.id || '';
  const token   = localStorage.getItem('accessToken');
  const hdrs    = { Authorization: `Bearer ${token}` };

  const [tickets,        setTickets]        = useState<SNTicket[]>(DEMO_TICKETS);
  const [findings,       setFindings]       = useState<Finding[]>(MOCK_FINDINGS);
  const [connection,     setConnection]     = useState({ connected:false, instance:'', lastSync:'', username:'' });
  const [loading,        setLoading]        = useState(false);
  const [scanning,       setScanning]       = useState(false);
  const [activeTab,      setActiveTab]      = useState<'tickets'|'findings'|'charts'>('tickets');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [search,         setSearch]         = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SNTicket|null>(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [showConfig,     setShowConfig]     = useState(false);
  const [findingModal,   setFindingModal]   = useState<Finding|null>(null);
  const [creating,       setCreating]       = useState(false);

  const [newTicket, setNewTicket] = useState({
    shortDescription:'', description:'', priority:'P3', category:'Security',
    subcategory:'', resourceType:'', resourceId:'', resourceRegion:'', provider:'AWS', assignedGroup:'',
  });
  const [config,    setConfig]    = useState({ instance:'', username:'', password:'', apiKey:'' });
  const [findingForm,setFindingForm]=useState({ assignee:'', notes:'' });

  // ── API ───────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/api/servicenow/tickets/${userId}`, { headers: hdrs });
      if (r.data.tickets?.length) setTickets(r.data.tickets);
      if (r.data.connectionStatus) setConnection(r.data.connectionStatus);
    } catch { /* use demo */ }
    finally { setLoading(false); }
  };

  const fetchFindings = async () => {
    try {
      const r = await fetch(`${API_URL}/api/servicenow/findings-without-tickets`, { headers: hdrs });
      if (r.ok) { const d = await r.json(); if (d.findings?.length) setFindings(d.findings); }
    } catch { /* use mock */ }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      if (!userId || !token) {
        await new Promise(res => setTimeout(res, 2200));
        alert('Scan Complete!\n\nFound 23 issues:\n• 4 Critical\n• 8 High\n• 7 Medium\n• 4 Low\n\nCreated 12 new tickets');
      } else {
        const r = await axios.post(`${API_URL}/api/servicenow/scan/${userId}`, {}, { headers: hdrs });
        alert(`Scan complete! Created ${r.data.ticketsCreated} tickets.`);
        fetchData();
      }
    } catch { alert('Scan failed. Please try again.'); }
    finally { setScanning(false); }
  };

  const handleCreateTicket = async () => {
    try {
      if (!userId || !token) { alert('Ticket created! (Demo Mode)'); }
      else { await axios.post(`${API_URL}/api/servicenow/tickets/${userId}`, newTicket, { headers: hdrs }); fetchData(); }
    } catch { alert('Failed to create ticket.'); }
    finally {
      setShowCreate(false);
      setNewTicket({ shortDescription:'', description:'', priority:'P3', category:'Security', subcategory:'', resourceType:'', resourceId:'', resourceRegion:'', provider:'AWS', assignedGroup:'' });
    }
  };

  const handleConnect = async () => {
    try {
      if (!userId || !token) {
        setConnection({ connected:true, instance:config.instance, lastSync:new Date().toISOString(), username:config.username });
        alert('ServiceNow connected! (Demo Mode)');
      } else {
        await axios.post(`${API_URL}/api/servicenow/configure/${userId}`, config, { headers: hdrs });
        alert('Connected successfully!'); fetchData();
      }
    } catch { alert('Failed to connect. Check credentials.'); }
    finally { setShowConfig(false); }
  };

  const handleCreateFromFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingModal) return;
    setCreating(true);
    try {
      await fetch(`${API_URL}/api/servicenow/tickets`, {
        method:'POST', headers:{...hdrs,'Content-Type':'application/json'},
        body: JSON.stringify({ findingId:findingModal.id, title:findingModal.title, description:findingModal.description, severity:findingModal.severity, account:findingModal.account, assignee:findingForm.assignee, notes:findingForm.notes }),
      });
      setFindings(prev => prev.map(f => f.id === findingModal.id ? {...f, hasTicket:true} : f));
      fetchData();
    } catch { /* silent */ }
    finally { setCreating(false); setFindingModal(null); setFindingForm({ assignee:'', notes:'' }); }
  };

  useEffect(() => { fetchData(); fetchFindings(); }, []);

  const filtered = tickets.filter(t => {
    const ms = filterStatus   === 'all' || t.status.toLowerCase()  === filterStatus.toLowerCase();
    const mp = filterPriority === 'all' || t.priority              === filterPriority;
    const mq = !search || [t.number, t.shortDescription, t.resourceId, t.assignedTo].some(v => v.toLowerCase().includes(search.toLowerCase()));
    return ms && mp && mq;
  });

  const openCount  = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const p1Count    = tickets.filter(t => t.priority === 'P1').length;
  const resolved   = tickets.filter(t => t.status === 'Resolved').length;
  const noTickets  = findings.filter(f => !f.hasTicket).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ServiceNow Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage incidents and create tickets from CloudGuard findings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!connection.connected && (
            <button onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold">
              <LinkIcon size={12}/> Connect ServiceNow
            </button>
          )}
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50">
            <Scan size={12} className={scanning?'animate-spin':''}/> {scanning?'Scanning…':'Scan All Issues'}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-200">
            <Plus size={12}/> Create Ticket
          </button>
          <button onClick={() => { fetchData(); fetchFindings(); }}
            className={`flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 ${loading?'opacity-50 pointer-events-none':''}`}>
            <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* Connection banner */}
      {connection.connected ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle size={15} className="text-emerald-600 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Connected to {connection.instance}</p>
            <p className="text-xs text-emerald-600">Last synced: {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : 'Never'}</p>
          </div>
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
            <Settings size={11}/> Settings
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">ServiceNow Not Connected</p>
            <p className="text-xs text-amber-600">Connect to sync tickets automatically with your ServiceNow instance</p>
          </div>
          <button onClick={() => setShowConfig(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold">
            Connect Now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label:'Total',       value: tickets.length, icon:Ticket,        color:'#6366f1', bg:'#eef2ff' },
          { label:'Open',        value: openCount,      icon:AlertCircle,   color:'#2563eb', bg:'#eff6ff' },
          { label:'In Progress', value: tickets.filter(t=>t.status==='In Progress').length, icon:PlayCircle, color:'#d97706', bg:'#fffbeb' },
          { label:'P1 Critical', value: p1Count,        icon:AlertTriangle, color:'#dc2626', bg:'#fef2f2' },
          { label:'Resolved',    value: resolved,       icon:CheckCircle,   color:'#059669', bg:'#ecfdf5' },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{background:s.bg}}>
                <Icon size={15} style={{color:s.color}}/>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-5 w-fit">
        {[
          { id:'tickets',  label:`Tickets (${tickets.length})` },
          { id:'findings', label:`Open Findings (${noTickets})` },
          { id:'charts',   label:'Analytics' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ── TICKETS TAB ── */}
      {activeTab === 'tickets' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets, resources, assignees…"
                className="pl-8 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 w-72"/>
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
              <option value="all">All Statuses</option>
              <option>Open</option><option>In Progress</option>
              <option>Client Action Required</option><option>On Hold</option>
              <option>Resolved</option><option>Canceled</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-600">
              <option value="all">All Priorities</option>
              <option value="P1">P1 — Critical</option><option value="P2">P2 — High</option>
              <option value="P3">P3 — Medium</option><option value="P4">P4 — Low</option>
            </select>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} tickets</span>
          </div>

          <div className="space-y-3">
            {filtered.map(ticket => {
              const ps = priorityStyle(ticket.priority);
              const ss = statusStyle(ticket.status);
              const sv = severityStyle(ticket.severity);
              return (
                <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-gray-400">{ticket.number}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                          style={{background:ps.bg, color:ps.color, border:`1px solid ${ps.border}`}}>{ps.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                          style={{background:sv.bg, color:sv.color}}>{ticket.severity}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">
                          {ticket.category}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                          style={{background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`}}>{ticket.status}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">{ticket.shortDescription}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{ticket.description}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                        {[
                          { label:'Resource', value:ticket.resourceId    },
                          { label:'Type',     value:ticket.resourceType  },
                          { label:'Region',   value:ticket.resourceRegion},
                          { label:'Provider', value:ticket.provider      },
                        ].map((item,i) => (
                          <div key={i} className="bg-gray-50 rounded-xl p-2.5">
                            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
                            <p className="font-mono font-semibold text-gray-700 truncate mt-0.5">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                        <span className="flex items-center gap-1"><User size={10}/>{ticket.assignedTo}</span>
                        <span>👥 {ticket.assignedGroup}</span>
                        <span className="flex items-center gap-1"><Clock size={10}/>{timeAgo(ticket.updatedAt)}</span>
                        {ticket.costImpact && <span className="font-bold text-red-600">${ticket.costImpact.toLocaleString()} impact</span>}
                        {ticket.sla?.timeRemaining && !ticket.sla.breached && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Clock size={10}/>SLA: {ticket.sla.timeRemaining} left
                          </span>
                        )}
                        {ticket.sla?.breached && <span className="font-bold text-red-600">⚠️ SLA Breached</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                    <button onClick={() => setSelectedTicket(ticket)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold">
                      <ExternalLink size={11}/> View Details
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold">
                      <MessageSquare size={11}/> Add Comment
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold">
                      <Settings size={11}/> Update Status
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <Ticket size={32} className="text-gray-200 mx-auto mb-3"/>
                <p className="text-gray-500 font-semibold">No tickets match your filters</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FINDINGS TAB ── */}
      {activeTab === 'findings' && (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
            <Link2 size={15} className="text-indigo-500 flex-shrink-0 mt-0.5"/>
            <p className="text-sm text-indigo-700">
              These CloudGuard findings don't have a ServiceNow ticket yet.
              Click <strong>Create Ticket</strong> to escalate for remediation.
            </p>
          </div>
          {findings.filter(f => !f.hasTicket).map(finding => {
            const ftc = findingTypeConfig(finding.type);
            const sv  = severityStyle(finding.severity);
            const FIcon = ftc.icon;
            return (
              <div key={finding.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-start gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:ftc.bg}}>
                    <FIcon size={15} style={{color:ftc.color}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{background:sv.bg,color:sv.color}}>
                        {finding.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{background:ftc.bg,color:ftc.color}}>
                        {ftc.label}
                      </span>
                      <span className="text-xs text-gray-400">{finding.account}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{finding.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{finding.description}</p>
                    {finding.costImpact && <p className="text-xs font-bold text-red-600 mt-1.5">${finding.costImpact.toLocaleString()} cost impact</p>}
                  </div>
                  <button onClick={() => setFindingModal(finding)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex-shrink-0 shadow-sm shadow-indigo-200">
                    <Plus size={12}/> Create Ticket
                  </button>
                </div>
              </div>
            );
          })}
          {noTickets === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <CheckCircle size={32} className="text-emerald-300 mx-auto mb-3"/>
              <p className="text-gray-500 font-semibold">All findings have tickets</p>
            </div>
          )}
        </div>
      )}

      {/* ── CHARTS TAB ── */}
      {activeTab === 'charts' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">By Status</h3>
              <p className="text-xs text-gray-400 mb-4">Current distribution</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={CHART_DATA.byStatus} cx="50%" cy="50%" outerRadius={75}
                    dataKey="count" label={({status,count})=>`${status}: ${count}`} labelLine={false}>
                    {CHART_DATA.byStatus.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">By Priority</h3>
              <p className="text-xs text-gray-400 mb-4">P1 through P4</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CHART_DATA.byPriority} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="priority" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Bar dataKey="count" radius={[6,6,0,0]}>
                    {CHART_DATA.byPriority.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Ticket Trend</h3>
              <p className="text-xs text-gray-400 mb-4">Created vs Resolved</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={CHART_DATA.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="created"  stroke="#ef4444" strokeWidth={2.5} dot={false} name="Created"/>
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} dot={false} name="Resolved"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">By Category</h3>
            <p className="text-xs text-gray-400 mb-5">All tickets</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={CHART_DATA.byCategory} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="category" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:12,border:'1px solid #f3f4f6',fontSize:12}}/>
                <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── TICKET DETAIL MODAL ── */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <p className="text-xs font-mono text-gray-400">{selectedTicket.number}</p>
                <h2 className="text-base font-bold text-gray-900 mt-0.5">{selectedTicket.shortDescription}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {(() => { const ps = priorityStyle(selectedTicket.priority); return (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl"
                    style={{background:ps.bg,color:ps.color,border:`1px solid ${ps.border}`}}>{ps.label}</span>
                ); })()}
                {(() => { const ss = statusStyle(selectedTicket.status); return (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl"
                    style={{background:ss.bg,color:ss.color,border:`1px solid ${ss.border}`}}>{selectedTicket.status}</span>
                ); })()}
                {(() => { const sv = severityStyle(selectedTicket.severity); return (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl" style={{background:sv.bg,color:sv.color}}>{selectedTicket.severity}</span>
                ); })()}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600">
                  {selectedTicket.category}{selectedTicket.subcategory?` / ${selectedTicket.subcategory}`:''}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Assigned To',     value:selectedTicket.assignedTo    },
                  { label:'Assigned Group',  value:selectedTicket.assignedGroup },
                  { label:'Requester',       value:selectedTicket.requester     },
                  { label:'Impact / Urgency',value:`${selectedTicket.impact} / ${selectedTicket.urgency}` },
                ].map((item,i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-3">Resource Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:'Type',     value:selectedTicket.resourceType    },
                    { label:'ID',       value:selectedTicket.resourceId      },
                    { label:'Region',   value:selectedTicket.resourceRegion  },
                    { label:'Provider', value:selectedTicket.provider        },
                  ].map((item,i) => (
                    <div key={i}>
                      <p className="text-[10px] text-blue-400 font-semibold">{item.label}</p>
                      <p className="text-xs font-mono font-semibold text-blue-900 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Timeline</p>
                <div className="space-y-1.5">
                  {[
                    { label:'Created',       value:new Date(selectedTicket.createdAt).toLocaleString() },
                    { label:'Last Updated',  value:new Date(selectedTicket.updatedAt).toLocaleString() },
                    ...(selectedTicket.resolvedAt ? [{ label:'Resolved', value:new Date(selectedTicket.resolvedAt).toLocaleString() }] : []),
                  ].map((item,i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-semibold text-gray-700">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTicket.sla && (
                <div className={`rounded-xl p-4 ${selectedTicket.sla.breached?'bg-red-50 border border-red-100':'bg-emerald-50 border border-emerald-100'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${selectedTicket.sla.breached?'text-red-500':'text-emerald-600'}`}>
                    SLA {selectedTicket.sla.breached?'— BREACHED':'— On Track'}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                      { label:'Response',   value:selectedTicket.sla.responseTime   },
                      { label:'Resolution', value:selectedTicket.sla.resolutionTime },
                      ...(selectedTicket.sla.timeRemaining ? [{ label:'Remaining', value:selectedTicket.sla.timeRemaining }] : []),
                    ].map((item,i) => (
                      <div key={i}>
                        <p className="text-gray-500">{item.label}</p>
                        <p className="font-semibold text-gray-800 mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTicket.comments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare size={10}/> Comments ({selectedTicket.comments.length})
                  </p>
                  <div className="space-y-2">
                    {selectedTicket.comments.map((c,i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-800">{c.createdBy}</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTicket.workNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText size={10}/> Work Notes (Internal)
                  </p>
                  <div className="space-y-2">
                    {selectedTicket.workNotes.map((n,i) => (
                      <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-amber-800">{n.createdBy}</span>
                          <span className="text-[10px] text-amber-500">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                  <MessageSquare size={12}/> Add Comment
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                  <Send size={12}/> Update Status
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold">
                  <Download size={12}/> Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE FROM FINDING MODAL ── */}
      {findingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create ServiceNow Ticket</h2>
                <p className="text-xs text-gray-400 mt-0.5">From CloudGuard finding</p>
              </div>
              <button onClick={() => setFindingModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"><X size={16}/></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Finding</p>
              <p className="text-sm font-semibold text-gray-800">{findingModal.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{findingModal.description}</p>
            </div>
            <form onSubmit={handleCreateFromFinding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5"><User size={11} className="inline mr-1"/>Assignee</label>
                <input type="text" value={findingForm.assignee} onChange={e => setFindingForm({...findingForm,assignee:e.target.value})}
                  placeholder="e.g., Sarah Chen (optional)"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Additional Notes</label>
                <textarea value={findingForm.notes} onChange={e => setFindingForm({...findingForm,notes:e.target.value})}
                  placeholder="Any additional context…" rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none resize-none"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setFindingModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60">
                  {creating?<RefreshCw size={13} className="animate-spin"/>:<Plus size={13}/>}
                  {creating?'Creating…':'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MANUAL CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Create New Ticket</h2>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Short Description *</label>
                <input value={newTicket.shortDescription} onChange={e => setNewTicket({...newTicket,shortDescription:e.target.value})}
                  placeholder="Brief summary of the issue"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label>
                <textarea value={newTicket.description} onChange={e => setNewTicket({...newTicket,description:e.target.value})}
                  rows={3} placeholder="Detailed description"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket,priority:e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                    <option value="P1">P1 — Critical (4h SLA)</option>
                    <option value="P2">P2 — High (24h SLA)</option>
                    <option value="P3">P3 — Medium (72h SLA)</option>
                    <option value="P4">P4 — Low (168h SLA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                  <select value={newTicket.category} onChange={e => setNewTicket({...newTicket,category:e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                    <option>Security</option><option>Compliance</option>
                    <option>Cost Optimization</option><option>Performance</option>
                    <option>Availability</option><option>Configuration</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subcategory</label>
                  <input value={newTicket.subcategory} onChange={e => setNewTicket({...newTicket,subcategory:e.target.value})}
                    placeholder="e.g., Access Control"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Provider</label>
                  <select value={newTicket.provider} onChange={e => setNewTicket({...newTicket,provider:e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                    <option>AWS</option><option>Azure</option><option>GCP</option><option>Multi-Cloud</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600">Resource Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Resource Type</label>
                    <input value={newTicket.resourceType} onChange={e => setNewTicket({...newTicket,resourceType:e.target.value})}
                      placeholder="e.g., EC2 Instance"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-400 focus:outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Resource ID</label>
                    <input value={newTicket.resourceId} onChange={e => setNewTicket({...newTicket,resourceId:e.target.value})}
                      placeholder="e.g., i-0abc123def456"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-400 focus:outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Region</label>
                  <input value={newTicket.resourceRegion} onChange={e => setNewTicket({...newTicket,resourceRegion:e.target.value})}
                    placeholder="e.g., us-east-1"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-400 focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assigned Group</label>
                <select value={newTicket.assignedGroup} onChange={e => setNewTicket({...newTicket,assignedGroup:e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                  <option value="">Select Group</option>
                  <option>Cloud Security</option><option>Cloud Operations</option>
                  <option>Cloud DBA</option><option>DevOps</option>
                  <option>Network Team</option><option>Compliance</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreateTicket}
                  disabled={!newTicket.shortDescription || !newTicket.description}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white disabled:opacity-50">
                  Create Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIG MODAL ── */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">ServiceNow Configuration</h2>
              <button onClick={() => setShowConfig(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"><X size={16}/></button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs font-bold text-blue-800">Demo Mode Active</p>
                  <p className="text-xs text-blue-600 mt-0.5">Connect your instance to sync tickets in real-time. We recommend using a service account with limited permissions.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label:'Instance URL', key:'instance', type:'text',     placeholder:'https://your-instance.service-now.com' },
                { label:'Username',     key:'username', type:'text',     placeholder:'ServiceNow username' },
                { label:'Password',     key:'password', type:'password', placeholder:'ServiceNow password' },
                { label:'API Key (Optional)', key:'apiKey', type:'password', placeholder:'OAuth API Key' },
              ].map((f,i) => (
                <div key={i}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                  <input type={f.type} value={(config as any)[f.key]}
                    onChange={e => setConfig({...config,[f.key]:e.target.value})}
                    placeholder={f.placeholder}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none"/>
                </div>
              ))}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setShowConfig(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleConnect}
                  disabled={!config.instance || !config.username || !config.password}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white disabled:opacity-50">
                  Connect ServiceNow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
