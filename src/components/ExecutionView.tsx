import React from 'react';
import { CheckCircle2, XCircle, Loader2, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { WorkflowExecution, Workflow } from '../types';

interface ExecutionViewProps {
  execution: WorkflowExecution;
  workflow?: Workflow;
  onClose: () => void;
}

export const ExecutionView: React.FC<ExecutionViewProps> = ({
  execution,
  workflow,
  onClose
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
      case 'retrying': return <RotateCcw className="w-5 h-5 text-amber-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Execution: {workflow?.name || 'Workflow'}
              {execution.status === 'running' && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Running</span>
              )}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Started at {new Date(execution.startedAt).toLocaleString()}
              {execution.totalCost != null && execution.totalCost > 0 && (
                <span className="ml-2 font-medium text-slate-700">Total cost: ${execution.totalCost.toFixed(4)}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {execution.results.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Initializing workflow execution...</p>
            </div>
          )}

          {execution.results.map((result, index) => {
            const step = workflow?.steps.find(s => s.id === result.stepId);
            return (
              <div key={result.stepId} className={`border rounded-xl overflow-hidden ${
                result.status === 'running' ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-200'
              }`}>
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-sm font-bold text-slate-600 shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{step?.name || 'Step'}</h3>
                      <p className="text-xs text-slate-500">{step?.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {result.cost != null && result.cost > 0 && (
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        ${result.cost.toFixed(4)}
                      </span>
                    )}
                    {result.attempt > 0 && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        Attempt {result.attempt + 1}
                      </span>
                    )}
                    {getStatusIcon(result.status)}
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {result.output && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Output</label>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {result.output}
                      </pre>
                    </div>
                  )}
                  {result.error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-xs uppercase mb-1 text-red-800">Criteria Failed</p>
                        <p>{result.error}</p>
                      </div>
                    </div>
                  )}
                  {result.status === 'running' && !result.output && (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      <span className="text-sm text-slate-500 italic">Agent is thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {execution.status !== 'running' && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg"
            >
              Close History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
