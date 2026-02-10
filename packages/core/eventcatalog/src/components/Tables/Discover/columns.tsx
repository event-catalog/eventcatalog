import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import {
  ServerIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  QueueListIcon,
  DocumentTextIcon,
  MapIcon,
  CubeIcon,
} from '@heroicons/react/24/solid';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { DatabaseIcon } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { buildUrl } from '@utils/url-builder';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import FavoriteButton from '@components/FavoriteButton';
import type { DiscoverTableData, CollectionType } from './DiscoverTable';
import type { TableConfiguration } from '@types';

// Color mapping to ensure Tailwind classes are included in the build
const colorClasses: Record<string, string> = {
  orange: 'text-orange-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  pink: 'text-pink-500',
  yellow: 'text-yellow-500',
  teal: 'text-teal-500',
  purple: 'text-purple-500',
  red: 'text-red-500',
  gray: 'text-gray-500',
  cyan: 'text-cyan-500',
};

// Reusable tooltip wrapper component
const ActionTooltip = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))] rounded px-2 py-1 text-xs shadow-md z-50"
          side="top"
          sideOffset={5}
        >
          {label}
          <Tooltip.Arrow className="fill-[rgb(var(--ec-page-text))]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const columnHelper = createColumnHelper<DiscoverTableData>();

// Badge cell component (proper React component to use hooks)
const BadgesCell = ({ badges }: { badges: Array<{ content: string; backgroundColor?: string; textColor?: string }> }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!badges || badges.length === 0) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;

  const visibleItems = isExpanded ? badges : badges.slice(0, 3);
  const hiddenCount = badges.length - 3;

  return (
    <div className="flex flex-col gap-1 items-start">
      {visibleItems.map((badge, index) => (
        <span
          key={`${badge.content}-${index}`}
          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md max-w-[140px] truncate border border-[rgb(var(--ec-accent)/0.5)] text-[rgb(var(--ec-page-text))] bg-transparent"
          title={badge.content}
        >
          {badge.content}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-[rgb(var(--ec-accent))] hover:underline">
          {isExpanded ? 'less' : `+${hiddenCount}`}
        </button>
      )}
    </div>
  );
};

// Shared badge column
const createBadgesColumn = (tableConfiguration: TableConfiguration) =>
  columnHelper.accessor((row) => row.data.badges, {
    id: 'badges',
    header: () => <span>{tableConfiguration?.columns?.badges?.label || 'Badges'}</span>,
    cell: (info) => <BadgesCell badges={info.getValue() || []} />,
    meta: {
      showFilter: false,
    },
  });

