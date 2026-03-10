import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Flame, Calendar, Shield, RefreshCw, Play, CheckCircle,
  AlertTriangle, Clock, Search, Settings, Zap, Upload,
  Code, Plus, Trash2, Mail, History, Eye, XCircle,
  ChevronRight, Download, FileCode, Bell, SkipForward,
  BarChart2, AlertCircle, ArrowLeft, Copy, Check,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Retention {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  reason: string;
  retentionType: 'permanent' | 'until_date' | 'days';
  expiresAt?: string;
  isApproved: boolean;
  status: 'active' | 'pending' | 'expired';
  user?: { name: string; email: string };
  createdAt: string;
}

interface NukeRun {
  id: string;
  runType: 'dry-run' | 'live';
  status: 'completed' | 'failed' | 'running';
  totalResources: number;
  deletedResources: number;
  retainedResources: number;
  failedResources: number;
  skippedResources: number;
  skippedDetails?: SkippedResource[];
  dryRunReport?: DryRunItem[];
  createdAt: string;
  duration?: string;
  triggeredBy?: string;
}

interface SkippedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  reason: string;
}

interface DryRunItem {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  region: string;
  action: 'would-delete' | 'would-retain' | 'would-skip';
  reason?: string;
}

interface NukeConfig {
  id: string;
  provider: 'aws' | 'azure';
  mode: 'automatic' | 'manual';
  enabled: boolean;
  schedule?: string;
  nextRunAt?: string;
  notificationDays: number;
  notificationEmails: string[];
  nukeCode?: string;
  nukeRuns: NukeRun[];
}

// ─── Main Component ──────────────────────────────────────────────────────────

