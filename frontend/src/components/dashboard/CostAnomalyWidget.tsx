// src/components/dashboard/CostAnomalyWidget.tsx — UI REDESIGN ONLY
// ✅ All props/logic 100% preserved
import React from 'react';
import { TrendingUp, CheckCircle, MoreHorizontal } from 'lucide-react';

interface CostAnomaly {
  id: string; provider: string; service: string; date: Date;
  expectedCost: number; actualCost: number; deviation: number;
  severity: string; isReviewed: boolean;
}

interface CostAnomalyWidgetProps {
  anomalies: CostAnomaly[];
  onReview: (anomalyId: string) => void;
}

const providerEmoji = (p: string) =>
  p === 'aws' ? '☁️' : p === 'azure' ? '🔷' : p === 'gcp' ? '🌐' : '💰';

const severityStyle = (s: string) => {
  if (s === 'critical') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  if (s === 'high')     return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  if (s === 'medium')   return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  return                       { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
};

const CostAnomalyWidget: React.FC<CostAnomalyWidgetProps> = ({ anomalies, onReview }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between px-5 pt-5 pb-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
          <TrendingUp size={16} className="text-orange-600"/>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Cost Anomalies</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Unusual spending detected</p>
        </div>
      </div>
      {anomalies.filter(a => !a.isReviewed).length > 0 && (
        <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 text-xs font-bold rounded-xl">
          {anomalies.filter(a => !a.isReviewed).length} new
        </span>
      )}
      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors ml-1">
        <MoreHorizontal size={15}/>
      </button>
    </div>

    <div className="px-5 py-4">
      {anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={20} className="text-emerald-500"/>
          </div>
          <p className="text-sm text-gray-400 font-medium">No cost anomalies detected</p>
          <p className="text-xs text-gray-300">Spending is within expected ranges</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {anomalies.slice(0, 5).map(anomaly => {
            const sStyle = severityStyle(anomaly.severity);
            return (
              <div key={anomaly.id}
                className={`p-3.5 rounded-xl border transition-all ${anomaly.isReviewed ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-orange-100 shadow-sm shadow-orange-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-base">{providerEmoji(anomaly.provider)}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}` }}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      {anomaly.isReviewed && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">REVIEWED</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {anomaly.service} — {anomaly.provider.toUpperCase()}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Expected</p>
                        <p className="text-xs font-bold text-gray-700">${anomaly.expectedCost.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Actual</p>
                        <p className="text-xs font-bold text-red-600">${anomaly.actualCost.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Deviation</p>
                        <p className="text-xs font-bold text-orange-600">+{anomaly.deviation.toFixed(1)}%</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {new Date(anomaly.date).toLocaleDateString()}
                    </p>
                  </div>
                  {!anomaly.isReviewed && (
                    <button onClick={() => onReview(anomaly.id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-semibold transition-colors">
                      Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {anomalies.length > 5 && (
            <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-semibold rounded-xl border border-gray-100 transition-colors">
              View All {anomalies.length} Anomalies
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

export default CostAnomalyWidget;
