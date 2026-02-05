import React from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { WorkflowStep, ModelType } from '../types';

interface StepItemProps {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  onUpdate: (step: WorkflowStep) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const StepItem: React.FC<StepItemProps> = ({
  step,
  index,
  totalSteps,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-col gap-1">
          <button 
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button 
            disabled={index === totalSteps - 1}
            onClick={() => onMoveDown(index)}
            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={step.name}
            onChange={(e) => onUpdate({ ...step, name: e.target.value })}
            className="bg-transparent border-none font-semibold text-slate-800 focus:ring-0 p-0 w-full"
            placeholder="Step Name"
          />
        </div>
        <button
          onClick={() => onDelete(step.id)}
          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Model</label>
            <select
              value={step.model}
              onChange={(e) => onUpdate({ ...step, model: e.target.value as ModelType })}
              className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="auto">Auto (cheaper when possible)</option>
              <option value="kimi-k2p5">Kimi K2P5 (Faster)</option>
              <option value="kimi-k2-instruct-0905">Kimi K2 Instruct (Smartest)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Retries</label>
            <input
              type="number"
              min="0"
              max="5"
              value={step.retries}
              onChange={(e) => onUpdate({ ...step, retries: parseInt(e.target.value) || 0 })}
              className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Prompt</label>
          <p className="text-[10px] text-slate-400 -mt-1 mb-1">Context from the previous step will be automatically prepended.</p>
          <textarea
            value={step.prompt}
            onChange={(e) => onUpdate({ ...step, prompt: e.target.value })}
            rows={4}
            className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            placeholder="Enter your prompt here..."
          />
        </div>

        <div className="space-y-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Completion Criteria</label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={step.completionCriteria.type}
              onChange={(e) => onUpdate({ 
                ...step, 
                completionCriteria: { ...step.completionCriteria, type: e.target.value as any } 
              })}
              className="col-span-1 text-xs border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="contains">Contains String</option>
              <option value="regex">Regex Match</option>
              <option value="json">Valid JSON</option>
              <option value="llm_eval">LLM Evaluation</option>
            </select>
            <input
              type="text"
              value={step.completionCriteria.value}
              onChange={(e) => onUpdate({ 
                ...step, 
                completionCriteria: { ...step.completionCriteria, value: e.target.value } 
              })}
              placeholder={
                step.completionCriteria.type === 'llm_eval' 
                  ? "e.g. The response is a summary..." 
                  : "Criteria value..."
              }
              className="col-span-2 text-xs border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
