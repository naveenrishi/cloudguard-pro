// src/pages/Notifications.tsx
// Full notifications page — all notifications, filters, bulk actions

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Bell, Check, Trash2, RefreshCw, Filter,
  DollarSign, Shield, CheckCircle, Info, AlertTriangle, TrendingDown,
  ArrowRight, Search, X, ChevronDown,
} from 'lucide-react';

// ─── types (mirrors NotificationsPanel) ──────────────────────────────────────
type NotifType = 'cost' | 'security' | 'success' | 'info' | 'warning' | 'optimization';

interface Notification {
  id: string; type: NotifType; title: string; description: string;
  time: string; read: boolean;
  accountName?: string; provider?: string;
  actionLabel?: string; actionPath?: string;
}

const NOTIF_META: Record<NotifType, { icon: React.ElementType; iconBg: string; iconColor: string; label: string; badgeBg: string; badgeText: string }> = {
  cost:         { icon: DollarSign,    iconBg:'bg-red-50',     iconColor:'text-red-500',     label:'Cost',         badgeBg:'bg-red-50',     badgeText:'text-red-600'     },
  security:     { icon: Shield,        iconBg:'bg-orange-50',  iconColor:'text-orange-500',  label:'Security',     badgeBg:'bg-orange-50',  badgeText:'text-orange-600'  },
  success:      { icon: CheckCircle,   iconBg:'bg-emerald-50', iconColor:'text-emerald-500', label:'Success',      badgeBg:'bg-emerald-50', badgeText:'text-emerald-600' },
  info:         { icon: Info,          iconBg:'bg-blue-50',    iconColor:'text-blue-500',    label:'Info',         badgeBg:'bg-blue-50',    badgeText:'text-blue-600'    },
  warning:      { icon: AlertTriangle, iconBg:'bg-amber-50',   iconColor:'text-amber-500',   label:'Warning',      badgeBg:'bg-amber-50',   badgeText:'text-amber-600'   },
  optimization: { icon: TrendingDown,  iconBg:'bg-indigo-50',  iconColor:'text-indigo-500',  label:'Optimization', badgeBg:'bg-indigo-50',  badgeText:'text-indigo-600'  },
};

const PROV_EMOJI: Record<string,string> = { AWS:'☁️', AZURE:'🔷', GCP:'🌐', aws:'☁️', azure:'🔷', gcp:'🌐' };

const DEMO_NOTIFICATIONS: Notification[] = [
  { id:'n1',  type:'cost',         title:'Cost spike detected',              description:'EC2 spend increased 34% in us-east-1 vs last week. Investigate unusual Lambda and Data Transfer charges.',      time:'2026-03-06T10:00:00Z', read:false, accountName:'AWS Production', provider:'AWS',   actionLabel:'View analytics', actionPath:'/analytics'       },
  { id:'n2',  type:'security',     title:'IAM policy violation',             description:'3 open IAM policies granting overly broad permissions detected. Immediate remediation recommended.',             time:'2026-03-06T09:44:00Z', read:false, accountName:'AWS Production', provider:'AWS',   actionLabel:'View security',  actionPath:'/security'        },
  { id:'n3',  type:'optimization', title:'Quick win available',              description:'Right-sizing 4 underutilized EC2 instances (running at <10% CPU for 30+ days) could save $1,240/mo.',          time:'2026-03-06T09:17:00Z', read:false, accountName:'AWS Staging',    provider:'AWS',   actionLabel:'View recs',      actionPath:'/recommendations' },
  { id:'n4',  type:'success',      title:'Reserved Instance applied',        description:'1-year Reserved Instance for m5.large in us-east-1 activated. Monthly savings of $420/mo realized.',           time:'2026-03-06T09:00:00Z', read:false, accountName:'AWS Production', provider:'AWS'                                                              },
  { id:'n5',  type:'warning',      title:'Budget threshold reached',         description:'Monthly spend is now 85% of the $5,000 budget. At current rate, budget will be exceeded in 3 days.',           time:'2026-03-06T08:00:00Z', read:true,  accountName:'AWS Production', provider:'AWS',   actionLabel:'View budget',    actionPath:'/budgets'         },
  { id:'n6',  type:'info',         title:'Azure health event resolved',      description:'Azure Storage service (Blob, Queue, Table) fully restored in East US after a 2-hour degradation period.',       time:'2026-03-06T07:00:00Z', read:true,  accountName:'Azure Corp',     provider:'AZURE'                                                            },
  { id:'n7',  type:'cost',         title:'Unattached disks detected',        description:'14 unattached Azure Managed Disks totaling 1.8 TB were found. These are costing approximately $210/mo.',       time:'2026-03-06T05:00:00Z', read:true,  accountName:'Azure Corp',     provider:'AZURE', actionLabel:'View nuke',      actionPath:'/nuke'            },
  { id:'n8',  type:'security',     title:'MFA not enabled on 2 users',       description:'2 IAM users in AWS Staging do not have MFA enabled, violating your security policy.',                          time:'2026-03-05T20:00:00Z', read:true,  accountName:'AWS Staging',    provider:'AWS',   actionLabel:'View security',  actionPath:'/security'        },
  { id:'n9',  type:'success',      title:'Compliance score improved',        description:'CIS Azure Benchmark compliance score improved from 62% to 78% following recent remediation actions.',           time:'2026-03-05T18:00:00Z', read:true,  accountName:'Azure Corp',     provider:'AZURE'                                                            },
  { id:'n10', type:'optimization', title:'S3 lifecycle policy recommended',  description:'Moving 2.3 TB of infrequently-accessed objects in prod-user-data to S3-IA could save $210/mo.',               time:'2026-03-04T12:00:00Z', read:true,  accountName:'AWS Production', provider:'AWS',   actionLabel:'View recs',      actionPath:'/recommendations' },
  { id:'n11', type:'warning',      title:'Forecast exceeds budget',          description:'Cost forecast for March is $6,200 against a $5,000 budget. Review spending patterns in EC2 and RDS.',          time:'2026-03-04T09:00:00Z', read:true,  accountName:'AWS Production', provider:'AWS',   actionLabel:'View analytics', actionPath:'/analytics'       },
  { id:'n12', type:'info',         title:'New account connected',            description:'Azure Corp subscription successfully connected and initial data sync completed (847 resources discovered).',    time:'2026-03-03T15:00:00Z', read:true,  accountName:'Azure Corp',     provider:'AZURE'                                                            },
];

