import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Flame, Calendar, Shield, RefreshCw, Play, CheckCircle,
  AlertTriangle, Clock, Search, Settings, Zap, Upload,
  Code, Plus, Trash2, Mail, History, Eye, XCircle,
  ChevronRight, Download, FileCode, Bell, SkipForward,
  BarChart2, AlertCircle, ArrowLeft, Copy, Check, Filter,
  ChevronDown, ChevronUp, Grid, List, Loader,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const token = () => localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
const user = () => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } };

// ─── Types ───────────────────────────────────────────────────────────────────

interface CloudResource {
  id: string; name: string; type: string; category: string; region: string;
  status?: string; createdAt?: string; hasDeleteProtection?: boolean;
  metadata?: Record<string, any>;
}

interface RetentionPolicy {
  id: string; resourceId: string; resourceName: string; resourceType: string;
  reason: string; retentionType: 'permanent' | 'until_date' | 'days';
  expiresAt?: string; status: 'active' | 'expired'; createdAt: string; addedBy?: string;
}

interface DryRunResult {
  resourceId: string; resourceName: string; resourceType: string; region: string;
  action: 'would-delete' | 'would-retain' | 'would-skip'; reason?: string;
}

interface NukeRun {
  id: string; runType: 'dry-run' | 'live'; status: 'completed' | 'failed' | 'running';
  totalResources: number; deletedResources: number; retainedResources: number;
  failedResources: number; skippedResources: number; wouldDelete?: number;
  dryRunReport?: DryRunResult[]; skippedDetails?: any[];
  duration: string; triggeredBy: string; createdAt: string;
}

interface NukeConfig {
  id: string; provider: string; mode: string; enabled: boolean;
  schedule?: string; nextRunAt?: string; notificationDays: number;
  notificationEmails: string[]; nukeCode: string; nukeRuns: NukeRun[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AccountNuke: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [nukeConfig, setNukeConfig] = useState<NukeConfig | null>(null);
  const [retentions, setRetentions] = useState<RetentionPolicy[]>([]);
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'retentions' | 'history' | 'settings'>('overview');
  const [showRunModal, setShowRunModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<NukeRun | null>(null);

  const provider = accountId?.includes('azure') ? 'azure' : accountId?.includes('gcp') ? 'gcp' : 'aws';

  useEffect(() => {
    if (accountId) { fetchAll(); }
  }, [accountId]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchAccountInfo(), fetchNukeConfig(), fetchRetentions()]);
    setLoading(false);
  };

  const fetchAccountInfo = async () => {
    try {
      const res = await fetch(`${API}/api/cloud/accounts`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const accounts = await res.json();
        const account = accounts.find((a: any) => a.id === accountId);
        setAccountInfo(account || demoAccount());
      } else setAccountInfo(demoAccount());
    } catch { setAccountInfo(demoAccount()); }
  };

  const demoAccount = () => {
    if (provider === 'azure') return { id: accountId, provider: 'azure', accountName: 'Production Azure', accountId: 'sub-prod-001' };
    if (provider === 'gcp') return { id: accountId, provider: 'gcp', accountName: 'Production GCP', accountId: 'gcp-prod-001' };
    return { id: accountId, provider: 'aws', accountName: 'Int-Managedservice-Sandbox', accountId: '884390772196' };
  };

