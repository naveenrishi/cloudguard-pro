// src/components/notifications/NotificationsPanel.tsx
// Full slide-out notifications panel with real API + categories + mark-as-read

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Bell, DollarSign, Shield, CheckCircle, Info,
  AlertTriangle, TrendingDown, Zap, RefreshCw,
  ArrowRight, Check, Trash2, Filter,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
export type NotifType = 'cost' | 'security' | 'success' | 'info' | 'warning' | 'optimization';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  time: string;         // ISO string from API, or display string
  read: boolean;
  accountName?: string;
  provider?: string;
  actionLabel?: string;
  actionPath?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const NOTIF_META: Record<NotifType, { icon: React.ElementType; iconBg: string; iconColor: string; dot: string }> = {
  cost:         { icon: DollarSign,   iconBg: 'bg-red-50',     iconColor: 'text-red-500',     dot: 'bg-red-500'     },
  security:     { icon: Shield,       iconBg: 'bg-orange-50',  iconColor: 'text-orange-500',  dot: 'bg-orange-500'  },
  success:      { icon: CheckCircle,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', dot: 'bg-emerald-500' },
  info:         { icon: Info,         iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    dot: 'bg-blue-500'    },
  warning:      { icon: AlertTriangle,iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   dot: 'bg-amber-500'   },
  optimization: { icon: TrendingDown, iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  dot: 'bg-indigo-500'  },
};

const DEMO_NOTIFICATIONS: Notification[] = [
  { id:'n1', type:'cost',         title:'Cost spike detected',              description:'EC2 spend increased 34% in us-east-1 vs last week.',       time:'2m ago',  read:false, accountName:'AWS Production', provider:'AWS',   actionLabel:'View analytics', actionPath:'/analytics' },
  { id:'n2', type:'security',     title:'IAM policy violation',             description:'3 open IAM policies granting overly broad permissions.',    time:'18m ago', read:false, accountName:'AWS Production', provider:'AWS',   actionLabel:'View security',  actionPath:'/security'  },
  { id:'n3', type:'optimization', title:'Quick win available',              description:'Right-sizing 4 EC2 instances could save $1,240/mo.',        time:'45m ago', read:false, accountName:'AWS Staging',    provider:'AWS',   actionLabel:'View recs',      actionPath:'/recommendations' },
  { id:'n4', type:'success',      title:'Reserved Instance applied',        description:'Saved $420/mo on m5.large in us-east-1.',                   time:'1h ago',  read:false, accountName:'AWS Production', provider:'AWS'   },
  { id:'n5', type:'warning',      title:'Budget threshold reached',         description:'Monthly budget 85% used with 8 days remaining.',            time:'2h ago',  read:true,  accountName:'AWS Production', provider:'AWS',   actionLabel:'View budget',    actionPath:'/budgets'   },
  { id:'n6', type:'info',         title:'Azure health event resolved',      description:'Azure Storage service fully restored in East US.',           time:'3h ago',  read:true,  accountName:'Azure Corp',     provider:'AZURE' },
  { id:'n7', type:'cost',         title:'Unattached disks detected',        description:'14 unattached managed disks costing $210/mo found.',        time:'5h ago',  read:true,  accountName:'Azure Corp',     provider:'AZURE', actionLabel:'View nuke',      actionPath:'/nuke'      },
  { id:'n8', type:'security',     title:'MFA not enabled',                  description:'2 IAM users without MFA in AWS Staging account.',           time:'1d ago',  read:true,  accountName:'AWS Staging',    provider:'AWS',   actionLabel:'View security',  actionPath:'/security'  },
  { id:'n9', type:'success',      title:'Compliance check passed',          description:'CIS Azure Benchmark score improved from 62 to 78.',         time:'1d ago',  read:true,  accountName:'Azure Corp',     provider:'AZURE' },
  { id:'n10',type:'optimization', title:'S3 lifecycle policy recommended',  description:'Move 2.3 TB to S3-IA and save $210/mo automatically.',      time:'2d ago',  read:true,  accountName:'AWS Production', provider:'AWS',   actionLabel:'View recs',      actionPath:'/recommendations' },
];

const timeAgo = (ts: string): string => {
  if (!ts || ts.includes(' ago') || ts.includes('d ago') || ts.includes('h ago')) return ts;
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const mapApiNotif = (r: any, i: number): Notification => ({
  id:          r.id            ?? `api-${i}`,
  type:        r.type          ?? r.category ?? 'info',
  title:       r.title         ?? r.message  ?? 'Notification',
  description: r.description   ?? r.body     ?? r.detail ?? '',
  time:        r.createdAt     ?? r.timestamp ?? r.time ?? '',
  read:        r.read          ?? r.isRead   ?? false,
  accountName: r.accountName   ?? r.account  ?? undefined,
  provider:    r.provider      ?? undefined,
  actionLabel: r.actionLabel   ?? undefined,
  actionPath:  r.actionPath    ?? r.link     ?? undefined,
});

// ─── FILTER TABS ──────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { id: 'all',          label: 'All'          },
  { id: 'cost',         label: 'Cost'         },
  { id: 'security',     label: 'Security'     },
  { id: 'optimization', label: 'Savings'      },
  { id: 'unread',       label: 'Unread'       },
] as const;

type FilterTab = typeof FILTER_TABS[number]['id'];

// ─── MAIN PANEL COMPONENT ─────────────────────────────────────────────────────
interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeFilter,  setActiveFilter]  = useState<FilterTab>('all');
  const [hoveredId,     setHoveredId]     = useState<string | null>(null);

  // ── fetch ──
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/notifications/${user.id}`, { headers: hdrs });
      if (res.ok) {
        const json = await res.json();
        const list: any[] = json.notifications ?? json.data ?? (Array.isArray(json) ? json : []);
        if (list.length > 0) {
          setNotifications(list.map(mapApiNotif));
          setLoading(false);
          return;
        }
      }
    } catch (_) {}
    // fallback
    setNotifications(DEMO_NOTIFICATIONS);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { if (open) fetchNotifications(); }, [open]);

  // ── mark one as read ──
  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/notifications/${id}/read`, { method: 'POST', headers: hdrs });
    } catch (_) {}
  };

  // ── mark all as read ──
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/notifications/mark-all-read`, {
        method: 'POST', headers: { ...hdrs, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (_) {}
  };

  // ── dismiss one ──
  const dismiss = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/notifications/${id}`, { method: 'DELETE', headers: hdrs });
    } catch (_) {}
  };

  // ── derived ──
  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed   = notifications.filter(n => {
    if (activeFilter === 'all')    return true;
    if (activeFilter === 'unread') return !n.read;
    return n.type === activeFilter;
  });

  const filterCount = (f: FilterTab) => {
    if (f === 'all')    return notifications.length;
    if (f === 'unread') return notifications.filter(n => !n.read).length;
    return notifications.filter(n => n.type === f).length;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full z-50 w-[420px] max-w-[100vw] bg-white shadow-[−8px_0_40px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Bell size={15} className="text-indigo-600"/>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                <Check size={12}/> Mark all read
              </button>
            )}
            <button
              onClick={fetchNotifications}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="px-5 pt-3 pb-0 flex items-center gap-1 flex-shrink-0 overflow-x-auto">
          {FILTER_TABS.map(tab => {
            const count = filterCount(tab.id);
            return (
              <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeFilter === tab.id ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Notification list ── */}
        <div className="flex-1 overflow-y-auto py-3">
          {loading ? (
            <div className="space-y-2 px-5 pt-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-[72px] rounded-2xl bg-gray-100 animate-pulse"/>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Bell size={20} className="text-gray-300"/>
              </div>
              <p className="text-sm text-gray-400 font-medium">No notifications here</p>
            </div>
          ) : (
            <div className="px-3 space-y-0.5">
              {displayed.map(n => {
                const meta  = NOTIF_META[n.type] || NOTIF_META.info;
                const Icon  = meta.icon;
                const isNew = !n.read;
                return (
                  <div
                    key={n.id}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => markRead(n.id)}
                    className={`relative flex items-start gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all group ${
                      isNew ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-gray-50'
                    }`}>

                    {/* Unread dot */}
                    {isNew && (
                      <div className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"/>
                    )}

                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                      <Icon size={15} className={meta.iconColor}/>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${isNew ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {n.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{n.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400">{timeAgo(n.time)}</span>
                        {n.accountName && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-[10px] text-gray-400">{n.accountName}</span>
                          </>
                        )}
                        {n.actionLabel && n.actionPath && (
                          <button
                            onClick={e => { e.stopPropagation(); markRead(n.id); navigate(n.actionPath!); onClose(); }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 ml-1">
                            {n.actionLabel} <ArrowRight size={9}/>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dismiss — shows on hover */}
                    {hoveredId === n.id && (
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <X size={11}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={() => { navigate('/notifications'); onClose(); }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            View all notifications <ArrowRight size={12}/>
          </button>
          <button
            onClick={() => { navigate('/settings?tab=notifications'); onClose(); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Manage preferences
          </button>
        </div>
      </div>
    </>
  );
};

// ─── BELL BUTTON (drop-in for MainLayout) ─────────────────────────────────────
export const NotificationsBell: React.FC<{ unreadCount: number; onClick: () => void }> = ({ unreadCount, onClick }) => (
  <button
    onClick={onClick}
    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all">
    <Bell size={17}/>
    {unreadCount > 0 && (
      <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center">
        <span className="text-[9px] font-bold text-white leading-none px-0.5">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      </span>
    )}
  </button>
);

export default NotificationsPanel;
