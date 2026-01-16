import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { BoltIcon } from '@heroicons/react/24/outline';
import { consoleStore, executionHistoryStore, toggleConsole } from '@stores/action-store';
import type { ActionContext, ActionMetadata } from '@enterprise/actions/action-types';
import ActionsConsole from './ActionsConsole';

interface ActionsConsoleTriggerProps {
  context: ActionContext;
  actions: ActionMetadata[];
}

export default function ActionsConsoleTrigger({ context, actions }: ActionsConsoleTriggerProps) {
  const consoleState = useStore(consoleStore);
  const history = useStore(executionHistoryStore);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleConsole();
      }
      if (e.key === 'Escape' && consoleState.isOpen) {
        toggleConsole();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [consoleState.isOpen]);

  const runningCount = history.filter((h) => h.status === 'running').length;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={toggleConsole}
        className="group inline-flex items-center gap-2 px-3 py-2 bg-[rgb(var(--ec-card-bg))] hover:bg-[rgb(var(--ec-card-bg)/0.8)] border border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-accent)/0.3)] rounded-lg transition-all"
        title="Open Actions (⌘K)"
      >
        <div className="relative">
          <BoltIcon className="w-4 h-4 text-[rgb(var(--ec-accent))]" />
          {runningCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
        </div>
        <span className="text-sm font-medium text-[rgb(var(--ec-page-text))]">
          {actions.length} Action{actions.length !== 1 ? 's' : ''}
        </span>
        <kbd className="hidden sm:inline text-[10px] text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-page-bg))] border border-[rgb(var(--ec-page-border))] px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Console Modal */}
      <ActionsConsole context={context} actions={actions} />
    </>
  );
}
