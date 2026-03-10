import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
  Shield,
  Database,
  Server,
  Lock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

// ============================================
// DEMO DATA
// ============================================

const DEMO_VIOLATIONS_DATA = {
  summary: {
    totalViolations: 156,
    criticalViolations: 12,
    highViolations: 34,
    mediumViolations: 67,
    lowViolations: 43,
    resolvedThisMonth: 45,
    newThisMonth: 23,
  },
  trend: [
    { month: 'Sep', violations: 178, resolved: 34 },
    { month: 'Oct', violations: 165, resolved: 38 },
    { month: 'Nov', violations: 172, resolved: 41 },
    { month: 'Dec', violations: 168, resolved: 39 },
    { month: 'Jan', violations: 161, resolved: 42 },
    { month: 'Feb', violations: 156, resolved: 45 },
  ],
  byCategory: [
    { category: 'Security Group Rules', count: 45, critical: 8 },
    { category: 'IAM Policies', count: 38, critical: 2 },
    { category: 'Encryption', count: 28, critical: 1 },
    { category: 'Logging & Monitoring', count: 24, critical: 1 },
    { category: 'Network Configuration', count: 21, critical: 0 },
  ],
  bySeverity: [
    { name: 'Critical', value: 12, color: '#dc2626' },
    { name: 'High', value: 34, color: '#ea580c' },
    { name: 'Medium', value: 67, color: '#f59e0b' },
    { name: 'Low', value: 43, color: '#10b981' },
  ],
  violations: [
    {
      id: 'viol-1',
      severity: 'critical',
      category: 'Security Group',
      title: 'Security Group Allows Unrestricted SSH Access',
      description: 'Security group sg-0abc123def456 allows SSH (port 22) access from 0.0.0.0/0',
      resource: 'sg-0abc123def456',
      resourceType: 'SecurityGroup',
      region: 'us-east-1',
      account: 'Production AWS',
      detectedAt: '2026-02-28T10:30:00Z',
      status: 'open',
      ageInDays: 3,
      impact: 'Allows unrestricted SSH access from the internet, exposing instances to brute force attacks',
      remediation: 'Restrict SSH access to specific IP ranges or use AWS Systems Manager Session Manager',
      complianceFrameworks: ['CIS AWS 5.1', 'PCI DSS 1.2.1'],
    },
    {
      id: 'viol-2',
      severity: 'critical',
      category: 'S3 Bucket',
      title: 'S3 Bucket Publicly Accessible',
      description: 'S3 bucket "prod-user-data" has public read access enabled',
      resource: 'prod-user-data',
      resourceType: 'S3Bucket',
      region: 'us-west-2',
      account: 'Production AWS',
      detectedAt: '2026-02-27T14:20:00Z',
      status: 'open',
      ageInDays: 4,
      impact: 'Sensitive user data may be exposed to unauthorized access',
      remediation: 'Remove public access and use pre-signed URLs or CloudFront for authorized access',
      complianceFrameworks: ['CIS AWS 2.1.5', 'HIPAA 164.312'],
    },
    {
      id: 'viol-3',
      severity: 'high',
      category: 'IAM',
      title: 'IAM User with Full Administrative Access',
      description: 'IAM user "developer-john" has the AdministratorAccess policy attached',
      resource: 'developer-john',
      resourceType: 'IAMUser',
      region: 'global',
      account: 'Production AWS',
      detectedAt: '2026-02-26T09:15:00Z',
      status: 'open',
      ageInDays: 5,
      impact: 'Excessive privileges increase the risk of accidental or malicious actions',
      remediation: 'Follow principle of least privilege and grant only necessary permissions',
      complianceFrameworks: ['CIS AWS 1.16', 'SOC 2 CC6.1'],
    },
    {
      id: 'viol-4',
      severity: 'high',
      category: 'Encryption',
      title: 'EBS Volume Not Encrypted',
      description: 'EBS volume vol-0xyz789abc123 does not have encryption enabled',
      resource: 'vol-0xyz789abc123',
      resourceType: 'EBSVolume',
      region: 'us-east-1',
      account: 'Production AWS',
      detectedAt: '2026-02-25T16:45:00Z',
      status: 'acknowledged',
      ageInDays: 6,
      impact: 'Data at rest is not protected from unauthorized access',
      remediation: 'Enable EBS encryption and migrate data to encrypted volume',
      complianceFrameworks: ['CIS AWS 2.2.1', 'PCI DSS 3.4'],
    },
    {
      id: 'viol-5',
      severity: 'high',
      category: 'Database',
      title: 'RDS Instance Publicly Accessible',
      description: 'RDS instance "prod-db-1" is configured as publicly accessible',
      resource: 'prod-db-1',
      resourceType: 'RDSInstance',
      region: 'us-east-1',
      account: 'Production AWS',
      detectedAt: '2026-02-24T11:30:00Z',
      status: 'open',
      ageInDays: 7,
      impact: 'Database is exposed to the internet and vulnerable to attacks',
      remediation: 'Disable public accessibility and access through VPN or bastion host',
      complianceFrameworks: ['CIS AWS 2.3.1', 'HIPAA 164.312(a)(1)'],
    },
    {
      id: 'viol-6',
      severity: 'medium',
      category: 'Logging',
      title: 'CloudTrail Not Enabled',
      description: 'CloudTrail is not enabled in region ap-southeast-1',
      resource: 'ap-southeast-1',
      resourceType: 'Region',
      region: 'ap-southeast-1',
      account: 'Production AWS',
      detectedAt: '2026-02-23T08:20:00Z',
      status: 'open',
      ageInDays: 8,
      impact: 'API activity is not being logged, reducing audit capability',
      remediation: 'Enable CloudTrail in all active regions',
      complianceFrameworks: ['CIS AWS 3.1'],
    },
    {
      id: 'viol-7',
      severity: 'medium',
      category: 'IAM',
      title: 'MFA Not Enabled for IAM User',
      description: 'IAM user "api-service-account" does not have MFA enabled',
      resource: 'api-service-account',
      resourceType: 'IAMUser',
      region: 'global',
      account: 'Production AWS',
      detectedAt: '2026-02-22T13:10:00Z',
      status: 'acknowledged',
      ageInDays: 9,
      impact: 'Account is vulnerable to credential theft',
      remediation: 'Enable virtual or hardware MFA device for all IAM users',
      complianceFrameworks: ['CIS AWS 1.2', 'SOC 2 CC6.1'],
    },
    {
      id: 'viol-8',
      severity: 'low',
      title: 'Unused Elastic IP',
      category: 'Network',
      description: 'Elastic IP 54.123.45.67 is not associated with any instance',
      resource: 'eip-54.123.45.67',
      resourceType: 'ElasticIP',
      region: 'us-west-2',
      account: 'Production AWS',
      detectedAt: '2026-02-21T15:40:00Z',
      status: 'open',
      ageInDays: 10,
      impact: 'Unnecessary cost for unused resource',
      remediation: 'Release unused Elastic IPs',
      complianceFrameworks: [],
    },
  ],
};

