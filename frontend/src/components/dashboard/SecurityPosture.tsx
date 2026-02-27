import React from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const SecurityPosture: React.FC = () => {
  const violations = [
    { title: 'IAM Policies Too Permissive', count: 1191, severity: 'high' },
    { title: 'Lambda in VPC Without Isolation', count: 1183, severity: 'medium' },
    { title: 'Unused Lambda Functions', count: 1112, severity: 'low' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Security Posture</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last Run: 26 Feb 2026 21:44 PM</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">ACTIVE</span>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          <span className="text-2xl font-bold text-orange-900 dark:text-orange-100">14074</span>
        </div>
        <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Open Issues</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700 dark:text-gray-300">TOP 3 VIOLATIONS</span>
        </div>
        {violations.map((violation, index) => (
          <div key={index} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">{violation.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                violation.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                violation.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {violation.severity.toUpperCase()}
              </span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white ml-4">{violation.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityPosture;
