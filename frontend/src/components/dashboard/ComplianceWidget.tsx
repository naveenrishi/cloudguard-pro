import React from 'react';
import { CheckSquare, AlertCircle } from 'lucide-react';

const ComplianceWidget: React.FC = () => {
  const standards = [
    { name: 'CloudWatch Log Group Encrypted', count: 3325, color: 'bg-purple-500' },
    { name: 'S3 Bucket SSL Enabled', count: 2298, color: 'bg-blue-500' },
    { name: 'S3 Bucket Default Lock Enabled', count: 1368, color: 'bg-cyan-500' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Compliance Assessment</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Industry Standards</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
          <CheckSquare className="w-4 h-4" />
          <span className="text-sm font-semibold">ACTIVE</span>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">24448</span>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Open Issues</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="font-semibold text-gray-700 dark:text-gray-300">TOP 3 VIOLATIONS</span>
        </div>
        {standards.map((standard, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-2 h-2 ${standard.color} rounded-full`}></div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{standard.name}</p>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white ml-4">{standard.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComplianceWidget;
