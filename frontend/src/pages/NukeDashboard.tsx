import React, { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  Flame,
  Calendar,
  Shield,
  Trash2,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Plus,
} from 'lucide-react';

const NukeDashboard: React.FC = () => {
  const [nukeAccounts, setNukeAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [retentions, setRetentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'retentions' | 'runs'>('overview');
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    fetchNukeAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchRetentions(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchNukeAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/nuke/accounts/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setNukeAccounts(data.accounts || []);
      if (data.accounts && data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0]);
      }
    } catch (error) {
      console.error('Failed to fetch nuke accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTestAccount = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/nuke/create-test-account/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountName: 'Devops Sandbox'
        }),
      });
      
      const data = await response.json();
      alert('Test nuke account created! Refreshing...');
      fetchNukeAccounts();
    } catch (error: any) {
      alert('Failed to create test account: ' + error.message);
    }
  };

  const scanResources = async () => {
    if (!selectedAccount) return;
    
    try {
      setScanning(true);
      const response = await fetch(`http://localhost:3000/api/nuke/scan/${selectedAccount.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setResources(data.resources || []);
      setActiveTab('resources');
    } catch (error) {
      console.error('Failed to scan resources:', error);
    } finally {
      setScanning(false);
    }
  };

  const fetchRetentions = async (nukeAccountId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/nuke/retentions/${nukeAccountId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setRetentions(data.retentions || []);
    } catch (error) {
      console.error('Failed to fetch retentions:', error);
    }
  };

  const handleCreateRetention = (resource: any) => {
    setSelectedResource(resource);
    setShowRetentionModal(true);
  };

  const scheduleNuke = async (isDryRun: boolean) => {
    if (!selectedAccount || !isAdmin) return;

    if (!window.confirm(`Are you sure you want to schedule a ${isDryRun ? 'DRY RUN' : 'LIVE'} nuke?`)) {
      return;
    }

    try {
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + 5);

      const response = await fetch('http://localhost:3000/api/nuke/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nukeAccountId: selectedAccount.id,
          scheduledFor,
          runType: isDryRun ? 'dry-run' : 'live',
          userId: user.id,
        }),
      });

      const data = await response.json();
      alert(data.message);
      fetchNukeAccounts();
    } catch (error: any) {
      alert('Failed to schedule nuke: ' + error.message);
    }
  };

  const getDaysUntilNuke = (date: Date | null) => {
    if (!date) return 0;
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = resourceTypeFilter === 'all' || resource.type === resourceTypeFilter;
    return matchesSearch && matchesType;
  });

  const resourceTypes = [...new Set(resources.map(r => r.type))];
  const retainedResourceIds = new Set(retentions.map(r => r.resourceId));

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Flame className="w-8 h-8 text-red-500" />
              AWS Nuke Automation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automated resource cleanup for sandbox and training accounts
            </p>
          </div>
          {isAdmin && selectedAccount && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => scheduleNuke(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Dry Run
              </button>
              <button
                onClick={() => scheduleNuke(false)}
                className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <Flame className="w-4 h-4" />
                Live Nuke
              </button>
            </div>
          )}
        </div>
      </div>

      {nukeAccounts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nukeAccounts.map((account) => {
              const daysUntil = getDaysUntilNuke(account.nextRunAt);
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAccount?.id === account.id
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{account.accountName}</h3>
                    {account.enabled ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Pause className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Next Run: {account.nextRunAt ? new Date(account.nextRunAt).toLocaleDateString() : 'Not scheduled'}</p>
                    {daysUntil > 0 && (
                      <p className={`font-semibold ${daysUntil <= 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {daysUntil} days remaining
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {account.retentions?.length || 0} Retained
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded">
                      {account.nukeRuns?.length || 0} Runs
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <div className="flex gap-1 p-2">
              {[
                { id: 'overview', label: 'Overview', icon: Calendar },
                { id: 'resources', label: 'Resources', icon: Shield },
                { id: 'retentions', label: 'Retentions', icon: CheckCircle },
                { id: 'runs', label: 'Run History', icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
                    <Calendar className="w-8 h-8 text-red-600 dark:text-red-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Next Scheduled Run</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedAccount.nextRunAt ? new Date(selectedAccount.nextRunAt).toLocaleDateString() : 'Not scheduled'}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-1">
                      {getDaysUntilNuke(selectedAccount.nextRunAt)} days remaining
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                    <Shield className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Protected Resources</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {retentions.filter(r => r.status === 'active').length}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">
                      Will be retained
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Runs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedAccount.nukeRuns?.length || 0}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                      Completed executions
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                        Important Information
                      </h3>
                      <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                        <li>• Notification emails sent {selectedAccount.notificationDays} days before execution</li>
                        <li>• Resources without retention policies will be deleted</li>
                        <li>• Dry runs show what would be deleted without actually deleting</li>
                        <li>• Only admins can execute live nuke runs</li>
                        <li>• All retention requests require admin approval</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={scanResources}
                  disabled={scanning}
                  className="w-full btn btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${scanning ? 'animate-spin' : ''}`} />
                  {scanning ? 'Scanning Resources...' : 'Scan AWS Resources'}
                </button>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <select
                    value={resourceTypeFilter}
                    onChange={(e) => setResourceTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    {resourceTypes.map(type => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                  <button
                    onClick={scanResources}
                    disabled={scanning}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                    Rescan
                  </button>
                </div>

                {resources.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Click "Scan AWS Resources" to discover resources
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Found {filteredResources.length} resources
                    </p>
                    {filteredResources.map((resource, index) => {
                      const isRetained = retainedResourceIds.has(resource.id);
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-2 ${
                            isRetained
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded">
                                  {resource.type.toUpperCase()}
                                </span>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {resource.name || resource.id}
                                </h4>
                                {isRetained && (
                                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                                    <Shield className="w-3 h-3" />
                                    Protected
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                ID: {resource.id} • Region: {resource.region}
                              </p>
                              {resource.launchTime && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Created: {new Date(resource.launchTime).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {!isRetained && (
                              <button
                                onClick={() => handleCreateRetention(resource)}
                                className="btn btn-sm btn-secondary flex items-center gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Add Retention
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'retentions' && (
              <RetentionsTab
                retentions={retentions}
                onRefresh={() => fetchRetentions(selectedAccount.id)}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'runs' && (
              <RunsTab runs={selectedAccount.nukeRuns || []} />
            )}
          </div>
        </div>
      )}

      {showRetentionModal && selectedResource && (
        <RetentionModal
          resource={selectedResource}
          nukeAccountId={selectedAccount.id}
          userId={user.id}
          onClose={() => {
            setShowRetentionModal(false);
            setSelectedResource(null);
          }}
          onSuccess={() => {
            fetchRetentions(selectedAccount.id);
            setShowRetentionModal(false);
            setSelectedResource(null);
          }}
        />
      )}

      {nukeAccounts.length === 0 && !loading && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Flame className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Nuke Accounts Configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect a sandbox or training AWS account to enable nuke automation
          </p>
          
          <button
            onClick={createTestAccount}
            className="btn btn-primary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Create Test Nuke Account (Demo)
          </button>
        </div>
      )}
    </MainLayout>
  );
};

const RetentionsTab: React.FC<{ retentions: any[]; onRefresh: () => void; isAdmin: boolean }> = ({
  retentions,
  onRefresh,
  isAdmin,
}) => {
  const token = localStorage.getItem('accessToken');

  const approveRetention = async (retentionId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`http://localhost:3000/api/nuke/retention/${retentionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      await response.json();
      onRefresh();
    } catch (error) {
      console.error('Failed to approve retention:', error);
    }
  };

  return (
    <div className="space-y-4">
      {retentions.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No retention policies yet</p>
        </div>
      ) : (
        retentions.map((retention) => (
          <div
            key={retention.id}
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded">
                    {retention.resourceType.toUpperCase()}
                  </span>
                  {retention.isApproved ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                      <Clock className="w-3 h-3" />
                      Pending Approval
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {retention.resourceName || retention.resourceId}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {retention.reason}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                  <span>Created by: {retention.user?.name || retention.user?.email}</span>
                  <span>Type: {retention.retentionType}</span>
                  {retention.expiresAt && (
                    <span>Expires: {new Date(retention.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              {!retention.isApproved && isAdmin && (
                <button
                  onClick={() => approveRetention(retention.id)}
                  className="btn btn-sm bg-green-600 hover:bg-green-700 text-white"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const RunsTab: React.FC<{ runs: any[] }> = ({ runs }) => {
  return (
    <div className="space-y-4">
      {runs.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No nuke runs yet</p>
        </div>
      ) : (
        runs.map((run) => (
          <div
            key={run.id}
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  run.runType === 'dry-run'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {run.runType === 'dry-run' ? 'DRY RUN' : 'LIVE'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  run.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : run.status === 'failed'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {run.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(run.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Total Resources</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{run.totalResources}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Deleted</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{run.deletedResources}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Retained</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{run.retainedResources}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Failed</p>
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{run.failedResources}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const RetentionModal: React.FC<{
  resource: any;
  nukeAccountId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ resource, nukeAccountId, userId, onClose, onSuccess }) => {
  const [retentionType, setRetentionType] = useState('until_date');
  const [retainUntil, setRetainUntil] = useState('');
  const [retainDays, setRetainDays] = useState(30);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('accessToken');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3000/api/nuke/retention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nukeAccountId,
          userId,
          resourceType: resource.type,
          resourceId: resource.id,
          resourceName: resource.name,
          resourceRegion: resource.region,
          retentionType,
          retainUntil: retentionType === 'until_date' ? retainUntil : null,
          retainDays: retentionType === 'days' ? retainDays : null,
          reason,
        }),
      });

      await response.json();
      onSuccess();
    } catch (error) {
      console.error('Failed to create retention:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Add Retention Policy
        </h2>

        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{resource.name || resource.id}</strong>
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {resource.type.toUpperCase()} • {resource.region}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Retention Type
            </label>
            <select
              value={retentionType}
              onChange={(e) => setRetentionType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            >
              <option value="permanent">Permanent (Never delete)</option>
              <option value="until_date">Until specific date</option>
              <option value="days">For number of days</option>
            </select>
          </div>

          {retentionType === 'until_date' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retain Until
              </label>
              <input
                type="date"
                value={retainUntil}
                onChange={(e) => setRetainUntil(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {retentionType === 'days' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Days
              </label>
              <input
                type="number"
                value={retainDays}
                onChange={(e) => setRetainDays(parseInt(e.target.value))}
                min="1"
                max="365"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Explain why this resource should be retained..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Retention requests require admin approval before taking effect
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NukeDashboard;
