import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Plus, Trash2 } from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'react-hot-toast';

const DEFAULT_MODELS = ['kimi-k2p5', 'kimi-k2-instruct-0905'];

interface SettingsViewProps {
  onClose: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalBudget, setTotalBudget] = useState<string>('0');
  const [retryBudget, setRetryBudget] = useState<string>('3');
  const [modelCosts, setModelCosts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    storage.getSettings().then((s) => {
      if (cancelled) return;
      setTotalBudget(String(s.totalBudget ?? 0));
      setRetryBudget(String(s.retryBudget ?? 3));
      const costs: Record<string, string> = {};
      DEFAULT_MODELS.forEach((m) => { costs[m] = String(s.modelCosts?.[m] ?? ''); });
      Object.entries(s.modelCosts || {}).forEach(([k, v]) => { if (!costs[k]) costs[k] = String(v); });
      setModelCosts(costs);
    }).catch(() => toast.error('Failed to load settings')).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const costs: Record<string, number> = {};
      Object.entries(modelCosts).forEach(([k, v]) => {
        const n = parseFloat(v);
        if (!Number.isNaN(n) && n >= 0) costs[k] = n;
      });
      const current = await storage.getSettings();
      await storage.saveSettings({
        ...current,
        totalBudget: parseFloat(totalBudget) || 0,
        retryBudget: parseInt(retryBudget, 10) || 3,
        modelCosts: costs,
      });
      toast.success('Settings saved');
      onClose();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addModelRow = () => {
    const name = prompt('Model id (e.g. kimi-k2p5):');
    if (name && !modelCosts[name]) setModelCosts((prev) => ({ ...prev, [name]: '' }));
  };

  const removeModel = (key: string) => {
    setModelCosts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div className="bg-white rounded-xl shadow-2xl p-8">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Budget & Costs
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total budget ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0 = no cap"
            />
            <p className="text-xs text-slate-500 mt-1">Workflow run stops if cost exceeds this. 0 = no limit.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default retry budget (per step)</label>
            <input
              type="number"
              min="0"
              value={retryBudget}
              onChange={(e) => setRetryBudget(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">Max retries per step (overridden by step setting if lower).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cost per 1k tokens ($) by model</label>
            <div className="space-y-2">
              {Object.entries(modelCosts).map(([model, cost]) => (
                <div key={model} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={model}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={cost}
                    onChange={(e) => setModelCosts((prev) => ({ ...prev, [model]: e.target.value }))}
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => removeModel(model)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addModelRow}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Add model
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
