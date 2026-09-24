import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
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
  GlobeAltIcon,
  ServerIcon,
  CodeBracketSquareIcon,
  RectangleStackIcon,
  ArrowsRightLeftIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { buildUrl } from '@utils/url-builder';
import { getCollectionStyles } from '@components/Grids/utils';
import SchemaContentViewer from './SchemaContentViewer';
import DiffViewer from './DiffViewer';
import ApiContentViewer from './ApiContentViewer';
import ExamplesViewer from './ExamplesViewer';
import SchemaUsage from './SchemaUsage';
import SchemaFlows from './SchemaFlows';
import VersionHistoryModal from './VersionHistoryModal';
import SchemaCodeModal from './SchemaCodeModal';
import SchemaViewerModal from './SchemaViewerModal';
import {
  copyToClipboard,
  downloadSchema,
  getSchemaTypeLabel,
  ICON_SPECS,
  getSchemaRelationshipReference,
  getSchemaRelationshipHref,
  SCHEMA_RELATIONSHIP_LABELS,
} from './utils';
import { createSchemaDetailsLoader, useSchemaDetails } from './useSchemaDetails';
import { parseProtobufSchema } from '@utils/protobuf-schema';
import type { SchemaItem, SchemaSourceInfo, SchemaRelationshipCollection, VersionDiff, Owner, Producer } from './types';

const MESSAGE_TYPE_LABELS: Partial<Record<SchemaItem['collection'], string>> = {
  events: 'Event',
  commands: 'Command',
  queries: 'Query',
};

const SCHEMA_SOURCE_PROVIDER_LABELS: Record<string, string> = {
  git: 'Git',
  http: 'HTTP',
};

const getSchemaSourceLabel = (source: SchemaSourceInfo) => {
  const provider = SCHEMA_SOURCE_PROVIDER_LABELS[source.provider] ?? source.provider;
  return source.ref ? `${provider} (${source.ref})` : provider;
};

const formatSchemaUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

type MetadataRow = { label: string; value: React.ReactNode; title?: string };

const MetadataEmpty = () => <span className="text-[rgb(var(--ec-page-text-muted)/0.6)]">-</span>;

const MetadataTable = ({ title, rows }: { title: string; rows: MetadataRow[] }) => (
  <section className="overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border)/0.72)] bg-[rgb(var(--ec-dropdown-bg)/0.66)] dark:border-white/10">
    <div className="border-b border-[rgb(var(--ec-page-border)/0.6)] bg-[rgb(var(--ec-content-hover)/0.45)] px-4 py-2.5 dark:border-white/10">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">{title}</h3>
    </div>
    <dl className="divide-y divide-[rgb(var(--ec-page-border)/0.5)] dark:divide-white/8">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-2.5 text-sm" title={row.title}>
          <dt className="text-[rgb(var(--ec-page-text-muted))]">{row.label}</dt>
          <dd className="min-w-0 break-words font-medium text-[rgb(var(--ec-page-text))]">{row.value}</dd>
        </div>
      ))}
    </dl>
  </section>
);

const formatSchemaDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const SchemaMetadata = ({ message, owners }: { message: SchemaItem; owners: Owner[] }) => {
  const { color } = getCollectionStyles(message.collection);
  const source = message.source;
  const schemaRows: MetadataRow[] = [
    { label: 'Name', value: message.data.name },
    ...(message.schemaName && message.schemaName !== message.data.name ? [{ label: 'Schema', value: message.schemaName }] : []),
    { label: 'Format', value: getSchemaTypeLabel(message.schemaExtension) },
    {
      label: MESSAGE_TYPE_LABELS[message.collection] ? 'Message Type' : 'Resource',
      value: (
        <span className={`capitalize text-${color}-500`}>{MESSAGE_TYPE_LABELS[message.collection] ?? message.collection}</span>
      ),
    },
    { label: 'Version', value: <span className="font-mono text-xs tabular-nums">v{message.data.version}</span> },
    ...(message.data.schemaPath
      ? [{ label: 'File', value: <span className="font-mono text-xs">{message.data.schemaPath}</span> }]
      : []),
    {
      label: 'Created',
      value: source?.createdAt ? formatSchemaDateTime(source.createdAt) : <MetadataEmpty />,
    },
    {
      label: 'Updated',
      value: source?.updatedAt ? formatSchemaDateTime(source.updatedAt) : <MetadataEmpty />,
    },
  ];

  const sourceRows: MetadataRow[] = source
    ? [
        { label: 'Source', value: getSchemaSourceLabel(source) },
        ...(message.schemaRef
          ? [{ label: 'Reference', value: <span className="font-mono text-xs">{message.schemaRef}</span> }]
          : []),
        ...(source.path ? [{ label: 'Location', value: <span className="font-mono text-xs">{source.path}</span> }] : []),
        ...(source.repository
          ? [{ label: 'Repository', value: <span className="font-mono text-xs">{source.repository}</span> }]
          : []),
        ...(source.commit ? [{ label: 'Commit', value: <span className="font-mono text-xs">{source.commit}</span> }] : []),
        ...(source.url
          ? [
              {
                label: 'Link',
                value: (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[rgb(var(--ec-accent))] hover:underline"
                  >
                    <span className="break-all">{source.url}</span>
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
                  </a>
                ),
              },
            ]
          : []),
      ]
    : [{ label: 'Source', value: 'Local file' }];

  const ownerRows: MetadataRow[] = [
    {
      label: owners.length === 1 ? 'Owner' : 'Owners',
      value:
        owners.length > 0 ? (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {owners.map((owner, idx) => (
              <a key={`${owner.id}-${idx}`} href={owner.href} className="hover:text-[rgb(var(--ec-accent))] hover:underline">
                {owner.name}
              </a>
            ))}
          </span>
        ) : (
          <MetadataEmpty />
        ),
    },
  ];

  return (
    <div className="h-full space-y-4 overflow-auto pr-1">
      <MetadataTable title="Schema" rows={schemaRows} />
      <MetadataTable title="Source" rows={sourceRows} />
      <MetadataTable title="Ownership" rows={ownerRows} />
    </div>
  );
};

