// frontend/src/pages/CarbonDashboard.tsx
// CO₂ = cost × 0.000233 tCO₂/$ (EPA/GHG Protocol industry average for cloud).
// Regional renewable % from AWS/Azure 2024 sustainability reports.
// Falls back to static demo data if API is unreachable.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Leaf, TrendingDown, Award, Globe, Zap, Cloud,
  RefreshCw, Download, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API   = import.meta.env.VITE_API_URL || 'https://cloudguard-pro.onrender.com';
const KG_PER_USD = 0.000233; // tCO₂ per USD cloud spend

const REGION_RENEWABLE: Record<string, number> = {
  'us-east-1': 54, 'us-east-2': 58, 'us-west-1': 68, 'us-west-2': 79,
  'eu-west-1': 100, 'eu-central-1': 72, 'eu-north-1': 100,
  'ap-southeast-1': 24, 'ap-southeast-2': 52, 'ap-northeast-1': 36,
  'global': 60, 'eastus': 55, 'westus': 70, 'westeurope': 82,
};

const TIPS = [
  { title: 'Migrate to ARM-based instances',       impact: 'High',   co2Savings: '~18%',  difficulty: 'Low',  description: 'Graviton3 instances are up to 60% more energy-efficient. Ideal for workloads already running on Linux.' },
  { title: 'Enable S3 Intelligent-Tiering',        impact: 'Medium', co2Savings: '~8%',   difficulty: 'Low',  description: 'Reduces storage energy by moving infrequent data to lower-power tiers with zero retrieval fee.' },
  { title: 'Route to green-energy regions',        impact: 'High',   co2Savings: '~25%',  difficulty: 'High', description: 'eu-west-1, eu-north-1, us-west-2 are powered 79–100% by renewable energy.' },
  { title: 'Consolidate small Lambda functions',   impact: 'Low',    co2Savings: '~4%',   difficulty: 'Low',  description: 'Batching improves cold-start efficiency and reduces idle carbon from rapid invocations.' },
];
const IMPACT_COLORS: Record<string, string> = { High: '#10b981', Medium: '#f59e0b', Low: '#6366f1' };

// ── Static fallback data ───────────────────────────────────────────────────
const DEMO_MONTHLY = [
  { month: 'Sep', co2: 3.8, target: 3.5 }, { month: 'Oct', co2: 4.1, target: 3.4 },
  { month: 'Nov', co2: 3.6, target: 3.3 }, { month: 'Dec', co2: 3.9, target: 3.2 },
  { month: 'Jan', co2: 3.2, target: 3.1 }, { month: 'Feb', co2: 2.9, target: 3.0 },
  { month: 'Mar', co2: 2.4, target: 2.9 },
];
const DEMO_SERVICES = [
  { name: 'EC2 Compute', co2: 0.92, pct: 38, savings: 0.18 },
  { name: 'RDS Database', co2: 0.54, pct: 22, savings: 0.08 },
  { name: 'S3 Storage',   co2: 0.31, pct: 13, savings: 0.04 },
  { name: 'Lambda',       co2: 0.18, pct: 7,  savings: 0.02 },
  { name: 'CloudFront',   co2: 0.22, pct: 9,  savings: 0.05 },
];
const DEMO_REGION_PIE = [
  { name: 'us-east-1', value: 52, color: '#6366f1' },
  { name: 'us-west-2', value: 18, color: '#3b82f6' },
  { name: 'eu-west-1', value: 20, color: '#10b981' },
  { name: 'ap-southeast', value: 10, color: '#f59e0b' },
];
const DEMO_TOTALS = { current: 2.4, prev: 2.9, intensity: '0.12', renewable: 64, trees: 112 };

