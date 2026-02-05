import { useState, useCallback } from 'react';
import { Workflow, WorkflowExecution, StepResult } from '../types';
import { callUnboundAPI, evaluateLLMCriteria, computeCost } from './api';
import { storage } from './storage';
import { toast } from 'react-hot-toast';
import type { AppSettings } from '../types';

export function useWorkflowExecution() {
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);

  const checkCriteria = async (output: string, step: any): Promise<{ passed: boolean; reason?: string }> => {
    const { type, value } = step.completionCriteria;

    if (!value && type !== 'json') return { passed: true };

    switch (type) {
      case 'contains':
        return {
          passed: output.toLowerCase().includes(value.toLowerCase()),
          reason: `Output does not contain: "${value}"`
        };
      case 'regex':
        try {
          const regex = new RegExp(value);
          return {
            passed: regex.test(output),
            reason: `Output does not match regex: ${value}`
          };
        } catch (e) {
          return { passed: false, reason: 'Invalid regular expression' };
        }
      case 'json':
        try {
          JSON.parse(output.trim().replace(/```json\n?|\n?```/g, ''));
          return { passed: true };
        } catch (e) {
          return { passed: false, reason: 'Output is not valid JSON' };
        }
      case 'llm_eval':
        return await evaluateLLMCriteria(output, value);
      default:
        return { passed: true };
    }
  };

  const runWorkflow = useCallback(async (
    workflow: Workflow,
    modelCostOverrides?: Record<string, number>
  ) => {
    let settings: AppSettings;
    try {
      settings = await storage.getSettings();
    } catch {
      settings = { totalBudget: 0, retryBudget: 3, modelCosts: {}, notificationEmail: '' };
    }
    const modelCosts = modelCostOverrides != null
      ? { ...(settings.modelCosts || {}), ...modelCostOverrides }
      : (settings.modelCosts || {});

    function getCheapestModel(): string {
      const entries = Object.entries(modelCosts).filter(([, c]) => typeof c === 'number' && c >= 0);
      if (entries.length === 0) return 'kimi-k2-instruct-0905';
      return entries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0];
    }
    function getFallbackModel(): string {
      const entries = Object.entries(modelCosts).filter(([, c]) => typeof c === 'number' && c >= 0);
      if (entries.length === 0) return 'kimi-k2p5';
      return entries.reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
    }

    const execution: WorkflowExecution = {
      id: Math.random().toString(36).substr(2, 9),
      workflowId: workflow.id,
      status: 'running',
      results: [],
      startedAt: Date.now(),
      totalCost: 0
    };

    setCurrentExecution(execution);

    let context = '';
    let success = true;
    let totalCostSoFar = 0;
    let lastFailureMessage = '';
    const retryCap = Math.max(0, settings.retryBudget ?? 3);
    const budgetCap = settings.totalBudget > 0 ? settings.totalBudget : undefined;

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const maxRetries = Math.min(step.retries, retryCap);
      let attempt = 0;
      let stepPassed = false;
      let lastError = '';

      const stepResult: StepResult = {
        stepId: step.id,
        status: 'running',
        output: '',
        attempt: 0
      };

      setCurrentExecution((prev) =>
        prev ? { ...prev, results: [...prev.results, stepResult] } : null
      );

      while (attempt <= maxRetries && !stepPassed) {
        try {
          if (budgetCap != null && totalCostSoFar >= budgetCap) {
            lastError = `Budget cap ($${budgetCap}) reached. Stopping.`;
            lastFailureMessage = lastError;
            setCurrentExecution((prev) => {
              if (!prev) return null;
              const newResults = [...prev.results];
              newResults[i] = { ...newResults[i], status: 'failed', error: lastError };
              return { ...prev, results: newResults };
            });
            success = false;
            break;
          }

          if (attempt > 0) {
            setCurrentExecution((prev) => {
              if (!prev) return null;
              const newResults = [...prev.results];
              newResults[i] = { ...newResults[i], status: 'retrying', attempt };
              return { ...prev, results: newResults };
            });
          }

          const fullPrompt =
            context ? `Previous Step Context:\n${context}\n\nTask:\n${step.prompt}` : step.prompt;

          const useAutoForStep = (step.model as string) === 'auto';
          const model = useAutoForStep ? getCheapestModel() : step.model;
          const result = await callUnboundAPI(model, step.prompt, context);
          const costPer1k = modelCosts?.[model] ?? 0;
          const stepCost = computeCost(result.usage, costPer1k);
          totalCostSoFar += stepCost;

          setCurrentExecution((prev) => {
            if (!prev) return null;
            const newResults = [...prev.results];
            newResults[i] = {
              ...newResults[i],
              output: result.content,
              promptSent: fullPrompt,
              tokenUsage: result.usage,
              cost: stepCost
            };
            return { ...prev, results: newResults, totalCost: totalCostSoFar };
          });

          const criteriaResult = await checkCriteria(result.content, step);

          if (criteriaResult.passed) {
            stepPassed = true;
            context = result.content;
            setCurrentExecution((prev) => {
              if (!prev) return null;
              const newResults = [...prev.results];
              newResults[i] = { ...newResults[i], status: 'success' };
              return { ...prev, results: newResults };
            });
          } else {
            lastError = criteriaResult.reason || 'Criteria not met';
            const tryFallback = useAutoForStep && attempt >= maxRetries;
            if (tryFallback) {
              const fallbackModel = getFallbackModel();
              if (fallbackModel !== model) {
                try {
                  const fallbackResult = await callUnboundAPI(fallbackModel, step.prompt, context);
                  const fallbackCost = computeCost(fallbackResult.usage, modelCosts?.[fallbackModel] ?? 0);
                  totalCostSoFar += fallbackCost;
                  setCurrentExecution((prev) => {
                    if (!prev) return null;
                    const newResults = [...prev.results];
                    newResults[i] = {
                      ...newResults[i],
                      output: fallbackResult.content,
                      promptSent: fullPrompt,
                      tokenUsage: fallbackResult.usage,
                      cost: (newResults[i].cost ?? 0) + fallbackCost
                    };
                    return { ...prev, results: newResults, totalCost: totalCostSoFar };
                  });
                  const fallbackCriteria = await checkCriteria(fallbackResult.content, step);
                  if (fallbackCriteria.passed) {
                    stepPassed = true;
                    context = fallbackResult.content;
                    setCurrentExecution((prev) => {
                      if (!prev) return null;
                      const newResults = [...prev.results];
                      newResults[i] = { ...newResults[i], status: 'success' };
                      return { ...prev, results: newResults };
                    });
                  }
                } catch (_) {}
              }
            }
            if (!stepPassed) {
              attempt++;
              if (attempt > maxRetries) {
                setCurrentExecution((prev) => {
                  if (!prev) return null;
                  const newResults = [...prev.results];
                  newResults[i] = { ...newResults[i], status: 'failed', error: lastError };
                  return { ...prev, results: newResults };
                });
              }
            }
          }
        } catch (error: any) {
          lastError = error.message;
          attempt++;
          if (attempt > maxRetries) {
            setCurrentExecution((prev) => {
              if (!prev) return null;
              const newResults = [...prev.results];
              newResults[i] = { ...newResults[i], status: 'failed', error: lastError };
              return { ...prev, results: newResults };
            });
          }
        }
      }

      if (!stepPassed) {
        success = false;
        lastFailureMessage = lastError;
        break;
      }
    }

    setCurrentExecution((prev) => {
      if (!prev) return null;
      const finished = {
        ...prev,
        status: (success ? 'completed' : 'failed') as any,
        completedAt: Date.now(),
        totalCost: totalCostSoFar
      };
      storage
        .addExecution(finished, workflow.name)
        .catch(() => toast.error('Failed to save run history'));
      return finished;
    });

    if (success) {
      toast.success(`Workflow completed!${totalCostSoFar > 0 ? ` Cost: $${totalCostSoFar.toFixed(4)}` : ''}`);
    } else {
      toast.error(`Workflow failed.${lastFailureMessage ? ` ${lastFailureMessage}` : ''}`);
    }
  }, []);

  return {
    currentExecution,
    setCurrentExecution,
    runWorkflow
  };
}
