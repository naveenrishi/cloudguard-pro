import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Cloud,
  Server,
  Database,
  Network,
  HardDrive,
  Boxes,
  Activity,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  subscriptionId: string;
  status: string;
  totalResources: number;
  monthlyCost: number;
}

interface ResourceGroup {
  id: string;
  name: string;
  location: string;
  resourceCount: number;
}

interface AzureResource {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;
  location: string;
  status: string;
}

const AzureDashboard: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [resources, setResources] = useState<AzureResource[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchAzureData();
  }, [accountId]);

  const getDemoData = () => {
    const demoAccount = {
      id: accountId,
      accountName: accountId?.includes('demo-azure-1') ? 'Production Azure' : 'Development Azure',
      azureTenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      provider: 'Azure',
      status: 'Active'
    };

    const demoSubscriptions: Subscription[] = [
      {
        id: 'sub-1',
        name: 'Production Subscription',
        subscriptionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        status: 'Active',
        totalResources: 87,
        monthlyCost: 12450.00
      },
      {
        id: 'sub-2',
        name: 'Development Subscription',
        subscriptionId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        status: 'Active',
        totalResources: 34,
        monthlyCost: 3280.50
      },
      {
        id: 'sub-3',
        name: 'Testing Subscription',
        subscriptionId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        status: 'Active',
        totalResources: 21,
        monthlyCost: 1890.75
      }
    ];

    const demoResourceGroups: ResourceGroup[] = [
      { id: 'rg-1', name: 'rg-production-web', location: 'East US', resourceCount: 15 },
      { id: 'rg-2', name: 'rg-production-database', location: 'East US', resourceCount: 8 },
      { id: 'rg-3', name: 'rg-production-storage', location: 'West US', resourceCount: 12 },
      { id: 'rg-4', name: 'rg-production-network', location: 'East US', resourceCount: 23 },
      { id: 'rg-5', name: 'rg-production-monitoring', location: 'Central US', resourceCount: 6 },
    ];

    const demoResources: AzureResource[] = [
      { id: 'vm-1', name: 'web-server-01', type: 'Microsoft.Compute/virtualMachines', resourceGroup: 'rg-production-web', location: 'East US', status: 'Running' },
      { id: 'vm-2', name: 'web-server-02', type: 'Microsoft.Compute/virtualMachines', resourceGroup: 'rg-production-web', location: 'East US', status: 'Running' },
      { id: 'vm-3', name: 'app-server-01', type: 'Microsoft.Compute/virtualMachines', resourceGroup: 'rg-production-web', location: 'East US', status: 'Running' },
      { id: 'db-1', name: 'sqldb-production', type: 'Microsoft.Sql/servers/databases', resourceGroup: 'rg-production-database', location: 'East US', status: 'Online' },
      { id: 'db-2', name: 'cosmosdb-main', type: 'Microsoft.DocumentDB/databaseAccounts', resourceGroup: 'rg-production-database', location: 'East US', status: 'Online' },
      { id: 'storage-1', name: 'stprodblobs001', type: 'Microsoft.Storage/storageAccounts', resourceGroup: 'rg-production-storage', location: 'West US', status: 'Available' },
      { id: 'storage-2', name: 'stprodfiles001', type: 'Microsoft.Storage/storageAccounts', resourceGroup: 'rg-production-storage', location: 'West US', status: 'Available' },
      { id: 'vnet-1', name: 'vnet-production', type: 'Microsoft.Network/virtualNetworks', resourceGroup: 'rg-production-network', location: 'East US', status: 'Succeeded' },
      { id: 'nsg-1', name: 'nsg-web', type: 'Microsoft.Network/networkSecurityGroups', resourceGroup: 'rg-production-network', location: 'East US', status: 'Succeeded' },
      { id: 'lb-1', name: 'lb-production', type: 'Microsoft.Network/loadBalancers', resourceGroup: 'rg-production-network', location: 'East US', status: 'Succeeded' },
      { id: 'app-1', name: 'webapp-api', type: 'Microsoft.Web/sites', resourceGroup: 'rg-production-web', location: 'East US', status: 'Running' },
      { id: 'app-2', name: 'webapp-portal', type: 'Microsoft.Web/sites', resourceGroup: 'rg-production-web', location: 'East US', status: 'Running' },
      { id: 'kv-1', name: 'kv-production', type: 'Microsoft.KeyVault/vaults', resourceGroup: 'rg-production-web', location: 'East US', status: 'Succeeded' },
      { id: 'aks-1', name: 'aks-production', type: 'Microsoft.ContainerService/managedClusters', resourceGroup: 'rg-production-web', location: 'East US', status: 'Running' },
    ];

    return { demoAccount, demoSubscriptions, demoResourceGroups, demoResources };
  };

  const fetchAzureData = async () => {
    try {
      setLoading(true);
      
      // Check if this is a demo account
      if (accountId?.includes('demo')) {
        setIsDemo(true);
        const { demoAccount, demoSubscriptions, demoResourceGroups, demoResources } = getDemoData();
        setAccount(demoAccount);
        setSubscriptions(demoSubscriptions);
        setResourceGroups(demoResourceGroups);
        setResources(demoResources);
        setLoading(false);
        return;
      }

      // Real API call for connected accounts
      const accountResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const accountData = await accountResponse.json();
      setAccount(accountData);

      // Fetch Azure subscriptions
      const subsResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/azure/subscriptions/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const subsData = await subsResponse.json();
      setSubscriptions(subsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching Azure data:', error);
      // Fallback to demo data on error
      setIsDemo(true);
      const { demoAccount, demoSubscriptions, demoResourceGroups, demoResources } = getDemoData();
      setAccount(demoAccount);
      setSubscriptions(demoSubscriptions);
      setResourceGroups(demoResourceGroups);
      setResources(demoResources);
      setLoading(false);
    }
  };

  const handleSubscriptionClick = async (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    
    if (isDemo) {
      // Use demo data
      const { demoResourceGroups, demoResources } = getDemoData();
      setResourceGroups(demoResourceGroups);
      setResources(demoResources);
      return;
    }

    try {
      // Fetch resource groups for this subscription
      const rgResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/azure/subscriptions/${subscription.id}/resource-groups`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      const rgData = await rgResponse.json();
      setResourceGroups(rgData);

      // Fetch all resources
      const resourcesResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/azure/subscriptions/${subscription.id}/resources`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      const resourcesData = await resourcesResponse.json();
      setResources(resourcesData);
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    if (type.includes('virtualMachine')) return Server;
    if (type.includes('storage') || type.includes('Storage')) return HardDrive;
    if (type.includes('database') || type.includes('sql') || type.includes('Sql') || type.includes('DocumentDB')) return Database;
    if (type.includes('network') || type.includes('Network') || type.includes('virtualNetwork')) return Network;
    if (type.includes('app') || type.includes('Web')) return Boxes;
    if (type.includes('KeyVault')) return Shield;
    if (type.includes('Container')) return Boxes;
    return Cloud;
  };

  const getResourceTypeCount = (type: string) => {
    return resources.filter((r) => r.type.toLowerCase().includes(type.toLowerCase())).length;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading Azure resources...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
                {account?.accountName || 'Azure Account'}
                {isDemo && (
                  <span className="text-sm bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                    Demo Mode
                  </span>
                )}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Tenant ID: {account?.azureTenantId || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Subscriptions</p>
                <p className="text-3xl font-bold text-white mt-2">{subscriptions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Cloud className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Resources</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {subscriptions.reduce((sum, sub) => sum + sub.totalResources, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Boxes className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Monthly Cost</p>
                <p className="text-3xl font-bold text-white mt-2">
                  ${subscriptions.reduce((sum, sub) => sum + sub.monthlyCost, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Resource Groups</p>
                <p className="text-3xl font-bold text-white mt-2">{resourceGroups.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Boxes className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        {!selectedSubscription ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Azure Subscriptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((subscription) => (
                <button
                  key={subscription.id}
                  onClick={() => handleSubscriptionClick(subscription)}
                  className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg p-6 text-left transition-all hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{subscription.name}</h3>
                      <p className="text-slate-400 text-xs mt-1 font-mono">{subscription.subscriptionId}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      {subscription.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs">Resources</p>
                      <p className="text-white font-semibold text-lg">{subscription.totalResources}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Monthly Cost</p>
                      <p className="text-white font-semibold text-lg">${subscription.monthlyCost.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Subscription Details View
          <div className="space-y-6">
            {/* Back to Subscriptions */}
            <button
              onClick={() => setSelectedSubscription(null)}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Subscriptions
            </button>

            {/* Selected Subscription Header */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedSubscription.name}</h2>
                  <p className="text-slate-400 mt-2 font-mono text-sm">{selectedSubscription.subscriptionId}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">Monthly Cost</p>
                  <p className="text-3xl font-bold text-white">${selectedSubscription.monthlyCost.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Resource Type Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Virtual Machines', type: 'virtualMachine', icon: Server, color: 'blue' },
                { label: 'Storage Accounts', type: 'storage', icon: HardDrive, color: 'purple' },
                { label: 'Databases', type: 'database', icon: Database, color: 'green' },
                { label: 'Virtual Networks', type: 'network', icon: Network, color: 'cyan' },
                { label: 'App Services', type: 'web', icon: Boxes, color: 'orange' },
              ].map((item) => {
                const Icon = item.icon;
                const count = getResourceTypeCount(item.type);
                
                return (
                  <div
                    key={item.type}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-4"
                  >
                    <div className={`w-10 h-10 bg-${item.color}-500/20 rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 text-${item.color}-400`} />
                    </div>
                    <p className="text-slate-400 text-xs">{item.label}</p>
                    <p className="text-white font-bold text-2xl mt-1">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Resource Groups */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Resource Groups</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resourceGroups.map((rg) => (
                  <div
                    key={rg.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-semibold">{rg.name}</h4>
                      <Globe className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-sm">{rg.location}</p>
                    <p className="text-blue-400 text-sm mt-2">{rg.resourceCount} resources</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources Table */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">All Resources</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Name</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Type</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Resource Group</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Location</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource) => {
                      const Icon = getResourceIcon(resource.type);
                      
                      return (
                        <tr key={resource.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-blue-400" />
                              <span className="text-white font-medium">{resource.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-sm">{resource.type}</td>
                          <td className="p-3 text-slate-400 text-sm">{resource.resourceGroup}</td>
                          <td className="p-3 text-slate-400 text-sm">{resource.location}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                              {resource.status}
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
      </div>
    </MainLayout>
  );
};

export default AzureDashboard;