import { useEffect, useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  // UI icons (not user-selectable)
  XMarkIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  // Core action icons
  PlayIcon,
  BoltIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CogIcon,
  // Communication
  BellIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  // Development
  CommandLineIcon,
  CodeBracketIcon,
  WrenchIcon,
  WrenchScrewdriverIcon,
  CpuChipIcon,
  // Server & Database
  ServerIcon,
  ServerStackIcon,
  CircleStackIcon,
  CloudIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  // Documents
  DocumentTextIcon,
  DocumentArrowDownIcon,
  DocumentMagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  // Security
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  KeyIcon,
  FingerPrintIcon,
  // Network & API
  GlobeAltIcon,
  LinkIcon,
  SignalIcon,
  WifiIcon,
  ArrowsRightLeftIcon,
  // Testing & Quality
  BeakerIcon,
  BugAntIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  // Analytics
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  CursorArrowRaysIcon,
  // Files & Storage
  FolderIcon,
  FolderOpenIcon,
  ArchiveBoxIcon,
  InboxStackIcon,
  // Time & Scheduling
  ClockIcon,
  CalendarIcon,
  // Users & Teams
  UserIcon,
  UsersIcon,
  UserGroupIcon,
  // Actions
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  RocketLaunchIcon,
  // Lists & Organization
  QueueListIcon,
  ListBulletIcon,
  TagIcon,
  HashtagIcon,
  // Info & Status
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  // Misc
  SparklesIcon,
  FireIcon,
  HeartIcon,
  StarIcon,
  CubeIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
  consoleStore,
  executionHistoryStore,
  closeConsole,
  selectLogEntry,
  createLogEntry,
  addLogLine,
  completeLogEntry,
  setAvailableActions,
  type ConsoleLogEntry,
  type ConsoleLogLine,
} from '@stores/action-store';
import type { ActionContext, ActionMetadata, ActionIconName, ActionExecuteResponse } from '@enterprise/actions/action-types';

// Icon mapping - comprehensive set of developer-focused icons
const iconMap: Record<ActionIconName, React.ComponentType<{ className?: string }>> = {
  // Core action icons
  play: PlayIcon,
  bolt: BoltIcon,
  check: CheckCircleIcon,
  'arrow-path': ArrowPathIcon,
  cog: CogIcon,
  // Communication
  bell: BellIcon,
  'paper-airplane': PaperAirplaneIcon,
  envelope: EnvelopeIcon,
  'chat-bubble-left': ChatBubbleLeftIcon,
  // Development
  'command-line': CommandLineIcon,
  'code-bracket': CodeBracketIcon,
  wrench: WrenchIcon,
  'wrench-screwdriver': WrenchScrewdriverIcon,
  'cpu-chip': CpuChipIcon,
  // Server & Database
  server: ServerIcon,
  'server-stack': ServerStackIcon,
  'circle-stack': CircleStackIcon,
  cloud: CloudIcon,
  'cloud-arrow-up': CloudArrowUpIcon,
  'cloud-arrow-down': CloudArrowDownIcon,
  // Documents
  'document-text': DocumentTextIcon,
  'document-arrow-down': DocumentArrowDownIcon,
  'document-magnifying-glass': DocumentMagnifyingGlassIcon,
  'clipboard-document-check': ClipboardDocumentCheckIcon,
  'clipboard-document-list': ClipboardDocumentListIcon,
  // Security
  'shield-check': ShieldCheckIcon,
  'lock-closed': LockClosedIcon,
  'lock-open': LockOpenIcon,
  key: KeyIcon,
  'finger-print': FingerPrintIcon,
  // Network & API
  'globe-alt': GlobeAltIcon,
  link: LinkIcon,
  signal: SignalIcon,
  wifi: WifiIcon,
  'arrows-right-left': ArrowsRightLeftIcon,
  // Testing & Quality
  beaker: BeakerIcon,
  'bug-ant': BugAntIcon,
  'exclamation-triangle': ExclamationTriangleIcon,
  'check-circle': CheckCircleIcon,
  'x-circle': XCircleIcon,
  // Analytics
  'chart-bar': ChartBarIcon,
  'chart-pie': ChartPieIcon,
  'presentation-chart-line': PresentationChartLineIcon,
  'cursor-arrow-rays': CursorArrowRaysIcon,
  // Files & Storage
  folder: FolderIcon,
  'folder-open': FolderOpenIcon,
  'archive-box': ArchiveBoxIcon,
  'inbox-stack': InboxStackIcon,
  // Time & Scheduling
  clock: ClockIcon,
  calendar: CalendarIcon,
  // Users & Teams
  user: UserIcon,
  users: UsersIcon,
  'user-group': UserGroupIcon,
  // Actions
  trash: TrashIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  'arrow-down-tray': ArrowDownTrayIcon,
  'arrow-up-tray': ArrowUpTrayIcon,
  'rocket-launch': RocketLaunchIcon,
  // Lists & Organization
  'queue-list': QueueListIcon,
  'list-bullet': ListBulletIcon,
  tag: TagIcon,
  hashtag: HashtagIcon,
  // Info & Status
  'information-circle': InformationCircleIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  // Misc
  sparkles: SparklesIcon,
  fire: FireIcon,
  heart: HeartIcon,
  star: StarIcon,
  cube: CubeIcon,
  'cube-transparent': CubeTransparentIcon,
};

