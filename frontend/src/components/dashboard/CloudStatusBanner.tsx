// src/components/dashboard/CloudStatusBanner.tsx — UI REDESIGN ONLY
// ✅ All props/logic 100% preserved
import React from 'react';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface CloudStatus {
  provider: 'aws' | 'azure' | 'gcp'; healthy: boolean;
  message: string; activeIssues: number; lastChecked: Date;
}

interface CloudStatusBannerProps {
  allHealthy: boolean; totalIssues: number;
  providers: { aws: CloudStatus; azure: CloudStatus; gcp: CloudStatus };
  lastChecked: Date; onRefresh: () => void;
}

const providerMeta = (key: string) => ({
  aws:   { emoji: '☁️',  name: 'AWS'   },
  azure: { emoji: '🔷', name: 'Azure' },
  gcp:   { emoji: '🌐', name: 'GCP'   },
})[key] || { emoji: '☁️', name: key.toUpperCase() };

const timeAgo = (date: Date) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
};

const CloudStatusBanner: React.FC<CloudStatusBannerProps> = ({
  allHealthy, totalIssues, providers, lastChecked, onRefresh,
}) => {
  if (allHealthy) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle size={14} className="text-white"/>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">All Cloud Services Operational</p>
              <p className="text-[11px] text-emerald-600">AWS, Azure, and GCP are healthy · Last checked {timeAgo(lastChecked)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              {Object.entries(providers).map(([key, status]) => {
                const meta = providerMeta(key);
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="text-sm">{meta.emoji}</span>
                    <span className="text-xs font-semibold text-gray-500">{meta.name}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                  </div>
                );
              })}
            </div>
            <button onClick={onRefresh}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors">
              <RefreshCw size={13}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-600 rounded-2xl shadow-lg shadow-red-200 mb-5 overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center animate-pulse flex-shrink-0">
              <AlertTriangle size={16} className="text-red-600"/>
            </div>
            <div>
              <p className="text-sm font-bold text-white">🚨 Cloud Service Issues Detected</p>
              <p className="text-[11px] text-white/80">
                {totalIssues} active issue{totalIssues !== 1 ? 's' : ''} · Last checked {timeAgo(lastChecked)}
              </p>
            </div>
          </div>
          <button onClick={onRefresh}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors">
            <RefreshCw size={13}/>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {Object.entries(providers).map(([key, status]) => {
            const meta = providerMeta(key);
            return (
              <div key={key}
                className={`rounded-xl p-3 ${status.healthy ? 'bg-white/10' : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <div>
                    <p className={`text-xs font-bold ${status.healthy ? 'text-white' : 'text-red-900'}`}>{meta.name}</p>
                    {status.healthy
                      ? <p className="text-[10px] text-white/70 flex items-center gap-0.5"><CheckCircle size={10}/> OK</p>
                      : <p className="text-[10px] text-red-700 flex items-center gap-0.5"><AlertTriangle size={10}/> {status.activeIssues} issues</p>
                    }
                  </div>
                </div>
                {!status.healthy && (
                  <p className="text-[10px] text-red-700 mt-1.5 line-clamp-2">{status.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CloudStatusBanner;
