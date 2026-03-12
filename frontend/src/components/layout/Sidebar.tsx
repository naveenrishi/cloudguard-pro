// frontend/src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, BarChart3, TrendingDown, Shield,
  Server, Database, Activity, Target, Settings,
  ChevronRight, ChevronDown, Cloud, Zap,
  Bot, Radiation, AlertCircle, Leaf, Ghost, Users,
  Sparkles, Bell, FileText, Map, BarChart2,
  PieChart, ArrowRightLeft, BellRing,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const CORE_TABS = (accountId: string) => [
  { icon: LayoutDashboard, label: 'Overview',          path: `/account/${accountId}/overview`          },
  { icon: BarChart3,       label: 'Cost Analytics',    path: `/account/${accountId}/cost-analytics`    },
  { icon: TrendingDown,    label: 'Optimization',      path: `/account/${accountId}/optimization`      },
  { icon: Shield,          label: 'Security',          path: `/account/${accountId}/security`          },
  { icon: Server,          label: 'Resources',         path: `/account/${accountId}/resources`         },
  { icon: Database,        label: 'Cloud SQL',         path: `/account/${accountId}/databases`         },
  { icon: Activity,        label: 'Audit Logs',        path: `/account/${accountId}/audit-logs`        },
  { icon: Target,          label: 'Migration Advisor', path: `/account/${accountId}/migration-advisor` },
];

const INTELLIGENCE_TABS = (accountId: string) => [
  { icon: Bot,         label: 'AI Architect',     path: `/account/${accountId}/ai-architect`,    badge: 'NEW', badgeColor: '#6366f1' },
  { icon: Zap,         label: 'Blast Radius',     path: `/account/${accountId}/blast-radius`,    badge: 'NEW', badgeColor: '#ef4444' },
  { icon: AlertCircle, label: 'FinOps Feed',      path: `/account/${accountId}/finops-feed`,     badge: '2',   badgeColor: '#f59e0b' },
  { icon: Leaf,        label: 'Carbon Dashboard', path: `/account/${accountId}/carbon`,          badge: 'NEW', badgeColor: '#10b981' },
  { icon: Ghost,       label: 'Shadow IT',        path: `/account/${accountId}/shadow-it`,       badge: '7',   badgeColor: '#7c3aed' },
  { icon: Users,       label: 'Budget Warrooms',  path: `/account/${accountId}/budget-warrooms`, badge: '1',   badgeColor: '#3b82f6' },
];

// ── Home-level nav (no account selected) ──────────────────────────────────────
const HOME_MAIN = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard'  },
  { icon: BellRing,        label: 'Alert Center',  path: '/alerts',     badge: 'NEW', badgeColor: '#ef4444' },
  { icon: Bell,            label: 'Notifications', path: '/notifications' },
];

const HOME_ANALYTICS = [
  { icon: PieChart,        label: 'Advanced Analytics', path: '/analytics' },
  { icon: FileText,        label: 'Reports',            path: '/reports'   },
];