  const fetchNukeConfig = async () => {
    try {
      const res = await fetch(`${API}/api/nuke/account/${accountId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setNukeConfig(d.config); }
      else setNukeConfig(getDemoConfig());
    } catch { setNukeConfig(getDemoConfig()); }
  };

  const fetchRetentions = async () => {
    try {
      const res = await fetch(`${API}/api/nuke/retentions/account/${accountId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setRetentions(d.retentions || []); }
    } catch {}
  };

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await fetch(`${API}/api/nuke/resources/${accountId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setResources(d.resources || []); }
      else setResources(getDemoResources());
    } catch { setResources(getDemoResources()); }
    setResourcesLoading(false);
  };

  const getDemoConfig = (): NukeConfig => {
    const nextRun = new Date();
    if (provider === 'azure') {
      const day = nextRun.getDay(); nextRun.setDate(nextRun.getDate() + ((5 - day + 7) % 7 || 7)); nextRun.setHours(18, 0, 0, 0);
    } else { nextRun.setMonth(nextRun.getMonth() + 1, 3); nextRun.setHours(2, 0, 0, 0); }
    return {
      id: `nuke-${accountId}`, provider, mode: 'automatic', enabled: true,
      schedule: provider === 'azure' ? 'Every Friday at 6:00 PM' : 'Monthly (before 5th)',
      nextRunAt: nextRun.toISOString(), notificationDays: 7,
      notificationEmails: ['devops@company.com', 'cloudteam@company.com'],
      nukeCode: '', nukeRuns: getDemoRuns(),
    };
  };

  const getDemoRuns = (): NukeRun[] => [
    { id: 'run-3', runType: 'dry-run', status: 'completed', totalResources: 52, deletedResources: 0, retainedResources: 10, failedResources: 0, skippedResources: 3, wouldDelete: 39, triggeredBy: 'System (Scheduled)', duration: '1m 48s', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'run-2', runType: 'live', status: 'completed', totalResources: 48, deletedResources: 38, retainedResources: 8, failedResources: 2, skippedResources: 2, triggeredBy: 'John Doe', duration: '4m 12s', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'run-1', runType: 'dry-run', status: 'completed', totalResources: 44, deletedResources: 0, retainedResources: 7, failedResources: 0, skippedResources: 1, wouldDelete: 36, triggeredBy: 'System (Scheduled)', duration: '1m 32s', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  ];

  const getDemoResources = (): CloudResource[] => {
    if (provider === 'aws') return [
      { id: 'i-0abc123', name: 'web-server-prod-01', type: 'EC2Instance', category: 'Compute', region: 'us-east-1', status: 'running', hasDeleteProtection: true },
      { id: 'i-0def456', name: 'app-server-dev-01', type: 'EC2Instance', category: 'Compute', region: 'us-east-1', status: 'running' },
      { id: 'i-0ghi789', name: 'worker-node-01', type: 'EC2Instance', category: 'Compute', region: 'us-west-2', status: 'running' },
      { id: 'vol-0abc123', name: 'data-volume-01', type: 'EC2Volume', category: 'Storage', region: 'us-east-1', status: 'available' },
      { id: 'prod-data-bucket', name: 'prod-data-bucket', type: 'S3Bucket', category: 'Storage', region: 'global' },
      { id: 'dev-artifacts', name: 'dev-artifacts', type: 'S3Bucket', category: 'Storage', region: 'global' },
      { id: 'db-prod-mysql', name: 'prod-mysql', type: 'RDSInstance', category: 'Database', region: 'us-east-1', hasDeleteProtection: true },
      { id: 'db-dev-pg', name: 'dev-postgres', type: 'RDSInstance', category: 'Database', region: 'us-east-1' },
      { id: 'users-table', name: 'users', type: 'DynamoDBTable', category: 'Database', region: 'us-east-1' },
      { id: 'fn-auth', name: 'auth-handler', type: 'LambdaFunction', category: 'Serverless', region: 'us-east-1' },
      { id: 'fn-processor', name: 'data-processor', type: 'LambdaFunction', category: 'Serverless', region: 'us-east-1' },
      { id: 'prod-cluster', name: 'prod-cluster', type: 'ECSCluster', category: 'Containers', region: 'us-east-1' },
      { id: 'prod-eks', name: 'prod-eks-cluster', type: 'EKSCluster', category: 'Containers', region: 'us-east-1' },
      { id: 'app-ecr', name: 'app-backend', type: 'ECRRepository', category: 'Containers', region: 'us-east-1' },
      { id: 'job-queue', name: 'job-queue', type: 'SQSQueue', category: 'Messaging', region: 'us-east-1' },
      { id: 'alerts-topic', name: 'alerts', type: 'SNSTopic', category: 'Messaging', region: 'us-east-1' },
      { id: 'event-stream', name: 'event-stream', type: 'KinesisStream', category: 'Messaging', region: 'us-east-1' },
      { id: 'app-stack', name: 'app-stack', type: 'CloudFormationStack', category: 'Infrastructure', region: 'us-east-1' },
      { id: 'prod-alb', name: 'prod-alb', type: 'ApplicationLoadBalancer', category: 'LoadBalancing', region: 'us-east-1' },
      { id: 'prod-asg', name: 'prod-auto-scaling', type: 'AutoScalingGroup', category: 'Compute', region: 'us-east-1' },
      { id: 'prod-api', name: 'prod-api', type: 'APIGateway', category: 'Serverless', region: 'us-east-1' },
      { id: 'prod-vpc', name: 'prod-vpc', type: 'VPC', category: 'Networking', region: 'us-east-1' },
      { id: 'cache-cluster', name: 'prod-redis', type: 'ElastiCacheCluster', category: 'Database', region: 'us-east-1' },
      { id: 'analytics-cluster', name: 'analytics-cluster', type: 'RedshiftCluster', category: 'Analytics', region: 'us-east-1' },
      { id: 'prod-cdn', name: 'prod-cdn', type: 'CloudFrontDistribution', category: 'CDN', region: 'global' },
      { id: 'db-creds', name: 'db-creds', type: 'SecretsManagerSecret', category: 'Security', region: 'us-east-1' },
      { id: 'user-pool', name: 'prod-user-pool', type: 'CognitoUserPool', category: 'Identity', region: 'us-east-1' },
      { id: 'app-build', name: 'app-build', type: 'CodeBuildProject', category: 'DevOps', region: 'us-east-1' },
      { id: 'deploy-pipeline', name: 'deploy-pipeline', type: 'CodePipeline', category: 'DevOps', region: 'us-east-1' },
    ];
    return [];
  };

  const addRetention = async (resource: CloudResource, reason: string, retentionType: string, expiresAt?: string) => {
    try {
      const u = user();
      const res = await fetch(`${API}/api/nuke/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ accountId, userId: u.id, resourceId: resource.id, resourceName: resource.name, resourceType: resource.type, reason, retentionType, expiresAt }),
      });
      const newRet: RetentionPolicy = {
        id: `ret-${Date.now()}`, resourceId: resource.id, resourceName: resource.name,
        resourceType: resource.type, reason, retentionType: retentionType as any,
        expiresAt, status: 'active', createdAt: new Date().toISOString(), addedBy: u.name || 'You',
      };
      if (res.ok) { const d = await res.json(); setRetentions(prev => [d.retention || newRet, ...prev]); }
      else setRetentions(prev => [newRet, ...prev]);
    } catch (err) {
      const u = user();
      setRetentions(prev => [{
        id: `ret-${Date.now()}`, resourceId: resource.id, resourceName: resource.name,
        resourceType: resource.type, reason, retentionType: retentionType as any,
        expiresAt, status: 'active', createdAt: new Date().toISOString(), addedBy: u.name || 'You',
      }, ...prev]);
    }
  };

  const removeRetention = async (id: string) => {
    try {
      await fetch(`${API}/api/nuke/retention/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    } catch {}
    setRetentions(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" /><p className="text-gray-500">Loading...</p></div>
      </div>
    </MainLayout>
  );

  const daysUntil = nukeConfig?.nextRunAt ? Math.max(0, Math.ceil((new Date(nukeConfig.nextRunAt).getTime() - Date.now()) / 86400000)) : 0;
  const retainedIds = new Set(retentions.map(r => r.resourceId));
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'code', label: provider === 'aws' ? 'AWS Nuke Config' : 'Cleanup Config', icon: FileCode },
    { id: 'retentions', label: `Resources & Retentions`, icon: Shield },
    { id: 'history', label: 'Run History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f7fa]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="mb-6">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><Flame className="w-6 h-6 text-red-600" /></div>
                  Nuke Automation
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${provider === 'azure' ? 'bg-blue-100 text-blue-700' : provider === 'gcp' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {provider.toUpperCase()}
                  </span>
                </h1>
                <p className="text-gray-500 mt-1 ml-13">{accountInfo?.accountName} · {accountInfo?.accountId}
                  <span className="ml-3 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {provider === 'azure' ? 'Every Friday 6PM' : provider === 'gcp' ? 'Monthly' : 'Monthly (before 5th)'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEmailModal(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Mail className="w-4 h-4" /> Send Notification
                </button>
                <button onClick={() => setShowRunModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  <Play className="w-4 h-4" /> Run Nuke
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: <Calendar className="w-5 h-5 text-red-500" />, label: 'Next Run', value: nukeConfig?.nextRunAt ? new Date(nukeConfig.nextRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', sub: daysUntil > 0 ? `${daysUntil} days away` : 'Today', color: 'red' },
              { icon: <Shield className="w-5 h-5 text-green-500" />, label: 'Protected', value: String(retentions.length), sub: 'Retained resources', color: 'green' },
              { icon: <History className="w-5 h-5 text-blue-500" />, label: 'Total Runs', value: String(nukeConfig?.nukeRuns?.length ?? 0), sub: 'All time', color: 'blue' },
              { icon: <Bell className="w-5 h-5 text-purple-500" />, label: 'Notify Before', value: `${nukeConfig?.notificationDays ?? 7}d`, sub: `${nukeConfig?.notificationEmails?.length ?? 0} recipients`, color: 'purple' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border p-4 ${s.color === 'red' ? 'bg-red-50 border-red-100' : s.color === 'green' ? 'bg-green-50 border-green-100' : s.color === 'blue' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
                <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</span></div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {daysUntil <= 7 && nukeConfig?.nextRunAt && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${daysUntil <= 2 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-sm"><strong>Nuke scheduled in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</strong> — {new Date(nukeConfig.nextRunAt).toLocaleString()}</div>
              <button onClick={() => setActiveTab('retentions')} className="text-sm font-semibold underline">Review Retentions →</button>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100 px-4 pt-2 gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'retentions' && resources.length === 0) fetchResources(); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-red-500 text-red-600 bg-red-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    <Icon className="w-4 h-4" />{tab.label}
                  </button>
                );
              })}
            </div>
            <div className="p-6">
              {activeTab === 'overview' && <OverviewTab nukeConfig={nukeConfig} daysUntil={daysUntil} retentions={retentions} provider={provider} onGoToRetentions={() => { setActiveTab('retentions'); if (resources.length === 0) fetchResources(); }} />}
              {activeTab === 'code' && <CodeTab nukeConfig={nukeConfig} retentions={retentions} provider={provider} accountId={accountId!} />}
              {activeTab === 'retentions' && <RetentionsTab resources={resources} retentions={retentions} resourcesLoading={resourcesLoading} onFetchResources={fetchResources} onAddRetention={addRetention} onRemoveRetention={removeRetention} provider={provider} />}
              {activeTab === 'history' && <HistoryTab runs={nukeConfig?.nukeRuns ?? []} onSelectRun={setSelectedRun} />}
              {activeTab === 'settings' && <SettingsTab nukeConfig={nukeConfig} provider={provider} onUpdate={(u) => setNukeConfig(prev => prev ? { ...prev, ...u } : prev)} />}
            </div>
          </div>
        </div>
      </div>

      {showRunModal && (
        <RunNukeModal accountId={accountId!} accountInfo={accountInfo} retentions={retentions} provider={provider}
          onClose={() => setShowRunModal(false)}
          onSuccess={(run) => { setNukeConfig(prev => prev ? { ...prev, nukeRuns: [run, ...(prev.nukeRuns || [])] } : prev); setShowRunModal(false); setActiveTab('history'); }} />
      )}
      {showEmailModal && <SendEmailModal nukeConfig={nukeConfig} daysUntil={daysUntil} provider={provider} onClose={() => setShowEmailModal(false)} />}
      {selectedRun && <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </MainLayout>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ nukeConfig: NukeConfig | null; daysUntil: number; retentions: RetentionPolicy[]; provider: string; onGoToRetentions: () => void; }> = ({ nukeConfig, daysUntil, retentions, provider, onGoToRetentions }) => {
  const lastRun = nukeConfig?.nukeRuns?.[0];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" /> Schedule</h3>
          <div className="space-y-2 text-sm">
            {[['Provider', provider.toUpperCase()], ['Frequency', provider === 'azure' ? 'Every Friday 6:00 PM' : provider === 'gcp' ? 'Monthly' : 'Monthly (before 5th)'],
              ['Next Run', nukeConfig?.nextRunAt ? new Date(nukeConfig.nextRunAt).toLocaleString() : '—'],
              ['Mode', nukeConfig?.mode === 'automatic' ? 'Automatic' : 'Manual'],
              ['Notify before', `${nukeConfig?.notificationDays ?? 7} days`]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-semibold text-gray-800">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-gray-500" /> Last Run Summary</h3>
          {lastRun ? (
            <div className="space-y-2 text-sm">
              {[['Date', new Date(lastRun.createdAt).toLocaleDateString()],
                ['Type', lastRun.runType === 'dry-run' ? 'Dry Run' : 'Live Nuke'],
                [lastRun.runType === 'dry-run' ? 'Would Delete' : 'Deleted', String(lastRun.runType === 'dry-run' ? (lastRun.wouldDelete ?? 0) : lastRun.deletedResources)],
                ['Retained', String(lastRun.retainedResources)],
                ['Skipped', String(lastRun.skippedResources)],
                ['Duration', lastRun.duration]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-semibold text-gray-800">{v}</span></div>
            ))}
            </div>
          ) : <p className="text-sm text-gray-400">No runs yet</p>}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-gray-100 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">How {provider === 'azure' ? 'Azure' : provider === 'gcp' ? 'GCP' : 'AWS'} Nuke Works</h3>
        <div className="flex items-start gap-0">
          {[
            { icon: Mail, label: `Notification ${nukeConfig?.notificationDays ?? 7} days before`, color: 'bg-purple-100 text-purple-600' },
            { icon: Shield, label: 'Add retention policies for resources to keep', color: 'bg-green-100 text-green-600' },
            { icon: Eye, label: 'Mandatory dry run shows what will be deleted', color: 'bg-blue-100 text-blue-600' },
            { icon: Code, label: 'Retentions injected into nuke config', color: 'bg-indigo-100 text-indigo-600' },
            { icon: Play, label: 'Live nuke deletes remaining resources', color: 'bg-red-100 text-red-600' },
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center mb-2`}><step.icon className="w-5 h-5" /></div>
                <p className="text-xs text-center text-gray-600 leading-tight">{step.label}</p>
              </div>
              {i < 4 && <ChevronRight className="w-4 h-4 text-gray-300 mt-3 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Key Information</p>
          <ul className="space-y-1 text-blue-700">
            <li>• Resources with delete/termination protection are automatically skipped and logged</li>
            <li>• All users can add retention policies — no approval needed</li>
            <li>• A mandatory dry run is shown before any live nuke to preview changes</li>
            <li>• Notification emails are sent {nukeConfig?.notificationDays ?? 7} days before each scheduled run</li>
          </ul>
        </div>
      </div>

      <button onClick={onGoToRetentions} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" /> View All Resources & Manage Retentions →
      </button>
    </div>
  );
};

// ─── Code Tab ─────────────────────────────────────────────────────────────────

const CodeTab: React.FC<{ nukeConfig: NukeConfig | null; retentions: RetentionPolicy[]; provider: string; accountId: string; }> = ({ nukeConfig, retentions, provider, accountId }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchCode(); }, [retentions.length]);

  const fetchCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/nuke/code/${accountId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setCode(d.code); }
      else setCode(nukeConfig?.nukeCode || '# Loading...');
    } catch { setCode(nukeConfig?.nukeCode || ''); }
    setLoading(false);
  };

  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = provider === 'aws' ? 'aws-nuke-config.yaml' : provider === 'azure' ? 'azure-cleanup-config.yaml' : 'gcp-cleanup-config.yaml';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{provider === 'aws' ? 'aws-nuke YAML Config' : `${provider === 'azure' ? 'Azure' : 'GCP'} Cleanup Config (CloudGuard-native)`}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{provider === 'aws' ? 'Standard aws-nuke YAML — push to your repo before each run. Retentions are injected automatically.' : `CloudGuard uses this config internally to target resources via ${provider === 'azure' ? 'Azure' : 'GCP'} SDK. Not a third-party tool format.`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCode} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleCopy} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={handleDownload} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      {retentions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold text-green-800">{retentions.length} retention{retentions.length > 1 ? 's' : ''} injected into config</span></div>
          <div className="space-y-1">
            {retentions.slice(0, 5).map(r => (
              <div key={r.id} className="text-xs font-mono text-green-800 bg-green-100 rounded px-2 py-1">
                &quot;{r.resourceId}&quot; — {r.resourceName} [{r.retentionType}]
              </div>
            ))}
            {retentions.length > 5 && <p className="text-xs text-green-600">+{retentions.length - 5} more...</p>}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between bg-gray-800 text-gray-300 text-xs px-4 py-2 rounded-t-xl">
          <span className="flex items-center gap-2"><FileCode className="w-3.5 h-3.5" />{provider === 'aws' ? 'aws-nuke-config.yaml' : provider === 'azure' ? 'azure-cleanup-config.yaml' : 'gcp-cleanup-config.yaml'}</span>
          <span className="text-gray-500">YAML — {code.split('\n').length} lines</span>
        </div>
        {loading ? (
          <div className="w-full h-96 bg-gray-900 rounded-b-xl flex items-center justify-center">
            <Loader className="w-8 h-8 text-green-400 animate-spin" />
          </div>
        ) : (
          <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false}
            className="w-full h-[560px] bg-gray-900 text-green-300 font-mono text-xs p-4 rounded-b-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        )}
      </div>
    </div>
  );
};