const timeAgo = (ts: string): string => {
  if (!ts) return '';
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  } catch { return ts; }
};

const mapApiNotif = (r: any, i: number): Notification => ({
  id:          r.id          ?? `api-${i}`,
  type:        r.type        ?? r.category ?? 'info',
  title:       r.title       ?? r.message  ?? 'Notification',
  description: r.description ?? r.body     ?? r.detail ?? '',
  time:        r.createdAt   ?? r.timestamp ?? r.time  ?? '',
  read:        r.read        ?? r.isRead   ?? false,
  accountName: r.accountName ?? r.account  ?? undefined,
  provider:    r.provider    ?? undefined,
  actionLabel: r.actionLabel ?? undefined,
  actionPath:  r.actionPath  ?? r.link     ?? undefined,
});

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const hdrs  = { Authorization: `Bearer ${token}` };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [typeFilter,    setTypeFilter]    = useState<string>('all');
  const [readFilter,    setReadFilter]    = useState<'all'|'unread'|'read'>('all');
  const [search,        setSearch]        = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/notifications/${user.id}`, { headers: hdrs });
      if (res.ok) {
        const json = await res.json();
        const list: any[] = json.notifications ?? json.data ?? (Array.isArray(json) ? json : []);
        if (list.length > 0) { setNotifications(list.map(mapApiNotif)); setLoading(false); return; }
      }
    } catch (_) {}
    setNotifications(DEMO_NOTIFICATIONS);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchNotifications(); }, []);

  // ── actions ──
  const markRead = async (ids: string[]) => {
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    setSelected(new Set());
    try {
      await Promise.all(ids.map(id =>
        fetch(`http://localhost:3000/api/notifications/${id}/read`, { method:'POST', headers: hdrs })
      ));
    } catch (_) {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`http://localhost:3000/api/notifications/mark-all-read`, {
        method:'POST', headers:{ ...hdrs, 'Content-Type':'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (_) {}
  };

  const dismiss = async (ids: string[]) => {
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    setSelected(new Set());
    try {
      await Promise.all(ids.map(id =>
        fetch(`http://localhost:3000/api/notifications/${id}`, { method:'DELETE', headers: hdrs })
      ));
    } catch (_) {}
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectAll = () =>
    setSelected(displayed.length === selected.size ? new Set() : new Set(displayed.map(n => n.id)));

  // ── derived ──
  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = notifications.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.read)   return false;
    if (readFilter === 'read'   && !n.read)  return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
                  !n.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeGroups = Object.keys(NOTIF_META).map(t => ({
    type: t, count: notifications.filter(n => n.type === t).length,
  })).filter(g => g.count > 0);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread · ` : ''}{notifications.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors">
                <Check size={14}/> Mark all read
              </button>
            )}
            <button onClick={fetchNotifications}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* ── LEFT: summary sidebar ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Summary</p>
              <div className="space-y-2">
                {[
                  { label:'Total',  count: notifications.length,             color:'text-gray-900' },
                  { label:'Unread', count: notifications.filter(n=>!n.read).length, color:'text-indigo-600' },
                  { label:'Today',  count: notifications.filter(n => {
                    try { return new Date(n.time).toDateString() === new Date().toDateString(); } catch { return false; }
                  }).length, color:'text-gray-600' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Category</p>
              <div className="space-y-1">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${typeFilter==='all'?'bg-indigo-50 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-50'}`}>
                  <span>All</span>
                  <span className={`text-xs font-bold ${typeFilter==='all'?'text-indigo-600':'text-gray-400'}`}>{notifications.length}</span>
                </button>
                {typeGroups.map(g => {
                  const meta = NOTIF_META[g.type as NotifType];
                  const Icon = meta.icon;
                  return (
                    <button key={g.type}
                      onClick={() => setTypeFilter(g.type)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${typeFilter===g.type?'bg-indigo-50 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-50'}`}>
                      <Icon size={13} className={typeFilter===g.type?'text-indigo-500':meta.iconColor}/>
                      <span className="flex-1 text-left">{meta.label}</span>
                      <span className={`text-xs font-bold ${typeFilter===g.type?'text-indigo-600':'text-gray-400'}`}>{g.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Read status filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Status</p>
              <div className="space-y-1">
                {([['all','All'],['unread','Unread'],['read','Read']] as const).map(([val, label]) => (
                  <button key={val}
                    onClick={() => setReadFilter(val)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${readFilter===val?'bg-indigo-50 text-indigo-700 font-semibold':'text-gray-600 hover:bg-gray-50'}`}>
                    <span>{label}</span>
                    <span className={`text-xs font-bold ${readFilter===val?'text-indigo-600':'text-gray-400'}`}>
                      {val==='all'?notifications.length:val==='unread'?notifications.filter(n=>!n.read).length:notifications.filter(n=>n.read).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: notification list ── */}
          <div className="lg:col-span-3 space-y-3">

            {/* Search + bulk actions bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search notifications…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-gray-700 placeholder-gray-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X size={12} className="text-gray-400 hover:text-gray-600"/>
                  </button>
                )}
              </div>

              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">{selected.size} selected</span>
                  <button onClick={() => markRead(Array.from(selected))}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                    <Check size={11}/> Mark read
                  </button>
                  <button onClick={() => dismiss(Array.from(selected))}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={11}/> Dismiss
                  </button>
                </div>
              )}

              <button onClick={selectAll} className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                {selected.size === displayed.length && displayed.length > 0 ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 h-[88px] animate-pulse"/>
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-3 py-16">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Bell size={20} className="text-gray-300"/>
                </div>
                <p className="text-sm text-gray-400 font-medium">No notifications match your filters</p>
                <button onClick={() => { setTypeFilter('all'); setReadFilter('all'); setSearch(''); }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">Clear filters</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {displayed.map(n => {
                  const meta   = NOTIF_META[n.type] || NOTIF_META.info;
                  const Icon   = meta.icon;
                  const isNew  = !n.read;
                  const isSel  = selected.has(n.id);
                  return (
                    <div key={n.id}
                      className={`group bg-white rounded-2xl border transition-all ${
                        isSel ? 'border-indigo-300 bg-indigo-50/30' : isNew ? 'border-indigo-100 bg-indigo-50/20' : 'border-gray-100'
                      } shadow-sm hover:shadow-md hover:border-gray-200`}>
                      <div className="flex items-start gap-3 px-4 py-4">

                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(n.id)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            isSel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'
                          }`}>
                          {isSel && <Check size={9} className="text-white"/>}
                        </button>

                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                          <Icon size={15} className={meta.iconColor}/>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm ${isNew ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {n.title}
                              </p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.badgeBg} ${meta.badgeText}`}>
                                {meta.label}
                              </span>
                              {isNew && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"/>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(n.time)}</span>
                          </div>

                          <p className="text-xs text-gray-500 leading-relaxed mb-2">{n.description}</p>

                          <div className="flex items-center gap-3 flex-wrap">
                            {n.accountName && (
                              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                {n.provider && <span>{PROV_EMOJI[n.provider] || ''}</span>}
                                {n.accountName}
                              </span>
                            )}
                            {n.actionLabel && n.actionPath && (
                              <button
                                onClick={() => { markRead([n.id]); navigate(n.actionPath!); }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 transition-colors">
                                {n.actionLabel} <ArrowRight size={10}/>
                              </button>
                            )}

                            {/* Row actions — show on hover */}
                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!n.read && (
                                <button onClick={() => markRead([n.id])}
                                  className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors">
                                  Mark read
                                </button>
                              )}
                              <button onClick={() => dismiss([n.id])}
                                className="text-[10px] font-semibold text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-0.5">
                                <Trash2 size={10}/> Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;
