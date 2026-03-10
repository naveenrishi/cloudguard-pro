// src/pages/Settings.tsx
// Full settings page — tabs: Profile · Security · Notifications · Cloud Accounts · Team · Billing

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  User, Shield, Bell, Cloud, Users, CreditCard,
  Save, Eye, EyeOff, Check, X, Plus, Trash2,
  AlertCircle, Loader2, Camera, Edit2, LogOut,
  Key, Smartphone, Mail, Globe, ChevronRight,
  RefreshCw, AlertTriangle, DollarSign, Server,
  Download, ExternalLink, CheckCircle,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
interface ConnectedAccount {
  id: string; accountName: string; provider: 'AWS' | 'AZURE' | 'GCP';
  region?: string; status: 'connected' | 'error' | 'syncing';
  lastSync?: string; resourceCount?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const PROV_META: Record<string, { emoji: string; color: string; bg: string; ring: string }> = {
  AWS:   { emoji:'☁️',  color:'#ea580c', bg:'#fff7ed', ring:'#fed7aa' },
  AZURE: { emoji:'🔷', color:'#2563eb', bg:'#eff6ff', ring:'#bfdbfe' },
  GCP:   { emoji:'🌐', color:'#059669', bg:'#ecfdf5', ring:'#a7f3d0' },
};

const STATUS_META = {
  connected: { label:'Connected',  cls:'bg-emerald-50 text-emerald-700' },
  error:     { label:'Error',      cls:'bg-red-50 text-red-600'         },
  syncing:   { label:'Syncing…',   cls:'bg-amber-50 text-amber-600'     },
};

// ─── NAV TABS ─────────────────────────────────────────────────────────────────
const TABS = [
  { id:'profile',       label:'Profile',        icon: User         },
  { id:'security',      label:'Security',       icon: Shield       },
  { id:'notifications', label:'Notifications',  icon: Bell         },
  { id:'accounts',      label:'Cloud Accounts', icon: Cloud        },
  { id:'team',          label:'Team',           icon: Users        },
  { id:'billing',       label:'Billing',        icon: CreditCard   },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── SAVE TOAST ───────────────────────────────────────────────────────────────
const SaveToast: React.FC<{ show: boolean; message?: string }> = ({ show, message = 'Changes saved' }) => (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-2xl shadow-xl transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
    <CheckCircle size={15} className="text-emerald-400"/>
    {message}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Settings: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const token     = localStorage.getItem('accessToken');
  const hdrs      = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Honour ?tab= query param (e.g. from "Manage preferences" in NotificationsPanel)
  const params    = new URLSearchParams(location.search);
  const initTab   = (params.get('tab') as TabId) || 'profile';

  const [activeTab, setActiveTab] = useState<TabId>(initTab);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(false);
  const [toastMsg,  setToastMsg]  = useState('Changes saved');

  const showToast = (msg = 'Changes saved') => {
    setToastMsg(msg); setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const save = async (endpoint: string, body: object) => {
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/${endpoint}`, {
        method: 'PUT', headers: hdrs, body: JSON.stringify(body),
      });
    } catch (_) {}
    setSaving(false);
    showToast();
  };

  // ── Profile ──
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState({
    name:     storedUser.name     || '',
    email:    storedUser.email    || '',
    phone:    storedUser.phone    || '',
    company:  storedUser.company  || '',
    timezone: storedUser.timezone || 'UTC',
    language: storedUser.language || 'en',
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/users/${storedUser.id}`, {
        method:'PUT', headers: hdrs, body: JSON.stringify(profile),
      });
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...profile }));
    } catch (_) {}
    setSaving(false);
    showToast();
  };

  // ── Security ──
  const [passwords, setPasswords] = useState({ current:'', newPass:'', confirm:'' });
  const [showPw,    setShowPw]    = useState({ current:false, newPass:false, confirm:false });
  const [pwError,   setPwError]   = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(storedUser.mfaEnabled ?? false);

  const handleChangePassword = async () => {
    if (passwords.newPass !== passwords.confirm) { setPwError('Passwords do not match'); return; }
    if (passwords.newPass.length < 8)            { setPwError('Minimum 8 characters');   return; }
    setPwError('');
    await save(`users/${storedUser.id}/password`, { currentPassword: passwords.current, newPassword: passwords.newPass });
    setPasswords({ current:'', newPass:'', confirm:'' });
  };

  // ── Notifications ──
  const [notifPrefs, setNotifPrefs] = useState({
    costSpikes:     true,  securityAlerts: true,  optimizations:  true,
    weeklyReport:   true,  monthlyReport:  true,  systemUpdates:  false,
    emailEnabled:   true,  slackEnabled:   false, browserEnabled: true,
    slackWebhook:   '',
  });

  // ── Cloud Accounts ──
  const [accounts,       setAccounts]       = useState<ConnectedAccount[]>([]);
  const [loadingAccounts,setLoadingAccounts] = useState(true);
  const [deleteConfirmId,setDeleteConfirmId] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('http://localhost:3000/api/cloud/accounts/', { headers: hdrs });
        if (r.ok) {
          const d = await r.json();
          const list = Array.isArray(d) ? d : (d.accounts || []);
          setAccounts(list.map((a: any) => ({
            id: a.id, accountName: a.accountName, provider: a.provider,
            region: a.region, status: a.status || 'connected',
            lastSync: a.lastSync || a.updatedAt, resourceCount: a.resourceCount,
          })));
        }
      } catch (_) {
        // demo data
        setAccounts([
          { id:'1', accountName:'AWS Production', provider:'AWS',   region:'us-east-1', status:'connected', lastSync:'2 min ago',  resourceCount:1247 },
          { id:'2', accountName:'Azure Corp',     provider:'AZURE', region:'East US',   status:'connected', lastSync:'5 min ago',  resourceCount:847  },
          { id:'3', accountName:'AWS Staging',    provider:'AWS',   region:'us-west-2', status:'syncing',   lastSync:'Syncing…',   resourceCount:312  },
        ]);
      }
      setLoadingAccounts(false);
    })();
  }, []);

  const handleDisconnect = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setDeleteConfirmId(null);
    try { await fetch(`http://localhost:3000/api/cloud/accounts/${id}`, { method:'DELETE', headers: hdrs }); } catch (_) {}
    showToast('Account disconnected');
  };

  const handleSyncAccount = async (id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status:'syncing' } : a));
    try {
      await fetch(`http://localhost:3000/api/cloud/accounts/${id}/sync`, { method:'POST', headers: hdrs });
      setTimeout(() => setAccounts(prev => prev.map(a => a.id === id ? { ...a, status:'connected', lastSync:'Just now' } : a)), 3000);
    } catch (_) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status:'connected' } : a));
    }
  };

  // ── Billing ──
  const [plan] = useState({ name:'Pro', price:'$49', period:'month', nextBilling:'Apr 1, 2026' });
  const PLAN_FEATURES = [
    'Unlimited cloud accounts', 'Advanced cost analytics', 'Security posture scoring',
    'AI-powered recommendations', 'Team collaboration (up to 10)', 'Priority support',
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your account, security, and preferences</p>
        </div>

        <div className="flex gap-6">

          {/* ── LEFT: Tab nav ── */}
          <div className="w-52 flex-shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sticky top-24 space-y-0.5">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}>
                    <Icon size={15}/>
                    {tab.label}
                    {tab.id === 'accounts' && accounts.length > 0 && (
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab===tab.id?'bg-white/25 text-white':'bg-gray-100 text-gray-500'}`}>
                        {accounts.length}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="border-t border-gray-100 pt-2 mt-2">
                <button
                  onClick={() => { localStorage.clear(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
                  <LogOut size={15}/> Sign out
                </button>
              </div>
            </nav>
          </div>

          {/* ── RIGHT: Tab content ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ════════════════════════════════════════════════════════
                TAB: PROFILE
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
              <>
                {/* Avatar card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-5">Profile Photo</h2>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                        {profile.name ? profile.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : 'U'}
                      </div>
                      <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors">
                        <Camera size={12} className="text-white"/>
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{profile.name || 'Your Name'}</p>
                      <p className="text-sm text-gray-400">{profile.email}</p>
                      <p className="text-xs text-gray-300 mt-1">Admin · CloudGuard Pro</p>
                    </div>
                  </div>
                </div>

                {/* Profile fields */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-5">Personal Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key:'name',    label:'Full Name',   placeholder:'Jane Smith',        type:'text'  },
                      { key:'email',   label:'Email',       placeholder:'jane@company.com',  type:'email' },
                      { key:'phone',   label:'Phone',       placeholder:'+1 555 000 0000',   type:'tel'   },
                      { key:'company', label:'Company',     placeholder:'Acme Corp',          type:'text'  },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>
                        <input type={f.type} value={(profile as any)[f.key]}
                          onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white text-gray-900 placeholder-gray-400"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Timezone</label>
                      <select value={profile.timezone} onChange={e => setProfile(p=>({...p,timezone:e.target.value}))}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-900 cursor-pointer">
                        {['UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Kolkata','Australia/Sydney'].map(tz => (
                          <option key={tz} value={tz}>{tz.replace('_',' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Language</label>
                      <select value={profile.language} onChange={e => setProfile(p=>({...p,language:e.target.value}))}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-900 cursor-pointer">
                        {[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['ja','日本語'],['zh','中文']].map(([v,l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button onClick={handleSaveProfile} disabled={saving}
                    className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-indigo-200">
                    {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                    Save profile
                  </button>
                </div>

                {/* Danger zone */}
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
                  <h2 className="font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle size={15}/>Danger Zone</h2>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Delete account</p>
                      <p className="text-xs text-gray-400 mt-0.5">Permanently remove your account and all data. Cannot be undone.</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors flex-shrink-0">
                      Delete account
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════
                TAB: SECURITY
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'security' && (
              <>
                {/* Change password */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Key size={16} className="text-indigo-500"/>Change Password</h2>
                  <div className="space-y-4 max-w-md">
                    {([
                      { key:'current', label:'Current password'  },
                      { key:'newPass', label:'New password'      },
                      { key:'confirm', label:'Confirm new password' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>
                        <div className="relative">
                          <input
                            type={showPw[f.key] ? 'text' : 'password'}
                            value={passwords[f.key]}
                            onChange={e => setPasswords(p => ({...p, [f.key]: e.target.value}))}
                            className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white text-gray-900"
                          />
                          <button type="button" onClick={() => setShowPw(p => ({...p, [f.key]: !p[f.key]}))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPw[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                        </div>
                      </div>
                    ))}
                    {pwError && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle size={13} className="text-red-500"/>
                        <p className="text-xs text-red-600">{pwError}</p>
                      </div>
                    )}
                    <button onClick={handleChangePassword} disabled={saving || !passwords.current || !passwords.newPass}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60">
                      {saving ? <Loader2 size={14} className="animate-spin"/> : <Key size={14}/>}
                      Update password
                    </button>
                  </div>
                </div>

                {/* MFA */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="font-bold text-gray-900 flex items-center gap-2"><Smartphone size={16} className="text-indigo-500"/>Two-Factor Authentication</h2>
                      <p className="text-sm text-gray-400 mt-1">Add an extra layer of security to your account</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${mfaEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {mfaEnabled ? '✓ Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {mfaEnabled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <CheckCircle size={15} className="text-emerald-500"/>
                        <p className="text-sm text-emerald-700 font-medium">Authenticator app is active</p>
                      </div>
                      <button onClick={() => { setMfaEnabled(false); showToast('MFA disabled'); }}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">
                        <X size={13}/> Disable MFA
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => navigate('/setup-mfa')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                      <Smartphone size={14}/> Set up MFA
                    </button>
                  )}
                </div>

                {/* Active sessions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Globe size={16} className="text-indigo-500"/>Active Sessions</h2>
                  <div className="space-y-3">
                    {[
                      { device:'Chrome on macOS', location:'Chennai, IN', time:'Now (current)',   current:true  },
                      { device:'Safari on iPhone', location:'Chennai, IN', time:'2 hours ago',   current:false },
                    ].map((s,i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${s.current ? 'bg-emerald-500' : 'bg-gray-300'}`}/>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{s.device}</p>
                            <p className="text-xs text-gray-400">{s.location} · {s.time}</p>
                          </div>
                        </div>
                        {!s.current && (
                          <button className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            Revoke
                          </button>
                        )}
                        {s.current && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">This device</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════
                TAB: NOTIFICATIONS
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
              <>
                {/* Channels */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-5">Notification Channels</h2>
                  <div className="space-y-3">
                    {[
                      { key:'emailEnabled',   label:'Email',   desc:`Alerts sent to ${profile.email}`,   icon:Mail,       always:true  },
                      { key:'browserEnabled', label:'Browser', desc:'Push notifications in this browser', icon:Bell,       always:false },
                      { key:'slackEnabled',   label:'Slack',   desc:'Post alerts to a Slack channel',     icon:ExternalLink,always:false },
                    ].map(ch => {
                      const Icon = ch.icon;
                      const enabled = (notifPrefs as any)[ch.key];
                      return (
                        <div key={ch.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                              <Icon size={15} className="text-indigo-500"/>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{ch.label}</p>
                              <p className="text-xs text-gray-400">{ch.desc}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => !ch.always && setNotifPrefs(p => ({...p, [ch.key]: !p[ch.key as keyof typeof p]}))}
                            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-200'} ${ch.always ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-6' : 'left-1'}`}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {notifPrefs.slackEnabled && (
                    <div className="mt-4">
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Slack Webhook URL</label>
                      <input type="url" value={notifPrefs.slackWebhook}
                        onChange={e => setNotifPrefs(p=>({...p,slackWebhook:e.target.value}))}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white text-gray-900 placeholder-gray-400"
                      />
                    </div>
                  )}
                </div>

                {/* Alert types */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-5">Alert Types</h2>
                  <div className="space-y-2">
                    {[
                      { key:'costSpikes',     label:'Cost spikes',            desc:'Unusual spend increases vs prior periods',       dot:'bg-red-500'     },
                      { key:'securityAlerts', label:'Security alerts',        desc:'IAM violations, open ports, compliance issues',   dot:'bg-orange-500'  },
                      { key:'optimizations',  label:'Optimization opportunities', desc:'New savings recommendations available',       dot:'bg-indigo-500'  },
                      { key:'weeklyReport',   label:'Weekly digest',          desc:'Summary every Monday at 8am',                    dot:'bg-blue-500'    },
                      { key:'monthlyReport',  label:'Monthly report',         desc:'Full cost & usage report on the 1st',            dot:'bg-violet-500'  },
                      { key:'systemUpdates',  label:'System updates',         desc:'Product news and feature announcements',         dot:'bg-gray-400'    },
                    ].map(al => {
                      const enabled = (notifPrefs as any)[al.key];
                      return (
                        <div key={al.key}
                          onClick={() => setNotifPrefs(p => ({...p, [al.key]: !(p as any)[al.key]}))}
                          className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${al.dot}`}/>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{al.label}</p>
                              <p className="text-xs text-gray-400">{al.desc}</p>
                            </div>
                          </div>
                          <div className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                            <div className={`mt-1 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'ml-6' : 'ml-1'}`}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={() => save(`users/${storedUser.id}/notification-preferences`, notifPrefs)}
                    className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                    {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                    Save preferences
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════
                TAB: CLOUD ACCOUNTS
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'accounts' && (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                    <div>
                      <h2 className="font-bold text-gray-900">Connected Accounts</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{accounts.length} account{accounts.length!==1?'s':''} connected</p>
                    </div>
                    <button onClick={() => navigate('/connect-aws')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                      <Plus size={13}/> Add account
                    </button>
                  </div>

                  {loadingAccounts ? (
                    <div className="p-6 space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-[72px] rounded-2xl bg-gray-100 animate-pulse"/>)}
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                      <Cloud size={32} className="text-gray-200"/>
                      <p className="text-sm text-gray-400 font-medium">No accounts connected yet</p>
                      <button onClick={() => navigate('/connect-aws')}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Connect your first account →</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {accounts.map(acc => {
                        const pm = PROV_META[acc.provider] || PROV_META.AWS;
                        const sm = STATUS_META[acc.status];
                        return (
                          <div key={acc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: pm.bg }}>
                              {pm.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">{acc.accountName}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {acc.provider}{acc.region ? ` · ${acc.region}` : ''}{acc.resourceCount ? ` · ${acc.resourceCount.toLocaleString()} resources` : ''}
                                {acc.lastSync ? ` · Synced ${acc.lastSync}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSyncAccount(acc.id)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                                <RefreshCw size={11} className={acc.status==='syncing'?'animate-spin':''}/> Sync
                              </button>
                              {deleteConfirmId === acc.id ? (
                                <div className="flex gap-1.5">
                                  <button onClick={() => handleDisconnect(acc.id)}
                                    className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-colors">
                                    Confirm
                                  </button>
                                  <button onClick={() => setDeleteConfirmId(null)}
                                    className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirmId(acc.id)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors">
                                  <Trash2 size={11}/> Disconnect
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════
                TAB: TEAM — delegates to SubUsers page
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'team' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-gray-900">Team Management</h2>
                    <p className="text-sm text-gray-400 mt-1">Manage sub-users, roles, and permissions</p>
                  </div>
                  <button onClick={() => navigate('/settings/users')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                    <Users size={13}/> Manage Team <ChevronRight size={13}/>
                  </button>
                </div>

                {/* Quick role summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label:'Total Users',   count:'3', color:'text-gray-900',    bg:'bg-gray-50'    },
                    { label:'Admins',        count:'1', color:'text-indigo-700',  bg:'bg-indigo-50'  },
                    { label:'Analysts',      count:'1', color:'text-blue-700',    bg:'bg-blue-50'    },
                    { label:'Pending',       count:'1', color:'text-amber-700',   bg:'bg-amber-50'   },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.count}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-700 font-medium">Full user management — roles, permissions, invites</p>
                  <button onClick={() => navigate('/settings/users')}
                    className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Open <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                TAB: BILLING
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'billing' && (
              <>
                {/* Current plan */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Current Plan</p>
                      <p className="text-3xl font-bold mt-1">{plan.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{plan.price}<span className="text-base font-normal text-indigo-200">/{plan.period}</span></p>
                      <p className="text-indigo-200 text-xs mt-1">Next billing: {plan.nextBilling}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PLAN_FEATURES.map((f,i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={12} className="text-indigo-300 flex-shrink-0"/>
                        <span className="text-xs text-indigo-100">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button className="flex-1 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                      Upgrade to Enterprise
                    </button>
                    <button className="px-4 py-2.5 bg-indigo-500/40 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500/60 transition-colors">
                      View plans
                    </button>
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-gray-900">Payment Method</h2>
                    <button className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                      <Plus size={13}/> Add card
                    </button>
                  </div>
                  <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                      <CreditCard size={16} className="text-white"/>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Visa ending in 4242</p>
                      <p className="text-xs text-gray-400">Expires 12/27</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Default</span>
                  </div>
                </div>

                {/* Invoice history */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900">Invoice History</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {[
                      { date:'Mar 1, 2026', amount:'$49.00', status:'Paid'    },
                      { date:'Feb 1, 2026', amount:'$49.00', status:'Paid'    },
                      { date:'Jan 1, 2026', amount:'$49.00', status:'Paid'    },
                      { date:'Dec 1, 2025', amount:'$49.00', status:'Paid'    },
                    ].map((inv,i) => (
                      <div key={i} className="flex items-center px-6 py-3.5 hover:bg-gray-50 transition-colors group">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">CloudGuard Pro · {inv.date}</p>
                          <p className="text-xs text-gray-400">Monthly subscription</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 mr-5">{inv.amount}</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full mr-3">{inv.status}</span>
                        <button className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          <Download size={11}/> PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <SaveToast show={toast} message={toastMsg}/>
    </MainLayout>
  );
};

export default Settings;
