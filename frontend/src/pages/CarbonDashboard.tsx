// frontend/src/pages/CarbonDashboard.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Leaf, TrendingDown, Award, Globe, Zap, Cloud,
  RefreshCw, Download, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MONTHLY_DATA = [
  { month: 'Sep', co2: 3.8, target: 3.5 },
  { month: 'Oct', co2: 4.1, target: 3.4 },
  { month: 'Nov', co2: 3.6, target: 3.3 },
  { month: 'Dec', co2: 3.9, target: 3.2 },
  { month: 'Jan', co2: 3.2, target: 3.1 },
  { month: 'Feb', co2: 2.9, target: 3.0 },
  { month: 'Mar', co2: 2.4, target: 2.9 },
];

const SERVICE_DATA = [
  { name: 'EC2 Compute',   co2: 0.92, pct: 38, region: 'us-east-1',   savings: 0.18 },
  { name: 'RDS Database',  co2: 0.54, pct: 22, region: 'us-east-1',   savings: 0.08 },
  { name: 'S3 Storage',    co2: 0.31, pct: 13, region: 'us-west-2',   savings: 0.04 },
  { name: 'Lambda',        co2: 0.18, pct: 7,  region: 'us-east-1',   savings: 0.02 },
  { name: 'CloudFront',    co2: 0.22, pct: 9,  region: 'global',      savings: 0.05 },
  { name: 'EKS Cluster',   co2: 0.23, pct: 11, region: 'eu-west-1',   savings: 0.06 },
];

const REGION_PIE = [
  { name: 'us-east-1',    value: 52, color: '#6366f1' },
  { name: 'us-west-2',    value: 18, color: '#3b82f6' },
  { name: 'eu-west-1',    value: 20, color: '#10b981' },
  { name: 'ap-southeast', value: 10, color: '#f59e0b' },
];

const TIPS = [
  { title: 'Migrate to ARM-based instances',       impact: 'High',   co2Savings: '0.18 tCO₂/mo', difficulty: 'Low',  description: 'Graviton3 instances are up to 60% more energy-efficient.' },
  { title: 'Enable S3 Intelligent-Tiering',        impact: 'Medium', co2Savings: '0.04 tCO₂/mo', difficulty: 'Low',  description: 'Reduces storage energy by moving infrequent data to lower-power tiers.' },
  { title: 'Route to green-energy AWS regions',    impact: 'High',   co2Savings: '0.31 tCO₂/mo', difficulty: 'High', description: 'us-gov-west-1, eu-west-1 are powered 100% by renewable energy.' },
  { title: 'Consolidate small Lambda functions',   impact: 'Low',    co2Savings: '0.02 tCO₂/mo', difficulty: 'Low',  description: 'Batching improves cold-start efficiency and reduces idle carbon.' },
];

const IMPACT_COLORS: Record<string, string> = { High: '#10b981', Medium: '#f59e0b', Low: '#6366f1' };

export default function CarbonDashboard() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';

  const totalCO2   = 2.4;
  const prevCO2    = 2.9;
  const change     = (((totalCO2 - prevCO2) / prevCO2) * 100).toFixed(1);
  const isImproved = totalCO2 < prevCO2;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: isDark ? '#1f2937' : '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
        <p style={{ fontWeight: 600, color: text, marginBottom: 6 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>{p.name === 'co2' ? 'Actual' : 'Target'}: <strong>{p.value} tCO₂</strong></p>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(16,185,129,0.4)' }}>
              <Leaf size={26} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Carbon Dashboard</h1>
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>Account {accountId} · Cloud CO₂ emissions & ESG reporting</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <Download size={14} /> Export ESG Report
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Award size={14} /> Carbon Offset
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total CO₂ This Month',    value: `${totalCO2} tCO₂`, sub: `${change}% vs last month`, icon: <Cloud size={18} />,       color: '#10b981', bg: 'rgba(16,185,129,0.08)', positive: isImproved },
            { label: 'Equivalent Trees Needed', value: '112',               sub: 'to offset monthly emissions', icon: <Leaf size={18} />,         color: '#10b981', bg: 'rgba(16,185,129,0.08)', positive: true  },
            { label: 'Carbon Intensity',        value: '0.12 kg/$ ',        sub: 'vs industry avg 0.19',        icon: <Zap size={18} />,          color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  positive: true  },
            { label: 'Renewable Energy %',      value: '64%',               sub: 'regions use clean energy',    icon: <Globe size={18} />,        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  positive: true  },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: 10, color: s.positive ? '#10b981' : '#f59e0b', margin: 0 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 18 }}>

          {/* Trend Chart */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>CO₂ Emissions Trend</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: muted }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />Actual</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: muted }}><div style={{ width: 10, height: 3, background: '#6366f1' }} />Target</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: muted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[2, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="co2"    stroke="#10b981" fill="url(#co2grad)"          strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                <Area type="monotone" dataKey="target" stroke="#6366f1" fill="none" strokeDasharray="5,3" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Region Breakdown */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Emissions by Region</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <PieChart width={160} height={160}>
                <Pie data={REGION_PIE} cx={75} cy={75} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {REGION_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </div>
            {REGION_PIE.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                  <span style={{ fontSize: 12, color: muted }}>{r.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{r.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Breakdown */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20, marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>CO₂ by Service</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SERVICE_DATA.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <p style={{ fontSize: 12, color: muted, width: 130, flexShrink: 0, margin: 0 }}>{s.name}</p>
                <div style={{ flex: 1, background: gridColor, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 99, transition: 'width 1s ease' }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, width: 70, textAlign: 'right', margin: 0 }}>{s.co2} tCO₂</p>
                <p style={{ fontSize: 11, color: '#10b981', width: 90, textAlign: 'right', margin: 0 }}>-{s.savings} possible</p>
              </div>
            ))}
          </div>
        </div>

        {/* Green Tips */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Leaf size={16} color="#10b981" />
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Green Optimisation Tips</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIPS.map((t, i) => (
              <div key={i} style={{ background: isDark ? '#0d1117' : '#f9fafb', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div onClick={() => setExpandedTip(expandedTip === i ? null : i)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: IMPACT_COLORS[t.impact], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t.title}</p>
                    <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>Impact: {t.impact} · Saves {t.co2Savings} · Difficulty: {t.difficulty}</p>
                  </div>
                  <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{t.co2Savings}</span>
                  {expandedTip === i ? <ChevronUp size={14} style={{ color: muted }} /> : <ChevronDown size={14} style={{ color: muted }} />}
                </div>
                {expandedTip === i && (
                  <div style={{ padding: '0 16px 14px 38px', borderTop: `1px solid ${border}` }}>
                    <p style={{ fontSize: 12, color: muted, margin: '10px 0 0', lineHeight: 1.6 }}>{t.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
