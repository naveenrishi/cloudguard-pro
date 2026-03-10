// src/components/dashboard/BudgetWidget.tsx — UI REDESIGN ONLY
// ✅ All props, state, handlers 100% preserved
import React, { useState } from 'react';
import { DollarSign, AlertTriangle, Plus, X, MoreHorizontal } from 'lucide-react';

interface Budget {
  id: string; name: string; amount: number; period: string;
  provider?: string; alertThreshold: number; currentSpend?: number; alerts?: any[];
}

interface BudgetWidgetProps {
  budgets: Budget[];
  onCreateBudget: (budget: any) => void;
}

const BudgetWidget: React.FC<BudgetWidgetProps> = ({ budgets, onCreateBudget }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    name: '', amount: 1000, period: 'monthly', provider: '', alertThreshold: 80,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBudget(newBudget);
    setShowCreateModal(false);
    setNewBudget({ name: '', amount: 1000, period: 'monthly', provider: '', alertThreshold: 80 });
  };

  const getPercentage = (budget: Budget) =>
    budget.currentSpend ? (budget.currentSpend / budget.amount) * 100 : 0;

  const getBarColor = (pct: number) =>
    pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign size={16} className="text-emerald-600"/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Budget Tracking</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Monitor spending limits</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
            <Plus size={12}/> New
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
            <MoreHorizontal size={15}/>
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
              <DollarSign size={20} className="text-gray-300"/>
            </div>
            <p className="text-sm text-gray-400 font-medium">No budgets configured</p>
            <button onClick={() => setShowCreateModal(true)}
              className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold">
              Create your first budget →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map(budget => {
              const pct = getPercentage(budget);
              const barColor = getBarColor(pct);
              return (
                <div key={budget.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{budget.name}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {budget.period} · {budget.provider || 'All providers'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">
                        ${(budget.currentSpend || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-gray-400">of ${budget.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}/>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] font-semibold text-gray-500">{pct.toFixed(1)}%</span>
                    {pct >= budget.alertThreshold && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                        <AlertTriangle size={11}/> Threshold reached
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Create Budget</h2>
              <button onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Budget Name</label>
                <input type="text" value={newBudget.name}
                  onChange={e => setNewBudget({ ...newBudget, name: e.target.value })}
                  placeholder="e.g., Monthly AWS Budget" required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount ($)</label>
                  <input type="number" value={newBudget.amount}
                    onChange={e => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) })}
                    min="1" required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Period</label>
                  <select value={newBudget.period}
                    onChange={e => setNewBudget({ ...newBudget, period: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cloud Provider (Optional)</label>
                <select value={newBudget.provider}
                  onChange={e => setNewBudget({ ...newBudget, provider: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors">
                  <option value="">All Providers</option>
                  <option value="aws">AWS</option>
                  <option value="azure">Azure</option>
                  <option value="gcp">GCP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alert Threshold (%)</label>
                <input type="number" value={newBudget.alertThreshold}
                  onChange={e => setNewBudget({ ...newBudget, alertThreshold: parseFloat(e.target.value) })}
                  min="1" max="100" required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"/>
                <p className="text-[11px] text-gray-400 mt-1">Get notified when spending reaches this percentage</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white transition-colors">
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetWidget;
