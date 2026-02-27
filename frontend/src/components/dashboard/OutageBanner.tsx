import React from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface OutageEvent {
  id: string;
  provider: 'aws' | 'azure' | 'gcp';
  service: string;
  region: string;
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  url?: string;
}

interface OutageBannerProps {
  events: OutageEvent[];
  onDismiss: (eventId: string) => void;
}

const OutageBanner: React.FC<OutageBannerProps> = ({ events, onDismiss }) => {
  if (events.length === 0) return null;

  const criticalEvents = events.filter(e => e.severity === 'critical');
  const majorEvents = events.filter(e => e.severity === 'major');

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'aws':
        return { bg: 'bg-orange-500', text: 'text-orange-50' };
      case 'azure':
        return { bg: 'bg-blue-500', text: 'text-blue-50' };
      case 'gcp':
        return { bg: 'bg-red-500', text: 'text-red-50' };
      default:
        return { bg: 'bg-gray-500', text: 'text-gray-50' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-500',
          text: 'text-red-900 dark:text-red-100',
          icon: 'text-red-600 dark:text-red-400'
        };
      case 'major':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-500',
          text: 'text-orange-900 dark:text-orange-100',
          icon: 'text-orange-600 dark:text-orange-400'
        };
      default:
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-500',
          text: 'text-yellow-900 dark:text-yellow-100',
          icon: 'text-yellow-600 dark:text-yellow-400'
        };
    }
  };

  return (
    <div className="space-y-2 mb-6">
      {criticalEvents.length > 0 && (
        <div className="relative overflow-hidden rounded-lg border-2 border-red-600 bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="animate-pulse bg-white h-full w-full"></div>
          </div>
          <div className="relative p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-2">
                  🚨 CRITICAL: Active Cloud Service Outages Detected
                </h3>
                <div className="space-y-2">
                  {criticalEvents.map((event) => {
                    const providerColor = getProviderColor(event.provider);
                    return (
                      <div key={event.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${providerColor.bg} ${providerColor.text}`}>
                                {event.provider.toUpperCase()}
                              </span>
                              <span className="text-white font-semibold">{event.service}</span>
                              <span className="text-white/70 text-sm">• {event.region}</span>
                            </div>
                            <p className="text-white/90 text-sm">{event.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.url && (
                              <a href={event.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/20 rounded transition-colors">
                                <ExternalLink className="w-4 h-4 text-white" />
                              </a>
                            )}
                            <button onClick={() => onDismiss(event.id)} className="p-1 hover:bg-white/20 rounded transition-colors">
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {majorEvents.length > 0 && (
        <div className="space-y-2">
          {majorEvents.map((event) => {
            const severityColor = getSeverityColor(event.severity);
            const providerColor = getProviderColor(event.provider);
            
            return (
              <div key={event.id} className={`${severityColor.bg} border-l-4 ${severityColor.border} rounded-lg p-4 shadow-md`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 ${severityColor.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${providerColor.bg} ${providerColor.text}`}>
                        {event.provider.toUpperCase()}
                      </span>
                      <h4 className={`font-semibold ${severityColor.text}`}>
                        {event.service} - {event.region}
                      </h4>
                    </div>
                    <p className={`text-sm ${severityColor.text} mb-2`}>{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{event.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.url && (
                      <a href={event.url} target="_blank" rel="noopener noreferrer" className={`p-1 hover:bg-black/10 rounded transition-colors ${severityColor.text}`}>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => onDismiss(event.id)} className={`p-1 hover:bg-black/10 rounded transition-colors ${severityColor.text}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OutageBanner;