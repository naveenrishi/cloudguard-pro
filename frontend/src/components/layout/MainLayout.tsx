// frontend/src/components/layout/MainLayout.tsx — REPLACE ENTIRELY

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import { NotificationsPanel, NotificationsBell } from '../notifications/NotificationsPanel';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, BarChart3, TrendingDown, Shield,
  Server, Database, Activity, Target, Settings,
  LogOut, ChevronRight, Zap, Search, Sun, Moon,
} from 'lucide-react';

interface MainLayoutProps { children: React.ReactNode; }

export const getAccountTabs = (accountId: string) => [
  { icon: LayoutDashboard, label: 'Overview',          path: `/account/${accountId}/overview`          },
  { icon: BarChart3,       label: 'Cost Analytics',    path: `/account/${accountId}/cost-analytics`    },
  { icon: TrendingDown,    label: 'Optimization',      path: `/account/${accountId}/optimization`      },
  { icon: Shield,          label: 'Security',          path: `/account/${accountId}/security`          },
  { icon: Server,          label: 'Resources',         path: `/account/${accountId}/resources`         },
  { icon: Database,        label: 'Cloud SQL',         path: `/account/${accountId}/databases`         },
  { icon: Activity,        label: 'Audit Logs',        path: `/account/${accountId}/audit-logs`        },
  { icon: Target,          label: 'Migration Advisor', path: `/account/${accountId}/migration-advisor` },
];

const buildCrumbs = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean);
  if (pathname === '/dashboard') return [{ label: 'Dashboard', path: '/dashboard' }];
  const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '/dashboard' }];
  let built = '';
  parts.forEach(part => {
    built += '/' + part;
    if (!/^[0-9a-f-]{10,}$/i.test(part) && part !== 'dashboard') {
      const label = part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      crumbs.push({ label, path: built });
    }
  });
  return crumbs;
};

// ── Animated theme toggle pill ─────────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'relative',
        width: 52,
        height: 28,
        borderRadius: 99,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        outline: 'none',
        flexShrink: 0,
        background: isDark
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #fde68a 0%, #fbbf24 100%)',
        boxShadow: isDark
          ? '0 0 0 1px rgba(99,102,241,0.5), 0 2px 6px rgba(0,0,0,0.4)'
          : '0 0 0 1px rgba(251,191,36,0.6), 0 2px 6px rgba(0,0,0,0.12)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span style={{ position:'absolute', left:5, top:'50%', transform:'translateY(-50%)', fontSize:10, opacity: isDark ? 1 : 0, transition:'opacity 0.2s', pointerEvents:'none' }}>🌙</span>
      <span style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', fontSize:10, opacity: isDark ? 0 : 1, transition:'opacity 0.2s', pointerEvents:'none' }}>☀️</span>
      <span style={{
        position: 'absolute',
        top: 3,
        left: isDark ? 3 : 23,
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? 'linear-gradient(135deg, #818cf8, #6366f1)' : 'linear-gradient(135deg, #fff, #fef3c7)',
        boxShadow: isDark ? '0 2px 6px rgba(99,102,241,0.6)' : '0 2px 6px rgba(0,0,0,0.15)',
        transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.4s ease',
      }}>
        {isDark ? <Moon size={11} color="white" /> : <Sun size={11} color="#f59e0b" />}
      </span>
    </button>
  );
}

// ── MainLayout ─────────────────────────────────────────────────────────────
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isDark } = useTheme();
  const [collapsed,   setCollapsed]   = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(4);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'NK';

  useEffect(() => {
    if (!user.mfaEnabled) navigate('/setup-mfa');
    // ⚠️  Removed: document.documentElement.classList.remove('dark')
    // Dark class is now managed exclusively by ThemeContext
    const token = localStorage.getItem('accessToken');
    fetch(`http://localhost:3000/api/notifications/${user.id}/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setUnreadCount(d.count); })
      .catch(() => {});
  }, []);

  const crumbs = buildCrumbs(location.pathname);

  // theme-conditional classes
  const headerBg   = isDark ? 'bg-gray-900 border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
                            : 'bg-white border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]';
  const crumbLast  = isDark ? 'text-white'                        : 'text-gray-900';
  const crumbOther = isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700';
  const iconBtn    = isDark ? 'text-gray-400 hover:bg-gray-700/60 hover:text-white'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900';
  const divider    = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const avatarName = isDark ? 'text-white'  : 'text-gray-900';
  const avatarSub  = isDark ? 'text-gray-400' : 'text-gray-500';
  const avatarHov  = isDark ? 'hover:bg-gray-700/60' : 'hover:bg-gray-100';
  const pageBg     = isDark ? 'bg-gray-950' : 'bg-[#f5f7fa]';
  const footerBdr  = isDark ? 'border-gray-800' : 'border-gray-100';
  const footerTxt  = isDark ? 'text-gray-500'   : 'text-gray-400';

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}
      style={{ fontFamily: "'DM Sans', 'Sora', system-ui, sans-serif" }}>

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'} flex flex-col min-h-screen`}>

        {/* ── TOP NAV ───────────────────────────────────────────────────── */}
        <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${headerBg}`}>
          <div className="px-6 h-[60px] flex items-center gap-4">

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 flex-1 min-w-0">
              {crumbs.map((c, i) => (
                <React.Fragment key={`crumb-${i}-${c.path}`}>
                  {i > 0 && <ChevronRight size={13} className="text-gray-600 flex-shrink-0" />}
                  <button onClick={() => navigate(c.path)}
                    className={`truncate transition-colors ${i === crumbs.length - 1 ? `${crumbLast} font-bold text-base` : `${crumbOther} font-normal text-sm`}`}>
                    {c.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>

            {/* Search */}
            <div className="relative w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" />
              <GlobalSearch />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">

              {/* 🌙/☀️ Theme toggle — sits right after search bar */}
              <ThemeToggle />

              <NotificationsBell unreadCount={unreadCount} onClick={() => setNotifOpen(true)} />
              <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

              <button onClick={() => navigate('/settings')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${iconBtn}`}>
                <Settings size={17} />
              </button>

              <div className={`w-px h-5 ${divider} mx-1`} />

              <button onClick={() => navigate('/settings')}
                className={`flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl transition-all ${avatarHov}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {initials}
                </div>
                <div className="text-left hidden sm:block">
                  <p className={`text-xs font-semibold ${avatarName} leading-none`}>{user.name || 'Naveen Kumar'}</p>
                  <p className={`text-[10px] ${avatarSub} mt-0.5`}>Admin</p>
                </div>
              </button>

              <button onClick={() => { localStorage.clear(); navigate('/login'); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                title="Logout">
                <LogOut size={16} />
              </button>

            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4">
          <div className="fixed top-0 right-0 w-[600px] h-[400px] pointer-events-none rounded-full"
            style={{ background:'radial-gradient(circle, #3b82f6 0%, transparent 70%)', opacity: isDark ? 0.025 : 0.012, transform:'translate(30%, -30%)' }}
          />
          {children}
        </main>

        {/* FOOTER */}
        <footer className={`px-6 py-3 border-t ${footerBdr} flex items-center justify-between transition-colors duration-300`}>
          <p className={`text-xs ${footerTxt}`}>© 2026 CloudGuard Pro</p>
          <div className={`flex items-center gap-1 text-xs ${footerTxt}`}>
            <Zap size={11} className="text-green-400" />
            <span>All systems operational</span>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default MainLayout;
