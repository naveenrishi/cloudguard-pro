import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  Home,
  BarChart3,
  Shield,
  CheckSquare,
  Server,
  Database,
  Cloud,
  Settings,
  TrendingDown,
  AlertTriangle,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      section: 'MAIN',
      items: [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: BarChart3, label: 'Cost Analytics', path: '/cost-analytics' },
        { icon: TrendingDown, label: 'Optimization', path: '/recommendations' },
      ],
    },
    {
      section: 'ASSESSMENTS',
      items: [
        { icon: Shield, label: 'Security Posture', path: '/security' },
        { icon: CheckSquare, label: 'Compliance', path: '/compliance' },
        { icon: AlertTriangle, label: 'Violations', path: '/violations' },
      ],
    },
    {
      section: 'INVENTORY',
      items: [
        { icon: Server, label: 'Resources', path: '/resources' },
        { icon: Database, label: 'Databases', path: '/databases' },
        { icon: Cloud, label: 'Cloud Accounts', path: '/connect-aws' },
      ],
    },
    {
      section: 'AUTOMATION',
      items: [
        { icon: Flame, label: 'Nuke', path: '/nuke' },
      ],
    },
    {
      section: 'GOVERNANCE',
      items: [
        { icon: Users, label: 'IAM Policies', path: '/iam-policies' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">CloudGuard Pro</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="py-4 overflow-y-auto h-[calc(100vh-4rem)]">
        {menuItems.map((section, idx) => (
          <div key={idx} className="mb-6">
            {!collapsed && (
              <div className="px-4 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.section}
                </span>
              </div>
            )}
            <div className="space-y-1 px-2">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={itemIdx}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
                    {!collapsed && (
                      <span className="font-medium text-sm">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">NK</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Naveen Kumar</p>
              <p className="text-xs text-slate-400 truncate">Admin</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