// ─────────────────────────────────────────────────────────────────────────
export default function CarbonDashboard() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();

  const [loading, setLoading]       = useState(true);
  const [isLive, setIsLive]         = useState(false);
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  // live-data state
  const [monthlyData, setMonthlyData]     = useState(DEMO_MONTHLY);
  const [serviceData, setServiceData]     = useState(DEMO_SERVICES);
  const [regionPie,   setRegionPie]       = useState(DEMO_REGION_PIE);
  const [totals,      setTotals]          = useState(DEMO_TOTALS);

  const bg        = isDark ? '#0b1120' : '#f5f7fa';
  const card      = isDark ? '#111827' : '#ffffff';
  const border    = isDark ? '#1f2937' : '#e5e7eb';
  const text      = isDark ? '#f9fafb' : '#111827';
  const muted     = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';
  const token     = localStorage.getItem('token');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/cloud/accounts/${accountId}/costs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('costs endpoint failed');

      const data: any = await res.json();
      const services: any[]  = data.services   || [];
      const monthly:  any[]  = data.monthlyData || [];
      const currentCost      = data.currentMonthTotal || 0;
      const lastCost         = data.lastMonthTotal    || 0;

      if (!currentCost && !services.length) throw new Error('empty');

      // Convert monthly cost → CO₂
      const liveMonthly = monthly.slice(-7).map((m: any) => ({
        month:  String(m.month || '').slice(0, 3),
        co2:    +(m.total * KG_PER_USD).toFixed(3),
        target: +(m.total * KG_PER_USD * 0.92).toFixed(3),
      }));

      // Convert services → CO₂ breakdown
      const totalCO2 = currentCost * KG_PER_USD;
      const liveServices = services.slice(0, 5).map((s: any) => ({
        name:    s.name,
        co2:     +(s.cost * KG_PER_USD).toFixed(3),
        pct:     currentCost > 0 ? Math.round((s.cost / currentCost) * 100) : 0,
        savings: +(s.cost * KG_PER_USD * 0.2).toFixed(3),
      }));

      // Region pie from service regions
      const regionMap: Record<string, number> = {};
      services.forEach((s: any) => {
        const region = s.region || 'us-east-1';
        regionMap[region] = (regionMap[region] || 0) + s.cost;
      });
      if (!Object.keys(regionMap).length) regionMap['us-east-1'] = currentCost;
      const REGION_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#8b5cf6'];
      const liveRegionPie = Object.entries(regionMap).slice(0, 5).map(([name, cost], i) => ({
        name, value: currentCost > 0 ? Math.round((cost / currentCost) * 100) : 20,
        color: REGION_COLORS[i % REGION_COLORS.length],
      }));

      const avgRenewable = Math.round(
        liveRegionPie.reduce((s, r) => s + (REGION_RENEWABLE[r.name] || 50) * r.value, 0) /
        Math.max(1, liveRegionPie.reduce((s, r) => s + r.value, 0))
      );

      const currentCO2 = +(currentCost * KG_PER_USD).toFixed(3);
      const lastCO2    = +(lastCost    * KG_PER_USD).toFixed(3);
      const intensity  = currentCost > 0 ? (currentCO2 / (currentCost / 1000)).toFixed(2) : '0.12';
      const trees      = Math.round(currentCO2 * 45.4);

      setMonthlyData(liveMonthly.length >= 2 ? liveMonthly : DEMO_MONTHLY);
      setServiceData(liveServices.length     ? liveServices  : DEMO_SERVICES);
      setRegionPie(liveRegionPie.length      ? liveRegionPie : DEMO_REGION_PIE);
      setTotals({ current: currentCO2, prev: lastCO2, intensity, renewable: avgRenewable, trees });
      setIsLive(true);
    } catch {
      setMonthlyData(DEMO_MONTHLY);
      setServiceData(DEMO_SERVICES);
      setRegionPie(DEMO_REGION_PIE);
      setTotals(DEMO_TOTALS);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [accountId]);

  const change     = totals.prev > 0 ? (((totals.current - totals.prev) / totals.prev) * 100).toFixed(1) : '0.0';
  const isImproved = totals.current <= totals.prev;

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
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>
                {loading ? 'Loading…' : isLive
                  ? `Live CO₂ data · estimated from $${(totals.current / KG_PER_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })} cloud spend`
                  : 'Demo data · connect account for live emissions'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLive && !loading && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', alignSelf: 'center' }}>Demo mode</span>
            )}
            <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Award size={14} /> Export ESG Report
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total CO₂ This Month',    value: loading ? '—' : `${totals.current} tCO₂`, sub: `${change}% vs last month`,           icon: <Cloud size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)', positive: isImproved },
            { label: 'Equivalent Trees Needed', value: loading ? '—' : totals.trees.toString(),   sub: 'to offset monthly emissions',         icon: <Leaf size={18} />,  color: '#10b981', bg: 'rgba(16,185,129,0.08)', positive: true },
            { label: 'Carbon Intensity',        value: loading ? '—' : `${totals.intensity} kg/$k`, sub: 'vs industry avg 0.233 kg/$k',      icon: <Zap size={18} />,   color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  positive: true },
            { label: 'Renewable Energy %',      value: loading ? '—' : `${totals.renewable}%`,    sub: 'weighted by region spend',            icon: <Globe size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  positive: true },
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: muted }}><div style={{ width: 10, height: 3, background: '#6366f1' }} />Target (−8%/mo)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="co2"    stroke="#10b981" fill="url(#co2grad)" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                <Area type="monotone" dataKey="target" stroke="#6366f1" fill="none" strokeDasharray="5,3" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Region Breakdown */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Emissions by Region</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <PieChart width={160} height={160}>
                <Pie data={regionPie} cx={75} cy={75} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {regionPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </div>
            {regionPie.map((r, i) => (
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
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>
            CO₂ by Service{isLive ? ' (estimated from spend)' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {serviceData.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <p style={{ fontSize: 12, color: muted, width: 140, flexShrink: 0, margin: 0 }}>{s.name}</p>
                <div style={{ flex: 1, background: gridColor, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 99, transition: 'width 1s ease' }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, width: 70, textAlign: 'right', margin: 0 }}>{s.co2} tCO₂</p>
                <p style={{ fontSize: 11, color: '#10b981', width: 90, textAlign: 'right', margin: 0 }}>−{s.savings} possible</p>
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
                    <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>Impact: {t.impact} · Saves {t.co2Savings} CO₂ · Difficulty: {t.difficulty}</p>
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
