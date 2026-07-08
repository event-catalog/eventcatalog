import { useState, useMemo, useEffect, useRef } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  TableCellsIcon,
  CodeBracketIcon,
  ClockIcon,
  GlobeAltIcon,
  ServerIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { buildUrl } from '@utils/url-builder';
import { getCollectionStyles } from '@components/Grids/utils';
import SchemaContentViewer from './SchemaContentViewer';
import DiffViewer from './DiffViewer';
import ApiContentViewer from './ApiContentViewer';
import ExamplesViewer from './ExamplesViewer';
import VersionHistoryModal from './VersionHistoryModal';
import SchemaCodeModal from './SchemaCodeModal';
import SchemaViewerModal from './SchemaViewerModal';
import { copyToClipboard, downloadSchema, getSchemaTypeLabel, ICON_SPECS, extractServiceName } from './utils';
import { parseProtobufSchema } from '@utils/protobuf-schema';
import type { SchemaItem, VersionDiff, Owner, Producer, Consumer } from './types';

interface SchemaDetailsPanelProps {
  message: SchemaItem;
  availableVersions: SchemaItem[];
  selectedVersion: string | null;
  onVersionChange: (version: string) => void;
  apiAccessEnabled?: boolean;
  showOwners?: boolean;
  showProducersConsumers?: boolean;
}

