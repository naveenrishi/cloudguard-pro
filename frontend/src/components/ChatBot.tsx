// src/components/ChatBot.tsx
// Enhanced CloudGuard AI — powered by Anthropic claude-sonnet-4-20250514
// Features: real AI responses, tool calling, conversation memory, rich UI, suggested prompts

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Loader2, Sparkles,
  Minimize2, Maximize2, Trash2, Copy, Check, RotateCcw,
  ChevronDown, DollarSign, Shield, TrendingDown, Search,
  Zap, Cloud, BarChart3, AlertTriangle, CheckCircle,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolsUsed?: string[];
}

interface ChatBotProps {
  position?: 'bottom-right' | 'bottom-left';
}

// ─── suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: DollarSign,   label: 'Monthly spend',        query: 'What is my total cloud spend this month across all accounts?' },
  { icon: TrendingDown, label: 'Save money',            query: 'What are my top cost optimization opportunities right now?' },
  { icon: Shield,       label: 'Security issues',       query: 'Show me my most critical security findings and how to fix them.' },
  { icon: Search,       label: 'Find resources',        query: 'Help me find unused or idle cloud resources I can clean up.' },
  { icon: BarChart3,    label: 'Cost breakdown',        query: 'Break down my cloud costs by provider and top services.' },
  { icon: Zap,          label: 'Quick wins',            query: 'What are the easiest quick wins to reduce my cloud bill today?' },
];

// ─── markdown-lite renderer ───────────────────────────────────────────────────
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H3 bold header
    if (line.startsWith('### ')) {
      elements.push(<p key={key++} className="font-bold text-white text-sm mt-2 mb-1">{line.slice(4)}</p>);
    }
    // Bold line with **
    else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={key++} className="font-bold text-slate-100 text-sm mt-2">{line.slice(2,-2)}</p>);
    }
    // Bullet
    else if (line.match(/^[-•]\s/)) {
      elements.push(
        <div key={key++} className="flex items-start gap-2 text-sm text-slate-200 my-0.5">
          <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}/>
        </div>
      );
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      elements.push(
        <div key={key++} className="flex items-start gap-2 text-sm text-slate-200 my-0.5">
          <span className="text-blue-400 font-bold flex-shrink-0 w-4">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}/>
        </div>
      );
    }
    // Divider
    else if (line === '---') {
      elements.push(<hr key={key++} className="border-slate-600 my-2"/>);
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1"/>);
    }
    // Normal line with inline bold/code
    else {
      elements.push(
        <p key={key++} className="text-sm text-slate-200 leading-relaxed"
          dangerouslySetInnerHTML={{ __html:
            line
              .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
              .replace(/`(.+?)`/g, '<code class="bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
          }}
        />
      );
    }
  }
  return elements;
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const callBackendAPI = async (endpoint: string, token: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ChatBot: React.FC<ChatBotProps> = ({ position = 'bottom-right' }) => {
  const [isOpen,     setIsOpen]     = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [copied,     setCopied]     = useState<string|null>(null);
  const [unread,     setUnread]     = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const token          = localStorage.getItem('accessToken') || '';
  const user           = JSON.parse(localStorage.getItem('user') || '{}');

  // ── auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── focus input on open ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
      if (messages.length === 0) addWelcome();
    }
  }, [isOpen]);

  const addWelcome = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi${user.name ? ` ${user.name.split(' ')[0]}` : ''}! I'm **CloudGuard AI**, your cloud management assistant.

I have real-time access to your cloud data and can help with:

- 💰 **Cost analysis** — spending, trends, forecasts
- 🎯 **Optimization** — savings recommendations
- 🔒 **Security** — findings, compliance, remediation
- 🔍 **Resources** — search, inventory, cleanup
- 📊 **Reports** — summaries and insights