// ─── Resources & Retentions Tab ───────────────────────────────────────────────

const RetentionsTab: React.FC<{
  resources: CloudResource[]; retentions: RetentionPolicy[]; resourcesLoading: boolean;
  onFetchResources: () => void; onAddRetention: (r: CloudResource, reason: string, type: string, expires?: string) => void;
  onRemoveRetention: (id: string) => void; provider: string;
}> = ({ resources, retentions, resourcesLoading, onFetchResources, onAddRetention, onRemoveRetention, provider }) => {
  const [view, setView] = useState<'resources' | 'retentions'>('resources');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [addingFor, setAddingFor] = useState<CloudResource | null>(null);
  const [reason, setReason] = useState('');
  const [retType, setRetType] = useState('permanent');
  const [expires, setExpires] = useState('');

  const retainedIds = new Set(retentions.map(r => r.resourceId));

  const categories = ['All', ...Array.from(new Set(resources.map(r => r.category)))];
  const filtered = resources.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAdd = () => {
    if (!addingFor || !reason) return;
    onAddRetention(addingFor, reason, retType, retType === 'until_date' ? expires : undefined);
    setAddingFor(null); setReason(''); setRetType('permanent'); setExpires('');
  };

  const categoryColors: Record<string, string> = {
    Compute: 'bg-blue-100 text-blue-700', Storage: 'bg-yellow-100 text-yellow-700',
    Database: 'bg-purple-100 text-purple-700', Networking: 'bg-cyan-100 text-cyan-700',
    Serverless: 'bg-pink-100 text-pink-700', Containers: 'bg-indigo-100 text-indigo-700',
    Messaging: 'bg-orange-100 text-orange-700', Security: 'bg-red-100 text-red-700',
    Analytics: 'bg-green-100 text-green-700', Infrastructure: 'bg-gray-100 text-gray-700',
    CDN: 'bg-teal-100 text-teal-700', Identity: 'bg-violet-100 text-violet-700',
    DevOps: 'bg-emerald-100 text-emerald-700', LoadBalancing: 'bg-sky-100 text-sky-700',
    ML: 'bg-fuchsia-100 text-fuchsia-700',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Resources & Retention Policies</h3>
          <p className="text-sm text-gray-500">Browse all cloud resources and mark which to keep during nuke runs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button onClick={() => setView('resources')} className={`px-4 py-2 flex items-center gap-1.5 transition-colors ${view === 'resources' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              <Grid className="w-3.5 h-3.5" /> All Resources
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === 'resources' ? 'bg-indigo-500' : 'bg-gray-200 text-gray-600'}`}>{resources.length}</span>
            </button>
            <button onClick={() => setView('retentions')} className={`px-4 py-2 flex items-center gap-1.5 transition-colors ${view === 'retentions' ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              <Shield className="w-3.5 h-3.5" /> Retained
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === 'retentions' ? 'bg-green-500' : 'bg-gray-200 text-gray-600'}`}>{retentions.length}</span>
            </button>
          </div>
          <button onClick={onFetchResources} disabled={resourcesLoading} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${resourcesLoading ? 'animate-spin' : ''}`} />
            {resources.length === 0 ? 'Scan Resources' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Resources View */}
      {view === 'resources' && (
        <>
          {resources.length === 0 && !resourcesLoading ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No resources scanned yet</p>
              <p className="text-gray-400 text-sm mt-1">Click &quot;Scan Resources&quot; to load all {provider.toUpperCase()} resources</p>
              <button onClick={onFetchResources} className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">
                Scan Now
              </button>
            </div>
          ) : resourcesLoading ? (
            <div className="text-center py-16">
              <Loader className="w-10 h-10 mx-auto mb-3 text-indigo-500 animate-spin" />
              <p className="text-gray-500">Scanning {provider.toUpperCase()} resources across all services...</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span>{filtered.length} resources</span>
                <span>·</span>
                <span className="text-green-600 font-medium">{retainedIds.size} retained</span>
                <span>·</span>
                <span className="text-red-500 font-medium">{filtered.filter(r => !retainedIds.has(r.id) && !r.hasDeleteProtection).length} would be deleted</span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filtered.map(resource => {
                  const isRetained = retainedIds.has(resource.id);
                  const ret = retentions.find(r => r.resourceId === resource.id);
                  return (
                    <div key={resource.id} className={`p-4 rounded-xl border transition-all ${isRetained ? 'bg-green-50/60 border-green-200' : resource.hasDeleteProtection ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${categoryColors[resource.category] || 'bg-gray-100 text-gray-700'}`}>{resource.type}</span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{resource.category}</span>
                            {resource.region !== 'global' && <span className="text-xs text-gray-400">{resource.region}</span>}
                            {resource.hasDeleteProtection && <span className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Shield className="w-3 h-3" /> Delete Protected</span>}
                            {isRetained && <span className="text-xs font-semibold text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Retained</span>}
                          </div>
                          <p className="font-semibold text-gray-900 truncate">{resource.name}</p>
                          <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{resource.id}</p>
                          {ret && <p className="text-xs text-green-600 mt-1">Reason: {ret.reason}</p>}
                          {resource.metadata && Object.keys(resource.metadata).length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{Object.entries(resource.metadata).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isRetained ? (
                            <button onClick={() => { if (ret) onRemoveRetention(ret.id); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-semibold transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Remove Retention
                            </button>
                          ) : (
                            <button onClick={() => setAddingFor(resource)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-semibold transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Add Retention
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Retentions View */}
      {view === 'retentions' && (
        <div className="space-y-3">
          {retentions.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-green-200 rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 text-green-300" />
              <p className="text-gray-500">No retention policies yet</p>
              <p className="text-gray-400 text-sm mt-1">Switch to &quot;All Resources&quot; view to add retentions</p>
            </div>
          ) : retentions.map(ret => (
            <div key={ret.id} className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700`}>{ret.resourceType}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ret.retentionType === 'permanent' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {ret.retentionType === 'permanent' ? 'Permanent' : ret.retentionType === 'until_date' ? `Until ${new Date(ret.expiresAt!).toLocaleDateString()}` : 'Temporary'}
                  </span>
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-green-700 font-semibold">Active</span>
                </div>
                <p className="font-semibold text-gray-900">{ret.resourceName}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{ret.resourceId}</p>
                <p className="text-sm text-gray-600 mt-1">{ret.reason}</p>
                <p className="text-xs text-gray-400 mt-1">By {ret.addedBy || 'User'} · {new Date(ret.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => { if (window.confirm('Remove this retention?')) onRemoveRetention(ret.id); }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Retention Modal */}
      {addingFor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Add Retention Policy</h2>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-gray-800">{addingFor.name}</p>
              <p className="text-xs text-gray-500 font-mono">{addingFor.id}</p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">{addingFor.type}</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Retention Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['permanent', 'until_date', 'days'] as const).map(t => (
                    <button key={t} onClick={() => setRetType(t)}
                      className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${retType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {t === 'permanent' ? 'Permanent' : t === 'until_date' ? 'Until Date' : 'Temporary'}
                    </button>
                  ))}
                </div>
              </div>
              {retType === 'until_date' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Retain Until</label>
                  <input type="date" value={expires} onChange={e => setExpires(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why should this resource be retained?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setAddingFor(null); setReason(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleAdd} disabled={!reason} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
                  Add Retention
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Run Nuke Modal (with mandatory dry-run first) ────────────────────────────

const RunNukeModal: React.FC<{
  accountId: string; accountInfo: any; retentions: RetentionPolicy[]; provider: string;
  onClose: () => void; onSuccess: (run: NukeRun) => void;
}> = ({ accountId, accountInfo, retentions, provider, onClose, onSuccess }) => {
  const [step, setStep] = useState<'dry-run-running' | 'dry-run-result' | 'confirm-live' | 'live-running' | 'live-result'>('dry-run-running');
  const [dryRunResult, setDryRunResult] = useState<NukeRun | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Scanning resources...');
  const [liveResult, setLiveResult] = useState<NukeRun | null>(null);

  useEffect(() => { runDryRun(); }, []);

  const simulateProgress = async (labels: string[]) => {
    const step = 100 / labels.length;
    for (let i = 0; i < labels.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
      setProgress(Math.round(step * (i + 1)));
      setProgressLabel(labels[i]);
    }
  };

  const runDryRun = async () => {
    setStep('dry-run-running');
    setProgress(0);
    const labels = ['Scanning cloud resources...', 'Checking retention policies...', 'Simulating deletions...', 'Checking delete protection...', 'Generating report...'];
    simulateProgress(labels);

    try {
      const res = await fetch(`${API}/api/nuke/dry-run/${accountId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ region: 'us-east-1' }),
      });
      if (res.ok) { const d = await res.json(); setDryRunResult(d.run); }
      else setDryRunResult(getDemoRun('dry-run'));
    } catch { setDryRunResult(getDemoRun('dry-run')); }

    setProgress(100);
    setStep('dry-run-result');
  };

  const runLiveNuke = async () => {
    setStep('live-running');
    setProgress(0);
    const u = user();
    const labels = ['Injecting retention policies into config...', 'Connecting to cloud APIs...', 'Deleting EC2 instances...', 'Deleting S3 buckets...', 'Deleting databases...', 'Deleting serverless functions...', 'Cleaning up networking...', 'Finalizing...'];
    simulateProgress(labels);

    try {
      const res = await fetch(`${API}/api/nuke/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ accountId, userId: u.id, runType: 'live', provider, region: 'us-east-1' }),
      });
      if (res.ok) { const d = await res.json(); setLiveResult(d.run); }
      else setLiveResult(getDemoRun('live'));
    } catch { setLiveResult(getDemoRun('live')); }

    setProgress(100);
    setStep('live-result');
  };

  const getDemoRun = (type: 'dry-run' | 'live'): NukeRun => ({
    id: `run-${Date.now()}`, runType: type, status: 'completed',
    totalResources: 29, deletedResources: type === 'live' ? 22 : 0,
    retainedResources: retentions.length, failedResources: 0,
    skippedResources: 3, wouldDelete: 22,
    skippedDetails: [
      { resourceId: 'i-0abc123', resourceName: 'web-server-prod-01', resourceType: 'EC2Instance', reason: 'Delete protection enabled' },
      { resourceId: 'db-prod-mysql', resourceName: 'prod-mysql', resourceType: 'RDSInstance', reason: 'Delete protection enabled' },
    ],
    dryRunReport: [
      { resourceId: 'i-0def456', resourceName: 'app-server-dev-01', resourceType: 'EC2Instance', region: 'us-east-1', action: 'would-delete' },
      { resourceId: 'dev-artifacts', resourceName: 'dev-artifacts', resourceType: 'S3Bucket', region: 'global', action: 'would-delete' },
      { resourceId: 'fn-processor', resourceName: 'data-processor', resourceType: 'LambdaFunction', region: 'us-east-1', action: 'would-delete' },
      { resourceId: 'i-0abc123', resourceName: 'web-server-prod-01', resourceType: 'EC2Instance', region: 'us-east-1', action: 'would-skip', reason: 'Delete protection' },
      ...retentions.slice(0, 3).map(r => ({ resourceId: r.resourceId, resourceName: r.resourceName, resourceType: r.resourceType, region: 'us-east-1', action: 'would-retain' as const, reason: `Retention: ${r.retentionType}` })),
    ],
    duration: `${Math.floor(Math.random() * 5 + 1)}m ${Math.floor(Math.random() * 59)}s`,
    triggeredBy: user().name || 'Manual', createdAt: new Date().toISOString(),
  });

  const isRunning = step === 'dry-run-running' || step === 'live-running';
  const isDryRunStep = step === 'dry-run-running' || step === 'dry-run-result';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Running state */}
        {isRunning && (
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full ${isDryRunStep ? 'bg-blue-100' : 'bg-red-100'} flex items-center justify-center mx-auto mb-4`}>
              {isDryRunStep ? <Eye className="w-10 h-10 text-blue-500 animate-pulse" /> : <Flame className="w-10 h-10 text-red-500 animate-pulse" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{isDryRunStep ? 'Running Dry Run...' : 'Executing Live Nuke...'}</h2>
            <p className="text-sm text-gray-500 mb-6">{progressLabel}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div className={`h-2 rounded-full transition-all duration-500 ${isDryRunStep ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        )}

        {/* Dry run result */}
        {step === 'dry-run-result' && dryRunResult && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Eye className="w-7 h-7 text-blue-600" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dry Run Complete</h2>
                <p className="text-sm text-gray-500">Review what will happen before running the live nuke</p>
              </div>
              <button onClick={onClose} className="ml-auto p-2 hover:bg-gray-100 rounded-lg"><XCircle className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total', value: dryRunResult.totalResources, color: 'bg-gray-50 border-gray-200 text-gray-700' },
                { label: 'Would Delete', value: dryRunResult.wouldDelete ?? dryRunResult.deletedResources, color: 'bg-red-50 border-red-200 text-red-600' },
                { label: 'Retained', value: dryRunResult.retainedResources, color: 'bg-green-50 border-green-200 text-green-600' },
                { label: 'Skipped', value: dryRunResult.skippedResources, color: 'bg-amber-50 border-amber-200 text-amber-600' },
              ].map((s, i) => (
                <div key={i} className={`p-3 rounded-xl border ${s.color}`}>
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color.split(' ')[2]}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Report */}
            {dryRunResult.dryRunReport && dryRunResult.dryRunReport.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b">Dry Run Report — what will happen</div>
                <div className="max-h-64 overflow-y-auto">
                  {dryRunResult.dryRunReport.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-xs border-b border-gray-50 last:border-0 ${item.action === 'would-delete' ? 'bg-red-50/50' : item.action === 'would-retain' ? 'bg-green-50/50' : 'bg-amber-50/50'}`}>
                      <div className="flex items-center gap-2">
                        {item.action === 'would-delete' && <Trash2 className="w-3.5 h-3.5 text-red-500" />}
                        {item.action === 'would-retain' && <Shield className="w-3.5 h-3.5 text-green-500" />}
                        {item.action === 'would-skip' && <SkipForward className="w-3.5 h-3.5 text-amber-500" />}
                        <span className="font-medium text-gray-800">{item.resourceName}</span>
                        <span className="text-gray-400">({item.resourceType})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.reason && <span className="text-gray-400 italic truncate max-w-32">{item.reason}</span>}
                        <span className={`font-bold ${item.action === 'would-delete' ? 'text-red-600' : item.action === 'would-retain' ? 'text-green-600' : 'text-amber-600'}`}>
                          {item.action === 'would-delete' ? 'DELETE' : item.action === 'would-retain' ? 'RETAIN' : 'SKIP'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Warning:</strong> The live nuke will permanently delete {dryRunResult.wouldDelete ?? 0} resources from {provider.toUpperCase()} account &quot;{accountInfo?.accountName}&quot;. This cannot be undone.
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => onSuccess(dryRunResult)} className="px-4 py-2.5 border border-blue-200 bg-blue-50 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                Save Dry Run Only
              </button>
              <button onClick={() => setStep('confirm-live')} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
                Proceed to Live Nuke →
              </button>
            </div>
          </div>
        )}

        {/* Confirm live */}
        {step === 'confirm-live' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-500" /> Confirm Live Nuke</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">You are about to permanently delete {dryRunResult?.wouldDelete ?? 0} resources from {accountInfo?.accountName}.</p>
              <p className="text-sm text-red-700">This action is irreversible. Resources with active retention policies and delete protection will be skipped.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('dry-run-result')} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">← Go Back</button>
              <button onClick={runLiveNuke} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
                Yes, Delete Resources
              </button>
            </div>
          </div>
        )}

        {/* Live result */}
        {step === 'live-result' && liveResult && (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-9 h-9 text-green-500" /></div>
              <h2 className="text-xl font-bold text-gray-900">Nuke Complete</h2>
              <p className="text-sm text-gray-500 mt-1">Completed in {liveResult.duration}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Total Scanned', value: liveResult.totalResources, color: 'bg-gray-50 border-gray-200 text-gray-700' },
                { label: 'Deleted', value: liveResult.deletedResources, color: 'bg-red-50 border-red-200 text-red-600' },
                { label: 'Retained', value: liveResult.retainedResources, color: 'bg-green-50 border-green-200 text-green-600' },
                { label: 'Skipped (Protected)', value: liveResult.skippedResources, color: 'bg-amber-50 border-amber-200 text-amber-600' },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-xl border ${s.color}`}>
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color.split(' ')[2]}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {liveResult.skippedDetails && liveResult.skippedDetails.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2"><SkipForward className="w-4 h-4" /> Skipped (Protected)</p>
                {liveResult.skippedDetails.map((s: any, i: number) => (
                  <div key={i} className="text-xs text-amber-700 flex items-start gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span><strong>{s.resourceName}</strong> ({s.resourceType}) — {s.reason}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => onSuccess(liveResult)} className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
              View in Run History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── History Tab ──────────────────────────────────────────────────────────────

const HistoryTab: React.FC<{ runs: NukeRun[]; onSelectRun: (r: NukeRun) => void }> = ({ runs, onSelectRun }) => {
  if (!runs.length) return (
    <div className="text-center py-16 text-gray-400"><History className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No nuke runs yet</p></div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-gray-800">Run History</h3><span className="text-sm text-gray-400">{runs.length} total</span></div>
      {runs.map(run => (
        <div key={run.id} onClick={() => onSelectRun(run)} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${run.runType === 'dry-run' ? 'bg-blue-100' : 'bg-red-100'}`}>
                {run.runType === 'dry-run' ? <Eye className="w-5 h-5 text-blue-600" /> : <Flame className="w-5 h-5 text-red-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${run.runType === 'dry-run' ? 'text-blue-700' : 'text-red-700'}`}>{run.runType === 'dry-run' ? 'Dry Run' : 'Live Nuke'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{run.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(run.createdAt).toLocaleString()} · {run.duration} · by {run.triggeredBy}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              {[['Total', run.totalResources, 'text-gray-700'], [run.runType === 'dry-run' ? 'Would Del' : 'Deleted', run.runType === 'dry-run' ? (run.wouldDelete ?? 0) : run.deletedResources, 'text-red-500'], ['Retained', run.retainedResources, 'text-green-500'], ['Skipped', run.skippedResources, 'text-yellow-500']].map(([label, val, color]) => (
                <div key={label as string}><p className="text-xs text-gray-400">{label as string}</p><p className={`font-bold ${color}`}>{val as number}</p></div>
              ))}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const SettingsTab: React.FC<{ nukeConfig: NukeConfig | null; provider: string; onUpdate: (u: Partial<NukeConfig>) => void }> = ({ nukeConfig, provider, onUpdate }) => {
  const [emails, setEmails] = useState<string[]>(nukeConfig?.notificationEmails ?? []);
  const [newEmail, setNewEmail] = useState('');
  const [notifyDays, setNotifyDays] = useState(nukeConfig?.notificationDays ?? 7);
  const [mode, setMode] = useState<'automatic' | 'manual'>(nukeConfig?.mode as any ?? 'automatic');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate({ mode, notificationDays: notifyDays, notificationEmails: emails });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h3 className="font-semibold text-gray-800 mb-1">Nuke Settings</h3><p className="text-sm text-gray-500">Configure schedule, notifications, and execution mode</p></div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Execution Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {(['automatic', 'manual'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`p-4 rounded-xl border-2 text-left transition-all ${mode === m ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1">{m === 'automatic' ? <Calendar className="w-5 h-5 text-green-500" /> : <Zap className="w-5 h-5 text-blue-500" />}<span className="font-semibold text-gray-800 capitalize">{m}</span></div>
              <p className="text-xs text-gray-500">{m === 'automatic' ? provider === 'azure' ? 'Runs every Friday at 6:00 PM' : 'Runs monthly before the 5th' : 'Only runs when manually triggered'}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Notify how many days before?</label>
        <div className="flex items-center gap-2">
          {[3, 5, 7, 14].map(d => (
            <button key={d} onClick={() => setNotifyDays(d)} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${notifyDays === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{d} days</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Recipients</label>
        <div className="space-y-2 mb-3">
          {emails.map((email, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">{email}</span>
              <button onClick={() => setEmails(emails.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><XCircle className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newEmail && !emails.includes(newEmail)) { setEmails([...emails, newEmail]); setNewEmail(''); } }} placeholder="Add email..." type="email"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={() => { if (newEmail && !emails.includes(newEmail)) { setEmails([...emails, newEmail]); setNewEmail(''); } }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">
        {saved ? <Check className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}{saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
};

// ─── Send Email Modal ─────────────────────────────────────────────────────────

const SendEmailModal: React.FC<{ nukeConfig: NukeConfig | null; daysUntil: number; provider: string; onClose: () => void }> = ({ nukeConfig, daysUntil, provider, onClose }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSend = async () => { setSending(true); await new Promise(r => setTimeout(r, 1500)); setSending(false); setSent(true); };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {!sent ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2"><Mail className="w-6 h-6 text-indigo-500" /> Send Nuke Notification</h2>
            <p className="text-sm text-gray-500 mb-5">Notify the team about the upcoming nuke run</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
              {[['Provider', provider.toUpperCase()], ['Next Run', nukeConfig?.nextRunAt ? new Date(nukeConfig.nextRunAt).toLocaleDateString() : '—'], ['Days Until', `${daysUntil} days`], ['Recipients', `${nukeConfig?.notificationEmails?.length ?? 0} emails`]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-semibold">{v}</span></div>
              ))}
            </div>
            <div className="mb-5 space-y-1">
              {(nukeConfig?.notificationEmails ?? ['devops@company.com']).map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" />{e}</div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSend} disabled={sending} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-9 h-9 text-green-500" /></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sent!</h2>
            <p className="text-sm text-gray-500 mb-6">{nukeConfig?.notificationEmails?.length ?? 0} recipients notified</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Run Detail Modal ─────────────────────────────────────────────────────────

const RunDetailModal: React.FC<{ run: NukeRun; onClose: () => void }> = ({ run, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {run.runType === 'dry-run' ? <><Eye className="w-6 h-6 text-blue-500" /> Dry Run Detail</> : <><Flame className="w-6 h-6 text-red-500" /> Live Nuke Detail</>}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{new Date(run.createdAt).toLocaleString()} · {run.duration} · by {run.triggeredBy}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><XCircle className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[['Total', run.totalResources, 'bg-gray-50 text-gray-700'], [run.runType === 'dry-run' ? 'Would Delete' : 'Deleted', run.runType === 'dry-run' ? (run.wouldDelete ?? 0) : run.deletedResources, 'bg-red-50 text-red-600'], ['Retained', run.retainedResources, 'bg-green-50 text-green-600'], ['Skipped', run.skippedResources, 'bg-amber-50 text-amber-600']].map(([l, v, c], i) => (
            <div key={i} className={`rounded-xl p-3 ${c} border border-gray-100`}><p className="text-xs text-gray-400 mb-1">{l}</p><p className={`text-2xl font-bold ${(c as string).split(' ')[1]}`}>{v as number}</p></div>
          ))}
        </div>
        {run.dryRunReport && run.dryRunReport.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Full Report</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 border-b">
                <span className="col-span-4">Resource</span><span className="col-span-3">Type</span><span className="col-span-2">Region</span><span className="col-span-3 text-right">Action</span>
              </div>
              {run.dryRunReport.map((item, i) => (
                <div key={i} className={`grid grid-cols-12 px-4 py-2.5 text-xs border-b border-gray-50 last:border-0 ${item.action === 'would-delete' ? 'bg-red-50/50' : item.action === 'would-retain' ? 'bg-green-50/50' : 'bg-amber-50/50'}`}>
                  <span className="col-span-4 font-medium text-gray-800 truncate">{item.resourceName}</span>
                  <span className="col-span-3 text-gray-500 truncate">{item.resourceType}</span>
                  <span className="col-span-2 text-gray-400">{item.region}</span>
                  <span className={`col-span-3 text-right font-bold ${item.action === 'would-delete' ? 'text-red-600' : item.action === 'would-retain' ? 'text-green-600' : 'text-amber-600'}`}>
                    {item.action === 'would-delete' ? 'DELETE' : item.action === 'would-retain' ? 'RETAIN' : 'SKIP'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AccountNuke;
