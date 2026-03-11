// frontend/src/pages/BlastRadius.tsx
// Real data: fetches /api/cloud/accounts/:accountId/resources + /security.
// Falls back to 7 demo resources if the API is unreachable.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Zap, AlertTriangle, CheckCircle2, Search, RefreshCw,
  Shield, Server, Database, Globe, Cloud, ArrowRight,
  Info, X, ChevronRight, TriangleAlert, Eye
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://cloudguard-pro.onrender.com';

interface Resource {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical';
  provider: string;
  dependents: string[];
  dependencies: string[];
  region: string;
  blastRadius?: number;
}

// ── type normaliser ───────────────────────────────────────────────────────
const resolveType = (raw: string): string => {
  const t = (raw || '').toLowerCase();
  if (t.includes('ec2') || t.includes('instance')) return 'ec2';
  if (t.includes('rds') || t.includes('database') || t.includes('sql')) return 'rds';
  if (t.includes('lambda') || t.includes('function')) return 'lambda';
  if (t.includes('s3') || t.includes('storage') || t.includes('blob')) return 's3';
  if (t.includes('elb') || t.includes('load') || t.includes('alb') || t.includes('gateway')) return 'elb';
  if (t.includes('vpc') || t.includes('network') || t.includes('vnet')) return 'vpc';
  if (t.includes('iam') || t.includes('role') || t.includes('rbac')) return 'iam';
  return 'ec2';
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ec2: <Server size={13} />, rds: <Database size={13} />, lambda: <Zap size={13} />,
  s3: <Cloud size={13} />, elb: <Globe size={13} />, vpc: <Shield size={13} />, iam: <Shield size={13} />,
};
const TYPE_COLORS: Record<string, string> = {
  ec2: '#6366f1', rds: '#3b82f6', lambda: '#f59e0b',
  s3: '#10b981', elb: '#8b5cf6', vpc: '#06b6d4', iam: '#ef4444',
};
const STATUS_COLORS: Record<string, string> = { healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444' };

// ── demo fallback ─────────────────────────────────────────────────────────
const DEMO_RESOURCES: Resource[] = [
  { id: 'r1', name: 'prod-api-server-01', type: 'ec2',    status: 'healthy',  provider: 'aws', dependents: ['r4','r5'], dependencies: ['r3','r7'], region: 'us-east-1', blastRadius: 7 },
  { id: 'r2', name: 'prod-db-primary',    type: 'rds',    status: 'critical', provider: 'aws', dependents: ['r1','r6'], dependencies: [],          region: 'us-east-1', blastRadius: 9 },
  { id: 'r3', name: 'prod-cache-layer',   type: 'lambda', status: 'healthy',  provider: 'aws', dependents: ['r1'],      dependencies: [],          region: 'us-east-1', blastRadius: 2 },
  { id: 'r4', name: 'prod-alb-external',  type: 'elb',    status: 'healthy',  provider: 'aws', dependents: [],          dependencies: ['r1','r5'], region: 'us-east-1', blastRadius: 4 },
  { id: 'r5', name: 'prod-worker-fleet',  type: 'ec2',    status: 'warning',  provider: 'aws', dependents: ['r4'],      dependencies: ['r2'],      region: 'us-east-1', blastRadius: 5 },
  { id: 'r6', name: 'media-storage',      type: 's3',     status: 'healthy',  provider: 'aws', dependents: [],          dependencies: ['r2'],      region: 'us-east-1', blastRadius: 1 },
  { id: 'r7', name: 'prod-vpc',           type: 'vpc',    status: 'healthy',  provider: 'aws', dependents: ['r1','r5'], dependencies: [],          region: 'us-east-1', blastRadius: 8 },
];
const DEMO_POSITIONS: Record<string, { x: number; y: number }> = {
  r1: { x: 320, y: 180 }, r2: { x: 160, y: 300 }, r3: { x: 160, y: 100 },
  r4: { x: 500, y: 120 }, r5: { x: 480, y: 280 }, r6: { x: 340, y: 360 }, r7: { x: 100, y: 220 },
};

// ── auto-layout for real data ─────────────────────────────────────────────
function buildLayout(resources: Resource[]): Record<string, { x: number; y: number }> {
  const cols = Math.max(3, Math.ceil(Math.sqrt(resources.length)));
  const result: Record<string, { x: number; y: number }> = {};
  resources.forEach((r, i) => {
    result[r.id] = { x: 80 + (i % cols) * 140, y: 70 + Math.floor(i / cols) * 130 };
  });
  return result;
}

// ── heuristic dependency builder ─────────────────────────────────────────
function buildDependencies(resources: Resource[]): Resource[] {
  const cloned = resources.map(r => ({ ...r, dependents: [] as string[], dependencies: [] as string[] }));
  const byType = (t: string) => cloned.filter(r => resolveType(r.type) === t);
  const vpcs = byType('vpc'); const rdses = byType('rds');
  const ec2s = byType('ec2'); const elbs  = byType('elb');
  ec2s.forEach(ec2 => {
    const vpc = vpcs[0]; const rds = rdses[0];
    if (vpc) { ec2.dependencies.push(vpc.id); vpc.dependents.push(ec2.id); }
    if (rds) { ec2.dependencies.push(rds.id); rds.dependents.push(ec2.id); }
  });
  elbs.forEach(elb => ec2s.slice(0, 2).forEach(ec2 => { elb.dependencies.push(ec2.id); ec2.dependents.push(elb.id); }));
  return cloned;
}

// ─────────────────────────────────────────────────────────────────────────
export default function BlastRadius() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();

  const [resources, setResources]       = useState<Resource[]>(DEMO_RESOURCES);
  const [positions, setPositions]       = useState<Record<string, { x: number; y: number }>>(DEMO_POSITIONS);
  const [loading, setLoading]           = useState(true);
  const [isLive, setIsLive]             = useState(false);
  const [selected, setSelected]         = useState<Resource | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [simulating, setSimulating]     = useState(false);
  const [simResult, setSimResult]       = useState<null | { affected: number; chains: string[][] }>(null);
  const [searchTerm, setSearchTerm]     = useState('');

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';
  const token  = localStorage.getItem('token');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, secRes] = await Promise.all([
        fetch(`${API}/api/cloud/accounts/${accountId}/resources`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/cloud/accounts/${accountId}/security`,  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!resRes.ok) throw new Error('no resources');

      const resData: any = await resRes.json();
      const secData: any = secRes.ok ? await secRes.json() : {};
      const rawResources: any[] = resData.resources || resData || [];
      const findings: any[]     = secData.findings  || [];

      if (!rawResources.length) throw new Error('empty');

      // Build severity sets from findings
      const critSet = new Set<string>();
      const warnSet = new Set<string>();
      findings.forEach((f: any) => {
        const k = (f.resource || '').toLowerCase();
        if (f.severity === 'CRITICAL') critSet.add(k);
        else if (f.severity === 'HIGH') warnSet.add(k);
      });

      const mapped: Resource[] = rawResources.slice(0, 18).map((r: any, i: number) => {
        const rid   = String(r.resourceId || r.id || `r${i}`);
        const name  = String(r.name || r.resourceId || `Resource ${i + 1}`);
        const nameL = name.toLowerCase();
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if ([...critSet].some(k => k && nameL.includes(k))) status = 'critical';
        else if ([...warnSet].some(k => k && nameL.includes(k))) status = 'warning';
        else if (r.status === 'stopped' || r.state === 'stopped') status = 'warning';
        return { id: rid, name, type: resolveType(r.resourceType || r.type || ''), status, provider: r.provider || 'aws', dependents: [], dependencies: [], region: r.region || 'us-east-1' };
      });

      const withDeps  = buildDependencies(mapped);
      const withScore = withDeps.map(r => ({
        ...r,
        blastRadius: Math.min(10, (r.status === 'critical' ? 8 : r.status === 'warning' ? 5 : 2) + r.dependents.length),
      }));

      setResources(withScore);
      setPositions(buildLayout(withScore));
      setIsLive(true);
    } catch {
      setResources(DEMO_RESOURCES);
      setPositions(DEMO_POSITIONS);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [accountId]);

  const selectResource = (r: Resource) => {
    setSelected(r);
    setSimResult(null);
    setHighlightIds(new Set([r.id, ...r.dependents, ...r.dependencies]));
  };

  const simulate = () => {
    if (!selected) return;
    setSimulating(true);
    setTimeout(() => {
      const visited = new Set<string>();
      const queue   = [...selected.dependents];
      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const res = resources.find(r => r.id === id);
        if (res) queue.push(...res.dependents);
      }
      setSimResult({ affected: visited.size + 1, chains: [[selected.name, ...[...visited].map(id => resources.find(r => r.id === id)?.name ?? id)]] });
      setHighlightIds(new Set([selected.id, ...visited]));
      setSimulating(false);
    }, 1600);
  };

  const filteredResources = resources.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const edges: { from: string; to: string }[] = [];
  resources.forEach(r => r.dependencies.forEach(dep => edges.push({ from: dep, to: r.id })));

  const svgH = Math.max(420, Math.ceil(resources.length / Math.max(3, Math.ceil(Math.sqrt(resources.length)))) * 130 + 60);

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(239,68,68,0.35)' }}>
            <Zap size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Blast Radius Simulator</h1>
            <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>
              {loading ? 'Loading resources…' : isLive
                ? `${resources.length} live resources · Select one to simulate failure impact`
                : 'Demo mode — connect account for live data'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {!isLive && !loading && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>Demo mode</span>
            )}
            <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Refresh Graph
            </button>
            {selected && (
              <button onClick={simulate} disabled={simulating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: simulating ? 0.7 : 1 }}>
                {simulating ? <RefreshCw size={14} /> : <Zap size={14} />}
                {simulating ? 'Simulating…' : 'Simulate Failure'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Resources',    value: loading ? '—' : resources.length,                                      color: '#6366f1' },
            { label: 'Critical Resources', value: loading ? '—' : resources.filter(r => r.status === 'critical').length, color: '#ef4444' },
            { label: 'Warning Resources',  value: loading ? '—' : resources.filter(r => r.status === 'warning').length,  color: '#f59e0b' },
            { label: 'Dependency Links',   value: loading ? '—' : edges.length,                                          color: '#10b981' },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 18px' }}>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18 }}>

          {/* Resource List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted, pointerEvents: 'none' }} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search resources…"
                style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 10, background: card, border: `1px solid ${border}`, color: text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 520, overflowY: 'auto' }}>
              {filteredResources.map(r => {
                const rtype = resolveType(r.type);
                const col   = TYPE_COLORS[rtype] || '#6366f1';
                return (
                  <div key={r.id} onClick={() => selectResource(r)}
                    style={{ background: selected?.id === r.id ? (isDark ? '#1a2540' : '#eef2ff') : card, border: `1px solid ${selected?.id === r.id ? '#6366f1' : border}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: col + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col }}>
                        {TYPE_ICONS[rtype] || <Server size={13} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                        <p style={{ fontSize: 10, color: muted, margin: 0 }}>{rtype.toUpperCase()} · {r.region}</p>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[r.status], flexShrink: 0 }} />
                    </div>
                    {(r.blastRadius ?? 0) >= 7 && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#f87171' }}>
                        <TriangleAlert size={10} /> Blast radius: {r.blastRadius}/10
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graph + Detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* SVG graph */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 16, position: 'relative' }}>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 10px', color: muted }}>
                DEPENDENCY GRAPH{isLive ? ' — LIVE' : ' — DEMO'}
              </p>
              <svg width="100%" height={svgH} viewBox={`0 0 660 ${svgH}`} style={{ overflow: 'visible' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill={isDark ? '#374151' : '#d1d5db'} />
                  </marker>
                  <marker id="arrowhead-hl" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                  </marker>
                </defs>
                {edges.map((e, i) => {
                  const from = positions[e.from]; const to = positions[e.to];
                  if (!from || !to) return null;
                  const hl = highlightIds.has(e.from) && highlightIds.has(e.to);
                  return (
                    <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={hl ? '#ef4444' : (isDark ? '#374151' : '#e5e7eb')}
                      strokeWidth={hl ? 2 : 1.5} strokeDasharray={hl ? '5,3' : undefined}
                      markerEnd={hl ? 'url(#arrowhead-hl)' : 'url(#arrowhead)'}
                      opacity={hl ? 1 : 0.5} style={{ transition: 'all 0.3s' }} />
                  );
                })}
                {resources.map(r => {
                  const pos   = positions[r.id]; if (!pos) return null;
                  const rtype = resolveType(r.type);
                  const isSel = selected?.id === r.id;
                  const isHl  = highlightIds.has(r.id);
                  const col   = isSel ? '#ef4444' : isHl ? '#f59e0b' : (TYPE_COLORS[rtype] || '#6366f1');
                  const label = r.name.split('-').slice(0, 2).join('-');
                  return (
                    <g key={r.id} onClick={() => selectResource(r)} style={{ cursor: 'pointer' }}>
                      {isSel && <circle cx={pos.x} cy={pos.y} r={28} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,2" />}
                      <circle cx={pos.x} cy={pos.y} r={22} fill={col + '22'} stroke={col} strokeWidth={isSel ? 2.5 : 1.5} />
                      <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} fill={col}>{rtype.toUpperCase().slice(0, 6)}</text>
                      <circle cx={pos.x + 16} cy={pos.y - 16} r={5} fill={STATUS_COLORS[r.status]} />
                      <text x={pos.x} y={pos.y + 38} textAnchor="middle" fontSize={9} fill={muted}>{label.length > 14 ? label.slice(0, 13) + '…' : label}</text>
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: 'flex', gap: 14, position: 'absolute', bottom: 14, right: 14 }}>
                {[['#10b981','Healthy'],['#f59e0b','Warning'],['#ef4444','Critical']].map(([c,l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: muted }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation Result */}
            {simResult && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ef4444' }}>Blast Radius: {simResult.affected} resources affected</p>
                </div>
                <p style={{ fontSize: 12, color: muted, marginBottom: 10 }}>If <strong style={{ color: text }}>{selected?.name}</strong> fails, these downstream resources will be impacted:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {simResult.chains[0].map((name, i) => (
                    <React.Fragment key={i}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: i === 0 ? 'rgba(239,68,68,0.15)' : (isDark ? '#1f2937' : '#f3f4f6'), color: i === 0 ? '#f87171' : text, border: '1px solid', borderColor: i === 0 ? 'rgba(239,68,68,0.3)' : border }}>{name}</span>
                      {i < simResult.chains[0].length - 1 && <ArrowRight size={12} style={{ color: muted, alignSelf: 'center' }} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Selected detail */}
            {selected && !simResult && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>{selected.name}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['Type', resolveType(selected.type).toUpperCase()],
                    ['Status', selected.status],
                    ['Region', selected.region],
                    ['Provider', selected.provider.toUpperCase()],
                    ['Depends on', selected.dependencies.length + ' resources'],
                    ['Depended by', selected.dependents.length + ' resources'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: isDark ? '#0d1117' : '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                      <p style={{ fontSize: 10, color: muted, margin: '0 0 2px' }}>{k}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
