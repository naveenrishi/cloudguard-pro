import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingDown, 
  Server, 
  Database, 
  HardDrive,
  Cloud,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Zap
} from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  savings: string;
  savingsAmount: number;
  resourceCount: number;
  complexity: 'easy' | 'medium' | 'hard';
  implementationSteps: string[];
  estimatedTime: string;
  impact: string;
  resources: string[];
}

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`http://localhost:3000/api/cloud/recommendations/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || getMockRecommendations());
      } else {
        setRecommendations(getMockRecommendations());
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations(getMockRecommendations());
    } finally {
      setLoading(false);
    }
  };

  const getMockRecommendations = (): Recommendation[] => [
    {
      id: '1',
      title: 'Rightsize Underutilized EC2 Instances',
      description: '12 EC2 instances are running with less than 10% CPU utilization over the past 14 days',
      category: 'EC2',
      priority: 'high',
      savings: '$1,240/mo',
      savingsAmount: 1240,
      resourceCount: 12,
      complexity: 'easy',
      estimatedTime: '30 minutes',
      impact: 'Switching to smaller instance types will reduce costs by approximately 30% with no performance impact',
      resources: ['i-0abc123', 'i-0def456', 'i-0ghi789'],
      implementationSteps: [
        'Review the list of underutilized instances in the AWS Console',
        'For each instance, check CloudWatch metrics to confirm low utilization',
        'Create an AMI of the current instance for backup',
        'Stop the instance',
        'Change instance type to a smaller size (e.g., t3.medium → t3.small)',
        'Start the instance and monitor performance for 24 hours',
        'If performance is acceptable, repeat for remaining instances',
      ],
    },
    {
      id: '2',
      title: 'Delete Unused EBS Volumes',
      description: '8 EBS volumes are unattached and incurring storage costs',
      category: 'EBS',
      priority: 'medium',
      savings: '$520/mo',
      savingsAmount: 520,
      resourceCount: 8,
      complexity: 'easy',
      estimatedTime: '15 minutes',
      impact: 'Remove storage costs for volumes that are no longer needed',
      resources: ['vol-0abc123', 'vol-0def456'],
      implementationSteps: [
        'Navigate to EC2 → Elastic Block Store → Volumes in AWS Console',
        'Filter volumes by State: Available (unattached)',
        'For each volume, check the "Created" date and verify it\'s not needed',
        'Create a snapshot as backup before deletion (optional)',
        'Select the volume and click "Actions" → "Delete Volume"',
        'Confirm deletion',
        'Repeat for all unused volumes',
      ],
    },
    {
      id: '3',
      title: 'Enable S3 Intelligent-Tiering',
      description: '145 GB of S3 data eligible for automated tiering to reduce storage costs',
      category: 'S3',
      priority: 'medium',
      savings: '$380/mo',
      savingsAmount: 380,
      resourceCount: 3,
      complexity: 'easy',
      estimatedTime: '20 minutes',
      impact: 'Automatically move infrequently accessed objects to cheaper storage tiers',
      resources: ['my-data-bucket', 'archive-bucket', 'logs-bucket'],
      implementationSteps: [
        'Open S3 console and select your bucket',
        'Go to Management tab → Lifecycle rules',
        'Click "Create lifecycle rule"',
        'Name the rule (e.g., "Intelligent-Tiering-Rule")',
        'Choose rule scope: Apply to all objects or filter by prefix/tags',
        'Under "Lifecycle rule actions", select "Transition current versions of objects between storage classes"',
        'Add transition: Days after object creation: 0, Storage class: Intelligent-Tiering',
        'Review and create the rule',
        'Repeat for other eligible buckets',
      ],
    },
    {
      id: '4',
      title: 'Purchase Reserved Instances',
      description: '5 on-demand instances have been running consistently for 6+ months',
      category: 'EC2',
      priority: 'high',
      savings: '$1,850/mo',
      savingsAmount: 1850,
      resourceCount: 5,
      complexity: 'medium',
      estimatedTime: '1 hour',
      impact: 'Save up to 72% on EC2 costs by committing to 1 or 3-year Reserved Instances',
      resources: ['i-0abc123', 'i-0def456', 'i-0ghi789'],
      implementationSteps: [
        'Analyze your EC2 usage patterns using Cost Explorer',
        'Identify instances running 24/7 for the past 6+ months',
        'Go to EC2 → Reserved Instances → Purchase Reserved Instances',
        'Match the instance type, region, and platform to your on-demand instances',
        'Choose offering class: Standard (highest discount) or Convertible (flexibility)',
        'Select term: 1-year (lower discount) or 3-year (highest discount)',
        'Choose payment option: All Upfront, Partial Upfront, or No Upfront',
        'Review total cost and savings',
        'Purchase the Reserved Instance',
        'Monitor in EC2 Dashboard to confirm RI is being applied',
      ],
    },
    {
      id: '5',
      title: 'Clean Up Old EBS Snapshots',
      description: '24 snapshots older than 90 days are no longer needed',
      category: 'EBS',
      priority: 'low',
      savings: '$180/mo',
      savingsAmount: 180,
      resourceCount: 24,
      complexity: 'easy',
      estimatedTime: '20 minutes',
      impact: 'Reduce snapshot storage costs by deleting outdated backups',
      resources: ['snap-0abc123', 'snap-0def456'],
      implementationSteps: [
        'Navigate to EC2 → Elastic Block Store → Snapshots',
        'Sort by "Started" date to find old snapshots',
        'Review snapshots older than 90 days',
        'Verify that newer snapshots exist or data is no longer needed',
        'Select snapshots to delete (use Shift+Click for multiple)',
        'Click "Actions" → "Delete Snapshot"',
        'Confirm deletion',
        'Consider setting up automated snapshot lifecycle policies for future cleanup',
      ],
    },
    {
      id: '6',
      title: 'Migrate RDS to Aurora Serverless',
      description: '2 RDS instances with variable workloads can benefit from Aurora Serverless',
      category: 'RDS',
      priority: 'medium',
      savings: '$640/mo',
      savingsAmount: 640,
      resourceCount: 2,
      complexity: 'hard',
      estimatedTime: '3-4 hours',
      impact: 'Automatically scale database capacity up and down based on demand, paying only for what you use',
      resources: ['mydb-instance-1', 'mydb-instance-2'],
      implementationSteps: [
        'Backup your current RDS database',
        'Take note of all security groups, parameter groups, and configurations',
        'Create Aurora Serverless cluster: RDS → Databases → Create database',
        'Select "Amazon Aurora" → Choose MySQL or PostgreSQL compatible',
        'Select "Serverless" for database deployment',
        'Configure capacity settings (min/max ACUs based on workload)',
        'Enable Auto Pause if database has idle periods',
        'Set pause after X minutes of inactivity',
        'Migrate data using AWS Database Migration Service (DMS) or snapshot restore',
        'Test application connectivity and performance',
        'Update application connection strings to point to Aurora endpoint',
        'Monitor for 48 hours, then decommission old RDS instance',
      ],
    },
    {
      id: '7',
      title: 'Use Spot Instances for Non-Critical Workloads',
      description: 'Development and testing environments can use Spot Instances for up to 90% savings',
      category: 'EC2',
      priority: 'high',
      savings: '$2,100/mo',
      savingsAmount: 2100,
      resourceCount: 8,
      complexity: 'medium',
      estimatedTime: '2 hours',
      impact: 'Massive cost reduction for fault-tolerant workloads like batch processing, CI/CD, and dev/test',
      resources: ['dev-instance-1', 'test-instance-2', 'ci-worker-3'],
      implementationSteps: [
        'Identify non-critical workloads suitable for interruption',
        'Launch Spot Instance: EC2 → Instances → Launch instances',
        'Scroll to "Advanced details" → Purchasing option → Request Spot instances',
        'Set maximum price (optional, defaults to On-Demand price)',
        'Configure instance type, AMI, and settings as usual',
        'Implement Spot interruption handling in your application',
        'Use Spot Fleet for automatic replacement of interrupted instances',
        'Consider Spot Instance advisor to find optimal instance types',
        'Test interruption scenarios before migrating production-like workloads',
        'Monitor Spot Instance usage and savings in Cost Explorer',
      ],
    },
    {
      id: '8',
      title: 'Enable CloudFront Caching',
      description: 'Static assets are being served directly from S3 without CDN, causing high data transfer costs',
      category: 'CloudFront',
      priority: 'medium',
      savings: '$450/mo',
      savingsAmount: 450,
      resourceCount: 1,
      complexity: 'medium',
      estimatedTime: '1 hour',
      impact: 'Reduce bandwidth costs and improve performance by caching content at edge locations',
      resources: ['static-assets-bucket'],
      implementationSteps: [
        'Open CloudFront console → Create Distribution',
        'Origin Domain: Select your S3 bucket',
        'Origin Access: Use Origin Access Control (OAC) for security',
        'Default Cache Behavior: Cache policy → CachingOptimized',
        'Price Class: Choose based on your audience geography',
        'Alternate Domain Names (CNAMEs): Add custom domain if needed',
        'SSL Certificate: Request or import certificate via ACM',
        'Click "Create Distribution" and wait for deployment (~15 mins)',
        'Update S3 bucket policy to allow CloudFront access',
        'Update application URLs to use CloudFront domain',
        'Test content delivery and verify caching headers',
        'Monitor cache hit ratio in CloudFront metrics',
      ],
    },
  ];

  const getCategoryIcon = (category: string) => {
    const icons: any = {
      EC2: Server,
      EBS: HardDrive,
      S3: Database,
      RDS: Database,
      CloudFront: Cloud,
      Lambda: Zap,
    };
    const Icon = icons[category] || Server;
    return <Icon className="w-5 h-5" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredRecs = recommendations.filter(rec => {
    if (filter === 'all') return true;
    return rec.category === filter;
  });

  const totalSavings = recommendations.reduce((sum, rec) => sum + rec.savingsAmount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Cost Optimization Recommendations</h1>
                <p className="text-gray-600 mt-1">
                  Potential savings: <span className="font-bold text-green-600">${totalSavings.toLocaleString()}/month</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'EC2', 'EBS', 'S3', 'RDS', 'CloudFront'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
              {cat !== 'all' && ` (${recommendations.filter(r => r.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* Recommendations List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredRecs.map((rec) => (
            <div key={rec.id} className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedRec(rec)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    {getCategoryIcon(rec.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{rec.title}</h3>
                      <span className={`badge ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="badge bg-gray-100 text-gray-700">
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{rec.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Potential Savings</p>
                        <p className="text-2xl font-bold text-green-600">{rec.savings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Resources</p>
                        <p className="text-lg font-semibold text-gray-900">{rec.resourceCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Complexity</p>
                        <p className={`text-lg font-semibold capitalize ${getComplexityColor(rec.complexity)}`}>
                          {rec.complexity}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Est. Time</p>
                        <p className="text-lg font-semibold text-gray-900">{rec.estimatedTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRec(rec);
                  }}
                  className="btn btn-primary ml-4"
                >
                  View Steps
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Implementation Modal */}
        {selectedRec && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRec(null)}>
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedRec.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`badge ${getPriorityColor(selectedRec.priority)}`}>
                        {selectedRec.priority} priority
                      </span>
                      <span className="badge bg-gray-100 text-gray-700">{selectedRec.category}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRec(null)} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Savings</p>
                    <p className="text-xl font-bold text-green-600">{selectedRec.savings}</p>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Time Required</p>
                    <p className="text-xl font-bold text-gray-900">{selectedRec.estimatedTime}</p>
                  </div>
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Complexity</p>
                    <p className={`text-xl font-bold capitalize ${getComplexityColor(selectedRec.complexity)}`}>
                      {selectedRec.complexity}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Impact</h3>
                  <p className="text-gray-700">{selectedRec.impact}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Implementation Steps</h3>
                  <div className="space-y-3">
                    {selectedRec.implementationSteps.map((step, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <p className="text-gray-700 pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRec.resources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Affected Resources</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRec.resources.map((resource, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono">
                          {resource}
                        </span>
                      ))}
                      {selectedRec.resourceCount > selectedRec.resources.length && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          +{selectedRec.resourceCount - selectedRec.resources.length} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button className="btn btn-primary flex-1">
                    <CheckCircle className="w-5 h-5" />
                    Mark as Implemented
                  </button>
                  <button onClick={() => setSelectedRec(null)} className="btn btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
