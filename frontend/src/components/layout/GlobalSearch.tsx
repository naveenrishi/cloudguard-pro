// src/components/layout/GlobalSearchBar.tsx
// Drop-in replacement for the search bar in MainLayout's header.
// Features: polished pill input, Cmd+K shortcut, spotlight modal w/ autocomplete suggestions.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, Clock, TrendingUp, Shield, DollarSign,
  Server, FileText, AlertTriangle, ChevronRight, Command,
  Ticket, BarChart3, Users, Settings,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SearchSuggestion {
  id: string;
  type: 'resource' | 'ticket' | 'policy' | 'finding' | 'page' | 'recent';
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  path?: string;
}

// ─── Static suggestion data ────────────────────────────────────────────────────
const RECENT_SEARCHES: SearchSuggestion[] = [
  { id: 'r1', type: 'recent', icon: Clock,         iconColor: '#9ca3af', iconBg: '#f3f4f6', label: 'prod-user-data S3 bucket',          sublabel: '2 hours ago' },
  { id: 'r2', type: 'recent', icon: Clock,         iconColor: '#9ca3af', iconBg: '#f3f4f6', label: 'IAM policy violations',              sublabel: 'Yesterday' },
  { id: 'r3', type: 'recent', icon: Clock,         iconColor: '#9ca3af', iconBg: '#f3f4f6', label: 'Azure cost anomalies March',         sublabel: '2 days ago' },
];

const TRENDING: SearchSuggestion[] = [
  { id: 't1', type: 'finding', icon: Shield,       iconColor: '#dc2626', iconBg: '#fef2f2', label: 'Public S3 Buckets',                  sublabel: '3 critical findings',   badge: 'Critical', badgeColor: '#dc2626' },
  { id: 't2', type: 'ticket',  icon: Ticket,       iconColor: '#6366f1', iconBg: '#eef2ff', label: 'INC0010001 — S3 Public Access',      sublabel: 'P1 · In Progress',       badge: 'P1',       badgeColor: '#dc2626' },
  { id: 't3', type: 'policy',  icon: FileText,     iconColor: '#7c3aed', iconBg: '#f5f3ff', label: 'AdministratorAccess Policy',         sublabel: '12 users attached' },
];

const ALL_SUGGESTIONS: SearchSuggestion[] = [
  // Resources
  { id: 's1',  type: 'resource', icon: Server,       iconColor: '#2563eb', iconBg: '#eff6ff', label: 'prod-user-data',                   sublabel: 'S3 Bucket · us-west-2',    badge: 'AWS' },
  { id: 's2',  type: 'resource', icon: Server,       iconColor: '#2563eb', iconBg: '#eff6ff', label: 'staging-postgres',                 sublabel: 'RDS Instance · us-east-1', badge: 'AWS' },
  { id: 's3',  type: 'resource', icon: Server,       iconColor: '#2563eb', iconBg: '#eff6ff', label: 'web-server-1',                     sublabel: 'EC2 · t3.xlarge',          badge: 'AWS' },
  { id: 's4',  type: 'resource', icon: Server,       iconColor: '#0284c7', iconBg: '#e0f2fe', label: 'prod-storage-account',             sublabel: 'Azure Storage · East US',  badge: 'Azure' },
  // Tickets
  { id: 's5',  type: 'ticket',   icon: Ticket,       iconColor: '#6366f1', iconBg: '#eef2ff', label: 'INC0010001',                       sublabel: 'S3 Bucket Publicly Accessible',  badge: 'P1' },
  { id: 's6',  type: 'ticket',   icon: Ticket,       iconColor: '#6366f1', iconBg: '#eef2ff', label: 'INC0010002',                       sublabel: 'Over-privileged IAM User',        badge: 'P2' },
  { id: 's7',  type: 'ticket',   icon: Ticket,       iconColor: '#6366f1', iconBg: '#eef2ff', label: 'INC0010003',                       sublabel: 'Database Not Encrypted',          badge: 'P2' },
  // Findings
  { id: 's8',  type: 'finding',  icon: AlertTriangle,iconColor: '#dc2626', iconBg: '#fef2f2', label: 'CloudFront Missing WAF',           sublabel: 'Security · High' },
  { id: 's9',  type: 'finding',  icon: AlertTriangle,iconColor: '#ea580c', iconBg: '#fff7ed', label: 'MFA Not Enforced on Root',         sublabel: 'Compliance · Critical' },
  // Policies
  { id: 's10', type: 'policy',   icon: FileText,     iconColor: '#7c3aed', iconBg: '#f5f3ff', label: 'AdministratorAccess',              sublabel: 'IAM Policy · 12 users' },
  { id: 's11', type: 'policy',   icon: FileText,     iconColor: '#7c3aed', iconBg: '#f5f3ff', label: 'ReadOnlyAccess',                   sublabel: 'IAM Policy · 34 users' },
  // Cost
  { id: 's12', type: 'finding',  icon: DollarSign,   iconColor: '#6366f1', iconBg: '#eef2ff', label: 'CloudWatch Logs Retention Unset', sublabel: 'Cost · $94/mo impact' },
  // Pages
  { id: 's13', type: 'page',     icon: BarChart3,    iconColor: '#059669', iconBg: '#ecfdf5', label: 'Advanced Analytics',              sublabel: 'Page' },
  { id: 's14', type: 'page',     icon: Users,        iconColor: '#059669', iconBg: '#ecfdf5', label: 'IAM Policies',                    sublabel: 'Page' },
  { id: 's15', type: 'page',     icon: Settings,     iconColor: '#059669', iconBg: '#ecfdf5', label: 'Automation Engine',               sublabel: 'Page' },
];