// Shared actions column
const createActionsColumn = (collectionType: CollectionType, tableConfiguration: TableConfiguration) =>
  columnHelper.accessor('data.name', {
    id: 'actions',
    header: () => <span></span>,
    cell: (info) => {
      const item = info.row.original;
      const href = buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`);
      const nodeKey = `${item.collection}-${item.data.id}-${item.data.version}`;
      const badgeLabel = collectionType.charAt(0).toUpperCase() + collectionType.slice(1, -1);

      return (
        <div className="flex items-center gap-0.5">
          <ActionTooltip label="View documentation">
            <a
              className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent)/0.1)] rounded-md transition-colors"
              href={href}
            >
              <DocumentTextIcon className="w-4 h-4" />
            </a>
          </ActionTooltip>
          <ActionTooltip label="View in visualiser">
            <a
              className="p-1.5 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent)/0.1)] rounded-md transition-colors"
              href={buildUrl(`/visualiser/${item.collection}/${item.data.id}/${item.data.version}`)}
            >
              <MapIcon className="w-4 h-4" />
            </a>
          </ActionTooltip>
          <ActionTooltip label="Add to favorites">
            <span>
              <FavoriteButton nodeKey={nodeKey} title={item.data.name} badge={badgeLabel} href={href} size="sm" />
            </span>
          </ActionTooltip>
        </div>
      );
    },
    meta: {
      showFilter: false,
    },
  });

// Shared summary column
const createSummaryColumn = (tableConfiguration: TableConfiguration) =>
  columnHelper.accessor('data.summary', {
    id: 'summary',
    header: () => <span>{tableConfiguration?.columns?.summary?.label || 'Summary'}</span>,
    cell: (info) => {
      const summary = info.renderValue() as string;
      const isDraft = info.row.original.data.draft;
      const displayText = `${summary || ''}${isDraft ? ' (Draft)' : ''}`;
      return (
        <span className="text-sm text-[rgb(var(--ec-icon-color))] line-clamp-2" title={displayText}>
          {displayText}
        </span>
      );
    },
    meta: {
      showFilter: false,
      className: 'max-w-md',
    },
  });

// Collection list cell renderer (for producers, consumers, services, etc.)
const CollectionListCell = ({
  items,
  emptyText = '-',
  maxVisible = 3,
}: {
  items: Array<{ collection: string; data: { id: string; name: string; version: string } }> | undefined;
  emptyText?: string;
  maxVisible?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const itemsWithIcons = useMemo(
    () =>
      items?.map((item) => ({
        ...item,
        ...getColorAndIconForCollection(item.collection),
      })) || [],
    [items]
  );

  if (!items || items.length === 0) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">{emptyText}</span>;

  const visibleItems = isExpanded ? itemsWithIcons : itemsWithIcons.slice(0, maxVisible);
  const hiddenCount = itemsWithIcons.length - maxVisible;

  return (
    <div className="flex flex-col gap-1">
      {visibleItems.map((item, index: number) => (
        <a
          key={`${item.data.id}-${index}`}
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-1.5 text-xs hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <item.Icon className={`h-3.5 w-3.5 ${colorClasses[item.color] || 'text-gray-500'} flex-shrink-0`} />
          <span className="truncate max-w-[120px]" title={item.data.name}>
            {item.data.name}
          </span>
        </a>
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[rgb(var(--ec-accent))] hover:underline text-left"
        >
          {isExpanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// EVENT COLUMNS
// ============================================================================
export const getEventColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Event'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <BoltIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>Producers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>Consumers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('events', tableConfiguration),
];

// ============================================================================
// COMMAND COLUMNS
// ============================================================================
export const getCommandColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Command'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <ChatBubbleLeftIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>Producers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>Consumers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('commands', tableConfiguration),
];

// ============================================================================
// QUERY COLUMNS
// ============================================================================
export const getQueryColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Query'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <MagnifyingGlassIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>Producers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>Consumers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('queries', tableConfiguration),
];

// ============================================================================
// SERVICE COLUMNS
// ============================================================================
export const getServiceColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Service'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <ServerIcon className="h-4 w-4 text-pink-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.receives', {
    id: 'receives',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Receives
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.sends', {
    id: 'sends',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Sends
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('services', tableConfiguration),
];

// ============================================================================
// DOMAIN COLUMNS
// ============================================================================
export const getDomainColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Domain'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <RectangleGroupIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.services', {
    id: 'services',
    header: () => <span>Services</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('domains', tableConfiguration),
];

// ============================================================================
// FLOW COLUMNS
// ============================================================================
export const getFlowColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Flow'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <QueueListIcon className="h-4 w-4 text-teal-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('flows', tableConfiguration),
];

// ============================================================================
// CONTAINER (DATA) COLUMNS
// ============================================================================
export const getContainerColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Data'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <DatabaseIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.servicesThatWriteToContainer', {
    id: 'writes',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Writes
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.servicesThatReadFromContainer', {
    id: 'reads',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Reads
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('containers', tableConfiguration),
];

// ============================================================================
// DATA PRODUCT COLUMNS
// ============================================================================
export const getDataProductColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Data Product'}</span>,
    cell: (info) => {
      const item = info.row.original;
      const isLatestVersion = item.data.version === item.data.latestVersion;
      return (
        <a
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-2 hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <CubeIcon className="h-4 w-4 text-cyan-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
            {item.data.name}
          </span>
          {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        </a>
      );
    },
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.inputs', {
    id: 'inputs',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Inputs
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.outputs', {
    id: 'outputs',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Outputs
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('data-products', tableConfiguration),
];

// ============================================================================
// COLUMN GETTER BY COLLECTION TYPE
// ============================================================================
export const getDiscoverColumns = (collectionType: CollectionType, tableConfiguration: TableConfiguration) => {
  switch (collectionType) {
    case 'events':
      return getEventColumns(tableConfiguration);
    case 'commands':
      return getCommandColumns(tableConfiguration);
    case 'queries':
      return getQueryColumns(tableConfiguration);
    case 'services':
      return getServiceColumns(tableConfiguration);
    case 'domains':
      return getDomainColumns(tableConfiguration);
    case 'flows':
      return getFlowColumns(tableConfiguration);
    case 'containers':
      return getContainerColumns(tableConfiguration);
    case 'data-products':
      return getDataProductColumns(tableConfiguration);
    default:
      return [];
  }
};
