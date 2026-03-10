// src/pages/Onboarding.tsx
// First-time user onboarding wizard — 5 steps
// Triggers after first login (when user.onboardingComplete !== true)
// Steps: Welcome → Connect Cloud → Set Budget → Invite Team → Done

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud, DollarSign, Users, CheckCircle, ArrowRight,
  ArrowLeft, Zap, Shield, TrendingDown, Plus, X,
  AlertCircle, Loader2, ChevronRight, Sparkles,
  Server, Check, Eye, EyeOff,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
interface CloudProvider {
  id: 'aws' | 'azure' | 'gcp';
  name: string; emoji: string; color: string; bg: string;
  ring: string; helpUrl: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean; textarea?: boolean }[];
}

interface TeamInvite { email: string; role: 'admin' | 'viewer' | 'editor'; }

// ─── GCP Google G logo ────────────────────────────────────────────────────────
const GoogleG: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#4285F4" d="M44.5 20H24v8h11.7C34.2 33.6 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.1 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.1-2.7-.5-4z"/>
    <path fill="#EA4335" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.1 5.1 29.3 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z"/>
    <path fill="#FBBC05" d="M24 45c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 36.5 26.9 37 24 37c-5.5 0-10.2-3.4-11.7-8.2l-6.6 5.1C9.4 40.5 16.2 45 24 45z"/>
    <path fill="#34A853" d="M44.5 20H24v8h11.7c-.7 2.1-1.9 3.9-3.5 5.2l6.2 5.2C41.7 35.5 45 30.2 45 24c0-1.3-.1-2.7-.5-4z"/>
  </svg>
);

// ─── constants ────────────────────────────────────────────────────────────────
const PROVIDERS: CloudProvider[] = [
  {
    id: 'aws', name: 'Amazon Web Services', emoji: '☁️', color: '#ea580c',
    bg: '#fff7ed', ring: '#fed7aa', helpUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html',
    fields: [
      { key:'accessKeyId',     label:'Access Key ID',         placeholder:'AKIAIOSFODNN7EXAMPLE' },
      { key:'secretAccessKey', label:'Secret Access Key',     placeholder:'wJalrXUtnFEMI/K7MDENG...', secret:true },
      { key:'region',          label:'Default Region',        placeholder:'us-east-1' },
      { key:'accountName',     label:'Account Nickname',      placeholder:'My AWS Production' },
    ],
  },
  {
    id: 'azure', name: 'Microsoft Azure', emoji: '🔷', color: '#2563eb',
    bg: '#eff6ff', ring: '#bfdbfe', helpUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals',
    fields: [
      { key:'tenantId',       label:'Tenant ID',       placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key:'clientId',       label:'Client ID',       placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key:'clientSecret',   label:'Client Secret',   placeholder:'your-client-secret', secret:true },
      { key:'subscriptionId', label:'Subscription ID', placeholder:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key:'accountName',    label:'Account Nickname',placeholder:'My Azure Corp' },
    ],
  },
  {
    id: 'gcp', name: 'Google Cloud Platform', emoji: '🌐', color: '#4285F4',
    bg: '#eff6ff', ring: '#bfdbfe', helpUrl: 'https://cloud.google.com/iam/docs/service-accounts-create',
    fields: [
      { key:'accountName',       label:'Account Nickname',        placeholder:'My GCP Project' },
      { key:'serviceAccountKey', label:'Service Account JSON Key', placeholder:'', secret:true, textarea:true },
    ],
  },
];

// ─── Endpoint map ─────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:3000"}';
const CONNECT_ENDPOINTS: Record<string, string> = {
  aws:   `${API}/api/cloud/accounts/aws/connect`,
  azure: `${API}/api/cloud/accounts/azure/connect`,
  gcp:   `${API}/api/cloud/accounts/gcp/connect`,
};

// ─── Build request body per provider ─────────────────────────────────────────
function buildBody(provider: CloudProvider, fields: Record<string, string>): Record<string, any> {
  if (provider.id === 'gcp') {
    let keyJson: any;
    try { keyJson = JSON.parse(fields.serviceAccountKey || '{}'); } catch { keyJson = {}; }
    return { accountName: fields.accountName, serviceAccountKey: keyJson };
  }
  return { ...fields };
}

const ROLES = [
  { id:'admin',  label:'Admin',  desc:'Full access — can connect accounts, manage team, view all data' },
  { id:'editor', label:'Editor', desc:'Can view and interact with data, but cannot manage team or billing' },
  { id:'viewer', label:'Viewer', desc:'Read-only access to dashboards and reports' },
];