const Violations: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || "http://localhost:3000"}';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || '';

  const [violationsData, setViolationsData] = useState<any>(DEMO_VIOLATIONS_DATA);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchViolationsData();
  }, []);

  const fetchViolationsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!userId || !token) {
        console.log('🎨 No user account, showing demo violations data');
        setViolationsData(DEMO_VIOLATIONS_DATA);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/violations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setViolationsData(response.data);
    } catch (error) {
      console.log('Error fetching violations data, using demo:', error);
      setViolationsData(DEMO_VIOLATIONS_DATA);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'security group':
      case 'network':
        return <Shield className="w-5 h-5" />;
      case 'database':
      case 's3 bucket':
        return <Database className="w-5 h-5" />;
      case 'iam':
      case 'encryption':
        return <Lock className="w-5 h-5" />;
      default:
        return <Server className="w-5 h-5" />;
    }
  };

  const filteredViolations = violationsData.violations.filter((violation: any) => {
    const matchesSeverity = filterSeverity === 'all' || violation.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || violation.status === filterStatus;
    const matchesSearch = !searchQuery || 
      violation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Violations</h1>
        <p className="text-gray-600 mt-1">Monitor and remediate security policy violations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Violations</p>
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{violationsData.summary.totalViolations}</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">-{violationsData.summary.resolvedThisMonth} this month</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Critical</p>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{violationsData.summary.criticalViolations}</p>
          <p className="text-sm text-gray-600 mt-2">Requires immediate action</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">High Severity</p>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{violationsData.summary.highViolations}</p>
          <p className="text-sm text-gray-600 mt-2">High priority items</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Resolved</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{violationsData.summary.resolvedThisMonth}</p>
          <p className="text-sm text-gray-600 mt-2">This month</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violations Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={violationsData.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={2} name="Active Violations" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Severity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations by Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={violationsData.bySeverity}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {violationsData.bySeverity.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Category */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={violationsData.byCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Total" />
            <Bar dataKey="critical" fill="#dc2626" name="Critical" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search violations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Violations List */}
      <div className="space-y-4">
        {filteredViolations.map((violation: any) => (
          <div key={violation.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-gray-100 rounded-lg">
                  {getCategoryIcon(violation.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(violation.severity)}`}>
                      {violation.severity.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                      {violation.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{violation.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{violation.title}</h3>
                  <p className="text-gray-600 mb-3">{violation.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Resource</p>
                      <p className="font-mono text-gray-900">{violation.resource}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Region</p>
                      <p className="text-gray-900">{violation.region}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Account</p>
                      <p className="text-gray-900">{violation.account}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Age</p>
                      <p className="text-gray-900">{violation.ageInDays} days</p>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-red-900 mb-1">Impact:</p>
                    <p className="text-sm text-red-800">{violation.impact}</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Remediation:</p>
                    <p className="text-sm text-blue-800">{violation.remediation}</p>
                  </div>

                  {violation.complianceFrameworks && violation.complianceFrameworks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <p className="text-sm text-gray-600">Related Compliance:</p>
                      {violation.complianceFrameworks.map((framework: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {framework}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Remediate
              </button>
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                Acknowledge
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Create Ticket
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Suppress
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredViolations.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Violations Found</h3>
          <p className="text-gray-600">
            {searchQuery || filterSeverity !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'All security policies are compliant'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Violations;