interface ActionsConsoleProps {
  context: ActionContext;
  actions: ActionMetadata[];
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Elapsed time hook
function useElapsedTime(isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      const interval = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  return elapsed;
}

// JSON syntax highlighter with line numbers
function JsonHighlight({ data }: { data: any }) {
  const json = JSON.stringify(data, null, 2);
  const lines = json.split('\n');

  return (
    <pre className="font-mono text-[11px] leading-[1.6] m-0">
      <code>
        {lines.map((line, i) => {
          const highlighted = line
            .replace(/"([^"]+)":/g, '<span class="text-cyan-600 dark:text-cyan-400">"$1"</span>:')
            .replace(/: "([^"]+)"/g, ': <span class="text-amber-600 dark:text-amber-400">"$1"</span>')
            .replace(/: (\d+\.?\d*)/g, ': <span class="text-purple-600 dark:text-purple-400">$1</span>')
            .replace(/: (true)/g, ': <span class="text-green-600 dark:text-green-400">$1</span>')
            .replace(/: (false)/g, ': <span class="text-red-500 dark:text-red-400">$1</span>')
            .replace(/: (null)/g, ': <span class="text-gray-400 dark:text-gray-500">$1</span>');

          return (
            <div key={i} className="flex">
              <span className="w-8 text-right pr-3 text-[rgb(var(--ec-page-text-muted))] select-none opacity-40">{i + 1}</span>
              <span className="flex-1 text-[rgb(var(--ec-page-text))]" dangerouslySetInnerHTML={{ __html: highlighted }} />
            </div>
          );
        })}
      </code>
    </pre>
  );
}

