import React from 'react';
import { WorkflowExecution, Workflow } from '../types';
import { Clock, CheckCircle2, XCircle, ChevronRight, History } from 'lucide-react';

interface HistoryListProps {
  executions: WorkflowExecution[];
  workflows: Workflow[];
  onSelect: (execution: WorkflowExecution) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  executions,
  workflows,
  onSelect
}) => {
  if (executions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50">
        <History className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-semibold">No history yet</h2>
        <p>Run a workflow to see the results here.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Execution History</h2>
        <div className="text-xs text-slate-500">Saved locally</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {executions.map((exec, idx) => {
          const workflow = workflows.find(w => w.id === exec.workflowId);
          return (
            <div
              key={exec.id}
              onClick={() => onSelect(exec)}
              className={`flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                idx !== executions.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  exec.status === 'completed' ? 'bg-green-100 text-green-600' : 
                  exec.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {exec.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : 
                   exec.status === 'failed' ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{workflow?.name || 'Unknown Workflow'}</h3>
                  <p className="text-xs text-slate-500">
                    {new Date(exec.startedAt).toLocaleString()} • {exec.results.length} steps
                    {exec.totalCost != null && exec.totalCost > 0 && (
                      <span className="ml-1 font-medium text-slate-600">• ${exec.totalCost.toFixed(4)}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  exec.status === 'completed' ? 'bg-green-50 text-green-700' : 
                  exec.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {exec.status.charAt(0).toUpperCase() + exec.status.slice(1)}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