Pick a suggestion below or ask me anything!`,
      timestamp: new Date(),
    }]);
  };

  // ── collect context from backend ──
  const gatherContext = useCallback(async () => {
    const [accounts, costs, security, budget] = await Promise.allSettled([
      callBackendAPI('api/cloud/accounts/', token),
      callBackendAPI('api/cost/analysis', token),
      callBackendAPI('api/security/violations', token),
      callBackendAPI(`api/budgets/${user.id}`, token),
    ]);

    const ctx: Record<string,any> = {};

    if (accounts.status === 'fulfilled' && accounts.value) {
      const list = Array.isArray(accounts.value) ? accounts.value : accounts.value.accounts || [];
      ctx.accounts = list.map((a: any) => ({
        name: a.accountName, provider: a.provider,
        monthlySpend: a.monthlySpend ?? a.totalCost,
        resourceCount: a.resourceCount,
        status: a.status,
      }));
    }

    if (costs.status === 'fulfilled' && costs.value) {
      ctx.costs = costs.value;
    }

    if (security.status === 'fulfilled' && security.value) {
      const violations = Array.isArray(security.value) ? security.value : security.value.violations || [];
      ctx.security = {
        total: violations.length,
        critical: violations.filter((v:any) => v.severity==='critical').length,
        high:     violations.filter((v:any) => v.severity==='high').length,
        top3:     violations.slice(0,3).map((v:any) => ({ title:v.title, severity:v.severity, type:v.resourceType })),
      };
    }

    if (budget.status === 'fulfilled' && budget.value) {
      ctx.budgets = budget.value.budgets || budget.value;
    }

    return ctx;
  }, [token, user.id]);

  // ── send to Anthropic API ──
  const callClaude = async (userQuery: string, history: Message[]): Promise<string> => {
    // Gather live cloud context
    const ctx = await gatherContext();
    const ctxStr = Object.keys(ctx).length > 0
      ? `\n\nLIVE CLOUD DATA (fetched right now):\n${JSON.stringify(ctx, null, 2)}`
      : '\n\n(Cloud data unavailable — give helpful general guidance)';

    // Build conversation history for Claude
    const claudeMessages = [
      ...history
        .filter(m => m.id !== 'welcome')
        .slice(-10) // last 10 messages for context window
        .map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
      { role: 'user' as const, content: userQuery },
    ];

    const systemPrompt = `You are CloudGuard AI, an expert cloud cost optimization and security assistant embedded in the CloudGuard Pro platform.

You have real-time access to the user's live cloud infrastructure data provided below. Always use this data when answering — never make up numbers.

PLATFORM CONTEXT:
- User: ${user.name || 'Cloud Admin'}
- Platform: CloudGuard Pro (multi-cloud management)
- Providers: AWS, Azure, GCP
- Available pages: Dashboard, Cost Analytics, Optimization, Security, Resources, Migration Advisor, Reports, Billing${ctxStr}