// Status indicator
function StatusIndicator({ status, size = 'md' }: { status: 'running' | 'success' | 'error'; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  if (status === 'running') {
    return (
      <span className="relative flex">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className={`relative inline-flex rounded-full ${sizeClasses} bg-amber-400`} />
      </span>
    );
  }

  if (status === 'success') {
    return <span className={`inline-flex rounded-full ${sizeClasses} bg-green-500`} />;
  }

  return <span className={`inline-flex rounded-full ${sizeClasses} bg-red-500`} />;
}

// Console log line - Compact log viewer
function LogLine({ line, index }: { line: ConsoleLogLine; index: number }) {
  const config = {
    info: { badge: 'INFO', badgeColor: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500' },
    success: { badge: 'OK', badgeColor: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500' },
    error: { badge: 'ERR', badgeColor: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500' },
    system: { badge: 'SYS', badgeColor: 'text-gray-500 dark:text-gray-400', barColor: 'bg-gray-400' },
  }[line.type];

  const timestamp = line.timestamp ? formatTime(new Date(line.timestamp)) : formatTime(new Date());

  return (
    <div className="group flex items-center h-5 border-b border-[rgb(var(--ec-page-border)/0.2)] last:border-b-0 hover:bg-[rgb(var(--ec-content-hover))] transition-colors font-mono">
      <div className={`w-0.5 h-full ${config.barColor} shrink-0`} />
      <div className="w-14 px-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] tabular-nums shrink-0">{timestamp}</div>
      <div className="w-8 px-1 shrink-0">
        <span className={`text-[8px] font-medium ${config.badgeColor} uppercase`}>{config.badge}</span>
      </div>
      <div className="flex-1 px-1.5 text-[9px] text-[rgb(var(--ec-page-text))] truncate">{line.message}</div>
    </div>
  );
}

// Empty state
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16">
      <div className="p-4 bg-[rgb(var(--ec-content-hover))] rounded-xl mb-4">
        <Icon className="w-8 h-8 text-[rgb(var(--ec-icon-color))]" />
      </div>
      <p className="text-sm font-medium text-[rgb(var(--ec-page-text))]">{title}</p>
      {subtitle && <p className="text-sm text-[rgb(var(--ec-page-text-muted))] mt-1">{subtitle}</p>}
    </div>
  );
}

// Main console
export default function ActionsConsole({ context, actions }: ActionsConsoleProps) {
  const consoleState = useStore(consoleStore);
  const history = useStore(executionHistoryStore);
  const [selectedAction, setSelectedAction] = useState<ActionMetadata | null>(actions[0] || null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<ConsoleLogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [consoleHeight, setConsoleHeight] = useState(150);
  const logRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const elapsedTime = useElapsedTime(isRunning);

  // Handle console resize drag
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startHeight: consoleHeight };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current) return;
    const delta = resizeRef.current.startY - e.clientY;
    const newHeight = Math.max(80, Math.min(400, resizeRef.current.startHeight + delta));
    setConsoleHeight(newHeight);
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  useEffect(() => {
    setAvailableActions(actions);
    if (actions.length > 0 && !selectedAction) {
      setSelectedAction(actions[0]);
    }
  }, [actions]);

  // Focus search on open
  useEffect(() => {
    if (consoleState.isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [consoleState.isOpen]);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [currentExecution?.logs]);

  // Get current execution from history
  useEffect(() => {
    if (selectedAction) {
      const exec = history.find((h) => h.actionName === selectedAction.name);
      setCurrentExecution(exec || null);
    }
  }, [history, selectedAction]);

  // Filter actions based on search
  const filteredActions = actions.filter(
    (action) =>
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRun = async () => {
    if (!selectedAction || isRunning) return;

    setIsRunning(true);

    const logId = createLogEntry(selectedAction.name, selectedAction.label, context);
    selectLogEntry(logId);

    addLogLine(logId, 'system', `Executing ${selectedAction.label}`);
    addLogLine(logId, 'info', `Target: ${context.resourceType}/${context.resourceId}@${context.resourceVersion}`);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(selectedAction.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      const result: ActionExecuteResponse = await response.json();

      if (result.success) {
        addLogLine(logId, 'success', result.message || 'Action completed successfully');
        completeLogEntry(logId, 'success', result);
      } else {
        addLogLine(logId, 'error', result.error || 'Action failed');
        completeLogEntry(logId, 'error', result);
      }
    } catch (error: any) {
      addLogLine(logId, 'error', `Network error: ${error.message}`);
      completeLogEntry(logId, 'error', { success: false, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  // Get execution for an action
  const getActionExecution = (actionName: string) => history.find((h) => h.actionName === actionName);

  if (!consoleState.isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={closeConsole} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-xl z-[100] flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-[rgb(var(--ec-page-border))] flex flex-col bg-[rgb(var(--ec-page-bg))]">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <BoltIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[rgb(var(--ec-page-text))]">Actions</h1>
                <p className="text-xs text-[rgb(var(--ec-page-text-muted))] font-mono truncate max-w-[180px]">
                  {context.resourceId}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--ec-input-placeholder))]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[rgb(var(--ec-input-bg))] border border-[rgb(var(--ec-input-border))] rounded-md text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-input-placeholder))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))] focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          {/* Actions List */}
          <div className="flex-1 overflow-auto p-2">
            {filteredActions.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[rgb(var(--ec-page-text-muted))]">
                {searchQuery ? 'No actions match your search' : 'No actions available'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredActions.map((action) => {
                  const Icon = iconMap[action.icon || 'bolt'] || BoltIcon;
                  const isSelected = selectedAction?.name === action.name;
                  const execution = getActionExecution(action.name);

                  return (
                    <button
                      key={action.name}
                      onClick={() => setSelectedAction(action)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                        isSelected
                          ? 'bg-[rgb(var(--ec-content-active))] text-[rgb(var(--ec-accent))]'
                          : 'hover:bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text))]'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-5 h-5 rounded shrink-0 ${
                          isSelected ? 'bg-purple-100 dark:bg-purple-500/20' : 'bg-[rgb(var(--ec-group-icon-bg))]'
                        }`}
                      >
                        <Icon
                          className={`w-3 h-3 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-[rgb(var(--ec-group-icon-text))]'}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium block truncate">{action.label}</span>
                      </div>
                      {execution && <StatusIndicator status={execution.status} size="sm" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[rgb(var(--ec-page-border))] text-xs text-[rgb(var(--ec-page-text-muted))]">
            <div className="flex items-center justify-between">
              <span>{actions.length} actions</span>
              <kbd className="px-1.5 py-0.5 bg-[rgb(var(--ec-input-bg))] border border-[rgb(var(--ec-input-border))] rounded text-[10px] font-mono">
                esc
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[rgb(var(--ec-page-bg))]">
          {/* Header */}
          <div className="p-6 border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                {selectedAction ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg shrink-0">
                      {(() => {
                        const Icon = iconMap[selectedAction.icon || 'bolt'] || BoltIcon;
                        return <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[rgb(var(--ec-page-text))] truncate">{selectedAction.label}</h2>
                      {selectedAction.description && (
                        <p className="text-sm text-[rgb(var(--ec-page-text-muted))] truncate">{selectedAction.description}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-[rgb(var(--ec-page-text-muted))]">Select an action</span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Run Button */}
                <button
                  onClick={handleRun}
                  disabled={isRunning || !selectedAction}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                    isRunning || !selectedAction
                      ? 'bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-page-text-muted))] cursor-not-allowed'
                      : 'bg-[rgb(var(--ec-button-bg))] hover:bg-[rgb(var(--ec-button-bg-hover))] text-[rgb(var(--ec-button-text))]'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Running</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4" />
                      <span>Run</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={closeConsole}
                  className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))] hover:bg-[rgb(var(--ec-content-hover))] rounded-md transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Context Info */}
            <div className="flex items-center gap-2 mt-4 text-xs">
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded font-medium">
                {context.resourceType}
              </span>
              <ChevronRightIcon className="w-3 h-3 text-[rgb(var(--ec-page-text-muted))]" />
              <span className="font-mono text-[rgb(var(--ec-page-text))]">{context.resourceId}</span>
              <span className="text-[rgb(var(--ec-page-text-muted))]">v{context.resourceVersion}</span>
            </div>
          </div>

          {/* Content Area - Request/Response on top, Console below */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedAction ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={BoltIcon}
                  title="Select an action"
                  subtitle="Choose an action from the sidebar to get started"
                />
              </div>
            ) : (
              <>
                {/* Request/Response Section - Side by side */}
                <div className="flex-1 min-h-0 flex">
                  {/* Request Panel */}
                  <div className="w-1/2 border-r border-[rgb(var(--ec-page-border))] flex flex-col">
                    <div className="shrink-0 h-8 px-4 flex items-center border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))]">
                      <span className="text-[10px] font-semibold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                        Request
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <JsonHighlight data={{ context }} />
                    </div>
                  </div>

                  {/* Response Panel */}
                  <div className="w-1/2 flex flex-col">
                    <div className="shrink-0 h-8 px-4 flex items-center gap-2 border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))]">
                      <span className="text-[10px] font-semibold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                        Response
                      </span>
                      {currentExecution && currentExecution.status !== 'running' && currentExecution.result && (
                        <>
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                              currentExecution.result.success
                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {currentExecution.result.success ? 'SUCCESS' : 'ERROR'}
                          </span>
                          {currentExecution.duration && (
                            <span className="text-[9px] font-mono text-[rgb(var(--ec-page-text-muted))]">
                              {formatDuration(currentExecution.duration)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex-1 overflow-auto">
                      {!currentExecution ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">Run action to see response</p>
                        </div>
                      ) : currentExecution.status === 'running' ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="flex items-center gap-3">
                            <ArrowPathIcon className="w-5 h-5 text-[rgb(var(--ec-accent))] animate-spin" />
                            <span className="text-sm text-[rgb(var(--ec-page-text))]">Executing...</span>
                            <span className="text-sm text-[rgb(var(--ec-page-text-muted))] font-mono tabular-nums">
                              {formatDuration(elapsedTime)}
                            </span>
                          </div>
                        </div>
                      ) : currentExecution.result ? (
                        <div className="h-full p-4">
                          {currentExecution.result.data ? (
                            <JsonHighlight data={currentExecution.result.data} />
                          ) : currentExecution.result.error ? (
                            <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-md">
                              <p className="text-sm text-red-700 dark:text-red-400 font-mono">{currentExecution.result.error}</p>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">No response data</p>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Console Section - Resizable */}
                <div className="shrink-0 flex flex-col" style={{ height: consoleHeight }}>
                  {/* Resize Handle */}
                  <div
                    onMouseDown={handleResizeStart}
                    className="h-1 bg-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-accent))] cursor-ns-resize transition-colors"
                  />

                  {/* Column Headers */}
                  <div className="shrink-0 flex items-stretch text-[8px] font-semibold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))]">
                    <div className="w-0.5 shrink-0" />
                    <div className="px-2 py-1 w-14 shrink-0">Time</div>
                    <div className="px-2 py-1 w-10 shrink-0">Level</div>
                    <div className="px-2 py-1 flex-1">Message</div>
                  </div>

                  {/* Log Rows */}
                  <div ref={logRef} className="flex-1 overflow-auto">
                    {!currentExecution || currentExecution.logs.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-[10px] text-[rgb(var(--ec-page-text-muted))]">Waiting for output...</p>
                      </div>
                    ) : (
                      <div>
                        {currentExecution.logs.map((line, i) => (
                          <LogLine key={i} line={line} index={i} />
                        ))}
                        {currentExecution.status === 'running' && (
                          <div className="flex items-stretch bg-amber-50/50 dark:bg-amber-500/5">
                            <div className="w-0.5 bg-amber-500 shrink-0 animate-pulse" />
                            <div className="px-2 py-1 text-[9px] font-mono text-[rgb(var(--ec-page-text-muted))] tabular-nums w-14 shrink-0">
                              {formatTime(new Date())}
                            </div>
                            <div className="px-2 py-1 w-10 shrink-0">
                              <span className="text-[8px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                RUN
                              </span>
                            </div>
                            <div className="flex-1 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-400 font-mono flex items-center gap-1">
                              <ArrowPathIcon className="w-3 h-3 animate-spin" />
                              Processing...
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