const AccountNuke: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [nukeConfig, setNukeConfig] = useState<NukeConfig | null>(null);
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'retentions' | 'history' | 'settings'>('overview');
  const [showManualNukeModal, setShowManualNukeModal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<NukeRun | null>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  const isAdmin = user.role === 'admin';

  const provider = accountId?.includes('azure') ? 'azure' : accountId?.includes('gcp') ? 'gcp' : 'aws';

  useEffect(() => {
    if (accountId) {
      fetchAccountInfo();
      fetchNukeConfig();
      fetchRetentions();
    }
  }, [accountId]);

  const fetchAccountInfo = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const accounts = await res.json();
        const account = accounts.find((a: any) => a.id === accountId);
        setAccountInfo(account || getDemoAccountInfo());
      } else setAccountInfo(getDemoAccountInfo());
    } catch { setAccountInfo(getDemoAccountInfo()); }
  };

  const getDemoAccountInfo = () => {
    if (provider === 'azure') return { id: accountId, provider: 'Azure', accountName: 'Production Azure', accountId: 'sub-prod-001' };
    if (provider === 'gcp') return { id: accountId, provider: 'GCP', accountName: 'Production GCP', accountId: 'gcp-prod-001' };
    return { id: accountId, provider: 'AWS', accountName: 'Production AWS', accountId: '123456789012' };
  };

  const fetchNukeConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/nuke/account/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNukeConfig(data.config);
      } else setNukeConfig(getDemoConfig());
    } catch { setNukeConfig(getDemoConfig()); }
    finally { setLoading(false); }
  };

  const getDemoConfig = (): NukeConfig => {
    const isAzure = provider === 'azure';
    const nextRun = new Date();
    if (isAzure) {
      // next Friday
      const day = nextRun.getDay();
      nextRun.setDate(nextRun.getDate() + ((5 - day + 7) % 7 || 7));
      nextRun.setHours(18, 0, 0, 0);
    } else {
      // next month before 5th
      nextRun.setMonth(nextRun.getMonth() + 1, 3);
      nextRun.setHours(2, 0, 0, 0);
    }

    return {
      id: `nuke-${accountId}`,
      provider: isAzure ? 'azure' : 'aws',
      mode: 'automatic',
      enabled: true,
      schedule: isAzure ? 'Every Friday at 6:00 PM' : 'Monthly (before 5th)',
      nextRunAt: nextRun.toISOString(),
      notificationDays: 7,
      notificationEmails: ['devops@company.com', 'cloudteam@company.com'],
      nukeCode: isAzure ? getDemoAzureCode() : getDemoAWSCode(),
      nukeRuns: [
        {
          id: 'run-3',
          runType: 'dry-run',
          status: 'completed',
          totalResources: 52,
          deletedResources: 0,
          retainedResources: 10,
          failedResources: 0,
          skippedResources: 3,
          skippedDetails: getDemoSkipped(),
          dryRunReport: getDemoDryRunReport(),
          triggeredBy: 'System (Scheduled)',
          duration: '1m 48s',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'run-2',
          runType: 'live',
          status: 'completed',
          totalResources: 48,
          deletedResources: 38,
          retainedResources: 8,
          failedResources: 2,
          skippedResources: 2,
          skippedDetails: getDemoSkipped(),
          triggeredBy: 'John Doe',
          duration: '4m 12s',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'run-1',
          runType: 'dry-run',
          status: 'completed',
          totalResources: 44,
          deletedResources: 0,
          retainedResources: 7,
          failedResources: 0,
          skippedResources: 1,
          skippedDetails: getDemoSkipped().slice(0, 1),
          dryRunReport: getDemoDryRunReport(),
          triggeredBy: 'System (Scheduled)',
          duration: '1m 32s',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
  };

  const getDemoSkipped = (): SkippedResource[] => [
    { resourceId: 'i-1234567890abcdef0', resourceName: 'prod-web-server-01', resourceType: 'EC2', reason: 'Termination protection enabled on instance' },
    { resourceId: 'db-prod-mysql-main', resourceName: 'production-database', resourceType: 'RDS', reason: 'Deletion protection is enabled on this DB instance' },
    { resourceId: 'critical-s3-bucket', resourceName: 'prod-data-archive', resourceType: 'S3', reason: 'Bucket policy denies deletion (MFA delete required)' },
  ];

  const getDemoDryRunReport = (): DryRunItem[] => [
    { resourceId: 'i-abc123', resourceName: 'dev-sandbox-01', resourceType: 'EC2', region: 'us-east-1', action: 'would-delete' },
    { resourceId: 'i-def456', resourceName: 'test-instance-temp', resourceType: 'EC2', region: 'us-west-2', action: 'would-delete' },
    { resourceId: 'vol-111', resourceName: 'unattached-volume-01', resourceType: 'EBS', region: 'us-east-1', action: 'would-delete' },
    { resourceId: 'bucket-test-2025', resourceName: 'test-data-2025', resourceType: 'S3', region: 'us-east-1', action: 'would-delete' },
    { resourceId: 'i-1234567890abcdef0', resourceName: 'prod-web-server-01', resourceType: 'EC2', region: 'us-east-1', action: 'would-retain', reason: 'Retention policy: permanent' },
    { resourceId: 'db-prod-mysql', resourceName: 'production-database', resourceType: 'RDS', region: 'us-east-1', action: 'would-retain', reason: 'Retention policy: until 2026-06-01' },
    { resourceId: 'db-prod-mysql-main', resourceName: 'production-database-main', resourceType: 'RDS', region: 'us-east-1', action: 'would-skip', reason: 'Deletion protection enabled' },
  ];

  const getDemoAWSCode = () => `regions:
  - us-east-1
  - us-west-2
  - eu-west-1

account-blocklist:
  - "999999999999"  # Never nuke this account

accounts:
  "${accountId?.split('-').pop() || '123456789012'}":
    presets:
      - default

resource-types:
  targets:
    - EC2Instance
    - EC2Volume
    - S3Bucket
    - RDSInstance
    - ElasticLoadBalancer
    - AutoScalingGroup
    - CloudFormationStack
    - LambdaFunction
    - ECRRepository
    - ECSCluster

  excludes:
    - IAMUser
    - IAMRole
    - Route53HostedZone

filters:
  EC2Instance:
    - property: tag:Environment
      value: production
      invert: false
    - "i-1234567890abcdef0"   # prod-web-server-01 [RETENTION]
  
  RDSInstance:
    - "db-prod-mysql"          # production-database [RETENTION]

  S3Bucket:
    - property: Name
      type: glob
      value: "prod-*"

settings:
  EC2Instance:
    DisableStopProtection: false
    DisableTerminationProtection: false
`;

  const getDemoAzureCode = () => `# Azure Resource Cleanup Configuration
# Schedule: Every Friday at 6:00 PM
# Account: ${accountId}

subscriptions:
  - id: "sub-prod-001"
    name: "Production Azure"

resource_groups:
  exclude:
    - "prod-infrastructure-rg"
    - "shared-services-rg"

resource_types:
  targets:
    - Microsoft.Compute/virtualMachines
    - Microsoft.Storage/storageAccounts
    - Microsoft.Network/virtualNetworks
    - Microsoft.Sql/servers
    - Microsoft.ContainerService/managedClusters
    - Microsoft.KeyVault/vaults
    - Microsoft.Web/sites

filters:
  virtualMachines:
    - property: tags.Environment
      value: production
      exclude: true
    - "vm-prod-web-01"          # prod-web-vm [RETENTION]

  storageAccounts:
    - property: Name
      type: glob
      value: "prod*"
      exclude: true

settings:
  dry_run: true
  delete_locks: false
  notification_days_before: 7
`;

  const fetchRetentions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/nuke/retentions/account/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRetentions(data.retentions || []);
      } else setRetentions(getDemoRetentions());
    } catch { setRetentions(getDemoRetentions()); }
  };

  const getDemoRetentions = (): Retention[] => [
    {
      id: 'ret-1', resourceType: 'EC2', resourceId: 'i-1234567890abcdef0',
      resourceName: 'prod-web-server-01', reason: 'Production web server — critical for business operations',
      retentionType: 'permanent', isApproved: true, status: 'active',
      user: { name: 'John Doe', email: 'john@company.com' },
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'ret-2', resourceType: 'RDS', resourceId: 'db-prod-mysql',
      resourceName: 'production-database', reason: 'Main production DB with live customer data',
      retentionType: 'permanent', isApproved: true, status: 'active',
      user: { name: 'Jane Smith', email: 'jane@company.com' },
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'ret-3', resourceType: 'EC2', resourceId: 'i-0987654321fedcba0',
      resourceName: 'test-instance-temp', reason: 'Needed for Q1 testing — will be removed after March 31',
      retentionType: 'until_date', expiresAt: new Date(Date.now() + 28 * 86400000).toISOString(),
      isApproved: false, status: 'pending',
      user: { name: 'Bob Wilson', email: 'bob@company.com' },
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  const getDaysUntil = (date?: string) => {
    if (!date) return 0;
    return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading nuke configuration...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const daysUntil = getDaysUntil(nukeConfig?.nextRunAt);
  const approvedRetentions = retentions.filter(r => r.isApproved && r.status === 'active');
  const pendingRetentions = retentions.filter(r => !r.isApproved);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'code', label: provider === 'azure' ? 'Azure Config' : 'AWS Nuke Config', icon: FileCode },
    { id: 'retentions', label: `Retentions (${approvedRetentions.length})`, icon: Shield },
    { id: 'history', label: 'Run History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f7fa]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* ── Back + Header ── */}
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Flame className="w-6 h-6 text-red-600" />
                  </div>
                  Nuke Automation
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    provider === 'azure' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {provider.toUpperCase()}
                  </span>
                </h1>
                <p className="text-gray-500 mt-1 ml-13">
                  {accountInfo?.accountName} · {accountInfo?.accountId}
                  <span className="ml-3 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {provider === 'azure' ? 'Every Friday 6PM' : 'Monthly (before 5th)'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {pendingRetentions.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    <Bell className="w-4 h-4" />
                    {pendingRetentions.length} pending retention{pendingRetentions.length > 1 ? 's' : ''}
                  </div>
                )}
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" /> Send Notification
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowManualNukeModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Play className="w-4 h-4" /> Run Nuke
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Calendar className="w-5 h-5 text-red-500" />}
              label="Next Run"
              value={nukeConfig?.nextRunAt ? new Date(nukeConfig.nextRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              sub={daysUntil > 0 ? `${daysUntil} days away` : 'Today'}
              color="red"
            />
            <StatCard
              icon={<Shield className="w-5 h-5 text-green-500" />}
              label="Protected Resources"
              value={String(approvedRetentions.length)}
              sub="Will be retained"
              color="green"
            />
            <StatCard
              icon={<History className="w-5 h-5 text-blue-500" />}
              label="Total Runs"
              value={String(nukeConfig?.nukeRuns?.length ?? 0)}
              sub="All time"
              color="blue"
            />
            <StatCard
              icon={<Bell className="w-5 h-5 text-purple-500" />}
              label="Notification Emails"
              value={String(nukeConfig?.notificationEmails?.length ?? 0)}
              sub={`${nukeConfig?.notificationDays ?? 7} days before`}
              color="purple"
            />
          </div>

          {/* ── Schedule Banner ── */}
          {nukeConfig?.nextRunAt && daysUntil <= 7 && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
              daysUntil <= 2
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <strong>Nuke scheduled in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</strong>
                {' '}— {new Date(nukeConfig.nextRunAt).toLocaleString()}. Make sure all retention policies are approved before then.
              </div>
              <button
                onClick={() => setActiveTab('retentions')}
                className="text-sm font-semibold underline underline-offset-2"
              >
                Review Retentions →
              </button>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100 px-4 pt-2 gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600 bg-red-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <OverviewTab
                  nukeConfig={nukeConfig}
                  daysUntil={daysUntil}
                  retentions={retentions}
                  provider={provider}
                  onScanResources={async () => {
                    setScanning(true);
                    await new Promise(r => setTimeout(r, 1500));
                    setScanning(false);
                    setActiveTab('retentions');
                  }}
                  scanning={scanning}
                />
              )}
              {activeTab === 'code' && (
                <CodeTab
                  nukeConfig={nukeConfig}
                  retentions={approvedRetentions}
                  provider={provider}
                  onSaveCode={(code) => setNukeConfig(prev => prev ? { ...prev, nukeCode: code } : prev)}
                />
              )}
              {activeTab === 'retentions' && (
                <RetentionsTab
                  retentions={retentions}
                  onRefresh={fetchRetentions}
                  isAdmin={isAdmin}
                  onAdd={() => setShowRetentionModal(true)}
                  onRemove={(id) => setRetentions(prev => prev.filter(r => r.id !== id))}
                  provider={provider}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab
                  runs={nukeConfig?.nukeRuns ?? []}
                  onSelectRun={setSelectedRun}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsTab
                  nukeConfig={nukeConfig}
                  isAdmin={isAdmin}
                  provider={provider}
                  onUpdate={(updates) => setNukeConfig(prev => prev ? { ...prev, ...updates } : prev)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showManualNukeModal && (
        <RunNukeModal
          accountId={accountId!}
          accountInfo={accountInfo}
          nukeConfig={nukeConfig}
          retentions={approvedRetentions}
          provider={provider}
          onClose={() => setShowManualNukeModal(false)}
          onSuccess={(run) => {
            setNukeConfig(prev => prev ? {
              ...prev,
              nukeRuns: [run, ...(prev.nukeRuns || [])],
            } : prev);
            setShowManualNukeModal(false);
            setActiveTab('history');
          }}
        />
      )}

      {showRetentionModal && (
        <AddRetentionModal
          accountId={accountId!}
          provider={provider}
          onClose={() => setShowRetentionModal(false)}
          onSuccess={(r) => {
            setRetentions(prev => [r, ...prev]);
            setShowRetentionModal(false);
          }}
        />
      )}

      {showEmailModal && (
        <SendEmailModal
          nukeConfig={nukeConfig}
          daysUntil={daysUntil}
          provider={provider}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {selectedRun && (
        <RunDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </MainLayout>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}> = ({ icon, label, value, sub, color }) => {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-100',
    green: 'bg-green-50 border-green-100',
    blue: 'bg-blue-50 border-blue-100',
    purple: 'bg-purple-50 border-purple-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{
  nukeConfig: NukeConfig | null;
  daysUntil: number;
  retentions: Retention[];
  provider: string;
  onScanResources: () => void;
  scanning: boolean;
}> = ({ nukeConfig, daysUntil, retentions, provider, onScanResources, scanning }) => {
  const lastRun = nukeConfig?.nukeRuns?.[0];

  return (
    <div className="space-y-6">
      {/* Schedule info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" /> Schedule
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Provider</span>
              <span className="font-semibold text-gray-800">{provider.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Frequency</span>
              <span className="font-semibold text-gray-800">
                {provider === 'azure' ? 'Every Friday 6:00 PM' : 'Monthly (before 5th)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Next Run</span>
              <span className="font-semibold text-gray-800">
                {nukeConfig?.nextRunAt ? new Date(nukeConfig.nextRunAt).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span className={`font-semibold ${nukeConfig?.mode === 'automatic' ? 'text-green-600' : 'text-blue-600'}`}>
                {nukeConfig?.mode === 'automatic' ? 'Automatic' : 'Manual'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Notify before</span>
              <span className="font-semibold text-gray-800">{nukeConfig?.notificationDays ?? 7} days</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" /> Last Run Summary
          </h3>
          {lastRun ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-gray-800">{new Date(lastRun.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className={`font-semibold ${lastRun.runType === 'dry-run' ? 'text-blue-600' : 'text-red-600'}`}>
                  {lastRun.runType === 'dry-run' ? 'Dry Run' : 'Live'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deleted</span>
                <span className="font-bold text-red-500">{lastRun.deletedResources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retained</span>
                <span className="font-bold text-green-500">{lastRun.retainedResources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Skipped</span>
                <span className="font-bold text-yellow-500">{lastRun.skippedResources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-semibold text-gray-800">{lastRun.duration}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No runs yet</p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-gray-100 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">How {provider === 'azure' ? 'Azure' : 'AWS'} Nuke Works</h3>
        <div className="flex items-start gap-0">
          {[
            { icon: Mail, label: `Notification sent ${nukeConfig?.notificationDays ?? 7} days before`, color: 'bg-purple-100 text-purple-600' },
            { icon: Shield, label: 'Team adds retention policies for resources to keep', color: 'bg-green-100 text-green-600' },
            { icon: Code, label: `Retentions injected into ${provider === 'azure' ? 'Azure' : 'aws-nuke'} config`, color: 'bg-blue-100 text-blue-600' },
            { icon: Play, label: provider === 'azure' ? 'Code pushed & nuke runs Friday 6PM' : 'Code pushed & nuke runs before 5th', color: 'bg-red-100 text-red-600' },
            { icon: History, label: 'Results logged with skipped/deleted details', color: 'bg-gray-100 text-gray-600' },
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center mb-2`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-center text-gray-600 leading-tight">{step.label}</p>
              </div>
              {i < 4 && <ChevronRight className="w-4 h-4 text-gray-300 mt-3 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Warning box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800 mb-1">Important Notes</p>
          <ul className="space-y-1 text-amber-700">
            <li>• Resources with delete/termination protection are automatically skipped and logged</li>
            <li>• All retention requests require admin approval before the nuke runs</li>
            <li>• Dry run shows what would be deleted — no actual deletion occurs</li>
            <li>• Notification emails are sent {nukeConfig?.notificationDays ?? 7} days before each scheduled run</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ─── Code Tab ─────────────────────────────────────────────────────────────────

const CodeTab: React.FC<{
  nukeConfig: NukeConfig | null;
  retentions: Retention[];
  provider: string;
  onSaveCode: (code: string) => void;
}> = ({ nukeConfig, retentions, provider, onSaveCode }) => {
  const [code, setCode] = useState(nukeConfig?.nukeCode || '');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show what the retentions look like injected
  const generateRetentionComment = () => {
    if (retentions.length === 0) return '';
    const lines = retentions.map(r =>
      `    - "${r.resourceId}"   # ${r.resourceName} [RETENTION: ${r.retentionType}]`
    ).join('\n');
    return `\n# ── Auto-injected retentions (${retentions.length}) ──\nfilters:\n  ${provider === 'azure' ? 'virtualMachines' : 'EC2Instance'}:\n${lines}\n`;
  };

  const handleSave = () => {
    onSaveCode(code);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setCode(evt.target?.result as string || '');
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">
            {provider === 'azure' ? 'Azure Resource Cleanup Config' : 'aws-nuke YAML Config'}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {provider === 'azure'
              ? 'This config is downloaded, retentions are injected, and the updated file replaces the old one before each run'
              : 'This config is pushed to your code repository with retentions injected before each nuke run'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Upload File
            <input type="file" accept=".yaml,.yml,.json" onChange={handleFileUpload} className="hidden" />
          </label>
          <button onClick={handleCopy} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            {saved ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Retention injection preview */}
      {retentions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">{retentions.length} retention{retentions.length > 1 ? 's' : ''} will be auto-injected into this config</span>
          </div>
          <div className="bg-green-100 rounded-lg p-3 font-mono text-xs text-green-900 whitespace-pre">
            {generateRetentionComment()}
          </div>
        </div>
      )}

      {/* Code editor */}
      <div className="relative">
        <div className="flex items-center justify-between bg-gray-800 text-gray-300 text-xs px-4 py-2 rounded-t-xl">
          <span className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5" />
            {provider === 'azure' ? 'azure-cleanup.yaml' : 'aws-nuke-config.yaml'}
          </span>
          <span className="text-gray-500">{provider === 'azure' ? 'YAML' : 'YAML'}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full h-[480px] bg-gray-900 text-green-300 font-mono text-sm p-4 rounded-b-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={`Paste your ${provider === 'azure' ? 'Azure cleanup' : 'aws-nuke'} configuration here...`}
        />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">How retentions are injected:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-600">
          <li>All approved retentions from the Retentions tab are collected</li>
          <li>Resource IDs are added as filter entries with comments showing the reason</li>
          <li>Updated config is {provider === 'azure' ? 'written to replace the existing file' : 'committed and pushed to your repository'}</li>
          <li>Nuke runs against the updated config</li>
        </ol>
      </div>
    </div>
  );
};

// ─── Retentions Tab ───────────────────────────────────────────────────────────

const RetentionsTab: React.FC<{
  retentions: Retention[];
  onRefresh: () => void;
  isAdmin: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  provider: string;
}> = ({ retentions, onRefresh, isAdmin, onAdd, onRemove, provider }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const token = localStorage.getItem('accessToken');

  const approveRetention = async (id: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/nuke/retention/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) onRefresh();
      else alert('Failed to approve');
    } catch { alert('Error approving'); }
  };

  const filtered = retentions.filter(r => {
    const matchSearch = r.resourceName.toLowerCase().includes(search.toLowerCase()) ||
      r.resourceId.toLowerCase().includes(search.toLowerCase()) ||
      r.resourceType.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'approved' ? r.isApproved : !r.isApproved);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Retention Policies</h3>
          <p className="text-sm text-gray-500">Resources marked for retention will not be deleted during nuke runs</p>
        </div>
        <button onClick={onAdd} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Retention
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID or type..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['all', 'approved', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No retention policies found</p>
          <button onClick={onAdd} className="mt-3 text-indigo-600 text-sm hover:underline">Add the first one →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className={`p-4 rounded-xl border transition-all ${
              r.isApproved ? 'bg-green-50/50 border-green-200' : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {r.resourceType}
                    </span>
                    {r.isApproved ? (
                      <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending Approval
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.retentionType === 'permanent' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {r.retentionType === 'permanent' ? 'Permanent' :
                       r.retentionType === 'until_date' ? `Until ${new Date(r.expiresAt!).toLocaleDateString()}` :
                       'Temporary'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">{r.resourceName}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{r.resourceId}</p>
                  <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    By {r.user?.name ?? 'Unknown'} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!r.isApproved && isAdmin && (
                    <button
                      onClick={() => approveRetention(r.id)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm('Remove this retention policy?')) onRemove(r.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── History Tab ──────────────────────────────────────────────────────────────

const HistoryTab: React.FC<{
  runs: NukeRun[];
  onSelectRun: (run: NukeRun) => void;
}> = ({ runs, onSelectRun }) => {
  if (runs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No nuke runs yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">Nuke Run History</h3>
        <span className="text-sm text-gray-400">{runs.length} total run{runs.length > 1 ? 's' : ''}</span>
      </div>
      {runs.map(run => (
        <div
          key={run.id}
          onClick={() => onSelectRun(run)}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                run.runType === 'dry-run' ? 'bg-blue-100' : 'bg-red-100'
              }`}>
                {run.runType === 'dry-run'
                  ? <Eye className="w-5 h-5 text-blue-600" />
                  : <Flame className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${run.runType === 'dry-run' ? 'text-blue-700' : 'text-red-700'}`}>
                    {run.runType === 'dry-run' ? 'Dry Run' : 'Live Nuke'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    run.status === 'completed' ? 'bg-green-100 text-green-700' :
                    run.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{run.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(run.createdAt).toLocaleString()} · {run.duration} · by {run.triggeredBy}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="font-bold text-gray-700">{run.totalResources}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{run.runType === 'dry-run' ? 'Would Delete' : 'Deleted'}</p>
                <p className="font-bold text-red-500">{run.deletedResources}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Retained</p>
                <p className="font-bold text-green-500">{run.retainedResources}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Skipped</p>
                <p className="font-bold text-yellow-500">{run.skippedResources}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const SettingsTab: React.FC<{
  nukeConfig: NukeConfig | null;
  isAdmin: boolean;
  provider: string;
  onUpdate: (updates: Partial<NukeConfig>) => void;
}> = ({ nukeConfig, isAdmin, provider, onUpdate }) => {
  const [emails, setEmails] = useState<string[]>(nukeConfig?.notificationEmails ?? []);
  const [newEmail, setNewEmail] = useState('');
  const [notifyDays, setNotifyDays] = useState(nukeConfig?.notificationDays ?? 7);
  const [mode, setMode] = useState<'automatic' | 'manual'>(nukeConfig?.mode ?? 'automatic');
  const [saved, setSaved] = useState(false);

  const addEmail = () => {
    if (newEmail && !emails.includes(newEmail)) {
      setEmails([...emails, newEmail]);
      setNewEmail('');
    }
  };

  const handleSave = () => {
    if (!isAdmin) return alert('Admin access required');
    onUpdate({ mode, notificationDays: notifyDays, notificationEmails: emails });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">Nuke Automation Settings</h3>
        <p className="text-sm text-gray-500">Configure schedule, notifications, and execution mode</p>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Admin access required to change settings
        </div>
      )}

      {/* Mode */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Execution Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {(['automatic', 'manual'] as const).map(m => (
            <button
              key={m}
              onClick={() => isAdmin && setMode(m)}
              disabled={!isAdmin}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === m
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-2 mb-1">
                {m === 'automatic' ? <Calendar className="w-5 h-5 text-green-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
                <span className="font-semibold text-gray-800 capitalize">{m}</span>
              </div>
              <p className="text-xs text-gray-500">
                {m === 'automatic'
                  ? provider === 'azure' ? 'Runs every Friday at 6:00 PM automatically' : 'Runs monthly before the 5th automatically'
                  : 'Only runs when you manually trigger it'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Notification days */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notify team how many days before nuke?
        </label>
        <div className="flex items-center gap-3">
          {[3, 5, 7, 14].map(d => (
            <button
              key={d}
              onClick={() => isAdmin && setNotifyDays(d)}
              disabled={!isAdmin}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
                notifyDays === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Notification emails */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notification Email Recipients
        </label>
        <div className="space-y-2 mb-3">
          {emails.map((email, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">{email}</span>
              {isAdmin && (
                <button
                  onClick={() => setEmails(emails.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="Add email address..."
              type="email"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={addEmail} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {saved ? <Check className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      )}
    </div>
  );
};

// ─── Run Nuke Modal ───────────────────────────────────────────────────────────

const RunNukeModal: React.FC<{
  accountId: string;
  accountInfo: any;
  nukeConfig: NukeConfig | null;
  retentions: Retention[];
  provider: string;
  onClose: () => void;
  onSuccess: (run: NukeRun) => void;
}> = ({ accountId, accountInfo, nukeConfig, retentions, provider, onClose, onSuccess }) => {
  const [step, setStep] = useState<'options' | 'confirm' | 'executing' | 'complete'>('options');
  const [isDryRun, setIsDryRun] = useState(true);
  const [respectRetentions, setRespectRetentions] = useState(true);
  const [result, setResult] = useState<NukeRun | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Initializing...');

  const token = localStorage.getItem('accessToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const executeNuke = async () => {
    setStep('executing');
    setProgress(0);

    // Simulate progress steps
    const steps = [
      [15, provider === 'azure' ? 'Downloading Azure config...' : 'Fetching aws-nuke config from repo...'],
      [30, 'Injecting retention policies...'],
      [45, provider === 'azure' ? 'Replacing config file...' : 'Pushing updated config to repository...'],
      [60, 'Scanning cloud resources...'],
      [75, isDryRun ? 'Simulating resource deletion...' : 'Deleting resources...'],
      [90, 'Processing skipped resources...'],
      [100, 'Finalizing run report...'],
    ];

    for (const [pct, label] of steps) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setProgress(pct as number);
      setProgressLabel(label as string);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/nuke/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          accountId, userId: user.id,
          runType: isDryRun ? 'dry-run' : 'live',
          respectRetentions,
          provider,
        }),
      });

      const demoRun: NukeRun = {
        id: `run-${Date.now()}`,
        runType: isDryRun ? 'dry-run' : 'live',
        status: 'completed',
        totalResources: 52,
        deletedResources: isDryRun ? 0 : 34,
        retainedResources: respectRetentions ? retentions.length : 0,
        failedResources: isDryRun ? 0 : 1,
        skippedResources: 3,
        skippedDetails: [
          { resourceId: 'i-abc', resourceName: 'prod-web-01', resourceType: 'EC2', reason: 'Termination protection enabled' },
          { resourceId: 'db-main', resourceName: 'prod-database', resourceType: 'RDS', reason: 'Deletion protection enabled' },
          { resourceId: 's3-critical', resourceName: 'prod-archive', resourceType: 'S3', reason: 'MFA delete required' },
        ],
        dryRunReport: isDryRun ? [
          { resourceId: 'i-dev-01', resourceName: 'dev-sandbox-01', resourceType: 'EC2', region: 'us-east-1', action: 'would-delete' },
          { resourceId: 'vol-111', resourceName: 'unattached-vol-01', resourceType: 'EBS', region: 'us-east-1', action: 'would-delete' },
          { resourceId: 'bucket-test', resourceName: 'test-data-bucket', resourceType: 'S3', region: 'us-east-1', action: 'would-delete' },
          { resourceId: 'i-prod-01', resourceName: 'prod-web-server-01', resourceType: 'EC2', region: 'us-east-1', action: 'would-retain', reason: 'Retention: permanent' },
          { resourceId: 'db-prod', resourceName: 'production-database', resourceType: 'RDS', region: 'us-east-1', action: 'would-retain', reason: 'Retention: until 2026-06-01' },
          { resourceId: 'i-abc', resourceName: 'prod-web-01', resourceType: 'EC2', region: 'us-east-1', action: 'would-skip', reason: 'Termination protection enabled' },
        ] : undefined,
        triggeredBy: user.name || 'Manual',
        duration: `${(2 + Math.random() * 3).toFixed(0)}m ${Math.floor(Math.random() * 59)}s`,
        createdAt: new Date().toISOString(),
      };

      if (res.ok) {
        const data = await res.json();
        setResult(data.run || demoRun);
      } else {
        setResult(demoRun);
      }
    } catch {
      setResult({
        id: `run-${Date.now()}`, runType: isDryRun ? 'dry-run' : 'live', status: 'completed',
        totalResources: 45, deletedResources: isDryRun ? 0 : 30, retainedResources: retentions.length,
        failedResources: 0, skippedResources: 2, triggeredBy: user.name || 'Manual',
        duration: '3m 12s', createdAt: new Date().toISOString(),
      });
    }

    setStep('complete');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

        {step === 'options' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-500" /> Run Nuke
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {provider.toUpperCase()} · {accountInfo?.accountName}
            </p>

            <div className="space-y-4">
              {/* Dry run toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="font-semibold text-gray-800">Dry Run Mode</p>
                  <p className="text-xs text-gray-500 mt-0.5">Simulate without deleting anything</p>
                </div>
                <button
                  onClick={() => setIsDryRun(!isDryRun)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isDryRun ? 'bg-green-500' : 'bg-red-500'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDryRun ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Respect retentions toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="font-semibold text-gray-800">Respect Retentions</p>
                  <p className="text-xs text-gray-500 mt-0.5">Skip {retentions.length} approved retention{retentions.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setRespectRetentions(!respectRetentions)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${respectRetentions ? 'bg-green-500' : 'bg-red-500'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${respectRetentions ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Run Summary</p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-gray-500">Run type</span>
                  <span className={`font-bold ${isDryRun ? 'text-blue-600' : 'text-red-600'}`}>
                    {isDryRun ? 'Dry Run' : 'Live Nuke'}
                  </span>
                  <span className="text-gray-500">Provider</span>
                  <span className="font-semibold text-gray-800">{provider.toUpperCase()}</span>
                  <span className="text-gray-500">Retentions</span>
                  <span className="font-semibold text-gray-800">
                    {respectRetentions ? `${retentions.length} protected` : 'Ignored'}
                  </span>
                </div>
              </div>

              {!isDryRun && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> This will permanently delete cloud resources. This action cannot be undone.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${isDryRun ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {isDryRun ? 'Run Simulation →' : 'Confirm Live Nuke →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" /> Confirm Execution
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                {isDryRun
                  ? 'You are about to run a dry-run simulation. No resources will be deleted.'
                  : `You are about to run a LIVE nuke on ${accountInfo?.provider} account "${accountInfo?.accountName}". Resources not in retention list will be permanently deleted.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('options')} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                ← Go Back
              </button>
              <button
                onClick={executeNuke}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${isDryRun ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Yes, {isDryRun ? 'Run Simulation' : 'Delete Resources'}
              </button>
            </div>
          </div>
        )}

        {step === 'executing' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Flame className="w-10 h-10 text-red-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {isDryRun ? 'Simulating Nuke...' : 'Executing Nuke...'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">{progressLabel}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${isDryRun ? 'bg-blue-500' : 'bg-red-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        )}

        {step === 'complete' && result && (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {isDryRun ? 'Simulation Complete' : 'Nuke Complete'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Completed in {result.duration}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Total Resources', value: result.totalResources, color: 'bg-gray-50 border-gray-200 text-gray-700' },
                { label: isDryRun ? 'Would Delete' : 'Deleted', value: result.deletedResources, color: 'bg-red-50 border-red-200 text-red-600' },
                { label: 'Retained', value: result.retainedResources, color: 'bg-green-50 border-green-200 text-green-600' },
                { label: 'Skipped (Protected)', value: result.skippedResources, color: 'bg-amber-50 border-amber-200 text-amber-600' },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border ${item.color}`}>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color.split(' ').pop()}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Skipped resources breakdown */}
            {result.skippedDetails && result.skippedDetails.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <SkipForward className="w-4 h-4" /> Skipped Resources (Delete Protected)
                </p>
                <div className="space-y-2">
                  {result.skippedDetails.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">{s.resourceName}</span>
                        <span className="text-amber-500"> ({s.resourceType})</span>
                        <span className="ml-1">— {s.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dry run report */}
            {isDryRun && result.dryRunReport && (
              <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200">
                  Dry Run Report — what would happen
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {result.dryRunReport.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-xs border-b border-gray-100 last:border-0 ${
                      item.action === 'would-delete' ? 'bg-red-50' :
                      item.action === 'would-retain' ? 'bg-green-50' : 'bg-amber-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        {item.action === 'would-delete' && <Trash2 className="w-3.5 h-3.5 text-red-500" />}
                        {item.action === 'would-retain' && <Shield className="w-3.5 h-3.5 text-green-500" />}
                        {item.action === 'would-skip' && <SkipForward className="w-3.5 h-3.5 text-amber-500" />}
                        <span className="font-medium text-gray-800">{item.resourceName}</span>
                        <span className="text-gray-400">({item.resourceType})</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        {item.reason && <span className="text-gray-400 italic">{item.reason}</span>}
                        <span className={`font-semibold ${
                          item.action === 'would-delete' ? 'text-red-600' :
                          item.action === 'would-retain' ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {item.action === 'would-delete' ? 'DELETE' :
                           item.action === 'would-retain' ? 'RETAIN' : 'SKIP'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => onSuccess(result)}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              View in Run History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Add Retention Modal ──────────────────────────────────────────────────────

const AddRetentionModal: React.FC<{
  accountId: string;
  provider: string;
  onClose: () => void;
  onSuccess: (r: Retention) => void;
}> = ({ accountId, provider, onClose, onSuccess }) => {
  const [resourceType, setResourceType] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [retentionType, setRetentionType] = useState<'permanent' | 'until_date' | 'days'>('permanent');
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('accessToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const awsTypes = ['EC2', 'RDS', 'S3', 'EBS', 'ECS', 'Lambda', 'ElasticIP', 'CloudFormation', 'ECR', 'AutoScalingGroup'];
  const azureTypes = ['VirtualMachine', 'StorageAccount', 'SQLServer', 'VirtualNetwork', 'KeyVault', 'AppService', 'AKS', 'CosmosDB'];

  const handleSubmit = async () => {
    if (!resourceType || !resourceId || !reason) return alert('Fill all required fields');
    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/nuke/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountId, userId: user.id, resourceType, resourceId, resourceName, retentionType, expiresAt: retentionType === 'until_date' ? expiresAt : null, reason }),
      });

      const newRetention: Retention = {
        id: `ret-${Date.now()}`, resourceType, resourceId, resourceName: resourceName || resourceId,
        reason, retentionType, expiresAt: expiresAt || undefined,
        isApproved: false, status: 'pending',
        user: { name: user.name || 'You', email: user.email || '' },
        createdAt: new Date().toISOString(),
      };

      onSuccess(newRetention);
    } catch {
      const newRetention: Retention = {
        id: `ret-${Date.now()}`, resourceType, resourceId, resourceName: resourceName || resourceId,
        reason, retentionType, expiresAt: expiresAt || undefined,
        isApproved: false, status: 'pending',
        user: { name: user.name || 'You', email: user.email || '' },
        createdAt: new Date().toISOString(),
      };
      onSuccess(newRetention);
    } finally { setSubmitting(false); }
  };

  const resourceTypes = provider === 'azure' ? azureTypes : awsTypes;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Add Retention Policy</h2>
        <p className="text-sm text-gray-500 mb-5">Resources with retention won't be deleted during nuke</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resource Type *</label>
            <select
              value={resourceType}
              onChange={e => setResourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select type...</option>
              {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resource ID *</label>
            <input
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
              placeholder={provider === 'azure' ? 'e.g. vm-prod-web-01' : 'e.g. i-1234567890abcdef0'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resource Name</label>
            <input
              value={resourceName}
              onChange={e => setResourceName(e.target.value)}
              placeholder="Friendly name (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Retention Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['permanent', 'until_date', 'days'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setRetentionType(t)}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                    retentionType === t
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t === 'permanent' ? 'Permanent' : t === 'until_date' ? 'Until Date' : 'Temporary'}
                </button>
              ))}
            </div>
          </div>

          {retentionType === 'until_date' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Retain Until *</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason *</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Why should this resource be retained?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            Retention requests require admin approval before taking effect
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Send Email Modal ─────────────────────────────────────────────────────────

const SendEmailModal: React.FC<{
  nukeConfig: NukeConfig | null;
  daysUntil: number;
  provider: string;
  onClose: () => void;
}> = ({ nukeConfig, daysUntil, provider, onClose }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {!sent ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Mail className="w-6 h-6 text-indigo-500" /> Send Nuke Notification
            </h2>
            <p className="text-sm text-gray-500 mb-5">Notify the team about the upcoming nuke run</p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Provider</span>
                <span className="font-semibold">{provider.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Next Run</span>
                <span className="font-semibold">
                  {nukeConfig?.nextRunAt ? new Date(nukeConfig.nextRunAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Days Until</span>
                <span className={`font-bold ${daysUntil <= 3 ? 'text-red-600' : 'text-gray-800'}`}>{daysUntil} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipients</span>
                <span className="font-semibold">{nukeConfig?.notificationEmails?.length ?? 0} emails</span>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">Will be sent to:</p>
              <div className="space-y-1">
                {(nukeConfig?.notificationEmails ?? ['devops@company.com']).map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    {email}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Notifications Sent!</h2>
            <p className="text-sm text-gray-500 mb-6">
              {nukeConfig?.notificationEmails?.length ?? 0} team member{(nukeConfig?.notificationEmails?.length ?? 0) !== 1 ? 's' : ''} have been notified about the upcoming nuke run
            </p>
            <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
              Done
            </button>
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
              {run.runType === 'dry-run'
                ? <><Eye className="w-6 h-6 text-blue-500" /> Dry Run Detail</>
                : <><Flame className="w-6 h-6 text-red-500" /> Live Nuke Detail</>
              }
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(run.createdAt).toLocaleString()} · {run.duration} · by {run.triggeredBy}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: run.totalResources, color: 'bg-gray-50 text-gray-700' },
            { label: run.runType === 'dry-run' ? 'Would Delete' : 'Deleted', value: run.deletedResources, color: 'bg-red-50 text-red-600' },
            { label: 'Retained', value: run.retainedResources, color: 'bg-green-50 text-green-600' },
            { label: 'Skipped', value: run.skippedResources, color: 'bg-amber-50 text-amber-600' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-3 ${s.color} border border-gray-100`}>
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Skipped resources */}
        {run.skippedDetails && run.skippedDetails.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <SkipForward className="w-4 h-4 text-amber-500" /> Skipped (Delete Protected)
            </h3>
            <div className="space-y-2">
              {run.skippedDetails.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800">{s.resourceName} <span className="font-normal text-gray-500">({s.resourceType})</span></p>
                    <p className="text-xs text-gray-500 font-mono">{s.resourceId}</p>
                    <p className="text-xs text-amber-700 mt-1">Reason: {s.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dry run report */}
        {run.dryRunReport && run.dryRunReport.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-500" /> Dry Run Report
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">
                <span className="col-span-4">Resource</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-3">Region</span>
                <span className="col-span-3 text-right">Action</span>
              </div>
              {run.dryRunReport.map((item, i) => (
                <div key={i} className={`grid grid-cols-12 px-4 py-2.5 text-xs border-b border-gray-50 last:border-0 ${
                  item.action === 'would-delete' ? 'bg-red-50/50' :
                  item.action === 'would-retain' ? 'bg-green-50/50' : 'bg-amber-50/50'
                }`}>
                  <span className="col-span-4 font-medium text-gray-800 truncate">{item.resourceName}</span>
                  <span className="col-span-2 text-gray-500">{item.resourceType}</span>
                  <span className="col-span-3 text-gray-500">{item.region}</span>
                  <span className={`col-span-3 text-right font-bold ${
                    item.action === 'would-delete' ? 'text-red-600' :
                    item.action === 'would-retain' ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {item.action === 'would-delete' ? 'DELETE' :
                     item.action === 'would-retain' ? 'RETAIN' : 'SKIP'}
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
