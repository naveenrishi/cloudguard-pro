import React from 'react';
import { ArrowUpCircle, CheckCircle, AlertCircle } from 'lucide-react';

interface VersionUpdate {
  service: string;
  currentVersion: string;
  latestVersion: string;
  upgrade: boolean;
}

interface VersionUpdatesWidgetProps {
  updates: {
    aws: VersionUpdate[];
    azure: VersionUpdate[];
    gcp: VersionUpdate[];
  };
}

const VersionUpdatesWidget: React.FC<VersionUpdatesWidgetProps> = ({ updates }) => {
  const allUpdates = [...updates.aws, ...updates.azure, ...updates.gcp];
  const upgradeNeeded = allUpdates.filter(u => u.upgrade);

  if (allUpdates.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-blue-500" />
            Version Updates Available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {upgradeNeeded.length} services need upgrading
          </p>
        </div>
        {upgradeNeeded.length > 0 && (
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
            {upgradeNeeded.length} Updates
          </span>
        )}
      </div>

      <div className="space-y-3">
        {allUpdates.map((update, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border-2 ${
              update.upgrade
                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {update.upgrade ? (
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{update.service}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Current: <span className="font-mono">{update.currentVersion}</span>
                    {update.upgrade && (
                      <>
                        {' '}→ Latest: <span className="font-mono text-blue-600 dark:text-blue-400">{update.latestVersion}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              {update.upgrade && (
                <button className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors">
                  Upgrade
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionUpdatesWidget;
