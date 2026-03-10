// frontend/src/pages/TeamBudgetWarrooms.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Users, DollarSign, AlertTriangle, CheckCircle2, X,
  Plus, TrendingUp, TrendingDown, Bell, Lock, Unlock,
  Settings, ChevronRight, RefreshCw, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TeamBudget {
  id: string;
  team: string;
  owner: string;
  avatar: string;
  budget: number;
  spent: number;
  forecast: number;
  period: string;
  status: 'safe' | 'warning' | 'critical' | 'blocked';
  services: { name: string; cost: number }[];
  history: { month: string; spent: number }[];
  autoBlockAt: number;
  alertAt: number;
  members: number;
}

const TEAMS: TeamBudget[] = [
  {
    id: 't1', team: 'Backend Engineering', owner: 'Naveen Kumar', avatar: 'NK', budget: 8000, spent: 7840, forecast: 8900, period: 'March 2026',
    status: 'critical', autoBlockAt: 100, alertAt: 80, members: 12,
    services: [{ name: 'EC2', cost: 4200 }, { name: 'RDS', cost: 1800 }, { name: 'Lambda', cost: 960 }, { name: 'S3', cost: 880 }],
    history: [{ month: 'Nov', spent: 6200 }, { month: 'Dec', spent: 7100 }, { month: 'Jan', spent: 7400 }, { month: 'Feb', spent: 7100 }, { month: 'Mar', spent: 7840 }],
  },
  {
    id: 't2', team: 'Data & Analytics', owner: 'Priya Sharma', avatar: 'PS', budget: 12000, spent: 9600, forecast: 11800, period: 'March 2026',
    status: 'warning', autoBlockAt: 100, alertAt: 80, members: 8,
    services: [{ name: 'BigQuery', cost: 5200 }, { name: 'Dataflow', cost: 2400 }, { name: 'GCS', cost: 1200 }, { name: 'Vertex AI', cost: 800 }],
    history: [{ month: 'Nov', spent: 8100 }, { month: 'Dec', spent: 9200 }, { month: 'Jan', spent: 8900 }, { month: 'Feb', spent: 9100 }, { month: 'Mar', spent: 9600 }],
  },
  {
    id: 't3', team: 'DevOps / Platform', owner: 'Arjun Singh', avatar: 'AS', budget: 15000, spent: 7200, forecast: 9400, period: 'March 2026',
    status: 'safe', autoBlockAt: 100, alertAt: 80, members: 6,
    services: [{ name: 'EKS', cost: 3400 }, { name: 'ECR', cost: 1200 }, { name: 'CloudWatch', cost: 800 }, { name: 'Route53', cost: 1800 }],
    history: [{ month: 'Nov', spent: 6800 }, { month: 'Dec', spent: 7400 }, { month: 'Jan', spent: 6900 }, { month: 'Feb', spent: 7100 }, { month: 'Mar', spent: 7200 }],
  },
  {
    id: 't4', team: 'ML / AI Research', owner: 'Maya Chen', avatar: 'MC', budget: 20000, spent: 20000, forecast: 24000, period: 'March 2026',
    status: 'blocked', autoBlockAt: 100, alertAt: 80, members: 5,
    services: [{ name: 'SageMaker', cost: 9200 }, { name: 'EC2 GPU', cost: 6800 }, { name: 'S3', cost: 2400 }, { name: 'ECR', cost: 1600 }],
    history: [{ month: 'Nov', spent: 14000 }, { month: 'Dec', spent: 16200 }, { month: 'Jan', spent: 18400 }, { month: 'Feb', spent: 19100 }, { month: 'Mar', spent: 20000 }],
  },
  {
    id: 't5', team: 'Frontend / Mobile', owner: 'Lee Park', avatar: 'LP', budget: 3000, spent: 1240, forecast: 1800, period: 'March 2026',
    status: 'safe', autoBlockAt: 100, alertAt: 80, members: 9,
    services: [{ name: 'CloudFront', cost: 640 }, { name: 'S3', cost: 380 }, { name: 'Lambda@Edge', cost: 220 }],
    history: [{ month: 'Nov', spent: 980 }, { month: 'Dec', spent: 1100 }, { month: 'Jan', spent: 1050 }, { month: 'Feb', spent: 1180 }, { month: 'Mar', spent: 1240 }],
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  safe:     { bg: 'rgba(16,185,129,0.08)',  text: '#10b981', label: 'On Track',  border: 'rgba(16,185,129,0.3)'  },
  warning:  { bg: 'rgba(245,158,11,0.08)',  text: '#f59e0b', label: 'Warning',   border: 'rgba(245,158,11,0.3)'  },
  critical: { bg: 'rgba(239,68,68,0.08)',   text: '#ef4444', label: 'Critical',  border: 'rgba(239,68,68,0.3)'   },
  blocked:  { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', label: 'BLOCKED',   border: 'rgba(239,68,68,0.5)'   },
};

const AVATARS_BG = ['#6366f1','#3b82f6','#10b981','#f59e0b','#8b5cf6'];

export default function TeamBudgetWarrooms() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();
  const [teams, setTeams] = useState<TeamBudget[]>(TEAMS);
  const [selected, setSelected] = useState<TeamBudget | null>(null);

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';

  const totalBudget = teams.reduce((s, t) => s + t.budget, 0);
  const totalSpent  = teams.reduce((s, t) => s + t.spent, 0);
  const blockedCount = teams.filter(t => t.status === 'blocked').length;
  const warningCount = teams.filter(t => t.status === 'warning' || t.status === 'critical').length;

  const unblock = (id: string) => setTeams(prev => prev.map(t => t.id === id ? { ...t, status: 'warning' } : t));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: isDark ? '#1f2937' : '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
        <p style={{ fontWeight: 600, color: text, marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#6366f1', margin: 0 }}>${payload[0]?.value?.toLocaleString()}</p>
      </div>
    );
  };

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}>
              <Users size={26} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Team Budget Warrooms</h1>
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>Account {accountId} · Per-team cloud spend control</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Sync Costs
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Add Team
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Budget (March)',   value: `$${totalBudget.toLocaleString()}`,  color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  icon: <DollarSign size={18} /> },
            { label: 'Total Spent (March)',    value: `$${totalSpent.toLocaleString()}`,   color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  icon: <TrendingUp size={18} /> },
            { label: 'Blocked Teams',          value: blockedCount,                        color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   icon: <Lock size={18} /> },
            { label: 'Teams Over 80%',         value: warningCount,                        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: <AlertTriangle size={18} /> },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 18 }}>

          {/* Team Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {teams.map((t, idx) => {
              const pct     = Math.min(100, Math.round((t.spent / t.budget) * 100));
              const sty     = STATUS_STYLES[t.status];
              const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#6366f1';
              return (
                <div key={t.id}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                  style={{
                    background: selected?.id === t.id ? (isDark ? '#1a2540' : '#eef2ff') : card,
                    border: `1px solid ${selected?.id === t.id ? '#3b82f6' : border}`,
                    borderRadius: 16, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: AVATARS_BG[idx % AVATARS_BG.length] + '33', border: `1px solid ${AVATARS_BG[idx % AVATARS_BG.length]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: AVATARS_BG[idx % AVATARS_BG.length], flexShrink: 0 }}>
                      {t.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t.team}</p>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sty.bg, color: sty.text, border: `1px solid ${sty.border}`, fontWeight: 600 }}>{sty.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, margin: 0 }}>Owner: {t.owner} · {t.members} members</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: barColor }}>{pct}%</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>${t.spent.toLocaleString()} / ${t.budget.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Budget Bar */}
                  <div style={{ background: isDark ? '#1f2937' : '#f3f4f6', borderRadius: 99, height: 8, overflow: 'visible', position: 'relative', marginBottom: 10 }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.8s ease', position: 'relative' }}>
                      {pct >= 100 && <div style={{ position: 'absolute', right: -3, top: -3, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: '2px solid white', animation: 'pulse 2s infinite' }} />}
                    </div>
                    {/* Alert marker at 80% */}
                    <div style={{ position: 'absolute', left: '80%', top: -3, width: 2, height: 14, background: '#f59e0b', opacity: 0.6 }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: muted }}>
                      <span>Forecast: <strong style={{ color: t.forecast > t.budget ? '#f87171' : '#10b981' }}>${t.forecast.toLocaleString()}</strong></span>
                      {t.forecast > t.budget && <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 3 }}><TrendingUp size={11} />Over budget by ${(t.forecast - t.budget).toLocaleString()}</span>}
                    </div>
                    {t.status === 'blocked' ? (
                      <button onClick={e => { e.stopPropagation(); unblock(t.id); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        <Unlock size={11} /> Unblock
                      </button>
                    ) : (
                      <button onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 11, cursor: 'pointer' }}>
                        <Settings size={11} /> Configure
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Spend History */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{selected.team}</p>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}><X size={16} /></button>
                </div>

                <p style={{ fontSize: 12, color: muted, margin: '0 0 12px' }}>5-Month Spend History</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={selected.history} barSize={20}>
                    <XAxis dataKey="month" tick={{ fill: muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: muted, fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
                      <div style={{ background: isDark ? '#1f2937' : '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
                        <p style={{ margin: 0, color: text }}>{label}: <strong>${payload[0]?.value?.toLocaleString()}</strong></p>
                      </div>
                    ) : null} />
                    <Bar dataKey="spent" radius={[6,6,0,0]}>
                      {selected.history.map((entry, i) => (
                        <Cell key={i} fill={i === selected.history.length - 1 ? '#3b82f6' : '#3b82f620'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Service Breakdown */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Top Services</p>
                {selected.services.map((s, i) => {
                  const pct = Math.round((s.cost / selected.spent) * 100);
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: muted }}>{s.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>${s.cost.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div style={{ background: isDark ? '#1f2937' : '#f3f4f6', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alert Config */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Budget Controls</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Alert at',    value: selected.alertAt,    color: '#f59e0b' },
                    { label: 'Auto-block at', value: selected.autoBlockAt, color: '#ef4444' },
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? '#0d1117' : '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, color: muted }}>{c.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.value}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button style={{ padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Bell size={12} /> Notify Team
                  </button>
                  <button style={{ padding: '9px 0', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Settings size={12} /> Edit Limits
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
