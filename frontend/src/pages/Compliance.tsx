import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

const DEMO_COMPLIANCE_DATA = {
  overallCompliance: 84,
  complianceChange: 3,
  totalControls: 423,
  passingControls: 356,
  failingControls: 67,
  frameworks: [
    {
      id: 'cis',
      name: 'CIS AWS Foundations',
      version: '1.4.0',
      score: 86,
      totalControls: 190,
      passing: 163,
      failing: 27,
      lastAssessment: '2026-02-28',
      controls: [
        {
          id: 'cis-1.1',
          title: 'Maintain current contact details',
          status: 'pass',
          severity: 'medium',
          description: 'Ensure contact email and telephone details for AWS accounts are current',
        },
        {
          id: 'cis-1.2',
          title: 'Ensure security contact information is registered',
          status: 'pass',
          severity: 'medium',
          description: 'AWS provides customers with the option of specifying the contact information for account\'s security team',
        },
        {
          id: 'cis-1.3',
          title: 'Ensure security questions are registered',
          status: 'fail',
          severity: 'low',
          description: 'When creating an AWS account, you must provide security question answers',
          remediation: 'Register security questions in the AWS Account Security Challenge Questions section',
        },
        {
          id: 'cis-1.4',
          title: 'Ensure no root account access key exists',
          status: 'pass',
          severity: 'critical',
          description: 'The root account is the most privileged user in an AWS account',
        },
      ],
    },
    {
      id: 'pci',
      name: 'PCI DSS',
      version: '3.2.1',
      score: 78,
      totalControls: 119,
      passing: 93,
      failing: 26,
      lastAssessment: '2026-02-27',
      controls: [
        {
          id: 'pci-2.1',
          title: 'Install and maintain firewall configuration',
          status: 'pass',
          severity: 'critical',
          description: 'Firewalls are devices that control computer traffic',
        },
        {
          id: 'pci-2.2',
          title: 'Do not use vendor-supplied defaults',
          status: 'fail',
          severity: 'high',
          description: 'Malicious individuals use vendor default passwords and other vendor default settings to compromise systems',
          remediation: 'Change all vendor-supplied defaults before installing a system on the network',
        },
        {
          id: 'pci-8.1',
          title: 'Implement strong access control measures',
          status: 'pass',
          severity: 'critical',
          description: 'Assign a unique identification to each person with computer access',
        },
      ],
    },
    {
      id: 'hipaa',
      name: 'HIPAA',
      version: '2020',
      score: 81,
      totalControls: 76,
      passing: 62,
      failing: 14,
      lastAssessment: '2026-02-26',
      controls: [
        {
          id: 'hipaa-164.308',
          title: 'Administrative Safeguards',
          status: 'pass',
          severity: 'high',
          description: 'Implement policies and procedures for administrative safeguards',
        },
        {
          id: 'hipaa-164.312',
          title: 'Technical Safeguards',
          status: 'fail',
          severity: 'critical',
          description: 'Implement encryption and decryption',
          remediation: 'Enable encryption at rest for all data stores containing PHI',
        },
      ],
    },
    {
      id: 'soc2',
      name: 'SOC 2',
      version: 'Type II',
      score: 89,
      totalControls: 38,
      passing: 34,
      failing: 4,
      lastAssessment: '2026-02-25',
      controls: [
        {
          id: 'soc2-cc6.1',
          title: 'Logical and Physical Access Controls',
          status: 'pass',
          severity: 'high',
          description: 'The entity implements logical access security software',
        },
        {
          id: 'soc2-cc6.6',
          title: 'Encryption of Data',
          status: 'fail',
          severity: 'high',
          description: 'Data is encrypted in transit and at rest',
          remediation: 'Enable TLS 1.2+ for all data in transit',
        },
      ],
    },
  ],
  complianceHistory: [
    { month: 'Sep', score: 78 },
    { month: 'Oct', score: 79 },
    { month: 'Nov', score: 81 },
    { month: 'Dec', score: 82 },
    { month: 'Jan', score: 83 },
    { month: 'Feb', score: 84 },
  ],
  frameworkDistribution: [
    { name: 'CIS', score: 86, color: '#3b82f6' },
    { name: 'SOC 2', score: 89, color: '#10b981' },
    { name: 'HIPAA', score: 81, color: '#f59e0b' },
    { name: 'PCI DSS', score: 78, color: '#ef4444' },
  ],
};