const HOME_TOOLS = [
  { icon: ArrowRightLeft,  label: 'Migration Advisor', path: '/migration-advisor', badge: 'NEW', badgeColor: '#6366f1' },
  { icon: Radiation,       label: 'Automation',        path: '/automation',        badge: 'NEW', badgeColor: '#f97316' },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isDark } = useTheme();

  const pathMatch = location.pathname.match(/\/account\/([^/]+)/);
  const accountId = pathMatch?.[1] ?? '';

  const [intelOpen, setIntelOpen] = useState(true);

  const bg       = isDark ? '#0d1424' : '#ffffff';
  const border   = isDark ? '#1f2937' : '#e5e7eb';
  const text     = isDark ? '#f9fafb' : '#111827';
  const muted    = isDark ? '#9ca3af' : '#6b7280';
  const hoverBg  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const activeBg = isDark ? 'rgba(99,102,241,0.15)'  : 'rgba(99,102,241,0.08)';
  const sectionHd = isDark ? '#4b5563' : '#9ca3af';

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const NavItem = ({
    icon: Icon, label, path, badge, badgeColor,
  }: {
    icon: React.ElementType; label: string; path: string;
    badge?: string; badgeColor?: string;
  }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => navigate(path)}
        title={collapsed ? label : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '9px 0' : '8px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 10, border: 'none', cursor: 'pointer',
          background: active ? activeBg : 'transparent',
          color: active ? '#818cf8' : muted,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 13, fontWeight: active ? 600 : 400,
          transition: 'all 0.15s', position: 'relative', textAlign: 'left',
        }}
        onMouseEnter={e => {
          if (!active) { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.color = text; }
        }}
        onMouseLeave={e => {
          if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = muted; }
        }}
      >
        {active && (
          <span style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3, borderRadius: 99,
            background: 'linear-gradient(180deg, #818cf8, #6366f1)',
          }} />
        )}
        <Icon size={16} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                background: badgeColor ? badgeColor + '22' : 'rgba(99,102,241,0.15)',
                color: badgeColor ?? '#818cf8',
                border: `1px solid ${badgeColor ? badgeColor + '44' : 'rgba(99,102,241,0.3)'}`,
                flexShrink: 0,
              }}>{badge}</span>
            )}
          </>
        )}
        {collapsed && badge && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: badgeColor ?? '#6366f1',
          }} />
        )}
      </button>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    !collapsed ? (
      <p style={{
        fontSize: 10, fontWeight: 700, color: sectionHd,
        letterSpacing: '0.08em', margin: '12px 4px 6px',
        textTransform: 'uppercase',
      }}>{label}</p>
    ) : <div style={{ height: 8 }} />
  );

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: collapsed ? 72 : 240,
      background: bg, borderRight: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column', zIndex: 50,
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0' : '0 16px',
        borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(99,102,241,0.4)',
            }}>
              <Cloud size={16} color="white" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: text, fontFamily: "'DM Sans', system-ui" }}>
              CloudGuard
            </span>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cloud size={16} color="white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: 26, height: 26, borderRadius: 8, border: `1px solid ${border}`,
            background: 'transparent', cursor: 'pointer', color: muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s',
          }}
        >
          <ChevronRight size={13} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 8px', scrollbarWidth: 'none' }}>

        {/* ── PER-ACCOUNT NAV ── */}
        {accountId && (
          <>
            <SectionLabel label="Account" />
            {CORE_TABS(accountId).map(tab => (
              <NavItem key={tab.path} icon={tab.icon} label={tab.label} path={tab.path} />
            ))}

            <div style={{ height: 1, background: border, margin: '10px 4px' }} />

            {/* Intelligence Section */}
            {!collapsed ? (
              <button
                onClick={() => setIntelOpen(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 4px 8px', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <Sparkles size={11} color="#818cf8" />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#818cf8', flex: 1, textAlign: 'left' }}>
                  INTELLIGENCE
                </span>
                {intelOpen ? <ChevronDown size={11} style={{ color: sectionHd }} /> : <ChevronRight size={11} style={{ color: sectionHd }} />}
              </button>
            ) : <div style={{ height: 6 }} />}

            {(intelOpen || collapsed) && INTELLIGENCE_TABS(accountId).map(tab => (
              <NavItem key={tab.path} icon={tab.icon} label={tab.label} path={tab.path} badge={tab.badge} badgeColor={tab.badgeColor} />
            ))}
          </>
        )}

        {/* ── HOME NAV (no account selected) ── */}
        {!accountId && (
          <>
            <SectionLabel label="Overview" />
            {HOME_MAIN.map(tab => (
              <NavItem key={tab.path} icon={tab.icon} label={tab.label} path={tab.path} badge={(tab as any).badge} badgeColor={(tab as any).badgeColor} />
            ))}

            <SectionLabel label="Analytics" />
            {HOME_ANALYTICS.map(tab => (
              <NavItem key={tab.path} icon={tab.icon} label={tab.label} path={tab.path} />
            ))}

            <SectionLabel label="Tools" />
            {HOME_TOOLS.map(tab => (
              <NavItem key={tab.path} icon={tab.icon} label={tab.label} path={tab.path} badge={(tab as any).badge} badgeColor={(tab as any).badgeColor} />
            ))}
          </>
        )}

        <div style={{ height: 1, background: border, margin: '10px 4px' }} />
        <NavItem icon={Settings} label="Settings" path="/settings" />
      </nav>

      {/* Bottom version badge */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: 11, color: muted }}>All systems operational</span>
          </div>
          <p style={{ fontSize: 10, color: muted, margin: '4px 0 0', opacity: 0.6 }}>CloudGuard Pro v2.1.0</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
