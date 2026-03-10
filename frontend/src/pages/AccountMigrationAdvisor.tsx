import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  DollarSign,
  TrendingUp,
  Target,
  Clock,
  ChevronRight,
  TrendingDown,
  Zap,
  CheckCircle,
} from 'lucide-react';
import axios from 'axios';

const AccountMigrationAdvisor: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}`;
  const token = localStorage.getItem('accessToken') || '';

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [tcoData, setTCOData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  useEffect(() => {
    if (accountId) {
      fetchAccountInfo();
      // Simulate API call with timeout
      setLoading(true);
      setTimeout(() => {
        loadDemoMigrationData();
        setLoading(false);
      }, 500);
    }
  }, [accountId]);

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const accounts = await response.json();
        const account = accounts.find((acc: any) => acc.id === accountId);
        setAccountInfo(account);
      }
    } catch (error) {
      console.error('Failed to fetch account info:', error);
      // Set demo account info based on accountId
      setAccountInfo(getDemoAccountInfo());
    }
  };

  const getDemoAccountInfo = () => {
    if (accountId?.includes('aws')) {
      return { id: accountId, provider: 'AWS', accountName: 'Production AWS' };
    } else if (accountId?.includes('azure')) {
      return { id: accountId, provider: 'Azure', accountName: 'Production Azure' };
    } else if (accountId?.includes('gcp')) {
      return { id: accountId, provider: 'GCP', accountName: 'Production GCP' };
    }
    return { id: accountId, provider: 'AWS', accountName: 'Cloud Account' };
  };

  const loadDemoMigrationData = () => {
    const provider = accountInfo?.provider || getDemoAccountInfo().provider;

    if (provider === 'AWS') {
      setRecommendations([
        {
          id: 'aws-mig-1',
          title: 'Migrate to Reserved Instances',
          description: 'Switch 5 steady-state EC2 workloads to Reserved Instances for up to 72% savings',
          savings: 420,
          complexity: 'Low',
          estimatedTime: '1 week',
        },
        {
          id: 'aws-mig-2',
          title: 'Rightsize EC2 instances',
          description: '8 EC2 instances running at <20% CPU utilization - downgrade to save costs',
          savings: 280,
          complexity: 'Medium',
          estimatedTime: '2 weeks',
        },
        {
          id: 'aws-mig-3',
          title: 'Move to Aurora Serverless',
          description: 'Convert 3 RDS MySQL instances to Aurora Serverless for variable workloads',
          savings: 340,
          complexity: 'High',
          estimatedTime: '4 weeks',
        },
        {
          id: 'aws-mig-4',
          title: 'Enable S3 Intelligent Tiering',
          description: 'Automatically move 450GB of infrequently accessed S3 objects to cheaper storage',
          savings: 180,
          complexity: 'Low',
          estimatedTime: '3 days',
        },
        {
          id: 'aws-mig-5',
          title: 'Use Spot Instances for Dev/Test',
          description: 'Replace 6 dev/test on-demand instances with Spot for up to 90% savings',
          savings: 520,
          complexity: 'Medium',
          estimatedTime: '1 week',
        },
      ]);

      setTCOData({
        currentMonthlyCost: 2450,
        optimizedMonthlyCost: 1410,
        monthlySavings: 1040,
        annualSavings: 12480,
        roi: 156,
      });
    } else if (provider === 'Azure') {
      setRecommendations([
        {
          id: 'azure-mig-1',
          title: 'Azure Reserved VM Instances',
          description: 'Reserve 8 production VMs for 1-year commitment to save 40%',
          savings: 520,
          complexity: 'Low',
          estimatedTime: '1 week',
        },
        {
          id: 'azure-mig-2',
          title: 'Migrate to Azure SQL Managed Instance',
          description: 'Consolidate 4 SQL databases to Managed Instance for better performance and cost',
          savings: 380,
          complexity: 'High',
          estimatedTime: '6 weeks',
        },
        {
          id: 'azure-mig-3',
          title: 'Enable Auto-Shutdown for Dev VMs',
          description: 'Schedule automatic shutdown for 12 development VMs during non-business hours',
          savings: 290,
          complexity: 'Low',
          estimatedTime: '2 days',
        },
        {
          id: 'azure-mig-4',
          title: 'Use Azure Blob Cool Tier',
          description: 'Move 2TB of infrequently accessed data to Cool storage tier',
          savings: 160,
          complexity: 'Low',
          estimatedTime: '1 week',
        },
        {
          id: 'azure-mig-5',
          title: 'Migrate to App Service Plans',
          description: 'Consolidate 5 web apps into fewer App Service Plans',
          savings: 240,
          complexity: 'Medium',
          estimatedTime: '3 weeks',
        },
      ]);

      setTCOData({
        currentMonthlyCost: 3100,
        optimizedMonthlyCost: 1810,
        monthlySavings: 1290,
        annualSavings: 15480,
        roi: 178,
      });
    } else if (provider === 'GCP') {
      setRecommendations([
        {
          id: 'gcp-mig-1',
          title: 'Committed Use Discounts',
          description: 'Commit to 1-year usage for 10 Compute Engine instances to save 57%',
          savings: 480,
          complexity: 'Low',
          estimatedTime: '1 week',
        },
        {
          id: 'gcp-mig-2',
          title: 'Use Preemptible VM Instances',
          description: 'Replace 7 batch processing VMs with preemptible instances for 80% savings',
          savings: 620,
          complexity: 'Medium',
          estimatedTime: '2 weeks',
        },
        {
          id: 'gcp-mig-3',
          title: 'Migrate to Cloud SQL for PostgreSQL',
          description: 'Move self-managed PostgreSQL to Cloud SQL for better reliability and lower cost',
          savings: 310,
          complexity: 'High',
          estimatedTime: '5 weeks',
        },
        {
          id: 'gcp-mig-4',
          title: 'Enable Coldline Storage Class',
          description: 'Archive 1.5TB of logs and backups to Coldline storage',
          savings: 140,
          complexity: 'Low',
          estimatedTime: '3 days',
        },
        {
          id: 'gcp-mig-5',
          title: 'Optimize GKE Cluster Sizing',
          description: 'Right-size 3 GKE clusters and enable cluster autoscaling',
          savings: 390,
          complexity: 'Medium',
          estimatedTime: '2 weeks',
        },
      ]);

      setTCOData({
        currentMonthlyCost: 2780,
        optimizedMonthlyCost: 1520,
        monthlySavings: 1260,
        annualSavings: 15120,
        roi: 165,
      });
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border border-green-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getProviderColor = () => {
    const provider = accountInfo?.provider || getDemoAccountInfo().provider;
    switch (provider) {
      case 'AWS': return 'from-orange-500 to-yellow-500';
      case 'Azure': return 'from-blue-500 to-cyan-500';
      case 'GCP': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading migration recommendations...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const displayedRecommendations = showAll ? recommendations : recommendations.slice(0, 5);
  const totalSavings = recommendations.reduce((sum, rec) => sum + (rec.savings || 0), 0);
  const provider = accountInfo?.provider || getDemoAccountInfo().provider;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 bg-gradient-to-br ${getProviderColor()} rounded-lg flex items-center justify-center`}>
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Migration Advisor</h1>
              <p className="text-slate-400 text-sm">
                {provider} - {accountInfo?.accountName || 'Cloud Account'}
              </p>
            </div>
          </div>
          <p className="text-slate-400">AI-powered migration recommendations for cost optimization</p>
        </div>

        {/* Migration Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h3 className="text-green-400 text-sm font-semibold mb-2">Monthly Savings</h3>
            <p className="text-4xl font-bold text-white mb-2">
              ${tcoData?.monthlySavings?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-green-400 font-medium">Potential optimization</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h3 className="text-blue-400 text-sm font-semibold mb-2">Annual Savings</h3>
            <p className="text-4xl font-bold text-white mb-2">
              ${tcoData?.annualSavings?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-blue-400 font-medium">Yearly projection</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <h3 className="text-purple-400 text-sm font-semibold mb-2">Opportunities</h3>
            <p className="text-4xl font-bold text-white mb-2">{recommendations.length}</p>
            <p className="text-sm text-purple-400 font-medium">Migration recommendations</p>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="border-b border-slate-700 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Migration Recommendations</h3>
                <p className="text-sm text-slate-400 mt-1">Optimize your cloud infrastructure with these AI-powered suggestions</p>
              </div>
              {recommendations.length > 5 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                >
                  {showAll ? 'Show Less' : `View All (${recommendations.length})`}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {displayedRecommendations.length === 0 ? (
              <div className="text-center py-16">
                <Target className="w-20 h-20 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No migration recommendations available</h3>
                <p className="text-slate-500">This account is already optimized</p>
              </div>
            ) : (
              displayedRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-6 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all border border-slate-600 hover:border-slate-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getComplexityColor(rec.complexity)}`}>
                          {rec.complexity} Complexity
                        </span>
                        <span className="text-slate-400 text-sm flex items-center gap-1.5 bg-slate-700/50 px-3 py-1.5 rounded-full">
                          <Clock className="w-4 h-4" />
                          {rec.estimatedTime}
                        </span>
                      </div>
                      <h4 className="font-bold text-white mb-2 text-lg">{rec.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{rec.description}</p>
                    </div>
                    <div className="text-right ml-8 flex-shrink-0">
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Savings</p>
                      <p className="text-4xl font-bold text-green-400">${rec.savings}</p>
                      <p className="text-xs text-slate-500 mt-1">/month</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TCO Comparison */}
        {tcoData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-500/30 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wide">Current Monthly Cost</p>
                </div>
              </div>
              <p className="text-5xl font-bold text-white mb-3">
                ${tcoData.currentMonthlyCost?.toLocaleString()}
              </p>
              <p className="text-slate-300 font-medium">Existing infrastructure spend</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 text-xs font-bold uppercase tracking-wide">Optimized Monthly Cost</p>
                </div>
              </div>
              <p className="text-5xl font-bold text-white mb-3">
                ${tcoData.optimizedMonthlyCost?.toLocaleString()}
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300 font-medium">Savings Progress</span>
                  <span className="text-sm font-bold text-green-400">
                    {Math.round((tcoData.monthlySavings / tcoData.currentMonthlyCost) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-green-900/30 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((tcoData.monthlySavings / tcoData.currentMonthlyCost) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Bar */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-xl p-6">
          <div className="grid grid-cols-3 divide-x divide-blue-500/30">
            <div className="px-8 py-4 text-center">
              <p className="text-3xl font-bold text-blue-400 mb-2">{recommendations.length}</p>
              <p className="text-sm text-slate-300 font-medium">Total Opportunities</p>
            </div>
            <div className="px-8 py-4 text-center">
              <p className="text-3xl font-bold text-green-400 mb-2">${totalSavings}</p>
              <p className="text-sm text-slate-300 font-medium">Monthly Potential</p>
            </div>
            <div className="px-8 py-4 text-center">
              <p className="text-3xl font-bold text-purple-400 mb-2">
                {recommendations.filter(r => r.complexity === 'Low').length}
              </p>
              <p className="text-sm text-slate-300 font-medium">Quick Wins</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AccountMigrationAdvisor;