const BUDGET_PRESETS = [500, 1000, 2500, 5000, 10000];

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────
const StepDot: React.FC<{ active: boolean; done: boolean; n: number }> = ({ active, done, n }) => (
  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
    done   ? 'bg-indigo-600 text-white' :
    active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
             'bg-gray-100 text-gray-400'
  }`}>
    {done ? <Check size={14}/> : n}
  </div>
);

const STEPS = [
  { label: 'Welcome',       icon: Sparkles   },
  { label: 'Connect Cloud', icon: Cloud      },
  { label: 'Set Budget',    icon: DollarSign },
  { label: 'Invite Team',   icon: Users      },
  { label: 'All Set!',      icon: CheckCircle},
];

// ─── GCP JSON textarea sub-component ─────────────────────────────────────────
const GCPKeyInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  parsedProject: string;
  onProjectDetected: (p: string) => void;
}> = ({ value, onChange, parsedProject, onProjectDetected }) => {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState('');
  const [showJson, setShowJson] = React.useState(false);

  const tryParse = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.project_id) onProjectDetected(parsed.project_id);
    } catch (_) {}
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      onChange(content);
      tryParse(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      onChange(content);
      tryParse(content);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all mb-3 ${
          fileName
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        {fileName ? (
          <>
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">{fileName}</span>
            <span className="text-[10px] text-gray-400">Click to replace</span>
          </>
        ) : (
          <>
            <span className="text-gray-400 text-lg">📂</span>
            <span className="text-xs font-semibold text-gray-600">Drop .json key file here</span>
            <span className="text-[10px] text-gray-400">or click to browse</span>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] font-bold text-gray-400">OR PASTE JSON</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          rows={4}
          value={showJson ? value : (value ? '•'.repeat(Math.min(value.length, 60)) + '…' : '')}
          onChange={e => { if (showJson) { onChange(e.target.value); tryParse(e.target.value); }}}
          onFocus={() => setShowJson(true)}
          placeholder={'{\n  "type": "service_account",\n  "project_id": "my-project",\n  ...\n}'}
          className="w-full px-3.5 py-2.5 pr-10 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white text-gray-900 font-mono resize-none placeholder-gray-300 transition-all"
        />
        <button
          type="button"
          onClick={() => setShowJson(v => !v)}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
        >
          {showJson ? <EyeOff size={13}/> : <Eye size={13}/>}
        </button>
      </div>

      {parsedProject && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-semibold">
          <CheckCircle size={11} /> Detected project: <span className="font-mono">{parsedProject}</span>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-2">
        Encrypted with AES-256 before storage. Your key never leaves your server.
      </p>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Onboarding: React.FC = () => {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const token     = localStorage.getItem('accessToken');
  const hdrs      = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [step,            setStep]            = useState(0);
  const [animDir,         setAnimDir]         = useState<'forward'|'back'>('forward');
  const [visible,         setVisible]         = useState(true);

  // Step 1 — provider selection + connect
  const [selectedProv,      setSelectedProv]      = useState<CloudProvider | null>(null);
  const [provFields,        setProvFields]        = useState<Record<string,string>>({});
  const [gcpParsedProject,  setGcpParsedProject]  = useState('');
  const [showSecrets,       setShowSecrets]       = useState<Record<string,boolean>>({});
  const [connecting,        setConnecting]        = useState(false);
  const [connectError,      setConnectError]      = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState<{name:string;provider:string;emoji:string}[]>([]);

  // Step 2 — budget
  const [budgetAmount,    setBudgetAmount]    = useState('1000');
  const [budgetPeriod,    setBudgetPeriod]    = useState<'monthly'|'quarterly'>('monthly');
  const [budgetAlert,     setBudgetAlert]     = useState('80');
  const [savingBudget,    setSavingBudget]    = useState(false);

  // Step 3 — team
  const [invites,         setInvites]         = useState<TeamInvite[]>([{ email:'', role:'viewer' }]);
  const [sendingInvites,  setSendingInvites]  = useState(false);
  const [inviteErrors,    setInviteErrors]    = useState<Record<number,string>>({});

  // ── navigation ──
  const goTo = (target: number) => {
    const dir = target > step ? 'forward' : 'back';
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => { setStep(target); setVisible(true); }, 180);
  };

  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);

  // ── Step 1: Connect Cloud ──
  const handleConnect = async () => {
    if (!selectedProv) return;

    // Validate all fields
    for (const f of selectedProv.fields) {
      if (!provFields[f.key]?.trim()) {
        setConnectError(`${f.label} is required`);
        return;
      }
    }

    // Extra GCP JSON validation
    if (selectedProv.id === 'gcp') {
      try {
        const parsed = JSON.parse(provFields.serviceAccountKey || '');
        if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
          setConnectError('Invalid service account JSON — must contain project_id, client_email, and private_key');
          return;
        }
      } catch (_) {
        setConnectError('Invalid JSON — please check the service account key file');
        return;
      }
    }

    setConnecting(true); setConnectError('');
    try {
      const endpoint = CONNECT_ENDPOINTS[selectedProv.id];
      const body     = buildBody(selectedProv, provFields);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.error || `Connection failed (${res.status})`);

      const displayName = provFields.accountName ||
        (selectedProv.id === 'gcp' ? gcpParsedProject : '') ||
        selectedProv.name;

      setConnectedAccounts(prev => [...prev, {
        name:     displayName,
        provider: selectedProv.id.toUpperCase(),
        emoji:    selectedProv.emoji,
      }]);
      setSelectedProv(null);
      setProvFields({});
      setGcpParsedProject('');
    } catch (e: any) {
      setConnectError(e.message || 'Failed to connect account');
    }
    setConnecting(false);
  };

  const selectProvider = (p: CloudProvider) => {
    setSelectedProv(p);
    setConnectError('');
    setProvFields({});
    setGcpParsedProject('');
    setShowSecrets({});
  };

  // ── Step 2: Budget ──
  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      await fetch(`${API}/api/budgets/create`, {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({
          userId: user.id, name: 'Monthly Cloud Budget',
          amount: Number(budgetAmount), period: budgetPeriod,
          alertThreshold: Number(budgetAlert),
        }),
      });
    } catch (_) { /* non-blocking — proceed anyway */ }
    setSavingBudget(false);
    next();
  };

  // ── Step 3: Invite Team ──
  const handleSendInvites = async () => {
    const valid = invites.filter(i => i.email.trim());
    if (valid.length === 0) { next(); return; }

    const errors: Record<number,string> = {};
    valid.forEach((inv, idx) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email))
        errors[idx] = 'Invalid email address';
    });
    if (Object.keys(errors).length > 0) { setInviteErrors(errors); return; }

    setSendingInvites(true);
    try {
      await fetch(`${API}/api/team/invite`, {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ invites: valid, invitedBy: user.id }),
      });
    } catch (_) { /* non-blocking */ }
    setSendingInvites(false);
    next();
  };

  // ── Step 4: Complete onboarding ──
  const handleFinish = async () => {
    try {
      await fetch(`${API}/api/users/${user.id}/onboarding-complete`, {
        method: 'POST', headers: hdrs,
      });
      const updated = { ...user, onboardingComplete: true };
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (_) {}
    navigate('/dashboard');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/20 flex flex-col items-center justify-center p-4"
      style={{ fontFamily:"'DM Sans','Sora',system-ui,sans-serif" }}>

      {/* Subtle background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-200/20 blur-3xl"/>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-200/20 blur-3xl"/>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <Zap size={18} className="text-white"/>
        </div>
        <span className="text-lg font-bold text-gray-900">CloudGuard Pro</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 z-10">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <StepDot active={step===i} done={step>i} n={i+1}/>
              <span className={`text-[10px] font-semibold hidden sm:block transition-colors ${
                step===i ? 'text-indigo-600' : step>i ? 'text-gray-500' : 'text-gray-300'
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mb-5 mx-1 transition-all duration-500 ${step>i ? 'bg-indigo-600' : 'bg-gray-200'}`}/>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Card */}
      <div
        className={`w-full max-w-xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-gray-100 z-10 transition-all duration-180 ${
          visible ? 'opacity-100 translate-y-0' : animDir==='forward' ? 'opacity-0 translate-y-3' : 'opacity-0 -translate-y-3'
        }`}>

        {/* ── STEP 0: WELCOME ── */}
        {step === 0 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200">
              <Sparkles size={28} className="text-white"/>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Let's get your CloudGuard Pro workspace set up in just a few minutes.<br/>
              We'll connect your cloud accounts, set a budget, and invite your team.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Cloud,       color:'bg-indigo-50', iconColor:'text-indigo-500', label:'Multi-cloud visibility'  },
                { icon: TrendingDown,color:'bg-emerald-50',iconColor:'text-emerald-500',label:'Cost optimization'       },
                { icon: Shield,      color:'bg-orange-50', iconColor:'text-orange-500', label:'Security posture'        },
              ].map((f,i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className={`${f.color} rounded-2xl p-4 flex flex-col items-center gap-2`}>
                    <Icon size={20} className={f.iconColor}/>
                    <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{f.label}</p>
                  </div>
                );
              })}
            </div>

            <button onClick={next}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md shadow-indigo-200 text-sm">
              Let's get started <ArrowRight size={16}/>
            </button>
            <button onClick={handleFinish} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Skip setup — go to dashboard
            </button>
          </div>
        )}

        {/* ── STEP 1: CONNECT CLOUD ── */}
        {step === 1 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Connect your cloud</h2>
              <p className="text-sm text-gray-400 mt-1">Connect at least one cloud account to get started. You can add more later.</p>
            </div>

            {/* Already connected */}
            {connectedAccounts.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connected</p>
                {connectedAccounts.map((acc, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <span className="text-xl">{acc.emoji}</span>
                    <span className="text-sm font-semibold text-gray-800 flex-1">{acc.name}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{acc.provider}</span>
                    <CheckCircle size={16} className="text-emerald-500"/>
                  </div>
                ))}
              </div>
            )}

            {/* Provider picker */}
            {!selectedProv ? (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {connectedAccounts.length > 0 ? 'Add another' : 'Choose provider'}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => selectProvider(p)}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                      {p.id === 'gcp'
                        ? <GoogleG size={28}/>
                        : <span className="text-3xl">{p.emoji}</span>
                      }
                      <span className="text-xs font-semibold text-gray-700 text-center leading-tight group-hover:text-indigo-700">
                        {p.id === 'aws' ? 'AWS' : p.id === 'azure' ? 'Azure' : 'GCP'}
                      </span>
                      <span className="text-[10px] text-gray-400 text-center leading-tight">
                        {p.id === 'aws' ? 'Access Key' : p.id === 'azure' ? 'Service Principal' : 'Service Account JSON'}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Credential form */
              <div>
                <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl border border-gray-100 bg-gray-50">
                  {selectedProv.id === 'gcp'
                    ? <GoogleG size={24}/>
                    : <span className="text-2xl">{selectedProv.emoji}</span>
                  }
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{selectedProv.name}</p>
                    <a href={selectedProv.helpUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-indigo-500 hover:text-indigo-600">How to get credentials →</a>
                  </div>
                  <button onClick={() => { setSelectedProv(null); setConnectError(''); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                    <X size={14}/>
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedProv.fields.map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">{f.label}</label>

                      {/* GCP JSON key gets the file upload + textarea treatment */}
                      {f.textarea ? (
                        <GCPKeyInput
                          value={provFields.serviceAccountKey || ''}
                          onChange={v => setProvFields(p => ({ ...p, serviceAccountKey: v }))}
                          parsedProject={gcpParsedProject}
                          onProjectDetected={proj => {
                            setGcpParsedProject(proj);
                            setProvFields(p => ({ ...p, accountName: p.accountName || proj }));
                          }}
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type={f.secret && !showSecrets[f.key] ? 'password' : 'text'}
                            value={provFields[f.key] || ''}
                            onChange={e => setProvFields(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white text-gray-900 placeholder-gray-400 transition-all"
                          />
                          {f.secret && (
                            <button type="button"
                              onClick={() => setShowSecrets(p => ({ ...p, [f.key]: !p[f.key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showSecrets[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {connectError && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={13} className="text-red-500 flex-shrink-0"/>
                    <p className="text-xs text-red-600">{connectError}</p>
                  </div>
                )}

                <button onClick={handleConnect} disabled={connecting}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-200">
                  {connecting
                    ? <><Loader2 size={15} className="animate-spin"/> Verifying & connecting…</>
                    : <>Connect {selectedProv.id === 'gcp' ? 'GCP' : selectedProv.id === 'aws' ? 'AWS' : 'Azure'} <ArrowRight size={14}/></>
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: SET BUDGET ── */}
        {step === 2 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Set your cloud budget</h2>
              <p className="text-sm text-gray-400 mt-1">We'll alert you before you exceed it and help you stay on track.</p>
            </div>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick select</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {BUDGET_PRESETS.map(p => (
                <button key={p} onClick={() => setBudgetAmount(String(p))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    budgetAmount === String(p)
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Custom amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
                <input type="number" min="0" value={budgetAmount}
                  onChange={e => setBudgetAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white text-gray-900 font-semibold"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Period</label>
              <div className="flex gap-2">
                {(['monthly','quarterly'] as const).map(p => (
                  <button key={p} onClick={() => setBudgetPeriod(p)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                      budgetPeriod === p ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{p}</button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Alert me at <span className="text-indigo-600">{budgetAlert}%</span> of budget
              </label>
              <input type="range" min="50" max="95" step="5" value={budgetAlert}
                onChange={e => setBudgetAlert(e.target.value)}
                className="w-full accent-indigo-600"/>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>50%</span><span>70%</span><span>80%</span><span>95%</span>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-700">Alert triggers at</p>
                <p className="text-lg font-bold text-indigo-800">
                  ${(Number(budgetAmount) * Number(budgetAlert) / 100).toLocaleString(undefined,{maximumFractionDigits:0})}
                  <span className="text-sm font-normal text-indigo-500"> / {budgetPeriod === 'monthly' ? 'mo' : 'qtr'}</span>
                </p>
              </div>
              <DollarSign size={24} className="text-indigo-300"/>
            </div>

            <button onClick={handleSaveBudget} disabled={savingBudget || !budgetAmount}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md shadow-indigo-200">
              {savingBudget ? <><Loader2 size={15} className="animate-spin"/> Saving…</> : <>Save budget <ArrowRight size={14}/></>}
            </button>
          </div>
        )}

        {/* ── STEP 3: INVITE TEAM ── */}
        {step === 3 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Invite your team</h2>
              <p className="text-sm text-gray-400 mt-1">Add teammates so they can monitor and manage cloud costs together.</p>
            </div>

            <div className="space-y-3 mb-4">
              {invites.map((inv, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="email" placeholder="colleague@company.com"
                      value={inv.email}
                      onChange={e => setInvites(prev => prev.map((x,j) => j===i ? {...x, email:e.target.value} : x))}
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white text-gray-900 placeholder-gray-400 transition-all ${
                        inviteErrors[i] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {inviteErrors[i] && <p className="text-xs text-red-500">{inviteErrors[i]}</p>}
                  </div>
                  <select
                    value={inv.role}
                    onChange={e => setInvites(prev => prev.map((x,j) => j===i ? {...x, role:e.target.value as any} : x))}
                    className="px-3 py-2.5 text-xs font-semibold border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer">
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {invites.length > 1 && (
                    <button onClick={() => setInvites(prev => prev.filter((_,j) => j!==i))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={14}/>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setInvites(prev => [...prev, { email:'', role:'viewer' }])}
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 mb-6 transition-colors">
              <Plus size={14}/> Add another
            </button>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-2">
              {ROLES.map(r => (
                <div key={r.id} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0 pt-0.5">{r.label}</span>
                  <span className="text-xs text-gray-400 leading-relaxed">{r.desc}</span>
                </div>
              ))}
            </div>

            <button onClick={handleSendInvites} disabled={sendingInvites}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md shadow-indigo-200">
              {sendingInvites
                ? <><Loader2 size={15} className="animate-spin"/> Sending invites…</>
                : invites.every(i => !i.email.trim())
                  ? <>Skip for now <ArrowRight size={14}/></>
                  : <>Send invites <ArrowRight size={14}/></>
              }
            </button>
          </div>
        )}

        {/* ── STEP 4: ALL SET ── */}
        {step === 4 && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-200">
              <CheckCircle size={36} className="text-white"/>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set! 🎉</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              CloudGuard Pro is ready. Your cloud accounts are being synced — this usually takes a minute or two.
            </p>

            <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3">
              {connectedAccounts.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Cloud size={13} className="text-indigo-600"/>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{connectedAccounts.length} account{connectedAccounts.length>1?'s':''} connected</p>
                    <p className="text-xs text-gray-400">{connectedAccounts.map(a=>`${a.emoji} ${a.name}`).join(', ')}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={13} className="text-emerald-600"/>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">Budget set</p>
                  <p className="text-xs text-gray-400">${Number(budgetAmount).toLocaleString()} {budgetPeriod} · alert at {budgetAlert}%</p>
                </div>
              </div>
              {invites.some(i => i.email.trim()) && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Users size={13} className="text-violet-600"/>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">Team invites sent</p>
                    <p className="text-xs text-gray-400">{invites.filter(i=>i.email.trim()).length} invite{invites.filter(i=>i.email.trim()).length>1?'s':''}</p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleFinish}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200">
              Go to Dashboard <ArrowRight size={16}/>
            </button>
          </div>
        )}

        {/* Nav footer */}
        {step > 0 && step < 4 && (
          <div className="px-8 pb-6 flex items-center justify-between">
            <button onClick={back}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={14}/> Back
            </button>
            <span className="text-xs text-gray-300 font-medium">Step {step} of {STEPS.length - 1}</span>
            {(step === 1 || step === 3) && (
              <button onClick={next} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Skip
              </button>
            )}
            {step === 2 && <div className="w-8"/>}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400 z-10">
        Secured with end-to-end encryption · Your credentials are never stored in plaintext
      </p>
    </div>
  );
};

export default Onboarding;
