import React from 'react';
import { CheckCircle, AlertTriangle, Cloud, RefreshCw } from 'lucide-react';

interface CloudStatus {
  provider: 'aws' | 'azure' | 'gcp';
  healthy: boolean;
  message: string;
  activeIssues: number;
  lastChecked: Date;
}

interface CloudStatusBannerProps {
  allHealthy: boolean;
  totalIssues: number;
  providers: {
    aws: CloudStatus;
    azure: CloudStatus;
    gcp: CloudStatus;
  };
  lastChecked: Date;
  onRefresh: () => void;
}

const CloudStatusBanner: React.FC<CloudStatusBannerProps> = ({
  allHealthy,
  totalIssues,
  providers,
  lastChecked,
  onRefresh,
}) => {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws': return '☁️';
      case 'azure': return '🔷';
      case 'gcp': return '🌐';
      default: return '☁️';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'aws': return 'AWS';
      case 'azure': return 'Azure';
      case 'gcp': return 'GCP';
      default: return provider.toUpperCase();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="mb-6">
      {allHealthy ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="bg-gradient-to-r from-green-400 to-emerald-400 h-full w-full"></div>
          </div>
          <div className="relative p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                    ✅ All Cloud Services Operating Normally
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    AWS, Azure, and GCP are all healthy • Last checked {formatTime(lastChecked)}
                  </p>
                </div>
              </div>
              <button onClick={onRefresh} className="p-2 hover:bg-green-100 dark:hover:bg-green-800/30 rounded-lg transition-colors" title="Refresh status">
                <RefreshCw className="w-5 h-5 text-green-700 dark:text-green-300" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {Object.entries(providers).map(([key, status]) => (
                <div key={key} className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getProviderIcon(key)}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{getProviderName(key)}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Operational
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border-2 border-red-600 bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="animate-pulse bg-white h-full w-full"></div>
          </div>
          <div className="relative p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    🚨 ALERT: Cloud Service Issues Detected
                  </h3>
                  <p className="text-sm text-white/90">
                    {totalIssues} active issue{totalIssues !== 1 ? 's' : ''} across cloud providers • Last checked {formatTime(lastChecked)}
                  </p>
                </div>
              </div>
              <button onClick={onRefresh} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Refresh status">
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {Object.entries(providers).map(([key, status]) => (
                <div key={key} className={`rounded-lg p-3 border-2 ${status.healthy ? 'bg-white/10 border-white/30' : 'bg-white border-white shadow-lg'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getProviderIcon(key)}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${status.healthy ? 'text-white' : 'text-red-900'}`}>{getProviderName(key)}</p>
                      {status.healthy ? (
                        <p className="text-xs text-white/80 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Operational
                        </p>
                      ) : (
                        <p className="text-xs text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {status.activeIssues} issue{status.activeIssues !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {!status.healthy && (
                    <p className="text-xs text-red-800 mt-2 line-clamp-2">{status.message}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <a href="https://status.aws.amazon.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors">
                <Cloud className="w-4 h-4" />
                View AWS Status Dashboard
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudStatusBanner;