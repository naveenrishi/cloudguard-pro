// src/components/dashboard/CostRecommendationsWidget.tsx — UI REDESIGN ONLY
// ✅ All props/state/handlers 100% preserved
import React, { useState } from 'react';
import { Lightbulb, CheckCircle, ChevronRight, MoreHorizontal } from 'lucide-react';

interface CostRecommendation {
  id: string; provider: string; service: string; resourceType: string;
  resourceName?: string; recommendationType: string; currentCost: number;
  estimatedSavings: number; savingsPercent: number; priority: string;
  status: string; description: string; actionSteps?: string[];
}

interface CostRecommendationsWidgetProps {
  recommendations: CostRecommendation[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

const priorityStyle = (p: string) => {
  if (p === 'high')   return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  if (p === 'medium') return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  return                     { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
};

const recIcon = (t: string) => {
  if (t === 'right_sizing')          return '📏';
  if (t === 'reserved_instances')    return '💰';
  if (t === 'spot_instances')        return '⚡';
  if (t === 'idle_resources')        return '😴';
  if (t === 'storage_optimization')  return '💾';
  return '💡';
};

const fmtType = (t: string) =>
  t.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const CostRecommendationsWidget: React.FC<CostRecommendationsWidgetProps> = ({
  recommendations, onAccept, onReject,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending      = recommendations.filter(r => r.status === 'pending');
  const totalSavings = pending.reduce((s, r) => s + r.estimatedSavings, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center">
            <Lightbulb size={16} className="text-yellow-600"/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Cost Recommendations</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Potential savings: ${totalSavings.toFixed(2)}/mo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-base font-bold text-emerald-600 leading-none">${totalSavings.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400">Monthly</p>
          </div>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
            <MoreHorizontal size={15}/>
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-500"/>
            </div>
            <p className="text-sm text-gray-400 font-medium">All recommendations reviewed!</p>
            <p className="text-xs text-gray-300">Check back later for new opportunities</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pending.slice(0, 5).map(rec => {
              const pStyle = priorityStyle(rec.priority);
              const isExp  = expandedId === rec.id;
              return (
                <div key={rec.id} className="rounded-xl border border-gray-100 overflow-hidden hover:border-indigo-100 transition-all">
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">{recIcon(rec.recommendationType)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}` }}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-gray-400">{rec.provider.toUpperCase()} · {rec.service}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">{fmtType(rec.recommendationType)}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{rec.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px]">
                          <span className="text-gray-500">Current: <span className="font-semibold text-gray-700">${rec.currentCost.toFixed(2)}/mo</span></span>
                          <span className="text-emerald-600 font-bold">Save ${rec.estimatedSavings.toFixed(2)}/mo ({rec.savingsPercent.toFixed(0)}%)</span>
                        </div>
                        {rec.resourceName && <p className="text-[10px] text-gray-400 mt-1">Resource: {rec.resourceName}</p>}
                        {rec.actionSteps && rec.actionSteps.length > 0 && (
                          <button onClick={() => setExpandedId(isExp ? null : rec.id)}
                            className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-600 mt-2 font-semibold">
                            <ChevronRight size={11} className={`transition-transform ${isExp ? 'rotate-90' : ''}`}/>
                            {isExp ? 'Hide' : 'Show'} steps
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => onAccept(rec.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-colors">
                          Accept
                        </button>
                        <button onClick={() => onReject(rec.id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-semibold rounded-xl transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExp && rec.actionSteps && (
                    <div className="px-4 pb-3 pt-0 bg-gray-50 border-t border-gray-100">
                      <p className="text-[11px] font-bold text-gray-600 mb-2 mt-2.5">Implementation Steps:</p>
                      <ol className="space-y-1">
                        {rec.actionSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-gray-500">
                            <span className="font-bold text-indigo-500 flex-shrink-0">{i+1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
            {pending.length > 5 && (
              <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-semibold rounded-xl border border-gray-100 transition-colors">
                View All {pending.length} Recommendations
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CostRecommendationsWidget;
