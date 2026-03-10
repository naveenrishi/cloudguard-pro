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
  DollarSign,
  Globe,
  Shield,
  Zap,
  Container,
} from 'lucide-react';

interface AWSRegion {
  id: string;
  name: string;
  code: string;
  totalResources: number;
  monthlyCost: number;
}

interface AWSResource {
  id: string;
  name: string;
  type: string;
  region: string;
  vpc: string;
  status: string;
}

const AWSDashboard: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [regions, setRegions] = useState<AWSRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<AWSRegion | null>(null);
  const [resources, setResources] = useState<AWSResource[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchAWSData();
  }, [accountId]);

  const getDemoData = () => {
    const demoAccount = {
      id: accountId,
      accountName: accountId?.includes('demo-aws-1') ? 'Production AWS' : 'Development AWS',
      accountId: accountId?.includes('demo-aws-1') ? '123456789012' : '987654321098',
      provider: 'AWS',
      status: 'Active'
    };

    const demoRegions: AWSRegion[] = [
      {
        id: 'us-east-1',
        name: 'US East (N. Virginia)',
        code: 'us-east-1',
        totalResources: 134,
        monthlyCost: 8450.00
      },
      {
        id: 'us-west-2',
        name: 'US West (Oregon)',
        code: 'us-west-2',
        totalResources: 67,
        monthlyCost: 4230.50
      },
      {
        id: 'eu-west-1',
        name: 'EU (Ireland)',
        code: 'eu-west-1',
        totalResources: 45,
        monthlyCost: 3180.75
      },
      {
        id: 'ap-southeast-1',
        name: 'Asia Pacific (Singapore)',
        code: 'ap-southeast-1',
        totalResources: 28,
        monthlyCost: 2100.25
      }
    ];

    const demoResources: AWSResource[] = [
      { id: 'i-1', name: 'web-server-01', type: 'EC2 Instance', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'running' },
      { id: 'i-2', name: 'web-server-02', type: 'EC2 Instance', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'running' },
      { id: 'i-3', name: 'app-server-01', type: 'EC2 Instance', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'running' },
      { id: 'i-4', name: 'app-server-02', type: 'EC2 Instance', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'running' },
      { id: 'rds-1', name: 'prod-mysql-db', type: 'RDS Instance', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'available' },
      { id: 'rds-2', name: 'prod-postgres-db', type: 'RDS Instance', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'available' },
      { id: 's3-1', name: 'prod-app-data', type: 'S3 Bucket', region: 'us-east-1', vpc: 'N/A', status: 'available' },
      { id: 's3-2', name: 'prod-backups', type: 'S3 Bucket', region: 'us-east-1', vpc: 'N/A', status: 'available' },
      { id: 's3-3', name: 'prod-logs', type: 'S3 Bucket', region: 'us-east-1', vpc: 'N/A', status: 'available' },
      { id: 'elb-1', name: 'prod-web-alb', type: 'Application Load Balancer', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'active' },
      { id: 'vpc-1', name: 'vpc-prod-01', type: 'VPC', region: 'us-east-1', vpc: 'N/A', status: 'available' },
      { id: 'vpc-2', name: 'vpc-dev-01', type: 'VPC', region: 'us-east-1', vpc: 'N/A', status: 'available' },
      { id: 'lambda-1', name: 'process-uploads', type: 'Lambda Function', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'active' },
      { id: 'lambda-2', name: 'data-processor', type: 'Lambda Function', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'active' },
      { id: 'ecs-1', name: 'api-cluster', type: 'ECS Cluster', region: 'us-east-1', vpc: 'vpc-prod-01', status: 'active' },
      { id: 'cf-1', name: 'cdn-distribution', type: 'CloudFront Distribution', region: 'Global', vpc: 'N/A', status: 'deployed' },
      { id: 'r53-1', name: 'app.example.com', type: 'Route 53 Hosted Zone', region: 'Global', vpc: 'N/A', status: 'active' },
    ];

    return { demoAccount, demoRegions, demoResources };
  };

  const fetchAWSData = async () => {
    try {
      setLoading(true);
      
      // Check if this is a demo account
      if (accountId?.includes('demo')) {
        setIsDemo(true);
        const { demoAccount, demoRegions, demoResources } = getDemoData();
        setAccount(demoAccount);
        setRegions(demoRegions);
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

      // Fetch AWS regions and resources
      const regionsResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/aws/regions/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const regionsData = await regionsResponse.json();
      setRegions(regionsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching AWS data:', error);
      // Fallback to demo data on error
      setIsDemo(true);
      const { demoAccount, demoRegions, demoResources } = getDemoData();
      setAccount(demoAccount);
      setRegions(demoRegions);
      setResources(demoResources);
      setLoading(false);
    }
  };

  const handleRegionClick = async (region: AWSRegion) => {
    setSelectedRegion(region);
    
    if (isDemo) {
      const { demoResources } = getDemoData();
      setResources(demoResources.filter(r => r.region === region.code || r.region === 'Global'));
      return;
    }

    try {
      const resourcesResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/aws/regions/${region.code}/resources`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      const resourcesData = await resourcesResponse.json();
      setResources(resourcesData);
    } catch (error) {
      console.error('Error fetching region resources:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    if (type.includes('EC2')) return Server;
    if (type.includes('S3')) return HardDrive;
    if (type.includes('RDS') || type.includes('Database')) return Database;
    if (type.includes('VPC') || type.includes('Load Balancer') || type.includes('Route 53')) return Network;
    if (type.includes('Lambda')) return Zap;
    if (type.includes('ECS') || type.includes('EKS')) return Container;
    if (type.includes('CloudFront')) return Globe;
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading AWS resources...</p>
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
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
                {account?.accountName || 'AWS Account'}
                {isDemo && (
                  <span className="text-sm bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                    Demo Mode
                  </span>
                )}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Account ID: {account?.accountId || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Regions</p>
                <p className="text-3xl font-bold text-white mt-2">{regions.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Resources</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {regions.reduce((sum, reg) => sum + reg.totalResources, 0)}
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
                  ${regions.reduce((sum, reg) => sum + reg.monthlyCost, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <p className="text-slate-400 text-sm">EC2 Instances</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {resources.filter(r => r.type.includes('EC2')).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Regions List */}
        {!selectedRegion ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">AWS Regions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => handleRegionClick(region)}
                  className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg p-6 text-left transition-all hover:border-orange-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{region.name}</h3>
                      <p className="text-slate-400 text-xs mt-1 font-mono">{region.code}</p>
                    </div>
                    <Globe className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-slate-400 text-xs">Resources</p>
                      <p className="text-white font-semibold text-lg">{region.totalResources}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Monthly Cost</p>
                      <p className="text-white font-semibold text-lg">${region.monthlyCost.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Region Details View
          <div className="space-y-6">
            {/* Back to Regions */}
            <button
              onClick={() => setSelectedRegion(null)}
              className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Regions
            </button>

            {/* Selected Region Header */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedRegion.name}</h2>
                  <p className="text-slate-400 mt-2 font-mono text-sm">{selectedRegion.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">Monthly Cost</p>
                  <p className="text-3xl font-bold text-white">${selectedRegion.monthlyCost.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Resource Type Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'EC2 Instances', type: 'ec2', icon: Server, color: 'blue' },
                { label: 'S3 Buckets', type: 's3', icon: HardDrive, color: 'purple' },
                { label: 'RDS Databases', type: 'rds', icon: Database, color: 'green' },
                { label: 'Load Balancers', type: 'load balancer', icon: Network, color: 'cyan' },
                { label: 'Lambda Functions', type: 'lambda', icon: Zap, color: 'orange' },
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

            {/* Resources Table */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Resources in {selectedRegion.name}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Name</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Type</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">VPC</th>
                      <th className="text-left text-slate-400 text-sm font-semibold p-3">Region</th>
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
                              <Icon className="w-5 h-5 text-orange-400" />
                              <span className="text-white font-medium">{resource.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-sm">{resource.type}</td>
                          <td className="p-3 text-slate-400 text-sm font-mono text-xs">{resource.vpc}</td>
                          <td className="p-3 text-slate-400 text-sm">{resource.region}</td>
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

export default AWSDashboard;