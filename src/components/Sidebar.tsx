import React from 'react';
import { Plus, List, History, Settings, Trash2 } from 'lucide-react';
import { Workflow } from '../types';

interface SidebarProps {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  onSelectWorkflow: (id: string) => void;
  onAddWorkflow: () => void;
  onDeleteWorkflow: (id: string) => void;
  view: 'editor' | 'history';
  onSetView: (view: 'editor' | 'history') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
  onAddWorkflow,
  onDeleteWorkflow,
  view,
  onSetView
}) => {
  return (
    <div className="w-64 border-r border-slate-200 h-screen flex flex-col bg-slate-50">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Agentic Flow
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4">
          <button
            onClick={() => onSetView('editor')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'editor' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <List className="w-4 h-4" />
            Workflows
          </button>
          <button
            onClick={() => onSetView('history')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mt-1 transition-colors ${
              view === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Execution History
          </button>
        </div>

        {view === 'editor' && (
          <div className="px-2 space-y-1">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Workflows
            </div>
            {workflows.map(wf => (
              <div
                key={wf.id}
                className={`group flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeWorkflowId === wf.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => onSelectWorkflow(wf.id)}
              >
                <div className="flex-1 truncate text-sm">{wf.name}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWorkflow(wf.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={onAddWorkflow}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-400">
          Unbound Hackathon 2025
        </div>
      </div>
    </div>
  );
};
