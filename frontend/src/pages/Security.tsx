import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

const Security: React.FC = () => {
  const { accountId } = useParams();
  const [securityData, setSecurityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountId) {
      fetchRealSecurity();
    }
  }, [accountId]);

  const fetchRealSecurity = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts/${accountId}/security`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Real security data:', data);
        setSecurityData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch security data');
      }
    } catch (err: any) {
      console.error('Error fetching security:', err);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-500';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-500';
      case 'LOW':
        return 'bg-blue-100 text-blue-700 border-blue-500';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Security Data</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={fetchRealSecurity}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-900">No security data available for this account.</p>
        </div>
      </div>
    );
  }

  const score = securityData.score || 0;
  const findings = securityData.findings || [];
  const criticalCount = findings.filter((f: any) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f: any) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f: any) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f: any) => f.severity === 'LOW').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Posture</h1>
          <p className="text-gray-600 mt-1">{securityData.accountName || 'Cloud Account'}</p>
        </div>
        <button
          onClick={fetchRealSecurity}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Security Score */}
      <div className={`${getScoreBackground(score)} rounded-lg shadow p-8 border-2 ${getSeverityColor('CRITICAL').split(' ')[2]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700 mb-2 font-semibold">Overall Security Score</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-2xl text-gray-500">/100</span>
            </div>
            <p className="text-gray-600 text-sm mt-2">
              Last scanned: {new Date(securityData.scannedAt).toLocaleString()}
            </p>
          </div>
          <Shield className={`w-32 h-32 ${getScoreColor(score)} opacity-20`} />
        </div>
      </div>

      {/* Issues Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold">Critical</p>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-4xl font-bold text-red-600">{criticalCount}</p>
          <p className="text-red-500 text-sm mt-1">Immediate action required</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold">High</p>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-4xl font-bold text-orange-600">{highCount}</p>
          <p className="text-orange-500 text-sm mt-1">Address soon</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold">Medium</p>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-4xl font-bold text-yellow-600">{mediumCount}</p>
          <p className="text-yellow-500 text-sm mt-1">Review when possible</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold">Low</p>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-4xl font-bold text-blue-600">{lowCount}</p>
          <p className="text-blue-500 text-sm mt-1">Monitor</p>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Security Findings ({findings.length})</h2>
        
        {findings.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-green-900 font-semibold">No security findings!</p>
            <p className="text-green-700 text-sm mt-1">Your account is secure.</p>
          </div>
        ) : (
          findings.map((finding: any, index: number) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${getSeverityColor(finding.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{finding.title}</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{finding.description}</p>
                  
                  {finding.resource && (
                    <div className="mb-3 bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-xs mb-1">Affected Resource:</p>
                      <p className="text-gray-900 font-mono text-sm break-all">{finding.resource}</p>
                    </div>
                  )}

                  {finding.remediation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                      <p className="text-green-900 text-sm font-semibold mb-2">
                        ✅ Remediation Steps:
                      </p>
                      <p className="text-green-800 text-sm">{finding.remediation}</p>
                    </div>
                  )}

                  {finding.compliance && finding.compliance.length > 0 && (
                    <div className="mt-3">
                      <p className="text-gray-500 text-xs mb-2">Compliance Frameworks:</p>
                      <div className="flex flex-wrap gap-2">
                        {finding.compliance.map((framework: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg border border-purple-300 font-medium"
                          >
                            {framework}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap">
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium whitespace-nowrap">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Last Scan Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-600" />
        <div>
          <p className="text-blue-900 font-semibold text-sm">Last Security Scan</p>
          <p className="text-blue-700 text-sm">
            {new Date(securityData.scannedAt).toLocaleString()} • {securityData.provider} Account
          </p>
        </div>
      </div>
    </div>
  );
};

export default Security;