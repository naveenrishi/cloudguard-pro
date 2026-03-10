// frontend/src/pages/AICloudArchitect.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../context/ThemeContext';
import {
  Bot, Sparkles, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, Play, RefreshCw, Code2, Zap, Shield,
  TrendingDown, Server, ArrowRight, X, Eye, Download,
  Circle, MoreHorizontal
} from 'lucide-react';

const PROVIDERS: Record<string, string> = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

type ActionStatus = 'ready' | 'running' | 'done' | 'warning';

interface ArchAction {
  id: string;
  title: string;
  description: string;
  impact: string;
  effort: 'Low' | 'Medium' | 'High';
  category: 'cost' | 'security' | 'performance' | 'reliability';
  status: ActionStatus;
  savings?: string;
  terraform?: string;
}

const MOCK_ACTIONS: ArchAction[] = [
  {
    id: 'a1',
    title: 'Right-size over-provisioned EC2 instances',
    description: '14 instances running at <15% CPU. Downgrade to next tier to reclaim spend without performance impact.',
    impact: 'High',
    effort: 'Low',
    category: 'cost',
    status: 'ready',
    savings: '$1,240/mo',
    terraform: `resource "aws_instance" "app" {
  instance_type = "t3.medium"  # was t3.xlarge
  ami           = var.ami_id
  # auto-applied by CloudGuard Pro
}`,
  },
  {
    id: 'a2',
    title: 'Enable S3 Intelligent-Tiering on 3 buckets',
    description: 'Buckets with infrequent access patterns. Auto-tiering will reduce storage costs significantly.',
    impact: 'Medium',
    effort: 'Low',
    category: 'cost',
    status: 'ready',
    savings: '$340/mo',
    terraform: `resource "aws_s3_bucket_intelligent_tiering_configuration" "log_bucket" {
  bucket = aws_s3_bucket.logs.id
  name   = "EntireS3Bucket"
  status = "Enabled"
}`,
  },
  {
    id: 'a3',
    title: 'Enforce MFA delete on critical S3 buckets',
    description: '5 buckets flagged as critical lack MFA delete protection. Enforce to prevent accidental data loss.',
    impact: 'High',
    effort: 'Low',
    category: 'security',
    status: 'warning',
    terraform: `resource "aws_s3_bucket_versioning" "critical" {
  bucket = aws_s3_bucket.critical.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}`,
  },
  {
    id: 'a4',
    title: 'Add auto-scaling to 2 underutilized ECS services',
    description: 'Services spike to 90%+ CPU during peak hours. Auto-scaling will improve reliability and reduce manual intervention.',
    impact: 'High',
    effort: 'Medium',
    category: 'performance',
    status: 'ready',
    terraform: `resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/cluster/my-service"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}`,
  },
  {
    id: 'a5',
    title: 'Enable cross-region replication for RDS',
    description: 'Primary RDS instance has no read replica. Add cross-region replica for disaster recovery.',
    impact: 'High',
    effort: 'High',
    category: 'reliability',
    status: 'ready',
    savings: undefined,
    terraform: `resource "aws_db_instance" "replica" {
  replicate_source_db = aws_db_instance.primary.id
  instance_class      = "db.t3.medium"
  availability_zone   = "us-west-2a"
}`,
  },
  {
    id: 'a6',
    title: 'Consolidate 4 NAT Gateways into 2',
    description: 'Redundant NAT gateways across AZs can be consolidated. Same resilience at half the cost.',
    impact: 'Medium',
    effort: 'Medium',
    category: 'cost',
    status: 'done',
    savings: '$180/mo',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  cost: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  security: 'text-red-400 bg-red-400/10 border-red-400/20',
  performance: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  reliability: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

const STATUS_META: Record<ActionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ready:   { label: 'Ready',   color: 'text-indigo-400',  icon: <Circle size={8} className="fill-indigo-400" />   },
  running: { label: 'Running', color: 'text-blue-400',    icon: <RefreshCw size={10} className="animate-spin" />  },
  done:    { label: 'Applied', color: 'text-emerald-400', icon: <CheckCircle2 size={10} />                         },
  warning: { label: 'Warning', color: 'text-amber-400',   icon: <AlertTriangle size={10} />                       },
};

export default function AICloudArchitect() {
  const { accountId } = useParams<{ accountId: string }>();
  const { isDark } = useTheme();
  const provider = accountId?.split('-')[0] ?? 'aws';
  const providerLabel = PROVIDERS[provider] ?? 'Cloud';

  const [actions, setActions] = useState<ArchAction[]>(MOCK_ACTIONS);
  const [selectedAction, setSelectedAction] = useState<ArchAction | null>(null);
  const [showTerraform, setShowTerraform] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: `Hi! I'm your AI Cloud Architect for ${providerLabel}. I've analysed your infrastructure and found 5 actions ready to apply. Ask me anything or click an action to review it.` },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const bg     = isDark ? '#0b1120' : '#f5f7fa';
  const card   = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#1f2937' : '#e5e7eb';
  const text   = isDark ? '#f9fafb' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';

  const readyCount   = actions.filter(a => a.status === 'ready').length;
  const totalSavings = actions.filter(a => a.savings).reduce((sum, a) => sum + parseInt(a.savings!.replace(/[^0-9]/g, '')), 0);

  const filtered = filter === 'all' ? actions : actions.filter(a => a.category === filter);

  const runAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'running' } : a));
    setTimeout(() => setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'done' } : a)), 2200);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      const replies: Record<string, string> = {
        default: `I've reviewed your ${providerLabel} account. Based on current usage patterns, the highest ROI action is right-sizing your EC2 instances — that alone saves $1,240/month with zero downtime risk. Want me to generate the Terraform diff?`,
      };
      setChatMessages(prev => [...prev, { role: 'assistant', text: replies.default }]);
      setIsTyping(false);
    }, 1400);
  };

  return (
    <MainLayout>
      <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(99,102,241,0.35)',
            }}>
              <Bot size={26} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>AI Cloud Architect</h1>
              <p style={{ fontSize: 13, color: muted, margin: '3px 0 0' }}>{providerLabel} · Account {accountId} · 6 recommendations found</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Re-scan
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
              <Sparkles size={14} /> Apply All Ready
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: <Zap size={18} color="#6366f1" />, label: 'Actions Ready', value: `${readyCount}`, sub: 'auto-applicable', bg: 'rgba(99,102,241,0.08)' },
            { icon: <TrendingDown size={18} color="#10b981" />, label: 'Monthly Savings', value: `$${totalSavings.toLocaleString()}`, sub: 'if all applied', bg: 'rgba(16,185,129,0.08)' },
            { icon: <Shield size={18} color="#f59e0b" />, label: 'Security Fixes', value: '1', sub: 'critical', bg: 'rgba(245,158,11,0.08)' },
            { icon: <Server size={18} color="#3b82f6" />, label: 'Resources Scanned', value: '248', sub: 'last 5 min', bg: 'rgba(59,130,246,0.08)' },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: 10, color: muted, margin: 0, opacity: 0.7 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18 }}>

          {/* Left — Actions */}
          <div>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['all', 'cost', 'security', 'performance', 'reliability'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: `1px solid ${filter === f ? '#6366f1' : border}`,
                  background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: filter === f ? '#818cf8' : muted, transition: 'all 0.15s',
                }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Action Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(action => {
                const sm = STATUS_META[action.status];
                return (
                  <div key={action.id}
                    onClick={() => { setSelectedAction(action); setShowTerraform(false); }}
                    style={{
                      background: selectedAction?.id === action.id ? (isDark ? '#1a2540' : '#eef2ff') : card,
                      border: `1px solid ${selectedAction?.id === action.id ? '#6366f1' : border}`,
                      borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                      transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 14,
                    }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: CATEGORY_COLORS[action.category].split(' ')[1] || 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {action.category === 'cost' && <TrendingDown size={16} color="#10b981" />}
                      {action.category === 'security' && <Shield size={16} color="#f87171" />}
                      {action.category === 'performance' && <Zap size={16} color="#60a5fa" />}
                      {action.category === 'reliability' && <Server size={16} color="#fbbf24" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{action.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {action.savings && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{action.savings}</span>}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }} className={sm.color}>
                            {sm.icon} {sm.label}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: muted, margin: '0 0 8px' }}>{action.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid', fontWeight: 500 }} className={CATEGORY_COLORS[action.category]}>
                          {action.category}
                        </span>
                        <span style={{ fontSize: 11, color: muted }}>Effort: <strong style={{ color: text }}>{action.effort}</strong></span>
                        <span style={{ fontSize: 11, color: muted }}>Impact: <strong style={{ color: text }}>{action.impact}</strong></span>
                        {action.terraform && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#818cf8' }}><Code2 size={11} /> Terraform ready</span>}
                      </div>
                    </div>
                    {action.status === 'ready' && (
                      <button onClick={e => { e.stopPropagation(); runAction(action.id); }} style={{
                        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                        color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Play size={13} />
                      </button>
                    )}
                    {action.status === 'running' && <RefreshCw size={16} className="animate-spin" style={{ color: '#60a5fa', flexShrink: 0 }} />}
                    {action.status === 'done' && <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />}
                    {action.status === 'warning' && <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Detail + Chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Detail panel */}
            {selectedAction ? (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, flex: 1 }}>{selectedAction.title}</p>
                  <button onClick={() => setSelectedAction(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0 }}><X size={16} /></button>
                </div>
                <p style={{ fontSize: 12, color: muted, marginBottom: 14 }}>{selectedAction.description}</p>
                {selectedAction.savings && (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                    <p style={{ fontSize: 12, color: '#10b981', margin: 0, fontWeight: 600 }}>💰 Estimated savings: {selectedAction.savings}</p>
                  </div>
                )}
                {selectedAction.terraform && (
                  <>
                    <button onClick={() => setShowTerraform(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', fontWeight: 600 }}>
                      <Code2 size={13} /> {showTerraform ? 'Hide' : 'View'} Terraform diff <ChevronRight size={12} style={{ transform: showTerraform ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {showTerraform && (
                      <pre style={{ background: isDark ? '#0d1117' : '#1e293b', color: '#e2e8f0', fontSize: 11, padding: 12, borderRadius: 10, overflow: 'auto', margin: '0 0 12px', lineHeight: 1.6 }}>{selectedAction.terraform}</pre>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => runAction(selectedAction.id)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <Play size={13} /> Apply Now
                  </button>
                  <button style={{ padding: '9px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${border}`, color: muted, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={13} /> Preview
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
                <Bot size={32} style={{ color: '#6366f1', marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: muted, margin: 0 }}>Select an action to review Terraform diffs and apply changes</p>
              </div>
            )}

            {/* AI Chat */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: `1px solid ${border}` }}>
                <Sparkles size={15} color="#818cf8" />
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Ask AI Architect</p>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                      background: m.role === 'user' ? 'rgba(99,102,241,0.2)' : (isDark ? '#1f2937' : '#f3f4f6'),
                      fontSize: 12, color: text, lineHeight: 1.5,
                    }}>{m.text}</div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Ask about your infrastructure..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: isDark ? '#0d1117' : '#f9fafb', border: `1px solid ${border}`, color: text, fontSize: 12, outline: 'none' }}
                />
                <button onClick={sendChat} style={{ padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