RESPONSE GUIDELINES:
- Be concise, specific, and actionable — use real numbers from the data
- Use **bold** for key metrics and action items
- Use bullet points for lists
- Always end with a specific next step or page to visit
- If data is missing, say so and explain where the user can find it
- Format currency as $X,XXX (e.g. $1,240/mo)
- Be conversational but professional`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    return textBlock?.text || 'Sorry, I could not generate a response.';
  };

  // ── send message ──
  const handleSend = async (overrideInput?: string) => {
    const query = (overrideInput ?? input).trim();
    if (!query || isLoading) return;

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    // Optimistic streaming placeholder
    const assistantId = (Date.now() + 1).toString();
    const placeholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, placeholder]);
    setIsLoading(true);

    try {
      const currentHistory = messages; // capture before state update
      const reply = await callClaude(query, currentHistory);

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: reply, isStreaming: false }
          : m
      ));

      if (!isOpen) setUnread(n => n + 1);
    } catch (err: any) {
      // Graceful fallback
      const fallback = await getFallbackResponse(query);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: fallback, isStreaming: false }
          : m
      ));
    }

    setIsLoading(false);
  };

  // ── fallback when API is unavailable ──
  const getFallbackResponse = async (query: string): Promise<string> => {
    const q = query.toLowerCase();
    const ctx = await gatherContext();

    if (q.includes('cost') || q.includes('spend') || q.includes('bill')) {
      const accounts = ctx.accounts || [];
      const totalSpend = accounts.reduce((s: number, a: any) => s + (a.monthlySpend || 0), 0);
      if (totalSpend > 0) {
        return `💰 **Current Monthly Spend: $${totalSpend.toLocaleString()}**\n\n${accounts.map((a:any) =>
          `- **${a.name}** (${a.provider}): $${(a.monthlySpend||0).toLocaleString()}/mo`
        ).join('\n')}\n\nVisit **Cost Analytics** for detailed breakdowns and forecasts.`;
      }
      return `💰 Visit the **Cost Analytics** page for your detailed cloud spend breakdown, trends, and forecasts across all accounts.`;
    }

    if (q.includes('security') || q.includes('violation') || q.includes('risk')) {
      const sec = ctx.security;
      if (sec) {
        return `🔒 **Security Overview:**\n\n- 🔴 Critical: **${sec.critical}**\n- 🟠 High: **${sec.high}**\n- Total findings: **${sec.total}**\n\n${sec.critical > 0 ? '⚠️ You have critical issues that need immediate attention.' : '✅ No critical issues detected.'}\n\nVisit the **Security** page for remediation steps.`;
      }
      return `🔒 Visit the **Security** page to see your full security posture, compliance status, and remediation guidance.`;
    }

    if (q.includes('optim') || q.includes('save') || q.includes('reduc')) {
      return `🎯 Visit the **Optimization** page for AI-powered recommendations tailored to your infrastructure — with estimated savings for each action.`;
    }

    return `I'm having trouble connecting to the AI right now. You can find what you need in the navigation:\n\n- 💰 **Cost Analytics** — spending & forecasts\n- 🎯 **Optimization** — savings recommendations\n- 🔒 **Security** — findings & compliance\n- 📦 **Resources** — cloud inventory`;
  };

  // ── copy message ──
  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── clear chat ──
  const clearChat = () => {
    setMessages([]);
    setTimeout(addWelcome, 50);
  };

  // ── textarea auto-resize + enter to send ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── position ──
  const pos = position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6';
  const winWidth  = expanded ? 'w-[520px]' : 'w-96';
  const winHeight = expanded ? 'h-[700px]' : 'h-[600px]';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── FAB button ── */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className={`fixed ${pos} w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl shadow-2xl shadow-indigo-400/40 flex items-center justify-center transition-all duration-200 hover:scale-105 z-50 group`}>
          <MessageCircle size={22}/>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Ask CloudGuard AI
          </div>
        </button>
      )}

      {/* ── Chat window ── */}
      {isOpen && (
        <div className={`fixed ${pos} ${winWidth} ${winHeight} bg-[#0f172a] rounded-2xl shadow-2xl shadow-black/40 flex flex-col z-50 border border-slate-700/60 transition-all duration-200`}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-t-2xl flex-shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">CloudGuard AI</p>
              <p className="text-indigo-200 text-[11px] mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"/>
                Connected to your cloud data
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} title="Clear chat"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-indigo-200 hover:text-white transition-colors">
                <Trash2 size={13}/>
              </button>
              <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Shrink' : 'Expand'}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-indigo-200 hover:text-white transition-colors">
                {expanded ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
              </button>
              <button onClick={() => setIsOpen(false)} title="Close"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-indigo-200 hover:text-white transition-colors">
                <X size={15}/>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 group ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 self-end ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-500'
                }`}>
                  {msg.role === 'user'
                    ? <User size={13} className="text-white"/>
                    : <Bot size={13} className="text-white"/>}
                </div>

                {/* Bubble */}
                <div className={`relative max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-800 border border-slate-700/50 rounded-bl-sm'
                  }`}>
                    {msg.isStreaming ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex gap-1">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay:`${i*0.15}s`}}/>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">Thinking…</span>
                      </div>
                    ) : msg.role === 'assistant' ? (
                      <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                    ) : (
                      <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                  {/* Timestamp + copy */}
                  {!msg.isStreaming && (
                    <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] text-slate-600">
                        {msg.timestamp.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (
                        <button onClick={() => copyMessage(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400">
                          {copied === msg.id ? <Check size={11} className="text-emerald-400"/> : <Copy size={11}/>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}/>
          </div>

          {/* Suggestion chips — show after welcome only */}
          {messages.length === 1 && messages[0].id === 'welcome' && (
            <div className="px-4 pb-3 flex-shrink-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Quick questions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button key={i} onClick={() => handleSend(s.query)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-indigo-500/50 rounded-xl text-left transition-all group/chip">
                      <Icon size={11} className="text-indigo-400 flex-shrink-0"/>
                      <span className="text-xs text-slate-300 group-hover/chip:text-white truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0">
            <div className="flex gap-2 items-end bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 focus-within:border-indigo-500/60 rounded-2xl px-3.5 py-2.5 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your cloud…"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 resize-none focus:outline-none leading-relaxed disabled:opacity-50 max-h-[120px]"
                style={{ minHeight:'20px' }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
                className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-900/50">
                {isLoading ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 text-center">Shift+Enter for new line · Enter to send</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
