import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, AlertCircle } from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'react-hot-toast';

interface BudgetViewProps {
  onClose: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const settings = await storage.getSettings();
        const executions = await storage.getExecutions();
        if (cancelled) return;
        const budget = settings.totalBudget || 0;
        const spent = executions
          .filter((e) => e.totalCost != null && e.totalCost > 0)
          .reduce((sum, e) => sum + (e.totalCost || 0), 0);
        setTotalBudget(budget);
        setTotalSpent(spent);
        setRemaining(budget > 0 ? budget - spent : 0);
      } catch {
        toast.error('Failed to load budget');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div className="bg-white rounded-xl shadow-2xl p-8">Loading…</div>
      </div>
    );
  }

  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = remaining < 0;
  const isNearBudget = totalBudget > 0 && remaining > 0 && remaining < totalBudget * 0.1;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Budget & Cost
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Budget</span>
              <span className="text-lg font-bold text-slate-900">${totalBudget.toFixed(2)}</span>
            </div>
            {totalBudget === 0 && (
              <p className="text-xs text-slate-500 mt-1">No budget cap set (0 = unlimited)</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Spent</span>
              <span className="text-lg font-bold text-slate-700">${totalSpent.toFixed(4)}</span>
            </div>
            {totalBudget > 0 && (
              <div className="mt-2">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% used</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Remaining</span>
              <span
                className={`text-lg font-bold flex items-center gap-1 ${
                  isOverBudget ? 'text-red-600' : isNearBudget ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {isOverBudget && <AlertCircle className="w-5 h-5" />}
                ${remaining.toFixed(4)}
              </span>
            </div>
            {isOverBudget && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Over budget by ${Math.abs(remaining).toFixed(4)}
              </p>
            )}
            {isNearBudget && !isOverBudget && (
              <p className="text-xs text-amber-600 mt-1">Less than 10% remaining</p>
            )}
          </div>

          {totalBudget === 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600">
                Set a budget cap in <strong>Settings</strong> to track spending and get alerts.
              </p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
