import { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
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

  const hasMultipleVersions = availableVersions.length > 1;
  const { color } = getCollectionStyles(message.collection);
  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];
  const owners = message.data.owners || [];
  const producers = message.data.producers || [];
  const consumers = message.data.consumers || [];

  // Generate diffs between all consecutive versions
  const allDiffs: VersionDiff[] = useMemo(() => {
    const diffs: VersionDiff[] = [];
    if (!hasMultipleVersions) return diffs;

    for (let i = 0; i < availableVersions.length - 1; i++) {
      const newerVersion = availableVersions[i];
      const olderVersion = availableVersions[i + 1];

      if (newerVersion.schemaContent && olderVersion.schemaContent) {
        const diff = Diff.createTwoFilesPatch(
          `v${olderVersion.data.version}`,
          `v${newerVersion.data.version}`,
          olderVersion.schemaContent,
          newerVersion.schemaContent,
          '',
          '',
          { context: 3 }
        );

        const diffHtml = html(diff, {
          drawFileList: false,
          matching: 'lines',
          outputFormat: 'side-by-side',
        });

        diffs.push({
          newerVersion: newerVersion.data.version,
          olderVersion: olderVersion.data.version,
          diffHtml,
          newerContent: newerVersion.schemaContent,
          olderContent: olderVersion.schemaContent,
        });
      }
    }
    return diffs;
  }, [availableVersions]);

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

  const hasParsedSchema = !!parsedSchema || !!parsedAvroSchema;
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
  if (allDiffs.length > 0) {
    tabs.push({ id: 'diff', label: 'Changes', icon: <ClockIcon className="h-3.5 w-3.5" /> });
  }
  tabs.push({ id: 'api', label: 'API', icon: <GlobeAltIcon className="h-3.5 w-3.5" /> });

  return (
    <div className="h-full flex bg-[rgb(var(--ec-page-bg))] overflow-hidden">
      {/* Left: header + tabs + content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-3">
          <div className="flex items-center gap-3 min-w-0">
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
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'examples' && examples.length > 0 ? (
            <ExamplesViewer examples={examples} />
          ) : activeTab === 'api' ? (
            <ApiContentViewer
              message={message}
              onCopy={handleCopyCustom}
              copiedId={copiedId}
              apiAccessEnabled={apiAccessEnabled}
            />
          ) : activeTab === 'diff' && allDiffs.length > 0 ? (
            <DiffViewer diffs={allDiffs} onOpenFullscreen={() => setIsDiffModalOpen(true)} apiAccessEnabled={apiAccessEnabled} />
          ) : (
            <SchemaContentViewer
              message={message}
              onCopy={handleCopy}
              isCopied={isCopied}
              viewMode={activeTab === 'schema' ? 'schema' : 'code'}
              parsedSchema={parsedSchema}
              parsedAvroSchema={parsedAvroSchema}
              showRequired={true}
              onOpenFullscreen={
                activeTab === 'code'
                  ? () => setIsCodeModalOpen(true)
                  : activeTab === 'schema' && (parsedSchema || parsedAvroSchema)
                    ? () => setIsSchemaViewerModalOpen(true)
                    : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Right sidebar - spans full height */}
      <div className="flex-shrink-0 w-72 border-l border-[rgb(var(--ec-page-border))] overflow-y-auto">
        {/* View docs link */}
        <div className="p-5 border-b border-[rgb(var(--ec-page-border))]">
          <a
            href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border))] rounded-lg hover:border-[rgb(var(--ec-accent)/0.3)] hover:text-[rgb(var(--ec-accent))] transition-all"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            View docs
          </a>
        </div>

        {/* Details section */}
        <div className="p-5 border-b border-[rgb(var(--ec-page-border))]">
          <h3 className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-4">Details</h3>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-xs text-[rgb(var(--ec-page-text-muted))]">Format</dt>
              <dd className="text-xs font-medium text-[rgb(var(--ec-page-text))]">
                {getSchemaTypeLabel(message.schemaExtension)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-[rgb(var(--ec-page-text-muted))]">Resource</dt>
              <dd className={`text-xs font-medium text-${color}-400 capitalize`}>{message.collection}</dd>
            </div>
            {message.data.summary && (
              <div>
                <dt className="text-xs text-[rgb(var(--ec-page-text-muted))] mb-1">Summary</dt>
                <dd className="text-xs text-[rgb(var(--ec-page-text))] leading-relaxed">{message.data.summary}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Producers section */}
        {showProducersConsumers && producers.length > 0 && message.collection !== 'services' && (
          <div className="px-5 py-3 border-b border-[rgb(var(--ec-page-border))]">
            <h3 className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">Producers</h3>
            <div>
              {producers.map((producer: Producer, idx: number) => {
                const serviceName = extractServiceName(producer.id);
                return (
                  <a
                    key={`${producer.id}-${idx}`}
                    href={buildUrl(`/docs/services/${serviceName}/${producer.version}`)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))] transition-colors"
                  >
                    <ServerIcon className="h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))]" />
                    {serviceName}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Consumers section */}
        {showProducersConsumers && consumers.length > 0 && message.collection !== 'services' && (
          <div className="px-5 py-3 border-b border-[rgb(var(--ec-page-border))]">
            <h3 className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">Consumers</h3>
            <div>
              {consumers.map((consumer: Consumer, idx: number) => {
                const serviceName = extractServiceName(consumer.id);
                return (
                  <a
                    key={`${consumer.id}-${idx}`}
                    href={buildUrl(`/docs/services/${serviceName}/${consumer.version}`)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))] transition-colors"
                  >
                    <ServerIcon className="h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))]" />
                    {serviceName}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Versions section */}
        <div className="p-5 border-b border-[rgb(var(--ec-page-border))]">
          <h3 className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-3">Versions</h3>
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
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                      isActive
                        ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-page-text))]'
                        : 'hover:bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))]'
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

        {/* Owners section */}
        {showOwners && owners.length > 0 && (
          <div className="p-5 border-b border-[rgb(var(--ec-page-border))]">
            <h3 className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-3">Owners</h3>
            <div className="space-y-1">
              {owners.map((owner: Owner, idx: number) => (
                <a
                  key={`${owner.id}-${idx}`}
                  href={owner.href}
                  className="block px-2 py-1.5 rounded-md text-xs font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))] transition-colors"
                >
                  {owner.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Downloads section */}
        <div className="p-5">
          <h3 className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-3">Downloads</h3>
          <div className="space-y-2">
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border))] rounded-lg hover:border-[rgb(var(--ec-accent)/0.3)] transition-all"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
              Download schema file
            </button>
            <button
              onClick={handleCopy}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium border rounded-lg transition-all ${
                isCopied
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-accent)/0.3)]'
              }`}
            >
              {isCopied ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <ClipboardDocumentIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
              )}
              {isCopied ? 'Copied to clipboard' : 'Copy schema content'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VersionHistoryModal
        isOpen={isDiffModalOpen}
        onOpenChange={setIsDiffModalOpen}
        diffs={allDiffs}
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
      />
    </div>
  );
}
