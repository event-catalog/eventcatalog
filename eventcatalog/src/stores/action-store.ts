import { atom, map } from 'nanostores';
import type { ActionExecuteResponse, ActionMetadata, ActionContext } from '@enterprise/actions/action-types';

export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ActionState {
  status: ActionStatus;
  result: ActionExecuteResponse | null;
  error: string | null;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error';
  message: string;
  duration?: number;
}

// Console execution log entry
export interface ConsoleLogEntry {
  id: string;
  timestamp: Date;
  actionName: string;
  actionLabel: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
  result?: ActionExecuteResponse;
  context: ActionContext;
  logs: ConsoleLogLine[];
}

export interface ConsoleLogLine {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'system';
  message: string;
}

// Store for action states keyed by action instance ID
export const actionStates = map<Record<string, ActionState>>({});

// Store for console panel state
export const consoleStore = atom<{
  isOpen: boolean;
  activeTab: 'actions' | 'history';
  selectedLogId: string | null;
}>({
  isOpen: false,
  activeTab: 'actions',
  selectedLogId: null,
});

// Store for execution history
export const executionHistoryStore = atom<ConsoleLogEntry[]>([]);

// Store for available actions (fetched from API)
export const availableActionsStore = atom<ActionMetadata[]>([]);

// Store for modal state
export const actionModalStore = atom<{
  isOpen: boolean;
  actionName: string | null;
  result: ActionExecuteResponse | null;
}>({
  isOpen: false,
  actionName: null,
  result: null,
});

// Store for toast notifications
export const toastStore = atom<ToastNotification[]>([]);

/**
 * Get the state for a specific action instance
 */
export const getActionState = (instanceId: string): ActionState => {
  const states = actionStates.get();
  return (
    states[instanceId] || {
      status: 'idle',
      result: null,
      error: null,
    }
  );
};

/**
 * Set the state for a specific action instance
 */
export const setActionState = (instanceId: string, state: Partial<ActionState>) => {
  const currentStates = actionStates.get();
  const currentState = currentStates[instanceId] || { status: 'idle', result: null, error: null };
  actionStates.setKey(instanceId, { ...currentState, ...state });
};

/**
 * Start executing an action
 */
export const startAction = (instanceId: string) => {
  setActionState(instanceId, {
    status: 'loading',
    result: null,
    error: null,
  });
};

/**
 * Complete an action with success
 */
export const completeAction = (instanceId: string, result: ActionExecuteResponse) => {
  setActionState(instanceId, {
    status: 'success',
    result,
    error: null,
  });
};

/**
 * Complete an action with error
 */
export const failAction = (instanceId: string, error: string) => {
  setActionState(instanceId, {
    status: 'error',
    result: null,
    error,
  });
};

/**
 * Reset an action state to idle
 */
export const resetAction = (instanceId: string) => {
  setActionState(instanceId, {
    status: 'idle',
    result: null,
    error: null,
  });
};

/**
 * Open the result modal
 */
export const openResultModal = (actionName: string, result: ActionExecuteResponse) => {
  actionModalStore.set({
    isOpen: true,
    actionName,
    result,
  });
};

/**
 * Close the result modal
 */
export const closeResultModal = () => {
  actionModalStore.set({
    isOpen: false,
    actionName: null,
    result: null,
  });
};

/**
 * Add a toast notification
 */
export const addToast = (notification: Omit<ToastNotification, 'id'>) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const toast: ToastNotification = { id, ...notification };

  toastStore.set([...toastStore.get(), toast]);

  // Auto-remove after duration (default 5 seconds)
  const duration = notification.duration || 5000;
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
};

/**
 * Remove a toast notification
 */
export const removeToast = (id: string) => {
  toastStore.set(toastStore.get().filter((t) => t.id !== id));
};

/**
 * Show success toast
 */
export const showSuccessToast = (message: string, duration?: number) => {
  return addToast({ type: 'success', message, duration });
};

/**
 * Show error toast
 */
export const showErrorToast = (message: string, duration?: number) => {
  return addToast({ type: 'error', message, duration });
};

// ============================================
// Console Functions
// ============================================

/**
 * Open the actions console
 */
export const openConsole = () => {
  consoleStore.set({ ...consoleStore.get(), isOpen: true });
};

/**
 * Close the actions console
 */
export const closeConsole = () => {
  consoleStore.set({ ...consoleStore.get(), isOpen: false });
};

/**
 * Toggle the actions console
 */
export const toggleConsole = () => {
  const current = consoleStore.get();
  consoleStore.set({ ...current, isOpen: !current.isOpen });
};

/**
 * Set the active tab in the console
 */
export const setConsoleTab = (tab: 'actions' | 'history') => {
  consoleStore.set({ ...consoleStore.get(), activeTab: tab });
};

/**
 * Select a log entry for detailed view
 */
export const selectLogEntry = (logId: string | null) => {
  consoleStore.set({ ...consoleStore.get(), selectedLogId: logId });
};

/**
 * Create a new execution log entry
 */
export const createLogEntry = (actionName: string, actionLabel: string, context: ActionContext): string => {
  const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entry: ConsoleLogEntry = {
    id,
    timestamp: new Date(),
    actionName,
    actionLabel,
    status: 'running',
    context,
    logs: [
      {
        timestamp: new Date(),
        type: 'system',
        message: `Executing action: ${actionLabel}`,
      },
    ],
  };

  executionHistoryStore.set([entry, ...executionHistoryStore.get()]);
  return id;
};

/**
 * Add a log line to an execution entry
 */
export const addLogLine = (logId: string, type: ConsoleLogLine['type'], message: string) => {
  const history = executionHistoryStore.get();
  const updated = history.map((entry) => {
    if (entry.id === logId) {
      return {
        ...entry,
        logs: [...entry.logs, { timestamp: new Date(), type, message }],
      };
    }
    return entry;
  });
  executionHistoryStore.set(updated);
};

/**
 * Complete an execution log entry
 */
export const completeLogEntry = (logId: string, status: 'success' | 'error', result?: ActionExecuteResponse) => {
  const history = executionHistoryStore.get();
  const updated = history.map((entry) => {
    if (entry.id === logId) {
      const duration = Date.now() - entry.timestamp.getTime();
      const finalLog: ConsoleLogLine = {
        timestamp: new Date(),
        type: status === 'success' ? 'success' : 'error',
        message: status === 'success' ? result?.message || 'Action completed successfully' : result?.error || 'Action failed',
      };
      return {
        ...entry,
        status,
        duration,
        result,
        logs: [...entry.logs, finalLog],
      };
    }
    return entry;
  });
  executionHistoryStore.set(updated);
};

/**
 * Clear execution history
 */
export const clearExecutionHistory = () => {
  executionHistoryStore.set([]);
  consoleStore.set({ ...consoleStore.get(), selectedLogId: null });
};

/**
 * Set available actions
 */
export const setAvailableActions = (actions: ActionMetadata[]) => {
  availableActionsStore.set(actions);
};