const SchemaVersionsTable = ({
  versions,
  currentVersion,
  onSelect,
  onCompare,
}: {
  versions: SchemaItem[];
  currentVersion: string;
  onSelect: (version: string) => void;
  /** Opens a diff between the given version and the one being viewed. */
  onCompare?: (version: string) => void;
}) => (
  <div className="overflow-auto rounded-xl border border-[rgb(var(--ec-page-border)/0.72)] bg-[rgb(var(--ec-dropdown-bg)/0.66)] dark:border-white/10">
    <table className="min-w-full divide-y divide-[rgb(var(--ec-page-border)/0.62)] dark:divide-white/10">
      <thead className="sticky top-0 z-10 bg-[rgb(var(--ec-content-hover)/0.45)]">
        <tr>
          <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
            Version
          </th>
          <th className="w-full px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
            Summary
          </th>
          <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
            Format
          </th>
          <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
            Updated
          </th>
          {onCompare && <th className="px-4 py-2.5" />}
        </tr>
      </thead>
      <tbody className="divide-y divide-[rgb(var(--ec-page-border)/0.5)] dark:divide-white/8">
        {versions.map((version, idx) => {
          const isCurrent = version.data.version === currentVersion;
          const isLatest = idx === 0;
          return (
            <tr
              key={`${version.data.version}-${idx}`}
              onClick={() => onSelect(version.data.version)}
              className={`group cursor-pointer transition-colors ${
                isCurrent
                  ? 'bg-[rgb(var(--ec-accent-subtle)/0.55)]'
                  : 'bg-transparent hover:bg-[rgb(var(--ec-content-hover)/0.38)]'
              }`}
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(version.data.version);
                  }}
                  className="inline-flex items-center gap-2 text-left"
                >
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      isCurrent
                        ? 'bg-[rgb(var(--ec-accent))]'
                        : 'bg-[rgb(var(--ec-page-border))] group-hover:bg-[rgb(var(--ec-page-text-muted))]'
                    }`}
                  />
                  <span className="font-mono text-xs tabular-nums text-[rgb(var(--ec-page-text))]">v{version.data.version}</span>
                  {isLatest && (
                    <span className="rounded bg-[rgb(var(--ec-accent-subtle))] px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--ec-accent))]">
                      latest
                    </span>
                  )}
                  {isCurrent && <span className="text-[10px] font-medium text-[rgb(var(--ec-page-text-muted))]">viewing</span>}
                </button>
              </td>
              <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                {version.data.summary ? <p className="line-clamp-2 max-w-2xl">{version.data.summary}</p> : <span>-</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                {getSchemaTypeLabel(version.schemaExtension)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                {version.source?.updatedAt ? formatSchemaUpdatedAt(version.source.updatedAt) : '-'}
              </td>
              {onCompare && (
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCompare(version.data.version);
                      }}
                      className="font-medium text-[rgb(var(--ec-accent))] hover:underline"
                    >
                      Compare with v{currentVersion}
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

type SchemaTabId = 'code' | 'schema' | 'api' | 'examples' | 'usage' | 'flows' | 'versions' | 'metadata';

/** Values used in the `tab` query parameter so a tab can be linked to directly. */
const SCHEMA_TAB_SLUGS: Record<SchemaTabId, string> = {
  code: 'schema',
  schema: 'properties',
  metadata: 'details',
  versions: 'versions',
  examples: 'examples',
  usage: 'producers-consumers',
  flows: 'flows',
  api: 'api',
};

const DEFAULT_SCHEMA_TAB: SchemaTabId = 'code';

const getTabIdFromSlug = (slug: string | null): SchemaTabId | undefined =>
  (Object.keys(SCHEMA_TAB_SLUGS) as SchemaTabId[]).find((id) => SCHEMA_TAB_SLUGS[id] === slug);

const writeTabToUrl = (tab: SchemaTabId) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (tab === DEFAULT_SCHEMA_TAB) url.searchParams.delete('tab');
  else url.searchParams.set('tab', SCHEMA_TAB_SLUGS[tab]);
  window.history.replaceState(window.history.state, '', url);
};

interface SchemaDetailsPanelProps {
  message: SchemaItem;
  availableVersions: SchemaItem[];
  selectedVersion: string | null;
  onVersionChange: (version: string) => void;
  showOwners?: boolean;
  showProducersConsumers?: boolean;
  /** Tab slug from the URL, when the server could read it. Lets the first render show the right tab. */
  initialTab?: string;
  /** Examples already rendered on the server (MDX with EventCatalog components). Falls back to Markdown rendering when absent. */
  renderedExamples?: React.ReactNode;
}

export default function SchemaDetailsPanel({
  message: metadataMessage,
  availableVersions,
  selectedVersion,
  onVersionChange,
  showOwners = true,
  showProducersConsumers = true,
  initialTab,
  renderedExamples,
}: SchemaDetailsPanelProps) {
  const [loadDetails] = useState(createSchemaDetailsLoader);
  const content = useSchemaDetails(metadataMessage, loadDetails);
  const message = content.message!;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SchemaTabId>(() => getTabIdFromSlug(initialTab ?? null) ?? DEFAULT_SCHEMA_TAB);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSchemaViewerModalOpen, setIsSchemaViewerModalOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const versionMenuRef = useRef<HTMLDivElement>(null);

  const { color } = getCollectionStyles(message.collection);
  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];
  const owners = message.data.owners || [];
  const producers = message.data.producers || [];
  const consumers = message.data.consumers || [];
  const flows = message.data.flows || [];

  const uniqueAvailableVersions = useMemo(
    () =>
      availableVersions.filter(
        (version, index, versions) => versions.findIndex((item) => item.data.version === version.data.version) === index
      ),
    [availableVersions]
  );
  // Several schemas can share one message version, so count distinct versions only.
  const hasMultipleVersions = uniqueAvailableVersions.length > 1;
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

  const diffFromMetadata = useMemo(
    () => uniqueAvailableVersions.find((version) => version.data.version === diffFromVersion),
    [diffFromVersion, uniqueAvailableVersions]
  );
  const diffToMetadata = useMemo(
    () => uniqueAvailableVersions.find((version) => version.data.version === diffToVersion),
    [diffToVersion, uniqueAvailableVersions]
  );
  const comparing = (activeTab === 'versions' && hasMultipleVersions) || isDiffModalOpen;

  const compareWithCurrent = (version: string) => {
    setDiffFromVersion(version);
    setDiffToVersion(message.data.version);
  };
  const fromContent = useSchemaDetails(diffFromMetadata, loadDetails, comparing);
  const toContent = useSchemaDetails(diffToMetadata, loadDetails, comparing);
  const diffFromItem = fromContent.message;
  const diffToItem = toContent.message;
  const hasDiffFromContent = !!diffFromItem?.schemaContent?.trim();
  const hasDiffToContent = !!diffToItem?.schemaContent?.trim();
  const selectedDiff: VersionDiff | null = useMemo(() => {
    if (!comparing || !diffFromItem || !diffToItem) return null;
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
  }, [comparing, diffFromItem, diffToItem]);
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

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
      if (!versionMenuRef.current?.contains(event.target as Node)) {
        setIsVersionMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionsOpen(false);
        setIsVersionMenuOpen(false);
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
  // Build tabs in three groups: the contract itself, who uses it, then reference material.
  type SchemaTab = { id: SchemaTabId; label: string; icon: React.ReactNode; group: 'contract' | 'usage' | 'reference' };
  const tabs: SchemaTab[] = [
    { id: 'code', label: 'Schema', icon: <CodeBracketIcon className="h-3.5 w-3.5" />, group: 'contract' },
  ];
  if (hasParsedSchema) {
    tabs.push({ id: 'schema', label: 'Properties', icon: <TableCellsIcon className="h-3.5 w-3.5" />, group: 'contract' });
  }
  const examples = message.examples || [];
  if (examples.length > 0 || renderedExamples) {
    tabs.push({ id: 'examples', label: 'Examples', icon: <CodeBracketSquareIcon className="h-3.5 w-3.5" />, group: 'contract' });
  }
  const usageCount = producers.length + consumers.length;
  const showUsageTab = showProducersConsumers && message.collection !== 'services' && usageCount > 0;
  if (showUsageTab) {
    tabs.push({
      id: 'usage',
      label: 'Producers & Consumers',
      icon: <ServerIcon className="h-3.5 w-3.5" />,
      group: 'usage',
    });
  }
  const showFlowsTab = message.collection !== 'services' && flows.length > 0;
  if (showFlowsTab) {
    tabs.push({
      id: 'flows',
      label: `Flows (${flows.length})`,
      icon: <ArrowsRightLeftIcon className="h-3.5 w-3.5" />,
      group: 'usage',
    });
  }
  tabs.push({
    id: 'versions',
    label: `Versions (${uniqueAvailableVersions.length})`,
    icon: <RectangleStackIcon className="h-3.5 w-3.5" />,
    group: 'reference',
  });
  tabs.push({ id: 'metadata', label: 'Details', icon: <InformationCircleIcon className="h-3.5 w-3.5" />, group: 'reference' });
  tabs.push({ id: 'api', label: 'API', icon: <GlobeAltIcon className="h-3.5 w-3.5" />, group: 'reference' });

  const availableTabIds = tabs.map((tab) => tab.id).join(',');
  const selectTab = (tab: SchemaTabId) => {
    setActiveTab(tab);
    writeTabToUrl(tab);
  };

  // Restore the tab named in the URL once the available tabs are known (static builds cannot resolve it on the
  // server), and fall back to the default when the requested tab does not exist for this message.
  useEffect(() => {
    const available = availableTabIds.split(',');
    const requested = getTabIdFromSlug(new URLSearchParams(window.location.search).get('tab'));
    if (requested && available.includes(requested)) {
      setActiveTab(requested);
    } else {
      setActiveTab((current) => (available.includes(current) ? current : DEFAULT_SCHEMA_TAB));
    }
  }, [availableTabIds]);

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
                <div className="relative flex-shrink-0" ref={versionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsVersionMenuOpen((prev) => !prev)}
                    aria-expanded={isVersionMenuOpen}
                    aria-haspopup="listbox"
                    title="Switch version"
                    className="inline-flex items-center gap-1 rounded-md border border-transparent bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 font-mono text-xs tabular-nums text-[rgb(var(--ec-page-text-muted))] transition-colors hover:border-[rgb(var(--ec-page-border))] hover:text-[rgb(var(--ec-page-text))]"
                  >
                    v{message.data.version}
                    <ChevronDownIcon className={`h-3 w-3 transition-transform ${isVersionMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isVersionMenuOpen && (
                    <ul
                      role="listbox"
                      aria-label="Versions"
                      className="absolute left-0 top-[calc(100%+0.4rem)] z-20 max-h-72 min-w-[12rem] overflow-y-auto rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] py-1 shadow-xl"
                    >
                      {uniqueAvailableVersions.map((version, idx) => {
                        const isCurrent = version.data.version === message.data.version;
                        return (
                          <li key={`${version.data.version}-${idx}`} role="option" aria-selected={isCurrent}>
                            <button
                              type="button"
                              onClick={() => {
                                setIsVersionMenuOpen(false);
                                if (!isCurrent) onVersionChange(version.data.version);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[rgb(var(--ec-content-hover))] ${
                                isCurrent ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))]'
                              }`}
                            >
                              <CheckIcon
                                className={`h-3.5 w-3.5 flex-shrink-0 ${isCurrent ? 'text-[rgb(var(--ec-accent))]' : 'invisible'}`}
                              />
                              <span className="font-mono tabular-nums">v{version.data.version}</span>
                              {idx === 0 && (
                                <span className="ml-auto rounded bg-[rgb(var(--ec-accent-subtle))] px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--ec-accent))]">
                                  latest
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
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
            {tabs.map((tab, index) => (
              <Fragment key={tab.id}>
                {index > 0 && tabs[index - 1].group !== tab.group && (
                  <span aria-hidden="true" className="mx-2 h-4 w-px bg-[rgb(var(--ec-page-border))]" />
                )}
                <button
                  onClick={() => selectTab(tab.id)}
                  data-tab-group={tab.group}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[rgb(var(--ec-accent))] text-[rgb(var(--ec-page-text))]'
                      : 'border-transparent text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:border-[rgb(var(--ec-page-border))]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              </Fragment>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          {content.loading || content.error ? (
            <SchemaLoadingState loading={content.loading} error={content.error} retry={content.retry} />
          ) : activeTab === 'examples' && renderedExamples ? (
            <div className="h-full overflow-auto pr-1">{renderedExamples}</div>
          ) : activeTab === 'examples' && examples.length > 0 ? (
            <ExamplesViewer examples={examples} />
          ) : activeTab === 'metadata' ? (
            <SchemaMetadata message={message} owners={showOwners ? owners : []} />
          ) : activeTab === 'versions' ? (
            <div className="h-full space-y-4 overflow-auto pr-1">
              <SchemaVersionsTable
                versions={uniqueAvailableVersions}
                currentVersion={message.data.version}
                onSelect={onVersionChange}
                onCompare={hasMultipleVersions ? compareWithCurrent : undefined}
              />
              {hasMultipleVersions && (
                <div className="flex flex-col">
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
                    <div className="flex items-center gap-2">
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
                  </div>
                  <div className="min-h-[16rem] overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))]">
                    {fromContent.loading || toContent.loading || fromContent.error || toContent.error ? (
                      <SchemaLoadingState
                        loading={fromContent.loading || toContent.loading}
                        error={fromContent.error || toContent.error}
                        retry={() => {
                          fromContent.retry();
                          toContent.retry();
                        }}
                      />
                    ) : diffFromVersion === diffToVersion ? (
                      <div className="flex h-full items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
                        <p className="text-sm">Select two different versions</p>
                      </div>
                    ) : !hasDiffFromContent || !hasDiffToContent ? (
                      <div className="flex h-full items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
                        <p className="text-sm">No schema content available</p>
                      </div>
                    ) : (
                      <DiffViewer diffs={selectedDiffs} />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'usage' && showUsageTab ? (
            <SchemaUsage message={message} />
          ) : activeTab === 'flows' && showFlowsTab ? (
            <SchemaFlows message={message} flows={flows} />
          ) : activeTab === 'api' ? (
            <ApiContentViewer message={message} onCopy={handleCopyCustom} copiedId={copiedId} />
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

      {/* Modals */}
      <VersionHistoryModal
        isOpen={isDiffModalOpen}
        onOpenChange={setIsDiffModalOpen}
        diffs={selectedDiffs}
        messageName={message.data.name}
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

function SchemaLoadingState({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  if (!error) {
    if (!loading) return null;
    return (
      <div role="status" className="flex h-full items-center justify-center gap-2 text-sm text-[rgb(var(--ec-page-text-muted))]">
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border-2 border-[rgb(var(--ec-page-border))] border-t-[rgb(var(--ec-page-text-muted))] motion-safe:animate-spin"
        />
        <span>Loading schema…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-[rgb(var(--ec-page-text-muted))]" role="alert">
      <p>{error}</p>
      {error && (
        <button type="button" onClick={retry} className="text-[rgb(var(--ec-accent))] hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
