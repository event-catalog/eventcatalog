import { createColumnHelper } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentTextIcon, MapIcon } from '@heroicons/react/24/solid';
import { ArrowDownIcon, ArrowUpIcon, EllipsisVerticalIcon, StarIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import { isIconPath, resolveIconUrl } from '@utils/icon';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite, type FavoriteItem } from '../../../stores/favorites-store';
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
          className="inline-flex items-center px-2 py-0.5 text-[11px] font-normal rounded-md max-w-[140px] truncate border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] bg-transparent"
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

const ResourceNameCell = ({ item }: { item: DiscoverTableData }) => {
  const isLatestVersion = item.data.version === item.data.latestVersion;
  const { color, Icon } = getColorAndIconForCollection(item.collection);
  const resourceIcon = item.data.icon;
  const resourceIconUrl = isIconPath(resourceIcon) ? resolveIconUrl(resourceIcon) : null;

  return (
    <a
      href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
      className="group inline-flex items-center gap-2.5 hover:text-[rgb(var(--ec-accent))] transition-colors"
    >
      {resourceIconUrl ? (
        <img src={resourceIconUrl} alt="" className="h-5 w-5 flex-shrink-0 rounded-sm object-contain" />
      ) : (
        <Icon className={`h-4 w-4 flex-shrink-0 ${colorClasses[color] || 'text-[rgb(var(--ec-icon-color))]'}`} />
      )}
      <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
        {item.data.name}
      </span>
      {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
    </a>
  );
};

const RowActionsMenu = ({ item, collectionType }: { item: DiscoverTableData; collectionType: CollectionType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const favorites = useStore(favoritesStore);
  const href = buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`);
  const visualiserHref = buildUrl(`/visualiser/${item.collection}/${item.data.id}/${item.data.version}`);
  const nodeKey = `${item.collection}-${item.data.id}-${item.data.version}`;
  const badgeLabel =
    collectionType === 'external-systems'
      ? 'External System'
      : collectionType.charAt(0).toUpperCase() + collectionType.slice(1, -1);
  const isFavorite = favorites.some((fav) => fav.nodeKey === nodeKey);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleToggleFavorite = () => {
    const favoriteItem: FavoriteItem = {
      nodeKey,
      path: [],
      title: item.data.name,
      badge: badgeLabel,
      href,
    };
    toggleFavorite(favoriteItem);
    setIsOpen(false);
  };

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-md p-1.5 text-[rgb(var(--ec-icon-color))] transition-colors hover:bg-[rgb(var(--ec-content-hover)/0.5)] hover:text-[rgb(var(--ec-page-text))]"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[280px] overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] shadow-xl">
          <a
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
          >
            <DocumentTextIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
            View documentation
          </a>
          <a
            href={visualiserHref}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
          >
            <MapIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
            View in visualiser
          </a>
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
          >
            <StarIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
            {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          </button>
        </div>
      )}
    </div>
  );
};

// Shared actions column
const createActionsColumn = (collectionType: CollectionType, tableConfiguration: TableConfiguration) =>
  columnHelper.accessor('data.name', {
    id: 'actions',
    header: () => <span></span>,
    cell: (info) => {
      const item = info.row.original;
      return <RowActionsMenu item={item} collectionType={collectionType} />;
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
        <span className="text-[0.8rem] text-[rgb(var(--ec-icon-color))] line-clamp-2" title={displayText}>
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
          className="group inline-flex items-center gap-1.5 text-[0.8rem] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] transition-colors"
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    cell: (info) => <ResourceNameCell item={info.row.original} />,
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
    case 'external-systems':
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