export default function SchemaDetailsPanel({
  message,
  availableVersions,
  selectedVersion,
  onVersionChange,
  apiAccessEnabled = false,
  showOwners = true,
  showProducersConsumers = true,
}: SchemaDetailsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'schema' | 'diff' | 'api' | 'examples'>('code');
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSchemaViewerModalOpen, setIsSchemaViewerModalOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const hasMultipleVersions = availableVersions.length > 1;
  const { color } = getCollectionStyles(message.collection);
  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];
  const owners = message.data.owners || [];
  const producers = message.data.producers || [];
  const consumers = message.data.consumers || [];
  const filename = message.data.schemaPath?.split('/').pop() || `${message.data.id}.${ext || 'json'}`;

  const uniqueAvailableVersions = useMemo(
    () =>
      availableVersions.filter(
        (version, index, versions) => versions.findIndex((item) => item.data.version === version.data.version) === index
      ),
    [availableVersions]
  );
  const defaultToVersion = uniqueAvailableVersions[0]?.data.version || '';
  const defaultFromVersion = uniqueAvailableVersions[1]?.data.version || defaultToVersion;
  const [diffFromVersion, setDiffFromVersion] = useState(defaultFromVersion);
  const [diffToVersion, setDiffToVersion] = useState(defaultToVersion);
  const schemaResourceKey = [
    message.collection,
    message.data.id,
    message.specType || '',
    message.specFilenameWithoutExtension || message.specName || '',
  ].join(':');

  useEffect(() => {
    setDiffFromVersion(defaultFromVersion);
    setDiffToVersion(defaultToVersion);
    setIsDiffModalOpen(false);
  }, [schemaResourceKey, defaultFromVersion, defaultToVersion]);

  const diffFromItem = useMemo(
    () => uniqueAvailableVersions.find((version) => version.data.version === diffFromVersion),
    [diffFromVersion, uniqueAvailableVersions]
  );
  const diffToItem = useMemo(
    () => uniqueAvailableVersions.find((version) => version.data.version === diffToVersion),
    [diffToVersion, uniqueAvailableVersions]
  );
  const hasDiffFromContent = !!diffFromItem?.schemaContent?.trim();
  const hasDiffToContent = !!diffToItem?.schemaContent?.trim();
  const selectedDiff: VersionDiff | null = useMemo(() => {
    if (!diffFromItem || !diffToItem) return null;
    if (diffFromItem.data.version === diffToItem.data.version) return null;
    if (!diffFromItem.schemaContent?.trim() || !diffToItem.schemaContent?.trim()) return null;

    const diff = Diff.createTwoFilesPatch(
      `v${diffFromItem.data.version}`,
      `v${diffToItem.data.version}`,
      diffFromItem.schemaContent,
      diffToItem.schemaContent,
      '',
      '',
      { context: 3 }
    );

    const diffHtml = html(diff, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'side-by-side',
    });

    return {
      fromVersion: diffFromItem.data.version,
      toVersion: diffToItem.data.version,
      diffHtml,
      fromContent: diffFromItem.schemaContent,
      toContent: diffToItem.schemaContent,
    };
  }, [diffFromItem, diffToItem]);
  const selectedDiffs = selectedDiff ? [selectedDiff] : [];

  // Check if this is a JSON schema
  const parsedSchema = useMemo(() => {
    const isJSONSchema =
      message.schemaExtension?.toLowerCase() === 'json' && message.schemaContent && message.schemaContent.trim() !== '';
    if (!isJSONSchema) return null;

    try {
      const parsed = JSON.parse(message.schemaContent ?? '');
      if (!parsed.properties && !parsed.$schema && !parsed.type) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [message.schemaContent, message.schemaExtension]);

  // Check if this is an Avro schema
  const parsedAvroSchema = useMemo(() => {
    const extLower = message.schemaExtension?.toLowerCase();
    const isAvroSchema =
      (extLower === 'avro' || extLower === 'avsc') && message.schemaContent && message.schemaContent.trim() !== '';
    if (!isAvroSchema) return null;

    try {
      const parsed = JSON.parse(message.schemaContent ?? '');
      if (!parsed.type) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [message.schemaContent, message.schemaExtension]);

  // Check if this is a Protobuf schema. The extension falls back to the schema
  // format when the schema has no file path, so accept both 'proto' and 'protobuf'.
  const parsedProtoSchema = useMemo(() => {
    const extLower = message.schemaExtension?.toLowerCase();
    const isProtoSchema =
      (extLower === 'proto' || extLower === 'protobuf') && message.schemaContent && message.schemaContent.trim() !== '';
    if (!isProtoSchema) return null;

    try {
      return parseProtobufSchema(message.schemaContent ?? '');
    } catch {
      return null;
    }
  }, [message.schemaContent, message.schemaExtension]);

  const handleCopy = async () => {
    if (!message.schemaContent) return;
    const success = await copyToClipboard(message.schemaContent);
    if (success) {
      setCopiedId(message.data.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyCustom = async (content: string, id: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = () => {
    if (!message.schemaContent) return;
    downloadSchema(message.schemaContent, message.data.id, message.schemaExtension || 'json');
  };

  const isCopied = copiedId === message.data.id;
  const docsUrl = buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`);
  const sidebarCardClass = 'rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg)/0.66)] px-4 py-4';

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const hasParsedSchema = !!parsedSchema || !!parsedAvroSchema || !!parsedProtoSchema;
  // Build tabs
  const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'code', label: 'Schema', icon: <CodeBracketIcon className="h-3.5 w-3.5" /> },
  ];
  if (hasParsedSchema) {
    tabs.push({ id: 'schema', label: 'Properties', icon: <TableCellsIcon className="h-3.5 w-3.5" /> });
  }
  const examples = message.examples || [];
  if (examples.length > 0) {
    tabs.push({ id: 'examples', label: 'Usage Examples', icon: <BookOpenIcon className="h-3.5 w-3.5" /> });
  }
  if (hasMultipleVersions) {
    tabs.push({ id: 'diff', label: 'Changes', icon: <ClockIcon className="h-3.5 w-3.5" /> });
  }
  tabs.push({ id: 'api', label: 'API', icon: <GlobeAltIcon className="h-3.5 w-3.5" /> });

  return (
    <div className="flex h-full min-h-0 bg-[rgb(var(--ec-page-bg))] overflow-hidden">
      {/* Left: header + tabs + content */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
        {/* Compact header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border)/0.5)]">
                  {iconSpec ? (
                    <img src={buildUrl(`/icons/${iconSpec}.svg`, true)} alt={`${ext} icon`} className="h-5 w-5 schema-icon" />
                  ) : (
                    <span className="text-xs font-bold font-mono text-[rgb(var(--ec-page-text-muted))]">{'{ }'}</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-[rgb(var(--ec-page-text))] truncate">{message.data.name}</h2>
                <span className="flex-shrink-0 text-xs font-mono tabular-nums text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-md">
                  v{message.data.version}
                </span>
                <span
                  className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-${color}-500/10 text-${color}-400 capitalize`}
                >
                  {message.collection}
                </span>
              </div>
              {message.data.summary && (
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">{message.data.summary}</p>
              )}
            </div>

            <div className="relative flex-shrink-0" ref={actionsMenuRef}>
              <div className="inline-flex overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsActionsOpen((prev) => !prev)}
                  aria-expanded={isActionsOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.45)] hover:text-[rgb(var(--ec-accent))]"
                >
                  Actions
                </button>
                <button
                  type="button"
                  onClick={() => setIsActionsOpen((prev) => !prev)}
                  aria-expanded={isActionsOpen}
                  aria-haspopup="menu"
                  aria-label="Open actions menu"
                  className="inline-flex items-center justify-center border-l border-[rgb(var(--ec-page-border))] px-2.5 py-2 text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.45)] hover:text-[rgb(var(--ec-page-text))]"
                >
                  <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isActionsOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isActionsOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[220px] overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] shadow-xl">
                  <a
                    href={docsUrl}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
                    View documentation
                  </a>
                  <button
                    onClick={() => {
                      handleDownload();
                      setIsActionsOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
                    Download schema
                  </button>
                  <button
                    onClick={() => {
                      handleCopy();
                      setIsActionsOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
                  >
                    {isCopied ? (
                      <CheckIcon className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <ClipboardDocumentIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
                    )}
                    {isCopied ? 'Copied to clipboard' : 'Copy schema to clipboard'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-6">
          <div className="flex items-center gap-1 border-b border-[rgb(var(--ec-page-border))]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[rgb(var(--ec-accent))] text-[rgb(var(--ec-page-text))]'
                    : 'border-transparent text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:border-[rgb(var(--ec-page-border))]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          {activeTab === 'examples' && examples.length > 0 ? (
            <ExamplesViewer examples={examples} />
          ) : activeTab === 'api' ? (
            <ApiContentViewer
              message={message}
              onCopy={handleCopyCustom}
              copiedId={copiedId}
              apiAccessEnabled={apiAccessEnabled}
            />
          ) : activeTab === 'diff' && hasMultipleVersions ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="mb-4 flex flex-shrink-0 flex-col gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover)/0.45)] p-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[rgb(var(--ec-page-text-muted))]">
                      From
                    </span>
                    <select
                      value={diffFromVersion}
                      onChange={(event) => setDiffFromVersion(event.target.value)}
                      className="h-9 rounded-md border border-[rgb(var(--ec-dropdown-border))] bg-[rgb(var(--ec-dropdown-bg))] px-3 text-sm font-mono tabular-nums text-[rgb(var(--ec-page-text))] outline-hidden transition-colors focus:border-[rgb(var(--ec-accent))] focus:ring-1 focus:ring-[rgb(var(--ec-accent)/0.3)]"
                    >
                      {uniqueAvailableVersions.map((version) => (
                        <option key={`from-${version.data.version}`} value={version.data.version}>
                          v{version.data.version}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[rgb(var(--ec-page-text-muted))]">
                      To
                    </span>
                    <select
                      value={diffToVersion}
                      onChange={(event) => setDiffToVersion(event.target.value)}
                      className="h-9 rounded-md border border-[rgb(var(--ec-dropdown-border))] bg-[rgb(var(--ec-dropdown-bg))] px-3 text-sm font-mono tabular-nums text-[rgb(var(--ec-page-text))] outline-hidden transition-colors focus:border-[rgb(var(--ec-accent))] focus:ring-1 focus:ring-[rgb(var(--ec-accent)/0.3)]"
                    >
                      {uniqueAvailableVersions.map((version) => (
                        <option key={`to-${version.data.version}`} value={version.data.version}>
                          v{version.data.version}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDiffModalOpen(true)}
                  disabled={!selectedDiff}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] px-3 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  Expand
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {diffFromVersion === diffToVersion ? (
                  <div className="flex h-full items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
                    <p className="text-sm">Select two different versions</p>
                  </div>
                ) : !hasDiffFromContent || !hasDiffToContent ? (
                  <div className="flex h-full items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
                    <p className="text-sm">No schema content available</p>
                  </div>
                ) : (
                  <DiffViewer diffs={selectedDiffs} apiAccessEnabled={apiAccessEnabled} />
                )}
              </div>
            </div>
          ) : (
            <SchemaContentViewer
              message={message}
              onCopy={handleCopy}
              isCopied={isCopied}
              viewMode={activeTab === 'schema' ? 'schema' : 'code'}
              parsedSchema={parsedSchema}
              parsedAvroSchema={parsedAvroSchema}
              parsedProtoSchema={parsedProtoSchema}
              showRequired={true}
              onOpenFullscreen={
                activeTab === 'code'
                  ? () => setIsCodeModalOpen(true)
                  : activeTab === 'schema' && (parsedSchema || parsedAvroSchema || parsedProtoSchema)
                    ? () => setIsSchemaViewerModalOpen(true)
                    : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Right sidebar - spans full height */}
      <div className="h-full w-80 flex-shrink-0 overflow-y-auto border-l border-[rgb(var(--ec-page-border))] px-3 py-4">
        <div className="space-y-3">
          {/* Details section */}
          <div className={sidebarCardClass}>
            <h3 className="mb-4 text-[0.8rem] font-semibold text-[rgb(var(--ec-page-text))]">Details</h3>
            <dl className="space-y-2.5">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-[rgb(var(--ec-page-text-muted))]">Format</dt>
                <dd className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
                  {getSchemaTypeLabel(message.schemaExtension)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs text-[rgb(var(--ec-page-text-muted))]">Resource</dt>
                <dd className={`text-xs font-medium text-${color}-400 capitalize`}>{message.collection}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-[rgb(var(--ec-page-text-muted))]">Filename</dt>
                <dd className="max-w-[11rem] truncate text-xs font-medium text-[rgb(var(--ec-page-text-muted))]" title={filename}>
                  {filename}
                </dd>
              </div>
            </dl>
          </div>

          {/* Versions section */}
          <div className={sidebarCardClass}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[0.8rem] font-semibold text-[rgb(var(--ec-page-text))]">Versions</h3>
            </div>
            <div className="space-y-1">
              {availableVersions
                .filter((v, idx, arr) => arr.findIndex((a) => a.data.version === v.data.version) === idx)
                .map((v, idx) => {
                  const isActive = v.data.version === message.data.version;
                  const isLatest = idx === 0;
                  return (
                    <button
                      key={`${v.data.version}-${idx}`}
                      onClick={() => onVersionChange(v.data.version)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                        isActive
                          ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-page-text))]'
                          : 'text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-bg)/0.55)]'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isActive ? 'bg-[rgb(var(--ec-accent))]' : 'bg-[rgb(var(--ec-page-border))]'
                        }`}
                      />
                      <span className="text-xs font-mono tabular-nums">v{v.data.version}</span>
                      {isLatest && (
                        <span className="text-[10px] font-medium text-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-accent-subtle))] px-1.5 py-0.5 rounded">
                          latest
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Schema producers section */}
          {showProducersConsumers && producers.length > 0 && message.collection !== 'services' && (
            <div className={sidebarCardClass}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h3 className="text-[0.8rem] font-semibold text-[rgb(var(--ec-page-text))]">
                  Schema Producers ({producers.length})
                </h3>
              </div>
              <div className="space-y-1">
                {producers.map((producer: Producer, idx: number) => {
                  const serviceName = extractServiceName(producer.id);
                  return (
                    <a
                      key={`${producer.id}-${idx}`}
                      href={buildUrl(`/docs/services/${serviceName}/${producer.version}`)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.55)] hover:text-[rgb(var(--ec-accent))]"
                    >
                      <ServerIcon className="h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))]" />
                      {serviceName}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schema consumers section */}
          {showProducersConsumers && consumers.length > 0 && message.collection !== 'services' && (
            <div className={sidebarCardClass}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h3 className="text-[0.8rem] font-semibold text-[rgb(var(--ec-page-text))]">
                  Schema Consumers ({consumers.length})
                </h3>
              </div>
              <div className="space-y-1">
                {consumers.map((consumer: Consumer, idx: number) => {
                  const serviceName = extractServiceName(consumer.id);
                  return (
                    <a
                      key={`${consumer.id}-${idx}`}
                      href={buildUrl(`/docs/services/${serviceName}/${consumer.version}`)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.55)] hover:text-[rgb(var(--ec-accent))]"
                    >
                      <ServerIcon className="h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))]" />
                      {serviceName}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Owners section */}
          {showOwners && owners.length > 0 && (
            <div className={sidebarCardClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[0.8rem] font-semibold text-[rgb(var(--ec-page-text))]">Owners</h3>
              </div>
              <div className="space-y-1">
                {owners.map((owner: Owner, idx: number) => (
                  <a
                    key={`${owner.id}-${idx}`}
                    href={owner.href}
                    className="block rounded-lg px-2 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.55)] hover:text-[rgb(var(--ec-accent))]"
                  >
                    {owner.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <VersionHistoryModal
        isOpen={isDiffModalOpen}
        onOpenChange={setIsDiffModalOpen}
        diffs={selectedDiffs}
        messageName={message.data.name}
        apiAccessEnabled={apiAccessEnabled}
      />
      <SchemaCodeModal
        isOpen={isCodeModalOpen}
        onOpenChange={setIsCodeModalOpen}
        message={message}
        onCopy={handleCopy}
        isCopied={isCopied}
      />
      <SchemaViewerModal
        isOpen={isSchemaViewerModalOpen}
        onOpenChange={setIsSchemaViewerModalOpen}
        message={message}
        parsedSchema={parsedSchema}
        parsedAvroSchema={parsedAvroSchema}
        parsedProtoSchema={parsedProtoSchema}
      />
    </div>
  );
}
