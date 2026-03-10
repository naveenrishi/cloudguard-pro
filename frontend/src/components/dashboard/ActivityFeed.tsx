// src/components/dashboard/ActivityFeed.tsx — UI REDESIGN ONLY
// ✅ All props/state/handlers 100% preserved
import React, { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, TrendingUp,
  DollarSign, Trash2, Plus, Shield, RefreshCw, MoreHorizontal,
} from 'lucide-react';

interface ActivityItem {
  id: string; provider: string; eventType: string;
  resourceType?: string; resourceName?: string;
  description: string; severity: string; isRead: boolean;
  timestamp: Date; metadata?: any;
  cloudAccount?: { accountName: string; provider: string };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  unreadCount: number;
  onMarkAsRead: (ids: string[]) => void;
  onRefresh: () => void;
}

const eventIcon = (t: string) => {
  if (t === 'resource_created') return Plus;
  if (t === 'resource_deleted') return Trash2;
  if (t === 'cost_spike')       return TrendingUp;
  if (t === 'budget_alert')     return DollarSign;
  if (t === 'security_alert')   return Shield;
  return Activity;
};

const severityStyle = (s: string) => {
  if (s === 'critical' || s === 'error') return { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' };
  if (s === 'warning')                   return { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' };
  return                                        { bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' };
};

const providerEmoji = (p: string) =>
  p === 'aws' ? '☁️' : p === 'azure' ? '🔷' : p === 'gcp' ? '🌐' : '💻';

const timeAgo = (date: Date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities, unreadCount, onMarkAsRead, onRefresh,
}) => {
  const [filter, setFilter] = useState<'all'|'unread'|'critical'>('all');

  const filtered = activities.filter(a => {
    if (filter === 'unread')   return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical' || a.severity === 'error';
    return true;
  });

  const criticalCount = activities.filter(a => a.severity === 'critical' || a.severity === 'error').length;

  const handleMarkAll = () => {
    const ids = activities.filter(a => !a.isRead).map(a => a.id);
    if (ids.length) onMarkAsRead(ids);
  };

  const tabs = [
    { id: 'all',      label: 'All',      count: activities.length },
    { id: 'unread',   label: 'Unread',   count: unreadCount       },
    { id: 'critical', label: 'Critical', count: criticalCount     },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <Activity size={16} className="text-purple-600"/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Activity Feed</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {unreadCount > 0
                ? <><span className="text-red-500 font-bold">{unreadCount} unread</span> · Live updates</>
                : 'Live updates'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAll}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-semibold transition-colors">
              Mark all read
            </button>
          )}
          <button onClick={onRefresh}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={13}/>
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
            <MoreHorizontal size={15}/>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-5 mt-4">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                filter === tab.id ? 'bg-white/25 text-white' : 'bg-white text-gray-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="px-5 py-4 space-y-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
              <Activity size={20} className="text-gray-300"/>
            </div>
            <p className="text-sm text-gray-300 font-medium">No activities yet</p>
          </div>
        ) : (
          filtered.map(item => {
            const Icon  = eventIcon(item.eventType);
            const style = severityStyle(item.severity);
            return (
              <div key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  item.isRead ? 'bg-white border-gray-100' : 'bg-indigo-50/40 border-indigo-100'
                }`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: style.bg }}>
                  <Icon size={14} style={{ color: style.color }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm">{providerEmoji(item.provider)}</span>
                    {item.cloudAccount && (
                      <span className="text-[11px] text-gray-400">{item.cloudAccount.accountName}</span>
                    )}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: style.bg, color: style.color }}>{item.severity}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 leading-snug">{item.description}</p>
                  {item.resourceName && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.resourceType} · {item.resourceName}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(item.timestamp)}</p>
                </div>
                {!item.isRead && (
                  <button onClick={() => onMarkAsRead([item.id])}
                    className="flex-shrink-0 text-[11px] text-indigo-500 hover:text-indigo-600 font-semibold whitespace-nowrap">
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