const TYPE_LABELS: Record<SearchSuggestion['type'], string> = {
  resource: 'Resources',
  ticket:   'Tickets',
  policy:   'Policies',
  finding:  'Findings',
  page:     'Pages',
  recent:   'Recent',
};

// ─── Search logic ───────────────────────────────────────────────────────────────
function getResults(query: string): { group: string; items: SearchSuggestion[] }[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const matches = ALL_SUGGESTIONS.filter(s =>
    s.label.toLowerCase().includes(q) ||
    (s.sublabel?.toLowerCase().includes(q) ?? false)
  );
  if (!matches.length) return [];

  const grouped: Record<string, SearchSuggestion[]> = {};
  matches.forEach(s => {
    const g = TYPE_LABELS[s.type];
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(s);
  });

  return Object.entries(grouped).map(([group, items]) => ({ group, items }));
}

// ─── Pill search trigger ────────────────────────────────────────────────────────
export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-400 hover:text-gray-200 transition-all group w-full"
    >
      <Search size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-500 transition-colors" />
      <span className="flex-1 text-left text-xs">Search resources, policies…</span>
      <span className="flex items-center gap-0.5 bg-gray-700 border border-gray-600 rounded-lg px-1.5 py-0.5 ml-auto flex-shrink-0">
        <Command size={10} className="text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-400">K</span>
      </span>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function GlobalSearchBar() {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // Derived state
  const results = getResults(query);
  const hasResults = results.length > 0;
  const allItems = results.flatMap(g => g.items);

  // Open / close
  const openModal  = useCallback(() => { setOpen(true);  setQuery(''); setFocused(null); }, []);
  const closeModal = useCallback(() => { setOpen(false); setQuery(''); setFocused(null); }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open ? closeModal() : openModal();
      }
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, openModal, closeModal]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hasResults && !query) return;

    const navigable = hasResults
      ? allItems.map(i => i.id)
      : (query ? [] : [...RECENT_SEARCHES, ...TRENDING].map(i => i.id));

    if (!navigable.length) return;

    const currentIdx = focused ? navigable.indexOf(focused) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = currentIdx < navigable.length - 1 ? navigable[currentIdx + 1] : navigable[0];
      setFocused(next);
      scrollItemIntoView(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = currentIdx > 0 ? navigable[currentIdx - 1] : navigable[navigable.length - 1];
      setFocused(prev);
      scrollItemIntoView(prev);
    } else if (e.key === 'Enter' && focused) {
      closeModal();
    }
  };

  const scrollItemIntoView = (id: string) => {
    setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    }, 0);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger pill */}
      <GlobalSearchTrigger onClick={openModal} />

      {/* Spotlight overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full mx-4 overflow-hidden"
            style={{
              maxWidth: 620,
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 24px 64px rgba(15,23,42,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
              animation: 'spotlight-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setFocused(null); }}
                onKeyDown={handleKeyDown}
                placeholder="Search resources, tickets, policies, findings…"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
                style={{ fontSize: 15 }}
              />
              {query && (
                <button
                  onMouseDown={e => { e.preventDefault(); setQuery(''); setFocused(null); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 transition-colors flex-shrink-0"
                >
                  <X size={12} />
                </button>
              )}
              <kbd
                onClick={closeModal}
                className="hidden sm:flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                Esc
              </kbd>
            </div>

            {/* Results / default state */}
            <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 420 }}>
              {!query && (
                <>
                  <Section
                    title="Recent Searches"
                    icon={<Clock size={11} className="text-gray-400" />}
                    items={RECENT_SEARCHES}
                    focused={focused}
                    onHover={setFocused}
                    onSelect={closeModal}
                  />
                  <div className="mx-4 border-t border-gray-50" />
                  <Section
                    title="Trending"
                    icon={<TrendingUp size={11} className="text-indigo-400" />}
                    items={TRENDING}
                    focused={focused}
                    onHover={setFocused}
                    onSelect={closeModal}
                  />
                </>
              )}

              {query && hasResults && results.map((group, gi) => (
                <Section
                  key={gi}
                  title={group.group}
                  items={group.items}
                  focused={focused}
                  onHover={setFocused}
                  onSelect={closeModal}
                  query={query}
                />
              ))}

              {query && !hasResults && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Search size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">No results for "{query}"</p>
                  <p className="text-xs text-gray-400 mt-1">Try searching for a resource ID, ticket number, or policy name</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <Shortcut keys={['↑', '↓']} label="Navigate" />
                <Shortcut keys={['↵']} label="Open" />
                <Shortcut keys={['Esc']} label="Dismiss" />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">CloudGuard Pro</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spotlight-in {
          from { opacity: 0; transform: scale(0.97) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </>
  );
}

