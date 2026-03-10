// frontend/src/pages/BlastRadius.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Zap, AlertTriangle, CheckCircle2, Search, RefreshCw,
  Shield, Server, Database, Globe, Cloud, ArrowRight,
  Info, X, ChevronRight, TriangleAlert, Eye
} from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: 'ec2' | 'rds' | 'lambda' | 's3' | 'elb' | 'vpc' | 'iam';
  status: 'healthy' | 'warning' | 'critical';
  provider: string;
  dependents: string[];
  dependencies: string[];
  region: string;
  blastRadius?: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ec2:    <Server size={13} />,
  rds:    <Database size={13} />,
  lambda: <Zap size={13} />,
  s3:     <Cloud size={13} />,
  elb:    <Globe size={13} />,
  vpc:    <Shield size={13} />,
  iam:    <Shield size={13} />,
};

const TYPE_COLORS: Record<string, string> = {
  ec2:    '#6366f1',
  rds:    '#3b82f6',
  lambda: '#f59e0b',
  s3:     '#10b981',
  elb:    '#8b5cf6',
  vpc:    '#06b6d4',
  iam:    '#ef4444',
};

const RESOURCES: Resource[] = [
  { id: 'r1',  name: 'prod-api-server-01', type: 'ec2',    status: 'healthy',  provider: 'aws', dependents: ['r4','r5'], dependencies: ['r3','r7'], region: 'us-east-1', blastRadius: 7 },
  { id: 'r2',  name: 'prod-db-primary',    type: 'rds',    status: 'critical', provider: 'aws', dependents: ['r1','r6'], dependencies: [],          region: 'us-east-1', blastRadius: 9 },
  { id: 'r3',  name: 'prod-cache-layer',   type: 'lambda', status: 'healthy',  provider: 'aws', dependents: ['r1'],      dependencies: [],          region: 'us-east-1', blastRadius: 2 },
  { id: 'r4',  name: 'prod-alb-external',  type: 'elb',    status: 'healthy',  provider: 'aws', dependents: [],          dependencies: ['r1','r5'], region: 'us-east-1', blastRadius: 4 },
  { id: 'r5',  name: 'prod-worker-fleet',  type: 'ec2',    status: 'warning',  provider: 'aws', dependents: ['r4'],      dependencies: ['r2'],      region: 'us-east-1', blastRadius: 5 },
  { id: 'r6',  name: 'media-storage',      type: 's3',     status: 'healthy',  provider: 'aws', dependents: [],          dependencies: ['r2'],      region: 'us-east-1', blastRadius: 1 },
  { id: 'r7',  name: 'prod-vpc',           type: 'vpc',    status: 'healthy',  provider: 'aws', dependents: ['r1','r5'], dependencies: [],          region: 'us-east-1', blastRadius: 8 },
];

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  r1: { x: 320, y: 180 },
  r2: { x: 160, y: 300 },
  r3: { x: 160, y: 100 },
  r4: { x: 500, y: 120 },
  r5: { x: 480, y: 280 },
  r6: { x: 340, y: 360 },
  r7: { x: 100, y: 220 },
};

const STATUS_COLORS: Record<string, string> = {
  healthy:  '#10b981',
  warning:  '#f59e0b',
  critical: '#ef4444',
};