const Compliance: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || "http://localhost:3000"}';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || '';

  const [complianceData, setComplianceData] = useState<any>(DEMO_COMPLIANCE_DATA);
  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!userId || !token) {
        console.log('🎨 No user account, showing demo compliance data');
        setComplianceData(DEMO_COMPLIANCE_DATA);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/compliance/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setComplianceData(response.data);
    } catch (error) {
      console.log('Error fetching compliance data, using demo:', error);
      setComplianceData(DEMO_COMPLIANCE_DATA);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'pass' 
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-red-100 text-red-700 border-red-300';
  };

  const getStatusIcon = (status: string) => {
    return status === 'pass'
      ? <CheckCircle className="w-5 h-5 text-green-600" />
      : <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor compliance across multiple frameworks</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Overall Score */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-2">Overall Compliance Score</p>
            <div className="flex items-baseline gap-3">
              <p className="text-6xl font-bold">{complianceData.overallCompliance}%</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="w-5 h-5" />
              <p className="text-sm">+{complianceData.complianceChange}% vs last month</p>
            </div>
          </div>
          <CheckSquare className="w-32 h-32 opacity-20" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Controls</p>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{complianceData.totalControls}</p>
          <p className="text-sm text-gray-600 mt-1">Across all frameworks</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Passing</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{complianceData.passingControls}</p>
          <p className="text-sm text-gray-600 mt-1">
            {Math.round((complianceData.passingControls / complianceData.totalControls) * 100)}% of total
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Failing</p>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{complianceData.failingControls}</p>
          <p className="text-sm text-gray-600 mt-1">Requires attention</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={complianceData.complianceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} name="Compliance Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Framework Scores */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Framework Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceData.frameworkDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Bar dataKey="score" fill="#3b82f6">
                {complianceData.frameworkDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Frameworks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {complianceData.frameworks.map((framework: any) => (
          <div key={framework.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{framework.name}</h3>
                <p className="text-sm text-gray-600">Version {framework.version}</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  framework.score >= 80 ? 'text-green-600' :
                  framework.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {framework.score}%
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900 font-medium">
                  {framework.passing}/{framework.totalControls} controls passing
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    framework.score >= 80 ? 'bg-green-600' :
                    framework.score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${framework.score}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">{framework.passing} passing</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-gray-600">{framework.failing} failing</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{framework.lastAssessment}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedFramework(framework)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Controls
            </button>
          </div>
        ))}
      </div>

      {/* Framework Details Modal */}
      {selectedFramework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedFramework.name}</h2>
                <p className="text-gray-600">Version {selectedFramework.version}</p>
              </div>
              <button
                onClick={() => setSelectedFramework(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Filter */}
              <div className="flex gap-2 mb-6">
                {['all', 'pass', 'fail'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'All Controls' : status === 'pass' ? 'Passing' : 'Failing'}
                  </button>
                ))}
              </div>

              {/* Controls List */}
              <div className="space-y-4">
                {selectedFramework.controls
                  .filter((control: any) => filterStatus === 'all' || control.status === filterStatus)
                  .map((control: any) => (
                    <div key={control.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(control.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(control.status)}`}>
                                {control.status.toUpperCase()}
                              </span>
                              <span className="text-xs font-mono text-gray-600">{control.id}</span>
                              <span className={`text-xs font-medium ${getSeverityColor(control.severity)}`}>
                                {control.severity.toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">{control.title}</h4>
                            <p className="text-sm text-gray-600">{control.description}</p>

                            {control.status === 'fail' && control.remediation && (
                              <div className="mt-3 bg-blue-50 rounded-lg p-3">
                                <p className="text-sm font-semibold text-blue-900 mb-1">Remediation:</p>
                                <p className="text-sm text-blue-800">{control.remediation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compliance;