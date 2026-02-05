import React, { useState, useEffect } from 'react';
import { Play, Plus, DollarSign, Sparkles } from 'lucide-react';
import { Workflow, WorkflowStep } from '../types';
import { StepItem } from './StepItem';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../lib/storage';

const MODELS = ['kimi-k2p5', 'kimi-k2-instruct-0905'] as const;

interface WorkflowEditorProps {
  workflow: Workflow;
  onUpdate: (workflow: Workflow) => void;
  onRun: (modelCostOverrides?: Record<string, number>) => void;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow,
  onUpdate,
  onRun
}) => {
  const [costPer1k, setCostPer1k] = useState<Record<string, string>>({
    'kimi-k2p5': '',
    'kimi-k2-instruct-0905': ''
  });
  const allStepsAuto = workflow.steps.length > 0 && workflow.steps.every((s) => (s.model as string) === 'auto');

  useEffect(() => {
    let cancelled = false;
    storage.getSettings().then((s) => {
      if (cancelled) return;
      const costs: Record<string, string> = {};
      MODELS.forEach((m) => { costs[m] = s.modelCosts?.[m] != null ? String(s.modelCosts[m]) : ''; });
      setCostPer1k((prev) => ({ ...prev, ...costs }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const getCostOverrides = (): Record<string, number> | undefined => {
    const out: Record<string, number> = {};
    MODELS.forEach((m) => {
      const v = parseFloat(costPer1k[m]);
      if (!Number.isNaN(v) && v >= 0) out[m] = v;
    });
    return Object.keys(out).length > 0 ? out : undefined;
  };
  const addStep = () => {
    const newStep: WorkflowStep = {
      id: uuidv4(),
      name: `Step ${workflow.steps.length + 1}`,
      model: 'kimi-k2p5',
      prompt: '',
      completionCriteria: {
        type: 'contains',
        value: ''
      },
      retries: 1
    };
    onUpdate({
      ...workflow,
      steps: [...workflow.steps, newStep]
    });
  };

  const updateStep = (updatedStep: WorkflowStep) => {
    onUpdate({
      ...workflow,
      steps: workflow.steps.map(s => s.id === updatedStep.id ? updatedStep : s)
    });
  };

  const deleteStep = (id: string) => {
    onUpdate({
      ...workflow,
      steps: workflow.steps.filter(s => s.id !== id)
    });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...workflow.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    onUpdate({ ...workflow, steps: newSteps });
  };

  const setAllStepsAuto = (useAuto: boolean) => {
    onUpdate({
      ...workflow,
      steps: workflow.steps.map((s) => ({
        ...s,
        model: useAuto ? 'auto' : ((s.model as string) === 'auto' ? 'kimi-k2p5' : s.model)
      }))
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => onUpdate({ ...workflow, name: e.target.value })}
            className="text-xl font-semibold bg-transparent border border-transparent focus:border-slate-200 focus:bg-white rounded-md px-2 py-1 w-full"
            placeholder="Workflow Name"
          />
          <div className="text-xs text-slate-500 px-2">Build steps, then Run. Context passes automatically.</div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Cost per 1k tokens ($):
            </span>
            {MODELS.map((m) => (
              <label key={m} className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 truncate max-w-[100px]">{m}</span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={costPer1k[m] ?? ''}
                  onChange={(e) => setCostPer1k((prev) => ({ ...prev, [m]: e.target.value }))}
                  placeholder="0"
                  className="w-16 px-2 py-1 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => setAllStepsAuto(!allStepsAuto)}
            disabled={workflow.steps.length === 0}
            title="Set all steps to Auto: cheaper model first; fall back to capable model if step fails"
            className={`px-3 py-2 rounded-md border text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              allStepsAuto
                ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Auto
          </button>
          <button
            onClick={addStep}
            className="px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-sm"
          >
            <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" />Add Step</span>
          </button>
          <button
            onClick={() => onRun(getCostOverrides())}
            disabled={workflow.steps.length === 0}
            className="px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />Run</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {workflow.steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <StepItem
              step={step}
              index={index}
              totalSteps={workflow.steps.length}
              onUpdate={updateStep}
              onDelete={deleteStep}
              onMoveUp={(idx) => moveStep(idx, 'up')}
              onMoveDown={(idx) => moveStep(idx, 'down')}
            />
            {index < workflow.steps.length - 1 && (
              <div className="flex justify-center -my-1">
                <div className="text-[10px] text-slate-400">Next</div>
              </div>
            )}
          </React.Fragment>
        ))}

        {workflow.steps.length === 0 && (
          <div className="border border-dashed border-slate-300 rounded-lg p-6 text-sm text-slate-600 bg-slate-50">
            No steps yet. Click <span className="font-medium">Add Step</span> to create your first agent step.
          </div>
        )}
      </div>
    </div>
  );
};
