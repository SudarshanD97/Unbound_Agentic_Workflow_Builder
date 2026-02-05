import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
// Sidebar removed for simpler UI
import { WorkflowEditor } from './components/WorkflowEditor';
import { ExecutionView } from './components/ExecutionView';
import { HistoryList } from './components/HistoryList';
import { SettingsView } from './components/SettingsView';
import { NotificationsView } from './components/NotificationsView';
import { BudgetView } from './components/BudgetView';
import { Workflow, WorkflowExecution } from './types';
import { storage } from './lib/storage';
import { useWorkflowExecution } from './lib/useWorkflowExecution';

export function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'history'>('editor');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<{ workflows: number; executions: number } | null>(null);
  const { currentExecution, setCurrentExecution, runWorkflow } = useWorkflowExecution();

  const loadExecutions = useCallback(async () => {
    try {
      const list = await storage.getExecutions();
      setExecutions(list);
    } catch {
      setExecutions([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const saved = await storage.getWorkflows();
        if (cancelled) return;
        if (saved.length > 0) {
          setWorkflows(saved);
          setActiveWorkflowId(saved[0].id);
        } else {
          const initial: Workflow = {
            id: uuidv4(),
            name: 'Email drafter & Reviewer',
            createdAt: Date.now(),
            steps: [
              {
                id: uuidv4(),
                name: 'Draft Email',
                model: 'kimi-k2p5',
                prompt: 'Draft a polite email to a client asking for a project update.',
                completionCriteria: { type: 'contains', value: 'Regards' },
                retries: 1
              },
              {
                id: uuidv4(),
                name: 'Extract Tasks',
                model: 'kimi-k2p5',
                prompt: 'Extract any tasks or questions mentioned in the previous email into a bulleted list.',
                completionCriteria: { type: 'contains', value: '-' },
                retries: 1
              }
            ]
          };
          setWorkflows([initial]);
          setActiveWorkflowId(initial.id);
          await storage.saveWorkflows([initial]);
        }
        await loadExecutions();
      } catch {
        if (!cancelled) toast.error('Failed to load workflows');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (view === 'history') loadExecutions();
  }, [view, loadExecutions]);

  const refreshServerStatus = useCallback(async () => {
    try {
      const s = await storage.getStatus();
      if (s.stored) setServerStatus({ workflows: s.workflows, executions: s.executions });
      else setServerStatus(null);
    } catch {
      setServerStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!loading) refreshServerStatus();
  }, [loading, refreshServerStatus]);

  const handleUpdateWorkflow = async (updated: Workflow) => {
    const next = workflows.map(w => w.id === updated.id ? updated : w);
    setWorkflows(next);
    try {
      await storage.saveWorkflows(next);
      refreshServerStatus();
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleAddWorkflow = async () => {
    const newWf: Workflow = {
      id: uuidv4(),
      name: 'New Workflow',
      createdAt: Date.now(),
      steps: []
    };
    const next = [...workflows, newWf];
    setWorkflows(next);
    setActiveWorkflowId(newWf.id);
    setView('editor');
    try {
      await storage.saveWorkflows(next);
      refreshServerStatus();
      toast.success('New workflow created');
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    const next = workflows.filter(w => w.id !== id);
    setWorkflows(next);
    if (activeWorkflowId === id) {
      setActiveWorkflowId(next.length > 0 ? next[0].id : null);
    }
    try {
      await storage.saveWorkflows(next);
      refreshServerStatus();
      toast.success('Workflow deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleExportWorkflows = () => {
    const toExport = activeWorkflowId ? workflows.filter(w => w.id === activeWorkflowId) : workflows;
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workflows-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${toExport.length} workflow(s)`);
  };

  const handleImportWorkflows = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : (data.workflows ? data.workflows : [data]);
      if (list.length === 0) {
        toast.error('No workflows in file');
        return;
      }
      const { imported } = await storage.importWorkflows(list);
      const fresh = await storage.getWorkflows();
      setWorkflows(fresh);
      if (fresh.length > 0 && !activeWorkflowId) setActiveWorkflowId(fresh[0].id);
      refreshServerStatus();
      toast.success(`Imported ${imported} workflow(s)`);
    } catch {
      toast.error('Invalid JSON or import failed');
    }
    e.target.value = '';
  };

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="bottom-right" />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="font-bold tracking-tight text-slate-900">Agentic Workflow Builder</div>
          {serverStatus !== null && (
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded" title="Counts stored in database">
              DB: {serverStatus.workflows} workflow{serverStatus.workflows !== 1 ? 's' : ''}, {serverStatus.executions} run{serverStatus.executions !== 1 ? 's' : ''}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setView('editor')}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                view === 'editor'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Builder
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                view === 'history'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Runs
            </button>
            <button
              onClick={() => setBudgetOpen(true)}
              className="px-3 py-1.5 rounded-md text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              title="View remaining budget and spending"
            >
              Budget
            </button>
            <button
              onClick={() => setNotificationsOpen(true)}
              className="px-3 py-1.5 rounded-md text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              title="Email for workflow completion/failure notifications"
            >
              Notifications
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-md text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              title="Budget, model costs, retry budget"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: simple workflow list */}
        <aside className="bg-white border border-slate-200 rounded-xl overflow-hidden h-fit">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold">Workflows</div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportWorkflows}
                className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                title="Export as JSON"
              >
                Export
              </button>
              <button
                onClick={() => document.getElementById('import-workflow-input')?.click()}
                className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                title="Import from JSON"
              >
                Import
              </button>
              <input
                id="import-workflow-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportWorkflows}
              />
              <button
                onClick={handleAddWorkflow}
                className="text-sm px-2.5 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                New
              </button>
            </div>
          </div>
          <div className="p-2">
            {workflows.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">No workflows yet.</div>
            ) : (
              <div className="space-y-1">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                      activeWorkflowId === wf.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      setActiveWorkflowId(wf.id);
                      setView('editor');
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{wf.name}</div>
                      <div className="text-xs text-slate-500">{wf.steps.length} steps</div>
                    </div>
                    <button
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkflow(wf.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right: main content */}
        <main className="min-h-[60vh]">
          {view === 'editor' ? (
            activeWorkflow ? (
              <WorkflowEditor
                workflow={activeWorkflow}
                onUpdate={handleUpdateWorkflow}
                onRun={(costOverrides) => runWorkflow(activeWorkflow, costOverrides)}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-slate-500">
                Select or create a workflow.
              </div>
            )
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <HistoryList
                executions={executions}
                workflows={workflows}
                onSelect={setSelectedHistory}
              />
            </div>
          )}
        </main>
      </div>

      {settingsOpen && <SettingsView onClose={() => setSettingsOpen(false)} />}
      {notificationsOpen && <NotificationsView onClose={() => setNotificationsOpen(false)} />}
      {budgetOpen && <BudgetView onClose={() => setBudgetOpen(false)} />}

      {(currentExecution || selectedHistory) && (
        <ExecutionView
          execution={currentExecution || selectedHistory!}
          workflow={workflows.find(
            (w) => w.id === (currentExecution?.workflowId || selectedHistory?.workflowId)
          )}
          onClose={() => {
            setCurrentExecution(null);
            setSelectedHistory(null);
            loadExecutions();
            refreshServerStatus();
          }}
        />
      )}
    </div>
  );
}