export default function BlastRadius() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<Resource | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<null | { affected: number; chains: string[][] }>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';

  const selectResource = (r: Resource) => {
    setSelected(r);
    setSimResult(null);
    const affected = new Set<string>([r.id, ...r.dependents, ...r.dependencies]);
    setHighlightIds(affected);
  };

  const simulate = () => {
    if (!selected) return;
    setSimulating(true);
    setTimeout(() => {
      // BFS to find all transitive dependents
      const visited = new Set<string>();
      const queue = [...selected.dependents];
      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const res = RESOURCES.find(r => r.id === id);
        if (res) queue.push(...res.dependents);
      }
      setSimResult({
        affected: visited.size + 1,
        chains: [
          [selected.name, ...[...visited].map(id => RESOURCES.find(r => r.id === id)?.name ?? id)],
        ],
      });
      setHighlightIds(new Set([selected.id, ...visited]));
      setSimulating(false);
    }, 1600);
  };

  const filteredResources = RESOURCES.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Edges
  const edges: { from: string; to: string }[] = [];
  RESOURCES.forEach(r => {
    r.dependencies.forEach(dep => edges.push({ from: dep, to: r.id }));
  });

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
            <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>Account {accountId} · Select a resource to simulate failure impact</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Refresh Graph
            </button>
            {selected && (
              <button onClick={simulate} disabled={simulating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: simulating ? 0.7 : 1 }}>
                {simulating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                {simulating ? 'Simulating...' : `Simulate Failure`}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Resources', value: RESOURCES.length, color: '#6366f1' },
            { label: 'Critical Resources', value: RESOURCES.filter(r => r.status === 'critical').length, color: '#ef4444' },
            { label: 'Warning Resources', value: RESOURCES.filter(r => r.status === 'warning').length, color: '#f59e0b' },
            { label: 'Dependency Links', value: edges.length, color: '#10b981' },
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
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search resources..." style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 10, background: card, border: `1px solid ${border}`, color: text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredResources.map(r => (
                <div key={r.id} onClick={() => selectResource(r)}
                  style={{
                    background: selected?.id === r.id ? (isDark ? '#1a2540' : '#eef2ff') : card,
                    border: `1px solid ${selected?.id === r.id ? '#6366f1' : border}`,
                    borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: TYPE_COLORS[r.type] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TYPE_COLORS[r.type] }}>
                      {TYPE_ICONS[r.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                      <p style={{ fontSize: 10, color: muted, margin: 0 }}>{r.type.toUpperCase()} · {r.region}</p>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[r.status], flexShrink: 0 }} />
                  </div>
                  {r.blastRadius && r.blastRadius >= 7 && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#f87171' }}>
                      <TriangleAlert size={10} /> Blast radius: {r.blastRadius}/10
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Graph + Detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* SVG Dependency Graph */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 16, position: 'relative' }}>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 10px', color: muted }}>DEPENDENCY GRAPH</p>
              <svg width="100%" height="400" viewBox="0 0 620 420" style={{ overflow: 'visible' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill={isDark ? '#374151' : '#d1d5db'} />
                  </marker>
                  <marker id="arrowhead-hl" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                  </marker>
                </defs>
                {/* Edges */}
                {edges.map((e, i) => {
                  const from = NODE_POSITIONS[e.from];
                  const to   = NODE_POSITIONS[e.to];
                  const isHighlighted = highlightIds.has(e.from) && highlightIds.has(e.to);
                  return (
                    <line key={i}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={isHighlighted ? '#ef4444' : (isDark ? '#374151' : '#e5e7eb')}
                      strokeWidth={isHighlighted ? 2 : 1.5}
                      strokeDasharray={isHighlighted ? '5,3' : undefined}
                      markerEnd={isHighlighted ? 'url(#arrowhead-hl)' : 'url(#arrowhead)'}
                      opacity={isHighlighted ? 1 : 0.5}
                      style={{ transition: 'all 0.3s' }}
                    />
                  );
                })}
                {/* Nodes */}
                {RESOURCES.map(r => {
                  const pos = NODE_POSITIONS[r.id];
                  const isSelected  = selected?.id === r.id;
                  const isHighlight = highlightIds.has(r.id);
                  const col = isSelected ? '#ef4444' : isHighlight ? '#f59e0b' : TYPE_COLORS[r.type];
                  return (
                    <g key={r.id} onClick={() => selectResource(r)} style={{ cursor: 'pointer' }}>
                      {isSelected && <circle cx={pos.x} cy={pos.y} r={28} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,2" />}
                      <circle cx={pos.x} cy={pos.y} r={22} fill={col + '22'} stroke={col} strokeWidth={isSelected ? 2.5 : 1.5} />
                      <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} fill={col}>{r.type.toUpperCase()}</text>
                      <circle cx={pos.x + 16} cy={pos.y - 16} r={5} fill={STATUS_COLORS[r.status]} />
                      <text x={pos.x} y={pos.y + 38} textAnchor="middle" fontSize={9} fill={muted}>{r.name.split('-').slice(0, 2).join('-')}</text>
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
                    ['Type', selected.type.toUpperCase()],
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