// ─── Section sub-component ──────────────────────────────────────────────────────
function Section({
  title, icon, items, focused, onHover, onSelect, query,
}: {
  title: string;
  icon?: React.ReactNode;
  items: SearchSuggestion[];
  focused: string | null;
  onHover: (id: string) => void;
  onSelect: () => void;
  query?: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 px-4 py-1.5">
        {icon}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      {items.map(item => (
        <ResultRow
          key={item.id}
          item={item}
          isFocused={focused === item.id}
          onMouseEnter={() => onHover(item.id)}
          onSelect={onSelect}
          query={query}
        />
      ))}
    </div>
  );
}

// ─── Individual result row ──────────────────────────────────────────────────────
function ResultRow({
  item, isFocused, onMouseEnter, onSelect, query,
}: {
  item: SearchSuggestion;
  isFocused: boolean;
  onMouseEnter: () => void;
  onSelect: () => void;
  query?: string;
}) {
  const Icon = item.icon;
  return (
    <div
      data-id={item.id}
      onMouseEnter={onMouseEnter}
      onMouseDown={e => { e.preventDefault(); onSelect(); }}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
      style={{ background: isFocused ? '#f5f3ff' : 'transparent' }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: item.iconBg }}
      >
        <Icon size={14} style={{ color: item.iconColor }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {query ? <Highlight text={item.label} query={query} /> : item.label}
        </p>
        {item.sublabel && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.sublabel}</p>
        )}
      </div>

      {/* Badge */}
      {item.badge && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
          style={{
            color: item.badgeColor ?? '#6b7280',
            background: item.badgeColor ? `${item.badgeColor}18` : '#f3f4f6',
          }}
        >
          {item.badge}
        </span>
      )}

      {/* Arrow hint */}
      {isFocused && <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />}
    </div>
  );
}

// ─── Highlight matching text ────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#eef2ff', color: '#4f46e5', borderRadius: 3, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Keyboard shortcut badge ────────────────────────────────────────────────────
function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map(k => (
        <kbd
          key={k}
          className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-md"
        >
          {k}
        </kbd>
      ))}
      <span className="text-[10px] text-gray-400 ml-0.5">{label}</span>
    </div>
  );
}
